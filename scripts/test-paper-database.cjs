// Isolated localhost database only. Never reads DATABASE_URL or production data.
const {loader}=require('./test-paper-behavior.cjs');
const postgres=require('postgres'),{drizzle}=require('drizzle-orm/postgres-js'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
(async()=>{
 const user=encodeURIComponent(require('node:os').userInfo().username);
 const name='paper_test_'+randomUUID().replaceAll('-','');
 const root=postgres(`postgres://${user}@127.0.0.1:55439/postgres`,{max:1});let sql;
 try {
 await root.unsafe(`CREATE DATABASE "${name}"`);
 sql=postgres(`postgres://${user}@127.0.0.1:55439/${name}`,{max:8});
 for(const role of ['anon','authenticated'])await root.unsafe(`DO $$ BEGIN CREATE ROLE ${role}; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
 await sql.unsafe('CREATE TABLE users(id uuid PRIMARY KEY); CREATE TABLE operations(id uuid PRIMARY KEY); CREATE TABLE profiles(user_id uuid PRIMARY KEY, display_name text, avatar integer, avatar_url text);');
 for(const migration of ['0017_thesis_markets','0018_public_paper_theses','0019_paper_trade_intents'])await sql.unsafe(fs.readFileSync(`drizzle/${migration}.sql`,'utf8'));
 const schema=loader()('lib/db/schema.ts'),db=drizzle(sql,{schema});
 const repo=loader({[path.resolve('lib/db/client.ts')]:{getDb:()=>db}})('lib/db/repo-theses.ts');
 const a=randomUUID(),b=randomUUID();await sql`insert into users values (${a}),(${b})`;
 const make=async(n,user=a)=>repo.createPublicPaperThesis(user,'test-'+n,'apple',{instrumentId:'solana:mainnet:aapl',title:'Apple growth '+n,summary:'Recurring services growth simulation',tokenName:'Apple thesis',tokenSymbol:'IDEA'});
 const t=await make('one'),t2=await make('two');
 const intent=()=>({intentId:randomUUID(),minimumOutput:.0001,expiresAt:Date.now()+60000});
 const first=intent();
 const receipts=await Promise.all([repo.executePublicPaperTrade(t.id,a,'buy',1,first),repo.executePublicPaperTrade(t.id,a,'buy',1,first)]);
 assert.equal(receipts[0].id,receipts[1].id);
 assert.equal(Number((await sql`select count(*) as n from paper_trades`)[0].n),1);
 assert.equal(Number((await sql`select balance from paper_stock_balances where user_id=${a}`)[0].balance),9);
 await assert.rejects(()=>repo.executePublicPaperTrade(t.id,a,'buy',2,first),/different trade/);
 // Replay a committed receipt even after its original quote expires.
 const realNow=Date.now;Date.now=()=>realNow()+180000;
 assert.equal((await repo.executePublicPaperTrade(t.id,a,'buy',1,first)).id,receipts[0].id);Date.now=realNow;
 const concurrent=await Promise.allSettled([repo.executePublicPaperTrade(t.id,a,'buy',6,intent()),repo.executePublicPaperTrade(t2.id,a,'buy',6,intent())]);
 assert.equal(concurrent.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(Number((await sql`select balance from paper_stock_balances where user_id=${a}`)[0].balance),3);
 const before=await repo.getPublicPaperMarket(t.id,a);
 await assert.rejects(()=>repo.executePublicPaperTrade(t.id,b,'buy',1,{...intent(),minimumOutput:1e9}),/Price moved/);
 await assert.rejects(()=>repo.executePublicPaperTrade(t.id,b,'buy',1,{...intent(),expiresAt:Date.now()-1}),/expired/);
 assert.equal((await repo.getPublicPaperMarket(t.id,a)).tradeCount,before.tradeCount);
 await repo.executePublicPaperTrade(t.id,b,'buy',1,intent());
 const market=await repo.getPublicPaperMarket(t.id,a);
 assert.equal(market.positions.length,2);assert(market.positions.every(p=>p.publicId.length===64));
 const publicId=repo.paperPublicId(a);const portfolio=await repo.getPaperPortfolio(publicId);
 assert.equal(portfolio.publicId,publicId);assert(portfolio.positions.length>=1);assert(!JSON.stringify(portfolio).includes(a));
 const holding=market.viewer.position.quantity;await repo.executePublicPaperTrade(t.id,a,'sell',holding,intent());
 assert.equal((await repo.getPublicPaperMarket(t.id,a)).viewer.position.quantity,0);
 const live=await make('live');
 await sql`update theses set mode='live', published_at=now()-interval '1 day' where id=${live.id}`;
 await sql`insert into thesis_markets(thesis_id,creator_wallet,quote_mint,quote_decimals,base_mint,token_badge,config_address,pool_address,config_version,terms,transaction_message_hash,recent_blockhash,last_valid_block_height,status) values (${live.id},'wallet','quote',8,'base','badge','config','pool','v1','{}','hash','block',1,'active')`;
 // Older thesis survives direct lookup and server-side search beyond page one.
 await sql`insert into theses(slug,author_user_id,instrument_id,company_id,title,summary,body,invalidation,token_name,token_symbol,mode,status,visibility,published_at) select 'more-'||i,${a},'solana:mainnet:aapl','apple','New paper '||i,'summary','body','test','Token','TEST','paper','published','public',now()+i*interval '1 second' from generate_series(1,55) i`;
 assert.equal((await repo.listPublishedTheses(40)).length,40);
 assert.equal((await repo.getPublicThesis(t.slug)).id,t.id);
 assert.equal((await repo.listPublishedTheses(40,{mode:'paper',query:'Apple growth one'}))[0].id,t.id);
 assert((await repo.listPublishedTheses(40,{offset:40})).some(x=>x.id===t.id));
 assert(!(await repo.listPublishedTheses(40)).some(x=>x.id===live.id));
 assert.equal((await repo.listPublishedTheses(40,{mode:'live'}))[0].id,live.id);
 // Public activity and participant pagination includes older entries.
 await sql`insert into users select gen_random_uuid() from generate_series(1,55)`;
 await sql`insert into paper_positions(thesis_id,user_id,quantity) select ${t.id},id,1 from users where id not in (${a},${b})`;
 await sql`insert into paper_stock_balances(user_id,instrument_id,balance) select id,'solana:mainnet:aapl',10 from users where id not in (${a},${b})`;
 await sql`insert into paper_trades(thesis_id,user_id,direction,input_amount,output_amount,fee_amount,price_impact_pct) select ${t.id},id,'buy',1,1,0.02,0.1 from users where id not in (${a},${b})`;
 const page0=await repo.getPublicPaperMarket(t.id,a),page1=await repo.getPublicPaperMarket(t.id,a,{positions:1,trades:1,balances:1});
 assert(page0.hasMore.positions&&page0.hasMore.trades&&page0.hasMore.balances);assert(page1.positions.length>0&&page1.trades.length>0&&page1.balances.length>0);
 assert(!page0.positions.some(x=>page1.positions.some(y=>x.publicId===y.publicId)));
 assert(page0.viewer.position && page1.viewer.position);
 console.log('paper database integration passed: replay, concurrent spending, expiry, slippage, sell, discovery, public identity, pagination');
 } finally {if(sql)await sql.end();await root.unsafe(`DROP DATABASE IF EXISTS "${name}"`);await root.end();}
})().catch(e=>{console.error(e);process.exitCode=1});
