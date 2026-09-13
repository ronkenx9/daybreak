'use client';
import {useQuery} from '@tanstack/react-query';
import {useAccount} from 'wagmi';
import {useEffect,useState} from 'react';
import {priceState,type PriceMap,type HoldingsSnapshot} from '@/lib/base/model';
import {useAccountState} from './AccountProvider';
async function get<T>(url:string,signal:AbortSignal):Promise<T>{const r=await fetch(url,{signal,cache:'no-store'});const data=await r.json();if(!r.ok)throw Error(data.error||'Data unavailable');return data as T}
export function useMarketData(){
 const {address,isConnected}=useAccount();const account=useAccountState();const [,tick]=useState(0);
 useEffect(()=>{const id=setInterval(()=>tick(v=>v+1),30000);return()=>clearInterval(id)},[]);
 // Read holdings from a connected external wallet when present, otherwise from the Privy
 // embedded Daybreak wallet. Stocks sent to the account's own wallet must show up too.
 const embedded=account.authenticated?(account.user?.wallet??undefined):undefined;
 const external=isConnected?address:undefined;
 const walletKey=(external??embedded)?.toLowerCase();
 const active=!!walletKey;
 const pricesQuery=useQuery({queryKey:['prices',8453],queryFn:({signal})=>get<PriceMap>('/api/prices',signal),staleTime:30000,refetchInterval:60000,refetchOnWindowFocus:true,retry:1});
 const holdingsQuery=useQuery({queryKey:['holdings',8453,walletKey],queryFn:({signal})=>get<HoldingsSnapshot>(`/api/holdings?address=${walletKey}`,signal),enabled:active&&!!walletKey,staleTime:15000,refetchInterval:45000,refetchOnWindowFocus:true,retry:1,gcTime:60000});
 const snapshot=active&&holdingsQuery.data?.address===walletKey?holdingsQuery.data:undefined;
 const prices=Object.fromEntries(Object.entries(pricesQuery.data||{}).map(([k,v])=>[k,priceState(v)]));
 return {address:walletKey??address,isConnected:active,externalConnected:isConnected,prices,pricesLoaded:!pricesQuery.isPending,pricesError:pricesQuery.isError,snapshot,holdingsLoading:active&&holdingsQuery.isPending,holdingsError:active&&holdingsQuery.isError,refresh:()=>{void pricesQuery.refetch();if(active)void holdingsQuery.refetch()},refreshing:pricesQuery.isFetching||holdingsQuery.isFetching};
}
