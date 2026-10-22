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


renderMapModes();renderPanel();

/* ---- Divisions, equipment generations and designs ---- */
Rules.useCatalog16(CATALOG);
const BAT_GROUPS16={inf:'Infanterie',motor:'Mobile',tank:'Blindés',art:'Artillerie et appui'};
const DOMAINS16={land:'Équipement terrestre',air:'Aviation',naval:'Constructions navales'};
const STAT_LABELS16={attack:'Attaque',defense:'Défense',armor:'Blindage',piercing:'Perforation',speed:'Vitesse',reliability:'Fiabilité',air:'Combat aérien',ground:'Attaque au sol',naval:'Attaque navale',hp:'Résistance',subAttack:'Lutte anti-sous-marine',stealth:'Discrétion',detection:'Détection',range:'Rayon d’action',breakthrough:'Percée'};
const techName16=id=>technologies().find(t=>t.id===id)?.name||id;
const hasTech16=id=>!id||nation()?.tech.includes(id);
const models16=(c,type)=>[...(CATALOG.models?.[type]||[]),...(c.designs||[]).filter(d=>d.type===type)];
const lineModel16=(c,type)=>{const list=models16(c,type).filter(m=>hasTech16(m.tech));return list.find(m=>m.id===c.lines?.[type])||list.filter(m=>!m.design).at(-1)||list.at(-1)||null;};
const statText16=stats=>Object.entries(stats||{}).filter(([,v])=>Math.abs(v-1)>.004).map(([k,v])=>`${STAT_LABELS16[k]||k} ${v>1?'+':''}${Math.round((v-1)*100)} %`).join(' / ')||'Référence';
const quality16=(c,key)=>{const s=c.eqStats?.[key]||{},keys=['attack','defense','armor','piercing','air','ground','naval','hp'].filter(k=>s[k]!==undefined);return keys.length?total(keys.map(k=>s[k]))/keys.length:1;};
INDUSTRY16.production=function(c){
  const used=naval=>total(Object.keys(c.allocation).filter(k=>!!CATALOG.equipment[k]?.naval===naval).map(k=>c.allocation[k]));
  const card=(key,e)=>{
    const m=lineModel16(c,key),choices=models16(c,key).filter(x=>hasTech16(x.tech)),q=quality16(c,key),res=Object.keys(RES16).filter(r=>e[r]).map(r=>`${e[r]} ${RES16[r].toLowerCase()}`).join(', ');
    const shortage=Math.min(1,...Object.keys(RES16).filter(r=>e[r]).map(r=>c.stats.shortage?.[r]??1));
    return `<div class="card equipment-card"><div class="row"><div class="eq-icon">${icon(e.icon)}</div><div class="grow"><h4 style="font-size:12px;font-weight:500">${esc(e.name)}</h4><small>${m?esc(m.name):'Technologie requise'} / qualité du stock ${Math.round(q*100)} %</small></div><div class="stock">${num(c.stock[key])}</div></div>
      ${choices.length>1?`<select id="prod-model-${key}" class="prod-model" data-key="${key}" style="margin-top:8px">${choices.map(x=>`<option value="${esc(x.id)}" ${x.id===m?.id?'selected':''}>${esc(x.name)}${x.design?' (conception)':''}</option>`).join('')}</select>`:''}
      <div class="row between" style="margin-top:9px"><span class="mono" style="font-size:10px">${c.allocation[key]||0} affecté(s) / ${Math.round((c.efficiency[key]||0)*100)} % eff.${shortage<1?` / <span class="bad">pénurie ${Math.round(shortage*100)} %</span>`:''}</span><div class="row">${btn('−','production',{key,delta:-1},'small',!c.allocation[key])}${btn('+','production',{key,delta:1},'small',!m)}</div></div>${bar((c.efficiency[key]||0)*100)}
      <div class="row wrap" style="margin-top:7px">${res?`<small class="grow">Ressources par ligne : ${esc(res)}</small>`:''}${btn(c.modernize?.[key]?'Modernisation : OUI':'Modernisation : NON','modernize',{key,value:!c.modernize?.[key]},'small')}${e.family?btn('Concevoir','designer16',{type:key},'small'):''}</div></div>`;
  };
  return `<div class="row between" style="margin-bottom:12px"><small>${c.stats.mil-used(false)} usine(s) militaire(s) et ${c.stats.dock-used(true)} chantier(s) non affecté(s)</small>${btn('Répartir auto.','autoProduction',{},'small')}</div>
    ${Object.entries(DOMAINS16).map(([domain,label])=>`<div class="sectionlabel">${label}</div><div class="stack">${Object.entries(CATALOG.equipment).filter(([,e])=>e.domain===domain).map(([k,e])=>card(k,e)).join('')}</div>`).join('')}
    <p class="note" style="margin-top:13px">Chaque ligne produit le modèle choisi ; changer de modèle réduit l’efficacité de 30 %. La qualité du stock est la moyenne des modèles produits. La modernisation consacre la moitié de la ligne à mettre à niveau le matériel existant.</p>`;
};
function showDesigner16(type,keep={}){
  const c=nation(),designable=Object.entries(CATALOG.equipment).filter(([,e])=>e.family);
  if(!CATALOG.equipment[type]?.family)type=designable[0][0];
  const e=CATALOG.equipment[type],slots=CATALOG.designSlots[e.family],bases=(CATALOG.models[type]||[]).filter(m=>hasTech16(m.tech));
  const base=bases.find(m=>m.id===keep.base)||bases.at(-1);
  const options=slot=>CATALOG.modules.filter(m=>m.slot===slot&&m.families.includes(e.family)&&(!m.types||m.types.includes(type)));
  pauseGame();
  modal(`${modalHead('Bureau d’études','INDUSTRIE / CONCEPTION DE MATÉRIEL')}
    <div class="grid2"><div class="stack">
      ${field('Type de matériel',`<select id="design-type">${designable.map(([k,x])=>`<option value="${k}" ${k===type?'selected':''}>${esc(x.name)}</option>`).join('')}</select>`)}
      ${base?field('Châssis / coque / cellule',`<select id="design-base" class="design-input">${bases.map(m=>`<option value="${esc(m.id)}" ${m.id===base.id?'selected':''}>${esc(m.name)}</option>`).join('')}</select>`):'<p class="bad">Aucun châssis disponible : recherchez la technologie correspondante.</p>'}
      ${base?slots.map(slot=>field({gun:'Armement principal',turret:'Tourelle',armor:'Blindage',engine:'Moteur',special:'Équipement spécial',armament:'Armement',battery:'Batterie principale',secondary:'Armement secondaire',torpedo:'Torpilles'}[slot]||slot,`<select id="design-slot-${slot}" class="design-input">${options(slot).map(m=>`<option value="${esc(m.id)}" ${!hasTech16(m.tech)?'disabled':''} ${(keep.modules?.[slot]||defaultModule16(options(slot)))===m.id?'selected':''}>${esc(m.name)}${m.tech&&!hasTech16(m.tech)?' — '+esc(techName16(m.tech)):''}</option>`).join('')}</select>`)).join(''):''}
      ${field('Nom',`<input id="design-name" maxlength="60" value="${esc(keep.name||(base?base.name+' modifié':''))}">`)}
      <label class="row"><input id="design-produce" type="checkbox" checked> Produire ce modèle sur la ligne existante</label>
    </div><div class="card" id="design-preview"></div></div>
    <div class="row" style="margin-top:14px">${btn('Enregistrer la conception','saveDesign16',{type},'primary',!base)}${btn('Fermer','close')}</div>
    <div class="sectionlabel">Conceptions de ce type</div><div class="stack">${(c.designs||[]).filter(d=>d.type===type).map(d=>`<div class="card row between"><div><strong>${esc(d.name)}</strong><small style="display:block">${esc(statText16(d.stats))} / coût ×${d.cost}</small></div>${btn('×','deleteDesign16',{id:d.id,type},'small ghost')}</div>`).join('')||'<p class="note">Aucune conception enregistrée.</p>'}</div>
    <p class="note" style="margin-top:12px">Les modules débloqués par la recherche modifient les caractéristiques du châssis. Le coût de production est multiplié par celui de chaque module.</p>`,'designer','wide');
  updateDesignPreview16();
}
// Reference module of a slot: the neutral one (no modifier, cost 1), else the first unlocked.
const defaultModule16=list=>(list.find(m=>hasTech16(m.tech)&&(m.cost||1)===1&&!Object.keys(m.stats||{}).length)||list.find(m=>hasTech16(m.tech)))?.id;
function designForm16(){
  const type=$('design-type').value,e=CATALOG.equipment[type],modules={};
  for(const slot of CATALOG.designSlots[e.family]||[])if($('design-slot-'+slot))modules[slot]=$('design-slot-'+slot).value;
  return {type,base:$('design-base')?.value,modules,name:$('design-name').value,produce:$('design-produce').checked};
}
function updateDesignPreview16(){
  if(!$('design-preview')||!$('design-base'))return;
  try{const f=designForm16(),r=Rules.designStats16(f.type,f.base,f.modules);
    $('design-preview').innerHTML=`<div class="eyebrow">CARACTÉRISTIQUES</div>${Object.entries(r.stats).map(([k,v])=>metric(esc(STAT_LABELS16[k]||k),Math.round(v*100)+' %',v>1?'good':v<1?'bad':'')).join('')||'<p class="note">Valeurs de référence.</p>'}<hr>${metric('Coût de production',Math.round(r.cost*100)+' %',r.cost>1.3?'bad':'')}<small>Pourcentages relatifs au premier modèle du type.</small>`;
  }catch(e){$('design-preview').innerHTML=`<p class="bad">${esc(e.message)}</p>`;}
}
const BAT_LIST16=()=>CATALOG.battalions||[];
templateEditor=function(id=null){
  pauseGame();const c=nation(),current=c.templates.find(t=>t.id===id)||null,{bat,sup}=Rules.normalizeTemplate16(current||{bat:{infantry:7,artillery:2},sup:['engineer']});
  modal(`${modalHead(current?'Modifier : '+current.name:'Concevoir une division','ARMÉE / MODÈLE DE DIVISION')}
    <div class="grid2"><div class="stack">
      ${field('Partir d’un modèle',`<select id="tmpl-base"><option value="">Nouveau modèle</option>${c.templates.map(t=>`<option value="${esc(t.id)}" ${t.id===current?.id?'selected':''}>${esc(t.name)}</option>`).join('')}</select>`)}
      ${field('Nom du modèle',`<input id="tmpl-name" class="tmpl-stat" maxlength="70" value="${esc(current?.name||'Division personnalisée')}">`)}
      ${Object.entries(BAT_GROUPS16).map(([g,label])=>`<div class="sectionlabel">${label}</div>${BAT_LIST16().filter(b=>b.group===g).map(b=>`<div class="row between"><span>${esc(b.name)}${b.tech&&!hasTech16(b.tech)?`<small style="display:block" class="faint">${icon('lock')} ${esc(techName16(b.tech))}</small>`:''}</span><input class="tmpl-stat tmpl-bat" data-id="${b.id}" type="number" min="0" max="25" value="${bat[b.id]||0}" ${b.tech&&!hasTech16(b.tech)&&!bat[b.id]?'disabled':''}></div>`).join('')}`).join('')}
      <div class="sectionlabel">Compagnies de soutien (5 au maximum)</div>
      ${(CATALOG.supports||[]).map(s=>`<label class="row"><input class="tmpl-stat tmpl-sup" data-id="${s.id}" type="checkbox" ${sup.includes(s.id)?'checked':''} ${s.tech&&!hasTech16(s.tech)&&!sup.includes(s.id)?'disabled':''}> ${esc(s.name)}${s.tech&&!hasTech16(s.tech)?` <small class="faint">(${esc(techName16(s.tech))})</small>`:''}</label>`).join('')}
    </div><div class="card" id="template-preview" style="align-self:start;position:sticky;top:0"></div></div><hr>
    <div class="row wrap">${btn('Créer le modèle / 15 XP','saveTemplate',{},'primary',c.xp<15)}${current?btn('Mettre à jour ce modèle / 5 XP','editTemplate16',{id:current.id},'',c.xp<5)+btn('Supprimer','deleteTemplate16',{id:current.id},'danger small'):''}${btn('Annuler','close')}</div>
    <p class="note" style="margin-top:13px">Jusqu’à 25 bataillons et 5 compagnies de soutien. Les divisions déjà déployées conservent leur composition jusqu’à un rééquipement. Largeur autorisée : 2 à 45.</p>`,'template','wide');
  updateTemplatePreview();
};
templateForm=function(){
  const bat={},sup=[];
  document.querySelectorAll('.tmpl-bat').forEach(el=>{const n=Number(el.value)||0;if(n>0)bat[el.dataset.id]=Math.min(25,Math.floor(n));});
  document.querySelectorAll('.tmpl-sup').forEach(el=>{if(el.checked)sup.push(el.dataset.id);});
  return {name:$('tmpl-name').value,bat,sup};
};
updateTemplatePreview=function(){
  if(!$('template-preview'))return;
  const f=templateForm(),s=Rules.templateStats(f),count=total(Object.values(f.bat));
  $('template-preview').innerHTML=`<div class="eyebrow">CAPACITÉS DU MODÈLE</div>
    ${metric('Bataillons / soutiens',count+' / '+f.sup.length,count>25||f.sup.length>5?'bad':'')}${metric('Effectifs',num(s.men))}${metric('Largeur de combat',String(s.width),s.width>45||s.width<2?'bad':'')}
    ${metric('Organisation',Math.round(s.orgMax))}${metric('Vitesse',s.speed.toFixed(2))}
    ${metric('Attaque douce / dure',Math.round(s.soft)+' / '+Math.round(s.hard))}${metric('Défense / percée',Math.round(s.defense)+' / '+Math.round(s.breakthrough))}
    ${metric('Blindage / perforation',s.armor.toFixed(1)+' / '+s.piercing.toFixed(1),s.armor>s.piercing?'good':'')}${metric('Attaque antiaérienne',Math.round(s.ap))}${metric('Dureté',Math.round(s.hardness*100)+' %')}
    ${s.special?.amphibious?metric('Aptitude amphibie',Math.round(s.special.amphibious*100)+' %'):''}${s.special?.paradrop?metric('Parachutable','Oui'):''}
    <hr><div class="label">Équipement requis</div>${Object.entries(s.eq).filter(([,v])=>v>0).map(([k,n])=>metric(esc(CATALOG.equipment[k]?.name||k),num(n),nation()&&nation().stock[k]<n?'bad':'')).join('')}`;
};
PANELS16.research=function(){
  const c=nation(),unlockText=u=>{const [kind,id]=u.split(':');const name=kind==='battalion'?CATALOG.battalions.find(b=>b.id===id)?.name:kind==='support'?CATALOG.supports.find(b=>b.id===id)?.name:kind==='model'?Object.values(CATALOG.models).flat().find(m=>m.id===id)?.name:kind==='module'?CATALOG.modules.find(m=>m.id===id)?.name:CATALOG.buildings[id]?.name;return ({battalion:'Bataillon',support:'Soutien',model:'Modèle',module:'Module',building:'Bâtiment'}[kind]||kind)+' : '+(name||id);};
  return panelHeader('Recherche et doctrines',`${c.research.length} / ${c.slots} équipes occupées / +${Math.round(c.bonus.research*100)} % de vitesse`)+`
    <div class="stack">${c.research.map(r=>{const t=technologies().find(t=>t.id===r.id);return `<div class="card"><div class="row between"><h4 style="font-size:12px">${esc(t.name)}</h4>${btn('×','cancelResearch',{id:r.id},'small ghost')}</div><div style="margin:8px 0">${bar(r.progress/t.days*100)}</div><small>${Math.floor(r.progress)} / ${t.days} points</small></div>`;}).join('')||'<div class="empty">Vos équipes attendent un programme de recherche.</div>'}</div>
    <div class="sectionlabel">Domaine technologique</div><select id="tech-group">${Object.entries(TECHGROUPS).map(([id,n])=>`<option value="${id}" ${techGroup===id?'selected':''}>${esc(n)}</option>`).join('')}</select>
    <div class="stack" style="margin-top:13px">${technologies().filter(t=>t.group===techGroup).sort((a,b)=>a.year-b.year||a.name.localeCompare(b.name,'fr')).map(t=>{
      const done=c.tech.includes(t.id),running=c.research.some(r=>r.id===t.id),excluded=(t.excl||[]).some(k=>c.tech.includes(k)||c.research.some(r=>r.id===k)),ready=t.req.every(r=>c.tech.includes(r))&&!excluded,year=1936+S.day/365.25;
      return `<div class="card tech-card ${done?'done':''}"><div class="row between"><h4>${esc(t.name)}</h4>${tag(done?'ACQUIS':String(t.year),done?'good':'')}</div><p class="note" style="margin:7px 0">${effectText(t.effect)}</p>${(t.unlock||[]).length?`<small style="display:block" class="gold">${t.unlock.map(u=>esc(unlockText(u))).join(' / ')}</small>`:''}<small>${t.days} points${t.year>year?' / en avance sur son temps':''}</small>${t.req.length?`<small style="display:block">Prérequis : ${t.req.map(k=>esc(technologies().find(t=>t.id===k)?.name||k)).join(', ')}</small>`:''}${t.excl?.length?`<small style="display:block">Voie exclusive de : ${t.excl.map(k=>esc(technologies().find(t=>t.id===k)?.name||k)).join(', ')}</small>`:''}<div style="margin-top:9px">${btn(done?'Acquis':running?'Recherche en cours':excluded?icon('lock')+' Voie écartée':ready?'Lancer la recherche':icon('lock')+' Verrouillé','research',{id:t.id},'small wide',done||running||!ready||c.research.length>=c.slots)}</div></div>`;
    }).join('')}</div><p class="note" style="margin-top:14px">Une technologie future subit une pénalité de recherche. Annuler un programme perd sa progression.</p>`;
};
['modernize','productionModel','templateDelete','designDelete'].forEach(a=>direct.add(a));
const releaseAction15=releaseAction;
releaseAction=async function(action,p){
  for(const handler of ACTIONS16){const r=await handler(action,p);if(r)return true;}
  return releaseAction15(action,p);
};
const ACTIONS16=[];
ACTIONS16.push(async(action,p)=>{
  switch(action){
    case 'designer16':showDesigner16(p.type);return true;
    case 'saveDesign16':{const f=designForm16();await cmd('design',f);toast('Conception enregistrée.');showDesigner16(f.type);return true;}
    case 'deleteDesign16':if(confirm('Supprimer cette conception ?')){await cmd('designDelete',{id:p.id});showDesigner16(p.type);}return true;
    case 'editTemplate16':await cmd('templateEdit',{id:p.id,...templateForm()});closeModal();renderPanel(true);toast('Modèle mis à jour.');return true;
    case 'deleteTemplate16':if(confirm('Supprimer ce modèle ?')){await cmd('templateDelete',{id:p.id});closeModal();renderPanel(true);}return true;
  }
  return false;
});
document.addEventListener('change',ev=>{
  const el=ev.target;
  if(el.classList?.contains('prod-model'))fire('productionModel',{key:el.dataset.key,model:el.value});
  if(el.id==='design-type')showDesigner16(el.value);
  if(el.id==='design-base')showDesigner16($('design-type').value,{...designForm16(),base:el.value});
  if(el.classList?.contains('design-input'))updateDesignPreview16();
  if(el.id==='tmpl-base')templateEditor(el.value||null);
});

/* ---- Multi-day battles and battle plans ---- */
const unitById16=id=>S?.units.find(u=>u.id===id);
function battleSide16(ids,reserve,title,country,power,losses){
  const row=id=>{const u=unitById16(id);if(!u)return '';return `<div class="unitrow"><div class="unit-symbol">${u.template.tank?'▱':'×'}</div><div class="grow"><div class="row between"><strong>${esc(u.name)}</strong><span class="mono" style="font-size:10px">${Math.round(u.org)} / ${Math.round(u.strength*100)} %</span></div><small>${esc(u.template.name||'')}</small>${bar(u.strength*100,'#a7b58f')}<div style="height:3px"></div>${bar(u.org,'#88a7b7')}</div></div>`;};
  return `<div class="card"><div class="eyebrow">${title}</div><h3 style="margin:9px 0">${esc(countryName(country))}</h3>${metric('Divisions en ligne',ids.length)}${metric('En réserve',(reserve||[]).length)}${metric('Puissance effective',num(power))}${metric('Pertes cumulées',num(losses||0))}
    <div class="stack" style="margin-top:9px">${ids.map(row).join('')}</div>${(reserve||[]).length?`<div class="label" style="margin-top:9px">Réserves</div><div class="stack">${reserve.map(row).join('')}</div>`:''}</div>`;
}
showBattle=function(pid){
  const b=S?.battles.find(b=>b.pid===pid);if(!b){toast('Cette bataille est terminée.');return;}pauseGame();
  const days=Math.floor((b.hours||24)/24);
  modal(`${modalHead('Bataille de '+pname(pid),'RAPPORT OPÉRATIONNEL / '+days+' JOUR'+(days>1?'S':'')+' DE COMBAT')}
    <div style="margin:4px 0 16px"><div class="row between"><small>${esc(countryName(b.a))}</small><small>${Math.round(b.ratio*100)} % / ${Math.round((1-b.ratio)*100)} %</small><small>${esc(countryName(b.b))}</small></div>${bar(b.ratio*100,'#c29b78')}</div>
    <div class="grid2">${battleSide16(b.attackers,b.reserveA,'ATTAQUANTS',b.a,b.ap,b.lossesA)}${battleSide16(b.defenders,b.reserveD,'DÉFENSEURS',b.b,b.dp,b.lossesD)}</div>
    <div class="card" style="margin-top:12px">${metric('Terrain',esc(CATALOG.terrain[b.terrain]?.name||b.terrain))}${metric('Météo',esc(b.weather))}${metric('Largeur attaquant / défenseur',b.width+' / '+(b.widthD??'?')+' (max '+b.maxWidth+')')}${metric('Fortification',S.provinces[pid].fort)}${metric('Franchissement',b.amphibious?'Débarquement amphibie':b.strait?'Détroit':b.river?'Fleuve':'Aucun')}${metric('Début',dateText(b.start??S.day))}</div>
    <p class="note" style="margin-top:15px">Le combat est résolu heure par heure. Les divisions dont l’organisation s’effondre se retirent et les réserves prennent leur place. La barre indique l’organisation restante de chaque camp, pas une probabilité.</p>`,'battle','wide');
};
const warfarePanel15=warfarePanel;
warfarePanel=function(){
  const html=warfarePanel15(),mine=S.battles.filter(b=>b.a===S.player||b.b===S.player);
  const list=`<div class="sectionlabel">Batailles en cours / ${mine.length}</div><div class="stack">${mine.slice(0,20).map(b=>`<div class="card"><div class="row between"><strong>${esc(pname(b.pid))}</strong>${tag(b.a===S.player?'OFFENSIVE':'DÉFENSE',b.a===S.player?'gold':'')}</div>
    <small>${Math.floor((b.hours||24)/24)} j / ${esc(b.weather)} / ${esc(CATALOG.terrain[b.terrain]?.name||b.terrain)}${b.amphibious?' / débarquement':b.strait?' / détroit':b.river?' / fleuve':''}</small>
    <div style="margin:8px 0">${bar(b.ratio*100,'#c5a46e')}</div>${metric('En ligne / réserves',b.attackers.length+'+'+(b.reserveA||[]).length+' contre '+b.defenders.length+'+'+(b.reserveD||[]).length)}${metric('Pertes',num(b.lossesA||0)+' / '+num(b.lossesD||0))}${btn('Rapport de bataille','battle',{pid:b.pid},'small')}</div>`).join('')||'<p class="note">Aucun combat actif.</p>'}</div>`;
  return html.replace(/<div class="sectionlabel">Combats en cours<\/div>[\s\S]*?<div class="sectionlabel">Rapports tactiques<\/div>/,list+'<div class="sectionlabel">Rapports tactiques</div>');
};
function planCard16(a){
  const plan=a.plan16||{offensive:[],fallback:[],execute:false};
  return `<div class="card stack"><div class="eyebrow">PLAN DE BATAILLE</div>
    ${metric('Ligne de front',(a.frontSelection||[]).length?(a.frontSelection.length+' points tracés'):'Toute la frontière avec la cible')}
    ${metric('Ligne d’offensive',plan.offensive.length?plan.offensive.length+' points / '+esc(pname(plan.offensive.at(-1))):'Aucune')}
    ${metric('Ligne de repli',plan.fallback.length?plan.fallback.length+' points':'Aucune')}
    ${metric('Préparation',percent(a.planning))}${bar(a.planning*100)}
    <div class="row wrap">${btn('Tracer le front','drawFront',{army:a.id},'small')}${btn('Tracer l’offensive','drawPlan16',{army:a.id,kind:'offensive'},'small')}${btn('Tracer le repli','drawPlan16',{army:a.id,kind:'fallback'},'small')}</div>
    <div class="row wrap">${btn(plan.execute?'Suspendre l’offensive':'Exécuter le plan '+icon('arrow'),'planExecute16',{army:a.id,value:!plan.execute},plan.execute?'small danger':'small primary')}${btn('Effacer l’offensive','planLine16',{army:a.id,kind:'offensive',provinces:[]},'small ghost')}${btn('Effacer le repli','planLine16',{army:a.id,kind:'fallback',provinces:[]},'small ghost')}</div>
    <small>La préparation augmente tant que le plan attend et diminue pendant l’offensive. En défense, la ligne de repli remplace le front.</small></div>`;
}
const operationExtension15=operationExtension;
operationExtension=function(){
  const a=S.armies.find(a=>a.id===army&&a.owner===S.player);
  return operationExtension15()+(a?planCard16(a):'');
};
const showOperations15=showOperations;
showOperations=function(){
  showOperations15();
  const a=S?.armies.find(a=>a.id===army&&a.owner===S.player),el=$('modal')?.querySelector('.war-tactic');
  if(a&&el)el.insertAdjacentHTML('beforebegin',planCard16(a));
};
function beginPlanTool16(kind,aid){
  closeModal();army=aid;operationTool={kind,army:aid,points:[]};document.body.classList.remove('panel-open');
  const tool=$('operation-toolbar');tool.hidden=false;
  tool.innerHTML=`<span>${kind==='offensive'?'OFFENSIVE / Cliquez les provinces visées, dans l’ordre (30 au maximum)':'REPLI / Cliquez la ligne à tenir en territoire accessible'}</span>${btn('Valider la ligne','finishPlan16',{},'primary small')}${btn('Annuler','cancelOperation',{},'small')}`;
  $('map-hint').textContent=kind==='offensive'?'La flèche part du front de l’armée et suit vos points.':'Les divisions s’y déploient lorsqu’elles défendent.';
  dirty=true;
}
window.addEventListener('pointerup',ev=>{
  if(!operationTool||!['offensive','fallback'].includes(operationTool.kind)||ev.target!==canvas||!drag||drag.moved||ev.button!==0)return;
  const r=canvas.getBoundingClientRect(),id=pointAt(ev.clientX-r.left,ev.clientY-r.top);
  ev.stopImmediatePropagation();drag=null;
  if(id===null)return;
  if(operationTool.kind==='fallback'&&!(allied(S.player,control(id))||nation().access.includes(control(id)))){toast('Tracez le repli en territoire accessible.',true);return;}
  const i=operationTool.points.indexOf(id);
  if(i>=0)operationTool.points.splice(i,1);else if(operationTool.points.length<30)operationTool.points.push(id);
  dirty=true;
},true);
const arrowHead16=(ctx,from,to,size)=>{const angle=Math.atan2(to.y-from.y,to.x-from.x);ctx.beginPath();ctx.moveTo(to.x,to.y);ctx.lineTo(to.x-size*Math.cos(angle-.45),to.y-size*Math.sin(angle-.45));ctx.lineTo(to.x-size*Math.cos(angle+.45),to.y-size*Math.sin(angle+.45));ctx.closePath();ctx.fill();};
DRAW16.push((ctx,zoom)=>{
  if(!S)return;
  const a=S.armies.find(a=>a.id===army&&a.owner===S.player),tool=operationTool&&['offensive','fallback'].includes(operationTool.kind)?operationTool:null;
  const lines=[];
  if(a?.plan16?.offensive?.length)lines.push(['offensive',a.plan16.offensive]);
  if(a?.plan16?.fallback?.length)lines.push(['fallback',a.plan16.fallback]);
  if(tool)lines.push([tool.kind,tool.points]);
  for(const [kind,points] of lines){
    if(!points.length)continue;
    const nodes=points.map(id=>centers[id]).filter(Boolean);
    if(kind==='offensive'){
      const troops=S.units.filter(u=>u.army===a?.id),start=troops.length?{x:total(troops.map(u=>centers[u.pid].x))/troops.length,y:total(troops.map(u=>centers[u.pid].y))/troops.length}:nodes[0];
      const path=[start,...nodes];ctx.strokeStyle='#d0614cd9';ctx.fillStyle='#d0614cd9';ctx.lineWidth=5/zoom;ctx.lineJoin='round';
      ctx.beginPath();path.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
      if(path.length>1)arrowHead16(ctx,path.at(-2),path.at(-1),14/zoom);
    }else{
      ctx.strokeStyle='#7fb2d4';ctx.lineWidth=3/zoom;ctx.setLineDash([7/zoom,4/zoom]);ctx.beginPath();nodes.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.setLineDash([]);
      for(const p of nodes){ctx.fillStyle='#7fb2d4';ctx.beginPath();ctx.arc(p.x,p.y,3/zoom,0,Math.PI*2);ctx.fill();}
    }
  }
  if(camera.zoom>1.55)for(const b of S.battles){
    if(b.a!==S.player&&b.b!==S.player)continue;
    const p=centers[b.pid];if(!p)continue;const w=22/zoom,y=p.y-4/zoom;
    ctx.fillStyle='#2b201c';ctx.fillRect(p.x-w/2,y,w,3/zoom);ctx.fillStyle=b.a===S.player?'#d8b06a':'#c97a62';ctx.fillRect(p.x-w/2,y,w*(b.a===S.player?b.ratio:1-b.ratio),3/zoom);
  }
});
ACTIONS16.push(async(action,p)=>{
  switch(action){
    case 'drawPlan16':beginPlanTool16(p.kind,p.army);return true;
    case 'finishPlan16':if(operationTool){const {army:aid,kind,points}=operationTool;await cmd('planLine',{army:aid,kind,provinces:points});endOperationTool();renderPanel(true);toast(kind==='offensive'?'Ligne d’offensive enregistrée.':'Ligne de repli enregistrée.');}return true;
    case 'planLine16':await cmd('planLine',{army:p.army,kind:p.kind,provinces:p.provinces});renderPanel(true);if(modalKind==='operations')showOperations();dirty=true;return true;
    case 'planExecute16':await cmd('planExecute',{army:p.army,value:p.value});renderPanel(true);if(modalKind==='operations')showOperations();toast(p.value?'L’offensive est lancée.':'L’offensive est suspendue.');dirty=true;return true;
  }
  return false;
});

/* ---- Air war and navy ---- */
const AIR_KINDS16={fighters:'Chasse',cas:'Appui rapproché',bombers:'Bombardement tactique',strategicBombers:'Bombardement stratégique',navalBombers:'Bombardement naval',transportPlanes:'Transport'};
const AIR_MISSION_LABELS16={reserve:'Au sol / réserve',superiority:'Supériorité aérienne',intercept:'Interception',escort:'Escorte des bombardiers',support:'Appui au sol',strategic:'Bombardement stratégique',logistics:'Interdiction logistique',navalStrike:'Attaque navale',portStrike:'Attaque des ports',airSupply:'Ravitaillement aérien'};
const AIR_MISSIONS16={fighters:['reserve','superiority','intercept','escort'],cas:['reserve','support'],bombers:['reserve','support','strategic','logistics','portStrike'],strategicBombers:['reserve','strategic'],navalBombers:['reserve','navalStrike','portStrike'],transportPlanes:['reserve','airSupply']};
const FLEET_MISSION_LABELS16={port:'Au port / réparation',patrol:'Patrouille (détection)',strike:'Flotte d’attaque',escort:'Escorte des convois',raid:'Guerre de course',mines:'Pose de mines',sweep:'Déminage',invasion:'Couverture de débarquement'};
const seaName16=id=>WORLD.seas.find(z=>z.id===id)?.name||id;
const zoneName16=id=>WORLD.zones.find(z=>z.id===id)?.name||id;
const sideShare16=(table,id)=>{if(!table)return null;let f=0,e=0;for(const [k,v] of Object.entries(table)){if(allied(id,k))f+=v;else if(war(id,k))e+=v;}return e<=0?(f>0?1:null):f/(f+e);};
PANELS16.air=function(){
  const c=nation(),wings=S.wings.filter(w=>w.owner===S.player),bases=owned().filter(p=>S.provinces[p.id].airbase>0);
  const paras=ownUnits().filter(u=>selected.has(u.id)&&Rules.templateStats(u.template).special?.paradrop);
  const zones=Object.entries(S.airControl16||{}).filter(([,t])=>t[S.player]!==undefined);
  return panelHeader('Opérations aériennes',`${Math.floor(total(wings.map(w=>w.size)))} appareils déployés / ${num(c.lostPlanes)} pertes`)+`
    <div class="grid3">${Object.entries(AIR_KINDS16).map(([k,label])=>`<div class="card stat">${num(c.stock[k])}<small>${esc(label.toUpperCase())}</small></div>`).join('')}</div>
    ${zones.length?`<div class="sectionlabel">Maîtrise du ciel</div><div class="card">${zones.map(([z,t])=>`<div>${metric(esc(zoneName16(z)),Math.round(t[S.player]*100)+' %',t[S.player]>=.6?'good':t[S.player]<.4?'bad':'')}${bar(t[S.player]*100,t[S.player]>=.5?'#91ba9e':'#c98070')}</div>`).join('')}</div>`:''}
    <div class="sectionlabel">Escadres</div><div class="stack">${wings.map(w=>{const naval=['navalStrike','portStrike'].includes(w.mission);return `<div class="card mission-card"><div class="row between"><h4>${esc(w.name)}</h4><span class="gold mono">${num(w.size)}</span></div><small>${esc(AIR_KINDS16[w.kind]||w.kind)} / ${esc(pname(w.base))} / eff. ${percent(w.efficiency??1)} / ${esc(AIR_MISSION_LABELS16[w.mission]||w.mission)}${naval&&w.seaZone?' / '+esc(seaName16(w.seaZone)):''}</small>
      ${field('Mission',`<select id="air-mission-${w.id}">${(AIR_MISSIONS16[w.kind]||['reserve']).map(k=>`<option value="${k}" ${w.mission===k?'selected':''}>${esc(AIR_MISSION_LABELS16[k])}</option>`).join('')}</select>`)}
      ${field('Région aérienne (missions terrestres)',`<select id="air-zone-${w.id}">${zoneOptions(w.zone)}</select>`)}
      ${['navalBombers','bombers'].includes(w.kind)?field('Zone maritime (missions navales)',`<select id="air-sea-${w.id}">${zoneOptions(w.seaZone||WORLD.seas[0].id,true)}</select>`):''}
      <div class="row wrap">${btn('Appliquer','airMission16',{id:w.id},'small primary')}${btn('+ 50 appareils','airReinforce',{id:w.id},'small',c.stock[w.kind]<1)}${btn(w.autoReinforce?'Renfort auto. : OUI':'Renfort auto. : NON','airAutoReinforce',{id:w.id,value:!w.autoReinforce},'small')}</div>
      <div style="margin-top:9px">${selectProvinces('rebase-'+w.id,w.base,p=>S.provinces[p.id].airbase>0)}${btn('Transférer vers cette base','airRebaseForm',{id:w.id},'small')}</div></div>`;}).join('')||'<div class="empty">Aucune escadre déployée.</div>'}</div>
    <div class="sectionlabel">Former une escadre</div><div class="card stack"><select id="air-type">${Object.entries(AIR_KINDS16).map(([k,label])=>`<option value="${k}">${esc(label)} / ${num(c.stock[k])} en réserve</option>`).join('')}</select>${selectProvinces('air-base',bases[0]?.id,p=>S.provinces[p.id].airbase>0)}<div class="row between"><span class="note">Nombre d’appareils</span><input type="number" id="air-size" min="10" max="500" value="50"></div>${btn('Déployer l’escadre','airCreateForm',{},'primary small',!bases.length)}</div>
    <div class="sectionlabel">Opérations aéroportées</div><div class="card stack"><p class="note">Sélectionnez des divisions entièrement parachutistes stationnées sur une base aérienne, puis désignez la province ennemie. Portée de base : 800 km ; 15 avions de transport par division. Sans maîtrise du ciel, les pertes sont lourdes.</p>${metric('Divisions parachutistes sélectionnées',paras.length)}${btn('Choisir la zone de saut','paradropTool16',{},'small',!paras.length)}</div>
    <p class="note" style="margin-top:13px">La chasse dispute le ciel ; sans couverture, les troupes au sol combattent avec une pénalité. La DCA (bâtiments et bataillons) abat les bombardiers et protège les usines. Les avions embarqués et navals décident souvent de la maîtrise des mers.</p>`;
};
PANELS16.navy=function(){
  const c=nation(),fleets=S.fleets.filter(f=>f.owner===S.player),ports=owned().filter(p=>S.provinces[p.id].port>0);
  const sel=ownUnits().filter(u=>selected.has(u.id)),samePort=sel.length&&sel.every(u=>u.pid===sel[0].pid)&&S.provinces[sel[0].pid].port>0;
  const control=Object.keys(S.seaControl16||{}).map(z=>[z,sideShare16(S.seaControl16[z],S.player)]).filter(([,v])=>v!==null);
  const minesFor=z=>{const m=S.mines16?.[z]||{};return {own:total(Object.entries(m).filter(([k])=>allied(S.player,k)).map(([,v])=>v)),enemy:total(Object.entries(m).filter(([k])=>war(S.player,k)).map(([,v])=>v))};};
  return panelHeader('Commandement naval',`${num(total(fleets.map(f=>total(Object.values(f.ships)))))} navires déployés / ${num(c.stock.convoys)} convois`)+`
    <div class="grid3">${Object.entries(SHIP_LABELS).map(([k,label])=>`<div class="card stat">${num(c.stock[k])}<small>${esc(label.toUpperCase())} EN RÉSERVE</small></div>`).join('')}<div class="card stat">${num(c.stock.convoys)}<small>CONVOIS</small></div></div>
    ${control.length?`<div class="sectionlabel">Maîtrise des mers</div><div class="card">${control.map(([z,v])=>{const m=minesFor(z);return `<div>${metric(esc(seaName16(z)),Math.round(v*100)+' %'+(m.own||m.enemy?' / mines '+Math.round(m.own)+' : '+Math.round(m.enemy):''),v>=.5?'good':'bad')}${bar(v*100,v>=.5?'#95b6aa':'#c98070')}</div>`;}).join('')}</div>`:''}
    <div class="sectionlabel">Groupes navals</div><div class="stack">${fleets.map(f=>`<div class="card mission-card"><div class="row between"><h4>${esc(f.name)}</h4>${tag(f.eta>0?'TRANSIT '+f.eta+' J':f.mission==='port'?'AU PORT':'EN MISSION')}</div><div class="ship-breakdown">${Object.entries(SHIP_LABELS).map(([k,label])=>`<span class="ship-chip">${Math.floor(f.ships[k]||0)} ${label}</span>`).join('')}</div><div style="margin:8px 0">${bar(f.strength*100,'#95b6aa')}</div><small>${esc(seaName16(f.zone))} / ${esc(FLEET_MISSION_LABELS16[f.mission]||f.mission)}</small>
      ${field('Région maritime',`<select id="naval-zone-${f.id}">${zoneOptions(f.zone,true)}</select>`)}${field('Mission',`<select id="naval-mission-${f.id}">${Object.entries(FLEET_MISSION_LABELS16).map(([k,label])=>`<option value="${k}" ${f.mission===k?'selected':''}>${esc(label)}</option>`).join('')}</select>`)}${btn('Donner l’ordre','fleetMissionForm',{id:f.id},'primary small wide')}
      ${f.mission==='port'?`<div class="row wrap" style="margin-top:8px">${Object.entries(SHIP_LABELS).filter(([k])=>c.stock[k]>=1).map(([k,label])=>btn('+1 '+label,'fleetReinforce',{id:f.id,kind:k},'small')).join('')}</div>`:''}</div>`).join('')||'<div class="empty">Aucun groupe naval déployé.</div>'}</div>
    <div class="sectionlabel">Former un groupe naval</div><div class="card stack"><input id="fleet-name" value="Groupe naval" maxlength="60" aria-label="Nom de la flotte">${selectProvinces('fleet-base',ports[0]?.id,p=>S.provinces[p.id].port>0)}<div class="row between"><span class="note">Destroyers</span><input id="fleet-dd" type="number" min="0" max="100" value="2"></div><div class="row between"><span class="note">Sous-marins</span><input id="fleet-ss" type="number" min="0" max="100" value="0"></div>${['cruisers','battleships','carriers'].map(k=>`<div class="row between"><span class="note">${SHIP_LABELS[k]} / ${Math.floor(c.stock[k])} en réserve</span><input id="fleet-${SHIP_FIELDS[k]}" type="number" min="0" max="100" value="0"></div>`).join('')}${btn('Former le groupe','fleetCreateForm',{},'primary small',!ports.length)}</div>
    <div class="sectionlabel">Invasions navales</div><div class="card stack"><p class="note">Réunissez jusqu’à 12 divisions dans un port ami, sélectionnez-les, puis désignez une province côtière ennemie. La préparation dure 12 jours et plus ; le débarquement n’a lieu qu’avec la maîtrise des zones traversées et sans tempête. Les forts côtiers et l’absence de troupes de marine pénalisent l’assaut.</p>${metric('Divisions sélectionnées dans un même port',samePort?sel.length:0)}${btn('Choisir la plage de débarquement','invasionTool16',{},'small',!samePort)}</div>
    <div class="stack" style="margin-top:9px">${(S.invasions16||[]).filter(i=>i.owner===S.player).map(i=>`<div class="card"><div class="row between"><strong>${esc(pname(i.from))} → ${esc(pname(i.to))}</strong>${tag({preparing:'PRÉPARATION',waiting:'EN ATTENTE',landing:'ASSAUT'}[i.status]||i.status,i.status==='landing'?'bad':'')}</div><small>${i.units.length} division(s) / ${i.zones.map(seaName16).join(', ')}</small><div style="margin:7px 0">${bar(i.progress/i.days*100)}</div><small>${i.progress} / ${i.days} jours</small><div style="margin-top:7px">${btn('Annuler','cancelInvasion',{id:i.id},'small ghost')}</div></div>`).join('')}</div>
    <p class="note" style="margin-top:12px">Les patrouilles détectent l’ennemi ; les flottes d’attaque engagent ce qui est repéré. Les sous-marins sont discrets mais les destroyers équipés de sonar les traquent. Les mines usent les flottes et convois ennemis de la zone.</p>`;
};
const colorOfAir15=colorOf;
colorOf=function(p){
  if(mapMode==='air'&&S){const share=S.airControl16?.[p.zone]?.[S.player];if(share!==undefined)return `hsl(${Math.round(share*110)},32%,${34+share*14}%)`;}
  return colorOfAir15(p);
};
DRAW16.push((ctx,zoom)=>{
  if(!S||mapMode!=='navy')return;
  for(const sea of WORLD.seas){
    const share=sideShare16(S.seaControl16?.[sea.id],S.player),p=project(sea.x,sea.y);
    if(share===null)continue;
    ctx.fillStyle=`hsla(${Math.round(share*110)},45%,55%,.35)`;ctx.beginPath();ctx.arc(p.x,p.y,24/zoom,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#f2ecd2';ctx.font=`600 ${10/zoom}px system-ui`;ctx.fillText(Math.round(share*100)+' %',p.x,p.y+14/zoom);
  }
});
direct.add('cancelInvasion');
function beginTargetTool16(kind){
  closeModal();operationTool={kind,points:[]};document.body.classList.remove('panel-open');
  const tool=$('operation-toolbar');tool.hidden=false;
  tool.innerHTML=`<span>${kind==='invasion'?'DÉBARQUEMENT / Cliquez une province côtière ennemie':'PARACHUTAGE / Cliquez la province ennemie visée'}</span>${btn('Annuler','cancelOperation',{},'small')}`;
}
window.addEventListener('pointerup',ev=>{
  if(!operationTool||!['invasion','paradrop'].includes(operationTool.kind)||ev.target!==canvas||!drag||drag.moved||ev.button!==0)return;
  const r=canvas.getBoundingClientRect(),id=pointAt(ev.clientX-r.left,ev.clientY-r.top);
  ev.stopImmediatePropagation();drag=null;if(id===null)return;
  const kind=operationTool.kind,ids=[...selected];endOperationTool();
  cmd(kind,{ids,target:id}).then(()=>{toast(kind==='invasion'?'Débarquement en préparation : '+pname(id)+'.':'Parachutage lancé sur '+pname(id)+'.');renderPanel(true);}).catch(()=>{});
},true);
ACTIONS16.push(async(action,p)=>{
  switch(action){
    case 'airMission16':{const mission=$('air-mission-'+p.id).value;await cmd('airMission',{id:p.id,mission,zone:$('air-zone-'+p.id).value,seaZone:$('air-sea-'+p.id)?.value});toast('Mission aérienne affectée.');renderPanel(true);return true;}
    case 'invasionTool16':beginTargetTool16('invasion');return true;
    case 'paradropTool16':beginTargetTool16('paradrop');return true;
  }
  return false;
});

/* ---- Peace conference, exile and diplomacy ---- */
const WAR_GOALS16={conquest:'Conquête',puppet:'Vassalisation',border:'Rectification de frontière'};
const subjectLevel16=c=>{let name='';for(const [n,label] of Rules.SUBJECT_LEVELS16)if((c.autonomy16??40)>=n)name=label;return name;};
function conferenceCost16(actor,row){
  const conf=S.conference16,controlled=row.provinces.filter(pid=>S.provinces[pid].ctrl===actor).length;
  const core=row.provinces.some(pid=>isCore16(actor,pid)),adjacent=row.provinces.some(pid=>WORLD.provinces[pid].neighbors.some(n=>S.provinces[n].ctrl===actor||S.provinces[n].own===actor));
  const goal=conf.participants.find(p=>p.id===actor)?.goal;
  let cost=(4+row.vp*2)*(controlled*2>=row.provinces.length?.6:1.25)*(core?.5:1)*(adjacent?.9:1.2);
  if(goal==='conquest')cost*=.85;if(goal==='border'&&adjacent)cost*=.7;
  return Math.max(1,Math.round(cost));
}
function showConference16(){
  const conf=S.conference16;if(!conf)return;pauseGame();
  const me=conf.participants.find(p=>p.id===S.player),open=me&&!me.passed;
  const rows=[...conf.states].sort((a,b)=>(a.claimedBy?1:0)-(b.claimedBy?1:0)||b.vp-a.vp);
  const puppetCost=loser=>Math.max(1,Math.round(total(conf.states.filter(r=>r.owner===loser&&!r.claimedBy).map(r=>conferenceCost16(S.player,r)))*.55*(me?.goal==='puppet'?.7:1)));
  const libs=(CATALOG.releasables||[]).filter(def=>!nation(def.id)?.alive).map(def=>{const admins=new Set(def.admins),list=conf.states.filter(r=>!r.claimedBy&&r.provinces.some(pid=>admins.has(WORLD.provinces[pid].administration)));return {def,list,cost:Math.max(1,Math.round(total(list.map(r=>conferenceCost16(S.player,r)))*.5))};}).filter(x=>x.list.length);
  modal(`${modalHead('Conférence de paix','DIPLOMATIE / TRAITÉ / '+dateText(conf.day))}
    <p class="note">Vaincus : ${conf.losers.map(l=>esc(countryName(l))).join(', ')}. Chaque vainqueur dépense ses points à tour de rôle selon sa contribution à la guerre. Les États que vous occupez, vos territoires nationaux et les États voisins coûtent moins cher. Les États non réclamés reviennent au vaincu.</p>
    <div class="grid3" style="margin:12px 0">${conf.participants.map(p=>`<div class="card stat ${p.id===S.player?'gold':''}">${p.points} / ${p.start}<small>${esc(countryName(p.id).toUpperCase())}${p.goal?' / '+esc(WAR_GOALS16[p.goal]||p.goal):''}${p.passed?' / RETIRÉ':''}</small></div>`).join('')}</div>
    ${open?`<div class="row wrap">${btn('Passer mon tour définitivement','peacePass',{},'small')}${btn('Laisser l’état-major décider','peaceAuto',{},'small primary')}</div>`:'<p class="note">Vous ne participez plus aux négociations. Le traité sera signé après le dernier tour.</p>'}
    ${open?`<div class="sectionlabel">Vassalisation</div><div class="row wrap">${conf.losers.filter(l=>conf.states.some(r=>r.owner===l&&!r.claimedBy)).map(l=>btn('Vassaliser '+esc(countryName(l))+' / '+puppetCost(l)+' pts','peacePuppet',{loser:l},'small',puppetCost(l)>me.points)).join('')}</div>`:''}
    ${open&&libs.length?`<div class="sectionlabel">Libération de nations</div><div class="stack">${libs.map(x=>`<div class="card row between"><span>${esc(x.def.name)}<small style="display:block">${x.list.length} État(s) / ${x.cost} points</small></span><div class="row">${btn('Indépendante','peaceLiberate',{id:x.def.id,puppet:false},'small',x.cost>me.points)}${btn('Sous tutelle','peaceLiberate',{id:x.def.id,puppet:true},'small',x.cost>me.points)}</div></div>`).join('')}</div>`:''}
    <div class="sectionlabel">États en jeu / ${rows.length}</div><table class="table"><thead><tr><th>État</th><th>Vaincu</th><th>Occupant</th><th>PV</th><th>Coût</th><th></th></tr></thead><tbody>${rows.map(r=>{const ctrl=S.provinces[r.provinces[0]].ctrl,cost=open?conferenceCost16(S.player,r):'';return `<tr><td>${esc(r.name)}</td><td>${esc(countryName(r.owner))}</td><td>${esc(countryName(ctrl))}</td><td>${r.vp}</td><td>${cost}</td><td>${r.claimedBy?tag(countryName(r.claimedBy),r.claimedBy===S.player?'good':''):open?btn('Prendre','peaceTake',{sid:r.sid},'small',cost>me.points):''}</td></tr>`;}).join('')}</tbody></table>
    <div class="sectionlabel">Clauses</div><div class="stack">${conf.log.slice().reverse().map(l=>`<div class="logentry"><p>${esc(l)}</p></div>`).join('')||'<p class="note">Aucune clause pour le moment.</p>'}</div>`,'conference','wide');
}
const onState15=onState;
onState=function(perf){
  onState15(perf);
  const me=S.conference16?.participants.find(p=>p.id===S.player);
  if(me&&!me.passed&&modalKind!=='conference'&&modalKind!=='event')showConference16();
  if(!S.conference16&&modalKind==='conference'){$('overlay').style.display='none';modalKind='';}
};
DRAW16.push((ctx,zoom)=>{
  const conf=S?.conference16;if(!conf)return;
  for(const r of conf.states){const color=r.claimedBy?code(r.claimedBy)?.color||'#c9a96b':'#c85f4a';for(const pid of r.provinces){ctx.fillStyle=color+'66';ctx.fill(geometries[pid].path);ctx.strokeStyle=r.claimedBy?'#f5e3b0':'#ff8f7a';ctx.lineWidth=1.2/zoom;ctx.stroke(geometries[pid].path);}}
});
PANELS16.diplomacy=function(){
  const c=nation(),t=nation(target),atWar=war(S.player,target),friend=allied(S.player,target),rel=c.relations[target]||0,intel=c.intel[target]||0;
  if(!t)return undefined;
  const j=c.justifications.find(j=>j.target===target),sel=ownUnits().filter(u=>selected.has(u.id));
  const lent=S.units.filter(u=>u.lent16?.home===S.player),hosted=S.units.filter(u=>u.owner===S.player&&u.lent16);
  const subjects=Object.values(S.countries).filter(x=>x.alive&&x.subject===S.player);
  const tAtWar=S.wars.some(w=>w.a===target||w.b===target);
  const releasable=(CATALOG.releasables||[]).filter(def=>!nation(def.id)?.alive).map(def=>({def,pids:WORLD.provinces.filter(p=>def.admins.includes(p.administration)&&control(p.id)===S.player).map(p=>p.id)})).filter(x=>x.pids.length&&x.pids.length<owned().length);
  return panelHeader('Affaires étrangères','Garanties, factions et buts de guerre peuvent transformer un conflit local en guerre mondiale.')+`
    ${c.exile16?`<div class="card" style="border-color:#c98070"><strong class="bad">Gouvernement en exil</strong><p class="note">Votre gouvernement siège chez ${esc(countryName(c.exile16.host))}. Vos forces poursuivent la guerre ; la victoire de vos alliés vous rendra votre territoire.</p></div>`:''}
    ${c.subject?`<div class="card stack"><div class="eyebrow">VOTRE STATUT</div>${metric('Puissance tutélaire',esc(countryName(c.subject)))}${metric(esc(subjectLevel16(c)),Math.round(c.autonomy16??40)+' % d’autonomie')}${bar(c.autonomy16??40)}${btn('Revendiquer plus d’autonomie / 50 PP','demandAutonomy',{},'small',c.pp<50)}</div>`:''}
    ${selectCountries(target,'dip-select',S.player)}
    <div class="leader-card" style="margin-top:13px">${portrait(target)}<div><h3 style="font-size:20px">${esc(code(target).leader)}</h3><small>${esc(code(target).role)}</small>${tag(atWar?'EN GUERRE':friend?'ALLIÉ':'EN PAIX',atWar?'bad':friend?'good':'')}</div></div>
    <div class="card" style="margin-top:9px">${metric('Faction',esc(t.faction==='none'?'Aucune':t.faction))}${metric('Idéologie',esc(IDEO[t.ideology]))}${metric('Relations',String(rel),rel>=25?'good':'')}${metric('Renseignement',Math.round(intel)+' %')}${metric('Divisions',friend||intel>=45?String(S.units.filter(u=>u.owner===target).length):'Non confirmé')}${t.subject?metric('Puissance tutélaire',esc(countryName(t.subject))):''}${t.exile16?metric('Statut','En exil'):''}</div>
    <div class="sectionlabel">Diplomatie</div><div class="grid2">${btn('Relations +25 / 25 PP','relations',{target},'small',atWar)}${btn('Accès militaire / 20 PP','access',{target},'small',atWar)}${btn('Inviter / 75 PP','alliance',{target},'small',atWar||friend||t.faction!=='none')}${btn('Garantir / 40 PP','guarantee',{target},'small',atWar)}${btn('Non-agression / 40 PP','pact',{target},'small',atWar)}${btn('Reconnaissance / 35 PP','spy',{target,mission:'recon'},'small')}</div>
    <div class="sectionlabel">Buts de guerre</div>${j?`<div class="card"><strong style="font-size:12px">${esc(WAR_GOALS16[j.goal]||'Conquête')} : ${j.progress>=j.days?'objectif prêt':'en cours'}</strong><small style="display:block;margin:7px 0">${j.progress}/${j.days} jours</small>${bar(j.progress/j.days*100)}</div>`:`<div class="card stack"><select id="war-goal">${Object.entries(WAR_GOALS16).map(([k,label])=>`<option value="${k}">${esc(label)}</option>`).join('')}</select>${btn('Justifier ce but de guerre / 40 PP','justify16',{target},'small',atWar||friend)}<small>Les démocraties attendent 40 % de tension mondiale. Un but de guerre donne 25 % de points en plus et des réductions à la conférence de paix.</small></div>`}
    <div class="stack" style="margin-top:8px">${btn('Déclarer la guerre / 50 PP','confirmWar',{target},'danger small',atWar||friend||!j||j.progress<j.days)}${btn('Négocier un armistice / 50 PP','peace',{target,terms:'white'},'small',!atWar)}${btn('Exiger la soumission / 50 PP','peace',{target,terms:'puppet'},'small',!atWar)}</div>
    <div class="sectionlabel">Volontaires et corps expéditionnaires</div><div class="card stack"><p class="note">${sel.length} division(s) sélectionnée(s). Les volontaires rejoignent un pays en guerre sans entrer vous-même dans le conflit (15 % de vos divisions au maximum). Un corps expéditionnaire renforce un allié de faction.</p>
      <div class="row wrap">${btn('Envoyer des volontaires / 20 PP','volunteers',{target,ids:sel.map(u=>u.id)},'small',!sel.length||!tAtWar||atWar)}${btn('Corps expéditionnaire','expeditionary',{target,ids:sel.map(u=>u.id)},'small',!sel.length||!friend||target===S.player)}</div>
      ${lent.length?`${metric('Divisions prêtées',lent.length)}${btn('Rappeler toutes les divisions prêtées','recall',{},'small')}`:''}${hosted.length?metric('Divisions alliées sous vos ordres',hosted.length):''}</div>
    ${t.subject===S.player?`<div class="sectionlabel">Sujet : ${esc(countryName(target))}</div><div class="card stack">${metric(esc(subjectLevel16(t)),Math.round(t.autonomy16??40)+' % d’autonomie')}${bar(t.autonomy16??40)}<div class="row wrap">${btn('Réduire l’autonomie / 40 PP','autonomy',{target,delta:-1},'small')}${btn('Accorder de l’autonomie / 40 PP','autonomy',{target,delta:1},'small')}${btn('Annexer / 120 PP','annexSubject',{target},'small danger',(t.autonomy16??40)>=20)}${btn('Libérer','releaseSubject',{target},'small')}</div><small>L’autonomie progresse avec l’armée et la stabilité du sujet ; vos garnisons la freinent. À 100 %, il devient indépendant. Le suzerain prélève une part de ses ressources.</small></div>`:''}
    ${subjects.length?`<div class="sectionlabel">Vos sujets</div><div class="stack">${subjects.map(x=>`<div class="card row between"><span>${esc(x.identity.name)}<small style="display:block">${esc(subjectLevel16(x))} / ${Math.round(x.autonomy16??40)} %</small></span>${btn(icon('arrow'),'countryDiplomacy',{id:x.identity.id},'small ghost')}</div>`).join('')}</div>`:''}
    <div class="sectionlabel">Coup d’État</div><div class="card stack"><p class="note">Avec 60 % de renseignement et un courant de votre idéologie au-delà de 30 %, vous pouvez provoquer une guerre civile dans ce pays.</p>${btn('Fomenter un coup d’État / 100 PP','coup',{target},'small danger',atWar||intel<60||t.ideology===c.ideology||(t.parties[c.ideology]||0)<30)}</div>
    <div class="sectionlabel">Importations stratégiques</div><div class="grid2">${Object.entries(RES16).map(([k,n])=>btn('Importer 4 '+esc(n.toLowerCase()),'trade',{target,resource:k},'small',atWar)).join('')}</div>
    <div class="sectionlabel">Prêt-bail de matériel</div><div class="card stack"><select id="lease-equipment">${Object.entries(CATALOG.equipment).map(([k,e])=>`<option value="${k}">${esc(e.name)}</option>`).join('')}</select><div class="row between"><small>Quantité quotidienne</small><input id="lease-qty" type="number" min="1" max="500" value="20"></div>${btn('Proposer le prêt-bail','leaseForm',{target},'small',atWar)}</div>${c.lendLease.map(l=>`<div class="card row between" style="margin-top:7px"><small>${num(l.daily)} ${esc(CATALOG.equipment[l.equipment].name)} / jour → ${esc(countryName(l.target))}</small>${btn('×','cancelLease',{id:l.id},'small ghost')}</div>`).join('')}
    ${releasable.length?`<div class="sectionlabel">Nations libérables de votre territoire</div><div class="stack">${releasable.map(x=>`<div class="card row between"><span>${esc(x.def.name)}<small style="display:block">${x.pids.length} province(s)</small></span><div class="row">${btn('Indépendante / 50 PP','releaseNation16',{id:x.def.id,puppet:false},'small',c.pp<50)}${btn('Sous tutelle / 50 PP','releaseNation16',{id:x.def.id,puppet:true},'small',c.pp<50)}</div></div>`).join('')}</div>`:''}
    ${(S.peaceLog16||[]).length?`<div class="sectionlabel">Traités signés</div><div class="stack">${S.peaceLog16.map(t=>`<details class="card"><summary>${dateText(t.day)} / ${t.losers.map(l=>esc(countryName(l))).join(', ')}</summary>${t.log.map(l=>`<p class="note">${esc(l)}</p>`).join('')}</details>`).join('')}</div>`:''}`;
};
['peaceTake','peacePuppet','peaceLiberate','peacePass','peaceAuto','volunteers','expeditionary','recall','autonomy','annexSubject','releaseSubject','demandAutonomy','coup'].forEach(a=>direct.delete(a));
ACTIONS16.push(async(action,p)=>{
  switch(action){
    case 'peaceTake':case 'peacePuppet':case 'peaceLiberate':case 'peacePass':case 'peaceAuto':await cmd(action,p);if(S.conference16)showConference16();else closeModal();return true;
    case 'justify16':await cmd('justify',{target:p.target,goal:$('war-goal').value});renderPanel(true);toast('Justification engagée.');return true;
    case 'volunteers':case 'expeditionary':await cmd(action,p);selected.clear();renderSelection();renderPanel(true);toast(action==='volunteers'?'Volontaires envoyés.':'Corps expéditionnaire transféré.');return true;
    case 'recall':case 'autonomy':case 'annexSubject':case 'releaseSubject':case 'demandAutonomy':await cmd(action,p);renderPanel(true);return true;
    case 'coup':if(confirm('Fomenter un coup d’État ? Une guerre civile éclatera dans ce pays.')){await cmd('coup',p);renderPanel(true);}return true;
    case 'releaseNation16':if(confirm('Libérer cette nation ? Le territoire et les bâtiments lui seront cédés.')){await cmd('releaseNation',p);renderPanel(true);}return true;
  }
  return false;
});

/* ---- Government: national spirits, advisors and decisions ---- */
TABS.decisions=['check','Décisions'];
const spiritDef16=id=>(CATALOG.spirits||[]).find(s=>s.id===id);
const advisorDef16=id=>(CATALOG.advisors||[]).find(a=>a.id===id);
const effectText16=e=>{const labels={stabilityGrowth:'stabilité / jour',supportGrowth:'soutien / jour',consumer:'biens de consommation',organization:'organisation',airDefense:'défense antiaérienne',invasion:'débarquements',paradrop:'aéroporté',reliability:'fiabilité',surrender:'seuil de capitulation',casualties:'blessés récupérés',attrition:'résistance à l’attrition',breakthrough:'percée',entrench:'retranchement',mines:'guerre des mines',convoy:'escorte des convois',resources:'extraction',ppGain:'pouvoir politique',recruitment:'incorporation',buildingSlots:'emplacements'};
  return Object.entries(e||{}).map(([k,v])=>labels[k]?`${v>=0?'+':''}${Math.round(v*100)} % ${labels[k]}`:effectText({[k]:v})).join(' / ');};
NATION_EXTRA16.push(()=>{
  const c=nation(),list=c.spirits16||[];
  return `<div class="sectionlabel">Esprits nationaux / ${list.length}</div>${list.length?`<div class="stack">${list.map(s=>{const d=spiritDef16(s.id);return d?`<div class="card"><div class="row between"><strong>${esc(d.name)}</strong>${s.until!==null?tag('JUSQU’AU '+dateText(s.until)):tag('PERMANENT','gold')}</div><p class="note" style="margin:5px 0">${esc(d.desc)}</p><small>${esc(effectText16(d.effect))}</small></div>`:'';}).join('')}</div>`:'<p class="note">Aucun trait national particulier.</p>'}`;
});
politicalExtension=function(){
  const c=nation(),hired=Object.values(c.advisors16||{}).flat();
  return `<div class="sectionlabel">Gouvernement</div><div class="card stack">${metric('Conseillers et chefs d’état-major',hired.length)}${hired.map(id=>`<small>${esc(advisorDef16(id)?.name||id)} : ${esc(effectText16(advisorDef16(id)?.effect))}</small>`).join('')}${btn('Nommer des conseillers '+icon('arrow'),'tab',{id:'politics'},'small')}${btn('Décisions nationales '+icon('arrow'),'tab',{id:'decisions'},'small')}${metric('Usure de guerre',Math.round(c.warFatigue||0)+' %')}${btn('Démobiliser en temps de paix / 40 PP','demobilize',{},'small')}</div>
   <div class="sectionlabel">Vie politique / trajectoires alternatives</div><div class="card stack"><p class="note">La propagande politique déplace le soutien entre tendances. Une majorité de 55 % permet une réorientation institutionnelle ; un courant à 60 % face à un pouvoir instable peut déclencher une guerre civile.</p>${Object.keys(IDEO).map(k=>`<div><div class="row between"><span>${IDEO[k]}</span><strong>${Math.round(c.parties[k])} %</strong></div>${bar(c.parties[k],PARTYC[k])}<div class="row" style="margin:6px 0 9px">${btn('Campagne / 60 PP','politicalCampaign',{ideology:k},'small',c.politicalCooldown>S.day)}${k!==c.ideology&&c.parties[k]>=55?btn('Réorienter / 100 PP','confirmReform',{ideology:k},'small danger'):''}</div></div>`).join('')}</div>`;
};
panelExtras16('politics',()=>{
  const c=nation(),slots=CATALOG.advisorSlots||{};
  return `<div class="sectionlabel">Conseillers et état-major</div>${Object.entries(slots).map(([slot,[label,max]])=>{
    const hired=c.advisors16?.[slot]||[],options=(CATALOG.advisors||[]).filter(a=>a.slot===slot&&!hired.includes(a.id)&&(!a.ideology||a.ideology.includes(c.ideology)));
    return `<div class="card stack"><div class="row between"><strong>${esc(label)}</strong>${tag(hired.length+' / '+max)}</div>
      ${hired.map(id=>{const a=advisorDef16(id);return `<div class="row between"><span>${esc(a?.name||id)}<small style="display:block">${esc(effectText16(a?.effect))}</small></span>${btn('Renvoyer','dismissAdvisor',{id},'small ghost')}</div>`;}).join('')}
      <select id="advisor-${slot}">${options.map(a=>`<option value="${a.id}">${esc(a.name)} / ${a.cost} PP / ${esc(effectText16(a.effect))}</option>`).join('')}</select>
      ${btn(hired.length>=max?'Remplacer le plus ancien':'Nommer','hireAdvisor16',{slot},'small',!options.length)}</div>`;
  }).join('')}<p class="note">Chaque poste accorde ses bonus tant que le titulaire reste en fonction. Remplacer un conseiller ne rembourse pas son coût.</p>`;
});
PANELS16.decisions=function(){
  const c=nation(),cats=CATALOG.decisionCategories||{},used=c.decisions16||{};
  const reason=d=>{const r=d.requires||{},atWar=S.wars.some(w=>w.a===S.player||w.b===S.player),u=used[d.id];
    if(r.country&&!r.country.includes(S.player))return null;
    if(r.ideology&&!r.ideology.includes(c.ideology))return 'Régime incompatible.';
    if(r.notIdeology?.includes(c.ideology))return 'Régime incompatible.';
    if(r.war&&!atWar)return 'Exige une guerre en cours.';if(r.peace&&atWar)return 'Impossible en guerre.';
    if(r.tension&&S.tension<r.tension&&!atWar)return 'Tension mondiale : '+r.tension+' % requis.';
    if(r.tech&&!c.tech.includes(r.tech))return 'Technologie : '+techName16(r.tech)+'.';
    if(r.spirit&&!(c.spirits16||[]).some(s=>s.id===r.spirit))return 'Condition nationale absente.';
    if(r.faction&&c.faction==='none')return 'Exige une faction.';
    if(r.overseas&&!owned().some(p=>p.overseas))return 'Aucun territoire d’outre-mer.';
    if(r.warlord&&!['SHX','GXC','YUN','XSM'].some(k=>S.countries[k]?.alive&&!S.countries[k].subject&&!S.wars.some(w=>(w.a===k&&w.b===S.player)||(w.b===k&&w.a===S.player))))return 'Aucun gouverneur provincial à rallier.';
    if(d.once&&u)return 'Déjà prise.';
    if(u&&d.cooldown&&u.day+d.cooldown>S.day)return 'Disponible dans '+(u.day+d.cooldown-S.day)+' jours.';
    if(c.pp<d.cost)return 'Il faut '+d.cost+' PP.';return '';};
  return panelHeader('Décisions','Mesures ponctuelles de gouvernement : économie, défense, politique et projets nationaux.')+
    Object.entries(cats).map(([cat,label])=>{const list=(CATALOG.decisions||[]).filter(d=>d.category===cat).map(d=>[d,reason(d)]).filter(([,r])=>r!==null);
      return list.length?`<div class="sectionlabel">${esc(label)}</div><div class="stack">${list.map(([d,r])=>{const sp=d.spirit?spiritDef16(d.spirit):null;return `<div class="card"><div class="row between"><strong>${esc(d.name)}</strong>${tag(d.cost+' PP',r?'':'gold')}</div><p class="note" style="margin:6px 0">${esc(d.desc)}</p>${Object.keys(d.effect||{}).length?`<small style="display:block">${esc(effectText16(d.effect))}</small>`:''}${sp?`<small style="display:block" class="gold">${esc(sp.name)}${d.days?' ('+d.days+' j)':''} : ${esc(effectText16(sp.effect))}</small>`:''}${d.cooldown?`<small style="display:block">Renouvelable après ${d.cooldown} jours</small>`:d.once?'<small style="display:block">Une seule fois</small>':''}<div style="margin-top:8px">${btn(r||'Prendre la décision','takeDecision',{id:d.id},'small wide',!!r)}</div></div>`;}).join('')}</div>`:'';}).join('');
};
direct.add('takeDecision');direct.add('dismissAdvisor');
ACTIONS16.push(async(action,p)=>{
  if(action==='hireAdvisor16'){const id=$('advisor-'+p.slot).value;await cmd('hireAdvisor',{id});renderPanel(true);toast('Conseiller nommé.');return true;}
  return false;
});

/* ---- Content: doctrines, focus trees and dynamic events ---- */
{const modGroup=TECHGROUPS.mod;delete TECHGROUPS.mod;Object.assign(TECHGROUPS,{doctrine:'Doctrines terrestres',naval_doctrine:'Doctrines navales',air_doctrine:'Doctrines aériennes',electronics:'Électronique'});TECHGROUPS.mod=modGroup;}
const IDEO_PATH16={democratic:'démocratique',fascist:'fasciste',communist:'communiste',authoritarian:'autoritaire'};
const focusName16=id=>focusTree().find(f=>f.id===id)?.name||id;
const asList16=v=>v==null?[]:Array.isArray(v)?v:[v];
function focusBlock16(c,f){
  const r=f.requires||{},atWar=S.wars.some(w=>w.a===S.player||w.b===S.player);
  if(c.focusDone.includes(f.id))return 'Achevée.';
  if(!f.req.every(k=>c.focusDone.includes(k)))return 'Prérequis manquants.';
  if(f.reqAny?.length&&!f.reqAny.some(k=>c.focusDone.includes(k)))return 'Prérequis manquants.';
  if(asList16(f.exclusive).some(k=>c.focusDone.includes(k)))return 'Branche exclue par vos choix.';
  if(r.ideology&&!r.ideology.includes(c.ideology))return 'Régime incompatible.';
  if(r.war&&!atWar)return 'Exige une guerre en cours.';
  if(r.peace&&atWar)return 'Impossible en guerre.';
  if(r.tension&&S.tension<r.tension&&!atWar)return 'Tension mondiale : '+r.tension+' % requis.';
  if(r.year&&1936+S.day/365.25<r.year)return 'Disponible en '+r.year+'.';
  return '';
}
function specialText16(sp){
  if(!sp)return [];
  const out=[];
  if(sp.infra)out.push('+1 infrastructure dans '+sp.infra+' provinces');
  if(sp.refinery)out.push('+'+sp.refinery+' raffinerie synthétique');
  if(sp.forts)out.push('Fortifications sur '+sp.forts+' provinces frontalières');
  if(sp.coastal)out.push('Forts côtiers sur '+sp.coastal+' provinces');
  if(sp.aa)out.push('Défense antiaérienne dans '+sp.aa+' villes');
  if(sp.build)out.push('Construit : '+Object.entries(sp.build).map(([k,n])=>n+' '+(CATALOG.buildings[k]?.name||k)).join(', '));
  if(sp.militia)out.push(sp.militia+' divisions de milice');
  if(sp.scorch)out.push('Destruction des installations proches du front');
  if(sp.manpower)out.push('Rappel de réservistes');
  return out;
}
function extrasText16(x){
  const out=[];
  for(const id of [...asList16(x.spirits),...asList16(x.spirit)]){const d=spiritDef16(id);if(d)out.push('Esprit « '+d.name+' »'+(x.spiritDays?' ('+x.spiritDays+' j)':'')+' : '+effectText16(d.effect));}
  if(x.removeSpirit)out.push('Retire « '+(spiritDef16(x.removeSpirit)?.name||x.removeSpirit)+' »');
  out.push(...specialText16(x.special));
  if(x.govern)out.push('Le régime devient '+IDEO_PATH16[x.govern]);
  if(x.partyShift)out.push(Object.entries(x.partyShift).map(([k,v])=>(v>0?'+':'')+v+' % '+(IDEO[k]||k)).join(', '));
  if(x.faction)out.push('Rejoint la faction de '+asList16(x.faction.with).map(countryName).join(' ou ')+(x.faction.name?' (sinon fonde « '+x.faction.name+' »)':''));
  if(x.invite)out.push('Invite dans la faction : '+asList16(x.invite.list).map(countryName).join(', '));
  if(x.relations)out.push('Relations : '+Object.entries(x.relations).map(([k,v])=>countryName(k)+' +'+v).join(', '));
  if(x.guarantee)out.push(x.guarantee==='neighbours'?'Garantit l’indépendance des petits voisins':'Garantit : '+asList16(x.guarantee).map(countryName).join(', '));
  if(x.claims)out.push(x.claims==='weakest'?'But de guerre contre le voisin le plus faible':'Buts de guerre : '+asList16(x.claims).map(countryName).join(', '));
  for(const b of asList16(x.researchBonus))out.push('+'+Math.round(b.value*100)+' % de vitesse pour '+(b.uses||1)+' recherche(s) : '+(TECHGROUPS[b.group]||b.group));
  if(x.orgLoss)out.push('-'+Math.round(x.orgLoss*100)+' % d’organisation des divisions');
  return out;
}
const focusIcon16=f=>f.path?'people':/^c16_(plan|survey|roads|synthetic|power|metals|basin|civilian|armament|labs|reserves)/.test(f.id)?'industry':/^c16_(ministry|intelligence|attaches|trade|propaganda)/.test(f.id)?'diplomacy':/^c16_/.test(f.id)?'army':f.id.includes('industry')||f.id==='arsenals'?'industry':f.id==='air'?'plane':f.id==='navy'?'anchor':'focus';
showTree=function(){
  if(!S)return;pauseGame();const tree=focusTree(),c=nation(),maxRow=Math.max(...tree.map(f=>f.row)),columns=Math.max(...tree.map(f=>f.col))+1,width=210,gap=50,rowh=109,rowgap=32;
  const W=columns*width+(columns-1)*gap,H=(maxRow+1)*(rowh+rowgap)-rowgap;
  const link=(r,f,dashed)=>{const parent=tree.find(x=>x.id===r);if(!parent)return '';const x1=parent.col*(width+gap)+width/2,y1=parent.row*(rowh+rowgap)+rowh,x2=f.col*(width+gap)+width/2,y2=f.row*(rowh+rowgap);return `<path d="M${x1},${y1} V${y1+16} H${x2} V${y2}" stroke="${c.focusDone.includes(r)?'#bca978':'#4d625b'}" stroke-width="1.5" fill="none"${dashed?' stroke-dasharray="5 4"':''}/>`;};
  const links=tree.flatMap(f=>[...f.req.map(r=>link(r,f,false)),...(f.reqAny||[]).map(r=>link(r,f,true))]).join('');
  modal(`${modalHead('Priorités de '+countryName(S.player),'GOUVERNEMENT / ARBRE NATIONAL')}<p class="note" style="margin-bottom:15px">${c.focusDone.length}/${tree.length} programmes achevés. Un programme actif à la fois. Les traits pointillés signalent un prérequis alternatif ; les voies politiques s’excluent mutuellement.</p><div class="focus-wrapper"><div class="focus-grid" style="grid-template-columns:repeat(${columns},${width}px);width:${W}px;height:${H}px"><svg class="focus-lines" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${links}</svg>${tree.map(f=>{const done=c.focusDone.includes(f.id),running=c.focus?.id===f.id,block=done||running?'':focusBlock16(c,f),excluded=asList16(f.exclusive).some(k=>c.focusDone.includes(k));return `<button class="focus-node ${done?'done':running?'running':block?'locked':''}" style="grid-column:${f.col+1};grid-row:${f.row+1}${excluded?';opacity:.3':''}" data-a="focusDetail" data-p="${encodeURIComponent(JSON.stringify({id:f.id}))}">${icon(done?'check':block?'lock':focusIcon16(f))}<span>${esc(f.name)}</span><small>${done?'ACHEVÉ':running?'EN COURS':excluded?'EXCLU':f.days+' JOURS'}${f.path?' / '+IDEO_PATH16[f.path].toUpperCase():''}</small></button>`;}).join('')}</div></div>`,'focusTree','wide');
};
showFocusDetail=function(id){
  const f=focusTree().find(f=>f.id===id),c=nation();if(!f)return;const block=focusBlock16(c,f),extras=extrasText16(f),r=f.requires||{};
  const conditions=[r.ideology?'régime '+r.ideology.map(k=>IDEO_PATH16[k]).join(' ou '):'',r.war?'en guerre':'',r.peace?'en paix':'',r.tension?'tension '+r.tension+' %':'',r.year?'à partir de '+r.year:''].filter(Boolean);
  modal(`${modalHead(f.name,'PRIORITÉ NATIONALE'+(f.path?' / VOIE '+IDEO_PATH16[f.path].toUpperCase():''))}<div class="card"><div class="eyebrow">EFFETS À L’ACHÈVEMENT</div><p style="margin-top:12px">${Object.keys(f.effect||{}).length?esc(effectText16(f.effect)):''}</p>${extras.map(t=>`<small style="display:block;margin-top:6px" class="gold">${esc(t)}</small>`).join('')}</div><p class="note" style="margin:15px 0">Durée : ${f.days} jours.${f.req.length?' Prérequis : '+f.req.map(k=>esc(focusName16(k))).join(', ')+'.':''}${f.reqAny?.length?' L’une de : '+f.reqAny.map(k=>esc(focusName16(k))).join(', ')+'.':''}${asList16(f.exclusive).length?' Exclut : '+asList16(f.exclusive).map(k=>esc(focusName16(k))).join(', ')+'.':''}${conditions.length?' Conditions : '+esc(conditions.join(', '))+'.':''}${block&&!c.focusDone.includes(f.id)?' <strong>'+esc(block)+'</strong>':''}</p><div class="row">${btn('Activer ce programme','activateFocus',{id},'primary',!!block||!!c.focus)}${btn('Retour à l’arbre','focusTree')}</div>`,'focusDetail','narrow');
};
PANELS16.focus=function(){
  const tree=focusTree(),c=nation(),f=c.focus?tree.find(f=>f.id===c.focus.id):null;
  return panelHeader('Priorités nationales',CATALOG.focus[S.player]?'Un arbre propre à votre nation.':'Un arbre commun pour les puissances secondaires.')+`
    <div class="focus-current"><div class="eyebrow">${f?'PROGRAMME EN COURS':'NOUVELLE ORIENTATION'}</div><h3>${f?esc(f.name):'Fixer les priorités de l’État'}</h3><p class="note">${f?esc([effectText16(f.effect),...extrasText16(f)].filter(Boolean).join(' / ')):'Industrie, défense, diplomatie, régime : chaque branche ouvre de nouveaux choix.'}</p>${f?bar(c.focus.progress/f.days*100)+`<small>${c.focus.progress}/${f.days} jours</small>`:''}</div>
    <div style="margin:15px 0">${btn('Afficher l’arbre complet '+icon('arrow'),'focusTree',{},'primary wide')}</div>
    <div class="sectionlabel">Programmes accessibles</div><div class="stack">${tree.filter(f=>!focusBlock16(c,f)&&c.focus?.id!==f.id).map(f=>`<div class="card"><h3 style="font-size:19px">${esc(f.name)}</h3>${f.path?tag('VOIE '+IDEO_PATH16[f.path].toUpperCase(),'gold'):''}<p class="note" style="margin:7px 0">${esc([effectText16(f.effect),...extrasText16(f)].filter(Boolean).join(' / '))}</p><small>${f.days} jours</small><div style="margin-top:10px">${btn('Activer','focus',{id:f.id},'small wide',!!c.focus)}</div></div>`).join('')||'<div class="empty">Achevez le programme en cours pour ouvrir de nouvelles branches.</div>'}</div>
    <div class="sectionlabel">Programmes achevés / ${c.focusDone.length}</div><div class="stack">${c.focusDone.map(id=>`<div class="card row">${icon('check')}<span>${esc(focusName16(id))}</span></div>`).join('')}</div>
    ${(c.researchBonus16||[]).length?`<div class="sectionlabel">Bonus de recherche</div><div class="card stack">${c.researchBonus16.map(b=>`<small>+${Math.round(b.value*100)} % / ${esc(TECHGROUPS[b.group]||b.group)} / ${b.uses} recherche(s)</small>`).join('')}</div>`:''}`;
};
const showEvent15=showEvent;
showEvent=function(){
  const e=S.pending?.event;if(!e?.dyn16)return showEvent15();
  modal(`<div class="row between"><div class="eyebrow">DÉPÊCHE / ${dateText(S.day)}</div>${tag('DÉCISION REQUISE','gold')}</div><div class="event-title">${esc(e.title)}</div><div class="event-paper"><p>${esc(e.text)}</p></div><div class="event-choices">${e.choices.map((choice,index)=>btn(`<span>${esc(choice.text)}<small style="display:block;margin-top:5px">${esc([effectText16(choice.effect||{}),...extrasText16(choice)].filter(Boolean).join(' / '))}</small></span>${icon('arrow')}`,'event',{index})).join('')}</div><p class="note" style="margin-top:18px">La campagne est suspendue jusqu’à votre décision.</p>`,'event','narrow');
};

/* ---- Manual ---- */
showHelp=function(){
  pauseGame();
  const card=(title,text)=>`<div class="card"><h3>${title}</h3><p class="note" style="margin-top:10px">${text}</p></div>`;
  modal(`${modalHead('Manuel de campagne','FRONTIÈRES 1.6 / PRISE EN MAIN')}<div class="grid2">
    ${card('1. Préparer l’État','Choisissez une priorité nationale et affectez vos équipes de recherche. Les usines, chantiers et raffineries partagent les emplacements de chaque État. Six ressources stratégiques alimentent les lignes de production ; la loi commerciale fixe la part exportée.')}
    ${card('2. Lois, conseillers, décisions','L’économie, la conscription et le commerce se règlent par des lois. Nommez des conseillers et des chefs d’état-major, prenez des décisions ponctuelles et surveillez vos esprits nationaux. Les voies politiques de l’arbre peuvent changer le régime.')}
    ${card('3. Former les forces','Composez vos divisions à partir de bataillons et de compagnies de soutien. Concevez chars, avions et navires, puis modernisez vos stocks. Le recrutement consomme matériel et effectifs.')}
    ${card('4. Plans de bataille','Dans Armées, tracez une ligne de front, des flèches d’offensive et une ligne de repli. La planification s’accumule avant l’attaque. Les batailles durent plusieurs jours, heure par heure : largeur de combat, réserves, terrain, météo et ravitaillement décident de l’issue.')}
    ${card('5. Ciel et mers','Les escadres reçoivent des missions selon leur type : supériorité, interception, appui, bombardement, frappes navales, parachutages. Les flottes patrouillent, frappent, escortent, mouillent des mines et disputent le contrôle des mers, indispensable aux invasions navales.')}
    ${card('6. Guerre et paix','Justifiez un but de guerre, puis déclarez la guerre. Un pays capitule quand il a perdu l’essentiel de ses points de victoire et de son territoire ; certains esprits repoussent ce seuil. Un gouvernement allié peut poursuivre la lutte en exil. La conférence de paix répartit les États selon la contribution de chacun.')}
  </div><div class="card" style="margin-top:18px"><h3>Raccourcis</h3><p class="note" style="margin-top:10px"><span class="hotkey">Espace</span> Pause / <span class="hotkey">1–5</span> Vitesse / <span class="hotkey">A</span> Armées / <span class="hotkey">I</span> Industrie / <span class="hotkey">R</span> Recherche / <span class="hotkey">D</span> Diplomatie / <span class="hotkey">P</span> Priorités / <span class="hotkey">F</span> Recentrer / <span class="hotkey">Échap</span> Fermer.</p></div>
  <p class="note" style="margin-top:18px">Limites de cette version : simulation journalière avec combats horaires, carte de 3 396 provinces, combat aérien et naval par zones, IA heuristique, contenu original moins abondant que celui des grands jeux commerciaux. Pas de multijoueur ni de compatibilité avec les mods d’autres jeux.</p>`,'help','wide');
};
renderRail();
