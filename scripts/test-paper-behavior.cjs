const fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
function loader(overrides={}){const cache={};function load(file){file=path.resolve(file);if(file in overrides)return overrides[file];if(cache[file])return cache[file].exports;const m={exports:{}};cache[file]=m;const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const req=id=>{if(id==='server-only')return {};if(id.startsWith('.')||id.startsWith('@/'))return load((id.startsWith('@/')?path.resolve(id.slice(2)):path.resolve(path.dirname(file),id))+'.ts');return require(id)};new Function('require','module','exports',js)(req,m,m.exports);return m.exports;}return load;}
const p=loader()('lib/theses/paper.ts'),d=loader()('lib/theses/discovery.ts');
const original={baseReserve:100000,quoteReserve:250};const q=p.quotePaperTrade(original,'buy',10);
const moved={baseReserve:original.baseReserve-q.outputAmount,quoteReserve:260};
const intent={intentId:randomUUID(),minimumOutput:q.outputAmount*.99,expiresAt:Date.now()+60000};
p.validatePaperIntent(intent,q.outputAmount);
assert.throws(()=>p.validatePaperIntent(intent,p.quotePaperTrade(moved,'buy',10).outputAmount),/Price moved/);
assert.throws(()=>p.validatePaperIntent({...intent,expiresAt:Date.now()-1},q.outputAmount),/expired/);
assert.throws(()=>p.validatePaperIntent({...intent,minimumOutput:NaN},q.outputAmount),/Minimum/);
const position={quantity:q.outputAmount,costBasisQuote:10,realizedPnlQuote:0};
assert(p.paperPositionMetrics(position,p.paperSpotPrice(moved)).totalPnlQuote>0);
assert(p.paperExitMetrics(position,moved).estimatedExitPnl<0);
assert.equal(p.paperExitMetrics({...position,quantity:0,costBasisQuote:0,realizedPnlQuote:2},moved).estimatedExitPnl,2);
assert.deepEqual(d.thesisDiscovery(new URLSearchParams('mode=live&q=Apple&page=2')),{mode:'live',query:'Apple',offset:80});
assert.throws(()=>d.pageNumber('-1'));assert.throws(()=>d.pageNumber('Infinity'));assert.throws(()=>d.thesisDiscovery(new URLSearchParams('mode=other')));
class HttpError extends Error { constructor(status,message){super(message);this.status=status;} }
const auth={requireUser:async()=>({id:randomUUID()}),readJsonObject:async r=>r.json(),HttpError,errorResponse:e=>Response.json({error:e.message},{status:e.status||500})};
(async()=>{
 for(const [message,status] of [['Connection lost during commit',500],['Paper preview expired. Preview again.',409],['Price moved beyond your minimum received. Preview again.',409]]) {
  const route=loader({[path.resolve('lib/account/auth-server.ts')]:auth,[path.resolve('lib/account/request-guard.ts')]:{requireWriteCapacity:()=>{}},[path.resolve('lib/db/repo-theses.ts')]:{executePublicPaperTrade:async()=>{throw Error(message)}}})('app/api/theses/paper/[id]/trade/route.ts');
  const response=await route.POST(new Request('http://localhost/trade',{method:'POST',body:JSON.stringify({direction:'buy',amount:1,...intent})}),{params:Promise.resolve({id:randomUUID()})});
  assert.equal(response.status,status);
 }
 console.log('paper behavioral tests passed');
})().catch(e=>{console.error(e);process.exitCode=1});
module.exports={loader};
