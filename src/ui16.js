/* Frontieres 1.6 interface: states, climate, resources, laws and the panels of
 * the 1.6 systems. Loaded after ui.js; wraps its renderers. All strings escaped. */
'use strict';
const RES16={steel:'Acier',oil:'Pétrole',rubber:'Caoutchouc',aluminium:'Aluminium',tungsten:'Tungstène',chromium:'Chrome'};
const TERRAIN_COLORS16={plains:'#879a77',forest:'#638577',mountains:'#a09f92',desert:'#b4a481',urban:'#a29683',hills:'#9c9a72',marsh:'#6c8a86',jungle:'#4e7a58'};
const WEATHER_COLORS16={clear:'#8fa58a',rain:'#6f8fa3',storm:'#58708f',snow:'#d6dbdf',blizzard:'#eef2f4',frost:'#b6d0e4',mud:'#8a7458',monsoon:'#4f7189',sandstorm:'#c9a86a',heat:'#c98b5e'};
const CATEGORY_COLORS16={wasteland:'#55625f',pastoral:'#6d7a62',rural:'#7f8f68',town:'#96a06f',large_town:'#aaa874',city:'#bfae76',large_city:'#cfa86c',metropolis:'#dda262',megalopolis:'#eb9c58'};
Object.assign(MODES,{states:'États',weather:'Météo',resources:'Ressources'});
const states16=()=>Rules.deriveStates(WORLD,CATALOG);
const stateOf16=pid=>states16().list[states16().of[pid]];
const lawList16=kind=>CATALOG.laws?.[kind]||[];
const weatherAt16=pid=>Rules.weatherKey(WORLD.provinces[pid],S?.day||0);
const stateUsed16=st=>S?total(st.provinces.map(i=>['civ','mil','dock','refinery'].reduce((n,k)=>n+(S.provinces[i][k]||0),0))):0;
const stateCapacity16=(st,id=S?.player)=>Math.floor(st.slots*(1+(nation(id)?.bonus.buildingSlots||0)))+(S?.stateExtra?.[st.id]||0);
const isCore16=(id,pid)=>{const c=nation(id);return Array.isArray(c?.identity.cores)?c.identity.cores.includes(pid):WORLD.provinces[pid].owner===id;};

/* Map colours and overlays */
const colorOf15=colorOf;
colorOf=function(p){
  if(mapMode==='terrain')return TERRAIN_COLORS16[p.terrain]||'#879a77';
  if(mapMode==='states'){const st=stateOf16(p.id);return CATEGORY_COLORS16[st?.category]||'#7f8f68';}
  if(mapMode==='weather')return WEATHER_COLORS16[weatherAt16(p.id)]||'#8fa58a';
  if(mapMode==='resources'){
    const value=Object.keys(RES16).reduce((n,k)=>n+(p[k]||0)*(k==='steel'?.6:1.4),0);
    if(!value)return '#5f716d';
    const best=Object.keys(RES16).sort((a,b)=>(p[b]||0)-(p[a]||0))[0];
    const hue={steel:205,oil:30,rubber:120,aluminium:190,tungsten:280,chromium:330}[best];
    return `hsl(${hue},${28+Math.min(40,value*4)}%,${38+Math.min(22,value*2)}%)`;
  }
  return colorOf15(p);
};
const renderMapModes15=renderMapModes;
renderMapModes=function(){
  renderMapModes15();
  const labels={terrain:'Plaine / forêt / collines / montagne / marais / jungle / désert / ville',states:'États : couleur selon la catégorie (emplacements de bâtiments)',weather:'Clair / pluie / orage / neige / blizzard / grand froid / boue / mousson / sable / chaleur',resources:'Teinte : ressource dominante (acier, pétrole, caoutchouc, aluminium, tungstène, chrome)'};
  if(labels[mapMode]){$('map-legend').textContent=labels[mapMode];$('map-legend').style.display='block';}
};
const drawHistoricalLayers15=drawHistoricalLayers;
drawHistoricalLayers=function(ctx,zoom){
  drawHistoricalLayers15(ctx,zoom);
  if(mapMode==='states'||zoom>3.2&&mapMode==='political'){
    const of=states16().of;
    ctx.strokeStyle=mapMode==='states'?'#1d2f2cd0':'#2a3f3a6b';ctx.lineWidth=(mapMode==='states'?1.3:.7)/zoom;
    for(const p of WORLD.provinces)if(p.neighbors.some(n=>of[n]!==of[p.id])){const b=geometries[p.id].bbox;if(b.maxx<camera.x-mapWidth/2/zoom||b.minx>camera.x+mapWidth/2/zoom||b.maxy<camera.y-mapHeight/2/zoom||b.miny>camera.y+mapHeight/2/zoom)continue;ctx.stroke(geometries[p.id].path);}
  }
  if(WORLD.straits&&zoom>1.6){
    ctx.strokeStyle='#e3d6a4';ctx.lineWidth=1.6/zoom;ctx.setLineDash([2/zoom,2/zoom]);
    for(const key of Object.keys(WORLD.straits)){const [a,b]=key.split(':').map(Number),pa=centers[a],pb=centers[b];if(!pa||!pb)continue;ctx.beginPath();ctx.moveTo(pa.x,pa.y);ctx.lineTo(pb.x,pb.y);ctx.stroke();}
    ctx.setLineDash([]);
  }
  for(const hook of DRAW16)hook(ctx,zoom);
};
const DRAW16=[];

/* Province inspector: state, cores, climate and deposits */
const renderInspector15=renderInspector;
renderInspector=function(){
  renderInspector15();
  if(pid===null||!$('inspector'))return;
  const p=WORLD.provinces[pid],st=stateOf16(pid),owner=control(pid),w=CATALOG.weather?.[weatherAt16(pid)];
  const deposits=Object.entries(RES16).filter(([k])=>p[k]).map(([k,n])=>`${esc(n)} ${p[k]}`).join(' / ');
  const html=`<div class="inspector-state"><div class="eyebrow">ÉTAT / ${esc(st?.categoryName||'')}</div><strong>${esc(st?.name||'')}</strong>
    ${S&&st?metric('Emplacements industriels',stateUsed16(st)+' / '+stateCapacity16(st,owner)):''}
    ${S?metric('Statut',isCore16(owner,pid)?'Territoire national':'Territoire non national'):''}
    ${metric('Météo',esc(w?.name||'Clair'))}
    ${metric('Terrain',esc(CATALOG.terrain[p.terrain]?.name||p.terrain))}
    ${deposits?`<small>Gisements : ${deposits}</small>`:''}
    ${S?`<small style="display:block">Bâtiments : DCA ${S.provinces[pid].aa||0} / fort côtier ${S.provinces[pid].coastalFort||0} / raffinerie ${S.provinces[pid].refinery||0}</small>`:''}</div>`;
  const history=$('inspector').querySelector('.inspector-history');
  if(history)history.insertAdjacentHTML('beforebegin',html);else $('inspector').insertAdjacentHTML('beforeend',html);
};

/* Panels */
const PANELS16={};
const renderPanel15=renderPanel;
renderPanel=function(force=false){
  if(!S||!PANELS16[tab])return renderPanel15(force);
  if(!force&&$('panel').contains(document.activeElement)&&['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;
  const html=PANELS16[tab]();
  if(html===undefined)return renderPanel15(force);
  const scroll=$('panel').scrollTop;$('panel').innerHTML=html;$('panel').scrollTop=scroll;hydratePortraits();
};
function lawCard16(kind,title,current,note){
  const c=nation(),atWar=S.wars.some(w=>w.a===S.player||w.b===S.player);
  return `<div class="sectionlabel">${title}</div><div class="card stack">${metric('En vigueur',esc(current?.name||''))}<div class="policy-options">${lawList16(kind).map((l,i)=>{
    const blocked=(l.war&&!atWar)||(l.tension&&!atWar&&S.tension<l.tension&&c.support<60)||c.pp<l.cost;
    const effects=[l.consumer!==undefined?'biens de consommation '+Math.round(l.consumer*100)+' %':'',l.production?'production '+(l.production>0?'+':'')+Math.round(l.production*100)+' %':'',l.construction?'construction '+(l.construction>0?'+':'')+Math.round(l.construction*100)+' %':'',l.pool!==undefined?'réserve ×'+l.pool:'',l.export!==undefined?'exportable '+Math.round(l.export*100)+' %':'',l.research?'recherche '+(l.research>0?'+':'')+Math.round(l.research*100)+' %':''].filter(Boolean).join(', ');
    return btn(`${esc(l.name)}<small style="display:block">${esc(effects)} / ${l.cost} PP${l.war?' / guerre':''}${l.tension?' / tension '+l.tension+' %':''}</small>`,'law',{kind,value:l.id},'small '+(current?.id===l.id?'active':''),current?.id===l.id||blocked);
  }).join('')}</div><small>${note}</small></div>`;
}
PANELS16.nation=function(){
  const c=nation(),d=code(S.player),us=ownUnits(),current=c.focus?focusTree().find(f=>f.id===c.focus.id):null;
  return panelHeader('Vue d’ensemble','Vous dirigez l’État, pas seulement son armée.')+`
    <div class="leader-card">${portrait(S.player)}<div><h3>${esc(d.leader)}</h3><small>${esc(d.role)}</small>${tag(IDEO[c.ideology])}</div></div>
    ${d.cabinet?`<p class="note" style="margin-top:8px">Chef du gouvernement : ${esc(d.cabinet)}</p>`:''}
    <div class="row between" style="margin:7px 0 15px">${btn('Source du portrait ↗','portraitSource',{},'small ghost')}${btn('Charger le portrait','fetchPortrait',{},'small ghost')}</div>
    <div class="grid2"><div class="card stat">${Math.round(c.support)} %<small>SOUTIEN À LA GUERRE</small></div><div class="card stat">${percent(c.stats.supply)}<small>RAVITAILLEMENT MOYEN</small></div><div class="card stat">${us.length}<small>DIVISIONS DÉPLOYÉES</small></div><div class="card stat">${num(c.casualties)}<small>PERTES MILITAIRES</small></div><div class="card stat">${percent(c.stats.coreShare??1)}<small>TERRITOIRE NATIONAL TENU</small></div><div class="card stat">${num(c.pool)}<small>POPULATION MOBILISABLE</small></div></div>
    ${(NATION_EXTRA16).map(f=>f()).join('')}
    <div class="sectionlabel">Votre priorité nationale</div>
    <div class="focus-current"><div class="eyebrow">${current?'PROGRAMME EN COURS':'AUCUN PROGRAMME ACTIF'}</div><h3>${current?esc(current.name):'Choisir une direction'}</h3><p class="note">${current?effectText(current.effect):'La première priorité ouvre les branches industrielles, militaires et diplomatiques.'}</p>${current?bar(c.focus.progress/current.days*100)+`<small>${c.focus.progress} / ${current.days} jours</small>`:''}<div style="margin-top:11px">${btn('Ouvrir l’arbre '+icon('arrow'),'focusTree',{},'small wide')}</div></div>
    <div class="sectionlabel">À décider</div>
    <div class="todo">${icon('research')}<div class="grow"><strong>${c.slots-c.research.length} équipe(s) scientifique(s) libre(s)</strong><small>${c.tech.length} technologies acquises</small></div>${btn(icon('arrow'),'tab',{id:'research'},'iconbtn ghost')}</div>
    <div class="todo">${icon('industry')}<div class="grow"><strong>${c.stats.freeCiv} usines civiles disponibles</strong><small>${c.build.length} chantier(s) dans la file</small></div>${btn(icon('arrow'),'tab',{id:'industry'},'iconbtn ghost')}</div>
    <div class="row wrap" style="margin:13px 0">${btn('Institutions et élections →','tab',{id:'politics'},'small')}${btn('Budget et trésor →','tab',{id:'treasury'},'small')}</div>
    ${lawCard16('economy','Loi économique',lawList16('economy').find(l=>l.id===c.economy),'Plus de mobilisation libère des usines civiles et accélère les arsenaux, mais exige tension mondiale, guerre ou soutien.')}
    ${lawCard16('conscription','Conscription',lawList16('conscription')[c.conscription],'La réserve et le rythme d’incorporation dépendent de la loi et du territoire national contrôlé.')}
    ${lawCard16('trade','Commerce extérieur',lawList16('trade').find(l=>l.id===c.trade),'Une économie ouverte exporte davantage de ressources mais gagne en productivité et en usines civiles.')}
    <div class="sectionlabel">Politique intérieure</div><div class="card"><div class="partybar">${Object.entries(c.parties).map(([k,v])=>`<i style="width:${v}%;background:${PARTYC[k]}"></i>`).join('')}</div><div class="policy-legend">${Object.entries(c.parties).map(([k,v])=>`<span><i style="background:${PARTYC[k]}"></i>${esc(IDEO[k])} ${Math.round(v)} %</span>`).join('')}</div></div>
    <div class="stack" style="margin-top:9px">${btn('Compromis social / +8 stabilité / 45 PP','decision',{id:'stability'},'small',(c.policyCooldown.stability||0)>S.day)}${btn('Campagne de soutien / +10 / 45 PP','decision',{id:'support'},'small',(c.policyCooldown.support||0)>S.day)}</div>
    <div class="sectionlabel">Administration des territoires</div><div class="stack">${['civil','police','military'].map(k=>btn({civil:'Administration civile',police:'Police d’occupation',military:'Administration militaire'}[k],'law',{kind:'occupation',value:k},'small '+(c.occupation===k?'active':''))).join('')}</div><p class="note" style="margin-top:10px">La politique d’occupation modifie résistance, conformité et pertes. Les catégories politiques et les statistiques sont des abstractions de jeu.</p>`+politicalExtension();
};
const NATION_EXTRA16=[];
function resourceGrid16(c){
  return `<div class="grid3">${Object.entries(RES16).map(([k,n])=>`<div class="card stat ${c.stats.shortage?.[k]<1?'bad':''}">${num(c.stats[k])}<small>${esc(n.toUpperCase())}${c.stats.demand?.[k]?' / BESOIN '+num(c.stats.demand[k]):''}</small></div>`).join('')}</div>`;
}
const INDUSTRY16={};
PANELS16.industry=function(){
  const c=nation(),renderer=INDUSTRY16[subtab];
  if(!renderer)return undefined;
  return panelHeader('Industrie et logistique',`${c.stats.freeCiv} usines civiles disponibles / ${c.stats.mil} militaires / ${c.stats.dock} chantiers navals`)+
    `<div class="subtabs">${Object.entries({production:'Production',construction:'Bâtir',resources:'Ressources',...INDUSTRY_TABS16}).map(([k,label])=>btn(label,'industryTab',{id:k},subtab===k?'active':'')).join('')}</div>`+renderer(c);
};
const INDUSTRY_TABS16={};
INDUSTRY16.construction=function(c){
  const bp=buildProvince(),st=stateOf16(bp),used=st?stateUsed16(st):0,cap=st?stateCapacity16(st):0;
  const queued=st?c.build.filter(b=>['civ','mil','dock','refinery'].includes(b.kind)&&states16().of[b.pid]===st.id).length:0;
  return `<div class="inset"><div class="label">Province sélectionnée</div><h3>${esc(pname(bp))}</h3><small>État : ${esc(st?.name||'')} / ${esc(st?.categoryName||'')}</small>
    <div style="margin-top:8px">${metric('Emplacements industriels (usines, chantiers, raffineries)',(used+queued)+' / '+cap)}${bar((used+queued)/Math.max(1,cap)*100)}</div><small>Sélectionnez un autre territoire sur la carte pour y construire.</small></div>
    <div class="grid2" style="margin:12px 0">${Object.entries(CATALOG.buildings).map(([k,b])=>{
      const p=WORLD.provinces[bp],full=b.shared&&used+queued>=cap,needsCoast=(b.coast||['dock','port'].includes(k))&&!p?.coast,locked=b.tech&&!c.tech.includes(b.tech);
      return btn(`${esc(b.name)} <small>${b.cost}${b.shared?' / emplacement':''}${locked?' / '+esc(technologies().find(t=>t.id===b.tech)?.name||b.tech):''}</small>`,'build',{pid:bp,kind:k},'small',full||needsCoast||locked);
    }).join('')}</div>
    <div class="sectionlabel">File de construction / ${c.build.length}</div><div class="stack">${c.build.map(b=>`<div class="card"><div class="row between"><strong style="font-size:12px">${esc(CATALOG.buildings[b.kind].name)}</strong><div class="row">${btn('↑','prioritizeBuild',{id:b.id},'small ghost')}${btn('×','cancelBuild',{id:b.id},'small ghost')}</div></div><small>${esc(pname(b.pid))} / ${Math.round(b.progress)} / ${b.cost} points</small><div style="margin-top:8px">${bar(b.progress/b.cost*100)}</div></div>`).join('')||'<div class="empty">La file de construction est vide. Les usines civiles n’ont aucun chantier à exécuter.</div>'}</div>
    <p class="note" style="margin-top:14px">Usines, chantiers navals et raffineries partagent les emplacements de l’État, fixés par sa catégorie. Jusqu’à trois chantiers parallèles selon l’industrie disponible.</p>`;
};
INDUSTRY16.resources=function(c){
  const tradeLaw=lawList16('trade').find(l=>l.id===c.trade);
  return `${resourceGrid16(c)}<div class="card" style="margin-top:9px">${metric('Facteur de ressources (pire ligne)',percent(c.stats.resourceFactor))}${metric('Loi commerciale',esc(tradeLaw?.name||''))}${metric('Revenus d’exportation',num(c.stats.tradeIncome||0)+' usines civiles')}</div>
    <div class="sectionlabel">Stocks logistiques</div><div class="card">${metric('Carburant',num(c.stock.fuel))}${metric('Convois',num(c.stock.convoys))}${metric('Camions',num(c.stock.trucks))}${metric('Ravitaillement moyen',percent(c.stats.supply))}</div>
    <div class="sectionlabel">Contrats commerciaux</div><div class="stack">${c.trades.map(t=>`<div class="card"><div class="row between"><strong style="font-size:12px">${esc(countryName(t.from))}</strong>${tag(t.active?'ACTIF':'SUSPENDU',t.active?'good':'bad')}</div><small>4 ${esc((RES16[t.resource]||t.resource).toLowerCase())} / 1 usine civile</small><div style="margin-top:7px">${btn('Résilier','cancelTrade',{id:t.id},'small')}</div></div>`).join('')||'<div class="empty">Aucun accord. Importez des ressources depuis le panneau Diplomatie.</div>'}</div>
    <div style="margin-top:13px">${btn('Négocier des importations '+icon('arrow'),'tab',{id:'diplomacy'},'wide')}</div>
    <p class="note" style="margin-top:12px">Chaque ligne de production n’est ralentie que par les ressources qu’elle consomme. L’exportateur conserve la part fixée par sa loi commerciale.</p>`;
};
const panelExtras16=(tabId,html)=>{(PANEL_EXTRAS16[tabId]??=[]).push(html);};
const PANEL_EXTRAS16={};
const renderPanelAfter15=renderPanel;
renderPanel=function(force=false){
  renderPanelAfter15(force);
  if(!S)return;
  for(const extra of PANEL_EXTRAS16[tab]||[]){const html=extra();if(html)$('panel').insertAdjacentHTML('beforeend',html);}
};
// Imports of the six resources from the diplomacy panel.
panelExtras16('diplomacy',()=>{
  const atWar=war(S.player,target);
  return `<div class="sectionlabel">Importations stratégiques</div><div class="grid2">${Object.entries(RES16).map(([k,n])=>btn('Importer 4 '+esc(n.toLowerCase()),'trade',{target,resource:k},'small',atWar||target===S.player)).join('')}</div><small>Chaque contrat coûte une usine civile ; l’exportateur doit disposer d’un surplus exportable selon sa loi commerciale.</small>`;
});

renderMapModes();renderPanel();
