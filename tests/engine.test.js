import test from 'node:test';
import assert from 'node:assert/strict';
import {generateRoutes,evaluate,optimizeOrder,validate,seasonFor,HeuristicTransportProvider,dateAt} from '../dist/engine.js';
import {byId,interests,airports} from '../dist/data.js';
const input=(overrides={})=>({start:'2027-01-15',days:15,arrival:'BKK',departure:'HKT',variety:65,pace:'normal',tolerance:'medium',priorities:Object.fromEntries(interests.map(([k])=>[k,1])),...overrides});
test('three scored alternatives honor time budget, airports, and minimum stays',()=>{
 const i=input();const routes=generateRoutes(i);assert.deepEqual(routes.map(r=>r.profile),['relaxed','balanced','adventure']);
 for(const r of routes){assert.equal(r.ids[0],'bangkok');assert.equal(r.ids.at(-1),'phuket');assert.equal(r.stops.reduce((s,p)=>s+p.nights,0),i.days-1);assert.equal(r.schedule.length,i.days);assert.equal(r.schedule.at(-1).kind,'Abreise · Tag freihalten');assert.equal(r.schedule.at(-1).date,'2027-01-29');
  r.stops.slice(0,-1).forEach(s=>assert.ok(s.nights>=byId[s.id].min));
  for(const v of Object.values(r.scores))assert.ok(v>=0&&v<=100);
  r.legs.forEach(l=>{assert.equal(l.verified,false);assert.ok(l.buffer===.5||l.buffer===1);assert.equal(l.duration,undefined);});
 }
});
test('all priorities and no priorities work without filtering destinations out',()=>{
 assert.equal(generateRoutes(input({priorities:Object.fromEntries(interests.map(([k])=>[k,2]))})).length,3);
 const r=generateRoutes(input({priorities:{}}));assert.equal(r.length,3);assert.ok(r.every(r=>r.scores.coverage===100));
 const jungle=input({priorities:{jungle:2},days:12});const route=evaluate(['bangkok','krabi','phuket'],jungle);assert.ok(route);assert.equal(route.scores.coverage,100);assert.ok(route.stops.some(s=>!byId[s.id].scores.jungle));
});
test('coverage requires a scheduled experience, not just a destination capability',()=>{
 const r=evaluate(['bangkok','phuket'],input({days:4,priorities:{snorkel:2}}));assert.ok(r);assert.equal(r.stops.at(-1).nights,1);assert.equal(r.scores.coverage,0);assert.ok(!r.covered.includes('snorkel'));assert.ok(r.schedule.filter(d=>d.destination==='phuket').every(d=>!d.activity));
});
test('greater variety can improve experiences at the same number of bases',()=>{
 const base=input({days:9,arrival:'HKT',departure:'HKT',priorities:{beach:2}});
 const low=evaluate(['phuket'],{...base,variety:0});const high=evaluate(['phuket'],{...base,variety:100});
 assert.equal(high.changes,0);assert.equal(low.changes,0);assert.ok(high.scores.diversity>=low.scores.diversity);assert.ok(high.covered.length>1);
});
test('short trips remain feasible or return no routes without violating minima',()=>{
 assert.equal(generateRoutes(input({days:4,pace:'slow',arrival:'CNX',departure:'HKT'})).length,0);
 const routes=generateRoutes(input({days:4,arrival:'BKK',departure:'BKK'}));assert.equal(routes.length,3);assert.ok(routes.every(r=>r.ids.length===1&&r.ids[0]==='bangkok'));
 assert.equal(evaluate(['bangkok','kohlanta','khaosok','phuket'],input({days:8})),null);
});
test('airport return adds a protected last night and a free departure day',()=>{
 const r=evaluate(['bangkok','krabi','bangkok'],input({departure:'BKK',days:12}));assert.ok(r);assert.equal(r.stops.at(-1).nights,1);assert.equal(r.schedule.at(-2).activity,null);assert.equal(r.schedule.at(-1).activity,null);assert.equal(r.changes,2);
});
test('season evaluation follows every stay date across month and year boundaries',()=>{
 const r=evaluate(['phuket'],input({start:'2027-04-29',days:7,arrival:'HKT',departure:'HKT'}));assert.ok(r.stops[0].season.score<65);assert.ok(r.warnings.some(w=>w.includes('Andamanenküste')));
 const gulf=seasonFor(byId.samui,'2027-11-20');assert.ok(gulf.score<seasonFor(byId.samui,'2027-07-20').score);
 assert.equal(dateAt('2027-12-30',3),'2028-01-02');assert.ok(seasonFor(byId.chiangmai,'2027-03-01').note.includes('Rauch'));
});
test('reordering keeps all selected places and both airport anchors',()=>{
 const ids=['bangkok','krabi','kanchanaburi','khaosok','phuket'];const i=input({days:24});const before=evaluate(ids,i),after=optimizeOrder(ids,i);assert.ok(after.score>=before.score);assert.deepEqual([...after.ids].sort(),[...ids].sort());assert.equal(after.ids[0],ids[0]);assert.equal(after.ids.at(-1),ids.at(-1));assert.equal(after.stops.reduce((a,b)=>a+b.nights,0),23);
});
test('real transport data can be supplied through the provider boundary',()=>{
 let calls=0;const base=new HeuristicTransportProvider();const provider={estimate(a,b,context){calls++;assert.ok(context.date);return {...base.estimate(a,b),verified:true,source:'fixture',evidenceUrl:'https://example.com/test'};}};
 const r=evaluate(['bangkok','krabi','phuket'],input(), 'balanced',provider);assert.equal(calls,2);assert.ok(r.legs.every(l=>l.verified));
});
test('invalid dates, unsupported airports, durations and model settings are rejected',()=>{
 for(const change of [{start:'2027-02-30'},{days:3},{days:61},{days:4.5},{arrival:'XYZ'},{pace:'teleport'},{variety:NaN},{tolerance:'none'}])assert.ok(validate(input(change)).length,JSON.stringify(change));
 assert.equal(evaluate(['phuket','bangkok'],input()),null);
 assert.throws(()=>generateRoutes(input({days:0})));
});
test('generated routes are valid across seasons, paces, airports and travel tolerances',()=>{
 const cases=[{days:7,arrival:'HKT',departure:'KBV',pace:'slow',tolerance:'low'},{days:21,arrival:'CNX',departure:'USM',start:'2027-07-15',tolerance:'high'},{days:30,arrival:'USM',departure:'BKK',start:'2027-11-25',pace:'fast'},{days:5,arrival:'DMK',departure:'BKK'},{days:60,arrival:'KBV',departure:'CNX',pace:'fast',tolerance:'high'}];
 for(const c of cases){const i=input(c),routes=generateRoutes(i);assert.equal(routes.length,3);for(const r of routes){assert.equal(r.ids[0],airports.find(a=>a.code===i.arrival).destination);assert.equal(r.ids.at(-1),airports.find(a=>a.code===i.departure).destination);assert.equal(r.schedule.length,i.days);assert.ok(r.schedule.every((d,k)=>d.date===dateAt(i.start,k)));assert.ok(r.schedule.every(d=>!(d.buffer===1&&d.activity)));assert.equal(new Set(r.schedule.map(d=>d.date)).size,i.days);}}
});
