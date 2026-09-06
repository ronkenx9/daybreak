import 'server-only';
import { baseClient } from './client';
import { chainlinkFeedAbi, oracleRegistryAbi } from './abi';
import { TOKENS, ONCHAIN_REGISTRY } from './tokens';
import {priceState,validRound,type StockPrice,type PriceMap} from './model';
export type {StockPrice} from './model';
export async function readPrices(blockNumber?:bigint):Promise<PriceMap>{
 const block=blockNumber??await baseClient.getBlockNumber();
 const contracts=TOKENS.flatMap(t=>[
 {address:t.feed,abi:chainlinkFeedAbi,functionName:'latestRoundData'} as const,
 {address:t.feed,abi:chainlinkFeedAbi,functionName:'decimals'} as const,
 {address:t.feed,abi:chainlinkFeedAbi,functionName:'description'} as const,
 {address:ONCHAIN_REGISTRY,abi:oracleRegistryAbi,functionName:'getOracleParams',args:[t.token]} as const]);
 const res=await baseClient.multicall({contracts,blockNumber:block,allowFailure:true});
 const out:PriceMap={};
 TOKENS.forEach((t,i)=>{
  const [rd,dec,description,params]=res.slice(i*4,i*4+4);
  const unavailable=(reason:string):StockPrice=>({ticker:t.ticker,priceUsd:null,answerRaw:null,decimals:8,updatedAt:null,isStale:true,state:'unavailable',reason});
  if(!rd||!dec||!description||!params||rd.status!=='success'||dec.status!=='success'||description.status!=='success'||params.status!=='success'){out[t.ticker]=unavailable('Oracle read unavailable');return;}
  const [round,answer,,at,answered]=rd.result as readonly [bigint,bigint,bigint,bigint,bigint];
  const [multiplier,paused]=params.result as readonly [bigint,boolean];const decimals=Number(dec.result);
  if(description.result!==`Coinbase ${t.ticker}`||multiplier<=0n||!validRound(answer,at,round,answered,decimals)){out[t.ticker]=unavailable('Oracle validation failed');return;}
  out[t.ticker]=priceState({ticker:t.ticker,priceUsd:Number(answer)/10**decimals,answerRaw:answer.toString(),decimals,updatedAt:Number(at)*1000,isStale:paused,state:paused?'paused':'reference'});
 });return out;
}
