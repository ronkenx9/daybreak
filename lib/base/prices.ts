import 'server-only';
import { baseClient } from './client';
import { chainlinkFeedAbi, oracleRegistryAbi } from './abi';
import { TOKENS, ONCHAIN_REGISTRY, type StockToken } from './tokens';
import {readCoinbaseStockCatalog} from './coinbase-stocks';
import {priceState,validRound,type StockPrice,type PriceMap} from './model';
export type {StockPrice} from './model';
export async function readPrices(blockNumber?:bigint):Promise<PriceMap>{
 const block=blockNumber??await baseClient.getBlockNumber();
 const feedTokens=TOKENS.filter((t):t is StockToken&{feed:`0x${string}`}=>Boolean(t.feed));
 const contracts=feedTokens.flatMap(t=>[
 {address:t.feed,abi:chainlinkFeedAbi,functionName:'latestRoundData'} as const,
 {address:t.feed,abi:chainlinkFeedAbi,functionName:'decimals'} as const,
 {address:t.feed,abi:chainlinkFeedAbi,functionName:'description'} as const,
 {address:ONCHAIN_REGISTRY,abi:oracleRegistryAbi,functionName:'getOracleParams',args:[t.token]} as const]);
 const out:PriceMap={};
 const unavailable=(ticker:string,reason:string):StockPrice=>({ticker,priceUsd:null,answerRaw:null,decimals:8,updatedAt:null,isStale:true,state:'unavailable',reason});
 TOKENS.forEach(t=>{out[t.ticker]=unavailable(t.ticker,'Reference price unavailable')});
 const [res,catalog]=await Promise.all([
  contracts.length?baseClient.multicall({contracts,blockNumber:block,allowFailure:true}):Promise.resolve([]),
  readCoinbaseStockCatalog().catch(()=>new Map()),
 ]);
 feedTokens.forEach((t,i)=>{
  const [rd,dec,description,params]=res.slice(i*4,i*4+4);
  if(!rd||!dec||!description||!params||rd.status!=='success'||dec.status!=='success'||description.status!=='success'||params.status!=='success'){out[t.ticker]=unavailable(t.ticker,'Oracle read unavailable');return;}
  const [round,answer,,at,answered]=rd.result as readonly [bigint,bigint,bigint,bigint,bigint];
  const [multiplier,paused]=params.result as readonly [bigint,boolean];const decimals=Number(dec.result);
  if(description.result!==`Coinbase ${t.ticker}`||multiplier<=0n||!validRound(answer,at,round,answered,decimals)){out[t.ticker]=unavailable(t.ticker,'Oracle validation failed');return;}
  out[t.ticker]=priceState({ticker:t.ticker,priceUsd:Number(answer)/10**decimals,answerRaw:answer.toString(),decimals,updatedAt:Number(at)*1000,isStale:paused,state:paused?'paused':'reference'});
 });
 TOKENS.filter(t=>!t.feed).forEach(t=>{
  const row=catalog.get(t.token.toLowerCase());
  if(!row||row.symbol!==t.onchainSymbol||row.decimals!==t.decimals||row.navPrice==null){out[t.ticker]=unavailable(t.ticker,'Coinbase NAV unavailable');return;}
  const answer=Math.round(row.navPrice*1e8);
  if(!Number.isSafeInteger(answer)||answer<=0){out[t.ticker]=unavailable(t.ticker,'Coinbase NAV invalid');return;}
  out[t.ticker]=priceState({ticker:t.ticker,priceUsd:row.navPrice,answerRaw:String(answer),decimals:8,updatedAt:row.navPriceUpdatedAt,isStale:row.paused,state:row.paused?'paused':'reference'});
 });
 return out;
}
