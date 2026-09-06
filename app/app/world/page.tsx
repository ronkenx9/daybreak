import Link from 'next/link';
import LegacyWorld from '@/components/daybreak/LegacyWorld';
export default function Page(){return <div className="db-legacy"><div className="db-legacy-banner"><Link href="/app">← Back to Daybreak</Link><span>Room prototype · purchases and holdings are simulated</span></div><LegacyWorld/></div>}
