'use client';
import {useQuery} from '@tanstack/react-query';
import {useAccount} from 'wagmi';
import {useEffect,useState} from 'react';
import {priceState,type PriceMap,type HoldingsSnapshot} from '@/lib/base/model';
async function get<T>(url:string,signal:AbortSignal):Promise<T>{const r=await fetch(url,{signal,cache:'no-store'});const data=await r.json();if(!r.ok)throw Error(data.error||'Data unavailable');return data as T}
export function useMarketData(){
 const {address,isConnected}=useAccount();const [,tick]=useState(0);
 useEffect(()=>{const id=setInterval(()=>tick(v=>v+1),30000);return()=>clearInterval(id)},[]);
 const pricesQuery=useQuery({queryKey:['prices',8453],queryFn:({signal})=>get<PriceMap>('/api/prices',signal),staleTime:30000,refetchInterval:60000,refetchOnWindowFocus:true,retry:1});
 const walletKey=address?.toLowerCase();
 const holdingsQuery=useQuery({queryKey:['holdings',8453,walletKey],queryFn:({signal})=>get<HoldingsSnapshot>(`/api/holdings?address=${walletKey}`,signal),enabled:isConnected&&!!walletKey,staleTime:15000,refetchInterval:45000,refetchOnWindowFocus:true,retry:1,gcTime:60000});
 const snapshot=isConnected&&holdingsQuery.data?.address===walletKey?holdingsQuery.data:undefined;
 const prices=Object.fromEntries(Object.entries(pricesQuery.data||{}).map(([k,v])=>[k,priceState(v)]));
 return {address,isConnected,prices,pricesLoaded:!pricesQuery.isPending,pricesError:pricesQuery.isError,snapshot,holdingsLoading:isConnected&&holdingsQuery.isPending,holdingsError:isConnected&&holdingsQuery.isError,refresh:()=>{void pricesQuery.refetch();if(isConnected)void holdingsQuery.refetch()},refreshing:pricesQuery.isFetching||holdingsQuery.isFetching};
}
