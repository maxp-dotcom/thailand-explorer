import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,basename} from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseHTML} from 'linkedom';
import {pagesBase} from '../scripts/pages-base.mjs';
import {inspectPublic} from '../scripts/audit-public.mjs';
import {createShareLink} from '../dist/share-plan.js';
const root=resolve('build'),base=pagesBase(),nativeFetch=globalThis.fetch;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.txt':'text/plain'};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function settled(check){for(let n=0;n<100;n++){if(check())return;await delay(20);}assert.fail('Production DOM did not settle');}
async function serve(t){const server=createServer(async(req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(!path.startsWith(base)){res.writeHead(404).end();return;}let file=resolve(root,path.slice(base.length)||'index.html');if(!file.startsWith(root+'/')){res.writeHead(403).end();return;}if((await stat(file)).isDirectory())file=resolve(file,'index.html');res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'}).end(await readFile(file));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));return `http://127.0.0.1:${server.address().port}${base}`;}
async function boot(url,html,bundle,storage=new Map()){
 const {window,document}=parseHTML(html),listeners=new Map();
 Object.defineProperty(window.HTMLSelectElement.prototype,'value',{get(){const options=[...this.querySelectorAll('option')];return (options.find(o=>o.hasAttribute('selected'))||options[0])?.getAttribute('value')||'';},set(value){for(const option of this.querySelectorAll('option')){if(option.getAttribute('value')===String(value))option.setAttribute('selected','');else option.removeAttribute('selected');}}});
 Object.assign(globalThis,{window,document,location:new URL(url),history:{pushState(_s,_t,path){globalThis.location=new URL(path,globalThis.location);}},addEventListener:(name,callback)=>{const values=listeners.get(name)||[];values.push(callback);listeners.set(name,values);},matchMedia:()=>({matches:true}),localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},fetch:(target,options)=>{const uri=new URL(target,url);if(uri.protocol==='file:')return nativeFetch(new URL('assets/'+basename(uri.pathname),new URL('.',url)),options);return nativeFetch(uri,options);}});
 for(const dialog of document.querySelectorAll('dialog')){Object.defineProperty(dialog,'open',{get(){return dialog.hasAttribute('open');}});dialog.showModal=()=>dialog.setAttribute('open','');dialog.close=()=>dialog.removeAttribute('open');}
 await import(pathToFileURL(bundle).href+'?production='+Math.random());await settled(()=>document.querySelectorAll('.route-option').length===3);await settled(()=>document.querySelector('#route-map .country.thailand'));
 return {document,storage,click:el=>el.dispatchEvent(new window.Event('click',{bubbles:true})),change:el=>el.dispatchEvent(new window.Event('change',{bubbles:true})),navigate:hash=>{globalThis.location.hash=hash;for(const callback of listeners.get('hashchange')||[])callback();}};
}
test('production artifact loads under its Pages base, including direct hash URLs and every local asset',async t=>{
 await inspectPublic(root);const origin=await serve(t),response=await nativeFetch(origin);assert.equal(response.status,200);const html=await response.text();
 const {document}=parseHTML(html);const assets=[...document.querySelectorAll('script[src],link[rel=stylesheet]')].map(el=>el.getAttribute('src')||el.getAttribute('href'));
 assert.ok(assets.length>=2);for(const path of assets){assert.ok(path.startsWith(base),path);assert.equal((await nativeFetch(new URL(path,origin))).status,200,path);}
 for(const hash of ['#planner','#destination/bangkok','#max-guide'])assert.equal((await nativeFetch(origin+hash)).status,200);
 const js=assets.find(path=>path.endsWith('.js')),bundle=resolve(root,js.slice(base.length));const app=await boot(origin+'#destination/bangkok',html,bundle);
 const $=id=>app.document.getElementById(id);assert.equal($('destination-title').textContent,'Bangkok');assert.equal($('destination-detail').hidden,false);assert.ok($('bkk-transport'));assert.ok($('bkk-newyear'));
 for(const image of app.document.querySelectorAll('#destination-grid img'))assert.equal((await nativeFetch(new URL(image.getAttribute('src'),origin))).status,200);
 app.click($('nav-explorer'));$('visit-filter').value='visited';app.change($('visit-filter'));assert.equal(app.document.querySelectorAll('[data-destination-card]').length,16);$('visit-filter').value='unknown';app.change($('visit-filter'));assert.equal(app.document.querySelectorAll('[data-destination-card]').length,4);
 // Refresh a direct destination URL with a new document and the built bundle.
 const refreshed=await boot(origin+'#destination/bangkok',html,bundle,app.storage);assert.equal(refreshed.document.getElementById('destination-title').textContent,'Bangkok');
});
test('a production share URL opens without login, requires import and keeps a backup of the recipient plan',async t=>{
 const origin=await serve(t),html=await (await nativeFetch(origin)).text(),js=parseHTML(html).document.querySelector('script[src]').getAttribute('src'),bundle=resolve(root,js.slice(base.length));
 const shared={input:{start:'2027-07-15',days:14,arrival:'BKK',departure:'HKT',variety:80,pace:'normal',tolerance:'medium',priorities:{beach:2,snorkel:1}},selected:'balanced',routes:[{profile:'balanced',ids:['bangkok','krabi','phuket'],dayTrips:['hongislands']}]};
 const link=createShareLink(shared,origin),app=await boot(link,html,bundle);const $=id=>app.document.getElementById(id);
 assert.equal($('shared-plan-banner').hidden,false);assert.equal($('days').value,'15');assert.ok($('shared-plan-summary').textContent.includes('14 Tage'));const previous=app.storage.get('sabai-plan-v1');
 app.click($('import-shared-plan'));await settled(()=>$('days').value==='14'&&app.document.querySelector('[data-remove-excursion="hongislands"]'));assert.equal($('shared-plan-banner').hidden,true);assert.equal(app.storage.get('sabai-plan-before-share-v1'),previous);assert.ok(JSON.parse(app.storage.get('sabai-plan-v1')).routes.find(r=>r.profile==='balanced').dayTrips.includes('hongislands'));
 app.navigate(new URL(link).hash);assert.equal($('shared-plan-banner').hidden,false);app.click($('dismiss-shared-plan'));assert.equal($('shared-plan-banner').hidden,true);assert.equal($('days').value,'14');
});
