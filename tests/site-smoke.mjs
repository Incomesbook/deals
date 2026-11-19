import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildSnapshot} from '../sync-monitor.mjs';
const here=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const now=Date.parse('2026-11-19T07:00:00Z');
const records={
 '53de55d1-4910-42a9-a40a-af16faf721c9':{title:'APPLE open box',url:'https://openbox.ca/products/apple-watch-series-11-gps-open-box-1-year-warranty',processor:'restock_diff',paused:false,last_error:false,last_checked:Math.floor(now/1000)-600,processor_state_restock_diff:{price:349.99,in_stock:true,currency:'CAD'}},
 '86ff3375-d8dc-4228-b543-0b3c01aee607':{title:'APPLE new',url:'https://openbox.ca/products/apple-watch-series-11-gps-new-1-year-warranty',processor:'restock_diff',paused:false,last_error:false,last_checked:Math.floor(now/1000)-600,processor_state_restock_diff:{price:399.99,in_stock:false,currency:'CAD'}},
 '39a20125-80a2-4f44-91f5-f560d918ff98':{title:'Dyson',url:'https://www.nbbuy.ca/products/dyson-official-outlet-v15',processor:'restock_diff',paused:false,last_error:'Unable to extract',last_checked:Math.floor(now/1000)-200,processor_state_restock_diff:{price:442.49,in_stock:true,currency:'CAD'}},
 '47df5520-15b9-49e2-9914-477f12a977c7':{title:'Apple USA',url:'https://ipowerresale.com/products/apple-watch-series-11',processor:'restock_diff',paused:false,last_error:false,last_checked:Math.floor(now/1000)-400,processor_state_restock_diff:{price:289,in_stock:true,currency:'USD'}},
 '6a3d5172-c138-447f-8c31-e416c341a737':{title:'BLACK FRIDAY Dyson Canada official promotions',url:'https://www.dysoncanada.ca/en/deals/dyson-canada-sale',processor:'text_json_diff',paused:false,last_error:false,last_checked:Math.floor(now/1000)-100,processor_state_restock_diff:{price:239.99,in_stock:true,currency:'CAD'}},
 '9dbad522-2b27-4cb3-9d8d-a533f781630b':{title:'Dyson Core',url:'https://homeessentialsclearance.com/products/dyson-official-outlet-v15',processor:'restock_diff',paused:false,last_error:false,last_checked:Math.floor(now/1000)-20*3600,processor_state_restock_diff:{price:459.97,in_stock:true,currency:'CAD'}}
};
const s=buildSnapshot(records,now);const by=id=>s.offers.find(x=>x.id===id);
assert.equal(s.counts.tracked,6);assert.equal(s.counts.usable_observations,1);assert.equal(by('53de55d1-4910-42a9-a40a-af16faf721c9').monitored_price,349.99);
assert.equal(by('86ff3375-d8dc-4228-b543-0b3c01aee607').status,'out_of_stock');
assert.equal(by('86ff3375-d8dc-4228-b543-0b3c01aee607').monitored_price,null);
assert.equal(by('39a20125-80a2-4f44-91f5-f560d918ff98').status,'fetch_error');
assert.equal(by('47df5520-15b9-49e2-9914-477f12a977c7').status,'foreign_currency');
assert.equal(by('47df5520-15b9-49e2-9914-477f12a977c7').monitored_currency,null);
assert.equal(by('6a3d5172-c138-447f-8c31-e416c341a737').status,'promotion_only');
assert.equal(by('9dbad522-2b27-4cb3-9d8d-a533f781630b').status,'stale');
const data=JSON.stringify(s);for(const secret of ['api_access_token','mcp_tokens','sk-proj','gho_'])assert.ok(!data.includes(secret));
const html=await fs.readFile(path.join(here,'index.html'),'utf8');
for(const key of ['prices.json','Неизвестные расходы','archive-2026-11-07.html','function render','GitHub Pages'])assert.ok(html.includes(key),'missing UI text '+key);
assert.ok(!html.includes('GoRecell (Монреаль)'),'old obsolete 2026-11-07 hero leaked');
const inline=html.match(/<script>([\s\S]*?)<\/script>/);assert.ok(inline,'inline script not found');new Function(inline[1]);console.log('FRONTEND_JS_SYNTAX_PASS');
const archive=await fs.readFile(path.join(here,'archive-2026-11-07.html'),'utf8');
assert.ok(archive.includes('7 ноября 2026'),'archive should retain dated Claude source');
const local=JSON.parse(await fs.readFile(path.join(here,'prices.json'),'utf8'));
assert.equal(local.schema_version,1);assert.ok(local.counts.tracked>=12);
assert.ok(local.offers.every(x=>!x.checkout_verified&&!x.final_landed_cad));
console.log('SNAPSHOT_SECURITY_AND_STALE_TEST_PASS');
console.log('PUBLIC_SITE_CONTRACT_TEST_PASS',local.counts.tracked,'tracked');
console.log('WEB_SITE_E2E_PASS');
