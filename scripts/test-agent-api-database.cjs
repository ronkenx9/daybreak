// Isolated localhost database only. Never reads DATABASE_URL or production data.
const {loader}=require('./test-paper-behavior.cjs');
const postgres=require('postgres'),{drizzle}=require('drizzle-orm/postgres-js'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
process.env.AGENT_API_KEY_PEPPER='database-test-pepper';
(async()=>{
 const user=encodeURIComponent(require('node:os').userInfo().username),name='agent_api_test_'+randomUUID().replaceAll('-','');
 const root=postgres(`postgres://${user}@127.0.0.1:55439/postgres`,{max:1});let sql;
 try{
  await root.unsafe(`CREATE DATABASE "${name}"`);sql=postgres(`postgres://${user}@127.0.0.1:55439/${name}`,{max:8});
  for(const role of ['anon','authenticated'])await root.unsafe(`DO $$ BEGIN CREATE ROLE ${role}; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
  await sql.unsafe("CREATE TABLE users(id uuid PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now()); CREATE TABLE operations(id uuid PRIMARY KEY); CREATE TABLE profiles(user_id uuid PRIMARY KEY, display_name text, avatar integer, avatar_url text, visibility text NOT NULL DEFAULT 'private');");
  for(const migration of ['0017_thesis_markets','0018_public_paper_theses','0019_paper_trade_intents','0020_paper_creation_intents','0021_paper_privacy_precision_identity','0022_agent_participation'])await sql.unsafe(fs.readFileSync(`drizzle/${migration}.sql`,'utf8'));
  const schema=loader()('lib/db/schema.ts'),db=drizzle(sql,{schema});
  const overrides={[path.resolve('lib/db/client.ts')]:{getDb:()=>db}};
  const repo=loader(overrides)('lib/db/repo-agents.ts'),thesisRepo=loader(overrides)('lib/db/repo-theses.ts');
  const owner=randomUUID();await sql`insert into users(id) values (${owner})`;await sql`insert into profiles(user_id,display_name,avatar,avatar_url,visibility) values (${owner},'Private Operator',3,'/api/profile-photo/operator','private')`;
  const input=name=>({name,strategy:'Publishes falsifiable catalysts and uses small bounded paper positions.',avatar:1,allowedInstrumentIds:['solana:mainnet:aapl'],scopes:['read','paper:publish','paper:trade'],maxInputPerTrade:5,dailyGrossBuy:5,maxSlippageBps:300,dailyPublicationLimit:3});
  const first=await repo.createAgentForOwner(owner,input('Catalyst One')),second=await repo.createAgentForOwner(owner,{...input('Catalyst Two'),strategy:''});
  assert.notEqual(first.agent.actorId,second.agent.actorId);assert.notEqual(first.agent.publicId,second.agent.publicId);
  const keyRow=(await sql`select prefix,secret_digest from agent_api_keys where agent_id=${first.agent.id}`)[0];assert(!JSON.stringify(keyRow).includes(first.apiKey));assert.equal(keyRow.prefix,first.key.prefix);
  const one=await repo.authenticateAgentKey(first.apiKey),two=await repo.authenticateAgentKey(second.apiKey);assert.equal(one.publicId,first.agent.publicId);assert.equal(two.publicId,second.agent.publicId);
  const thesisInput={instrumentId:'solana:mainnet:aapl',title:'Services mix supports durable earnings',summary:'A falsifiable thesis about recurring services growth and margin durability.',body:'Services can improve mix if revenue growth remains durable while product demand holds. The market should reprice only if the evidence persists.',invalidation:'Two reporting periods of contracting services margin.',horizon:'Two reporting periods',sources:['https://www.apple.com/newsroom/'],tokenName:'Services thesis',tokenSymbol:'SERV'};
  const published=await repo.publishAgentPaperThesis(one,'apple','services-mix',thesisInput,'publish:stable-1');
  assert.equal((await repo.publishAgentPaperThesis(one,'apple','services-mix',thesisInput,'publish:stable-1')).thesisId,published.thesisId);
  await assert.rejects(()=>repo.publishAgentPaperThesis(one,'apple','changed',{...thesisInput,title:'A materially changed thesis title'},'publish:stable-1'),/IDEMPOTENCY/);
  const quote=await repo.createAgentPaperQuote(two,{thesisId:published.thesisId,direction:'buy',amount:1,slippageBps:100});
  const receipt=await repo.executeAgentPaperQuote(two,quote.quoteId,'trade:stable-1','Small paper position while the thesis remains falsifiable.');
  const replay=await repo.executeAgentPaperQuote(two,quote.quoteId,'trade:stable-1','Small paper position while the thesis remains falsifiable.');assert.equal(replay.receiptId,receipt.receiptId);
  assert.equal(Number((await sql`select count(*) n from paper_trades where actor_id=${two.actorId}`)[0].n),1);
  assert.equal((await repo.getAgentRequest(two,'trade:stable-1')).resourceId,receipt.receiptId);
  await assert.rejects(()=>repo.executeAgentPaperQuote(two,quote.quoteId,'trade:stable-1','Changed rationale'),/IDEMPOTENCY/);
  const portfolio=await thesisRepo.getPaperPortfolio(two.publicId);assert.equal(portfolio.actorKind,'agent');assert.equal(portfolio.publicId,two.publicId);assert.equal(portfolio.positions.length,1);
  const profile=await repo.getPublicAgentProfile(two.publicId);assert.equal(profile.name,'Catalyst Two');assert.equal(profile.strategy,'');assert(!JSON.stringify(profile).includes(owner));assert(!JSON.stringify(profile).includes('Private Operator'));
  const sell=await repo.createAgentPaperQuote(two,{thesisId:published.thesisId,direction:'sell',amount:1,slippageBps:100});await repo.executeAgentPaperQuote(two,sell.quoteId,'trade:sell-1','Reducing the public paper position after the initial move.');
  const tooLarge=await repo.createAgentPaperQuote(two,{thesisId:published.thesisId,direction:'buy',amount:5,slippageBps:100});await assert.rejects(()=>repo.executeAgentPaperQuote(two,tooLarge.quoteId,'trade:budget-1',null),/BUDGET_EXCEEDED/);
  await repo.setOwnedAgentStatus(owner,second.agent.id,'paused');await assert.rejects(()=>repo.authenticateAgentKey(second.apiKey).then(value=>repo.createAgentPaperQuote(value,{thesisId:published.thesisId,direction:'buy',amount:1,slippageBps:100})),/PAUSED/);
  await repo.setOwnedAgentStatus(owner,second.agent.id,'active');const rotated=await repo.rotateOwnedAgentKey(owner,second.agent.id,['read','paper:trade']);await assert.rejects(()=>repo.authenticateAgentKey(second.apiKey),/invalid|revoked/);assert.equal((await repo.authenticateAgentKey(rotated.apiKey)).publicId,two.publicId);
  await repo.createAgentForOwner(owner,input('Catalyst Three'));await assert.rejects(()=>repo.createAgentForOwner(owner,input('Catalyst Four')),/three active/);
  console.log('agent API database integration passed: isolation, hashed keys, publication, quote, trade, replay, recovery, budget, pause, rotate, privacy');
 }finally{if(sql)await sql.end();await root.unsafe(`DROP DATABASE IF EXISTS "${name}"`);await root.end()}
})().catch(error=>{console.error(error);process.exitCode=1});
