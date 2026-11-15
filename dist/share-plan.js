import {byId,interests} from './data.js';
import {evaluate,profiles,validate} from './engine.js';
const MAX_HASH=12000;
// The only fields permitted in public links. Notes, hotels, contacts and browser storage are excluded.
export function publicPlan(snapshot){
 if(!snapshot||!snapshot.input||!Array.isArray(snapshot.routes)||snapshot.routes.length<1||snapshot.routes.length>3)throw new Error('Ungültiger Reiseplan.');
 const src=snapshot.input;
 const input={start:src.start,days:src.days,arrival:src.arrival,departure:src.departure,variety:src.variety,pace:src.pace,tolerance:src.tolerance,maxOnly:!!src.maxOnly,avoidCrowds:!!src.avoidCrowds,priorities:Object.fromEntries(interests.map(([key])=>{
  const value=src.priorities?.[key]??0;if(![0,1,2].includes(value))throw new Error('Ungültige Priorität.');return [key,value];
 }))};
 if(validate(input).length)throw new Error('Der Link enthält ungültige Reiseeinstellungen.');
 if(!Object.hasOwn(profiles,snapshot.selected))throw new Error('Unbekannte Routenalternative.');
 const seen=new Set();
 const routes=snapshot.routes.map(r=>{
  if(!r||!Object.hasOwn(profiles,r.profile)||seen.has(r.profile)||!Array.isArray(r.ids)||r.ids.length<1||r.ids.length>8||r.ids.some(id=>typeof id!=='string'||!Object.hasOwn(byId,id)))throw new Error('Ungültige Route.');
  seen.add(r.profile);const dayTrips=r.dayTrips??r.requestedDayTrips??[];
  if(!Array.isArray(dayTrips)||dayTrips.length>2||dayTrips.some(id=>typeof id!=='string'||!Object.hasOwn(byId,id)))throw new Error('Ungültige Tagesausflüge.');
  const result={profile:r.profile,ids:[...r.ids],dayTrips:[...dayTrips]};
  if(!evaluate(result.ids,input,result.profile,undefined,result.dayTrips))throw new Error('Die Route ist mit diesen Reiseeinstellungen nicht planbar.');
  return result;
 });
 if(!seen.has(snapshot.selected))throw new Error('Die ausgewählte Route fehlt.');
 return {version:1,input,selected:snapshot.selected,routes};
}
export function createShareLink(snapshot,href){
 const plan=publicPlan(snapshot),bytes=new TextEncoder().encode(JSON.stringify(plan));
 const payload=btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
 const url=new URL(href);if(!['http:','https:'].includes(url.protocol))throw new Error('Bitte die App über eine Website öffnen.');
 url.username='';url.password='';url.search='';url.hash='trip/'+payload;
 if(url.hash.length>MAX_HASH)throw new Error('Dieser Reiseplan ist zu groß für einen Link.');
 return url.href;
}
export function readShareLink(hash){
 if(!hash.startsWith('#trip/'))return null;
 if(hash.length>MAX_HASH)throw new Error('Der Reiseplan-Link ist zu lang.');
 const token=hash.slice(6);if(!/^[A-Za-z0-9_-]+$/.test(token))throw new Error('Der Reiseplan-Link ist beschädigt.');
 try{
  const bytes=Uint8Array.from(atob(token.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
  const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(value.version!==1)throw new Error('version');return publicPlan(value);
 }catch{throw new Error('Der Reiseplan-Link ist ungültig oder mit dieser App-Version nicht planbar.');}
}
