import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';

const root=process.cwd();
const require=createRequire(import.meta.url);

function loadTsExports(relativePath){
  const source=fs.readFileSync(path.join(root,relativePath),'utf8');
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{}};
  vm.runInNewContext(code,{module,exports:module.exports,require,console},{filename:relativePath});
  return module.exports;
}

const {TOKENS}=loadTsExports('lib/base/tokens.ts');
const {STOCK_LOGOS}=loadTsExports('lib/assets/stock-logos.ts');
const failures=[];

for(const token of TOKENS){
  const logo=STOCK_LOGOS[token.ticker];
  if(!logo){failures.push(`${token.ticker}: missing registry entry`);continue}
  const assetPath=path.join(root,'public',logo.src.replace(/^\//,''));
  if(!fs.existsSync(assetPath)){failures.push(`${token.ticker}: missing ${logo.src}`);continue}
  const bytes=fs.readFileSync(assetPath);
  const validPng=bytes.length>8&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const validSvg=bytes.subarray(0,500).toString('utf8').includes('<svg');
  if(!validPng&&!validSvg)failures.push(`${token.ticker}: ${logo.src} is not a valid PNG or SVG`);
}

if(failures.length){
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`verified ${TOKENS.length} bundled stock logos`);
