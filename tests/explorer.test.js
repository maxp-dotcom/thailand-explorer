import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {destinations,byId,visitedCount,interests} from '../dist/data.js';
import {filterDestinations,emptyFilters,visitLabel} from '../dist/explorer-model.js';
import {bangkokGuide,groupBudget,checkNewYear} from '../dist/bangkok.js';
import {generateRoutes,evaluate,validate,optimizeOrder} from '../dist/engine.js';
const input=(overrides={})=>({start:'2027-01-15',days:15,arrival:'BKK',departure:'HKT',variety:65,pace:'normal',tolerance:'medium',priorities:{beach:2,jungle:2,snorkel:1,culture:1},...overrides});
const maxIds=['kohchang','kohkood','kohmak','kohlanta','railay','hongislands','kohlipe','phuket','kohphayam','samui','phangan','kohtao','khaosok','chiangmai','pai','bangkok'];
test('catalog retains every old destination and has exactly sixteen confirmed visits',async()=>{
 assert.equal(destinations.length,20);assert.equal(new Set(destinations.map(d=>d.id)).size,20);assert.equal(visitedCount,16);
 assert.deepEqual(destinations.filter(d=>d.visitedByMax===true).map(d=>d.id).sort(),[...maxIds].sort());
 for(const id of ['ayutthaya','kanchanaburi','chiangrai','krabi']){assert.equal(byId[id].visitedByMax,null);assert.equal(byId[id].tourismLevel,null);assert.equal(visitLabel(byId[id]),'Besuchsstatus unbekannt');}
 for(const d of destinations){assert.equal(d.personalNote,'');assert.equal(d.personalRating,null);assert.ok(d.coordinates.latitude>5&&d.coordinates.latitude<21);assert.ok(d.coordinates.longitude>97&&d.coordinates.longitude<104);assert.match(d.coordinateSource.url,/^https:\/\//);assert.equal(d.coordinateSource.checkedAt,'2026-11-15');assert.equal(d.lat,d.coordinates.latitude);assert.ok(d.shortDescription);assert.ok(d.categories.length);assert.ok(d.images.length);await access(new URL('../dist/'+d.images[0].src,import.meta.url));assert.equal(d.images[0].license,'CC0-1.0');}
});
test('visit filters never treat unknown as unvisited',()=>{
 assert.equal(filterDestinations({visited:'visited'}).length,16);assert.equal(filterDestinations({visited:'not-visited'}).length,0);assert.equal(filterDestinations({visited:'unknown'}).length,4);
 const sample=[...destinations,{...byId.krabi,id:'confirmed-not-visited',visitedByMax:false}];assert.deepEqual(filterDestinations({visited:'not-visited'},sample).map(d=>d.id),['confirmed-not-visited']);
});
test('combined filters cover range, search, region and any/all category semantics',()=>{
 const quiet=filterDestinations({visited:'visited',tourismMax:2});assert.deepEqual(quiet.map(d=>d.id).sort(),['kohkood','kohmak','kohphayam']);
 const any=filterDestinations({categories:['dive','mountains'],categoryMode:'any'}),all=filterDestinations({categories:['dive','mountains'],categoryMode:'all'});assert.ok(any.length>0);assert.equal(all.length,0);
 assert.deepEqual(filterDestinations({query:'Klong Chao'}).map(d=>d.id),['kohkood']);
 const region=filterDestinations({region:'Andamanensee / Krabi',tourismMin:4});assert.deepEqual(region.map(d=>d.id).sort(),['hongislands','railay']);
 assert.equal(filterDestinations({...emptyFilters()}).length,20);assert.equal(filterDestinations({tourismMax:3}).some(d=>d.tourismLevel==null),false);
 const sorted=filterDestinations({sort:'tourism'});assert.equal(sorted[0].tourismLevel,1);assert.equal(sorted.at(-1).tourismLevel,null);
});
test('all sixteen categories are supported by the catalog and planning experiences',()=>{
 assert.equal(interests.length,16);for(const [key] of interests){const matches=destinations.filter(d=>d.categories.includes(key));assert.ok(matches.length,key);assert.ok(matches.every(d=>d.activities[key]&&d.scores[key]),key);}
});
test('Hong is a day trip and Railay supports either overnight or a full-day excursion',()=>{
 const i=input();assert.equal(evaluate(['bangkok','hongislands','phuket'],i),null);assert.ok(evaluate(['bangkok','railay','phuket'],i));
 const base=evaluate(['bangkok','krabi','phuket'],i);const trips=evaluate(base.ids,i,'balanced',undefined,['hongislands','railay']);assert.ok(trips);assert.equal(trips.changes,base.changes);assert.equal(trips.schedule.length,i.days);assert.equal(trips.schedule.filter(d=>d.activity?.dayTripId).length,2);assert.ok(trips.schedule.filter(d=>d.activity?.dayTripId).every(d=>d.buffer===0&&d.destination==='krabi'));assert.ok(trips.warnings.some(w=>w.includes('Rückfahrt')));
 assert.equal(evaluate(['bangkok','phuket'],i,'balanced',undefined,['hongislands']),null);assert.equal(evaluate(base.ids,i,'balanced',undefined,['hongislands','hongislands']),null);
 const airportBase=evaluate(['bangkok','krabi'],input({departure:'KBV'}),'balanced',undefined,['hongislands','railay']);assert.ok(airportBase);assert.ok(airportBase.stops.at(-1).nights>=3);
 assert.equal(evaluate(['bangkok','krabi'],input({days:4,departure:'KBV'}),'balanced',undefined,['hongislands']),null);
 const optimized=optimizeOrder(trips.ids,i,'balanced',undefined,trips.requestedDayTrips);assert.deepEqual(optimized.requestedDayTrips,['hongislands','railay']);
});
test('Max-only planning includes only confirmed destinations and respects airport identity',()=>{
 const i=input({maxOnly:true});const routes=generateRoutes(i);assert.equal(routes.length,3);assert.ok(routes.every(r=>r.ids.every(id=>byId[id].visitedByMax===true)));assert.equal(evaluate(['bangkok','krabi','phuket'],i),null);assert.ok(validate(input({maxOnly:true,departure:'KBV'})).length);
 const airports=evaluate(['bangkok'],input({arrival:'BKK',departure:'DMK',days:5}));assert.equal(airports.airportAccess.arrival,'BKK');assert.equal(airports.airportAccess.departure,'DMK');assert.ok(airports.warnings.some(w=>w.includes('unterschiedliche Flughäfen')));
});
test('crowd preference affects ranking without inventing tourism levels',()=>{
 const standard=evaluate(['bangkok','phuket'],input()),quiet=evaluate(['bangkok','phuket'],input({avoidCrowds:true}));assert.ok(quiet.score<standard.score);assert.ok(quiet.crowdPenalty>0);const unknown=evaluate(['bangkok','krabi','phuket'],input({avoidCrowds:true}));assert.ok(unknown.warnings.some(w=>w.includes('Tourismusintensität unbekannt')));
});
test('Bangkok model includes city sections and distinct airport guidance without current hotel claims',()=>{
 for(const key of ['recommendedAreas','transportTips','airportConnections','accommodationAdvice','nightlifeAreas','foodAreas','seasonalEvents','groupTravelTips'])assert.ok(byId.bangkok[key],key);
 assert.deepEqual(bangkokGuide.airportConnections.map(a=>a.code),['BKK','DMK']);assert.match(bangkokGuide.groupTravelTips.example,/Historisches/);assert.match(bangkokGuide.seasonalEvents[0].discussedSpot.context,/Kein garantiertes/);
 const r=evaluate(['bangkok'],input({arrival:'BKK',departure:'DMK',start:'2026-12-30',days:5}));assert.ok(r.warnings.some(w=>w.includes('Silvester')));
});
test('group budgets charge rooms and split double rooms between two people',()=>{
 assert.deepEqual(groupBudget({singles:4,couples:2,nights:2,singleRate:60,doubleRate:140}),{people:8,rooms:6,total:1040,singlePerPerson:120,couplePerPerson:140});
 assert.equal(groupBudget({singles:4,couples:2,nights:2,singleRate:-1,doubleRate:140}),null);assert.equal(groupBudget({singles:.5,couples:2,nights:2,singleRate:60,doubleRate:140}),null);
});
test('New Year checker distinguishes rough areas and never confirms live access or transport',()=>{
 const r=checkNewYear({hotelArea:'siam',eventArea:'river',returnMode:'taxi',venue:'River City',year:2027});assert.equal(r.verified,false);assert.equal(r.sameArea,false);assert.match(r.transport,/nicht gesichert/);assert.equal(r.checks.length,4);
 const close=checkNewYear({hotelArea:'siam',eventArea:'siam',returnMode:'walk'});assert.equal(close.sameArea,true);assert.match(close.transport,/Sperren/);
});
