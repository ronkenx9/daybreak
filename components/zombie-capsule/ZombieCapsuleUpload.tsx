'use client';
import {useCallback,useEffect,useRef,useState,type DragEvent} from 'react';
import styles from './ZombieCapsuleUpload.module.css';

/**
 * Drag-and-drop upload whose progress bar is a capsule of zombies.
 * Drop a file → zombies crawl up out of the capsule, a soldier walks in and
 * shoots them, and the blood filling the capsule left→right is the progress.
 */
export type UploadFn=(file:File,onProgress:(loaded:number)=>void,signal:AbortSignal)=>Promise<void>;
type Phase='idle'|'drag'|'intake'|'uploading'|'done'|'error';

type Pt={x:number;y:number};
type Zombie={x:number;seed:number;skin:string;shirt:string;rise:number;hp:number;state:'rising'|'alive'|'dying'|'gone';t:number;flinch:number;drown:boolean;wounds:Pt[];respawn:number};
type Particle={x:number;y:number;vx:number;vy:number;life:number;max:number;r:number;kind:'blood'|'shell'|'spark'|'bubble'};
type Bullet={x0:number;y0:number;x1:number;y1:number;t:number;target:Zombie};
type Scene={phase:Phase;time:number;phaseT:number;fill:number;target:number;soldierX:number;walkPh:number;aim:number;fireCd:number;burst:number;flash:number;recoil:number;shake:number;kills:number;zombies:Zombie[];particles:Particle[];bullets:Bullet[];cracks:{x:number;y:number;a:number;life:number}[];file:{x:number;y:number;t:number}|null};

const W=760,H=300,GROUND=262;
const CAP={x0:150,x1:640,cy:128,r:38};
const TOP=CAP.cy-CAP.r,BOTTOM=CAP.cy+CAP.r;
const SLOTS=[222,318,414,510,598];
const SKINS=['#7f9d64','#8ca877','#6e8f6b','#9aa86e','#86996a'];
const SHIRTS=['#33465a','#5c3b38','#44513a','#4a3a57','#53473a'];
const SOLDIER_STOP=78;

const clamp=(v:number,a=0,b=1)=>Math.min(b,Math.max(a,v));
const easeOut=(t:number)=>1-(1-clamp(t))**3;
const easeIn=(t:number)=>clamp(t)**2;
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const fillX=(fill:number)=>CAP.x0+fill*(CAP.x1-CAP.x0+8);
const mb=(bytes:number)=>(bytes/1048576).toFixed(1);

const simulateUpload:UploadFn=(file,onProgress,signal)=>new Promise((resolve,reject)=>{
 const total=Math.max(1,file.size),duration=6500+Math.random()*1500;let loaded=0,last=performance.now();
 const id=window.setInterval(()=>{const now=performance.now();loaded=Math.min(total,loaded+total*((now-last)/duration)*(0.35+Math.random()*1.3));last=now;onProgress(loaded);if(loaded>=total){window.clearInterval(id);resolve()}},120);
 signal.addEventListener('abort',()=>{window.clearInterval(id);reject(new DOMException('Aborted','AbortError'))});
});

const freshScene=():Scene=>({phase:'idle',time:0,phaseT:0,fill:0,target:0,soldierX:-60,walkPh:0,aim:-0.35,fireCd:0,burst:0,flash:0,recoil:0,shake:0,kills:0,zombies:[],particles:[],bullets:[],cracks:[],file:null});

function makeZombie(i:number,delay=0):Zombie{
 return {x:SLOTS[i]+(Math.random()-0.5)*14,seed:Math.random(),skin:SKINS[i%SKINS.length],shirt:SHIRTS[(i+2)%SHIRTS.length],rise:-delay,hp:2+Math.floor(Math.random()*2),state:'rising',t:0,flinch:0,drown:false,wounds:[],respawn:0};
}

/** Joint positions for a zombie, from the waist (hidden below the glass) up to hands hooked over the rim. */
function pose(z:Zombie,t:number){
 const up=easeOut(z.rise),dying=z.state==='dying';
 const reach=dying?clamp(1-z.t*3):up;
 const sink=dying?easeIn(z.t)*95:0;
 const wx=z.x+Math.sin(t*1.4+z.seed*6)*2-z.flinch*4;
 const wy=BOTTOM+8+(1-up)*86+sink;
 const head={x:wx+Math.sin(t*2.1+z.seed*9)*2.4-z.flinch*6,y:wy-60-z.flinch*2+Math.sin(t*3+z.seed*4)*1.2};
 const arms=[-1,1].map(side=>{
  const sh={x:wx+side*14,y:wy-44};
  const claw=Math.sin(t*6.5+z.seed*5+side*1.9);
  const rest={x:sh.x+side*9,y:sh.y+26};
  const grip={x:wx+side*(21+claw*4),y:TOP-3-Math.max(0,claw)*7};
  let hand={x:lerp(rest.x,grip.x,reach),y:lerp(rest.y,grip.y,reach)};
  const L=25,dx=hand.x-sh.x,dy=hand.y-sh.y,d=Math.hypot(dx,dy);
  if(d>L*2-1){hand={x:sh.x+dx/d*(L*2-1),y:sh.y+dy/d*(L*2-1)}}
  const dd=Math.min(d,L*2-1),h=Math.sqrt(Math.max(0,L*L-(dd/2)**2));
  const mx=(sh.x+hand.x)/2,my=(sh.y+hand.y)/2,nx=-dy/(d||1),ny=dx/(d||1);
  const elbow={x:mx+nx*h*-side,y:my+ny*h*-side};
  return {sh,elbow,hand,side,claw};
 });
 return {wx,wy,head,arms};
}

function capsulePath(ctx:CanvasRenderingContext2D){
 ctx.beginPath();ctx.roundRect(CAP.x0,TOP,CAP.x1-CAP.x0,CAP.r*2,[CAP.r,CAP.r*0.55,CAP.r*0.55,CAP.r]);
}

function drawZombie(ctx:CanvasRenderingContext2D,z:Zombie,t:number){
 const {wx,wy,head,arms}=pose(z,t);
 const fade=z.state==='dying'?1-easeIn(z.t*1.2):1;
 ctx.save();ctx.globalAlpha=clamp(fade);
 ctx.beginPath();ctx.rect(CAP.x0,0,CAP.x1-CAP.x0,BOTTOM-3);ctx.clip();
 ctx.lineCap='round';ctx.lineJoin='round';
 // torso
 ctx.fillStyle=z.shirt;ctx.beginPath();ctx.moveTo(wx-15,wy+4);ctx.lineTo(wx-17,wy-40);ctx.quadraticCurveTo(wx,wy-50,wx+17,wy-40);ctx.lineTo(wx+15,wy+4);ctx.closePath();ctx.fill();
 ctx.strokeStyle='rgba(0,0,0,0.35)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(wx-8,wy-32);ctx.lineTo(wx-3,wy-22);ctx.lineTo(wx-9,wy-14);ctx.moveTo(wx+6,wy-36);ctx.lineTo(wx+10,wy-27);ctx.stroke();
 ctx.fillStyle=z.skin;ctx.fillRect(wx-4,wy-52,8,9);
 // arms
 for(const a of arms){
  ctx.strokeStyle=z.shirt;ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(a.sh.x,a.sh.y);ctx.lineTo(a.elbow.x,a.elbow.y);ctx.stroke();
  ctx.strokeStyle=z.skin;ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(a.elbow.x,a.elbow.y);ctx.lineTo(a.hand.x,a.hand.y);ctx.stroke();
 }
 // head
 ctx.fillStyle=z.skin;ctx.beginPath();ctx.arc(head.x,head.y,12.5,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='rgba(40,60,30,0.55)';ctx.beginPath();ctx.arc(head.x-4,head.y-8,5,0,Math.PI*2);ctx.arc(head.x+6,head.y-6,3,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#1b1410';ctx.beginPath();ctx.ellipse(head.x-4.5,head.y-1,3.4,3,0,0,Math.PI*2);ctx.ellipse(head.x+5,head.y,3,3.4,0,0,Math.PI*2);ctx.fill();
 ctx.save();ctx.shadowColor='#ffe14d';ctx.shadowBlur=8;ctx.fillStyle='#ffe873';ctx.beginPath();ctx.arc(head.x-4.5,head.y-1,1.3,0,Math.PI*2);ctx.arc(head.x+5,head.y,1.3,0,Math.PI*2);ctx.fill();ctx.restore();
 const jaw=3+Math.abs(Math.sin(t*5+z.seed*7))*3;
 ctx.fillStyle='#2a0d0d';ctx.beginPath();ctx.ellipse(head.x+0.5,head.y+6.5,4.5,jaw/1.6,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#e8e0c8';ctx.fillRect(head.x-2.5,head.y+4,1.6,1.8);ctx.fillRect(head.x+1,head.y+4,1.6,1.8);
 // wounds from hits
 ctx.fillStyle='#8f0a16';for(const w of z.wounds){ctx.beginPath();ctx.arc(wx+w.x,wy+w.y,2.4,0,Math.PI*2);ctx.fill()}
 if(z.flinch>0){ctx.globalAlpha=z.flinch*0.6*fade;ctx.fillStyle='#ff3040';ctx.beginPath();ctx.arc(head.x,head.y,13,0,Math.PI*2);ctx.fill()}
 ctx.restore();
}

/** Fingers hooked over the outside of the glass — drawn after the rim so they overlap it. */
function drawHands(ctx:CanvasRenderingContext2D,z:Zombie,t:number){
 if(z.state==='gone')return;
 const {arms}=pose(z,t);
 ctx.save();ctx.globalAlpha=z.state==='dying'?clamp(1-z.t*3):1;ctx.lineCap='round';
 for(const a of arms){
  if(a.hand.y>TOP+6)continue;
  ctx.fillStyle=z.skin;ctx.beginPath();ctx.arc(a.hand.x,a.hand.y,4.4,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=z.skin;ctx.lineWidth=2;
  for(let f=-1;f<=1;f++){const fx=a.hand.x+f*2.8+a.side*1.5,curl=Math.max(0,a.claw)*3;ctx.beginPath();ctx.moveTo(fx,a.hand.y+2);ctx.lineTo(fx+a.side*1.5,a.hand.y+6+curl);ctx.stroke()}
  ctx.strokeStyle='#2b2a20';ctx.lineWidth=1;for(let f=-1;f<=1;f++){const fx=a.hand.x+f*2.8+a.side*1.5+a.side*1.5;ctx.beginPath();ctx.moveTo(fx,a.hand.y+6+Math.max(0,a.claw)*3);ctx.lineTo(fx,a.hand.y+7.5+Math.max(0,a.claw)*3);ctx.stroke()}
 }
 ctx.restore();
}

function drawSoldier(ctx:CanvasRenderingContext2D,s:Scene){
 const x=s.soldierX,g=GROUND,walking=s.soldierX<SOLDIER_STOP-0.5&&s.phase!=='done',done=s.phase==='done';
 const hop=done?Math.abs(Math.sin(s.phaseT*5))*5*clamp(2-s.phaseT*0.4):0;
 const bob=walking?Math.abs(Math.sin(s.walkPh))*2:0;
 const y=g-hop-bob;
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 ctx.fillStyle='rgba(0,0,0,0.45)';ctx.beginPath();ctx.ellipse(x,g+2,16,3.5,0,0,Math.PI*2);ctx.fill();
 // legs
 for(const side of [-1,1]){
  const swing=walking?Math.sin(s.walkPh+(side>0?Math.PI:0))*7:side*3;
  ctx.strokeStyle='#3b4728';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(x+side*3,y-22);ctx.lineTo(x+swing,y-4);ctx.stroke();
  ctx.fillStyle='#17130f';ctx.beginPath();ctx.ellipse(x+swing+2,y-2,5.5,3.2,0,0,Math.PI*2);ctx.fill();
 }
 // body + vest
 ctx.fillStyle='#55692f';ctx.beginPath();ctx.roundRect(x-10,y-46,20,26,6);ctx.fill();
 ctx.fillStyle='#3d4c22';ctx.beginPath();ctx.roundRect(x-8,y-42,16,16,3);ctx.fill();
 ctx.fillStyle='#2a2a1c';ctx.fillRect(x-10,y-24,20,3);
 ctx.fillStyle='#6b5a2e';ctx.fillRect(x-5,y-39,4,5);ctx.fillRect(x+2,y-39,4,5);
 // head + helmet
 ctx.fillStyle='#e2b58b';ctx.beginPath();ctx.arc(x+2,y-54,8,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#111';ctx.fillRect(x+5,y-55,2,2);
 ctx.fillStyle='#4b5d2c';ctx.beginPath();ctx.arc(x+1,y-57,10.5,Math.PI,0);ctx.closePath();ctx.fill();
 ctx.fillStyle='#3a4a21';ctx.fillRect(x-10,y-58,23,3);
 ctx.strokeStyle='#2c3618';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x-4,y-56);ctx.lineTo(x-1,y-47);ctx.stroke();
 // rifle on a shoulder pivot
 const px=x+3,py=y-37,a=s.aim,c=Math.cos(a),sn=Math.sin(a),k=-s.recoil*4;
 const at=(lx:number,ly:number):Pt=>({x:px+(lx+k)*c-ly*sn,y:py+(lx+k)*sn+ly*c});
 ctx.save();ctx.translate(px,py);ctx.rotate(a);ctx.translate(k,0);
 ctx.fillStyle='#4a3520';ctx.fillRect(-9,-2.5,9,6);
 ctx.fillStyle='#262628';ctx.fillRect(0,-3,27,6.5);ctx.fillRect(27,-1.5,13,3);
 ctx.fillStyle='#1a1a1c';ctx.fillRect(9,3,5,8);ctx.fillRect(6,-7.5,10,4);
 if(s.flash>0){
  ctx.save();ctx.globalAlpha=s.flash;ctx.shadowColor='#ffd34d';ctx.shadowBlur=16;ctx.fillStyle='#fff3b0';ctx.beginPath();
  for(let i=0;i<10;i++){const r=i%2?4:11+Math.random()*5,an=(i/10)*Math.PI*2;ctx.lineTo(42+Math.cos(an)*r*1.3,Math.sin(an)*r*0.7)}
  ctx.closePath();ctx.fill();ctx.restore();
 }
 ctx.restore();
 // arms to the grip and foregrip
 const grip=at(5,2),fore=at(19,2);
 ctx.strokeStyle='#55692f';ctx.lineWidth=5;
 ctx.beginPath();ctx.moveTo(x-5,y-42);ctx.lineTo(grip.x,grip.y);ctx.moveTo(x+6,y-42);ctx.lineTo(fore.x,fore.y);ctx.stroke();
 ctx.fillStyle='#e2b58b';ctx.beginPath();ctx.arc(grip.x,grip.y,2.8,0,Math.PI*2);ctx.arc(fore.x,fore.y,2.8,0,Math.PI*2);ctx.fill();
 ctx.restore();
}

function drawCap(ctx:CanvasRenderingContext2D,s:Scene){
 const x=CAP.x1,cy=CAP.cy,t=s.time,hazard=s.phase!=='idle';
 ctx.save();
 const neck=ctx.createLinearGradient(0,cy-16,0,cy+16);neck.addColorStop(0,'#8c8f98');neck.addColorStop(0.5,'#d7d9de');neck.addColorStop(1,'#5d6068');
 ctx.fillStyle=neck;ctx.fillRect(x-2,cy-16,16,32);
 ctx.beginPath();ctx.roundRect(x+14,cy-24,34,48,6);ctx.save();ctx.clip();
 ctx.fillStyle='#1a1a1a';ctx.fillRect(x+14,cy-24,34,48);
 ctx.fillStyle=hazard?'#ffcf1f':'#6b6b6b';const off=hazard?(t*24)%14:0;
 for(let i=-4;i<8;i++){ctx.beginPath();const bx=x+14+i*14+off;ctx.moveTo(bx,cy+24);ctx.lineTo(bx+7,cy+24);ctx.lineTo(bx+7+48,cy-24);ctx.lineTo(bx+48,cy-24);ctx.closePath();ctx.fill()}
 ctx.restore();
 ctx.strokeStyle='rgba(255,255,255,0.25)';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(x+14,cy-24,34,48,6);ctx.stroke();
 // warning lamp
 const lamp=s.phase==='done'?'#3dff7a':s.phase==='error'?'#ffb020':s.phase==='idle'?'#5a3a3a':'#ff2a3d';
 const pulse=s.phase==='idle'?0.25:s.phase==='done'?0.8:0.45+0.55*Math.abs(Math.sin(t*(s.phase==='drag'?9:5)));
 ctx.fillStyle='#2b2b2e';ctx.fillRect(x+24,cy-31,14,7);
 ctx.shadowColor=lamp;ctx.shadowBlur=24*pulse;ctx.fillStyle=lamp;ctx.globalAlpha=0.4+0.6*pulse;
 ctx.beginPath();ctx.arc(x+31,cy-31,7,Math.PI,0);ctx.fill();
 ctx.restore();
}

function drawHandprint(ctx:CanvasRenderingContext2D,x:number,y:number,rot:number,alpha:number){
 ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.globalAlpha=alpha;ctx.fillStyle='#b3001b';
 ctx.beginPath();ctx.ellipse(0,4,7,8,0,0,Math.PI*2);ctx.fill();
 ctx.lineCap='round';ctx.strokeStyle='#b3001b';ctx.lineWidth=3;
 for(let f=0;f<4;f++){ctx.beginPath();ctx.moveTo(-5+f*3.4,-2);ctx.lineTo(-6+f*3.6,-11+Math.abs(f-1.5)*2);ctx.stroke()}
 ctx.beginPath();ctx.moveTo(6,4);ctx.lineTo(11,-1);ctx.stroke();
 ctx.restore();
}

function render(ctx:CanvasRenderingContext2D,s:Scene){
 const t=s.time,fx=fillX(s.fill);
 ctx.clearRect(0,0,W,H);
 ctx.save();
 if(s.shake>0)ctx.translate((Math.random()-0.5)*s.shake,(Math.random()-0.5)*s.shake);
 if(s.phase==='drag')ctx.translate(Math.sin(t*40)*0.8,0);
 // ambient glow
 const glowA=s.phase==='idle'?0.05:0.12+s.fill*0.25+(s.phase==='drag'?0.08*Math.sin(t*8):0);
 const glow=ctx.createRadialGradient(0,0,10,0,0,360);
 glow.addColorStop(0,`rgba(255,30,50,${glowA})`);glow.addColorStop(1,'rgba(255,30,50,0)');ctx.save();ctx.translate((CAP.x0+CAP.x1)/2,CAP.cy+10);ctx.scale(1,0.36);ctx.fillStyle=glow;ctx.fillRect(-W,-H*3,W*2,H*6);ctx.restore();
 // ground
 const gl=ctx.createLinearGradient(0,0,W,0);gl.addColorStop(0,'rgba(255,255,255,0)');gl.addColorStop(0.12,'rgba(255,255,255,0.12)');gl.addColorStop(0.5,'rgba(255,255,255,0.04)');gl.addColorStop(1,'rgba(255,255,255,0)');
 ctx.fillStyle=gl;ctx.fillRect(0,GROUND+4,W,1);
 // glass back
 capsulePath(ctx);
 ctx.fillStyle=s.phase==='drag'?`rgba(120,10,20,${0.28+0.1*Math.sin(t*8)})`:s.phase==='idle'?'rgba(150,165,180,0.05)':'rgba(60,8,14,0.45)';ctx.fill();
 // zombies (behind the blood)
 for(const z of s.zombies)if(z.state!=='gone')drawZombie(ctx,z,t);
 // blood
 if(s.fill>0.001){
  ctx.save();capsulePath(ctx);ctx.clip();
  const bg=ctx.createLinearGradient(0,TOP,0,BOTTOM);bg.addColorStop(0,'#ff3347');bg.addColorStop(0.35,'#d10a22');bg.addColorStop(1,'#5e0010');
  ctx.fillStyle=bg;ctx.beginPath();ctx.moveTo(CAP.x0-2,TOP-2);
  for(let y=TOP-2;y<=BOTTOM+2;y+=4)ctx.lineTo(fx+Math.sin(y*0.16+t*4.2)*4+Math.sin(y*0.07-t*2.3)*3,y);
  ctx.lineTo(CAP.x0-2,BOTTOM+2);ctx.closePath();ctx.fill();
  ctx.save();ctx.clip();
  ctx.fillStyle='rgba(70,0,10,0.35)';for(let i=0;i<8;i++){const bx=CAP.x0+((i*97+t*14)%(CAP.x1-CAP.x0));ctx.beginPath();ctx.ellipse(bx,CAP.cy+Math.sin(i*3+t)*18,22,7,Math.sin(i)*0.6,0,Math.PI*2);ctx.fill()}
  ctx.fillStyle='rgba(255,140,150,0.35)';ctx.fillRect(CAP.x0,TOP+9,Math.max(0,fx-CAP.x0-10),3);
  for(const p of s.particles)if(p.kind==='bubble'){ctx.strokeStyle=`rgba(255,180,185,${0.6*p.life/p.max})`;ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.stroke()}
  ctx.restore();ctx.restore();
 }
 // drag-state glass: knocking handprints + biohazard text
 if(s.phase==='drag'){
  for(let i=0;i<4;i++){const k=Math.max(0,Math.sin(t*3.2+i*1.9));drawHandprint(ctx,230+i*110,CAP.cy+(i%2?8:-6),(i%2?0.25:-0.2),0.25+0.45*k)}
  ctx.save();ctx.font='700 13px ui-monospace,Menlo,monospace';ctx.textAlign='center';ctx.fillStyle=`rgba(255,70,85,${0.55+0.35*Math.sin(t*8)})`;ctx.fillText('☣  CONTAINMENT BREACH  ☣',(CAP.x0+CAP.x1)/2,CAP.cy+5);ctx.restore();
 }
 // glass front: rim + highlights + clamps
 ctx.save();
 capsulePath(ctx);ctx.lineWidth=3.5;
 ctx.strokeStyle=s.phase==='drag'?`rgba(255,60,75,${0.8+0.2*Math.sin(t*9)})`:s.phase==='idle'?'rgba(205,212,222,0.55)':'rgba(230,220,224,0.75)';
 if(s.phase!=='idle'){ctx.shadowColor='rgba(255,40,60,0.8)';ctx.shadowBlur=s.phase==='drag'?22:12+s.fill*14}
 ctx.stroke();ctx.restore();
 ctx.strokeStyle='rgba(255,255,255,0.28)';ctx.lineWidth=2.5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(CAP.x0+CAP.r,TOP+8);ctx.lineTo(CAP.x1-28,TOP+8);ctx.stroke();
 ctx.strokeStyle='rgba(255,255,255,0.12)';ctx.beginPath();ctx.moveTo(CAP.x0+CAP.r+20,BOTTOM-8);ctx.lineTo(CAP.x0+CAP.r+120,BOTTOM-8);ctx.stroke();
 for(const cx of [CAP.x0+58,CAP.x1-46]){const g=ctx.createLinearGradient(cx-5,0,cx+5,0);g.addColorStop(0,'#55585f');g.addColorStop(0.5,'#c9ccd3');g.addColorStop(1,'#55585f');ctx.fillStyle=g;ctx.fillRect(cx-5,TOP-3,10,CAP.r*2+6)}
 // bullet cracks on the glass
 ctx.save();ctx.strokeStyle='rgba(235,240,255,0.7)';ctx.lineWidth=1;
 for(const c of s.cracks){ctx.globalAlpha=clamp(c.life/2);ctx.beginPath();for(let i=0;i<5;i++){const an=c.a+i*1.26;ctx.moveTo(c.x,c.y);ctx.lineTo(c.x+Math.cos(an)*(5+(i%2)*3),c.y+Math.sin(an)*(5+(i%2)*3))}ctx.stroke();ctx.fillStyle='rgba(0,0,0,0.6)';ctx.beginPath();ctx.arc(c.x,c.y,1.4,0,Math.PI*2);ctx.fill()}
 ctx.restore();
 for(const z of s.zombies)drawHands(ctx,z,t);
 drawCap(ctx,s);
 // tracers
 ctx.save();ctx.lineCap='round';
 for(const b of s.bullets){const t1=clamp(b.t),t0=clamp(b.t-0.35);ctx.strokeStyle='rgba(255,236,160,0.95)';ctx.shadowColor='#ffd34d';ctx.shadowBlur=8;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(lerp(b.x0,b.x1,t0),lerp(b.y0,b.y1,t0));ctx.lineTo(lerp(b.x0,b.x1,t1),lerp(b.y0,b.y1,t1));ctx.stroke()}
 ctx.restore();
 // particles
 for(const p of s.particles){
  const a=clamp(p.life/p.max*1.5);
  if(p.kind==='blood'){ctx.fillStyle=`rgba(210,10,30,${a})`;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill()}
  else if(p.kind==='shell'){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.life*12);ctx.fillStyle=`rgba(225,180,70,${a})`;ctx.fillRect(-2.5,-1,5,2);ctx.restore()}
  else if(p.kind==='spark'){ctx.strokeStyle=`rgba(255,120,130,${a})`;ctx.lineWidth=1.5;const r=p.r*(0.6+0.4*Math.sin(p.life*8));ctx.beginPath();ctx.moveTo(p.x-r,p.y);ctx.lineTo(p.x+r,p.y);ctx.moveTo(p.x,p.y-r);ctx.lineTo(p.x,p.y+r);ctx.stroke()}
 }
 if(s.soldierX>-50)drawSoldier(ctx,s);
 // file being sucked into the capsule
 if(s.file){
  const k=easeIn(s.file.t),x=lerp(s.file.x,CAP.x1+31,k),y=lerp(s.file.y,CAP.cy,k)-Math.sin(k*Math.PI)*40,sc=1-k*0.85;
  ctx.save();ctx.translate(x,y);ctx.rotate(k*5);ctx.scale(sc,sc);
  ctx.fillStyle='#f2f2f2';ctx.beginPath();ctx.moveTo(-14,-18);ctx.lineTo(6,-18);ctx.lineTo(14,-10);ctx.lineTo(14,18);ctx.lineTo(-14,18);ctx.closePath();ctx.fill();
  ctx.fillStyle='#c9c9c9';ctx.beginPath();ctx.moveTo(6,-18);ctx.lineTo(6,-10);ctx.lineTo(14,-10);ctx.closePath();ctx.fill();
  ctx.fillStyle='#d10a22';ctx.fillRect(-8,2,16,9);ctx.restore();
 }
 ctx.restore();
}

function spawnBlood(s:Scene,x:number,y:number,dirX:number,dirY:number,n:number){
 for(let i=0;i<n;i++){const sp=60+Math.random()*170,an=Math.atan2(dirY,dirX)+(Math.random()-0.5)*1.6;s.particles.push({x,y,vx:Math.cos(an)*sp,vy:Math.sin(an)*sp-80*Math.random(),life:0.9+Math.random()*0.5,max:1.4,r:1.2+Math.random()*2.2,kind:'blood'})}
}

function step(s:Scene,dt:number,reduced:boolean){
 s.time+=dt;s.phaseT+=dt;
 s.flash=Math.max(0,s.flash-dt*14);s.recoil=Math.max(0,s.recoil-dt*10);s.shake=reduced?0:Math.max(0,s.shake-dt*30);
 s.fill+=(s.target-s.fill)*Math.min(1,dt*3.5);
 const fx=fillX(s.fill),active=s.phase==='uploading'||s.phase==='done'||s.phase==='error';
 if(s.file){s.file.t+=dt/0.7;if(s.file.t>=1){s.file=null;s.shake=6;if(s.phase==='intake'){s.phase='uploading';s.phaseT=0}}}
 // soldier walks in once the horde is up
 if(active||s.phase==='intake'){
  if(s.soldierX<SOLDIER_STOP&&(s.phase!=='intake')){s.soldierX=Math.min(SOLDIER_STOP,s.soldierX+dt*105);s.walkPh+=dt*13}
 }
 // zombies
 for(const z of s.zombies){
  z.flinch=Math.max(0,z.flinch-dt*6);
  if(z.state==='rising'){z.rise+=dt*1.4;if(z.rise>=1){z.rise=1;z.state='alive'}}
  if((z.state==='alive'||z.state==='rising')&&z.x<fx+4&&z.rise>0){z.state='dying';z.drown=true;z.t=0}
  if(z.state==='dying'){z.t+=dt*(z.drown?0.9:1.4);if(z.drown&&Math.random()<dt*20)s.particles.push({x:z.x+(Math.random()-0.5)*20,y:CAP.cy+10,vx:0,vy:-25-Math.random()*20,life:1,max:1,r:1.5+Math.random()*2.5,kind:'bubble'});if(z.t>=1)z.state='gone'}
  if(z.state==='gone'&&s.phase==='uploading'&&z.x>fx+30){z.respawn+=dt;if(z.respawn>0.4+z.seed*0.6){const i=SLOTS.findIndex(v=>Math.abs(v-z.x)<20);Object.assign(z,makeZombie(i<0?0:i))}}
 }
 // targeting + firing
 const ready=s.phase==='uploading'&&s.soldierX>=SOLDIER_STOP-0.5;
 const target=ready?s.zombies.filter(z=>(z.state==='alive'||(z.state==='rising'&&z.rise>0.55))&&z.hp>0).sort((a,b)=>a.x-b.x)[0]:undefined;
 const px=s.soldierX+3,py=GROUND-37;
 let want=s.phase==='done'?-1.42:-0.35;
 let aimPt:Pt|null=null;
 if(target){const p=pose(target,s.time);aimPt=Math.random()<0.55?p.head:{x:p.wx,y:p.wy-30};want=Math.atan2(aimPt.y-py,aimPt.x-px)}
 s.aim+=(want-s.aim)*Math.min(1,dt*10);
 s.fireCd-=dt;
 if(target&&aimPt&&Math.abs(want-s.aim)<0.06&&s.fireCd<=0){
  const mx=px+Math.cos(s.aim)*42,my=py+Math.sin(s.aim)*42;
  s.bullets.push({x0:mx,y0:my,x1:aimPt.x,y1:aimPt.y,t:0,target});
  s.flash=1;s.recoil=1;s.shake=Math.max(s.shake,2.2);
  s.particles.push({x:px+4,y:py-4,vx:-40-Math.random()*50,vy:-120-Math.random()*60,life:1.6,max:1.6,r:2,kind:'shell'});
  s.burst++;s.fireCd=s.burst%3===0?0.42:0.1;
 }
 // bullets
 for(const b of s.bullets){
  b.t+=dt/0.07;
  if(b.t>=1&&b.t-dt/0.07<1){
   const z=b.target,dx=b.x1-b.x0,dy=b.y1-b.y0;
   const k=(BOTTOM-b.y0)/(dy||-1);
   if(k>0&&k<1){const cx=b.x0+dx*k;if(cx>CAP.x0+CAP.r&&cx<CAP.x1-10){s.cracks.push({x:cx,y:BOTTOM-1,a:Math.random()*6,life:3});if(s.cracks.length>12)s.cracks.shift()}}
   if(z.state==='alive'||z.state==='rising'){
    z.hp--;z.flinch=1;const p=pose(z,s.time);z.wounds.push({x:b.x1-p.wx+(Math.random()-0.5)*4,y:b.y1-p.wy});
    spawnBlood(s,b.x1,b.y1,dx,dy,12);
    if(z.hp<=0){z.state='dying';z.drown=false;z.t=0;z.respawn=0;s.kills++;spawnBlood(s,b.x1,b.y1,0,-1,26)}
   }
  }
 }
 s.bullets=s.bullets.filter(b=>b.t<1.4);
 for(const c of s.cracks)c.life-=dt*0.4;s.cracks=s.cracks.filter(c=>c.life>0);
 // particles
 for(const p of s.particles){
  p.life-=dt;
  if(p.kind==='bubble'){p.y+=p.vy*dt;p.x+=Math.sin(s.time*6+p.r)*0.3;continue}
  if(p.kind==='spark'){p.y+=p.vy*dt;continue}
  p.vy+=520*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=1-dt*1.5;
  if(p.kind==='blood'&&p.x>CAP.x0&&p.x<CAP.x1&&p.y>BOTTOM-6&&p.vy>0)p.life=0;
  if(p.kind==='shell'&&p.y>GROUND+2){p.y=GROUND+2;p.vy*=-0.35;p.vx*=0.5}
 }
 s.particles=s.particles.filter(p=>p.life>0);
 if(s.phase==='done'&&Math.random()<dt*7)s.particles.push({x:CAP.x0+Math.random()*(CAP.x1-CAP.x0+60),y:TOP-40+Math.random()*(CAP.r*2+80),vx:0,vy:-6,life:1.2,max:1.2,r:3+Math.random()*2,kind:'spark'});
}

export default function ZombieCapsuleUpload({upload=simulateUpload,onComplete,accept}:{upload?:UploadFn;onComplete?:(file:File)=>void;accept?:string}){
 const canvasRef=useRef<HTMLCanvasElement>(null);
 const inputRef=useRef<HTMLInputElement>(null);
 const scene=useRef<Scene>(freshScene());
 const dragDepth=useRef(0);
 const beforeDrag=useRef<Phase>('idle');
 const abort=useRef<AbortController|null>(null);
 const [phase,setPhase]=useState<Phase>('idle');
 const [stats,setStats]=useState({pct:0,loaded:0,total:0,kills:0,name:''});

 const go=useCallback((p:Phase)=>{const s=scene.current;s.phase=p;s.phaseT=0;setPhase(p)},[]);

 useEffect(()=>{
  const canvas=canvasRef.current;if(!canvas)return;const ctx=canvas.getContext('2d');if(!ctx)return;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const resize=()=>{const dpr=Math.min(2,window.devicePixelRatio||1),w=canvas.clientWidth||W;canvas.width=Math.round(w*dpr);canvas.height=Math.round(w*(H/W)*dpr);ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0)};
  resize();const ro=new ResizeObserver(resize);ro.observe(canvas);
  let raf=0,last=performance.now(),lastKills=-1;
  const frame=(now:number)=>{const dt=Math.min(0.05,(now-last)/1000);last=now;const s=scene.current;step(s,dt,reduced);render(ctx,s);if(s.kills!==lastKills){lastKills=s.kills;setStats(v=>({...v,kills:s.kills}))}raf=requestAnimationFrame(frame)};
  raf=requestAnimationFrame(frame);
  return()=>{cancelAnimationFrame(raf);ro.disconnect();abort.current?.abort()};
 },[]);

 const start=useCallback((file:File,at?:Pt)=>{
  const s=scene.current;if(s.phase==='intake'||s.phase==='uploading')return;
  abort.current?.abort();
  Object.assign(s,freshScene());
  s.file={x:at?.x??W/2,y:at?.y??H-40,t:0};
  s.zombies=SLOTS.map((_,i)=>makeZombie(i,0.6+i*0.22));
  go('intake');
  const total=Math.max(1,file.size);setStats({pct:0,loaded:0,total,kills:0,name:file.name});
  const ctl=new AbortController();abort.current=ctl;
  upload(file,loaded=>{if(ctl.signal.aborted)return;const pct=clamp(loaded/total);s.target=Math.max(s.target,pct*0.995);setStats(v=>({...v,pct,loaded}))},ctl.signal)
   .then(()=>{if(ctl.signal.aborted)return;s.target=1;setStats(v=>({...v,pct:1,loaded:total}));
    const finish=()=>{if(ctl.signal.aborted)return;if(s.fill<0.99){window.setTimeout(finish,80);return}for(const z of s.zombies)if(z.state!=='gone'&&z.state!=='dying'){z.state='dying';z.drown=true;z.t=0}go('done');onComplete?.(file)};finish()})
   .catch(()=>{if(!ctl.signal.aborted)go('error')});
 },[go,onComplete,upload]);

 const toCanvas=(e:DragEvent):Pt=>{const r=canvasRef.current?.getBoundingClientRect();if(!r)return{x:W/2,y:H/2};return{x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H}};
 const busy=phase==='intake'||phase==='uploading';
 const onDragEnter=(e:DragEvent)=>{e.preventDefault();if(busy)return;dragDepth.current++;if(scene.current.phase!=='drag'){beforeDrag.current=scene.current.phase;go('drag')}};
 const onDragLeave=(e:DragEvent)=>{e.preventDefault();if(busy)return;dragDepth.current=Math.max(0,dragDepth.current-1);if(dragDepth.current===0&&scene.current.phase==='drag')go(beforeDrag.current)};
 const onDrop=(e:DragEvent)=>{e.preventDefault();dragDepth.current=0;const file=e.dataTransfer.files?.[0];if(file&&!busy)start(file,toCanvas(e));else if(scene.current.phase==='drag')go(beforeDrag.current)};
 const browse=()=>{if(!busy)inputRef.current?.click()};
 const reset=()=>{abort.current?.abort();Object.assign(scene.current,freshScene());setStats({pct:0,loaded:0,total:0,kills:0,name:''});go('idle')};

 const pct=Math.round(stats.pct*100);
 return <div className={styles.root}>
  <div className={styles.stage} role="button" tabIndex={0} aria-label="Upload a file: drop it into the capsule or press Enter to browse"
   onClick={browse} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();browse()}}}
   onDragEnter={onDragEnter} onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect=busy?'none':'copy'}} onDragLeave={onDragLeave} onDrop={onDrop}>
   <canvas ref={canvasRef} className={styles.canvas}/>
  </div>
  <div className={styles.readout} aria-live="polite">
   {phase==='idle'&&<div className={styles.hint}>Drop a file into the capsule</div>}
   {phase==='drag'&&<div className={`${styles.hint} ${styles.danger}`}>Release to unleash the horde</div>}
   {(phase==='intake'||phase==='uploading'||phase==='done')&&<>
    <div className={styles.percent} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>{pct}<sup>%</sup></div>
    <div className={styles.sub}>{phase==='done'?`Upload complete · ${stats.kills} zombies down`:`${mb(stats.loaded)} of ${mb(stats.total)} MB · ${stats.kills} down`}</div>
   </>}
   {phase==='error'&&<div className={`${styles.hint} ${styles.danger}`}>Upload failed — the horde got out</div>}
   {(phase==='done'||phase==='error')&&<button type="button" className={styles.again} onClick={reset}>{phase==='done'?'Upload another':'Try again'}</button>}
  </div>
  <input ref={inputRef} className={styles.input} type="file" accept={accept} onChange={e=>{const f=e.target.files?.[0];if(f)start(f);e.target.value=''}}/>
 </div>;
}
