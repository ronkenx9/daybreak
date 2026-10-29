'use client';
import {useCallback,useEffect,useRef,useState,type DragEvent} from 'react';
import styles from './ZombieCapsuleUpload.module.css';
import {Sfx,type SfxName} from './sfx';
import {
 ARMS_MUZZLE,ARMS_PIVOT,SKULL,SKULL_PALETTE,SOLDIER_A,SOLDIER_ARMS,SOLDIER_B,SOLDIER_PALETTE,SOLDIER_SHOULDER,
 ZOMBIE_ARM,ZOMBIE_ARM_BACK,ZOMBIE_OPEN,ZOMBIE_PALETTE,ZOMBIE_SHUT,drawText,glyphCells,makeSprite,textWidth,type Sprite,
} from './sprites';

/**
 * Pixel-art drag-and-drop upload whose progress bar is a capsule of zombies.
 * Drop a file → half-zombies rise up inside the capsule, a soldier walks in and
 * shoots them, and the blood filling the capsule left→right is the progress.
 * Everything is drawn on a low-res canvas and scaled up with nearest-neighbour.
 */
export type UploadFn=(file:File,onProgress:(loaded:number)=>void,signal:AbortSignal)=>Promise<void>;
type Phase='idle'|'drag'|'intake'|'uploading'|'done'|'error';

type Pt={x:number;y:number};
type Zombie={x:number;seed:number;rise:number;hp:number;state:'rising'|'alive'|'dying'|'gone';t:number;flinch:number;drown:boolean;respawn:number};
type Particle={x:number;y:number;vx:number;vy:number;life:number;max:number;kind:'blood'|'shell'|'spark'|'bubble'|'drip';size:number;caged:boolean;bounced?:boolean};
type Bullet={x0:number;y0:number;x1:number;y1:number;t:number;target:Zombie};
type Scene={
 phase:Phase;time:number;phaseT:number;
 fill:number;fillV:number;target:number;pct:number;loaded:number;total:number;
 shown:number;lastN:number;pop:number;heat:number;
 soldierX:number;walkPh:number;aim:number;fireCd:number;burst:number;flash:number;recoil:number;shake:number;
 kills:number;skullPop:number;groanCd:number;alarmCd:number;
 zombies:Zombie[];particles:Particle[];bullets:Bullet[];
 cracks:{x:number;y:number;life:number}[];stains:{x:number;y:number;life:number;len:number}[];drips:{x:number;y:number;len:number;max:number;speed:number}[];
 file:{x:number;y:number;t:number}|null;events:SfxName[];
};

const LW=256,LH=126,GROUND=94;
const CAP={x0:70,x1:226,cy:46,r:17};
const TOP=CAP.cy-CAP.r,BOTTOM=CAP.cy+CAP.r;
const SLOTS=[108,140,172,204];
const SOLDIER_STOP=34;
const COUNTER={cx:146,y:98};

const clamp=(v:number,a=0,b=1)=>Math.min(b,Math.max(a,v));
const easeOut=(t:number)=>1-(1-clamp(t))**3;
const easeIn=(t:number)=>clamp(t)**2;
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const mix=(a:number[],b:number[],t:number)=>a.map((v,i)=>lerp(v,b[i],t));
const rgba=(c:number[])=>`rgba(${c[0]|0},${c[1]|0},${c[2]|0},${c[3].toFixed(3)})`;
const fillX=(fill:number)=>CAP.x0+fill*(CAP.x1-CAP.x0+4);
const mb=(bytes:number)=>(bytes/1048576).toFixed(1);

// Pixel rows of the capsule interior, its rounded ends and the outline pixels.
const RR=Math.round(CAP.r*0.55);
const SPANS=Array.from({length:BOTTOM-TOP},(_,i)=>{
 const y=TOP+i,yc=y+0.5,dy=Math.abs(yc-CAP.cy);
 const xl=Math.round(CAP.x0+CAP.r-Math.sqrt(Math.max(0,CAP.r*CAP.r-dy*dy)));
 const d2=yc<TOP+RR?TOP+RR-yc:yc>BOTTOM-RR?yc-(BOTTOM-RR):0;
 const xr=d2>0?Math.round(CAP.x1-RR+Math.sqrt(Math.max(0,RR*RR-d2*d2))):CAP.x1;
 return {y,xl,xr};
});
const inside=(x:number,y:number)=>{const s=SPANS[Math.floor(y)-TOP];return !!s&&x>=s.xl&&x<s.xr};
const OUTLINE:Pt[]=SPANS.flatMap(({y,xl,xr})=>{const out:Pt[]=[];for(let x=xl;x<xr;x++)if(!inside(x-1,y)||!inside(x+1,y)||!inside(x,y-1)||!inside(x,y+1))out.push({x,y});return out});
const HANDPRINT=['..r.r.r','.rr.r.r','.rrrrrr','rrrrrrr','.rrrrr.','..rrr..'];

type Sprites={soldierA:Sprite;soldierB:Sprite;arms:Sprite;zOpen:Sprite;zShut:Sprite;zArm:Sprite;zArmBack:Sprite;skull:Sprite;hand:Sprite};
const buildSprites=():Sprites=>({
 soldierA:makeSprite(SOLDIER_A,SOLDIER_PALETTE),soldierB:makeSprite(SOLDIER_B,SOLDIER_PALETTE),arms:makeSprite(SOLDIER_ARMS,SOLDIER_PALETTE),
 zOpen:makeSprite(ZOMBIE_OPEN,ZOMBIE_PALETTE),zShut:makeSprite(ZOMBIE_SHUT,ZOMBIE_PALETTE),zArm:makeSprite(ZOMBIE_ARM,ZOMBIE_PALETTE),zArmBack:makeSprite(ZOMBIE_ARM_BACK,ZOMBIE_PALETTE),
 skull:makeSprite(SKULL,SKULL_PALETTE),hand:makeSprite(HANDPRINT,{r:'#c8001e'}),
});

const simulateUpload:UploadFn=(file,onProgress,signal)=>new Promise((resolve,reject)=>{
 const total=Math.max(1,file.size),duration=7000+Math.random()*2000;let loaded=0,last=performance.now();
 const id=window.setInterval(()=>{const now=performance.now();loaded=Math.min(total,loaded+total*((now-last)/duration)*(0.35+Math.random()*1.3));last=now;onProgress(loaded);if(loaded>=total){window.clearInterval(id);resolve()}},120);
 signal.addEventListener('abort',()=>{window.clearInterval(id);reject(new DOMException('Aborted','AbortError'))});
});

const freshScene=():Scene=>({
 phase:'idle',time:0,phaseT:0,fill:0,fillV:0,target:0,pct:0,loaded:0,total:0,shown:0,lastN:0,pop:0,heat:0,
 soldierX:-24,walkPh:0,aim:-0.1,fireCd:0,burst:0,flash:0,recoil:0,shake:0,kills:0,skullPop:0,groanCd:1,alarmCd:0,
 zombies:[],particles:[],bullets:[],cracks:[],stains:[],drips:[],file:null,events:[],
});

const makeZombie=(i:number,delay=0):Zombie=>({x:SLOTS[i]+Math.round((Math.random()-0.5)*6),seed:Math.random(),rise:-delay,hp:2+Math.floor(Math.random()*2),state:'rising',t:0,flinch:0,drown:false,respawn:0});

function zombieBox(z:Zombie,t:number){
 const up=easeOut(z.rise),dying=z.state==='dying';
 const sink=dying?easeIn(z.t)*42:0;
 const left=Math.round(z.x-9+Math.sin(t*1.3+z.seed*6)+z.flinch*2);
 const top=Math.round(TOP+5+(1-up)*38+sink);
 return {left,top,up,head:{x:left+8,y:top+7},chest:{x:left+9,y:top+18}};
}

const counterLayout=(n:number)=>{const str=`${n}`,w=textWidth(str,3);return {str,x:Math.round(COUNTER.cx-w/2),w}};
const pivotOf=(s:Scene)=>({x:Math.round(s.soldierX)-8+SOLDIER_SHOULDER.x,y:GROUND-30+SOLDIER_SHOULDER.y});
const muzzleOf=(s:Scene)=>{const p=pivotOf(s),dx=ARMS_MUZZLE.x-ARMS_PIVOT.x,dy=ARMS_MUZZLE.y-ARMS_PIVOT.y,c=Math.cos(s.aim),n=Math.sin(s.aim);return {x:p.x+dx*c-dy*n,y:p.y+dx*n+dy*c}};

function spawnBlood(s:Scene,x:number,y:number,dx:number,dy:number,n:number){
 const base=Math.atan2(dy,dx);
 for(let i=0;i<n;i++){const sp=30+Math.random()*90,a=base+(Math.random()-0.5)*2;s.particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-40*Math.random(),life:1.2,max:1.2,kind:'blood',size:Math.random()<0.3?2:1,caged:inside(x,y)})}
}

function step(s:Scene,dt:number){
 s.time+=dt;s.phaseT+=dt;
 s.flash=Math.max(0,s.flash-dt*16);s.recoil=Math.max(0,s.recoil-dt*12);s.shake=Math.max(0,s.shake-dt*14);
 s.pop=Math.max(0,s.pop-dt*8);s.skullPop=Math.max(0,s.skullPop-dt*5);
 s.heat+=((s.phase==='drag'?1:0)-s.heat)*Math.min(1,dt*6);
 // critically damped spring so the blood glides instead of stepping with each progress event
 const k=24,c=2*Math.sqrt(k);s.fillV+=((s.target-s.fill)*k-s.fillV*c)*dt;s.fill=clamp(s.fill+s.fillV*dt);
 s.shown+=(s.pct*100-s.shown)*Math.min(1,dt*7);
 const n=Math.round(s.shown);if(n!==s.lastN){s.lastN=n;s.pop=1}
 const fx=fillX(s.fill),busy=s.phase==='uploading';
 if(s.phase==='drag'){s.alarmCd-=dt;if(s.alarmCd<=0){s.alarmCd=0.75;s.events.push('alarm')}}
 if(s.file){s.file.t+=dt/0.6;if(s.file.t>=1){s.file=null;s.shake=3;s.events.push('splash');if(s.phase==='intake'){s.phase='uploading';s.phaseT=0}}}
 if((busy||s.phase==='done'||s.phase==='error')&&s.soldierX<SOLDIER_STOP){s.soldierX=Math.min(SOLDIER_STOP,s.soldierX+dt*46);s.walkPh+=dt*8}
 // zombies
 for(const z of s.zombies){
  z.flinch=Math.max(0,z.flinch-dt*7);
  if(z.state==='rising'){z.rise+=dt*1.25;if(z.rise>=1){z.rise=1;z.state='alive'}}
  if((z.state==='alive'||z.state==='rising')&&z.rise>0&&fx>z.x-5){z.state='dying';z.drown=true;z.t=0;s.events.push('splash')}
  if(z.state==='dying'){
   z.t+=dt*(z.drown?0.8:1.3);
   if(z.drown&&Math.random()<dt*14)s.particles.push({x:z.x+(Math.random()-0.5)*12,y:CAP.cy+8,vx:0,vy:-12-Math.random()*10,life:1.4,max:1.4,kind:'bubble',size:1,caged:true});
   if(z.t>=1)z.state='gone';
  }
  if(z.state==='gone'&&busy&&z.x-9>fx+8){z.respawn+=dt;if(z.respawn>0.5+z.seed*0.6){const i=SLOTS.findIndex(v=>Math.abs(v-z.x)<8);Object.assign(z,makeZombie(i<0?0:i))}}
 }
 if(busy){s.groanCd-=dt;if(s.groanCd<=0&&s.zombies.some(z=>z.state==='alive')){s.groanCd=1.1+Math.random()*1.8;s.events.push('groan')}}
 // aim + fire
 const ready=busy&&s.soldierX>=SOLDIER_STOP;
 const target=ready?s.zombies.filter(z=>(z.state==='alive'||(z.state==='rising'&&z.rise>0.55))&&z.hp>0).sort((a,b)=>a.x-b.x)[0]:undefined;
 const piv=pivotOf(s);let want=s.phase==='done'?-1.25:-0.1,aimPt:Pt|null=null;
 if(target){const b=zombieBox(target,s.time);aimPt=Math.random()<0.6?b.head:b.chest;want=Math.atan2(aimPt.y-piv.y,aimPt.x-piv.x)}
 s.aim+=(want-s.aim)*Math.min(1,dt*12);
 s.fireCd-=dt;
 if(target&&aimPt&&Math.abs(want-s.aim)<0.05&&s.fireCd<=0){
  const m=muzzleOf(s);
  s.bullets.push({x0:m.x,y0:m.y,x1:aimPt.x+(Math.random()-0.5)*2,y1:aimPt.y+(Math.random()-0.5)*2,t:0,target});
  s.flash=1;s.recoil=1;s.shake=Math.max(s.shake,1.2);s.events.push('shot');
  s.particles.push({x:piv.x+2,y:piv.y-2,vx:-20-Math.random()*25,vy:-60-Math.random()*30,life:1.6,max:1.6,kind:'shell',size:1,caged:false});
  s.burst++;s.fireCd=s.burst%3===0?0.5:0.12;
 }
 for(const b of s.bullets){
  const before=b.t;b.t+=dt/0.06;
  if(before<1&&b.t>=1){
   const dx=b.x1-b.x0,dy=b.y1-b.y0,len=Math.hypot(dx,dy);
   for(let i=0;i<len;i++){const x=b.x0+dx*i/len,y=b.y0+dy*i/len;if(inside(x,y)){s.cracks.push({x:Math.round(x),y:Math.round(y),life:3});if(s.cracks.length>10)s.cracks.shift();break}}
   const z=b.target;
   if(z.state==='alive'||z.state==='rising'){
    z.hp--;z.flinch=1;s.events.push('hit');spawnBlood(s,b.x1,b.y1,dx,dy,9);
    if(z.hp<=0){z.state='dying';z.drown=false;z.t=0;z.respawn=0;s.kills++;s.skullPop=1;s.events.push('kill');spawnBlood(s,b.x1,b.y1,0,-1,18)}
   }
  }
 }
 s.bullets=s.bullets.filter(b=>b.t<1.5);
 for(const c of s.cracks)c.life-=dt*0.35;s.cracks=s.cracks.filter(c=>c.life>0);
 for(const st of s.stains){st.life-=dt*0.2;st.len=Math.min(4,st.len+dt*0.8)}s.stains=s.stains.filter(st=>st.life>0);
 // particles
 for(const p of s.particles){
  p.life-=dt;
  if(p.kind==='bubble'){p.y+=p.vy*dt;if(!inside(p.x,p.y)||p.x>fx)p.life=0;continue}
  if(p.kind==='spark'){p.y+=p.vy*dt;continue}
  p.vy+=260*dt;const nx=p.x+p.vx*dt,ny=p.y+p.vy*dt;p.vx*=1-dt*1.2;
  if(p.kind==='blood'&&p.caged){
   if(!inside(nx,ny)){p.life=0;if(s.stains.length<70)s.stains.push({x:Math.round(clamp(nx,CAP.x0,CAP.x1-1)),y:Math.round(clamp(ny,TOP,BOTTOM-1)),life:1+Math.random(),len:0});continue}
   if(nx<fx||ny>=BOTTOM-2){p.life=0;continue}
  }
  p.x=nx;p.y=ny;
  if(p.kind==='shell'&&p.y>GROUND){p.y=GROUND;p.vy*=-0.4;p.vx*=0.5;if(!p.bounced){p.bounced=true;s.events.push('clink')}}
  if(p.kind==='drip'&&p.y>LH)p.life=0;
 }
 s.particles=s.particles.filter(p=>p.life>0);
 if(s.phase==='done'&&Math.random()<dt*6)s.particles.push({x:CAP.x0+Math.random()*(CAP.x1-CAP.x0+30),y:TOP-14+Math.random()*(CAP.r*2+28),vx:0,vy:-3,life:1.2,max:1.2,kind:'spark',size:1,caged:false});
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

function drawCap(ctx:CanvasRenderingContext2D,s:Scene){
 const x=CAP.x1,cy=CAP.cy,t=s.time,hazard=s.phase!=='idle'||s.heat>0.05;
 for(let y=-7;y<7;y++){ctx.fillStyle=y<-4?'#8c8f97':y<-1?'#d6d8de':y<3?'#a7aab1':'#5d6068';ctx.fillRect(x-1,cy+y,6,1)}
 const off=hazard?Math.floor(t*10):0;
 for(let y=-11;y<11;y++)for(let px=0;px<16;px++){
  const edge=y===-11||y===10||px===0||px===15;
  ctx.fillStyle=edge?'#1e1a16':((px+y+off)>>2)&1?(hazard?'#ffcf1f':'#6b6b6b'):'#1a1a1a';ctx.fillRect(x+5+px,cy+y,1,1);
 }
 const lamp=s.phase==='done'?[61,255,122]:s.phase==='error'?[255,176,32]:s.phase==='idle'&&s.heat<0.5?[90,58,58]:[255,42,61];
 const pulse=s.phase==='idle'&&s.heat<0.5?0.25:s.phase==='done'?0.9:0.45+0.55*Math.abs(Math.sin(t*(s.phase==='drag'?9:5)));
 ctx.fillStyle='#2b2b2e';ctx.fillRect(x+9,cy-13,8,2);
 ctx.fillStyle=rgba([...lamp,0.18*pulse]);ctx.fillRect(x+6,cy-19,14,8);
 ctx.fillStyle=rgba([...lamp,0.5+0.5*pulse]);ctx.fillRect(x+10,cy-16,6,3);ctx.fillRect(x+11,cy-17,4,1);
 ctx.fillStyle=`rgba(255,255,255,${0.6*pulse})`;ctx.fillRect(x+11,cy-16,1,1);
}

function drawSoldier(ctx:CanvasRenderingContext2D,s:Scene,sp:Sprites){
 const walking=s.soldierX<SOLDIER_STOP&&s.phase!=='idle';
 const hop=s.phase==='done'?Math.round(Math.abs(Math.sin(s.phaseT*6))*3*clamp(2-s.phaseT*0.5)):0;
 const ox=Math.round(s.soldierX)-8,oy=GROUND-30-hop-(walking&&Math.floor(s.walkPh)%2?1:0);
 ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(ox+2,GROUND,15,1);ctx.fillRect(ox+4,GROUND+1,11,1);
 ctx.drawImage(walking&&Math.floor(s.walkPh)%2?sp.soldierB.img:sp.soldierA.img,ox,oy);
 const px=ox+SOLDIER_SHOULDER.x,py=oy+SOLDIER_SHOULDER.y,kick=-Math.round(s.recoil*2);
 ctx.save();ctx.translate(px+Math.cos(s.aim)*kick,py+Math.sin(s.aim)*kick);ctx.rotate(s.aim);ctx.drawImage(sp.arms.img,-ARMS_PIVOT.x,-ARMS_PIVOT.y);
 if(s.flash>0){
  const r=s.flash>0.5?3:2,mx=ARMS_MUZZLE.x+r;
  ctx.fillStyle=`rgba(255,200,60,${0.35*s.flash})`;ctx.fillRect(mx-r*2,-r*2,r*4+1,r*4+1);
  ctx.fillStyle='#ffe873';ctx.fillRect(mx-r,-r,r*2+1,r*2+1);
  ctx.fillStyle='#ffffff';ctx.fillRect(mx-1,-1,3,3);ctx.fillRect(mx+r,0,2,1);
 }
 ctx.restore();
}

function render(ctx:CanvasRenderingContext2D,s:Scene,sp:Sprites){
 const t=s.time,fx=fillX(s.fill),heat=s.heat,active=s.phase!=='idle'&&s.phase!=='drag';
 ctx.imageSmoothingEnabled=false;
 ctx.fillStyle='#08070a';ctx.fillRect(0,0,LW,LH);
 // ambient glow
 const glowA=lerp(0.05,0.2,heat)+(active?0.08+s.fill*0.22:0);
 ctx.save();ctx.translate((CAP.x0+CAP.x1)/2,CAP.cy+6);ctx.scale(1,0.42);
 const glow=ctx.createRadialGradient(0,0,4,0,0,130);glow.addColorStop(0,`rgba(255,30,50,${glowA})`);glow.addColorStop(1,'rgba(255,30,50,0)');ctx.fillStyle=glow;ctx.fillRect(-LW,-LH*3,LW*2,LH*6);ctx.restore();
 // dithered ground
 for(let x=4;x<120;x+=2){ctx.fillStyle=`rgba(255,255,255,${0.12*(1-x/120)})`;ctx.fillRect(x,GROUND+3,1,1)}
 // glass interior tint
 const idleTint=[150,170,190,0.06],dragTint=[150,10,25,0.32+0.08*Math.sin(t*8)],liveTint=[50,6,12,0.55];
 ctx.fillStyle=rgba(active?liveTint:mix(idleTint,dragTint,heat));
 for(const r of SPANS)ctx.fillRect(r.xl,r.y,r.xr-r.xl,1);
 // zombies, clipped to the glass
 ctx.save();ctx.beginPath();for(const r of SPANS)ctx.rect(r.xl,r.y,r.xr-r.xl,1);ctx.clip();
 for(const z of s.zombies){
  if(z.state==='gone')continue;
  const b=zombieBox(z,t),bob=Math.round(Math.sin(t*5+z.seed*7)),reach=Math.round((1-b.up)*5);
  ctx.globalAlpha=z.state==='dying'?clamp(1-easeIn(z.t)):1;
  const base=ctx.globalAlpha,body=Math.sin(t*4+z.seed*11)>0?sp.zOpen:sp.zShut;
  const parts:[Sprite,number,number][]=[[sp.zArmBack,b.left-8+reach,b.top+14-bob],[body,b.left,b.top],[sp.zArm,b.left-6+reach,b.top+16+bob]];
  for(const [part,x,y] of parts){ctx.globalAlpha=base;ctx.drawImage(part.img,x,y);if(z.flinch>0.4){ctx.globalAlpha=base*0.55*z.flinch;ctx.drawImage(part.flash,x,y)}}
 }
 ctx.globalAlpha=1;ctx.restore();
 // blood, one pixel row at a time so the front can wobble
 if(s.fill>0.002){
  const slosh=clamp(s.fillV*30,-3,3);
  SPANS.forEach((r,i)=>{
   const yy=i/(SPANS.length-1);
   const front=Math.round(fx+Math.sin(r.y*0.5+t*4.2)*1.5+Math.sin(r.y*0.23-t*2.6)*1.2+slosh*(0.5-yy));
   const right=Math.min(r.xr,front);if(right<=r.xl)return;
   ctx.fillStyle=i<2?'#ff5f6e':i<5?'#f2223a':yy<0.6?'#d00c25':yy<0.82?'#a0061a':'#6a0411';
   ctx.fillRect(r.xl,r.y,right-r.xl,1);
   if(right<r.xr){ctx.fillStyle='#ff6b7a';ctx.fillRect(right-1,r.y,1,1)}
  });
  ctx.fillStyle='#7c0315';
  for(let i=0;i<10;i++){const cx=Math.round(CAP.x0+6+((i*61+t*(5+i%3))%(CAP.x1-CAP.x0-12))),cy=Math.round(CAP.cy-6+((i*7)%14)+Math.sin(t+i));if(cx<fx-3&&inside(cx,cy))ctx.fillRect(cx,cy,i%2?3:2,1)}
  for(const p of s.particles)if(p.kind==='bubble'){ctx.fillStyle='#ff8c96';ctx.fillRect(Math.round(p.x),Math.round(p.y),1,1)}
 }
 // drag state: handprints knocking on the glass + warning text
 if(heat>0.02){
  for(let i=0;i<4;i++){const k=Math.max(0,Math.sin(t*3.4+i*1.9));ctx.globalAlpha=heat*(0.2+0.5*k);ctx.drawImage(sp.hand.img,CAP.x0+26+i*36,CAP.cy-3+(i%2?4:-5))}
  ctx.globalAlpha=heat*(0.6+0.4*Math.sin(t*8));const msg='CONTAINMENT BREACH';drawText(ctx,msg,(CAP.x0+CAP.x1)/2-textWidth(msg)/2,CAP.cy-2,'#ff4657');ctx.globalAlpha=1;
 }
 // blood smeared on the inside of the glass
 for(const st of s.stains){ctx.fillStyle=`rgba(150,0,20,${clamp(st.life)})`;ctx.fillRect(st.x,st.y,1,1+Math.floor(st.len))}
 // glass outline with a blocky glow
 const rim=active?[226,214,218,1]:mix([184,190,200,0.8],[255,60,76,1],heat);
 const glowRim=active?0.25+s.fill*0.35:heat*0.5;
 if(glowRim>0.02){ctx.fillStyle=`rgba(255,40,60,${glowRim*0.45})`;for(const p of OUTLINE){ctx.fillRect(p.x-1,p.y,1,1);ctx.fillRect(p.x+1,p.y,1,1);ctx.fillRect(p.x,p.y-1,1,1);ctx.fillRect(p.x,p.y+1,1,1)}}
 ctx.fillStyle=rgba(rim);for(const p of OUTLINE)ctx.fillRect(p.x,p.y,1,1);
 ctx.fillStyle='rgba(255,255,255,0.4)';ctx.fillRect(SPANS[3].xl+3,TOP+3,CAP.x1-CAP.x0-30,1);ctx.fillRect(CAP.x0+CAP.r+4,BOTTOM-4,40,1);
 for(const cx of [CAP.x0+30,CAP.x1-24]){['#5a5d64','#c9ccd3','#8c8f96','#5a5d64'].forEach((col,i)=>{ctx.fillStyle=col;ctx.fillRect(cx+i,TOP-2,1,CAP.r*2+4)})}
 for(const c of s.cracks){ctx.globalAlpha=clamp(c.life/2);ctx.fillStyle='#e8eefc';for(const [dx,dy] of [[-1,-1],[1,-1],[-1,1],[1,1],[-2,0],[2,-2],[0,2]])ctx.fillRect(c.x+dx,c.y+dy,1,1);ctx.fillStyle='#000';ctx.fillRect(c.x,c.y,1,1);ctx.globalAlpha=1}
 drawCap(ctx,s);
 // tracers
 for(const b of s.bullets){
  if(b.t>1.2)continue;const t1=clamp(b.t),t0=clamp(b.t-0.4),steps=Math.ceil(Math.hypot(b.x1-b.x0,b.y1-b.y0)*(t1-t0));
  ctx.fillStyle='#ffe9a0';for(let i=0;i<=steps;i++){const k=lerp(t0,t1,i/Math.max(1,steps));ctx.fillRect(Math.round(lerp(b.x0,b.x1,k)),Math.round(lerp(b.y0,b.y1,k)),1,1)}
 }
 for(const p of s.particles){
  const x=Math.round(p.x),y=Math.round(p.y),a=clamp(p.life/p.max*1.6);
  if(p.kind==='blood'){ctx.fillStyle=`rgba(214,12,34,${a})`;ctx.fillRect(x,y,p.size,p.size)}
  else if(p.kind==='drip'){ctx.fillStyle='#b00a1e';ctx.fillRect(x,y,1,2)}
  else if(p.kind==='shell'){ctx.fillStyle=`rgba(230,186,72,${a})`;ctx.fillRect(x,y,2,1)}
  else if(p.kind==='spark'){ctx.fillStyle=`rgba(255,150,160,${a})`;ctx.fillRect(x-1,y,3,1);ctx.fillRect(x,y-1,1,3)}
 }
 if(s.soldierX>-20)drawSoldier(ctx,s,sp);
 // file being sucked into the capsule
 if(s.file){
  const k=easeIn(s.file.t),x=Math.round(lerp(s.file.x,CAP.x1+13,k)),y=Math.round(lerp(s.file.y,CAP.cy,k)-Math.sin(k*Math.PI)*18),sz=Math.max(1,Math.round(1-k*0.8+0.2)*1);
  const w=Math.max(3,Math.round(12*(1-k*0.8))),h=Math.max(4,Math.round(15*(1-k*0.8)));
  ctx.fillStyle='#1e1a16';ctx.fillRect(x-(w>>1)-1,y-(h>>1)-1,w+2,h+2);ctx.fillStyle='#f2f2f2';ctx.fillRect(x-(w>>1),y-(h>>1),w,h);
  ctx.fillStyle='#d10a22';ctx.fillRect(x-(w>>1)+sz,y,Math.max(1,w-2*sz),Math.max(1,h>>2));
 }
 drawHud(ctx,s,sp);
}

function drawHud(ctx:CanvasRenderingContext2D,s:Scene,sp:Sprites){
 const center=(text:string,y:number,color:string)=>drawText(ctx,text,COUNTER.cx-textWidth(text)/2,y,color);
 if(s.phase==='idle'||s.phase==='drag'){
  if(s.heat>0.5){ctx.globalAlpha=0.6+0.4*Math.abs(Math.sin(s.time*6));center('RELEASE TO UNLEASH THE HORDE',104,'#ff4657');ctx.globalAlpha=1}
  else center('DROP A FILE INTO THE CAPSULE',104,'#8d8486');
  return;
 }
 if(s.phase==='error'){center('UPLOAD FAILED - THE HORDE GOT OUT',104,'#ffb020');return}
 const n=Math.round(s.shown),{str,x,w}=counterLayout(n),lift=Math.round(s.pop*2);
 const shade=(row:number)=>row<2?'#ff4a5a':row<3?'#e0102a':'#9c0618';
 drawText(ctx,str,x+1,COUNTER.y+1-lift,'#2a0006',3);
 drawText(ctx,str,x,COUNTER.y-lift,shade,3);
 drawText(ctx,'%',x+w+3,COUNTER.y-lift,'#c9b8ba',1);
 for(const d of s.drips){ctx.fillStyle='#b00a1e';ctx.fillRect(d.x,d.y,1,Math.ceil(d.len));ctx.fillRect(d.x,d.y+Math.ceil(d.len)-1,2,1)}
 center(s.phase==='done'?'UPLOAD COMPLETE':`${mb(s.loaded)} OF ${mb(s.total)} MB`,COUNTER.y+19,s.phase==='done'?'#3dff7a':'#8d8486');
 const kx=200,ky=100,bump=Math.round(s.skullPop*2);
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
 const [phase,setPhase]=useState<Phase>('idle');
 const [status,setStatus]=useState('');
 const [sound,setSound]=useState(true);

 const go=useCallback((p:Phase)=>{const s=scene.current;s.phase=p;s.phaseT=0;setPhase(p)},[]);
 const unlock=()=>sfx.current?.unlock();

 useEffect(()=>{
  const audio=new Sfx();sfx.current=audio;
  try{const saved=window.localStorage.getItem('zombie-capsule-sfx');if(saved==='off'){audio.enabled=false;setSound(false)}}catch{}
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
   ctx.imageSmoothingEnabled=false;ctx.fillStyle='#08070a';ctx.fillRect(0,0,canvas.width,canvas.height);
   ctx.drawImage(low,shake?Math.round((Math.random()-0.5)*shake*2)*k:0,shake?Math.round((Math.random()-0.5)*shake*2)*k:0,canvas.width,canvas.height);
   for(const e of s.events.splice(0))audio.play(e);
   const pct=Math.round(s.pct*100);if(pct!==lastPct&&(s.phase==='uploading'||s.phase==='done')&&pct%10===0){lastPct=pct;setStatus(`Uploading ${pct}%`)}
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
  s.zombies=SLOTS.map((_,i)=>makeZombie(i,0.5+i*0.2));
  s.events.push('suck');
  go('intake');setStatus(`Uploading ${file.name}`);
  const ctl=new AbortController();abort.current=ctl;
  upload(file,loaded=>{if(ctl.signal.aborted)return;s.loaded=Math.min(total,loaded);s.pct=clamp(loaded/total);s.target=Math.max(s.target,s.pct*0.995)},ctl.signal)
   .then(()=>{
    if(ctl.signal.aborted)return;s.loaded=total;s.pct=1;s.target=1;
    const finish=()=>{if(ctl.signal.aborted)return;if(s.fill<0.985){window.setTimeout(finish,80);return}
     for(const z of s.zombies)if(z.state!=='gone'&&z.state!=='dying'){z.state='dying';z.drown=true;z.t=0}
     s.events.push('win');go('done');setStatus(`Upload complete. ${s.kills} zombies down.`);onComplete?.(file)};
    finish();
   })
   .catch(()=>{if(ctl.signal.aborted)return;s.events.push('fail');go('error');setStatus('Upload failed.')});
 },[go,onComplete,upload]);

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
