'use client';
import {useAccount,useConnect,useDisconnect} from 'wagmi';
import {useEffect,useRef,useState,useId} from 'react';
import {Wallet,LogOut,ChevronDown} from 'lucide-react';
export default function ConnectButton({className=''}:{className?:string}){
 const {address,isConnected}=useAccount();const {connect,connectors,status,error}=useConnect();const {disconnect}=useDisconnect();const [open,setOpen]=useState(false);const [mounted,setMounted]=useState(false);const ref=useRef<HTMLDivElement>(null);const trigger=useRef<HTMLButtonElement>(null);const menuId=useId();
 useEffect(()=>setMounted(true),[]);
 useEffect(()=>{if(!open)return;ref.current?.querySelector<HTMLElement>('[role=menuitem]')?.focus();const outside=(e:MouseEvent)=>{if(!ref.current?.contains(e.target as Node))setOpen(false)};document.addEventListener('mousedown',outside);return()=>document.removeEventListener('mousedown',outside)},[open]);
 if(!mounted)return <button disabled className={`db-button db-blue-button ${className}`}><Wallet size={16}/> Connect wallet</button>;
 if(isConnected&&address)return <div className={`db-wallet-chip ${className}`}><span className="db-wallet-dot"/><span className="db-wallet-addr">{address.slice(0,6)}…{address.slice(-4)}</span><button className="db-wallet-disc" onClick={()=>disconnect()} aria-label="Disconnect wallet"><LogOut size={15}/></button></div>;
 return <div className="db-connect" ref={ref} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false)}} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();setOpen(false);trigger.current?.focus()}if(open&&['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const items=[...(ref.current?.querySelectorAll<HTMLElement>('[role=menuitem]')||[])];const i=items.indexOf(document.activeElement as HTMLElement);items[e.key==='Home'?0:e.key==='End'?items.length-1:(i+(e.key==='ArrowDown'?1:-1)+items.length)%items.length ]?.focus()}}}>
 <button ref={trigger} disabled={status==='pending'} aria-haspopup="menu" aria-expanded={open} aria-controls={open?menuId:undefined} className={`db-button db-blue-button ${className}`} onClick={()=>setOpen(v=>!v)}><Wallet size={16}/>{status==='pending'?'Connecting…':'Connect wallet'}<ChevronDown size={15}/></button>
 {open&&<div id={menuId} className="db-connect-menu" role="menu" aria-label="Choose a wallet">{connectors.map(c=><button key={c.uid} role="menuitem" onClick={()=>{connect({connector:c});setOpen(false);trigger.current?.focus()}}>{c.name}</button>)}</div>}
 {error&&<span role="alert" className="db-connect-error">Connection was not completed. You can try another wallet or retry.</span>}
 </div>;
}
