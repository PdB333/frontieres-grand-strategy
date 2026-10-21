/* Frontieres 1.4.1 interface. All mod and imported strings are escaped. */
'use strict';
let WORLD=JSON.parse(document.getElementById('world-data').textContent);
const BASE_WORLD=WORLD;
const CATALOG=JSON.parse(document.getElementById('catalog-data').textContent);
const PORTRAITS=JSON.parse(document.getElementById('portrait-data').textContent);
const PEOPLE=JSON.parse(document.getElementById('people-data').textContent);
const SOURCES=JSON.parse(document.getElementById('sources-data').textContent);
const MOD_MAP_EXAMPLE=JSON.parse(document.getElementById('map-demo-data').textContent);
const Rules=createEngineClass();
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>{n=Number(n)||0;return n>=1e6?(n/1e6).toFixed(2)+' M':n>=10000?(n/1000).toFixed(0)+' k':n>=1000?(n/1000).toFixed(1)+' k':Math.floor(n).toLocaleString('fr-FR');};
const percent=n=>Math.round((Number(n)||0)*100)+' %';
const total=arr=>arr.reduce((a,b)=>a+b,0);
const dateText=day=>new Date(Date.UTC(1936,0,1+day)).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
const ICONS={
 menu:'M3 6h18M3 12h18M3 18h18',home:'M3 11l9-8 9 8M5 10v11h5v-7h4v7h5V10',globe:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18',
 nation:'M12 3l8 4v6c0 4-5 7-8 9-3-2-8-5-8-9V7zM8 11h8M12 7v10',army:'M4 6h16v12H4zM4 6l16 12M20 6L4 18',
 industry:'M3 21V10l6 4V8l7 5V3h3l2 18zM7 17v1m5-1v1m5-1v1',research:'M8 3h8M10 3v7L4 19q-1 2 2 2h12q3 0 2-2l-6-9V3M8 14h8',
 diplomacy:'M3 9l4-4 5 2 4-2 5 5-4 8-3 2-5-2-4-5M8 8l3 4 3-2 5 6M4 10l-2 2 5 7 2-2',
 focus:'M12 3l2.8 5.7L21 10l-4.5 4.4L17.6 21 12 18l-5.6 3 1.1-6.6L3 10l6.2-1.3z',journal:'M5 3h14v18H5zM8 7h8M8 11h8M8 15h6',
 plane:'M21 3L3 10l7 3 3 7zM10 13l11-10M10 13l-1 6 4-4',anchor:'M12 7v14M7 4a5 5 0 0 0 10 0M10 4a2 2 0 1 0 4 0 2 2 0 0 0-4 0M3 12v3c0 4 4 6 9 6s9-2 9-6v-3M1 14l2-2 3 2m12 0l3-2 2 2',
 intel:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12M8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0',
 save:'M4 3h13l4 4v14H3V3zM7 3v6h10V3M7 21v-8h10v8',folder:'M3 6h7l2 3h9v12H3z',help:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M9 8a3 3 0 0 1 6 0c0 3-3 2-3 5M12 17h.01',
 fuel:'M6 3h9v18H4V3zM6 6h7v5H6zM15 8h3l2 3v7a1 1 0 0 1-2 0v-5M18 5l3 3',people:'M8 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6M2 21v-4a6 6 0 0 1 12 0v4M16 4a3 3 0 0 1 0 6M17 13a5 5 0 0 1 5 5v3',
 pp:'M12 2v20M16 6h-6a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6H7',rifle:'M3 18l7-7 3 2-7 7zM10 11l8-8 3 3-8 8M14 8l2 2M7 15l3 3',box:'M3 7l9-4 9 4v12l-9 3-9-3zM3 7l9 4 9-4M12 11v11',
 truck:'M2 6h12v12H2zM14 10h5l3 5v3h-8M5 18a2 2 0 1 0 4 0M16 18a2 2 0 1 0 4 0',tank:'M3 14h17l2 5-3 2H4l-3-2zM6 14V9h10v5M12 9V6h10M5 18h14',crosshair:'M3 12h18M12 3v18M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
 rail:'M7 3h10v13H7zM7 11h10M9 16l-4 6m10-6l4 6M7 19h10M10 6h4',chart:'M3 3v18h18M7 17l4-5 4 2 6-9',arrow:'M4 12h16M14 6l6 6-6 6',lock:'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',check:'M4 12l5 5L20 6',close:'M5 5l14 14M19 5L5 19',plus:'M12 4v16M4 12h16',flag:'M5 22V3h13l-3 5 3 5H5',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M9 3h6l1 4 4 1v7l-4 1-1 5H9l-1-5-4-1V8l4-1z'};
function icon(name,cls=''){return `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name]||ICONS.box}"/></svg>`;}
function btn(label,action,p={},cls='',disabled=false){return `<button data-a="${esc(action)}" data-p="${encodeURIComponent(JSON.stringify(p))}" class="${cls}" ${disabled?'disabled':''}>${label}</button>`;}
function bar(v,color){return `<div class="bar"><i style="width:${Math.max(0,Math.min(100,Number(v)||0))}%;${color?'background:'+color:''}"></i></div>`;}
function metric(label,value,cls=''){return `<div class="metric"><span>${label}</span><strong class="${cls}">${value}</strong></div>`;}
function tag(label,cls=''){return `<span class="tag ${cls}">${esc(label)}</span>`;}
function field(label,html){return `<label class="label">${label}</label>${html}`;}
let DEF=Object.fromEntries(WORLD.countries.map(c=>[c.id,c]));
const TABS={history:['journal','Histoire'],nation:['nation','Nation'],politics:['people','Politique'],treasury:['chart','Budget'],campaign:['flag','Campagne'],army:['army','Arm\u00e9es'],warfare:['crosshair','Guerre'],industry:['industry','Industrie'],research:['research','Recherche'],air:['plane','Aviation'],navy:['anchor','Marine'],diplomacy:['diplomacy','Diplomatie'],intel:['intel','Renseign.'],focus:['focus','Priorit\u00e9s'],journal:['journal','Journal']};
const MODES={history:'Atlas historique',political:'Politique',terrain:'Terrain',supply:'Ravitaillement',industry:'Industrie',diplomacy:'Diplomatie',air:'A\u00e9rien',navy:'Maritime'};
const IDEO={democratic:'D\u00e9mocratie',fascist:'Fascisme',communist:'Communisme',authoritarian:'Autoritarisme'};
const PARTYC={democratic:'#829bac',fascist:'#aa8c62',communist:'#b27268',authoritarian:'#98a082'};
const TECHGROUPS={industry:'Industrie',infantry:'Infanterie',armor:'Blind\u00e9s',air:'A\u00e9ronautique',navy:'Marine',logistics:'Logistique',doctrine:'Doctrines',mod:'Mod'};
let startCampaign='development',startDifficulty='standard',startHistorical='historical';
let S=null,tab='nation',subtab='production',techGroup='industry',selected=new Set(),pid=null,army=null,target='GER',selectedCountry='FRA';
let showPockets=true,mapMode='political',orderMode=false,modalKind='',mod=null,lastAuto=-1,seenEvent='',requestId=0,dirty=true,showRoutes=false;
const pendingRequests=new Map(),networkAttempted=new Set(),portraitResolved=new Map();
let lastStateTick=performance.now(),firstGame=true,lastWorkerPerf={},stateMessages=0;
const code=id=>S?.countries[id]?.identity||DEF[id]||(mod?.newCountries?.some(c=>c.id===id)?previewWorld14().countries.find(c=>c.id===id):null);
const nation=(id=S?.player)=>S?.countries[id];
const countryName=id=>code(id)?.name||id;
const control=id=>S?.provinces[id]?.ctrl||WORLD.provinces[id].owner;
const ownUnits=()=>S?S.units.filter(u=>u.owner===S.player):[];
const owned=(id=S?.player)=>WORLD.provinces.filter(p=>control(p.id)===id);
const war=(a,b)=>!!S?.wars.some(w=>w.a===a&&w.b===b||w.a===b&&w.b===a);
const allied=(a,b)=>a===b||!!(nation(a)&&nation(b)&&nation(a).faction!=='none'&&nation(a).faction===nation(b).faction);
const pname=id=>WORLD.provinces[id]?.name||'Province';
const technologies=()=>CATALOG.techs.concat(S?.mod.technologies||[]);
const focusTree=(id=S?.player)=>S?.mod.focus?.[id]||CATALOG.focus[id]||S?.mod.focus?.generic||CATALOG.focus.generic;
const buildProvince=()=>pid!==null&&control(pid)===S?.player?pid:owned().find(p=>p.capital)?.id??owned()[0]?.id;
const availableCountries=()=>S?Object.values(S.countries).filter(c=>c.alive).map(c=>c.identity):previewWorld14().countries;
function selectCountries(value,id,exclude=null){return `<select id="${id}">${availableCountries().filter(c=>c.id!==exclude).sort((a,b)=>a.name.localeCompare(b.name,'fr')).map(c=>`<option value="${c.id}" ${c.id===value?'selected':''}>${esc(c.name)}</option>`).join('')}</select>`;}
function selectProvinces(id,value,filter=()=>true){return `<select id="${id}">${owned().filter(filter).sort((a,b)=>(b.city-a.city)||a.name.localeCompare(b.name,'fr')).map(p=>`<option value="${p.id}" ${p.id===value?'selected':''}>${esc(p.name)}</option>`).join('')}</select>`;}
function zoneOptions(value,seas=false){return (seas?WORLD.seas:WORLD.zones).map(z=>`<option value="${z.id}" ${z.id===value?'selected':''}>${esc(z.name)}</option>`).join('');}
function toast(message,error=false){const el=document.createElement('div');el.className='toast'+(error?' error':'');el.textContent=message;$('toasts').append(el);setTimeout(()=>el.remove(),error?8500:5000);}
function send(type,p={}){return new Promise((resolve,reject)=>{const request=++requestId;pendingRequests.set(request,{resolve,reject});worker.postMessage({type,request,...p});if(type==='diagnostics'){pendingRequests.delete(request);resolve();}});}
function cmd(action,params={}){return send('command',{action,params}).catch(e=>{toast(e.message,true);throw e;});}
function fire(action,params={}){cmd(action,params).catch(()=>{});}
function modal(html,kind='generic',size=''){modalKind=kind;$('modal').className='modal '+size;$('modal').innerHTML=html;$('overlay').style.display='flex';hydratePortraits();setTimeout(()=>$('modal').querySelector('button,input,select')?.focus({preventScroll:true}),30);}
function closeModal(){if(modalKind==='event'||modalKind==='victory'||!S&&modalKind==='start')return;$('overlay').style.display='none';modalKind='';}
function modalHead(title,over='FRONTI\u00c8RES / CAMPAGNE SOLO'){return `<div class="modal-top"><div><div class="eyebrow">${esc(over)}</div><h2>${esc(title)}</h2></div>${btn(icon('close'),'close',{},'iconbtn close')}</div>`;}
function pauseGame(){if(S&&!S.paused)fire('pause');}

/* Archival portraits: direct Wikimedia files with explicit sources. Other portraits
 * are queried only on user request and accepted only with reusable metadata. */
function portraitKey(id){const d=code(id);return d?.wiki||d?.leader||id;}
function portrait(id,size='',override=null){
  const d=override||code(id)||{leader:id},key=override?(d.wiki||d.leader||id):portraitKey(id),entry=portraitResolved.get(key)||PORTRAITS[key];
  const initials=String(d.leader||d.name).split(/\s+/).slice(0,2).map(p=>p[0]).join('');
  return `<div class="portrait ${size}" data-person="${esc(key)}"><span class="initials">${esc(initials)}</span><span class="portrait-note">${entry?.failed?'ARCHIVE<br>INDISPONIBLE':'PORTRAIT<br>EN LIGNE'}</span>${entry?.embedded?`<img src="${esc(entry.embedded)}" alt="Portrait historique de ${esc(d.leader)}">`:''}</div>`;
}
function hydratePortraits(){
  document.querySelectorAll('.portrait[data-person]').forEach(el=>{
    const person=el.dataset.person,record=portraitResolved.get(person)||PORTRAITS[person];
    let image=el.querySelector('img');
    if(image){if(image.complete&&image.naturalWidth)el.classList.add('loaded');else image.onload=()=>el.classList.add('loaded');return;}
    if(!record?.url&&!record?.embedded)return;
    if(record.failed)return;
    image=new Image();image.alt='Portrait historique : '+person;image.referrerPolicy='no-referrer';image.decoding='async';
    image.onload=()=>{el.classList.add('loaded');};image.onerror=()=>{el.querySelector('.portrait-note').innerHTML='ARCHIVE EN LIGNE<br>INDISPONIBLE';image.remove();record.failed=true;};
    image.src=record.embedded||record.url;el.append(image);
  });
}
async function fetchPortrait(person){
  const deadline=AbortSignal.timeout(12000),base='https://en.wikipedia.org/w/api.php?origin=*&format=json&action=query&redirects=1&';
  const result=await fetch(base+'prop=pageimages&piprop=name&titles='+encodeURIComponent(person),{signal:deadline});
  if(!result.ok)throw Error('Wikip\u00e9dia ne r\u00e9pond pas.');
  const page=Object.values((await result.json()).query.pages)[0];if(!page.pageimage)throw Error('Aucun portrait r\u00e9utilisable trouv\u00e9.');
  const r=await fetch('https://commons.wikimedia.org/w/api.php?origin=*&format=json&action=query&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=320&titles='+encodeURIComponent('File:'+page.pageimage),{signal:deadline});
  const file=Object.values((await r.json()).query.pages)[0],info=file.imageinfo?.[0];if(!info)throw Error('Image absente de Wikimedia Commons.');
  const meta=info.extmetadata||{},license=meta.LicenseShortName?.value||'';
  if(!/^(CC BY(?:-SA)?(?: |$)|CC0(?: |$)|Public domain(?: |$))/i.test(license))throw Error('Licence non reconnue comme libre : '+license);
  const plain=html=>{const el=document.createElement('div');el.innerHTML=html||'';return el.textContent;};
  const entry={person,url:info.thumburl||info.url,source:info.descriptionurl,author:plain(meta.Artist?.value),license,licenseURL:meta.LicenseUrl?.value||info.descriptionurl,year:plain(meta.DateTimeOriginal?.value||''),changes:'Affichage recadr\u00e9 en CSS.',embedded:false};
  portraitResolved.set(person,entry);hydratePortraits();return entry;
}
async function loadVisiblePortrait(){
  const person=portraitKey(S?.player||selectedCountry);
  try{await fetchPortrait(person);toast('Portrait historique et attribution charg\u00e9s.');}catch(e){toast('Portrait non charg\u00e9 : '+e.message,true);}
}


/* Optional archival media cache. Only verified Commons records are fetched.
 * It never substitutes generated images for a missing historical photograph. */
let archiveBusy=false;
async function archivePortraits(){
  if(archiveBusy){toast("Archivage deja en cours.");return;}
  archiveBusy=true;pauseGame();const entries=Object.entries({...PORTRAITS,...Object.fromEntries(portraitResolved)});
  let ok=0,failed=0;
  toast('Archivage des portraits : '+entries.length+' sources. Une connexion est requise.');
  for(const [person,record] of entries){
    if(record.embedded){ok++;continue;}
    try {
      const url=new URL(record.url);
      if(!['upload.wikimedia.org','thumb.wikimedia.org'].includes(url.hostname))throw Error('Source non autorisee.');
      const response=await fetch(url.href,{signal:AbortSignal.timeout(12000),credentials:'omit'});
      if(!response.ok)throw Error('HTTP '+response.status);
      const blob=await response.blob();if(!blob.type.startsWith('image/')||blob.size>16000000)throw Error('Image trop volumineuse ou invalide.');
      const bitmap=await createImageBitmap(blob),ratio=Math.min(1,480/Math.max(bitmap.width,bitmap.height));
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
      record.embedded=canvas.toDataURL('image/jpeg',.9);record.failed=false;
      record.changes='Copie redimensionnee a 480 pixels maximum, compressee en JPEG et recadree/desaturee a l\u2019affichage. Licence et attribution conservees.';
      portraitResolved.set(person,record);ok++;
    }catch(error){failed++;console.warn('[Archive]',person,error.message);}
  }
  archiveBusy=false;showSources();renderTop();renderPanel(true);hydratePortraits();
  toast(ok+' portrait(s) en memoire ; '+failed+' non charge(s). Exportez le HTML pour conserver les images.',failed>0);
}
function exportArchiveGame(){
  const records={...PORTRAITS,...Object.fromEntries(portraitResolved)},embedded=Object.values(records).filter(r=>r.embedded).length;
  if(!embedded)throw Error('Chargez d\u2019abord les archives. Aucune photographie n\u2019est disponible hors ligne.');
  const copy=new DOMParser().parseFromString(ORIGINAL_PAGE,'text/html');
  copy.getElementById('portrait-data').textContent=JSON.stringify(records).replace(/</g,'\\u003c');
  const blob=new Blob(['<!doctype html>\n'+copy.documentElement.outerHTML],{type:'text/html;charset=utf-8'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='Frontieres-avec-portraits.html';link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
  toast('Jeu exporte avec '+embedded+' portraits incorpores. La sauvegarde de campagne reste un fichier JSON distinct.');
}

/* Worker and messages */
let worker;
try{
  const source=`const Engine=(${createEngineClass.toString()})();(${workerMain.toString()})(Engine);`;
  const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));worker=new Worker(url);URL.revokeObjectURL(url);
  worker.onmessage=({data:m})=>{
    if(m.type==='state'){S=m.state;lastStateTick=performance.now();onState(m.perf);}
    else if(m.type==='ack'){const p=pendingRequests.get(m.request);if(p){p.resolve(m.result);pendingRequests.delete(m.request);}}
    else if(m.type==='error'){const p=pendingRequests.get(m.request);if(p){p.reject(Error(m.message));pendingRequests.delete(m.request);}else toast(m.message,true);console.warn('[Frontieres]',m.message);}
    else if(m.type==='diagnostics')modal(`${modalHead('Diagnostics du moteur')}<div class="stack">${m.results.map(r=>`<div class="card row between"><span>${esc(r.name)}</span>${tag(r.ok?'OK':'\u00c9CHEC',r.ok?'good':'bad')}</div>`).join('')}</div><p class="note" style="margin-top:18px">Test effectu\u00e9 en ${Math.round(m.ms)} ms. Deux simulations de 30 jours sur des copies ; la campagne en cours n\u2019est pas avanc\u00e9e. Ces contr\u00f4les ne garantissent pas l\u2019absence de bugs.</p>`,'diagnostics','narrow');
  };
  worker.onerror=e=>{toast('Le moteur a rencontr\u00e9 une erreur : '+e.message,true);console.error(e);};
}catch(e){$('boot-error').style.display='block';$('boot-error').textContent='Ce navigateur ne peut pas lancer le moteur isol\u00e9 : '+e.message;throw e;}
function onState(perf={}){
  lastWorkerPerf=perf;stateMessages++;
  selected=new Set([...selected].filter(id=>S.units.some(u=>u.id===id&&u.owner===S.player)));
  if(army!==null&&!S.armies.some(a=>a.id===army&&a.owner===S.player))army=null;
  if(!nation(target)?.alive||target===S.player)target=Object.keys(S.countries).find(id=>id!==S.player&&nation(id).alive)||S.player;
  renderTop();renderPanel();renderInspector();renderSelection();renderArmies();dirty=true;
  $('engine-status').innerHTML=`<span class="activity-light"></span>WORKER / ${perf.avgMs!==undefined?perf.avgMs+' ms/j moy. · p95 '+perf.p95Ms+' ms':perf.stepMs!==undefined?perf.stepMs+' ms/j':'EN PAUSE'}`;
  if(S.day-lastAuto>=20){try{localStorage.setItem('frontieres-v4-autosave',JSON.stringify(S));lastAuto=S.day;}catch(e){if(lastAuto===-1)toast('Autosauvegarde indisponible : exportez une copie JSON.');lastAuto=S.day;}}
  if(S.pending&&seenEvent!==S.pending.event.id){seenEvent=S.pending.event.id;showEvent();}
  if(!S.pending&&modalKind==='event'){$('overlay').style.display='none';modalKind='';seenEvent='';}
  if(S.outcome?.type==='defeat'&&modalKind!=='defeat')showDefeat();
  if(S.outcome?.type==='victory'&&modalKind!=='victory')showVictory();
  if(modalKind==='victory'&&!S.outcome){$('overlay').style.display='none';modalKind='';}
}
function renderTop(){
  const id=S?.player||selectedCountry,d=code(id),c=nation(id);
  $('nation-banner').innerHTML=`${portrait(id,'tiny')}<div class="grow"><strong>${esc(d.name)}</strong><small style="display:block">${esc(c?.faction==='none'?'Hors faction':c?.faction||IDEO[d.ideology])}</small></div>${btn(icon('chart'),'ledger',{},'iconbtn ghost')}`;
  $('clock-date').innerHTML=`${dateText(S?.day||0)}<small>${S&&!S.paused?'SIMULATION EN COURS':'CAMPAGNE EN PAUSE'}</small>`;
  $('pause').textContent=S&&!S.paused?'\u2161':'\u25b6';
  $('speeds').innerHTML=[1,2,3,4,5].map(v=>btn(String(v),'speed',{value:v},S?.speed===v?'active':'')).join('');
  const values=c?[
    ['pp',num(c.pp),'POLITIQUE'],['people',num(c.manpower),'R\u00c9SERVES'],['nation',Math.round(c.stability)+' %','STABILIT\u00c9'],['industry',c.stats.civ+' / '+c.stats.mil,'USINES CIV. / MIL.'],['fuel',num(c.stock.fuel),'CARBURANT'],['globe',Math.round(S.tension)+' %','TENSION MONDIALE']
  ]:[['globe',String(WORLD.countries.length),'PAYS JOUABLES'],['flag',num(WORLD.provinces.length),'PROVINCES'],['people','SOLO','CAMPAGNE']];
  $('resource-strip').innerHTML=values.map(([ic,v,label])=>`<div class="resource">${icon(ic)}<div><b>${v}</b><small>${label}</small></div></div>`).join('');hydratePortraits();
}
function renderRail(){
  $('rail').innerHTML=Object.entries(TABS).map(([id,[ic,label]])=>btn(icon(ic)+`<span>${label}</span>`,'tab',{id},tab===id?'active':'')).join('')+`<div class="grow"></div>${btn(icon('settings'),'menu',{},'ghost')}`;
}
function setTab(value){if(!TABS[value])return;const change=value!==tab;tab=value;document.body.classList.add('panel-open');renderRail();renderPanel(true);if(change)$('panel').scrollTop=0;}
function panelHeader(title,subtitle){return `<div class="panel-head"><div class="row between"><div class="eyebrow">GOUVERNEMENT / ${esc(S?.player||selectedCountry)}</div>${btn(icon('close'),'hidePanel',{},'iconbtn ghost mobile-panel-toggle')}</div><h2>${title}</h2><p class="note">${subtitle}</p></div>`;}
function effectText(e){
  const labels={pp:'politique',stability:'stabilit\u00e9',support:'soutien',manpower:'effectifs',civ:'usines civiles',mil:'usines militaires',dock:'chantiers navals',slots:'\u00e9quipe scientifique',xp:'exp\u00e9rience',production:'production',construction:'construction',research:'recherche',attack:'attaque',defense:'d\u00e9fense',supply:'logistique',planning:'planification',speed:'vitesse',armor:'blindage',piercing:'perforation',air:'aviation',bombing:'bombardement',navy:'marine',raiding:'raids',intel:'renseignement',tension:'tension mondiale',fuel:'carburant'};
  return Object.entries(e).map(([k,v])=>`${v>=0?'+':''}${Math.abs(v)<1&&v!==0?Math.round(v*100)+' %':num(v)} ${labels[k]||CATALOG.equipment[k]?.name||k}`).join(' / ');
}
function renderPanel(force=false){
  if(!S){$('panel').innerHTML=panelHeader('Vue d\u2019ensemble','Choisissez une nation pour commencer.')+`<div class="card"><div class="eyebrow">1 JANVIER 1936</div><h3 style="margin:10px 0">Un monde en mouvement</h3><p class="note">Une carte mondiale, des puissances rivales et des d\u00e9cisions qui changent le cours d\u2019une campagne.</p></div>`;return;}
  if(!force&&$('panel').contains(document.activeElement)&&['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;
  const scroll=$('panel').scrollTop,c=nation(),d=code(S.player),us=ownUnits(),bp=buildProvince();let html='';
  if(tab==='history')html=historyPanel();
  if(tab==='nation'){
    const current=c.focus?focusTree().find(f=>f.id===c.focus.id):null;
    html=panelHeader('Vue d\u2019ensemble','Vous dirigez l\u2019\u00c9tat, pas seulement son arm\u00e9e.')+`
      <div class="leader-card">${portrait(S.player)}<div><h3>${esc(d.leader)}</h3><small>${esc(d.role)}</small>${tag(IDEO[c.ideology])}</div></div>
      ${d.cabinet?`<p class="note" style="margin-top:8px">Chef du gouvernement : ${esc(d.cabinet)}</p>`:''}
      <div class="row between" style="margin:7px 0 15px">${btn('Source du portrait \u2197','portraitSource',{},'small ghost')}${btn('Charger le portrait','fetchPortrait',{},'small ghost')}</div>
      <div class="grid2"><div class="card stat">${Math.round(c.support)} %<small>SOUTIEN \u00c0 LA GUERRE</small></div><div class="card stat">${percent(c.stats.supply)}<small>RAVITAILLEMENT MOYEN</small></div><div class="card stat">${us.length}<small>DIVISIONS D\u00c9PLOY\u00c9ES</small></div><div class="card stat">${num(c.casualties)}<small>PERTES MILITAIRES</small></div></div>
      <div class="sectionlabel">Votre priorit\u00e9 nationale</div>
      <div class="focus-current"><div class="eyebrow">${current?'PROGRAMME EN COURS':'AUCUN PROGRAMME ACTIF'}</div><h3>${current?esc(current.name):'Choisir une direction'}</h3><p class="note">${current?effectText(current.effect):'La premi\u00e8re priorit\u00e9 ouvre les branches industrielles, militaires et diplomatiques.'}</p>${current?bar(c.focus.progress/current.days*100)+`<small>${c.focus.progress} / ${current.days} jours</small>`:''}<div style="margin-top:11px">${btn('Ouvrir l\u2019arbre '+icon('arrow'),'focusTree',{},'small wide')}</div></div>
      <div class="sectionlabel">\u00c0 d\u00e9cider</div>
      <div class="todo">${icon('research')}<div class="grow"><strong>${c.slots-c.research.length} \u00e9quipe(s) scientifique(s) libre(s)</strong><small>${c.tech.length} technologies acquises</small></div>${btn(icon('arrow'),'tab',{id:'research'},'iconbtn ghost')}</div>
      <div class="todo">${icon('industry')}<div class="grow"><strong>${c.stats.freeCiv} usines civiles disponibles</strong><small>${c.build.length} chantier(s) dans la file</small></div>${btn(icon('arrow'),'tab',{id:'industry'},'iconbtn ghost')}</div>
      <div class="row wrap" style="margin:13px 0">${btn('Institutions et élections →','tab',{id:'politics'},'small')}${btn('Budget et trésor →','tab',{id:'treasury'},'small')}</div>
      <div class="sectionlabel">Lois et mobilisation</div><div class="card stack">
        ${metric('\u00c9conomie',{civilian:'Civile',partial:'Mobilisation partielle',war:'\u00c9conomie de guerre'}[c.economy])}
        ${btn('Mobilisation partielle / 60 PP','law',{kind:'economy',value:'partial'},'small',c.economy==='partial')}
        ${btn('\u00c9conomie de guerre / 100 PP','law',{kind:'economy',value:'war'},'small',c.economy==='war')}
        ${metric('Conscription',c.conscription+' / 4')}${btn('\u00c9largir la conscription / 80 PP','law',{kind:'conscription'},'small',c.conscription>=4)}
      </div>
      <div class="sectionlabel">Politique int\u00e9rieure</div><div class="card"><div class="partybar">${Object.entries(c.parties).map(([k,v])=>`<i style="width:${v}%;background:${PARTYC[k]}"></i>`).join('')}</div><div class="policy-legend">${Object.entries(c.parties).map(([k,v])=>`<span><i style="background:${PARTYC[k]}"></i>${esc(IDEO[k])} ${Math.round(v)} %</span>`).join('')}</div></div>
      <div class="stack" style="margin-top:9px">${btn('Compromis social / +8 stabilit\u00e9 / 45 PP','decision',{id:'stability'},'small',(c.policyCooldown.stability||0)>S.day)}${btn('Campagne de soutien / +10 / 45 PP','decision',{id:'support'},'small',(c.policyCooldown.support||0)>S.day)}</div>
      <div class="sectionlabel">Administration des territoires</div><div class="stack">${['civil','police','military'].map(k=>btn({civil:'Administration civile',police:'Police d\u2019occupation',military:'Administration militaire'}[k],'law',{kind:'occupation',value:k},'small '+(c.occupation===k?'active':''))).join('')}</div><p class="note" style="margin-top:10px">La politique d\u2019occupation modifie r\u00e9sistance, conformit\u00e9 et pertes. Les cat\u00e9gories politiques et les statistiques sont des abstractions de jeu.</p>`;
  }
  if(tab==='politics')html=renderPolitics13();
  if(tab==='treasury')html=renderTreasury13();
  if(tab==='army'){
    const armies=S.armies.filter(a=>a.owner===S.player),a=armies.find(a=>a.id===army)||armies[0];if(a)army=a.id;
    const selectedUs=us.filter(u=>selected.has(u.id));
    const list=selectedUs.length?selectedUs:a?us.filter(u=>u.army===a.id):us;
    html=panelHeader('Commandement terrestre',`${us.length} divisions / ${selected.size} s\u00e9lectionn\u00e9es / ${num(c.xp)} XP`)+`
      <div class="row">${btn('Toutes les divisions','selectAll',{},'small')}${btn('+ Arm\u00e9e','newArmy',{},'small')}</div>
      <div class="sectionlabel">Organisation des forces</div>
      <select id="army-select">${armies.map(a=>`<option value="${a.id}" ${a.id===army?'selected':''}>${esc(a.name)} / ${us.filter(u=>u.army===a.id).length} divisions</option>`).join('')}</select>
      ${a?`<div class="card stack" style="margin-top:9px">
        ${field('Officier commandant',`<select id="general-select"><option value="">\u00c9tat-major collectif</option>${d.commanders.map(g=>`<option value="${esc(g.id)}" ${a.general===g.id?'selected':''}>${esc(g.name)}</option>`).join('')}</select>`)}
        ${btn('Affecter le commandant','assignGeneral',{army:a.id},'small')}
        ${a.general?`<div class="note">${(()=>{const g=d.commanders.find(g=>g.id===a.general);return g?`Attaque ${g.attack} / D\u00e9fense ${g.defense} / Logistique ${g.logistics}`:'';})()}</div>`:''}
        ${selected.size?btn('Affecter la s\u00e9lection \u00e0 cette arm\u00e9e','assignArmy',{army:a.id,ids:[...selected]},'small'):''}
        ${field('Objectif de front',selectCountries(a.target||target,'front-target',S.player))}
        <div class="grid2"><select id="front-order"><option value="defend" ${a.order==='defend'?'selected':''}>D\u00e9fendre</option><option value="attack" ${a.order==='attack'?'selected':''}>Offensive</option><option value="garrison" ${a.order==='garrison'?'selected':''}>Garnison</option></select><select id="front-stance"><option value="cautious" ${a.stance==='cautious'?'selected':''}>Prudent</option><option value="balanced" ${a.stance==='balanced'?'selected':''}>\u00c9quilibr\u00e9</option><option value="aggressive" ${a.stance==='aggressive'?'selected':''}>Agressif</option></select></div>
        ${btn('Activer le plan '+icon('arrow'),'activatePlan',{army:a.id},'primary small')}
        <small>Pr\u00e9paration : ${percent(a.planning)} / ${a.auto?'ordres automatiques':'contr\u00f4le manuel'}</small>${bar(a.planning*100)}
      </div>`:''}
      <div class="sectionlabel">Recrutement</div><div class="card stack">
        ${field('Mod\u00e8le de division',`<select id="recruit-template">${c.templates.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select>`)}
        ${field('Province de d\u00e9ploiement',selectProvinces('recruit-base',bp))}
        <div class="row between"><span class="note">Nombre de divisions</span><input id="recruit-count" type="number" min="1" max="5" value="1"></div>
        ${btn('Lancer l\u2019entra\u00eenement','recruitForm',{},'primary small')}${btn('Concevoir un mod\u00e8le / 15 XP','templateEditor',{},'small')}
        <small>Mat\u00e9riel et effectifs r\u00e9serv\u00e9s imm\u00e9diatement. Dur\u00e9e : 35 jours ou plus.</small>
      </div>
      <div class="sectionlabel">Rééquipement / ${selectedUs.length} division(s)</div>
      <div class="card stack">
        <select id="refit-template">${c.templates.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('')}</select>
        ${btn('Rééquiper la sélection / 5 XP','refitForm',{},'small',!selectedUs.length||c.xp<5)}
        <small>En territoire national et hors combat. Coût en stocks et effectifs selon le modèle. 70 % du matériel excédentaire est récupéré.</small>
      </div>
      ${c.training.length?`<div class="sectionlabel">Entra\u00eenement en cours</div><div class="stack">${c.training.map(t=>`<div class="card"><div class="row between"><span style="font-size:11px">${esc(t.template.name)}</span>${btn('\u00d7','cancelTraining',{id:t.id},'small ghost')}</div>${bar(t.progress/t.days*100)}<small>${t.progress}/${t.days} jours / ${esc(pname(t.pid))}</small></div>`).join('')}</div>`:''}
      <div class="sectionlabel">${selectedUs.length?'S\u00e9lection active':'Ordre de bataille'} / ${list.length} divisions</div>
      <div class="row" style="margin-bottom:9px">${btn('S\u00e9lectionner cette arm\u00e9e','selectArmy',{id:army},'small')}${btn('Stop','halt',{ids:[...selected]},'small',!selected.size)}</div>
      <div class="stack">${list.slice(0,100).map(u=>`<div class="unitrow ${selected.has(u.id)?'selected':''}" data-a="unit" data-p="${encodeURIComponent(JSON.stringify({id:u.id}))}"><div class="unit-symbol">${u.template.tank?'\u25b1':'\u00d7'}</div><div class="grow"><div class="row between"><strong>${esc(u.name)}</strong><span class="mono" style="font-size:10px">${Math.round(u.org)}</span></div><small>${esc(pname(u.pid))} / Ravit. ${percent(u.supply)}</small>${bar(u.strength*100,'#a7b58f')}<div style="height:3px"></div>${bar(u.org,'#88a7b7')}</div></div>`).join('')||'<div class="empty">Aucune division dans cette arm\u00e9e.</div>'}</div>
      <p class="note" style="margin-top:14px">Officiers historiques, comp\u00e9tences de jeu. La liste ne reproduit pas exactement leurs grades ou affectations de 1936.</p>`;
  }
  if(tab==='warfare')html=warfarePanel();
  if(tab==='industry'){
    const allocated=total(Object.keys(c.allocation).filter(k=>!CATALOG.equipment[k].naval).map(k=>c.allocation[k]));
    html=panelHeader('Industrie et logistique',`${c.stats.freeCiv} usines civiles disponibles / ${c.stats.mil} militaires / ${c.stats.dock} chantiers navals`)+`
      <div class="subtabs">${['production','construction','resources'].map(k=>btn({production:'Production',construction:'B\u00e2tir',resources:'Ressources'}[k],'industryTab',{id:k},subtab===k?'active':'')).join('')}</div>`;
    if(subtab==='production'){
      html+=`<div class="row between" style="margin-bottom:12px"><small>${c.stats.mil-allocated} arsenal(s) non affect\u00e9(s)</small>${btn('R\u00e9partir auto.','autoProduction',{},'small')}</div><div class="stack">${Object.entries(CATALOG.equipment).map(([key,e])=>`<div class="card equipment-card"><div class="row"><div class="eq-icon">${icon(e.icon)}</div><div class="grow"><h4 style="font-size:12px;font-weight:500">${e.name}</h4><small>${e.naval?'Chantiers navals':'Usines militaires'}</small></div><div class="stock">${num(c.stock[key])}</div></div><div class="row between" style="margin-top:11px"><span class="mono" style="font-size:10px">${c.allocation[key]} affect\u00e9(s) / ${Math.round(c.efficiency[key]*100)} % eff.</span><div class="row">${btn('\u2212','production',{key,delta:-1},'small',!c.allocation[key])}${btn('+','production',{key,delta:1},'small')}</div></div>${bar(c.efficiency[key]*100)}</div>`).join('')}</div><p class="note" style="margin-top:13px">L\u2019efficacit\u00e9 augmente avec le temps. Les p\u00e9nuries, les lois et les bombardements modifient la production.</p>`;
    }else if(subtab==='construction'){
      html+=`<div class="inset"><div class="label">Province s\u00e9lectionn\u00e9e</div><h3>${esc(pname(bp))}</h3><small>S\u00e9lectionnez un autre territoire sur la carte pour y construire.</small></div><div class="grid2" style="margin:12px 0">${Object.entries(CATALOG.buildings).map(([k,b])=>btn(`${esc(b.name)} <small>${b.cost}</small>`,'build',{pid:bp,kind:k},'small',(['dock','port'].includes(k)&&!WORLD.provinces[bp]?.coast))).join('')}</div><div class="sectionlabel">File de construction / ${c.build.length}</div><div class="stack">${c.build.map(b=>`<div class="card"><div class="row between"><strong style="font-size:12px">${CATALOG.buildings[b.kind].name}</strong><div class="row">${btn('\u2191','prioritizeBuild',{id:b.id},'small ghost')}${btn('\u00d7','cancelBuild',{id:b.id},'small ghost')}</div></div><small>${esc(pname(b.pid))} / ${Math.round(b.progress)} / ${b.cost} points</small><div style="margin-top:8px">${bar(b.progress/b.cost*100)}</div></div>`).join('')||'<div class="empty">La file de construction est vide. Les usines civiles n\u2019ont aucun chantier \u00e0 ex\u00e9cuter.</div>'}</div><p class="note" style="margin-top:14px">Jusqu\u2019\u00e0 trois chantiers parall\u00e8les selon l\u2019industrie disponible. Les voies ferr\u00e9es et d\u00e9p\u00f4ts soutiennent le ravitaillement.</p>`;
    }else{
      html+=`<div class="grid2"><div class="card stat">${num(c.stats.steel)}<small>ACIER</small></div><div class="card stat">${num(c.stats.oil)}<small>P\u00c9TROLE</small></div><div class="card stat">${num(c.stats.rubber)}<small>CAOUTCHOUC</small></div><div class="card stat">${percent(c.stats.resourceFactor)}<small>FACTEUR RESSOURCES</small></div></div><div class="sectionlabel">Stocks logistiques</div><div class="card">${metric('Carburant',num(c.stock.fuel))}${metric('Convois',num(c.stock.convoys))}${metric('Camions',num(c.stock.trucks))}${metric('Ravitaillement moyen',percent(c.stats.supply))}</div><div class="sectionlabel">Contrats commerciaux</div><div class="stack">${c.trades.map(t=>`<div class="card"><div class="row between"><strong style="font-size:12px">${esc(countryName(t.from))}</strong>${tag(t.active?'ACTIF':'SUSPENDU',t.active?'good':'bad')}</div><small>4 ${esc({steel:'acier',oil:'p\u00e9trole',rubber:'caoutchouc'}[t.resource])} / 1 usine civile</small><div style="margin-top:7px">${btn('R\u00e9silier','cancelTrade',{id:t.id},'small')}</div></div>`).join('')||'<div class="empty">Aucun accord. Importez des ressources depuis le panneau Diplomatie.</div>'}</div><div style="margin-top:13px">${btn('N\u00e9gocier des importations '+icon('arrow'),'tab',{id:'diplomacy'},'wide')}</div>`;
    }
  }
  if(tab==='research'){
    html=panelHeader('Recherche et doctrines',`${c.research.length} / ${c.slots} \u00e9quipes occup\u00e9es / +${Math.round(c.bonus.research*100)} % de vitesse`)+`
      <div class="stack">${c.research.map(r=>{const t=technologies().find(t=>t.id===r.id);return `<div class="card"><div class="row between"><h4 style="font-size:12px">${esc(t.name)}</h4>${btn('\u00d7','cancelResearch',{id:r.id},'small ghost')}</div><div style="margin:8px 0">${bar(r.progress/t.days*100)}</div><small>${Math.floor(r.progress)} / ${t.days} points</small></div>`;}).join('')||'<div class="empty">Vos \u00e9quipes attendent un programme de recherche.</div>'}</div>
      <div class="sectionlabel">Domaine technologique</div><select id="tech-group">${Object.entries(TECHGROUPS).map(([id,n])=>`<option value="${id}" ${techGroup===id?'selected':''}>${esc(n)}</option>`).join('')}</select>
      <div class="stack" style="margin-top:13px">${technologies().filter(t=>t.group===techGroup).map(t=>{
        const done=c.tech.includes(t.id),running=c.research.some(r=>r.id===t.id),ready=t.req.every(r=>c.tech.includes(r)),year=1936+S.day/365.25;
        return `<div class="card tech-card ${done?'done':''}"><div class="row between"><h4>${esc(t.name)}</h4>${tag(done?'ACQUIS':String(t.year),done?'good':'')}</div><p class="note" style="margin:7px 0">${effectText(t.effect)}</p><small>${t.days} points${t.year>year?' / en avance sur son temps':''}</small>${t.req.length?`<small style="display:block">Pr\u00e9requis : ${t.req.map(k=>esc(technologies().find(t=>t.id===k)?.name||k)).join(', ')}</small>`:''}<div style="margin-top:9px">${btn(done?'Acquis':running?'Recherche en cours':ready?'Lancer la recherche':icon('lock')+' Verrouill\u00e9','research',{id:t.id},'small wide',done||running||!ready||c.research.length>=c.slots)}</div></div>`;
      }).join('')}</div><p class="note" style="margin-top:14px">Une technologie future subit une p\u00e9nalit\u00e9 de recherche. Annuler un programme perd sa progression.</p>`;
  }
  if(tab==='air'){
    const wings=S.wings.filter(w=>w.owner===S.player),bases=owned().filter(p=>S.provinces[p.id].airbase>0);
    html=panelHeader('Op\u00e9rations a\u00e9riennes',`${Math.floor(total(wings.map(w=>w.size)))} appareils d\u00e9ploy\u00e9s / ${num(c.lostPlanes)} pertes`)+`
      <div class="grid2"><div class="card stat">${num(c.stock.fighters)}<small>CHASSEURS EN R\u00c9SERVE</small></div><div class="card stat">${num(c.stock.bombers)}<small>BOMBARDIERS EN R\u00c9SERVE</small></div></div>
      <div class="sectionlabel">Escadres</div><div class="stack">${wings.map(w=>`<div class="card mission-card"><div class="row between"><h4>${esc(w.name)}</h4><span class="gold mono">${num(w.size)}</span></div><small>${esc(pname(w.base))} / ${w.kind==='fighters'?'Chasse':'Bombardement'} / eff. ${percent(w.efficiency??1)}</small>
        ${field('R\u00e9gion a\u00e9rienne',`<select id="air-zone-${w.id}">${zoneOptions(w.zone)}</select>`)}
        ${field('Mission',`<select id="air-mission-${w.id}">${(w.kind==='fighters'?['reserve','superiority','intercept']:['reserve','support','strategic','logistics']).map(k=>`<option value="${k}" ${w.mission===k?'selected':''}>${{reserve:'Au sol / r\u00e9serve',superiority:'Sup\u00e9riorit\u00e9 a\u00e9rienne',intercept:'Interception',support:'Appui au sol',strategic:'Bombardement industriel',logistics:'Interdiction logistique'}[k]}</option>`).join('')}</select>`)}
        <div class="row">${btn('Appliquer','airMissionForm',{id:w.id},'small primary')}${btn('+ 50 appareils','airReinforce',{id:w.id},'small',c.stock[w.kind]<1)}${btn(w.autoReinforce?'Renfort auto. : OUI':'Renfort auto. : NON','airAutoReinforce',{id:w.id,value:!w.autoReinforce},'small')}</div>
        <div style="margin-top:9px">${selectProvinces('rebase-'+w.id,w.base,p=>S.provinces[p.id].airbase>0)}${btn('Transf\u00e9rer vers cette base','airRebaseForm',{id:w.id},'small')}</div>
      </div>`).join('')}</div>
      <div class="sectionlabel">Former une escadre</div><div class="card stack"><select id="air-type"><option value="fighters">Chasseurs</option><option value="bombers">Bombardiers</option></select>${selectProvinces('air-base',bases[0]?.id,p=>S.provinces[p.id].airbase>0)}<div class="row between"><span class="note">Nombre d\u2019appareils</span><input type="number" id="air-size" min="10" max="500" value="50"></div>${btn('D\u00e9ployer l\u2019escadre','airCreateForm',{},'primary small',!bases.length)}</div>
      ${S.airReports.length?`<div class="sectionlabel">Rapport du jour</div><div class="card">${S.airReports.map(r=>metric(WORLD.zones.find(z=>z.id===r.zone)?.name||r.zone,percent(r.control)+' contr\u00f4le')).join('')}</div>`:''}
      <p class="note" style="margin-top:13px">Port\u00e9e, capacit\u00e9 des bases, carburant, m\u00e9t\u00e9o et ravitaillement limitent les sorties. La simulation se fait par grandes r\u00e9gions, pas appareil par appareil.</p>`;
  }
  if(tab==='navy'){
    const fleets=S.fleets.filter(f=>f.owner===S.player),ports=owned().filter(p=>S.provinces[p.id].port>0);
    html=panelHeader('Commandement naval',`${num(total(fleets.map(f=>total(Object.values(f.ships)))))} navires d\u00e9ploy\u00e9s / ${num(c.stock.convoys)} convois`)+`
      <div class="grid2"><div class="card stat">${num(c.stock.destroyers)}<small>DESTROYERS EN R\u00c9SERVE</small></div><div class="card stat">${num(c.stock.submarines)}<small>SOUS-MARINS EN R\u00c9SERVE</small></div></div>
      <div class="sectionlabel">Groupes navals</div><div class="stack">${fleets.map(f=>`<div class="card mission-card"><div class="row between"><h4>${esc(f.name)}</h4>${tag(f.eta>0?'TRANSIT '+f.eta+' J':f.mission==='port'?'AU PORT':'EN MISSION')}</div><div class="ship-breakdown">${Object.entries(SHIP_LABELS).map(([k,label])=>`<span class="ship-chip">${Math.floor(f.ships[k]||0)} ${label}</span>`).join('')}</div><div style="margin:8px 0">${bar(f.strength*100,'#95b6aa')}</div>${field('R\u00e9gion maritime',`<select id="naval-zone-${f.id}">${zoneOptions(f.zone,true)}</select>`)}${field('Mission',`<select id="naval-mission-${f.id}">${['port','patrol','escort','raid','invasion'].map(k=>`<option value="${k}" ${f.mission===k?'selected':''}>${{port:'Au port / r\u00e9paration',patrol:'Patrouille',escort:'Escorte des convois',raid:'Attaque de convois',invasion:'Couverture de d\u00e9barquement'}[k]}</option>`).join('')}</select>`)}${btn('Donner l\u2019ordre','fleetMissionForm',{id:f.id},'primary small wide')}${f.mission==='port'?`<div class="row wrap" style="margin-top:8px">${Object.entries(SHIP_LABELS).filter(([k])=>c.stock[k]>=1).map(([k,label])=>btn('+1 '+label,'fleetReinforce',{id:f.id,kind:k},'small')).join('')}</div>`:''}</div>`).join('')||'<div class="empty">Aucun groupe naval d\u00e9ploy\u00e9.</div>'}</div>
      <div class="sectionlabel">Former un groupe naval</div><div class="card stack"><input id="fleet-name" value="Groupe naval" maxlength="60" aria-label="Nom de la flotte">${selectProvinces('fleet-base',ports[0]?.id,p=>S.provinces[p.id].port>0)}<div class="row between"><span class="note">Destroyers</span><input id="fleet-dd" type="number" min="0" max="100" value="2"></div><div class="row between"><span class="note">Sous-marins</span><input id="fleet-ss" type="number" min="0" max="100" value="0"></div>${['cruisers','battleships','carriers'].map(k=>`<div class="row between"><span class="note">${SHIP_LABELS[k]} / ${Math.floor(c.stock[k])} en réserve</span><input id="fleet-${SHIP_FIELDS[k]}" type="number" min="0" max="100" value="0"></div>`).join('')}${btn('Former le groupe','fleetCreateForm',{},'primary small',!ports.length)}</div>
      <div class="sectionlabel">D\u00e9barquements</div><p class="note">D\u00e9placez des divisions d\u2019un port national vers un port ennemi. Les liaisons maritimes visibles, les convois et la pr\u00e9sence d\u2019une flotte dans les zones travers\u00e9es conditionnent le trajet. Les attaques amphibies sont p\u00e9nalis\u00e9es.</p><div style="margin-top:9px">${btn((showRoutes?'Masquer':'Afficher')+' les liaisons maritimes','routes',{},'small wide')}</div><p class="note" style="margin-top:12px">Cinq classes de bâtiments : destroyers, sous-marins, croiseurs, cuirassés et porte-avions. Les navires capitaux ont besoin d’écrans ; l’aéronavale dépend des appareils disponibles. Le combat reste agrégé par zone.</p>`;
  }
  if(tab==='diplomacy'){
    const t=nation(target),atWar=war(S.player,target),friend=allied(S.player,target),rel=c.relations[target]||0,intel=c.intel[target]||0;
    const j=c.justifications.find(j=>j.target===target);
    html=panelHeader('Affaires \u00e9trang\u00e8res','Les garanties et les factions peuvent transformer un conflit local en guerre internationale.')+`
      ${selectCountries(target,'dip-select',S.player)}
      <div class="leader-card" style="margin-top:13px">${portrait(target)}<div><h3 style="font-size:20px">${esc(code(target).leader)}</h3><small>${esc(code(target).role)}</small>${tag(atWar?'EN GUERRE':friend?'ALLI\u00c9':'EN PAIX',atWar?'bad':friend?'good':'')}</div></div>
      <div class="card" style="margin-top:9px">${metric('Faction',esc(t.faction==='none'?'Aucune':t.faction))}${metric('Relations',String(rel),rel>=25?'good':'')}${metric('Renseignement',Math.round(intel)+' %')}${metric('Divisions',friend||intel>=45?String(S.units.filter(u=>u.owner===target).length):'Non confirm\u00e9')}${t.subject?metric('Puissance tut\u00e9laire',esc(countryName(t.subject))):''}</div>
      <div class="sectionlabel">Diplomatie</div><div class="grid2">${btn('Relations +25 / 25 PP','relations',{target},'small',atWar)}${btn('Acc\u00e8s militaire / 20 PP','access',{target},'small',atWar)}${btn('Inviter / 75 PP','alliance',{target},'small',atWar||friend||t.faction!=='none')}${btn('Garantir / 40 PP','guarantee',{target},'small',atWar)}${btn('Non-agression / 40 PP','pact',{target},'small',atWar)}${btn('Reconnaissance / 35 PP','spy',{target,mission:'recon'},'small')}</div>
      <div class="sectionlabel">Guerre et paix</div>${j?`<div class="card"><strong style="font-size:12px">Justification : ${j.progress>=j.days?'objectif pr\u00eat':'en cours'}</strong><small style="display:block;margin:7px 0">${j.progress}/${j.days} jours</small>${bar(j.progress/j.days*100)}</div>`:''}<div class="stack" style="margin-top:8px">${btn('Justifier un objectif / 40 PP','justify',{target},'small',atWar||friend||!!j)}${btn('D\u00e9clarer la guerre / 50 PP','confirmWar',{target},'danger small',atWar||friend||!j||j.progress<j.days)}${btn('N\u00e9gocier un armistice / 50 PP','peace',{target,terms:'white'},'small',!atWar)}${btn('Exiger la soumission / 50 PP','peace',{target,terms:'puppet'},'small',!atWar)}</div>
      <div class="sectionlabel">Commerce ext\u00e9rieur</div><div class="stack">${['steel','oil','rubber'].map(k=>btn('Importer 4 '+{steel:'acier',oil:'p\u00e9trole',rubber:'caoutchouc'}[k]+' / 1 usine civile','trade',{target,resource:k},'small',atWar)).join('')}</div>
      <div class="sectionlabel">Pr\u00eat-bail de mat\u00e9riel</div><div class="card stack"><select id="lease-equipment">${Object.entries(CATALOG.equipment).map(([k,e])=>`<option value="${k}">${e.name}</option>`).join('')}</select><div class="row between"><small>Quantit\u00e9 quotidienne</small><input id="lease-qty" type="number" min="1" max="500" value="20"></div>${btn('Proposer le pr\u00eat-bail','leaseForm',{target},'small',atWar)}</div>${c.lendLease.map(l=>`<div class="card row between" style="margin-top:7px"><small>${num(l.daily)} ${CATALOG.equipment[l.equipment].name} / jour \u2192 ${esc(countryName(l.target))}</small>${btn('\u00d7','cancelLease',{id:l.id},'small ghost')}</div>`).join('')}`;
  }
  if(tab==='intel'){
    html=panelHeader('Renseignement','Reconnaissance, sabotage et soutien aux r\u00e9seaux de r\u00e9sistance.')+`
      <div class="card stat">${c.spies.length} / 3<small>R\u00c9SEAUX EN OP\u00c9RATION</small></div><div class="sectionlabel">Lancer une op\u00e9ration</div><div class="card stack">${selectCountries(target,'spy-target',S.player)}<select id="spy-mission"><option value="recon">Reconnaissance / 30 jours / 35 PP</option><option value="sabotage">Sabotage industriel / 60 jours / 65 PP</option><option value="resistance">Soutenir la r\u00e9sistance / 60 jours / 65 PP</option></select>${btn('Activer le r\u00e9seau','spyForm',{},'primary small',c.spies.length>=3)}</div>
      <div class="sectionlabel">Op\u00e9rations en cours</div><div class="stack">${c.spies.map(s=>`<div class="card"><div class="row between"><strong style="font-size:12px">${esc(countryName(s.target))}</strong>${tag(s.mission)}</div><small>${Math.floor(s.progress)}/${s.days} jours</small><div style="margin-top:7px">${bar(s.progress/s.days*100)}</div></div>`).join('')||'<div class="empty">Aucun r\u00e9seau en mission.</div>'}</div><div class="sectionlabel">Dossiers nationaux</div><div class="stack">${Object.entries(c.intel).sort((a,b)=>b[1]-a[1]).map(([id,v])=>`<div class="card">${metric(esc(countryName(id)),Math.round(v)+' %')}${bar(v,'#94b6bb')}<small>${v>=45?'Ordre de bataille estim\u00e9 accessible':'Renseignements insuffisants sur l\u2019arm\u00e9e'}</small></div>`).join('')||'<div class="empty">Les missions de reconnaissance construisent vos dossiers.</div>'}</div>
      <p class="note" style="margin-top:15px">Le sabotage d\u00e9grade l\u2019industrie ; la r\u00e9sistance augmente les troubles dans les territoires occup\u00e9s. Les op\u00e9rations sont abstraites, sans agents individuels.</p>`;
  }
  if(tab==='focus'){
    const tree=focusTree(),f=c.focus?tree.find(f=>f.id===c.focus.id):null;
    html=panelHeader('Priorit\u00e9s nationales',CATALOG.focus[S.player]?'Un arbre propre \u00e0 votre nation.':'Un arbre commun pour les puissances secondaires.')+`
      <div class="focus-current"><div class="eyebrow">${f?'PROGRAMME EN COURS':'NOUVELLE ORIENTATION'}</div><h3>${f?esc(f.name):'Fixer les priorit\u00e9s de l\u2019\u00c9tat'}</h3><p class="note">${f?effectText(f.effect):'Industrie, d\u00e9fense, diplomatie : chaque branche ouvre de nouveaux choix.'}</p>${f?bar(c.focus.progress/f.days*100)+`<small>${c.focus.progress}/${f.days} jours</small>`:''}</div>
      <div style="margin:15px 0">${btn('Afficher l\u2019arbre complet '+icon('arrow'),'focusTree',{},'primary wide')}</div>
      <div class="sectionlabel">Programmes accessibles</div><div class="stack">${tree.filter(f=>!c.focusDone.includes(f.id)&&f.req.every(r=>c.focusDone.includes(r))&&(!f.exclusive||!c.focusDone.includes(f.exclusive))).map(f=>`<div class="card"><h3 style="font-size:19px">${esc(f.name)}</h3><p class="note" style="margin:7px 0">${effectText(f.effect)}</p><small>${f.days} jours</small><div style="margin-top:10px">${btn('Activer','focus',{id:f.id},'small wide',!!c.focus)}</div></div>`).join('')||'<div class="empty">Achevez le programme en cours pour ouvrir de nouvelles branches.</div>'}</div>
      <div class="sectionlabel">Programmes achev\u00e9s / ${c.focusDone.length}</div><div class="stack">${c.focusDone.map(id=>`<div class="card row">${icon('check')}<span>${esc(tree.find(f=>f.id===id)?.name||id)}</span></div>`).join('')}</div>`;
  }
  if(tab==='journal'){
    html=panelHeader('Journal de campagne','\u00c9v\u00e9nements, rapports et \u00e9volution du monde.')+`
      <div class="grid2"><div class="card stat">${S.units.length}<small>DIVISIONS SIMUL\u00c9ES</small></div><div class="card stat">${S.wars.length}<small>RELATIONS DE GUERRE</small></div></div>
      <div class="row wrap" style="margin:14px 0">${btn('Tableau mondial','ledger',{},'small')}${btn('Diagnostics','diagnostics',{},'small')}${btn('Sources','sources',{},'small')}</div>
      ${S.log.map(e=>`<div class="logentry ${esc(e.type)}"><div class="eyebrow">${dateText(e.day)}</div><p>${esc(e.text)}</p></div>`).join('')}`;
  }
  if(tab==='campaign')html=campaignPanel();
  if(tab==='nation')html+=politicalExtension();
  if(tab==='army')html+=operationExtension();
  $('panel').innerHTML=html;$('panel').scrollTop=force?scroll:scroll;hydratePortraits();
}



// 1.3: a simulated institutional / fiscal cabinet. Indices are not archival data.
const TAX_LABEL={low:'Fiscalité réduite',standard:'Fiscalité ordinaire',high:'Fiscalité élevée'};
const WELFARE_LABEL={austerity:'Dépenses limitées',standard:'Services essentiels',expanded:'Services publics élargis'};
const RATION_LABEL={none:'Consommation libre',limited:'Rationnement limité',severe:'Rationnement sévère'};
const SYSTEM_LABEL={market:'Marché décentralisé',mixed:'Économie mixte',planned:'Planification industrielle'};
const RIGHTS_LABEL={restricted:'Institutions restrictives',regulated:'Institutions encadrées',protected:'Garanties civiles renforcées'};
function lineChart13(history,field,color){
  const values=(Array.isArray(history)?history:[]).slice(-36).map(x=>Number(x?.[field])).filter(Number.isFinite);
  if(values.length<2)return `<div class="note" style="margin-top:10px">Graphique disponible après deux bilans mensuels.</div>`;
  const lowest=Math.min(...values),span=Math.max(.001,Math.max(...values)-lowest);
  const coords=values.map((v,i)=>`${(i*280/(values.length-1)).toFixed(1)},${(65-(v-lowest)/span*52).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 280 76" role="img" aria-label="Évolution mensuelle de ${esc(field)}" style="width:100%;height:90px;background:#142629;border:1px solid #314547;margin-top:8px;border-radius:4px"><path d="M0 65H280M0 39H280M0 13H280" stroke="#405759" opacity=".55"/><polyline fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round" points="${coords}"/></svg>`;
}
function policyButtons13(kind,options,current){
  const c=nation(),m=c.macro,until=m.cooldown[kind]||0,days=Math.max(0,until-S.day);
  const cost=kind==='system'?65:30;
  const optionsHTML=Object.entries(options).map(([value,label])=>{
    const blocked=value==='severe'&&kind==='ration'&&!S.wars.some(w=>w.a===S.player||w.b===S.player)&&c.support<65;
    return btn(esc(label),'macroPolicy',{kind,value},'small '+(current===value?'active':''),
      current===value||days>0||c.pp<cost||blocked);
  }).join('');
  return `<div class="policy-options">${optionsHTML}</div>${days>0?`<small class="gold">Transition en cours : encore ${days} jour(s).</small>`:''}`;
}
function renderTreasury13(){
  const c=nation(),m=c.macro,p=c.politics,ratio=m.debt/Math.max(1,m.gdp);
  const creditRoom=Math.max(0,m.gdp*12-m.debt),reliefDays=Math.max(0,(m.cooldown.relief||0)-S.day);
  return panelHeader('Budget et économie','Finances publiques fictives de la simulation — crédits et indice PIB, non statistiques historiques.')+`
    <div class="grid2">
      <div class="card stat gold">${num(m.treasury)}<small>TRÉSOR PUBLIC · CRÉDITS</small></div>
      <div class="card stat ${ratio>3?'bad':''}">${num(m.debt)}<small>DETTE PUBLIQUE · CRÉDITS</small></div>
      <div class="card stat">${num(m.gdp)}<small>PIB · INDICE DE JEU</small></div>
      <div class="card stat">${m.inflation.toFixed(1)} %<small>INFLATION ANNUALISÉE</small></div>
    </div>
    <div class="sectionlabel">Solde budgétaire quotidien</div>
    <div class="card">${metric('Recettes fiscales',num(m.budget.income), 'good')}
      ${metric('Dépenses publiques',num(m.budget.spending))}
      ${metric('Intérêts de la dette',num(m.budget.interest))}
      <hr>${metric('Solde / jour',`${m.budget.balance>=0?'+':''}${m.budget.balance.toFixed(1)}`,m.budget.balance>=0?'good':'bad')}
      ${metric('Dette / indice PIB',ratio.toFixed(2)+' ×',ratio>3?'bad':'')}
      ${metric('Marge de financement',num(creditRoom)+' crédits',creditRoom<330?'bad':'')}
      ${metric('Arriérés non financés',num(m.arrears||0)+' crédits',m.arrears>0?'bad':'good')}
      ${metric('Prévision du solde sur 30 jours',num(m.budget.balance*30)+' crédits',m.budget.balance<0?'bad':'good')}
      ${metric('Emploi · indice',m.employment.toFixed(0)+' %')}
      ${metric('Rendement économique',percent(m.output))}
      ${bar(m.output/1.35*100,m.output<.7?'#c98070':'#91ba9e')}
    </div>
    <div class="sectionlabel">Loi fiscale</div><div class="card stack">
      ${policyButtons13('tax',TAX_LABEL,m.tax)}<small>Une fiscalité élevée accroît les recettes mais pèse sur la production et les tensions sociales. Chaque modification coûte 30 PP et impose une transition de 45 jours.</small>
    </div>
    <div class="sectionlabel">Services publics</div><div class="card stack">
      ${policyButtons13('welfare',WELFARE_LABEL,m.welfare)}<small>Les services élargis apaisent les tensions, mais augmentent les dépenses et mobilisent davantage d'usines civiles.</small>
    </div>
    <div class="sectionlabel">Organisation économique</div><div class="card stack">
      ${policyButtons13('system',SYSTEM_LABEL,m.system)}<small>Changer le système coûte 65 PP ; les effets sur le rendement et le budget sont recalculés chaque jour.</small>
    </div>
    <div class="sectionlabel">Rationnement civil</div><div class="card stack">
      ${policyButtons13('ration',RATION_LABEL,m.ration)}<small>Le rationnement libère des capacités de construction en contrepartie d'une hausse des tensions sociales. Le rationnement sévère exige une situation de mobilisation.</small>
    </div>
    <div class="sectionlabel">Opérations du Trésor</div>
    <div class="stack">
      ${btn('Émettre des obligations : +300 crédits / +330 dette / 15 PP','treasury',{kind:'bond'},'small wide',creditRoom<330||c.pp<15)}
      ${btn('Rembourser jusqu’à 125 crédits de dette','treasury',{kind:'repay'},'small wide',m.debt<1||m.treasury<1)}
      ${btn('Programme civil à la capitale / 360 crédits + 20 PP','treasury',{kind:'investCiv'},'small wide',m.treasury<360||c.pp<20)}
      ${btn('Moderniser le rail de la capitale / 180 crédits','treasury',{kind:'investRail'},'small wide',m.treasury<180)}
      ${btn('Aide sociale d’urgence / 140 crédits','treasury',{kind:'relief'},'small wide',m.treasury<140||reliefDays>0)}
      ${reliefDays>0?`<small class="gold">Nouvelle aide sociale possible dans ${reliefDays} jours.</small>`:''}
      ${m.arrears>0?`<p class="bad">Crise des finances publiques : les dépenses non financées pèsent sur la production et les tensions sociales. Les recettes excédentaires résorbent prioritairement les arriérés.</p>`:''}
    </div>
    <div class="sectionlabel">Historique du Trésor · ${m.history.length} mois</div>
    <div class="card"><small>Trésorerie nationale, bilans mensuels</small>${lineChart13(m.history,'treasury','#d7be85')}<small>Les décisions influencent la production, les usines civiles libres, la stabilité et les tensions.</small></div>
    <p class="note" style="margin-top:15px">Tous les crédits, PIB et pourcentages d'emploi sont des indices abstraits de jeu, non des valeurs historiques nationales. Les transitions politiques ne modifient pas automatiquement le dirigeant représenté par sa photographie.</p>`;
}
function renderPolitics13(){
  const c=nation(),p=c.politics,m=c.macro,elec=p.election;
  const democratic=c.ideology==='democratic';
  return panelHeader('Institutions et société','Gouvernement, coalition, droits civiques, légitimité et mouvements d’opinion simulés.')+`
    <div class="leader-card">${portrait(S.player)}<div><h3>${esc(code(S.player).leader)}</h3><small>${esc(code(S.player).role)}</small>${tag(IDEO[c.ideology])}</div></div>
    <div class="grid2" style="margin-top:12px">
      <div class="card stat ${p.legitimacy<35?'bad':''}">${Math.round(p.legitimacy)} %<small>LÉGITIMITÉ</small></div>
      <div class="card stat ${p.unrest>60?'bad':''}">${Math.round(p.unrest)} %<small>TENSIONS SOCIALES</small></div>
      <div class="card stat">${Math.round(c.stability)} %<small>STABILITÉ</small></div>
      <div class="card stat">${Math.round(c.support)} %<small>SOUTIEN À LA GUERRE</small></div>
    </div>
    <div class="sectionlabel">Courants politiques (simulation)</div>
    <div class="card"><div class="partybar">${Object.entries(c.parties).map(([k,v])=>`<i style="width:${Math.max(0,v)}%;background:${PARTYC[k]}"></i>`).join('')}</div>
      ${Object.entries(c.parties).map(([k,v])=>metric(esc(IDEO[k]||k),v.toFixed(1)+' %')).join('')}
    </div>
    <div class="sectionlabel">Cabinet et institutions</div>
    <div class="card stack">
      ${metric('Coalition / courant au pouvoir',esc(p.coalition.map(k=>IDEO[k]||k).join(' + ')))}
      ${metric('Droits civiques',esc(RIGHTS_LABEL[p.rights]))}
      ${metric('Dernier scrutin',elec.lastDay===null?'Aucun scrutin simulé':dateText(elec.lastDay))}
      ${democratic?metric('Prochain scrutin simulé',dateText(elec.nextDay)):metric('Calendrier électoral','Non applicable')}
      ${elec.result?`<hr><small>Résultat électoral simulé du ${dateText(elec.result.day)} :</small><div class="note">${Object.entries(elec.result.votes).map(([k,v])=>`${esc(IDEO[k]||k)} ${v.toFixed(1)} %`).join(' · ')}</div>`:''}
    </div>
    <div class="sectionlabel">Réformes institutionnelles · 55 PP</div>
    <div class="stack">
      ${Object.entries(RIGHTS_LABEL).map(([value,label])=>btn(esc(label),'civicReform',{value},'small wide '+(value===p.rights?'active':''),value===p.rights||c.pp<55||(p.cooldown.rights||0)>S.day)).join('')}
      ${(p.cooldown.rights||0)>S.day?`<small class="gold">Réforme suivante dans ${(p.cooldown.rights||0)-S.day} jours.</small>`:''}
    </div>
    <div class="sectionlabel">Négociations politiques</div><div class="stack">
      ${btn('Former une coalition parlementaire / 45 PP','coalitionTalk',{},'small wide',!democratic||c.pp<45||(p.cooldown.coalition||0)>S.day)}
      ${btn('Organiser une élection anticipée / 80 PP','earlyElection',{},'small wide',!democratic||c.pp<80||(elec.lastDay!==null&&S.day-elec.lastDay<365))}
      ${Object.keys(c.parties).map(ideology=>btn('Campagne : '+esc(IDEO[ideology])+' / 60 PP','politicalCampaign',{ideology},'small wide',c.politicalCooldown>S.day)).join('')}
      ${btn('Changer le régime (majorité de 55 % + 100 PP)','governmentForm',{},'small wide')}
      ${btn('Ouvrir les lois de mobilisation','tab',{id:'nation'},'small wide')}
    </div>
    <div class="sectionlabel">Tensions sociales · ${p.history.length} bilans</div>
    <div class="card"><small>Indice de tensions, relevé mensuel</small>${lineChart13(p.history,'unrest','#c98a7d')}
      <small>Les politiques fiscales, les services, les restrictions, les conflits et l’inflation influencent les tensions. Une grève peut réduire la production pendant 22 jours.</small></div>
    <p class="note" style="margin-top:15px">Élections et coalitions sont des mécanismes d'histoire alternative : les résultats sont calculés, pas extraits d'archives. Les chefs d’État historiques ne sont pas automatiquement remplacés par des personnes inventées.</p>`;
}

function warfarePanel(){
  const us=ownUnits(),attacks=S.battles.filter(b=>b.a===S.player||b.b===S.player);
  const reports=(S.combatLedger||[]).filter(r=>r.a===S.player||r.b===S.player).slice(0,45);
  const pockets=us.filter(u=>u.pocketed),atWar=S.wars.some(w=>w.a===S.player||w.b===S.player);
  const armies=S.armies.filter(a=>a.owner===S.player);
  return panelHeader("Centre de guerre","Fronts, doctrine tactique, encerclements et rapports d'operation.")+`
    <div class="war-stats">
      <div class="card stat">${attacks.length}<small>BATAILLES ACTIVES</small></div>
      <div class="card stat ${pockets.length?'bad':''}">${pockets.length}<small>DIVISIONS ISOLÉES</small></div>
      <div class="card stat">${num(nation().casualties)}<small>PERTES CUMULÉES</small></div>
      <div class="card stat">${Math.round(nation().stats.supply*100)} %<small>RAVITAILLEMENT MOYEN</small></div>
    </div>
    <div class="row wrap" style="margin:14px 0">${btn('Salle des opérations','operations',{},'primary small')}${btn(showPockets?'Masquer les poches':'Voir les poches','togglePockets',{},'small')}</div>
    <p class="note">${atWar?'Les fronts sont actifs. Les encerclements sont recalculés tous les deux jours et affaiblissent les divisions.':'Aucune guerre impliquant votre pays. Préparez des armées et leur doctrine.'}</p>
    <div class="sectionlabel">État des armées</div>
    <div class="stack">${armies.map(a=>`
      <div class="card war-army">
        <div class="row between"><strong>${esc(a.name)}</strong>${tag({balanced:'Interarmes',spearhead:'Percée',elastic:'Défense élastique'}[a.tactic]||'Interarmes')}</div>
        ${metric('Mission',a.target?esc(countryName(a.target))+' / '+esc(a.order):'En attente')}
        ${metric('Préparation',percent(a.planning))}
        ${metric('Aptitude au combat',a.assessment?.ready===undefined?'Non évaluée':a.assessment.ready+' %')}
        ${a.assessment?.pockets?`<small class="bad">${a.assessment.pockets} division(s) isolée(s)</small>`:''}
        ${btn('Organiser cette armée','openArmyOps',{army:a.id},'small wide')}
      </div>`).join('')||'<p class="note">Aucune armée.</p>'}</div>
    <div class="sectionlabel">Combats en cours</div>
    <div class="stack">${attacks.slice(0,14).map(b=>`<div class="card">
      <div class="row between"><strong>${esc(pname(b.pid))}</strong>${tag(b.a===S.player?'OFFENSIVE':'DÉFENSE')}</div>
      <small>${esc(b.weather)} / ${esc(b.terrain)}${b.river?' / franchissement de fleuve':''}</small>
      <div style="margin:9px 0">${bar(b.ratio*100,'#c5a46e')}</div>
      ${metric('Puissance relative',num(b.ap)+' / '+num(b.dp))}
      ${btn('Voir sur la carte','focusReport',{pid:b.pid},'small')}
    </div>`).join('')||'<p class="note">Aucun combat actif.</p>'}</div>
    <div class="sectionlabel">Rapports tactiques</div>
    <small class="note">Journal limité à 160 entrées. Les pertes indiquent les effectifs bruts perdus dans les engagements échantillonnés, non le total de la guerre.</small>
    <div class="stack" style="margin-top:12px">${reports.map(r=>`<button class="battle-entry" data-a="focusReport" data-p="${encodeURIComponent(JSON.stringify({pid:r.pid}))}">
      <span class="eyebrow">${dateText(r.day)} / ${esc({engaged:'Engagement',breakthrough:'Percée',repulsed:'Attaque repoussée',unopposed:'Occupation sans combat'}[r.outcome]||r.outcome)}</span><strong>${esc(pname(r.pid))}</strong>
      <small>${esc(countryName(r.a))} / ${esc(countryName(r.b))}</small>
      <span class="row between"><small>Attaquants : -${num(r.lossesA)}</small><small>Défenseurs : -${num(r.lossesD)}</small></span>
    </button>`).join('')||'<p class="note">Les premières batailles renseigneront ce journal.</p>'}</div>
    ${pockets.length?`<div class="sectionlabel">Divisions dans les poches</div><div class="stack">${pockets.slice(0,12).map(u=>btn(esc(u.name)+' / '+esc(pname(u.pid)),'focusReport',{pid:u.pid},'small')).join('')}</div>`:''}`;
}
/* Map inspector and army ribbons */
function renderInspector(){
  if(pid===null){$('inspector').style.display='none';return;}
  const p=WORLD.provinces[pid],q=S?.provinces[pid],owner=control(pid),mine=S&&owner===S.player;
  const battle=S?.battles.find(b=>b.pid===pid),units=S?.units.filter(u=>u.pid===pid&&u.owner===S.player)||[];
  $('inspector').style.display='block';$('inspector').innerHTML=`<div class="row between"><span class="eyebrow">${p.capital?'CAPITALE':p.city?'VILLE STRAT\u00c9GIQUE':'PROVINCE'} / ${pid}</span>${btn(icon('close'),'deselectProvince',{},'iconbtn ghost')}</div><h3>${esc(p.name)}</h3><div class="row"><div class="inspector-flag" style="background:${esc(code(owner).color)}"></div><div><div style="font-size:12px">${esc(countryName(owner))}</div><div class="inspector-sub">${CATALOG.terrain[p.terrain].name}${q&&owner!==p.owner?' / territoire occup\u00e9':''}</div></div></div>
    <div class="grid2"><div class="stat">${p.vp}<small>POINTS DE VICTOIRE</small></div><div class="stat">${q?percent(q.supply):'\u2014'}<small>RAVITAILLEMENT</small></div></div>
    ${q?`${metric('Usines civiles / militaires',q.civ+' / '+q.mil)}${metric('Infrastructure / rail',q.infra+' / '+q.rail)}${metric('Fort / port / base a\u00e9rienne',q.fort+' / '+q.port+' / '+q.airbase)}${q.resistance>0?metric('R\u00e9sistance',Math.round(q.resistance)+' %','bad'):''}${q.damage>.01?metric('Dommages',percent(q.damage),'bad'):''}`:''}
    ${units.some(u=>u.pocketed)?`<p class="bad">Poche isolée : risque d'attrition et de rupture organisationnelle.</p>`:''}
    ${units.length?`<div style="margin-top:12px">${btn('S\u00e9lectionner '+units.length+' division(s)','selectProvince',{},'small wide')}</div>`:''}
    ${S&&!mine?`<div style="margin-top:9px">${btn('Ouvrir la diplomatie','countryDiplomacy',{id:owner},'small wide')}</div>`:''}
    ${S&&mine?`<div style="margin-top:9px">${btn('Construire ici','constructionHere',{},'small wide')}</div>`:''}
    ${battle?`<hr><div class="eyebrow bad">BATAILLE EN COURS</div><small>${battle.weather} / largeur ${battle.width}/${battle.maxWidth}</small>${bar(battle.ratio*100,'#ca9a7e')}<div style="margin-top:10px">${btn('Rapport de bataille','battle',{pid},'small wide')}</div>`:''}${historyInspector(p)}`;
}
function renderSelection(){
  const el=$('selection-toolbar');if(!S||!selected.size){el.style.display='none';return;}
  el.style.display='block';el.innerHTML=`<div class="row between"><div class="label">${selected.size} DIVISION(S) S\u00c9LECTIONN\u00c9E(S)</div>${btn('\u00d7','clearUnits',{},'small ghost')}</div><div class="row wrap" style="margin-top:7px">${btn(icon('arrow')+' Ordre','orderMode',{},orderMode?'active':'')}${btn('Arr\u00eat','halt',{ids:[...selected]})}${btn('Arm\u00e9es','tab',{id:'army'})}</div>`;
}
function renderArmies(){
  $('army-tray').innerHTML=S?S.armies.filter(a=>a.owner===S.player).map(a=>{const count=S.units.filter(u=>u.owner===S.player&&u.army===a.id).length;return `<button class="army-chip ${a.id===army?'selected':''}" data-a="selectArmy" data-p="${encodeURIComponent(JSON.stringify({id:a.id}))}"><b>${count}</b><div>${esc(a.name)}<small>${a.auto?(a.order==='attack'?'OFFENSIVE':'FRONT ACTIF'):'CONTR\u00d4LE MANUEL'}</small></div></button>`;}).join(''):'';
}

/* Main menus */
let modPreviewInput14=null,modPreviewCache14=null;
function previewWorld14(){
  if(!mod)return {world:BASE_WORLD,countries:BASE_WORLD.countries,provinces:BASE_WORLD.provinces,mapId:BASE_WORLD.mapId};
  if(modPreviewInput14===mod&&modPreviewCache14)return modPreviewCache14;
  const preview=Rules.previewModWorld(mod,BASE_WORLD,CATALOG);
  modPreviewInput14=mod;modPreviewCache14=preview;
  return preview;
}
function downloadJson14(name,data){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function showStart(){
  if(mod?.scenario?.bookmark)startBookmark=mod.scenario.bookmark;
  const startWorld=previewWorld14(),startDefs=Object.fromEntries(startWorld.countries.map(c=>[c.id,c]));
  if(!startDefs[selectedCountry])selectedCountry='FRA';
  if((CATALOG.bookmarks.find(b=>b.id===startBookmark)?.unavailable||[]).includes(selectedCountry))selectedCountry='FRA';
  const d=previewIdentity(startDefs[selectedCountry]),resume=(()=>{try{return !!(localStorage.getItem('frontieres-v4-autosave')||localStorage.getItem('frontieres-v4-autosave'));}catch{return false;}})();
  pauseGame();modalKind='start';
  modal(`<div class="start-grid"><section class="start-intro"><div class="start-brand"><span class="badge-square">F</span>FRONTI\u00c8RES</div><div class="eyebrow">UN MONDE \u00c0 LA CROIS\u00c9E DES CHEMINS</div><h1>L\u2019histoire n\u2019est<br>pas encore <em>\u00e9crite.</em></h1><p>Industrialisez votre pays. Organisez vos arm\u00e9es. Tissez vos alliances. Le monde de 1936 entre dans une nouvelle \u00e8re d\u2019incertitude.</p><div class="start-stats"><div class="stat">${startWorld.countries.length}<small>PAYS JOUABLES</small></div><div class="stat">${startWorld.provinces.length.toLocaleString('fr-FR')}<small>PROVINCES</small></div><div class="stat">01<small>MONDE PERSISTANT</small></div></div>${tag('VERSION 1.5 / ATELIER DE CARTES','gold')}${mod?.scenario?`<p class="note" style="margin-top:10px;color:var(--gold)">${esc(mod.scenario.title)} · ${dateText(mod.scenario.startDay??(mod.scenario.bookmark==='1939'?1338:0))}. ${esc(mod.scenario.description||'')}</p>`:''}<p class="note" style="margin-top:12px">Jeu original de grande strat\u00e9gie. G\u00e9ographie r\u00e9elle ; provinces, fronti\u00e8res de 1936 et valeurs militaires simplifi\u00e9es. Aucun fichier de Hearts of Iron IV.</p><div style="margin-top:11px">${btn('Ouvrir l\u2019atlas 1936-1945 \u2197','atlas',{},'small ghost')}${btn('Sources et portraits','sources',{},'small ghost')}</div></section>
    <section class="start-right"><div class="eyebrow">NOUVELLE CAMPAGNE</div><h2>Choisissez votre nation</h2><p class="note">Vous dirigez l\u2019\u00c9tat, pas seulement son arm\u00e9e.</p><div class="start-countries">${[...['FRA','GER','GBR','SOV','USA','ITA','JPN','CHI'],...((mod?.newCountries||[]).map(c=>c.id))].map(id=>btn(`<span class="code">${id}</span><strong>${esc(startDefs[id].name)}</strong>`,'chooseCountry',{id},'country-choice '+(selectedCountry===id?'selected':''))).join('')}</div><div class="start-select"><span class="label">TOUS LES PAYS</span><select id="start-country">${[...startWorld.countries].sort((a,b)=>a.name.localeCompare(b.name,'fr')).map(c=>`<option value="${c.id}" ${selectedCountry===c.id?'selected':''} ${(CATALOG.bookmarks.find(b=>b.id===startBookmark)?.unavailable||[]).includes(c.id)?'disabled':''}>${esc(c.name)}</option>`).join('')}</select></div>
      <div class="start-profile"><div class="row" style="gap:15px">${portrait(selectedCountry,'large',d)}<div><h3 style="font-size:26px">${esc(d.leader)}</h3><small style="display:block;margin:7px 0">${esc(d.role)}</small>${tag(IDEO[d.ideology])}</div></div><div class="profile-stats"><div class="stat">${d.civ+d.mil}<small>USINES</small></div><div class="stat">${d.divisions}<small>DIVISIONS</small></div><div class="stat">${num(d.manpower)}<small>R\u00c9SERVES</small></div><div class="stat">${d.mil>17?3:2}<small>RECHERCHE</small></div></div><p class="note" style="font-size:10px">${esc(d.description)}</p></div>
      <div class="start-options"><label><span class="label">POINT DE D\u00c9PART</span><select id="start-bookmark">${CATALOG.bookmarks.map(b=>`<option value="${b.id}" ${b.id===startBookmark?'selected':''}>${esc(b.name)}</option>`).join('')}</select></label><div class="note bookmark-note">${esc(CATALOG.bookmarks.find(b=>b.id===startBookmark)?.description||'')}</div></div><div class="start-options"><label><span class="label">CHRONOLOGIE</span><select id="start-scenario"><option value="historical" ${startHistorical==='historical'?'selected':''}>Dynamique historique conditionnelle</option><option value="sandbox" ${startHistorical==='sandbox'?'selected':''}>Diplomatie libre</option></select></label><label><span class="label">MOD DE DONN\u00c9ES</span>${btn(esc(mod?.name||'Aucun mod actif')+' \u2197','mods',{},'wide small')}</label></div>
      <div class="start-options"><label><span class="label">OBJECTIF DE CAMPAGNE</span><select id="start-campaign"><option value="development" ${startCampaign==='development'?'selected':''}>Puissance nationale / développement</option><option value="strategic" ${startCampaign==='strategic'?'selected':''}>Victoire stratégique / conquête</option><option value="sandbox" ${startCampaign==='sandbox'?'selected':''}>Bac à sable / sans fin imposée</option></select></label><label><span class="label">DIFFICULTÉ</span><select id="start-difficulty"><option value="relaxed" ${startDifficulty==='relaxed'?'selected':''}>Découverte / combat IA -12 %</option><option value="standard" ${startDifficulty==='standard'?'selected':''}>Standard / sans bonus</option><option value="veteran" ${startDifficulty==='veteran'?'selected':''}>Vétéran / combat IA +12 %</option></select></label></div>
      <div class="row">${btn('PRENDRE LES COMMANDES '+icon('arrow'),'start',{},'primary start-launch')}${resume?btn('Reprendre','resume',{},'small'):''}${S?btn('Retour','close',{},'small'):''}</div><div class="start-small">Calculs et sauvegardes locaux. Portraits : archives Wikimedia en ligne, avec sources et licences accessibles.</div></section></div>`,'start','start-modal');
  renderTop();
}
async function launch(){
  selectedCountry=$('start-country')?.value||selectedCountry;const historical=$('start-scenario')?.value!=='sandbox';const campaign=$('start-campaign')?.value||'development',difficulty=$('start-difficulty')?.value||'standard';
  const launchButton=$('modal').querySelector('[data-a=start]');if(launchButton){launchButton.disabled=true;launchButton.textContent='INITIALISATION DU MONDE...';}
  selected.clear();army=null;pid=previewWorld14().countries.find(c=>c.id===selectedCountry)?.capital??DEF.FRA.capital;seenEvent='';lastAuto=-1;
  const oldWorld=WORLD;
  try{installVisualWorld(previewWorld14().world);await send('new',{world:BASE_WORLD,catalog:CATALOG,player:selectedCountry,options:{historical,seed:19360101,campaign,difficulty,scenario:startBookmark},mod});$('overlay').style.display='none';modalKind='';centerOn(pid,3.4);tab='campaign';renderRail();renderPanel(true);if(firstGame){toast('La campagne est en pause. Choisissez vos recherches et votre priorit\u00e9, puis appuyez sur Espace.');firstGame=false;}}
  catch(e){installVisualWorld(oldWorld);toast(e.message,true);showStart();}
}
function showMenu(){pauseGame();modal(`${modalHead('Menu de campagne')}<div class="stack">${btn('Reprendre la campagne','close',{},'primary wide',!S)}${btn(icon('save')+' Exporter la sauvegarde JSON','save',{},'wide',!S)}${btn(icon('folder')+' Importer une sauvegarde','load',{},'wide')}${btn('Nouvelle campagne','new',{},'wide')}${btn('Mods de donn\u00e9es','mods',{},'wide')}${btn('Emplacements de sauvegarde','saveSlots',{},'wide')}${btn('Préférences','settings',{},'wide')}${btn('Performance et diagnostic','performance15',{},'wide')}${btn('Dossier de campagne','tab',{id:'campaign'},'wide',!S)}${btn('Centre de guerre','tab',{id:'warfare'},'wide',!S)}${btn('Politique et institutions 1.3','tab',{id:'politics'},'wide',!S)}${btn('Trésor et macroéconomie 1.3','tab',{id:'treasury'},'wide',!S)}${btn('Manuel et raccourcis','help',{},'wide')}${btn('Sources et portraits','sources',{},'wide')}${btn('Diagnostics du moteur','diagnostics',{},'wide',!S)}</div><p class="note" style="margin-top:18px">Autosauvegarde tous les 20 jours de jeu si le stockage du navigateur l\u2019autorise. Exportez une copie pour la conserver.</p>`,'menu','narrow');}
function exportSave(){if(!S)return;const blob=new Blob([JSON.stringify(S)],{type:'application/json'}),a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=`Frontieres-${S.player}-${new Date(Date.UTC(1936,0,1+S.day)).toISOString().slice(0,10)}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);toast('Sauvegarde export\u00e9e.');}
async function loadSave(raw){seenEvent='';selected.clear();army=null;pid=null;const oldWorld=WORLD;try{const candidate=Rules.previewModWorld(raw.mod||null,BASE_WORLD,CATALOG);installVisualWorld(candidate.world);await send('load',{world:BASE_WORLD,catalog:CATALOG,state:raw});mod=S.mod;modPreviewInput14=null;if(!S.pending&&!S.outcome){$('overlay').style.display='none';modalKind='';}centerOn(code(S.player).capital,3.4);toast('Sauvegarde charg\u00e9e. Le jeu est en pause.');}catch(e){installVisualWorld(oldWorld);toast('Chargement refus\u00e9 : '+e.message,true);}}
function showEvent(){
  const e=S.pending.event;modal(`<div class="row between"><div class="eyebrow">D\u00c9P\u00caCHE / ${dateText(S.day)}</div>${tag('D\u00c9CISION REQUISE','gold')}</div><div class="event-title">${esc(e.title)}</div>${e.history?historicalEventBody(e):`<div class="event-paper"><p>${esc(e.text)}</p></div>`}<div class="event-choices">${e.choices.map((choice,index)=>btn(`<span>${esc(choice.text)}<small style="display:block;margin-top:5px">${effectText(choice.effect||{})}</small>${e.history?(choice.actions||[]).map(a=>`<small class="choice-action">${actionDescription(a)}</small>`).join(''):''}</span>${icon('arrow')}`,'event',{index})).join('')}</div><p class="note" style="margin-top:18px">La campagne est suspendue. Les alternatives peuvent modifier les crises suivantes. Les notices historiques ne garantissent pas un r\u00e9sultat militaire.</p>`,'event','narrow');
}
function showDefeat(){modal(`<div class="result-banner"><div class="eyebrow">FIN DE CAMPAGNE / ${dateText(S.day)}</div><h2>Le gouvernement<br>a capitul\u00e9.</h2><p class="muted">${esc(countryName(S.player))} a perdu sa capacit\u00e9 \u00e0 poursuivre la guerre.</p><div class="grid2" style="margin:25px 0"><div class="card stat">${S.day}<small>JOURS DE CAMPAGNE</small></div><div class="card stat">${num(nation().casualties)}<small>PERTES MILITAIRES</small></div></div><div class="stack">${btn('Nouvelle campagne','new',{},'primary')}${btn('Exporter le bilan','save')}${btn('Consulter la carte','close')}</div></div>`,'defeat','narrow');}
function showTree(){
  if(!S)return;pauseGame();const tree=focusTree(),c=nation(),maxRow=Math.max(...tree.map(f=>f.row)),columns=Math.max(...tree.map(f=>f.col))+1,width=210,gap=50,rowh=109,rowgap=32;
  const links=tree.flatMap(f=>f.req.map(r=>{const parent=tree.find(x=>x.id===r);if(!parent)return '';const x1=parent.col*(width+gap)+width/2,y1=parent.row*(rowh+rowgap)+rowh,x2=f.col*(width+gap)+width/2,y2=f.row*(rowh+rowgap);return `<path d="M${x1},${y1} V${y1+16} H${x2} V${y2}" stroke="${c.focusDone.includes(r)?'#bca978':'#4d625b'}" stroke-width="1.5" fill="none"/>`; })).join('');
  modal(`${modalHead('Priorit\u00e9s de '+countryName(S.player),'GOUVERNEMENT / ARBRE NATIONAL')}<p class="note" style="margin-bottom:15px">${c.focusDone.length}/${tree.length} programmes achev\u00e9s. Un programme actif \u00e0 la fois. Cliquez un n\u0153ud pour voir ses effets.</p><div class="focus-wrapper"><div class="focus-grid" style="grid-template-columns:repeat(${columns},${width}px);width:${columns*width+(columns-1)*gap}px;height:${(maxRow+1)*(rowh+rowgap)-rowgap}px"><svg class="focus-lines" viewBox="0 0 ${columns*width+(columns-1)*gap} ${(maxRow+1)*(rowh+rowgap)-rowgap}" preserveAspectRatio="none">${links}</svg>${tree.map(f=>{const done=c.focusDone.includes(f.id),ready=f.req.every(r=>c.focusDone.includes(r))&&(!f.exclusive||!c.focusDone.includes(f.exclusive)),running=c.focus?.id===f.id;return `<button class="focus-node ${done?'done':running?'running':!ready?'locked':''}" style="grid-column:${f.col+1};grid-row:${f.row+1}" data-a="focusDetail" data-p="${encodeURIComponent(JSON.stringify({id:f.id}))}">${icon(done?'check':!ready?'lock':f.id.includes('industry')||f.id==='arsenals'?'industry':f.id==='air'?'plane':f.id==='navy'?'anchor':'focus')}<span>${esc(f.name)}</span><small>${done?'ACHEV\u00c9':running?'EN COURS':f.days+' JOURS'}</small></button>`;}).join('')}</div></div>`,'focusTree','wide');
}
function showFocusDetail(id){const f=focusTree().find(f=>f.id===id),c=nation();if(!f)return;const ready=f.req.every(r=>c.focusDone.includes(r))&&(!f.exclusive||!c.focusDone.includes(f.exclusive));modal(`${modalHead(f.name,'PRIORIT\u00c9 NATIONALE')}<div class="card"><div class="eyebrow">EFFETS \u00c0 L\u2019ACH\u00c8VEMENT</div><p style="margin-top:12px">${effectText(f.effect)}</p></div><p class="note" style="margin:15px 0">Dur\u00e9e : ${f.days} jours.${f.req.length?' Pr\u00e9requis : '+f.req.map(id=>esc(focusTree().find(x=>x.id===id)?.name||id)).join(', ')+'.':''}${f.exclusive?' Exclut : '+esc(focusTree().find(x=>x.id===f.exclusive)?.name||f.exclusive)+'.':''}</p><div class="row">${btn('Activer ce programme','activateFocus',{id},'primary',!ready||!!c.focus||c.focusDone.includes(id))}${btn('Retour \u00e0 l\u2019arbre','focusTree')}</div>`,'focusDetail','narrow');}
function templateEditor(){pauseGame();modal(`${modalHead('Concevoir une division','ARM\u00c9E / MOD\u00c8LE')}<div class="grid2"><div class="stack">${field('Nom du mod\u00e8le','<input id="tmpl-name" maxlength="70" value="Division personnalis\u00e9e">')}${[['inf','Infanterie',8],['art','Artillerie',1],['tank','Blind\u00e9s',0],['motor','Motoris\u00e9s',0]].map(([k,n,v])=>`<div class="row between"><span>${n}</span><input class="tmpl-stat" id="tmpl-${k}" type="number" min="0" max="15" value="${v}"></div>`).join('')}<label class="row"><input id="tmpl-engineer" class="tmpl-stat" type="checkbox" checked> Compagnie du g\u00e9nie</label><label class="row"><input id="tmpl-logistics" class="tmpl-stat" type="checkbox"> Compagnie logistique</label><label class="row"><input id="tmpl-recon" class="tmpl-stat" type="checkbox"> Reconnaissance (+ vitesse, attaque)</label><label class="row"><input id="tmpl-antiTank" class="tmpl-stat" type="checkbox"> Anti-char (+ perforation)</label><label class="row"><input id="tmpl-hospital" class="tmpl-stat" type="checkbox"> Hôpital de campagne (- pertes d'effectifs)</label></div><div class="card" id="template-preview"></div></div><hr><div class="row">${btn('Enregistrer / 15 XP','saveTemplate',{},'primary')}${btn('Annuler','close')}</div><p class="note" style="margin-top:13px">Les divisions d\u00e9j\u00e0 d\u00e9ploy\u00e9es conservent leur ancien mod\u00e8le. Largeur autoris\u00e9e : 2 \u00e0 45.</p>`,'template');updateTemplatePreview();}
function templateForm(){return {name:$('tmpl-name').value,inf:Number($('tmpl-inf').value),art:Number($('tmpl-art').value),tank:Number($('tmpl-tank').value),motor:Number($('tmpl-motor').value),engineer:$('tmpl-engineer').checked,logistics:$('tmpl-logistics').checked,recon:$('tmpl-recon').checked,antiTank:$('tmpl-antiTank').checked,hospital:$('tmpl-hospital').checked};}
function updateTemplatePreview(){if(!$('template-preview'))return;const stats=Rules.templateStats(templateForm());$('template-preview').innerHTML=`<div class="eyebrow">CAPACIT\u00c9S DU MOD\u00c8LE</div>${metric('Effectifs',num(stats.men))}${metric('Largeur',String(stats.width),stats.width>45?'bad':'')}${metric('Attaque / d\u00e9fense',Math.round(stats.soft)+' / '+Math.round(stats.defense))}${metric('Blindage / perforation',stats.armor+' / '+stats.piercing)}<hr><div class="label">\u00c9quipement requis</div>${Object.entries(stats.eq).filter(([,v])=>v>0).map(([k,n])=>metric(CATALOG.equipment[k].name,num(n))).join('')}`;}
function showBattle(pid){const b=S?.battles.find(b=>b.pid===pid);if(!b){toast('Cette bataille est termin\u00e9e.');return;}pauseGame();modal(`${modalHead('Bataille de '+pname(pid),'RAPPORT OP\u00c9RATIONNEL')}<div class="grid2"><div class="card"><div class="eyebrow">ATTAQUANTS</div><h3 style="margin:9px 0">${esc(countryName(b.a))}</h3>${metric('Divisions engag\u00e9es',b.attackers.length)}${metric('Puissance effective',b.ap)}</div><div class="card"><div class="eyebrow">D\u00c9FENSEURS</div><h3 style="margin:9px 0">${esc(countryName(b.b))}</h3>${metric('Divisions',b.defenders.length)}${metric('Puissance effective',b.dp)}</div></div><div style="margin:18px 0">${bar(b.ratio*100,'#c29b78')}</div><div class="card">${metric('Terrain',CATALOG.terrain[b.terrain].name)}${metric('M\u00e9t\u00e9o',b.weather)}${metric('Largeur utilis\u00e9e',b.width+' / '+b.maxWidth)}${metric('Fortification',S.provinces[pid].fort)}${metric('Franchissement fluvial',b.river?'Oui / attaque -28 %, -12 % avec genie':'Non')}</div><p class="note" style="margin-top:15px">La puissance tient compte de l\u2019organisation, de la force, du blindage, du ravitaillement, de l\u2019aviation, des g\u00e9n\u00e9raux et du terrain. Le rapport n\u2019est pas une probabilit\u00e9 certaine de victoire.</p>`,'battle','narrow');}
function showLedger(){if(!S){toast('Lancez une campagne pour consulter le tableau mondial.');return;}pauseGame();const rows=Object.values(S.countries).filter(c=>c.alive).sort((a,b)=>(b.stats.civ+b.stats.mil)-(a.stats.civ+a.stats.mil));modal(`${modalHead('Situation mondiale','RENSEIGNEMENTS PUBLICS / INDUSTRIE')}<p class="note" style="margin-bottom:15px">Les statistiques industrielles sont publiques dans ce mod\u00e8le. Les effectifs adverses exigent des renseignements ou une alliance.</p><table class="table"><thead><tr><th>Pays</th><th>Usines civ.</th><th>Usines mil.</th><th>Divisions</th><th>Faction</th><th></th></tr></thead><tbody>${rows.map(c=>`<tr class="${c.identity.id===S.player?'player-row':''}"><td>${esc(c.identity.name)}</td><td>${c.stats.civ}</td><td>${c.stats.mil}</td><td>${allied(S.player,c.identity.id)||(nation().intel[c.identity.id]||0)>=45?c.stats.divisionCount:'?'}</td><td>${esc(c.faction==='none'?'\u2014':c.faction)}</td><td>${btn(icon('arrow'),'ledgerCountry',{id:c.identity.id},'small ghost')}</td></tr>`).join('')}</tbody></table>`,'ledger','wide');}
const MOD_EXAMPLE={id:'reconstruction',name:'Reconstruction industrielle',version:1,balance:{production:1.3,research:1.15,combat:1},events:[{id:'reconstruction_aide',day:15,country:'player',title:'Le plan de reconstruction',text:'Une coalition propose de financer les infrastructures et la recherche.',choices:[{text:'Moderniser les usines',effect:{civ:2,pp:-35}},{text:'Financer les laboratoires',effect:{research:.10,pp:-25}}]}],countries:{FRA:{bonus:{stability:5}}}};
const MOD_EXAMPLE14={
  id:'aube_atlantique',name:'Aube atlantique - fiction',version:2,
  scenario:{title:'La Republique atlantique',description:'Une fiction politique originale.',bookmark:'1936',historical:false},
  newCountries:[{id:'ATL',from:'FRA',name:'Republique atlantique',leader:'Jeanne Mercier',ideology:'democratic',color:'#4b91a1',capitalKey:WORLD.provinces.find(p=>p.owner==='FRA'&&p.x<0&&p.x>-4&&p.y>47&&p.y<50)?.geoKey,civ:4,mil:3,divisions:3,manpower:65000}],
  territories:[{to:'ATL',provinceKey:WORLD.provinces.find(p=>p.owner==='FRA'&&p.x<0&&p.x>-4&&p.y>47&&p.y<50)?.geoKey}],
  events:[{id:'atl_parlement',day:15,country:'ATL',title:'Premier congres',text:'L Etat se dote de nouvelles institutions.',choices:[{text:'Adopter une constitution',effect:{pp:25,stability:4},actions:[{type:'flag',key:'constitution',value:true}]}]},
    {id:'atl_industrie',day:35,country:'ATL',when:{flags:{constitution:true}},title:'Le premier budget',text:'Comment investir ?',choices:[{text:'Renforcer les ateliers',effect:{civ:1,pp:-15}}]}],
  focus:{ATL:[{id:'congres',name:'Reunir le Congres',days:35,req:[],col:0,row:0,effect:{pp:35}}]}
};
function showMods(){
  pauseGame();
  const active=mod?Rules.validateMod(mod,BASE_WORLD,CATALOG):null;
  const extra=active?(active.newCountries?.length||0):0;
  const territorial=active?.territories?.length||0;
  modal(`${modalHead('Atelier de mondes','FRONTIERES 1.5 / MODS JSON SANS SCRIPTS')}
    <p class="note">Creez ou combinez des univers alternatifs : Etats jouables, dirigeants, territoires, scenarios, technologies, arbres et evenements conditionnels. Le format historique 1 reste accepte. Le champ map peut dessiner des provinces et leurs liaisons. Un mod se charge avant une nouvelle campagne.</p>
    <div class="card" style="margin:14px 0"><div class="row between"><strong>${esc(active?.name||'Aucun mod selectionne')}</strong>${tag(active?'FORMAT '+active.version:'BASE','gold')}</div>
      <div class="row wrap" style="margin-top:10px">${tag(extra+' pays ajoutes')}${tag(territorial+' transferts')}${tag((active?.events||[]).length+' evenements')}${tag((active?.technologies||[]).length+' technologies')}${tag((active?.map?.addProvinces||[]).length+' nouvelles provinces')}</div>
      ${active?.scenario?`<p class="note" style="margin-top:10px">Scenario : ${esc(active.scenario.title)} / ${esc(active.scenario.bookmark)}. ${esc(active.scenario.description||'')}</p>`:''}
    </div>
    <div class="row wrap" style="margin:12px 0">${btn('Exemple nation','modExample14',{},'small')}${btn('Exemple carte / archipel','modExampleMap',{},'small')}${btn('Importer un JSON','importMod',{},'small')}${btn('Exporter ce JSON','exportMod14',{},'small')}</div>
    <textarea id="mod-editor" spellcheck="false" aria-label="Code JSON du mod">${esc(JSON.stringify(mod||MOD_EXAMPLE14,null,2))}</textarea>
    <div id="mod-diagnostics" role="status" class="card" style="margin-top:12px"><p class="note">Verifiez le paquet avant de le selectionner. Le moteur rejette les references de pays, de territoire et de technologie incoherentes.</p></div>
    <div class="row wrap" style="margin-top:14px">${btn('Previsualiser et verifier','previewMod14',{},'small')}${btn('Valider et selectionner','applyMod',{},'primary')}${btn('Empiler avec le mod actif','stackMod')}${btn('Desactiver','clearMod')}${btn('Campagne','startScreen')}</div>
    <p class="note" style="margin-top:15px">La carte d'origine reste disponible ; un mod peut modifier 180 provinces et en ajouter 120 avec polygones et chemins sur cette base. Le remplacement integral du monde n'est pas encore disponible. Aucune compatibilite directe avec les mods Paradox / TNO. Les personnages inventes dans l'exemple sont fictifs.</p>`, 'mods','wide');
}

function showSources(){pauseGame();const combined={...PORTRAITS,...Object.fromEntries(portraitResolved)};modal(`${modalHead('Sources et archives','HISTOIRE / G\u00c9OGRAPHIE / IMAGES')}<div class="card"><p class="note">Les personnes et les villes utilisent leurs noms historiques. Les valeurs militaires, comp\u00e9tences, ressources et id\u00e9ologies sont des abstractions de jeu. La carte part de fronti\u00e8res modernes de Natural Earth puis applique des corrections sch\u00e9matiques : ce n\u2019est pas un relev\u00e9 historique exact de 1936.</p></div><div class="sectionlabel">R\u00e9f\u00e9rences documentaires</div>${SOURCES.map(s=>`<div class="source-row"><div class="grow"><h4><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} \u2197</a></h4><small>${esc(s.use)}</small></div></div>`).join('')}<div class="sectionlabel">Portraits / attribution</div><div class="card stack"><p class="note">Conservez les photographies dans une copie autonome du jeu. Les licences et attributions sont incluses. La campagne se sauvegarde separement.</p>${btn('Charger les archives pour le mode hors ligne','archivePortraits',{},'small')}${btn('Exporter le jeu avec ces portraits','exportArchiveGame',{},'small',!Object.values(combined).some(r=>r.embedded))}</div><p class="note">Les portraits distants n\u00e9cessitent Internet et peuvent \u00eatre indisponibles. Le programme ne remplace pas une image manquante par une fausse photographie. Certains clich\u00e9s datent d\u2019une autre ann\u00e9e que 1936. Leur licence propre ne devient pas celle du code.</p>${Object.entries(combined).map(([person,a])=>`<div class="source-row"><div class="grow"><h4>${esc(person)} / ${esc(a.year||'date non pr\u00e9cis\u00e9e')}</h4><small>${esc(a.author)}</small><small><a href="${esc(a.licenseURL)}" target="_blank" rel="noopener noreferrer">${esc(a.license)}</a></small><small>${esc(a.changes)}</small><a href="${esc(a.source)}" target="_blank" rel="noopener noreferrer" style="font-size:11px">Voir le fichier source \u2197</a></div></div>`).join('')}<p class="note" style="margin-top:18px">Les codes, drapeaux et portraits ne valent pas approbation des r\u00e9gimes repr\u00e9sent\u00e9s. Le jeu ne reprend aucun asset de Paradox Interactive.</p><div style="margin-top:15px">${btn(S?'Retour au jeu':'Retour \u00e0 la campagne',S?'close':'startScreen')}</div>`,'sources','wide');}
function showHelp(){pauseGame();modal(`${modalHead('Manuel de campagne','FRONTI\u00c8RES / PRISE EN MAIN')}<div class="grid2"><div class="card"><h3>1. Pr\u00e9parer l\u2019\u00c9tat</h3><p class="note" style="margin-top:10px">Choisissez une priorit\u00e9 nationale et affectez vos \u00e9quipes de recherche. Construisez des usines et r\u00e9partissez les lignes de production. Les ressources manquantes ralentissent les arsenaux.</p></div><div class="card"><h3>2. Former les forces</h3><p class="note" style="margin-top:10px">Le recrutement consomme du mat\u00e9riel et des effectifs au lancement. Cr\u00e9ez des mod\u00e8les, affectez vos divisions \u00e0 des arm\u00e9es et choisissez leurs officiers. Une bonne logistique pr\u00e9serve leur organisation.</p></div><div class="card"><h3>3. Donner des ordres</h3><p class="note" style="margin-top:10px">Cliquez une province contenant vos divisions. Faites un clic droit sur une destination. Maintenez Maj pour ajouter des unit\u00e9s ou dessiner une zone de s\u00e9lection. Le bouton Ordre propose une alternative tactile au clic droit.</p></div><div class="card"><h3>4. Planifier un front</h3><p class="note" style="margin-top:10px">Dans Arm\u00e9es, choisissez la nation cible, une posture et une attitude. Activez le plan : les divisions se d\u00e9ploient sur les fronti\u00e8res terrestres accessibles. Une offensive n\u2019attaque que si la guerre a commenc\u00e9.</p></div><div class="card"><h3>5. Ma\u00eetriser l\u2019air et la mer</h3><p class="note" style="margin-top:10px">Affectez les escadres \u00e0 des r\u00e9gions et \u00e0 des missions compatibles. Placez vos flottes pour prot\u00e9ger les convois, mener des raids ou couvrir un d\u00e9barquement. Les ports et bases limitent les op\u00e9rations.</p></div><div class="card"><h3>6. Faire la guerre, conclure la paix</h3><p class="note" style="margin-top:10px">Justifiez un objectif, puis d\u00e9clarez la guerre. Les alli\u00e9s et garants peuvent intervenir. Un pays perdant sa capitale et plus de 65 % de ses points de victoire proches de la m\u00e9tropole capitule. Un armistice peut \u00eatre n\u00e9goci\u00e9 apr\u00e8s 60 jours.</p></div></div><div class="card" style="margin-top:18px"><h3>Raccourcis</h3><p class="note" style="margin-top:10px"><span class="hotkey">Espace</span> Pause / <span class="hotkey">1\u20135</span> Vitesse / <span class="hotkey">A</span> Arm\u00e9es / <span class="hotkey">I</span> Industrie / <span class="hotkey">R</span> Recherche / <span class="hotkey">D</span> Diplomatie / <span class="hotkey">P</span> Priorit\u00e9s / <span class="hotkey">F</span> Recentrer / <span class="hotkey">\u00c9chap</span> Fermer.</p></div><p class="note" style="margin-top:18px">Limites de cette version : simulation journali\u00e8re, fronti\u00e8res et routes maritimes simplifi\u00e9es, huit arbres nationaux distincts, marine agr\u00e9g\u00e9e, IA heuristique. Pas de multijoueur, de compatibilit\u00e9 avec les mods HOI4, ni de reproduction de toutes ses extensions. Les textes des \u00e9v\u00e9nements sont originaux.</p><div style="margin-top:17px">${btn(S?'Revenir au jeu':'Choisir une nation',S?'close':'startScreen',{},'primary')}</div>`,'help','wide');}

/* UI actions */
const direct=new Set(['macroPolicy','treasury','civicReform','coalitionTalk','earlyElection','politicalCampaign','pause','speed','production','autoProduction','build','cancelBuild','prioritizeBuild','research','cancelResearch','recruit','cancelTraining','halt','assignArmy','airReinforce','relations','alliance','access','guarantee','pact','justify','peace','trade','cancelTrade','cancelLease','spy','law','decision','event']);
document.addEventListener('click',async ev=>{
  const b=ev.target.closest('[data-a]');if(!b||b.disabled)return;const action=b.dataset.a;let p={};try{p=JSON.parse(decodeURIComponent(b.dataset.p||'%7B%7D'));}catch{return;}
  if(direct.has(action)){if(!S){toast('Choisissez d\u2019abord une nation.');return;}fire(action,p);return;}
  try{
    if(await releaseAction(action,p))return;
    switch(action){
      case 'tab':if(modalKind&&!['event','start','victory'].includes(modalKind))closeModal();setTab(p.id);return;
      case 'hidePanel':document.body.classList.remove('panel-open');return;
      case 'menu':showMenu();return;
      case 'help':showHelp();return;
      case 'sources':showSources();return;
      case 'close':closeModal();return;
      case 'chooseCountry':selectedCountry=p.id;showStart();return;
      case 'start':await launch();return;
      case 'startScreen':showStart();return;
      case 'new':if(!S||confirm('Commencer une nouvelle campagne ? Exportez la partie actuelle pour la conserver.'))showStart();return;
      case 'save':exportSave();return;
      case 'load':pauseGame();$('save-file').click();return;
      case 'resume':{const raw=(localStorage.getItem('frontieres-v4-autosave')||localStorage.getItem('frontieres-v4-autosave'));if(!raw)throw Error('Aucune autosauvegarde disponible.');await loadSave(JSON.parse(raw));return;}
      case 'mods':showMods();return;
      case 'importMod':$('mod-file').click();return;
      case 'modExample14':$('mod-editor').value=JSON.stringify(MOD_EXAMPLE14,null,2);$('mod-diagnostics').textContent='Exemple charge. Cliquez sur Previsualiser.';return;
      case 'modExampleMap':$('mod-editor').value=JSON.stringify(MOD_MAP_EXAMPLE,null,2);$('mod-diagnostics').textContent='Exemple de carte charge : deux iles et une route maritime. Cliquez sur Previsualiser.';return;
      case 'previewMod14':{
        const raw=JSON.parse($('mod-editor').value),clean=Rules.validateMod(raw,BASE_WORLD,CATALOG);
        const view=Rules.previewModWorld(clean,BASE_WORLD,CATALOG);
        const changes=(clean.territories||[]).reduce((n,t)=>n+(t.region?view.world.historicalRegions.find(r=>r.id===t.region)?.provinces.length||0:1),0);
        $('mod-diagnostics').innerHTML='<strong class="good">Manifeste valide / format '+clean.version+'</strong><p class="note" style="margin-top:8px">'+esc(view.countries.length)+' pays jouables, '+view.provinces.length+' provinces dont '+(clean.map?.addProvinces?.length||0)+' ajoutees, '+changes+' provinces reassignees, '+(clean.events?.length||0)+' evenements, '+(clean.technologies?.length||0)+' technologies. Les noms et les actions sont verifies, mais la precision historique et l equilibre restent a evaluer en partie.</p>';
        return;
      }
      case 'exportMod14':{
        const clean=Rules.validateMod(JSON.parse($('mod-editor').value),BASE_WORLD,CATALOG);
        downloadJson14('frontieres-'+clean.id+'.json',clean);toast('Paquet JSON exporte.');return;
      }
      case 'applyMod':mod=Rules.validateMod(JSON.parse($('mod-editor').value),BASE_WORLD,CATALOG);modPreviewInput14=null;selectedCountry=mod.newCountries?.[0]?.id||selectedCountry;toast('Paquet valide : '+mod.name);showStart();return;
      case 'clearMod':mod=null;modPreviewInput14=null;showMods();return;
      case 'fetchPortrait':await loadVisiblePortrait();return;
      case 'archivePortraits':await archivePortraits();return;
      case 'exportArchiveGame':exportArchiveGame();return;
      case 'portraitSource':{const key=portraitKey(S?.player||selectedCountry),a=portraitResolved.get(key)||PORTRAITS[key];if(a)window.open(a.source,'_blank','noopener,noreferrer');else showSources();return;}
      case 'diagnostics':pauseGame();toast('V\u00e9rification du moteur sur des copies de la campagne...');await send('diagnostics');return;
      case 'atlas':showAtlas(p.section||'timeline');return;
      case 'historyDetail':showHistoricalDetail(p.id);return;
      case 'historyRegion':showRegionOnMap(p.id);return;
      case 'countryDossier':showCountryDossier(p.id);return;
      case 'historyBorders':showHistoricalBorders=!showHistoricalBorders;dirty=true;renderPanel(true);return;
      case 'mode':mapMode=p.id;renderMapModes();dirty=true;return;
      case 'routes':showRoutes=!showRoutes;dirty=true;renderPanel(true);return;
      case 'world':camera={x:900,y:455,zoom:Math.min(mapWidth/1850,mapHeight/930)};dirty=true;return;
      case 'home':centerOn(code(S?.player||selectedCountry).capital,3.4);return;
      case 'zoomIn':camera.zoom=Math.min(14,camera.zoom*1.28);dirty=true;return;
      case 'zoomOut':camera.zoom=Math.max(.4,camera.zoom/1.28);dirty=true;return;
      case 'deselectProvince':pid=null;renderInspector();dirty=true;return;
      case 'clearUnits':selected.clear();orderMode=false;renderSelection();renderPanel(true);dirty=true;return;
      case 'orderMode':if(!selected.size)throw Error('S\u00e9lectionnez d\u2019abord des divisions.');orderMode=true;document.body.classList.remove('panel-open');$('map-hint').textContent='ORDRE EN ATTENTE / Cliquez une province de destination.';renderSelection();return;
      case 'selectAll':selected=new Set(ownUnits().map(u=>u.id));renderSelection();renderPanel(true);dirty=true;return;
      case 'selectProvince':selected=new Set(ownUnits().filter(u=>u.pid===pid).map(u=>u.id));setTab('army');renderSelection();dirty=true;return;
      case 'selectArmy':{army=p.id;const us=ownUnits().filter(u=>u.army===army);selected=new Set(us.map(u=>u.id));if(us.length)centerOn(us[0].pid);renderArmies();renderSelection();renderPanel(true);dirty=true;return;}
      case 'unit':{const u=ownUnits().find(u=>u.id===p.id);if(!u)return;if(!ev.shiftKey)selected.clear();if(selected.has(u.id))selected.delete(u.id);else selected.add(u.id);centerOn(u.pid);renderPanel(true);renderSelection();dirty=true;return;}
      case 'newArmy':army=await cmd('newArmy',{name:'Arm\u00e9e '+(S.armies.filter(a=>a.owner===S.player).length+1)});renderPanel(true);renderArmies();return;
      case 'assignGeneral':await cmd('general',{army:p.army,general:$('general-select').value||null});toast('Commandement affect\u00e9.');return;
      case 'activatePlan':await cmd('armyPlan',{army:p.army,target:$('front-target').value,order:$('front-order').value,stance:$('front-stance').value,auto:true});toast('Le plan est actif. Les divisions se d\u00e9ploieront aux prochains jours de simulation.');dirty=true;return;
      case 'recruitForm':await cmd('recruit',{template:$('recruit-template').value,pid:Number($('recruit-base').value),count:Number($('recruit-count').value)});toast('Entra\u00eenement commenc\u00e9.');return;
      case 'templateEditor':templateEditor();return;
      case 'refitForm':await cmd('refitDivision',{ids:[...selected],template:$('refit-template').value});renderPanel(true);toast('Divisions r\u00e9\u00e9quip\u00e9es.');return;
      case 'saveTemplate':await cmd('template',templateForm());closeModal();renderPanel(true);toast('Mod\u00e8le enregistr\u00e9.');return;
      case 'governmentForm':{
        const ideology=Object.keys(nation().parties).filter(k=>k!==nation().ideology)
          .sort((a,b)=>nation().parties[b]-nation().parties[a])[0];
        if(!ideology||nation().parties[ideology]<55)throw Error('Aucun courant d’opposition ne dispose encore d’une majorité de 55 %.');
        if(!confirm('Passer à un régime '+IDEO[ideology]+' ? Il s’agit d’une trajectoire alternative fictive.'))return;
        await cmd('reformGovernment',{ideology});return;
      }
      case 'industryTab':subtab=p.id;renderPanel(true);return;
      case 'constructionHere':subtab='construction';setTab('industry');return;
      case 'airMissionForm':await cmd('airMission',{id:p.id,zone:$('air-zone-'+p.id).value,mission:$('air-mission-'+p.id).value});toast('Mission a\u00e9rienne affect\u00e9e.');return;
      case 'airCreateForm':await cmd('airCreate',{kind:$('air-type').value,size:Number($('air-size').value),base:Number($('air-base').value)});toast('Escadre d\u00e9ploy\u00e9e.');return;
      case 'airRebaseForm':await cmd('airRebase',{id:p.id,base:Number($('rebase-'+p.id).value)});toast('Escadre transf\u00e9r\u00e9e et mise en r\u00e9serve.');return;
      case 'fleetMissionForm':await cmd('fleetMission',{id:p.id,zone:$('naval-zone-'+p.id).value,mission:$('naval-mission-'+p.id).value});toast('Mission navale affect\u00e9e.');return;
      case 'fleetCreateForm':await cmd('fleetCreate',{name:$('fleet-name').value,base:Number($('fleet-base').value),destroyers:Number($('fleet-dd').value),submarines:Number($('fleet-ss').value),cruisers:Number($('fleet-ca').value),battleships:Number($('fleet-bb').value),carriers:Number($('fleet-cv').value)});toast('Groupe naval form\u00e9.');return;
      case 'countryDiplomacy':target=p.id;setTab('diplomacy');return;
      case 'confirmWar':if(confirm('D\u00e9clarer la guerre \u00e0 '+countryName(p.target)+' ? Les factions et les garants peuvent intervenir.'))await cmd('war',{target:p.target});return;
      case 'leaseForm':await cmd('lendLease',{target:p.target,equipment:$('lease-equipment').value,daily:Number($('lease-qty').value)});toast('Accord de pr\u00eat-bail activ\u00e9.');return;
      case 'spyForm':await cmd('spy',{target:$('spy-target').value,mission:$('spy-mission').value});toast('R\u00e9seau de renseignement en mission.');return;
      case 'focus':await cmd('focus',{id:p.id});toast('Priorit\u00e9 nationale lanc\u00e9e.');renderPanel(true);return;
      case 'activateFocus':await cmd('focus',{id:p.id});showTree();toast('Priorit\u00e9 nationale lanc\u00e9e.');return;
      case 'focusTree':if(S)showTree();return;
      case 'focusDetail':showFocusDetail(p.id);return;
      case 'ledger':showLedger();return;
      case 'ledgerCountry':closeModal();target=p.id;if(p.id!==S.player)setTab('diplomacy');centerOn(code(p.id).capital,3.4);return;
      case 'battle':showBattle(p.pid);return;
      case 'searchResult':pid=p.pid;centerOn(pid,4);$('search-results').style.display='none';$('search').value=pname(pid);renderInspector();return;
    }
  }catch(e){if(!String(e.message).startsWith('Il faut'))toast(e.message,true);}
});
document.addEventListener('change',ev=>{
  if(ev.target.id==='start-bookmark'){startBookmark=ev.target.value;showStart();}
  if(ev.target.id==='history-year'){historyYear=ev.target.value;showAtlas();}
  if(ev.target.id==='history-scope'){historyScope=ev.target.value;showAtlas();}
  if(ev.target.id==='atlas-country'){showCountryDossier(ev.target.value);}
  if(ev.target.id==='start-campaign')startCampaign=ev.target.value;
  if(ev.target.id==='start-difficulty')startDifficulty=ev.target.value;
  if(ev.target.id==='start-scenario')startHistorical=ev.target.value;
  if(ev.target.id==='start-country'){selectedCountry=ev.target.value;showStart();}
  if(ev.target.id==='army-select'){army=Number(ev.target.value);renderPanel(true);renderArmies();dirty=true;}
  if(ev.target.id==='dip-select'){target=ev.target.value;renderPanel(true);}
  if(ev.target.id==='tech-group'){techGroup=ev.target.value;renderPanel(true);}
  if(ev.target.classList.contains('tmpl-stat'))updateTemplatePreview();
});
document.addEventListener('input',ev=>{if(ev.target.classList.contains('tmpl-stat'))updateTemplatePreview();});
$('save-file').addEventListener('change',async ev=>{const file=ev.target.files[0];ev.target.value='';if(!file)return;try{if(file.size>18e6)throw Error('Fichier trop volumineux (18 Mo maximum).');await loadSave(JSON.parse(await file.text()));}catch(e){toast('Sauvegarde invalide : '+e.message,true);}});
$('mod-file').addEventListener('change',async ev=>{const file=ev.target.files[0];ev.target.value='';if(!file)return;try{if(file.size>1400000)throw Error('Mod trop volumineux (1,4 Mo maximum).');mod=Rules.validateMod(JSON.parse(await file.text()),BASE_WORLD,CATALOG);modPreviewInput14=null;showMods();toast('Mod import\u00e9 et valid\u00e9.');}catch(e){toast('Mod refus\u00e9 : '+e.message,true);}});
window.addEventListener('beforeunload',()=>{if(S)try{localStorage.setItem('frontieres-v4-autosave',JSON.stringify(S));}catch{}});

/* Geography renderer. The map is sourced polygon geometry, not a decorative image. */
const canvas=$('map'),ctx=canvas.getContext('2d'),mini=$('minimap'),mctx=mini.getContext('2d');
const miniBase=document.createElement('canvas'),miniBaseCtx=miniBase.getContext('2d');
miniBase.width=mini.width;miniBase.height=mini.height;
let miniCacheKey=null,minimapRebuilds=0;
let mapWidth=1,mapHeight=1,camera={x:951,y:202,zoom:3.4},drawMs=0,drag=null,mouseRect=null;
const project=(x,y)=>({x:(x+180)*5,y:(85-y)*5.6});
let centers=WORLD.provinces.map(p=>project(p.x,p.y));
let geometries=WORLD.provinces.map(p=>{const path=new Path2D();let minx=Infinity,miny=Infinity,maxx=-Infinity,maxy=-Infinity;for(const ring of p.polygons){ring.forEach(([x,y],i)=>{const v=project(x,y);if(!i)path.moveTo(v.x,v.y);else path.lineTo(v.x,v.y);minx=Math.min(minx,v.x);miny=Math.min(miny,v.y);maxx=Math.max(maxx,v.x);maxy=Math.max(maxy,v.y);});path.closePath();}return {path,bbox:{minx,miny,maxx,maxy}};});
// Spatial buckets reduce pointer hit testing to nearby polygons.
let buckets=new Map();
for(let id=0;id<geometries.length;id++){const b=geometries[id].bbox;for(let x=Math.floor(b.minx/25);x<=Math.floor(b.maxx/25);x++)for(let y=Math.floor(b.miny/25);y<=Math.floor(b.maxy/25);y++){const key=x+','+y;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(id);}}
function installVisualWorld(next){
  // All coordinates and hit-test buckets are rebuilt when a scenario adds or edits geometry.
  // BASE_WORLD never changes: validation, migration and worker loads always use that source.
  WORLD=next;
  miniCacheKey=null;
  DEF=Object.fromEntries(WORLD.countries.map(c=>[c.id,c]));
  centers=WORLD.provinces.map(p=>project(p.x,p.y));
  geometries=WORLD.provinces.map(p=>{
    const path=new Path2D();let minx=Infinity,miny=Infinity,maxx=-Infinity,maxy=-Infinity;
    for(const ring of p.polygons){ring.forEach(([x,y],i)=>{
      const v=project(x,y);if(!i)path.moveTo(v.x,v.y);else path.lineTo(v.x,v.y);
      minx=Math.min(minx,v.x);miny=Math.min(miny,v.y);maxx=Math.max(maxx,v.x);maxy=Math.max(maxy,v.y);
    });path.closePath();}
    return {path,bbox:{minx,miny,maxx,maxy}};
  });
  buckets=new Map();
  for(let id=0;id<geometries.length;id++){
    const b=geometries[id].bbox;
    for(let x=Math.floor(b.minx/25);x<=Math.floor(b.maxx/25);x++)
      for(let y=Math.floor(b.miny/25);y<=Math.floor(b.maxy/25);y++){
        const key=x+','+y;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(id);
      }
  }
  if(pid!==null&&!WORLD.provinces[pid])pid=null;
  dirty=true;
}
const hitCanvas=document.createElement('canvas'),hitCtx=hitCanvas.getContext('2d');
const regionColors=['#9fac84','#ae9b7e','#849da6','#ae8374','#a6a083','#929a74','#9d89a3'];
function toMap(x,y){return {x:(x-mapWidth/2)/camera.zoom+camera.x,y:(y-mapHeight/2)/camera.zoom+camera.y};}
function screenPoint(id){const p=centers[id];return {x:(p.x-camera.x)*camera.zoom+mapWidth/2,y:(p.y-camera.y)*camera.zoom+mapHeight/2};}
function pointAt(x,y){const p=toMap(x,y),options=buckets.get(Math.floor(p.x/25)+','+Math.floor(p.y/25))||[];for(const id of options){const g=geometries[id];if(hitCtx.isPointInPath(g.path,p.x,p.y,'evenodd'))return id;}return null;}
function centerOn(id,zoom){if(!centers[id])return;camera.x=centers[id].x;camera.y=centers[id].y;if(zoom)camera.zoom=zoom;dirty=true;}
function resize(){
  const r=$('maparea').getBoundingClientRect();mapWidth=r.width;mapHeight=r.height;
  const cap={eco:1,balanced:1.5,sharp:2.5}[releaseSettings.renderQuality]||1.5;
  const d=Math.min(devicePixelRatio||1,cap);
  canvas.width=Math.max(1,Math.round(r.width*d));canvas.height=Math.max(1,Math.round(r.height*d));dirty=true;
}
new ResizeObserver(resize).observe($('maparea'));
function colorOf(p){
  const id=control(p.id),q=S?.provinces[p.id];
  if(mapMode==='history'){const r=atlasRegion&&WORLD.historicalRegions.find(r=>r.id===atlasRegion);if(r)return r.provinces.includes(p.id)?'#bea16f':'#586e6b';return p.historicalRegions?.length?'#a69875':code(id)?.color||'#788b85';}
  if(mapMode==='terrain')return {plains:'#879a77',forest:'#638577',mountains:'#a09f92',desert:'#b4a481',urban:'#a29683'}[p.terrain];
  if(mapMode==='supply'&&q)return `hsl(${Math.round(q.supply*105)},23%,${31+q.supply*22}%)`;
  if(mapMode==='industry'&&q){const v=Math.min(10,q.mil+q.civ+q.dock);return `hsl(42,${20+v*3}%,${27+v*4}%)`;}
  if(mapMode==='diplomacy'&&S)return id===S.player?'#b6a677':allied(S.player,id)?'#799da1':war(S.player,id)?'#aa796d':'#657b7b';
  if(mapMode==='air')return regionColors[WORLD.zones.findIndex(z=>z.id===p.zone)%regionColors.length];
  if(mapMode==='navy')return '#718a87';
  return code(id)?.color||'#788b85';
}
function renderMapModes(){
  $('map-modes').innerHTML=Object.entries(MODES).map(([id,label])=>btn(label,'mode',{id},mapMode===id?'active':'')).join('');
  const labels={history:'Or : r\u00e9gions document\u00e9es / bleu : fleuves / pointill\u00e9s : zone d\u00e9militaris\u00e9e',political:'',terrain:'Plaine / for\u00eat / montagne / d\u00e9sert / ville',supply:'Rouge : isol\u00e9 / vert : ravitaill\u00e9',industry:'Clair : forte concentration industrielle',diplomacy:'Or : votre pays / bleu : alli\u00e9s / rouge : ennemis',air:'Les couleurs d\u00e9limitent les r\u00e9gions a\u00e9riennes',navy:'Zones maritimes / routes de transport en pointill\u00e9s'};
  $('map-legend').textContent=labels[mapMode];$('map-legend').style.display=labels[mapMode]?'block':'none';$('map-caption').textContent=String(Object.keys(MODES).indexOf(mapMode)+1).padStart(2,'0')+' / CARTE '+MODES[mapMode].toUpperCase();
}
function visibleUnits(){
  if(!S)return [];
  const nearby=new Set();for(const p of owned())for(const n of p.neighbors)nearby.add(n);
  return S.units.filter(u=>u.owner===S.player||allied(S.player,u.owner)||nearby.has(u.pid)||(nation().intel[u.owner]||0)>=70);
}
function drawMap(){
  requestAnimationFrame(drawMap);if(!dirty)return;dirty=false;const start=performance.now(),dpr=canvas.width/mapWidth;
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,mapWidth,mapHeight);ctx.fillStyle='#162f3a';ctx.fillRect(0,0,mapWidth,mapHeight);
  ctx.save();ctx.translate(mapWidth/2,mapHeight/2);ctx.scale(camera.zoom,camera.zoom);ctx.translate(-camera.x,-camera.y);
  const l=camera.x-mapWidth/2/camera.zoom,r=camera.x+mapWidth/2/camera.zoom,t=camera.y-mapHeight/2/camera.zoom,b=camera.y+mapHeight/2/camera.zoom;
  const onScreen=id=>{const p=geometries[id].bbox;return p.maxx>=l&&p.minx<=r&&p.maxy>=t&&p.miny<=b;};
  // Nautical graticule and subtle coordinate labels.
  ctx.lineWidth=.55/camera.zoom;ctx.strokeStyle='#4b6c742b';ctx.setLineDash([2/camera.zoom,4/camera.zoom]);ctx.beginPath();
  for(let x=0;x<1800;x+=75){ctx.moveTo(x,0);ctx.lineTo(x,1000);}for(let y=0;y<1000;y+=84){ctx.moveTo(0,y);ctx.lineTo(1800,y);}ctx.stroke();ctx.setLineDash([]);
  const visible=WORLD.provinces.filter(p=>onScreen(p.id));
  for(const p of visible){ctx.fillStyle=colorOf(p);ctx.fill(geometries[p.id].path,'evenodd');ctx.strokeStyle='#1b38334b';ctx.lineWidth=.42/camera.zoom;ctx.stroke(geometries[p.id].path);}
  // Country boundaries from real province segments. Shared boundary lines are thicker.
  ctx.strokeStyle='#213b3be0';ctx.lineWidth=.9/camera.zoom;
  for(const p of visible)if(p.coast||p.neighbors.some(id=>control(id)!==control(p.id)))ctx.stroke(geometries[p.id].path);
  if(S&&mapMode==='political'){
    for(const p of visible)if(control(p.id)!==p.owner){ctx.fillStyle='#bd946d24';ctx.fill(geometries[p.id].path);}
  }
  if(showRoutes||mapMode==='navy'){
    ctx.setLineDash([3/camera.zoom,4/camera.zoom]);ctx.strokeStyle='#d0b78675';ctx.lineWidth=.7/camera.zoom;
    for(const p of WORLD.provinces)for(const e of p.sea)if(e.to>p.id&&(onScreen(p.id)||onScreen(e.to))){const a=centers[p.id],b=centers[e.to];ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
    ctx.setLineDash([]);
  }
  drawHistoricalLayers(ctx,camera.zoom);
  ctx.textAlign='center';ctx.textBaseline='middle';
  for(const sea of WORLD.seas){const p=project(sea.x,sea.y);if(p.x<l||p.x>r||p.y<t||p.y>b)continue;ctx.font=`italic ${11/camera.zoom}px Georgia`;ctx.fillStyle=mapMode==='navy'?'#c6cebc':'#c0cebb52';ctx.fillText(sea.name.toUpperCase(),p.x,p.y);if(mapMode==='navy'){ctx.strokeStyle='#aebc9670';ctx.lineWidth=1/camera.zoom;ctx.beginPath();ctx.arc(p.x,p.y,19/camera.zoom,0,Math.PI*2);ctx.stroke();}}
  // Army planning lines and movement orders.
  if(S){
    const a=S.armies.find(a=>a.id===army);drawOperations(ctx,camera.zoom);
    if(a?.auto){ctx.strokeStyle='#e3c883';ctx.lineWidth=2.1/camera.zoom;ctx.setLineDash([6/camera.zoom,3/camera.zoom]);for(const id of S.fronts[a.id]||[])if(onScreen(id))ctx.stroke(geometries[id].path);ctx.setLineDash([]);}
    for(const u of S.units){
      if(!selected.has(u.id)||!u.path.length)continue;
      const start=centers[u.pid],end=centers[u.path[u.path.length-1]];ctx.strokeStyle='#f1d594';ctx.lineWidth=1.6/camera.zoom;ctx.setLineDash([5/camera.zoom,3/camera.zoom]);ctx.beginPath();ctx.moveTo(start.x,start.y);for(const id of u.path)ctx.lineTo(centers[id].x,centers[id].y);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#f1d594';ctx.beginPath();ctx.arc(end.x,end.y,3/camera.zoom,0,Math.PI*2);ctx.fill();
    }
  }
  // Labels collision-filtered in screen space.
  const occupied=[];
  const label=(text,x,y,size,color,font='Georgia',padding=6)=>{
    const sx=(x-camera.x)*camera.zoom+mapWidth/2,sy=(y-camera.y)*camera.zoom+mapHeight/2;
    if(sx<-30||sx>mapWidth+30||sy<-20||sy>mapHeight+20)return false;
    ctx.font=`${size/camera.zoom}px ${font}`;const width=ctx.measureText(text).width*camera.zoom;
    const box={x:sx-width/2-padding,y:sy-size/2-padding,w:width+padding*2,h:size+padding*2};
    if(occupied.some(o=>box.x<o.x+o.w&&box.x+box.w>o.x&&box.y<o.y+o.h&&box.y+box.h>o.y))return false;
    occupied.push(box);ctx.lineWidth=2.5/camera.zoom;ctx.strokeStyle='#24403987';ctx.strokeText(text,x,y);ctx.fillStyle=color;ctx.fillText(text,x,y);return true;
  };
  const defs=availableCountries().sort((a,b)=>(b.civ+b.mil)-(a.civ+a.mil));
  if(mapMode!=='air')for(const c of defs){const p=centers[c.capital];if(!p)continue;if(camera.zoom<1&&c.civ<17)continue;
    if(camera.zoom>1.35)label(c.name.toUpperCase(),p.x,p.y-11/camera.zoom,Math.min(16,10+camera.zoom), '#f1ebd6','Georgia',10);
  }
  if(camera.zoom>1.7)for(const p of visible.filter(p=>p.city).sort((a,b)=>b.vp-a.vp)){
    const v=centers[p.id];ctx.fillStyle=p.capital?'#e7c887':'#d5d7b9';ctx.strokeStyle='#34493b';ctx.lineWidth=.8/camera.zoom;ctx.beginPath();ctx.arc(v.x,v.y,(p.capital?2.3:1.7)/camera.zoom,0,Math.PI*2);ctx.fill();ctx.stroke();
    if(camera.zoom>2.3)label(p.name,v.x+2/camera.zoom,v.y+9/camera.zoom,10,'#edf0d4','system-ui',3);
  }
  if(mapMode==='air')for(const z of WORLD.zones){const ps=visible.filter(p=>p.zone===z.id);if(ps.length){const x=total(ps.map(p=>centers[p.id].x))/ps.length,y=total(ps.map(p=>centers[p.id].y))/ps.length;label(z.name.toUpperCase(),x,y,14,'#eee4c8');}}
  if(S&&camera.zoom>1.55){
    const stacks=new Map();for(const u of visibleUnits()){if(!onScreen(u.pid))continue;const key=u.pid+'-'+u.owner;if(!stacks.has(key))stacks.set(key,[]);stacks.get(key).push(u);}
    for(const units of stacks.values()){
      const u=units[0],p=centers[u.pid],own=u.owner===S.player,sel=units.some(u=>selected.has(u.id)),w=27/camera.zoom,h=18/camera.zoom,x=p.x-w/2,y=p.y-h/2;
      ctx.fillStyle=own?'#d1cfaa':allied(S.player,u.owner)?'#a2c0c2':'#c69a88';ctx.strokeStyle=sel?'#ffedb9':'#314638';ctx.lineWidth=(sel?2:1)/camera.zoom;ctx.fillRect(x,y,w,h);ctx.strokeRect(x,y,w,h);
      ctx.fillStyle='#1b352e';ctx.font=`600 ${10/camera.zoom}px ui-monospace,monospace`;ctx.fillText((u.template.tank?'\u25b1':'\u00d7')+' '+units.length,p.x,y+h*.46);
      const strength=total(units.map(u=>u.strength))/units.length,org=total(units.map(u=>u.org))/units.length;
      ctx.fillStyle='#6a8257';ctx.fillRect(x,y+h-3/camera.zoom,w*strength,1.5/camera.zoom);ctx.fillStyle='#4a7e8f';ctx.fillRect(x,y+h-1.5/camera.zoom,w*org/100,1.5/camera.zoom);
    }
    if(showPockets)for(const u of S.units.filter(u=>u.owner===S.player&&u.pocketed)){
      if(!onScreen(u.pid))continue;
      const pos=centers[u.pid];ctx.strokeStyle='#e9a071';ctx.lineWidth=2.2/camera.zoom;
      ctx.beginPath();ctx.arc(pos.x,pos.y,13/camera.zoom,0,Math.PI*2);ctx.stroke();
      ctx.font=`bold ${10/camera.zoom}px system-ui`;ctx.fillStyle='#f2b995';ctx.fillText('!',pos.x+13/camera.zoom,pos.y-10/camera.zoom);
    }
    for(const battle of S.battles){if(!onScreen(battle.pid))continue;if(battle.a!==S.player&&battle.b!==S.player&&(nation().intel[battle.a]||0)<50)continue;const p=centers[battle.pid];ctx.fillStyle='#ae6958';ctx.strokeStyle='#efc8a0';ctx.lineWidth=1.2/camera.zoom;ctx.beginPath();ctx.arc(p.x,p.y-14/camera.zoom,9/camera.zoom,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#fff1c8';ctx.font=`bold ${11/camera.zoom}px system-ui`;ctx.fillText('!',p.x,p.y-14/camera.zoom);}
  }
  if(pid!==null){ctx.strokeStyle='#f4d898';ctx.lineWidth=2.3/camera.zoom;ctx.stroke(geometries[pid].path);}
  ctx.restore();
  if(mouseRect){ctx.strokeStyle='#f0d492';ctx.fillStyle='#e6d68a1b';ctx.lineWidth=1;ctx.fillRect(mouseRect.x,mouseRect.y,mouseRect.w,mouseRect.h);ctx.strokeRect(mouseRect.x,mouseRect.y,mouseRect.w,mouseRect.h);}
  drawMinimap();drawMs=performance.now()-start;
  const lon=camera.x/5-180,lat=85-camera.y/5.6;
  $('theatre-name').textContent=lon>-25&&lon<25&&lat>35&&lat<62?'Europe occidentale':lon>25&&lon<70&&lat>40?'Europe orientale':lon<-30&&lon>-60&&lat>20&&lat<65?'Atlantique Nord':lon<-30&&lat>10?'Am\u00e9rique du Nord':lon<-30?'Am\u00e9rique du Sud':lat<-12&&lon>100?'Oc\u00e9anie':lon>70?'Asie':lat<30&&lon<45?'Afrique':'Th\u00e9\u00e2tre mondial';
}
function drawMinimap(){
  if(releaseSettings.minimap===false)return;
  const w=mini.width,h=mini.height,sx=w/1800,sy=h/880;
  // Rebuild the expensive 3,396+ province layer only after territorial or
  // country-color changes. Panning/zooming repaints just the viewport frame.
  const key=WORLD.mapId+'|'+WORLD.provinces.length+'|'+
    (S?S.provinces.map(q=>q.ctrl).join(','):'initial')+'|'+
    WORLD.countries.map(c=>code(c.id)?.color||'').join(',');
  if(miniCacheKey!==key){
    miniBaseCtx.setTransform(1,0,0,1,0,0);
    miniBaseCtx.fillStyle='#102730';miniBaseCtx.fillRect(0,0,w,h);
    miniBaseCtx.save();miniBaseCtx.scale(sx,sy);
    for(const p of WORLD.provinces){
      miniBaseCtx.fillStyle=code(control(p.id))?.color||'#738c86';
      miniBaseCtx.globalAlpha=.82;miniBaseCtx.fill(geometries[p.id].path);
    }
    miniBaseCtx.globalAlpha=1;miniBaseCtx.restore();
    miniCacheKey=key;minimapRebuilds++;
  }
  mctx.setTransform(1,0,0,1,0,0);mctx.drawImage(miniBase,0,0);
  mctx.strokeStyle='#ecd79c';mctx.lineWidth=1.5;
  mctx.strokeRect((camera.x-mapWidth/2/camera.zoom)*sx,(camera.y-mapHeight/2/camera.zoom)*sy,mapWidth/camera.zoom*sx,mapHeight/camera.zoom*sy);
}
canvas.addEventListener('pointerdown',ev=>{
  if(ev.button!==0)return;const r=canvas.getBoundingClientRect();drag={clientX:ev.clientX,clientY:ev.clientY,x:ev.clientX-r.left,y:ev.clientY-r.top,cx:camera.x,cy:camera.y,select:ev.shiftKey,moved:false};canvas.setPointerCapture(ev.pointerId);$('tooltip').style.display='none';
});
canvas.addEventListener('pointermove',ev=>{
  const r=canvas.getBoundingClientRect(),x=ev.clientX-r.left,y=ev.clientY-r.top;
  if(drag){const dx=ev.clientX-drag.clientX,dy=ev.clientY-drag.clientY;if(Math.abs(dx)+Math.abs(dy)>5)drag.moved=true;if(drag.moved){if(drag.select)mouseRect={x:Math.min(x,drag.x),y:Math.min(y,drag.y),w:Math.abs(x-drag.x),h:Math.abs(y-drag.y)};else {camera.x=drag.cx-dx/camera.zoom;camera.y=drag.cy-dy/camera.zoom;}dirty=true;}return;}
  const id=pointAt(x,y);if(id===null){$('tooltip').style.display='none';return;}const p=WORLD.provinces[id],q=S?.provinces[id];
  $('tooltip').innerHTML=`<strong>${esc(p.name)}</strong><br><span style="font-size:11px">${esc(countryName(control(id)))} / ${CATALOG.terrain[p.terrain].name}</span><br><small>${p.vp} points de victoire${q?' / ravitaillement '+percent(q.supply):''}</small>`;
  $('tooltip').style.left=Math.min(innerWidth-290,ev.clientX+17)+'px';$('tooltip').style.top=Math.min(innerHeight-110,ev.clientY+18)+'px';$('tooltip').style.display='block';
});
canvas.addEventListener('pointerup',ev=>{
  if(!drag)return;const prev=drag;drag=null;const r=canvas.getBoundingClientRect(),x=ev.clientX-r.left,y=ev.clientY-r.top;
  if(prev.moved){if(prev.select&&mouseRect){for(const u of ownUnits()){const v=screenPoint(u.pid);if(v.x>=mouseRect.x&&v.x<=mouseRect.x+mouseRect.w&&v.y>=mouseRect.y&&v.y<=mouseRect.y+mouseRect.h)selected.add(u.id);}renderSelection();renderPanel(true);}mouseRect=null;dirty=true;return;}
  const id=pointAt(x,y);if(id===null){pid=null;renderInspector();dirty=true;return;}
  if(operationTool&&S){if(operationTool.kind==='objective'){fire('setObjective',{army:operationTool.army,pid:id});endOperationTool();toast('Objectif géographique enregistré.');}else if(allied(S.player,control(id))||nation().access.includes(control(id))){if(!operationTool.points.includes(id)&&operationTool.points.length<20)operationTool.points.push(id);dirty=true;toast(operationTool.points.length+' point(s) dans le secteur.');}else toast('Tracez le secteur en territoire accessible.',true);return;}
  if(orderMode&&S){if(releaseSettings.confirmOrders&&!confirm('Transmettre cet ordre de mouvement ?'))return;fire('order',{ids:[...selected],target:id});orderMode=false;renderSelection();$('map-hint').textContent='Ordre transmis / Clic droit pour une nouvelle destination.';return;}
  pid=id;if(S){const us=ownUnits().filter(u=>u.pid===id);if(us.length){if(!ev.shiftKey)selected.clear();for(const u of us)selected.add(u.id);army=us[0].army;}else if(!ev.shiftKey){selected.clear();}if(control(id)!==S.player)target=control(id);}
  renderInspector();renderSelection();renderArmies();if(tab==='diplomacy'||tab==='industry'||tab==='army')renderPanel(true);dirty=true;
});
canvas.addEventListener('pointercancel',()=>{drag=null;mouseRect=null;dirty=true;});
canvas.addEventListener('pointerleave',()=>$('tooltip').style.display='none');
canvas.addEventListener('contextmenu',ev=>{ev.preventDefault();if(!S)return;if(!selected.size){toast('S\u00e9lectionnez d\u2019abord vos divisions.');return;}if(releaseSettings.confirmOrders&&!confirm('Transmettre cet ordre de mouvement ?'))return;const r=canvas.getBoundingClientRect(),id=pointAt(ev.clientX-r.left,ev.clientY-r.top);if(id!==null)fire('order',{ids:[...selected],target:id});});
canvas.addEventListener('wheel',ev=>{ev.preventDefault();const r=canvas.getBoundingClientRect(),x=ev.clientX-r.left,y=ev.clientY-r.top,before=toMap(x,y);camera.zoom=Math.max(.4,Math.min(14,camera.zoom*Math.exp(-ev.deltaY*.0014)));const after=toMap(x,y);camera.x+=before.x-after.x;camera.y+=before.y-after.y;dirty=true;},{passive:false});
mini.addEventListener('pointerdown',ev=>{const r=mini.getBoundingClientRect();camera.x=(ev.clientX-r.left)/r.width*1800;camera.y=(ev.clientY-r.top)/r.height*880;dirty=true;});
$('search').addEventListener('input',ev=>{const term=ev.target.value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();if(term.length<2){$('search-results').style.display='none';return;}const matches=WORLD.provinces.filter(p=>p.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(term)||(p.capital&&countryName(control(p.id)).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(term))).sort((a,b)=>Number(b.city)-Number(a.city)).slice(0,12);$('search-results').innerHTML=matches.map(p=>btn(`${esc(p.name)}<small>${esc(countryName(control(p.id)))}</small>`,'searchResult',{pid:p.id},'search-result')).join('')||'<div class="note" style="padding:10px">Aucun r\u00e9sultat.</div>';$('search-results').style.display='block';});
document.addEventListener('keydown',ev=>{
  if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;
  if(ev.key==='Escape'){if(operationTool){endOperationTool();return;}if(modalKind){closeModal();}else{selected.clear();orderMode=false;document.body.classList.remove('panel-open');renderSelection();dirty=true;}return;}
  if(modalKind)return;if(ev.code==='Space'){ev.preventDefault();if(S)fire('pause');return;}
  if(/^[1-5]$/.test(ev.key)){if(S)fire('speed',{value:Number(ev.key)});return;}
  if(ev.key.toLowerCase()==='o'&&S){showOperations();return;}
  const keys={h:'history',c:'campaign',a:'army',i:'industry',r:'research',d:'diplomacy',p:'focus',n:'nation',j:'journal'};
  if(keys[ev.key.toLowerCase()])setTab(keys[ev.key.toLowerCase()]);
  if(ev.key.toLowerCase()==='f')centerOn(code(S?.player||selectedCountry).capital,3.4);
  if(ev.key==='?')showHelp();
});
/* ---- Frontieres 1.0 interface additions: campaign / operations / local saves ---- */
const SHIP_LABELS={destroyers:'Destroyers',submarines:'Sous-marins',cruisers:'Croiseurs',battleships:'Cuirass\u00e9s',carriers:'Porte-avions'};
const SHIP_FIELDS={destroyers:'dd',submarines:'ss',cruisers:'ca',battleships:'bb',carriers:'cv'};
let operationTool=null,releaseSettings={contrast:false,largeText:false,confirmOrders:false,renderQuality:'balanced',minimap:true};
try{Object.assign(releaseSettings,JSON.parse(localStorage.getItem('frontieres-settings')||'{}'));}catch{}
function applyReleaseSettings(){
  document.body.classList.toggle('high-contrast',!!releaseSettings.contrast);
  document.body.classList.toggle('large-text',!!releaseSettings.largeText);
  if(!['eco','balanced','sharp'].includes(releaseSettings.renderQuality))releaseSettings.renderQuality='balanced';
  $('minimap-box').style.display=releaseSettings.minimap===false?'none':'';
  resize();dirty=true;
}
function campaignLabel(mode){return {development:'Puissance nationale',strategic:'Victoire strat\u00e9gique',sandbox:'Bac \u00e0 sable'}[mode]||'Campagne';}
function campaignPanel(){
 const c=nation(),cp=S.campaign,goals=cp?.goals||[];
 const lessons=[['research','Lancer une recherche','research','Choisissez une technologie disponible.'],['focus','Choisir une priorit\u00e9','focus','Une direction nationale ouvre les branches suivantes.'],['construction','Ouvrir un chantier','industry','Les usines civiles construisent vos installations.'],['training','Entra\u00eener une division','army','Le recrutement pr\u00e9l\u00e8ve r\u00e9ellement les stocks.'],['army','Organiser un front','army','Cible, posture et officier structurent votre plan.'],['time','Simuler une semaine','nation','Espace reprend la campagne ; 1 \u00e0 5 r\u00e8glent la vitesse.']];
 return panelHeader('Dossier de campagne',campaignLabel(cp?.mode)+' / '+dateText(S.day))+
 `<div class="campaign-score"><div><div class="eyebrow">INDICE DE PUISSANCE</div><strong>${num(cp?.score||0)}</strong></div><div class="score-caption">Score de jeu<br>Industrie / recherche / coh\u00e9sion</div></div>
 <div class="briefing-card"><div class="eyebrow">VOTRE MISSION</div><h3>${esc(campaignLabel(cp?.mode))}</h3><p>${cp?.mode==='development'?'D\u00e9veloppez une puissance stable et modernis\u00e9e en prot\u00e9geant votre territoire. Tous les objectifs doivent \u00eatre simultan\u00e9ment remplis.':cp?.mode==='strategic'?'Coordonnez la guerre, l\u2019industrie et la logistique. Les capitales seules ne suffisent pas : la puissance doit \u00eatre soutenable.':'Aucune condition de victoire impos\u00e9e. Choisissez votre trajectoire et poursuivez la simulation aussi longtemps que votre \u00c9tat reste ind\u00e9pendant.'}</p></div>
 ${goals.length?`<div class="sectionlabel">Objectifs / ${goals.filter(g=>g.done).length} sur ${goals.length}</div><div class="stack">${goals.map(g=>`<div class="goal-card ${g.done?'complete':''}"><div class="row between"><strong>${esc(g.name)}</strong>${g.done?icon('check'):icon('crosshair')}</div><div class="row between"><small>${num(g.value)} / ${num(g.target)} ${esc(g.unit)}</small><small>${Math.min(100,Math.floor(g.value/g.target*100))} %</small></div>${bar(g.value/g.target*100)}</div>`).join('')}</div>`:''}
 ${!S.tutorial.dismissed?`<div class="sectionlabel">Prise de commandement / ${S.tutorial.completed.length} sur 6</div><div class="lesson-list">${lessons.map(([key,title,to,desc],i)=>`<button class="lesson ${S.tutorial.completed.includes(key)?'done':''}" data-a="tab" data-p="${encodeURIComponent(JSON.stringify({id:to}))}"><span class="lesson-n">${S.tutorial.completed.includes(key)?'\u2713':String(i+1).padStart(2,'0')}</span><span><strong>${title}</strong><small>${desc}</small></span>${icon('arrow')}</button>`).join('')}</div>${btn('Masquer le guide','dismissTutorial',{value:true},'small ghost')}`:btn('R\u00e9afficher le guide','dismissTutorial',{value:false},'small')}
 <div class="sectionlabel">Situation des forces</div><div class="card">${metric('Divisions',ownUnits().length)}${metric('Ravitaillement moyen',percent(c.stats.supply))}${metric('Usure de guerre',Math.floor(c.warFatigue||0)+' %')}${metric('Guerres impliquant votre pays',S.wars.filter(w=>w.a===S.player||w.b===S.player).length)}</div>
 <div class="row wrap" style="margin-top:12px">${btn('Salle des op\u00e9rations','operations',{},'primary small')}${btn('Sauvegardes','saveSlots',{},'small')}</div>
 <div class="sectionlabel">Jalons / ${c.achievements.length}</div><div class="stack">${c.achievements.map(a=>`<div class="card row">${icon('check')}<div><strong>${esc(a.name||a)}</strong><small style="display:block">${dateText(a.day||0)}</small></div></div>`).join('')||'<p class="note">Les jalons enregistrent les avanc\u00e9es de votre campagne.</p>'}</div>
 <div class="sectionlabel">\u00c9volution industrielle</div>${historySpark(c.history,'mil','Usines militaires')}${historySpark(c.history,'civ','Usines civiles')}`;
}
function historySpark(history,key,label){
 const points=(history||[]).slice(-36);if(points.length<2)return `<div class="note">${esc(label)} : historique disponible apr\u00e8s deux mois simul\u00e9s.</div>`;
 const max=Math.max(1,...points.map(p=>p[key])),min=Math.min(0,...points.map(p=>p[key]));
 const coords=points.map((p,i)=>`${8+i*284/(points.length-1)},${58-(p[key]-min)/Math.max(1,max-min)*48}`).join(' ');
 return `<div class="spark-card"><div class="row between"><small>${label}</small><strong>${points.at(-1)[key]}</strong></div><svg viewBox="0 0 300 66" role="img" aria-label="${label} sur ${points.length} mois"><path d="M8 58H292" class="spark-axis"/><polyline points="${coords}" class="spark-line"/></svg></div>`;
}
function politicalExtension(){
 const c=nation();return `<div class="sectionlabel">Conseil gouvernemental</div><div class="card stack"><p class="note">Un seul conseil actif. Remplacer un conseil retire son ancien bonus.</p><select id="advisor-kind"><option value="economy" ${c.advisor==='economy'?'selected':''}>Planification industrielle / construction +12 %</option><option value="science" ${c.advisor==='science'?'selected':''}>Conseil scientifique / recherche +10 %</option><option value="logistics" ${c.advisor==='logistics'?'selected':''}>Intendance / ravitaillement +12 %</option></select>${btn('Nommer le conseil / 80 PP','advisorForm',{},'small')}${metric('Usure de guerre',Math.round(c.warFatigue||0)+' %')}${btn('D\u00e9mobiliser en temps de paix / 40 PP','demobilize',{},'small')}</div>
 <div class="sectionlabel">Vie politique / trajectoires alternatives</div><div class="card stack"><p class="note">La propagande politique d\u00e9place le soutien entre tendances. Une majorit\u00e9 de 55 % permet une r\u00e9orientation institutionnelle ; ce n\u2019est pas une reconstitution des scrutins historiques.</p>${Object.keys(IDEO).map(k=>`<div><div class="row between"><span>${IDEO[k]}</span><strong>${Math.round(c.parties[k])} %</strong></div>${bar(c.parties[k],PARTYC[k])}<div class="row" style="margin:6px 0 9px">${btn('Campagne / 60 PP','politicalCampaign',{ideology:k},'small',c.politicalCooldown>S.day)}${k!==c.ideology&&c.parties[k]>=55?btn('R\u00e9orienter / 100 PP','confirmReform',{ideology:k},'small danger'):''}</div></div>`).join('')}</div>`;
}
function operationExtension(){
 const a=S.armies.find(a=>a.id===army&&a.owner===S.player);if(!a)return '';
 return `<div class="sectionlabel">Plan d\u2019op\u00e9ration 1.2</div><div class="card stack">${metric('Objectif',a.objective!=null?esc(pname(a.objective)):'Non d\u00e9fini')}${metric('Secteur dessin\u00e9',(a.frontSelection||[]).length+' points')}${metric('R\u00e9serve',Math.round((a.reserveRatio||0)*100)+' %')}<div class="row wrap">${btn('Viser une province','pickObjective',{army:a.id},'small')}${btn('Tracer le secteur','drawFront',{army:a.id},'small')}${btn('Effacer','frontSector',{army:a.id,provinces:[]},'small')}</div><p class="note">${esc(a.assessment?.status||'En attente')} ${a.assessment?.front?' / '+a.assessment.front+' provinces de front':''}</p>${btn('Salle des op\u00e9rations '+icon('arrow'),'operations',{},'primary small')}${btn('Man\u0153uvres / 20 PP','exerciseArmy',{army:a.id},'small')}${selected.size?btn('Dissoudre la s\u00e9lection','confirmDisband',{ids:[...selected]},'small danger'):''}</div>`;
}

function tacticCard(a){
  return `<div class="card stack war-tactic">
    <div class="eyebrow">DOCTRINE OPÉRATIONNELLE 1.2</div>
    ${metric('Doctrine en vigueur',esc({balanced:'Interarmes',spearhead:'Percée concentrée',elastic:'Défense élastique'}[a.tactic]||'Interarmes'))}
    ${metric('Aptitude au combat',a.assessment?.ready===undefined?'En attente':a.assessment.ready+' %')}
    <select id="ops-tactic">
      <option value="balanced" ${a.tactic==='balanced'?'selected':''}>Interarmes : attaque et défense équilibrées</option>
      <option value="spearhead" ${a.tactic==='spearhead'?'selected':''}>Percée : bonus offensif, concentration sur objectif</option>
      <option value="elastic" ${a.tactic==='elastic'?'selected':''}>Défense élastique : protection accrue, attaques freinées</option>
    </select>
    ${btn('Appliquer / 10 XP','tacticForm',{army:a.id},'small')}
    <small>Changer de doctrine consomme de l'expérience militaire et remet la préparation à zéro.</small>
  </div>`;
}
function showOperations(){
 if(!S)return;pauseGame();const armies=S.armies.filter(a=>a.owner===S.player),a=armies.find(a=>a.id===army)||armies[0];if(a)army=a.id;
 modal(`${modalHead('Salle des op\u00e9rations','\u00c9TAT-MAJOR / COORDINATION INTERARMES')}<div class="ops-layout"><section><div class="eyebrow">ORDRE DE BATAILLE</div><div class="ops-armies">${armies.map(x=>btn(`<strong>${esc(x.name)}</strong><small>${ownUnits().filter(u=>u.army===x.id).length} divisions / ${x.target?esc(countryName(x.target)):'Sans objectif'}</small>`,'operationArmy',{army:x.id},'ops-army '+(a?.id===x.id?'active':''))).join('')}</div>${btn('+ Groupe d\u2019arm\u00e9es','createGroupForm',{},'small wide')}<div class="sectionlabel">Hi\u00e9rarchie</div>${S.groups.filter(g=>g.owner===S.player).map(g=>`<div class="card stack"><h4>${esc(g.name)}</h4><small>${S.armies.filter(a=>a.group===g.id).length} arm\u00e9es / capacit\u00e9 optimale 5</small><select id="marshal-${g.id}"><option value="">Commandement collectif</option>${nation().identity.commanders.map(c=>`<option value="${esc(c.id)}" ${g.marshal===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select>${btn('Nommer le mar\u00e9chal','marshalForm',{group:g.id},'small')}</div>`).join('')}</section><section>${a?`<div class="eyebrow">ARM\u00c9E S\u00c9LECTIONN\u00c9E</div><h3 class="ops-title">${esc(a.name)}</h3><div class="grid2"><div class="card stat">${ownUnits().filter(u=>u.army===a.id).length}<small>DIVISIONS</small></div><div class="card stat">${percent(a.planning)}<small>PR\u00c9PARATION</small></div></div><div class="card stack" style="margin-top:12px"><label class="label" for="ops-group">GROUPE D\u2019ARM\u00c9ES</label><select id="ops-group"><option value="">Ind\u00e9pendante</option>${S.groups.filter(g=>g.owner===S.player).map(g=>`<option value="${g.id}" ${a.group===g.id?'selected':''}>${esc(g.name)}</option>`).join('')}</select>${btn('Affecter au groupe','groupForm',{army:a.id},'small')}<label class="label">R\u00c9SERVE OP\u00c9RATIONNELLE</label><div class="row">${[0,.15,.3].map(v=>btn(Math.round(v*100)+' %','reserveForm',{army:a.id,value:v},'small '+(a.reserveRatio===v?'active':''))).join('')}</div></div><div class="card stack" style="margin-top:12px">${metric('Objectif de perc\u00e9e',a.objective==null?'Libre':esc(pname(a.objective)))}${metric('Points du secteur',(a.frontSelection||[]).length)}<p class="note">${esc(a.assessment?.status||'En attente')}<br>Les divisions cherchent des secteurs soutenables, concentrent les attaques et conservent une r\u00e9serve. Les ordres manuels restent prioritaires.</p><div class="row wrap">${btn('Choisir sur la carte','pickObjective',{army:a.id},'primary small')}${btn('Tracer un secteur','drawFront',{army:a.id},'small')}${btn('Annuler l\u2019objectif','clearObjective',{army:a.id},'small')}</div></div><div style="margin-top:12px">${btn('G\u00e9rer l\u2019arm\u00e9e','manageOperationArmy',{army:a.id},'small wide')}</div>${tacticCard(a)}`:'<p>Aucune arm\u00e9e.</p>'}</section></div><p class="note" style="margin-top:20px">Au-del\u00e0 de cinq arm\u00e9es par groupe, le bonus du mar\u00e9chal diminue. Un officier ne peut pas commander simultan\u00e9ment une arm\u00e9e et un groupe.</p>`,'operations','wide');
}
function beginOperationTool(kind,aid){
 closeModal();army=aid;operationTool={kind,army:aid,points:[]};document.body.classList.remove('panel-open');
 const tool=$('operation-toolbar');tool.hidden=false;
 tool.innerHTML=`<span>${kind==='front'?'SECTEUR / Cliquez jusqu\u2019\u00e0 20 provinces accessibles':'OBJECTIF / Cliquez la province \u00e0 viser'}</span>${kind==='front'?btn('Valider le secteur','finishFront',{},'primary small'):''}${btn('Annuler','cancelOperation',{},'small')}`;
 $('map-hint').textContent=kind==='front'?'Les points limitent le secteur de d\u00e9ploiement. Glissez normalement pour d\u00e9placer la carte.':'L\u2019objectif guide les offensives ; il ne d\u00e9clare pas la guerre.';
}
function endOperationTool(){operationTool=null;$('operation-toolbar').hidden=true;dirty=true;}
function showVictory(){pauseGame();const cp=S.campaign;modal(`<div class="victory-screen"><div class="eyebrow">BILAN DE CAMPAGNE / ${dateText(S.day)}</div><div class="victory-mark">${icon('flag')}</div><h2>Objectifs atteints.</h2><p>${esc(countryName(S.player))} a rempli les conditions de la campagne ${esc(campaignLabel(cp.mode).toLowerCase())}.</p><div class="grid2" style="margin:24px 0"><div class="card stat">${num(cp.score)}<small>INDICE DE PUISSANCE</small></div><div class="card stat">${S.day-cp.startDay}<small>JOURS SIMUL\u00c9S</small></div></div><div class="stack">${btn('Poursuivre en bac \u00e0 sable','campaignContinue',{},'primary wide')}${btn('Exporter cette sauvegarde','save',{},'wide')}${btn('Nouvelle campagne','new',{},'wide')}</div></div>`,'victory','narrow');}
function checksum(text){let hash=2166136261;for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);return (hash>>>0).toString(16);}
function showSaveSlots(){pauseGame();let entries=[];for(let i=1;i<=3;i++){let raw=null;try{raw=JSON.parse(localStorage.getItem('frontieres-v11-slot-'+i)||'null');}catch{}entries.push({i,raw});}
 modal(`${modalHead('Archives de campagne','SAUVEGARDES / STOCKAGE LOCAL')}<p class="note">Trois emplacements dans ce navigateur. Ils ne sont pas synchronis\u00e9s entre appareils. Conservez une copie JSON avant de vider le stockage.</p><div class="stack" style="margin:18px 0">${entries.map(({i,raw})=>`<div class="slot-card"><div><span class="eyebrow">EMPLACEMENT 0${i}</span><h3>${raw?esc(raw.country):'Emplacement libre'}</h3><small>${raw?dateText(raw.day)+' / version '+esc(raw.release):'Aucune campagne enregistr\u00e9e'}</small></div><div class="row wrap">${btn('Enregistrer','storeSlot',{slot:i,occupied:!!raw},'small',!S)}${btn('Charger','loadSlot',{slot:i},'small',!raw)}${btn('\u00d7','deleteSlot',{slot:i},'small ghost',!raw)}</div></div>`).join('')}</div><div class="row wrap">${btn('Exporter un fichier JSON','save',{},'primary small',!S)}${btn('Importer un fichier','load',{},'small')}${btn('Reprendre l\u2019autosauvegarde','resume',{},'small')}</div><p class="note" style="margin-top:16px">Le d\u00e9coupage de 1.1 est conserv\u00e9 et ses sauvegardes peuvent migrer en 1.2. Les sauvegardes 0.2 et 1.0 ne sont pas compatibles et restent intactes dans leurs anciens emplacements. Une somme de contr\u00f4le d\u00e9tecte la corruption des emplacements locaux.</p>`,'slots');
}
function showPerformance15(){
  pauseGame();
  const p=lastWorkerPerf;
  modal(`${modalHead('Performance et diagnostic','FRONTIÈRES 1.5 / TÉLÉMÉTRIE LOCALE')}
    <p class="note">Mesures observées sur cet appareil ; elles ne proviennent pas d'un benchmark universel.</p>
    <div class="grid2" style="margin:16px 0">
      <div class="card stat">${p.avgMs??'—'} ms<small>Temps moyen par jour simulé</small></div>
      <div class="card stat">${p.p95Ms??'—'} ms<small>95e percentile (fenêtre récente)</small></div>
      <div class="card stat">${drawMs.toFixed(1)} ms<small>Dernier dessin de carte</small></div>
      <div class="card stat">${S?.units.length||0}<small>Divisions actives</small></div>
      <div class="card stat">${WORLD.provinces.length}<small>Provinces</small></div>
      <div class="card stat">${minimapRebuilds}<small>Recalculs de minicarte</small></div>
    </div>
    <div class="stack">${btn('Réglages de qualité','settings',{},'wide')}${btn('Diagnostics du moteur','diagnostics',{},'wide',!S)}${btn('Fermer','close',{},'wide')}</div>
    <p class="note" style="margin-top:16px">La vitesse réelle dépend du CPU, des guerres, du navigateur et de la complexité des mods. Ces mesures ne prouvent pas l'absence de bug.</p>`,'performance','narrow');
}
function showSettings(){modal(`${modalHead('Pr\u00e9f\u00e9rences','INTERFACE / ACCESSIBILIT\u00c9')}<div class="stack settings-list">${[['contrast','Contraste renforc\u00e9','Contours territoriaux et panneaux plus contrast\u00e9s.'],['largeText','Texte agrandi','Augmente la taille des textes des panneaux.'],['confirmOrders','Confirmer les ordres manuels','Demande confirmation avant chaque mouvement manuel.'],['minimap','Minicarte','Afficher la carte mondiale miniature.']].map(([k,name,desc])=>`<label class="settings-choice"><span><strong>${name}</strong><small>${desc}</small></span><input id="setting-${k}" type="checkbox" ${releaseSettings[k]?'checked':''}></label>`).join('')}<label class="settings-choice"><span><strong>Qualité de la carte</strong><small>Économie pour machines modestes ; haute précision pour écrans denses.</small></span><select id="setting-renderQuality"><option value="eco" ${releaseSettings.renderQuality==='eco'?'selected':''}>Économie</option><option value="balanced" ${releaseSettings.renderQuality==='balanced'?'selected':''}>Équilibrée</option><option value="sharp" ${releaseSettings.renderQuality==='sharp'?'selected':''}>Précision</option></select></label></div><div class="row" style="margin-top:18px">${btn('Enregistrer','applySettings',{},'primary')}${btn('Fermer','close')}</div><p class="note" style="margin-top:18px">Raccourcis : Espace / pause ; 1\u20135 / vitesse ; A / arm\u00e9es ; O / op\u00e9rations ; C / campagne ; \u00c9chap / fermer.</p>`,'settings','narrow');}
function drawOperations(ctx,zoom){
 const a=S?.armies.find(a=>a.id===army);if(!a&&!operationTool)return;
 const nodes=operationTool?.kind==='front'?operationTool.points:(a?.frontSelection||[]);
 if(nodes.length){ctx.strokeStyle='#edce86';ctx.lineWidth=3/zoom;ctx.setLineDash([8/zoom,4/zoom]);ctx.beginPath();nodes.forEach((id,i)=>{const p=centers[id];if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);});ctx.stroke();ctx.setLineDash([]);for(const id of nodes){const p=centers[id];ctx.fillStyle='#edce86';ctx.beginPath();ctx.arc(p.x,p.y,4/zoom,0,Math.PI*2);ctx.fill();}}
 if(a?.objective!=null){const p=centers[a.objective];ctx.strokeStyle='#ffdf94';ctx.lineWidth=2/zoom;ctx.beginPath();ctx.arc(p.x,p.y,15/zoom,0,Math.PI*2);ctx.moveTo(p.x-22/zoom,p.y);ctx.lineTo(p.x+22/zoom,p.y);ctx.moveTo(p.x,p.y-22/zoom);ctx.lineTo(p.x,p.y+22/zoom);ctx.stroke();ctx.font=`600 ${11/zoom}px system-ui`;ctx.fillStyle='#fff1c6';ctx.fillText('OBJECTIF',p.x,p.y-27/zoom);}
}
async function releaseAction(action,p){
 const redraw=()=>{renderPanel(true);if(modalKind==='operations')showOperations();};
 switch(action){
 case 'operations':showOperations();return true;
 case 'operationArmy':army=p.army;showOperations();return true;
 case 'createGroupForm':await cmd('newGroup',{name:'Groupe d\u2019arm\u00e9es '+(S.groups.filter(g=>g.owner===S.player).length+1)});showOperations();return true;
 case 'groupForm':await cmd('assignGroup',{army:p.army,group:$('ops-group').value?Number($('ops-group').value):null});showOperations();return true;
 case 'marshalForm':await cmd('marshal',{group:p.group,marshal:$('marshal-'+p.group).value||null});showOperations();return true;
 case 'reserveForm':await cmd('reserveRatio',p);showOperations();return true;
 case 'tacticForm':await cmd('armyTactic',{army:p.army,tactic:$('ops-tactic').value});showOperations();return true;
 case 'openArmyOps':army=p.army;showOperations();return true;
 case 'togglePockets':showPockets=!showPockets;dirty=true;renderPanel(true);return true;
 case 'focusReport':pid=p.pid;centerOn(pid,3.8);renderInspector();dirty=true;return true;
 case 'pickObjective':beginOperationTool('objective',p.army);return true;
 case 'drawFront':beginOperationTool('front',p.army);return true;
 case 'cancelOperation':endOperationTool();return true;
 case 'finishFront':if(operationTool){await cmd('frontSector',{army:operationTool.army,provinces:operationTool.points});endOperationTool();renderPanel(true);toast('Secteur op\u00e9rationnel enregistr\u00e9.');}return true;
 case 'clearObjective':await cmd('setObjective',{army:p.army,pid:null});showOperations();return true;
 case 'manageOperationArmy':closeModal();army=p.army;setTab('army');return true;
 case 'planHere':if(army==null)army=S.armies.find(a=>a.owner===S.player)?.id;await cmd('setObjective',{army,pid});toast('Objectif affect\u00e9 \u00e0 l\u2019arm\u00e9e.');dirty=true;return true;
 case 'exerciseArmy':await cmd(action,p);toast('Man\u0153uvres effectu\u00e9es : exp\u00e9rience acquise, mat\u00e9riel consomm\u00e9.');return true;
 case 'confirmDisband':if(confirm('Dissoudre ces divisions ? Les effectifs et 80 % du mat\u00e9riel restant seront r\u00e9cup\u00e9r\u00e9s.'))await cmd('disband',p);return true;
 case 'advisorForm':await cmd('advisor',{kind:$('advisor-kind').value});redraw();return true;
 case 'confirmReform':if(confirm('R\u00e9orienter le gouvernement ? Co\u00fbt : 100 PP, stabilit\u00e9 -12. Cette branche est uchronique.'))await cmd('reformGovernment',p);redraw();return true;
 case 'politicalCampaign':case 'demobilize':case 'frontSector':case 'dismissTutorial':case 'airAutoReinforce':case 'fleetReinforce':await cmd(action,p);redraw();return true;
 case 'campaignContinue':await cmd(action);closeModal();setTab('campaign');return true;
 case 'saveSlots':showSaveSlots();return true;
 case 'storeSlot':if(p.occupied&&!confirm('Remplacer cette sauvegarde locale ?'))return true;{const state=JSON.stringify(S);try{localStorage.setItem('frontieres-v11-slot-'+p.slot,JSON.stringify({format:'FRONTIERES_SLOT',release:S.release,country:countryName(S.player),day:S.day,checksum:checksum(state),state}));toast('Campagne enregistr\u00e9e.');showSaveSlots();}catch{toast('Stockage plein ou bloqu\u00e9. Exportez la sauvegarde JSON.',true);}}return true;
 case 'loadSlot':{const record=JSON.parse(localStorage.getItem('frontieres-v11-slot-'+p.slot)||'null');if(!record||checksum(record.state)!==record.checksum)throw Error('Emplacement absent ou corrompu.');await loadSave(JSON.parse(record.state));return true;}
 case 'deleteSlot':if(confirm('Effacer cet emplacement local ?')){localStorage.removeItem('frontieres-v11-slot-'+p.slot);showSaveSlots();}return true;
 case 'settings':showSettings();return true;
 case 'performance15':showPerformance15();return true;
 case 'applySettings':for(const k of ['contrast','largeText','confirmOrders','minimap'])releaseSettings[k]=$('setting-'+k).checked;releaseSettings.renderQuality=$('setting-renderQuality').value;try{localStorage.setItem('frontieres-settings',JSON.stringify(releaseSettings));}catch{}applyReleaseSettings();closeModal();return true;
 case 'stackMod':{const next=JSON.parse($('mod-editor').value);mod=Rules.validateMod(mod?{packs:[mod,next]}:next,BASE_WORLD,CATALOG);modPreviewInput14=null;toast('Paquets fusionn\u00e9s et valid\u00e9s.');showStart();return true;}
 default:return false;
 }
}

/* History 1.1. Archive facts and simulated outcomes are intentionally separate. */
let startBookmark='1936',historyYear='all',historyScope='all',atlasRegion=null,showHistoricalBorders=false;
const HISTORY_LABEL={applied:'Appliqué',diverged:'Divergence',queued:'Décision requise',skipped:'Non déclenché',documentary:'Repère documentaire',bookmark:'Avant le départ',deferred:'En attente',offered:'Proposition au joueur',cancelled:'Devenu caduc'};
function historySourceLinks(ids){return (ids||[]).map(id=>{const s=CATALOG.historySources?.[id]||WORLD.cartography?.sources?.[id];return s?`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} &#8599;</a>`:'';}).join('');}
function historyRow(id){return S?.historyState?.ledger.find(r=>r.id===id);}
function historyStatus(e){const r=historyRow(e.id);return r?HISTORY_LABEL[r.status]||r.status:!S||e.day>S.day?'Repère à venir':S.historical?'Conditions non réunies':'Chronologie désactivée';}
function previewIdentity(d){
 if(startBookmark!=='1939')return d;
 const patched=JSON.parse(JSON.stringify(d));
 for(const e of CATALOG.historicalEvents.filter(e=>e.day<=1338&&e.bookmark))for(const a of e.choices[0]?.actions||[])if(a.type==='government'&&a.country===d.id)Object.assign(patched,a.fields);
 const leaders={SPA:['Francisco Franco','Chef de l\u2019Etat'],RAJ:['Victor Hope','Vice-roi des Indes'],AST:['Robert Menzies','Premier ministre'],EGY:['Farouk','Roi'],TUR:['\u0130smet \u0130n\u00f6n\u00fc','President'],FIN:['Ky\u00f6sti Kallio','President']};
 if(leaders[d.id]){patched.leader=leaders[d.id][0];patched.wiki=leaders[d.id][0];patched.role=leaders[d.id][1];}return patched;
}
function actionDescription(a){
 const n=id=>esc(countryName(id)),region=id=>esc(WORLD.historicalRegions.find(r=>r.id===id)?.name||id);
 switch(a.type){
 case 'transfer':return `${region(a.region)} : ${n(a.fromCountry)} &#8594; ${n(a.toCountry)}, seulement pour les provinces encore contrôlées par le cédant.`;
 case 'annex':return `Proposition d'annexion de ${n(a.loser)} par ${n(a.winner)}. Le joueur ciblé peut refuser.`;
 case 'schedule':return `Application au plus tôt le ${dateText(a.day)} : ${(a.actions||[]).map(actionDescription).join(' ')}`;
 case 'war':return `Déclaration de guerre : ${n(a.a)} contre ${n(a.b)}, si le contexte diplomatique le permet.`;
 case 'peace':return `Fin de la guerre bilatérale entre ${n(a.a)} et ${n(a.b)}.`;
 case 'pact':return `Pacte de non-agression ${n(a.a)} / ${n(a.b)} : ${a.days} jours.`;
 case 'breakPact':return `Rupture du pacte ${n(a.a)} / ${n(a.b)}.`;
 case 'government':return `Gouvernement de ${n(a.country)} : ${Object.entries(a.fields).filter(([k])=>['leader','cabinet','headOfState','role'].includes(k)).map(([,v])=>esc(v)).join(' / ')}.`;
 case 'demilitarize':return a.active?'Zone rhénane démilitarisée.':'Levée des restrictions militaires en Rhénanie.';
 case 'ideology':return `Réorientation politique de ${n(a.country)} : ${esc(IDEO[a.value]||a.value)}.`;
 case 'faction':return `${n(a.country)} rejoint le bloc ${esc(a.name)}.`;
 case 'nonbelligerent':return `${n(a.country)} ${a.active?"n'entre pas automatiquement dans les guerres de sa faction":'peut entrer dans la guerre aux côtés de ses alliés'}.`;
 case 'guarantee':return `${n(a.country)} garantit ${n(a.target)}.`;
 case 'civilWar':return `Scission militaire et territoriale effective de ${n(a.country)}.`;
 case 'czechPartition':return 'Démantèlement tchécoslovaque : création de la Slovaquie, cession de la Ruthénie à la Hongrie, occupation allemande du reste.';
 case 'franceArmistice':return a.vichy?'Création de Vichy et poursuite de la guerre par la France libre en exil.':"Poursuite de la guerre depuis les territoires d'outre-mer, sans Vichy.";
 case 'operation':return `Activation de plans offensifs de ${n(a.country)} contre ${n(a.target)}. Aucune victoire automatique.`;
 case 'airOperation':return `Affectation d'une mission aérienne de ${n(a.country)}. Son résultat dépend des forces disponibles.`;
 case 'aid':return `Transfert réel de ${num(a.amount)} ${esc(CATALOG.equipment[a.equipment]?.name||a.equipment)} au maximum : ${n(a.fromCountry)} &#8594; ${n(a.toCountry)}.`;
 case 'pacificRaid':return 'Pertes limitées aux navires américains effectivement présents dans les zones du Pacifique.';
 case 'torch':return "Préparation d'une offensive américaine. Aucun territoire conquis par le calendrier.";
 case 'overlord':return 'Affectation d\u2019objectifs côtiers aux armées alliées. Le débarquement reste à exécuter.';
 default:return esc(a.type);
 }
}
function historicalEventBody(e){
 const row=historyRow(e.parentId||e.id);
 return `<div class="history-fact"><div class="eyebrow">REPÈRE RÉEL / ${dateText(e.day)}</div><h3>${esc(e.title)}</h3><p>${esc(e.historicalText||e.text)}</p><div class="archive-links">${historySourceLinks(e.sourceIds)}</div></div>
 <div class="history-simulation"><div class="eyebrow">DANS VOTRE CAMPAGNE</div><p>${esc(e.historyResponse?'Vous êtes visé par une proposition territoriale. Votre consentement est requis.':e.kind==='information'?"Notice documentaire uniquement : aucune conquête, perte ni capitulation n'est imposée à cette date.":e.text)}</p>
 ${row?`<p class="note">${esc(HISTORY_LABEL[row.status]||row.status)} le ${dateText(row.day)}${row.reason?' - '+esc(row.reason):''}.</p>`:''}
 ${e.proposal?`<div class="history-effects">${(e.proposal.actions||[]).map(a=>`<p>${actionDescription(a)}</p>`).join('')}</div>`:''}</div>`;
}
function showHistoricalDetail(id){
 const e=CATALOG.historicalEvents.find(e=>e.id===id);if(!e)return;
 pauseGame();modal(`${modalHead(e.title,'ARCHIVES / CHRONOLOGIE 1936-1945')}${historicalEventBody(e)}
 ${e.kind!=='information'?`<div class="sectionlabel">Branches de simulation</div><div class="stack">${e.choices.map((c,i)=>`<div class="card"><div class="row between"><strong>${i+1}. ${esc(c.text)}</strong>${tag(i===0?'OPTION HISTORIQUE':'ALTERNATIVE')}</div><div class="history-effects">${(c.actions||[]).map(a=>`<p>${actionDescription(a)}</p>`).join('')}</div><small>${effectText(c.effect||{})}</small></div>`).join('')}</div>`:''}
 <p class="note" style="margin-top:15px">La date de référence ne garantit pas ce résultat dans la simulation. Les effets et les conditions sont des règles de jeu originales.</p>
 <div class="row" style="margin-top:18px">${btn('Retour aux archives','atlas')}${e.region?btn('Localiser la région','historyRegion',{id:e.region}):''}</div>`,'historyDetail','');
}
function historyPanel(){
 const h=S.historyState,ledger=h?.ledger||[],next=CATALOG.historicalEvents.filter(e=>e.day>=S.day&&e.kind==='decision').slice(0,3);
 const applied=ledger.filter(r=>r.status==='applied').length,diverged=ledger.filter(r=>r.status==='diverged'||r.status==='skipped').length;
 return panelHeader('Histoire & atlas','Les archives racontent les faits ; votre campagne peut diverger.')+
 `<div class="history-cover"><div class="eyebrow">ARCHIVES DE CAMPAGNE</div><h3>1936 <span>&mdash;</span> 1945</h3><p>${S.historical?'Chronologie conditionnelle active':'Diplomatie libre : chronologie inactive'}</p></div>
 <div class="grid2"><div class="card stat">${applied}<small>DÉCISIONS APPLIQUÉES</small></div><div class="card stat">${diverged}<small>DIVERGENCES / ABSENCES</small></div></div>
 <div class="stack" style="margin:14px 0">${btn('Ouvrir l\u2019atlas historique '+icon('arrow'),'atlas',{},'primary wide')}${btn('Régions et changements de frontières','atlas',{section:'regions'},'wide')}${btn(showHistoricalBorders?'Masquer les frontières de départ':'Comparer aux frontières de départ','historyBorders',{},'wide')}</div>
 <div class="sectionlabel">Prochains repères documentaires</div>${next.map(e=>`<button class="history-mini" data-a="historyDetail" data-p="${encodeURIComponent(JSON.stringify({id:e.id}))}"><small>${dateText(e.day)} / ${esc(countryName(e.country))}</small><strong>${esc(e.title)}</strong><span>Consulter les branches &#8599;</span></button>`).join('')||'<p class="note">Fin de la période documentée.</p>'}
 <div class="sectionlabel">Journal historique</div><div class="stack">${ledger.slice(-10).reverse().map(r=>{const e=CATALOG.historicalEvents.find(e=>e.id===r.id);return `<button class="history-mini" data-a="historyDetail" data-p="${encodeURIComponent(JSON.stringify({id:r.id}))}"><small>${dateText(r.day)} / ${esc(HISTORY_LABEL[r.status]||r.status)}</small><strong>${esc(e?.title||r.id)}</strong>${r.reason?`<span>${esc(r.reason)}</span>`:''}</button>`;}).join('')||'<p class="note">Les choix et les faits seront inscrits ici.</p>'}</div>
 <div class="sectionlabel">Fiabilité cartographique</div><div class="card"><p class="note">Littoraux Natural Earth ; corrections territoriales manuelles documentées. ${WORLD.historicalRegions.length} régions historiques, ${WORLD.rivers.length} fleuves indicatifs. Les provinces ne sont pas un découpage administratif certifié.</p></div>`;
}
function showAtlas(section='timeline'){
 pauseGame();const entries=CATALOG.historicalEvents.filter(e=>(historyYear==='all'||e.date.startsWith(historyYear))&&(historyScope!=='player'||!S||e.country===S.player)&&(historyScope!=='decisions'||e.kind==='decision'));
 modal(`${modalHead('Atlas historique','FRONTIÈRES 1.1 / LES ARCHIVES ET LE MONDE')}
 <div class="atlas-banner"><div><div class="eyebrow">DU MONDE RÉEL À VOTRE CAMPAGNE</div><h3>Les dates ne sont pas un destin.</h3><p>Une chronologie documentée ; des frontières qui réagissent aux décisions, aux traités et aux guerres.</p></div><div class="atlas-numbers"><strong>${CATALOG.historicalEvents.length}</strong><small>REPÈRES DATÉS</small><strong>${WORLD.historicalRegions.length}</strong><small>RÉGIONS DOCUMENTÉES</small></div></div>
 <div class="row atlas-tabs">${btn('Chronologie','atlas',{section:'timeline'},section==='timeline'?'active':'')}${btn('Atlas territorial','atlas',{section:'regions'},section==='regions'?'active':'')}${btn('Pays & personnages','atlas',{section:'countries'},section==='countries'?'active':'')}${btn('Sources & méthode','atlas',{section:'sources'},section==='sources'?'active':'')}</div>
 ${section==='timeline'?`<div class="row history-filters"><label><span class="label">ANNÉE DE RÉFÉRENCE</span><select id="history-year"><option value="all">Toutes les années</option>${Array.from({length:10},(_,i)=>1936+i).map(y=>`<option value="${y}" ${String(y)===historyYear?'selected':''}>${y}</option>`).join('')}</select></label><label><span class="label">AFFICHAGE</span><select id="history-scope"><option value="all">Tous les repères</option><option value="decisions" ${historyScope==='decisions'?'selected':''}>Décisions uniquement</option><option value="player" ${historyScope==='player'?'selected':''}>Mon pays</option></select></label><span class="note">${entries.length} entrées</span></div><div class="timeline-grid">${entries.map(e=>`<button class="timeline-entry ${e.kind}" data-a="historyDetail" data-p="${encodeURIComponent(JSON.stringify({id:e.id}))}"><span class="timeline-date">${dateText(e.day)}</span><div class="row between"><small>${esc(countryName(e.country))}</small>${tag(e.kind==='information'?'ARCHIVE':e.kind==='government'?'GOUVERNEMENT':'DÉCISION')}</div><h3>${esc(e.title)}</h3><p>${esc(e.historicalText||e.text)}</p><span class="timeline-status">${esc(historyStatus(e))} &#8599;</span></button>`).join('')||'<p class="note">Aucune entrée pour ce filtre.</p>'}</div>`:''}
 ${section==='regions'?`<p class="note" style="margin:16px 0">Sélectionnez une région pour la localiser sur la carte et examiner ses limites. Tous les tracés ci-dessous sont des approximations de jeu, pas des numérisations de traités.</p><div class="atlas-region-grid">${WORLD.historicalRegions.map(r=>`<button class="card atlas-region" data-a="historyRegion" data-p="${encodeURIComponent(JSON.stringify({id:r.id}))}"><small>${r.provinces.length} PROVINCES / RECONSTRUCTION</small><h3>${esc(r.name)}</h3><p>${esc(r.note||'Limites indicatives regroupant les provinces concernees par le scenario.')}</p><span>Localiser sur la carte &#8594;</span></button>`).join('')}</div>`:''}
 ${section==='countries'?`<div class="history-fact"><div class="eyebrow">DOSSIERS BIOGRAPHIQUES</div><h3>74 gouvernements au début de la partie</h3><p>Recherchez une fiche nationale, son gouvernement, ses officiers nommés et les portraits dont la provenance et la licence sont documentées. Les biographies sont des liens externes, non des fiches universitaires vérifiées individuellement.</p></div><div class="row wrap" style="margin:16px 0"><label for="atlas-country">Pays consulté</label><select id="atlas-country"><option value="">Sélectionner un pays...</option>${[...WORLD.countries].sort((a,b)=>a.name.localeCompare(b.name,'fr')).map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></div><div class="atlas-region-grid">${WORLD.countries.map(c=>`<button class="card atlas-region" data-a="countryDossier" data-p="${encodeURIComponent(JSON.stringify({id:c.id}))}"><small>${esc(c.id)} · ${esc(c.role)}</small><h3>${esc(c.name)}</h3><p>${esc(c.leader)}</p><span>Consulter le dossier &#8599;</span></button>`).join('')}</div>`:''}
 ${section==='sources'?`<div class="history-fact"><div class="eyebrow">MÉTHODE ET LIMITES</div><h3>Une reconstruction originale, pas un atlas certifié.</h3><p>Le fond physique est issu de Natural Earth à l'échelle 1:110 millions, dans le domaine public. Les frontières historiques, les régions diplomatiques et les fleuves sont des tracés manuels schématiques. Les sources ci-dessous documentent les faits ; elles ne fournissent pas toutes les coordonnées du jeu.</p><p>CShapes n'est pas incorporé. Les terrains, les valeurs industrielles et les forces sont des paramètres de simulation. Le point de départ de 1939 est un état initial composé, non une simulation cachée de trois ans.</p><p>Les persécutions et crimes de masse sont rappelés dans des notices documentaires : ils ne constituent pas des actions récompensées par le jeu.</p></div><div class="archive-links source-grid">${historySourceLinks(Object.keys(CATALOG.historySources))}</div>`:''}`,'atlas','wide');
}
function showCountryDossier(id){
 const archive=PEOPLE.countries[id],d=S?.countries[id]?.identity||previewIdentity(DEF[id]||{});
 if(!archive||!d?.id)return;
 const photos=[d.leader,d.headOfState,d.cabinet].filter((n,i,all)=>n&&all.indexOf(n)===i);
 const source=name=>{const p=PORTRAITS[name]||portraitResolved.get(name);return p?`<a target="_blank" rel="noopener noreferrer" href="${esc(p.source)}">Notice photo et licence (Wikimedia Commons) &#8599;</a>`:'';};
 const events=CATALOG.historicalEvents.filter(e=>e.country===id);
 const officers=(d.commanders||[]).map(o=>`<div class="card"><strong>${esc(o.name)}</strong><p class="note">Compétences simulées ; pas de rang ni d'affectation certifiés pour chaque date.</p><a href="https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(o.name)}" target="_blank" rel="noopener noreferrer">Chercher la biographie &#8599;</a>${source(o.name)}</div>`).join('');
 pauseGame();modal(`${modalHead(d.name,'ATLAS / DOSSIER NATIONAL 1936–1945')}
 <div class="history-fact"><div class="eyebrow">SOURCE ET FONCTION HISTORIQUE</div><h3>${esc(d.name)}</h3>
 <p>Point de départ documentaire : 1er janvier 1936. Les identités affichées dans une campagne commencée ou en 1939 peuvent différer de celles de 1936.</p>
 <div class="archive-links"><a href="${esc(archive.biography)}" target="_blank" rel="noopener noreferrer">${esc(archive.leader)} — biographie &#8599;</a></div></div>
 <div class="row wrap" style="gap:14px;margin:15px 0">${photos.map((name,i)=>`<div class="card" style="min-width:130px;flex:1;max-width:210px"><div class="leader-card">${portrait(id,'tiny',{leader:name,wiki:i===0&&name===d.leader?(d.wiki||name):name,id})}<div><strong>${esc(name)}</strong><small style="display:block">${i===0?esc(d.role):name===d.headOfState?'Chef d’État':'Cabinet'}</small></div></div><div class="archive-links">${source(name)||'<small>Portrait libre non vérifié</small>'}</div></div>`).join('')}</div>
 <div class="card"><h3>Administration de départ</h3><div class="grid2" style="margin:12px 0"><div class="stat">${d.provinces?.length||0}<small>PROVINCES DE JEU</small></div><div class="stat">${d.commanders?.length||0}<small>COMMANDANTS NOMMÉS</small></div></div><p class="note">Capitale de jeu : ${esc(d.capitalName)}. Les propriétés industrielles, idéologiques et militaires sont un équilibrage, pas des statistiques d'archives.</p></div>
 <div class="sectionlabel">OFFICIERS DU SCÉNARIO</div><div class="atlas-region-grid">${officers||'<p class="note">Aucun officier individuel renseigné pour ce pays.</p>'}</div>
 <div class="sectionlabel">CHRONOLOGIE DOCUMENTÉE</div><div class="stack">${events.map(e=>btn(dateText(e.day)+' — '+esc(e.title),'historyDetail',{id:e.id},'wide')).join('')||'<p class="note">Aucune entrée nationale dédiée dans cette première chronologie.</p>'}</div>
 <p class="note" style="margin-top:20px">Biographies : liens de lecture Wikipédia, non vérification académique individuelle. Photographies : uniquement les notices de fichiers explicites ; une absence de portrait n'est jamais remplacée par une photo fictive.</p>
 <div style="margin-top:20px">${btn('Retour aux pays','atlas',{section:'countries'})}</div>`,'countryDossier','wide');
}
function showRegionOnMap(id){
 const r=WORLD.historicalRegions.find(r=>r.id===id);if(!r?.provinces.length)return;
 closeModal();atlasRegion=id;mapMode='history';renderMapModes();const ps=r.provinces.map(i=>centers[i]);
 const minX=Math.min(...ps.map(p=>p.x)),maxX=Math.max(...ps.map(p=>p.x)),minY=Math.min(...ps.map(p=>p.y)),maxY=Math.max(...ps.map(p=>p.y));
 camera={x:(minX+maxX)/2,y:(minY+maxY)/2,zoom:Math.max(1.4,Math.min(10,Math.min((mapWidth-230)/(maxX-minX+50),(mapHeight-140)/(maxY-minY+50))))};
 pid=r.provinces[0];if(S)setTab('history');renderInspector();dirty=true;toast(r.name+' : contour indicatif, '+r.provinces.length+' provinces.');
}
function historyInspector(p){
 const régions=(p.historicalRegions||[]).map(id=>WORLD.historicalRegions.find(r=>r.id===id)).filter(Boolean);
 return `<div class="inspector-history"><div class="eyebrow">ATLAS / ${p.overseas?"TERRITOIRE D'OUTRE-MER":'REPÈRE GÉOGRAPHIQUE'}</div><p class="note">${esc(p.administration||countryName(p.owner))}<br>Contrôleur au 1er janvier 1936 : ${esc(DEF[p.owner]?.name||p.owner)}.</p>${régions.map(r=>btn(esc(r.name)+' &#8599;','historyRegion',{id:r.id},'small wide ghost')).join('')}<small>Identifiant géographique stable : ${esc(p.geoKey||'indisponible')}. Frontières et découpage de jeu simplifiés.</small></div>`;
}
function drawHistoricalLayers(ctx,zoom){
 if(zoom>1.15||mapMode==='history'){
  ctx.strokeStyle=mapMode==='history'?'#84bed0':'#557e97';ctx.lineWidth=(mapMode==='history'?1.7:1.15)/zoom;
  for(const r of WORLD.rivers||[]){ctx.beginPath();r.points.forEach(([x,y],i)=>{const p=project(x,y);if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);});ctx.stroke();}
 }
 const h=S?.historyState;
 if(h?.dmz?.length){ctx.strokeStyle='#edc582';ctx.lineWidth=1.5/zoom;ctx.setLineDash([3/zoom,3/zoom]);for(const i of h.dmz)ctx.stroke(geometries[i].path);ctx.setLineDash([]);}
 if(showHistoricalBorders){ctx.strokeStyle='#efe4bcbf';ctx.lineWidth=1.3/zoom;ctx.setLineDash([4/zoom,3/zoom]);for(const p of WORLD.provinces)if(p.neighbors.some(i=>WORLD.provinces[i].owner!==p.owner))ctx.stroke(geometries[p.id].path);ctx.setLineDash([]);}
 const r=WORLD.historicalRegions.find(r=>r.id===atlasRegion);
 if(mapMode==='history'&&r){ctx.strokeStyle='#ffe9ae';ctx.lineWidth=2/zoom;for(const i of r.provinces)ctx.stroke(geometries[i].path);}
}


applyReleaseSettings();
// Read-only state and ordinary commands exposed for automated integration tests.
window.Frontieres={openCountryDossier:showCountryDossier,openAtlas:showAtlas,openHistoricalEvent:showHistoricalDetail,openRegion:showRegionOnMap,catalog:CATALOG,state:()=>S,command:cmd,screenPoint,selectProvince:id=>{pid=id;renderInspector();dirty=true;},tab:setTab,openOperations:showOperations,openSlots:showSaveSlots,openSettings:showSettings,load:loadSave,performance:()=>({drawMs,minimapRebuilds,stateMessages,worker:lastWorkerPerf,quality:releaseSettings.renderQuality}),get world(){return WORLD}};
const ORIGINAL_PAGE='<!doctype html>\n'+document.documentElement.outerHTML;
document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
renderRail();renderTop();renderPanel();renderMapModes();resize();centerOn(DEF.FRA.capital,3.4);showStart();requestAnimationFrame(drawMap);
