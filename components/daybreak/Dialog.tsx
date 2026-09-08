'use client';
import {useEffect,useRef,type ReactNode} from 'react';
export default function Dialog({label,onClose,children,wide=false}:{label:string;onClose:()=>void;children:ReactNode;wide?:boolean}){
 const ref=useRef<HTMLDivElement>(null);const close=useRef(onClose);close.current=onClose;
 useEffect(()=>{const previous=document.activeElement as HTMLElement;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';ref.current?.focus();
 const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();close.current();return}if(e.key!=='Tab')return;const nodes=[...(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select,[tabindex="0"]')||[])].filter(el=>el.getClientRects().length>0);const first=nodes[0],last=nodes[nodes.length-1];if(!first){e.preventDefault();return}if(e.shiftKey&&(document.activeElement===first||document.activeElement===ref.current)){e.preventDefault();last.focus()}else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===ref.current)){e.preventDefault();first.focus()}};
 document.addEventListener('keydown',key);return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',key);if(previous?.isConnected)previous.focus()};},[]);
 return <div className="db-dialog-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={label} className={`db-company-dialog${wide?' is-wide':''}`}>{children}</div></div>;
}
