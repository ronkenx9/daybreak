const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {loader}=require('./test-paper-behavior.cjs');

const pending=loader()('lib/theses/paper-pending.ts');
const pagination=loader()('lib/theses/paper-pagination.ts');
const values=new Map();
const storage={
  getItem:key=>values.get(key)??null,
  setItem:(key,value)=>values.set(key,value),
  removeItem:key=>values.delete(key),
};
const accountA='did:privy:account-a',accountB='did:privy:account-b',thesis=randomUUID();
const trade={version:1,accountId:accountA,thesisId:thesis,direction:'buy',amount:2,intent:{intentId:randomUUID(),minimumOutput:1,expiresAt:Date.now()+60_000},createdAt:Date.now()};
pending.writePendingPaperTrade(storage,trade);
assert.deepEqual(pending.readPendingPaperTrade(storage,accountA,thesis),trade);
assert.equal(pending.readPendingPaperTrade(storage,accountB,thesis),null);
const other={...trade,intent:{...trade.intent,intentId:randomUUID()}};
assert.throws(()=>pending.writePendingPaperTrade(storage,other),/PAPER_PENDING_TRADE_CONFLICT/);
assert.deepEqual(pending.readPendingPaperTrade(storage,accountA,thesis),trade);
pending.clearPendingPaperTrade(storage,other);
assert.deepEqual(pending.readPendingPaperTrade(storage,accountA,thesis),trade);
pending.clearPendingPaperTrade(storage,trade);
assert.equal(pending.readPendingPaperTrade(storage,accountA,thesis),null);
storage.setItem(pending.pendingPaperTradeKey(accountA,thesis),'{bad');
assert.equal(pending.readPendingPaperTrade(storage,accountA,thesis),null);
assert.equal(storage.getItem(pending.pendingPaperTradeKey(accountA,thesis)),null);

assert(pending.samePaperMutationContext({accountId:accountA,thesisId:thesis,generation:3},{accountId:accountA,thesisId:thesis,generation:3}));
assert(!pending.samePaperMutationContext({accountId:accountA,thesisId:thesis,generation:3},{accountId:accountB,thesisId:thesis,generation:3}));
assert(!pending.samePaperMutationContext({accountId:accountA,thesisId:thesis,generation:3},{accountId:accountA,thesisId:thesis,generation:4}));
assert.deepEqual(pending.paperDiscoveryAfterPublish(),{tab:'paper',query:'',page:0});

let resolveLoad,schedules=0,stopped=false;
const load=new Promise(resolve=>{resolveLoad=resolve});
const cycle=pending.runSerialPaperPoll(()=>load,()=>schedules++,()=>stopped);
assert.equal(schedules,0);
resolveLoad();
cycle.then(()=>{
  assert.equal(schedules,1);
  return pending.runSerialPaperPoll(async()=>{},()=>schedules++,()=>true);
}).then(()=>{
  assert.equal(schedules,1);
  const publicId='a'.repeat(64),id=randomUUID(),at=new Date().toISOString();
  assert.equal(pagination.participantCursor(publicId),publicId);
  assert.equal(pagination.participantCursor(null),null);
  assert.throws(()=>pagination.participantCursor('internal-user-id'));
  const encoded=pagination.encodeTimeIdCursor({at,id});
  const decoded=pagination.timeIdCursor(encoded);
  assert.equal(decoded.id,id);assert.equal(decoded.at.toISOString(),at);
  assert.throws(()=>pagination.timeIdCursor('bad'));
  const history={positions:[null],trades:[null],balances:[null]};
  const advanced=pagination.updatePaperCursorHistory(history,'positions',true,publicId);
  assert.deepEqual(advanced.positions,[null,publicId]);
  assert.equal(pagination.updatePaperCursorHistory(advanced,'positions',true,publicId),advanced);
  assert.equal(pagination.updatePaperCursorHistory(advanced,'positions',true,'b'.repeat(64),true),advanced);
  assert.deepEqual(pagination.updatePaperCursorHistory(advanced,'positions',false,null).positions,[null]);
  console.log('paper follow-up behavior verified');
}).catch(error=>{console.error(error);process.exitCode=1});
