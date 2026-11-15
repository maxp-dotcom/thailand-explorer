import {destinations} from './data.js';
export const emptyFilters=()=>({query:'',visited:'all',tourismMin:1,tourismMax:5,categories:[],categoryMode:'any',region:'all',sort:'name'});
const normalize=s=>String(s).normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase('de');
export function filterDestinations(filters,list=destinations){
 const f={...emptyFilters(),...filters};const query=normalize(f.query.trim());
 return list.filter(d=>{
  if(f.visited==='visited'&&d.visitedByMax!==true)return false;
  if(f.visited==='not-visited'&&d.visitedByMax!==false)return false;
  if(f.visited==='unknown'&&d.visitedByMax!=null)return false;
  if(d.tourismLevel==null){if(f.tourismMin!==1||f.tourismMax!==5)return false;}else if(d.tourismLevel<f.tourismMin||d.tourismLevel>f.tourismMax)return false;
  if(f.region!=='all'&&d.region!==f.region)return false;
  if(f.categories.length&&!(f.categoryMode==='all'?f.categories.every(k=>d.categories.includes(k)):f.categories.some(k=>d.categories.includes(k))))return false;
  if(query&&!normalize([d.name,d.region,d.province,d.shortDescription,...d.highlights].join(' ')).includes(query))return false;
  return true;
 }).sort((a,b)=>f.sort==='region'?a.region.localeCompare(b.region,'de')||a.name.localeCompare(b.name,'de'):f.sort==='tourism'?(a.tourismLevel??99)-(b.tourismLevel??99)||a.name.localeCompare(b.name,'de'):a.name.localeCompare(b.name,'de'));
}
export const visitLabel=d=>d.visitedByMax===true?'Von Max bereist':d.visitedByMax===false?'Nicht von Max bereist':'Besuchsstatus unbekannt';
