import 'server-only';
import {formatUnits} from 'viem';
import {baseClient} from './client';
import {b20Abi} from './abi';
import {TOKENS} from './tokens';
import {readPrices} from './prices';
import type {Holding,HoldingsSnapshot} from './model';
export async function readHoldings(wallet:`0x${string}`):Promise<HoldingsSnapshot>{
 const blockNumber=await baseClient.getBlockNumber();
 const contracts=TOKENS.flatMap(t=>[
 {address:t.token,abi:b20Abi,functionName:'balanceOf',args:[wallet]} as const,
 {address:t.token,abi:b20Abi,functionName:'scaledBalanceOf',args:[wallet]} as const,
 {address:t.token,abi:b20Abi,functionName:'decimals'} as const,
 {address:t.token,abi:b20Abi,functionName:'symbol'} as const]);
 const [res,prices]=await Promise.all([baseClient.multicall({contracts,blockNumber,allowFailure:true}),readPrices(blockNumber).catch(()=>({}))]);
 const holdings:Holding[]=[];const failedTokens:string[]=[];
 TOKENS.forEach((t,i)=>{const [bal,scaled,dec,sym]=res.slice(i*4,i*4+4);
  if(!bal||!scaled||!dec||!sym||bal.status!=='success'||scaled.status!=='success'||dec.status!=='success'||sym.status!=='success'||sym.result!==t.onchainSymbol||Number(dec.result)!==t.decimals){failedTokens.push(t.onchainSymbol);return;}
  const raw=bal.result as bigint, scaledRaw=scaled.result as bigint, decimals=Number(dec.result);
  if(raw>0n)holdings.push({ticker:t.ticker,onchainSymbol:t.onchainSymbol,name:t.name,token:t.token,raw:raw.toString(),scaledRaw:scaledRaw.toString(),decimals,shares:formatUnits(scaledRaw,decimals),tokenQuantity:formatUnits(raw,decimals)});
 });
 if(failedTokens.length===TOKENS.length)throw Error('All holdings reads failed');
 return {address:wallet.toLowerCase(),chainId:8453,blockNumber:blockNumber.toString(),observedAt:Date.now(),status:failedTokens.length?'partial':'complete',holdings,failedTokens,prices};
}
