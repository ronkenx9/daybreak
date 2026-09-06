'use client';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
export default function ShareRedirect(){const router=useRouter();useEffect(()=>{if(window.location.hash.startsWith('#share='))router.replace('/app/world'+window.location.hash)},[router]);return null}
