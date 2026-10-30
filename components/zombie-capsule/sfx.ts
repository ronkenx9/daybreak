/** Tiny WebAudio synth for the zombie capsule. Every sound is generated, so there are no audio files to ship. */
export type SfxName='shot'|'hit'|'kill'|'groan'|'clink'|'suck'|'alarm'|'splash'|'win'|'fail'|'reload'|'hatch'|'slash'|'crackle'|'land'|'beam'|'bigbeam'|'powerup'|'boom'|'shatter';

export class Sfx{
 private ctx:AudioContext|null=null;
 private master:GainNode|null=null;
 private noise:AudioBuffer|null=null;
 enabled=true;

 /** Must run from a user gesture the first time (click, key, drop). */
 unlock(){
  if(!this.enabled)return;
  if(!this.ctx){
   const AC=window.AudioContext||(window as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!AC)return;
   const ctx=new AC();this.ctx=ctx;
   this.master=ctx.createGain();this.master.gain.value=0.45;this.master.connect(ctx.destination);
   const buf=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;this.noise=buf;
  }
  if(this.ctx.state==='suspended')void this.ctx.resume();
 }
 setEnabled(on:boolean){this.enabled=on;if(this.master)this.master.gain.value=on?0.45:0;if(on)this.unlock()}
 dispose(){this.hum=null;void this.ctx?.close();this.ctx=null}

 private hum:{osc:OscillatorNode[];filter:BiquadFilterNode;gain:GainNode}|null=null;
 /** A continuous charging hum; level 0 silences it, 1 is a full scream. */
 setHum(level:number){
  const ctx=this.ctx,out=this.master;if(!ctx||!out||ctx.state!=='running')return;
  if(!this.hum){
   if(level<=0)return;
   const gain=ctx.createGain();gain.gain.value=0;const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.Q.value=6;
   const osc=[0,7].map(detune=>{const o=ctx.createOscillator();o.type='sawtooth';o.detune.value=detune*10;o.connect(filter);o.start();return o});
   filter.connect(gain).connect(out);this.hum={osc,filter,gain};
  }
  const t=ctx.currentTime,{osc,filter,gain}=this.hum,l=Math.max(0,Math.min(1,level));
  gain.gain.setTargetAtTime(l>0?0.015+l*0.09:0,t,0.05);
  filter.frequency.setTargetAtTime(250+l*2600,t,0.05);
  osc.forEach((o,i)=>o.frequency.setTargetAtTime((60+l*160)*(i?1.5:1),t,0.05));
 }

 play(name:SfxName){
  const ctx=this.ctx,out=this.master;if(!this.enabled||!ctx||!out||ctx.state!=='running')return;
  const t=ctx.currentTime;
  const env=(node:AudioNode,start:number,attack:number,peak:number,decay:number)=>{const g=ctx.createGain();g.gain.setValueAtTime(0.0001,start);g.gain.exponentialRampToValueAtTime(peak,start+attack);g.gain.exponentialRampToValueAtTime(0.0001,start+attack+decay);node.connect(g).connect(out);return g};
  const noise=(start:number,dur:number,type:BiquadFilterType,freq:number,peak:number,q=0.8)=>{const s=ctx.createBufferSource();s.buffer=this.noise;const f=ctx.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;s.connect(f);env(f,start,0.004,peak,dur);s.start(start,Math.random()*0.5);s.stop(start+dur+0.05);return f};
  const tone=(start:number,type:OscillatorType,from:number,to:number,dur:number,peak:number,attack=0.005)=>{const o=ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(from,start);o.frequency.exponentialRampToValueAtTime(Math.max(1,to),start+dur);env(o,start,attack,peak,dur);o.start(start);o.stop(start+attack+dur+0.05);return o};
  const v=()=>0.9+Math.random()*0.2;
  switch(name){
   case 'shot':noise(t,0.07,'bandpass',2100*v(),0.32);tone(t,'square',180*v(),50,0.06,0.14);noise(t,0.12,'lowpass',520,0.12);break;
   case 'hit':noise(t,0.14,'lowpass',750*v(),0.45);tone(t,'sine',320*v(),110,0.12,0.22);break;
   case 'kill':noise(t,0.32,'lowpass',420,0.5);tone(t,'sawtooth',140*v(),40,0.45,0.18,0.02);break;
   case 'groan':{const f=60+Math.random()*45;const o=tone(t,'sawtooth',f,f*0.75,0.9,0.12,0.18);const lfo=ctx.createOscillator(),depth=ctx.createGain();lfo.frequency.value=5+Math.random()*3;depth.gain.value=f*0.08;lfo.connect(depth).connect(o.frequency);lfo.start(t);lfo.stop(t+1.2);break}
   case 'clink':tone(t+0.05,'sine',2800*v(),2500,0.05,0.05);tone(t+0.16,'sine',3200*v(),2900,0.04,0.03);break;
   case 'suck':tone(t,'sine',760,55,0.5,0.3);noise(t,0.45,'lowpass',900,0.15);break;
   case 'alarm':tone(t,'square',880,880,0.1,0.06);tone(t+0.14,'square',660,660,0.1,0.06);break;
   case 'splash':noise(t,0.3,'lowpass',380*v(),0.22);break;
   case 'win':[523,659,784,1047].forEach((f,i)=>tone(t+i*0.09,'square',f,f,i===3?0.4:0.08,0.09));break;
   case 'reload':tone(t,'square',1400,1200,0.03,0.08);noise(t+0.18,0.05,'highpass',3000,0.12);tone(t+0.32,'square',900,800,0.04,0.1);break;
   case 'hatch':noise(t,0.25,'lowpass',220,0.6);tone(t,'square',150,70,0.18,0.18);tone(t+0.02,'triangle',1100,900,0.12,0.06);break;
   case 'slash':{const n=noise(t,0.32,'bandpass',700,0.55,1.2);n.frequency.exponentialRampToValueAtTime(5200,t+0.25);tone(t,'sine',1900,880,0.7,0.09);tone(t,'square',110,35,0.3,0.3);noise(t+0.05,0.5,'lowpass',300,0.45);break}
   case 'crackle':noise(t,0.025+Math.random()*0.03,'highpass',3500+Math.random()*3000,0.06+Math.random()*0.06);break;
   case 'land':noise(t,0.35,'lowpass',200,0.7);tone(t,'sine',95,35,0.3,0.5);break;
   case 'beam':noise(t,1.0,'bandpass',900,0.5,0.5);tone(t,'sawtooth',220,520,0.9,0.12,0.04);tone(t,'square',110,140,0.9,0.08,0.04);break;
   case 'bigbeam':noise(t,1.4,'bandpass',700,0.65,0.4);noise(t,1.2,'lowpass',260,0.5);tone(t,'sawtooth',160,620,1.3,0.16,0.05);tone(t,'square',80,120,1.3,0.12,0.05);break;
   case 'powerup':tone(t,'sawtooth',110,950,1.2,0.15,0.3);tone(t,'square',220,1400,1.2,0.05,0.4);noise(t,1.1,'highpass',1800,0.14);break;
   case 'boom':noise(t,0.8,'lowpass',320,0.8);tone(t,'sine',70,28,0.7,0.6);break;
   case 'shatter':for(let i=0;i<9;i++)tone(t+Math.random()*0.35,'triangle',2400+Math.random()*3000,1800,0.08,0.06);noise(t,0.45,'highpass',2600,0.25);break;
   case 'fail':tone(t,'sawtooth',320,70,0.7,0.16,0.01);break;
  }
 }
}
