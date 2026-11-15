import {interests,destinations,byId,airports} from './data.js';
import {createShareLink,readShareLink} from './share-plan.js';
import {initExplorer} from './explorer.js';
import {bangkokGuide} from './bangkok.js';
import {visitLabel} from './explorer-model.js';
import {loadMap,project,geometryPath} from './map-view.js';
import {generateRoutes,evaluate,optimizeOrder,profiles,dateAt,validate} from './engine.js';
const $=id=>document.getElementById(id);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels=Object.fromEntries(interests.map(([k,l])=>[k,l]));
const icons=Object.fromEntries(interests.map(([k,,i])=>[k,i]));
const defaults={start:'2027-01-15',days:15,arrival:'BKK',departure:'HKT',variety:65,pace:'normal',tolerance:'medium',maxOnly:false,avoidCrowds:false,priorities:{beach:2,jungle:1,snorkel:1,culture:1,food:1,nightlife:0,hiking:0,wellness:0}};
defaults.priorities={...Object.fromEntries(interests.map(([k])=>[k,0])),...defaults.priorities};
const STORAGE='sabai-plan-v1';
let draft=structuredClone(defaults),planned=null,routes=[],selected='balanced',view='stays',history=[],dialogIndex=null,mapData=null,mapZoom=1;
try{const saved=JSON.parse(localStorage.getItem(STORAGE));if(saved&&validate(saved.input).length===0){draft={...defaults,...saved.input,priorities:{...defaults.priorities,...saved.input.priorities}};selected=profiles[saved.selected]?saved.selected:'balanced';planned=saved;}}catch{/* Local storage may be unavailable or contain an older plan. */}
const fmt=(date,year=false)=>new Intl.DateTimeFormat('de-DE',{day:'numeric',month:'short',...(year?{year:'numeric'}:{}),timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').hidden=true,4500);}
function formError(message){$('form-error').textContent=message;$('form-error').hidden=!message;}
function save(){try{localStorage.setItem(STORAGE,JSON.stringify({input:planned,selected,routes:routes.map(r=>({profile:r.profile,ids:r.ids,dayTrips:r.requestedDayTrips||[]}))}));}catch{toast('Speichern im Browser ist nicht verfügbar. Bitte exportiere deinen Plan.');}}
function renderPreferences(){
 $('interests').innerHTML=interests.map(([key,label,icon])=>`<div class="interest-row"><span class="interest-name" id="interest-${key}"><span class="interest-icon" aria-hidden="true">${icon}</span>${label}</span><div class="priority-group" role="group" aria-labelledby="interest-${key}">${['Egal','Gerne','Wichtig'].map((name,p)=>`<button type="button" data-interest="${key}" data-priority="${p}" class="${draft.priorities[key]===p?'active':''}" aria-pressed="${draft.priorities[key]===p}" aria-label="${label}: ${name}">${name}</button>`).join('')}</div></div>`).join('');
}
function populate(){
 for(const id of ['arrival','departure']){$(id).innerHTML=airports.map(a=>`<option value="${a.code}">${a.name}</option>`).join('');}
 for(const key of ['start','days','arrival','departure','variety','pace','tolerance'])$(key).value=draft[key];
 $('max-only').checked=!!draft.maxOnly;$('avoid-crowds').checked=!!draft.avoidCrowds;renderPreferences();updateRange();dateSummary();
}
function readDraft(){for(const key of ['start','arrival','departure','pace','tolerance'])draft[key]=$(key).value;draft.days=Number($('days').value);draft.variety=Number($('variety').value);draft.maxOnly=$('max-only').checked;draft.avoidCrowds=$('avoid-crowds').checked;}
function dirty(){readDraft();const changed=JSON.stringify(draft)!==JSON.stringify(planned);$('status').textContent=changed?'Eingaben geändert · neu planen':'Für dich geplant';}
function dateSummary(){if(/^\d{4}-\d{2}-\d{2}$/.test($('start').value)&&Number($('days').value)>=4&&Number($('days').value)<=60){try{$('date-summary').textContent=`Bis ${fmt(dateAt($('start').value,Number($('days').value)-1),true)} · ${Number($('days').value)-1} Nächte vor Ort`;}catch{$('date-summary').textContent='';}}else $('date-summary').textContent='4–60 Tage · Ankunft und Abreise zählen mit';}
function updateRange(){const v=Number($('variety').value);$('variety-output').textContent=v<34?'Vertraut':v<75?'Vielseitig':'Entdeckergeist';$('variety').style.background=`linear-gradient(to right,var(--green) ${v}%,#e6eadf ${v}%)`;}
function current(){return routes.find(r=>r.profile===selected)||routes[0];}
function generate(restore=null){
 readDraft();const errors=validate(draft);if(errors.length){formError(errors.join(' '));return;}
 formError('');const button=document.querySelector('.generate');button.disabled=true;button.firstElementChild.textContent='Deine Routen entstehen …';
 // Yield once so the interface can show that planning is in progress.
 setTimeout(()=>{try{
  const next=generateRoutes(draft);if(!next.length){formError('Für diese Dauer passen die Flughafenorte und Mindestaufenthalte nicht zusammen. Verlängere die Reise oder wähle einen anderen Abflughafen.');return;}
  planned=structuredClone(draft);routes=next;history=[];
  if(restore?.routes)for(const stored of restore.routes){try{if(profiles[stored.profile]&&Array.isArray(stored.ids)&&stored.ids.length<=8){const route=evaluate(stored.ids,planned,stored.profile,undefined,stored.dayTrips||[]);if(route){const idx=routes.findIndex(r=>r.profile===route.profile);if(idx>=0)routes[idx]=route;}}}catch{/* Ignore invalid saved routes. */}}
  if(!routes.some(r=>r.profile===selected))selected=routes[0].profile;
  render();save();$('status').textContent='Für dich geplant';
 }catch{formError('Die Planung konnte nicht erstellt werden. Bitte prüfe deine Eingaben.');}finally{button.disabled=false;button.firstElementChild.textContent='Meine Routen finden';}},20);
}
function renderOptions(){
 $('route-options').innerHTML=routes.map(r=>`<button class="route-option" id="tab-${r.profile}" role="tab" aria-controls="route-detail" aria-selected="${selected===r.profile}" tabindex="${selected===r.profile?0:-1}" data-route="${r.profile}"><div class="option-head"><span class="option-icon" aria-hidden="true">${{relaxed:'♧',balanced:'✳',adventure:'↗'}[r.profile]}</span><span class="option-check">${selected===r.profile?'✓':''}</span></div><h3>${profiles[r.profile].name}</h3><p>${profiles[r.profile].subtitle}</p><div class="option-meta"><span>${r.stops.length} Aufenthalte</span><span>· ${r.score}/100 Passung</span></div></button>`).join('');
 $('route-detail').setAttribute('role','tabpanel');$('route-detail').setAttribute('aria-labelledby','tab-'+current().profile);
}
function renderSummary(r){const count=r.covered.filter(k=>(planned.priorities[k]||0)>0).length;const desired=interests.filter(([k])=>planned.priorities[k]>0).length;
 $('summary').innerHTML=`<div class="stat"><strong>${planned.days}<small>Tage</small></strong><span>${planned.days-1} Nächte vor Ort</span></div><div class="stat"><strong>${r.changes}</strong><span>Unterkunftswechsel</span></div><div class="stat"><strong>${r.bufferDays.toLocaleString('de-DE')}<small>Tage</small></strong><span>Transferpuffer · Annahme${r.requestedDayTrips.length?' · '+r.requestedDayTrips.length+' Ausflugstage separat':''}</span></div><div class="stat"><strong>${desired?`${count}<small>/ ${desired}</small>`:'Offen'}</strong><span>${desired?'Wunschinteressen eingeplant':'Für neue Erlebnisse'}</span></div>`;
 $('map-title').textContent=`${profiles[r.profile].name} · ${fmt(planned.start)} – ${fmt(dateAt(planned.start,planned.days-1))}`;
}
function renderItinerary(){
 const r=current();if(!r)return;
 $('stays-view').classList.toggle('active',view==='stays');$('days-view').classList.toggle('active',view==='days');$('stays-view').setAttribute('aria-pressed',view==='stays');$('days-view').setAttribute('aria-pressed',view==='days');
 $('itinerary-title').textContent=view==='stays'?'Deine Reise, Ort für Ort.':'Jeder Tag hat seinen Rhythmus.';
 if(view==='days'){
  $('itinerary-list').innerHTML=r.schedule.map(d=>`<article class="day-row"><div class="day-label">TAG<strong>${d.day.toString().padStart(2,'0')}</strong></div><div><h3>${fmt(d.date)} · ${byId[d.destination].name}</h3><p>${d.activity?escape(d.activity.text):d.kind==='Abreise · Tag freihalten'?'Abreise organisieren; genug Zeit für den Flughafen reservieren.':'Für den Ortswechsel und das Ankommen reserviert.'}</p>${d.buffer?`<p>${d.buffer.toLocaleString('de-DE')} Tag Planungspuffer · keine bestätigte Reisezeit</p>`:''}</div><span class="day-kind">${d.kind}</span></article>`).join('');
 }else{
  $('itinerary-list').innerHTML=r.stops.map((s,i)=>{const d=byId[s.id],anchor=i===0||i===r.stops.length-1;
   const activities=[...new Set(r.schedule.filter(day=>day.destination===s.id&&day.date>=s.start&&day.date<s.end&&day.activity).map(day=>day.activity.interest))];
   const transfer=i?`<div class="transfer-line"><span>↳</span><strong>${s.inbound.label}</strong><span>· ${s.inbound.buffer.toLocaleString('de-DE')} Tag Puffer</span><span title="Unbestätigte Transportoption">· ${s.inbound.options}</span></div>`:'';
   return `${transfer}<article class="stop-card" id="stop-${i}"><span class="stop-number">${i+1}</span><div><div class="stop-heading"><h3>${d.name}</h3><span class="nights">${s.nights} ${s.nights===1?'Nacht':'Nächte'}</span></div><div class="stop-dates">${fmt(s.start)} – ${fmt(s.end)} · ${d.cluster}${i===0?' · Ankunft '+planned.arrival:''}${i===r.stops.length-1?' · Abflug '+planned.departure:''}</div><p class="stop-tag">${d.tag}</p><div class="stop-guide-link"><span class="visit-badge ${d.visitedByMax===true?'visited':'unknown'}">${visitLabel(d)}</span><button class="text-button" data-open-destination="${d.id}">Guide öffnen ↗</button></div><div class="interest-tags">${activities.length?activities.map(k=>`<span class="interest-tag ${planned.priorities[k]===2?'important':''}" title="Im Tagesplan enthalten">${icons[k]} ${labels[k]}</span>`).join(''):'<span class="interest-tag">Ankommen & Abreisepuffer</span>'}</div>${s.season.score<70?'<p class="stop-season">△ Saisonhinweise beachten</p>':''}</div><div class="stop-controls">${anchor?`<span class="anchor-label">${i===0?'Ankunft':'Abflug'} ⌁</span>`:`<button data-action="up" data-index="${i}" aria-label="${d.name} nach oben verschieben" ${i<=1?'disabled':''}>↑</button><button data-action="down" data-index="${i}" aria-label="${d.name} nach unten verschieben" ${i>=r.stops.length-2?'disabled':''}>↓</button><button data-action="replace" data-index="${i}" aria-label="${d.name} austauschen" title="Ort austauschen">⇄</button><button data-action="remove" data-index="${i}" aria-label="${d.name} entfernen" title="Ort entfernen">×</button>`}</div></article>`;
  }).join('');
 }
 const excursions=r.schedule.filter(day=>day.activity?.dayTripId);if(excursions.length)$('itinerary-list').innerHTML+=`<div class="excursion-list"><h3>Deine Tagesausflüge · ohne Unterkunftswechsel</h3>${excursions.map(day=>`<article><div><strong>${byId[day.activity.dayTripId].name}</strong><p>${fmt(day.date)} · ab ${byId[day.destination].name} · ${visitLabel(byId[day.activity.dayTripId])}</p></div><button class="text-button" data-remove-excursion="${day.activity.dayTripId}">Ausflug entfernen ×</button></article>`).join('')}</div>`;
 $('undo').hidden=!history.length;$('optimize').disabled=r.ids.length<4;$('add-place').disabled=r.ids.length>=8;
}
function renderScores(r){
 const names={diversity:'Erlebnisvielfalt',coverage:'Interessenabdeckung',transfer:'Transferkomfort',quality:'Aufenthaltsqualität',season:'Saisonale Eignung'};
 $('scores').innerHTML=`<div class="score-grid">${Object.entries(names).map(([key,name])=>`<div class="score-item"><strong>${r.scores[key]}<small> /100</small></strong><span>${name}</span><div class="score-bar" role="meter" aria-label="${name}" aria-valuenow="${r.scores[key]}" aria-valuemin="0" aria-valuemax="100"><i style="width:${r.scores[key]}%"></i></div></div>`).join('')}</div>`;
 const weight=profiles[r.profile].transfer*({low:1.5,medium:1,high:.7}[planned.tolerance]);const raw={coverage:.33,diversity:.06+planned.variety*.002,transfer:weight,quality:profiles[r.profile].quality,season:.2};const sum=Object.values(raw).reduce((a,b)=>a+b,0);
 $('reasoning').innerHTML=`<p>Gesamtpassung <strong>${r.score}/100</strong> · Modellversion ${r.rulesVersion}. Richtwerte, keine objektive Reisebewertung.</p><ul><li>Gewichtung: ${Object.entries(names).map(([k,name])=>`${name} ${Math.round(raw[k]/sum*100)} %`).join(' · ')}. Rundungsdifferenzen sind möglich.</li><li>Vielfalt: ${r.covered.length} von ${interests.length} unterschiedlichen Erlebnisarten tatsächlich eingeplant. Mehr Standorte geben keinen eigenen Bonus.</li><li>Interessen: gewichteter Anteil deiner Wünsche im Tagesplan (Gerne = 1, Wichtig = 2, Egal = 0). Ohne Prioritäten ist die Abdeckung neutral bei 100.</li><li>Transferkomfort: geografisch geschätzter Aufwand relativ zur Dauer. Nähe, Regionswechsel und Inseln bestimmen Aufwand und Puffer. Hin- und Rückwege der Tagesausflüge fließen in den Aufwand ein; die Ausflugstage sind zusätzlich im Tagesplan reserviert. Keine bestätigten Fahrzeiten.</li><li>Aufenthaltsqualität: verbleibende Zeit nach Puffern und Abstand zu Mindestaufenthalten. Ankunft erhält einen halben Tag, Abreise einen ganzen Tag.</li><li>Saison: nach Aufenthaltsnächten gewichtete Monatsregeln, einschließlich Monatswechseln. Keine Wetterprognose und keine Aussage über aktuelle Öffnungen.</li><li>Die Suche vergleicht bis zu 65 vielversprechende Teilrouten je Suchstufe. Alternativen dürfen bei kurzen Reisen identisch sein; eine mathematisch globale Bestlösung wird nicht garantiert.</li></ul><p>Erfüllte Interessen sind konkrete Vorschläge im Tagesplan. Weitere Möglichkeiten pro Ort findest du beim Hinzufügen oder Austauschen. Saisonale oder verkehrsbedingte Einschränkungen können die Umsetzung verändern.</p>`;
 $('logistics').innerHTML=`<h3><span>ⓘ</span> Gut zu wissen, bevor du buchst</h3><p>Transferpuffer sind bewusst reservierte Reisezeit, keine Fahrtdauer. Es liegen keine verifizierten Verkehrs- oder Live-Wetterdaten vor. Verkehrsmittel, Abfahrten, Anschlusszeiten und Zugänglichkeit bitte vor Buchung prüfen. Meeraktivitäten bleiben wetterabhängig.</p>${planned.avoidCrowds?`<p>Ruhigere Ziele bevorzugt: redaktionelle Tourismuswerte beeinflussen die Gesamtpassung um bis zu 6 Punkte (hier: ${r.crowdPenalty} Punkte Abzug). Unbekannte Einstufungen gelten nicht als ruhige Ziele.</p>`:''}${r.warnings.length?`<ul>${r.warnings.map(w=>`<li>${escape(w)}</li>`).join('')}</ul>`:'<p>Das Regelmodell erkennt derzeit keine zusätzlichen logistischen Schwachstellen.</p>'}`;
}
function renderAirportAdvice(r){
 const selectedCodes=[...new Set([planned.arrival,planned.departure])];
 $('airport-advice').innerHTML=selectedCodes.some(code=>['BKK','DMK'].includes(code))?`<h3>Dein Flughafen in Bangkok</h3>${selectedCodes.filter(code=>['BKK','DMK'].includes(code)).map(code=>{const a=bangkokGuide.airportConnections.find(a=>a.code===code);return `<article><strong>${a.code} · ${a.name}</strong><p>${a.summary} ${a.caveat}</p></article>`;}).join('')}<button class="text-button" data-open-destination="bangkok">Hotel-, Transport- & Silvesterguide öffnen ↗</button>`:'';
 $('airport-advice').hidden=!$('airport-advice').textContent;
}
function render(){const r=current();if(!r)return;renderOptions();renderSummary(r);renderItinerary();renderScores(r);renderAirportAdvice(r);renderMap();}
function replaceCurrent(route,message){if(!route){toast('Dafür reicht die Reisezeit mit den Mindestaufenthalten nicht aus. Wähle weniger Orte oder plane mehr Tage ein.');return false;}history.push(structuredClone(current()));routes[routes.findIndex(r=>r.profile===selected)]=route;render();save();toast(message);return true;}
function editAction(action,index){const r=current(),ids=[...r.ids];if(index<=0||index>=ids.length-1)return;
 if(action==='replace'){openPlace(index);return;}
 if(action==='remove'){ids.splice(index,1);const normalized=ids.filter((id,i)=>!i||id!==ids[i-1]);replaceCurrent(optimizeOrder(normalized,planned,selected,undefined,r.requestedDayTrips),'Ort entfernt. Nächte und Route neu optimiert.');return;}
 const target=action==='up'?index-1:index+1;if(target<=0||target>=ids.length-1)return;[ids[index],ids[target]]=[ids[target],ids[index]];replaceCurrent(evaluate(ids,planned,selected,undefined,r.requestedDayTrips),'Reihenfolge übernommen und Route neu bewertet.');
}
function openPlace(index=null){if(!current())return;dialogIndex=index;const used=new Set(current().ids);const options=destinations.filter(d=>d.overnightAllowed&&!used.has(d.id)&&(!planned.maxOnly||d.visitedByMax===true));$('dialog-title').textContent=index===null?'Ein neuer Lieblingsort?':'Ein anderer Lieblingsort?';$('dialog-description').textContent='Nächte und Reihenfolge werden automatisch optimiert. Deine Flughäfen bleiben fest.';$('place-select').innerHTML=options.map(d=>`<option value="${d.id}">${d.name} · ${d.cluster}</option>`).join('');$('dialog-error').hidden=true;previewPlace();$('place-dialog').showModal();}
function previewPlace(){const d=byId[$('place-select').value];if(!d)return;$('place-preview').innerHTML=`<strong>${d.tag}</strong><div class="interest-tags">${Object.keys(d.activities).map(k=>`<span class="interest-tag">${icons[k]} ${labels[k]}</span>`).join('')}</div><p>Mindestens ${d.min+(planned.pace==='slow'?1:0)} Nächte · Diese Interessen sind hier möglich; der Tagesplan zeigt, was wirklich eingeplant wird.</p>`;}
function commitPlace(){const r=current(),ids=[...r.ids],id=$('place-select').value;if(!id)return;if(dialogIndex===null){if(ids.length===1)ids.push(id,ids[0]);else ids.splice(ids.length-1,0,id);}else ids[dialogIndex]=id;
 const next=optimizeOrder(ids,planned,selected,undefined,r.requestedDayTrips);if(!next){$('dialog-error').textContent='Dieser Ort passt mit den Mindestaufenthalten nicht in deine Reise. Entferne zuerst einen anderen Ort oder verlängere deine Reise.';$('dialog-error').hidden=false;return;}
 replaceCurrent(next,'Route angepasst, Nächte verteilt und Reihenfolge optimiert.');$('place-dialog').close();}
function renderMap(){const r=current();if(!r)return;
 let paths='';if(mapData)paths=mapData.features.map(f=>`<path class="country ${f.properties.name==='Thailand'?'thailand':''}" d="${geometryPath(f.geometry)}"/>`).join('');
 const coords=r.ids.map(id=>project([byId[id].lon,byId[id].lat]));
 const unique=[...new Set(r.ids)];
 let marks=unique.map(id=>{const indexes=r.ids.flatMap((v,i)=>v===id?[i]:[]),d=byId[id],[x,y]=project([d.lon,d.lat]);const numbers=indexes.map(i=>i+1).join('/');const offset=id==='phuket'?[-18,22,'end']:id==='khaosok'?[-18,-10,'end']:id==='krabi'?[18,6,'start']:id==='samui'?[18,12,'start']:id==='phangan'?[18,-12,'start']:id==='kohtao'?[-18,-7,'end']:[18,-9,'start'];return `<g class="stop-marker ${d.visitedByMax===true?'visited':'unknown'}" role="button" tabindex="0" data-stop="${indexes[0]}" aria-label="${d.name}, ${visitLabel(d)}, Aufenthalt ${numbers}, Aufenthalt anzeigen"><title>${d.name} · ${visitLabel(d)} · Aufenthalt ${numbers}</title><circle cx="${x}" cy="${y}" r="${numbers.length>1?16:12}"/><text class="marker-number" x="${x}" y="${y}">${numbers}</text><text class="marker-label" x="${x+offset[0]}" y="${y+offset[1]}" text-anchor="${offset[2]}">${d.name}</text></g>`;}).join('');
 const excursionMarks=(r.dayTripTransfers||[]).map(t=>{const d=byId[t.id],a=project([byId[t.from].lon,byId[t.from].lat]),p=project([d.lon,d.lat]);return `<path class="excursion-map-line" d="M${a[0]} ${a[1]}L${p[0]} ${p[1]}"/><g class="daytrip-marker" role="button" tabindex="0" data-open-destination="${d.id}" aria-label="Tagesausflug ${d.name}, ${visitLabel(d)}, Details öffnen"><title>Tagesausflug: ${d.name} · ${visitLabel(d)}</title><path d="M${p[0]} ${p[1]-7}l7 7-7 7-7-7Z"/><text class="marker-label" x="${p[0]-13}" y="${p[1]-12}" text-anchor="end">${d.name} · Ausflug</text></g>`;}).join('');
 $('route-map').innerHTML=`<defs><clipPath id="map-clip"><rect x="0" y="0" width="720" height="510"/></clipPath></defs><g clip-path="url(#map-clip)"><g transform="translate(${360*(1-mapZoom)} ${255*(1-mapZoom)}) scale(${mapZoom})">${[96,99,102,105].map(lon=>{const x=project([lon,0])[0];return `<path class="map-grid" d="M${x} 0V510"/>`;}).join('')}${[6,10,14,18].map(lat=>{const y=project([0,lat])[1];return `<path class="map-grid" d="M0 ${y}H720"/>`;}).join('')}${paths}<text class="country-label" x="127" y="122">MYANMAR</text><text class="country-label" x="525" y="121">LAOS</text><text class="country-label" x="590" y="345">KAMBODSCHA</text><text class="country-label thai" x="407" y="216">THAILAND</text><text class="sea-label" x="92" y="342">Andamanensee</text><text class="sea-label" x="420" y="415">Golf von Thailand</text><path class="route-line" d="${coords.map(([x,y],i)=>`${i?'L':'M'}${x} ${y}`).join(' ')}"/>${marks}${excursionMarks}</g></g>`;
}
function highlightStop(index){view='stays';renderItinerary();const el=$('stop-'+index);if(el){el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});el.classList.add('highlight');setTimeout(()=>el.classList.remove('highlight'),2000);}}
function download(){const r=current();const text=`SABAI · DEIN THAILAND\n${profiles[r.profile].name} · ${planned.days} Tage / ${planned.days-1} Nächte\n${planned.start} bis ${dateAt(planned.start,planned.days-1)}\nAnkunft ${planned.arrival} · Abflug ${planned.departure}\n\nINTERESSEN\n${interests.map(([k,l])=>`${l}: ${['Egal','Gerne','Wichtig'][planned.priorities[k]]}`).join('\n')}\n\nROUTE\n${r.stops.map((s,i)=>`${i+1}. ${byId[s.id].name} · ${s.nights} Nächte · ${s.start} bis ${s.end}${s.inbound?'\nTransfer: '+s.inbound.label+' · '+s.inbound.buffer+' Tag Planungspuffer (keine Fahrzeit). '+s.inbound.options:''}`).join('\n\n')}\n\nTAGESPLAN\n${r.schedule.map(d=>`Tag ${d.day} · ${d.date} · ${byId[d.destination].name}: ${d.kind}. ${d.activity?.text||'Tag freihalten.'}`).join('\n')}\n\nBEWERTUNG (0–100, Modell ${r.rulesVersion})\n${Object.entries(r.scores).map(([k,v])=>`${k}: ${v}`).join('\n')}\n\nHINWEISE\nKeine verifizierten Verkehrsdaten. Alle Transferpuffer und Verkehrsmittel sind Planungsannahmen. Aktuelle Verbindungen, Wetter und Zugänglichkeit vor Buchung prüfen. Aktivitäten sind unverbindliche Vorschläge.\n${r.warnings.join('\n')}\n\nFLUGHAFENHINWEISE\n${bangkokGuide.airportConnections.filter(a=>[planned.arrival,planned.departure].includes(a.code)).map(a=>a.code+': '+a.summary+' '+a.caveat).join('\n')}`;
 const blob=new Blob([text],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='sabai-thailand-reiseplan.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Dein Reiseplan wurde als Textdatei exportiert.');}
$('planner-form').addEventListener('submit',e=>{e.preventDefault();generate();});
$('planner-form').addEventListener('input',()=>{updateRange();dateSummary();dirty();});
$('planner-form').addEventListener('change',()=>{dateSummary();dirty();});
$('interests').addEventListener('click',e=>{const b=e.target.closest('[data-interest]');if(!b)return;draft.priorities[b.dataset.interest]=Number(b.dataset.priority);renderPreferences();dirty();});
$('all-interests').addEventListener('click',()=>{interests.forEach(([k])=>draft.priorities[k]=1);renderPreferences();dirty();});
$('route-options').addEventListener('click',e=>{const b=e.target.closest('[data-route]');if(!b)return;selected=b.dataset.route;history=[];render();save();});
$('route-options').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const idx=routes.findIndex(r=>r.profile===selected);const n=e.key==='Home'?0:e.key==='End'?routes.length-1:(idx+(e.key==='ArrowRight'?1:-1)+routes.length)%routes.length;selected=routes[n].profile;history=[];render();save();$('tab-'+selected).focus();});
$('itinerary-list').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b&&!b.disabled)editAction(b.dataset.action,Number(b.dataset.index));});
$('stays-view').addEventListener('click',()=>{view='stays';renderItinerary();});$('days-view').addEventListener('click',()=>{view='days';renderItinerary();});
$('add-place').addEventListener('click',()=>openPlace());$('place-select').addEventListener('change',previewPlace);$('confirm-place').addEventListener('click',commitPlace);
$('optimize').addEventListener('click',()=>{const before=current(),after=optimizeOrder(before.ids,planned,selected,undefined,before.requestedDayTrips);if(after.ids.join(',')===before.ids.join(',')){toast('Diese Reihenfolge ist nach unseren Regeln bereits die günstigste.');return;}replaceCurrent(after,'Reihenfolge optimiert und Route neu bewertet.');});
$('undo').addEventListener('click',()=>{const previous=history.pop();if(previous){routes[routes.findIndex(r=>r.profile===selected)]=previous;render();save();toast('Letzte Routenänderung zurückgenommen.');}});
$('download').addEventListener('click',download);$('how-button').addEventListener('click',()=>$('how-dialog').showModal());
$('reset-plan').addEventListener('click',()=>{try{localStorage.removeItem(STORAGE);}catch{}draft=structuredClone(defaults);populate();$('how-dialog').close();generate();toast('Planung auf die Ausgangswerte zurückgesetzt.');});
$('map-plus').addEventListener('click',()=>{mapZoom=Math.min(1.8,mapZoom+.2);renderMap();});$('map-minus').addEventListener('click',()=>{mapZoom=Math.max(.8,mapZoom-.2);renderMap();});$('map-reset').addEventListener('click',()=>{mapZoom=1;renderMap();});
$('route-map').addEventListener('click',e=>{const g=e.target.closest('[data-stop]');if(g)highlightStop(Number(g.dataset.stop));});$('route-map').addEventListener('keydown',e=>{const detail=e.target.closest('[data-open-destination]');if(detail&&['Enter',' '].includes(e.key)){e.preventDefault();detail.dispatchEvent(new MouseEvent('click',{bubbles:true}));return;}const g=e.target.closest('[data-stop]');if(g&&['Enter',' '].includes(e.key)){e.preventDefault();highlightStop(Number(g.dataset.stop));}});
populate();const restore=planned;planned=null;generate(restore);
loadMap().then(data=>{mapData=data;renderMap();}).catch(()=>{toast('Kartenumrisse sind gerade nicht verfügbar. Die Route bleibt anhand der Koordinaten sichtbar.');});

function addExplorerDestination(id,{asDayTrip=false}={}){
 const r=current(),d=byId[id];if(!r||!planned){toast('Die erste Routenplanung läuft noch. Bitte kurz warten.');return false;}
 if(!d)return false;
 if(planned.maxOnly&&d.visitedByMax!==true){toast('Dieses Ziel hat keinen bestätigten Max-Besuchsstatus. Passe bei Bedarf den Max-Filter im Trip Planner an.');return false;}
 let ids=[...r.ids],requests=[...(r.requestedDayTrips||[])],addedBase=false;
 if(asDayTrip||!d.overnightAllowed){
  if(!d.dayTripFrom.length){toast('Für dieses Ziel ist noch keine Tagesausflugsbasis hinterlegt.');return false;}
  if(requests.includes(id)||ids.includes(id)){toast('Dieses Ziel ist bereits in deiner Route enthalten.');return false;}
  if(!d.dayTripFrom.some(base=>ids.includes(base))){const base=d.dayTripFrom[0];if(planned.maxOnly&&byId[base].visitedByMax!==true){toast('Der Ausflug benötigt Krabi als Basis. Dessen Besuchsstatus ist unbekannt; mit dem aktiven Max-Filter passt diese Ergänzung nicht.');return false;}if(ids.length===1)ids.push(base,ids[0]);else ids.splice(ids.length-1,0,base);addedBase=true;}
  requests.push(id);
 }else{
  if(ids.includes(id)||requests.includes(id)){toast('Dieses Ziel ist bereits in deiner Route enthalten.');return false;}
  if(ids.length===1)ids.push(id,ids[0]);else ids.splice(ids.length-1,0,id);
 }
 if(ids.length>8){toast('Für eine übersichtliche Route sind höchstens acht Aufenthalte möglich. Entferne zuerst einen anderen Ort.');return false;}
 const next=optimizeOrder(ids,planned,selected,undefined,requests);
 return replaceCurrent(next,asDayTrip||!d.overnightAllowed?`${d.name} als Tagesausflug eingeplant.${addedBase?' Krabi wurde als notwendige Übernachtungsbasis ergänzt.':' Kein zusätzlicher Unterkunftswechsel.'}`:`${d.name} ergänzt. Route und Nächte neu optimiert.`);
}
$('itinerary-list').addEventListener('click',e=>{const button=e.target.closest('[data-remove-excursion]');if(!button)return;const r=current();replaceCurrent(evaluate(r.ids,planned,selected,undefined,r.requestedDayTrips.filter(id=>id!==button.dataset.removeExcursion)),'Tagesausflug entfernt. Der Tag ist für andere Erlebnisse verfügbar.');});
const explorerUI=initExplorer({addToTrip:addExplorerDestination,toast});

let pendingShared=null;
function inspectSharedHash(){
 try{
  pendingShared=readShareLink(globalThis.location?.hash||'');$('shared-plan-banner').hidden=!pendingShared;
  if(pendingShared){const route=pendingShared.routes.find(r=>r.profile===pendingShared.selected);$('shared-plan-summary').textContent=`${pendingShared.input.days} Tage ab ${pendingShared.input.start} · ${pendingShared.input.arrival} → ${pendingShared.input.departure} · ${route.ids.map(id=>byId[id].name).join(' → ')}. ${pendingShared.routes.length} Routenalternativen enthalten.`;explorerUI.showView('planner',false);}
 }catch(error){pendingShared=null;$('shared-plan-banner').hidden=true;toast(error.message);}
}
$('share-plan').addEventListener('click',()=>{
 if(!current()||!planned){toast('Bitte zuerst eine Route planen.');return;}
 try{const link=createShareLink({input:planned,selected,routes},globalThis.location?.href);$('share-url').value=link;$('share-dialog').showModal();}catch(error){toast(error.message);}
});
$('copy-share-url').addEventListener('click',async()=>{
 try{if(!globalThis.navigator?.clipboard?.writeText)throw new Error('clipboard');await navigator.clipboard.writeText($('share-url').value);toast('Reiseplan-Link kopiert.');}
 catch{$('share-url').focus();$('share-url').select();toast('Bitte den markierten Link manuell kopieren.');}
});
$('import-shared-plan').addEventListener('click',()=>{
 if(!pendingShared)return;
 // Back up the previous app snapshot without adding anything to the public URL.
 try{const previous=localStorage.getItem(STORAGE);if(previous)localStorage.setItem('sabai-plan-before-share-v1',previous);}catch{toast('Lokale Sicherung ist nicht verfügbar. Dein bisheriger Plan kann weiterhin exportiert werden.');return;}
 const shared=pendingShared;
 draft={...structuredClone(defaults),...shared.input,priorities:{...defaults.priorities,...shared.input.priorities}};selected=shared.selected;populate();
 generate(shared);pendingShared=null;$('shared-plan-banner').hidden=true;explorerUI.showView('planner');
 toast('Geteilten Reiseplan übernommen. Dein vorheriger Browserplan wurde lokal gesichert.');
});
$('dismiss-shared-plan').addEventListener('click',()=>{pendingShared=null;$('shared-plan-banner').hidden=true;explorerUI.showView('planner');});
globalThis.addEventListener?.('hashchange',inspectSharedHash);globalThis.addEventListener?.('popstate',inspectSharedHash);
inspectSharedHash();
