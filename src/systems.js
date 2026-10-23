/* Frontieres 1.6 - grand strategy systems layered on the 1.5 engine, MIT.
 * Installed by createEngineClass(); serialized into the Worker with it.
 * Same rules as the engine: deterministic, no DOM, network, eval or wall clock.
 */
function installSystems16(Engine,H){
  'use strict';
  const {clone,clamp,sum,assert,finite,distance,hash}=H;
  const RELEASE='1.10';

  // ---------------------------------------------------------------------------
  // Shared helpers
  // ---------------------------------------------------------------------------
  const hash32=n=>{n=Math.imul(n^(n>>>16),0x45d9f3b)>>>0;n=Math.imul(n^(n>>>16),0x45d9f3b)>>>0;return (n^(n>>>16))>>>0;};
  const unit01=n=>hash32(n)/4294967296;
  const monthOf=day=>new Date(Date.UTC(1936,0,1+day)).getUTCMonth();
  const SHARED_KINDS=['civ','mil','dock','refinery'];
  const RESOURCES=['steel','oil','rubber','aluminium','tungsten','chromium'];
  const NEW_PROVINCE_KEYS=['refinery','aa','coastalFort'];
  // Bonus keys added in 1.6. Older saves receive them at 0 during migration.
  const NEW_BONUS=['buildingSlots','recruitment','ppGain','consumer','organization','airDefense','invasion','paradrop','reliability','attrition','breakthrough','entrench','mines','convoy','naval','casualties','resources','stabilityGrowth','supportGrowth','surrender'];
  Engine.RESOURCES16=RESOURCES;
  Engine.NEW_BONUS16=NEW_BONUS;
  const law=(catalog,kind,id)=>catalog.laws?.[kind]?.find(l=>l.id===id)||catalog.laws?.[kind]?.[0]||{};
  const lawIndex=(catalog,kind,id)=>Math.max(0,(catalog.laws?.[kind]||[]).findIndex(l=>l.id===id));

  // ---------------------------------------------------------------------------
  // States: contiguous groups of provinces sharing building slots.
  // Derived from the map itself, so mod maps receive states automatically.
  // ---------------------------------------------------------------------------
  const stateCache=new WeakMap();
  const DIRECTIONS=['Est','Nord-Est','Nord','Nord-Ouest','Ouest','Sud-Ouest','Sud','Sud-Est'];
  const provinceScore=p=>p.vp>1?p.vp+(p.city?2:0):({desert:.15,mountains:.4,marsh:.3,jungle:.35}[p.terrain]??.6)+(p.city?2:0);
  Engine.deriveStates=function(world,catalog=null){
    let cached=stateCache.get(world);if(cached)return cached;
    const P=world.provinces,groups=new Map(),named=world.states||[];
    // The 1.7 map lists its states; added mod provinces are grouped by name.
    for(const p of P){const key=Number.isInteger(p.state)&&named[p.state]?'#'+p.state:p.owner+'|'+String(p.name).split(' / ')[0];if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p.id);}
    const list=[],of=new Int32Array(P.length).fill(-1);
    const near=(a,b)=>{const dx=(a.x-b.x)*Math.cos((a.y+b.y)*Math.PI/360),dy=a.y-b.y;return dx*dx+dy*dy;};
    const categories=(catalog?.stateCategories||Engine.STATE_CATEGORIES16||[]).slice().sort((a,b)=>a.score-b.score);
    for(const [key,ids] of groups){
      const listed=key[0]==='#'?named[+key.slice(1)]:null;
      const owner=listed?P[ids[0]].owner:key.slice(0,key.indexOf('|')),prefix=listed?listed.name:key.slice(key.indexOf('|')+1),inGroup=new Set(ids),seen=new Set(),components=[];
      if(listed){
        const capital=ids.reduce((best,id)=>P[id].vp>P[best].vp||(P[id].vp===P[best].vp&&P[id].city&&!P[best].city)?id:best,ids[0]);
        const score=sum(ids.map(i=>provinceScore(P[i])));
        let category=categories[0]||{id:'rural',name:'Rural',slots:2};
        for(const cat of categories)if(score>=cat.score)category=cat;
        const id=list.length,c={x:sum(ids.map(i=>P[i].x))/ids.length,y:sum(ids.map(i=>P[i].y))/ids.length};
        list.push({id,name:prefix,owner,provinces:ids,capital,score:+score.toFixed(2),category:category.id,categoryName:category.name,slots:category.slots,coast:ids.some(i=>P[i].coast),x:c.x,y:c.y});
        for(const pid of ids)of[pid]=id;
        continue;
      }
      for(const start of ids){
        if(seen.has(start))continue;
        const comp=[start];seen.add(start);
        for(let h=0;h<comp.length;h++)for(const n of P[comp[h]].neighbors)if(inGroup.has(n)&&!seen.has(n)){seen.add(n);comp.push(n);}
        components.push(comp.sort((a,b)=>a-b));
      }
      const chunks=[];
      for(const comp of components){
        const k=Math.max(1,Math.round(comp.length/7));
        if(k===1){chunks.push(comp);continue;}
        const members=new Set(comp);
        const seeds=[comp.reduce((best,id)=>P[id].vp>P[best].vp?id:best,comp[0])];
        while(seeds.length<k){
          let far=-1,farD=-1;
          for(const id of comp){if(seeds.includes(id))continue;const d=Math.min(...seeds.map(s=>near(P[id],P[s])));if(d>farD){farD=d;far=id;}}
          seeds.push(far);
        }
        const part=new Map(seeds.map((s,i)=>[s,i])),queue=[...seeds];
        for(let h=0;h<queue.length;h++)for(const n of P[queue[h]].neighbors)if(members.has(n)&&!part.has(n)){part.set(n,part.get(queue[h]));queue.push(n);}
        const parts=seeds.map(()=>[]);for(const id of comp)parts[part.get(id)].push(id);
        chunks.push(...parts.filter(x=>x.length));
      }
      const centre=ids.reduce((a,id)=>({x:a.x+P[id].x/ids.length,y:a.y+P[id].y/ids.length}),{x:0,y:0});
      const used=new Map();
      for(const chunk of chunks){
        const c={x:sum(chunk.map(i=>P[i].x))/chunk.length,y:sum(chunk.map(i=>P[i].y))/chunk.length};
        let name=prefix;
        if(chunks.length>1){
          const angle=Math.atan2(c.y-centre.y,(c.x-centre.x)*Math.cos(centre.y*Math.PI/180));
          const dir=DIRECTIONS[((Math.round(angle/(Math.PI/4))%8)+8)%8];
          const n=(used.get(dir)||0)+1;used.set(dir,n);name=prefix+' ('+dir+(n>1?' '+n:'')+')';
        }
        const capital=chunk.reduce((best,id)=>P[id].vp>P[best].vp||(P[id].vp===P[best].vp&&P[id].city&&!P[best].city)?id:best,chunk[0]);
        const score=sum(chunk.map(i=>provinceScore(P[i])));
        let category=categories[0]||{id:'rural',name:'Rural',slots:2};
        for(const cat of categories)if(score>=cat.score)category=cat;
        const id=list.length;
        list.push({id,name,owner,provinces:chunk,capital,score:+score.toFixed(2),category:category.id,categoryName:category.name,slots:category.slots,coast:chunk.some(i=>P[i].coast),x:c.x,y:c.y});
        for(const pid of chunk)of[pid]=id;
      }
    }
    cached={list,of};stateCache.set(world,cached);return cached;
  };
  Object.defineProperty(Engine.prototype,'states16',{get(){return Engine.deriveStates(this.world,this.catalog);}});
  Engine.prototype.stateId=function(pid){return this.states16.of[pid];};
  Engine.prototype.stateUsed=function(sid){const st=this.states16.list[sid];return sum(st.provinces.map(pid=>SHARED_KINDS.reduce((n,k)=>n+(this.s.provinces[pid][k]||0),0)));};
  Engine.prototype.stateCapacity=function(sid,id=null){
    const st=this.states16.list[sid],c=id?this.nation(id):null;
    return Math.floor(st.slots*(1+(c?.bonus.buildingSlots||0)))+(this.s.stateExtra?.[sid]||0);
  };
  Engine.prototype.stateQueued=function(sid,id){
    const c=this.nation(id);if(!c)return 0;
    return c.build.filter(b=>SHARED_KINDS.includes(b.kind)&&this.stateId(b.pid)===sid).length;
  };
  // Factories present at the start (or in a migrated save) stay valid even when
  // they exceed the category: the excess becomes permanent extra slots.
  Engine.prototype.computeStateExtra=function(){
    return this.states16.list.map(st=>Math.max(0,this.stateUsed(st.id)-st.slots));
  };
  const coreSets=new WeakMap();
  // Homeland: the provinces of the 1936 owner connected by land (or a strait)
  // to its capital. Colonies and distant islands are not part of it.
  Engine.prototype.homeland16=function(id){
    if(this._homeWorld!==this.world){this._homeWorld=this.world;this._home=new Map();}
    let set=this._home.get(id);if(set)return set;
    const d=this.defs[id];set=new Set();
    if(d&&this.prov[d.capital]?.owner===id){const q=[d.capital];set.add(d.capital);for(let h=0;h<q.length;h++)for(const n of this.prov[q[h]].neighbors)if(this.prov[n].owner===id&&!set.has(n)){set.add(n);q.push(n);}}
    this._home.set(id,set);return set;
  };
  Engine.prototype.isCore=function(id,pid){
    const c=this.nation(id);if(!c)return false;
    const cores=c.identity.cores;if(!Array.isArray(cores))return this.prov[pid].owner===id;
    let set=coreSets.get(cores);if(!set||set.size!==cores.length){set=new Set(cores);coreSets.set(cores,set);}
    return set.has(pid);
  };

  // ---------------------------------------------------------------------------
  // Climate and weather. Regional cells change every three days.
  // ---------------------------------------------------------------------------
  Engine.weatherKey=function(p,day,month=monthOf(day)){
    const lat=p.y,lon=p.x,abs=Math.abs(lat),t=p.terrain,north=lat>=0;
    const cell=Math.floor((lon+180)/5)*100+Math.floor((lat+90)/5),r=unit01(cell*7919+Math.floor(day/3)*104729+17);
    const winter=north?(month===11||month<=1):(month>=5&&month<=7);
    const continental=(lat>47&&lon>18&&lon<145)||(lat>44&&lon>-125&&lon<-60)||lat>60||lat<-42;
    if(winter){
      if(continental||t==='mountains'&&abs>30){
        if(lat>52&&lon>25&&lon<145&&r<.2)return 'frost';
        if(r<.32)return 'blizzard';
        if(r<.7)return 'snow';
        return 'clear';
      }
      if(abs>40){if(r<.2)return 'snow';if(r<.5)return 'rain';return 'clear';}
    }
    if(north&&lat>44&&lat<66&&lon>18&&lon<62&&[2,3,9,10].includes(month)&&r<.55)return 'mud';
    if(continental&&(north?month===2:month===8)&&r<.3)return 'snow';
    if(lon>65&&lon<125&&lat>4&&lat<32&&month>=5&&month<=8&&r<.55)return 'monsoon';
    if(t==='desert'){if(month>=2&&month<=4&&r<.18)return 'sandstorm';if(north&&month>=5&&month<=7&&r<.45)return 'heat';return 'clear';}
    if(t==='jungle'||abs<12){if(r<.3)return 'rain';if(r<.4)return 'storm';return 'clear';}
    if(r<.14)return 'rain';if(r<.18)return 'storm';return 'clear';
  };
  const STORMY={NATL:[10,11,0,1],NSEA:[10,11,0,1],CHANNEL:[10,11,0,1],BALTIC:[10,11,0,1],NPAC:[6,7,8,9],SCHINA:[6,7,8,9],JAPANSEA:[6,7,8,9],INDIAN:[5,6,7,8],ARABIAN:[5,6,7,8]};
  Engine.seaWeatherKey=function(zone,day,month=monthOf(day),theatre=zone){
    const index=[...String(zone)].reduce((n,ch)=>n*31+ch.charCodeAt(0),7),r=unit01(index*977+Math.floor(day/2)*7151);
    const season=(STORMY[theatre]||[]).includes(month);
    if(r<(season?.33:.05))return 'gale';
    if(r<(season?.6:.2))return 'swell';
    return 'calm';
  };
  Engine.prototype.weather=function(pid){
    const day=this.s?.day||0;
    if(this._weatherDay!==day||this._weatherWorld!==this.world){
      this._weatherDay=day;this._weatherWorld=this.world;this._weatherMonth=monthOf(day);
      this._weatherCodes=new Uint8Array(this.prov.length).fill(255);
      this._weatherTable=Object.entries(this.catalog.weather||{clear:{name:'Clair',attack:1,move:1,air:1,attrition:0}}).map(([key,w])=>({key,...w}));
      this._weatherIndex=Object.fromEntries(this._weatherTable.map((w,i)=>[w.key,i]));
    }
    let code=this._weatherCodes[pid];
    if(code===255){code=this._weatherIndex[Engine.weatherKey(this.prov[pid],day,this._weatherMonth)]??0;this._weatherCodes[pid]=code;}
    return this._weatherTable[code];
  };
  Engine.prototype.seaWeather=function(zone){
    const key=Engine.seaWeatherKey(zone,this.s.day,monthOf(this.s.day),this.seaTheatre16(zone));
    return {key,...(this.catalog.seaWeather?.[key]||{name:key,naval:1,air:1,invasion:true})};
  };

  // ---------------------------------------------------------------------------
  // Laws
  // ---------------------------------------------------------------------------
  Engine.prototype.laws16=function(c){
    return {economy:law(this.catalog,'economy',c.economy),conscription:this.catalog.laws?.conscription?.[c.conscription]||{pool:1,recruit:1},trade:law(this.catalog,'trade',c.trade||'export')};
  };
  const DEFAULT_TRADE={USA:'free',GBR:'free',HOL:'free',BEL:'free',SOV:'limited',JPN:'limited'};
  const START_LAWS={
    '1936':{GER:['partial',2],SOV:['partial',2],JPN:['partial',2],ITA:['early',2],FRA:['civilian',2],CHI:['early',2]},
    '1939':{GER:['war',3],SOV:['partial',3],JPN:['war',3],ITA:['partial',2],FRA:['partial',3],GBR:['partial',2],POL:['partial',3],CHI:['war',3]}
  };

  // ---------------------------------------------------------------------------
  // Migration and defaults
  // ---------------------------------------------------------------------------
  Engine.prototype.ensure16=function(){
    const s=this.s;if(!s)return;
    if(!Array.isArray(s.stateExtra)||s.stateExtra.length!==this.states16.list.length)s.stateExtra=this.computeStateExtra();
    for(let i=0;i<s.provinces.length;i++){
      const st=s.provinces[i];for(const k of NEW_PROVINCE_KEYS)st[k]??=0;
      if(st.own===undefined||!s.countries[st.own]){const p=this.prov[i];st.own=s.countries[p.owner]&&this.war(st.ctrl,p.owner)?p.owner:st.ctrl;}
    }
    for(const [id,c] of Object.entries(s.countries)){
      c.trade??=DEFAULT_TRADE[id]||'export';
      for(const k of NEW_BONUS)c.bonus[k]??=0;
      for(const k of RESOURCES)if(c.stats)c.stats[k]??=0;
      c.designs??=[];c.lines??={};c.modernize??={};c.eqStats??={};
      s.mines16??={};s.invasions16??=[];s.seaControl16??={};s.airControl16??={};
      c.spirits16??=[];c.advisors16??={};c.decisions16??={};
      if(c.advisor){const map={economy:['construction',.12,'industrialist'],science:['research',.10,'scientist'],logistics:['supply',.12,'logistician']}[c.advisor];
        if(map&&this.catalog.advisors){c.bonus[map[0]]-=map[1];c.advisor=null;c.advisors16.political??=[];if(!c.advisors16.political.includes(map[2])){c.advisors16.political.push(map[2]);this.applyBonus16(c,this.catalog.advisors.find(a=>a.id===map[2]).effect,1);}}}
      for(const key in this.catalog.equipment){c.stock[key]??=0;c.allocation[key]??=0;c.efficiency[key]??=.45;}
      for(const t of [...c.templates,...c.training.map(x=>x.template)])if(t.bat&&t.inf===undefined)Object.assign(t,Engine.legacyFields16(t.bat,t.sup||[]));
    }
  };
  Engine.prototype.init16=function(fresh){
    const s=this.s;this.ensure16();
    if(fresh){
      const scenario=s.historyState?.scenario||'1936';
      for(const [id,[economy,level]] of Object.entries(START_LAWS[scenario]||{})){
        const c=this.nation(id);if(!c?.alive)continue;
        c.economy=economy;
        if(level>c.conscription){c.pool+=c.identity.manpower*(this.laws16({...c,conscription:level}).conscription.pool-this.laws16(c).conscription.pool);c.conscription=level;}
      }
      s.stateExtra=this.computeStateExtra();
      this.startingEquipment16();
      this.startTechnology16();
      this.startGovernment16();
      this.updateStats();this.applyOOB16();
    }
    s.release=RELEASE;
  };

  // ---------------------------------------------------------------------------
  // Economy: six strategic resources, laws, per-line resource shortages,
  // core and non-core manpower.
  // ---------------------------------------------------------------------------
  Engine.prototype.updateStats=function(){
    const base=Object.fromEntries(RESOURCES.map(k=>[k,this.catalog.resources?.[k]?.base??(k==='steel'?8:1)]));
    for(const c of Object.values(this.s.countries))c.stats={civ:0,mil:0,dock:0,freeCiv:0,...base,resourceFactor:1,divisionCount:0,supply:c.stats?.supply??1,vpHeld:1,coreShare:1,manpowerFactor:1,shortage:{},demand:{},exported:0,tradeIncome:0};
    const held={},totals={},coreHeld={},nonCore={},wars=new Set(this.s.wars.flatMap(w=>[w.a+'|'+w.b,w.b+'|'+w.a]));
    // Most provinces carry no factory, resource or victory point: skip them.
    if(this._resWorld!==this.world){this._resWorld=this.world;this._resFlag=Uint8Array.from(this.prov,p=>RESOURCES.some(k=>p[k])?1:0);}
    const resFlag=this._resFlag,S=this.s.provinces;
    for(let i=0;i<this.prov.length;i++){
      const p=this.prov[i],q=S[i];
      if(!p.vp&&!resFlag[i]&&!q.civ&&!q.mil&&!q.dock&&!q.refinery)continue;
      const c=this.s.countries[q.ctrl];if(!c)continue;
      const atWar=q.ctrl!==p.owner&&wars.has(q.ctrl+'|'+p.owner);
      const occupation=q.ctrl===p.owner?1:.3+q.compliance/200;
      const output=occupation*(1-q.damage)*Math.max(.3,1-q.resistance/150);
      for(const k of ['civ','mil','dock'])c.stats[k]+=q[k]*output;
      for(const k of RESOURCES)if(p[k])c.stats[k]+=p[k]*occupation*(1+(c.bonus.resources||0));
      if(q.refinery){c.stats.oil+=q.refinery*2*output;c.stats.rubber+=q.refinery*output;}
      totals[p.owner]=(totals[p.owner]||0)+p.vp;
      if(q.ctrl===p.owner||!atWar&&this.allies(p.owner,q.ctrl))held[p.owner]=(held[p.owner]||0)+p.vp;
      if(this.isCore(q.ctrl,p.id))coreHeld[q.ctrl]=(coreHeld[q.ctrl]||0)+p.vp;
      else nonCore[q.ctrl]=(nonCore[q.ctrl]||0)+p.vp*q.compliance/100;
    }
    const exportUsed={};
    for(const id of this.active()){
      const c=this.nation(id),L=this.laws16(c);
      for(const k of ['civ','mil','dock'])c.stats[k]=Math.max(0,Math.floor(c.stats[k]+.0001));
      let consumer=(L.economy.consumer??.4)+(c.bonus.consumer||0);
      if(c.macro){consumer+=c.macro.welfare==='expanded'?.035:c.macro.welfare==='austerity'?-.018:0;
        consumer+=c.macro.tax==='high'?.022:0;
        consumer-=c.macro.ration==='severe'?.12:c.macro.ration==='limited'?.06:0;}
      c.stats.freeCiv=Math.max(0,Math.floor(c.stats.civ*(1-clamp(consumer,.05,.8))));
      c.stats.vpHeld=(held[id]||0)/(totals[id]||1);
      const cores=Array.isArray(c.identity.cores)?sum(c.identity.cores.map(pid=>this.prov[pid]?.vp||0)):(totals[id]||1);
      c.stats.coreShare=clamp((coreHeld[id]||0)/Math.max(1,cores),0,1);
      c.stats.manpowerFactor=clamp(c.stats.coreShare+.2*(nonCore[id]||0)/Math.max(1,cores),.1,1.6);
      for(const tr of c.trades){
        tr.active=false;const seller=this.nation(tr.from);if(!seller?.alive||this.war(id,tr.from)||c.stats.freeCiv<1)continue;
        const key=tr.from+'_'+tr.resource,used=exportUsed[key]||0,share=this.laws16(seller).trade.export??.5;
        const available=Math.max(0,seller.stats[tr.resource]*share-used);
        if(available<4)continue;
        exportUsed[key]=used+4;c.stats[tr.resource]+=4;c.stats.freeCiv--;tr.active=true;
      }
      const normalize=(naval,max)=>{
        let used=sum(Object.keys(this.catalog.equipment).filter(k=>!!this.catalog.equipment[k].naval===naval).map(k=>c.allocation[k]||0));
        while(used>max){const ks=Object.keys(c.allocation).filter(k=>!!this.catalog.equipment[k]?.naval===naval).sort((a,b)=>c.allocation[b]-c.allocation[a]);if(!ks.length||!c.allocation[ks[0]])break;c.allocation[ks[0]]--;used--;}
      };normalize(false,c.stats.mil);normalize(true,c.stats.dock);
    }
    for(const [key,value] of Object.entries(exportUsed)){
      const cut=key.lastIndexOf('_'),id=key.slice(0,cut),k=key.slice(cut+1),seller=this.nation(id);
      seller.stats[k]=Math.max(0,seller.stats[k]-value);seller.stats.exported+=value;
      // Each contract of four units pays the exporter half a civilian factory.
      seller.stats.tradeIncome+=value/8;
    }
    for(const id of this.active()){
      const c=this.nation(id);
      c.stats.freeCiv+=Math.floor(c.stats.tradeIncome);
      for(const r of RESOURCES)c.stats.demand[r]=0;
      for(const [key,n] of Object.entries(c.allocation)){const e=this.catalog.equipment[key];if(!e||!n)continue;for(const r of RESOURCES)c.stats.demand[r]+=n*(e[r]||0);}
      // A missing resource slows the lines that use it, down to 40 % of normal output.
      for(const r of RESOURCES)c.stats.shortage[r]=c.stats.demand[r]>0?clamp(.4+.6*c.stats[r]/c.stats.demand[r],.4,1):1;
      c.stats.resourceFactor=Math.min(...RESOURCES.map(r=>c.stats.shortage[r]));
    }
    for(const u of this.s.units){const c=this.nation(u.owner);if(c)c.stats.divisionCount++;}
  };
  Engine.prototype.lineFactor16=function(c,key){
    const e=this.catalog.equipment[key];if(!e)return 1;
    let f=1;for(const r of RESOURCES)if(e[r])f=Math.min(f,c.stats.shortage?.[r]??1);return f;
  };
  Engine.prototype.economics=function(id){
    const c=this.nation(id),mod=this.s.mod.balance,L=this.laws16(c);
    this.governanceDaily(id);
    c.pp+=(.8+c.stability/160)*(1+(c.bonus.ppGain||0));
    c.stock.fuel=Math.min(150000,c.stock.fuel+15+c.stats.oil*12);
    this.mobilize16(id,c,L);
    const lawProduction=1+(L.economy.production||0)+(L.trade.production||0)+(L.conscription.production||0);
    for(const [key,n] of Object.entries(c.allocation)){
      const equipment=this.catalog.equipment[key];if(!equipment)continue;
      if(n)c.efficiency[key]=Math.min(.95,c.efficiency[key]+.0018*(1+c.bonus.production));
      if(!n)continue;
      const output=n*5/equipment.cost*c.efficiency[key]*this.lineFactor16(c,key)*(1+c.bonus.production)*(.7+c.stability/250)*lawProduction*mod.production*(c.macro?.output||1);
      this.produce16(id,key,output);
    }
    const construction=1+c.bonus.construction+(L.economy.construction||0)+(L.trade.construction||0);
    const capacity=c.stats.freeCiv*1.2*construction*(c.macro?.output||1),projects=c.build.slice(0,Math.max(1,Math.min(3,Math.floor(c.stats.freeCiv/10))));
    for(const b of projects){
      const lost=b.kind==='railLine'?!b.pids.some(pid=>this.s.provinces[pid].ctrl===id):this.s.provinces[b.pid].ctrl!==id;
      if(lost){c.build=c.build.filter(x=>x.id!==b.id);continue;}
      b.progress+=capacity/projects.length;
      if(b.progress>=b.cost){this.completeBuild16(id,b);c.build=c.build.filter(x=>x.id!==b.id);}
    }
    const year=1936+this.s.day/365.25;
    for(const r of [...c.research]){
      const t=this.tech(r.id),ahead=Math.max(0,t.year-year);
      r.progress+=(1+c.bonus.research+(L.trade.research||0))*mod.research/(1+ahead*.7)*(this.researchBoost16?this.researchBoost16(c,t):1);
      if(r.progress>=t.days){c.tech.push(t.id);c.research=c.research.filter(x=>x.id!==r.id);this.effect(id,t.effect);this.techUnlocked16?.(id,t);if(id===this.s.player)this.log('Recherche achevée : '+t.name+'.','success');}
    }
    if(c.focus){const f=this.focus(id,c.focus.id);c.focus.progress++;if(c.focus.progress>=f.days){c.focusDone.push(f.id);c.focus=null;this.effect(id,f.effect);this.focusCompleted16?.(id,f);if(id===this.s.player)this.log('Priorité achevée : '+f.name+'.','success');}}
    for(const t of [...c.training]){
      t.progress++;
      if(t.progress>=t.days){const pid=this.s.provinces[t.pid].ctrl===id?t.pid:this.cap(id);const u=this.spawn(id,pid,t.template);const army=this.s.armies.find(a=>a.owner===id);if(army)u.army=army.id;c.training=c.training.filter(x=>x.id!==t.id);if(id===this.s.player)this.log(t.template.name+' déployée à '+this.prov[pid].name+'.','success');}
    }
    for(const j of c.justifications){j.progress=Math.min(j.days,j.progress+1);}
    for(const agreement of c.lendLease){
      if(!this.nation(agreement.target)?.alive||this.war(id,agreement.target))continue;
      const amount=Math.min(agreement.daily,c.stock[agreement.equipment]||0);if(amount<=0)continue;
      this.transferEquipment16(id,agreement.target,agreement.equipment,amount);
    }
    for(const p of this.ownedToday16(id)){
      const st=this.s.provinces[p.id];st.damage=Math.max(0,st.damage-.003-c.stats.freeCiv*.00002);
      if(st.ctrl===p.owner){st.resistance=Math.max(0,st.resistance-.3);continue;}
      const stationed=(this.unitsAt.get(p.id)||[]).filter(u=>u.owner===id).length;
      const policy={civil:{gain:.045,compliance:.08,loss:0},police:{gain:.02,compliance:.03,loss:.02},military:{gain:-.03,compliance:-.01,loss:.07}}[c.occupation];
      st.resistance=clamp(st.resistance+policy.gain-stationed*.2,0,100);st.compliance=clamp(st.compliance+policy.compliance,0,100);
      if(st.resistance>40){st.damage=clamp(st.damage+.002*(st.resistance/40),0,.8);const losses=Math.min(c.manpower,Math.ceil(st.resistance*policy.loss));c.manpower-=losses;c.casualties+=losses;}
    }
  };
  // Production and transfers keep a stock-weighted average of the equipment
  // quality (see the equipment section). Without it they are plain additions.
  Engine.prototype.produce16=function(id,key,amount){this.nation(id).stock[key]+=amount;};
  Engine.prototype.transferEquipment16=function(from,to,key,amount){this.nation(from).stock[key]-=amount;this.nation(to).stock[key]+=amount;};
  // War lookups run tens of thousands of times a day: an index rebuilt
  // whenever the war list changes (new array, new length or new last war).
  Engine.prototype.warIndex16=function(){
    const w=this.s.wars,tail=w.length?w[w.length-1].id:-1;
    if(this._warRef!==w||this._warLen!==w.length||this._warTail!==tail){
      const m=new Map(),add=(a,b)=>{let set=m.get(a);if(!set)m.set(a,set=new Set());set.add(b);};
      for(const x of w){add(x.a,x.b);add(x.b,x.a);}
      this._warMap=m;this._warRef=w;this._warLen=w.length;this._warTail=tail;
    }
    return this._warMap;
  };
  Engine.prototype.war=function(a,b){return !!this.warIndex16().get(a)?.has(b);};
  // Same order as the original (country order, living countries only).
  Engine.prototype.enemies=function(id){
    const set=this.warIndex16().get(id);if(!set?.size)return [];
    const out=[];for(const k in this.s.countries)if(set.has(k)&&this.s.countries[k].alive)out.push(k);
    return out;
  };
  // Same result as access(a,b) for every pair, without the per-pair lookups.
  Engine.prototype.accessMatrix=function(){
    const C=this.s.countries,ids=Object.keys(C),permitted=Object.create(null);
    for(const a of ids){
      const ca=C[a],row=permitted[a]=Object.create(null),fa=ca.faction,acc=ca.access;
      for(const b of ids)row[b]=a===b||fa!=='none'&&fa===C[b].faction||acc.includes(b);
    }
    return permitted;
  };
  // Supply: the 1.5 model with a best-first flood (each province settles once
  // at its best value instead of being relaxed again and again) and cached
  // lookups. Sources: capitals and ports weighted by convoys and blockade.
  Engine.prototype.computeSupply=function(){
    const s=this.s,P=this.prov,n=P.length,permitted=this.accessMatrix(),active=this.active();
    const portsByOwner=Object.create(null),allPorts=[];
    for(const p of P){const st=s.provinces[p.id];if(!st.port)continue;allPorts.push(p);(portsByOwner[st.ctrl]??=[]).push(p);}
    const alliesById=new Map(active.map(id=>[id,active.filter(o=>this.allies(id,o))]));
    const navalCache=new Map(),naval=(id,zone,mission)=>{const key=id+'|'+zone+'|'+mission;let v=navalCache.get(key);if(v===undefined){v=this.navalPower(id,zone,mission||null);navalCache.set(key,v);}return v;};
    const loads=new Float64Array(n);
    for(const u of s.units)loads[u.pid]+=templateStats16(u.template).width/20;
    const values=new Float64Array(n),heapIds=[],heapKeys=[];
    const push=(id,v)=>{let i=heapIds.length;heapIds.push(id);heapKeys.push(v);while(i>0){const up=(i-1)>>1;if(heapKeys[up]>=v)break;heapIds[i]=heapIds[up];heapKeys[i]=heapKeys[up];i=up;}heapIds[i]=id;heapKeys[i]=v;};
    const pop=()=>{const top=heapIds[0],lastId=heapIds.pop(),lastKey=heapKeys.pop(),size=heapIds.length;if(size){let i=0;for(;;){let c=2*i+1;if(c>=size)break;if(c+1<size&&heapKeys[c+1]>heapKeys[c])c++;if(heapKeys[c]<=lastKey)break;heapIds[i]=heapIds[c];heapKeys[i]=heapKeys[c];i=c;}heapIds[i]=lastId;heapKeys[i]=lastKey;}return top;};
    const seed=(pid,v)=>{if(values[pid]<v){values[pid]=v;push(pid,v);}};
    for(const id of active){
      const c=this.nation(id),capital=this.cap(id);if(s.provinces[capital]?.ctrl===id)seed(capital,1);
      const ports=portsByOwner[id]||[];if(!ports.length)continue;
      const convoyFactor=clamp(c.stock.convoys/Math.max(15,ports.length*2),0,1),foes=this.enemies(id),friends=alliesById.get(id);
      for(const p of ports){
        let raiding=0,escorts=0;for(const e of foes)raiding+=naval(e,p.seaZone,'raid');for(const o of friends)escorts+=naval(o,p.seaZone,'');
        const blockade=clamp(1-raiding/Math.max(10,escorts+raiding)*.8,.2,1);
        seed(p.id,.65*convoyFactor*blockade*(1+s.provinces[p.id].port*.06));
      }
    }
    const bonus=new Map(),supplyBonus=k=>{let v=bonus.get(k);if(v===undefined){v=this.nation(k)?.bonus.supply||0;bonus.set(k,v);}return v;};
    // Roads cost more without trucks; railway lines cost a fraction of a
    // road, less on a busier line, more when locomotives are lacking.
    const steps=this.supplySteps16(),factors=new Map(),factor=k=>{let f=factors.get(k);if(!f){f={train:steps.train(k),truck:steps.truck(k)};factors.set(k,f);}return f;};
    const move=new Float64Array(n),denom=new Float64Array(n);
    for(let j=0;j<n;j++){const t=s.provinces[j];move[j]=.07*this.catalog.terrain[P[j].terrain].move;denom[j]=1+t.infra*.12;}
    const done=new Uint8Array(n),span=this.edgeSpan16(),S=s.provinces;
    while(heapIds.length){
      const i=pop();if(done[i])continue;done[i]=1;
      const from=S[i].ctrl,row=permitted[from],extra=supplyBonus(from),vi=values[i],nb=P[i].neighbors,sp=span[i],f=factor(from),ri=S[i].rail,rails=steps.adj[i];
      for(let k=0;k<nb.length;k++){
        const j=nb[k];if(done[j]||!row?.[S[j].ctrl])continue;
        const rj=S[j].rail,onRail=ri>0&&rj>0&&(steps.legacy||rails.includes(j));
        // Occupied lines run at half capacity (gauge, staff, sabotage).
        const cost=onRail?.07*RAIL_COST*sp[k]*(1+S[j].damage*2)*(S[j].own!==S[j].ctrl?OCCUPIED_RAIL:1)/((1+.35*(Math.min(ri,rj)-1))*f.train+extra):move[j]*sp[k]*f.truck/(denom[j]+extra);
        const v=vi-cost;if(v>values[j]&&v>0){values[j]=v;push(j,v);}
      }
    }
    for(let i=0;i<n;i++){const q=s.provinces[i];q.supply=clamp(values[i]*(1+q.hub*.08)*(1-q.damage*.4),0,1);}
    const totals={},counts={},armyById=new Map(s.armies.map(a=>[a.id,a]));
    for(const u of s.units){
      const q=s.provinces[u.pid],g=this.general(armyById.get(u.army));
      // A province feeds more divisions with railways, roads and hubs.
      u.supply=clamp(q.supply*(1+supplyBonus(u.owner)+(u.template.logistics?.12:0)+(g?this.commanderSupply16(g,u.pid):0))/Math.max(1,loads[u.pid]/(4+q.infra*2+q.hub*3+q.rail)),0,1);
      totals[u.owner]=(totals[u.owner]||0)+u.supply;counts[u.owner]=(counts[u.owner]||0)+1;
    }
    for(const id of active)this.nation(id).stats.supply=(totals[id]||0)/(counts[id]||1);
    this.computePockets(permitted,allPorts);
  };
  // Manpower: each conscription law makes a share of the population
  // recruitable. The population comes from the controlled provinces (own
  // land in full, occupied land at 15 %); men already mobilised, dead or
  // wounded count against it, and the gap is called up gradually.
  Engine.prototype.provincePopulation16=function(){
    if(this._popWorld===this.world)return this._pop;
    const weights=new Float64Array(this.prov.length),totals=new Map();
    for(const p of this.prov){const w=p.overseas?.3:1+p.vp*2;weights[p.id]=w;totals.set(p.owner,(totals.get(p.owner)||0)+w);}
    const table=this.catalog.population16||{},pop=new Float64Array(this.prov.length);
    for(const p of this.prov){const d=this.defs[p.owner],millions=table[p.owner]??(d?.manpower||50000)/15000;pop[p.id]=millions*1e6*weights[p.id]/totals.get(p.owner);}
    this._pop=pop;this._popWorld=this.world;return pop;
  };
  Engine.prototype.population16=function(id){
    const pop=this.provincePopulation16();let total=0;
    for(const p of this.ownedToday16(id)){const st=this.s.provinces[p.id];total+=pop[p.id]*((st.own??p.owner)===id||p.owner===id||this.isCore(id,p.id)?1:.15);}
    return total;
  };
  Engine.prototype.mobilize16=function(id,c,L=this.laws16(c)){
    if(!Number.isFinite(c.mobilized16))c.mobilized16=this.mobilizedNow16(id);
    const share=(L.conscription.share??.015)*(1+(c.bonus.recruitment||0));
    const target=this.population16(id)*share,gap=target-c.mobilized16;
    if(gap>0){const flow=Math.min(gap,gap*.003*(L.conscription.recruit??1)+100);c.manpower+=flow;c.mobilized16+=flow;}
    c.pool=Math.max(0,Math.round(gap));
  };
  Engine.prototype.mobilizedNow16=function(id){
    const c=this.nation(id);let men=c.manpower+(c.casualties||0);
    for(const u of this.s.units)if(u.owner===id)men+=this.unitStats16(u).men*u.strength;
    for(const t of c.training)men+=templateStats16(t.template).men;
    return men;
  };
  // Daily cache of controlled provinces: economy and AI tolerate a one-day lag.
  Engine.prototype.ownedToday16=function(id){
    if(this._ownedDay!==this.s.day||this._ownedState!==this.s){
      this._ownedDay=this.s.day;this._ownedState=this.s;this._owned=new Map();
      for(const p of this.prov){const k=this.s.provinces[p.id].ctrl;if(!this._owned.has(k))this._owned.set(k,[]);this._owned.get(k).push(p);}
    }
    return this._owned.get(id)||[];
  };

  // Shared building slots per state.
  const construct15=Engine.prototype.construct;
  Engine.prototype.construct=function(id,pid,kind){
    const b=this.catalog.buildings[kind],c=this.nation(id);
    assert(b,'Bâtiment inconnu.');
    if(b.coast)assert(this.prov[pid]?.coast,'Ce bâtiment exige un littoral.');
    if(b.tech)assert(c.tech.includes(b.tech),'Technologie requise : '+(this.tech(b.tech)?.name||b.tech)+'.');
    if(b.shared&&this.prov[pid]){
      const sid=this.stateId(pid),cap=this.stateCapacity(sid,id),used=this.stateUsed(sid)+this.stateQueued(sid,id);
      assert(used<cap,'Emplacements de l’État saturés ('+used+' / '+cap+') : '+this.states16.list[sid].name+'.');
    }
    return construct15.call(this,id,pid,kind);
  };
  // A focus or event that adds factories to the capital also adds the slots.
  const effect15=Engine.prototype.effect;
  Engine.prototype.effect=function(id,effect={}){
    const result=effect15.call(this,id,effect);
    if(this.s.stateExtra&&this.nation(id)){
      const sid=this.stateId(this.cap(id)),added=sum(['civ','mil','dock'].map(k=>Math.max(0,effect[k]||0)));
      if(sid>=0&&added)this.s.stateExtra[sid]=Math.max(this.s.stateExtra[sid],this.stateUsed(sid)-this.states16.list[sid].slots);
    }
    return result;
  };

  // ---------------------------------------------------------------------------
  // Hot paths sized for the 1.7 map (about 11,600 provinces).
  // ---------------------------------------------------------------------------
  Engine.prototype.owned=function(id){
    const out=[],S=this.s.provinces,P=this.prov;
    for(let i=0;i<S.length;i++)if(S[i].ctrl===id)out.push(P[i]);
    return out;
  };
  Engine.prototype.allies=function(a,b){
    if(a===b)return true;
    const A=this.s.countries[a],B=this.s.countries[b];
    return !!(A&&B&&A.faction!=='none'&&A.faction===B.faction);
  };
  // Provinces of a country that touch land held by someone else (daily).
  Engine.prototype.rim16=function(id){
    if(this._rimDay!==this.s.day||this._rimState!==this.s){this._rimDay=this.s.day;this._rimState=this.s;this._rim=new Map();}
    let list=this._rim.get(id);if(list)return list;
    const S=this.s.provinces;list=this.ownedToday16(id).filter(p=>S[p.id].ctrl===id&&p.neighbors.some(n=>S[n].ctrl!==id));
    this._rim.set(id,list);return list;
  };
  // The largest city still held when the capital is lost.
  Engine.prototype.cap=function(id){
    const c=this.nation(id),S=this.s.provinces;if(S[c.identity.capital]?.ctrl===id)return c.identity.capital;
    let best=null;for(const p of this.ownedToday16(id))if(S[p.id].ctrl===id&&(!best||p.vp>best.vp))best=p;
    if(!best)best=this.owned(id).sort((a,b)=>b.vp-a.vp)[0];
    return best?.id??c.identity.capital;
  };
  // Distances between neighbouring provinces, in units of 100 km: supply
  // losses and movement times follow the real distance, so ranges in
  // kilometres do not depend on the size of the provinces.
  const SPAN_KM=100;
  Engine.prototype.edgeSpan16=function(){
    if(this._spanWorld===this.world)return this._span;
    this._spanWorld=this.world;
    return this._span=this.prov.map(p=>Float32Array.from(p.neighbors,n=>clamp(distance(p,this.prov[n])/SPAN_KM,.3,1.5)));
  };
  Engine.prototype.span16=function(a,b){
    const k=this.prov[a].neighbors.indexOf(b);
    return k<0?1:this.edgeSpan16()[a][k];
  };
  // Dijkstra with buffers reused between calls and passability cached per
  // controller; same costs and rules as the 1.0 search.
  let pathBuffers=null;
  Engine.prototype.path=function(from,to,id,sea=true){
    if(from===to)return [];
    const P=this.prov,S=this.s.provinces,n=P.length;
    if(!P[to])return null;
    if(!pathBuffers||pathBuffers.n!==n)pathBuffers={n,dist:new Float64Array(n),prev:new Int32Array(n),stamp:new Uint32Array(n),gen:0};
    const B=pathBuffers;B.gen=(B.gen+1)>>>0;if(!B.gen){B.stamp.fill(0);B.gen=1;}
    const gen=B.gen,dist=B.dist,prev=B.prev,stamp=B.stamp,terrain=this.catalog.terrain;
    const pass=new Map(),passOf=k=>{let v=pass.get(k);if(v===undefined){const w=this.war(id,k);v=this.access(id,k)||w?(w?3:1):0;pass.set(k,v);}return v;};
    const dmz=id==='GER'&&this.s.historyState?.dmz?.length&&!this.enemies('GER').length?new Set(this.s.historyState.dmz):null;
    const hv=[],hd=[];
    const push=(v,d)=>{let i=hv.length;hv.push(v);hd.push(d);while(i>0){const p=(i-1)>>1;if(hd[p]<=d)break;hv[i]=hv[p];hd[i]=hd[p];i=p;}hv[i]=v;hd[i]=d;};
    const relax=(u,v,cost)=>{const nd=dist[u]+cost;if(stamp[v]!==gen||nd<dist[v]){stamp[v]=gen;dist[v]=nd;prev[v]=u;push(v,nd);}};
    stamp[from]=gen;dist[from]=0;prev[from]=-1;push(from,0);
    while(hv.length){
      const u=hv[0],d=hd[0],lv=hv.pop(),ld=hd.pop();
      if(hv.length){let i=0;const m=hv.length;while(i*2+1<m){let c=i*2+1;if(c+1<m&&hd[c+1]<hd[c])c++;if(hd[c]>=ld)break;hv[i]=hv[c];hd[i]=hd[c];i=c;}hv[i]=lv;hd[i]=ld;}
      if(d>dist[u])continue;if(u===to)break;
      for(const v of P[u].neighbors){
        if(dmz&&dmz.has(v))continue;const m=passOf(S[v].ctrl);if(!m)continue;
        relax(u,v,terrain[P[v].terrain].move*m);
      }
      if(sea&&S[u].port)for(const e of P[u].sea){
        const q=S[e.to];if(!q.port||dmz&&dmz.has(e.to)||!passOf(q.ctrl))continue;
        if(!this.seaAllowed(id,{...e,sea:true},q.ctrl))continue;
        relax(u,e.to,e.days+2);
      }
    }
    if(stamp[to]!==gen||!Number.isFinite(dist[to]))return null;
    const result=[];for(let v=to;v!==from;v=prev[v]){if(v<0)return null;result.push(v);}return result.reverse();
  };

  // Weather and terrain attrition, applied once per day after combat.
  Engine.prototype.attritionStep=function(){
    for(const u of this.s.units){
      if(u.strength<=0)continue;
      const w=this.weather(u.pid),t=this.catalog.terrain[this.prov[u.pid].terrain],c=this.nation(u.owner);
      const rate=((w.attrition||0)+(t.attrition||0))*(1-clamp(c?.bonus.attrition||0,0,.8));
      if(rate<=0)continue;
      const exposure=1.15-u.supply;
      if(exposure<=0)continue;
      this.loss(u,rate*.0012*exposure,rate*1.1*exposure);
    }
  };

  // The 1.5 history step refreshes statistics every day; only do it when an
  // event actually applied something (inner calls request a refresh).
  const historicalStep15=Engine.prototype.historicalStep;
  Engine.prototype.historicalStep=function(){
    const real=this.updateStats;let requests=0;
    this.updateStats=function(){requests++;};
    try{historicalStep15.call(this);}finally{delete this.updateStats;if(this.updateStats!==real)this.updateStats=real;}
    if(requests>1)this.updateStats();
  };

  // ---------------------------------------------------------------------------
  // Daily loop. Same order as 1.5 with the 1.6 steps added.
  // ---------------------------------------------------------------------------
  Engine.prototype.tick=function(days=1){
    assert(Number.isInteger(days)&&days>=1&&days<=10000,'Nombre de jours invalide.');
    for(let i=0;i<days;i++){
      if(this.s.pending||this.s.outcome||this.blocked16?.())break;
      this.s.day++;this.ensure16();this.indexUnits();this.updateStats();
      for(const id of this.active())this.economics(id);
      this.strategyAI();
      if(this.s.day%2===0){this.computeSupply();this.armyAI();}
      this.airStep();this.navalStep();this.intelStep();this.militaryStep();this.attritionStep();
      if(this.s.day%3===0)this.checkCapitulations();
      this.eventsStep();this.releaseDay();this.day16?.();
      this.s.tension=clamp(this.s.tension-(this.s.wars.length?0:.015),0,100);
      if(this.s.day%30===0){
        for(const id of this.active()){
          const c=this.nation(id);c.history.push({day:this.s.day,civ:c.stats.civ,mil:c.stats.mil,divisions:c.stats.divisionCount,losses:c.casualties});if(c.history.length>160)c.history.shift();
        }
        this.checkInvariants();
      }
      this.s.revision++;
    }
    return this.s;
  };

  const dayHooks=[];
  Engine.onDay16=fn=>dayHooks.push(fn);
  Engine.prototype.day16=function(){for(const h of dayHooks)h.call(this);};

  // ---------------------------------------------------------------------------
  // Commands
  // ---------------------------------------------------------------------------
  const NOT_HANDLED=Symbol('not handled');
  const handlers=new Map();
  Engine.command16=(name,fn)=>handlers.set(name,fn);
  const invariants=[];
  Engine.invariant16=fn=>invariants.push(fn);
  const execute15=Engine.prototype.execute;
  Engine.prototype.execute=function(action,p){
    const handler=handlers.get(action);
    if(handler){
      const id=this.s.player,c=this.nation(id);
      if(!['pause','speed','event','continue'].includes(action)&&!(handler.allowDead))assert(c.alive,'Le gouvernement a capitulé.');
      const result=handler.call(this,p||{},id,c);
      if(result!==NOT_HANDLED)return result;
    }
    return execute15.call(this,action,p);
  };
  Engine.NOT_HANDLED16=NOT_HANDLED;
  const pp=(c,n)=>assert(c.pp>=n,'Il faut '+n+' points politiques.');
  Engine.requirePP16=pp;

  Engine.command16('law',function(p,id,c){
    if(p.kind==='occupation')return NOT_HANDLED;
    const kinds=this.catalog.laws||{};
    assert(['economy','conscription','trade'].includes(p.kind)&&kinds[p.kind],'Type de loi inconnu.');
    const list=kinds[p.kind];
    // 1.5 interface compatibility: "conscription" without value raises one level.
    const value=p.kind==='conscription'&&p.value===undefined?list[Math.min(list.length-1,c.conscription+1)]?.id:p.value;
    const next=list.find(l=>l.id===value);assert(next,'Loi inconnue.');
    const current=p.kind==='conscription'?list[c.conscription]:list.find(l=>l.id===(p.kind==='economy'?c.economy:c.trade));
    assert(current?.id!==next.id,'Loi déjà en vigueur.');
    const atWar=this.enemies(id).length>0;
    if(next.war)assert(atWar,'Cette loi exige une guerre en cours.');
    if(next.tension&&!atWar)assert(this.s.tension>=next.tension||c.support>=60,'Tension mondiale insuffisante ('+next.tension+' % requis) ou soutien à la guerre inférieur à 60 %.');
    pp(c,next.cost);c.pp-=next.cost;
    if(p.kind==='economy'){c.economy=next.id;c.stability=clamp(c.stability-4+(next.stability||0),0,100);}
    else if(p.kind==='trade')c.trade=next.id;
    else {
      const index=list.indexOf(next),delta=(next.pool||1)-(current.pool||1),raising=index>c.conscription;
      c.pool=Math.max(0,c.pool+c.identity.manpower*delta);c.conscription=index;
      c.stability=clamp(c.stability-(raising?6:0)+(next.stability||0),0,100);
    }
    this.updateStats();
  });
  Engine.command16('trade',function(p,id,c){
    const t=this.nation(p.target);assert(t?.alive&&p.target!==id,'Pays cible invalide.');
    assert(!this.war(id,p.target),'Commerce impossible avec un ennemi.');assert(RESOURCES.includes(p.resource),'Ressource inconnue.');
    assert(c.trades.length<12&&c.stats.freeCiv>0,'Une usine civile libre est nécessaire.');
    assert(t.stats[p.resource]*(this.laws16(t).trade.export??.5)>=4,'Capacité d’exportation insuffisante.');
    c.trades.push({id:this.s.uid++,from:p.target,resource:p.resource,active:false});this.updateStats();
  });

  // ---------------------------------------------------------------------------
  // Divisions: twenty battalion types and fifteen support companies.
  // Templates keep the 1.5 summary fields (inf/art/tank/motor and flags) so
  // older code paths and saves keep working; "bat"/"sup" are authoritative.
  // ---------------------------------------------------------------------------
  let CATALOG=null;
  const BAT=new Map(),SUP=new Map(),MODULES=new Map(),MODELS=new Map();
  let statsCache=new WeakMap();
  Engine.useCatalog16=function(catalog){
    if(CATALOG===catalog)return;
    CATALOG=catalog;BAT.clear();SUP.clear();MODULES.clear();MODELS.clear();statsCache=new WeakMap();
    for(const b of catalog.battalions||[])BAT.set(b.id,b);
    for(const s of catalog.supports||[])SUP.set(s.id,s);
    for(const m of catalog.modules||[])MODULES.set(m.id,m);
    for(const [type,list] of Object.entries(catalog.models||{}))for(const m of list)MODELS.set(m.id,{...m,type});
    Engine.STATE_CATEGORIES16=catalog.stateCategories;
  };
  const LEGACY_BAT={inf:'infantry',art:'artillery',tank:'medium_tank',motor:'motorized'};
  const LEGACY_SUP={engineer:'engineer',logistics:'logistics',recon:'recon',antiTank:'at_support',hospital:'hospital'};
  Engine.normalizeTemplate16=function(t){
    if(t?.bat)return {bat:t.bat,sup:t.sup||[]};
    const bat={};for(const [k,id] of Object.entries(LEGACY_BAT))if(t?.[k]>0)bat[id]=t[k];
    return {bat,sup:Object.entries(LEGACY_SUP).filter(([k])=>t?.[k]).map(([,id])=>id)};
  };
  Engine.legacyFields16=function(bat,sup){
    const counts={inf:0,art:0,tank:0,motor:0};
    for(const [id,n] of Object.entries(bat)){const g=BAT.get(id)?.group;if(g)counts[g]+=n;}
    for(const k in counts)counts[k]=Math.min(15,counts[k]);
    return {...counts,engineer:sup.includes('engineer'),logistics:sup.includes('logistics'),recon:sup.includes('recon')||sup.includes('armored_recon'),antiTank:sup.includes('at_support'),hospital:sup.includes('hospital')};
  };
  const sv=(stats,k)=>stats?.[k]??1;
  // mul(b) returns the equipment multipliers applied to one battalion.
  function divisionStats(bat,sup,mul=null){
    let men=0,width=0,soft=0,hard=0,defense=0,breakthrough=0,ap=0,orgSum=0,n=0,maxArmor=0,armorSum=0,maxPierce=0,pierceSum=0,hardSum=0,speed=Infinity,reliability=0;
    const eq={},terrain={},special={amphibious:0,paradrop:0,police:0},groups={inf:0,art:0,tank:0,motor:0};
    for(const [id,count] of Object.entries(bat)){
      const b=BAT.get(id);if(!b||!(count>0))continue;
      const q=mul?mul(b):null;
      men+=b.men*count;width+=b.width*count;n+=count;groups[b.group]+=count;
      soft+=b.soft*count*sv(q,'attack');hard+=b.hard*count*sv(q,'attack');defense+=b.defense*count*sv(q,'defense');
      breakthrough+=b.breakthrough*count*sv(q,'breakthrough');ap+=b.ap*count*sv(q,'air');
      orgSum+=b.org*count;hardSum+=b.hardness*count;reliability+=sv(q,'reliability')*count;
      const armor=b.armor*sv(q,'armor'),pierce=b.piercing*sv(q,'piercing');
      maxArmor=Math.max(maxArmor,armor);armorSum+=armor*count;maxPierce=Math.max(maxPierce,pierce);pierceSum+=pierce*count;
      speed=Math.min(speed,b.speed*sv(q,'speed'));
      for(const [k,v] of Object.entries(b.eq))eq[k]=(eq[k]||0)+v*count;
      for(const [terr,mods] of Object.entries(b.terrain||{})){terrain[terr]??={attack:0,defense:0,move:0};for(const k of ['attack','defense','move'])terrain[terr][k]+=(mods[k]||0)*count;}
      if(b.special?.amphibious)special.amphibious+=b.special.amphibious*count;
      if(b.special?.paradrop)special.paradrop+=count;
      if(b.special?.police)special.police+=b.special.police*count;
    }
    const mods={entrench:0,river:0,supply:0,supplyUse:0,casualtyReturn:0,reinforce:0,police:0,reliability:0,airShield:0,fortAttack:0,recon:0};
    let supSpeed=0,supOrg=0,supAttack=0;
    for(const id of sup){
      const s=SUP.get(id);if(!s)continue;men+=s.men;
      for(const [k,v] of Object.entries(s.eq))eq[k]=(eq[k]||0)+v;
      const m=s.mods||{};
      defense+=m.defense||0;soft+=m.soft||0;hard+=m.hard||0;ap+=m.ap||0;breakthrough+=m.breakthrough||0;
      if(m.piercing)maxPierce=Math.max(maxPierce,m.piercing);
      supSpeed+=m.speed||0;supOrg+=m.org||0;supAttack+=m.attack||0;
      for(const k of Object.keys(mods))if(m[k])mods[k]+=m[k];
    }
    if(n){for(const t of Object.values(terrain))for(const k in t)t[k]/=n;special.amphibious/=n;special.paradrop=special.paradrop===groups.inf&&groups.inf===n?1:0;special.police=special.police/n+mods.police;}
    soft*=1+supAttack;hard*=1+supAttack;
    return {men,width,soft,hard,defense,breakthrough,ap,
      armor:n?maxArmor*.4+armorSum/n*.6:0,piercing:n?maxPierce*.4+pierceSum/n*.6:maxPierce,
      hardness:n?hardSum/n:0,orgMax:n?orgSum/n+supOrg:40,speed:(speed===Infinity?1:speed)*(1+supSpeed),
      reliability:(n?reliability/n:1)+mods.reliability,eq,terrain,special,mods,battalions:n,
      ...groups,recon:mods.recon>0,engineer:sup.includes('engineer'),logistics:sup.includes('logistics'),antiTank:sup.includes('at_support'),hospital:sup.includes('hospital')};
  }
  const legacyTemplateStats=H.getTemplateStats();
  const templateStats16=t=>{
    if(!CATALOG?.battalions)return legacyTemplateStats(t);
    let s=statsCache.get(t);if(s)return s;
    const {bat,sup}=Engine.normalizeTemplate16(t);
    s=divisionStats(bat,sup);statsCache.set(t,s);return s;
  };
  H.setTemplateStats(templateStats16);
  Engine.templateStats=t=>templateStats16(t);
  // Division statistics with the owner's equipment quality, cached per day.
  const unitCache=new WeakMap();
  Engine.prototype.unitStats16=function(u){
    const hit=unitCache.get(u.template);
    if(hit&&hit.day===this.s.day&&hit.owner===u.owner&&hit.state===this.s)return hit.stats;
    const c=this.nation(u.owner),{bat,sup}=Engine.normalizeTemplate16(u.template);
    const stats=divisionStats(bat,sup,b=>c?.eqStats?.[Object.keys(b.eq)[0]]);
    if(c?.bonus.reliability)stats.reliability+=c.bonus.reliability;
    unitCache.set(u.template,{day:this.s.day,owner:u.owner,state:this.s,stats});
    return stats;
  };
  // Medical doctrines return part of the wounded to the manpower pool.
  const loss15=Engine.prototype.loss;
  Engine.prototype.loss=function(u,strength,org){
    const before=u.strength;loss15.call(this,u,strength,org);
    const c=this.nation(u.owner);if(c?.bonus.casualties>0&&before>u.strength)c.manpower+=(before-u.strength)*this.unitStats16(u).men*Math.min(.5,c.bonus.casualties);
  };
  Engine.prototype.unlocked16=function(c,item){return !item?.tech||c.tech.includes(item.tech);};
  Engine.prototype.buildTemplate16=function(c,p,id){
    assert(p.bat&&typeof p.bat==='object'&&!Array.isArray(p.bat),'Composition invalide.');
    const bat={};let total=0;
    for(const [k,n] of Object.entries(p.bat)){
      if(n===0)continue;
      const b=BAT.get(k);assert(b,'Bataillon inconnu : '+k);assert(Number.isInteger(n)&&n>0&&n<=25,'Nombre de bataillons invalide.');
      assert(this.unlocked16(c,b),'Technologie requise pour '+b.name+'.');bat[k]=n;total+=n;
    }
    assert(total>=1&&total<=25,'Une division compte de 1 à 25 bataillons.');
    const sup=[...new Set(p.sup||[])];assert(Array.isArray(p.sup||[])&&sup.length<=5,'Cinq compagnies de soutien au maximum.');
    for(const k of sup){const s=SUP.get(k);assert(s,'Soutien inconnu : '+k);assert(this.unlocked16(c,s),'Technologie requise pour '+s.name+'.');}
    const t={id,name:String(p.name||'Division personnalisée').slice(0,70),bat,sup,...Engine.legacyFields16(bat,sup)};
    const st=templateStats16(t);assert(st.width>=2&&st.width<=45,'Largeur comprise entre 2 et 45 requise.');
    return t;
  };
  Engine.command16('template',function(p,id,c){
    if(p.bat===undefined)return NOT_HANDLED;
    assert(c.xp>=15,'Il faut 15 points d’expérience.');assert(c.templates.length<24,'Maximum : 24 modèles.');
    const t=this.buildTemplate16(c,p,'custom_'+this.s.uid++);c.xp-=15;c.templates.push(t);return t.id;
  });
  Engine.command16('templateEdit',function(p,id,c){
    const i=c.templates.findIndex(t=>t.id===p.id);assert(i>=0,'Modèle inconnu.');assert(c.xp>=5,'Il faut 5 points d’expérience.');
    c.templates[i]=this.buildTemplate16(c,p,p.id);c.xp-=5;return p.id;
  });
  Engine.command16('templateDelete',function(p,id,c){
    assert(c.templates.some(t=>t.id===p.id),'Modèle inconnu.');assert(c.templates.length>1,'Conservez au moins un modèle.');
    c.templates=c.templates.filter(t=>t.id!==p.id);
  });

  // ---------------------------------------------------------------------------
  // Equipment: generations, designs, stock quality and modernization.
  // c.eqStats[type] is the stock-weighted average of the produced models.
  // ---------------------------------------------------------------------------
  Engine.prototype.models16=function(c,type){
    return [...(CATALOG.models?.[type]||[]).map(m=>MODELS.get(m.id)),...(c.designs||[]).filter(d=>d.type===type)];
  };
  Engine.prototype.lineModel16=function(c,type){
    const list=this.models16(c,type).filter(m=>this.unlocked16(c,m));
    if(!list.length)return null;
    return list.find(m=>m.id===c.lines?.[type])||list.filter(m=>!m.base).at(-1)||list.at(-1);
  };
  const blend=(target,amount,stats,added)=>{
    if(added<=0)return;
    const total=Math.max(0,amount)+added,w=added/total;
    for(const k of new Set([...Object.keys(target),...Object.keys(stats||{})])){
      const v=sv(target,k)*(1-w)+sv(stats,k)*w;
      if(Math.abs(v-1)<1e-4)delete target[k];else target[k]=+v.toFixed(4);
    }
  };
  Engine.designStats16=function(type,baseId,modules){
    const base=MODELS.get(baseId),family=CATALOG.equipment[type]?.family;
    assert(base&&base.type===type&&family,'Châssis inconnu.');
    const stats={...base.stats};let cost=base.cost||1;
    for(const slot of CATALOG.designSlots[family]){
      const m=MODULES.get(modules?.[slot]);
      assert(m&&m.slot===slot&&m.families.includes(family)&&(!m.types||m.types.includes(type)),'Module invalide : '+slot+'.');
      for(const [k,v] of Object.entries(m.stats||{}))stats[k]=+(sv(stats,k)*v).toFixed(4);
      cost*=m.cost||1;
    }
    return {stats,cost:+cost.toFixed(3)};
  };
  Engine.prototype.produce16=function(id,key,amount){
    const c=this.nation(id),m=this.lineModel16(c,key);
    if(!m){c.stock[key]+=amount;return;}
    let items=amount/(m.cost||1);
    c.eqStats??={};c.eqStats[key]??={};
    if(c.modernize?.[key]&&c.stock[key]>1){
      // Half of the line rebuilds existing equipment: three upgrades per new item.
      const upgraded=Math.min(c.stock[key],items*1.5);
      blend(c.eqStats[key],c.stock[key]-upgraded,m.stats,upgraded);
      items*=.5;
    }
    blend(c.eqStats[key],c.stock[key],m.stats,items);
    c.stock[key]+=items;
  };
  Engine.prototype.transferEquipment16=function(from,to,key,amount){
    const a=this.nation(from),b=this.nation(to);if(!a||!b||amount<=0)return;
    b.eqStats??={};b.eqStats[key]??={};blend(b.eqStats[key],b.stock[key],a.eqStats?.[key]||{},amount);
    a.stock[key]-=amount;b.stock[key]+=amount;
  };
  Engine.prototype.quality16=function(c,key){
    const s=c.eqStats?.[key]||{},keys=['attack','defense','armor','piercing','air','ground','naval','hp'].filter(k=>s[k]!==undefined);
    return keys.length?sum(keys.map(k=>s[k]))/keys.length:1;
  };
  Engine.command16('design',function(p,id,c){
    const e=this.catalog.equipment[p.type];assert(e?.family,'Cet équipement ne se conçoit pas.');
    const base=MODELS.get(p.base);assert(base?.type===p.type&&this.unlocked16(c,base),'Châssis indisponible.');
    for(const mid of Object.values(p.modules||{})){const m=MODULES.get(mid);assert(m&&this.unlocked16(c,m),'Module verrouillé : '+(m?.name||mid)+'.');}
    const {stats,cost}=Engine.designStats16(p.type,p.base,p.modules);
    c.designs??=[];assert(c.designs.length<40,'Quarante conceptions au maximum.');
    const design={id:'design_'+this.s.uid++,type:p.type,name:String(p.name||'Conception').slice(0,60),base:p.base,modules:{...p.modules},stats,cost,year:base.year,day:this.s.day,design:true};
    c.designs.push(design);
    if(p.produce){c.lines??={};c.lines[p.type]=design.id;}
    return design.id;
  });
  Engine.command16('designDelete',function(p,id,c){
    assert((c.designs||[]).some(d=>d.id===p.id),'Conception inconnue.');
    c.designs=c.designs.filter(d=>d.id!==p.id);
    for(const [k,v] of Object.entries(c.lines||{}))if(v===p.id)delete c.lines[k];
  });
  Engine.command16('productionModel',function(p,id,c){
    assert(this.catalog.equipment[p.key],'Équipement inconnu.');
    const m=this.models16(c,p.key).find(m=>m.id===p.model);assert(m&&this.unlocked16(c,m),'Modèle indisponible.');
    c.lines??={};if(c.lines[p.key]===m.id)return;
    c.lines[p.key]=m.id;c.efficiency[p.key]=Math.max(.1,c.efficiency[p.key]*.7);
  });
  Engine.command16('modernize',function(p,id,c){
    assert(this.catalog.equipment[p.key],'Équipement inconnu.');c.modernize??={};c.modernize[p.key]=!!p.value;
  });
  Engine.command16('production',function(p,id,c){
    if(p.delta>0&&this.catalog.equipment[p.key])assert(this.lineModel16(c,p.key),'Aucun modèle disponible : une technologie est requise.');
    return NOT_HANDLED;
  });
  // Starting arsenals for the equipment added in 1.6 (game values).
  Engine.prototype.startingEquipment16=function(){
    for(const [id,c] of Object.entries(this.s.countries)){
      const d=this.defs[id]||c.identity,mil=d.mil||0,air=d.air||0;
      const light=Math.round(c.stock.tanks*.6);c.stock.lightTanks+=light;c.stock.tanks-=light;
      c.stock.antiTank+=mil*25;c.stock.antiAir+=mil*20;c.stock.armoredCars+=mil*8;
      const cas=Math.round(c.stock.bombers*.3);c.stock.cas+=cas;c.stock.bombers-=cas;
      if(['JPN','USA','GBR','ITA'].includes(id))c.stock.navalBombers+=Math.round(air*.06);
      if(mil>=15)c.stock.transportPlanes+=20;
    }
  };

  // ---------------------------------------------------------------------------
  // Land combat: battles last several days and are resolved hour by hour.
  // Each side fills the combat width from its pool; the rest waits in reserve
  // and enters when a front-line division withdraws. Soft/hard attacks are
  // weighed by the target's hardness and compared with defence (defender) or
  // breakthrough (attacker): attacks beyond that value hit four times as often.
  // ---------------------------------------------------------------------------
  const HIT_IN=.1,HIT_OVER=.4,ORG_PER_HIT=3.6,STRENGTH_PER_HIT=.00011;
  Engine.prototype.strait16=function(a,b){const key=a<b?a+':'+b:b+':'+a;return !!this.world.straits?.[key];};
  Engine.prototype.combatProfile16=function(u,pid,offense,ctx){
    const c=this.nation(u.owner),st=this.unitStats16(u),army=ctx.armies.get(u.army),g=this.general(army);
    const terrainKey=this.prov[pid].terrain,terr=st.terrain?.[terrainKey]||{},tactic=army?.tactic||'balanced';
    let m=(1+(offense?c.bonus.attack:c.bonus.defense)+(g?(offense?g.attack:g.defense)*.035*this.commandSpan16(army):0))*(.2+.8*u.supply);
    m*=1+Math.min(.2,u.xp*.05)+this.groupModifier(army,offense);
    if(u.owner!==this.s.player)m*=this.s.difficulty==='veteran'?1.12:this.s.difficulty==='relaxed'?.88:1;
    if(st.armor&&c.stock.fuel<10)m*=.5;
    if(u.pocketed)m*=offense?.7:.58;
    const enemyShield=offense?ctx.shieldD:ctx.shieldA;
    m*=1+clamp(this.airSupport?.[u.owner+'_'+this.prov[pid].zone]||0,0,.35)*(1+c.bonus.air)*(1-enemyShield);
    let attack=m,defense=m;
    if(offense){
      attack*=(1+(terr.attack||0))*ctx.weather.attack*(1+(army?army.planning*.2:0)+c.bonus.planning);
      if(st.recon)attack*=1.05;if(st.tank&&st.motor)attack*=1.06;
      if(tactic==='spearhead')attack*=1.16;if(tactic==='elastic')attack*=.88;
      if(u.landing16?.airborne)attack*=.75*(1+c.bonus.paradrop);
      else if(u.landing16)attack*=(.4+.6*(st.special?.amphibious||0))*(1+c.bonus.invasion);
      else if(this.strait16(u.pid,pid))attack*=.55;
      else{const river=this.riverAttackFactor(u,pid);if(river<1)attack*=Math.min(1,river+(st.mods?.river||0)*.4);}
      defense=attack;
    }else{
      const fort=Math.max(0,this.s.provinces[pid].fort*(1-ctx.fortAttack));
      defense*=this.catalog.terrain[terrainKey].defense*(1+fort*.15)*(1+u.entrench*.025*(1+(st.mods?.entrench||0)+c.bonus.entrench))*(1+(terr.defense||0));
      if(tactic==='elastic')defense*=1.14;
      if(ctx.amphibious)defense*=1+this.s.provinces[pid].coastalFort*.12;
      attack=m*(1+(terr.attack||0)*.5);
    }
    return {u,st,soft:st.soft*attack,hard:st.hard*attack,defense:st.defense*defense,breakthrough:st.breakthrough*(offense?attack*(1+c.bonus.breakthrough):defense),
      armor:st.armor*(1+c.bonus.armor),piercing:st.piercing*(1+c.bonus.piercing),hardness:st.hardness,orgMax:Math.max(5,st.orgMax*(1+c.bonus.organization)),width:st.width,offense};
  };
  Engine.prototype.fillFront16=function(pool,maxWidth){
    const front=[],reserve=[];let w=0;
    for(const u of [...pool].sort((a,b)=>b.org*b.strength-a.org*a.strength||a.id-b.id)){
      const uw=this.unitStats16(u).width;
      if(!front.length||w+uw<=maxWidth){front.push(u);w+=uw;}else reserve.push(u);
    }
    return {front,reserve,width:w};
  };
  Engine.prototype.militaryStep=function(){
    const day=this.s.day,attacks=new Map(),busy=new Set(),previous=new Map((this.s.battles||[]).map(b=>[b.pid,b]));
    this.indexUnits();
    for(const u of this.s.units){
      if(u.strength<=0||u.retreatUntil>day||!u.path.length)continue;
      const to=u.path[0],ctrl=this.s.provinces[to]?.ctrl;
      if(u.landing16){
        // Amphibious or airborne assault: the division is committed to the target.
        if(u.landing16.to!==to||!this.war(u.owner,ctrl)){u.landing16=null;u.path=[];continue;}
        if(!attacks.has(to))attacks.set(to,[]);attacks.get(to).push(u);continue;
      }
      const e=this.edge(u.pid,to);
      if(this.historyBlocked(u.owner,to)){u.path=[];continue;}
      if(!e||(!this.access(u.owner,ctrl)&&!this.war(u.owner,ctrl))){u.path=[];continue;}
      if(e.sea&&(!this.s.provinces[u.pid].port||!this.s.provinces[to].port||!this.seaAllowed(u.owner,e,ctrl))){u.path=[];continue;}
      // AI divisions land in enemy territory only through a naval invasion.
      if(e.sea&&u.owner!==this.s.player&&!u.landing16&&this.war(u.owner,ctrl)){u.path=[];continue;}
      const st=this.unitStats16(u),weather=this.weather(to),terr=st.terrain?.[this.prov[to].terrain];
      const speed=st.speed*(.25+.75*u.supply)*weather.move*(1+this.nation(u.owner).bonus.speed)*(1+(terr?.move||0));
      if(this.war(u.owner,ctrl)){
        if(u.org<12){u.path=[];continue;}
        if(e.sea){u.progress+=speed;if(u.progress<e.days)continue;}
        // Taking an undefended province means marching through it: fast
        // divisions exploit a breach faster than infantry.
        else if(!(this.unitsAt.get(to)||[]).some(d=>d.strength>0&&this.war(u.owner,d.owner))){u.progress+=speed;if(u.progress<this.catalog.terrain[this.prov[to].terrain].move*1.5)continue;}
        if(!attacks.has(to))attacks.set(to,[]);attacks.get(to).push(u);
      }else{
        u.progress+=speed;u.entrench=0;
        const duration=e.sea?e.days:this.catalog.terrain[this.prov[to].terrain].move*(this.strait16(u.pid,to)?1.5:1)*this.span16(u.pid,to);
        if(u.progress>=duration){u.pid=to;u.path.shift();u.progress=0;if(e.sea)this.nation(u.owner).stock.fuel=Math.max(0,this.nation(u.owner).stock.fuel-40);}
      }
    }
    this.indexUnits();
    const battles=[],armies=new Map(this.s.armies.map(a=>[a.id,a]));
    for(const [pid,all] of attacks){
      const eligible=all.filter(u=>u.strength>0&&this.war(u.owner,this.s.provinces[pid].ctrl));
      if(!eligible.length)continue;
      const old=previous.get(pid),lead=old&&eligible.some(u=>u.owner===old.a)?eligible.find(u=>u.owner===old.a):eligible[0];
      const attackers=eligible.filter(u=>this.allies(lead.owner,u.owner));
      const defenders=(this.unitsAt.get(pid)||[]).filter(u=>u.strength>0&&attackers.some(a=>this.war(a.owner,u.owner)));
      if(!defenders.length){
        if(this.prov[pid].vp>=4||this.prov[pid].city)this.recordCombat({pid,a:lead.owner,b:this.s.provinces[pid].ctrl,outcome:'unopposed',attackers:attackers.length,defenders:0,lossesA:0,lossesD:0,terrain:this.prov[pid].terrain});
        for(const u of attackers)u.landing16=null;
        this.capture(pid,attackers);continue;
      }
      const battle=this.resolveBattle16(pid,attackers,defenders,old,armies,busy);
      if(battle)battles.push(battle);
    }
    this.s.battles=battles;
    for(const u of this.s.units){
      if(u.strength<=0)continue;
      const c=this.nation(u.owner),t=this.unitStats16(u);
      if(!busy.has(u.id)){u.org=clamp(u.org+(u.path.length?3:8)*(.3+u.supply)*(1+(c.bonus.organization||0)),0,100);if(!u.path.length)u.entrench=Math.min(10,u.entrench+1);}
      if(u.supply<.22)this.loss(u,.0015*(1-u.supply),.7);
      if(u.pocketed)this.loss(u,.0025*(1.15-u.supply),1.8);
      if(u.strength<1&&u.supply>.35&&!u.pocketed&&!busy.has(u.id)){
        let change=Math.min(.006*(1+(t.mods?.reinforce||0)),1-u.strength,c.manpower/Math.max(1,t.men));for(const [k,n] of Object.entries(t.eq))if(n)change=Math.min(change,c.stock[k]/n);
        if(change>0){u.strength+=change;c.manpower=Math.max(0,c.manpower-change*t.men);for(const [k,n] of Object.entries(t.eq))c.stock[k]=Math.max(0,c.stock[k]-change*n);}
      }
    }
    this.s.units=this.s.units.filter(u=>u.strength>.04);this.indexUnits();
  };
  Engine.prototype.resolveBattle16=function(pid,attackPool,defendPool,old,armies,busy){
    const terrain=this.catalog.terrain[this.prov[pid].terrain],weather=this.weather(pid);
    const approaches=new Set(attackPool.map(u=>u.landing16?'sea':u.pid)).size;
    const maxWidth=Math.round(terrain.width*Math.min(2,1+.5*(approaches-1)));
    const amphibious=attackPool.some(u=>u.landing16?.amphibious);
    const shield=list=>clamp(sum(list.map(u=>this.unitStats16(u).mods?.airShield||0))/Math.max(1,list.length)+sum(list.map(u=>this.unitStats16(u).ap))/4000,0,.6);
    const ctx={armies,weather,amphibious,shieldA:shield(attackPool),shieldD:shield(defendPool),fortAttack:clamp(Math.max(0,...attackPool.map(u=>this.unitStats16(u).mods?.fortAttack||0)),0,.6)};
    const profiles=new Map();
    const profile=(u,offense)=>{let p=profiles.get(u.id);if(!p){p=this.combatProfile16(u,pid,offense,ctx);profiles.set(u.id,p);}return p;};
    const before=list=>sum(list.map(u=>u.strength*this.unitStats16(u).men));
    const menA=before(attackPool),menD=before(defendPool),intensity=this.s.mod.balance.combat;
    const withdrawn=new Set(),retreated=new Set();
    // Disorganised divisions cannot hold or attack: they leave before the first hour.
    for(const u of attackPool)if(u.org<5)withdrawn.add(u.id);
    for(const u of defendPool)if(u.org<1)retreated.add(u.id);
    let A=this.fillFront16(attackPool.filter(u=>!withdrawn.has(u.id)),maxWidth),D=this.fillFront16(defendPool.filter(u=>!retreated.has(u.id)),maxWidth);
    const strike=(from,to)=>{
      // Damage dealt by side "from" to each division of side "to" during one hour.
      const targets=to.front.filter(u=>!withdrawn.has(u.id)&&!retreated.has(u.id)),totalWidth=sum(targets.map(u=>profile(u,to===A).width))||1;
      if(!targets.length)return;
      const jitter=.9+this.random()*.2;
      for(const t of targets){
        const tp=profile(t,to===A),share=tp.width/totalWidth;
        let attacks=0;
        for(const u of from.front){
          if(withdrawn.has(u.id)||retreated.has(u.id))continue;
          const p=profile(u,from===A),value=(p.soft*(1-tp.hardness)+p.hard*tp.hardness)*u.strength*share;
          attacks+=value*(tp.armor>p.piercing?.5:1);
        }
        const guard=(to===A?tp.breakthrough:tp.defense)*t.strength;
        let hits=(Math.min(attacks,guard)*HIT_IN+Math.max(0,attacks-guard)*HIT_OVER)*jitter*intensity;
        const enemyPierce=Math.max(0,...from.front.map(u=>profile(u,from===A).piercing));
        if(tp.armor>enemyPierce)hits*=.6;
        t.org=clamp(t.org-hits*ORG_PER_HIT/tp.orgMax,0,100);
        this.loss(t,hits*STRENGTH_PER_HIT*(1-tp.hardness*.4),0);
      }
    };
    for(let hour=0;hour<24;hour++){
      if(!A.front.length||!D.front.length)break;
      strike(A,D);strike(D,A);
      for(const u of A.front)if(!withdrawn.has(u.id)&&(u.org<5||u.strength<.1))withdrawn.add(u.id);
      for(const u of D.front)if(!retreated.has(u.id)&&(u.org<1||u.strength<.08))retreated.add(u.id);
      if(hour%4===3||A.front.some(u=>this.unitStats16(u).mods?.reinforce)){
        A=this.fillFront16(attackPool.filter(u=>!withdrawn.has(u.id)),maxWidth);
        D=this.fillFront16(defendPool.filter(u=>!retreated.has(u.id)),maxWidth);
      }else{
        A.front=A.front.filter(u=>!withdrawn.has(u.id));D.front=D.front.filter(u=>!retreated.has(u.id));
      }
    }
    for(const u of [...A.front,...D.front])busy.add(u.id);
    const c=this.nation(attackPool[0].owner);
    for(const u of attackPool){if(A.front.includes(u)){u.xp+=.003;c.xp+=.09;this.nation(u.owner).stock.fuel=Math.max(0,this.nation(u.owner).stock.fuel-(u.template.tank*4+u.template.motor*1.5));}}
    for(const u of defendPool)if(D.front.includes(u)){u.xp+=.003;this.nation(u.owner).xp+=.08;}
    for(const u of attackPool)if(withdrawn.has(u.id)){if(u.landing16?.airborne)this.loss(u,.35,0);u.path=[];u.landing16=null;u.retreatUntil=this.s.day+1;}
    for(const u of defendPool)if(retreated.has(u.id))this.retreat(u);
    const remainingD=defendPool.filter(u=>u.pid===pid&&u.strength>.04&&!retreated.has(u.id));
    const remainingA=attackPool.filter(u=>u.strength>.04&&!withdrawn.has(u.id)&&u.path[0]===pid);
    const lossesA=Math.max(0,Math.round(menA-before(attackPool))),lossesD=Math.max(0,Math.round(menD-before(defendPool)));
    const sumA=sum(remainingA.map(u=>u.org*u.strength)),sumD=sum(remainingD.map(u=>u.org*u.strength));
    const outcome=!remainingD.length&&remainingA.length?'breakthrough':!remainingA.length?'repulsed':'engaged';
    const a=attackPool[0].owner,b=defendPool[0]?.owner||this.s.provinces[pid].ctrl;
    const ap=Math.round(sum(A.front.map(u=>profile(u,true).soft+profile(u,true).hard))),dp=Math.round(sum(D.front.map(u=>profile(u,false).defense)));
    this.recordCombat({pid,a,b,outcome,attackers:attackPool.length,defenders:defendPool.length,lossesA,lossesD,river:attackPool.some(u=>this.riverAttackFactor(u,pid)<1),terrain:this.prov[pid].terrain,ap,dp});
    this.warContribution16?.(a,b,lossesD,lossesA);
    if(outcome==='breakthrough'){for(const u of remainingA)u.landing16=null;this.capture(pid,remainingA);return null;}
    if(outcome==='repulsed'){for(const u of attackPool)if(u.landing16){if(u.landing16.airborne)this.loss(u,.35,0);u.landing16=null;u.path=[];}return null;}
    const startDay=old?.start??this.s.day;
    return {id:old?.id??this.s.uid++,pid,a,b,start:startDay,hours:(old?.hours||0)+24,
      attackers:A.front.map(u=>u.id),defenders:D.front.map(u=>u.id),reserveA:A.reserve.filter(u=>remainingA.includes(u)).map(u=>u.id),reserveD:D.reserve.filter(u=>remainingD.includes(u)).map(u=>u.id),
      ratio:sumA/Math.max(1,sumA+sumD),width:A.width,maxWidth,widthD:D.width,terrain:this.prov[pid].terrain,weather:weather.name,
      river:attackPool.some(u=>this.riverAttackFactor(u,pid)<1),strait:attackPool.some(u=>this.strait16(u.pid,pid)),amphibious,
      ap,dp,lossesA:(old?.lossesA||0)+lossesA,lossesD:(old?.lossesD||0)+lossesD};
  };

  // ---------------------------------------------------------------------------
  // Battle plans: front line (drawn sector or full border), offensive line and
  // fallback line. Planning builds up while the plan waits and is spent as the
  // offensive advances.
  // ---------------------------------------------------------------------------
  Engine.command16('planLine',function(p,id,c){
    const a=this.s.armies.find(a=>a.id===p.army&&a.owner===id);assert(a,'Armée inconnue.');
    assert(['offensive','fallback'].includes(p.kind),'Ligne inconnue.');
    assert(Array.isArray(p.provinces)&&p.provinces.length<=30&&p.provinces.every(pid=>Number.isInteger(pid)&&this.prov[pid]),'Une ligne compte au maximum 30 points.');
    if(p.kind==='fallback')assert(p.provinces.every(pid=>this.access(id,this.s.provinces[pid].ctrl)),'La ligne de repli doit être tracée en territoire accessible.');
    a.plan16??={offensive:[],fallback:[],execute:false};a.plan16[p.kind]=[...new Set(p.provinces)];
    if(p.kind==='offensive'&&p.provinces.length){const ctrl=this.s.provinces[p.provinces.at(-1)].ctrl;if(ctrl!==id&&!this.allies(id,ctrl))a.target=ctrl;}
  });
  Engine.command16('planExecute',function(p,id,c){
    const a=this.s.armies.find(a=>a.id===p.army&&a.owner===id);assert(a,'Armée inconnue.');
    a.plan16??={offensive:[],fallback:[],execute:false};a.plan16.execute=!!p.value;
    if(p.value){assert(a.target&&this.war(id,a.target),'Le plan vise un pays avec lequel vous êtes en guerre.');a.order='attack';a.auto=true;}
    else a.order='defend';
  });
  // Army orders, ported from 1.5 with per-call caches: units grouped by army,
  // borders computed once per (owner, target), access lookups from a matrix.
  // Offensive lines steer the objective; fallback lines replace the front
  // when defending; planning decays while the army is engaged in attacks.
  const armyAI15=Engine.prototype.armyAI;
  Engine.prototype.armyAI=function(){
    const s=this.s,counts=new Uint16Array(this.prov.length),permitted=this.accessMatrix();
    for(const u of s.units)if(u.strength>0)counts[u.pid]++;
    s.fronts={};
    const byArmy=new Map();for(const u of s.units){if(u.army==null)continue;if(!byArmy.has(u.army))byArmy.set(u.army,[]);byArmy.get(u.army).push(u);}
    const engagedArmies=new Set(),unitArmy=new Map(s.units.map(u=>[u.id,u.army])),seaRoutes=new Map();
    for(const b of s.battles)for(const id of b.attackers)engagedArmies.add(unitArmy.get(id));
    const borders=new Map(),fields=this.armyFields16??=new Map();
    if(this.armyFieldsDay16!==s.day||this.armyFieldsState16!==s){fields.clear();this.armyFieldsDay16=s.day;this.armyFieldsState16=s;}
    const border=(owner,target)=>{
      const key=owner+'|'+target;let list=borders.get(key);if(list)return list;
      const set=new Set();
      // Front line: own land and land of allies at war with the target.
      const held=new Map(),front=k=>{let v=held.get(k);if(v===undefined){v=k===owner||!!permitted[owner]?.[k]&&this.war(k,target);held.set(k,v);}return v;};
      for(const p of this.rim16(target))for(const n of p.neighbors)if(front(s.provinces[n].ctrl))set.add(n);
      list=[...set].sort((a,b)=>a-b).map(id=>this.prov[id]);borders.set(key,list);return list;
    };
    for(const a of s.armies){
      if(!a.auto||!a.target||!this.nation(a.owner)?.alive||!this.nation(a.target)?.alive)continue;
      const troops=(byArmy.get(a.id)||[]).filter(u=>u.owner===a.owner);if(!troops.length)continue;
      const plan=a.plan16;
      if(plan?.execute&&a.order!=='attack')a.order='attack';
      const general=this.general(a);
      if(a.order==='attack'&&engagedArmies.has(a.id))a.planning=clamp(a.planning-.015,0,1);
      else a.planning=clamp(a.planning+.02+(general?this.commanderPlanning16(general):0)+this.groupModifier(a,true)*.05,0,1);
      let objective=a.objective!==null&&a.objective!==undefined?this.prov[a.objective]:null;
      if(plan?.offensive?.length&&a.order==='attack'){const next=plan.offensive.find(pid=>!this.allies(a.owner,s.provinces[pid].ctrl))??plan.offensive.at(-1);objective=this.prov[next];}
      let fronts=border(a.owner,a.target);
      const anchors=(plan?.fallback?.length&&a.order==='defend'?plan.fallback:(a.frontSelection||[])).map(id=>this.prov[id]);
      // An AI fallback line replaces the front itself.
      if(plan?.hold16&&a.order==='defend'&&plan.fallback?.length){const line=(plan.line16||plan.fallback).map(id=>this.prov[id]).filter(p=>p&&permitted[a.owner]?.[s.provinces[p.id].ctrl]);if(line.length)fronts=line;}
      else if(anchors.length){const limited=fronts.filter(p=>anchors.some(q=>distance(p,q)<450));if(limited.length)fronts=limited;else if(plan?.fallback?.length&&a.order==='defend')fronts=anchors.filter(p=>permitted[a.owner]?.[s.provinces[p.id].ctrl]);}
      if(!fronts.length){
        a.assessment={status:this.war(a.owner,a.target)?'Préparation maritime':'Aucune frontière terrestre',front:0,friendly:troops.length};
        if(a.owner===s.player)continue;
        continue;
      }
      a.invasion=null;s.fronts[a.id]=fronts.map(p=>p.id);
      const key=a.owner+'_'+a.target+'_'+s.fronts[a.id].join(',');
      let field=fields.get(key);
      // The search stops once every division of the army is reached; a
      // partial field is rebuilt when another army needs more of it.
      if(!field||field.partial&&troops.some(u=>field.dist[u.pid]===-1)){
        const dist=new Int32Array(this.prov.length).fill(-1),next=new Int32Array(this.prov.length).fill(-1),q=[];
        const seeds=[...fronts].sort((x,y)=>s.provinces[y.id].supply-s.provinces[x.id].supply||x.id-y.id);
        for(const p of seeds){dist[p.id]=0;q.push(p.id);}
        const wanted=new Set(troops.map(u=>u.pid));for(const p of seeds)wanted.delete(p.id);
        let partial=false;
        for(let h=0;h<q.length;h++){
          if(!wanted.size){partial=true;break;}
          for(const n of this.prov[q[h]].neighbors){if(dist[n]!==-1||!permitted[a.owner]?.[s.provinces[n].ctrl])continue;dist[n]=dist[q[h]]+1;next[n]=q[h];q.push(n);wanted.delete(n);}
        }
        field={dist,next,partial};fields.set(key,field);
      }
      const enemyIds=new Set();for(const p of fronts)for(const n of p.neighbors)if(s.provinces[n].ctrl===a.target)enemyIds.add(n);
      let enemyCount=0;for(const pid of enemyIds)for(const e of this.unitsAt.get(pid)||[])if(this.war(a.owner,e.owner))enemyCount++;
      a.assessment={status:(a.owner!==s.player&&this.aiPlanLabel16(a))||(a.order==='attack'?'Offensive planifiée':'Tenue du front'),front:fronts.length,friendly:troops.length,enemy:enemyCount,ready:Math.round(100*sum(troops.map(u=>u.org/100*u.supply*u.strength))/troops.length),pockets:troops.filter(u=>u.pocketed).length};
      const reserveCount=troops.length>=8?Math.floor(troops.length*(a.reserveRatio??.15)):0;
      for(const [i,u] of troops.entries()){
        if(u.path.length||u.retreatUntil>s.day||u.landing16||u.invasionPrep16)continue;
        if(u.pocketed||u.org<25||u.supply<.2){
          const safer=this.prov[u.pid].neighbors.filter(n=>permitted[a.owner]?.[s.provinces[n].ctrl]&&!(this.unitsAt.get(n)||[]).some(e=>this.war(a.owner,e.owner))).sort((x,y)=>s.provinces[y].supply-s.provinces[x].supply);
          if(safer.length&&s.provinces[safer[0]].supply>u.supply+.15)u.path=[safer[0]];continue;
        }
        if(field.dist[u.pid]>0){if(i>=troops.length-reserveCount&&field.dist[u.pid]===1)continue;u.path=[field.next[u.pid]];u.progress=0;continue;}
        if(field.dist[u.pid]===-1){
          // No land route (islands, overseas allies): ship the division to the
          // nearest front province, a few per army and day to bound the cost.
          if((s.day+a.id)%3||(seaRoutes.get(a.id)||0)>=3)continue;seaRoutes.set(a.id,(seaRoutes.get(a.id)||0)+1);
          const goal=fronts.slice().sort((x,y)=>distance(x,this.prov[u.pid])-distance(y,this.prov[u.pid])||x.id-y.id)[0];
          const route=goal&&this.path(u.pid,goal.id,a.owner,true);
          if(route?.length&&route.every(pid=>permitted[a.owner]?.[s.provinces[pid].ctrl])){u.path=route;u.progress=0;}
          continue;
        }
        if(field.dist[u.pid]===0&&counts[u.pid]>3){
          const gaps=this.prov[u.pid].neighbors.filter(n=>field.dist[n]===0&&counts[n]+1<counts[u.pid]);
          if(gaps.length){gaps.sort((x,y)=>counts[x]-counts[y]);u.path=[gaps[0]];counts[gaps[0]]++;counts[u.pid]--;continue;}
        }
        if(a.order!=='attack'||!this.war(a.owner,a.target)||u.org<(a.stance==='aggressive'?40:55)||u.strength<.40||u.supply<.25)continue;
        let best=null;
        for(const pid of this.prov[u.pid].neighbors){
          if(s.provinces[pid].ctrl!==a.target)continue;
          const p=this.prov[pid],st=s.provinces[pid];
          // Only the divisions that fit in the combat width fight at once: a
          // deep stack is not stronger than a full line (its reserves only
          // replace the losses), and attackers gain width per direction.
          const terrain=this.catalog.terrain[p.terrain],defenders=[],attackers=[],directions=new Set();
          for(const e of this.unitsAt.get(pid)||[])if(this.war(a.owner,e.owner)){const st16=this.unitStats16(e);defenders.push([st16.defense*e.strength*(.3+.7*e.supply)*(1+Math.min(.5,e.org/200)),st16.width]);}
          for(const n of p.neighbors)for(const e of this.unitsAt.get(n)||[])if(e.owner===a.owner&&e.org>45&&e.supply>.25){const st16=this.unitStats16(e);attackers.push([st16.soft*e.strength*(.3+.7*e.supply),st16.width]);directions.add(n);}
          const frontage=(list,width)=>{list.sort((x,y)=>y[0]-x[0]);let used=0,value=0,extra=0;for(const [v,w] of list){if(used+w<=width||!used){used+=w;value+=v;}else extra+=v;}return value+extra*.05;};
          let defense=frontage(defenders,terrain.width)*terrain.defense*(1+st.fort*.15);
          let attack=frontage(attackers,terrain.width*Math.min(2,1+.5*(directions.size-1)))*(1+a.planning*.2);
          let corridor=0;for(const n of p.neighbors)if(s.provinces[n].ctrl===a.target)corridor++;
          const ratio=attack/Math.max(10,defense),value=p.vp+st.hub*5+st.port*3+(corridor<=2?5:0)+(objective?Math.max(-20,(a.tactic==='spearhead'?60:30)-distance(p,objective)/(a.tactic==='spearhead'?22:35)):0);
          const score=ratio*12+value-counts[pid]*2;
          if(!best||score>best.score||score===best.score&&pid<best.pid)best={pid,ratio,score};
        }
        const threshold=(a.stance==='aggressive'?.55:a.stance==='cautious'?1.35:.92)*(a.tactic==='spearhead'?.87:a.tactic==='elastic'?1.4:1);
        if(best&&best.ratio>=threshold){u.path=[best.pid];u.progress=0;u.entrench=0;}
      }
    }
    // Player armies keep the 1.5 port-to-port landing assistant.
    const overseas=s.armies.filter(a=>a.owner===s.player&&a.auto&&a.target&&a.order==='attack'&&!s.fronts[a.id]&&this.war(a.owner,a.target));
    if(overseas.length&&s.day%6===0){
      const keep=s.armies.filter(a=>!overseas.includes(a)).map(a=>[a,a.auto]),fronts=s.fronts;for(const [a] of keep)a.auto=false;
      try{armyAI15.call(this);}finally{for(const [a,auto] of keep)a.auto=auto;s.fronts={...fronts,...s.fronts};}
    }
  };
  Engine.invariant16(function(state){
    for(const a of state.armies)if(a.plan16?.line16)assert(Array.isArray(a.plan16.line16)&&a.plan16.line16.length<=120&&a.plan16.line16.every(pid=>Number.isInteger(pid)&&this.prov[pid]),'Ligne de repli invalide.');
    for(const a of state.armies)if(a.plan16){
      assert(Array.isArray(a.plan16.offensive)&&a.plan16.offensive.length<=30&&Array.isArray(a.plan16.fallback)&&a.plan16.fallback.length<=30&&typeof a.plan16.execute==='boolean','Plan de bataille invalide.');
      for(const pid of [...a.plan16.offensive,...a.plan16.fallback])assert(Number.isInteger(pid)&&this.prov[pid],'Point de plan invalide.');
    }
    for(const b of state.battles)assert(Number.isInteger(b.pid)&&this.prov[b.pid]&&Array.isArray(b.attackers)&&Array.isArray(b.defenders),'Bataille invalide.');
  });

  // ---------------------------------------------------------------------------
  // Navy: missions, detection, sea control, mines and naval invasions.
  // ---------------------------------------------------------------------------
  const FLEET_MISSIONS=['port','patrol','strike','escort','raid','mines','sweep','invasion'];
  const MISSION_POWER={patrol:1,strike:1.25,escort:1.1,raid:.7,mines:.8,sweep:.8,invasion:1};
  Engine.FLEET_MISSIONS16=FLEET_MISSIONS;
  const shipQuality=(c,k)=>(sv(c.eqStats?.[k],'attack')+sv(c.eqStats?.[k],'hp'))/2;
  Engine.prototype.fleetRating=function(f){
    const ships=f.ships,c=this.nation(f.owner);if(!c)return 0;
    const screens=(ships.destroyers||0)+(ships.cruisers||0)*1.5,capitals=(ships.battleships||0)+(ships.carriers||0),screening=clamp(screens/Math.max(1,capitals*3),.3,1);
    const planes=c.stock.fighters+c.stock.navalBombers*1.3+this.s.wings.filter(w=>w.owner===f.owner&&['fighters','navalBombers'].includes(w.kind)).reduce((n,w)=>n+w.size,0);
    const airReady=c.stock.fuel>50?clamp(planes/Math.max(1,(ships.carriers||0)*65),.25,1)*sv(c.eqStats?.navalBombers,'naval'):.2;
    return ((ships.destroyers||0)*2*shipQuality(c,'destroyers')+(ships.submarines||0)*1.2*shipQuality(c,'submarines')+(ships.cruisers||0)*5*shipQuality(c,'cruisers')+((ships.battleships||0)*13*shipQuality(c,'battleships')+(ships.carriers||0)*15*airReady*shipQuality(c,'carriers'))*screening)*f.strength;
  };
  // Share of sea control held by the side of "id" in a zone (1 when uncontested).
  Engine.prototype.seaShare16=function(id,zone){
    const ctl=this.s.seaControl16?.[zone];if(!ctl)return 1;
    let friend=0,enemy=0;
    for(const [k,v] of Object.entries(ctl)){if(this.allies(id,k))friend+=v;else if(this.war(id,k))enemy+=v;}
    return enemy<=0?1:friend/(friend+enemy);
  };
  Engine.prototype.seaAllowed=function(id,edge,target){
    const c=this.nation(id);if(c.stock.convoys<10||c.stock.fuel<10)return false;
    if(!this.access(id,target)&&!this.war(id,target))return false;
    if(this.war(id,target))for(const z of edge.zones||[])if(this.seaShare16(id,z)<.5)return false;
    return true;
  };
  // ---------------------------------------------------------------------------
  // Sea and air regions (1.8). About 230 sea regions (named seas and pieces of
  // the oceans, made of sea provinces) and 160 air regions. Each region keeps
  // the 1.7 zone it covers as its theatre (seasonal storms, history).
  // ---------------------------------------------------------------------------
  const regionCache=new WeakMap();
  Engine.regions16=function(world){
    let r=regionCache.get(world);if(r)return r;
    const seas=new Map((world.seas||[]).map(z=>[z.id,z])),zones=new Map((world.zones||[]).map(z=>[z.id,z]));
    // Sea routes crossing each region: [port, port] pairs, for convoy raiding.
    const traffic=new Map();
    for(const p of world.provinces)for(const e of p.sea||[])if(e.to>p.id)for(const z of e.zones||[]){if(!traffic.has(z))traffic.set(z,[]);traffic.get(z).push([p.id,e.to]);}
    r={seas,zones,traffic,routes:new Map()};regionCache.set(world,r);return r;
  };
  // Static helpers for map building (mods): region of a 1.7 theatre id, and
  // the sea regions between two regions.
  Engine.regionFor16=function(world,kind,id,pt){
    const list=(kind==='sea'?world.seas:world.zones)||[];if(!id||list.some(z=>z.id===id))return id;
    const pool=list.filter(z=>z.theatre===id);
    return [...(pool.length?pool:list)].sort((a,b)=>distance(a,pt)-distance(b,pt)||String(a.id).localeCompare(String(b.id)))[0]?.id??id;
  };
  Engine.seaPath16=function(world,from,to){
    const seas=new Map((world.seas||[]).map(z=>[z.id,z]));if(!seas.has(from)||!seas.has(to))return [];
    const dist=new Map([[from,0]]),prev=new Map(),todo=[[0,from]];
    while(todo.length){
      todo.sort((a,b)=>b[0]-a[0]);const [d,u]=todo.pop();if(u===to)break;if(d>dist.get(u))continue;
      for(const v of seas.get(u).neighbors||[]){const b=seas.get(v);if(!b)continue;const nd=d+distance(seas.get(u),b);if(nd<(dist.get(v)??Infinity)){dist.set(v,nd);prev.set(v,u);todo.push([nd,v]);}}
    }
    if(!dist.has(to))return [];
    const path=[to];while(path[path.length-1]!==from)path.push(prev.get(path[path.length-1]));return path.reverse();
  };
  Engine.prototype.seaTheatre16=function(zone){return Engine.regions16(this.world).seas.get(zone)?.theatre||zone;};
  Engine.prototype.airTheatre16=function(zone){return Engine.regions16(this.world).zones.get(zone)?.theatre||zone;};
  // Shortest path between two sea regions (km between region centres).
  Engine.prototype.seaRoute16=function(from,to){
    const R=Engine.regions16(this.world);if(!R.seas.has(from)||!R.seas.has(to))return null;
    if(from===to)return {path:[from],km:0};
    let tree=R.routes.get(from);
    if(!tree){
      const dist=new Map([[from,0]]),prev=new Map(),todo=[[0,from]];
      while(todo.length){
        todo.sort((a,b)=>b[0]-a[0]);const [d,u]=todo.pop();if(d>dist.get(u))continue;
        const a=R.seas.get(u);
        for(const v of a.neighbors||[]){const b=R.seas.get(v);if(!b)continue;const nd=d+distance(a,b);if(nd<(dist.get(v)??Infinity)){dist.set(v,nd);prev.set(v,u);todo.push([nd,v]);}}
      }
      tree={dist,prev};R.routes.set(from,tree);
    }
    if(!tree.dist.has(to))return null;
    const path=[to];while(path[path.length-1]!==from)path.push(tree.prev.get(path[path.length-1]));
    return {path:path.reverse(),km:tree.dist.get(to)};
  };
  // Fleets steam about 800 km a day between regions.
  Engine.prototype.seaDays16=function(from,to){
    if(!from||from===to)return 1;const r=this.seaRoute16(from,to);
    return r?clamp(Math.ceil(r.km/800),1,40):5;
  };
  // Convoy traffic of a country through a region (0 to 1): raiders only sink
  // ships on the routes that cross their region.
  Engine.prototype.traffic16=function(id,zone){
    const list=Engine.regions16(this.world).traffic.get(zone);if(!list)return 0;
    let n=0;for(const [a,b] of list){const ka=this.s.provinces[a].ctrl,kb=this.s.provinces[b].ctrl;if(ka===id||kb===id||this.allies(id,ka)&&this.allies(id,kb))n++;}
    return clamp(n/4,0,1);
  };
  // An air region for a theatre of the 1.7 map (historical scripts): the one
  // holding the most enemy victory points, else the one nearest the capital.
  Engine.prototype.airRegionFor16=function(zone,id){
    const R=Engine.regions16(this.world);if(R.zones.has(zone))return zone;
    const list=[...R.zones.values()].filter(z=>z.theatre===zone);if(!list.length)return this.prov[this.cap(id)].zone;
    const ids=new Set(list.map(z=>z.id)),score=new Map();
    for(const p of this.prov)if(p.vp&&ids.has(p.zone)&&this.war(id,this.s.provinces[p.id].ctrl))score.set(p.zone,(score.get(p.zone)||0)+p.vp);
    const cap=this.prov[this.cap(id)];
    return list.sort((a,b)=>(score.get(b.id)||0)-(score.get(a.id)||0)||distance(a,cap)-distance(b,cap)||a.id.localeCompare(b.id))[0].id;
  };
  Engine.prototype.seaRegionFor16=function(zone,near){
    const R=Engine.regions16(this.world);if(R.seas.has(zone))return zone;
    const list=[...R.seas.values()].filter(z=>z.theatre===zone);const pool=list.length?list:[...R.seas.values()];
    return pool.sort((a,b)=>distance(a,near)-distance(b,near)||a.id.localeCompare(b.id))[0].id;
  };

  // ---------------------------------------------------------------------------
  // Individual ships. Each fleet keeps a list of named vessels with their hull
  // state; f.ships stays as the count per class for the rest of the engine.
  // Counts raised elsewhere (production, reinforcement) become new vessels;
  // every loss hits real vessels, which sink when their hull is gone.
  // ---------------------------------------------------------------------------
  const SHIP_CLASS={
    destroyers:{gun:3,torpedo:7,armor:1,tough:1,aa:2,screen:true,label:'Destroyer'},
    cruisers:{gun:9,torpedo:2,armor:5,tough:3,aa:4,screen:true,label:'Croiseur'},
    battleships:{gun:28,torpedo:0,armor:16,tough:9,aa:6,capital:true,label:'Cuirassé'},
    carriers:{gun:1,torpedo:0,armor:5,tough:6,aa:5,capital:true,carrier:true,label:'Porte-avions'},
    submarines:{gun:0,torpedo:9,armor:0,tough:1,aa:0,stealth:true,label:'Sous-marin'},
  };
  Engine.SHIP_CLASS16=SHIP_CLASS;
  Engine.prototype.shipNames16=function(owner){
    const cache=this._shipNames16??=new Map();let list=cache.get(owner);
    if(!list){
      // Cities of the homeland first, then the rest of the country.
      const names=new Set(),home=this.homeland16(owner),add=p=>{const n=p.name.split(' /')[0].trim();if(n&&!/secteur/.test(p.name))names.add(n);};
      for(const p of this.prov)if(p.owner===owner&&home.has(p.id))add(p);
      if(names.size<8)for(const p of this.prov)if(p.owner===owner&&!home.has(p.id))add(p);
      if(names.size<6)for(const p of this.prov)if(p.owner===owner){const n=(p.administration||'').trim();if(n&&n.length<24)names.add(n);}
      list=[...names];if(!list.length)list=[this.info(owner)?.name||owner];cache.set(owner,list);
    }
    return list;
  };
  Engine.prototype.newVessel16=function(owner,type,hp=1){
    const c=this.nation(owner),list=this.shipNames16(owner),used=c.shipNames16??={};
    const base=list[(Object.values(used).reduce((a,b)=>a+b,0)*7+type.length)%list.length];
    const n=(used[base]=(used[base]||0)+1);
    const roman=n===1?'':[' II',' III',' IV',' V',' VI',' VII',' VIII',' IX',' X'][n-2]||' '+n;
    return {id:this.s.uid++,type,name:base+roman,hp,xp:0};
  };
  // Reconciles the vessel list with the class counts of a fleet.
  Engine.prototype.syncVessels16=function(f){
    f.vessels16??=[];
    for(const type of Object.keys(SHIP_CLASS)){
      const want=Math.max(0,Math.round(f.ships[type]||0)),have=f.vessels16.filter(v=>v.type===type);
      for(let i=have.length;i<want;i++)f.vessels16.push(this.newVessel16(f.owner,type));
      if(have.length>want){const drop=new Set(have.sort((a,b)=>a.hp-b.hp||a.id-b.id).slice(0,have.length-want).map(v=>v.id));f.vessels16=f.vessels16.filter(v=>!drop.has(v.id));}
    }
    this.recountShips16(f);
  };
  Engine.prototype.recountShips16=function(f){
    for(const type of Object.keys(SHIP_CLASS))f.ships[type]=0;
    for(const v of f.vessels16)f.ships[v.type]=(f.ships[v.type]||0)+1;
  };
  // Damage of "amount" ship-equivalents spread over random vessels.
  Engine.prototype.fleetLoss=function(f,amount,only=null){
    if(!(amount>0))return [];
    this.syncVessels16(f);
    const pool=f.vessels16.filter(v=>!only||v.type===only);if(!pool.length)return [];
    const sunk=[];let left=amount;
    // A loss as large as the fleet (a port lost with the fleet inside) sinks it all.
    if(amount>=pool.length)for(const v of pool){v.hp=0;sunk.push(v);left=0;}
    for(let guard=0;left>1e-4&&guard<40;guard++){
      const alive=pool.filter(v=>v.hp>0);if(!alive.length)break;
      const v=alive[Math.floor(this.random()*alive.length)],hit=Math.min(left,v.hp,.25+this.random()*.6);
      v.hp=+(v.hp-hit).toFixed(4);left-=hit;if(v.hp<=.02){v.hp=0;sunk.push(v);}
    }
    if(sunk.length){const gone=new Set(sunk.map(v=>v.id));f.vessels16=f.vessels16.filter(v=>!gone.has(v.id));this.nation(f.owner).lostShips+=sunk.length;}
    this.recountShips16(f);
    if(sunk.length&&(f.owner===this.s.player||this.war(f.owner,this.s.player)))this.log((f.owner===this.s.player?'Navire perdu':'Navire ennemi coulé')+' : '+sunk.map(v=>SHIP_CLASS[v.type].label+' '+v.name).join(', ')+'.',f.owner===this.s.player?'war':'success');
    return sunk;
  };
  const vesselStats=(c,v)=>{const k=SHIP_CLASS[v.type],q=c?.eqStats?.[v.type];return {...k,gun:k.gun*sv(q,'attack'),torpedo:k.torpedo*sv(q,'attack'),armor:k.armor*sv(q,'hp'),tough:k.tough*sv(q,'hp'),aa:k.aa*sv(q,'air')};};
  // Naval battle, hour by hour: carrier strikes open the fight, guns and
  // torpedoes follow; screens protect the capital ships; a side breaks off
  // when it has lost too much. Returns the names of sunk and damaged ships.
  Engine.prototype.navalBattle16=function(zone,f,e,weather){
    this.syncVessels16(f);this.syncVessels16(e);
    const sides=[f,e].map(fl=>{const c=this.nation(fl.owner),mult=(1+c.bonus.navy+c.bonus.naval)*(MISSION_POWER[fl.mission]||1)*(.6+.4*fl.strength);return {fl,c,mult,start:sum(fl.vessels16.map(v=>v.hp*SHIP_CLASS[v.type].tough)),sunk:[],hit:new Set()};});
    const rating=sd=>sum(sd.fl.vessels16.filter(v=>v.hp>0).map(v=>v.hp*SHIP_CLASS[v.type].tough));
    let hours=0;
    for(;hours<8;hours++){
      for(const [i,sd] of sides.entries()){
        const foe=sides[1-i],targets=foe.fl.vessels16.filter(v=>v.hp>0);if(!targets.length)break;
        const screens=targets.filter(v=>SHIP_CLASS[v.type].screen),capitals=targets.filter(v=>SHIP_CLASS[v.type].capital),screened=screens.length>=capitals.length*2;
        const aa=sum(targets.map(v=>vesselStats(foe.c,v).aa));
        const strike=(v,dmg)=>{const st=vesselStats(foe.c,v);v.hp=Math.max(0,+(v.hp-dmg/(st.tough*12)).toFixed(4));foe.hit.add(v);};
        for(const v of sd.fl.vessels16){
          if(v.hp<=0)continue;const st=vesselStats(sd.c,v);
          if(st.carrier&&hours<2){
            const planes=18*sv(sd.c.eqStats?.navalBombers,'naval')*(1+(sd.c.bonus.naval||0))/(1+aa*.02);
            const t=(capitals.length?capitals:targets)[Math.floor(this.random()*(capitals.length||targets.length))];if(t&&this.random()<.6*weather.air)strike(t,planes*v.hp);
          }
          if(st.gun>0&&!st.stealth){
            const pool=st.capital&&capitals.length?capitals:screens.length?screens:targets,t=pool[Math.floor(this.random()*pool.length)];
            if(t&&t.hp>0&&this.random()<.3*weather.naval*(1+v.xp*.2)){const ts=vesselStats(foe.c,t);strike(t,st.gun*sd.mult*(st.gun>ts.armor?1:.35)*v.hp);}
          }
          if(st.torpedo>0&&(hours<3||st.stealth)){
            const pool=!screened&&capitals.length?capitals:screens.length?screens:targets,t=pool[Math.floor(this.random()*pool.length)];
            if(t&&t.hp>0&&this.random()<.2*weather.naval*(st.stealth?1.3:1))strike(t,st.torpedo*1.5*sd.mult*v.hp);
          }
        }
      }
      for(const sd of sides){const dead=sd.fl.vessels16.filter(v=>v.hp<=.02);if(dead.length){sd.sunk.push(...dead);const gone=new Set(dead.map(v=>v.id));sd.fl.vessels16=sd.fl.vessels16.filter(v=>!gone.has(v.id));this.nation(sd.fl.owner).lostShips+=dead.length;}}
      if(sides.some(sd=>!sd.fl.vessels16.length))break;
      // A side breaks off below 45 % of its strength, or when outgunned two to one.
      const [ra,rb]=sides.map(rating);if(hours>=1&&(ra<sides[0].start*.45||rb<sides[1].start*.45||ra<rb*.5||rb<ra*.5))break;
    }
    for(const sd of sides){
      for(const v of sd.fl.vessels16)v.xp=Math.min(1,+(v.xp+.02).toFixed(3));
      this.recountShips16(sd.fl);sd.fl.strength=clamp(sd.fl.strength-.04-hours*.01,.1,1);
      if(sd.fl.vessels16.length&&sum(sd.fl.vessels16.map(v=>v.hp))/sd.fl.vessels16.length<.6)sd.fl.mission='port';
    }
    const names=list=>list.map(v=>SHIP_CLASS[v.type].label+' '+v.name);
    const report={zone,a:f.owner,b:e.owner,hours:hours+1,sunkA:names(sides[0].sunk),sunkB:names(sides[1].sunk),damagedA:[...sides[0].hit].filter(v=>v.hp>0).length,damagedB:[...sides[1].hit].filter(v=>v.hp>0).length,lossA:sides[0].sunk.length,lossB:sides[1].sunk.length};
    if(f.owner===this.s.player||e.owner===this.s.player){
      const mine=f.owner===this.s.player?report.sunkA:report.sunkB,theirs=f.owner===this.s.player?report.sunkB:report.sunkA;
      this.log('Bataille navale ('+zone+', '+report.hours+' h) : '+(theirs.length?theirs.length+' navire(s) ennemi(s) coulé(s)':'aucun navire ennemi coulé')+(mine.length?' ; pertes : '+mine.join(', '):'')+'.',mine.length>theirs.length?'war':'success');
    }
    return report;
  };
  Engine.prototype.navalStep=function(){
    const s=this.s;s.navalReports=[];s.mines16??={};
    const zones=new Map();
    for(const f of s.fleets)this.syncVessels16(f);
    // Fleets with no ship left are dissolved (the player's included).
    s.fleets=s.fleets.filter(f=>f.vessels16.length||f.reserve16);
    for(const f of s.fleets){
      if(f.eta>0){f.eta--;continue;}
      const c=this.nation(f.owner);if(!c?.alive)continue;
      // Ships in port are repaired; dockyards speed the work.
      if(f.mission==='port'){f.strength=clamp(f.strength+.012*(1+c.stats.dock*.01),0,1);for(const v of f.vessels16)v.hp=Math.min(1,+(v.hp+.02*(1+c.stats.dock*.01)).toFixed(4));continue;}
      const ships=sum(Object.values(f.ships));c.stock.fuel=Math.max(0,c.stock.fuel-ships*.4);
      if(c.stock.fuel<1||ships<.5)continue;
      if(!zones.has(f.zone))zones.set(f.zone,[]);zones.get(f.zone).push(f);
    }
    const control={};
    for(const [zone,fleets] of zones){
      const weather=this.seaWeather(zone),mines=s.mines16[zone]??={};
      for(const f of fleets){
        const c=this.nation(f.owner),layers=(f.ships.destroyers||0)+(f.ships.cruisers||0);
        if(f.mission==='mines')mines[f.owner]=Math.min(1000,(mines[f.owner]||0)+layers*.8*(1+c.bonus.mines));
        if(f.mission==='sweep')for(const k of Object.keys(mines))if(this.war(f.owner,k))mines[k]=Math.max(0,mines[k]-(f.ships.destroyers||0)*1.2*(1+c.bonus.mines));
        const hostile=sum(Object.entries(mines).filter(([k])=>this.war(f.owner,k)).map(([,v])=>v));
        if(hostile>0)this.fleetLoss(f,sum(Object.values(f.ships))*hostile/1000*.0015*(f.mission==='sweep'?.4:1));
        (control[zone]??={})[f.owner]=(control[zone][f.owner]||0)+this.fleetRating(f)*(f.mission==='raid'&&!f.ships.destroyers&&!f.ships.cruisers?.3:1);
      }
      for(const [k,v] of Object.entries(mines))if(v<.5)delete mines[k];
      // Engagements need detection: patrols spot, strike forces engage.
      for(const f of fleets)for(const e of fleets){
        if(e.id<=f.id||!this.war(f.owner,e.owner))continue;
        const cf=this.nation(f.owner),ce=this.nation(e.owner);
        const spot=(x,y,cx)=>{
          const patrol=x.mission==='patrol'?.35:x.mission==='strike'?.2:.12,surface=sum(['destroyers','cruisers','battleships','carriers'].map(k=>y.ships[k]||0));
          const stealth=surface?1:sv(this.nation(y.owner).eqStats?.submarines,'stealth')*2;
          return clamp((patrol+(x.ships.destroyers||0)*.02*sv(cx.eqStats?.destroyers,'detection'))*weather.naval/stealth,0,.95);
        };
        const detected=this.random()<spot(f,e,cf)||this.random()<spot(e,f,ce);
        if(!detected)continue;
        if(!f.vessels16.length||!e.vessels16.length)continue;
        const report=this.navalBattle16(zone,f,e,weather);
        if(f.owner===s.player||e.owner===s.player){s.navalReports.push(report);(s.navalLog16??=[]).unshift({...report,day:s.day});if(s.navalLog16.length>30)s.navalLog16.length=30;}
      }
      for(const f of fleets){
        const c=this.nation(f.owner);
        if(f.mission==='raid')for(const target of this.enemies(f.owner)){
          const raiding=this.navalPower(f.owner,f.zone,'raid')*(1+c.bonus.raiding)*sv(c.eqStats?.submarines,'stealth');
          const escort=this.navalPower(target,f.zone,'escort')*(1+this.nation(target).bonus.convoy);
          const victim=this.nation(target);if(!victim)continue;
          const traffic=this.traffic16(target,f.zone);if(!traffic)continue;
          const sunk=Math.max(0,raiding-escort)*.025*weather.naval*traffic;
          victim.stock.convoys=Math.max(0,victim.stock.convoys-sunk);
          if(escort>0&&f.ships.submarines){const asw=escort*.002*sv(this.nation(target).eqStats?.destroyers,'subAttack');this.fleetLoss(f,asw,'submarines');}
        }
        if(f.strength<.25)f.mission='port';
      }
    }
    // Naval aviation over the zone also counts toward control.
    for(const [key,value] of Object.entries(this.navalAir16||{})){const [zone,id]=key.split('|');(control[zone]??={})[id]=(control[zone][id]||0)+value;}
    s.seaControl16=Object.fromEntries(Object.entries(control).map(([z,v])=>[z,Object.fromEntries(Object.entries(v).map(([k,n])=>[k,+n.toFixed(2)]))]));
  };
  Engine.invariant16(function(state){
    for(const f of state.fleets)for(const v of f.vessels16||[])assert(SHIP_CLASS[v.type]&&typeof v.name==='string'&&finite(v.hp,0,1)&&finite(v.xp,0,1)&&Number.isInteger(v.id),'Navire invalide.');
  });
  Engine.command16('fleetMission',function(p,id,c){
    const f=this.s.fleets.find(f=>f.id===p.id&&f.owner===id);assert(f,'Flotte inconnue.');
    assert(this.world.seas.some(z=>z.id===p.zone),'Région maritime inconnue.');assert(FLEET_MISSIONS.includes(p.mission),'Mission navale inconnue.');
    if(p.mission==='mines'||p.mission==='sweep')assert((f.ships.destroyers||0)+(f.ships.cruisers||0)>0,'Il faut des destroyers ou des croiseurs.');
    if(f.zone!==p.zone){f.eta=this.seaDays16(f.zone,p.zone);f.zone=p.zone;}f.mission=p.mission;
  });
  // Naval invasions: preparation in a port, then a landing once the sea
  // zones are under control and the weather allows it.
  Engine.command16('invasion',function(p,id){return this.startInvasion16(id,p.ids,p.target);});
  Engine.prototype.startInvasion16=function(id,ids,targetPid){
    const c=this.nation(id),p={ids,target:targetPid};
    assert(Array.isArray(p.ids)&&p.ids.length>=1&&p.ids.length<=12,'Choisissez de 1 à 12 divisions.');
    const units=[...new Set(p.ids)].map(uid=>this.s.units.find(u=>u.id===uid&&u.owner===id));
    assert(units.every(Boolean),'Une division ne vous appartient pas.');
    const from=units[0].pid;assert(units.every(u=>u.pid===from),'Les divisions doivent être réunies dans le même port.');
    assert(this.s.provinces[from].port>0&&this.access(id,this.s.provinces[from].ctrl),'Le départ exige un port ami.');
    const target=this.prov[p.target],ctrl=this.s.provinces[p.target]?.ctrl;
    assert(target?.coast,'La cible doit être une province côtière.');assert(this.war(id,ctrl),'La cible doit appartenir à un pays en guerre avec vous.');
    const range=1800*(1+c.bonus.invasion*2);assert(distance(this.prov[from],target)<=range,'Cible hors de portée ('+Math.round(range)+' km).');
    assert(c.stock.convoys>=10*units.length,'Il faut 10 convois par division.');
    assert(!(this.s.invasions16||[]).some(i=>i.units.some(uid=>p.ids.includes(uid))),'Une division est déjà affectée à un débarquement.');
    const route=this.seaRoute16(this.prov[from].seaZone,target.seaZone);
    const zones=route?route.path:[...new Set([this.prov[from].seaZone,target.seaZone].filter(Boolean))];
    this.s.invasions16??=[];
    const inv={id:this.s.uid++,owner:id,units:units.map(u=>u.id),from,to:p.target,zones,progress:0,days:Math.max(6,12+2*units.length-Math.round(10*c.bonus.invasion)),status:'preparing'};
    for(const u of units){u.path=[];const a=this.s.armies.find(a=>a.id===u.army);if(a)a.auto=false;}
    this.s.invasions16.push(inv);return inv.id;
  };
  Engine.command16('cancelInvasion',function(p,id){
    const inv=(this.s.invasions16||[]).find(i=>i.id===p.id&&i.owner===id);assert(inv,'Débarquement inconnu.');
    for(const uid of inv.units){const u=this.s.units.find(u=>u.id===uid);if(u?.landing16){u.landing16=null;u.path=[];}}
    this.s.invasions16=this.s.invasions16.filter(i=>i!==inv);
  });
  Engine.onDay16(function(){this.invasionStep16();});
  Engine.prototype.invasionStep16=function(){
    const list=this.s.invasions16||[];if(!list.length)return;
    for(const inv of [...list]){
      const c=this.nation(inv.owner);
      inv.units=inv.units.filter(uid=>{const u=this.s.units.find(u=>u.id===uid);return u&&(u.pid===inv.from||u.pid===inv.to);});
      if(!c?.alive||!inv.units.length||!this.war(inv.owner,this.s.provinces[inv.to].ctrl)&&inv.status!=='landing'){this.s.invasions16=this.s.invasions16.filter(i=>i!==inv);continue;}
      const units=inv.units.map(uid=>this.s.units.find(u=>u.id===uid));
      if(inv.status==='landing'){
        if(units.every(u=>!u.landing16)){
          const landed=units.some(u=>u.pid===inv.to);
          if(inv.owner===this.s.player)this.log(landed?'Débarquement réussi à '+this.prov[inv.to].name+'.':'Le débarquement à '+this.prov[inv.to].name+' a été repoussé.',landed?'success':'war');
          if(!landed)for(const u of units)this.loss(u,.15,20);
          this.s.invasions16=this.s.invasions16.filter(i=>i!==inv);
        }
        continue;
      }
      inv.progress=Math.min(inv.days,inv.progress+1);
      if(inv.progress<inv.days)continue;
      const blocked=inv.zones.find(z=>this.seaShare16(inv.owner,z)<.5),gale=inv.zones.find(z=>!this.seaWeather(z).invasion);
      if(blocked||gale){if(inv.status!=='waiting'&&inv.owner===this.s.player)this.log('Débarquement en attente : '+(blocked?'maîtrise navale insuffisante':'tempête en mer')+'.','event');inv.status='waiting';continue;}
      if(c.stock.convoys<10*units.length){inv.status='waiting';continue;}
      c.stock.convoys-=2*units.length;inv.status='landing';
      for(const u of units){u.landing16={to:inv.to,amphibious:true,from:inv.from};u.path=[inv.to];u.progress=0;}
    }
  };

  // ---------------------------------------------------------------------------
  // Air war: six aircraft roles, air superiority per zone, anti-air defence,
  // strategic and naval bombing, air supply, paradrops and carrier aviation.
  // ---------------------------------------------------------------------------
  const AIR_MISSIONS={
    fighters:['reserve','superiority','intercept','escort'],
    cas:['reserve','support'],
    bombers:['reserve','support','strategic','logistics','portStrike'],
    strategicBombers:['reserve','strategic'],
    navalBombers:['reserve','navalStrike','portStrike'],
    transportPlanes:['reserve','airSupply'],
  };
  const AIR_RANGE={fighters:1600,cas:1200,bombers:2300,strategicBombers:3500,navalBombers:2500,transportPlanes:2200};
  const SEA_MISSIONS=['navalStrike','portStrike'];
  Engine.AIR_MISSIONS16=AIR_MISSIONS;
  Engine.prototype.airStep=function(){
    const s=this.s;s.airReports=[];this.airSupport={};this.airPenalty16={};this.navalAir16={};this.airSupply16={};
    const groups={},aaByZone={};let radarSites=null;
    for(const p of this.prov){const q=s.provinces[p.id];if(q.aa)(aaByZone[p.zone]??={})[q.ctrl]=(aaByZone[p.zone][q.ctrl]||0)+q.aa;}
    for(const w of s.wings){
      w.size=Math.max(0,Math.round(w.size));
      if(w.size<1||w.mission==='reserve'||!this.nation(w.owner)?.alive)continue;
      const base=s.provinces[w.base],c=this.nation(w.owner),stats=c.eqStats?.[w.kind];
      if(!this.access(w.owner,base.ctrl)||!base.airbase||c.stock.fuel<1)continue;
      const naval=SEA_MISSIONS.includes(w.mission)&&w.seaZone;
      const target=naval?this.world.seas.find(z=>z.id===w.seaZone):null;
      const centreProv=naval?null:(this._zoneCentre16??={})[w.zone]??=(()=>{const ps=this.prov.filter(p=>p.zone===w.zone);return ps[Math.floor(ps.length/2)];})();
      const centre=naval?{x:target.x,y:target.y}:centreProv;if(!centre)continue;
      const reach=clamp(AIR_RANGE[w.kind]*sv(stats,'range')/Math.max(1,distance(this.prov[w.base],centre)),0,1);
      const parked=sum(s.wings.filter(x=>x.base===w.base).map(x=>x.size)),capacity=clamp(base.airbase*250/Math.max(1,parked),0,1);
      const radar=naval?0:sum((radarSites??=this.prov.filter(p=>s.provinces[p.id].radar>0)).filter(p=>p.zone===w.zone&&this.allies(w.owner,s.provinces[p.id].ctrl)).map(p=>s.provinces[p.id].radar));
      const weatherAir=naval?this.seaWeather(w.seaZone).air:this.weather(w.base).air;
      w.efficiency=reach*capacity*(.3+.7*base.supply)*(1-base.damage);
      const effective=w.size*w.efficiency*weatherAir*(1+c.bonus.air)*(1+Math.min(.25,radar*.035))*(1+(w.aces16||0)*.04);
      c.stock.fuel=Math.max(0,c.stock.fuel-effective*.04);
      const key=naval?'sea:'+w.seaZone:w.zone;(groups[key]??=[]).push({w,effective,c,stats});
    }
    for(const [key,list] of Object.entries(groups)){
      const naval=key.startsWith('sea:'),zone=naval?key.slice(4):key;
      const fighterPower=g=>g.w.kind==='fighters'&&['superiority','intercept','escort'].includes(g.w.mission)?g.effective*sv(g.stats,'air')*(g.w.mission==='intercept'?1.25:1):0;
      const sides=new Map();
      for(const g of list){const side=[...sides.keys()].find(k=>this.allies(k,g.w.owner))||g.w.owner;if(!sides.has(side))sides.set(side,{fighters:0,bombers:0,members:[]});const sd=sides.get(side);sd.fighters+=fighterPower(g);sd.members.push(g);if(g.w.kind!=='fighters')sd.bombers+=g.effective;}
      // Dogfights in three waves: fighters on air superiority hunt fighters,
      // interceptors go for bombers, escorts shield them; anti-air fire hits
      // bombers. Losses are whole aircraft.
      const killed=new Map(),credit=new Map();
      if(sides.size>1)for(let wave=0;wave<3;wave++)for(const [side,sd] of sides){
        const foes=[...sides.entries()].filter(([k])=>this.war(side,k)).flatMap(([,v])=>v.members);if(!foes.length)continue;
        const alive=g=>g.w.size-(killed.get(g.w.id)||0),foeFighters=foes.filter(g=>g.w.kind==='fighters'&&alive(g)>0),foeBombers=foes.filter(g=>g.w.kind!=='fighters'&&alive(g)>0);
        const escorts=sum(foes.filter(g=>g.w.mission==='escort').map(g=>alive(g)*g.w.efficiency));
        for(const g of sd.members){
          if(g.w.kind!=='fighters'||!['superiority','intercept','escort'].includes(g.w.mission)||alive(g)<=0)continue;
          const preferBombers=g.w.mission==='intercept'&&foeBombers.length,pool=preferBombers?foeBombers:foeFighters.length?foeFighters:g.w.mission==='superiority'?foeBombers:[];
          if(!pool.length)continue;
          const target=pool[Math.floor(this.random()*pool.length)],ts=target.stats;
          const ratio=sv(g.stats,'air')*(1+g.c.bonus.air)/(sv(ts,'air')*(1+target.c.bonus.air)*(target.w.kind==='fighters'?1:.45)),screen=preferBombers?1/(1+escorts/Math.max(1,alive(g)*g.w.efficiency)):1;
          const expected=alive(g)*g.w.efficiency/3*.012*Math.pow(ratio,1.3)*(1+(g.w.xp||0)*.5)*(1+(g.w.aces16||0)*.08)*screen*(.7+this.random()*.6)/sv(ts,'defense');
          const kills=Math.min(alive(target),Math.floor(expected)+(this.random()<expected%1?1:0));
          if(kills>0){killed.set(target.w.id,(killed.get(target.w.id)||0)+kills);credit.set(g.w.id,(credit.get(g.w.id)||0)+kills);}
        }
      }
      for(const [side,sd] of sides){
        const enemyF=sum([...sides.entries()].filter(([k])=>this.war(side,k)).map(([,v])=>v.fighters));
        const control=(sd.fighters+25)/(sd.fighters+enemyF+50),escort=sum(sd.members.filter(g=>g.w.mission==='escort').map(g=>g.effective));
        const aa=naval?0:sum(Object.entries(aaByZone[zone]||{}).filter(([k])=>this.war(side,k)).map(([k,v])=>v*(1+(this.nation(k)?.bonus.airDefense||0))));
        for(const g of sd.members){
          const {w,c,stats,effective}=g;
          (s.airControl16??={})[zone]??={};s.airControl16[zone][w.owner]=+control.toFixed(3);
          let losses=killed.get(w.id)||0;
          if(w.kind!=='fighters'&&aa){const flak=effective*aa*.00025;losses+=Math.min(w.size-losses,Math.floor(flak)+(this.random()<flak%1?1:0));}
          w.size=Math.max(0,w.size-losses);c.lostPlanes+=losses;
          // Victories season the crews; every 25 kills produce an ace.
          const won=credit.get(w.id)||0;
          if(won){w.kills16=(w.kills16||0)+won;w.xp=Math.min(1,+((w.xp||0)+won*.002).toFixed(3));const aces=Math.min(5,Math.floor(w.kills16/25));if(aces>(w.aces16||0)){w.aces16=aces;if(w.owner===s.player)this.log(w.name+' compte un nouvel as ('+w.kills16+' victoires).','success');}}
          if(losses&&(this.allies(w.owner,s.player)||this.war(w.owner,s.player))){
            const log=s.airBattles16??=[],key=s.day+'|'+zone;let row=log.find(r=>r.key===key);
            if(!row){row={key,day:s.day,zone:naval?'sea:'+zone:zone,own:0,allied:0,enemy:0};log.unshift(row);if(log.length>40)log.length=40;}
            if(w.owner===s.player)row.own+=losses;else if(this.allies(w.owner,s.player))row.allied+=losses;else row.enemy+=losses;
          }
          const ground=effective*sv(stats,'ground')*(1+c.bonus.bombing);
          if(!naval){
            if(w.kind==='fighters')this.airSupport[w.owner+'_'+zone]=(this.airSupport[w.owner+'_'+zone]||0)+effective/5000*control;
            if(w.mission==='support')this.airSupport[w.owner+'_'+zone]=(this.airSupport[w.owner+'_'+zone]||0)+ground/(w.kind==='cas'?1100:1400)*control;
            if(w.mission==='strategic'||w.mission==='logistics'){
              const targets=this.prov.filter(p=>p.zone===zone&&this.war(w.owner,s.provinces[p.id].ctrl)&&(w.mission==='logistics'||s.provinces[p.id].civ+s.provinces[p.id].mil+s.provinces[p.id].dock>0||s.provinces[p.id].refinery>0));
              if(targets.length){const t=targets[Math.floor(this.random()*targets.length)],st=s.provinces[t.id];const shield=1/(1+st.aa*.25);st.damage=clamp(st.damage+ground/(w.kind==='strategicBombers'?7000:12000)*control*shield,0,.85);if(w.mission==='logistics')st.supply*=.85;}
            }
            if(w.mission==='airSupply')this.airSupply16[w.owner+'_'+zone]=(this.airSupply16[w.owner+'_'+zone]||0)+effective;
          }else{
            this.navalAir16[zone+'|'+w.owner]=(this.navalAir16[zone+'|'+w.owner]||0)+effective*sv(stats,'naval')/40*(w.kind==='fighters'?.3:1);
            const fleets=s.fleets.filter(f=>this.war(w.owner,f.owner)&&(w.mission==='navalStrike'?f.zone===zone&&f.mission!=='port'&&f.eta<=0:this.prov[f.base]?.seaZone===zone&&f.mission==='port'));
            if(fleets.length&&w.kind!=='fighters'){
              const f=fleets[Math.floor(this.random()*fleets.length)],fc=this.nation(f.owner);
              const flak=1+sum(['destroyers','cruisers','battleships','carriers'].map(k=>(f.ships[k]||0)*sv(fc.eqStats?.[k],'air')))*.04;
              const sunk=effective*sv(stats,'naval')/3000*control/flak*(w.mission==='portStrike'?1.4:1);
              this.fleetLoss(f,sunk);f.strength=clamp(f.strength-sunk*.05,.1,1);
              w.size=Math.max(0,w.size-Math.min(w.size,(flak-1)*effective*.0008));
            }
          }
          if(w.owner===s.player)s.airReports.push({zone:naval?'sea:'+zone:zone,wing:w.id,effective:Math.round(effective),control,losses});
        }
        // A side without air cover fights at a disadvantage on the ground.
        if(!naval)for(const id of this.active())if(this.allies(side,id)){
          const enemyControl=1-control;if(enemyControl>.6)this.airPenalty16[id+'_'+zone]=1-(enemyControl-.6)*.4;
        }
      }
    }
    // Air supply keeps encircled divisions alive.
    for(const [key,value] of Object.entries(this.airSupply16)){
      const cut=key.lastIndexOf('_'),id=key.slice(0,cut),zone=key.slice(cut+1);
      const pocket=s.units.filter(u=>u.owner===id&&u.pocketed&&this.prov[u.pid].zone===zone);
      for(const u of pocket)u.supply=Math.max(u.supply,Math.min(.55,value/(pocket.length*45)));
    }
  };
  const combatProfile15=Engine.prototype.combatProfile16;
  Engine.prototype.combatProfile16=function(u,pid,offense,ctx){
    const p=combatProfile15.call(this,u,pid,offense,ctx),penalty=this.airPenalty16?.[u.owner+'_'+this.prov[pid].zone]??1;
    if(penalty<1)for(const k of ['soft','hard','defense','breakthrough'])p[k]*=penalty;
    return p;
  };
  Engine.command16('airCreate',function(p,id,c){
    assert(AIR_MISSIONS[p.kind],'Type d’appareil inconnu.');assert(Number.isInteger(p.size)&&p.size>=10&&p.size<=500,'Taille : 10 à 500 appareils.');
    const st=this.s.provinces[p.base];assert(st?.ctrl===id&&st.airbase>0,'Base aérienne nationale requise.');assert(c.stock[p.kind]>=p.size,'Appareils en réserve insuffisants.');
    c.stock[p.kind]-=p.size;
    const names={fighters:'Escadre de chasse',cas:'Escadre d’appui',bombers:'Escadre de bombardement',strategicBombers:'Escadre de bombardement lourd',navalBombers:'Escadre de bombardement naval',transportPlanes:'Escadre de transport'};
    this.s.wings.push({id:this.s.uid++,owner:id,name:names[p.kind],kind:p.kind,size:p.size,base:p.base,zone:this.prov[p.base].zone,mission:'reserve',xp:0});
  });
  Engine.command16('airMission',function(p,id,c){
    const w=this.s.wings.find(w=>w.id===p.id&&w.owner===id);assert(w,'Escadre inconnue.');
    assert((AIR_MISSIONS[w.kind]||[]).includes(p.mission),'Mission incompatible avec ces appareils.');
    if(SEA_MISSIONS.includes(p.mission)){assert(this.world.seas.some(z=>z.id===p.seaZone),'Région maritime inconnue.');w.seaZone=p.seaZone;}
    else{assert(this.world.zones.some(z=>z.id===p.zone),'Région aérienne inconnue.');w.zone=p.zone;}
    w.mission=p.mission;
  });
  // Paradrop: airborne divisions jump from an air base onto an enemy province.
  Engine.command16('paradrop',function(p,id,c){
    assert(Array.isArray(p.ids)&&p.ids.length>=1&&p.ids.length<=6,'Choisissez de 1 à 6 divisions aeroportées.');
    const units=[...new Set(p.ids)].map(uid=>this.s.units.find(u=>u.id===uid&&u.owner===id));
    assert(units.every(Boolean),'Une division ne vous appartient pas.');
    assert(units.every(u=>this.unitStats16(u).special?.paradrop),'Seules les divisions entièrement parachutistes peuvent sauter.');
    assert(units.every(u=>this.s.provinces[u.pid].airbase>0&&this.access(id,this.s.provinces[u.pid].ctrl)),'Les parachutistes partent d’une base aérienne amie.');
    const target=this.prov[p.target],ctrl=this.s.provinces[p.target]?.ctrl;assert(target&&this.war(id,ctrl),'La cible doit être une province ennemie.');
    const range=800*sv(c.eqStats?.transportPlanes,'range')*(1+c.bonus.paradrop);
    assert(units.every(u=>distance(this.prov[u.pid],target)<=range),'Cible hors de portée ('+Math.round(range)+' km).');
    assert(c.stock.transportPlanes>=15*units.length,'Il faut 15 avions de transport par division.');
    const control=this.s.airControl16?.[target.zone]?.[id]??.5;
    c.stock.transportPlanes-=Math.ceil(units.length*15*(control<.35?.3:.05));
    for(const u of units){
      if(control<.35)this.loss(u,.2,0);
      u.landing16={to:p.target,airborne:true,from:u.pid};u.path=[p.target];u.org=u.org*.85;
      const a=this.s.armies.find(a=>a.id===u.army);if(a)a.auto=false;
    }
    if(id===this.s.player)this.log('Opération aeroportée sur '+target.name+' : '+units.length+' division(s).','war');
  });
  Engine.invariant16(function(state){
    for(const w of state.wings){
      assert(!w.mission||w.mission==='reserve'||(AIR_MISSIONS[w.kind]||['reserve','superiority','intercept','support','strategic','logistics']).includes(w.mission),'Mission aérienne invalide.');
      if(w.seaZone!==undefined)assert(this.world.seas.some(z=>z.id===w.seaZone),'Zone maritime d’escadre invalide.');
    }
    for(const f of state.fleets)assert(FLEET_MISSIONS.includes(f.mission),'Mission navale invalide.');
    for(const inv of state.invasions16||[])assert(Number.isInteger(inv.id)&&this.prov[inv.from]&&this.prov[inv.to]&&Array.isArray(inv.units)&&['preparing','waiting','landing'].includes(inv.status),'Débarquement invalide.');
    for(const [zone,m] of Object.entries(state.mines16||{}))for(const v of Object.values(m))assert(finite(v,0,1000),'Champ de mines invalide.');
  });

  // ---------------------------------------------------------------------------
  // De jure ownership. "own" changes only through annexation, treaties,
  // releases and peace conferences; wartime occupation changes "ctrl" only.
  // ---------------------------------------------------------------------------
  Engine.prototype.syncOwnership16=function(before){
    for(let i=0;i<this.s.provinces.length;i++){
      const st=this.s.provinces[i];if(before[i]===st.ctrl)continue;
      if(!this.war(st.ctrl,st.own??before[i]))st.own=st.ctrl;
    }
  };
  // An annexed country's homeland becomes core territory of the annexer
  // (factories can be built there and it recruits in full).
  const annex15=Engine.prototype.annex;
  Engine.prototype.annex=function(winner,loser,puppet=false){
    const result=annex15.call(this,winner,loser,puppet);
    if(!puppet&&this.nation(winner)){
      const w=this.nation(winner),home=this.prov.filter(p=>p.owner===loser&&!p.overseas).map(p=>p.id);
      if(home.length)w.identity.cores=[...new Set([...(Array.isArray(w.identity.cores)?w.identity.cores:this.prov.filter(p=>p.owner===winner).map(p=>p.id)),...home])];
    }
    return result;
  };
  for(const name of ['annex','transferHistoryRegion','releaseHistoryCountry','franceHistoryArmistice','civilWar','eventChoice','applyHistoryActions']){
    const original=Engine.prototype[name];
    Engine.prototype[name]=function(...args){
      if(!this.s?.provinces)return original.apply(this,args);
      const before=this.s.provinces.map(st=>st.ctrl),result=original.apply(this,args);
      this.syncOwnership16(before);return result;
    };
  }
  // When a civil war splits a country, loyal divisions caught behind the new
  // lines regroup on government territory and half of them defend the capital.
  Engine.prototype.regroupLoyalists16=function(id){
    const own=this.owned(id);if(!own.length)return;
    const capital=this.cap(id),units=this.units(id);
    units.forEach((u,i)=>{
      if(this.s.provinces[u.pid].ctrl===id&&i%2)return;
      const home=i%2===0?capital:own.slice().sort((a,b)=>distance(a,this.prov[u.pid])-distance(b,this.prov[u.pid])||a.id-b.id)[0].id;
      u.pid=home;u.path=[];u.progress=0;u.landing16=null;
    });
    for(const a of this.s.armies.filter(a=>a.owner===id)){a.auto=true;a.order='defend';a.plan16=null;}
    this.indexUnits();
  };
  const civilWar15=Engine.prototype.civilWar;
  Engine.prototype.civilWar=function(id){
    const result=civilWar15.call(this,id);this.regroupLoyalists16(id);
    // Both sides claim the whole country: surrender is measured over all of it.
    if(this.nation('NAT')?.alive&&this.war(id,'NAT'))this.nation('NAT').identity.cores=this.prov.filter(p=>p.owner===id).map(p=>p.id);
    if(this.nation('NAT')?.alive&&this.war(id,'NAT')){this.addSpirit16(id,'civil_war');this.addSpirit16(id,'popular_militias',540);this.addSpirit16('NAT','civil_war');this.addSpirit16('NAT','africa_army');}
    return result;
  };
  // Civil war spirits end with the war.
  Engine.onDay16(function(){
    if(this.s.day%7!==3)return;
    for(const id of this.active()){const c=this.nation(id);if(this.hasSpirit16(c,'civil_war')&&!this.enemies(id).length){this.removeSpirit16(id,'civil_war');this.removeSpirit16(id,'africa_army');this.removeSpirit16(id,'popular_militias');}}
  });

  // Contribution to a war: damage inflicted and territory taken, per pair.
  Engine.prototype.warContribution16=function(a,b,inflicted,suffered){
    const w=this.s.warScore16??={};
    w[a+'|'+b]=+((w[a+'|'+b]||0)+inflicted/1000).toFixed(3);w[b+'|'+a]=+((w[b+'|'+a]||0)+suffered/1000).toFixed(3);
  };
  const capture15=Engine.prototype.capture;
  Engine.prototype.capture=function(pid,attackers){
    const old=this.s.provinces[pid].ctrl,lead=attackers.find(u=>u.strength>.08);
    const result=capture15.call(this,pid,attackers);
    if(lead&&this.s.provinces[pid].ctrl===lead.owner&&old!==lead.owner){const w=this.s.warScore16??={};w[lead.owner+'|'+old]=+((w[lead.owner+'|'+old]||0)+this.prov[pid].vp*2).toFixed(3);}
    return result;
  };

  // ---------------------------------------------------------------------------
  // Capitulation, governments in exile and peace conferences.
  // ---------------------------------------------------------------------------
  Engine.prototype.coreProvinces16=function(id){
    const c=this.nation(id);
    return Array.isArray(c.identity.cores)?c.identity.cores.map(pid=>this.prov[pid]).filter(Boolean):this.prov.filter(p=>p.owner===id);
  };
  Engine.prototype.checkCapitulations=function(){
    for(const id of this.active()){
      const c=this.nation(id),enemies=this.enemies(id);if(!enemies.length||c.capitulated16)continue;
      const original=this.coreProvinces16(id);
      // The home country decides: colonies do not keep a defeated state alive.
      const homeland=this.homeland16(id),near=original.filter(p=>distance(p,{x:c.identity.lon,y:c.identity.lat})<2300),home=original.filter(p=>homeland.has(p.id));
      const scored=home.length>=3?home:near.length?near:original;
      const occupied=scored.filter(p=>this.war(id,this.s.provinces[p.id].ctrl));
      const total=sum(scored.map(p=>p.vp)),lost=sum(occupied.map(p=>p.vp));
      // Surrender progress mixes victory points and land, so a country whose
      // cities sit on an exposed coast can still fight on from the interior.
      // Holding the original capital raises the bar; spirits (vast territory,
      // civil war, national resolve) move the threshold.
      const capCtrl=this.s.provinces[c.identity.capital]?.ctrl,limit=clamp(.65+(c.bonus.surrender||0),.4,.95);
      const share=total>0?.6*lost/total+.4*occupied.length/scored.length:0;
      if(!(share>limit&&this.war(id,capCtrl)||share>Math.min(.97,limit+.15)||!this.owned(id).length))continue;
      if(id==='FRA'&&this.s.historical&&!c.identity.exile&&this.s.historyState&&!this.s.historyState.flags.france_armistice&&(capCtrl==='GER'||this.mainOccupier16(id)==='GER')){
        const event=this.catalog.historicalEvents.find(e=>e.id==='h_french_armistice');
        if(event&&this.s.eventQueue.some(q=>q.event?.id===event.id))continue;
        if(event&&!this.s.seenEvents.includes(event.id)&&this.owned('FRA').some(p=>distance(p,{x:2.35,y:48.86})>2300)){
          // The armistice terms hand the capital over when it still holds out.
          if(!this.war('FRA',capCtrl))this.s.provinces[c.identity.capital].ctrl='GER';
          this.s.seenEvents.push(event.id);if(this.s.player==='FRA'){this.s.eventQueue.push({country:'FRA',event:clone(event)});this.historyRecord(event,'queued');}else this.historyChoice('FRA',event,0);
          continue;
        }
      }
      this.capitulate16(id);
    }
  };
  Engine.prototype.mainOccupier16=function(id){
    const tally={};
    for(const p of this.coreProvinces16(id)){const ctrl=this.s.provinces[p.id].ctrl;if(this.war(id,ctrl))tally[ctrl]=(tally[ctrl]||0)+p.vp;}
    return Object.keys(tally).sort((a,b)=>tally[b]-tally[a]||a.localeCompare(b))[0]||this.enemies(id)[0];
  };
  Engine.prototype.capitulate16=function(id){
    const c=this.nation(id),enemies=this.enemies(id),occupier=this.mainOccupier16(id);
    // A civil war ends with the whole country in the hands of the winner.
    const winner=this.nation(occupier);
    if(winner?.alive&&this.hasSpirit16(c,'civil_war')&&this.hasSpirit16(winner,'civil_war')&&this.isCore(occupier,c.identity.capital)){
      this.annex(occupier,id);
      this.log(this.info(occupier).name+' remporte la guerre civile.','war');
      if(id===this.s.player){this.s.outcome={type:'defeat',day:this.s.day,winner:occupier};this.s.paused=true;}
      this.frontCache={};this.indexUnits();return;
    }
    const host=this.active().find(o=>o!==id&&this.allies(id,o)&&!this.nation(o).capitulated16&&enemies.some(e=>this.war(o,e))&&this.owned(o).length);
    // A government that fights on in exile keeps the distant possessions the
    // enemy cannot reach by land; the homeland and everything in contact with
    // enemy-held land fall to the main occupier.
    let reach=null;
    if(host){
      const s=this.s,homeland=this.homeland16(id);reach=new Set();const q=[];
      for(const p of this.prov)if(s.provinces[p.id].ctrl===id&&(homeland.has(p.id)||p.neighbors.some(n=>this.war(id,s.provinces[n].ctrl)))){reach.add(p.id);q.push(p.id);}
      for(let h=0;h<q.length;h++)for(const n of this.prov[q[h]].neighbors)if(!reach.has(n)&&s.provinces[n].ctrl===id){reach.add(n);q.push(n);}
    }
    // The defeated country's own land goes to the main occupier; land it
    // occupied returns to its owner when that owner is on the winning side.
    this.s.provinces.forEach((st,pid)=>{
      if(st.ctrl!==id||reach&&!reach.has(pid))return;
      const owner=st.own&&st.own!==id?this.nation(st.own):null;
      if(owner?.alive&&(this.war(st.own,id)||this.allies(st.own,occupier))){st.ctrl=st.own;st.resistance=0;}
      else{st.ctrl=occupier;st.compliance=30;st.resistance=10;}
    });
    c.capitulated16={day:this.s.day,enemies:[...enemies],occupier};
    if(host){
      c.exile16={host};
      const haven=this.cap(host),port=this.owned(host).find(p=>this.s.provinces[p.id].port);
      for(const u of this.units(id)){u.pid=haven;u.path=[];u.progress=0;u.org=Math.min(u.org,40);u.landing16=null;}
      for(const w of this.s.wings.filter(w=>w.owner===id)){w.base=haven;w.mission='reserve';}
      for(const f of this.s.fleets.filter(f=>f.owner===id))if(port){f.base=port.id;f.zone=port.seaZone;f.mission='port';}
      this.log(this.info(id).name+' capitule ; son gouvernement poursuit la guerre en exil ('+this.info(host).name+').','war');
    }else{
      const winner=this.nation(occupier);
      for(const key of Object.keys(c.stock))if(winner){winner.stock[key]=(winner.stock[key]||0)+c.stock[key]*.4;c.stock[key]=0;}
      this.s.units=this.s.units.filter(u=>u.owner!==id);this.s.wings=this.s.wings.filter(w=>w.owner!==id);this.s.fleets=this.s.fleets.filter(f=>f.owner!==id);
      this.s.wars=this.s.wars.filter(w=>w.a!==id&&w.b!==id);
      c.alive=false;c.training=[];c.build=[];
      this.log(this.info(id).name+' capitule. Son territoire reste occupé jusqu’à la conférence de paix.','war');
      if(id===this.s.player){this.s.outcome={type:'defeat',day:this.s.day,winner:occupier};this.s.paused=true;}
    }
    this.frontCache={};this.indexUnits();
  };
  Engine.prototype.sideOf16=function(id){
    const c=this.nation(id);if(!c)return [id];
    if(c.faction==='none')return [id,...Object.keys(this.s.countries).filter(k=>this.nation(k).subject===id)];
    return Object.keys(this.s.countries).filter(k=>this.nation(k).faction===c.faction);
  };
  Engine.prototype.fighting16=function(id){const c=this.nation(id);return !!(c?.alive&&!c.capitulated16&&this.enemies(id).length);};
  Engine.onDay16(function(){
    if(this.s.conference16||this.s.day%3!==0)return;
    for(const [id,c] of Object.entries(this.s.countries)){
      if(!c.capitulated16||c.inConference16)continue;
      const side=this.sideOf16(id);
      if(side.some(k=>this.fighting16(k)))continue;
      const losers=side.filter(k=>this.nation(k).capitulated16);
      const winners=[...new Set(losers.flatMap(k=>[...this.nation(k).capitulated16.enemies,...this.enemies(k)]))].filter(k=>this.nation(k)?.alive&&!this.nation(k).capitulated16&&!losers.includes(k));
      if(!winners.length){for(const k of losers)this.restore16(k);continue;}
      this.openConference16(losers,winners);return;
    }
  });
  // A capitulated country whose enemies are gone gets its land back.
  Engine.prototype.restore16=function(id){
    const c=this.nation(id);if(!c)return;
    for(const st of this.s.provinces)if(st.own===id&&(this.allies(id,st.ctrl)||!this.nation(st.ctrl)?.alive||this.nation(st.ctrl)?.capitulated16))st.ctrl=id;
    if(!this.owned(id).length)return;
    c.alive=true;c.capitulated16=null;c.exile16=null;c.inConference16=false;
    for(const u of this.units(id)){u.pid=this.cap(id);u.path=[];}
    this.log(this.info(id).name+' recouvre sa souveraineté.','success');
  };
  Engine.prototype.conferenceStates16=function(losers){
    const rows=new Map();
    for(const p of this.prov){
      const st=this.s.provinces[p.id];if(!losers.includes(st.own))continue;
      const sid=this.stateId(p.id);
      if(!rows.has(sid))rows.set(sid,{sid,name:this.states16.list[sid].name,owner:st.own,provinces:[],vp:0,claimedBy:null,action:null});
      const row=rows.get(sid);row.provinces.push(p.id);row.vp+=p.vp;
    }
    return [...rows.values()];
  };
  Engine.prototype.openConference16=function(losers,winners){
    const states=this.conferenceStates16(losers),score=this.s.warScore16||{};
    const contribution=Object.fromEntries(winners.map(w=>[w,5+sum(losers.map(l=>score[w+'|'+l]||0))]));
    const totalContribution=sum(Object.values(contribution)),budget=sum(states.map(s=>4+s.vp*2))*.9;
    const participants=winners.map(w=>{
      const goal=this.nation(w).justifications.find(j=>losers.includes(j.target))?.goal||null;
      return {id:w,points:Math.round((20+budget*contribution[w]/totalContribution)*(goal?1.25:1)),start:0,passed:false,goal};
    }).sort((a,b)=>b.points-a.points||a.id.localeCompare(b.id));
    for(const p of participants)p.start=p.points;
    for(const l of losers)this.nation(l).inConference16=true;
    this.s.conference16={id:this.s.uid++,day:this.s.day,losers,participants,states,puppets:[],liberated:[],log:[],turn:0};
    this.log('Conférence de paix : '+losers.map(l=>this.info(l).name).join(', ')+'.','war');
    if(participants.some(p=>p.id===this.s.player)){this.s.paused=true;}
    this.conferenceAdvance16();
  };
  Engine.prototype.blocked16=function(){return !!this.s.conference16?.participants.some(p=>p.id===this.s.player&&!p.passed);};
  Engine.prototype.conferenceCost16=function(actor,row){
    const conf=this.s.conference16,controlled=row.provinces.filter(pid=>this.s.provinces[pid].ctrl===actor||this.allies(actor,this.s.provinces[pid].ctrl)&&this.s.provinces[pid].ctrl===actor).length;
    const core=row.provinces.some(pid=>this.isCore(actor,pid)),adjacent=row.provinces.some(pid=>this.prov[pid].neighbors.some(n=>this.s.provinces[n].ctrl===actor||this.s.provinces[n].own===actor));
    const goal=conf.participants.find(p=>p.id===actor)?.goal;
    let cost=(4+row.vp*2)*(controlled*2>=row.provinces.length?.6:1.25)*(core?.5:1)*(adjacent?.9:1.2);
    if(goal==='conquest')cost*=.85;if(goal==='border'&&adjacent)cost*=.7;
    return Math.max(1,Math.round(cost));
  };
  Engine.prototype.puppetCost16=function(actor,loser){
    const rows=this.s.conference16.states.filter(r=>r.owner===loser&&!r.claimedBy);
    const goal=this.s.conference16.participants.find(p=>p.id===actor)?.goal;
    return Math.max(1,Math.round(sum(rows.map(r=>this.conferenceCost16(actor,r)))*.55*(goal==='puppet'?.7:1)));
  };
  Engine.prototype.releasableRows16=function(def){
    const admins=new Set(def.admins);
    return this.s.conference16.states.filter(r=>!r.claimedBy&&r.provinces.some(pid=>admins.has(this.prov[pid].administration)));
  };
  Engine.prototype.conferenceAct16=function(actor,action){
    const conf=this.s.conference16,p=conf.participants.find(x=>x.id===actor);assert(conf&&p&&!p.passed,'Aucune conférence en cours pour ce pays.');
    const name=this.info(actor).name;
    if(action.type==='pass'){p.passed=true;conf.log.push(name+' se retire des négociations.');return;}
    if(action.type==='take'){
      const row=conf.states.find(r=>r.sid===action.sid);assert(row&&!row.claimedBy,'État déjà attribué.');
      const cost=this.conferenceCost16(actor,row);assert(p.points>=cost,'Points insuffisants ('+cost+').');
      p.points-=cost;row.claimedBy=actor;row.action='take';conf.log.push(name+' obtient '+row.name+' ('+cost+' points).');return;
    }
    if(action.type==='puppet'){
      assert(conf.losers.includes(action.loser),'Pays vaincu inconnu.');
      const rows=conf.states.filter(r=>r.owner===action.loser&&!r.claimedBy);assert(rows.length,'Aucun territoire disponible.');
      const cost=this.puppetCost16(actor,action.loser);assert(p.points>=cost,'Points insuffisants ('+cost+').');
      p.points-=cost;for(const r of rows){r.claimedBy=actor;r.action='puppet';}
      conf.puppets.push({loser:action.loser,overlord:actor});conf.log.push(name+' impose un gouvernement soumis à '+this.info(action.loser).name+' ('+cost+' points).');return;
    }
    if(action.type==='liberate'){
      const def=(this.catalog.releasables||[]).find(r=>r.id===action.id);assert(def&&!this.nation(def.id)?.alive,'Nation inconnue ou déjà indépendante.');
      const rows=this.releasableRows16(def);assert(rows.length,'Aucun territoire de cette nation n’est en jeu.');
      const cost=Math.max(1,Math.round(sum(rows.map(r=>this.conferenceCost16(actor,r)))*.5));assert(p.points>=cost,'Points insuffisants ('+cost+').');
      p.points-=cost;for(const r of rows){r.claimedBy=actor;r.action='liberate:'+def.id;}
      conf.liberated.push({id:def.id,by:actor,puppet:!!action.puppet});conf.log.push(name+' libère '+def.name+(action.puppet?' sous sa tutelle':'')+' ('+cost+' points).');return;
    }
    throw new Error('Action de conférence inconnue.');
  };
  Engine.prototype.conferenceAI16=function(actor){
    const conf=this.s.conference16,p=conf.participants.find(x=>x.id===actor),c=this.nation(actor);
    let best=null;
    for(const row of conf.states){
      if(row.claimedBy)continue;const cost=this.conferenceCost16(actor,row);if(cost>p.points)continue;
      const controlled=row.provinces.some(pid=>this.s.provinces[pid].ctrl===actor),core=row.provinces.some(pid=>this.isCore(actor,pid));
      const adjacent=row.provinces.some(pid=>this.prov[pid].neighbors.some(n=>this.s.provinces[n].ctrl===actor));
      const value=(controlled?3:0)+(core?5:0)+(adjacent?2:0)+row.vp/5-cost/25;
      if(value>1&&(!best||value>best.value))best={value,action:{type:'take',sid:row.sid}};
    }
    for(const loser of conf.losers){
      const rows=conf.states.filter(r=>r.owner===loser&&!r.claimedBy);if(rows.length<4)continue;
      const cost=this.puppetCost16(actor,loser);if(cost>p.points)continue;
      const value=(p.goal==='puppet'?6:2)+Math.min(3,rows.length/12)+(c.ideology!==this.nation(loser).ideology?1:0)-cost/40;
      if(!best||value>best.value)best={value,action:{type:'puppet',loser}};
    }
    if(c.ideology==='democratic')for(const def of this.catalog.releasables||[]){
      if(this.nation(def.id)?.alive)continue;const rows=this.releasableRows16(def);if(!rows.length)continue;
      const cost=Math.max(1,Math.round(sum(rows.map(r=>this.conferenceCost16(actor,r)))*.5));if(cost>p.points)continue;
      const value=1.5+rows.length/3-cost/30;
      if(!best||value>best.value)best={value,action:{type:'liberate',id:def.id,puppet:false}};
    }
    this.conferenceAct16(actor,best?.action||{type:'pass'});
  };
  Engine.prototype.conferenceAdvance16=function(){
    const conf=this.s.conference16;if(!conf)return;
    for(let guard=0;guard<2000;guard++){
      const open=conf.participants.filter(p=>!p.passed);
      if(!open.length||conf.states.every(r=>r.claimedBy)){this.closeConference16();return;}
      const p=open.sort((a,b)=>b.points-a.points||a.id.localeCompare(b.id))[0];
      if(p.points<1){p.passed=true;continue;}
      if(p.id===this.s.player)return;
      this.conferenceAI16(p.id);
    }
    this.closeConference16();
  };
  Engine.prototype.releaseCountry16=function(def,pids,subject=null){
    const parentId=this.s.provinces[pids[0]].own||this.s.provinces[pids[0]].ctrl,parent=this.nation(parentId)||this.nation(this.s.provinces[pids[0]].ctrl);
    const capital=pids.map(i=>this.prov[i]).sort((a,b)=>b.vp-a.vp||a.id-b.id)[0];
    const d=clone(parent.identity);
    Object.assign(d,{id:def.id,name:def.name,leader:def.leader||'Gouvernement provisoire',wiki:def.leader||def.name,role:'Chef du gouvernement',cabinet:null,headOfState:null,ideology:def.ideology||'authoritarian',color:def.color||'#969075',
      capital:capital.id,capitalName:capital.name,lon:capital.x,lat:capital.y,provinces:pids,cores:pids,commanders:[],divisions:0,civ:0,mil:0,fleet:0,air:0,manpower:Math.max(40000,pids.length*15000),faction:subject?this.nation(subject).faction:'none',exile:false,
      description:'État libéré ou recréé au cours de la campagne.'});
    const existing=this.nation(def.id);
    const c=existing||this.createNation(d);
    if(existing){Object.assign(existing.identity,d);existing.alive=true;existing.capitulated16=null;existing.exile16=null;}
    else this.s.countries[def.id]=c;
    c.subject=subject;c.autonomy16=subject?40:null;c.ideology=d.ideology;
    if(!existing)for(const k in c.parties)c.parties[k]=k===d.ideology?60:13.3;
    for(const pid of pids){const st=this.s.provinces[pid];st.ctrl=def.id;st.own=def.id;st.resistance=0;st.compliance=80;}
    const army=this.addArmy(def.id);
    const template=c.templates[0],count=Math.min(8,Math.max(1,Math.round(pids.length/4)));
    for(let i=0;i<count;i++){const u=this.spawn(def.id,pids[i%pids.length],template,60);u.army=army.id;}
    this.updateStats();this.defaultProduction(def.id);this.frontCache={};
    return c;
  };
  Engine.prototype.closeConference16=function(){
    const conf=this.s.conference16;if(!conf)return;
    for(const row of conf.states){
      if(row.action==='take'){for(const pid of row.provinces){const st=this.s.provinces[pid];st.ctrl=row.claimedBy;st.own=row.claimedBy;st.compliance=25;st.resistance=10;}}
    }
    for(const lib of conf.liberated){
      const def=this.catalog.releasables.find(r=>r.id===lib.id),pids=conf.states.filter(r=>r.action==='liberate:'+lib.id).flatMap(r=>r.provinces);
      if(def&&pids.length)this.releaseCountry16(def,pids,lib.puppet?lib.by:null);
    }
    for(const loser of conf.losers){
      const c=this.nation(loser),rows=conf.states.filter(r=>r.owner===loser&&(!r.claimedBy||r.action==='puppet'));
      for(const r of rows)for(const pid of r.provinces){const st=this.s.provinces[pid];st.ctrl=loser;st.own=loser;st.resistance=0;}
      const puppet=conf.puppets.find(x=>x.loser===loser);
      c.inConference16=false;c.capitulated16=null;c.exile16=null;
      if(rows.length){
        c.alive=true;c.capitulated16=null;c.exile16=null;
        c.subject=puppet?puppet.overlord:null;c.autonomy16=puppet?30:null;c.faction=puppet?this.nation(puppet.overlord).faction:'none';
        if(!this.s.provinces[c.identity.capital]||this.s.provinces[c.identity.capital].ctrl!==loser){const home=this.owned(loser).sort((a,b)=>b.vp-a.vp)[0];Object.assign(c.identity,{capital:home.id,capitalName:home.name,lon:home.x,lat:home.y});}
        for(const u of this.units(loser)){u.pid=this.cap(loser);u.path=[];}
        if(!this.units(loser).length){const a=this.addArmy(loser);for(let i=0;i<3;i++){const u=this.spawn(loser,this.cap(loser),c.templates[0],50);u.army=a.id;}}
      }else{
        c.alive=false;this.s.units=this.s.units.filter(u=>u.owner!==loser);this.s.wings=this.s.wings.filter(w=>w.owner!==loser);this.s.fleets=this.s.fleets.filter(f=>f.owner!==loser);
      }
    }
    const winners=conf.participants.map(p=>p.id);
    // Occupied land of the winning side returns to its rightful owner.
    for(const st of this.s.provinces){
      const owner=this.nation(st.own);
      if(owner&&st.own!==st.ctrl&&!conf.losers.includes(st.own)&&(winners.includes(st.ctrl)||conf.losers.includes(st.ctrl))&&!this.war(st.own,st.ctrl)){
        st.ctrl=st.own;if(!owner.alive)this.restore16(st.own);
      }
    }
    for(const [id,c] of Object.entries(this.s.countries))if(c.capitulated16&&!c.inConference16&&!conf.losers.includes(id)&&this.owned(id).length&&this.sideOf16(id).some(k=>winners.includes(k)))this.restore16(id);
    this.s.wars=this.s.wars.filter(w=>!((winners.includes(w.a)&&conf.losers.includes(w.b))||(winners.includes(w.b)&&conf.losers.includes(w.a))));
    for(const l of conf.losers)for(const w of winners){const a=this.nation(l),b=this.nation(w);if(a&&b){a.pacts.push({target:w,until:this.s.day+365});b.pacts.push({target:l,until:this.s.day+365});}}
    for(const key of Object.keys(this.s.warScore16||{})){const [a,b]=key.split('|');if(conf.losers.includes(a)||conf.losers.includes(b))delete this.s.warScore16[key];}
    this.s.peaceLog16??=[];this.s.peaceLog16.unshift({day:this.s.day,losers:conf.losers,log:conf.log.slice(-40)});if(this.s.peaceLog16.length>12)this.s.peaceLog16.length=12;
    this.s.conference16=null;
    this.log('Le traité de paix est signé : '+conf.log.length+' clauses.','success');
    if(conf.losers.includes(this.s.player)&&!this.nation().alive){this.s.outcome={type:'defeat',day:this.s.day,winner:winners[0]};this.s.paused=true;}
    for(const u of this.s.units)if(!this.access(u.owner,this.s.provinces[u.pid].ctrl)&&!this.war(u.owner,this.s.provinces[u.pid].ctrl)){u.pid=this.cap(u.owner);u.path=[];}
    this.s.battles=[];this.frontCache={};this.updateStats();this.indexUnits();this.computeSupply();
  };
  Engine.command16('peaceTake',function(p,id){this.conferenceAct16(id,{type:'take',sid:p.sid});this.conferenceAdvance16();});
  Engine.command16('peacePuppet',function(p,id){this.conferenceAct16(id,{type:'puppet',loser:p.loser});this.conferenceAdvance16();});
  Engine.command16('peaceLiberate',function(p,id){this.conferenceAct16(id,{type:'liberate',id:p.id,puppet:!!p.puppet});this.conferenceAdvance16();});
  Engine.command16('peacePass',function(p,id){this.conferenceAct16(id,{type:'pass'});this.conferenceAdvance16();});
  Engine.command16('peaceAuto',function(p,id){const conf=this.s.conference16;assert(conf,'Aucune conférence en cours.');
    for(let guard=0;guard<500&&this.s.conference16&&conf.participants.some(x=>x.id===id&&!x.passed);guard++){this.conferenceAI16(id);this.conferenceAdvance16();}});

  // ---------------------------------------------------------------------------
  // Diplomacy: war goals, volunteers, expeditionary forces, subject autonomy,
  // releasable nations, ideological civil wars and coups.
  // ---------------------------------------------------------------------------
  const WAR_GOALS={conquest:{name:'Conquête',days:1,tension:5},puppet:{name:'Vassalisation',days:.8,tension:3},border:{name:'Rectification de frontière',days:.5,tension:2}};
  Engine.WAR_GOALS16=WAR_GOALS;
  Engine.command16('justify',function(p,id,c){
    const goal=WAR_GOALS[p.goal||'conquest'];assert(goal,'But de guerre inconnu.');
    const t=this.nation(p.target);assert(t?.alive&&p.target!==id,'Pays cible invalide.');
    assert(!this.allies(id,p.target)&&!this.war(id,p.target),'Objectif invalide.');assert(!c.justifications.some(j=>j.target===p.target),'Justification déjà engagée.');
    if(p.goal==='border')assert(this.owned(id).some(q=>q.neighbors.some(n=>this.s.provinces[n].ctrl===p.target)),'Une rectification de frontière exige une frontière commune.');
    const threatened=this.active().some(o=>this.allies(id,o)&&this.war(o,p.target));
    if(c.ideology==='democratic')assert(this.s.tension>=40||threatened,'Une démocratie exige 40 % de tension mondiale ou un allié attaqué.');
    pp(c,40);c.pp-=40;
    c.justifications.push({target:p.target,progress:0,days:Math.round((c.ideology==='democratic'?120:60)*goal.days),goal:p.goal||'conquest'});
    this.s.tension=clamp(this.s.tension+goal.tension,0,100);
  });
  // Volunteers and expeditionary forces: divisions lent to another country.
  Engine.prototype.lend16=function(home,target,units,kind){
    const t=this.nation(target);
    let army=this.s.armies.find(a=>a.owner===target&&a.name.startsWith(kind==='volunteer'?'Volontaires':'Corps expéditionnaire')&&a.name.endsWith(this.info(home).name));
    if(!army){army=this.addArmy(target,(kind==='volunteer'?'Volontaires de ':'Corps expéditionnaire de ')+this.info(home).name);army.auto=true;army.target=this.enemies(target)[0]||null;army.order=army.target?'attack':'defend';}
    const landing=this.cap(target);
    for(const u of units){
      u.lent16={home,kind,day:this.s.day};u.owner=target;u.army=army.id;u.path=[];u.landing16=null;
      if(!this.access(target,this.s.provinces[u.pid].ctrl))u.pid=landing;
    }
    this.indexUnits();
  };
  Engine.prototype.recall16=function(u){
    const home=u.lent16.home;if(!this.nation(home)?.alive){u.strength=0;return;}
    u.owner=home;u.lent16=null;u.path=[];u.landing16=null;
    u.army=this.s.armies.find(a=>a.owner===home)?.id??this.addArmy(home).id;
    if(!this.access(home,this.s.provinces[u.pid].ctrl))u.pid=this.cap(home);
  };
  Engine.command16('volunteers',function(p,id,c){
    const t=this.nation(p.target);assert(t?.alive&&p.target!==id,'Pays cible invalide.');
    assert(this.enemies(p.target).length,'Ce pays n’est pas en guerre.');
    assert(!this.enemies(p.target).some(e=>this.war(id,e))&&!this.war(id,p.target),'Vous êtes déjà partie prenante : utilisez un corps expéditionnaire.');
    assert(this.s.tension>=20||t.ideology===c.ideology,'Il faut 20 % de tension mondiale ou une idéologie commune.');
    const units=[...new Set(p.ids||[])].map(uid=>this.s.units.find(u=>u.id===uid&&u.owner===id));
    assert(units.length&&units.every(Boolean),'Sélectionnez vos divisions.');
    const lent=this.s.units.filter(u=>u.lent16?.home===id&&u.lent16.kind==='volunteer').length;
    assert(lent+units.length<=Math.max(2,Math.floor(this.units(id).length*.15)),'Les volontaires sont limités à 15 % de vos divisions.');
    pp(c,20);c.pp-=20;this.lend16(id,p.target,units,'volunteer');c.relations[p.target]=clamp((c.relations[p.target]||0)+15,-100,100);
  });
  Engine.command16('expeditionary',function(p,id,c){
    assert(this.allies(id,p.target)&&p.target!==id&&this.nation(p.target)?.alive,'Un corps expéditionnaire rejoint un allié de faction.');
    const units=[...new Set(p.ids||[])].map(uid=>this.s.units.find(u=>u.id===uid&&u.owner===id));
    assert(units.length&&units.every(Boolean),'Sélectionnez vos divisions.');
    this.lend16(id,p.target,units,'expedition');
  });
  Engine.command16('recall',function(p,id){
    const units=this.s.units.filter(u=>u.lent16?.home===id&&(!p.ids||p.ids.includes(u.id)));assert(units.length,'Aucune division prêtée.');
    for(const u of units)this.recall16(u);this.indexUnits();
  });
  Engine.onDay16(function(){
    for(const u of this.s.units){
      if(!u.lent16)continue;
      const home=u.lent16.home,host=u.owner;
      if(!this.nation(host)?.alive||!this.nation(home)?.alive||this.war(home,host)||(u.lent16.kind==='volunteer'&&!this.enemies(host).length)||(u.lent16.kind==='expedition'&&!this.allies(home,host)))this.recall16(u);
    }
  });
  // Subjects: autonomy from 0 (integrated) to 100 (independence).
  Engine.SUBJECT_LEVELS16=[[0,'Protectorat intégré'],[20,'État fantoche'],[45,'Protectorat'],[70,'Dominion']];
  Engine.prototype.subjectLevel16=function(c){let name='';for(const [n,label] of Engine.SUBJECT_LEVELS16)if((c.autonomy16??40)>=n)name=label;return name;};
  Engine.onDay16(function(){
    if(this.s.day%30!==0)return;
    for(const [id,c] of Object.entries(this.s.countries)){
      if(!c.alive||!c.subject)continue;
      const overlord=this.nation(c.subject);if(!overlord?.alive){c.subject=null;c.autonomy16=null;continue;}
      c.autonomy16??=40;
      const garrison=this.units(c.subject).filter(u=>this.s.provinces[u.pid].ctrl===id).length;
      const drift=this.units(id).length*.08+(c.stability-50)*.03-garrison*.15-(this.enemies(c.subject).length&&this.allies(id,c.subject)?.3:0);
      c.autonomy16=clamp(c.autonomy16+drift,0,100);
      if(c.autonomy16>=100){c.subject=null;c.autonomy16=null;this.log(this.info(id).name+' obtient sa pleine indépendance.','event');}
    }
  });
  Engine.command16('autonomy',function(p,id,c){
    const t=this.nation(p.target);assert(t?.alive&&t.subject===id,'Ce pays n’est pas un sujet.');assert([-1,1].includes(p.delta),'Variation invalide.');
    pp(c,40);c.pp-=40;t.autonomy16=clamp((t.autonomy16??40)+p.delta*10,0,99);
    if(p.delta<0)t.stability=clamp(t.stability-3,0,100);
  });
  Engine.command16('annexSubject',function(p,id,c){
    const t=this.nation(p.target);assert(t?.alive&&t.subject===id,'Ce pays n’est pas un sujet.');
    assert((t.autonomy16??40)<20,'L’autonomie doit être inférieure à 20.');pp(c,120);c.pp-=120;this.annex(id,p.target);
  });
  Engine.command16('releaseSubject',function(p,id,c){
    const t=this.nation(p.target);assert(t?.alive&&t.subject===id,'Ce pays n’est pas un sujet.');
    t.subject=null;t.autonomy16=null;t.faction='none';c.relations[p.target]=clamp((c.relations[p.target]||0)+40,-100,100);
  });
  Engine.command16('demandAutonomy',function(p,id,c){
    assert(c.subject,'Votre pays n’est pas un sujet.');pp(c,50);c.pp-=50;
    c.autonomy16=clamp((c.autonomy16??40)+12,0,100);c.relations[c.subject]=clamp((c.relations[c.subject]||0)-10,-100,100);
  });
  // Resource extraction by the overlord (game abstraction).
  const updateStats16=Engine.prototype.updateStats;
  Engine.prototype.updateStats=function(){
    updateStats16.call(this);
    for(const [id,c] of Object.entries(this.s.countries)){
      if(!c.alive||!c.subject||!c.stats)continue;const overlord=this.nation(c.subject);if(!overlord?.alive||!overlord.stats)continue;
      const share=(100-(c.autonomy16??40))/100*.3;
      for(const r of RESOURCES){const taken=c.stats[r]*share;c.stats[r]-=taken;overlord.stats[r]+=taken;}
    }
  };
  // Releasable nations from one's own territory.
  Engine.prototype.releasableFor16=function(id){
    const total=this.owned(id).length;
    return (this.catalog.releasables||[]).filter(def=>!this.nation(def.id)?.alive).map(def=>{
      const admins=new Set(def.admins),pids=this.prov.filter(p=>admins.has(p.administration)&&this.s.provinces[p.id].ctrl===id).map(p=>p.id);
      return {def,pids};
    }).filter(x=>x.pids.length&&x.pids.length<total);
  };
  Engine.command16('releaseNation',function(p,id,c){
    const entry=this.releasableFor16(id).find(x=>x.def.id===p.id);assert(entry,'Nation non libérable.');
    assert(!entry.pids.some(pid=>this.s.battles.some(b=>b.pid===pid)),'Combats en cours sur ce territoire.');
    pp(c,50);c.pp-=50;
    for(const u of this.units(id))if(entry.pids.includes(u.pid)){u.pid=this.cap(id);u.path=[];}
    this.releaseCountry16(entry.def,entry.pids,p.puppet?id:null);
    if(p.puppet)this.nation(entry.def.id).faction=c.faction==='none'?'Pacte '+id:c.faction;
    if(p.puppet&&c.faction==='none')c.faction='Pacte '+id;
    this.log(entry.def.name+' est '+(p.puppet?'libéré sous votre tutelle':'désormais indépendant')+'.','success');
  });
  // Ideological civil wars.
  const CIVIL_NAMES={communist:'gouvernement révolutionnaire',fascist:'régime national',democratic:'gouvernement démocratique',authoritarian:'junte militaire'};
  Engine.prototype.civilWar16=function(id,ideology,sponsor=null){
    const base=this.nation(id);if(!base?.alive)return null;
    const candidates=[id[0]+'R'+id[2],'R'+id.slice(0,2),'X'+id.slice(1),id.slice(0,2)+'X',id[0]+'Z'+id[2]];
    const tag=candidates.find(k=>/^[A-Z][A-Z0-9]{2}$/.test(k)&&!this.s.countries[k]&&!this.defs[k]);if(!tag)return null;
    const states=[...new Set(this.owned(id).map(p=>this.stateId(p.id)))].map(sid=>this.states16.list[sid]);
    const capital=this.prov[this.cap(id)];
    states.sort((a,b)=>distance(this.prov[b.capital],capital)-distance(this.prov[a.capital],capital));
    const share=clamp((base.parties[ideology]||40)/100,.3,.55),total=sum(states.map(s=>s.score));
    const rebelStates=[];let acc=0;for(const st of states){if(acc>=total*share)break;if(st.provinces.includes(capital.id))continue;rebelStates.push(st);acc+=st.score;}
    const pids=rebelStates.flatMap(st=>st.provinces.filter(pid=>this.s.provinces[pid].ctrl===id));if(!pids.length)return null;
    const def={id:tag,name:base.identity.name+' — '+CIVIL_NAMES[ideology],ideology,color:{communist:'#a8574c',fascist:'#6b5a3c',democratic:'#5d84a8',authoritarian:'#7a7a52'}[ideology],leader:'Comité '+(IDEO_FR[ideology]||ideology)};
    const rebel=this.releaseCountry16(def,pids,null);
    rebel.identity.cores=[...new Set([...(base.identity.cores||this.prov.filter(p=>p.owner===id).map(p=>p.id))])];
    rebel.faction=sponsor?this.nation(sponsor).faction:'none';
    for(const k of Object.keys(rebel.stock)){rebel.stock[k]=(base.stock[k]||0)*share;base.stock[k]=(base.stock[k]||0)*(1-share);}
    rebel.manpower=base.manpower*share;base.manpower*=1-share;rebel.pool=base.pool*share;base.pool*=1-share;
    const army=this.s.armies.find(a=>a.owner===tag);
    for(const u of this.units(id))if(pids.includes(u.pid)){u.owner=tag;u.army=army.id;u.path=[];}
    army.target=id;army.order='attack';army.auto=true;
    base.parties[ideology]=Math.max(5,(base.parties[ideology]||0)*.4);
    this.declareWar(tag,id,true,false);this.addSpirit16(tag,'civil_war');this.addSpirit16(id,'civil_war');
    if(sponsor&&this.nation(sponsor)?.alive)for(const k of [sponsor])if(!this.war(k,id)&&!this.allies(k,id))this.nation(k).relations[tag]=100;
    this.regroupLoyalists16(id);
    this.log('Guerre civile : '+def.name+' se soulève contre le gouvernement de '+base.identity.name+'.','war');
    return rebel;
  };
  const IDEO_FR={communist:'révolutionnaire',fascist:'national',democratic:'démocratique',authoritarian:'militaire'};
  // Chinese regional powers: they join the central government's war against
  // an invader (united front) and can be rallied by decision.
  const WARLORDS=['PRC','SHX','GXC','YUN','XSM'];
  Engine.WARLORDS16=WARLORDS;
  Engine.prototype.integrable16=function(id){
    if(id!=='CHI')return [];
    return WARLORDS.filter(k=>k!=='PRC'&&k!==this.s.player&&this.nation(k)?.alive&&!this.nation(k).subject&&!this.war(id,k)&&!this.nation(k).capitulated16);
  };
  Engine.onDay16(function(){
    if(this.s.day%7!==2||!this.nation('CHI')?.alive||this.nation('CHI').capitulated16)return;
    const invaders=this.enemies('CHI').filter(e=>!WARLORDS.includes(e)&&e!=='SIK');
    if(!invaders.length)return;
    for(const k of WARLORDS){
      const n=this.nation(k);if(!n?.alive||n.subject||n.capitulated16||k===this.s.player)continue;
      for(const e of invaders)if(!this.war(k,e)&&!this.allies(k,e))try{this.declareWar(k,e,true,false);}catch{}
      n.relations.CHI=Math.max(n.relations.CHI||0,50);
    }
  });
  Engine.onDay16(function(){
    if(this.s.day%30!==15)return;
    for(const id of this.active()){
      const c=this.nation(id);if(c.subject||c.capitulated16||id===this.s.player&&this.s.historical&&this.s.day<365)continue;
      const rival=Object.keys(c.parties).filter(k=>k!==c.ideology).sort((a,b)=>c.parties[b]-c.parties[a])[0];
      if(rival&&c.parties[rival]>=60&&c.stability<35&&this.owned(id).length>=6)this.civilWar16(id,rival);
    }
  });
  Engine.command16('coup',function(p,id,c){
    const t=this.nation(p.target);assert(t?.alive&&p.target!==id,'Pays cible invalide.');assert(!this.war(id,p.target),'Impossible en guerre.');
    assert((c.intel[p.target]||0)>=60,'Il faut 60 % de renseignement sur ce pays.');assert(t.ideology!==c.ideology,'Ce pays partage déjà votre idéologie.');
    assert((t.parties[c.ideology]||0)>=30,'Votre courant doit dépasser 30 % dans ce pays.');
    pp(c,100);c.pp-=100;c.intel[p.target]-=40;
    const rebel=this.civilWar16(p.target,c.ideology,id);assert(rebel,'Le coup d’État a échoué.');
  });
  Engine.invariant16(function(state){
    for(const p of state.provinces)assert(state.countries[p.own],'Propriétaire de jure invalide.');
    for(const [id,c] of Object.entries(state.countries)){
      if(c.autonomy16!=null)assert(finite(c.autonomy16,0,100),'Autonomie invalide.');
      if(c.exile16)assert(state.countries[c.exile16.host],'Gouvernement en exil invalide.');
    }
    for(const u of state.units)if(u.lent16)assert(state.countries[u.lent16.home]&&['volunteer','expedition'].includes(u.lent16.kind),'Division prêtée invalide.');
    const conf=state.conference16;
    if(conf){assert(Array.isArray(conf.losers)&&Array.isArray(conf.participants)&&Array.isArray(conf.states),'Conférence invalide.');for(const r of conf.states)assert(Array.isArray(r.provinces)&&r.provinces.every(pid=>this.prov[pid]),'État de conférence invalide.');}
  });

  // ---------------------------------------------------------------------------
  // Government: advisors by office, national spirits and decisions.
  // ---------------------------------------------------------------------------
  Engine.prototype.applyBonus16=function(c,effect,sign=1){
    for(const [k,v] of Object.entries(effect||{}))if(k in c.bonus)c.bonus[k]=clamp(c.bonus[k]+sign*v,-.5,5);
  };
  Engine.prototype.hasSpirit16=function(c,id){return (c.spirits16||[]).some(s=>s.id===id);};
  Engine.prototype.addSpirit16=function(id,spiritId,days=null){
    const c=this.nation(id),def=(this.catalog.spirits||[]).find(s=>s.id===spiritId);if(!c||!def)return;
    c.spirits16??=[];const existing=c.spirits16.find(s=>s.id===spiritId);
    if(existing){existing.until=days?Math.max(existing.until??0,this.s.day+days):null;return;}
    c.spirits16.push({id:spiritId,until:days?this.s.day+days:null});this.applyBonus16(c,def.effect,1);
    if(id===this.s.player)this.log('Esprit national : '+def.name+'.','event');
  };
  Engine.prototype.removeSpirit16=function(id,spiritId){
    const c=this.nation(id),def=(this.catalog.spirits||[]).find(s=>s.id===spiritId);if(!c||!def||!this.hasSpirit16(c,spiritId))return;
    c.spirits16=c.spirits16.filter(s=>s.id!==spiritId);this.applyBonus16(c,def.effect,-1);
  };
  Engine.onDay16(function(){
    for(const id of this.active()){
      const c=this.nation(id);
      for(const s of [...(c.spirits16||[])])if(s.until!==null&&s.until<=this.s.day)this.removeSpirit16(id,s.id);
      if(c.bonus.stabilityGrowth)c.stability=clamp(c.stability+c.bonus.stabilityGrowth*.05,0,100);
      if(c.bonus.supportGrowth)c.support=clamp(c.support+c.bonus.supportGrowth*.05,0,100);
    }
  });
  const ADVISOR_SLOTS=()=>CATALOG.advisorSlots||{};
  Engine.prototype.hireAdvisor16=function(id,advisorId,replace=null){
    const c=this.nation(id),a=(this.catalog.advisors||[]).find(x=>x.id===advisorId);assert(a,'Conseiller inconnu.');
    assert(!a.ideology||a.ideology.includes(c.ideology),'Ce conseiller ne sert pas ce régime.');
    c.advisors16??={};const list=c.advisors16[a.slot]??=[];assert(!list.includes(advisorId),'Conseiller déjà nommé.');
    const max=ADVISOR_SLOTS()[a.slot]?.[1]||1;
    if(list.length>=max){const old=replace&&list.includes(replace)?replace:list[0];this.dismissAdvisor16(id,old);}
    c.advisors16[a.slot].push(advisorId);this.applyBonus16(c,a.effect,1);
  };
  Engine.prototype.dismissAdvisor16=function(id,advisorId){
    const c=this.nation(id),a=(this.catalog.advisors||[]).find(x=>x.id===advisorId);if(!a||!c.advisors16?.[a.slot]?.includes(advisorId))return;
    c.advisors16[a.slot]=c.advisors16[a.slot].filter(x=>x!==advisorId);this.applyBonus16(c,a.effect,-1);
  };
  Engine.command16('hireAdvisor',function(p,id,c){
    const a=(this.catalog.advisors||[]).find(x=>x.id===p.id);assert(a,'Conseiller inconnu.');pp(c,a.cost);
    this.hireAdvisor16(id,p.id,p.replace||null);c.pp-=a.cost;
  });
  Engine.command16('dismissAdvisor',function(p,id){this.dismissAdvisor16(id,p.id);});
  // 1.5 single council: mapped to the matching political advisor.
  Engine.command16('advisor',function(p,id,c){
    const map={economy:'industrialist',science:'scientist',logistics:'logistician'};
    for(const old of Object.values(map))this.dismissAdvisor16(id,old);
    if(p.kind){assert(map[p.kind],'Conseil inconnu.');pp(c,80);this.hireAdvisor16(id,map[p.kind]);c.pp-=80;}
    c.advisor=null;
  });
  Engine.prototype.decisionReason16=function(id,d){
    const c=this.nation(id),r=d.requires||{},used=c.decisions16?.[d.id],atWar=this.enemies(id).length>0;
    if(r.country&&!r.country.includes(id))return 'Réservée à d’autres pays.';
    if(r.ideology&&!r.ideology.includes(c.ideology))return 'Régime incompatible.';
    if(r.notIdeology?.includes(c.ideology))return 'Régime incompatible.';
    if(r.war&&!atWar)return 'Exige une guerre en cours.';
    if(r.peace&&atWar)return 'Impossible en temps de guerre.';
    if(r.tension&&this.s.tension<r.tension&&!atWar)return 'Tension mondiale insuffisante ('+r.tension+' %).';
    if(r.tech&&!c.tech.includes(r.tech))return 'Technologie requise : '+(this.tech(r.tech)?.name||r.tech)+'.';
    if(r.spirit&&!this.hasSpirit16(c,r.spirit))return 'Condition nationale absente.';
    if(r.faction&&c.faction==='none')return 'Exige une faction.';
    if(r.overseas&&!this.ownedToday16(id).some(p=>p.overseas))return 'Aucun territoire d’outre-mer.';
    if(r.warlord&&!this.integrable16(id).length)return 'Aucun gouverneur provincial à rallier.';
    if(d.once&&used)return 'Décision déjà prise.';
    if(used&&d.cooldown&&used.day+d.cooldown>this.s.day)return 'Disponible dans '+(used.day+d.cooldown-this.s.day)+' jours.';
    if(c.pp<d.cost)return 'Il faut '+d.cost+' points politiques.';
    return '';
  };
  Engine.prototype.decisionSpecial16=function(id,sp){
    const c=this.nation(id),s=this.s,owned=this.owned(id),byVp=(a,b)=>b.vp-a.vp||a.id-b.id;
    if(sp.treasury&&c.macro)c.macro.treasury+=sp.treasury;
    if(sp.manpower)c.manpower+=c.identity.manpower*sp.manpower;
    if(sp.unrest&&c.politics)c.politics.unrest=clamp(c.politics.unrest+sp.unrest,0,100);
    if(sp.legitimacy&&c.politics)c.politics.legitimacy=clamp(c.politics.legitimacy+sp.legitimacy,0,100);
    if(sp.party){c.parties[c.ideology]+=sp.party;const t=sum(Object.values(c.parties));for(const k in c.parties)c.parties[k]*=100/t;}
    if(sp.convert){let n=sp.convert;for(const p of owned.filter(p=>s.provinces[p.id].civ>0).sort((a,b)=>s.provinces[b.id].civ-s.provinces[a.id].civ)){while(n>0&&s.provinces[p.id].civ>0){s.provinces[p.id].civ--;s.provinces[p.id].mil++;n--;}if(!n)break;}}
    if(sp.infra)for(const p of owned.filter(p=>s.provinces[p.id].infra<5).sort(byVp).slice(0,sp.infra))s.provinces[p.id].infra++;
    if(sp.refinery){const cap=this.cap(id);s.provinces[cap].refinery++;const sid=this.stateId(cap);s.stateExtra[sid]=Math.max(s.stateExtra[sid],this.stateUsed(sid)-this.states16.list[sid].slots);}
    if(sp.forts){
      const facing=sp.facing?new Set(sp.facing):null;
      const border=owned.filter(p=>p.neighbors.some(n=>{const k=s.provinces[n].ctrl;return k!==id&&!this.allies(id,k)&&(!facing||facing.has(k));})).filter(p=>s.provinces[p.id].fort<5).sort(byVp);
      for(const p of border.slice(0,sp.forts))s.provinces[p.id].fort=Math.min(5,s.provinces[p.id].fort+(sp.fortLevel||1));
    }
    if(sp.coastal)for(const p of owned.filter(p=>p.coast&&s.provinces[p.id].coastalFort<5).sort(byVp).slice(0,sp.coastal))s.provinces[p.id].coastalFort++;
    if(sp.aa)for(const p of owned.filter(p=>s.provinces[p.id].aa<5).sort(byVp).slice(0,sp.aa))s.provinces[p.id].aa++;
    if(sp.radar)for(const p of owned.filter(p=>p.coast&&s.provinces[p.id].radar<3).sort((a,b)=>distance(a,this.prov[this.cap(id)])-distance(b,this.prov[this.cap(id)])).slice(0,sp.radar))s.provinces[p.id].radar++;
    if(sp.scorch)for(const p of owned)if(p.neighbors.some(n=>this.war(id,s.provinces[n].ctrl)))s.provinces[p.id].damage=clamp(s.provinces[p.id].damage+.3,0,.85);
    if(sp.militia){const t=c.templates.find(t=>t.id==='garrison')||c.templates[0],a=this.s.armies.find(a=>a.owner===id);for(let i=0;i<sp.militia;i++){const u=this.spawn(id,this.cap(id),t,60);u.strength=.7;if(a)u.army=a.id;}}
    if(sp.colonial)c.manpower+=owned.filter(p=>p.overseas).length*2000;
    if(sp.integrate){
      // A provincial power rallies: its troops, stocks and land join peacefully.
      const k=this.integrable16(id).sort((a,b)=>(this.nation(b).relations[id]||0)-(this.nation(a).relations[id]||0)||a.localeCompare(b))[0];
      if(k){
        const army=this.s.armies.find(a=>a.owner===id)||this.addArmy(id),n=this.nation(k);
        for(const u of this.units(k)){u.owner=id;u.army=army.id;u.path=[];}
        for(const key of Object.keys(n.stock))c.stock[key]=(c.stock[key]||0)+n.stock[key]*.6;
        c.manpower+=n.manpower;
        this.annex(id,k);
        for(const p of this.prov)if(p.owner===k){const st=this.s.provinces[p.id];if(st.ctrl===id){st.compliance=80;st.resistance=0;}}
        c.identity.cores=[...new Set([...(c.identity.cores||this.prov.filter(p=>p.owner===id).map(p=>p.id)),...this.prov.filter(p=>p.owner===k).map(p=>p.id)])];
        this.log(this.info(k).name+' se rallie au gouvernement de '+this.info(id).name+'.','event');
      }
    }
    if(sp.dominions)for(const k of ['CAN','AST','NZL','SAF','RAJ']){const d=this.nation(k);if(!d?.alive)continue;c.relations[k]=clamp((c.relations[k]||0)+30,-100,100);if(c.faction!=='none'&&['none','Commonwealth'].includes(d.faction))d.faction=c.faction;}
    if(sp.build)for(const [kind,n] of Object.entries(sp.build)){
      const sites=owned.filter(p=>this.isCore(id,p.id)).sort(byVp);
      for(let i=0;i<n&&sites.length;i++){const p=sites[i%Math.min(sites.length,6)];s.provinces[p.id][kind]++;const sid=this.stateId(p.id);s.stateExtra[sid]=Math.max(s.stateExtra[sid],this.stateUsed(sid)-this.states16.list[sid].slots);}
    }
    if(sp.evacuate){
      let n=sp.evacuate;const east=owned.filter(p=>p.x>55&&this.isCore(id,p.id)).sort(byVp);
      if(east.length)for(const p of owned.filter(p=>p.x<40).sort((a,b)=>(s.provinces[b.id].civ+s.provinces[b.id].mil)-(s.provinces[a.id].civ+s.provinces[a.id].mil))){
        for(const kind of ['mil','civ'])while(n>0&&s.provinces[p.id][kind]>0){s.provinces[p.id][kind]--;const to=east[n%east.length];s.provinces[to.id][kind]++;const sid=this.stateId(to.id);s.stateExtra[sid]=Math.max(s.stateExtra[sid],this.stateUsed(sid)-this.states16.list[sid].slots);n--;}
        if(!n)break;
      }
    }
  };
  Engine.prototype.takeDecision16=function(id,decisionId){
    const c=this.nation(id),d=(this.catalog.decisions||[]).find(x=>x.id===decisionId);assert(d,'Décision inconnue.');
    const reason=this.decisionReason16(id,d);assert(!reason,reason);
    c.pp-=d.cost;c.decisions16??={};c.decisions16[d.id]={day:this.s.day,uses:(c.decisions16[d.id]?.uses||0)+1};
    this.effect(id,d.effect||{});
    if(d.spirit)this.addSpirit16(id,d.spirit,d.days||null);
    for(const r of d.removeSpirit||[])this.removeSpirit16(id,r);
    if(d.special)this.decisionSpecial16(id,d.special);
    if(id===this.s.player){this.log('Décision : '+d.name+'.','success');this.updateStats();}
  };
  Engine.command16('takeDecision',function(p,id){this.takeDecision16(id,p.id);});
  // Focus trees may grant or remove spirits and advisors-like modifiers.
  // ---------------------------------------------------------------------------
  // National focus trees: OR prerequisites, multi-way exclusive branches,
  // conditions, political paths, alliances, claims and research bonuses.
  // ---------------------------------------------------------------------------
  const asList=v=>v==null?[]:Array.isArray(v)?v:[v];
  Engine.prototype.focusBlock16=function(id,f,atWar=this.enemies(id).length>0){
    const c=this.nation(id),r=f.requires||{};
    if(c.focusDone.includes(f.id))return 'Priorité déjà achevée.';
    if(!f.req.every(k=>c.focusDone.includes(k)))return 'Les priorités précédentes doivent être achevées.';
    if(f.reqAny?.length&&!f.reqAny.some(k=>c.focusDone.includes(k)))return 'L’une des priorités précédentes doit être achevée.';
    if(asList(f.exclusive).some(k=>c.focusDone.includes(k)))return 'Branche exclue par vos choix.';
    if(r.ideology&&!r.ideology.includes(c.ideology))return 'Régime incompatible.';
    if(r.war&&!atWar)return 'Exige une guerre en cours.';
    if(r.peace&&atWar)return 'Impossible en temps de guerre.';
    if(r.tension&&this.s.tension<r.tension&&!atWar)return 'Tension mondiale insuffisante ('+r.tension+' %).';
    if(r.year&&1936+this.s.day/365.25<r.year)return 'Disponible à partir de '+r.year+'.';
    return '';
  };
  Engine.prototype.focusStart=function(id,key){
    const c=this.nation(id),f=this.focus(id,key);assert(f,'Priorité inconnue.');assert(!c.focus,'Une priorité est déjà en cours.');
    const reason=this.focusBlock16(id,f);assert(!reason,reason);
    c.focus={id:key,progress:0};
  };
  const GOVERNMENTS={democratic:'Gouvernement provisoire',fascist:'Directoire national',communist:'Comité central',authoritarian:'Conseil militaire'};
  Engine.prototype.governChange16=function(id,ideology){
    const c=this.nation(id);if(!(ideology in c.parties))return;
    const rest=sum(Object.entries(c.parties).filter(([k])=>k!==ideology).map(([,v])=>v));
    const share=Math.max(c.parties[ideology],55);
    for(const k in c.parties)c.parties[k]=k===ideology?share:rest>0?c.parties[k]*(100-share)/rest:(100-share)/(Object.keys(c.parties).length-1);
    if(c.ideology===ideology){c.stability=clamp(c.stability+5,0,100);return;}
    c.ideology=ideology;c.stability=clamp(c.stability-10,0,100);
    c.identity.leader=GOVERNMENTS[ideology]||c.identity.leader;c.identity.wiki=c.identity.leader;c.identity.portraitKey=null;c.identity.role='Chef de l’État / trajectoire uchronique';
    this.log('Changement de régime : '+this.info(id).name+' suit désormais une trajectoire '+({democratic:'démocratique',fascist:'fasciste',communist:'communiste',authoritarian:'autoritaire'}[ideology]||ideology)+'.','event');
  };
  Engine.prototype.joinFaction16=function(id,spec){
    const c=this.nation(id);if(c.subject)return;
    const lead=asList(spec.with).find(k=>k!==id&&this.nation(k)?.alive&&!this.war(id,k)&&!this.nation(k).subject);
    if(lead){const l=this.nation(lead);if(l.faction==='none')l.faction=spec.name||'Pacte '+lead;c.faction=l.faction;}
    else if(spec.name&&c.faction==='none')c.faction=spec.name;
    else return;
    this.log(this.info(id).name+' rejoint la faction '+c.faction+'.','event');
  };
  Engine.prototype.neighbours16=function(id){
    return [...new Set(this.ownedToday16(id).flatMap(p=>p.neighbors.map(n=>this.s.provinces[n].ctrl)))].filter(k=>k!==id&&this.nation(k)?.alive).sort();
  };
  Engine.prototype.focusCompleted16=function(id,f){
    const c=this.nation(id);
    for(const s of f.spirits||[])this.addSpirit16(id,s,f.spiritDays||null);
    for(const s of f.removeSpirits||[])this.removeSpirit16(id,s);
    this.choiceExtras16(id,f);
  };
  // Extra effects shared by focuses and dynamic event choices.
  Engine.prototype.choiceExtras16=function(id,x){
    const c=this.nation(id);if(!c)return;
    if(x.spirit)this.addSpirit16(id,x.spirit,x.spiritDays||null);
    if(x.removeSpirit)this.removeSpirit16(id,x.removeSpirit);
    if(x.special)this.decisionSpecial16(id,x.special);
    if(x.govern)this.governChange16(id,x.govern);
    if(x.faction)this.joinFaction16(id,x.faction);
    for(const b of asList(x.researchBonus))this.addResearchBonus16(id,b);
    if(x.relations)for(const [k,v] of Object.entries(x.relations))if(this.nation(k)?.alive&&k!==id){c.relations[k]=clamp((c.relations[k]||0)+v,-100,100);this.nation(k).relations[id]=clamp((this.nation(k).relations[id]||0)+v,-100,100);}
    if(x.guarantee){
      const list=x.guarantee==='neighbours'?this.neighbours16(id).filter(k=>!this.allies(id,k)&&this.units(k).length<this.units(id).length):asList(x.guarantee);
      for(const k of list)if(this.nation(k)?.alive&&k!==id&&!c.guarantees.includes(k)&&!this.war(id,k))c.guarantees.push(k);
    }
    if(x.claims){
      const list=x.claims==='weakest'?this.neighbours16(id).filter(k=>!this.allies(id,k)&&this.nation(k).subject!==id).sort((a,b)=>this.units(a).length-this.units(b).length||a.localeCompare(b)).slice(0,1):asList(x.claims);
      for(const k of list)if(this.nation(k)?.alive&&k!==id&&!c.justifications.some(j=>j.target===k))c.justifications.push({target:k,progress:60,days:60,goal:'conquest'});
    }
    if(x.orgLoss)for(const u of this.units(id))u.org=Math.max(0,u.org*(1-x.orgLoss));
    if(x.partyShift){for(const [k,v] of Object.entries(x.partyShift))if(k in c.parties)c.parties[k]=Math.max(1,c.parties[k]+v);const t=sum(Object.values(c.parties));for(const k in c.parties)c.parties[k]*=100/t;}
    if(x.invite){
      const spec=x.invite;
      for(const k of asList(spec.list)){const n=this.nation(k);if(!n?.alive||k===id||n.faction!=='none'||n.subject||this.war(id,k)||(spec.ideology&&n.ideology!==c.ideology))continue;if(c.faction==='none')c.faction=spec.name||'Pacte '+id;n.faction=c.faction;this.log(this.info(k).name+' rejoint la faction '+c.faction+'.','event');}
    }
  };
  // Research bonuses: a speed multiplier on the next techs of a group.
  Engine.prototype.addResearchBonus16=function(id,b){
    const c=this.nation(id);if(!b?.group||!(b.value>0))return;
    c.researchBonus16??=[];c.researchBonus16.push({group:b.group,value:clamp(b.value,0,3),uses:clamp(Math.round(b.uses||1),1,5)});
    if(c.researchBonus16.length>12)c.researchBonus16.shift();
  };
  Engine.prototype.researchBoost16=function(c,t){let v=0;for(const b of c.researchBonus16||[])if(b.group===t.group&&b.uses>0)v=Math.max(v,b.value);return 1+v;};
  Engine.prototype.techUnlocked16=function(id,t){
    const c=this.nation(id);if(!c.researchBonus16?.length)return;
    const b=c.researchBonus16.filter(b=>b.group===t.group).sort((a,b)=>b.value-a.value)[0];
    if(b)b.uses--;c.researchBonus16=c.researchBonus16.filter(b=>b.uses>0);
  };
  // Doctrine branches exclude each other.
  const researchStart15=Engine.prototype.researchStart;
  Engine.prototype.researchStart=function(id,key){
    const c=this.nation(id),t=this.tech(key);
    if(t?.excl)assert(!t.excl.some(k=>c.tech.includes(k)||c.research.some(r=>r.id===k)),'Doctrine incompatible avec la voie déjà choisie.');
    return researchStart15.call(this,id,key);
  };
  Engine.prototype.techExcluded16=function(c,t){return !!t.excl?.some(k=>c.tech.includes(k)||c.research.some(r=>r.id===k));};
  // AI: the doctrine root matching the country or its army profile.
  Engine.prototype.preferredRoot16=function(id,t){
    const prof=this.aiProfile16(id),set=[t,...t.excl.map(k=>this.tech(k)).filter(Boolean)];
    const pick=set.find(x=>x.ai?.includes(id))||set.find(x=>x.ai?.includes(prof.army))||set.find(x=>x.ai?.includes('default'))||set[0];
    return pick.id===t.id;
  };
  Engine.invariant16(function(state){
    for(const c of Object.values(state.countries))for(const b of c.researchBonus16||[])assert(typeof b.group==='string'&&finite(b.value,0,3)&&Number.isInteger(b.uses)&&b.uses>=1&&b.uses<=5,'Bonus de recherche invalide.');
    for(const [k,v] of Object.entries(state.events16||{}))assert(/^[A-Z][A-Z0-9]{2}:[a-z0-9_]+$/.test(k)&&Number.isInteger(v),'Événement dynamique invalide.');
  });

  // ---------------------------------------------------------------------------
  // Dynamic events: catalog.events16 entries fire when their conditions hold,
  // after a mean time to happen; each country is checked every five days.
  // ---------------------------------------------------------------------------
  Engine.prototype.eventCondition16=function(id,k={}){
    const c=this.nation(id),atWar=this.enemies(id).length>0,year=1936+this.s.day/365.25;
    if(k.countries&&!k.countries.includes(id))return false;
    if(k.major&&!MAJORS.includes(id))return false;
    if(k.war===true&&!atWar||k.war===false&&atWar)return false;
    if(k.ideology&&!k.ideology.includes(c.ideology))return false;
    if(k.notIdeology?.includes(c.ideology))return false;
    if(k.stabilityBelow!=null&&c.stability>=k.stabilityBelow)return false;
    if(k.stabilityAbove!=null&&c.stability<=k.stabilityAbove)return false;
    if(k.tensionAbove!=null&&this.s.tension<=k.tensionAbove)return false;
    if(k.yearMin&&year<k.yearMin)return false;
    if(k.yearMax&&year>=k.yearMax+1)return false;
    if(k.months&&!k.months.includes(monthOf(this.s.day)))return false;
    if(k.hasSpirit&&!this.hasSpirit16(c,k.hasSpirit))return false;
    if(k.notSpirit&&this.hasSpirit16(c,k.notSpirit))return false;
    if(k.tech&&!c.tech.includes(k.tech))return false;
    if(k.fuelBelow!=null&&c.stock.fuel>=k.fuelBelow)return false;
    if(k.faction===true&&c.faction==='none'||k.faction===false&&c.faction!=='none')return false;
    if(k.coast&&!this.ownedToday16(id).some(p=>p.coast))return false;
    if(k.overseas&&!this.ownedToday16(id).some(p=>p.overseas))return false;
    if(k.losing&&!((c.stats.coreShare??1)<.85))return false;
    if(k.warDays&&!this.s.wars.some(w=>(w.a===id||w.b===id)&&this.s.day-(w.start??this.s.day)>=k.warDays))return false;
    if(k.winning&&!this.ownedToday16(id).some(p=>this.war(id,this.s.provinces[p.id].own)))return false;
    if(k.neighbourWar&&!this.neighbours16(id).some(n=>this.enemies(n).length))return false;
    return true;
  };
  Engine.onDay16(function(){
    const list=this.catalog.events16;if(!list?.length)return;
    // The salt is drawn once per campaign so that each seed gets its own events.
    const seen=this.s.events16??={},ids=this.active(),salt=this.s.salt16??=hash32(this.s.seed)&0xffff;
    for(let i=0;i<ids.length;i++){
      const id=ids[i],code=id.charCodeAt(0)*961+id.charCodeAt(1)*31+id.charCodeAt(2);
      if((this.s.day+code)%5)continue;
      if(this.nation(id).capitulated16)continue;
      for(let j=0;j<list.length;j++){
        const ev=list[j],key=id+':'+ev.id,last=seen[key];
        if(last!=null&&(ev.once||this.s.day-last<(ev.cooldown||365)))continue;
        if(unit01(this.s.day*7919+j*104729+code*31337+salt*65537)>=5/(ev.mtth||365))continue;
        if(!this.eventCondition16(id,ev.conditions))continue;
        seen[key]=this.s.day;this.fireEvent16(id,ev);break;
      }
    }
  });
  Engine.prototype.fireEvent16=function(id,ev){
    const event={id:'d16_'+ev.id+'_'+this.s.day,dyn16:ev.id,title:ev.title,text:ev.text,choices:clone(ev.choices)};
    if(id===this.s.player){this.s.eventQueue.push({country:id,event});return;}
    let best=0;ev.choices.forEach((ch,k)=>{if((ch.ai??1)>(ev.choices[best].ai??1))best=k;});
    const ch=ev.choices[best];this.effect(id,ch.effect||{});this.choiceExtras16(id,ch);
  };
  const eventChoice16=Engine.prototype.eventChoice;
  Engine.prototype.eventChoice=function(country,event,index){
    const result=eventChoice16.call(this,country,event,index),ch=event.choices?.[index];
    if(ch&&event.dyn16)this.choiceExtras16(country,ch);
    return result;
  };
  // Pre-1936 research: majors start with a few technologies and the matching
  // equipment generation in part of their stocks.
  const START_TECHS={
    major:['outillage1','construction1','armes1','artillerie1','logistique1'],
    GER:['blindage1','mobile1','chasse1','etatmajor1','calcul1'],SOV:['blindage1','mobile1','profondeur1','calcul1'],
    GBR:['escorte1','chasse1','radar1','calcul1'],FRA:['profondeur1','defense1','calcul1'],USA:['escorte1','calcul1','chasse1'],
    ITA:['chasse1','escorte1'],JPN:['escorte1','sousmarins1','chasse1','mountain_troops'],
    minor:['armes1'],
  };
  // Doctrines in force when the campaign starts (the 1939 start adds the
  // doctrines developed since 1936).
  const START_DOCTRINES={
    '1936':{GER:['ld_mobile1','ad_cas1'],FRA:['ld_method1'],SOV:['ld_mass1'],GBR:['ld_fire1','nd_line1'],USA:['nd_line1'],JPN:['nd_carrier1'],ITA:['nd_raid1']},
    '1939':{GER:['ld_mobile1','ld_mobile2','ad_cas1','ad_cas2','nd_raid1'],FRA:['ld_method1','nd_line1'],SOV:['ld_mass1'],GBR:['ld_fire1','nd_line1','ad_strat1'],USA:['ld_fire1','nd_line1'],JPN:['nd_carrier1','nd_carrier2','ld_method1'],ITA:['nd_raid1','ad_cas1']},
  };
  const MAJORS=['GER','SOV','GBR','FRA','USA','ITA','JPN'],SECONDARY=['POL','CZE','SPA','HOL','BEL','SWE','ROM','YUG','TUR','CAN','AST','HUN','RAJ','SAF'];
  Engine.prototype.startTechnology16=function(){
    for(const [id,c] of Object.entries(this.s.countries)){
      const scenario=this.s.historyState?.scenario==='1939'?'1939':'1936';
      const list=[...(MAJORS.includes(id)?[...START_TECHS.major,...(START_TECHS[id]||[])]:SECONDARY.includes(id)?START_TECHS.minor:[]),...(START_DOCTRINES[scenario][id]||[])];
      for(const key of list){const t=this.tech(key);if(t&&!c.tech.includes(key)&&t.req.every(r=>c.tech.includes(r)||list.includes(r))){c.tech.push(key);this.effect(id,t.effect);}}
      for(const type of Object.keys(this.catalog.equipment)){
        const m=this.lineModel16(c,type);if(!m||!c.stock[type])continue;
        c.eqStats[type]=Object.fromEntries(Object.entries(m.stats||{}).map(([k,v])=>[k,+(1+(v-1)*.6).toFixed(4)]).filter(([,v])=>Math.abs(v-1)>1e-4));
      }
    }
  };
  Engine.prototype.startGovernment16=function(){
    const scenario=this.s.historyState?.scenario||'1936';
    for(const [id,list] of Object.entries(this.catalog.startSpirits?.[scenario]||{}))if(this.nation(id)?.alive)for(const sp of list)this.addSpirit16(id,sp,{purges:1100,phoney_war:420,blitz_doctrine:900}[sp]||null);
  };
  Engine.invariant16(function(state){
    const spirits=new Set((this.catalog.spirits||[]).map(s=>s.id)),advisors=new Map((this.catalog.advisors||[]).map(a=>[a.id,a]));
    for(const c of Object.values(state.countries)){
      assert(Array.isArray(c.spirits16)&&c.spirits16.every(s=>spirits.has(s.id)&&(s.until===null||Number.isInteger(s.until))),'Esprit national invalide.');
      assert(c.advisors16&&Object.entries(c.advisors16).every(([slot,list])=>Array.isArray(list)&&list.length<=(this.catalog.advisorSlots?.[slot]?.[1]||1)&&list.every(a=>advisors.get(a)?.slot===slot)),'Conseillers invalides.');
      assert(c.decisions16&&typeof c.decisions16==='object','Décisions invalides.');
    }
  });

  // ---------------------------------------------------------------------------
  // Artificial intelligence. Each country follows a profile (aggression,
  // army doctrine, naval and air weight, research order). Heavy planning is
  // staggered over ten days; army orders are refreshed every five days.
  // ---------------------------------------------------------------------------
  Engine.prototype.aiProfile16=function(id){return {...(this.catalog.aiProfiles?.default||{aggression:.2,army:'infantry',navy:.1,air:.15,research:[]}),...(this.catalog.aiProfiles?.[id]||{})};};
  Engine.prototype.unitPower16=function(u){const st=this.unitStats16(u);return (st.soft+st.hard*.5+st.defense)/2*u.strength*(.5+u.org/200);};
  Engine.prototype.strategyAI=function(){
    const day=this.s.day,ids=this.active();
    for(let i=0;i<ids.length;i++){
      const id=ids[i];if(id===this.s.player)continue;
      const c=this.nation(id);if(c.capitulated16&&!c.exile16)continue;
      const slot=(i+day)%10;
      try{
        if(!c.exile16){
          if(slot===0){this.aiProduction16(id);this.aiResearch16(id);this.aiFocus16(id);this.aiLaws16(id);}
          if(slot===3){this.aiConstruction16(id);this.aiGovernment16(id);}
          if(slot===5){this.aiRecruit16(id);this.aiNavy16(id);}
          if(slot===7){this.aiDiplomacy16(id);this.aiInvasion16(id);}
        }
        if(slot===5||slot===0)this.aiAir16(id);
        if(day%5===i%5)this.aiFronts16(id);
      }catch(error){if(typeof console!=='undefined')console.warn('[IA]',id,error.message);}
    }
  };
  const DOCTRINE_MIX={
    infantry:{rifles:.30,supportEq:.07,artillery:.15,antiTank:.06,antiAir:.05,trucks:.06,lightTanks:.04,tanks:.05,fighters:.12,cas:.05,bombers:.05},
    armor:{rifles:.24,supportEq:.07,artillery:.12,antiTank:.05,antiAir:.04,trucks:.1,lightTanks:.05,tanks:.12,mechanized:.03,fighters:.12,cas:.06},
    mass:{rifles:.38,supportEq:.06,artillery:.17,antiTank:.06,antiAir:.04,trucks:.05,tanks:.06,fighters:.1,cas:.05,bombers:.03},
    firepower:{rifles:.26,supportEq:.07,artillery:.2,antiTank:.07,antiAir:.05,trucks:.06,tanks:.07,fighters:.12,cas:.03,bombers:.04},
  };
  Engine.prototype.aiProduction16=function(id){
    const c=this.nation(id),prof=this.aiProfile16(id),mix={...(DOCTRINE_MIX[prof.army]||DOCTRINE_MIX.infantry)};
    for(const k of ['fighters','cas','bombers'])if(mix[k])mix[k]*=.6+(prof.air||.15)*2.5;
    if((prof.air||0)>=.25&&this.lineModel16(c,'strategicBombers'))mix.strategicBombers=.04;
    if((prof.navy||0)>=.3&&this.lineModel16(c,'navalBombers'))mix.navalBombers=.04;
    const need={};
    for(const u of this.units(id)){const st=templateStats16(u.template);for(const [k,n] of Object.entries(st.eq))need[k]=(need[k]||0)+n*(1.15-u.strength);}
    for(const [k,w] of Object.entries(mix)){
      if(!this.lineModel16(c,k)){delete mix[k];continue;}
      const deficit=(need[k]||0)/Math.max(1,c.stock[k]);
      if(deficit>1)mix[k]=w*Math.min(2.2,1+deficit*.3);else if(c.stock[k]>(need[k]||0)*3+500)mix[k]=w*.6;
    }
    const totalW=sum(Object.values(mix))||1;
    for(const k in c.allocation)c.allocation[k]=0;
    let used=0;for(const [k,w] of Object.entries(mix)){c.allocation[k]=Math.floor(c.stats.mil*w/totalW);used+=c.allocation[k];}
    c.allocation.rifles=(c.allocation.rifles||0)+Math.max(0,c.stats.mil-used);
    const docks=c.stats.dock;if(!docks)return;
    const ports=this.ownedToday16(id).filter(p=>this.s.provinces[p.id].port).length,naval={};
    naval.convoys=c.stock.convoys<ports*3+60?.35:.1;
    naval.destroyers=.3;naval.submarines=['GER','ITA','JPN'].includes(id)?.3:.15;
    if(this.lineModel16(c,'cruisers')&&docks>=4)naval.cruisers=.12;
    if((prof.navy||0)>=.3&&docks>=8){naval.battleships=.08;if(c.tech.includes('carrier_ops'))naval.carriers=.12;}
    const nw=sum(Object.values(naval));let nused=0;
    for(const [k,w] of Object.entries(naval)){c.allocation[k]=Math.floor(docks*w/nw);nused+=c.allocation[k];}
    c.allocation.destroyers+=Math.max(0,docks-nused);
  };
  Engine.prototype.aiResearch16=function(id){
    const c=this.nation(id),prof=this.aiProfile16(id),year=1936+this.s.day/365.25,order=prof.research||[];
    while(c.research.length<c.slots){
      const options=this.catalog.techs.filter(t=>!c.tech.includes(t.id)&&!c.research.some(r=>r.id===t.id)&&t.req.every(r=>c.tech.includes(r))&&t.year<=year+.6&&!this.techExcluded16(c,t)&&(!t.excl||this.preferredRoot16(id,t)));
      if(!options.length)break;
      options.sort((a,b)=>{const ga=order.indexOf(a.group),gb=order.indexOf(b.group);return (a.year-b.year)*2+((ga<0?9:ga)-(gb<0?9:gb))||a.id.localeCompare(b.id);});
      this.researchStart(id,options[0].id);
    }
  };
  Engine.prototype.aiFocus16=function(id){
    const c=this.nation(id);if(c.focus)return;
    const atWar=this.enemies(id).length>0,prof=this.aiProfile16(id),options=this.tree(id).filter(f=>!this.focusBlock16(id,f,atWar)&&(!f.ideology||f.ideology.includes(c.ideology)));
    if(!options.length)return;
    // Countries keep their regime: the matching political path is preferred,
    // the others are avoided.
    const score=f=>{const e=f.effect||{};return (e.civ||e.mil||e.production||e.construction||f.special?.build?3:0)+(e.research||e.slots||f.researchBonus?2:0)+(e.attack||e.defense||e.xp?1.5:0)+((e.tension||0)>0||f.claims?prof.aggression*2-.8:0)+(f.national?2:0)+(f.path?(f.path===c.ideology?2.5:-20):0)-f.days/200;};
    options.sort((a,b)=>score(b)-score(a)||a.id.localeCompare(b.id));
    if(score(options[0])<-10)return;
    this.focusStart(id,options[0].id);
  };
  Engine.prototype.aiLaws16=function(id){
    const c=this.nation(id),laws=this.catalog.laws,atWar=this.enemies(id).length>0;
    const losing=atWar&&(c.stats.coreShare??1)<.75;
    const econTarget=atWar?(losing?'total':'war'):this.s.tension>=50?'partial':this.s.tension>=25?'early':'civilian';
    const econ=laws.economy,ci=econ.findIndex(l=>l.id===c.economy),ti=econ.findIndex(l=>l.id===econTarget);
    if(ti>ci){const next=econ[ci+1];if(next&&c.pp>=next.cost+30&&(!next.war||atWar)&&(!next.tension||atWar||this.s.tension>=next.tension||c.support>=60)){c.pp-=next.cost;c.economy=next.id;c.stability=clamp(c.stability-4+(next.stability||0),0,100);}}
    const consc=laws.conscription,divisions=this.units(id).length;
    const conscTarget=atWar?(losing?5:4):this.s.tension>=40?3:Math.min(2,c.conscription);
    if(c.conscription<conscTarget&&c.manpower<divisions*4000+60000){
      const next=consc[c.conscription+1];
      if(next&&c.pp>=next.cost+30&&(!next.war||atWar)&&(!next.tension||atWar||this.s.tension>=next.tension||c.support>=60)){
        c.pp-=next.cost;c.pool=Math.max(0,c.pool+c.identity.manpower*((next.pool||1)-(consc[c.conscription].pool||1)));c.conscription++;c.stability=clamp(c.stability-6+(next.stability||0),0,100);
      }
    }
  };
  Engine.prototype.aiConstruction16=function(id){
    const c=this.nation(id);if(c.build.length>=3||c.stats.freeCiv<1)return;
    const prof=this.aiProfile16(id),atWar=this.enemies(id).length>0,year=1936+this.s.day/365.25;
    const owned=this.ownedToday16(id).filter(p=>this.s.provinces[p.id].ctrl===id);
    const freeByState=new Map(),free=p=>{const sid=this.stateId(p.id);let v=freeByState.get(sid);if(v===undefined){v=this.stateCapacity(sid,id)-this.stateUsed(sid)-this.stateQueued(sid,id);freeByState.set(sid,v);}return v;};
    const pick=(filter,sort)=>owned.filter(filter).sort(sort)[0];
    let kind=!atWar&&year<1938.6&&c.stats.civ<c.stats.mil*1.8?'civ':'mil';
    if((prof.navy||0)>=.3&&c.stats.dock<10&&this.s.day%3===0)kind='dock';
    if(c.stats.shortage?.oil<1&&c.tech.includes('synthetic1')&&this.s.day%2===0)kind='refinery';
    // Factories go to the home country; colonies only get infrastructure
    // and defences (unless the country has nothing else).
    const homeland=this.homeland16(id),annexed=new Set((c.identity.cores||[]).filter(pid=>this.prov[pid].owner!==id)),inside=p=>homeland.has(p.id)||annexed.has(p.id);
    const home=owned.some(p=>inside(p)&&this.isCore(id,p.id));
    const target=pick(p=>free(p)>0&&(kind!=='dock'||p.coast)&&this.isCore(id,p.id)&&(!home||inside(p)),(a,b)=>free(b)-free(a)||b.vp-a.vp||a.id-b.id);
    try{if(target)this.construct(id,target.id,kind);}catch{}
    if(c.build.length<3&&this.s.tension>=40&&prof.aggression<.5){
      const border=pick(p=>p.neighbors.some(n=>{const k=this.s.provinces[n].ctrl;return k!==id&&!this.allies(id,k)&&this.aiProfile16(k).aggression>=.5;})&&this.s.provinces[p.id].fort<3,(a,b)=>b.vp-a.vp||a.id-b.id);
      try{if(border)this.construct(id,border.id,'fort');}catch{}
    }
    if(c.build.length<3&&atWar){
      const weak=pick(p=>p.neighbors.some(n=>this.war(id,this.s.provinces[n].ctrl))&&this.s.provinces[p.id].infra<4&&this.s.provinces[p.id].supply<.5,(a,b)=>a.id-b.id);
      try{if(weak)this.construct(id,weak.id,'infra');}catch{}
    }
  };
  Engine.prototype.aiRecruit16=function(id){
    const c=this.nation(id),prof=this.aiProfile16(id),atWar=this.enemies(id).length>0,count=this.units(id).length+c.training.length;
    // Industry sets the size of the army; aggressive powers mobilise further,
    // smaller countries stay close to their historical order of battle.
    const base=c.identity.divisions||8,industry=atWar?c.stats.mil*2.4+12:c.stats.mil*(1.2+this.s.tension/60)+8;
    // Naval powers put less of their industry into the land army.
    let target=industry*(1+Math.max(0,prof.aggression-.2)*.7)*(1-(prof.navy||0)*.8);
    if(!MAJORS.includes(id))target=Math.min(target,atWar?base*2+6:base*1.4+4);
    // In a civil war, both camps raise armies from their manpower.
    if(this.hasSpirit16(c,'civil_war'))target=Math.max(target,base*1.5+6);
    target=Math.min(300,Math.round(target));
    // Large industries train several divisions at a time.
    const batch=clamp(Math.round(c.stats.mil/15),1,5);
    if(count>=target||c.training.length>=4+batch)return;
    const enemyArmor=this.enemies(id).some(e=>this.units(e).some(u=>u.template.tank>0));
    const armored=prof.army==='armor'&&c.stock.tanks+c.stock.lightTanks>400&&count%4===0;
    const templateId=armored?'armored':enemyArmor&&c.templates.some(t=>t.id==='line_at')&&count%3===0?'line_at':'infantry';
    const template=c.templates.find(t=>t.id===templateId)||c.templates[0];
    const front=this.ownedToday16(id).find(p=>this.s.provinces[p.id].ctrl===id&&p.neighbors.some(n=>this.war(id,this.s.provinces[n].ctrl)));
    const site=front?front.id:this.cap(id);
    for(const n of [Math.min(batch+1,target-count),2,1]){if(n<1)continue;try{this.recruit(id,template.id,site,n);return;}catch{}}
    if(template.id!=='infantry')try{this.recruit(id,c.templates[0].id,site,1);}catch{}
  };
  // Army fronts: the border with each enemy is split into connected sectors;
  // each sector gets an army sized by its length and by the enemy forces
  // nearby. Only land held by the country or by allies at war with that
  // enemy counts: a non-belligerent ally's territory is not a front. Remote
  // sectors (colonies) get a garrison unless the enemy masses troops there.
  Engine.prototype.frontSectors16=function(id,e){
    const front=new Map(),own=k=>{if(!front.has(k))front.set(k,k===id||this.allies(id,k)&&this.war(k,e));return front.get(k);};
    const set=new Set();
    for(const p of this.ownedToday16(e))for(const n of p.neighbors)if(own(this.s.provinces[n].ctrl))set.add(n);
    const seen=new Set(),sectors=[];
    for(const start of [...set].sort((a,b)=>a-b)){
      if(seen.has(start))continue;
      const list=[start];seen.add(start);
      for(let h=0;h<list.length;h++)for(const n of this.prov[list[h]].neighbors)if(set.has(n)&&!seen.has(n)){seen.add(n);list.push(n);}
      sectors.push(list.map(i=>this.prov[i]));
    }
    // Fragments of a few provinces join the nearest large sector, so that a
    // broken border does not scatter the army into token detachments.
    sectors.sort((a,b)=>b.length-a.length||a[0].id-b[0].id);
    const merged=[];
    for(const sector of sectors){
      const host=sector.length<8&&merged.find(m=>m.length>=8&&m.some(p=>sector.some(q=>distance(p,q)<500)));
      if(host)host.push(...sector);else merged.push(sector);
    }
    return merged;
  };
  // ---------------------------------------------------------------------------
  // Strategic plans (catalog.aiPlans16): per country and target, a mode
  // (attack, defend, hold, prepare), a weight on the fronts facing that
  // target and objectives given by coordinates.
  // ---------------------------------------------------------------------------
  const planDay=text=>Math.round((Date.UTC(+text.slice(0,4),+text.slice(5,7)-1,+text.slice(8,10))-Date.UTC(1936,0,1))/864e5);
  Engine.prototype.planActive16=function(id,p){
    if(p.historical&&!this.s.historical)return false;
    if(p.from&&this.s.day<planDay(p.from))return false;
    if(p.until&&this.s.day>=planDay(p.until))return false;
    if(p.when?.war&&!asList(p.when.war).some(k=>this.war(id,k)))return false;
    if(p.unless?.war&&asList(p.unless.war).some(k=>this.war(id,k)))return false;
    return true;
  };
  Engine.prototype.plansFor16=function(id){return (this.catalog.aiPlans16?.[id]||[]).filter(p=>this.planActive16(id,p));};
  // Province nearest to a named objective (cached per world).
  Engine.prototype.objectivePid16=function(o){
    const cache=this._objectives16??=new Map(),key=o.lon+','+o.lat;
    let pid=cache.get(key);
    if(pid===undefined){let best=Infinity;for(const p of this.prov){const d=distance(p,{x:o.lon,y:o.lat});if(d<best){best=d;pid=p.id;}}cache.set(key,pid);}
    return pid;
  };
  const MOBILE_SPEED=1.5;
  Engine.prototype.mobile16=function(u){
    const {bat}=Engine.normalizeTemplate16(u.template);let fast=0,total=0;
    for(const [k,n] of Object.entries(bat)){const b=BAT.get(k);if(!b)continue;total+=n;if((b.speed||1)>=MOBILE_SPEED)fast+=n;}
    return total>0&&fast/total>=.5;
  };
  // Defensive value of a province against an attack coming from "from".
  Engine.prototype.defenseValue16=function(pid,from){
    const p=this.prov[pid],st=this.s.provinces[pid];
    let v=(this.catalog.terrain[p.terrain]?.defense||1)*(1+st.fort*.15);
    if(from!=null&&this.world.riverCrossings?.[[pid,from].sort((a,b)=>a-b).join(':')])v*=1.35;
    return v;
  };
  // Fallback line for an outnumbered sector: the layer of provinces behind the
  // front (one to three steps) with the best defensive value, never giving up
  // the capital or a major city.
  Engine.prototype.fallbackLine16=function(id,border){
    const dist=new Map(),layers=[[...border.map(p=>p.id)]],capital=this.cap(id);
    for(const p of border)dist.set(p.id,0);
    for(let d=1;d<=6;d++){
      const next=[];
      for(const pid of layers[d-1])for(const n of this.prov[pid].neighbors)if(!dist.has(n)&&this.s.provinces[n].ctrl===id){dist.set(n,d);next.push(n);}
      if(!next.length)break;layers.push(next);
    }
    const value=(list,d)=>sum(list.map(pid=>{const back=this.prov[pid].neighbors.find(n=>dist.get(n)===d-1);return this.defenseValue16(pid,back);}))/Math.max(1,list.length);
    const base=value(layers[0],0);let best=null;
    for(let d=1;d<layers.length;d++){
      const abandoned=layers.slice(0,d).flat();
      if(abandoned.some(pid=>pid===capital||this.prov[pid].vp>=10))break;
      const v=value(layers[d],d);
      if(v>=base*1.15&&(!best||v>best.v))best={v,list:layers[d]};
    }
    return best?best.list.slice(0,250):[];
  };
  // Weakest enemy province along a sector: the breakthrough point.
  Engine.prototype.breakthrough16=function(id,e,border,goal){
    let best=null;
    for(const p of border)for(const n of p.neighbors){
      if(this.s.provinces[n].ctrl!==e)continue;
      let defense=0;for(const u of this.unitsAt.get(n)||[])if(this.war(id,u.owner))defense+=this.unitPower16(u);
      const score=(defense+20)*this.defenseValue16(n,p.id)+(goal?distance(this.prov[n],goal)/40:0);
      if(!best||score<best.score||score===best.score&&n<best.pid)best={pid:n,score};
    }
    return best?.pid??null;
  };
  // Army fronts: the border with each enemy is split into connected sectors;
  // each sector gets an army sized by its length, the enemy forces facing it
  // and the strategic plan. Attacks are prepared (planning), aimed at the
  // weakest point with armoured groups, coordinated with the main effort and
  // paused when they run out of steam; outnumbered sectors fall back to a
  // better line. Coastal powers keep a home guard against invasions.
  Engine.prototype.aiFronts16=function(id){
    const c=this.nation(id),prof=this.aiProfile16(id),day=this.s.day;
    const committed=new Set((this.s.invasions16||[]).filter(i=>i.owner===id).flatMap(i=>i.units));
    let units=this.units(id).filter(u=>!u.landing16&&!committed.has(u.id)&&!u.lent16&&!u.invasionPrep16);
    if(!units.length)return;
    // A "prepare" plan only applies before the war.
    const plans=this.plansFor16(id),planOf=(e,war)=>plans.find(p=>p.target===e&&(!war||p.mode!=='prepare'));
    const enemies=this.enemies(id).filter(e=>!this.nation(e)?.capitulated16);
    const targets=[...enemies.map(e=>({e,war:true}))];
    for(const p of plans)if(p.mode==='prepare'&&!this.war(id,p.target)&&this.nation(p.target)?.alive&&!this.allies(id,p.target)&&!targets.some(t=>t.e===p.target))targets.push({e:p.target,war:false});
    const capital=this.prov[this.cap(id)],homeland=this.homeland16(id);
    const fronts=[];
    for(const {e,war} of targets){
      const plan=planOf(e,war);
      for(const border of this.frontSectors16(id,e)){
        const centre={x:sum(border.map(p=>p.x))/border.length,y:sum(border.map(p=>p.y))/border.length};
        // Enemy forces facing the sector: two rings of provinces beyond it.
        const near=new Set();
        for(const p of border)for(const n of p.neighbors)if(this.s.provinces[n].ctrl===e){near.add(n);for(const m of this.prov[n].neighbors)if(this.s.provinces[m].ctrl===e)near.add(m);}
        let local=0;for(const pid of near)for(const u of this.unitsAt.get(pid)||[])if(u.owner===e||this.war(id,u.owner))local+=this.unitPower16(u)*(1+this.decisionBonus16(this.nation(u.owner),'defense'));
        const far=distance(centre,capital)>2500;
        // A limited war stops once its objectives are taken.
        const reached=plan?.limited&&plan.objectives?.length&&plan.objectives.every(o=>{const k=this.s.provinces[this.objectivePid16(o)].ctrl;return k===id||this.allies(id,k);});
        const mode=!war?'prepare':reached?'hold':plan?.mode||'normal';
        // Defensive sectors follow the enemy's strength; an offensive follows
        // the plan and avoids the strongest (often fortified) sectors.
        const fort=sum(border.map(p=>{let f=0;for(const n of p.neighbors)if(this.s.provinces[n].ctrl===e)f=Math.max(f,this.s.provinces[n].fort);return f;}))/border.length;
        const weight=mode==='attack'?(Math.sqrt(border.length)*(far?.3:1)+local/1200)*(plan.weight||1)/(1+fort*.25):(Math.sqrt(border.length)*(far?.3:1)+local/400)*(plan?.weight||1)*(mode==='hold'?.6:1);
        // Remote sectors (colonies) only get a garrison unless the enemy masses
        // troops there or a plan objective lies within reach.
        const aimed=(plan?.objectives||[]).some(o=>distance({x:o.lon,y:o.lat},centre)<1500);
        // A sector on home soil (an enemy breaking into the homeland) is defended first.
        const home=war&&border.some(p=>homeland.has(p.id));
        fronts.push({e,war,plan,mode,border,centre,local,home,weight:far&&!aimed?weight*.5:weight,cap:far&&!aimed&&!home?Math.max(2,Math.ceil(border.length/6)):Infinity});
      }
    }
    // Volunteer and expeditionary armies keep their own command.
    const foreign=new Set(this.s.units.filter(u=>u.owner===id&&u.lent16).map(u=>u.army));
    const armies=this.s.armies.filter(a=>a.owner===id&&!foreign.has(a.id));
    if(!fronts.length){
      // Peace or a war overseas: a single defensive army facing the main threat.
      const owned=this.ownedToday16(id);
      const threat=[...new Set(owned.flatMap(p=>p.neighbors.map(n=>this.s.provinces[n].ctrl)))].filter(k=>k!==id&&!this.allies(id,k)&&this.nation(k)?.alive).sort((a,b)=>this.aiProfile16(b).aggression*this.units(b).length-this.aiProfile16(a).aggression*this.units(a).length||a.localeCompare(b))[0]||null;
      const a=armies.find(a=>a.auto)||armies[0]||this.addArmy(id);a.target=threat;a.order='defend';a.auto=true;a.plan16=null;a.frontSelection=[];
      for(const u of units)if(!this.s.armies.some(x=>x.id===u.army&&x.owner===id&&x.auto))u.army=a.id;
      return;
    }
    const used=new Set();
    const takeArmy=(match)=>{let a=armies.find(a=>!used.has(a.id)&&match(a))||armies.find(a=>!used.has(a.id)&&a.auto!==false&&!a.home16&&!a.mobile16)||armies.find(a=>!used.has(a.id)&&!a.home16);if(!a){a=this.addArmy(id);armies.push(a);}used.add(a.id);return a;};
    // Home guard: coastal powers facing a fleet keep a reserve near the capital.
    const fleetThreat=enemies.some(e=>sum(this.s.fleets.filter(f=>f.owner===e).map(f=>sum(Object.values(f.ships))))>=8);
    const frontNearCapital=fronts.some(f=>f.war&&f.border.some(p=>distance(p,capital)<600));
    if(capital.coast&&fleetThreat&&!frontNearCapital&&units.length>=10){
      const guard=takeArmy(a=>a.home16);guard.home16=true;guard.auto=false;guard.target=null;guard.order='defend';guard.plan16=null;guard.name=guard.name.startsWith('Défense')?guard.name:'Défense du territoire';
      const coast=this.ownedToday16(id).filter(p=>p.coast&&this.s.provinces[p.id].ctrl===id&&distance(p,capital)<450).sort((a,b)=>b.vp-a.vp||a.id-b.id).slice(0,6);
      const count=Math.min(12,Math.max(2,Math.round(units.length*.12)));
      const picks=[...units].sort((a,b)=>distance(this.prov[a.pid],capital)-distance(this.prov[b.pid],capital)||a.id-b.id).slice(0,count);
      picks.forEach((u,i)=>{u.army=guard.id;const goal=coast.length?coast[i%coast.length].id:capital.id;if(u.pid!==goal&&!u.path.length&&(day+u.id)%7===0)u.path=this.path(u.pid,goal,id,false)||[];});
      const taken=new Set(picks.map(u=>u.id));units=units.filter(u=>!taken.has(u.id));
    }
    fronts.sort((a,b)=>b.weight-a.weight||a.e.localeCompare(b.e)||a.border[0].id-b.border[0].id);
    const totalWeight=sum(fronts.map(f=>f.weight));
    // A plan may cap the share of the army sent against a target (an
    // expeditionary corps on an ally's front).
    for(const f of fronts)if(f.plan?.share){const group=fronts.filter(g=>g.e===f.e),w=sum(group.map(g=>g.weight));f.cap=Math.min(f.cap,Math.max(1,Math.floor(units.length*f.plan.share*f.weight/w)));}
    // Sectors at war first receive enough divisions to face the enemy massed
    // in front of them; the rest is shared by weight (preparation included).
    const avgPower=sum(units.map(u=>this.unitPower16(u)))/units.length||1;
    let left=units.length;
    for(const f of fronts)f.quota=0;
    for(const f of [...fronts.filter(f=>f.home),...fronts.filter(f=>!f.home)])if(f.war&&f.mode!=='prepare'){
      const need=Math.min(f.cap,f.border.length*3,Math.ceil(f.local/avgPower*(f.home?1.5:.8)));f.quota=Math.min(need,left);left-=f.quota;
    }
    for(const f of fronts)f.quota=Math.min(f.cap,Math.max(1,f.quota+Math.round(left*f.weight/totalWeight)));
    // Divisions freed by capped sectors go to the main uncapped sector.
    const spare=units.length-sum(fronts.map(f=>f.quota));if(spare>0)(fronts.find(f=>f.cap===Infinity)||fronts[0]).quota+=spare;
    for(const f of fronts){
      const a=takeArmy(a=>a.target===f.e&&!a.mobile16&&!a.home16&&a.frontSelection?.length&&distance(this.prov[a.frontSelection[0]],f.centre)<600);
      f.army=a;a.target=f.e;a.auto=true;a.mobile16=false;a.home16=false;
      const step=Math.max(1,Math.ceil(f.border.length/20));
      a.frontSelection=f.border.filter((p,i)=>i%step===0).map(p=>p.id);
    }
    // Divisions stay with their army when it keeps its sector; the rest go
    // to the nearest sectors, heaviest first. Mobile groups are rebuilt below.
    const pool=[...units],taken=new Set();
    for(const f of fronts){
      const own=pool.filter(u=>(u.army===f.army.id||this.s.armies.find(x=>x.id===u.army)?.mobile16&&this.s.armies.find(x=>x.id===u.army)?.target===f.e)&&!taken.has(u.id)).sort((a,b)=>distance(this.prov[a.pid],f.centre)-distance(this.prov[b.pid],f.centre)||a.id-b.id).slice(0,f.quota);
      f.units=own;for(const u of own)taken.add(u.id);
    }
    const rest=pool.filter(u=>!taken.has(u.id));
    for(const f of fronts){
      const need=f.quota-f.units.length;if(need<=0)continue;
      rest.sort((a,b)=>distance(this.prov[a.pid],f.centre)-distance(this.prov[b.pid],f.centre)||a.id-b.id);
      f.units.push(...rest.splice(0,need));
    }
    for(const f of fronts)for(const u of f.units)u.army=f.army.id;
    pool.length=0;pool.push(...rest);
    for(const u of pool){u.army=fronts[0].army.id;fronts[0].units.push(u);}
    // Civil wars are fought to the end: both camps keep attacking.
    const aggression=Math.min(1,prof.aggression+(this.hasSpirit16(c,'civil_war')?.5:0));
    const edge=1+this.decisionBonus16(c,'attack')+this.decisionBonus16(c,'breakthrough')*.5;
    for(const f of fronts){
      f.own=sum(f.units.map(u=>this.unitPower16(u)))*edge;const enemy=Math.max(1,f.local);
      // A fully planned offensive accepts worse odds.
      const threshold=(f.mode==='defend'?1.8:f.mode==='attack'?Math.min(1.25,1.6-aggression*.6):1.6-aggression*.6)*(f.mode==='attack'?1-.25*(f.army.planning||0):1);
      f.want=f.war&&f.mode!=='hold'&&f.mode!=='prepare'&&(f.own>=enemy*threshold||f.mode!=='defend'&&day-(f.army.offensive16??day-60)>=90&&f.own>=enemy*.9);
    }
    // The main effort: pinning attacks on the other sectors when it moves.
    const main=fronts.find(f=>f.want&&f.plan?.mode==='attack');
    for(const f of fronts)if(main&&!f.want&&f.war&&f.mode!=='hold'&&f.mode!=='prepare'&&f.own>=Math.max(1,f.local)*1.05)f.want=true;
    for(const f of fronts){
      const a=f.army,enemy=Math.max(1,f.local);
      // Preparation: an offensive starts once planned, or at overwhelming odds;
      // a spent offensive pauses for three weeks.
      if(a.order==='attack'&&a.planning<.08&&f.own<enemy*1.5)a.pause16=day+21;
      const ready=a.order==='attack'||a.planning>=.45||f.own>=enemy*3;
      const attack=f.want&&ready&&!(a.pause16>day);
      if(attack&&a.order!=='attack')a.offensive16=day;
      a.order=attack?'attack':'defend';a.tactic=attack?'spearhead':'elastic';a.stance=aggression>.6?'aggressive':'balanced';
      // Objective: the plan's nearest objective, else the most valuable enemy
      // province within reach; the breakthrough point comes first.
      let goal=null;
      const objectives=(f.plan?.objectives||[]).map(o=>this.prov[this.objectivePid16(o)]).filter(p=>p&&this.s.provinces[p.id].ctrl!==id&&!this.allies(id,this.s.provinces[p.id].ctrl));
      if(objectives.length)goal=objectives.sort((x,y)=>distance(x,f.centre)-distance(y,f.centre)||x.id-y.id)[0];
      if(!goal||distance(goal,f.centre)>1500){goal=null;for(const p of this.ownedToday16(f.e))if(distance(p,f.centre)<900&&(!goal||p.vp>goal.vp||p.vp===goal.vp&&p.id<goal.id))goal=p;}
      const weak=attack?this.breakthrough16(id,f.e,f.border,goal):null;
      const fallback=!attack&&f.war&&f.own<enemy*.6?this.fallbackLine16(id,f.border):[];
      // The whole line is held; the plan keeps a sample for display.
      const step=Math.max(1,Math.ceil(fallback.length/30));
      a.plan16={offensive:attack?[weak,goal?.id].filter(x=>x!=null):[],fallback:fallback.filter((pid,i)=>i%step===0).slice(0,30),execute:attack,hold16:fallback.length>0,line16:fallback};
      if(!a.general)a.general=this.freeGeneral16(id)?.id||null;
      // Armoured group: on an attacking sector with enough mobile divisions,
      // they form their own army concentrated on the breakthrough point.
      const fast=attack&&weak!=null?f.units.filter(u=>this.mobile16(u)):[];
      if(fast.length>=4){
        const g=takeArmy(x=>x.mobile16&&x.target===f.e);g.mobile16=true;g.home16=false;g.auto=true;g.target=f.e;g.order='attack';g.tactic='spearhead';g.stance='aggressive';
        if(!g.name.startsWith('Groupe blindé'))g.name='Groupe blindé '+(this.prov[weak].name.split(' /')[0]);
        g.frontSelection=f.border.filter(p=>distance(p,this.prov[weak])<300).map(p=>p.id).slice(0,10);
        g.plan16={offensive:[weak,goal?.id].filter(x=>x!=null),fallback:[],execute:true,hold16:false};
        g.planning=Math.max(g.planning||0,a.planning);
        for(const u of fast)u.army=g.id;
        if(!g.general)g.general=this.freeGeneral16(id)?.id||null;
      }
    }
    for(const a of armies)if(!used.has(a.id)){a.target=null;a.order='defend';a.plan16=null;a.frontSelection=[];a.mobile16=false;if(a.home16){a.home16=false;a.auto=true;}}
    // Armies left without divisions are dissolved; a regular army keeps a
    // regular name.
    const manned=new Set(this.s.units.map(u=>u.army));
    this.s.armies=this.s.armies.filter(a=>a.owner!==id||used.has(a.id)||manned.has(a.id)||foreign.has(a.id));
    for(const a of armies)if(!a.mobile16&&!a.home16&&/^(Groupe blindé|Défense du territoire)/.test(a.name))a.name='Armée '+c.armySerial++;
    for(const a of this.s.armies)if(foreign.has(a.id)&&a.owner===id){a.target=fronts[0].e;a.frontSelection=[...fronts[0].army.frontSelection];}
  };
  // National bonuses weighed by the AI before an offensive. The civil war
  // malus hits both camps alike and only slows the fighting, so it is left out.
  Engine.prototype.decisionBonus16=function(c,key){
    if(!c)return 0;let v=c.bonus[key]||0;
    if(this.hasSpirit16(c,'civil_war'))v-=(this.catalog.spirits||[]).find(s=>s.id==='civil_war')?.effect?.[key]||0;
    return v;
  };
  // Historical campaigns: the western offensive of 1940 opens with a
  // surprise through the Ardennes.
  Engine.onDay16(function(){
    const h=this.s.historyState;if(!this.s.historical||!h||h.flags.sickle16)return;
    if(this.nation('GER')?.alive&&this.war('GER','BEL')&&this.war('GER','FRA')){h.flags.sickle16=true;this.addSpirit16('GER','sickle_cut',90);}
  });
  // ... and the attack on the Soviet Union in 1941 catches an army in the
  // middle of its reorganisation.
  Engine.onDay16(function(){
    const h=this.s.historyState;if(!this.s.historical||!h||h.flags.barbarossa16)return;
    if(this.nation('GER')?.alive&&this.nation('SOV')?.alive&&this.war('GER','SOV')){
      h.flags.barbarossa16=true;this.addSpirit16('GER','surprise_offensive',75);this.addSpirit16('SOV','caught_unprepared',130);
      // Germany's partners of 1941 join the campaign in the east.
      const axis=this.nation('GER').faction;
      for(const k of ['ITA','ROM','HUN','SLO','FIN']){
        const n=this.nation(k);if(!n?.alive||n.capitulated16||k===this.s.player||this.war(k,'GER')||this.allies(k,'SOV'))continue;
        if(n.faction==='none'&&!n.subject&&axis!=='none'&&k!=='FIN')n.faction=axis;
        if(!this.war(k,'SOV'))try{this.declareWar(k,'SOV',true,false);}catch{}
      }
    }
  });
  // Assessment label shown in the army panel while an offensive is prepared.
  Engine.prototype.aiPlanLabel16=function(a){return a.pause16>this.s.day?'Offensive suspendue':a.plan16?.hold16?'Repli sur une meilleure ligne':a.order==='defend'&&a.planning<.45?'Préparation':'';};
  Engine.prototype.aiAir16=function(id){
    const c=this.nation(id),enemies=this.enemies(id),wings=this.s.wings.filter(w=>w.owner===id);
    const bases=this.ownedToday16(id).filter(p=>this.s.provinces[p.id].ctrl===id&&this.s.provinces[p.id].airbase>0);if(!bases.length)return;
    const front=this.ownedToday16(id).find(p=>p.neighbors.some(n=>this.war(id,this.s.provinces[n].ctrl)));
    const focus=front||this.prov[this.cap(id)],base=bases.sort((a,b)=>distance(a,focus)-distance(b,focus)||a.id-b.id)[0];
    for(const kind of Object.keys(AIR_MISSIONS)){
      if(c.stock[kind]>=40&&wings.filter(w=>w.kind===kind).length<4){
        const size=Math.min(250,Math.floor(c.stock[kind]));c.stock[kind]-=size;
        const w={id:this.s.uid++,owner:id,name:'Escadre '+(kind==='fighters'?'de chasse':'aérienne'),kind,size,base:base.id,zone:this.prov[base.id].zone,mission:'reserve',xp:0,autoReinforce:true,targetSize:250};
        this.s.wings.push(w);wings.push(w);
      }
    }
    // Air regions worth fighting for: ground fronts (own divisions engaged)
    // and the capital region when enemy aircraft are within reach.
    const R=Engine.regions16(this.world),capital=this.prov[this.cap(id)],value=new Map(),add=(z,v)=>value.set(z,(value.get(z)||0)+v);
    if(enemies.length){
      // Divisions in contact with the enemy, wherever they fight.
      for(const u of this.units(id)){const p=this.prov[u.pid];if(p.neighbors.some(n=>this.war(id,this.s.provinces[n].ctrl)))add(p.zone,1);}
      // Home air defence counts for at most a third of the ground fighting.
      const fronts=sum([...value.values()]),threat=sum(this.s.wings.filter(x=>this.war(id,x.owner)&&x.kind!=='transportPlanes'&&distance(this.prov[x.base],capital)<1300).map(x=>x.size))/30;
      if(threat>0)add(capital.zone,fronts>0?Math.min(threat,fronts*.33):threat);
    }
    const ranked=[...value].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])),picks=ranked.filter(t=>t[1]>=(ranked[0]?.[1]||0)*.25).slice(0,4);
    // Wings of each kind are shared out in proportion to the value of the
    // regions, the largest wings going to the main effort.
    const plan={};
    for(const kind of ['fighters','cas','bombers']){
      const list=wings.filter(w=>w.kind===kind).sort((a,b)=>b.size-a.size||a.id-b.id),total=sum(picks.map(t=>t[1]));
      if(!list.length||!picks.length)continue;
      const quota=picks.map(t=>Math.floor(list.length*t[1]/total));quota[0]=Math.max(1,quota[0]);
      for(let k=0;sum(quota)<list.length;k=(k+1)%picks.length)quota[k]++;
      let i=0;picks.forEach((t,k)=>{for(let n=0;n<quota[k]&&i<list.length;n++)plan[list[i++].id]=t[0];});
    }
    // No hopeless air battle: where enemy fighters outnumber ours by half
    // again, fighters fall back to defend the homeland and bombers stay out.
    const enemyFighters={},ownFighters={};
    for(const x of this.s.wings)if(x.kind==='fighters'&&['superiority','intercept'].includes(x.mission)&&this.war(id,x.owner))enemyFighters[x.zone]=(enemyFighters[x.zone]||0)+x.size;
    for(const w of wings)if(w.kind==='fighters'&&plan[w.id])ownFighters[plan[w.id]]=(ownFighters[plan[w.id]]||0)+w.size;
    const lost=zone=>(enemyFighters[zone]||0)>(ownFighters[zone]||0)*1.5;
    for(const w of wings)if(plan[w.id]&&lost(plan[w.id]))plan[w.id]=w.kind==='fighters'?capital.zone:null;
    const baseFor=(zone,kind)=>{const z=R.zones.get(zone)||capital;return bases.slice().sort((a,b)=>distance(a,z)-distance(b,z)||a.id-b.id).find(b=>distance(b,z)<(AIR_RANGE[kind]||1600)*.7)||null;};
    for(const w of wings){
      w.autoReinforce=true;w.targetSize=Math.max(w.targetSize||100,200);
      if(!enemies.length){w.mission='reserve';continue;}
      if(['fighters','cas','bombers'].includes(w.kind)){
        if(!picks.length){w.zone=capital.zone;w.mission='reserve';continue;}
        if(plan[w.id]===null){w.zone=capital.zone;w.mission='reserve';continue;}
        const zone=plan[w.id]||picks[0][0],home=zone===capital.zone&&!this.ownedToday16(id).some(p=>p.zone===zone&&p.neighbors.some(n=>this.war(id,this.s.provinces[n].ctrl)));
        const b=baseFor(zone,w.kind);if(b)w.base=b.id;
        w.zone=zone;
        w.mission=w.kind==='fighters'?(home?'intercept':'superiority'):home?'reserve':'support';
        continue;
      }
      if(distance(this.prov[w.base],focus)>(AIR_RANGE[w.kind]||1600)*.7){w.base=base.id;}
      if(false){}
      else if(w.kind==='strategicBombers'){
        const target=this.prov.filter(p=>enemies.includes(this.s.provinces[p.id].ctrl)&&this.s.provinces[p.id].civ+this.s.provinces[p.id].mil>0&&distance(p,this.prov[w.base])<AIR_RANGE.strategicBombers*.9).sort((a,b)=>(this.s.provinces[b.id].civ+this.s.provinces[b.id].mil)-(this.s.provinces[a.id].civ+this.s.provinces[a.id].mil))[0];
        if(target){w.zone=target.zone;w.mission='strategic';}else w.mission='reserve';
      }
      else if(w.kind==='navalBombers'){
        const fleet=this.s.fleets.find(f=>enemies.includes(f.owner)&&f.mission!=='port'&&this.world.seas.some(z=>z.id===f.zone&&distance(z,this.prov[w.base])<AIR_RANGE.navalBombers*.9));
        if(fleet){w.seaZone=fleet.zone;w.mission='navalStrike';}else w.mission='reserve';
      }
      else w.mission=this.units(id).some(u=>u.pocketed)?'airSupply':'reserve';
    }
  };
  Engine.prototype.aiNavy16=function(id){
    const c=this.nation(id),enemies=this.enemies(id),prof=this.aiProfile16(id);
    const ports=this.ownedToday16(id).filter(p=>this.s.provinces[p.id].ctrl===id&&this.s.provinces[p.id].port>0);if(!ports.length)return;
    // Home port: the largest port of the homeland.
    const homeland=this.homeland16(id);
    const home=ports.sort((a,b)=>(homeland.has(b.id)-homeland.has(a.id))||this.s.provinces[b.id].port-this.s.provinces[a.id].port||a.id-b.id)[0];
    let fleets=this.s.fleets.filter(f=>f.owner===id);
    // New ships join a reserve squadron at the home port; a large enough
    // reserve becomes a fleet of its own, or joins the weakest fleet.
    const spare=['destroyers','submarines','cruisers','battleships','carriers'].filter(k=>c.stock[k]>=1);
    if(spare.length&&sum(spare.map(k=>Math.floor(c.stock[k])))>=2){
      let f=fleets.find(f=>f.reserve16);
      if(!f){f={id:this.s.uid++,owner:id,name:'Escadre de réserve',base:home.id,zone:home.seaZone,mission:'port',eta:0,ships:{destroyers:0,submarines:0,cruisers:0,battleships:0,carriers:0},strength:1,reinforce:true,reserve16:true};this.s.fleets.push(f);fleets.push(f);}
      for(const k of spare){const n=Math.floor(c.stock[k]);f.ships[k]=(f.ships[k]||0)+n;c.stock[k]-=n;}
      this.syncVessels16(f);
    }
    for(const f of fleets)this.syncVessels16(f);
    const merge=(into,from)=>{into.vessels16.push(...from.vessels16);from.vessels16=[];this.recountShips16(into);this.recountShips16(from);};
    const regular=()=>fleets.filter(f=>!f.reserve16&&f.vessels16.length),max=1+Math.floor(sum(fleets.map(f=>f.vessels16.length))/40);
    const reserve=fleets.find(f=>f.reserve16);
    if(reserve&&reserve.vessels16.length>=8){
      const host=regular().filter(f=>f.mission==='port'&&f.eta<=0).sort((a,b)=>a.vessels16.length-b.vessels16.length||a.id-b.id)[0];
      if(regular().length<max){reserve.reserve16=false;c.fleetSerial16=(c.fleetSerial16||1)+1;reserve.name='Escadre '+c.fleetSerial16;}
      else if(host)merge(host,reserve);
    }
    // Too many fleets: small fleets sharing a zone are merged.
    for(let guard=0;regular().length>max&&guard<10;guard++){
      const list=regular().filter(f=>f.eta<=0).sort((a,b)=>a.vessels16.length-b.vessels16.length||a.id-b.id);
      const small=list.find(f=>list.some(g=>g!==f&&g.zone===f.zone));if(!small)break;
      merge(list.filter(g=>g!==small&&g.zone===small.zone).sort((a,b)=>b.vessels16.length-a.vessels16.length)[0],small);
    }
    fleets=this.s.fleets.filter(f=>f.owner===id&&(f.vessels16?.length||sum(Object.values(f.ships))>0||f.reserve16));
    if(!enemies.length){for(const f of fleets){if(f.mission!=='port'&&(prof.navy||0)<.3)f.mission='port';else if((prof.navy||0)>=.3&&f.strength>.8){f.mission='patrol';}}return;}
    const enemyFleets=this.s.fleets.filter(f=>enemies.includes(f.owner));
    const enemyPorts=this.prov.filter(p=>enemies.includes(this.s.provinces[p.id].ctrl)&&this.s.provinces[p.id].port>0&&p.seaZone);
    const strongest=fleets.slice().sort((a,b)=>this.fleetRating(b)-this.fleetRating(a))[0];
    const myPower=sum(fleets.map(f=>this.fleetRating(f))),theirPower=sum(enemyFleets.map(f=>this.fleetRating(f)));
    for(const f of fleets){
      if(f.strength<.45){f.mission='port';continue;}
      const subsOnly=!f.ships.destroyers&&!f.ships.cruisers&&!f.ships.battleships&&!f.ships.carriers&&f.ships.submarines>0;
      let zone=f.zone,mission;
      if(subsOnly){zone=enemyPorts.sort((a,b)=>distance(a,this.prov[f.base])-distance(b,this.prov[f.base])||a.id-b.id)[0]?.seaZone||home.seaZone;mission='raid';}
      else if(f===strongest&&myPower>=theirPower*.7){const target=enemyFleets.sort((a,b)=>this.fleetRating(b)-this.fleetRating(a))[0];zone=target&&this.world.seas.some(z=>z.id===target.zone&&distance(z,this.prov[f.base])<4000)?target.zone:home.seaZone;mission='strike';}
      else if(myPower<theirPower*.4&&(f.ships.destroyers||0)>2){zone=home.seaZone;mission='mines';}
      else {zone=home.seaZone;mission='escort';}
      // A fleet in being: no sortie into a region held by a much stronger enemy.
      const local=sum(enemyFleets.filter(e=>e.zone===zone&&e.mission!=='port'&&e.eta<=0).map(e=>this.fleetRating(e))),mine=this.fleetRating(f);
      if(local>mine*(mission==='strike'?1.5:mission==='raid'?3:1.2)){zone=home.seaZone;mission='port';}
      if(zone&&zone!==f.zone){f.eta=this.seaDays16(f.zone,zone);f.zone=zone;}
      f.mission=mission;
    }
  };
  Engine.prototype.aiInvasion16=function(id){
    const c=this.nation(id),enemies=this.enemies(id).filter(e=>!this.nation(e).capitulated16);
    if(!enemies.length||(this.s.invasions16||[]).some(i=>i.owner===id)||c.stock.convoys<80)return;
    const reach=new Map(),reachable=k=>{let v=reach.get(k);if(v===undefined){v=!!this.access(id,k);reach.set(k,v);}return v;};
    const landEnemies=new Set(enemies.filter(e=>this.ownedToday16(e).some(p=>p.neighbors.some(n=>reachable(this.s.provinces[n].ctrl)))));
    const overseas=enemies.filter(e=>!landEnemies.has(e));if(!overseas.length)return;
    const prepared=this.units(id).filter(u=>u.invasionPrep16);
    const ports=this.ownedToday16(id).filter(p=>this.s.provinces[p.id].ctrl===id&&this.s.provinces[p.id].port>0);if(!ports.length)return;
    if(prepared.length){
      const target=prepared[0].invasionPrep16,port=prepared[0].invasionPort16;
      const ready=prepared.filter(u=>u.pid===port);
      if(ready.length>=Math.min(4,prepared.length)&&this.war(id,this.s.provinces[target].ctrl)){
        for(const u of prepared){u.invasionPrep16=null;u.invasionPort16=null;}
        try{this.startInvasion16(id,ready.slice(0,8).map(u=>u.id),target);}catch{for(const u of ready)u.path=[];}
      }else if(this.s.day-(prepared[0].invasionDay16||0)>90){for(const u of prepared){u.invasionPrep16=null;u.invasionPort16=null;}}
      return;
    }
    const frontline=new Set(this.ownedToday16(id).filter(p=>p.neighbors.some(n=>this.war(id,this.s.provinces[n].ctrl))).map(p=>p.id));
    const spare=this.units(id).filter(u=>!u.path.length&&u.org>60&&!u.lent16&&!frontline.has(u.pid));
    if(spare.length<6)return;
    let best=null;
    for(const e of overseas){
      for(const p of this.ownedToday16(e)){
        if(!p.coast||!p.seaZone)continue;
        if((this.unitsAt.get(p.id)||[]).length)continue;
        let port=null,d=Infinity;for(const q of ports){const dq=distance(q,p);if(dq<d||dq===d&&q.id<port.id){d=dq;port=q;}}
        if(d>1800*(1+c.bonus.invasion*2))continue;
        if(this.seaShare16(id,p.seaZone)<.6||this.seaShare16(id,port.seaZone)<.6)continue;
        const score=p.vp*3-d/200;
        if(!best||score>best.score)best={score,target:p.id,port:port.id};
      }
    }
    if(!best)return;
    for(const u of spare.slice(0,6)){u.invasionPrep16=best.target;u.invasionPort16=best.port;u.invasionDay16=this.s.day;u.path=this.path(u.pid,best.port,id,false)||[];}
  };
  const AI_DECISIONS=['integrate_province','rationalize','prospecting','public_works','officer_training','winter_gear','mobilize_reserves','emergency_production','sacred_union','four_year_plan','westwall','maginot_extension','imperial_conference','five_year_plan','zaibatsu_mobilization','united_front','supply_road','central_industrial_region','mare_nostrum','arsenal_of_democracy','end_isolation','border_forts','air_defense_program','evacuate_industry','national_union'];
  const AI_ADVISORS={political:['industrialist','economist','scientist','diplomat'],army:null,navy:['navy_fleet','navy_convoy'],air:['air_fighter'],command:['hc_planner','hc_infantry','hc_armor'],theorist:['theorist_army']};
  Engine.prototype.aiGovernment16=function(id){
    const c=this.nation(id),prof=this.aiProfile16(id);
    for(const [slot,pref] of Object.entries(AI_ADVISORS)){
      const list=pref||(prof.aggression>.5?['army_offense','army_mobile']:['army_defense','army_org']);
      const max=this.catalog.advisorSlots?.[slot]?.[1]||1,hired=c.advisors16?.[slot]||[];if(hired.length>=max)continue;
      const pick=list.map(a=>this.catalog.advisors.find(x=>x.id===a)).find(a=>a&&!hired.includes(a.id)&&(!a.ideology||a.ideology.includes(c.ideology)));
      if(pick&&c.pp>=pick.cost+60){this.hireAdvisor16(id,pick.id);c.pp-=pick.cost;return;}
    }
    // National decisions flagged for the AI come first, then the common list.
    this.aiDecisionList16??=[...this.catalog.decisions.filter(d=>d.ai&&!AI_DECISIONS.includes(d.id)).map(d=>d.id),...AI_DECISIONS];
    for(const did of this.aiDecisionList16){
      const d=this.catalog.decisions.find(x=>x.id===did);if(!d||c.pp<d.cost+50)continue;
      if(did==='evacuate_industry'&&(c.stats.coreShare??1)>.85)continue;
      if(did==='mobilize_reserves'&&c.manpower>this.units(id).length*5000)continue;
      if(!this.decisionReason16(id,d)){this.takeDecision16(id,did);return;}
    }
  };
  Engine.prototype.aiDiplomacy16=function(id){
    const c=this.nation(id),prof=this.aiProfile16(id);
    // Joining a faction of the same ideology once the world becomes dangerous.
    // Historical campaigns: neutrals stay neutral; a country at war joins the
    // faction already fighting its enemy.
    if(c.faction==='none'&&!c.subject&&this.s.historical){
      const foes=this.enemies(id);
      if(foes.length){
        const lead=this.active().filter(k=>k!==id&&this.nation(k).faction!=='none'&&!this.nation(k).subject&&foes.some(e=>this.war(k,e))).sort((a,b)=>(this.nation(b).stats.mil||0)-(this.nation(a).stats.mil||0)||a.localeCompare(b))[0];
        if(lead){c.faction=this.nation(lead).faction;this.log(this.info(id).name+' rejoint la faction '+c.faction+'.','event');}
      }
    }
    if(c.faction==='none'&&!c.subject&&!this.s.historical&&this.s.tension>=45&&!this.enemies(id).length){
      const factions=new Map();
      for(const k of this.active()){const n=this.nation(k);if(n.faction==='none'||k===id)continue;const f=factions.get(n.faction)||{mil:0,ideology:null,leader:null};if(n.stats.mil>f.mil){f.mil=n.stats.mil;f.ideology=n.ideology;f.leader=k;}factions.set(n.faction,f);}
      const near=new Set(this.ownedToday16(id).flatMap(p=>p.neighbors.map(n=>this.s.provinces[n].ctrl)));
      const threatened=[...near].some(k=>k!==id&&this.nation(k)?.alive&&this.aiProfile16(k).aggression>=.5&&this.nation(k).ideology!==c.ideology);
      for(const [name,f] of factions){
        // Only factions whose leader is close enough to matter.
        if(f.ideology!==c.ideology||!threatened||distance(this.prov[this.cap(id)],this.prov[this.cap(f.leader)])>3500)continue;
        if(unit01(hash32(id.charCodeAt(0)*131+id.charCodeAt(1)*17+this.s.day))<.15){c.faction=name;this.log(this.info(id).name+' rejoint la faction '+name+'.','event');break;}
      }
    }
    // Volunteers for an ideological ally in a civil war.
    // Fascist and communist powers back the camp closest to them; the side
    // facing a fascist camp is helped by communists.
    if((prof.aggression>=.5||c.ideology==='communist')&&!this.enemies(id).length&&this.s.tension>=20&&!this.s.units.some(u=>u.lent16?.home===id)){
      const ally=this.active().find(k=>k!==id&&this.hasSpirit16(this.nation(k),'civil_war')&&this.enemies(k).length&&(this.nation(k).ideology===c.ideology||c.ideology==='communist'&&this.enemies(k).some(e=>this.nation(e).ideology==='fascist')));
      if(ally){const spare=this.units(id).filter(u=>!u.path.length).slice(0,c.ideology==='communist'?2:3);if(spare.length)try{this.lend16(id,ally,spare,'volunteer');}catch{}}
    }
    // Arms for the camp it backs in a civil war, every two months.
    if((prof.aggression>=.5||c.ideology==='communist')&&!this.enemies(id).length&&this.s.day%60<10){
      const camp=this.active().find(k=>k!==id&&this.hasSpirit16(this.nation(k),'civil_war')&&this.enemies(k).length&&(this.nation(k).ideology===c.ideology||c.ideology==='communist'&&this.enemies(k).some(e=>this.nation(e).ideology==='fascist')));
      const n=camp&&this.nation(camp);
      if(n&&(n.aid16Day??-99)<this.s.day-50){n.aid16Day=this.s.day;for(const [k,amount] of [['rifles',2500],['supportEq',600],['artillery',400],['trucks',300]])if(c.stock[k]>amount*3){this.transferEquipment16(id,camp,k,amount);}}
    }
    // Sandbox wars for aggressive profiles.
    if(!this.s.historical&&prof.aggression>=.5&&this.s.day>240&&!this.enemies(id).length&&c.pp>=80){
      const j=c.justifications.find(j=>j.progress>=j.days&&this.nation(j.target)?.alive&&!this.allies(id,j.target));
      if(j){try{this.declareWar(id,j.target);}catch{}return;}
      if(!c.justifications.length){
        const targets=[...new Set(this.ownedToday16(id).flatMap(p=>p.neighbors.map(n=>this.s.provinces[n].ctrl)))].filter(k=>k!==id&&this.nation(k)?.alive&&!this.allies(id,k)&&this.units(k).length<this.units(id).length*.6);
        const t=targets.sort((a,b)=>this.units(a).length-this.units(b).length||a.localeCompare(b))[0];
        if(t){c.pp-=40;c.justifications.push({target:t,progress:0,days:60,goal:'conquest'});this.s.tension=clamp(this.s.tension+5,0,100);}
      }
    }
  };
  // 1939 bookmark: three years of rearmament are authored, not simulated.
  Engine.prototype.applyOOB16=function(){
    const bookmark=(this.catalog.bookmarks||[]).find(b=>b.id===this.s.historyState?.scenario);if(!bookmark?.oob)return;
    for(const [id,o] of Object.entries(bookmark.oob)){
      const c=this.nation(id);if(!c?.alive)continue;
      const owned=this.owned(id).filter(p=>this.isCore(id,p.id)).sort((a,b)=>b.vp-a.vp||a.id-b.id);if(!owned.length)continue;
      for(const kind of ['civ','mil']){
        const missing=Math.max(0,(o[kind]||0)-c.stats[kind]);
        for(let i=0;i<missing;i++){const p=owned[i%Math.min(owned.length,12)];this.s.provinces[p.id][kind]++;}
      }
      const extra=Math.max(0,(o.divisions||0)-this.units(id).length);
      const frontier=owned.filter(p=>p.neighbors.some(n=>this.s.provinces[n].ctrl!==id)),positions=frontier.length?frontier:owned;
      let army=this.s.armies.find(a=>a.owner===id)||this.addArmy(id);
      const armored=c.templates.find(t=>t.id==='armored')||c.templates[0],infantry=c.templates[0];
      for(let i=0;i<extra;i++){
        if(i%12===0&&i)army=this.addArmy(id);
        const u=this.spawn(id,positions[(i*5)%positions.length].id,(o.armor||0)>0&&i%Math.round(1/(o.armor||1))===0?armored:infantry,80);u.army=army.id;
      }
      c.stock.rifles+=extra*500;c.stock.artillery+=extra*20;c.stock.supportEq+=extra*30;c.stock.antiTank+=extra*10;
      if(o.air){const fighters=this.s.wings.find(w=>w.owner===id&&w.kind==='fighters');const add=Math.max(0,o.air-sum(this.s.wings.filter(w=>w.owner===id).map(w=>w.size)));if(fighters)fighters.size+=Math.round(add*.6);c.stock.cas+=Math.round(add*.2);c.stock.bombers+=Math.round(add*.2);}
      c.pool+=extra*9000;c.manpower+=extra*2000;
    }
    this.s.stateExtra=this.computeStateExtra();
  };
  Engine.invariant16(function(state){
    for(const u of state.units)if(u.invasionPrep16!=null)assert(this.prov[u.invasionPrep16]&&this.prov[u.invasionPort16],'Préparation de débarquement invalide.');
  });

  // ---------------------------------------------------------------------------
  // Commanders. Generals and marshals have a skill level, experience and
  // traits: personality traits come with the officer, terrain and arms traits
  // are learnt in battle. Each day of battle both sides choose a tactic; the
  // commander with the initiative may change his to counter the other's.
  // A marshal passes half of his traits to the armies of his group.
  // ---------------------------------------------------------------------------
  const COMMANDER_MAX=24,TRAIT_MAX=8,COMMANDER_COST=20,MARSHAL_COST=50,ROLES=['general','marshal'],COMMAND_STATS=['attack','defense','planning','logistics'];
  const EFFECT_KEYS=['attack','defense','breakthrough','org','losses','winter','river','entrench','fortAttack'];
  const TACTIC_KEYS=['attack','defense','breakthrough','losses','enemyAttack','enemyDefense','enemyBreakthrough'];
  // Personality traits make a commander favour some tactics.
  const TRAIT_TACTIC={temeraire:'assault',ruse:'infiltration',artilleur:'barrage',strategiste:'envelopment',blindes:'armored',prudent:'methodical',defensif:'hold',meneur:'counterattack',offensif:'counterattack',genie:'digin',foret:'ambush',jungle:'ambush'};
  const catalogMaps=new WeakMap();
  const commandCatalog=cat=>{
    let m=catalogMaps.get(cat);
    if(!m){m={traits:new Map((cat.commanderTraits||[]).map(t=>[t.id,t])),tactics:new Map((cat.combatTactics||[]).map(t=>[t.id,t]))};catalogMaps.set(cat,m);}
    return m;
  };
  Engine.prototype.traits16=function(){return commandCatalog(this.catalog).traits;};
  Engine.prototype.tactics16=function(){return commandCatalog(this.catalog).tactics;};
  Engine.nextLevelXP16=g=>50*(g.skill+1);
  const familyCache=new WeakMap();
  const family16=st=>{
    let f=familyCache.get(st);if(f)return f;
    const n=st.battalions||1;
    f={armor:st.tank/n>=.25,mobile:(st.motor+st.tank)/n>=.5,infantry:st.inf/n>=.6&&!st.motor&&!st.tank,artillery:st.art/n>=.2,
      special:st.special.amphibious>=.3||st.special.paradrop>0||(st.terrain.mountains?.attack||0)>=.15};
    familyCache.set(st,f);return f;
  };
  Engine.prototype.normCommander16=function(g,i){
    if(!ROLES.includes(g.role))g.role=i===0?'marshal':'general';
    for(const k of COMMAND_STATS)g[k]=clamp(Math.round(Number(g[k])||0),0,9);
    if(!Number.isInteger(g.skill))g.skill=clamp(Math.round((g.attack+g.defense+g.planning+g.logistics)/4),1,9);
    if(!Array.isArray(g.traits))g.traits=[];
    if(!finite(g.xp,0,1e6))g.xp=0;
    if(!g.learn||typeof g.learn!=='object')g.learn={};
    return g;
  };
  Engine.prototype.makeCommander16=function(id,e,key){
    const T=this.traits16();
    return {id:id+'_'+key,name:e.name,role:e.role||'general',skill:e.skill||1,attack:e.attack,defense:e.defense,planning:e.planning,logistics:e.logistics,
      traits:(e.traits||[]).filter(t=>T.has(t)),xp:0,learn:{},...(e.until?{until:e.until}:{})};
  };
  // A new officer: a surname from the country's language and a few points
  // spread over the four statistics.
  Engine.prototype.raiseCommander16=function(id,skill=1){
    const c=this.nation(id),names=this.catalog.commanderNames,lang=names?.lang?.[id]||'generic',pool=names?.pools?.[lang]||names?.pools?.generic||['Martin'];
    const used=new Set(c.identity.commanders.map(g=>g.name));
    let name=null;
    for(let i=0;i<pool.length&&!name;i++){const n=pool[Math.floor(this.random()*pool.length)];if(!used.has(n))name=n;}
    if(!name)name=pool[0]+' '+(c.identity.commanders.length+1);
    const g={id:id+'_r'+this.s.uid++,name,role:'general',skill,attack:1,defense:1,planning:1,logistics:1,traits:[],xp:0,learn:{}};
    for(let i=0;i<skill+2;i++)g[COMMAND_STATS[Math.floor(this.random()*4)]]++;
    const personal=[...this.traits16().values()].filter(t=>t.kind==='personality'&&t.id!=='vieille_garde');
    if(personal.length&&this.random()<.5)g.traits.push(personal[Math.floor(this.random()*personal.length)].id);
    return g;
  };
  Engine.prototype.rosterFor16=function(id){
    const list=this.catalog.commanderRosters?.[id];if(!list)return null;
    return list.map((e,i)=>[e,i]).filter(([e])=>!e.until||planDay(e.until)>this.s.day).map(([e,i])=>this.makeCommander16(id,e,'c'+i));
  };
  Engine.prototype.busyCommanders16=function(id){
    const busy=new Set();
    for(const a of this.s.armies)if(a.owner===id&&a.general)busy.add(a.general);
    for(const g of this.s.groups||[])if(g.owner===id&&g.marshal)busy.add(g.marshal);
    return busy;
  };
  // Best free officer for an army: generals first, then marshals without a group.
  Engine.prototype.freeGeneral16=function(id,busy=this.busyCommanders16(id)){
    let best=null,score=-1;
    for(const g of this.nation(id).identity.commanders){
      if(busy.has(g.id))continue;
      const v=(g.role==='marshal'?0:100)+g.skill*4+g.attack+g.defense+g.planning;
      if(v>score){best=g;score=v;}
    }
    return best;
  };
  Engine.prototype.staffArmies16=function(id){
    const busy=this.busyCommanders16(id),size=new Map();
    for(const u of this.s.units)if(u.owner===id)size.set(u.army,(size.get(u.army)||0)+1);
    for(const a of this.s.armies.filter(a=>a.owner===id&&!a.general).sort((x,y)=>(size.get(y.id)||0)-(size.get(x.id)||0)||x.id-y.id)){
      const g=this.freeGeneral16(id,busy);if(!g)break;a.general=g.id;busy.add(g.id);
    }
  };
  // New game: the placeholder officers of the map (ID_g0, ID_g1...) give way
  // to the historical roster; every army then receives a commander.
  Engine.prototype.setupCommanders16=function(){
    for(const [id,c] of Object.entries(this.s.countries)){
      c.identity.commanders??=[];
      const list=c.identity.commanders,pattern=new RegExp('^'+id+'_g\\d+$');
      if(list.every(g=>pattern.test(g.id))){const roster=this.rosterFor16(id);if(roster?.length)c.identity.commanders=roster;}
      c.identity.commanders.forEach((g,i)=>this.normCommander16(g,i));
      const ids=new Set(c.identity.commanders.map(g=>g.id));
      for(const a of this.s.armies)if(a.owner===id&&a.general&&!ids.has(a.general))a.general=null;
      for(const a of this.s.armies)if(a.owner===id&&a.general&&c.identity.commanders.find(g=>g.id===a.general)?.role==='marshal')a.general=null;
      if(c.alive&&!c.identity.commanders.length)c.identity.commanders.push(this.raiseCommander16(id,2));
      if(c.alive)this.staffArmies16(id);
    }
  };
  const init18=Engine.prototype.init16;
  Engine.prototype.init16=function(fresh){
    init18.call(this,fresh);
    if(fresh)this.setupCommanders16();
    else for(const c of Object.values(this.s.countries)){c.identity.commanders??=[];c.identity.commanders.forEach((g,i)=>this.normCommander16(g,i));}
  };
  Engine.prototype.removeCommander16=function(id,gid){
    const c=this.nation(id);c.identity.commanders=c.identity.commanders.filter(g=>g.id!==gid);
    for(const a of this.s.armies)if(a.owner===id&&a.general===gid)a.general=null;
    for(const g of this.s.groups)if(g.owner===id&&g.marshal===gid)g.marshal=null;
  };
  Engine.prototype.marshalOf16=function(army){
    if(army?.group==null)return null;
    const grp=this.s.groups.find(g=>g.id===army.group&&g.owner===army.owner);
    return grp?.marshal?this.nation(army.owner).identity.commanders.find(c=>c.id===grp.marshal)||null:null;
  };
  Engine.prototype.traitSum16=function(g,key,terrain=null){
    let n=0;
    for(const id of g.traits){const t=this.traits16().get(id);if(t?.effect[key]&&(!t.terrain||!terrain||t.terrain.includes(terrain)))n+=t.effect[key];}
    return n;
  };
  // Supply from the commander: logistics skill and traits (some only in a terrain).
  Engine.prototype.commanderSupply16=function(g,pid){return g.logistics*.025+this.traitSum16(g,'supply',this.prov[pid].terrain);};
  Engine.prototype.commanderPlanning16=function(g){return g.planning*.002*(1+this.traitSum16(g,'planning'));};
  // Combat effects of the traits of the army's general (full) and marshal (half).
  Engine.prototype.addTraits16=function(e,g,share,terrain,fam){
    const T=this.traits16();
    for(const id of g.traits){
      const t=T.get(id);if(!t)continue;
      if(t.terrain&&!t.terrain.includes(terrain))continue;
      if(t.units&&!t.units.some(k=>fam[k]))continue;
      for(const k of EFFECT_KEYS)if(t.effect[k])e[k]+=t.effect[k]*share;
    }
  };
  Engine.prototype.armyEffect16=function(army,pid,st){
    const e={attack:0,defense:0,breakthrough:0,org:0,losses:0,winter:0,river:0,entrench:0,fortAttack:0};
    if(!army)return e;
    const terrain=this.prov[pid].terrain,fam=family16(st),g=this.general(army),m=this.marshalOf16(army);
    if(g)this.addTraits16(e,g,this.commandSpan16(army),terrain,fam);
    if(m)this.addTraits16(e,m,.5,terrain,fam);
    return e;
  };
  // The commander of the army with most divisions in the battle leads it.
  Engine.prototype.leadCommander16=function(pool,armies){
    const count=new Map();for(const u of pool)if(u.army!=null)count.set(u.army,(count.get(u.army)||0)+1);
    let best=null,n=0;for(const [id,k] of count)if(k>n||k===n&&id<best){best=id;n=k;}
    const army=armies.get(best);return army?this.general(army)||this.marshalOf16(army):null;
  };
  Engine.prototype.chooseTactics16=function(pid,attackPool,defendPool,ga,gd){
    const T=this.tactics16();if(!T.size)return null;
    const share=f=>attackPool.filter(u=>f(this.unitStats16(u))).length/Math.max(1,attackPool.length);
    const ok={artillery:share(s=>s.art>0)>=.3,armor:share(s=>s.tank>0)>=.25,approaches:new Set(attackPool.map(u=>u.landing16?'sea':u.pid)).size>=2,
      entrenched:this.s.provinces[pid].fort>0||sum(defendPool.map(u=>u.entrench))/Math.max(1,defendPool.length)>=4};
    const list=side=>[...T.values()].filter(t=>t.side===side&&(!t.need||ok[t.need]));
    const pick=(options,g)=>{
      const w=options.map(t=>1+(g&&g.traits.some(id=>TRAIT_TACTIC[id]===t.id)?2:0));
      let r=this.random()*sum(w);for(let i=0;i<options.length;i++){r-=w[i];if(r<0)return options[i];}return options[options.length-1];
    };
    const la=list('a'),ld=list('d');if(!la.length||!ld.length)return null;
    let a=pick(la,ga),d=pick(ld,gd);
    const initiative=g=>(g?g.planning+g.skill*.5+this.traitSum16(g,'initiative'):0)+this.random()*4;
    const lead=initiative(ga)>=initiative(gd)?'a':'d';
    // The commander with the initiative adapts to the other's choice.
    const adapt=(options,cur,other)=>{let best=cur,score=-9;for(const t of options){const s=(t.counters===other.id?1:0)-(other.counters===t.id?1:0)+(t===cur?.01:0);if(s>score){score=s;best=t;}}return best;};
    if(lead==='a')a=adapt(la,a,d);else d=adapt(ld,d,a);
    const countered=d.counters===a.id?'a':a.counters===d.id?'d':null;
    const mods=(t,side)=>{const m=Object.fromEntries(TACTIC_KEYS.map(k=>[k,0]));if(countered===side)m[side==='a'?'attack':'defense']=-.1;else for(const k of TACTIC_KEYS)m[k]=t.effect[k]||0;return m;};
    return {a:a.id,d:d.id,lead,countered,mods:{a:mods(a,'a'),d:mods(d,'d')}};
  };
  const NO_TACTIC={a:Object.fromEntries(TACTIC_KEYS.map(k=>[k,0])),d:Object.fromEntries(TACTIC_KEYS.map(k=>[k,0]))};
  const combatProfile18=Engine.prototype.combatProfile16;
  Engine.prototype.combatProfile16=function(u,pid,offense,ctx){
    const p=combatProfile18.call(this,u,pid,offense,ctx),b=this.battle16;
    if(!b)return p;
    const e=this.armyEffect16(ctx.armies.get(u.army),pid,p.st),mods=b.tactics?.mods||NO_TACTIC;
    let atk=1+e.attack;
    if(offense){
      let brk=(1+e.breakthrough+e.defense*.5)*(1+mods.a.breakthrough)*(1+mods.d.enemyBreakthrough);
      if(e.winter&&ctx.weather.attack<1)atk*=Math.pow(1/ctx.weather.attack,Math.min(1,e.winter));
      if(e.river){const r=this.riverAttackFactor(u,pid);if(r<1)atk*=(r+(1-r)*Math.min(1,e.river))/r;}
      if(e.fortAttack&&this.s.provinces[pid].fort>0)atk*=1+e.fortAttack;
      atk*=(1+mods.a.attack)*(1+mods.d.enemyAttack);
      p.breakthrough*=brk*atk;
    }else{
      let def=(1+e.defense)*(1+mods.d.defense)*(1+mods.a.enemyDefense);
      if(e.entrench)def*=1+u.entrench*.025*e.entrench;
      p.defense*=def;atk*=1+mods.d.attack;
    }
    p.soft*=atk;p.hard*=atk;
    if(e.org)p.orgMax*=1+e.org;
    const losses=(1+e.losses)*(1+(offense?mods.a.losses:mods.d.losses));
    if(losses!==1)b.loss.set(u.id,losses);
    return p;
  };
  const loss18=Engine.prototype.loss;
  Engine.prototype.loss=function(u,strength,org){
    const f=this.battle16?.loss.get(u.id);
    return loss18.call(this,u,f?strength*f:strength,org);
  };
  // Experience: each commander's battle days are gathered during the day and
  // turned into experience, levels and learnt traits by the daily hook.
  Engine.prototype.creditCommanders16=function(pool,armies,side,info){
    const log=this.cmdDay16??=new Map(),byArmy=new Map();
    for(const u of pool){if(u.army==null)continue;if(!byArmy.has(u.army))byArmy.set(u.army,[]);byArmy.get(u.army).push(u);}
    for(const [aid,units] of byArmy){
      const army=armies.get(aid);if(!army)continue;
      const fam={};for(const u of units){const f=family16(this.unitStats16(u));for(const k in f)if(f[k])fam[k]=(fam[k]||0)+1;}
      const families=Object.keys(fam).filter(k=>fam[k]>=units.length*.4);
      for(const [g,share] of [[this.general(army),1],[this.marshalOf16(army),.5]]){
        if(!g)continue;
        const key=army.owner+'|'+g.id;
        let r=log.get(key);
        if(!r){r={owner:army.owner,id:g.id,share,attack:false,defend:false,won:false,terrain:new Set(),fam:new Set(),winter:false,river:false,fort:false};log.set(key,r);}
        r.share=Math.max(r.share,share);r[side==='a'?'attack':'defend']=true;r.won||=info.won===side;r.terrain.add(info.terrain);
        for(const f of families)r.fam.add(f);
        r.winter||=info.winter;r.river||=side==='a'&&info.river;r.fort||=info.fort;
      }
    }
  };
  const resolveBattle18=Engine.prototype.resolveBattle16;
  Engine.prototype.resolveBattle16=function(pid,attackPool,defendPool,old,armies,busy){
    const ga=this.leadCommander16(attackPool,armies),gd=this.leadCommander16(defendPool,armies);
    const tactics=this.chooseTactics16(pid,attackPool,defendPool,ga,gd),ctrl=this.s.provinces[pid].ctrl;
    const fort=this.s.provinces[pid].fort>0||sum(defendPool.map(u=>u.entrench))/Math.max(1,defendPool.length)>=5;
    const river=attackPool.some(u=>!u.landing16&&this.riverAttackFactor(u,pid)<1),weather=this.weather(pid);
    this.battle16={tactics,loss:new Map()};
    let b;
    try{b=resolveBattle18.call(this,pid,attackPool,defendPool,old,armies,busy);}finally{this.battle16=null;}
    const taken=this.s.provinces[pid].ctrl!==ctrl;
    const info={terrain:this.prov[pid].terrain,won:b?null:taken?'a':'d',winter:['snow','blizzard','frost'].includes(weather.key),river,fort};
    this.creditCommanders16(attackPool,armies,'a',info);this.creditCommanders16(defendPool,armies,'d',info);
    if(b){b.tacticA=tactics?.a||null;b.tacticD=tactics?.d||null;b.tacticLead=tactics?.lead||null;b.countered=tactics?.countered||null;b.genA=ga?.id||null;b.genD=gd?.id||null;}
    return b;
  };
  Engine.prototype.trainCommander16=function(r){
    const c=this.nation(r.owner),g=c?.identity.commanders.find(x=>x.id===r.id);if(!g)return;
    const mine=r.owner===this.s.player,T=this.traits16();
    g.xp+=((r.attack?2:0)+(r.defend?1.5:0)+(r.won?1:0))*r.share;
    while(g.skill<9&&g.xp>=Engine.nextLevelXP16(g)){
      g.xp-=Engine.nextLevelXP16(g);g.skill++;
      const w=[r.attack?3:1,r.defend?3:1,1,1],stat=(()=>{let x=this.random()*sum(w);for(let i=0;i<4;i++){x-=w[i];if(x<0)return COMMAND_STATS[i];}return 'planning';})();
      if(g[stat]<9)g[stat]++;
      if(g.skill>=5&&!g.traits.includes('veteran')&&T.has('veteran')&&g.traits.length<TRAIT_MAX)g.traits.push('veteran');
      if(mine)this.log(g.name+' passe au niveau '+g.skill+' ('+({attack:'attaque',defense:'défense',planning:'planification',logistics:'logistique'}[stat])+' +1).','tip');
    }
    if(g.skill>=9)g.xp=Math.min(g.xp,Engine.nextLevelXP16(g));
    if(g.traits.some(id=>T.get(id)?.effect.noLearning)||g.traits.length>=TRAIT_MAX)return;
    for(const t of T.values()){
      if(!t.learn||g.traits.includes(t.id))continue;
      const match=t.terrain?t.terrain.some(x=>r.terrain.has(x)):t.units?t.units.some(x=>r.fam.has(x)):t.effect.winter?r.winter:t.effect.river?r.river:t.effect.entrench?r.fort:false;
      if(!match)continue;
      g.learn[t.id]=(g.learn[t.id]||0)+r.share;
      if(g.learn[t.id]>=t.learn){
        delete g.learn[t.id];g.traits.push(t.id);
        if(mine)this.log(g.name+' acquiert le trait « '+t.name+' ».','tip');
        if(g.traits.length>=TRAIT_MAX)break;
      }
    }
  };
  // AI staff work: recruitment at war, army groups by front with their marshal.
  Engine.prototype.aiCommanders16=function(id){
    const c=this.nation(id),at=this.enemies(id).length>0;
    const armies=this.s.armies.filter(a=>a.owner===id);
    if(at&&c.pp>=80&&c.identity.commanders.length<COMMANDER_MAX&&armies.some(a=>!a.general)&&!this.freeGeneral16(id)){
      c.pp-=COMMANDER_COST;c.identity.commanders.push(this.raiseCommander16(id,1+Math.floor(this.random()*2)));
    }
    this.staffArmies16(id);
    const busy=this.busyCommanders16(id),marshals=c.identity.commanders.filter(g=>g.role==='marshal'&&!busy.has(g.id)).sort((x,y)=>y.skill-x.skill||y.attack+y.defense-x.attack-x.defense);
    const fronts=new Map();
    for(const a of armies)if(a.target&&at)fronts.set(a.target,[...(fronts.get(a.target)||[]),a]);
    const groups=this.s.groups.filter(g=>g.owner===id);
    for(const [t,list] of [...fronts].sort((x,y)=>y[1].length-x[1].length)){
      if(list.length<2)continue;
      let grp=groups.find(g=>g.front16===t);
      if(!grp){
        if(!marshals.length&&c.pp>=MARSHAL_COST+60){
          // A seasoned general free of command receives the marshal's baton.
          const g=c.identity.commanders.filter(g=>g.role==='general'&&g.skill>=3&&!busy.has(g.id)).sort((x,y)=>y.skill-x.skill||x.id.localeCompare(y.id))[0];
          if(g){g.role='marshal';c.pp-=MARSHAL_COST;marshals.push(g);}
        }
        if(!marshals.length||groups.length>=12)continue;
        const letter=[...'ABCDEFGHIJKL'].find(l=>!groups.some(g=>g.name.startsWith('Groupe d’armées '+l+' ')));
        grp={id:this.s.uid++,owner:id,name:'Groupe d’armées '+letter+' / '+(this.nation(t)?.identity.name||t),marshal:null,front16:t};
        this.s.groups.push(grp);groups.push(grp);
      }
      if(!grp.marshal&&marshals.length)grp.marshal=marshals.shift().id;
      for(const a of list)a.group=grp.id;
    }
    // Groups without armies on their front are dissolved.
    for(const g of groups)if(g.front16!==undefined&&!(fronts.get(g.front16)?.length>=2)){
      for(const a of this.s.armies)if(a.group===g.id)a.group=null;
      this.s.groups=this.s.groups.filter(x=>x!==g);
    }
  };
  Engine.onDay16(function(){
    const log=this.cmdDay16;
    if(log){this.cmdDay16=null;for(const r of log.values())this.trainCommander16(r);}
    const day=this.s.day;
    for(const id of this.active()){
      const c=this.nation(id);
      // Historical removals (the Soviet purges of 1937-1938).
      if(this.s.historical)for(const g of c.identity.commanders)if(g.until&&planDay(g.until)<=day){
        this.removeCommander16(id,g.id);
        this.log((c.ideology==='communist'?'Purges : ':'')+g.name+' ('+c.identity.name+') est relevé de son commandement.','event');
      }
      // Countries created during the game (civil war, release) get officers.
      if(!c.identity.commanders.length){
        const roster=this.rosterFor16(id);
        c.identity.commanders=roster?.length?roster:[this.raiseCommander16(id,2)];
        c.identity.commanders.forEach((g,i)=>this.normCommander16(g,i));
        this.staffArmies16(id);
      }
    }
  });
  // An army is built for 24 divisions: beyond that its general's bonuses thin out.
  const ARMY_LIMIT=24;
  Engine.prototype.armySizes16=function(){
    if(this.armySizeDay16!==this.s.day||this.armySizeState16!==this.s){
      const m=new Map();for(const u of this.s.units)if(u.army!=null)m.set(u.army,(m.get(u.army)||0)+1);
      this.armySizeMap16=m;this.armySizeDay16=this.s.day;this.armySizeState16=this.s;
    }
    return this.armySizeMap16;
  };
  Engine.prototype.commandSpan16=function(army){const n=army?this.armySizes16().get(army.id)||0:0;return n>ARMY_LIMIT?ARMY_LIMIT/n:1;};
  // The AI plans one army per front sector, then splits it into armies of at
  // most 24 divisions along the line, each with its own general; they share
  // the sector's orders and form an army group under a marshal. Before each
  // planning pass the split armies are folded back into their parent and
  // reused afterwards, so they keep their name, general and experience.
  const aiFronts18=Engine.prototype.aiFronts16;
  Engine.prototype.aiFronts16=function(id){
    const corps=this.s.armies.filter(a=>a.owner===id&&a.parent16!=null),parent=new Map(corps.map(a=>[a.id,a.parent16]));
    if(corps.length){
      const alive=new Set(this.s.armies.filter(a=>a.owner===id&&a.parent16==null).map(a=>a.id));
      for(const u of this.s.units)if(u.owner===id&&parent.has(u.army)){const p=parent.get(u.army);u.army=alive.has(p)?p:null;}
      this.s.armies=this.s.armies.filter(a=>!parent.has(a.id));
    }
    aiFronts18.call(this,id);
    this.splitArmies16(id,corps);
    this.aiCommanders16(id);
  };
  Engine.prototype.splitArmies16=function(id,spare){
    const c=this.nation(id),byArmy=new Map();
    for(const u of this.s.units)if(u.owner===id&&u.army!=null){if(!byArmy.has(u.army))byArmy.set(u.army,[]);byArmy.get(u.army).push(u);}
    const reused=new Set();
    for(const a of this.s.armies.filter(a=>a.owner===id&&a.auto&&!a.home16&&a.parent16==null)){
      const units=byArmy.get(a.id)||[];
      if(units.length<=ARMY_LIMIT||units.some(u=>u.lent16))continue;
      const k=Math.ceil(units.length/ARMY_LIMIT);
      // Chunks follow the longer axis of the sector.
      const xs=units.map(u=>this.prov[u.pid].x),ys=units.map(u=>this.prov[u.pid].y);
      const alongX=Math.max(...xs)-Math.min(...xs)>=Math.max(...ys)-Math.min(...ys);
      const sorted=[...units].sort((u,v)=>(alongX?this.prov[u.pid].x-this.prov[v.pid].x:this.prov[v.pid].y-this.prov[u.pid].y)||u.id-v.id);
      for(let i=1;i<k;i++){
        let corp=spare.find(x=>!reused.has(x.id)&&x.parent16===a.id)||spare.find(x=>!reused.has(x.id));
        if(corp){reused.add(corp.id);this.s.armies.push(corp);}
        else{corp=this.addArmy(id);reused.add(corp.id);}
        corp.parent16=a.id;
        if(a.mobile16&&!corp.name.startsWith('Groupe blindé'))corp.name=a.name+' ('+(i+1)+')';
        else if(!a.mobile16&&corp.name.startsWith('Groupe blindé'))corp.name='Armée '+c.armySerial++;
        Object.assign(corp,{target:a.target,order:a.order,stance:a.stance,tactic:a.tactic,auto:true,objective:a.objective,mobile16:!!a.mobile16,home16:false,
          frontSelection:[...(a.frontSelection||[])],plan16:a.plan16?{...a.plan16,offensive:[...a.plan16.offensive],fallback:[...a.plan16.fallback]}:null,
          planning:a.planning,offensive16:a.offensive16,pause16:a.pause16,reserveRatio:a.reserveRatio??.15});
        if(corp.plan16?.line16)corp.plan16.line16=[...corp.plan16.line16];
        for(const u of sorted.slice(Math.round(i*units.length/k),Math.round((i+1)*units.length/k)))u.army=corp.id;
      }
    }
    // Officers of split armies that were not reused return to the pool.
    this.staffArmies16(id);
  };
  Engine.command16('recruitCommander',function(p,id,c){
    assert(c.identity.commanders.length<COMMANDER_MAX,'Maximum : '+COMMANDER_MAX+' officiers.');
    pp(c,COMMANDER_COST);c.pp-=COMMANDER_COST;
    const g=this.raiseCommander16(id,1);c.identity.commanders.push(g);
    this.log(g.name+' rejoint l’état-major.','tip');return g.id;
  });
  Engine.command16('promoteCommander',function(p,id,c){
    const g=c.identity.commanders.find(g=>g.id===p.id);assert(g,'Officier inconnu.');
    assert(g.role==='general','Cet officier est déjà maréchal.');assert(g.skill>=3,'Niveau 3 requis pour le bâton de maréchal.');
    pp(c,MARSHAL_COST);c.pp-=MARSHAL_COST;g.role='marshal';
    this.log(g.name+' est élevé à la dignité de maréchal.','tip');
  });
  Engine.command16('dismissCommander',function(p,id,c){
    assert(c.identity.commanders.some(g=>g.id===p.id),'Officier inconnu.');assert(c.identity.commanders.length>1,'Gardez au moins un officier.');
    this.removeCommander16(id,p.id);
  });
  // Only a marshal commands an army group.
  Engine.command16('marshal',function(p,id,c){
    if(p.marshal)assert(c.identity.commanders.find(g=>g.id===p.marshal)?.role==='marshal','Seul un maréchal commande un groupe d’armées.');
    return NOT_HANDLED;
  });
  Engine.invariant16(function(state){
    const T=this.traits16();
    for(const [id,c] of Object.entries(state.countries)){
      const list=c.identity.commanders,ids=new Set();
      assert(Array.isArray(list)&&list.length<=COMMANDER_MAX+12,'Officiers invalides.');
      for(const g of list){
        assert(typeof g.id==='string'&&!ids.has(g.id)&&typeof g.name==='string'&&ROLES.includes(g.role)&&Number.isInteger(g.skill)&&g.skill>=1&&g.skill<=9,'Officier invalide : '+id+'.');
        ids.add(g.id);
        for(const k of COMMAND_STATS)assert(Number.isInteger(g[k])&&g[k]>=0&&g[k]<=9,'Compétence d’officier invalide.');
        assert(Array.isArray(g.traits)&&g.traits.length<=TRAIT_MAX+4&&g.traits.every(t=>T.has(t))&&finite(g.xp,0,1e6)&&g.learn&&typeof g.learn==='object','Traits d’officier invalides.');
      }
    }
    for(const g of state.groups||[])if(g.marshal)assert(state.countries[g.owner]?.identity.commanders.some(x=>x.id===g.marshal),'Maréchal inconnu.');
  });

  // ---------------------------------------------------------------------------
  // Logistics. Supply travels along railway lines, cheaply when the country
  // has enough locomotives, then by road, faster with trucks. The lines come
  // from the map (world.railLinks) and from the lines built during the game
  // (s.railLinks16). Trucks wear out at war and burn under enemy air power;
  // a capitulating country leaves half of its rolling stock to the occupier.
  // ---------------------------------------------------------------------------
  const OCCUPIED_RAIL=2,TRAINS_PER_RAIL=.6,TRUCKS_PER_DIVISION=10,RAIL_COST=.22,RAIL_NEW=135,RAIL_UPGRADE=90,RAIL_ROUTE_MAX=60;
  Engine.prototype.railGraph16=function(){
    const extra=this.s.railLinks16||[];
    if(this._railWorld===this.world&&this._railState===this.s&&this._railExtra===extra.length)return this._railAdj;
    const adj=Array.from({length:this.prov.length},()=>[]);
    const add=(a,b)=>{if(this.prov[a]&&this.prov[b]&&!adj[a].includes(b)){adj[a].push(b);adj[b].push(a);}};
    for(const [a,b] of this.world.railLinks||[])add(a,b);
    for(const [a,b] of extra)add(a,b);
    this._railAdj=adj;this._railWorld=this.world;this._railState=this.s;this._railExtra=extra.length;
    return adj;
  };
  // Locomotives needed for the controlled network, trucks for the divisions.
  Engine.prototype.logistics16=function(){
    const rail=Object.create(null),divs=Object.create(null);
    for(const q of this.s.provinces)if(q.rail>0)rail[q.ctrl]=(rail[q.ctrl]||0)+q.rail;
    for(const u of this.s.units)divs[u.owner]=(divs[u.owner]||0)+1;
    const out=Object.create(null);
    for(const id of this.active()){
      const c=this.nation(id),trainNeed=Math.max(1,Math.round((rail[id]||0)*TRAINS_PER_RAIL)),truckNeed=Math.max(1,(divs[id]||0)*TRUCKS_PER_DIVISION);
      const l={rail:rail[id]||0,trainNeed,truckNeed,trains:clamp((c.stock.trains||0)/trainNeed,0,1),trucks:clamp((c.stock.trucks||0)/truckNeed,0,1)};
      out[id]=l;c.logistics16={rail:l.rail,trainNeed,truckNeed,trains:Math.round(l.trains*100)/100,trucks:Math.round(l.trucks*100)/100};
    }
    return out;
  };
  // Supply cost of one step: along a railway line, or by road.
  Engine.prototype.supplySteps16=function(){
    const L=this.logistics16(),legacy=!this.world.railLinks,adj=this.railGraph16(),S=this.s.provinces;
    const train=id=>Math.max(.25,L[id]?.trains??1),truck=id=>1.4-.55*(L[id]?.trucks??1);
    return {legacy,adj,train,truck,rail:(i,j)=>S[i].rail>0&&S[j].rail>0&&(legacy||adj[i].includes(j))};
  };
  Engine.prototype.initTrains16=function(){
    const L=this.logistics16();
    for(const [id,l] of Object.entries(L))this.nation(id).stock.trains=Math.max(this.nation(id).stock.trains||0,l.trainNeed);
    this.logistics16();
  };
  const init19=Engine.prototype.init16;
  Engine.prototype.init16=function(fresh){
    const s=this.s,old=!fresh&&s.railLinks16===undefined;
    init19.call(this,fresh);
    if(fresh||old){
      // Saves made before the railway network: the map's lines replace the
      // uniform level, extensions built during the campaign are kept.
      if(old&&this.world.railLinks)this.prov.forEach((p,i)=>{const q=s.provinces[i];if(p.rail==null)return;q.rail=Math.min(5,p.capital?Math.max(p.rail,q.rail):p.rail+Math.max(0,q.rail-1));q.hub=Math.max(q.hub,p.hub||0);});
      s.railLinks16??=[];
      this.initTrains16();
    }
  };
  // Shortest land route through the country's own provinces (no straits).
  Engine.prototype.railRoute16=function(id,from,to){
    const S=this.s.provinces,n=this.prov.length,dist=new Float64Array(n).fill(Infinity),prev=new Int32Array(n).fill(-1),seen=new Uint8Array(n);
    // Binary min-heap of [cost, province].
    const heap=[],push=e=>{let i=heap.length;heap.push(e);while(i>0){const up=(i-1)>>1;if(heap[up][0]<=e[0])break;heap[i]=heap[up];i=up;}heap[i]=e;};
    const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){let i=0;for(;;){let c=2*i+1;if(c>=heap.length)break;if(c+1<heap.length&&heap[c+1][0]<heap[c][0])c++;if(heap[c][0]>=last[0])break;heap[i]=heap[c];i=c;}heap[i]=last;}return top;};
    dist[from]=0;push([0,from]);
    let steps=0;
    while(heap.length&&steps++<20000){
      const [d,i]=pop();
      if(seen[i])continue;seen[i]=1;if(i===to)break;
      for(const j of this.prov[i].neighbors){
        if(S[j].ctrl!==id||seen[j]||this.strait16(i,j))continue;
        const t=this.catalog.terrain[this.prov[j].terrain]?.move||1,v=d+distance(this.prov[i],this.prov[j])*t;
        if(v<dist[j]){dist[j]=v;prev[j]=i;push([v,j]);}
      }
    }
    if(!seen[to])return null;
    const route=[to];while(route[route.length-1]!==from)route.push(prev[route[route.length-1]]);
    return route.reverse();
  };
  Engine.prototype.railLineCost16=function(route){return sum(route.map(pid=>this.s.provinces[pid].rail>=5?0:this.s.provinces[pid].rail>0?RAIL_UPGRADE:RAIL_NEW));};
  Engine.prototype.queueRailLine16=function(id,from,to){
    const c=this.nation(id),S=this.s.provinces;
    assert(this.prov[from]&&this.prov[to]&&from!==to,'Choisissez deux provinces différentes.');
    assert(S[from].ctrl===id&&S[to].ctrl===id,'Une ligne relie deux provinces que vous contrôlez.');
    assert(c.build.length<16,'File de construction pleine.');
    const route=this.railRoute16(id,from,to);
    assert(route&&route.length<=RAIL_ROUTE_MAX,'Aucun tracé terrestre de moins de '+RAIL_ROUTE_MAX+' provinces sur votre territoire.');
    const cost=this.railLineCost16(route);assert(cost>0,'Cette ligne est déjà au niveau maximal.');
    c.build.push({id:this.s.uid++,pid:from,kind:'railLine',pids:route,progress:0,cost});
    return route;
  };
  Engine.command16('railLine',function(p,id,c){return this.queueRailLine16(id,p.from,p.to).length;});
  // A finished line raises the railway level of every province on the route
  // and links them; any other project adds one level of its building.
  Engine.prototype.completeBuild16=function(id,b){
    const S=this.s.provinces;
    if(b.kind==='railLine'){
      for(const pid of b.pids)if(S[pid].ctrl===id)S[pid].rail=Math.min(5,S[pid].rail+1);
      const adj=this.railGraph16();this.s.railLinks16??=[];
      for(let i=1;i<b.pids.length;i++){const x=b.pids[i-1],y=b.pids[i];if(!adj[x].includes(y))this.s.railLinks16.push([Math.min(x,y),Math.max(x,y)]);}
      if(id===this.s.player)this.log('Voie ferrée achevée : '+this.prov[b.pids[0]].name+' – '+this.prov[b.pids[b.pids.length-1]].name+' ('+b.pids.length+' provinces).','success');
      return;
    }
    S[b.pid][b.kind]++;
    if(id===this.s.player)this.log(this.catalog.buildings[b.kind].name+' achevé(e) : '+this.prov[b.pid].name+'.','success');
  };
  // A retreating army wrecks the railways it leaves to the enemy: captured
  // lines carry supply poorly until repaired (province damage fades daily).
  const RAIL_WRECK=.4,capture19=Engine.prototype.capture;
  Engine.prototype.capture=function(pid,attackers){
    const st=this.s.provinces[pid],was=st.ctrl,result=capture19.call(this,pid,attackers);
    if(st.ctrl!==was&&st.rail>0&&this.war(st.ctrl,was))st.damage=Math.max(st.damage,RAIL_WRECK);
    return result;
  };
  // Truck wear at war (off the railways) and losses under enemy air control.
  Engine.onDay16(function(){
    const wear=Object.create(null),S=this.s.provinces,air=this.s.airControl16||{},atWar=new Map();
    for(const u of this.s.units){
      let w0=atWar.get(u.owner);if(w0===undefined){w0=this.enemies(u.owner).length>0;atWar.set(u.owner,w0);}
      if(!w0)continue;
      let w=S[u.pid].rail>0?0:.015;
      const control=air[this.prov[u.pid].zone]?.[u.owner];
      if(control!==undefined&&control<.3)w+=.05;
      if(w)wear[u.owner]=(wear[u.owner]||0)+w;
    }
    for(const [id,w] of Object.entries(wear)){const c=this.nation(id);c.stock.trucks=Math.max(0,c.stock.trucks-w);}
  });
  const capitulate19=Engine.prototype.capitulate16;
  Engine.prototype.capitulate16=function(id){
    const occupier=this.mainOccupier16(id),c=this.nation(id),before={trains:c.stock.trains||0,trucks:c.stock.trucks||0};
    const result=capitulate19.call(this,id);
    const o=this.nation(occupier);
    if(o?.alive&&occupier&&occupier!==id){
      for(const k of ['trains','trucks']){const taken=Math.floor(Math.min(before[k],c.stock[k]??before[k])*.5);o.stock[k]=(o.stock[k]||0)+taken;c.stock[k]=Math.max(0,(c.stock[k]||0)-taken);}
    }
    return result;
  };
  // AI: a front province far from the railways gets a line from the nearest
  // railway station of the country.
  Engine.prototype.aiRailways16=function(id){
    const c=this.nation(id),S=this.s.provinces;
    if(c.build.length>=3||c.build.some(b=>b.kind==='railLine')||c.stats.freeCiv<4)return;
    const front=this.ownedToday16(id).filter(p=>S[p.id].ctrl===id&&S[p.id].rail===0&&S[p.id].supply<.45&&p.neighbors.some(n=>this.war(id,S[n].ctrl))).sort((a,b)=>S[a.id].supply-S[b.id].supply||a.id-b.id)[0];
    if(!front)return;
    // Breadth-first search for the nearest province on the network.
    const seen=new Set([front.id]),queue=[front.id];let station=null;
    for(let h=0;h<queue.length&&h<400&&station===null;h++)for(const n of this.prov[queue[h]].neighbors){
      if(seen.has(n)||S[n].ctrl!==id)continue;seen.add(n);
      if(S[n].rail>0){station=n;break;}queue.push(n);
    }
    if(station===null)return;
    try{this.queueRailLine16(id,station,front.id);}catch{}
  };
  const aiConstruction19=Engine.prototype.aiConstruction16;
  Engine.prototype.aiConstruction16=function(id){
    if(this.enemies(id).length&&this.s.day%3===0)this.aiRailways16(id);
    return aiConstruction19.call(this,id);
  };
  // AI production: locomotives for the network, trucks for the divisions.
  const aiProduction19=Engine.prototype.aiProduction16;
  Engine.prototype.aiProduction16=function(id){
    aiProduction19.call(this,id);
    const c=this.nation(id),l=c.logistics16,mil=c.stats.mil;if(!l||!mil)return;
    const shift=(key,count)=>{
      count=Math.min(count,Math.floor(mil*.25));if(count<=0||!this.catalog.equipment[key])return;
      // Factories move from the largest other lines.
      let left=count;
      for(const [k] of Object.entries(c.allocation).filter(([k,n])=>k!==key&&n>0&&!this.catalog.equipment[k]?.naval).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))){
        const take=Math.min(left,Math.floor(c.allocation[k]/2));c.allocation[k]-=take;c.allocation[key]=(c.allocation[key]||0)+take;left-=take;if(!left)break;
      }
    };
    const eff=k=>Math.max(.1,c.efficiency[k]||.45),days=150;
    const trains=l.trainNeed-(c.stock.trains||0);
    if(trains>0)shift('trains',Math.ceil(trains*this.catalog.equipment.trains.cost/(5*eff('trains')*days)));
    const trucks=l.truckNeed-(c.stock.trucks||0);
    if(trucks>0)shift('trucks',Math.ceil(trucks*this.catalog.equipment.trucks.cost/(5*eff('trucks')*days)));
  };
  Engine.invariant16(function(state){
    const links=state.railLinks16||[];
    assert(Array.isArray(links)&&links.length<=5000,'Voies ferrées invalides.');
    for(const l of links)assert(Array.isArray(l)&&l.length===2&&this.prov[l[0]]&&this.prov[l[1]]&&this.prov[l[0]].neighbors.includes(l[1]),'Voie ferrée invalide.');
    for(const c of Object.values(state.countries))for(const b of c.build)if(b.kind==='railLine')
      assert(Array.isArray(b.pids)&&b.pids.length>=2&&b.pids.length<=RAIL_ROUTE_MAX&&b.pids.every(pid=>this.prov[pid]),'Chantier ferroviaire invalide.');
  });

  // ---------------------------------------------------------------------------
  // Release identifier, saves and invariants
  // ---------------------------------------------------------------------------
  const createNation15=Engine.prototype.createNation;
  Engine.prototype.createNation=function(d){
    const c=createNation15.call(this,d);
    for(const k of NEW_BONUS)c.bonus[k]??=0;
    c.trade??=DEFAULT_TRADE[d.id]||'export';c.designs??=[];c.lines??={};c.modernize??={};c.eqStats??={};
    // A country created during a day (release, civil war) is complete at once.
    c.spirits16??=[];c.advisors16??={};c.decisions16??={};
    return c;
  };
  const newGame15=Engine.prototype.newGame;
  Engine.prototype.newGame=function(...args){
    Engine.useCatalog16(this.baseCatalog);
    const state=newGame15.apply(this,args);
    if(this.world.states)this.placeIndustry16();
    this.init16(true);this.updateStats();this.computeSupply();this.checkInvariants();return this.s;
  };
  // On the 1.7 map, starting factories and dockyards gather in the cities of
  // the home country, in proportion to their victory points.
  Engine.prototype.placeIndustry16=function(){
    const S=this.s.provinces;
    for(const d of this.world.countries){
      const c=this.nation(d.id);if(!c)continue;
      const lands=this.owned(d.id);if(!lands.length)continue;
      const metro=lands.filter(p=>distance(p,{x:d.lon,y:d.lat})<1600),sites=metro.length?metro:lands;
      for(const kind of ['civ','mil','dock']){
        let total=0;for(const p of lands){total+=S[p.id][kind];S[p.id][kind]=0;}
        const pool=kind==='dock'?(sites.filter(p=>p.port).length?sites.filter(p=>p.port):lands.filter(p=>p.port)):sites;
        if(!pool.length){if(total)S[this.cap(d.id)][kind]+=total;continue;}
        const weight=pool.map(p=>1+p.vp+(p.city?2:0)),given=new Array(pool.length).fill(0);
        for(let i=0;i<total;i++){
          let best=0;for(let k=1;k<pool.length;k++)if(weight[k]/(1+given[k])>weight[best]/(1+given[best]))best=k;
          given[best]++;S[pool[best].id][kind]++;
        }
      }
    }
  };
  // Compact saves: the province table is stored by columns and the list of
  // geographic keys is rebuilt from the map, which the fingerprint identifies.
  Engine.packState16=function(state){
    const out={...state};delete out.geoKeys;
    const rows=state.provinces,keys=[...new Set(rows.flatMap(r=>Object.keys(r)))],cols={};
    for(const k of keys){
      if(rows.every(r=>Object.prototype.hasOwnProperty.call(r,k))){const v=rows.map(r=>r[k]);cols[k]=v.every(x=>x===v[0])?{all:v[0]}:v;}
      else{const sparse={};rows.forEach((r,i)=>{if(Object.prototype.hasOwnProperty.call(r,k))sparse[i]=r[k];});cols[k]={sparse};}
    }
    out.provinces={packed16:rows.length,cols};return out;
  };
  Engine.prototype.unpackState16=function(raw){
    if(!raw||typeof raw!=='object'||!raw.provinces||Array.isArray(raw.provinces)||!Number.isInteger(raw.provinces.packed16))return raw;
    const n=raw.provinces.packed16,cols=raw.provinces.cols||{};
    assert(n===this.prov.length,'Carte incompatible.');
    const rows=Array.from({length:n},()=>({}));
    for(const [k,v] of Object.entries(cols)){
      if(Array.isArray(v)){assert(v.length===n,'Sauvegarde compacte invalide.');for(let i=0;i<n;i++)rows[i][k]=v[i];}
      else if(v&&'all' in v){for(const r of rows)r[k]=v.all;}
      else if(v?.sparse)for(const [i,x] of Object.entries(v.sparse)){const j=Number(i);assert(Number.isInteger(j)&&j>=0&&j<n,'Sauvegarde compacte invalide.');rows[j][k]=x;}
    }
    raw={...raw,provinces:rows};
    if(raw.geoKeys===undefined&&raw.geoOrderFingerprint===this.world.geoOrderFingerprint)raw.geoKeys=this.prov.map(p=>p.geoKey);
    return raw;
  };
  // Saves made before the 1.8 regions: fleets go to the region of their port,
  // wings to the region of their base; per-zone tallies start afresh.
  Engine.prototype.migrateRegions16=function(raw){
    if(!raw||typeof raw!=='object'||!Array.isArray(raw.fleets))return raw;
    const R=Engine.regions16(this.world);
    const stale=(raw.fleets||[]).some(f=>!R.seas.has(f.zone))||(raw.wings||[]).some(w=>!R.zones.has(w.zone)||w.seaZone!=null&&!R.seas.has(w.seaZone));
    if(!stale)return raw;
    raw=clone(raw);
    for(const f of raw.fleets){if(R.seas.has(f.zone))continue;const base=this.prov[f.base];f.zone=base?.seaZone&&R.seas.has(base.seaZone)?base.seaZone:this.seaRegionFor16(f.zone,base||{x:0,y:0});}
    for(const w of raw.wings||[]){const base=this.prov[w.base];if(!R.zones.has(w.zone))w.zone=base?.zone||[...R.zones.keys()][0];if(w.seaZone!=null&&!R.seas.has(w.seaZone))w.seaZone=this.seaRegionFor16(w.seaZone,base||{x:0,y:0});}
    for(const key of ['mines16','seaControl16','airControl16'])if(raw[key])raw[key]=Object.fromEntries(Object.entries(raw[key]).filter(([z])=>R.seas.has(z)||R.zones.has(z)));
    for(const inv of raw.invasions16||[]){const r=this.seaRoute16(this.prov[inv.from]?.seaZone,this.prov[inv.to]?.seaZone);inv.zones=r?r.path:[];}
    return raw;
  };
  const load15=Engine.prototype.load;
  Engine.prototype.load=function(raw){
    Engine.useCatalog16(this.baseCatalog);
    raw=this.migrateRegions16(this.unpackState16(raw));
    if(raw?.release===RELEASE)assert(typeof raw.modManifestHash==='string'&&/^[a-f0-9]{16}$/.test(raw.modManifestHash),'La sauvegarde ne contient pas d\'empreinte de mod valide.');
    else if(raw&&typeof raw==='object'){
      // Older saves predate the 1.6 equipment types checked by the 1.5 loader.
      raw=clone(raw);
      for(const c of Object.values(raw.countries||{}))for(const key in this.baseCatalog.equipment){if(c.stock)c.stock[key]??=0;if(c.allocation)c.allocation[key]??=0;if(c.efficiency)c.efficiency[key]??=.45;}
    }
    const migrating=raw?.release!==RELEASE,state=load15.call(this,raw);
    this.init16(false);if(migrating)this.updateStats();this.checkInvariants();return this.s;
  };
  const check15=Engine.prototype.checkInvariants;
  Engine.prototype.checkInvariants=function(state=this.s){
    const result=check15.call(this,state);
    if(state?.release!==RELEASE)return result;
    assert(state.modManifestHash===hash(JSON.stringify(state.mod)),'Empreinte du manifeste de mod invalide.');
    const states=this.states16.list.length;
    assert(Array.isArray(state.stateExtra)&&state.stateExtra.length===states&&state.stateExtra.every(n=>Number.isInteger(n)&&n>=0&&n<=200),'Emplacements des États invalides.');
    for(const p of state.provinces)for(const k of NEW_PROVINCE_KEYS)assert(finite(p[k],0,100),'Valeur provinciale invalide : '+k);
    const trade=(this.catalog.laws?.trade||[]).map(l=>l.id);
    for(const c of Object.values(state.countries)){
      assert(trade.includes(c.trade),'Loi commerciale invalide.');
      for(const k of NEW_BONUS)assert(finite(c.bonus[k],-.5,5),'Bonus national invalide : '+k);
    }
    for(const [id,c] of Object.entries(state.countries)){
      assert(Array.isArray(c.designs)&&c.designs.length<=40&&c.lines&&c.modernize&&c.eqStats,'Arsenal national invalide.');
      for(const d of c.designs)assert(typeof d.id==='string'&&this.catalog.equipment[d.type]&&MODELS.has(d.base)&&finite(d.cost,.1,10),'Conception invalide.');
      for(const [k,v] of Object.entries(c.lines))assert(this.catalog.equipment[k]&&(MODELS.has(v)||c.designs.some(d=>d.id===v)),'Ligne de production invalide.');
      for(const [k,stats] of Object.entries(c.eqStats)){assert(this.catalog.equipment[k],'Qualit\u00e9 d\u2019\u00e9quipement inconnue.');for(const v of Object.values(stats))assert(finite(v,.05,10),'Qualit\u00e9 d\u2019\u00e9quipement invalide.');}
      for(const t of c.templates)if(t.bat){
        assert(Object.entries(t.bat).every(([k,n])=>BAT.has(k)&&Number.isInteger(n)&&n>0&&n<=25)&&Array.isArray(t.sup)&&t.sup.length<=5&&t.sup.every(k=>SUP.has(k)),'Mod\u00e8le de division invalide : '+id+'.');
      }
    }
    for(const h of invariants)h.call(this,state);
    return result;
  };
}
if(typeof module!=='undefined')module.exports={installSystems16};
