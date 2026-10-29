/** Tiny WebAudio synth for the zombie capsule. Every sound is generated, so there are no audio files to ship. */
export type SfxName='shot'|'hit'|'kill'|'groan'|'clink'|'suck'|'alarm'|'splash'|'win'|'fail';

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
 dispose(){void this.ctx?.close();this.ctx=null}

 play(name:SfxName){
  const ctx=this.ctx,out=this.master;if(!this.enabled||!ctx||!out||ctx.state!=='running')return;
  const t=ctx.currentTime;
  const env=(node:AudioNode,start:number,attack:number,peak:number,decay:number)=>{const g=ctx.createGain();g.gain.setValueAtTime(0.0001,start);g.gain.exponentialRampToValueAtTime(peak,start+attack);g.gain.exponentialRampToValueAtTime(0.0001,start+attack+decay);node.connect(g).connect(out);return g};
  const noise=(start:number,dur:number,type:BiquadFilterType,freq:number,peak:number,q=0.8)=>{const s=ctx.createBufferSource();s.buffer=this.noise;const f=ctx.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;s.connect(f);env(f,start,0.004,peak,dur);s.start(start,Math.random()*0.5);s.stop(start+dur+0.05);return f};
  const tone=(start:number,type:OscillatorType,from:number,to:number,dur:number,peak:number,attack=0.005)=>{const o=ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(from,start);o.frequency.exponentialRampToValueAtTime(Math.max(1,to),start+dur);env(o,start,attack,peak,dur);o.start(start);o.stop(start+attack+dur+0.05);return o};
  const v=()=>0.9+Math.random()*0.2;
  switch(name){
   case 'shot':noise(t,0.11,'bandpass',1900*v(),0.55);tone(t,'square',170*v(),45,0.09,0.25);noise(t,0.22,'lowpass',500,0.2);break;
   case 'hit':noise(t,0.14,'lowpass',750*v(),0.45);tone(t,'sine',320*v(),110,0.12,0.22);break;
   case 'kill':noise(t,0.32,'lowpass',420,0.5);tone(t,'sawtooth',140*v(),40,0.45,0.18,0.02);break;
   case 'groan':{const f=60+Math.random()*45;const o=tone(t,'sawtooth',f,f*0.75,0.9,0.12,0.18);const lfo=ctx.createOscillator(),depth=ctx.createGain();lfo.frequency.value=5+Math.random()*3;depth.gain.value=f*0.08;lfo.connect(depth).connect(o.frequency);lfo.start(t);lfo.stop(t+1.2);break}
   case 'clink':tone(t+0.05,'sine',2800*v(),2500,0.05,0.05);tone(t+0.16,'sine',3200*v(),2900,0.04,0.03);break;
   case 'suck':tone(t,'sine',760,55,0.5,0.3);noise(t,0.45,'lowpass',900,0.15);break;
   case 'alarm':tone(t,'square',880,880,0.1,0.06);tone(t+0.14,'square',660,660,0.1,0.06);break;
   case 'splash':noise(t,0.3,'lowpass',380*v(),0.22);break;
   case 'win':[523,659,784,1047].forEach((f,i)=>tone(t+i*0.09,'square',f,f,i===3?0.4:0.08,0.09));break;
   case 'fail':tone(t,'sawtooth',320,70,0.7,0.16,0.01);break;
  }
 }
}
