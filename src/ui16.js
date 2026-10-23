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
    ${S?`<small style="display:block">Bâtiments : DCA ${S.provinces[pid].aa||0} / fort côtier ${S.provinces[pid].coastalFort||0} / raffinerie ${S.provinces[pid].refinery||0}</small>`:''}
    ${metric('Voie ferrée / dépôt',(S?S.provinces[pid].rail:p.rail||0)+' / '+(S?S.provinces[pid].hub:p.hub||0))}
    ${S&&owner===S.player?btn('Voie ferrée depuis ici','railFrom16',{pid},'small ghost'):''}</div>`;
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
    <div style="margin-bottom:12px">${btn('Tracer une voie ferrée '+icon('arrow'),'railTool16',{},'small wide')}</div>
    <div class="sectionlabel">File de construction / ${c.build.length}</div><div class="stack">${c.build.map(b=>`<div class="card"><div class="row between"><strong style="font-size:12px">${esc(buildName16(b))}</strong><div class="row">${btn('↑','prioritizeBuild',{id:b.id},'small ghost')}${btn('×','cancelBuild',{id:b.id},'small ghost')}</div></div><small>${esc(buildPlace16(b))} / ${Math.round(b.progress)} / ${b.cost} points</small><div style="margin-top:8px">${bar(b.progress/b.cost*100)}</div></div>`).join('')||'<div class="empty">La file de construction est vide. Les usines civiles n’ont aucun chantier à exécuter.</div>'}</div>
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
  return `<div class="card"><div class="eyebrow">${title}</div><h3 style="margin:9px 0">${flagSVG16(country,24,16)} ${esc(countryName(country))}</h3>${metric('Divisions en ligne',ids.length)}${metric('En réserve',(reserve||[]).length)}${metric('Puissance effective',num(power))}${metric('Pertes cumulées',num(losses||0))}
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
    ${(S.airBattles16||[]).length?`<div class="sectionlabel">Combats aériens récents</div><div class="card stack">${S.airBattles16.slice(0,8).map(r=>`<div class="row between"><small>${esc(dateText(r.day))} / ${esc(r.zone.startsWith('sea:')?seaName16(r.zone.slice(4)):zoneName16(r.zone))}</small><small><span class="good">${num(r.enemy)} ennemis abattus</span> / <span class="bad">${num(r.own)} perdus</span>${r.allied?` / alliés : ${num(r.allied)} perdus`:''}</small></div>`).join('')}</div>`:''}
    <div class="sectionlabel">Escadres</div><div class="stack">${wings.map(w=>{const naval=['navalStrike','portStrike'].includes(w.mission);return `<div class="card mission-card"><div class="row between"><h4>${esc(w.name)}</h4><span class="gold mono">${num(Math.floor(w.size))} appareils</span></div><small>${esc(AIR_KINDS16[w.kind]||w.kind)} / ${esc(pname(w.base))} / eff. ${percent(w.efficiency??1)} / ${esc(AIR_MISSION_LABELS16[w.mission]||w.mission)}${naval&&w.seaZone?' / '+esc(seaName16(w.seaZone)):''}</small>${w.kills16?`<small style="display:block" class="gold">${num(w.kills16)} victoires${w.aces16?' / '+w.aces16+' as (+'+w.aces16*4+' % d’efficacité)':''} / expérience ${Math.round((w.xp||0)*100)} %</small>`:''}
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
    ${(S.navalLog16||[]).length?`<div class="sectionlabel">Batailles navales</div><div class="stack">${S.navalLog16.slice(0,6).map(r=>{const mine=r.a===S.player||allied(S.player,r.a),own=mine?r.sunkA:r.sunkB,theirs=mine?r.sunkB:r.sunkA;return `<div class="card"><div class="row between"><strong>${esc(seaName16(r.zone))}</strong><small>${esc(dateText(r.day))} / ${r.hours} h</small></div><small class="good" style="display:block">${theirs.length?esc(theirs.join(', ')):'Aucun navire ennemi coulé'}</small>${own.length?`<small class="bad" style="display:block">Perdus : ${esc(own.join(', '))}</small>`:''}</div>`;}).join('')}</div>`:''}
    <div class="sectionlabel">Groupes navals</div><div class="stack">${fleets.map(f=>`<div class="card mission-card"><div class="row between"><h4>${esc(f.name)}</h4>${tag(f.eta>0?'TRANSIT '+f.eta+' J':f.mission==='port'?'AU PORT':'EN MISSION')}</div><div class="ship-breakdown">${Object.entries(SHIP_LABELS).map(([k,label])=>`<span class="ship-chip">${Math.floor(f.ships[k]||0)} ${label}</span>`).join('')}</div>${(f.vessels16||[]).length?`<details style="margin:6px 0"><summary class="note">Navires (${f.vessels16.length})</summary><div class="stack" style="margin-top:6px">${[...f.vessels16].sort((a,b)=>Object.keys(SHIP_LABELS).indexOf(b.type)-Object.keys(SHIP_LABELS).indexOf(a.type)||a.hp-b.hp).map(v=>`<div><div class="row between"><small>${esc((SHIP_CLASS_LABELS16[v.type]||v.type)+' '+v.name)}</small><small>${Math.round(v.hp*100)} %${v.xp>.3?' / vétéran':''}</small></div>${bar(v.hp*100,v.hp>.6?'#95b6aa':v.hp>.3?'#c9b070':'#c98070')}</div>`).join('')}</div></details>`:''}<div style="margin:8px 0">${bar(f.strength*100,'#95b6aa')}</div><small>${esc(seaName16(f.zone))} / ${esc(FLEET_MISSION_LABELS16[f.mission]||f.mission)}</small>
      ${field('Région maritime',`<select id="naval-zone-${f.id}">${zoneOptions(f.zone,true)}</select>`)}${field('Mission',`<select id="naval-mission-${f.id}">${Object.entries(FLEET_MISSION_LABELS16).map(([k,label])=>`<option value="${k}" ${f.mission===k?'selected':''}>${esc(label)}</option>`).join('')}</select>`)}${btn('Donner l’ordre','fleetMissionForm',{id:f.id},'primary small wide')}
      ${f.mission==='port'?`<div class="row wrap" style="margin-top:8px">${Object.entries(SHIP_LABELS).filter(([k])=>c.stock[k]>=1).map(([k,label])=>btn('+1 '+label,'fleetReinforce',{id:f.id,kind:k},'small')).join('')}</div>`:''}</div>`).join('')||'<div class="empty">Aucun groupe naval déployé.</div>'}</div>
    <div class="sectionlabel">Former un groupe naval</div><div class="card stack"><input id="fleet-name" value="Groupe naval" maxlength="60" aria-label="Nom de la flotte">${selectProvinces('fleet-base',ports[0]?.id,p=>S.provinces[p.id].port>0)}<div class="row between"><span class="note">Destroyers</span><input id="fleet-dd" type="number" min="0" max="100" value="2"></div><div class="row between"><span class="note">Sous-marins</span><input id="fleet-ss" type="number" min="0" max="100" value="0"></div>${['cruisers','battleships','carriers'].map(k=>`<div class="row between"><span class="note">${SHIP_LABELS[k]} / ${Math.floor(c.stock[k])} en réserve</span><input id="fleet-${SHIP_FIELDS[k]}" type="number" min="0" max="100" value="0"></div>`).join('')}${btn('Former le groupe','fleetCreateForm',{},'primary small',!ports.length)}</div>
    <div class="sectionlabel">Invasions navales</div><div class="card stack"><p class="note">Réunissez jusqu’à 12 divisions dans un port ami, sélectionnez-les, puis désignez une province côtière ennemie. La préparation dure 12 jours et plus ; le débarquement n’a lieu qu’avec la maîtrise des zones traversées et sans tempête. Les forts côtiers et l’absence de troupes de marine pénalisent l’assaut.</p>${metric('Divisions sélectionnées dans un même port',samePort?sel.length:0)}${btn('Choisir la plage de débarquement','invasionTool16',{},'small',!samePort)}</div>
    <div class="stack" style="margin-top:9px">${(S.invasions16||[]).filter(i=>i.owner===S.player).map(i=>`<div class="card"><div class="row between"><strong>${esc(pname(i.from))} → ${esc(pname(i.to))}</strong>${tag({preparing:'PRÉPARATION',waiting:'EN ATTENTE',landing:'ASSAUT'}[i.status]||i.status,i.status==='landing'?'bad':'')}</div><small>${i.units.length} division(s) / ${i.zones.map(seaName16).join(', ')}</small><div style="margin:7px 0">${bar(i.progress/i.days*100)}</div><small>${i.progress} / ${i.days} jours</small><div style="margin-top:7px">${btn('Annuler','cancelInvasion',{id:i.id},'small ghost')}</div></div>`).join('')}</div>
    <p class="note" style="margin-top:12px">Les patrouilles détectent l’ennemi ; les flottes d’attaque engagent ce qui est repéré. Les sous-marins sont discrets mais les destroyers équipés de sonar les traquent. Les mines usent les flottes et convois ennemis de la zone.</p>`;
};
const SHIP_CLASS_LABELS16={destroyers:'Destroyer',cruisers:'Croiseur',battleships:'Cuirassé',carriers:'Porte-avions',submarines:'Sous-marin'};
const colorOfAir15=colorOf;
colorOf=function(p){
  if(mapMode==='air'){const share=S?.airControl16?.[p.zone]?.[S.player];if(share!==undefined)return `hsl(${Math.round(share*110)},32%,${34+share*14}%)`;return airColour16(p.zone);}
  return colorOfAir15(p);
};
// Sea provinces and regions (1.8): drawn under the land. In the naval view the
// regions are tinted by the sea control of the player's side.
let seaGeo16=null;
function regionPaths16(list){
  return (list||[]).map(z=>{
    const path=new Path2D();let minx=Infinity,miny=Infinity,maxx=-Infinity,maxy=-Infinity;
    for(const ring of z.polygons||[]){ring.forEach(([x,y],i)=>{const v=project(x,y);if(!i)path.moveTo(v.x,v.y);else path.lineTo(v.x,v.y);minx=Math.min(minx,v.x);miny=Math.min(miny,v.y);maxx=Math.max(maxx,v.x);maxy=Math.max(maxy,v.y);});path.closePath();}
    return {path,bbox:{minx,miny,maxx,maxy}};
  });
}
function seaGeometry16(){
  if(!seaGeo16||seaGeo16.src!==WORLD.seaProvinces||seaGeo16.zones!==WORLD.zones)seaGeo16={src:WORLD.seaProvinces,zones:WORLD.zones,cells:regionPaths16(WORLD.seaProvinces),seas:regionPaths16(WORLD.seas),air:regionPaths16(WORLD.zones)};
  return seaGeo16;
}
function viewBox16(){const z=camera.zoom;return {l:camera.x-mapWidth/2/z,r:camera.x+mapWidth/2/z,t:camera.y-mapHeight/2/z,b:camera.y+mapHeight/2/z};}
const inView16=(bb,v)=>!v||bb.maxx>=v.l&&bb.minx<=v.r&&bb.maxy>=v.t&&bb.miny<=v.b;
window.drawSeaLayer16=function(g,zoom,all){
  if(!WORLD.seaProvinces?.length)return;
  const G=seaGeometry16(),v=all?null:viewBox16(),navy=mapMode==='navy';
  if(navy){
    WORLD.seas.forEach((z,i)=>{const b=G.seas[i];if(!inView16(b.bbox,v))return;const share=S?sideShare16(S.seaControl16?.[z.id],S.player):null;g.fillStyle=share===null?'#1c3a46':`hsl(${Math.round(share*110)},32%,${25+share*12}%)`;g.fill(b.path,'evenodd');});
    g.strokeStyle='#2b4f5e';g.lineWidth=.3/zoom;
    WORLD.seaProvinces.forEach((c,i)=>{const b=G.cells[i];if(inView16(b.bbox,v))g.stroke(b.path);});
  }
  if(navy||zoom>1.2){g.strokeStyle=navy?'#86a8ab':'#2f58667a';g.lineWidth=(navy?.9:.6)/zoom;WORLD.seas.forEach((z,i)=>{const b=G.seas[i];if(inView16(b.bbox,v))g.stroke(b.path);});}
};
// Air regions: outlined in the air view.
DRAW16.push((ctx,zoom)=>{
  if(mapMode!=='air'||!WORLD.zones?.[0]?.polygons)return;
  const G=seaGeometry16(),v=viewBox16();ctx.strokeStyle='#efe3b8b0';ctx.lineWidth=1.1/zoom;
  WORLD.zones.forEach((z,i)=>{const b=G.air[i];if(inView16(b.bbox,v))ctx.stroke(b.path);});
});
// Fleets at sea, by region (own, allied and enemies within intelligence reach).
DRAW16.push((ctx,zoom)=>{
  if(!S||mapMode!=='navy'||zoom<.9)return;
  const seas=new Map(WORLD.seas.map(z=>[z.id,z])),groups=new Map();
  for(const f of S.fleets){
    if(f.mission==='port'||f.eta>0||!seas.has(f.zone))continue;
    const side=f.owner===S.player?'own':allied(S.player,f.owner)?'ally':war(S.player,f.owner)&&(nation().intel[f.owner]||0)>=40?'foe':null;if(!side)continue;
    const key=f.zone+'|'+side;if(!groups.has(key))groups.set(key,{zone:seas.get(f.zone),side,ships:0});groups.get(key).ships+=total(Object.values(f.ships));
  }
  const offset={own:0,ally:1,foe:-1};
  for(const g of groups.values()){
    const p=project(g.zone.x,g.zone.y),w=26/zoom,h=14/zoom,x=p.x-w/2,y=p.y+(10+offset[g.side]*16)/zoom;
    ctx.fillStyle=g.side==='own'?'#d1cfaa':g.side==='ally'?'#a2c0c2':'#c69a88';ctx.strokeStyle='#22343a';ctx.lineWidth=1/zoom;ctx.fillRect(x,y,w,h);ctx.strokeRect(x,y,w,h);
    ctx.fillStyle='#1b352e';ctx.font=`600 ${9/zoom}px ui-monospace,monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('⚓ '+Math.round(g.ships),p.x,y+h/2);
  }
});
// Distinct colours for neighbouring air regions.
let airColours16=null;
function airColour16(zone){
  if(!airColours16||airColours16.src!==WORLD.zones){
    const ids=WORLD.zones.map(z=>z.id),adj=new Map(ids.map(id=>[id,new Set()]));
    for(const p of WORLD.provinces)for(const n of p.neighbors){const a=p.zone,b=WORLD.provinces[n]?.zone;if(a&&b&&a!==b){adj.get(a)?.add(b);adj.get(b)?.add(a);}}
    const colour=new Map();
    for(const id of ids){const used=new Set([...(adj.get(id)||[])].map(n=>colour.get(n)));let c=0;while(used.has(c))c++;colour.set(id,c);}
    airColours16={src:WORLD.zones,colour};
  }
  return ['#9fac84','#ae9b7e','#849da6','#ae8374','#a6a083','#929a74','#9d89a3','#8a9f95','#b0937f'][(airColours16.colour.get(zone)||0)%9];
}
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
const effectText16=e=>{const labels={stabilityGrowth:'stabilité / jour',supportGrowth:'soutien / jour',consumer:'biens de consommation',organization:'organisation',airDefense:'défense antiaérienne',invasion:'débarquements',paradrop:'aéroporté',reliability:'fiabilité',surrender:'seuil de capitulation',casualties:'blessés récupérés',attrition:'résistance à l’attrition',breakthrough:'percée',entrench:'retranchement',mines:'guerre des mines',convoy:'escorte des convois',resources:'extraction',ppGain:'pouvoir politique',recruitment:'incorporation',buildingSlots:'emplacements',naval:'combat naval'};
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
  if(x.agency)out.push('Fonde l’agence de renseignement (si elle n’existe pas)');
  if(x.agents)out.push(x.agents+' agent(s) recruté(s) sans frais (niveau 2)');
  if(x.officers)out.push((x.officers.count||1)+' officier(s) de niveau '+(x.officers.skill||1)+' rejoignent l’état-major');
  if(x.rail)out.push('+1 niveau de voie ferrée sur les '+x.rail+' lignes les plus importantes');
  return out;
}
// National trees (1.14) take their icon from what the programme gives.
const FOCUS_ICON_KEYS16=[
  ['research',['slots','research']],['industry',['civ','mil','production','construction','resources','fuel','consumer']],['train',['trains']],
  ['tank',['tanks','armor']],['plane',['fighters','cas','bombers','strategicBombers','navalBombers','transportPlanes','air','airDefense','bombing']],
  ['anchor',['dock','navy','naval','submarines','destroyers','cruisers','convoys','convoy','raiding']],['intel',['intel']]];
const FOCUS_ICON_GROUPS16={electronics:'research',industry:'research',armor:'tank',air:'plane',air_doctrine:'plane',navy:'anchor',naval_doctrine:'anchor'};
function focusIcon16(f){
  if(f.path)return 'people';
  if(/^c16_/.test(f.id))return /^c16_(plan|survey|roads|synthetic|power|metals|basin|civilian|armament|labs|reserves)/.test(f.id)?'industry':/^c16_(ministry|intelligence|attaches|trade|propaganda)/.test(f.id)?'diplomacy':'army';
  if(!f.national)return f.id.includes('industry')||f.id==='arsenals'?'industry':f.id==='air'?'plane':f.id==='navy'?'anchor':'focus';
  const e=f.effect||{};
  if(f.agency||f.agents)return 'intel';
  if(f.rail)return 'train';
  for(const [name,keys] of FOCUS_ICON_KEYS16)if(keys.some(k=>e[k]>0))return name;
  if(f.special?.build)return 'industry';
  const g=asList16(f.researchBonus)[0]?.group;if(FOCUS_ICON_GROUPS16[g])return FOCUS_ICON_GROUPS16[g];
  if(f.relations||f.claims||f.guarantee||f.faction||f.invite||e.tension>0||e.pp>0&&Object.keys(e).length===1)return 'diplomacy';
  if(f.spirits||f.removeSpirits||e.stability||e.support)return 'people';
  return 'army';
}
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

/* ---- Commanders: generals, marshals, traits and battle tactics ---- */
const ROLE16={general:'Général',marshal:'Maréchal'};
const traitOf16=id=>(CATALOG.commanderTraits||[]).find(t=>t.id===id);
const tacticOf16=id=>(CATALOG.combatTactics||[]).find(t=>t.id===id);
const nextXP16=g=>50*(g.skill+1);
function commanderLabel16(g){return `${g.name} / ${ROLE16[g.role]||'Général'} niv. ${g.skill||1}`;}
const UNIT_FAMILY16={armor:'blindés',infantry:'infanterie',mobile:'unités rapides',special:'troupes spéciales',artillery:'artillerie'};
function commanderEffectText16(e){
  const labels={attack:'attaque',defense:'défense',breakthrough:'percée',planning:'vitesse de planification',supply:'ravitaillement',org:'organisation',losses:'pertes',winter:'de la pénalité hivernale annulés',river:'de la pénalité fluviale annulés',entrench:'retranchement',fortAttack:'contre les fortifications',enemyAttack:'attaque adverse',enemyDefense:'défense adverse',enemyBreakthrough:'percée adverse'};
  return Object.entries(e||{}).map(([k,v])=>k==='initiative'?'+'+v+' initiative':k==='noLearning'?'n’apprend plus de traits':labels[k]?`${v>=0?'+':''}${Math.round(v*100)} % ${labels[k]}`:'').filter(Boolean).join(' / ');
}
function traitText16(t){
  const where=[t.terrain?'en '+t.terrain.map(k=>CATALOG.terrain[k]?.name||k).join(', ').toLowerCase():'',t.units?'pour '+t.units.map(k=>UNIT_FAMILY16[k]||k).join(', '):''].filter(Boolean).join(' ');
  return t.desc+' '+commanderEffectText16(t.effect)+(where?' ('+where+')':'')+(t.learn?'. S’apprend en '+t.learn+' jours de combat.':'.');
}
function traitChips16(g){
  return (g.traits||[]).map(id=>{const t=traitOf16(id);return t?`<span class="tag ${t.kind==='personality'?'':'gold'}" title="${esc(traitText16(t))}">${esc(t.name)}</span>`:'';}).join(' ');
}
function commanderPost16(g){
  const a=S.armies.find(a=>a.owner===S.player&&a.general===g.id),grp=S.groups.find(x=>x.owner===S.player&&x.marshal===g.id);
  return a?'Commande : '+a.name:grp?'Commande : '+grp.name:'Disponible';
}
function commanderNote16(g){
  if(!g)return '';
  return `<div class="note">${esc(ROLE16[g.role]||'Général')} niveau ${g.skill} / attaque ${g.attack} / défense ${g.defense} / planification ${g.planning} / logistique ${g.logistics}</div><div class="row wrap" style="gap:4px;margin:4px 0 8px">${traitChips16(g)}</div>`;
}
function commanderCard16(g){
  const c=nation(),learning=Object.entries(g.learn||{}).map(([id,v])=>[traitOf16(id),v]).filter(([t])=>t).sort((x,y)=>y[1]/y[0].learn-x[1]/x[0].learn).slice(0,2);
  return `<div class="card stack"><div class="row between"><strong>${esc(g.name)}</strong>${tag((ROLE16[g.role]||'Général')+' / niv. '+g.skill,g.role==='marshal'?'gold':'')}</div>
    <small>Attaque ${g.attack} / Défense ${g.defense} / Planification ${g.planning} / Logistique ${g.logistics}</small>
    ${g.skill<9?bar(g.xp/nextXP16(g)*100,'#c5a46e')+`<small>${Math.floor(g.xp)} / ${nextXP16(g)} XP avant le niveau ${g.skill+1}</small>`:'<small>Niveau maximal</small>'}
    <div class="row wrap" style="gap:4px">${traitChips16(g)||'<small>Aucun trait</small>'}</div>
    ${learning.length?`<small>Apprend : ${learning.map(([t,v])=>esc(t.name)+' '+Math.floor(v)+'/'+t.learn).join(' / ')}</small>`:''}
    <small class="gold">${esc(commanderPost16(g))}</small>
    <div class="row wrap">${g.role==='general'?btn('Promouvoir maréchal / 50 PP','promoteCommander16',{id:g.id},'small',g.skill<3||c.pp<50):''}${btn('Renvoyer','dismissCommander16',{id:g.id},'small ghost',c.identity.commanders.length<=1)}</div></div>`;
}
function showCommanders16(){
  if(!S)return;pauseGame();
  const c=nation(),list=c.identity.commanders,marshals=list.filter(g=>g.role==='marshal'),generals=list.filter(g=>g.role!=='marshal');
  modal(`${modalHead('État-major','OFFICIERS GÉNÉRAUX / '+list.length+' / 24')}
    <div class="row between" style="margin-bottom:14px"><small>${num(c.pp)} PP disponibles</small>${btn('Recruter un général / 20 PP','recruitCommander16',{},'primary small',c.pp<20||list.length>=24)}</div>
    <div class="sectionlabel">Maréchaux / ${marshals.length}</div><div class="grid2">${marshals.map(commanderCard16).join('')||'<p class="note">Aucun maréchal : promouvez un général de niveau 3 ou plus.</p>'}</div>
    <div class="sectionlabel">Généraux / ${generals.length}</div><div class="grid2">${generals.map(commanderCard16).join('')}</div>
    <p class="note" style="margin-top:16px">Un général commande une armée : ses compétences et ses traits s’appliquent à 24 divisions au plus, au-delà ils s’atténuent. Un maréchal commande un groupe d’armées et transmet la moitié de ses traits à chaque armée du groupe. Chaque jour de bataille rapporte de l’expérience ; les niveaux augmentent une compétence. Les traits de terrain et d’armes s’apprennent au feu, les traits de caractère sont donnés.</p>`,'commanders','wide');
}
ACTIONS16.push(async(action,p)=>{
  switch(action){
    case 'commanders16':showCommanders16();return true;
    case 'recruitCommander16':await cmd('recruitCommander',{});showCommanders16();return true;
    case 'promoteCommander16':await cmd('promoteCommander',{id:p.id});showCommanders16();return true;
    case 'dismissCommander16':if(confirm('Renvoyer cet officier ?')){await cmd('dismissCommander',{id:p.id});showCommanders16();}return true;
  }
  return false;
});
function tacticLine16(id,countered,lead){
  const t=tacticOf16(id);if(!t)return '<small>Aucune tactique</small>';
  return `<div><strong>${esc(t.name)}</strong>${lead?' '+tag('INITIATIVE','gold'):''}${countered?' '+tag('CONTRÉE','bad'):''}<small style="display:block">${esc(t.desc)} ${countered?'Bonus perdu, pénalité de 10 %.':esc(commanderEffectText16(t.effect))}</small></div>`;
}
function battleTactics16(b){
  if(!b.tacticA)return '';
  const ga=b.genA&&nation(b.a)?.identity.commanders.find(g=>g.id===b.genA),gd=b.genD&&nation(b.b)?.identity.commanders.find(g=>g.id===b.genD);
  return `<div class="card" style="margin-top:12px"><div class="eyebrow">TACTIQUES DU JOUR</div><div class="grid2" style="margin-top:9px">
    <div class="stack"><small>${ga?esc(commanderLabel16(ga)):'Sans commandant'}</small>${tacticLine16(b.tacticA,b.countered==='a',b.tacticLead==='a')}</div>
    <div class="stack"><small>${gd?esc(commanderLabel16(gd)):'Sans commandant'}</small>${tacticLine16(b.tacticD,b.countered==='d',b.tacticLead==='d')}</div></div>
    <small style="display:block;margin-top:8px">Chaque jour, les deux commandants choisissent une tactique ; celui qui a l’initiative (planification, niveau, ruse) peut s’adapter à celle de l’adversaire.</small></div>`;
}
const showBattle18=showBattle;
showBattle=function(pid){
  showBattle18(pid);
  const b=S?.battles.find(b=>b.pid===pid);if(!b||modalKind!=='battle')return;
  const grid=$('modal').querySelector('.grid2');if(grid)grid.insertAdjacentHTML('afterend',battleTactics16(b));
};

/* ---- Logistics: railways, locomotives and trucks ---- */
const buildName16=b=>b.kind==='railLine'?'Voie ferrée / '+b.pids.length+' provinces':CATALOG.buildings[b.kind]?.name||b.kind;
const buildPlace16=b=>b.kind==='railLine'?pname(b.pids[0])+' → '+pname(b.pids[b.pids.length-1]):pname(b.pid);
function railLinks16(){return S?.railLinks16?.length?[...(WORLD.railLinks||[]),...S.railLinks16]:(WORLD.railLinks||[]);}
function railLevel16(id){return S?S.provinces[id]?.rail||0:WORLD.provinces[id]?.rail||0;}
// Railway lines: always in the supply view, from close zoom in the other land views.
DRAW16.push((ctx,zoom)=>{
  if(!WORLD.railLinks||!(mapMode==='supply'||zoom>=2.6&&['political','states','terrain','resources'].includes(mapMode)))return;
  const v=zoom>=1.5?viewBox16():null,inside=p=>!v||p.x>=v.l-20&&p.x<=v.r+20&&p.y>=v.t-20&&p.y<=v.b+20;
  const byLevel=[[],[],[],[],[],[]];
  for(const [a,b] of railLinks16()){
    const l=Math.min(railLevel16(a),railLevel16(b));if(!l)continue;
    const pa=centers[a],pb=centers[b];if(!pa||!pb||!inside(pa)&&!inside(pb))continue;
    byLevel[l].push(pa,pb);
  }
  ctx.save();ctx.lineCap='round';
  for(let l=1;l<=5;l++){
    const list=byLevel[l];if(!list.length)continue;
    ctx.strokeStyle=mapMode==='supply'?'#1b1712e0':'#2a2219b8';ctx.lineWidth=(.5+l*.32)/zoom;
    ctx.beginPath();for(let i=0;i<list.length;i+=2){ctx.moveTo(list[i].x,list[i].y);ctx.lineTo(list[i+1].x,list[i+1].y);}ctx.stroke();
  }
  // Supply hubs.
  if(mapMode==='supply'||zoom>=3.5){
    ctx.fillStyle='#efe2b6';ctx.strokeStyle='#1b1712';ctx.lineWidth=.8/zoom;
    WORLD.provinces.forEach((p,i)=>{const h=S?S.provinces[i].hub:p.hub;if(!h)return;const c=centers[i];if(!inside(c))return;const r=(1.6+h)/zoom;ctx.fillRect(c.x-r,c.y-r,r*2,r*2);ctx.strokeRect(c.x-r,c.y-r,r*2,r*2);});
  }
  ctx.restore();
});
function beginRailTool16(){
  closeModal();operationTool={kind:'rail',points:[]};document.body.classList.remove('panel-open');
  const tool=$('operation-toolbar');tool.hidden=false;
  tool.innerHTML=`<span>VOIE FERRÉE / Cliquez la province de départ, puis celle d’arrivée (votre territoire)</span>${btn('Annuler','cancelOperation',{},'small')}`;
  if(mapMode!=='supply'){mapMode='supply';renderMapModes();}dirty=true;
}
window.addEventListener('pointerup',ev=>{
  if(!operationTool||operationTool.kind!=='rail'||ev.target!==canvas||!drag||drag.moved||ev.button!==0)return;
  const r=canvas.getBoundingClientRect(),id=pointAt(ev.clientX-r.left,ev.clientY-r.top);
  ev.stopImmediatePropagation();drag=null;if(id===null)return;
  if(control(id)!==S.player){toast('Tracez la voie ferrée sur votre territoire.',true);return;}
  if(!operationTool.points.length){operationTool.points.push(id);toast('Départ : '+pname(id)+'. Cliquez la province d’arrivée.');dirty=true;return;}
  const from=operationTool.points[0];endOperationTool();
  cmd('railLine',{from,to:id}).then(n=>{toast('Voie ferrée en chantier : '+pname(from)+' → '+pname(id)+' ('+n+' provinces).');renderPanel(true);}).catch(()=>{});
},true);
INDUSTRY_TABS16.logistics='Logistique';
INDUSTRY16.logistics=function(c){
  const l=c.logistics16||{rail:0,trainNeed:1,truckNeed:1,trains:1,trucks:1};
  const own=S.provinces.filter(q=>q.ctrl===S.player),lines=own.filter(q=>q.rail>0).length,hubs=own.filter(q=>q.hub>0).length;
  return `<div class="grid2"><div class="card stat">${percent(l.trains)}<small>LOCOMOTIVES / ${num(c.stock.trains||0)} SUR ${num(l.trainNeed)}</small></div><div class="card stat">${percent(l.trucks)}<small>CAMIONS / ${num(c.stock.trucks)} SUR ${num(l.truckNeed)}</small></div></div>
    <div style="margin:10px 0">${bar(l.trains*100,'#c5a46e')}<div style="height:6px"></div>${bar(l.trucks*100,'#a7b58f')}</div>
    <div class="card">${metric('Provinces desservies par le rail',num(lines))}${metric('Niveaux de voie (total)',num(l.rail))}${metric('Dépôts logistiques',num(hubs))}${metric('Ravitaillement moyen',percent(c.stats.supply))}</div>
    <div style="margin:12px 0">${btn('Tracer une voie ferrée '+icon('arrow'),'railTool16',{},'primary small wide')}</div>
    <p class="note">Le ravitaillement part de la capitale et des ports, emprunte les voies ferrées puis les routes. Une voie coûte une fraction d’une route, d’autant moins que son niveau est élevé ; il faut ${TRAINS_PER_RAIL16} locomotive par niveau de voie contrôlé, sinon le rail ralentit. Hors du rail, les camions (${TRUCKS_PER_DIVISION16} par division) accélèrent l’acheminement ; ils s’usent à la guerre et brûlent sous la domination aérienne ennemie. Les voies prises à l’ennemi sont sabotées par l’armée qui recule et doivent être réparées ; en territoire occupé, le rail ne tourne qu’à moitié de sa capacité. Une nouvelle ligne coûte 135 points par province sans voie et 90 par province à moderniser.</p>`;
};
const TRAINS_PER_RAIL16='0,6',TRUCKS_PER_DIVISION16=10;
ACTIONS16.push(async(action,p)=>{
  switch(action){
    case 'railTool16':beginRailTool16();return true;
    case 'railFrom16':beginRailTool16();operationTool.points.push(p.pid);toast('Départ : '+pname(p.pid)+'. Cliquez la province d’arrivée.');return true;
  }
  return false;
});

/* ---- Intelligence agency and occupation ---- */
const STARS16=n=>'★'.repeat(n)+'☆'.repeat(Math.max(0,5-n));
let intelTarget16=null;
function occupationCard16(c){
  const laws=CATALOG.occupationLaws||[],g=c.garrison16||{men:0,need:0,ratio:1};
  const occ=S.provinces.map((q,i)=>[q,i]).filter(([q,i])=>q.ctrl===S.player&&q.own!==S.player&&!isCore16(S.player,i));
  const avg=k=>occ.length?Math.round(total(occ.map(([q])=>q[k]))/occ.length):0;
  const worst=[...occ].sort((a,b)=>b[0].resistance-a[0].resistance).slice(0,5);
  return `<div class="sectionlabel">Territoires occupés / ${occ.length}</div>
    <div class="grid2"><div class="card stat">${avg('resistance')} %<small>RÉSISTANCE MOYENNE</small></div><div class="card stat">${avg('compliance')} %<small>CONFORMITÉ MOYENNE</small></div></div>
    <div class="card" style="margin-top:9px">${metric('Garnisons',num(g.men)+' / '+num(g.need)+' hommes')}${bar(g.ratio*100,'#a7b58f')}<small>Les garnisons sont prélevées sur la réserve d’effectifs et consomment de l’armement d’infanterie. Sans garnison, la résistance grandit et peut soulever une province.</small></div>
    <div class="sectionlabel">Loi d’occupation</div><div class="stack">${laws.map(l=>`<div class="card"><div class="row between"><strong style="font-size:12px">${esc(l.name)}</strong>${c.occupation===l.id?tag('EN VIGUEUR','gold'):btn('Adopter','law',{kind:'occupation',value:l.id},'small')}</div><small>${esc(l.desc)} Exploitation ${Math.round(l.extraction*100)} % / garnisons ×${l.garrison} / résistance ${l.resistance>=0?'+':''}${l.resistance} par jour${l.losses?' / représailles':''}</small></div>`).join('')}</div>
    ${worst.length?`<div class="stack" style="margin-top:9px">${worst.map(([q,i])=>`<div class="card"><div class="row between"><strong style="font-size:12px">${esc(pname(i))}</strong><small>${esc(countryName(q.own))}</small></div>${metric('Résistance / conformité',Math.round(q.resistance)+' % / '+Math.round(q.compliance)+' %')}${bar(q.resistance,'#ae6958')}</div>`).join('')}</div>`:''}`;
}
PANELS16.intel=function(){
  const c=nation(),A=c.agency16,M=CATALOG.agentMissions||[],O=CATALOG.operations16||[],U=CATALOG.agencyUpgrades||[];
  const foes=Object.keys(S.countries).filter(id=>id!==S.player&&S.countries[id].alive);
  intelTarget16=foes.includes(intelTarget16)?intelTarget16:(foes.find(id=>war(S.player,id))||foes[0]);
  const dossiers=`<div class="sectionlabel">Dossiers nationaux</div><div class="stack">${Object.entries(c.intel).filter(([,v])=>v>=1).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([id,v])=>`<div class="card">${metric(esc(countryName(id)),Math.round(v)+' %'+(A?.networks?.[id]?' / réseau '+Math.round(A.networks[id])+' %':'')+(A?.cipher?.[id]>S.day?' / chiffre lu':''))}${bar(v,'#94b6bb')}</div>`).join('')||'<div class="empty">Aucun dossier : vos agents construiront des réseaux.</div>'}</div>`;
  if(!A)return panelHeader('Renseignement','Agence, agents, opérations clandestines et occupation.')+`
    <div class="card stack"><h3>Agence de renseignement</h3><p class="note">Une agence recrute des agents qui tissent des réseaux à l’étranger, traquent les espions ennemis, répandent la propagande ou arment les résistances. Les réseaux ouvrent les opérations : sabotage, vol de plans, capture du chiffre, gouvernement de collaboration.</p>${btn('Fonder l’agence / 100 PP','foundAgency16',{},'primary small',c.pp<100)}</div>
    ${dossiers}${occupationCard16(c)}`;
  const slots=Math.min(6,2+total(A.upgrades.map(id=>U.find(u=>u.id===id)?.effect.slots||0)));
  const busy=new Set(A.ops.flatMap(o=>o.agents)),free=A.agents.filter(a=>!busy.has(a.id)).length,net=A.networks[intelTarget16]||0;
  const missionSelect=a=>`<select id="agent-mission-${a.id}"><option value="">Au repos</option>${M.map(m=>`<option value="${m.id}" ${a.mission===m.id?'selected':''}>${esc(m.name)}</option>`).join('')}</select>`;
  return panelHeader('Renseignement',`${A.agents.length} / ${slots} agents / ${Object.keys(A.networks).length} réseau(x) / ${A.ops.length} opération(s)`)+`
    <div class="sectionlabel">Agents</div><div class="stack">${A.agents.map(a=>`<div class="card stack"><div class="row between"><strong>${esc(a.name)}</strong><span class="gold" title="Niveau ${a.skill}">${STARS16(a.skill)}</span></div>
      <small>${busy.has(a.id)?'Engagé dans une opération':a.mission?esc(M.find(m=>m.id===a.mission)?.name||a.mission)+(a.mission!=='counter'?' / '+esc(countryName(a.target)):''):'Au repos'}</small>
      ${busy.has(a.id)?'':`${missionSelect(a)}${selectCountries(a.target&&a.target!==S.player?a.target:intelTarget16,'agent-target-'+a.id,S.player)}<div class="row wrap">${btn('Affecter','agentMission16',{id:a.id},'small')}${btn('Renvoyer','dismissAgent16',{id:a.id},'small ghost')}</div>`}</div>`).join('')||'<div class="empty">Aucun agent.</div>'}</div>
    <div style="margin:10px 0">${btn('Recruter un agent / 25 PP','recruitAgent16',{},'small wide',A.agents.length>=slots||c.pp<25)}</div>
    <div class="sectionlabel">Opérations</div><div class="card stack">${selectCountries(intelTarget16,'intel-target',S.player)}${btn('Choisir la cible','intelTarget16',{},'small')}
      ${metric('Réseau dans ce pays',Math.round(net)+' %')}${bar(net,'#94b6bb')}
      </div><div class="stack" style="margin-top:9px">${O.map(o=>`<div class="card"><div class="row between"><strong style="font-size:12px">${esc(o.name)}</strong>${btn('Lancer','operation16',{kind:o.id,target:intelTarget16},'small',net<o.network||free<o.agents||c.pp<o.cost||A.ops.some(x=>x.kind===o.id&&x.target===intelTarget16))}</div><small>${esc(o.desc)}</small><small style="display:block" class="${net>=o.network?'gold':''}">Réseau ${o.network} % / ${o.cost} PP / ${o.days} jours / ${o.agents} agent(s)</small></div>`).join('')}</div>
    ${A.ops.length?`<div class="stack" style="margin-top:9px">${A.ops.map(o=>`<div class="card"><div class="row between"><strong style="font-size:12px">${esc(O.find(x=>x.id===o.kind)?.name||o.kind)}</strong><small>${esc(countryName(o.target))}</small></div>${bar(o.progress/o.days*100)}<small>${Math.floor(o.progress)} / ${o.days} jours</small></div>`).join('')}</div>`:''}
    <div class="sectionlabel">Départements</div><div class="stack">${U.map(u=>{const has=A.upgrades.includes(u.id);return `<div class="card"><div class="row between"><strong style="font-size:12px">${esc(u.name)}</strong>${has?tag('CRÉÉ','good'):btn(u.cost+' PP','agencyUpgrade16',{id:u.id},'small',c.pp<u.cost||S.day-A.lastUpgrade<30)}</div><small>${esc(u.desc)}</small></div>`;}).join('')}</div>
    <small style="display:block;margin-top:6px">Un département par mois au plus.</small>
    ${dossiers}${occupationCard16(c)}
    <p class="note" style="margin-top:15px">Un réseau grandit avec les agents qui y travaillent et décline sans eux ou sous le contre-espionnage adverse. Les agents à l’étranger peuvent être arrêtés ; un agent gagne un niveau tous les six mois de mission.</p>`;
};
ACTIONS16.push(async(action,p)=>{
  switch(action){
    case 'foundAgency16':await cmd('foundAgency',{});toast('Agence de renseignement fondée.');renderPanel(true);return true;
    case 'recruitAgent16':await cmd('recruitAgent',{});renderPanel(true);return true;
    case 'agentMission16':{const mission=$('agent-mission-'+p.id).value||null;await cmd('agentMission',{id:p.id,mission,target:$('agent-target-'+p.id).value});toast(mission?'Mission affectée.':'Agent au repos.');renderPanel(true);return true;}
    case 'dismissAgent16':if(confirm('Renvoyer cet agent ?')){await cmd('dismissAgent',{id:p.id});renderPanel(true);}return true;
    case 'intelTarget16':intelTarget16=$('intel-target').value;renderPanel(true);return true;
    case 'operation16':await cmd('operation',{kind:p.kind,target:p.target});toast('Opération lancée.');renderPanel(true);return true;
    case 'agencyUpgrade16':await cmd('agencyUpgrade',{id:p.id});renderPanel(true);return true;
  }
  return false;
});

/* ---- Special weapons: railway guns, rockets, atomic bombs ---- */
function specialWeapons16(){
  const c=nation(),bats=(S.batteries16||[]).filter(b=>b.owner===S.player),sites=S.provinces.filter(q=>q.ctrl===S.player&&q.rocketSite>0).reduce((n,q)=>n+q.rocketSite,0);
  const reactors=S.provinces.filter(q=>q.ctrl===S.player&&q.reactor>0).length,atomic=c.tech.includes('atomic_bomb');
  const stations=owned().filter(p=>S.provinces[p.id].rail>0);
  return `<div class="sectionlabel">Armes spéciales</div>
    <div class="card stack"><div class="row between"><strong>Canons sur rail</strong><small>${num(c.stock.railwayGuns||0)} en réserve</small></div>
      ${bats.map(b=>`<div class="row between"><small>${esc(b.name)} / ${b.guns} canon(s) / ${esc(pname(b.pid))}${b.route.length?' / en route':''}</small><div class="row">${btn('Déplacer','batteryTool16',{id:b.id},'small ghost')}${btn('×','batteryDisband16',{id:b.id},'small ghost')}</div></div>`).join('')||'<small>Aucune batterie déployée.</small>'}
      ${c.stock.railwayGuns>=1&&stations.length?`${selectProvinces('battery-station',null,p=>S.provinces[p.id].rail>0)}<div class="row"><input id="battery-guns" type="number" min="1" max="4" value="${Math.min(4,Math.floor(c.stock.railwayGuns))}">${btn('Former une batterie','batteryCreate16',{},'small')}</div>`:''}
      <small>Une batterie appuie chaque bataille à moins de 180 km (+5 % d’attaque par canon, 20 % au plus) et circule sur les voies ferrées amies.</small></div>
    <div class="card stack" style="margin-top:9px"><div class="row between"><strong>Missiles balistiques</strong><small>${num(c.stock.rockets||0)} en réserve</small></div>${metric('Bases de lancement (niveaux)',sites)}<small>${c.tech.includes('v_rockets')?'Chaque base tire un missile par jour sur l’industrie ennemie à moins de 650 km. Construisez des bases depuis Industrie → Bâtir.':'Recherchez les missiles balistiques (électronique).'}</small></div>
    <div class="card stack" style="margin-top:9px"><div class="row between"><strong>Arme atomique</strong><small>${c.nukes16||0} bombe(s)</small></div>${metric('Réacteurs',reactors)}${atomic&&reactors?bar((c.bombProgress16||0)/240*100,'#c5a46e')+`<small>${Math.floor((c.bombProgress16||0)/Math.max(1,reactors))} / ${Math.ceil(240/Math.max(1,reactors))} jours avant la prochaine bombe</small>`:`<small>${atomic?'Construisez un réacteur nucléaire.':'Recherchez l’arme atomique (programme atomique, puis arme atomique), puis construisez un réacteur.'}</small>`}
      ${btn('Larguer une bombe atomique','nukeTool16',{},'small danger',!(c.nukes16>=1))}<small>Il faut des bombardiers stratégiques et une base aérienne à moins de 2 500 km. La cible est dévastée ; le pays frappé perd stabilité et soutien à la guerre et capitule plus tôt.</small></div>`;
}
const warfarePanel21=warfarePanel;
warfarePanel=function(){return warfarePanel21()+(S?specialWeapons16():'');};
function beginWeaponTool16(kind,id){
  closeModal();operationTool={kind,points:[],battery:id};document.body.classList.remove('panel-open');
  const tool=$('operation-toolbar');tool.hidden=false;
  tool.innerHTML=`<span>${kind==='nuke'?'ARME ATOMIQUE / Cliquez la province ennemie visée':'BATTERIE / Cliquez la gare de destination (voie ferrée amie)'}</span>${btn('Annuler','cancelOperation',{},'small')}`;
}
window.addEventListener('pointerup',ev=>{
  if(!operationTool||!['nuke','battery'].includes(operationTool.kind)||ev.target!==canvas||!drag||drag.moved||ev.button!==0)return;
  const r=canvas.getBoundingClientRect(),id=pointAt(ev.clientX-r.left,ev.clientY-r.top);
  ev.stopImmediatePropagation();drag=null;if(id===null)return;
  const {kind,battery}=operationTool;endOperationTool();
  if(kind==='nuke'){if(!confirm('Larguer une bombe atomique sur '+pname(id)+' ?'))return;cmd('atomicBomb',{pid:id}).then(()=>renderPanel(true)).catch(()=>{});}
  else cmd('batteryMove',{id:battery,pid:id}).then(()=>{toast('La batterie part pour '+pname(id)+'.');renderPanel(true);}).catch(()=>{});
},true);
// Batteries on the map.
DRAW16.push((ctx,zoom)=>{
  if(!S?.batteries16?.length||zoom<1.2)return;
  ctx.save();ctx.font=`600 ${9/zoom}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';
  for(const b of S.batteries16){
    if(b.owner!==S.player&&!allied(S.player,b.owner)&&(nation().intel[b.owner]||0)<50)continue;
    const p=centers[b.pid];if(!p)continue;const w=16/zoom,h=10/zoom;
    ctx.fillStyle=b.owner===S.player?'#e6d29a':allied(S.player,b.owner)?'#9fb8c0':'#c98a77';ctx.strokeStyle='#1b1712';ctx.lineWidth=1/zoom;
    ctx.fillRect(p.x-w/2,p.y+8/zoom,w,h);ctx.strokeRect(p.x-w/2,p.y+8/zoom,w,h);
    ctx.fillStyle='#1b1712';ctx.fillText('⊕'+b.guns,p.x,p.y+13/zoom);
  }
  ctx.restore();
});
ACTIONS16.push(async(action,p)=>{
  switch(action){
    case 'batteryCreate16':await cmd('batteryCreate',{pid:Number($('battery-station').value),guns:Number($('battery-guns').value)});toast('Batterie formée.');renderPanel(true);return true;
    case 'batteryDisband16':await cmd('batteryDisband',{id:p.id});renderPanel(true);return true;
    case 'batteryTool16':beginWeaponTool16('battery',p.id);return true;
    case 'nukeTool16':beginWeaponTool16('nuke');return true;
  }
  return false;
});

/* ---- Flags: simplified designs drawn from catalogue descriptions ---- */
// Shapes in a 30 x 20 frame: rect, poly, circle, star.
function flagShapes16(id){
  const spec=CATALOG.flags16?.[id]||(()=>{const c=code(id)?.color||'#8a8a7a';return {t:'h',c:[c,'#2a2a26']};})();
  const out=[],c=spec.c||['#888'],rect=(x,y,w,h,f)=>out.push({k:'r',x,y,w,h,f}),poly=(p,f)=>out.push({k:'p',p,f}),circle=(x,y,r,f)=>out.push({k:'c',x,y,r,f}),star=(x,y,r,f)=>out.push({k:'s',x,y,r,f});
  const stripes=(colors,weights,vertical)=>{const w=weights||colors.map(()=>1),t=w.reduce((a,b)=>a+b,0);let o=0;colors.forEach((col,i)=>{const s=w[i]/t;if(vertical)rect(o*30,0,s*30+.05,20,col);else rect(0,o*20,30,s*20+.05,col);o+=s;});};
  const union=(x,y,w,h,blue,white,red)=>{
    rect(x,y,w,h,blue);const d=Math.min(w,h)*.2;
    poly([[x,y],[x+d,y],[x+w,y+h-d],[x+w,y+h],[x+w-d,y+h],[x,y+d]],white);poly([[x+w,y],[x+w,y+d],[x+d,y+h],[x,y+h],[x,y+h-d],[x+w-d,y]],white);
    const e=d*.45;poly([[x,y],[x+e,y],[x+w,y+h-e],[x+w,y+h],[x+w-e,y+h],[x,y+e]],red);poly([[x+w,y],[x+w,y+e],[x+e,y+h],[x,y+h],[x,y+h-e],[x+w-e,y]],red);
    rect(x+w/2-h*.17,y,h*.34,h,white);rect(x,y+h/2-h*.17,w,h*.34,white);rect(x+w/2-h*.1,y,h*.2,h,red);rect(x,y+h/2-h*.1,w,h*.2,red);
  };
  switch(spec.t){
    case 'v':stripes(c,spec.w,true);break;
    case 'cross':rect(0,0,30,20,c[0]);if(c[2]){rect(8,0,6,20,c[2]);rect(0,7,30,6,c[2]);}rect(9,0,4,20,c[1]);rect(0,8,30,4,c[1]);break;
    case 'disc':rect(0,0,30,20,c[0]);circle(15,10,6,c[1]);break;
    case 'union':union(0,0,30,20,c[0],c[1],c[2]);break;
    case 'ensign':rect(0,0,30,20,c[0]);union(0,0,15,10,'#22407a','#f2efe6','#c8312e');if(spec.star)star(22,13,3,spec.star);break;
    case 'swiss':rect(0,0,30,20,c[0]);rect(13,4,4,12,c[1]);rect(9,8,12,4,c[1]);break;
    case 'wedge':stripes(c.slice(0,-1),null,false);poly([[0,0],[13,10],[0,20]],c[c.length-1]);break;
    case 'crescent':rect(0,0,30,20,c[0]);circle(12,10,5,c[1]);circle(13.4,10,4,c[0]);star(18,10,2.2,c[1]);break;
    case 'diag':if(c.length>2){poly([[0,0],[24,0],[0,16]],c[0]);poly([[24,0],[30,0],[30,4],[6,20],[0,20],[0,16]],c[1]);poly([[30,4],[30,20],[6,20]],c[2]);}else{poly([[0,0],[30,0],[0,20]],c[0]);poly([[30,0],[30,20],[0,20]],c[1]);}break;
    case 'rhomb':rect(0,0,30,20,c[0]);poly([[3,10],[15,2.5],[27,10],[15,17.5]],c[1]);circle(15,10,4.2,c[2]);break;
    case 'quarters':rect(0,0,15,10,c[0]);rect(15,0,15,10,c[1]);rect(0,10,15,10,c[2]);rect(15,10,15,10,c[3]);break;
    case 'plain':rect(0,0,30,20,c[0]);break;
    default:stripes(c,spec.w,false);
  }
  if(spec.canton){rect(0,0,12.5,spec.t==='h'&&c.length>3?10.8:10,spec.canton);if(spec.star&&spec.t!=='ensign')star(6.2,5.2,2.8,spec.star);}
  else if(spec.star&&spec.t==='plain'){if(spec.at==='canton')star(6,5.5,3,spec.star);else if(spec.at==='bar')rect(6,14,18,1.6,spec.star);else star(15,10,4.5,spec.star);}
  return out;
}
function starPoints16(x,y,r){const p=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,q=i%2?r*.42:r;p.push([x+Math.cos(a)*q,y+Math.sin(a)*q]);}return p;}
const FLAG_SVG16=new Map();
function flagSVG16(id,w=27,h=18,cls='flag16'){
  let body=FLAG_SVG16.get(id);
  if(!body){
    body=flagShapes16(id).map(s=>s.k==='r'?`<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="${s.f}"/>`:s.k==='c'?`<circle cx="${s.x}" cy="${s.y}" r="${s.r}" fill="${s.f}"/>`:`<polygon points="${(s.k==='s'?starPoints16(s.x,s.y,s.r):s.p).map(p=>p.map(v=>Math.round(v*100)/100).join(',')).join(' ')}" fill="${s.f}"/>`).join('');
    FLAG_SVG16.set(id,body);
  }
  return `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 30 20" preserveAspectRatio="none" aria-hidden="true">${body}</svg>`;
}
const FLAG_IMG16=new Map();
// Canvas drawing for map counters, cached as a small bitmap per country.
function drawFlag16(ctx,id,x,y,w,h){
  let img=FLAG_IMG16.get(id);
  if(!img){
    img=document.createElement('canvas');img.width=30;img.height=20;const g=img.getContext('2d');
    for(const s of flagShapes16(id)){g.fillStyle=s.f;if(s.k==='r')g.fillRect(s.x,s.y,s.w,s.h);else{g.beginPath();if(s.k==='c')g.arc(s.x,s.y,s.r,0,Math.PI*2);else(s.k==='s'?starPoints16(s.x,s.y,s.r):s.p).forEach(([px,py],i)=>i?g.lineTo(px,py):g.moveTo(px,py));g.closePath();g.fill();}}
    FLAG_IMG16.set(id,img);
  }
  ctx.drawImage(img,x,y,w,h);
}
// Flags beside the country name in the banner, profiles and reports.
const renderTop18=renderTop;
renderTop=function(...args){
  const r=renderTop18.apply(this,args);
  const banner=$('nation-banner'),id=S?.player||selectedCountry;
  if(banner&&id&&!banner.querySelector('.flag16'))banner.querySelector('.grow')?.insertAdjacentHTML('afterbegin',flagSVG16(id,27,18,'flag16 banner-flag'));
  return r;
};

// Portraits carry the flag of their country in a corner.
const portrait18=portrait;
portrait=function(id,size='',override=null){
  const html=portrait18(id,size,override),fid=override?.id||id;
  if(size==='tiny'||!fid)return html;
  return html.replace(/<\/div>$/,`<span class="portrait-flag">${flagSVG16(fid,24,16)}</span></div>`);
};

/* ---- Relief: mountain ranges and deserts as hachures, with their names ---- */
let RELIEF16=null;
function relief16(){
  if(RELIEF16&&RELIEF16.world===WORLD)return RELIEF16;
  const items=(WORLD.relief||[]).map(r=>{const path=new Path2D();for(const ring of r.polygons){ring.forEach(([x,y],i)=>{const p=project(x,y);if(i)path.lineTo(p.x,p.y);else path.moveTo(p.x,p.y);});path.closePath();}
    let minx=Infinity,miny=Infinity,maxx=-Infinity,maxy=-Infinity;for(const ring of r.polygons)for(const [x,y] of ring){const p=project(x,y);minx=Math.min(minx,p.x);maxx=Math.max(maxx,p.x);miny=Math.min(miny,p.y);maxy=Math.max(maxy,p.y);}
    return {...r,path,bbox:{minx,miny,maxx,maxy},label:project(r.x,r.y)};});
  const tile=(draw)=>{const c=document.createElement('canvas');c.width=c.height=14;const g=c.getContext('2d');draw(g);return c;};
  const mountains=tile(g=>{g.lineWidth=1.3;g.strokeStyle='#2e2216';g.globalAlpha=.8;g.beginPath();g.moveTo(1.5,11);g.lineTo(5.5,4);g.lineTo(9.5,11);g.stroke();g.strokeStyle='#f4ead0';g.globalAlpha=.45;g.beginPath();g.moveTo(5.5,4.5);g.lineTo(2.8,9.5);g.stroke();});
  const desert=tile(g=>{g.fillStyle='#6b5634';g.globalAlpha=.45;for(const [x,y] of [[2,3],[9,5],[5,10],[12,12]])g.fillRect(x,y,1.2,1.2);});
  RELIEF16={world:WORLD,items,tiles:{range:mountains,plateau:mountains,desert}};return RELIEF16;
}
DRAW16.push((ctx,zoom)=>{
  if(!WORLD.relief||!['political','terrain','states','supply','resources','history'].includes(mapMode))return;
  const R=relief16(),v=zoom>=1.5?viewBox16():null,scale=new DOMMatrix().scale(1/zoom);
  ctx.save();
  const patterns={};for(const [k,t] of Object.entries(R.tiles)){const p=ctx.createPattern(t,'repeat');p.setTransform?.(scale);patterns[k]=p;}
  for(const r of R.items){
    if(r.kind==='desert'&&mapMode!=='terrain')continue;
    if(v&&!inView16(r.bbox,v))continue;
    ctx.globalAlpha=r.kind==='plateau'?.5:mapMode==='terrain'?.9:.6;ctx.fillStyle=patterns[r.kind];ctx.fill(r.path);
  }
  ctx.globalAlpha=1;
  // Names of the ranges: the largest first, smaller ones when zooming in.
  if(zoom>=1.1){
    ctx.font=`italic 600 ${10.5/zoom}px Georgia,serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#3a2b1cd0';ctx.strokeStyle='#e9dfc480';ctx.lineWidth=2.4/zoom;
    for(const r of R.items){
      if(r.rank>(zoom<2?2:zoom<4?4:7)||v&&!inView16(r.bbox,v)||r.kind==='desert'&&mapMode!=='terrain')continue;
      const text=r.name.toUpperCase().split('').join(String.fromCharCode(8202));ctx.strokeText(text,r.label.x,r.label.y);ctx.fillText(text,r.label.x,r.label.y);
    }
  }
  ctx.restore();
});

/* ---- Sound: short cues synthesised with Web Audio (no audio files) ---- */
let AUDIO16=null;
function sfx16(kind){
  if(releaseSettings.sound===false)return;
  try{
    AUDIO16??=new (window.AudioContext||window.webkitAudioContext)();
    const a=AUDIO16,t=a.currentTime,master=a.createGain();master.gain.value=(releaseSettings.volume??.5)*.35;master.connect(a.destination);
    const tone=(type,f0,f1,start,dur,vol)=>{const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f0,t+start);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+start+dur);g.gain.setValueAtTime(0,t+start);g.gain.linearRampToValueAtTime(vol,t+start+.01);g.gain.exponentialRampToValueAtTime(.0001,t+start+dur);o.connect(g);g.connect(master);o.start(t+start);o.stop(t+start+dur+.02);};
    const noise=(start,dur,vol,freq)=>{const n=a.sampleRate*dur,b=a.createBuffer(1,n,a.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);const s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();f.type='lowpass';f.frequency.value=freq;g.gain.value=vol;s.buffer=b;s.connect(f);f.connect(g);g.connect(master);s.start(t+start);};
    if(kind==='click')tone('triangle',900,700,0,.045,.18);
    else if(kind==='success'){tone('sine',660,null,0,.18,.4);tone('sine',990,null,.12,.3,.35);}
    else if(kind==='alert'){tone('triangle',520,null,0,.14,.35);tone('triangle',520,null,.2,.14,.35);}
    else if(kind==='war'){tone('sine',110,55,0,.9,.9);noise(0,.6,.6,400);tone('sine',82,41,.35,.9,.6);}
    else if(kind==='battle'){noise(0,.35,.5,700);noise(.18,.3,.35,500);}
    else if(kind==='event'){tone('sine',440,null,0,.25,.3);tone('sine',554,null,.08,.3,.25);tone('sine',659,null,.16,.4,.25);}
  }catch{}
}
// Cues follow the player's journal, events and buttons.
let lastLog16=null,lastFights16=0,lastBattleCue16=0;
const onState18=onState;
onState=function(perf){
  const head=S?.log?.[0],key=head?head.day+'|'+head.text:null,fresh=lastLog16!==null&&key!==lastLog16;
  onState18(perf);
  if(fresh&&head){const kind=head.type==='war'?'war':head.type==='success'?'success':head.type==='event'?'alert':null;if(kind)sfx16(kind);}
  lastLog16=key;
  // Distant gunfire when new battles involve the player.
  const fights=S?.battles?.filter(b=>b.a===S.player||b.b===S.player).length||0,now=performance.now();
  if(fights>lastFights16&&now-lastBattleCue16>4000){sfx16('battle');lastBattleCue16=now;}
  lastFights16=fights;
};
const showEvent18=showEvent;
showEvent=function(){showEvent18();sfx16('event');};
document.addEventListener('click',ev=>{if(ev.target.closest?.('button[data-a]'))sfx16('click');},true);
// Preferences: sound on/off and volume.
const showSettings18=showSettings;
showSettings=function(){
  showSettings18();
  $('modal').querySelector('.settings-list')?.insertAdjacentHTML('beforeend',`<label class="settings-choice"><span><strong>Sons</strong><small>Signaux sonores de l’interface, des batailles et des événements.</small></span><input id="setting-sound" type="checkbox" ${releaseSettings.sound!==false?'checked':''}></label>
    <label class="settings-choice"><span><strong>Volume</strong><small>Intensité des signaux sonores.</small></span><input id="setting-volume" type="range" min="0" max="1" step=".05" value="${releaseSettings.volume??.5}"></label>`);
};
ACTIONS16.push(async(action)=>{
  if(action==='applySettings'){releaseSettings.sound=!!$('setting-sound')?.checked;releaseSettings.volume=Number($('setting-volume')?.value??.5);}
  return false;
});

/* ---- Manual ---- */
showHelp=function(){
  pauseGame();
  const card=(title,text)=>`<div class="card"><h3>${title}</h3><p class="note" style="margin-top:10px">${text}</p></div>`;
  modal(`${modalHead('Manuel de campagne','FRONTIÈRES 1.14 / PRISE EN MAIN')}<div class="grid2">
    ${card('1. Préparer l’État','Choisissez une priorité nationale et affectez vos équipes de recherche. Les usines, chantiers et raffineries partagent les emplacements de chaque État. Six ressources stratégiques alimentent les lignes de production ; la loi commerciale fixe la part exportée.')}
    ${card('2. Lois, conseillers, décisions','L’économie, la conscription et le commerce se règlent par des lois. Nommez des conseillers et des chefs d’état-major, prenez des décisions ponctuelles et surveillez vos esprits nationaux. Les voies politiques de l’arbre peuvent changer le régime.')}
    ${card('3. Former les forces','Composez vos divisions à partir de bataillons et de compagnies de soutien. Concevez chars, avions et navires, puis modernisez vos stocks. Le recrutement consomme matériel et effectifs.')}
    ${card('4. Plans de bataille','Dans Armées, tracez une ligne de front, des flèches d’offensive et une ligne de repli. La planification s’accumule avant l’attaque. Les batailles durent plusieurs jours, heure par heure : largeur de combat, réserves, terrain, météo et ravitaillement décident de l’issue.')}
    ${card('5. Ciel et mers','Les escadres reçoivent des missions selon leur type : supériorité, interception, appui, bombardement, frappes navales, parachutages. Les flottes patrouillent, frappent, escortent, mouillent des mines et disputent le contrôle des mers, indispensable aux invasions navales.')}
    ${card('6. Guerre et paix','Justifiez un but de guerre, puis déclarez la guerre. Un pays capitule quand il a perdu l’essentiel de ses points de victoire et de son territoire ; certains esprits repoussent ce seuil. Un gouvernement allié peut poursuivre la lutte en exil. La conférence de paix répartit les États selon la contribution de chacun.')}
    ${card('7. Généraux et maréchaux','Chaque armée reçoit un général, chaque groupe d’armées un maréchal. Ils gagnent de l’expérience au combat, montent de niveau et apprennent des traits de terrain ou d’armes. Chaque jour de bataille, les commandants choisissent une tactique que l’adversaire peut contrer. Ouvrez l’état-major depuis Armées.')}
    ${card('8. Logistique','Le ravitaillement emprunte les voies ferrées, bien moins coûteuses que les routes, puis les routes. Produisez assez de locomotives pour votre réseau et de camions pour vos divisions, et tracez de nouvelles lignes vers vos fronts (Industrie → Logistique). La vue Ravitaillement montre les voies et les dépôts.')}
    ${card('9. Renseignement et occupation','Fondez une agence (Renseignement), recrutez des agents et tissez des réseaux : ils ouvrent sabotages, vols de plans, capture du chiffre et gouvernements de collaboration. Les territoires occupés exigent des garnisons ; la loi d’occupation arbitre entre exploitation et résistance.')}
    ${card('10. Armes spéciales','Les canons sur rail forment des batteries qui circulent sur vos voies et appuient les batailles proches. Les missiles balistiques partent de bases de lancement vers l’industrie ennemie. Un réacteur et la recherche atomique produisent des bombes, larguées par vos bombardiers stratégiques (Guerre → Armes spéciales).')}
    ${card('11. Présentation','Les Préférences règlent les sons (signaux synthétisés pour l’interface, les batailles et les événements), leur volume et la langue : l’interface existe en français et en anglais ; les contenus historiques restent en français. La vue Terrain montre les déserts, les massifs sont dessinés en hachures sur toutes les vues terrestres.')}
    ${card('12. Arbres nationaux','Les huit grandes puissances suivent un arbre qui leur est propre : industrie et recherche, armée, aviation, marine, renseignement et politique étrangère, puis les voies politiques à droite. Certains programmes fondent l’agence de renseignement, recrutent des agents ou des officiers, modernisent les grandes lignes ferroviaires ou livrent des locomotives et des canons sur rail ; d’autres s’excluent mutuellement.')}
  </div><div class="card" style="margin-top:18px"><h3>Raccourcis</h3><p class="note" style="margin-top:10px"><span class="hotkey">Espace</span> Pause / <span class="hotkey">1–5</span> Vitesse / <span class="hotkey">A</span> Armées / <span class="hotkey">I</span> Industrie / <span class="hotkey">R</span> Recherche / <span class="hotkey">D</span> Diplomatie / <span class="hotkey">P</span> Priorités / <span class="hotkey">F</span> Recentrer / <span class="hotkey">Échap</span> Fermer.</p></div>
  <p class="note" style="margin-top:18px">Limites de cette version : simulation journalière avec combats horaires, carte d’environ 11 600 provinces terrestres (régions Natural Earth 1:10m), 226 régions maritimes et 158 régions aériennes, réseau ferré schématique, IA heuristique, contenu original moins abondant que celui des grands jeux commerciaux. Pas de multijoueur ni de compatibilité avec les mods d’autres jeux.</p>`,'help','wide');
};
renderRail();
