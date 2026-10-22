/* Frontieres 1.6 - grand strategy systems layered on the 1.5 engine, MIT.
 * Installed by createEngineClass(); serialized into the Worker with it.
 * Same rules as the engine: deterministic, no DOM, network, eval or wall clock.
 */
function installSystems16(Engine,H){
  'use strict';
  const {clone,clamp,sum,assert,finite,distance,hash}=H;
  const RELEASE='1.6';

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
  const NEW_BONUS=['buildingSlots','recruitment','ppGain','consumer','organization','airDefense','invasion','paradrop','reliability','attrition','breakthrough','entrench','mines','convoy','naval','casualties','resources'];
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
    const P=world.provinces,groups=new Map();
    for(const p of P){const key=p.owner+'|'+String(p.name).split(' / ')[0];if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p.id);}
    const list=[],of=new Int32Array(P.length).fill(-1);
    const near=(a,b)=>{const dx=(a.x-b.x)*Math.cos((a.y+b.y)*Math.PI/360),dy=a.y-b.y;return dx*dx+dy*dy;};
    const categories=(catalog?.stateCategories||Engine.STATE_CATEGORIES16||[]).slice().sort((a,b)=>a.score-b.score);
    for(const [key,ids] of groups){
      const owner=key.slice(0,key.indexOf('|')),prefix=key.slice(key.indexOf('|')+1),inGroup=new Set(ids),seen=new Set(),components=[];
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
  Engine.prototype.isCore=function(id,pid){
    const c=this.nation(id);if(!c)return false;
    if(Array.isArray(c.identity.cores))return c.identity.cores.includes(pid);
    return this.prov[pid].owner===id;
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
  Engine.seaWeatherKey=function(zone,day,month=monthOf(day)){
    const index=[...String(zone)].reduce((n,ch)=>n*31+ch.charCodeAt(0),7),r=unit01(index*977+Math.floor(day/2)*7151);
    const season=(STORMY[zone]||[]).includes(month);
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
    const key=Engine.seaWeatherKey(zone,this.s.day);
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
    for(const st of s.provinces)for(const k of NEW_PROVINCE_KEYS)st[k]??=0;
    for(const [id,c] of Object.entries(s.countries)){
      c.trade??=DEFAULT_TRADE[id]||'export';
      for(const k of NEW_BONUS)c.bonus[k]??=0;
      for(const k of RESOURCES)if(c.stats)c.stats[k]??=0;
      c.designs??=[];c.lines??={};c.modernize??={};c.eqStats??={};
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
    const held={},totals={},coreHeld={},nonCore={};
    for(const p of this.prov){
      const q=this.s.provinces[p.id],c=this.nation(q.ctrl);if(!c)continue;
      const occupation=q.ctrl===p.owner?1:.3+q.compliance/200;
      const output=occupation*(1-q.damage)*Math.max(.3,1-q.resistance/150);
      for(const k of ['civ','mil','dock'])c.stats[k]+=q[k]*output;
      for(const k of RESOURCES)if(p[k])c.stats[k]+=p[k]*occupation*(1+(c.bonus.resources||0));
      if(q.refinery){c.stats.oil+=q.refinery*2*output;c.stats.rubber+=q.refinery*output;}
      totals[p.owner]=(totals[p.owner]||0)+p.vp;
      if(this.allies(p.owner,q.ctrl)||(!this.war(p.owner,q.ctrl)&&q.ctrl===p.owner))held[p.owner]=(held[p.owner]||0)+p.vp;
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
    const recruit=Math.min(c.pool,30*(L.conscription.recruit??1)*(c.stats.manpowerFactor??1)*(1+(c.bonus.recruitment||0)));
    c.pool-=recruit;c.manpower+=recruit;
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
      if(this.s.provinces[b.pid].ctrl!==id){c.build=c.build.filter(x=>x.id!==b.id);continue;}
      b.progress+=capacity/projects.length;
      if(b.progress>=b.cost){this.s.provinces[b.pid][b.kind]++;c.build=c.build.filter(x=>x.id!==b.id);if(id===this.s.player)this.log(this.catalog.buildings[b.kind].name+' achevé(e) : '+this.prov[b.pid].name+'.','success');}
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

  // ---------------------------------------------------------------------------
  // Commands
  // ---------------------------------------------------------------------------
  const NOT_HANDLED=Symbol('not handled');
  const handlers=new Map();
  Engine.command16=(name,fn)=>handlers.set(name,fn);
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
    unitCache.set(u.template,{day:this.s.day,owner:u.owner,state:this.s,stats});
    return stats;
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
  // Release identifier, saves and invariants
  // ---------------------------------------------------------------------------
  const createNation15=Engine.prototype.createNation;
  Engine.prototype.createNation=function(d){
    const c=createNation15.call(this,d);
    for(const k of NEW_BONUS)c.bonus[k]??=0;
    c.trade??=DEFAULT_TRADE[d.id]||'export';c.designs??=[];c.lines??={};c.modernize??={};c.eqStats??={};
    return c;
  };
  const newGame15=Engine.prototype.newGame;
  Engine.prototype.newGame=function(...args){
    Engine.useCatalog16(this.baseCatalog);
    const state=newGame15.apply(this,args);
    this.init16(true);this.updateStats();this.computeSupply();this.checkInvariants();return this.s;
  };
  const load15=Engine.prototype.load;
  Engine.prototype.load=function(raw){
    Engine.useCatalog16(this.baseCatalog);
    if(raw?.release===RELEASE)assert(typeof raw.modManifestHash==='string'&&/^[a-f0-9]{16}$/.test(raw.modManifestHash),'La sauvegarde 1.6 ne contient pas d\'empreinte de mod valide.');
    else if(raw&&typeof raw==='object'){
      // Older saves predate the 1.6 equipment types checked by the 1.5 loader.
      raw=clone(raw);
      for(const c of Object.values(raw.countries||{}))for(const key in this.baseCatalog.equipment){if(c.stock)c.stock[key]??=0;if(c.allocation)c.allocation[key]??=0;if(c.efficiency)c.efficiency[key]??=.45;}
    }
    const state=load15.call(this,raw);
    this.init16(false);this.updateStats();this.checkInvariants();return this.s;
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
    for(const h of this.invariants16||[])h.call(this,state);
    return result;
  };
  Engine.invariant16=fn=>{(Engine.prototype.invariants16??=[]).push(fn);};
  Engine.prototype.invariants16=[];
}
if(typeof module!=='undefined')module.exports={installSystems16};
