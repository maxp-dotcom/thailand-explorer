export const project=([lon,lat])=>[(lon-93)*51,(22-lat)*30];
export function geometryPath(geometry){const polygons=geometry.type==='MultiPolygon'?geometry.coordinates:[geometry.coordinates];return polygons.map(p=>p.map(ring=>ring.filter((_,i)=>i%3===0).map((point,i)=>`${i?'L':'M'}${project(point).map(v=>v.toFixed(1)).join(',')}`).join('')+'Z').join('')).join('');}
let mapRequest;
export function loadMap(){return mapRequest??=fetch(new URL('./map.json',import.meta.url)).then(r=>{if(!r.ok)throw new Error('map');return r.json();});}
export function baseMap(data){return (data?.features||[]).map(f=>`<path class="country ${f.properties.name==='Thailand'?'thailand':''}" d="${geometryPath(f.geometry)}"/>`).join('');}
