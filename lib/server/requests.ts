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

// Per-identity protection for authenticated mutations. Entries expire and the
// map is capped so arbitrary keys cannot grow server memory without bound.
export function createKeyedRateLimit(max=60,windowMs=60000,maxKeys=5000){
 const buckets=new Map<string,{start:number;count:number}>();
 return(key:string)=>{
  const now=Date.now();let bucket=buckets.get(key);
  if(!bucket||now-bucket.start>=windowMs){bucket={start:now,count:0};buckets.set(key,bucket)}
  bucket.count++;
  if(buckets.size>maxKeys){for(const [k,v] of buckets){if(now-v.start>=windowMs)buckets.delete(k);if(buckets.size<=maxKeys)break}if(buckets.size>maxKeys)buckets.delete(buckets.keys().next().value!)}
  return bucket.count<=max;
 };
}
