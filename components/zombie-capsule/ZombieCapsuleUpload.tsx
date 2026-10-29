'use client';
import {useCallback,useEffect,useRef,useState,type DragEvent} from 'react';
import styles from './ZombieCapsuleUpload.module.css';
import {Sfx,type SfxName} from './sfx';
import {
 ARMS_MUZZLE,ARMS_PIVOT,SKULL,SKULL_PALETTE,SOLDIER_A,SOLDIER_ARMS,SOLDIER_B,SOLDIER_PALETTE,SOLDIER_SHOULDER,
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
 * Everything is drawn on a low-res canvas and scaled up with nearest-neighbour.
 */
export type UploadFn=(file:File,onProgress:(loaded:number)=>void,signal:AbortSignal)=>Promise<void>;
type Phase='idle'|'drag'|'intake'|'uploading'|'done'|'error';

type Pt={x:number;y:number};
type Zombie={x:number;row:0|1;seed:number;speed:number;rise:number;hp:number;state:'rising'|'alive'|'dying'|'gone';t:number;flinch:number;respawn:number};
type Particle={x:number;y:number;vx:number;vy:number;life:number;max:number;kind:'blood'|'shell'|'spark'|'bubble'|'drip';size:number;caged:boolean;bounced?:boolean};
type Bullet={x0:number;y0:number;x1:number;y1:number;t:number;target:Zombie};
type Scene={
 phase:Phase;time:number;phaseT:number;
 pool:number;fill:number;fillV:number;target:number;pct:number;loaded:number;total:number;
 shown:number;lastN:number;pop:number;heat:number;hatch:number;topoff:number;finale:boolean;finished:boolean;
 soldierX:number;walkPh:number;aim:number;fireCd:number;mag:number;flash:number;recoil:number;shake:number;hits:number;
 kills:number;skullPop:number;groanCd:number;alarmCd:number;
 zombies:Zombie[];particles:Particle[];bullets:Bullet[];ripples:{x:number;t:number}[];
 stains:{x:number;y:number;life:number;len:number}[];drips:{x:number;y:number;len:number;max:number;speed:number}[];
 file:{x:number;y:number;t:number}|null;events:SfxName[];
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

type Sprites={soldierA:Sprite;soldierB:Sprite;arms:Sprite;zOpen:Sprite;zShut:Sprite;zArm:Sprite;zArmBack:Sprite;skull:Sprite;hand:Sprite};
// Source art faces the soldier right / zombies left; here the soldier faces left into the capsule and the zombies face him.
const buildSprites=():Sprites=>({
 soldierA:flipSprite(makeSprite(SOLDIER_A,SOLDIER_PALETTE)),soldierB:flipSprite(makeSprite(SOLDIER_B,SOLDIER_PALETTE)),arms:flipSprite(makeSprite(SOLDIER_ARMS,SOLDIER_PALETTE)),
 zOpen:flipSprite(makeSprite(ZOMBIE_OPEN,ZOMBIE_PALETTE)),zShut:flipSprite(makeSprite(ZOMBIE_SHUT,ZOMBIE_PALETTE)),zArm:flipSprite(makeSprite(ZOMBIE_ARM,ZOMBIE_PALETTE)),zArmBack:flipSprite(makeSprite(ZOMBIE_ARM_BACK,ZOMBIE_PALETTE)),
 skull:makeSprite(SKULL,SKULL_PALETTE),hand:makeSprite(HANDPRINT,{r:'#c8001e'}),
});
const SOLDIER_W=Math.max(...SOLDIER_A.map(r=>r.length)),ARMS_W=Math.max(...SOLDIER_ARMS.map(r=>r.length));
const SHOULDER={x:SOLDIER_W-1-SOLDIER_SHOULDER.x,y:SOLDIER_SHOULDER.y};
const PIVOT={x:ARMS_W-1-ARMS_PIVOT.x,y:ARMS_PIVOT.y};
const BARREL=ARMS_MUZZLE.x-ARMS_PIVOT.x;

const simulateUpload:UploadFn=(file,onProgress,signal)=>new Promise((resolve,reject)=>{
 const total=Math.max(1,file.size),duration=8000+Math.random()*2000;let loaded=0,last=performance.now();
 const id=window.setInterval(()=>{const now=performance.now();loaded=Math.min(total,loaded+total*((now-last)/duration)*(0.35+Math.random()*1.3));last=now;onProgress(loaded);if(loaded>=total){window.clearInterval(id);resolve()}},120);
 signal.addEventListener('abort',()=>{window.clearInterval(id);reject(new DOMException('Aborted','AbortError'))});
});

const freshScene=():Scene=>({
 phase:'idle',time:0,phaseT:0,pool:0,fill:0,fillV:0,target:0,pct:0,loaded:0,total:0,shown:0,lastN:0,pop:0,heat:0,hatch:0,topoff:0,finale:false,finished:false,
 soldierX:SOLDIER_START,walkPh:0,aim:0,fireCd:0,mag:MAG,flash:0,recoil:0,shake:0,hits:0,kills:0,skullPop:0,groanCd:1,alarmCd:0,
 zombies:[],particles:[],bullets:[],ripples:[],stains:[],drips:[],file:null,events:[],
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
 s.pop=Math.max(0,s.pop-dt*8);s.skullPop=Math.max(0,s.skullPop-dt*5);
 s.heat+=((s.phase==='drag'?1:0)-s.heat)*Math.min(1,dt*6);
 const open=s.phase==='uploading'||s.phase==='done'||s.phase==='error';
 // the hatch slams shut again once the last zombie is down
 s.hatch=clamp(s.hatch+(s.phase==='uploading'||s.phase==='error'?dt*2:-dt*2.4));
 // blood level glides toward what has actually been spilled
 const k=24,c=2*Math.sqrt(k);s.fillV+=((s.pool-s.fill)*k-s.fillV*c)*dt;s.fill=clamp(s.fill+s.fillV*dt);
 s.shown+=(s.pool*100-s.shown)*Math.min(1,dt*8);
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
  if(z.state==='gone'&&busy&&(!s.finale||!s.zombies.some(o=>o.state==='alive'||o.state==='rising'))){z.respawn+=dt;if(z.respawn>0.25+z.seed*0.45)Object.assign(z,makeZombie(z.row,56+Math.random()*60))}
 }
 if(busy){s.groanCd-=dt;if(s.groanCd<=0){s.groanCd=0.5+Math.random()*1.1;s.events.push('groan')}}
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
 for(const r of s.ripples)r.t+=dt;s.ripples=s.ripples.filter(r=>r.t<1.2);
 for(const st of s.stains){st.life-=dt*0.2;st.len=Math.min(4,st.len+dt*0.8)}s.stains=s.stains.filter(st=>st.life>0);
 // particles
 for(const p of s.particles){
  p.life-=dt;
  if(p.kind==='bubble'){p.y+=p.vy*dt;if(p.y<surface+1)p.life=0;continue}
  if(p.kind==='spark'){p.y+=p.vy*dt;continue}
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
  else if(p.kind==='spark'){ctx.fillStyle=`rgba(255,150,160,${a})`;ctx.fillRect(x-1,y,3,1);ctx.fillRect(x,y-1,1,3)}
 }
 if(s.soldierX<LW+10)drawSoldier(ctx,s,sp);
 if(s.file){
  const k=easeIn(s.file.t),x=Math.round(lerp(s.file.x,DOOR.x+DOOR.w/2,k)),y=Math.round(lerp(s.file.y,CAP.cy,k)-Math.sin(k*Math.PI)*16);
  const w=Math.max(3,Math.round(12*(1-k*0.8))),h=Math.max(4,Math.round(15*(1-k*0.8)));
  ctx.fillStyle='#1e1a16';ctx.fillRect(x-(w>>1)-1,y-(h>>1)-1,w+2,h+2);ctx.fillStyle='#f2f2f2';ctx.fillRect(x-(w>>1),y-(h>>1),w,h);
  ctx.fillStyle='#d10a22';ctx.fillRect(x-(w>>1)+1,y,Math.max(1,w-2),Math.max(1,h>>2));
 }
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

export default function ZombieCapsuleUpload({upload=simulateUpload,onComplete,accept}:{upload?:UploadFn;onComplete?:(file:File)=>void;accept?:string}){
 const canvasRef=useRef<HTMLCanvasElement>(null);
 const inputRef=useRef<HTMLInputElement>(null);
 const scene=useRef<Scene>(freshScene());
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
  Object.assign(s,freshScene());
  const total=Math.max(1,file.size);s.total=total;
  s.file={x:at?.x??COUNTER.cx,y:at?.y??LH-20,t:0};
  s.zombies=spawnHorde();
  s.events.push('suck');current.current=file;
  go('intake');setStatus(`Uploading ${file.name}`);
  const ctl=new AbortController();abort.current=ctl;
  upload(file,loaded=>{if(ctl.signal.aborted)return;s.loaded=Math.min(total,loaded);s.pct=clamp(loaded/total);s.target=Math.max(s.target,s.pct*0.995)},ctl.signal)
   .then(()=>{
    // the upload is done: the soldier now clears the rest of the horde, and the last kill finishes the bar
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
 const reset=()=>{abort.current?.abort();Object.assign(scene.current,freshScene());setStatus('');go('idle')};
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
