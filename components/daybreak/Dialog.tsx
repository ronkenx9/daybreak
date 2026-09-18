'use client';
import {useEffect,useRef,type ReactNode} from 'react';

type DialogEntry={id:symbol;node:()=>HTMLDivElement|null;close:()=>void;previous:HTMLElement|null};
const dialogStack:DialogEntry[]=[];
let savedBodyOverflow:string|null=null;
const isTopDialog=(id:symbol)=>dialogStack.at(-1)?.id===id;

export default function Dialog({label,onClose,children,wide=false}:{label:string;onClose:()=>void;children:ReactNode;wide?:boolean}){
 const ref=useRef<HTMLDivElement>(null);const close=useRef(onClose);const id=useRef(Symbol('dialog'));close.current=onClose;
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;if(dialogStack.length===0){savedBodyOverflow=document.body.style.overflow;document.body.style.overflow='hidden'}
 const entry:DialogEntry={id:id.current,node:()=>ref.current,close:()=>close.current(),previous};dialogStack.push(entry);ref.current?.focus();
 const key=(e:KeyboardEvent)=>{if(!isTopDialog(id.current))return;if(e.key==='Escape'){e.preventDefault();close.current();return}if(e.key!=='Tab')return;const nodes=[...(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')||[])].filter(el=>el.getClientRects().length>0);const first=nodes[0],last=nodes[nodes.length-1];if(!first){e.preventDefault();return}if(e.shiftKey&&(document.activeElement===first||document.activeElement===ref.current)){e.preventDefault();last.focus()}else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===ref.current)){e.preventDefault();first.focus()}};
 document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);const index=dialogStack.findIndex(item=>item.id===id.current);if(index>=0)dialogStack.splice(index,1);const top=dialogStack.at(-1);if(!top){document.body.style.overflow=savedBodyOverflow??'';savedBodyOverflow=null;if(previous?.isConnected)previous.focus()}else{top.node()?.focus()}};},[]);
 return <div className="db-dialog-overlay" onMouseDown={e=>{if(e.target===e.currentTarget&&isTopDialog(id.current))onClose()}}><div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={label} className={`db-company-dialog${wide?' is-wide':''}`}>{children}</div></div>;
}
