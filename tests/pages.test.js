import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pagesBase} from '../scripts/pages-base.mjs';
import {sensitiveFindings} from '../scripts/audit-public.mjs';
import {createShareLink,publicPlan,readShareLink} from '../dist/share-plan.js';
const snapshot=()=>({input:{start:'2027-01-15',days:15,arrival:'BKK',departure:'HKT',variety:65,pace:'normal',tolerance:'medium',priorities:{beach:2,jungle:1,snorkel:1,culture:1},personalNote:'Not for sharing',email:'not-for-sharing'},selected:'balanced',routes:[{profile:'balanced',ids:['bangkok','krabi','phuket'],dayTrips:['hongislands'],privateHotel:'not-for-sharing'}],privateMetadata:'not-for-sharing'});
test('GitHub Pages base covers the selected repository, renames, owner sites and custom domains',()=>{
 assert.equal(pagesBase({}),'/thailand-explorer/');assert.equal(pagesBase({GITHUB_REPOSITORY:'maxp-dotcom/thailand-explorer'}),'/thailand-explorer/');assert.equal(pagesBase({GITHUB_REPOSITORY:'maxp-dotcom/new-name'}),'/new-name/');assert.equal(pagesBase({GITHUB_REPOSITORY:'maxp-dotcom/maxp-dotcom.github.io'}),'/');assert.equal(pagesBase({PAGES_BASE_PATH:'/',GITHUB_REPOSITORY:'maxp-dotcom/thailand-explorer'}),'/');assert.throws(()=>pagesBase({PAGES_BASE_PATH:'/../other/'}));assert.throws(()=>pagesBase({PAGES_BASE_PATH:'https://other.example/'}));
});
test('share links round trip route order, days, airports, priorities and day trips under a repository path',()=>{
 const value=snapshot(),link=createShareLink(value,'https://maxp-dotcom.github.io/thailand-explorer/#planner');const url=new URL(link);assert.equal(url.pathname,'/thailand-explorer/');assert.ok(url.hash.startsWith('#trip/'));assert.deepEqual(readShareLink(url.hash),publicPlan(value));assert.equal(readShareLink(url.hash).routes[0].dayTrips[0],'hongislands');
 assert.equal(readShareLink('#destination/bangkok'),null);
});
test('public sharing excludes unknown fields, personal notes, contacts, hotel planning and query credentials',()=>{
 const link=createShareLink(snapshot(),'https://user:password@example.test/thailand-explorer/?private=not-for-sharing#planner');const url=new URL(link);assert.equal(url.search,'');assert.equal(url.username,'');assert.equal(url.password,'');const data=readShareLink(url.hash);assert.ok(!JSON.stringify(data).includes('not-for-sharing'));assert.ok(!('personalNote' in data.input));assert.ok(!('privateMetadata' in data));assert.ok(!('privateHotel' in data.routes[0]));
});
test('malformed, oversized, unsupported and infeasible shared plans are rejected',()=>{
 for(const hash of ['#trip/!invalid','#trip/'+('a'.repeat(12001)),'#trip/'+btoa('{"version":900}')])assert.throws(()=>readShareLink(hash));
 const bad=snapshot();bad.routes[0].ids=['bangkok','hongislands','phuket'];assert.throws(()=>publicPlan(bad));const injected=snapshot();injected.selected='__proto__';assert.throws(()=>publicPlan(injected));const wrong=snapshot();wrong.routes[0].profile='__proto__';assert.throws(()=>publicPlan(wrong));
});
test('artifact audit detects common credentials and private hosting metadata without printing values',()=>{
 assert.deepEqual(sensitiveFindings('Public guide for Max · no credentials'),[]);assert.ok(sensitiveFindings('ghp_'+'A'.repeat(36)).includes('github-token'));assert.ok(sensitiveFindings('private'+'@example.org').includes('email-address'));assert.ok(sensitiveFindings('appgprj_'+'1234567890').includes('private-hosting-metadata'));
});
test('deployment is gated behind explicit repository approval and pull requests cannot deploy',async()=>{
 const workflow=await readFile(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8');const deploy=workflow.split('\n  deploy:\n')[1];assert.ok(!deploy.includes('false &&'));assert.ok(deploy.includes("vars.PAGES_PUBLISH_ENABLED == 'true'"));assert.ok(deploy.includes("github.event_name != 'pull_request'"));assert.ok(deploy.includes("github.ref == 'refs/heads/main'"));assert.ok(deploy.includes('needs: build'));assert.ok(workflow.includes('path: build'));assert.ok(!workflow.includes('pull_request_target'));assert.ok(!workflow.includes('secrets.'));
});
