import {destinations,byId,airports,interests} from './data.js';
export const RULES_VERSION='1.1';
export const profiles={relaxed:{name:'Entspannt',subtitle:'Mehr ankommen. Weniger weiterziehen.',max:3,transfer:.36,quality:.25},balanced:{name:'Ausgewogen',subtitle:'Neue Eindrücke. Ein guter Rhythmus.',max:4,transfer:.24,quality:.2},adventure:{name:'Abenteuer',subtitle:'Mehr entdecken. Bewusst unterwegs.',max:6,transfer:.16,quality:.16}};
const clamp=(x,a=0,b=100)=>Math.max(a,Math.min(b,x));
export const dateAt=(start,offset)=>new Date(Date.parse(start+'T12:00:00Z')+offset*86400000).toISOString().slice(0,10);
export function validate(input){
 const e=[];if(!input||typeof input!=='object')return ['Ungültige Reiseeingaben.'];const time=Date.parse(input.start+'T12:00:00Z');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(input.start)||!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==input.start)e.push('Bitte ein gültiges Anreisedatum wählen.');
 if(!Number.isInteger(input.days)||input.days<4||input.days>60)e.push('Bitte eine Reisedauer zwischen 4 und 60 Tagen wählen.');
 if(!airports.some(a=>a.code===input.arrival)||!airports.some(a=>a.code===input.departure))e.push('Bitte gültige Ankunfts- und Abflughäfen wählen.');
 if(!Number.isFinite(input.variety)||input.variety<0||input.variety>100)e.push('Bitte die Abwechslung zwischen 0 und 100 wählen.');
 if(!['slow','normal','fast'].includes(input.pace)||!['low','medium','high'].includes(input.tolerance))e.push('Bitte gültige Reiseeinstellungen wählen.');
 if(input.maxOnly&&[input.arrival,input.departure].some(code=>{const a=airports.find(a=>a.code===code);return a&&byId[a.destination].visitedByMax!==true;}))e.push('Für ausschließlich von Max bereiste Ziele bitte auch einen entsprechenden Flughafenort wählen, zum Beispiel Bangkok, Phuket, Chiang Mai oder Koh Samui. Krabis Besuchsstatus ist unbekannt.');
 return e;
}
export function distance(a,b){const rad=x=>x*Math.PI/180;const v=Math.sin(rad(b.lat-a.lat)/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(rad(b.lon-a.lon)/2)**2;return 6371*2*Math.asin(Math.sqrt(v));}
// A replaceable provider contract: no schedule, travel duration or connection is invented.
export class HeuristicTransportProvider{
 estimate(a,b){
  if(a.id===b.id)return {from:a.id,to:b.id,effort:0,buffer:0,label:'Kein Ortswechsel',options:'Lokale Anreise separat prüfen',verified:false};
  const km=distance(a,b);const same=a.cluster===b.cluster;
  const island=a.island||b.island||a.boatAccess||b.boatAccess;
  const crossCoast=(a.season==='gulf'&&b.season==='andaman')||(b.season==='gulf'&&a.season==='andaman');
  const effort=(km<170&&same?1:km<400&&!crossCoast?2:3)+(island?.5:0);
  return {from:a.id,to:b.id,effort,buffer:effort<=1?.5:1,label:effort<=1?'Geringer Planungsaufwand':effort<=2.5?'Mittlerer Planungsaufwand':'Hoher Planungsaufwand',options:island?'Land-/Boots- oder Flugoptionen prüfen':km>450?'Flug oder Fernverkehr prüfen':'Straßentransfer oder öffentlichen Verkehr prüfen',verified:false,source:'Geografische MVP-Heuristik',crossCoast};
 }
}
export const defaultTransport=new HeuristicTransportProvider();
export function seasonFor(d,date){
 const month=new Date(date+'T12:00:00Z').getUTCMonth()+1;
 if(d.season==='east'&&month>=5&&month<=10)return {score:45,note:'Trat-Inselgruppe: erhöhtes Regen- und Seegangsrisiko. Saisonale Bootsangebote, Zugänglichkeit und Rückfahrt vor Buchung prüfen.'};
 if(d.season==='andaman'&&month>=5&&month<=10)return {score:45,note:'Andamanenküste: erhöhte Regen- und Seegangsrisiken. Bootsausflüge und Zugänglichkeit vor Buchung prüfen.'};
 if(d.season==='gulf'&&[10,11,12].includes(month))return {score:45,note:'Golfinseln: saisonales Starkregen- und Seegangsrisiko. Bootsverbindungen und Meeraktivitäten prüfen.'};
 if(d.season==='north'&&[2,3,4].includes(month))return {score:month===2?65:40,note:'Nordthailand: mögliche Rauchbelastung und Hitze. Aktuelle Luftqualität vor Outdoor-Aktivitäten prüfen.'};
 if([3,4].includes(month))return {score:65,note:'Heiße Jahreszeit: Aktivitäten früh planen und Erholungspausen einbauen.'};
 if(month>=5&&month<=10)return {score:70,note:'Regenzeit möglich: flexible Outdoor-Tage und wetterunabhängige Alternativen einplanen.'};
 return {score:90,note:null};
}
const airportDestination=code=>airports.find(a=>a.code===code).destination;
const weight=(input,key)=>clamp(Number(input.priorities?.[key])||0,0,2);
function minimum(ids,i,input){
 // A final airport base is a deliberate overnight departure buffer.
 if(i===ids.length-1&&ids.length>1&&ids[i]===airportDestination(input.departure))return 1;
 return byId[ids[i]].min+(input.pace==='slow'?1:0);
}
export function allocate(ids,input,requestedDayTrips=[]){
 let nights=ids.map((_,i)=>minimum(ids,i,input));const excursions={};for(const id of requestedDayTrips){const index=ids.findIndex(base=>byId[id].dayTripFrom.includes(base));excursions[index]=(excursions[index]||0)+1;}for(const [index,count] of Object.entries(excursions))nights[index]=Math.max(nights[index],count+1);const available=input.days-1;
 if(nights.reduce((a,b)=>a+b,0)>available)return null;
 let spare=available-nights.reduce((a,b)=>a+b,0);
 while(spare-->0){let best=0;let bestValue=-Infinity;ids.forEach((id,i)=>{const d=byId[id];const affinity=interests.reduce((s,[key])=>s+(d.scores[key]||0)*weight(input,key),0);const endBuffer=i===ids.length-1&&ids.length>1&&id===airportDestination(input.departure);const value=(1+affinity*.25)/(nights[i]+1)-(endBuffer?2:0);if(value>bestValue){best=i;bestValue=value;}});nights[best]++;}
 return nights;
}
function makeSchedule(stops,input,requestedDayTrips=[]){
 const pending=[...requestedDayTrips];
 const days=[];const counts={};let day=0;const served=new Set();
 for(let i=0;i<stops.length;i++){
  const stop=stops[i],d=byId[stop.id];
  for(let n=0;n<stop.nights;n++){
   const arrival=n===0;const buffer=i===0&&arrival?.5:arrival?stop.inbound.buffer:0;
   const available=1-buffer;let activity=null;
   if(available>=.5){
    const keys=Object.keys(d.activities).sort((a,b)=>{
     const value=k=>weight(input,k)*1.5+(served.has(k)?0:input.variety/25)-(counts[d.id+':'+k]||0)*2+(d.scores[k]||0);
     return value(b)-value(a);
    });
    let key=keys[0];activity={interest:key,text:d.activities[key]};
    const excursionId=available===1?pending.find(id=>byId[id].dayTripFrom.includes(d.id)):null;
    if(excursionId){const excursion=byId[excursionId];key=Object.keys(excursion.activities).sort((a,b)=>(weight(input,b)*1.5+(served.has(b)?0:input.variety/25))-(weight(input,a)*1.5+(served.has(a)?0:input.variety/25)))[0];activity={interest:key,text:'Tagesausflug: '+excursion.name+' · '+excursion.activities[key],dayTripId:excursionId};pending.splice(pending.indexOf(excursionId),1);}
    served.add(key);counts[d.id+':'+key]=(counts[d.id+':'+key]||0)+1;
   }
   days.push({day:day+1,date:dateAt(input.start,day),destination:stop.id,buffer,activity,kind:i===0&&arrival?'Ankommen':buffer?'Transfer & Ankommen':'Entdecken'});day++;
  }
 }
 days.push({day:input.days,date:dateAt(input.start,input.days-1),destination:stops.at(-1).id,buffer:1,activity:null,kind:'Abreise · Tag freihalten'});
 return pending.length?null:days;
}
export function evaluate(ids,input,profile='balanced',provider=defaultTransport,requestedDayTrips=[]){
 const errors=validate(input);if(errors.length)throw new Error(errors.join(' '));
 if(!ids.length||ids.some(id=>!byId[id]||!byId[id].overnightAllowed))return null;
 if(input.maxOnly&&ids.some(id=>byId[id].visitedByMax!==true))return null;
 if(new Set(requestedDayTrips).size!==requestedDayTrips.length||requestedDayTrips.some(id=>!byId[id]?.dayTripFrom.length||!byId[id].dayTripFrom.some(base=>ids.includes(base))||ids.includes(id)||(input.maxOnly&&byId[id].visitedByMax!==true)))return null;
 if(ids[0]!==airportDestination(input.arrival)||ids.at(-1)!==airportDestination(input.departure))return null;
 if(ids.some((id,i)=>i&&id===ids[i-1]))return null;
 const nights=allocate(ids,input,requestedDayTrips);if(!nights)return null;
 let offset=0;const stops=ids.map((id,i)=>{const inbound=i?provider.estimate(byId[ids[i-1]],byId[id],{date:dateAt(input.start,offset),pace:input.pace,tolerance:input.tolerance}):null;const start=dateAt(input.start,offset);offset+=nights[i];const checks=Array.from({length:nights[i]},(_,n)=>seasonFor(byId[id],dateAt(start,n)));return {id,nights:nights[i],start,end:dateAt(input.start,offset),inbound,season:{score:Math.round(checks.reduce((s,c)=>s+c.score,0)/checks.length),notes:[...new Set(checks.map(c=>c.note).filter(Boolean))]}};});
 const legs=stops.slice(1).map(s=>s.inbound);const schedule=makeSchedule(stops,input,requestedDayTrips);if(!schedule)return null;const active=schedule.filter(d=>d.activity);const covered=new Set(active.map(d=>d.activity.interest));
 const totalWeight=interests.reduce((s,[k])=>s+weight(input,k),0);
 // Coverage measures scheduled experiences, so a transfer-only stop does not satisfy a preference.
 const coverage=totalWeight?100*interests.reduce((s,[k])=>s+weight(input,k)*(covered.has(k)?1:0),0)/totalWeight:100;
 const diversity=covered.size/interests.length*100;
 const dayTripTransfers=requestedDayTrips.map(id=>{const day=schedule.find(day=>day.activity?.dayTripId===id),base=byId[day.destination],trip=byId[id],context={date:day.date,pace:input.pace,tolerance:input.tolerance,dayTrip:true};return {id,from:base.id,date:day.date,outbound:provider.estimate(base,trip,context),inbound:provider.estimate(trip,base,context)};});
 const effort=legs.reduce((s,l)=>s+l.effort,0)+dayTripTransfers.reduce((s,t)=>s+t.outbound.effort+t.inbound.effort,0);const transferScore=clamp(100-effort/(input.days-1)*100);
 const quality=clamp(100-(legs.reduce((s,l)=>s+l.buffer,0)+1.5)/(input.days)*100-ids.filter((id,i)=>i<ids.length-1&&nights[i]<byId[id].min+1).length*3);
 const seasonal=stops.reduce((s,p)=>s+p.season.score*p.nights,0)/(input.days-1);
 const scores={coverage:Math.round(coverage),diversity:Math.round(diversity),transfer:Math.round(transferScore),quality:Math.round(quality),season:Math.round(seasonal)};
 const p=profiles[profile];const varietyWeight=.06+input.variety*.002;const travelWeight=p.transfer*({low:1.5,medium:1,high:.7}[input.tolerance]);
 const crowdPenalty=input.avoidCrowds?stops.reduce((s,p)=>s+Math.max(0,(byId[p.id].tourismLevel??3)-2)*p.nights,0)/(input.days-1)*2:0;
 const score=(coverage*.33+diversity*varietyWeight+transferScore*travelWeight+quality*p.quality+seasonal*.2)/(.33+varietyWeight+travelWeight+p.quality+.2)-crowdPenalty;
 const warnings=[...new Set(stops.flatMap(p=>p.season.notes))];
 if(legs.some(l=>l.crossCoast))warnings.push('Wechsel zwischen Andamanenküste und Golf: zusätzliche Umstiege und mögliche Wetterabhängigkeit prüfen.');
 if(legs.some(l=>l.effort>=3))warnings.push('Mindestens ein größerer Regionswechsel: Verbindung vor Buchung bestätigen; dafür bleibt ein ganzer Planungstag frei.');
 if(input.tolerance==='low'&&effort>3)warnings.push('Diese Route liegt über deiner niedrigen Transferbereitschaft. Eine Region oder einen Standort streichen.');
 if(legs.reduce((s,l)=>s+l.buffer,0)>input.days*.3)warnings.push('Ein großer Teil deiner Reise ist als Transferpuffer reserviert. Weniger Standorte würden mehr freie Zeit schaffen.');
 const clusters=ids.map(id=>byId[id].cluster);if(clusters.some((c,i)=>i>1&&clusters.slice(0,i-1).includes(c)&&clusters[i-1]!==c))warnings.push('Die Route kehrt in eine bereits besuchte Region zurück. Prüfe die Reihenfolge; ein Rückweg zum Abflughafen kann notwendig sein.');
 for(const id of requestedDayTrips){warnings.push(byId[id].name+': Tagesausflug ohne Unterkunftswechsel. Bootsverbindung, Wetter, Zugänglichkeit und bestätigte Rückfahrt prüfen.');}
 if(input.arrival!==input.departure&&['BKK','DMK'].includes(input.arrival)&&['BKK','DMK'].includes(input.departure))warnings.push('BKK und DMK sind unterschiedliche Flughäfen. Beide Stadttransfers separat planen; keine gemeinsame Anreiseroute voraussetzen.');
 if(stops.some(s=>s.id==='bangkok'&&Array.from({length:s.nights},(_,n)=>dateAt(s.start,n)).some(date=>date.endsWith('-12-31'))))warnings.push('Silvester in Bangkok: Hotel, Abendlocation, mögliche Sperren und Rückweg für das konkrete Jahr prüfen. Der Bangkok-Guide bietet eine Planungshilfe; keine Live-Veranstaltungsdaten.');
 if(input.avoidCrowds&&stops.some(s=>byId[s.id].tourismLevel==null))warnings.push('Bei mindestens einem Ziel ist die Tourismusintensität unbekannt. Sie wird nicht als ruhig bewertet.');
 if(totalWeight&&coverage<100)warnings.push('Nicht alle priorisierten Interessen passen in den verfügbaren Erlebniszeitraum. Die Abdeckung zeigt nur tatsächlich eingeplante Erlebnisse.');
 return {profile,ids,stops,legs,schedule,scores,score:Math.round(score),changes:ids.length-1,effort,bufferDays:legs.reduce((s,l)=>s+l.buffer,0),warnings,dayTripTransfers,requestedDayTrips:[...requestedDayTrips],crowdPenalty:Math.round(crowdPenalty*10)/10,airportAccess:{arrival:input.arrival,departure:input.departure},covered:[...covered],rulesVersion:RULES_VERSION};
}
function stopCap(input,profile){return Math.max(2,Math.min(profiles[profile].max+(input.pace==='fast'?1:input.pace==='slow'?-1:0),{low:3,medium:5,high:7}[input.tolerance]));}
export function generateRoutes(input,provider=defaultTransport){
 const errors=validate(input);if(errors.length)throw new Error(errors.join(' '));
 const start=airportDestination(input.arrival),end=airportDestination(input.departure);const output=[];
 for(const profile of Object.keys(profiles)){
  const cap=stopCap(input,profile);let beam=[[start]];const candidates=new Map();
  for(let depth=1;depth<=cap;depth++){
   const next=[];
   for(const path of beam){
    const complete=path.at(-1)===end?path:[...path,end];
    if(complete.length<=cap){const route=evaluate(complete,input,profile,provider);if(route)candidates.set(complete.join(','),route);}
    if(depth>=cap)continue;
    for(const d of destinations){if(!d.overnightAllowed||(input.maxOnly&&d.visitedByMax!==true)||path.includes(d.id)||d.id===end)continue;const expanded=[...path,d.id];const probe=evaluate([...expanded,end],input,profile,provider);if(probe)next.push({path:expanded,score:probe.score});}
   }
   beam=next.sort((a,b)=>b.score-a.score).slice(0,65).map(n=>n.path);
  }
  const ranked=[...candidates.values()].sort((a,b)=>b.score-a.score||a.effort-b.effort);
  // Prefer a distinct near-optimal alternative; never create extra moves solely to differ.
  const best=ranked[0];const distinct=best&&ranked.find(r=>r.score>=best.score-5&&!output.some(o=>o.ids.join(',')===r.ids.join(',')));
  if(best)output.push(distinct||best);
 }
 return output;
}
// Reorder only the chosen interior destinations. Keep both airport anchors and all chosen places.
export function optimizeOrder(ids,input,profile='balanced',provider=defaultTransport,requestedDayTrips=[]){
 const middle=ids.slice(1,-1);if(middle.length>7)return evaluate(ids,input,profile,provider,requestedDayTrips);
 let best=evaluate(ids,input,profile,provider,requestedDayTrips);
 function visit(prefix,rest){if(!rest.length){const r=evaluate([ids[0],...prefix,ids.at(-1)],input,profile,provider,requestedDayTrips);if(r&&(!best||r.score>best.score||(r.score===best.score&&r.effort<best.effort)))best=r;return;}rest.forEach((id,i)=>visit([...prefix,id],[...rest.slice(0,i),...rest.slice(i+1)]));}
 if(ids.length>2)visit([],middle);return best;
}
