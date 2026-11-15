import {defineConfig} from 'vite';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {guideEntries} from './dist/catalog.js';
import {pagesBase} from './scripts/pages-base.mjs';
const base=pagesBase();
export default defineConfig({
 root:fileURLToPath(new URL('./dist',import.meta.url)),
 base,
 publicDir:false,
 build:{outDir:fileURLToPath(new URL('./build',import.meta.url)),emptyOutDir:true,sourcemap:false,modulePreload:{polyfill:false},assetsInlineLimit:0,target:'es2022'},
 plugins:[{
  name:'sabai-public-assets',
  generateBundle(){
   // Explicit assets only. Never copy the checkout, hosting metadata or runtime state.
   for(const src of [...new Set(guideEntries.flatMap(d=>d.images.map(i=>i.src))),'images/LICENSE.txt']){
    if(!/^images\/[a-z0-9.-]+\.(svg|txt)$/i.test(src))throw new Error('Unexpected public image path');
    this.emitFile({type:'asset',fileName:src,source:readFileSync(new URL('./dist/'+src,import.meta.url))});
   }
   this.emitFile({type:'asset',fileName:'.nojekyll',source:''});
   this.emitFile({type:'asset',fileName:'404.html',source:`<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Seite nicht gefunden · Sabai</title><body style="font-family:system-ui;background:#f7f8f2;color:#173f36;padding:8vw"><h1>Zurück zu deinem Thailand.</h1><p>Dieser Pfad ist nicht vorhanden. Reiseziele und geteilte Pläne verwenden Links mit einem #.</p><a href="${base}">Thailand Explorer öffnen</a></body></html>`});
  }
 }]
});
