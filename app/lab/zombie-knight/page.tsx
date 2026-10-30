import type {Metadata} from 'next';
import ZombieCapsuleUpload from '@/components/zombie-capsule/ZombieCapsuleUpload';

export const metadata:Metadata={title:'Zombie capsule upload (knight)',robots:{index:false,follow:false}};

export default function ZombieKnightLab(){
 return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:'48px 16px',background:'#000'}}>
  <ZombieCapsuleUpload hero="knight"/>
 </main>;
}
