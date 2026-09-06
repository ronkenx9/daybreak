import {writeFile,readFile} from 'node:fs/promises';
// Discovery produces a candidate. Review issuer additions/removals before replacing registry.json.
const source='https://brand.base.org/stocks';
const html=process.argv[2]?await readFile(process.argv[2],'utf8'):await (await fetch(source)).text();
const tokens=new Map();
for(const match of html.matchAll(/aria-label="View ([A-Z]+c) on BaseScan" href="https:\/\/basescan.org\/token\/(0x[a-fA-F0-9]{40})"/g)){
 const [,symbol,address]=match; tokens.set(address.toLowerCase(),{chainId:8453,address:address.toLowerCase(),symbol,ticker:symbol.slice(0,-1),issuer:'Coinbase',sourceUrl:source});
}
if(tokens.size<1||tokens.size>500)throw Error('Listing layout changed; refusing empty or oversized registry');
const candidate={sourceUrl:source,checkedAt:new Date().toISOString(),scope:'Coinbase tokenized stocks listed by Base; not every stock-like token on the chain',tokens:[...tokens.values()]};
await writeFile('docs/audit/base-public-listing-candidate.json',JSON.stringify(candidate,null,2)+'\n');
console.log(`Wrote ${tokens.size} candidates. Verify chain metadata, then review before promoting.`);
