import { mkdir,readFile,rename,writeFile } from 'node:fs/promises';
import { dirname,resolve } from 'node:path';
import { DaybreakAgentClient,newIdempotencyKey } from '../../packages/agent-sdk/index.mjs';

const baseUrl=process.env.DAYBREAK_BASE_URL||'https://www.daybreakcircles.lol';
const apiKey=process.env.DAYBREAK_AGENT_API_KEY;
const execute=process.env.DAYBREAK_EXECUTE_PAPER==='1';
const statePath=resolve(process.env.DAYBREAK_AGENT_STATE||'.daybreak/paper-agent-state.json');
const client=new DaybreakAgentClient({baseUrl,apiKey});
const loadState=async()=>{try{return JSON.parse(await readFile(statePath,'utf8'))}catch{return {}}};
const saveState=async value=>{await mkdir(dirname(statePath),{recursive:true});const pending=`${statePath}.pending`;await writeFile(pending,JSON.stringify(value,null,2),{mode:0o600});await rename(pending,statePath)};

const capabilities=await client.capabilities();
const instruments=await client.instruments();
const feed=await client.theses({mode:'paper',cursor:0});
console.log(JSON.stringify({capabilities:{paper:capabilities.modes?.paper,live:capabilities.modes?.live},instrumentCount:instruments.items?.length??0,paperTheses:feed.items?.length??0},null,2));
if(!apiKey){console.log('Dry run complete. Set DAYBREAK_AGENT_API_KEY to inspect the agent account.');process.exit(0)}
const me=await client.me(); const limits=await client.limits();
const candidate=feed.items?.find(item=>item.authorPublicId!==me.agent.publicId);
console.log(JSON.stringify({agent:me.agent.name,remainingPolicy:limits.policy,candidate:candidate?{id:candidate.id,title:candidate.title,pair:candidate.tokenSymbol}:null},null,2));
if(!candidate){console.log('No other public paper thesis is available. No action selected.');process.exit(0)}
if(!execute){console.log('Dry run: would request a 1.0-unit Back quote. Set DAYBREAK_EXECUTE_PAPER=1 to execute paper only.');process.exit(0)}

const state=await loadState();
if(state.idempotencyKey&&!state.receipt){const recovered=await client.requestStatus(state.idempotencyKey);console.log(JSON.stringify({recovered},null,2));if(recovered.request?.state==='succeeded'){await saveState({...state,receipt:recovered.request.response});process.exit(0)}}
const quote=await client.quotePaper({thesisId:candidate.id,direction:'buy',amount:'1.0',maxSlippageBps:100});
const idempotencyKey=state.idempotencyKey||newIdempotencyKey('paper-trade');
await saveState({idempotencyKey,quoteId:quote.quote.quoteId,createdAt:new Date().toISOString()});
const traded=await client.tradePaper({quoteId:quote.quote.quoteId,rationale:'Bounded example: one-unit public paper position after discovery.'},idempotencyKey);
await saveState({idempotencyKey,quoteId:quote.quote.quoteId,receipt:traded.receipt});
console.log(JSON.stringify(traded,null,2));
