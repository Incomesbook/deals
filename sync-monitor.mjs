// BESTPRICE public snapshot exporter. Runs LOCALLY on authorized Windows machine.
// Reads changedetection REST API with local config token; publishes ONLY public URLs,
// titles, observed price/stock/status and timestamps; never exports credentials.
// Static GitHub Pages cannot access 127.0.0.1:8878 directly.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const here=path.dirname(fileURLToPath(import.meta.url));
const cdConfig='D:\\Setup_VcCode_Workspace_Runtime\\MCP\\Services\\MCP_BestPrice\\Changedetection\\data\\changedetection.json';
const cdAPI='http://127.0.0.1:8878/api/v1/watch';
const outfile=path.join(here,'prices.json');
const MAX_AGE_HOURS=4;
const METADATA={
'2f9e3760-4275-4b3a-8816-bf42389fcf0c':['apple','S11 42 мм GPS','new','Staples','unknown'],
'5fb47e22-1c2e-4f57-b64f-d51d77a5fe0f':['apple','S11 46 мм GPS','refurbished','Best Buy Marketplace','unknown'],
'36e05c78-4b2f-4a11-b719-e30129e05e17':['apple','S11 46 мм GPS','refurbished','Best Buy Marketplace — OpenBox','unknown'],
'b28dfe48-fe2b-4ea4-8061-afec44f76fa9':['apple','S11 42 мм GPS','open_box','iPowerResale USA','no'],
'6c2579c0-63b5-4e43-b402-9f7544ee2646':['dyson','V15 Core','refurbished','Dyson Official Outlet / Walmart Marketplace','no'],
'3f4c9f24-77ef-4552-ba62-23401bdf25a0':['dyson','V15 Core','refurbished','Dyson Official Outlet / Best Buy Marketplace','no'],
'6c555137-5626-4a1e-b370-f75d542d1f14':['dyson','V15 Core','refurbished','Home Essentials Outlet','verify'],
'e4da1ec4-ad3a-4550-924e-1f38140cbd38':['apple','S11 42 мм GPS','new','Jump+','unknown'],
'9dbad522-2b27-4cb3-9d8d-a533f781630b':['dyson','V15 Core','refurbished','Home Essentials Clearance','verify'],
'c3da7541-9581-4e8f-a5c5-64674896f6d0':['bonus','Walmart gift cards','not_product','GotCashback','no'],
'0fd93515-8b05-442e-b60d-84667153acaf':['bonus','Staples Black Friday','not_product','Staples','no'],
'6a3d5172-c138-447f-8c31-e416c341a737':['bonus','Dyson Black Friday','not_product','Dyson Canada','no'],
'47df5520-15b9-49e2-9914-477f12a977c7':['apple','S11 42 мм GPS','open_box','iPowerResale USA','no'],
'53de55d1-4910-42a9-a40a-af16faf721c9':['apple','S11 GPS (размер уточнить)','open_box','OpenBox Canada','no'],
'86ff3375-d8dc-4228-b543-0b3c01aee607':['apple','S11 GPS (размер уточнить)','new','OpenBox Canada','no'],
'39a20125-80a2-4f44-91f5-f560d918ff98':['dyson','V15 Detect (комплект уточнить)','refurbished','Neighbor Buy','unknown']
};
const isHttps=(v)=>{try{let u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port}catch{return false}};
const safeMoney=(v)=>typeof v==='number'&&Number.isFinite(v)&&v>0&&v<100000?Math.round(v*100)/100:null;
function transform(id,v,now){
 const meta=METADATA[id]||['other','Точная модель не подтверждена','unknown','Не указан','unknown'];
 const p=v?.processor_state_restock_diff||{};
 const stamp=Number(v?.last_checked||0);
 const age=stamp>0?Math.max(0,(now-stamp*1000)/3600000):null;
 const currency=/^[A-Z]{3}$/.test(String(p.currency||''))?p.currency:null;
 const amount=safeMoney(p.price);
 const offer=meta[0]!=='bonus'&&v.processor==='restock_diff';
 const error=typeof v.last_error==='string'&&v.last_error.length>0?v.last_error.slice(0,135):null;
 const fresh=offer&&amount!==null&&currency!==null&&p.in_stock===true&&!v.paused&&!error&&age!==null&&age<=MAX_AGE_HOURS;
 let status='stale';
 if(meta[0]==='bonus')status='promotion_only';
 else if(v.paused)status='paused';
 else if(error)status='fetch_error';
 else if(p.in_stock===false)status='out_of_stock';
 else if(fresh&&currency!=='CAD')status='foreign_currency';
 else if(fresh)status='observed';
 const url=isHttps(v.url)?v.url:null;
 return {id,category:meta[0],model:meta[1],condition:meta[2],seller:meta[3],pickup:meta[4],
  title:String(v.title||meta[1]).slice(0,145),url,
  monitored_price:status==='observed'?amount:null,
  monitored_currency:status==='observed'?'CAD':null,
  last_seen_price:amount,last_seen_currency:currency,
  stock:p.in_stock===true?'yes':p.in_stock===false?'no':'unknown',
  checked_at:stamp>0?new Date(stamp*1000).toISOString():null,
  age_hours:age===null?null:Math.round(age*10)/10,
  status,
  issue:error||null,
  checkout_verified:false,warranty_verified:false,shipping_verified:false,taxes_verified:false,
  final_landed_cad:null
 };
}
export function buildSnapshot(watches,now=Date.now()){
 const offers=Object.entries(watches).map(([id,v])=>transform(id,v,now));
 const counts={tracked:offers.length,usable_observations:offers.filter(x=>x.status==='observed').length,
  stalled_or_unavailable:offers.filter(x=>['stale','paused','fetch_error','out_of_stock'].includes(x.status)).length,
  foreign_currency:offers.filter(x=>x.status==='foreign_currency').length,
  promo_only:offers.filter(x=>x.status==='promotion_only').length};
 return {schema_version:1,generated_at:new Date(now).toISOString(),origin:'self-hosted changedetection.io local REST API (sanitized snapshot)',
  max_age_hours:MAX_AGE_HOURS,province:'Ontario',tax_rate_display_only:0.13,
  counts,offers,
  disclaimer:'Показанная цена — наблюдение на сайте, НЕ подтверждённая цена покупки в Канаде. Неизвестные доставка, налоги, гарантия и ограничения не равны нулю. Устаревшие и недоступные предложения нельзя называть актуальной лучшей ценой.'};
}
async function atomicWrite(data){
 const tmp=outfile+'.tmp-'+process.pid;
 await fs.writeFile(tmp,JSON.stringify(data,null,2)+'\n','utf8');
 await fs.rename(tmp,outfile);
}
function git(args){return execFileSync('git',args,{cwd:here,encoding:'utf8',timeout:25000,stdio:['ignore','pipe','pipe']}).trim()}
async function main(){
 const input=JSON.parse(await fs.readFile(cdConfig,'utf8'));
 const key=input?.settings?.application?.api_access_token;
 if(!key||input?.settings?.application?.api_access_token_enabled!==true)throw Error('changedetection REST API not configured');
 const res=await fetch(cdAPI,{headers:{'x-api-key':key},signal:AbortSignal.timeout(15000),redirect:'error'});
 if(!res.ok)throw Error('monitor REST status '+res.status);
 const records=await res.json();
 if(!records||typeof records!=='object'||Object.keys(records).length<8)throw Error('watch count unexpectedly low; refuse overwrite');
 const payload=buildSnapshot(records);
 // If watching works but nothing fresh, still publish truthful errors/staleness.
 const publicText=JSON.stringify(payload);
 if(publicText.includes(key)||publicText.includes('api_access_token')||publicText.includes('mcp_tokens'))throw Error('secret found in export');
 await atomicWrite(payload);
 console.log('SNAPSHOT_OK '+JSON.stringify(payload.counts)+' '+payload.generated_at);
 if(process.argv.includes('--publish')){
  const allowed=['prices.json','index.html','sync-monitor.mjs','tests/site-smoke.mjs','README.md','archive-2026-11-07.html'];
  if(git(['branch','--show-current'])!=='main')throw Error('unexpected git branch; publishing aborted');
  // Never git add -A; audit and other private files remain excluded.
  git(['add','--',...allowed]);
  const staged=git(['diff','--cached','--name-only']).split(/\r?\n/).filter(Boolean);
  if(staged.some(x=>!allowed.includes(x)))throw Error('unexpected staged file; publishing aborted');
  if(staged.length){
   git(['commit','-m','Sync BESTPRICE public price observations '+payload.generated_at.slice(0,16)]);
   git(['push','origin','main']);
   console.log('PUBLIC_SITE_PUSH_OK '+git(['rev-parse','--short','HEAD']));
  }else console.log('PUBLIC_SITE_ALREADY_CURRENT');
 }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(e=>{console.error('SYNC_FAILED '+e.message);process.exitCode=1});
}
