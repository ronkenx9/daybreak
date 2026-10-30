'use client';
import {useCallback,useEffect,useRef,useState,type DragEvent} from 'react';
import styles from './ZombieCapsuleUpload.module.css';
import {Sfx,type SfxName} from './sfx';
import {
 ARMS_MUZZLE,ARMS_PIVOT,GOKU,GOKU_PALETTE,GOKU_SHOULDERS,GOKU_SSJ_PALETTE,KNIGHT,KNIGHT_HAND,KNIGHT_PALETTE,SKULL,SWORD,SWORD_PALETTE,SWORD_PIVOT,SKULL_PALETTE,SOLDIER_A,SOLDIER_ARMS,SOLDIER_B,SOLDIER_PALETTE,SOLDIER_SHOULDER,
 ZOMBIE_ARM,ZOMBIE_ARM_BACK,ZOMBIE_OPEN,ZOMBIE_PALETTE,ZOMBIE_SHUT,drawText,flipSprite,glyphCells,makeSprite,textWidth,type Sprite,
} from './sprites';

/**
 * Pixel-art drag-and-drop upload whose progress bar is a capsule of zombies.
 * Drop a file → the hatch at the capsule's mouth opens, a horde of half-zombies
 * rises inside, and a soldier steps into the doorway and opens fire. Only hits
 * spill blood, and the blood piling up in the capsule is the progress bar: the
 * soldier shoots faster when the blood lags the real upload, and the blood is
 * never allowed to get ahead of it. Once the upload finishes the horde stops
 * respawning and the last kill lands exactly on 100%, then the hatch shuts.
 * The knight variant charges his sword instead: it glows and shakes harder as the
 * upload advances, one slash at 50% floods the tube half-full and a final slash
 * when the upload finishes kills everything and fills it. The goku variant drops
 * onto the ledge, fires a Kamehameha at 50%, transforms at 99% and the final beam
 * floods the tube and cracks the glass all over.
 * Everything is drawn on a low-res canvas and scaled up with nearest-neighbour.
 */
export type UploadFn=(file:File,onProgress:(loaded:number)=>void,signal:AbortSignal)=>Promise<void>;
type Phase='idle'|'drag'|'intake'|'uploading'|'done'|'error';
export type Hero='soldier'|'knight'|'goku';

type Pt={x:number;y:number};
type Zombie={x:number;row:0|1;seed:number;speed:number;rise:number;hp:number;state:'rising'|'alive'|'dying'|'gone';t:number;flinch:number;respawn:number};
type Particle={x:number;y:number;vx:number;vy:number;life:number;max:number;kind:'blood'|'shell'|'spark'|'bubble'|'drip'|'ember'|'shard';size:number;color?:string;caged:boolean;bounced?:boolean};
type Bullet={x0:number;y0:number;x1:number;y1:number;t:number;target:Zombie};
type Scene={
 hero:Hero;phase:Phase;time:number;phaseT:number;
 pool:number;fill:number;fillV:number;target:number;pct:number;loaded:number;total:number;
 shown:number;lastN:number;pop:number;heat:number;hatch:number;topoff:number;finale:boolean;finished:boolean;
 soldierX:number;walkPh:number;aim:number;fireCd:number;mag:number;flash:number;recoil:number;shake:number;hits:number;
 kills:number;skullPop:number;groanCd:number;alarmCd:number;
 zombies:Zombie[];particles:Particle[];bullets:Bullet[];ripples:{x:number;t:number}[];
 stains:{x:number;y:number;life:number;len:number}[];drips:{x:number;y:number;len:number;max:number;speed:number}[];
 file:{x:number;y:number;t:number}|null;events:SfxName[];
 // knight only: which half is charging, how charged the blade is, the swing and the slash wave it throws
 stage:0|1|2;charge:number;slash:{t:number;stage:1|2;launched:boolean}|null;wave:{x:number;stage:1|2}|null;sinceSlash:number;whiteout:number;flood:number;crackleCd:number;
 // goku only: the drop onto the ledge, his beam, the transformation and the cracks it leaves in the glass
 gy:number;gv:number;falling:boolean;landed:boolean;landT:number;beam:{t:number;stage:1|2;front:number}|null;ssj:boolean;transformT:number|null;cracks:{x:number;y:number;o:number}[];crackT:number;
 // goku body physics: lean (bx) and knee bend (cr) on springs, hands chasing their pose on springs, blink timer
 gk:{bx:number;bxv:number;cr:number;crv:number;hands:{x:number;y:number;vx:number;vy:number}[];blink:number};
};

const LW=320,LH=112;
const CAP={x0:48,x1:214,cy:48,r:14};
const TOP=CAP.cy-CAP.r,BOTTOM=CAP.cy+CAP.r;
const DOOR={x:CAP.x1+4,w:12};
// the officer's ledge juts in from the right edge, leaving open space between him and the chamber
const LEDGE={x:250,y:62};
const SOLDIER_X=268,SOLDIER_START=LW+14;
const FRONT_COUNT=7,BACK_COUNT=5;
const MAG=40,FIRE_GAP=0.07;
const COUNTER={cx:131,y:78};

const clamp=(v:number,a=0,b=1)=>Math.min(b,Math.max(a,v));
const easeOut=(t:number)=>1-(1-clamp(t))**3;
const easeIn=(t:number)=>clamp(t)**2;
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const mix=(a:number[],b:number[],t:number)=>a.map((v,i)=>lerp(v,b[i],t));
const rgba=(c:number[])=>`rgba(${c[0]|0},${c[1]|0},${c[2]|0},${c[3].toFixed(3)})`;
// a full bar leaves the zombies' heads just above the blood; once the hatch shuts the blood tops off
const levelY=(s:{fill:number;topoff:number})=>BOTTOM-s.fill*(BOTTOM-TOP-6)-s.topoff*9;
const mb=(bytes:number)=>(bytes/1048576).toFixed(1);

// Pixel rows/columns of the capsule interior (rounded left end, squarer mouth on the right) and its outline pixels.
const RR=3;
const SPANS=Array.from({length:BOTTOM-TOP},(_,i)=>{
 const y=TOP+i,yc=y+0.5,dy=Math.abs(yc-CAP.cy);
 const xl=Math.round(CAP.x0+CAP.r-Math.sqrt(Math.max(0,CAP.r*CAP.r-dy*dy)));
 const d2=yc<TOP+RR?TOP+RR-yc:yc>BOTTOM-RR?yc-(BOTTOM-RR):0;
 const xr=d2>0?Math.round(CAP.x1-RR+Math.sqrt(Math.max(0,RR*RR-d2*d2))):CAP.x1;
 return {y,xl,xr};
});
const inside=(x:number,y:number)=>{const s=SPANS[Math.floor(y)-TOP];return !!s&&x>=s.xl&&x<s.xr};
const COLS=Array.from({length:CAP.x1-CAP.x0},(_,i)=>{const x=CAP.x0+i,rows=SPANS.filter(r=>x>=r.xl&&x<r.xr);return {x,top:rows[0]?.y??BOTTOM,bottom:(rows.at(-1)?.y??BOTTOM)+1}});
const OUTLINE:Pt[]=SPANS.flatMap(({y,xl,xr})=>{const out:Pt[]=[];for(let x=xl;x<xr;x++)if(!inside(x-1,y)||!inside(x+1,y)||!inside(x,y-1)||!inside(x,y+1))out.push({x,y});return out});
const HANDPRINT=['..r.r.r','.rr.r.r','.rrrrrr','rrrrrrr','.rrrrr.','..rrr..'];

type Sprites={goku:Sprite;gokuSsj:Sprite;gokuAura:Sprite;knight:Sprite;knightGlow:Sprite;sword:Sprite;swordGlow:Sprite;soldierA:Sprite;soldierB:Sprite;arms:Sprite;zOpen:Sprite;zShut:Sprite;zArm:Sprite;zArmBack:Sprite;skull:Sprite;hand:Sprite};
// Source art faces the soldier right / zombies left; here the soldier faces left into the capsule and the zombies face him.
const RED='#ff2a3d';
const buildSprites=():Sprites=>({
 goku:flipSprite(makeSprite(GOKU,GOKU_PALETTE)),gokuSsj:flipSprite(makeSprite(GOKU,GOKU_SSJ_PALETTE)),gokuAura:flipSprite(makeSprite(GOKU,Object.fromEntries(Object.keys(GOKU_PALETTE).map(k=>[k,'#ffd23f'])))),
 knight:flipSprite(makeSprite(KNIGHT,KNIGHT_PALETTE)),knightGlow:flipSprite(makeSprite(KNIGHT,Object.fromEntries(Object.keys(KNIGHT_PALETTE).map(k=>[k,RED])))),
 sword:flipSprite(makeSprite(SWORD,SWORD_PALETTE)),swordGlow:flipSprite(makeSprite(SWORD,{w:RED,W:RED})),
 soldierA:flipSprite(makeSprite(SOLDIER_A,SOLDIER_PALETTE)),soldierB:flipSprite(makeSprite(SOLDIER_B,SOLDIER_PALETTE)),arms:flipSprite(makeSprite(SOLDIER_ARMS,SOLDIER_PALETTE)),
 zOpen:flipSprite(makeSprite(ZOMBIE_OPEN,ZOMBIE_PALETTE)),zShut:flipSprite(makeSprite(ZOMBIE_SHUT,ZOMBIE_PALETTE)),zArm:flipSprite(makeSprite(ZOMBIE_ARM,ZOMBIE_PALETTE)),zArmBack:flipSprite(makeSprite(ZOMBIE_ARM_BACK,ZOMBIE_PALETTE)),
 skull:makeSprite(SKULL,SKULL_PALETTE),hand:makeSprite(HANDPRINT,{r:'#c8001e'}),
});
const SOLDIER_W=Math.max(...SOLDIER_A.map(r=>r.length)),ARMS_W=Math.max(...SOLDIER_ARMS.map(r=>r.length));
const SHOULDER={x:SOLDIER_W-1-SOLDIER_SHOULDER.x,y:SOLDIER_SHOULDER.y};
const PIVOT={x:ARMS_W-1-ARMS_PIVOT.x,y:ARMS_PIVOT.y};
const BARREL=ARMS_MUZZLE.x-ARMS_PIVOT.x;
const KNIGHT_W=Math.max(...KNIGHT.map(r=>r.length)),SWORD_W=Math.max(...SWORD.map(r=>r.length));
const KHAND={x:KNIGHT_W-1-KNIGHT_HAND.x,y:KNIGHT_HAND.y};
const SPIV={x:SWORD_W-1-SWORD_PIVOT.x,y:SWORD_PIVOT.y};
// sword angles (the flipped blade points along (-cos, -sin)): low guard while charging, raised for the windup, follow-through, planted when done
const GOKU_W=Math.max(...GOKU.map(r=>r.length));
const GSHOULDER=GOKU_SHOULDERS.map(p=>({x:GOKU_W-1-p.x,y:p.y}));
const GUARD=-0.93,RAISED=2.1,FOLLOW=-0.6,PLANTED=-1.28;

const simulateUpload:UploadFn=(file,onProgress,signal)=>new Promise((resolve,reject)=>{
 const total=Math.max(1,file.size),duration=8000+Math.random()*2000;let loaded=0,last=performance.now();
 const id=window.setInterval(()=>{const now=performance.now();loaded=Math.min(total,loaded+total*((now-last)/duration)*(0.35+Math.random()*1.3));last=now;onProgress(loaded);if(loaded>=total){window.clearInterval(id);resolve()}},120);
 signal.addEventListener('abort',()=>{window.clearInterval(id);reject(new DOMException('Aborted','AbortError'))});
});

const freshScene=(hero:Hero='soldier'):Scene=>({
 hero,phase:'idle',time:0,phaseT:0,pool:0,fill:0,fillV:0,target:0,pct:0,loaded:0,total:0,shown:0,lastN:0,pop:0,heat:0,hatch:0,topoff:0,finale:false,finished:false,
 soldierX:SOLDIER_START,walkPh:0,aim:0,fireCd:0,mag:MAG,flash:0,recoil:0,shake:0,hits:0,kills:0,skullPop:0,groanCd:1,alarmCd:0,
 zombies:[],particles:[],bullets:[],ripples:[],stains:[],drips:[],file:null,events:[],
 stage:0,charge:0,slash:null,wave:null,sinceSlash:9,whiteout:0,flood:0,crackleCd:0,
 gy:-120,gv:0,falling:false,landed:false,landT:0,beam:null,ssj:false,transformT:null,cracks:[],crackT:0,
 gk:{bx:0,bxv:0,cr:0,crv:0,hands:[{x:20,y:8,vx:0,vy:0},{x:3,y:10,vx:0,vy:0}],blink:2},
});

const makeZombie=(row:0|1,x:number,delay=0):Zombie=>({x,row,seed:Math.random(),speed:2+Math.random()*4,rise:-delay,hp:2+Math.floor(Math.random()*3),state:'rising',t:0,flinch:0,respawn:0});
const spawnHorde=()=>[
 ...Array.from({length:BACK_COUNT},(_,i)=>makeZombie(0,64+i*26+Math.random()*6,0.2+i*0.1)),
 ...Array.from({length:FRONT_COUNT},(_,i)=>makeZombie(1,58+i*20+Math.random()*5,0.3+i*0.08)),
];
const limitFor=(z:Zombie)=>CAP.x1-(z.row?26:34);

function zombieBox(z:Zombie,t:number,level:number){
 const up=easeOut(z.rise),sink=z.state==='dying'?easeIn(z.t)*44:0;
 const left=Math.round(z.x-9+Math.sin(t*1.3+z.seed*6)-z.flinch*2);
 // zombies wade up with the blood so their heads stay above it
 const top=Math.round(Math.min(TOP+(z.row?4:2),level-(z.row?8:7))+(1-up)*40+sink);
 return {left,top,up,head:{x:left+9,y:top+7},chest:{x:left+9,y:top+18}};
}

const counterLayout=(n:number)=>{const str=`${n}`,w=textWidth(str,3);return {str,x:Math.round(COUNTER.cx-w/2),w}};
const soldierOrigin=(s:Scene,hop=0,bob=0)=>({x:Math.round(s.soldierX)-(SOLDIER_W>>1),y:LEDGE.y-30-hop-bob});
const pivotOf=(s:Scene)=>{const o=soldierOrigin(s);return {x:o.x+SHOULDER.x,y:o.y+SHOULDER.y}};
// The flipped gun points along -x; rotating by `aim` points it along (-cos, -sin).
const knightOrigin=(s:Scene,bob=0)=>({x:Math.round(s.soldierX)-(KNIGHT_W>>1),y:LEDGE.y-30-bob});
const knightHand=(s:Scene)=>{const o=knightOrigin(s);return {x:o.x+KHAND.x,y:o.y+KHAND.y}};
const muzzleOf=(s:Scene)=>{const p=pivotOf(s);return {x:p.x-Math.cos(s.aim)*BARREL,y:p.y-Math.sin(s.aim)*BARREL}};

function spawnBlood(s:Scene,x:number,y:number,dx:number,dy:number,n:number){
 const base=Math.atan2(dy,dx);
 for(let i=0;i<n;i++){const sp=30+Math.random()*90,a=base+(Math.random()-0.5)*2.2;s.particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-50*Math.random(),life:1.4,max:1.4,kind:'blood',size:Math.random()<0.3?2:1,caged:inside(x,y)})}
}

function surfaceAt(s:Scene,x:number){
 let y=levelY(s)+Math.sin(x*0.25+s.time*3)*0.8+Math.sin(x*0.09-s.time*1.7)*0.8;
 for(const r of s.ripples){const d=Math.abs(x-r.x);if(d<16)y-=Math.cos(d*0.7-r.t*12)*1.6*Math.exp(-r.t*3)*(1-d/16)}
 return y;
}

function step(s:Scene,dt:number){
 s.time+=dt;s.phaseT+=dt;
 s.flash=Math.max(0,s.flash-dt*20);s.recoil=Math.max(0,s.recoil-dt*16);s.shake=Math.max(0,s.shake-dt*14);
 s.whiteout=Math.max(0,s.whiteout-dt*2.5);s.flood=Math.max(0,s.flood-dt);
 s.pop=Math.max(0,s.pop-dt*8);s.skullPop=Math.max(0,s.skullPop-dt*5);
 s.heat+=((s.phase==='drag'?1:0)-s.heat)*Math.min(1,dt*6);
 const open=s.phase==='uploading'||s.phase==='done'||s.phase==='error';
 // the hatch slams shut again once the last zombie is down
 // (the goku beam blows the tube apart, so his hatch stays open)
 s.hatch=clamp(s.hatch+(s.phase==='uploading'||s.phase==='error'||(s.phase==='done'&&s.hero==='goku')?dt*2:-dt*2.4));
 // blood level glides toward what has actually been spilled
 const k=s.flood>0?110:24,c=2*Math.sqrt(k);s.fillV+=((s.pool-s.fill)*k-s.fillV*c)*dt;s.fill=clamp(s.fill+s.fillV*dt);
 // the knight's counter follows the upload but holds at 49 and 98 until each slash lands
 const wantShown=s.hero!=='soldier'?(s.phase==='done'?100:Math.min(s.pct*100,s.stage===0?49:s.hero==='goku'?99:98)):s.pool*100;
 s.shown+=(wantShown-s.shown)*Math.min(1,dt*8);
 const n=Math.floor(s.shown+0.02);if(n>s.lastN){s.lastN=n;s.pop=1}
 const busy=s.phase==='uploading',surface=levelY(s);
 if(s.phase==='done'&&s.hatch<0.05)s.topoff=Math.min(1,s.topoff+dt*1.5);
 if(s.phase==='drag'){s.alarmCd-=dt;if(s.alarmCd<=0){s.alarmCd=0.75;s.events.push('alarm')}}
 if(s.file){s.file.t+=dt/0.6;if(s.file.t>=1){s.file=null;s.shake=3;s.events.push('splash');if(s.phase==='intake'){s.phase='uploading';s.phaseT=0}}}
 // soldier steps through the open hatch into the doorway
 if(open&&s.hatch>0.7&&s.soldierX>SOLDIER_X){s.soldierX=Math.max(SOLDIER_X,s.soldierX-dt*42);s.walkPh+=dt*8}
 // horde
 for(const z of s.zombies){
  z.flinch=Math.max(0,z.flinch-dt*8);
  if(z.state==='rising'){z.rise+=dt*1.4;if(z.rise>=1){z.rise=1;z.state='alive'}}
  if((z.state==='alive'||z.state==='rising')&&z.rise>0&&busy)z.x=Math.min(limitFor(z),z.x+z.speed*dt);
  if(z.state==='dying'){z.t+=dt*1.3;if(z.t>=1)z.state='gone'}
  // once the upload is done no more zombies come, unless the horde is wiped before the blood is full
  if(z.state==='gone'&&busy&&(s.hero==='knight'?s.stage<2&&!s.wave:s.hero==='goku'?s.stage<2&&!s.beam:!s.finale||!s.zombies.some(o=>o.state==='alive'||o.state==='rising'))){z.respawn+=dt;if(z.respawn>0.25+z.seed*0.45)Object.assign(z,makeZombie(z.row,56+Math.random()*60))}
 }
 if(busy){s.groanCd-=dt;if(s.groanCd<=0){s.groanCd=0.5+Math.random()*1.1;s.events.push('groan')}}
 if(s.hero==='knight')stepKnight(s,dt);
 else if(s.hero==='goku')stepGoku(s,dt);
 else{
 // aim + fire: the further the blood lags the upload, the harder he leans on the trigger
 const ready=busy&&s.soldierX<=SOLDIER_X;
 const alive=ready?s.zombies.filter(z=>(z.state==='alive'||(z.state==='rising'&&z.rise>0.45))&&z.hp>0).sort((a,b)=>b.x-a.x):[];
 const target=alive[Math.random()<0.75?0:Math.min(alive.length-1,1)];
 const piv=pivotOf(s);let want=s.phase==='done'?Math.PI/2:0,aimPt:Pt|null=null;
 if(target){const b=zombieBox(target,s.time,surface);aimPt=Math.random()<0.6?b.head:b.chest;want=Math.atan2(piv.y-aimPt.y,piv.x-aimPt.x)}
 s.aim+=(want-s.aim)*Math.min(1,dt*16);
 s.fireCd-=dt;
 const deficit=s.target-s.pool;
 if(target&&aimPt&&Math.abs(want-s.aim)<0.12&&s.fireCd<=0){
  const m=muzzleOf(s);
  s.bullets.push({x0:m.x,y0:m.y,x1:aimPt.x+(Math.random()-0.5)*3,y1:aimPt.y+(Math.random()-0.5)*3,t:0,target});
  s.flash=1;s.recoil=1;s.shake=Math.max(s.shake,0.8);s.events.push('shot');
  s.particles.push({x:piv.x+2,y:piv.y-2,vx:15+Math.random()*25,vy:-55-Math.random()*30,life:1.4,max:1.4,kind:'shell',size:1,caged:false});
  s.mag--;
  if(s.mag<=0){s.mag=MAG;s.fireCd=0.55;s.events.push('reload')}
  else s.fireCd=s.finale?FIRE_GAP*0.7:deficit>0.04?FIRE_GAP*0.8:deficit>0.005?FIRE_GAP:FIRE_GAP*2.2;
 }
 for(const b of s.bullets){
  const before=b.t;b.t+=dt/0.05;
  if(before<1&&b.t>=1){
   const z=b.target;
   if(z.state==='alive'||z.state==='rising'){
    z.hp--;z.flinch=1;s.hits++;if(s.hits%2)s.events.push('hit');
    spawnBlood(s,b.x1,b.y1,b.x1-b.x0,b.y1-b.y0,8);
    if(z.hp<=0){z.state='dying';z.t=0;z.respawn=0;s.kills++;s.skullPop=1;s.events.push('kill');spawnBlood(s,b.x1,b.y1,0,-1,16)}
    if(s.finale){
     // split what's left of the bar across the horde's remaining hit points so the last kill lands exactly on 100%
     const left=s.zombies.reduce((sum,o)=>sum+(o.state==='alive'||o.state==='rising'?Math.max(0,o.hp):0),0);
     s.pool=left>0?s.pool+(1-s.pool)/(left+1):1;
     if(s.pool>=1&&s.phase==='uploading'){s.shown=100;s.lastN=100;s.pop=1;s.shake=4;s.phase='done';s.phaseT=0;s.finished=true;s.bullets=[];s.events.push('win','hatch')}
    }
    // every hit spills blood, but the pool never outruns the real upload
    else if(deficit>0)s.pool=Math.min(s.target,0.97,s.pool+Math.max(0.0035,deficit*0.22));
   }
  }
 }
 s.bullets=s.bullets.filter(b=>b.t<1.5);
 }
 for(const r of s.ripples)r.t+=dt;s.ripples=s.ripples.filter(r=>r.t<1.2);
 for(const st of s.stains){st.life-=dt*0.2;st.len=Math.min(4,st.len+dt*0.8)}s.stains=s.stains.filter(st=>st.life>0);
 // particles
 for(const p of s.particles){
  p.life-=dt;
  if(p.kind==='bubble'){p.y+=p.vy*dt;if(p.y<surface+1)p.life=0;continue}
  if(p.kind==='spark'){p.y+=p.vy*dt;continue}
  if(p.kind==='ember'){p.x+=p.vx*dt;p.y+=p.vy*dt;continue}
  if(p.kind==='shard'){p.vy+=300*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.y>LH)p.life=0;continue}
  p.vy+=260*dt;const nx=p.x+p.vx*dt,ny=p.y+p.vy*dt;p.vx*=1-dt*1.2;
  if(p.kind==='blood'&&p.caged){
   if(!inside(nx,ny)){p.life=0;if(s.stains.length<70)s.stains.push({x:Math.round(clamp(nx,CAP.x0,CAP.x1-1)),y:Math.round(clamp(ny,TOP,BOTTOM-1)),life:1+Math.random(),len:0});continue}
   if(p.vy>0&&ny>=surfaceAt(s,nx)){p.life=0;if(Math.random()<0.15&&s.ripples.length<12)s.ripples.push({x:nx,t:0});continue}
  }
  p.x=nx;p.y=ny;
  if(p.kind==='shell'&&p.x>=LEDGE.x&&p.y>LEDGE.y-1&&p.y<LEDGE.y+4){p.y=LEDGE.y-1;p.vy*=-0.4;p.vx*=0.5;if(!p.bounced){p.bounced=true;if(Math.random()<0.3)s.events.push('clink')}}
  if((p.kind==='drip'||p.kind==='shell')&&p.y>LH)p.life=0;
 }
 s.particles=s.particles.filter(p=>p.life>0);
 if(s.fill>0.03&&Math.random()<dt*10)s.particles.push({x:CAP.x0+6+Math.random()*(CAP.x1-CAP.x0-12),y:BOTTOM-2,vx:0,vy:-8-Math.random()*8,life:3,max:3,kind:'bubble',size:1,caged:true});
 if(s.phase==='done'&&Math.random()<dt*6)s.particles.push({x:CAP.x0+Math.random()*(CAP.x1-CAP.x0+30),y:TOP-12+Math.random()*(CAP.r*2+24),vx:0,vy:-3,life:1.2,max:1.2,kind:'spark',size:1,caged:false});
 // blood dripping off the counter digits
 if(s.lastN>0&&(busy||s.phase==='done')&&Math.random()<dt*3.5&&s.drips.length<8){
  const {str,x}=counterLayout(s.lastN),i=Math.floor(Math.random()*str.length);
  const cells=glyphCells(str[i]).filter((cl,_,all)=>!all.some(o=>o.x===cl.x&&o.y===cl.y+1));
  const cell=cells[Math.floor(Math.random()*cells.length)];
  if(cell)s.drips.push({x:x+i*12+cell.x*3+Math.floor(Math.random()*3),y:COUNTER.y+cell.y*3+3,len:0,max:2+Math.random()*5,speed:3+Math.random()*6});
 }
 for(const d of s.drips){d.len+=d.speed*dt;if(d.len>=d.max)s.particles.push({x:d.x,y:d.y+d.len,vx:0,vy:10,life:2,max:2,kind:'drip',size:1,caged:false})}
 s.drips=s.drips.filter(d=>d.len<d.max);
}

function stepKnight(s:Scene,dt:number){
 const ready=s.phase==='uploading'&&s.soldierX<=SOLDIER_X;
 const want=s.stage===0?clamp(s.pct/0.5):clamp((s.pct-0.5)/0.5);
 if(!s.slash)s.charge+=(want-s.charge)*Math.min(1,dt*4);
 s.sinceSlash+=dt;
 // red sparks get pulled into the blade, faster and denser as it charges
 if(ready&&!s.slash&&s.charge>0.04){
  const h=knightHand(s),mid={x:h.x-Math.cos(s.aim)*12,y:h.y-Math.sin(s.aim)*12};
  for(let i=0;i<3;i++)if(Math.random()<dt*(4+s.charge*45)){const a=Math.random()*Math.PI*2,r=7+Math.random()*(6+s.charge*10),x=mid.x+Math.cos(a)*r,y=mid.y+Math.sin(a)*r;s.particles.push({x,y,vx:(mid.x-x)*3.2,vy:(mid.y-y)*3.2,life:0.3,max:0.3,kind:'ember',size:Math.random()<0.25?2:1,caged:false})}
  s.crackleCd-=dt;if(s.crackleCd<=0){s.crackleCd=0.45-s.charge*0.38+Math.random()*0.08;s.events.push('crackle')}
 }
 if(!s.slash)s.aim+=((s.phase==='done'?PLANTED:GUARD)-s.aim)*Math.min(1,dt*8);
 if(ready&&!s.slash&&!s.wave&&s.charge>0.93){
  if(s.stage===0&&s.pct>=0.5)s.slash={t:0,stage:1,launched:false};
  else if(s.stage===1&&s.finale&&s.sinceSlash>0.6)s.slash={t:0,stage:2,launched:false};
 }
 if(s.slash){
  const sl=s.slash;sl.t+=dt;const t=sl.t;
  s.aim=t<0.18?lerp(GUARD,RAISED,easeOut(t/0.18)):t<0.28?lerp(RAISED,FOLLOW,easeIn((t-0.18)/0.1)):t<0.7?FOLLOW:lerp(FOLLOW,GUARD,easeOut((t-0.7)/0.2));
  if(!sl.launched&&t>=0.22){
   sl.launched=true;const h=knightHand(s);
   s.wave={x:h.x-16,stage:sl.stage};s.events.push('slash');s.whiteout=0.8;s.shake=5;s.charge=0;
   // the slash floods the tube in one sweep: half-full at 50%, full at the end
   s.pool=sl.stage===1?0.5:1;s.flood=0.9;
  }
  if(t>=0.9){s.slash=null;s.sinceSlash=0}
 }
 if(s.wave){
  const w=s.wave;w.x-=dt*560;
  for(const z of s.zombies)if((z.state==='alive'||z.state==='rising')&&z.rise>0&&w.x<z.x){
   z.state='dying';z.t=0;z.respawn=0;z.flinch=1;s.kills++;s.skullPop=1;
   const b=zombieBox(z,s.time,levelY(s));spawnBlood(s,b.head.x,b.head.y,-1,-0.6,22);if(s.kills%2)s.events.push('kill');
  }
  if(w.x<CAP.x0-14){
   s.wave=null;
   if(w.stage===1)s.stage=1;
   else{
    s.stage=2;for(const z of s.zombies)if(z.state!=='gone'&&z.state!=='dying'){z.state='dying';z.t=0}
    if(s.phase==='uploading'){s.shown=100;s.lastN=100;s.pop=1;s.phase='done';s.phaseT=0;s.finished=true;s.events.push('win','hatch')}
   }
  }
 }
}

const gokuOrigin=(s:Scene)=>({x:Math.round(SOLDIER_X)-(GOKU_W>>1),y:LEDGE.y-32+Math.round(s.gy)});
/** The energy gathers between his hands, so it follows them wherever the springs carry them. */
const gokuBall=(s:Scene)=>{const o=gokuOrigin(s),[a,b]=s.gk.hands,mx=(a.x+b.x)/2,my=(a.y+b.y)/2;return {x:Math.round(o.x+mx+(s.beam?-3:2)),y:Math.round(o.y+my-1)}};
const spring=(v:number,vel:number,target:number,k:number,zeta:number,dt:number)=>{const a=(target-v)*k-vel*2*Math.sqrt(k)*zeta;vel+=a*dt;return [v+vel*dt,vel]};

/** Where each hand wants to be (relative to his origin) for what he is doing right now. */
function gokuHandTargets(s:Scene){
 const {bx,cr}=s.gk,t=s.time;
 if(s.falling)return [{x:21+Math.sin(t*20)*1.5,y:7},{x:2+Math.sin(t*20+2)*1.5,y:9}];
 if(s.beam)return [{x:-3+bx,y:18+cr},{x:-4+bx,y:19+cr}];
 if(s.transformT!==null)return [{x:19+bx,y:24+cr+Math.random()},{x:4+bx,y:24+cr+Math.random()}];
 if(s.phase==='uploading'&&s.landed)return [{x:20+bx,y:21+cr},{x:19+bx,y:22+cr}];
 // at rest: fists by his hips, like the reference pose
 return [{x:17+bx,y:23+cr},{x:6+bx,y:23+cr}];
}

/** Random branching fractures over the whole tube; `o` orders them so they can spread outward from the impact points. */
function makeCracks(){
 const out:{x:number;y:number;o:number}[]=[];
 for(let i=0;i<9;i++){
  const sx=CAP.x0+10+i*(CAP.x1-CAP.x0-20)/8+(Math.random()-0.5)*10,sy=CAP.cy+(Math.random()-0.5)*CAP.r*1.4;
  for(let b=0;b<4;b++){
   let x=sx,y=sy,a=Math.random()*Math.PI*2;
   for(let n=0;n<14+Math.random()*16;n++){a+=(Math.random()-0.5)*0.9;x+=Math.cos(a)*1.3;y+=Math.sin(a)*1.3;if(!inside(x,y))break;out.push({x:Math.round(x),y:Math.round(y),o:n/30})}
  }
 }
 return out;
}

function stepGoku(s:Scene,dt:number){
 const open=s.phase==='uploading';
 s.landT=Math.max(0,s.landT-dt);
 // he drops in from above the frame once the hatch is up, accelerating under gravity
 if(open&&s.hatch>0.5&&!s.landed){
  s.falling=true;s.gv+=640*dt;s.gy+=s.gv*dt;
  if(s.gy>=0){
   s.gy=0;s.gv=0;s.landed=true;s.falling=false;s.landT=0.28;s.shake=4;s.events.push('land');
   for(let i=0;i<14;i++){const d=i%2?1:-1;s.particles.push({x:SOLDIER_X+d*(4+Math.random()*6),y:LEDGE.y-1,vx:d*(20+Math.random()*40),vy:-10-Math.random()*25,life:0.5,max:0.5,kind:'ember',size:1,caged:false,color:'#8d8486'})}
   // the impact drives his knees down; the spring brings him back up with a little bounce
   s.gk.crv+=110;
  }
 }
 // body physics: lean back with the charge, get shoved back by the beam, sink into a deep stance to power up
 const g=s.gk;
 const leanT=s.beam?2.5:s.transformT!==null?0:s.phase==='uploading'&&s.landed?s.charge*1.2:0;
 const crT=s.falling?0:s.beam?1.5:s.transformT!==null?2.5:s.phase==='uploading'&&s.landed?0.8+s.charge*1.2:0;
 [g.bx,g.bxv]=spring(g.bx,g.bxv,leanT,120,0.45,dt);[g.cr,g.crv]=spring(g.cr,g.crv,crT,170,0.4,dt);g.cr=Math.max(-1,g.cr);
 const targets=gokuHandTargets(s);
 g.hands.forEach((h,i)=>{[h.x,h.vx]=spring(h.x,h.vx,targets[i].x,s.beam?420:220,0.55,dt);[h.y,h.vy]=spring(h.y,h.vy,targets[i].y,s.beam?420:220,0.55,dt)});
 g.blink-=dt;if(g.blink<-0.12)g.blink=1.8+Math.random()*2.5;
 if(s.beam&&Math.random()<dt*30){const o=gokuOrigin(s);s.particles.push({x:o.x+8+Math.random()*10,y:LEDGE.y-1,vx:20+Math.random()*40,vy:-5-Math.random()*15,life:0.4,max:0.4,kind:'ember',size:1,caged:false,color:'#8d8486'})}
 if(s.transformT!==null&&Math.random()<dt*18)s.particles.push({x:LEDGE.x+4+Math.random()*60,y:LEDGE.y-1,vx:(Math.random()-0.5)*6,vy:-12-Math.random()*20,life:1.4,max:1.4,kind:'ember',size:Math.random()<0.3?2:1,caged:false,color:Math.random()<0.5?'#6a6d74':'#4a3a2a'})
 const ready=open&&s.landed&&s.landT<=0;
 const want=s.stage===0?clamp(s.pct/0.5):clamp((s.pct-0.5)/0.49);
 if(!s.beam)s.charge+=(want-s.charge)*Math.min(1,dt*4);
 // energy gets pulled into his cupped hands
 if(ready&&!s.beam&&s.charge>0.04){
  const c=gokuBall(s);
  for(let i=0;i<3;i++)if(Math.random()<dt*(5+s.charge*45)){const a=Math.random()*Math.PI*2,r=6+Math.random()*(6+s.charge*10),x=c.x+Math.cos(a)*r,y=c.y+Math.sin(a)*r;s.particles.push({x,y,vx:(c.x-x)*3.4,vy:(c.y-y)*3.4,life:0.3,max:0.3,kind:'ember',size:Math.random()<0.25?2:1,caged:false,color:Math.random()<0.5?'#7fd0ff':'#ffffff'})}
  s.crackleCd-=dt;if(s.crackleCd<=0){s.crackleCd=0.45-s.charge*0.38+Math.random()*0.08;s.events.push('crackle')}
 }
 if(s.ssj&&Math.random()<dt*14){const o=gokuOrigin(s);s.particles.push({x:o.x+4+Math.random()*16,y:o.y+8+Math.random()*22,vx:0,vy:-25-Math.random()*25,life:0.5,max:0.5,kind:'ember',size:1,caged:false,color:Math.random()<0.5?'#ffd23f':'#fff6c0'})}
 // at 99% he transforms
 if(ready&&s.stage===1&&!s.ssj&&s.transformT===null&&!s.beam&&(s.pct>=0.99||s.finale)){s.transformT=0;s.events.push('powerup')}
 if(s.transformT!==null){
  const before=s.transformT;s.transformT+=dt;s.shake=Math.max(s.shake,2+s.transformT*2);
  if(before<1&&s.transformT>=1){s.ssj=true;s.whiteout=0.9;s.shake=6;s.events.push('boom')}
  if(s.transformT>=1.5)s.transformT=null;
 }
 // fire: at 50%, and once he has transformed and the upload is finished
 if(ready&&!s.beam&&s.transformT===null&&s.charge>0.92){
  if(s.stage===0&&s.pct>=0.5)fireBeam(s,1);
  else if(s.stage===1&&s.ssj&&s.finale)fireBeam(s,2);
 }
 if(s.beam){
  const b=s.beam;b.t+=dt;b.front=Math.max(CAP.x0-8,b.front-dt*720);
  if(b.stage===2)s.shake=Math.max(s.shake,2.5);
  for(const z of s.zombies)if((z.state==='alive'||z.state==='rising')&&z.rise>0&&b.front<z.x){
   z.state='dying';z.t=0;z.respawn=0;z.flinch=1;s.kills++;s.skullPop=1;
   const bx=zombieBox(z,s.time,levelY(s));spawnBlood(s,bx.head.x,bx.head.y,-1,-0.6,22);if(s.kills%2)s.events.push('kill');
  }
  if(b.stage===2&&b.front<=CAP.x0-8&&s.cracks.length===0){s.cracks=makeCracks();s.events.push('shatter')}
  if(b.t>=(b.stage===2?1.5:1.05)){
   s.beam=null;
   if(b.stage===1)s.stage=1;
   else{
    s.stage=2;for(const z of s.zombies)if(z.state!=='gone'&&z.state!=='dying'){z.state='dying';z.t=0}
    if(s.phase==='uploading'){s.shown=100;s.lastN=100;s.pop=1;s.phase='done';s.phaseT=0;s.finished=true;s.events.push('win')}
   }
  }
 }
 // the cracks spread across the glass, throwing shards, then blood seeps out of them
 if(s.cracks.length){
  const before=s.crackT;s.crackT=Math.min(1,s.crackT+dt*1.4);
  if(before<1)for(let i=0;i<6;i++)if(Math.random()<0.7){const p=s.cracks[Math.floor(Math.random()*s.cracks.length)];s.particles.push({x:p.x,y:p.y,vx:(Math.random()-0.5)*70,vy:-30-Math.random()*60,life:1.2,max:1.2,kind:'shard',size:Math.random()<0.3?2:1,caged:false})}
  if(s.crackT>=1&&Math.random()<dt*6)s.particles.push({x:CAP.x0+CAP.r+Math.random()*(CAP.x1-CAP.x0-CAP.r*2),y:BOTTOM,vx:0,vy:8,life:2,max:2,kind:'drip',size:1,caged:false});
 }
}

function fireBeam(s:Scene,stage:1|2){
 const c=gokuBall(s);
 s.beam={t:0,stage,front:c.x-5};s.charge=0;s.gk.bxv+=stage===2?90:60;s.gk.crv+=40;s.whiteout=stage===2?0.9:0.5;s.shake=stage===2?6:4;
 s.events.push(stage===2?'bigbeam':'beam');
 // the beam floods the tube: half-full at 50%, full with the final blast
 s.pool=stage===1?0.5:1;s.flood=1.1;
}

function drawLimb(ctx:CanvasRenderingContext2D,a:Pt,b:Pt){
 const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)));
 const at=(i:number)=>({x:Math.round(lerp(a.x,b.x,i/n)),y:Math.round(lerp(a.y,b.y,i/n))});
 ctx.fillStyle='#101018';for(let i=0;i<=n;i++){const p=at(i);ctx.fillRect(p.x-1,p.y-1,4,4)}
 ctx.fillStyle='#f2c08e';for(let i=0;i<=n;i++){const p=at(i);ctx.fillRect(p.x,p.y,2,2)}
 ctx.fillStyle='#2a3fa8';for(let i=Math.round(n*0.7);i<=Math.round(n*0.82);i++){const p=at(i);ctx.fillRect(p.x,p.y,2,2)}
}

// sprite bands that move independently: spiky hair, head and torso, legs
const HAIR_ROWS=10,TORSO_END=21;
/** Draws the sprite in three bands so his hair, torso and legs can each move on their own. */
function drawGokuBands(ctx:CanvasRenderingContext2D,img:HTMLCanvasElement,ox:number,oy:number,body:Pt,hair:Pt,legs:Pt){
 const h=img.height,w=img.width;
 ctx.drawImage(img,0,TORSO_END,w,h-TORSO_END,ox+legs.x,oy+TORSO_END+legs.y,w,h-TORSO_END);
 ctx.drawImage(img,0,HAIR_ROWS,w,TORSO_END-HAIR_ROWS,ox+body.x,oy+HAIR_ROWS+body.y,w,TORSO_END-HAIR_ROWS);
 ctx.drawImage(img,0,0,w,HAIR_ROWS,ox+hair.x,oy+hair.y,w,HAIR_ROWS);
}

function drawGoku(ctx:CanvasRenderingContext2D,s:Scene,sp:Sprites){
 if(!s.falling&&!s.landed)return;
 const g=s.gk,o=gokuOrigin(s),t=s.time,charging=s.phase==='uploading'&&s.landed&&!s.beam;
 const flick=s.transformT!==null&&s.transformT>0.25&&Math.floor(s.transformT*14)%2===0,gold=s.ssj||flick;
 // trembling with power while charging and while he transforms
 const amp=s.transformT!==null?1.4:charging?s.charge*1.1:0,jx=amp?Math.round((Math.random()-0.5)*2*amp):0,jy=amp>1?Math.round((Math.random()-0.5)*amp):0;
 const ox=o.x+jx,oy=o.y+jy;
 // breathing: slow at rest, quick and shallow while he strains
 const breath=Math.round((Math.sin(t*(charging?6:2.4))+1)/2*(charging?0.6:1));
 const bx=Math.round(g.bx),cr=Math.round(g.cr);
 const power=s.transformT!==null?Math.min(1,s.transformT):charging?s.charge:s.ssj?0.6:0;
 // hair streams up while he falls, sways at rest, and lifts with his power
 const hairY=s.falling?-2:-Math.round(power*1.6);
 const hairX=s.falling?0:Math.round(Math.sin(t*2.2)*0.6+(s.beam?1:0));
 const body={x:bx,y:cr+breath},hair={x:bx+hairX,y:cr+breath+hairY},legs={x:Math.round(bx*0.3),y:s.falling&&s.gv>200?1:0};
 if(s.falling){ctx.fillStyle='rgba(255,255,255,0.35)';for(let i=0;i<4;i++)ctx.fillRect(ox+4+i*5,oy-14-((i*7)%10),1,10+(i%2)*4)}
 else{ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(o.x+3-cr,LEDGE.y-1,18+cr*2,1)}
 if(s.falling&&s.gy>-40){const k=clamp(1+s.gy/40);ctx.fillStyle=`rgba(0,0,0,${0.5*k})`;ctx.fillRect(o.x+8,LEDGE.y-1,Math.round(8*k),1)}
 // aura: gold flames once he has transformed, a faint blue shimmer while charging
 if(gold||(charging&&s.charge>0.55)){
  ctx.globalAlpha=gold?0.45+0.25*Math.sin(t*28):(s.charge-0.55)*0.6;
  const img=gold?sp.gokuAura.img:sp.gokuAura.flash;
  for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,-2],[-1,-1],[1,-1]])drawGokuBands(ctx,img,ox+dx,oy+dy,body,{x:hair.x,y:hair.y-(gold?1+Math.round(Math.random()):0)},legs);
  ctx.globalAlpha=1;
 }
 const sh=GSHOULDER.map(p=>({x:ox+p.x+body.x,y:oy+p.y+body.y}));
 const hands=g.hands.map(h=>({x:ox+h.x,y:oy+h.y+breath}));
 drawLimb(ctx,sh[0],hands[0]);
 drawGokuBands(ctx,gold?sp.gokuSsj.img:sp.goku.img,ox,oy,body,hair,legs);
 // blink, or squeeze the eyes shut while he screams through the transformation
 if(g.blink<0||(s.transformT!==null&&s.transformT<1)){ctx.fillStyle='#c98a5c';ctx.fillRect(ox+10+body.x,oy+12+body.y,1,1)}
 drawLimb(ctx,sh[1],hands[1]);
 const ball=gokuBall(s),r=s.beam?0:charging||s.transformT!==null?1+s.charge*(s.ssj?6:4):0;
 if(r>0){
  const bx2=ball.x+jx,by=ball.y+jy+breath,flk=0.8+0.2*Math.sin(t*40);
  // round, dithered halo so the glow reads as light rather than a box
  const R2=Math.ceil(r*2);for(let y=-R2;y<=R2;y++)for(let x=-R2;x<=R2;x++){const d=Math.hypot(x,y);if(d<=r||d>r*2)continue;if((x+y)&1&&d>r*1.5)continue;ctx.fillStyle=`rgba(63,169,255,${0.4*flk*(1-(d-r)/r)})`;ctx.fillRect(Math.round(bx2+x),Math.round(by+y),1,1)}
  for(let y=-Math.ceil(r);y<=Math.ceil(r);y++)for(let x=-Math.ceil(r);x<=Math.ceil(r);x++){const d=Math.hypot(x,y);if(d>r)continue;ctx.fillStyle=d<r*0.45?'#ffffff':d<r*0.8?'#9fdcff':'#3fa9ff';ctx.fillRect(Math.round(bx2+x),Math.round(by+y),1,1)}
 }
 if(s.ssj&&Math.random()<0.35){ctx.fillStyle='#cff6ff';let x=ox+4+Math.random()*16,y=oy+4+Math.random()*20;for(let i=0;i<4;i++){ctx.fillRect(Math.round(x),Math.round(y),1,1);x+=(Math.random()-0.5)*4;y+=1+Math.random()*2}}
}

function drawBeam(ctx:CanvasRenderingContext2D,s:Scene){
 const b=s.beam;if(!b)return;
 const c=gokuBall(s),big=b.stage===2,end=b.stage===2?1.5:1.05;
 const fade=b.t>end-0.3?clamp((end-b.t)/0.3):1,flk=0.85+0.15*Math.sin(s.time*50);
 const half=(big?6:4)*fade*flk,x0=Math.round(b.front),x1=c.x+3;
 const band=(h:number,color:string)=>{if(h<0.5)return;const hh=Math.round(h);ctx.fillStyle=color;ctx.fillRect(x0,c.y-hh,x1-x0,hh*2+1)};
 band(half+3,'rgba(63,169,255,0.25)');band(half+1,'#3fa9ff');band(half*0.65,'#9fdcff');band(half*0.3,'#ffffff');
 // the head of the beam and the glow in his hands
 const r=Math.round(half+3);ctx.fillStyle='#9fdcff';ctx.fillRect(x0-r,c.y-r,r,r*2+1);ctx.fillStyle='#ffffff';ctx.fillRect(x0-Math.round(r*0.6),c.y-Math.round(r*0.5),Math.round(r*0.6),Math.round(r)+1);
 ctx.fillStyle='rgba(159,220,255,0.6)';ctx.fillRect(x1-3,c.y-r,6,r*2+1);
}

function drawCracks(ctx:CanvasRenderingContext2D,s:Scene){
 if(!s.cracks.length)return;
 for(const p of s.cracks){if(p.o>s.crackT)continue;ctx.fillStyle='rgba(20,20,30,0.7)';ctx.fillRect(p.x+1,p.y+1,1,1);ctx.fillStyle='#eef4ff';ctx.fillRect(p.x,p.y,1,1)}
}

function drawKnight(ctx:CanvasRenderingContext2D,s:Scene,sp:Sprites){
 const walking=s.soldierX>SOLDIER_X,charging=s.phase==='uploading'&&!walking&&!s.slash;
 // he trembles with the charge
 const amp=charging?s.charge*1.6:0,jx=amp?Math.round((Math.random()-0.5)*2*amp):0,jy=amp?Math.round((Math.random()-0.5)*amp):0;
 const crouch=s.slash&&s.slash.t<0.32?1:0;
 const o=knightOrigin(s,(walking&&Math.floor(s.walkPh)%2?1:0)-crouch),ox=o.x+jx,oy=o.y+jy;
 ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(o.x+3,LEDGE.y-1,16,1);
 if(charging&&s.charge>0.3){ctx.globalAlpha=(s.charge-0.3)*0.55*(0.7+0.3*Math.sin(s.time*30));for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]])ctx.drawImage(sp.knightGlow.img,ox+dx,oy+dy);ctx.globalAlpha=1}
 ctx.drawImage(sp.knight.img,ox,oy);
 const glow=charging?s.charge:s.slash?1-clamp((s.slash.t-0.3)/0.4):0;
 ctx.save();ctx.translate(ox+KHAND.x,oy+KHAND.y);ctx.rotate(s.aim);
 if(glow>0){ctx.globalAlpha=glow*0.55;for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[-2,0]])ctx.drawImage(sp.swordGlow.img,-SPIV.x+dx,-SPIV.y+dy)}
 ctx.globalAlpha=1;ctx.drawImage(sp.sword.img,-SPIV.x,-SPIV.y);
 if(glow>0){ctx.globalAlpha=glow*0.8;ctx.drawImage(sp.swordGlow.img,-SPIV.x,-SPIV.y);if(glow>0.92&&Math.sin(s.time*40)>0){ctx.globalAlpha=0.6;ctx.drawImage(sp.sword.flash,-SPIV.x,-SPIV.y)}}
 ctx.restore();ctx.globalAlpha=1;
 // arc trail behind the swing
 if(s.slash&&s.slash.t>0.17&&s.slash.t<0.45){
  const a=clamp(1-(s.slash.t-0.22)/0.23),hx=ox+KHAND.x,hy=oy+KHAND.y;
  for(let an=FOLLOW;an<=RAISED;an+=0.04)for(let r=16;r<=23;r++){
   const d=Math.abs(r-20);ctx.fillStyle=d<1?`rgba(255,240,240,${a})`:`rgba(255,42,61,${a*(1-d/4)})`;
   ctx.fillRect(Math.round(hx-Math.cos(an)*r),Math.round(hy-Math.sin(an)*r),1,1);
  }
 }
}

function drawWave(ctx:CanvasRenderingContext2D,s:Scene){
 const w=s.wave;if(!w)return;
 for(let y=TOP-6;y<=BOTTOM+6;y++){
  const dy=(y-CAP.cy)/(CAP.r+6),x=Math.round(w.x-(1-dy*dy)*8);
  ctx.fillStyle='rgba(255,42,61,0.18)';ctx.fillRect(x-2,y,16,1);
  ctx.fillStyle='#fff3f3';ctx.fillRect(x,y,2,1);
  ctx.fillStyle='#ff2a3d';ctx.fillRect(x+2,y,3,1);
  ctx.fillStyle='rgba(180,0,20,0.55)';ctx.fillRect(x+5,y,6,1);
 }
}

function drawMouth(ctx:CanvasRenderingContext2D,s:Scene){
 const x=CAP.x1,t=s.time,hazard=s.phase!=='idle'||s.heat>0.05;
 // ledge the soldier walks in on
 for(let px=LEDGE.x;px<LW;px++){ctx.fillStyle=px<LEDGE.x+2?'#9a9da4':'#6a6d74';ctx.fillRect(px,LEDGE.y,1,1);ctx.fillStyle=px%3?'#2b2b2e':'#16161a';ctx.fillRect(px,LEDGE.y+1,1,2)}
 for(let px=LEDGE.x;px<LEDGE.x+6;px++){ctx.fillStyle=((px>>1)&1)?'#ffcf1f':'#1a1a1a';ctx.fillRect(px,LEDGE.y+3,1,1)}
 for(let i=0;i<34;i++){const sx=LEDGE.x+10+i*2,sy=LEDGE.y+3+i;if(sx>=LW||sy>=LH)break;ctx.fillStyle=`rgba(58,58,62,${1-i/40})`;ctx.fillRect(sx,sy,2,1)}
 // hatch door slides up out of the way once the file is in
 const lift=Math.round(easeOut(s.hatch)*(BOTTOM+4)),off=hazard?Math.floor(t*10):0;
 for(let y=TOP-2;y<BOTTOM+2;y++)for(let px=0;px<DOOR.w;px++){
  const yy=y-lift;if(yy<0)continue;
  const edge=y===TOP-2||y===BOTTOM+1||px===0||px===DOOR.w-1;
  ctx.fillStyle=edge?'#1e1a16':((px+y+off)>>2)&1?(hazard?'#ffcf1f':'#6b6b6b'):'#1a1a1a';ctx.fillRect(DOOR.x+px,yy,1,1);
 }
 // metal collar around the mouth
 ['#4a4d54','#8c8f97','#d6d8de','#a7aab1','#5d6068'].forEach((col,i)=>{ctx.fillStyle=col;ctx.fillRect(x-1+i,TOP-4,1,BOTTOM-TOP+8)});
 const lamp=s.phase==='done'?[61,255,122]:s.phase==='error'?[255,176,32]:s.phase==='idle'&&s.heat<0.5?[90,58,58]:[255,42,61];
 const pulse=s.phase==='idle'&&s.heat<0.5?0.25:s.phase==='done'?0.9:0.45+0.55*Math.abs(Math.sin(t*(s.phase==='drag'?9:5)));
 ctx.fillStyle='#2b2b2e';ctx.fillRect(x-1,TOP-6,6,2);
 ctx.fillStyle=rgba([...lamp,0.18*pulse]);ctx.fillRect(x-4,TOP-12,12,7);
 ctx.fillStyle=rgba([...lamp,0.5+0.5*pulse]);ctx.fillRect(x,TOP-9,4,3);ctx.fillRect(x+1,TOP-10,2,1);
}

function drawSoldier(ctx:CanvasRenderingContext2D,s:Scene,sp:Sprites){
 const walking=s.soldierX>SOLDIER_X;
 const hop=s.phase==='done'?Math.round(Math.abs(Math.sin(s.phaseT*6))*3*clamp(2-s.phaseT*0.5)):0;
 const o=soldierOrigin(s,hop,walking&&Math.floor(s.walkPh)%2?1:0);
 ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(o.x+2,LEDGE.y-1,15,1);
 ctx.drawImage(walking&&Math.floor(s.walkPh)%2?sp.soldierB.img:sp.soldierA.img,o.x,o.y);
 const kick=Math.round(s.recoil*2);
 ctx.save();ctx.translate(o.x+SHOULDER.x+Math.cos(s.aim)*kick,o.y+SHOULDER.y+Math.sin(s.aim)*kick);ctx.rotate(s.aim);
 ctx.drawImage(sp.arms.img,-PIVOT.x,-PIVOT.y);
 if(s.flash>0){
  const r=s.flash>0.5?3:2,mx=-BARREL-r;
  ctx.fillStyle=`rgba(255,200,60,${0.35*s.flash})`;ctx.fillRect(mx-r*2,-r*2,r*4+1,r*4+1);
  ctx.fillStyle='#ffe873';ctx.fillRect(mx-r,-r,r*2+1,r*2+1);
  ctx.fillStyle='#ffffff';ctx.fillRect(mx-1,-1,3,3);ctx.fillRect(mx-r-2,0,2,1);
 }
 ctx.restore();
}

function render(ctx:CanvasRenderingContext2D,s:Scene,sp:Sprites){
 const t=s.time,heat=s.heat,active=s.phase!=='idle'&&s.phase!=='drag';
 ctx.imageSmoothingEnabled=false;
 ctx.fillStyle='#000000';ctx.fillRect(0,0,LW,LH);
 const glowA=lerp(0.05,0.2,heat)+(active?0.08+s.fill*0.22:0);
 ctx.save();ctx.translate((CAP.x0+CAP.x1)/2,CAP.cy+4);ctx.scale(1,0.42);
 const glow=ctx.createRadialGradient(0,0,4,0,0,140);glow.addColorStop(0,`rgba(255,30,50,${glowA})`);glow.addColorStop(1,'rgba(255,30,50,0)');ctx.fillStyle=glow;ctx.fillRect(-LW,-LH*3,LW*2,LH*6);ctx.restore();
 // glass interior tint
 const idleTint=[150,170,190,0.06],dragTint=[150,10,25,0.32+0.08*Math.sin(t*8)],liveTint=[50,6,12,0.55];
 ctx.fillStyle=rgba(active?liveTint:mix(idleTint,dragTint,heat));
 for(const r of SPANS)ctx.fillRect(r.xl,r.y,r.xr-r.xl,1);
 // horde, clipped to the glass; back row first and dimmer
 ctx.save();ctx.beginPath();for(const r of SPANS)ctx.rect(r.xl,r.y,r.xr-r.xl,1);ctx.clip();
 const order=[...s.zombies].filter(z=>z.state!=='gone').sort((a,b)=>a.row-b.row||a.x-b.x);
 for(const z of order){
  const b=zombieBox(z,t,levelY(s)),bob=Math.round(Math.sin(t*5+z.seed*7)),reach=Math.round((1-b.up)*5);
  const base=(z.state==='dying'?clamp(1-easeIn(z.t)):1)*(z.row?1:0.62),body=Math.sin(t*4+z.seed*11)>0?sp.zOpen:sp.zShut;
  const parts:[Sprite,number,number][]=[[sp.zArmBack,b.left+16-reach,b.top+14-bob],[body,b.left,b.top],[sp.zArm,b.left+14-reach,b.top+16+bob]];
  for(const [part,x,y] of parts){ctx.globalAlpha=base;ctx.drawImage(part.img,x,y);if(z.flinch>0.4){ctx.globalAlpha=base*0.55*z.flinch;ctx.drawImage(part.flash,x,y)}}
 }
 ctx.globalAlpha=1;ctx.restore();
 // blood piling up from the floor of the capsule, column by column so the surface can ripple
 if(s.fill>0.002){
  for(const col of COLS){
   const sy=Math.round(surfaceAt(s,col.x));if(sy>=col.bottom)continue;
   const band=(from:number,to:number,color:string)=>{const a=Math.max(col.top,sy+from),b=Math.min(col.bottom,sy+to);if(b>a){ctx.fillStyle=color;ctx.fillRect(col.x,a,1,b-a)}};
   band(0,1,'#ff6b7a');band(1,3,'#f2223a');band(3,8,'#d00c25');band(8,16,'#a0061a');band(16,99,'#6a0411');
  }
  ctx.fillStyle='#7c0315';const ly=levelY(s);
  for(let i=0;i<12;i++){const cx=Math.round(CAP.x0+6+((i*53+t*(4+i%3))%(CAP.x1-CAP.x0-12))),cy=Math.round(lerp(ly+3,BOTTOM-2,((i*37)%10)/10)+Math.sin(t+i));if(cy>ly+2&&inside(cx,cy))ctx.fillRect(cx,cy,i%2?3:2,1)}
  for(const p of s.particles)if(p.kind==='bubble'){ctx.fillStyle='#ff8c96';ctx.fillRect(Math.round(p.x),Math.round(p.y),1,1)}
 }
 if(heat>0.02){
  for(let i=0;i<4;i++){const k=Math.max(0,Math.sin(t*3.4+i*1.9));ctx.globalAlpha=heat*(0.2+0.5*k);ctx.drawImage(sp.hand.img,CAP.x0+26+i*38,CAP.cy-3+(i%2?4:-5))}
  ctx.globalAlpha=heat*(0.6+0.4*Math.sin(t*8));const msg='CONTAINMENT BREACH';drawText(ctx,msg,(CAP.x0+CAP.x1)/2-textWidth(msg)/2,CAP.cy-2,'#ff4657');ctx.globalAlpha=1;
 }
 for(const st of s.stains){ctx.fillStyle=`rgba(150,0,20,${clamp(st.life)})`;ctx.fillRect(st.x,st.y,1,1+Math.floor(st.len))}
 // glass outline with a blocky glow
 const rim=active?[226,214,218,1]:mix([184,190,200,0.8],[255,60,76,1],heat);
 const glowRim=active?0.25+s.fill*0.35:heat*0.5;
 if(glowRim>0.02){ctx.fillStyle=`rgba(255,40,60,${glowRim*0.45})`;for(const p of OUTLINE){ctx.fillRect(p.x-1,p.y,1,1);ctx.fillRect(p.x+1,p.y,1,1);ctx.fillRect(p.x,p.y-1,1,1);ctx.fillRect(p.x,p.y+1,1,1)}}
 ctx.fillStyle=rgba(rim);for(const p of OUTLINE)ctx.fillRect(p.x,p.y,1,1);
 ctx.fillStyle='rgba(255,255,255,0.4)';ctx.fillRect(SPANS[3].xl+3,TOP+3,CAP.x1-CAP.x0-30,1);ctx.fillRect(CAP.x0+CAP.r+4,BOTTOM-4,40,1);
 for(const cx of [CAP.x0+30,CAP.x0+100]){['#5a5d64','#c9ccd3','#8c8f96','#5a5d64'].forEach((col,i)=>{ctx.fillStyle=col;ctx.fillRect(cx+i,TOP-2,1,CAP.r*2+4)})}
 drawCracks(ctx,s);
 drawMouth(ctx,s);
 for(const b of s.bullets){
  if(b.t>1.2)continue;const t1=clamp(b.t),t0=clamp(b.t-0.45),steps=Math.ceil(Math.hypot(b.x1-b.x0,b.y1-b.y0)*(t1-t0));
  ctx.fillStyle='#ffe9a0';for(let i=0;i<=steps;i++){const k=lerp(t0,t1,i/Math.max(1,steps));ctx.fillRect(Math.round(lerp(b.x0,b.x1,k)),Math.round(lerp(b.y0,b.y1,k)),1,1)}
 }
 for(const p of s.particles){
  const x=Math.round(p.x),y=Math.round(p.y),a=clamp(p.life/p.max*1.6);
  if(p.kind==='blood'){ctx.fillStyle=`rgba(214,12,34,${a})`;ctx.fillRect(x,y,p.size,p.size)}
  else if(p.kind==='drip'){ctx.fillStyle='#b00a1e';ctx.fillRect(x,y,1,2)}
  else if(p.kind==='shell'){ctx.fillStyle=`rgba(230,186,72,${a})`;ctx.fillRect(x,y,2,1)}
  else if(p.kind==='ember'){ctx.fillStyle=p.color??(p.life>0.15?'#ff3b4e':'#ffd0d4');ctx.fillRect(x,y,p.size,p.size)}
  else if(p.kind==='shard'){ctx.fillStyle=`rgba(225,236,255,${a})`;ctx.fillRect(x,y,p.size,p.size)}
  else if(p.kind==='spark'){ctx.fillStyle=`rgba(255,150,160,${a})`;ctx.fillRect(x-1,y,3,1);ctx.fillRect(x,y-1,1,3)}
 }
 drawWave(ctx,s);drawBeam(ctx,s);
 if(s.hero==='goku')drawGoku(ctx,s,sp);
 else if(s.soldierX<LW+10){if(s.hero==='knight')drawKnight(ctx,s,sp);else drawSoldier(ctx,s,sp)}
 if(s.file){
  const k=easeIn(s.file.t),x=Math.round(lerp(s.file.x,DOOR.x+DOOR.w/2,k)),y=Math.round(lerp(s.file.y,CAP.cy,k)-Math.sin(k*Math.PI)*16);
  const w=Math.max(3,Math.round(12*(1-k*0.8))),h=Math.max(4,Math.round(15*(1-k*0.8)));
  ctx.fillStyle='#1e1a16';ctx.fillRect(x-(w>>1)-1,y-(h>>1)-1,w+2,h+2);ctx.fillStyle='#f2f2f2';ctx.fillRect(x-(w>>1),y-(h>>1),w,h);
  ctx.fillStyle='#d10a22';ctx.fillRect(x-(w>>1)+1,y,Math.max(1,w-2),Math.max(1,h>>2));
 }
 if(s.whiteout>0){ctx.fillStyle=`rgba(255,225,228,${s.whiteout*0.55})`;ctx.fillRect(0,0,LW,LH)}
 drawHud(ctx,s,sp);
}

function drawHud(ctx:CanvasRenderingContext2D,s:Scene,sp:Sprites){
 const center=(text:string,y:number,color:string)=>drawText(ctx,text,COUNTER.cx-textWidth(text)/2,y,color);
 if(s.phase==='idle'||s.phase==='drag'){
  if(s.heat>0.5){ctx.globalAlpha=0.6+0.4*Math.abs(Math.sin(s.time*6));center('RELEASE TO UNLEASH THE HORDE',84,'#ff4657');ctx.globalAlpha=1}
  else center('DROP A FILE INTO THE CAPSULE',84,'#8d8486');
  return;
 }
 if(s.phase==='error'){center('UPLOAD FAILED - THE HORDE GOT OUT',84,'#ffb020');return}
 const {str,x,w}=counterLayout(s.lastN),lift=Math.round(s.pop*2);
 const shade=(row:number)=>row<2?'#ff4a5a':row<3?'#e0102a':'#9c0618';
 drawText(ctx,str,x+1,COUNTER.y+1-lift,'#2a0006',3);
 drawText(ctx,str,x,COUNTER.y-lift,shade,3);
 drawText(ctx,'%',x+w+3,COUNTER.y-lift,'#c9b8ba',1);
 for(const d of s.drips){ctx.fillStyle='#b00a1e';ctx.fillRect(d.x,d.y,1,Math.ceil(d.len));ctx.fillRect(d.x,d.y+Math.ceil(d.len)-1,2,1)}
 center(s.phase==='done'?'UPLOAD COMPLETE':`${mb(s.loaded)} OF ${mb(s.total)} MB`,COUNTER.y+19,s.phase==='done'?'#3dff7a':'#8d8486');
 const kx=184,ky=80,bump=Math.round(s.skullPop*2);
 ctx.drawImage(sp.skull.img,kx,ky-bump);
 drawText(ctx,`×${s.kills}`,kx+10,ky-bump,'#f0ead8',2);
}

export default function ZombieCapsuleUpload({upload=simulateUpload,onComplete,accept,hero='soldier'}:{upload?:UploadFn;onComplete?:(file:File)=>void;accept?:string;hero?:Hero}){
 const canvasRef=useRef<HTMLCanvasElement>(null);
 const inputRef=useRef<HTMLInputElement>(null);
 const scene=useRef<Scene>(freshScene(hero));
 const heroRef=useRef(hero);heroRef.current=hero;
 const sfx=useRef<Sfx|null>(null);
 const dragDepth=useRef(0);
 const beforeDrag=useRef<Phase>('idle');
 const abort=useRef<AbortController|null>(null);
 const current=useRef<File|null>(null);
 const onCompleteRef=useRef(onComplete);onCompleteRef.current=onComplete;
 const [phase,setPhase]=useState<Phase>('idle');
 const [status,setStatus]=useState('');
 const [sound,setSound]=useState(true);

 const go=useCallback((p:Phase)=>{const s=scene.current;s.phase=p;s.phaseT=0;setPhase(p)},[]);
 const unlock=()=>sfx.current?.unlock();

 useEffect(()=>{
  const audio=new Sfx();sfx.current=audio;
  try{if(window.localStorage.getItem('zombie-capsule-sfx')==='off'){audio.enabled=false;setSound(false)}}catch{}
  const canvas=canvasRef.current;if(!canvas)return;const ctx=canvas.getContext('2d');if(!ctx)return;
  const low=document.createElement('canvas');low.width=LW;low.height=LH;const lctx=low.getContext('2d');if(!lctx)return;
  const sprites=buildSprites();
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const resize=()=>{const dpr=window.devicePixelRatio||1,k=Math.max(1,Math.round((canvas.clientWidth||LW*2)*dpr/LW));canvas.width=LW*k;canvas.height=LH*k};
  resize();const ro=new ResizeObserver(resize);ro.observe(canvas);
  let raf=0,last=performance.now(),lastPct=-1;
  const frame=(now:number)=>{
   const dt=Math.min(0.05,(now-last)/1000);last=now;const s=scene.current;
   step(s,dt);render(lctx,s,sprites);
   const k=canvas.width/LW,shake=reduced?0:Math.round(s.shake);
   ctx.imageSmoothingEnabled=false;ctx.fillStyle='#000000';ctx.fillRect(0,0,canvas.width,canvas.height);
   ctx.drawImage(low,shake?Math.round((Math.random()-0.5)*shake*2)*k:0,shake?Math.round((Math.random()-0.5)*shake*2)*k:0,canvas.width,canvas.height);
   for(const e of s.events.splice(0))audio.play(e);
   audio.setHum(s.phase!=='uploading'?0:s.hero==='knight'&&s.soldierX<=SOLDIER_X&&!s.slash?s.charge:s.hero==='goku'&&s.landed&&!s.beam?Math.max(s.charge,s.transformT!==null?1:0):0);
   if(s.finished){s.finished=false;setPhase('done');setStatus(`Upload complete. ${s.kills} zombies down.`);if(current.current)onCompleteRef.current?.(current.current)}
   const pct=s.lastN;if(pct!==lastPct&&s.phase==='uploading'&&pct%10===0){lastPct=pct;setStatus(`Uploading ${pct}%`)}
   raf=requestAnimationFrame(frame);
  };
  raf=requestAnimationFrame(frame);
  return()=>{cancelAnimationFrame(raf);ro.disconnect();abort.current?.abort();audio.dispose()};
 },[]);

 const start=useCallback((file:File,at?:Pt)=>{
  const s=scene.current;if(s.phase==='intake'||s.phase==='uploading')return;
  abort.current?.abort();
  Object.assign(s,freshScene(heroRef.current));
  const total=Math.max(1,file.size);s.total=total;
  s.file={x:at?.x??COUNTER.cx,y:at?.y??LH-20,t:0};
  s.zombies=spawnHorde();
  s.events.push('suck');current.current=file;
  go('intake');setStatus(`Uploading ${file.name}`);
  const ctl=new AbortController();abort.current=ctl;
  upload(file,loaded=>{if(ctl.signal.aborted)return;s.loaded=Math.min(total,loaded);s.pct=clamp(loaded/total);s.target=Math.max(s.target,s.pct*0.995)},ctl.signal)
   .then(()=>{
    // the upload is done: the soldier clears the rest of the horde (or the knight makes his final slash), finishing the bar
    if(ctl.signal.aborted)return;s.loaded=total;s.pct=1;s.target=1;s.finale=true;
   })
   .catch(()=>{if(ctl.signal.aborted)return;s.events.push('fail');go('error');setStatus('Upload failed.')});
 },[go,upload]);

 const toScene=(e:DragEvent):Pt=>{const r=canvasRef.current?.getBoundingClientRect();if(!r)return{x:LW/2,y:LH/2};return{x:(e.clientX-r.left)/r.width*LW,y:(e.clientY-r.top)/r.height*LH}};
 const busy=phase==='intake'||phase==='uploading';
 const onDragEnter=(e:DragEvent)=>{e.preventDefault();if(busy)return;dragDepth.current++;if(scene.current.phase!=='drag'){beforeDrag.current=scene.current.phase;scene.current.alarmCd=0;go('drag')}};
 const onDragLeave=(e:DragEvent)=>{e.preventDefault();if(busy)return;dragDepth.current=Math.max(0,dragDepth.current-1);if(dragDepth.current===0&&scene.current.phase==='drag')go(beforeDrag.current)};
 const onDrop=(e:DragEvent)=>{e.preventDefault();unlock();dragDepth.current=0;const file=e.dataTransfer.files?.[0];if(file&&!busy)start(file,toScene(e));else if(scene.current.phase==='drag')go(beforeDrag.current)};
 const browse=()=>{unlock();if(!busy)inputRef.current?.click()};
 const reset=()=>{abort.current?.abort();Object.assign(scene.current,freshScene(heroRef.current));setStatus('');go('idle')};
 const toggleSound=()=>{const on=!sound;setSound(on);sfx.current?.setEnabled(on);try{window.localStorage.setItem('zombie-capsule-sfx',on?'on':'off')}catch{}};

 return <div className={styles.root} onPointerDown={unlock}>
  <div className={styles.stage} role="button" tabIndex={0} aria-label="Upload a file: drop it into the capsule or press Enter to browse"
   onClick={browse} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();browse()}}}
   onDragEnter={onDragEnter} onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect=busy?'none':'copy'}} onDragLeave={onDragLeave} onDrop={onDrop}>
   <canvas ref={canvasRef} className={styles.canvas}/>
  </div>
  <button type="button" className={styles.sound} onClick={toggleSound} aria-pressed={sound}>{sound?'SFX ON':'SFX OFF'}</button>
  <div className={styles.sr} aria-live="polite">{status}</div>
  {(phase==='done'||phase==='error')&&<div className={styles.actions}><button type="button" className={styles.again} onClick={reset}>{phase==='done'?'Upload another':'Try again'}</button></div>}
  <input ref={inputRef} className={styles.input} type="file" accept={accept} onChange={e=>{const f=e.target.files?.[0];if(f)start(f);e.target.value=''}}/>
 </div>;
}
