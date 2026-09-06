import 'server-only';
// Bounded per-process protection. Deployments should also enforce ingress limits.
export function createRequestCache<T>(ttl:number,maxEntries=128,maxConcurrent=8){
 const cache=new Map<string,{at:number;value:T}>();const pending=new Map<string,Promise<T>>();let active=0;
 return async(key:string,load:()=>Promise<T>):Promise<T>=>{
  const old=cache.get(key);if(old&&Date.now()-old.at<ttl)return old.value;
  const flight=pending.get(key);if(flight)return flight;
  if(active>=maxConcurrent)throw Error('Service busy');active++;
  const task=load().then(value=>{if(cache.size>=maxEntries)cache.delete(cache.keys().next().value!);cache.set(key,{at:Date.now(),value});return value}).finally(()=>{pending.delete(key);active--;});
  pending.set(key,task);return task;
 };
}
export function createRateLimit(max=120,windowMs=60000){let start=Date.now(),count=0;return()=>{if(Date.now()-start>=windowMs){count=0;start=Date.now()}return ++count<=max}}
