const assert=require('node:assert/strict');
// Isolated transition models of the inspected code, not mounted React tests.
const ranks=Array.from({length:60},(_,i)=>({id:i,quantity:60-i}));
const seen=ranks.slice(0,50).map(p=>p.id);
ranks[55].quantity=100;ranks.sort((a,b)=>b.quantity-a.quantity);
const next=ranks.slice(50,100).map(p=>p.id);
assert(!seen.includes(55)&&!next.includes(55));
assert(next.some(id=>seen.includes(id)));
let generation=0,accepted=0;const events=[];
for(let start=0;start<40000;start+=8000){events.push({time:start,type:'start'});events.push({time:start+9000,type:'finish',version:start/8000+1});}
for(const e of events.sort((a,b)=>a.time-b.time)){if(e.time>=40000)break;if(e.type==='start')generation++;else if(e.version===generation)accepted++;}
assert.equal(accepted,0);
const liveFeed=[{id:'live',mode:'live'}],published={id:'new-paper',mode:'paper'};
const afterPublish=[published,...liveFeed.filter(item=>item.id!==published.id)];
assert(afterPublish.some(item=>item.mode==='paper'));
console.log('follow-up transition models reproduced: moving ranks skip participants, slow polls discard every response, publication bypasses Live filtering');
