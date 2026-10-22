/* Frontieres - original deterministic strategy engine (1.5 rules), MIT.
 * Version 1.6 adds its systems in systems.js, installed at the end of this function.
 * Daily simulation. No DOM, network, eval, wall-clock RNG or external dependencies.
 * This function is serialized into a dedicated Worker by the standalone build.
 */
function createEngineClass() {
  'use strict';
  const clone = v => JSON.parse(JSON.stringify(v));
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  const sum = arr => arr.reduce((a,b)=>a+b,0);
  const assert = (test,message) => { if(!test) throw new Error(message); };
  const finite = (v,min=0,max=1e12) => typeof v==='number' && Number.isFinite(v) && v>=min && v<=max;
  const distance = (a,b) => {
    const rad=Math.PI/180,dy=(b.y-a.y)*rad,dx=(b.x-a.x)*rad;
    return 6371*2*Math.asin(Math.min(1,Math.sqrt(Math.sin(dy/2)**2+Math.cos(a.y*rad)*Math.cos(b.y*rad)*Math.sin(dx/2)**2)));
  };
  let templateStats=t=>({
    men:t.inf*1000+t.motor*1000+t.art*500+t.tank*650,
    soft:t.inf*12+t.motor*14+t.art*32+t.tank*24+(t.recon?3:0),
    hard:t.inf*2+t.motor*3+t.art*8+t.tank*25+(t.antiTank?16:0),
    defense:t.inf*24+t.motor*22+t.art*7+t.tank*16+(t.antiTank?5:0),
    breakthrough:t.inf*5+t.motor*9+t.art*4+t.tank*30+(t.recon?8:0),
    armor:t.tank?12+t.tank*7:0,piercing:5+t.art*8+t.tank*10+(t.antiTank?30:0),
    hardness:t.tank/Math.max(1,t.inf+t.motor+t.art+t.tank)*.8,
    width:2*(t.inf+t.motor+t.tank)+3*t.art,
    speed:(t.inf?1:t.tank?1.65:1.9)*(t.recon?1.12:1),
    eq:{rifles:t.inf*100+t.motor*100,artillery:t.art*30+(t.antiTank?18:0),tanks:t.tank*45,trucks:t.motor*65+(t.logistics?30:0)+(t.recon?20:0),supportEq:(t.engineer?80:0)+(t.logistics?70:0)+(t.recon?65:0)+(t.antiTank?80:0)+(t.hospital?80:0)}
  });
  class Engine {
    constructor(world,catalog) {
      this.world=world;this.catalog=clone(catalog);this.baseCatalog=clone(catalog);
      this.prov=world.provinces;this.defs=Object.fromEntries(world.countries.map(c=>[c.id,c]));
      this.s=null;this.unitsAt=new Map();this.frontCache={};this.timing={};
    }
    random() {this.s.seed=(Math.imul(this.s.seed,1664525)+1013904223)>>>0;return this.s.seed/4294967296;}
    nation(id=this.s.player) {return this.s.countries[id];}
    info(id) {return this.s?.countries[id]?.identity||this.defs[id];}
    active() {return Object.keys(this.s.countries).filter(id=>this.nation(id).alive);}
    units(id) {return this.s.units.filter(u=>u.owner===id);}
    owned(id) {return this.prov.filter(p=>this.s.provinces[p.id].ctrl===id);}
    war(a,b) {return this.s.wars.some(w=>(w.a===a&&w.b===b)||(w.a===b&&w.b===a));}
    allies(a,b) {return a===b||!!(this.nation(a)&&this.nation(b)&&this.nation(a).faction!=='none'&&this.nation(a).faction===this.nation(b).faction);}
    enemies(id) {return this.active().filter(o=>this.war(id,o));}
    access(a,b) {return this.allies(a,b)||this.nation(a)?.access.includes(b);}
    edge(from,to) {return this.prov[from].neighbors.includes(to)?{to,days:1,sea:false}:this.prov[from].sea.find(e=>e.to===to)?{...this.prov[from].sea.find(e=>e.to===to),sea:true}:null;}
    log(text,type='info') {this.s.log.unshift({day:this.s.day,text,type});if(this.s.log.length>220)this.s.log.length=220;}
    indexUnits() {this.unitsAt=new Map();for(const u of this.s.units){if(!this.unitsAt.has(u.pid))this.unitsAt.set(u.pid,[]);this.unitsAt.get(u.pid).push(u);}}
    cap(id) {const c=this.nation(id);if(this.s.provinces[c.identity.capital]?.ctrl===id)return c.identity.capital;return this.owned(id).sort((a,b)=>b.vp-a.vp)[0]?.id??c.identity.capital;}
    tech(id) {return this.catalog.techs.find(t=>t.id===id);}
    tree(id) {return this.catalog.focus[id]||this.catalog.focus.generic;}
    focus(id,key) {return this.tree(id).find(f=>f.id===key);}
    weather(pid) {
      const p=this.prov[pid],month=new Date(Date.UTC(1936,0,1+this.s.day)).getUTCMonth();
      const cold=p.y>42&&(month===11||month<2)||p.y<-35&&month>4&&month<8;
      if(cold&&p.terrain!=='desert')return {name:'Hiver',attack:.78,move:.72,air:.70};
      const rain=((Math.floor(this.s.day/4)*31+pid*17)%13)<2;
      return rain?{name:'Pluie',attack:.92,move:.85,air:.65}:{name:'Clair',attack:1,move:1,air:1};
    }
    createNation(d) {
      const c={identity:clone(d),alive:true,subject:d.id==='MAN'?'JPN':d.id==='PHI'?'USA':null,
        faction:d.faction,pp:120,stability:d.id==='FRA'?53:65,support:d.id==='USA'?25:45,
        manpower:d.manpower,pool:d.manpower*3,casualties:0,xp:30,armySerial:1,unitSerial:1,
        economy:'civilian',conscription:1,occupation:'civil',ideology:d.ideology,
        parties:{democratic:15,communist:8,fascist:8,authoritarian:15},
        stock:{rifles:10000+d.mil*200,supportEq:2500,artillery:1600,trucks:1800,tanks:500,fighters:Math.round(d.air*.35),bombers:Math.round(d.air*.14),destroyers:Math.round(d.fleet*.15),submarines:Math.round(d.fleet*.08),convoys:80+d.fleet*2,fuel:14000},
        allocation:{},efficiency:{},tech:[],research:[],slots:d.mil>17?3:2,focus:null,focusDone:[],build:[],training:[],templates:clone(this.catalog.templates),
        bonus:{attack:0,defense:0,production:0,construction:0,research:0,supply:0,planning:0,speed:0,armor:0,piercing:0,air:0,bombing:0,navy:0,raiding:0,intel:0},
        relations:{},access:[],guarantees:[],pacts:[],trades:[],justifications:[],spies:[],intel:{},lendLease:[],policyCooldown:{},
        stats:{civ:0,mil:0,dock:0,freeCiv:0,steel:0,oil:0,rubber:0,resourceFactor:1,divisionCount:0,supply:1,vpHeld:1},
        lostShips:0,lostPlanes:0,history:[],achievements:[]};
      c.parties[d.ideology]=69;
      const total=sum(Object.values(c.parties));for(const k in c.parties)c.parties[k]/=total/100;
      for(const k in this.catalog.equipment){c.stock[k]??=0;c.allocation[k]=0;c.efficiency[k]=.45;}c.warFatigue=0;c.lastLosses=0;c.advisor=null;c.politicalCooldown=0;
      this.ensureGovernance(d.id,c);
      return c;
    }
    // --- 1.3: macroeconomics and domestic institutions ---
    // All 'credits', GDP indices, party shares and employment are game abstractions;
    // they are not claims about historical 1936 national accounts or vote returns.
    ensureGovernance(id,c){
      const civ=Math.max(5,c.identity?.civ||c.stats?.civ||8),mil=Math.max(0,c.identity?.mil||c.stats?.mil||0);
      c.macro??={treasury:Math.round(420+civ*22),debt:0,priceIndex:100,inflation:2,gdp:Math.round(civ*14+mil*13),
        output:1,employment:72,tax:'standard',welfare:'standard',ration:'none',system:'mixed',
        budget:{income:0,spending:0,interest:0,balance:0},history:[],strikeUntil:0,cooldown:{},arrears:0};
      c.politics??={legitimacy:clamp(35+c.stability*.55,0,100),unrest:Math.max(5,30-c.stability*.2),
        rights:'regulated',coalition:[c.ideology],election:{nextDay:this.s.day+1460,lastDay:null,result:null},
        history:[],lastStrike:-365,cooldown:{}};
      if(c.politics.election.nextDay<this.s.day+60&&c.politics.election.lastDay===null)
        c.politics.election.nextDay=this.s.day+365;
      c.macro.cooldown??={};c.macro.history??=[];c.macro.arrears??=0;c.politics.cooldown??={};c.politics.history??=[];
    }
    governanceDaily(id){
      const c=this.nation(id);this.ensureGovernance(id,c);
      const m=c.macro,pol=c.politics;
      const tax={low:.72,standard:1,high:1.32}[m.tax];
      const welfare={austerity:.10,standard:.27,expanded:.56}[m.welfare];
      const ration={none:0,limited:.07,severe:.16}[m.ration];
      const civ=c.stats.civ,mil=c.stats.mil,dock=c.stats.dock;
      m.gdp=Math.max(25,Math.round(civ*14+mil*13+dock*9));
      m.employment=clamp(55+Math.sqrt(civ+mil)*3.0-(this.enemies(id).length?5:0)-pol.unrest*.12,30,98);
      m.output=clamp(1+(m.system==='planned'?.065:m.system==='market'?.04:.03)+
        (m.tax==='low'?.07:m.tax==='high'?-.055:0)+
        (m.welfare==='expanded'?.025:m.welfare==='austerity'?-.04:0)+
        ration*.35+((pol.legitimacy-55)*.001)-(pol.unrest*.0035)-
        Math.max(0,m.debt/m.gdp-1.4)*.045-Math.max(0,m.inflation-7)*.006-
        Math.min(.30,m.arrears/Math.max(25,m.gdp)*.04)-
        (m.strikeUntil>this.s.day?.22:0),.35,1.35);
      const income=(civ*.87+mil*.15+dock*.1)*tax*(.70+m.output*.30);
      const expenses=(civ*welfare+mil*.41+dock*.19+c.stats.divisionCount*.043+4)*
        (1+(m.priceIndex-100)/700)*(m.system==='planned'?1.08:1);
      const interest=m.debt*.00016;
      const balance=income-expenses-interest;
      m.budget={income:+income.toFixed(2),spending:+expenses.toFixed(2),interest:+interest.toFixed(2),balance:+balance.toFixed(2)};
      // Credit ceiling: a deficit may be financed only while the issuer remains
      // below twelve times its *game* GDP index. Any unmet spending becomes
      // arrears, which cause real social and industrial penalties. Cash surpluses
      // automatically clear arrears BEFORE accumulating in the Treasury.
      const wasInArrears=m.arrears>0;
      m.treasury+=balance;
      if(m.treasury<0){
        const shortfall=-m.treasury,room=Math.max(0,m.gdp*12-m.debt);
        const financed=Math.min(shortfall,room/1.035);
        m.debt+=financed*1.035;
        m.arrears+=shortfall-financed;
        m.treasury=0;
      } else if(m.arrears>0){
        const settled=Math.min(m.arrears,m.treasury);
        m.arrears-=settled;m.treasury-=settled;
      }
      m.treasury=clamp(m.treasury,0,1e11);m.debt=clamp(m.debt,0,1e11);
      m.arrears=clamp(m.arrears,0,1e11);
      if(id===this.s.player&&m.arrears>0&&!wasInArrears)
        this.log('Crise du financement public : plafond de crédit atteint, dépenses en arriérés.','event');
      if(id===this.s.player&&m.arrears<.0001&&wasInArrears)
        this.log('Le Trésor a résorbé les arriérés de dépenses.','success');
      const deficitPressure=Math.max(0,-balance)/Math.max(20,m.gdp);
      m.inflation=clamp(m.inflation+(deficitPressure*.055)+Math.max(0,m.debt/m.gdp-2)*.0015-
        (m.inflation-2)*.001+(m.ration==='severe'?.003:0),0,35);
      m.priceIndex=clamp(m.priceIndex*(1+m.inflation/36500),75,1e6);
      if(this.s.day%30===0)this.governanceMonth(id);
    }
    governanceMonth(id){
      const c=this.nation(id),m=c.macro,p=c.politics;
      const taxes={low:-1,standard:0,high:1.7}[m.tax];
      const care={austerity:2.3,standard:0,expanded:-2.4}[m.welfare];
      const ration={none:0,limited:1.5,severe:3.9}[m.ration];
      p.unrest=clamp(p.unrest+taxes+care+ration+(m.inflation>6?(m.inflation-6)*.3:0)+
        (c.warFatigue||0)*.015+Math.min(3,m.arrears/Math.max(25,m.gdp)*.65)-(p.legitimacy-50)*.023-
        (p.rights==='protected'?.9:p.rights==='restricted'?-.1:.4),0,100);
      p.legitimacy=clamp(p.legitimacy+(c.stability-50)*.022-(p.unrest-30)*.028+
        (m.welfare==='expanded'?.8:m.welfare==='austerity'?-1:0)-
        (m.debt>m.gdp*3?1.2:0)-Math.min(2,m.arrears/Math.max(25,m.gdp)*.35),0,100);
      if(p.unrest>47)c.stability=clamp(c.stability-(p.unrest-45)*.028,0,100);
      else if(p.unrest<22&&p.legitimacy>65)c.stability=clamp(c.stability+.3,0,100);
      if(p.unrest>70&&this.s.day-p.lastStrike>120){
        p.lastStrike=this.s.day;m.strikeUntil=this.s.day+22;
        if(id===this.s.player)this.log('Grève générale : production nationale ralentie pendant 22 jours.','event');
      }
      // Simulated opinion shifts: do not rename or falsify a historical cabinet.
      const rival=Object.keys(c.parties).filter(k=>k!==c.ideology)
        .sort((a,b)=>c.parties[b]-c.parties[a])[0];
      if(rival&&p.unrest>38){
        const shift=Math.min(.95,(p.unrest-38)*.018,c.parties[c.ideology]);
        c.parties[c.ideology]-=shift;c.parties[rival]+=shift;
      }
      if(c.ideology==='democratic'&&this.s.day>=p.election.nextDay)this.holdElection(id);
      m.history.push({day:this.s.day,treasury:+m.treasury.toFixed(1),debt:+m.debt.toFixed(1),
        gdp:m.gdp,inflation:+m.inflation.toFixed(2),output:+m.output.toFixed(3),balance:m.budget.balance});
      if(m.history.length>80)m.history.shift();
      p.history.push({day:this.s.day,legitimacy:+p.legitimacy.toFixed(1),unrest:+p.unrest.toFixed(1),
        stability:+c.stability.toFixed(1),support:Math.round(c.parties[c.ideology])});
      if(p.history.length>80)p.history.shift();
    }
    holdElection(id){
      const c=this.nation(id),p=c.politics;
      assert(c.ideology==='democratic','Seuls les régimes démocratiques organisent ce scrutin régulier.');
      const votes=Object.fromEntries(Object.entries(c.parties).map(([k,v])=>[k,+v.toFixed(2)]));
      const leader=Object.keys(votes).sort((a,b)=>votes[b]-votes[a])[0];
      const partners=Object.keys(votes).filter(k=>k!==leader).sort((a,b)=>votes[b]-votes[a]);
      const coalition=[leader];let share=votes[leader];
      for(const candidate of partners)if(share<50.01){coalition.push(candidate);share+=votes[candidate];}
      p.coalition=coalition;p.legitimacy=clamp(p.legitimacy+(share>=50?5:-8)-(p.unrest*.03),0,100);
      p.election={lastDay:this.s.day,nextDay:this.s.day+1460,result:{day:this.s.day,votes,coalition,majority:+share.toFixed(2)}};
      if(id===this.s.player)this.log('Scrutin national simulé : coalition '+coalition.join(' + ')+' ('+Math.round(share)+' %).','event');
    }
    policyAction(action,p,id){
      const c=this.nation(id),m=c.macro,pol=c.politics;
      const pp=n=>assert(c.pp>=n,'Il faut '+n+' points politiques.');
      const cooldown=(key,days=45)=>{
        assert((m.cooldown[key]||0)<=this.s.day,'Mesure récemment modifiée : période de transition.');
        m.cooldown[key]=this.s.day+days;
      };
      if(action==='macroPolicy'){
        const kinds={tax:['low','standard','high'],welfare:['austerity','standard','expanded'],
          ration:['none','limited','severe'],system:['market','mixed','planned']};
        assert(kinds[p.kind]?.includes(p.value),'Mesure économique invalide.');
        assert(m[p.kind]!==p.value,'Cette politique est déjà active.');
        if(p.kind==='ration'&&p.value==='severe')assert(this.enemies(id).length>0||c.support>=65,'Le rationnement sévère exige une guerre ou 65 % de soutien.');
        pp(p.kind==='system'?65:30);cooldown(p.kind,p.kind==='system'?120:45);
        c.pp-=p.kind==='system'?65:30;m[p.kind]=p.value;
        pol.unrest=clamp(pol.unrest+(p.kind==='tax'&&p.value==='high'?3:0),0,100);
        this.updateStats();return true;
      }
      if(action==='treasury'){
        assert(['bond','repay','investCiv','investRail','relief'].includes(p.kind),'Mesure budgétaire inconnue.');
        if(p.kind==='bond'){
          assert(m.debt+330<=m.gdp*12,'Plafond de financement atteint : impossible de placer 330 crédits de dette supplémentaire.');
          pp(15);c.pp-=15;m.treasury+=300;m.debt+=330;
          if(m.arrears>0){const settled=Math.min(m.arrears,m.treasury);m.arrears-=settled;m.treasury-=settled;}
          pol.legitimacy=clamp(pol.legitimacy-1.5,0,100);
        } else if(p.kind==='repay'){
          assert(m.debt>=1&&m.treasury>=1,'Il faut de la trésorerie et une dette à rembourser.');
          const amount=Math.min(m.debt,m.treasury,125);m.debt-=amount;m.treasury-=amount;
        } else if(p.kind==='investCiv'){
          assert(m.treasury>=360,'Trésorerie insuffisante : 360 crédits.');
          pp(20);const cap=this.cap(id);assert(this.s.provinces[cap]?.ctrl===id,'Capitale perdue.');
          m.treasury-=360;c.pp-=20;this.s.provinces[cap].civ++;this.updateStats();
        } else if(p.kind==='investRail'){
          assert(m.treasury>=180,'Trésorerie insuffisante : 180 crédits.');
          const cap=this.cap(id);assert(this.s.provinces[cap]?.ctrl===id,'Capitale perdue.');
          assert(this.s.provinces[cap].rail<6,'Réseau ferroviaire au niveau maximal.');
          m.treasury-=180;this.s.provinces[cap].rail++;this.computeSupply();
        } else if(p.kind==='relief'){
          assert(m.treasury>=140,'Trésorerie insuffisante : 140 crédits.');
          cooldown('relief',60);m.treasury-=140;pol.unrest=clamp(pol.unrest-9,0,100);
          pol.legitimacy=clamp(pol.legitimacy+3,0,100);c.stability=clamp(c.stability+2,0,100);
        }
        return true;
      }
      if(action==='civicReform'){
        assert(['restricted','regulated','protected'].includes(p.value),'Réforme institutionnelle invalide.');
        assert(pol.rights!==p.value,'Mesure déjà en vigueur.');pp(55);
        assert((pol.cooldown.rights||0)<=this.s.day,'Une réforme a déjà eu lieu récemment.');
        c.pp-=55;pol.cooldown.rights=this.s.day+120;pol.rights=p.value;
        pol.unrest=clamp(pol.unrest+(p.value==='restricted'?12:p.value==='protected'?-8:-2),0,100);
        pol.legitimacy=clamp(pol.legitimacy+(p.value==='protected'?7:p.value==='restricted'?-7:1),0,100);
        c.stability=clamp(c.stability+(p.value==='restricted'?-3:2),0,100);return true;
      }
      if(action==='coalitionTalk'){
        assert(c.ideology==='democratic','Les coalitions parlementaires exigent un régime démocratique.');
        assert((pol.cooldown.coalition||0)<=this.s.day,'Négociations parlementaires encore en cours.');
        pp(45);c.pp-=45;pol.cooldown.coalition=this.s.day+180;
        const parties=Object.keys(c.parties).sort((a,b)=>c.parties[b]-c.parties[a]);
        const partners=[c.ideology];let seats=c.parties[c.ideology];
        for(const party of parties)if(seats<50&&!partners.includes(party)){partners.push(party);seats+=c.parties[party];}
        pol.coalition=partners;pol.legitimacy=clamp(pol.legitimacy+Math.min(10,seats/10),0,100);
        pol.unrest=clamp(pol.unrest-3,0,100);return true;
      }
      if(action==='earlyElection'){
        assert(c.ideology==='democratic','Élection anticipée réservée à un régime démocratique.');
        assert(pol.election.lastDay===null||this.s.day-pol.election.lastDay>=365,'Un scrutin a déjà eu lieu cette année.');
        pp(80);c.pp-=80;this.holdElection(id);return true;
      }
      return false;
    }
    newGame(player='FRA',options={},mod=null) {
      assert(this.defs[player],'Pays inconnu.');assert(!(options.scenario==='1939'&&['AUS','CZE','ETH','ALB'].includes(player)),'Ce pays exige le point de depart 1936.');this.catalog=clone(this.baseCatalog);
      const validated=Engine.validateMod(mod,this.vanillaWorld||this.world,this.catalog);this.applyModCatalog(validated);
      this.s={version:5,mapId:this.world.mapId,seed:Number.isInteger(options.seed)?options.seed>>>0:19360101,
        player,day:0,paused:true,speed:2,uid:1,historical:options.historical!==false,difficulty:options.difficulty||'standard',
        mod:validated,tension:8,countries:{},provinces:[],units:[],armies:[],wings:[],fleets:[],wars:[],battles:[],navalReports:[],airReports:[],
        pending:null,eventQueue:[],seenEvents:[],log:[],outcome:null,fronts:{},revision:0,combatLedger:[],pocketSummary:{},
        geoKeys:this.prov.map(p=>p.geoKey),geoOrderFingerprint:this.world.geoOrderFingerprint};
      this.s.provinces=this.prov.map(p=>({ctrl:p.owner,civ:0,mil:0,dock:0,infra:2,rail:1,hub:p.capital?2:0,fort:0,port:p.port,airbase:p.airbase,radar:0,damage:0,supply:0,resistance:0,compliance:p.owner==='FRA'||p.owner==='GBR'?70:90}));
      for(const d of this.world.countries)this.s.countries[d.id]=this.createNation(d);
      for(const d of this.world.countries) {
        const id=d.id,c=this.nation(id),lands=this.owned(id),metro=lands.filter(p=>distance(p,{x:d.lon,y:d.lat})<1600),sites=metro.length?metro:lands;
        for(let i=0;i<d.civ;i++)this.s.provinces[sites[i%sites.length].id].civ++;
        for(let i=0;i<d.mil;i++)this.s.provinces[sites[(i*7)%sites.length].id].mil++;
        const ports=sites.filter(p=>p.port);const homePorts=ports.length?ports:lands.filter(p=>p.port);
        if(homePorts.length)for(let i=0;i<Math.max(1,Math.round(d.fleet/9));i++)this.s.provinces[homePorts[i%homePorts.length].id].dock++;
        const capital=this.s.provinces[d.capital];capital.infra=4;capital.rail=3;
        const frontier=sites.filter(p=>p.neighbors.some(n=>this.prov[n].owner!==id));const positions=frontier.length?frontier:sites;
        const armies=[];
        for(let i=0;i<Math.max(1,Math.ceil(d.divisions/12));i++)armies.push(this.addArmy(id));
        for(let i=0;i<d.divisions;i++) {
          const tmpl=c.templates[(i%10===0&&d.mil>=15)?2:0];
          const unit=this.spawn(id,positions[(i*7)%positions.length].id,tmpl,80);
          unit.army=armies[Math.floor(i/12)].id;
        }
        if(d.air>0){
          const base=d.capital,z=this.prov[base].zone;
          this.s.wings.push({id:this.s.uid++,owner:id,name:'Groupe de chasse',kind:'fighters',size:Math.max(1,Math.round(d.air*.6)),base,zone:z,mission:'reserve',xp:0});
          this.s.wings.push({id:this.s.uid++,owner:id,name:'Groupe de bombardement',kind:'bombers',size:Math.max(1,Math.round(d.air*.25)),base,zone:z,mission:'reserve',xp:0});
        }
        if(d.fleet&&homePorts.length){
          const base=homePorts[0].id;
          this.s.fleets.push({id:this.s.uid++,owner:id,name:'Flotte principale',base,zone:this.prov[base].seaZone,mission:'port',eta:0,ships:{destroyers:Math.max(1,Math.round(d.fleet*.65)),submarines:Math.round(d.fleet*.22)},strength:1});
        }
      }
      // Initial dispositions (balance values, not an order of battle).
      for(const p of this.prov)if(p.owner==='FRA'&&p.x>5&&p.y>47&&p.neighbors.some(n=>this.prov[n].owner==='GER'))this.s.provinces[p.id].fort=3;
      if(validated.countries)for(const [id,patch] of Object.entries(validated.countries)){
        const c=this.nation(id);if(patch.name)c.identity.name=patch.name;if(patch.leader){c.identity.leader=patch.leader;c.identity.wiki=patch.leader;}
        if(patch.color)c.identity.color=patch.color;if(patch.ideology)c.ideology=patch.ideology;
        if(patch.bonus)this.effect(id,patch.bonus);
      }
      this.updateStats();for(const id of this.active())this.defaultProduction(id);
      if(this.s.historical){this.declareWar('ITA','ETH',true,false);this.deployColonialWar('ITA','ETH');}
      this.initializeHistory(options);this.initializeRelease(options);this.indexUnits();this.computeSupply();this.checkInvariants();
      this.log('Une campagne commence. Les statistiques industrielles et militaires sont des valeurs de jeu.');
      this.log('Choisissez des recherches et une priorit\u00e9. Les ordres sont donn\u00e9s depuis la carte ou les panneaux.','tip');
      return this.s;
    }
    deployColonialWar(attacker,target) {
      const targets=this.owned(attacker).filter(p=>p.neighbors.some(n=>this.s.provinces[n].ctrl===target));
      if(!targets.length)return;
      const army=this.s.armies.find(a=>a.owner===attacker);
      for(const [i,u] of this.units(attacker).slice(0,10).entries()){u.pid=targets[i%targets.length].id;if(army)u.army=army.id;}
      if(army){army.target=target;army.order='attack';army.auto=true;}
    }
    addArmy(id,name) {
      const c=this.nation(id),available=c.identity.commanders.filter(g=>!this.s.armies.some(a=>a.owner===id&&a.general===g.id));
      const army={id:this.s.uid++,owner:id,name:name||('Arm\u00e9e '+c.armySerial++),general:available[0]?.id||null,target:null,order:'defend',auto:id!==this.s.player,planning:0,stance:'balanced',group:null,objective:null,frontSelection:[],reserveRatio:.15,tactic:'balanced',assessment:{status:'En attente'}};
      this.s.armies.push(army);return army;
    }
    spawn(id,pid,t,org=65) {
      const u={id:this.s.uid++,owner:id,pid,template:clone(t),name:this.nation(id).unitSerial+++'e '+(t.tank?'division blind\u00e9e':'division'),strength:1,org,supply:1,path:[],progress:0,army:null,entrench:0,xp:0,retreatUntil:0,kills:0,pocketed:false};this.s.units.push(u);return u;
    }
    general(army) {return army?this.nation(army.owner).identity.commanders.find(g=>g.id===army.general)||null:null;}
    defaultProduction(id) {
      const c=this.nation(id),land={rifles:.36,supportEq:.11,artillery:.17,trucks:.10,tanks:.12,fighters:.10,bombers:.04};
      for(const key in c.allocation)c.allocation[key]=0;
      for(const [key,w] of Object.entries(land))c.allocation[key]=Math.floor(c.stats.mil*w);
      c.allocation.rifles+=c.stats.mil-sum(Object.keys(land).map(k=>c.allocation[k]));
      c.allocation.convoys=Math.floor(c.stats.dock*.25);c.allocation.submarines=Math.floor(c.stats.dock*.25);c.allocation.destroyers=c.stats.dock-c.allocation.convoys-c.allocation.submarines;
    }
    updateStats() {
      for(const c of Object.values(this.s.countries))c.stats={civ:0,mil:0,dock:0,freeCiv:0,steel:8,oil:1,rubber:1,resourceFactor:1,divisionCount:0,supply:c.stats?.supply??1,vpHeld:1};
      const held={},totals={};
      for(const p of this.prov){
        const q=this.s.provinces[p.id],c=this.nation(q.ctrl);if(!c)continue;
        const occupation=q.ctrl===p.owner?1:.3+q.compliance/200;
        const output=occupation*(1-q.damage)*Math.max(.3,1-q.resistance/150);
        for(const k of ['civ','mil','dock'])c.stats[k]+=q[k]*output;
        for(const k of ['steel','oil','rubber'])c.stats[k]+=p[k]*occupation;
        totals[p.owner]=(totals[p.owner]||0)+p.vp;
        if(this.allies(p.owner,q.ctrl)||(!this.war(p.owner,q.ctrl)&&q.ctrl===p.owner))held[p.owner]=(held[p.owner]||0)+p.vp;
      }
      const exportUsed={};
      for(const id of this.active()){
        const c=this.nation(id);
        for(const k of ['civ','mil','dock'])c.stats[k]=Math.max(0,Math.floor(c.stats[k]+.0001));
        let consumer={civilian:.4,partial:.28,war:.17}[c.economy];
        if(c.macro){consumer+=c.macro.welfare==='expanded'?.035:c.macro.welfare==='austerity'?-.018:0;
          consumer+=c.macro.tax==='high'?.022:0;
          consumer-=c.macro.ration==='severe'?.12:c.macro.ration==='limited'?.06:0;}
        c.stats.freeCiv=Math.max(0,Math.floor(c.stats.civ*(1-clamp(consumer,.05,.8))));
        c.stats.vpHeld=(held[id]||0)/(totals[id]||1);
        for(const tr of c.trades){
          tr.active=false;const seller=this.nation(tr.from);if(!seller?.alive||this.war(id,tr.from)||c.stats.freeCiv<1)continue;
          const key=tr.from+'_'+tr.resource,used=exportUsed[key]||0;
          const available=Math.max(0,seller.stats[tr.resource]*.5-used);
          if(available<4)continue;
          exportUsed[key]=used+4;c.stats[tr.resource]+=4;c.stats.freeCiv--;tr.active=true;
        }
        const normalize=(naval,max)=>{
          let used=sum(Object.keys(this.catalog.equipment).filter(k=>!!this.catalog.equipment[k].naval===naval).map(k=>c.allocation[k]));
          while(used>max){const ks=Object.keys(c.allocation).filter(k=>!!this.catalog.equipment[k].naval===naval).sort((a,b)=>c.allocation[b]-c.allocation[a]);if(!ks.length||!c.allocation[ks[0]])break;c.allocation[ks[0]]--;used--;}
        };normalize(false,c.stats.mil);normalize(true,c.stats.dock);
      }
      for(const [key,value] of Object.entries(exportUsed)){const cut=key.lastIndexOf('_'),id=key.slice(0,cut),k=key.slice(cut+1);this.nation(id).stats[k]=Math.max(0,this.nation(id).stats[k]-value);}
      for(const u of this.s.units)this.nation(u.owner).stats.divisionCount++;
    }
    navalPower(id,zone,mission=null) {
      const c=this.nation(id);if(!c||c.stock.fuel<1)return 0;
      return sum(this.s.fleets.filter(f=>f.owner===id&&f.zone===zone&&f.eta<=0&&f.mission!=='port'&&(!mission||f.mission===mission)).map(f=>this.fleetRating(f)))*(1+c.bonus.navy);
    }
    seaAllowed(id,edge,target) {
      const c=this.nation(id);if(c.stock.convoys<10||c.stock.fuel<10)return false;
      if(!this.access(id,target)&&!this.war(id,target))return false;
      if(this.war(id,target)) {
        for(const z of edge.zones){
          const friendly=sum(this.active().filter(o=>this.allies(id,o)).map(o=>this.navalPower(o,z)));
          const enemy=sum(this.enemies(id).map(o=>this.navalPower(o,z)));
          if(friendly<Math.max(2,enemy*.8))return false;
        }
      }
      return true;
    }
    path(from,to,id,sea=true) {
      if(from===to)return [];
      if(!this.prov[to])return null;
      // Weighted Dijkstra, using a binary heap. Land and ocean edges remain distinct.
      const n=this.prov.length,dist=new Float64Array(n).fill(Infinity),prev=new Int32Array(n).fill(-1),heap=[];
      const push=(v,d)=>{let i=heap.length;heap.push([v,d]);while(i>0){const p=(i-1)>>1;if(heap[p][1]<=d)break;heap[i]=heap[p];i=p;}heap[i]=[v,d];};
      const pop=()=>{const root=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1][1]<heap[c][1])c++;if(heap[c][1]>=last[1])break;heap[i]=heap[c];i=c;}heap[i]=last;}return root;};
      dist[from]=0;push(from,0);
      while(heap.length){
        const [u,d]=pop();if(d>dist[u])continue;if(u===to)break;
        const edges=this.prov[u].neighbors.map(v=>({to:v,days:1,sea:false}));
        if(sea&&this.s.provinces[u].port)for(const e of this.prov[u].sea)if(this.s.provinces[e.to].port)edges.push({...e,sea:true});
        for(const e of edges){
          const q=this.s.provinces[e.to];if(this.historyBlocked(id,e.to))continue;if(!this.access(id,q.ctrl)&&!this.war(id,q.ctrl))continue;
          if(e.sea&&!this.seaAllowed(id,e,q.ctrl))continue;
          const cost=e.sea?e.days+2:this.catalog.terrain[this.prov[e.to].terrain].move*(1+(this.war(id,q.ctrl)?2:0));
          const nd=d+cost;if(nd<dist[e.to]){dist[e.to]=nd;prev[e.to]=u;push(e.to,nd);}
        }
      }
      if(!Number.isFinite(dist[to]))return null;
      const result=[];for(let v=to;v!==from;v=prev[v]){if(v<0)return null;result.push(v);}return result.reverse();
    }
    // Relations are immutable during supply propagation; cache their truth values
    // once instead of repeating millions of alliance/access checks per tick.
    accessMatrix() {
      const ids=Object.keys(this.s.countries),permitted=Object.create(null);
      for(const a of ids){
        const row=permitted[a]=Object.create(null);
        for(const b of ids)row[b]=!!this.access(a,b);
      }
      return permitted;
    }
    computeSupply() {
      const permitted=this.accessMatrix(),active=this.active(),portsByOwner=Object.create(null),allPorts=[];
      for(const p of this.prov){
        if(!this.s.provinces[p.id].port)continue;
        allPorts.push(p);
        const id=this.s.provinces[p.id].ctrl;
        (portsByOwner[id]??=[]).push(p);
      }
      const alliesById=new Map(active.map(id=>[id,active.filter(other=>this.allies(id,other))]));
      const navalCache=new Map(),enemyCache=new Map();
      const naval=(id,zone,mission='')=>{
        const key=id+'|'+zone+'|'+mission;
        if(!navalCache.has(key))navalCache.set(key,this.navalPower(id,zone,mission||null));
        return navalCache.get(key);
      };
      const enemies=id=>{
        if(!enemyCache.has(id))enemyCache.set(id,this.enemies(id));
        return enemyCache.get(id);
      };
      const loads=new Float32Array(this.prov.length);
      for(const u of this.s.units)loads[u.pid]+=templateStats(u.template).width/20;
      // A single multi-source flood. Propagation only crosses allied/accessible territories.
      const values=new Float32Array(this.prov.length),queue=[];
      for(const id of active){
        const c=this.nation(id),capital=this.cap(id);if(this.s.provinces[capital]?.ctrl===id){values[capital]=1;queue.push(capital);}
        const ports=portsByOwner[id]||[];
        const convoyFactor=clamp(c.stock.convoys/Math.max(15,ports.length*2),0,1);
        for(const p of ports){
          const raiding=sum(enemies(id).map(e=>naval(e,p.seaZone,'raid')));
          const escorts=sum(alliesById.get(id).map(o=>naval(o,p.seaZone)));
          const blockade=clamp(1-raiding/Math.max(10,escorts+raiding)*.8,.2,1);
          const supply=.65*convoyFactor*blockade*(1+this.s.provinces[p.id].port*.06);
          if(values[p.id]<supply){values[p.id]=supply;queue.push(p.id);}
        }
      }
      for(let head=0;head<queue.length;head++){
        const i=queue[head],q=this.s.provinces[i];
        for(const j of this.prov[i].neighbors){
          const target=this.s.provinces[j];if(!permitted[q.ctrl]?.[target.ctrl])continue;
          const loss=.07*this.catalog.terrain[this.prov[j].terrain].move/(1+target.rail*.25+target.infra*.12+this.nation(q.ctrl).bonus.supply);
          const v=values[i]-loss;if(v>values[j]+.004&&v>0){values[j]=v;queue.push(j);}
        }
      }
      for(let i=0;i<values.length;i++){
        const q=this.s.provinces[i];q.supply=clamp(values[i]*(1+q.hub*.08)*(1-q.damage*.4),0,1);
      }
      const totals={},counts={},armyById=new Map(this.s.armies.map(a=>[a.id,a]));
      for(const u of this.s.units){
        const q=this.s.provinces[u.pid],a=armyById.get(u.army),g=this.general(a);
        u.supply=clamp(q.supply*(1+this.nation(u.owner).bonus.supply+(u.template.logistics?.12:0)+(g?g.logistics*.025:0))/Math.max(1,loads[u.pid]/(2+q.infra+q.hub*2)),0,1);
        totals[u.owner]=(totals[u.owner]||0)+u.supply;counts[u.owner]=(counts[u.owner]||0)+1;
      }
      for(const id of this.active())this.nation(id).stats.supply=(totals[id]||0)/(counts[id]||1);
      this.computePockets(permitted,allPorts);
    }
    computePockets(permitted=this.accessMatrix(),allPorts=null) {
      if(!allPorts)allPorts=this.prov.filter(p=>this.s.provinces[p.id].port>0);
      const summary={};
      for(const id of this.active()) {
        const forces=this.units(id);
        if(!forces.length||!this.enemies(id).length){for(const u of forces)u.pocketed=false;continue;}
        const visited=new Uint8Array(this.prov.length),queue=[];
        const seed=pid=>{if(this.prov[pid]&&!visited[pid]&&permitted[id]?.[this.s.provinces[pid].ctrl]){visited[pid]=1;queue.push(pid);}};
        seed(this.cap(id));
        for(const ally of this.active())if(this.allies(id,ally))seed(this.cap(ally));
        if(this.nation(id).stock.convoys>=10){
          for(const p of allPorts)if(permitted[id]?.[this.s.provinces[p.id].ctrl]&&
            this.s.provinces[p.id].supply>=.25)seed(p.id);
        }
        for(let head=0;head<queue.length;head++)for(const next of this.prov[queue[head]].neighbors){
          if(!visited[next]&&permitted[id]?.[this.s.provinces[next].ctrl]){
            visited[next]=1;queue.push(next);
          }
        }
        for(const u of forces){u.pocketed=!visited[u.pid];if(u.pocketed)summary[id]=(summary[id]||0)+1;}
      }
      this.s.pocketSummary=summary;
    }
    recordCombat(report) {
      if(!['engaged','breakthrough','repulsed','unopposed'].includes(report.outcome))return;
      // Bounded after-action records. Five-day samples avoid a 100-MB campaign.
      if(report.outcome==='engaged'&&this.s.day%5!==0)return;
      if(report.a!==this.s.player&&report.b!==this.s.player&&this.prov[report.pid].vp<4)return;
      this.s.combatLedger.unshift({...report,day:this.s.day});
      if(this.s.combatLedger.length>160)this.s.combatLedger.length=160;
    }
    effect(id,effect={}) {
      const c=this.nation(id),capital=this.s.provinces[this.cap(id)];
      for(const [k,v] of Object.entries(effect)){
        if(k==='tension')this.s.tension=clamp(this.s.tension+v,0,100);
        else if(['civ','mil','dock'].includes(k))capital[k]+=v;
        else if(k==='slots')c.slots+=v;
        else if(k in c.bonus)c.bonus[k]=clamp(c.bonus[k]+v,-.5,5);
        else if(k in c.stock)c.stock[k]=Math.max(0,c.stock[k]+v);
        else if(['pp','stability','support','manpower','xp'].includes(k))c[k]=Math.max(0,c[k]+v);
      }
      c.stability=clamp(c.stability,0,100);c.support=clamp(c.support,0,100);c.slots=clamp(c.slots,1,8);
    }
    researchStart(id,key) {
      const c=this.nation(id),t=this.tech(key);assert(t,'Technologie inconnue.');
      assert(!c.tech.includes(key)&&!c.research.some(r=>r.id===key),'Recherche d\u00e9j\u00e0 lanc\u00e9e ou achev\u00e9e.');
      assert(c.research.length<c.slots,'Toutes les \u00e9quipes de recherche sont occup\u00e9es.');
      assert(t.req.every(r=>c.tech.includes(r)),'Des pr\u00e9requis scientifiques manquent.');c.research.push({id:key,progress:0});
    }
    focusStart(id,key) {
      const c=this.nation(id),f=this.focus(id,key);assert(f,'Priorit\u00e9 inconnue.');assert(!c.focus,'Une priorit\u00e9 est d\u00e9j\u00e0 en cours.');assert(!c.focusDone.includes(key),'Priorit\u00e9 d\u00e9j\u00e0 achev\u00e9e.');
      assert(f.req.every(r=>c.focusDone.includes(r)),'Les priorit\u00e9s pr\u00e9c\u00e9dentes doivent \u00eatre achev\u00e9es.');assert(!f.exclusive||!c.focusDone.includes(f.exclusive),'Branche exclue par vos choix.');c.focus={id:key,progress:0};
    }
    recruit(id,templateId,pid,count=1) {
      const c=this.nation(id),t=c.templates.find(t=>t.id===templateId);
      assert(t,'Mod\u00e8le inconnu.');assert(Number.isInteger(count)&&count>=1&&count<=5,'Quantit\u00e9 invalide.');
      assert(this.s.provinces[pid]?.ctrl===id,'Le recrutement exige une province contr\u00f4l\u00e9e.');assert(c.training.length+count<=12,'File d\u2019entra\u00eenement pleine.');
      const stats=templateStats(t);assert(c.manpower>=stats.men*count,'Effectifs disponibles insuffisants.');
      for(const [k,n] of Object.entries(stats.eq))assert(c.stock[k]>=n*count,'Stock insuffisant : '+this.catalog.equipment[k].name+'.');
      c.manpower-=stats.men*count;for(const [k,n] of Object.entries(stats.eq))c.stock[k]-=n*count;
      for(let i=0;i<count;i++)c.training.push({id:this.s.uid++,template:clone(t),pid,progress:0,days:35+t.tank*4});
    }
    construct(id,pid,kind) {
      assert(!this.historyBlocked(id,pid)||!['fort','airbase','mil','hub'].includes(kind),'La zone rhenane est demilitarisee.');
      const c=this.nation(id),p=this.s.provinces[pid],b=this.catalog.buildings[kind];
      assert(p&&p.ctrl===id,'Choisissez une province que vous contr\u00f4lez.');assert(b,'B\u00e2timent inconnu.');assert(c.build.length<16,'File de construction pleine.');
      if(['dock','port'].includes(kind))assert(this.prov[pid].coast,'Ce b\u00e2timent exige un littoral.');
      assert(p[kind]+c.build.filter(x=>x.pid===pid&&x.kind===kind).length<b.max,'Capacit\u00e9 locale maximale atteinte.');
      c.build.push({id:this.s.uid++,pid,kind,progress:0,cost:b.cost});
    }
    economics(id) {
      const c=this.nation(id),mod=this.s.mod.balance;
      this.governanceDaily(id);
      c.pp+=.8+c.stability/160;c.stock.fuel=Math.min(150000,c.stock.fuel+15+c.stats.oil*12);
      const recruit=Math.min(c.pool,30*c.conscription);c.pool-=recruit;c.manpower+=recruit;
      const demand={steel:0,rubber:0};
      for(const [key,n] of Object.entries(c.allocation))for(const r in demand)demand[r]+=n*(this.catalog.equipment[key][r]||0);
      c.stats.resourceFactor=Math.min(1,...Object.entries(demand).filter(([,v])=>v>0).map(([k,v])=>Math.max(.25,c.stats[k]/v)));
      const law={civilian:.9,partial:1,war:1.15}[c.economy];
      for(const [key,n] of Object.entries(c.allocation)){
        if(n)c.efficiency[key]=Math.min(.95,c.efficiency[key]+.0018*(1+c.bonus.production));
        const equipment=this.catalog.equipment[key];
        c.stock[key]+=n*5/equipment.cost*c.efficiency[key]*c.stats.resourceFactor*(1+c.bonus.production)*(.7+c.stability/250)*law*mod.production*(c.macro?.output||1);
      }
      const capacity=c.stats.freeCiv*1.2*(1+c.bonus.construction)*(c.macro?.output||1),projects=c.build.slice(0,Math.max(1,Math.min(3,Math.floor(c.stats.freeCiv/10))));
      for(const b of projects){
        if(this.s.provinces[b.pid].ctrl!==id){c.build=c.build.filter(x=>x.id!==b.id);continue;}
        b.progress+=capacity/projects.length;
        if(b.progress>=b.cost){this.s.provinces[b.pid][b.kind]++;c.build=c.build.filter(x=>x.id!==b.id);if(id===this.s.player)this.log(this.catalog.buildings[b.kind].name+' achev\u00e9(e) : '+this.prov[b.pid].name+'.','success');}
      }
      const year=1936+this.s.day/365.25;
      for(const r of [...c.research]){
        const t=this.tech(r.id),ahead=Math.max(0,t.year-year);
        r.progress+=(1+c.bonus.research)*mod.research/(1+ahead*.7);
        if(r.progress>=t.days){c.tech.push(t.id);c.research=c.research.filter(x=>x.id!==r.id);this.effect(id,t.effect);if(id===this.s.player)this.log('Recherche achev\u00e9e : '+t.name+'.','success');}
      }
      if(c.focus){const f=this.focus(id,c.focus.id);c.focus.progress++;if(c.focus.progress>=f.days){c.focusDone.push(f.id);c.focus=null;this.effect(id,f.effect);if(id===this.s.player)this.log('Priorit\u00e9 achev\u00e9e : '+f.name+'.','success');}}
      for(const t of [...c.training]){
        t.progress++;
        if(t.progress>=t.days){const pid=this.s.provinces[t.pid].ctrl===id?t.pid:this.cap(id);const u=this.spawn(id,pid,t.template);const army=this.s.armies.find(a=>a.owner===id);if(army)u.army=army.id;c.training=c.training.filter(x=>x.id!==t.id);if(id===this.s.player)this.log(t.template.name+' d\u00e9ploy\u00e9e \u00e0 '+this.prov[pid].name+'.','success');}
      }
      for(const j of c.justifications){j.progress=Math.min(j.days,j.progress+1);}
      for(const agreement of c.lendLease){
        if(!this.nation(agreement.target)?.alive||this.war(id,agreement.target))continue;
        const amount=Math.min(agreement.daily,c.stock[agreement.equipment]);c.stock[agreement.equipment]-=amount;this.nation(agreement.target).stock[agreement.equipment]+=amount;
      }
      for(const p of this.owned(id)){
        const st=this.s.provinces[p.id];st.damage=Math.max(0,st.damage-.003-c.stats.freeCiv*.00002);
        if(st.ctrl===p.owner){st.resistance=Math.max(0,st.resistance-.3);continue;}
        const stationed=(this.unitsAt.get(p.id)||[]).filter(u=>u.owner===id).length;
        const policy={civil:{gain:.045,compliance:.08,loss:0},police:{gain:.02,compliance:.03,loss:.02},military:{gain:-.03,compliance:-.01,loss:.07}}[c.occupation];
        st.resistance=clamp(st.resistance+policy.gain-stationed*.2,0,100);st.compliance=clamp(st.compliance+policy.compliance,0,100);
        if(st.resistance>40){st.damage=clamp(st.damage+.002*(st.resistance/40),0,.8);const losses=Math.min(c.manpower,Math.ceil(st.resistance*policy.loss));c.manpower-=losses;c.casualties+=losses;}
      }
    }
    airStep() {
      this.s.airReports=[];const zones={};
      for(const w of this.s.wings){
        if(w.size<1||w.mission==='reserve'||!this.nation(w.owner).alive)continue;
        const base=this.s.provinces[w.base],c=this.nation(w.owner);
        if(!this.access(w.owner,base.ctrl)||!base.airbase||c.stock.fuel<1)continue;
        const targets=this.prov.filter(p=>p.zone===w.zone),center=targets[Math.floor(targets.length/2)];if(!center)continue;
        const reach=clamp((w.kind==='fighters'?1600:2300)/Math.max(1,distance(this.prov[w.base],center)),0,1);
        const parked=sum(this.s.wings.filter(x=>x.base===w.base).map(x=>x.size));
        const capacity=clamp(base.airbase*250/Math.max(1,parked),0,1);
        const radar=sum(this.prov.filter(p=>p.zone===w.zone&&this.allies(w.owner,this.s.provinces[p.id].ctrl)).map(p=>this.s.provinces[p.id].radar));
        const effective=w.size*reach*capacity*(.3+.7*base.supply)*(1-base.damage)*this.weather(w.base).air*(1+c.bonus.air)*(1+Math.min(.25,radar*.035));
        w.efficiency=reach*capacity*(.3+.7*base.supply)*(1-base.damage);
        c.stock.fuel=Math.max(0,c.stock.fuel-effective*.04);
        (zones[w.zone]??=[]).push({w,effective});
      }
      this.airSupport={};
      for(const [zone,groups] of Object.entries(zones)){
        for(const {w,effective} of groups){
          const c=this.nation(w.owner),enemies=groups.filter(g=>this.war(w.owner,g.w.owner));
          const enemyFighters=sum(enemies.filter(g=>g.w.kind==='fighters').map(g=>g.effective*(g.w.mission==='intercept'?1.25:1)));
          const friendFighters=sum(groups.filter(g=>this.allies(w.owner,g.w.owner)&&g.w.kind==='fighters').map(g=>g.effective));
          const control=(friendFighters+25)/(friendFighters+enemyFighters+50);
          const losses=Math.min(w.size,enemyFighters*(w.kind==='fighters'?.002:.004)*(1-control*.4));
          w.size-=losses;c.lostPlanes+=losses;
          if(w.kind==='fighters')this.airSupport[w.owner+'_'+zone]=(this.airSupport[w.owner+'_'+zone]||0)+effective/5000*control;
          if(w.kind==='bombers'&&w.mission==='support')this.airSupport[w.owner+'_'+zone]=(this.airSupport[w.owner+'_'+zone]||0)+effective/1400*control*(1+c.bonus.bombing);
          if(w.kind==='bombers'&&['strategic','logistics'].includes(w.mission)){
            const targets=this.prov.filter(p=>p.zone===zone&&this.war(w.owner,this.s.provinces[p.id].ctrl));
            if(targets.length){const t=targets[Math.floor(this.random()*targets.length)],st=this.s.provinces[t.id];st.damage=clamp(st.damage+effective/12000*control*(1+c.bonus.bombing),0,.85);if(w.mission==='logistics')st.supply*=.85;}
          }
          if(w.owner===this.s.player)this.s.airReports.push({zone,wing:w.id,effective:Math.round(effective),control,losses});
        }
      }
    }
    navalStep() {
      this.s.navalReports=[];
      for(const f of this.s.fleets){
        if(f.eta>0){f.eta--;continue;}
        const c=this.nation(f.owner);
        if(f.mission==='port'){f.strength=clamp(f.strength+.012,0,1);continue;}
        const ships=sum(Object.values(f.ships));c.stock.fuel=Math.max(0,c.stock.fuel-ships*.4);
        if(c.stock.fuel<1)continue;
        const opponents=this.s.fleets.filter(e=>e.zone===f.zone&&e.eta<=0&&e.mission!=='port'&&this.war(f.owner,e.owner));
        for(const e of opponents){
          if(e.id<f.id)continue;
          const power=this.fleetRating(f)*(1+c.bonus.navy);
          const other=this.nation(e.owner),enemy=this.fleetRating(e)*(1+other.bonus.navy);
          if(power<=0||enemy<=0)continue;
          const hit=.004+this.random()*.008;
          const ownLoss=Math.min(ships,enemy/Math.max(1,power)*hit*ships),enemyLoss=Math.min(sum(Object.values(e.ships)),power/Math.max(1,enemy)*hit*sum(Object.values(e.ships)));
          this.fleetLoss(f,ownLoss);this.fleetLoss(e,enemyLoss);
          f.strength=clamp(f.strength-.006,0.1,1);e.strength=clamp(e.strength-.006,0.1,1);
          if(f.owner===this.s.player||e.owner===this.s.player)this.s.navalReports.push({zone:f.zone,a:f.owner,b:e.owner,lossA:ownLoss,lossB:enemyLoss});
        }
        if(f.mission==='raid')for(const target of this.enemies(f.owner)){
          const raiding=this.navalPower(f.owner,f.zone,'raid')*(1+c.bonus.raiding),escort=this.navalPower(target,f.zone,'escort');
          const victim=this.nation(target);victim.stock.convoys=Math.max(0,victim.stock.convoys-Math.max(0,raiding-escort)*.025);
        }
        if(f.strength<.25)f.mission='port';
      }
    }
    fleetLoss(f,amount){const total=sum(Object.values(f.ships));if(!total)return;for(const k in f.ships)f.ships[k]=Math.max(0,f.ships[k]-amount*f.ships[k]/total);this.nation(f.owner).lostShips+=amount;}
    intelStep() {
      for(const id of this.active()){
        const c=this.nation(id);
        for(const spy of [...c.spies]){
          if(!this.nation(spy.target)?.alive)continue;
          spy.progress+=1+c.bonus.intel;
          c.intel[spy.target]=clamp((c.intel[spy.target]||0)+.35*(1+c.bonus.intel),0,100);
          if(spy.progress>=spy.days){
            if(spy.mission==='recon')c.intel[spy.target]=clamp((c.intel[spy.target]||0)+20,0,100);
            else if(spy.mission==='sabotage'){
              const targets=this.owned(spy.target).filter(p=>this.s.provinces[p.id].mil>0);
              if(targets.length){const p=targets[Math.floor(this.random()*targets.length)];this.s.provinces[p.id].damage=clamp(this.s.provinces[p.id].damage+.3,0,.8);}
            }else if(spy.mission==='resistance'){
              for(const p of this.owned(spy.target).filter(p=>p.owner!==spy.target))this.s.provinces[p.id].resistance=clamp(this.s.provinces[p.id].resistance+8,0,100);
            }
            if(id===this.s.player)this.log('Op\u00e9ration de renseignement achev\u00e9e en '+this.info(spy.target).name+'.','success');
            c.spies=c.spies.filter(x=>x.id!==spy.id);
          }
        }
      }
    }
    declareWar(a,b,free=false,callAllies=true) {
      assert(a!==b&&this.nation(a)?.alive&&this.nation(b)?.alive,'Cible diplomatique invalide.');
      assert(!this.allies(a,b),'Vous ne pouvez pas attaquer un alli\u00e9.');assert(!this.war(a,b),'Ces pays sont d\u00e9j\u00e0 en guerre.');
      const c=this.nation(a);assert(!c.pacts.some(p=>p.target===b&&p.until>this.s.day),'Un pacte de non-agression est encore en vigueur.');
      if(!free){assert(c.pp>=50,'Il faut 50 points politiques.');assert(c.justifications.some(j=>j.target===b&&j.progress>=j.days),'Un objectif de guerre justifi\u00e9 est n\u00e9cessaire.');c.pp-=50;}
      const attackers=callAllies?this.active().filter(id=>this.allies(a,id)&&(id===a||!this.nation(id).nonBelligerent)):[a];
      const defenders=callAllies?this.active().filter(id=>(this.allies(b,id)||this.nation(id).guarantees.includes(b))&&(id===b||!this.nation(id).nonBelligerent)):[b];
      for(const x of attackers)for(const y of defenders)if(x!==y&&!this.allies(x,y)&&!this.war(x,y))this.s.wars.push({id:this.s.uid++,a:x,b:y,start:this.s.day,score:0});
      this.s.tension=clamp(this.s.tension+12,0,100);this.frontCache={};
      this.log(this.info(a).name+' d\u00e9clare la guerre \u00e0 '+this.info(b).name+'.','war');
      for(const id of [...attackers,...defenders])this.nation(id).support=clamp(this.nation(id).support+6,0,100);
    }
    annex(winner,loser,puppet=false) {
      assert(this.nation(winner)?.alive&&this.nation(loser)?.alive&&winner!==loser,'Annexion impossible.');
      const target=this.nation(loser);
      if(puppet){
        if(this.nation(winner).faction==='none')this.nation(winner).faction='Pacte '+winner;
        target.subject=winner;target.faction=this.nation(winner).faction;target.stability=45;
        for(const p of this.prov)if(p.owner===loser&&this.s.provinces[p.id].ctrl===winner)this.s.provinces[p.id].ctrl=loser;
      }else{
        target.alive=false;target.manpower=0;target.training=[];target.build=[];
        for(const st of this.s.provinces)if(st.ctrl===loser){st.ctrl=winner;st.compliance=20;st.resistance=15;}
        this.s.units=this.s.units.filter(u=>u.owner!==loser);
        this.s.wings=this.s.wings.filter(w=>w.owner!==loser);this.s.fleets=this.s.fleets.filter(f=>f.owner!==loser);
        for(const key of Object.keys(target.stock)){this.nation(winner).stock[key]+=target.stock[key]*.4;target.stock[key]=0;}
      }
      this.s.wars=this.s.wars.filter(w=>w.a!==loser&&w.b!==loser);
      this.log(this.info(loser).name+(puppet?' devient un \u00c9tat soumis \u00e0 ':' capitule devant ')+this.info(winner).name+'.','war');
      if(loser===this.s.player&&!puppet){this.s.outcome={type:'defeat',day:this.s.day,winner};this.s.paused=true;}
      this.frontCache={};this.indexUnits();
    }
    civilWar(id) {
      if(this.nation('NAT'))return;
      const base=this.nation(id),d=clone(base.identity);d.id='NAT';d.name='Espagne nationaliste';d.leader='Miguel Cabanellas';d.wiki='Miguel Cabanellas';d.role='Pr\u00e9sident de la junte';d.color='#967a4f';d.faction='none';d.commanders=[];d.ideology='fascist';
      const held=this.owned(id),rebels=held.filter(p=>p.id!==d.capital&&((p.x<-4&&p.y>36)||p.y>42));
      if(!rebels.length)return;
      d.capital=rebels[Math.floor(rebels.length/2)].id;d.capitalName=this.prov[d.capital].name;d.lon=this.prov[d.capital].x;d.lat=this.prov[d.capital].y;
      const c=this.createNation(d);this.s.countries.NAT=c;c.pp=80;c.faction='none';c.manpower=base.manpower*.4;base.manpower*=.6;c.pool=base.pool*.4;base.pool*=.6;c.identity.cores=rebels.map(p=>p.id);
      for(const k of Object.keys(c.stock)){c.stock[k]=base.stock[k]*.4;base.stock[k]*=.6;}
      for(const p of rebels){this.s.provinces[p.id].ctrl='NAT';this.s.provinces[p.id].resistance=0;}
      const army=this.addArmy('NAT');army.auto=true;army.target=id;army.order='attack';
      for(const [i,u] of this.units(id).entries())if(i%2===0){u.owner='NAT';u.army=army.id;u.pid=rebels[i%rebels.length].id;u.path=[];}
      base.identity.leader='Manuel Aza\u00f1a';base.identity.wiki='Manuel Aza\u00f1a';
      this.updateStats();this.defaultProduction('NAT');this.declareWar(id,'NAT',true,false);
      this.log('La guerre civile espagnole a commenc\u00e9. Le partage territorial est une simplification de jeu.','war');
    }
    eventChoice(country,event,index) {
      if(event.history)return this.historyChoice(country,event,index);
      const choice=event.choices[index];assert(choice,'Choix invalide.');this.effect(country,choice.effect);
      const c=this.nation(country);
      if(choice.leader){c.identity.leader=choice.leader;c.identity.wiki=choice.leader;c.identity.portraitKey=null;}
      if(choice.cabinet)c.identity.cabinet=choice.cabinet;
      if(choice.special==='civilWar')this.civilWar(country);
      if(choice.guarantors&&choice.war)for(const id of choice.guarantors)if(this.nation(id)?.alive)this.nation(id).guarantees.push(choice.war);
      if(choice.war&&this.nation(choice.war)?.alive&&!this.war(country,choice.war)&&!this.allies(country,choice.war)){
        try{this.declareWar(country,choice.war,true);}catch(err){this.log('L\u2019escalade est suspendue : '+err.message);}
      }
      if(choice.annex&&this.nation(choice.annex)?.alive){
        if(choice.annex===this.s.player){this.s.eventQueue.push({country:choice.annex,event:{id:event.id+'_response',title:'Ultimatum de '+this.info(country).name,text:'Un rattachement est exig\u00e9. Accepter met fin \u00e0 l\u2019ind\u00e9pendance ; refuser provoque une guerre dans cette branche.',choices:[{text:'Refuser et r\u00e9sister',effect:{support:25},war:country},{text:'Accepter le rattachement',effect:{},special:'acceptAnnex',annexBy:country}]}});}
        else this.annex(country,choice.annex);
      }
      if(choice.special==='acceptAnnex'&&choice.annexBy)this.annex(choice.annexBy,country);
      this.log(event.title+' : '+choice.text, 'event');
    }
    eventsStep() {
      this.historicalStep();
      for(const e of this.s.mod.events){
        if(e.day>this.s.day||this.s.seenEvents.includes(e.id))continue;
        const country=e.country==='player'?this.s.player:e.country;
        if(!this.nation(country)?.alive){this.s.seenEvents.push(e.id);continue;}
        if(e.requiresWar&&!this.enemies(country).length)continue;
        this.s.seenEvents.push(e.id);
        if(country===this.s.player)this.s.eventQueue.push({country,event:clone(e)});
        else this.eventChoice(country,e,0);
      }
      if(!this.s.pending&&this.s.eventQueue.length){this.s.pending=this.s.eventQueue.shift();this.s.paused=true;}
    }
    strategyAI() {
      for(const id of this.active()){
        const c=this.nation(id);if(id===this.s.player)continue;
        if(this.s.day%10===0){
          this.defaultProduction(id);
          while(c.research.length<c.slots){const options=this.catalog.techs.filter(t=>!c.tech.includes(t.id)&&!c.research.some(r=>r.id===t.id)&&t.req.every(r=>c.tech.includes(r))&&t.year<=1937+this.s.day/365);if(!options.length)break;this.researchStart(id,options[Math.floor(this.random()*options.length)].id);}
          if(!c.focus){const options=this.tree(id).filter(f=>!c.focusDone.includes(f.id)&&f.req.every(r=>c.focusDone.includes(r))&&(!f.exclusive||!c.focusDone.includes(f.exclusive)));if(options.length)this.focusStart(id,options[Math.floor(this.random()*options.length)].id);}
          if(c.pp>100&&this.enemies(id).length){c.economy='war';c.pp-=80;c.support=Math.max(60,c.support);}
        }
        if(this.s.day%24===0&&this.units(id).length<Math.min(90,Math.max(8,c.stats.mil*1.8))&&c.training.length<3){
          try{this.recruit(id,c.stock.tanks>600&&c.stock.trucks>1200?'armored':'infantry',this.cap(id));}catch{}
        }
        if(this.s.day%30===0&&c.build.length<2&&c.stats.freeCiv>0){
          const ps=this.owned(id).filter(p=>this.s.provinces[p.id].mil<9);if(ps.length)try{this.construct(id,ps[Math.floor(this.random()*ps.length)].id,this.random()<.6?'mil':'civ');}catch{}
        }
        const enemies=this.enemies(id);
        for(const a of this.s.armies.filter(a=>a.owner===id)){
          if(enemies.length){a.target=enemies[a.id%enemies.length];a.order=this.units(id).length>=this.units(a.target).length*.65?'attack':'defend';a.tactic=a.order==='attack'?'spearhead':'elastic';a.auto=true;}
          else {a.target=null;a.order='defend';}
        }
        for(const w of this.s.wings.filter(w=>w.owner===id)){
          if(enemies.length){
            const border=this.owned(id).find(p=>p.neighbors.some(n=>this.war(id,this.s.provinces[n].ctrl)));
            if(border){w.zone=border.zone;w.mission=w.kind==='fighters'?'superiority':'support';}
          }else w.mission='reserve';
        }
        for(const f of this.s.fleets.filter(f=>f.owner===id))f.mission=enemies.length?(f.ships.submarines>f.ships.destroyers?'raid':'escort'):'port';
        if(!this.s.historical&&this.s.day>240&&this.s.day%150===0&&!enemies.length&&['fascist','authoritarian'].includes(c.ideology)&&c.pp>150){
          const targets=new Set();for(const p of this.owned(id))for(const j of p.neighbors){const target=this.s.provinces[j].ctrl;if(!this.allies(id,target)&&this.nation(target).alive)targets.add(target);}
          const target=[...targets].find(t=>this.units(t).length<this.units(id).length*.7);
          if(target)try{this.declareWar(id,target,true);}catch{}
        }
      }
    }
    armyAI() {
      const counts=new Uint16Array(this.prov.length);for(const u of this.s.units)if(u.strength>0)counts[u.pid]++;
      this.s.fronts={};
      const cache=new Map();
      for(const a of this.s.armies){
        if(!a.auto||!a.target||!this.nation(a.owner)?.alive||!this.nation(a.target)?.alive)continue;
        const troops=this.s.units.filter(u=>u.army===a.id&&u.owner===a.owner);if(!troops.length)continue;
        const general=this.general(a);a.planning=clamp(a.planning+.02+(general?general.planning*.001:0)+this.groupModifier(a,true)*.05,0,1);
        let fronts=this.prov.filter(p=>this.access(a.owner,this.s.provinces[p.id].ctrl)&&p.neighbors.some(n=>this.s.provinces[n].ctrl===a.target));
        const anchors=(a.frontSelection||[]).map(id=>this.prov[id]);
        if(anchors.length){const limited=fronts.filter(p=>anchors.some(q=>distance(p,q)<450));if(limited.length)fronts=limited;}
        if(!fronts.length){
          a.assessment={status:this.war(a.owner,a.target)?'Pr\u00e9paration maritime':'Aucune fronti\u00e8re terrestre',front:0,friendly:troops.length};
          if(a.order!=='attack'||!this.war(a.owner,a.target)||this.s.day%6!==0)continue;
          const routes=[];for(const port of this.owned(a.owner))if(this.s.provinces[port.id].port)for(const e of port.sea){if(this.s.provinces[e.to].ctrl===a.target&&this.s.provinces[e.to].port)routes.push({port,e});}
          routes.sort((x,y)=>x.e.days-y.e.days||x.port.id-y.port.id);
          const route=routes[0];if(!route)continue;
          if(a.owner!==this.s.player)for(const [i,zone] of route.e.zones.entries()){
            const fleet=this.s.fleets.filter(f=>f.owner===a.owner).sort((x,y)=>this.fleetRating(y)-this.fleetRating(x))[i];
            if(fleet){if(fleet.zone!==zone){fleet.zone=zone;fleet.eta=5;}fleet.mission='invasion';}
          }
          const ready=this.seaAllowed(a.owner,route.e,a.target);a.assessment.status=ready?'Embarquement autoris\u00e9':'En attente de ma\u00eetrise navale';
          a.invasion={from:route.port.id,to:route.e.to,zones:route.e.zones};
          for(const u of troops.slice(0,8)){if(u.path.length||u.org<55)continue;if(u.pid===route.port.id){if(ready)u.path=[route.e.to];}else u.path=this.path(u.pid,route.port.id,a.owner)||[];}
          continue;
        }
        a.invasion=null;this.s.fronts[a.id]=fronts.map(p=>p.id);
        const key=a.owner+'_'+a.target+'_'+fronts.map(p=>p.id).join(',');
        let field=cache.get(key);
        if(!field){
          const dist=new Int32Array(this.prov.length).fill(-1),next=new Int32Array(this.prov.length).fill(-1),q=[];
          // Seed safer, valuable sectors first; equal-cost routing is deterministic.
          fronts.sort((x,y)=>this.s.provinces[y.id].supply-this.s.provinces[x.id].supply||x.id-y.id);
          for(const p of fronts){dist[p.id]=0;q.push(p.id);}
          for(let h=0;h<q.length;h++)for(const n of this.prov[q[h]].neighbors){if(dist[n]!==-1||!this.access(a.owner,this.s.provinces[n].ctrl))continue;dist[n]=dist[q[h]]+1;next[n]=q[h];q.push(n);}
          field={dist,next};cache.set(key,field);
        }
        const enemyIds=new Set(fronts.flatMap(p=>p.neighbors.filter(n=>this.s.provinces[n].ctrl===a.target)));
        a.assessment={status:a.order==='attack'?'Offensive planifi\u00e9e':'Tenue du front',front:fronts.length,friendly:troops.length,enemy:[...enemyIds].reduce((n,pid)=>n+(this.unitsAt.get(pid)||[]).filter(u=>this.war(a.owner,u.owner)).length,0),ready:Math.round(100*sum(troops.map(u=>u.org/100*u.supply*u.strength))/troops.length),pockets:troops.filter(u=>u.pocketed).length};
        const reserveCount=troops.length>=8?Math.floor(troops.length*(a.reserveRatio??.15)):0;
        const objective=a.objective!==null&&a.objective!==undefined?this.prov[a.objective]:null;
        for(const [i,u] of troops.entries()){
          if(u.path.length||u.retreatUntil>this.s.day)continue;
          if(u.pocketed||u.org<25||u.supply<.2){
            const safer=this.prov[u.pid].neighbors.filter(n=>this.access(a.owner,this.s.provinces[n].ctrl)&&!(this.unitsAt.get(n)||[]).some(e=>this.war(a.owner,e.owner))).sort((x,y)=>this.s.provinces[y].supply-this.s.provinces[x].supply);
            if(safer.length&&this.s.provinces[safer[0]].supply>u.supply+.15)u.path=[safer[0]];continue;
          }
          if(field.dist[u.pid]>0){
            if(i>=troops.length-reserveCount&&field.dist[u.pid]===1)continue;
            u.path=[field.next[u.pid]];u.progress=0;continue;
          }
          // Feed allied fronts and balance dense sectors before launching attacks.
          if(field.dist[u.pid]===0&&counts[u.pid]>3){
            const gaps=this.prov[u.pid].neighbors.filter(n=>field.dist[n]===0&&counts[n]+1<counts[u.pid]);
            if(gaps.length){gaps.sort((x,y)=>counts[x]-counts[y]);u.path=[gaps[0]];counts[gaps[0]]++;counts[u.pid]--;continue;}
          }
          if(a.order!=='attack'||!this.war(a.owner,a.target)||u.org<(a.stance==='aggressive'?40:55)||u.strength<.40||u.supply<.25)continue;
          const options=this.prov[u.pid].neighbors.filter(n=>this.s.provinces[n].ctrl===a.target).map(pid=>{
            const p=this.prov[pid],st=this.s.provinces[pid],defenders=(this.unitsAt.get(pid)||[]).filter(e=>this.war(a.owner,e.owner));
            const defense=sum(defenders.map(e=>templateStats(e.template).defense*e.strength*(.3+.7*e.supply)))*this.catalog.terrain[p.terrain].defense*(1+st.fort*.15);
            const support=p.neighbors.flatMap(n=>(this.unitsAt.get(n)||[]).filter(e=>e.owner===a.owner&&e.org>45&&e.supply>.25));
            const attack=sum(support.map(e=>templateStats(e.template).soft*e.strength*(.3+.7*e.supply)))*(1+a.planning*.2);
            const ratio=attack/Math.max(10,defense),corridor=p.neighbors.filter(n=>this.s.provinces[n].ctrl===a.target).length;
            const value=p.vp+st.hub*5+st.port*3+(corridor<=2?5:0)+(objective?Math.max(-20,(a.tactic==='spearhead'?60:30)-distance(p,objective)/(a.tactic==='spearhead'?22:35)):0);
            return {pid,ratio,score:ratio*12+value-counts[pid]*2};
          }).sort((x,y)=>y.score-x.score||x.pid-y.pid);
          const best=options[0],threshold=(a.stance==='aggressive'?.55:a.stance==='cautious'?1.35:.92)*(a.tactic==='spearhead'?.87:a.tactic==='elastic'?1.4:1);
          if(best&&best.ratio>=threshold){u.path=[best.pid];u.progress=0;u.entrench=0;}
        }
      }
    }
    loss(u,strength,org) {
      const actual=clamp(strength,0,u.strength);u.strength-=actual;u.org=clamp(u.org-org,0,100);
      const personnel=actual*templateStats(u.template).men;
      this.nation(u.owner).casualties+=Math.round(personnel*(u.template.hospital?.78:1));
      if(u.template.hospital)this.nation(u.owner).manpower+=personnel*.22;
    }
    retreat(u) {
      const options=this.prov[u.pid].neighbors.filter(n=>this.access(u.owner,this.s.provinces[n].ctrl)&&!(this.unitsAt.get(n)||[]).some(e=>this.war(u.owner,e.owner)));
      options.sort((a,b)=>this.s.provinces[b].supply-this.s.provinces[a].supply);
      if(!options.length||u.strength<.08){this.nation(u.owner).casualties+=Math.round(u.strength*templateStats(u.template).men);u.strength=0;return false;}
      u.pid=options[0];u.path=[];u.progress=0;u.entrench=0;u.retreatUntil=this.s.day+3;u.org=Math.max(u.org,15);return true;
    }
    capture(pid,attackers) {
      const alive=attackers.filter(u=>u.strength>.08);if(!alive.length)return;
      const lead=alive[0],old=this.s.provinces[pid].ctrl,st=this.s.provinces[pid];
      st.ctrl=lead.owner;st.compliance=this.prov[pid].owner===lead.owner?90:20;st.resistance=this.prov[pid].owner===lead.owner?0:15;st.damage=clamp(st.damage+.02,0,.8);
      for(const u of alive){u.pid=pid;u.path.shift();u.progress=0;u.entrench=0;u.org=Math.max(0,u.org-3);}
      for(const w of this.s.wings.filter(w=>w.base===pid&&this.war(w.owner,lead.owner))){w.base=this.cap(w.owner);w.mission='reserve';w.size*=.75;}
      for(const f of this.s.fleets.filter(f=>f.base===pid&&this.war(f.owner,lead.owner))){const port=this.owned(f.owner).find(p=>this.s.provinces[p.id].port);if(port){f.base=port.id;f.zone=port.seaZone;f.eta=3;}else {this.fleetLoss(f,sum(Object.values(f.ships)));f.mission='port';}}
      if(this.prov[pid].city&&(lead.owner===this.s.player||old===this.s.player))this.log(this.prov[pid].name+' passe sous le contr\u00f4le de '+this.info(lead.owner).name+'.',lead.owner===this.s.player?'success':'war');
    }
    militaryStep() {
      const attacks=new Map(),busy=new Set();this.s.battles=[];
      this.indexUnits();
      for(const u of this.s.units){
        if(u.strength<=0||u.retreatUntil>this.s.day||!u.path.length)continue;
        const to=u.path[0],e=this.edge(u.pid,to),ctrl=this.s.provinces[to]?.ctrl;
        if(this.historyBlocked(u.owner,to)){u.path=[];continue;}
        if(!e||(!this.access(u.owner,ctrl)&&!this.war(u.owner,ctrl))){u.path=[];continue;}
        if(e.sea&&(!this.s.provinces[u.pid].port||!this.s.provinces[to].port||!this.seaAllowed(u.owner,e,ctrl))){u.path=[];continue;}
        const stats=templateStats(u.template),weather=this.weather(to);
        const speed=stats.speed*(.25+.75*u.supply)*weather.move*(1+this.nation(u.owner).bonus.speed);
        if(this.war(u.owner,ctrl)){
          if(u.org<12){u.path=[];continue;}
          if(e.sea){u.progress+=speed;if(u.progress<e.days)continue;}
          if(!attacks.has(to))attacks.set(to,[]);attacks.get(to).push(u);
        }else{
          u.progress+=speed;u.entrench=0;
          const duration=e.sea?e.days:this.catalog.terrain[this.prov[to].terrain].move;
          if(u.progress>=duration){u.pid=to;u.path.shift();u.progress=0;if(e.sea)this.nation(u.owner).stock.fuel=Math.max(0,this.nation(u.owner).stock.fuel-40);}
        }
      }
      this.indexUnits();
      for(const [pid,all] of attacks){
        // Multiple independent powers may attack the same tile, but only forces
        // belonging to the same alliance may enter it as a coalition. Other
        // attackers keep their orders and are resolved in a later tick.
        const eligible=all.filter(u=>u.strength>0&&this.war(u.owner,this.s.provinces[pid].ctrl));
        if(!eligible.length)continue;
        const lead=eligible[0];
        const valid=eligible.filter(u=>this.allies(lead.owner,u.owner));
        let defenders=(this.unitsAt.get(pid)||[]).filter(u=>u.strength>0&&valid.some(a=>this.war(a.owner,u.owner)));
        if(!defenders.length){
          // Record significant unopposed occupations as well as fought battles.
          if(this.prov[pid].vp>=4||this.prov[pid].city)this.recordCombat({
            pid,a:lead.owner,b:this.s.provinces[pid].ctrl,outcome:'unopposed',
            attackers:valid.length,defenders:0,lossesA:0,lossesD:0,
            terrain:this.prov[pid].terrain
          });
          this.capture(pid,valid);continue;
        }
        const terrain=this.catalog.terrain[this.prov[pid].terrain],width=terrain.width,fort=this.s.provinces[pid].fort,weather=this.weather(pid);
        const fit=units=>{let w=0;return [...units].sort((a,b)=>b.org*b.strength-a.org*a.strength).filter(u=>{const uw=templateStats(u.template).width;if(w&&w+uw>width)return false;w+=uw;return true;});};
        const attack=fit(valid),defense=fit(defenders),approaches=new Set(attack.map(u=>u.pid)).size;
        const beforeA=sum(attack.map(u=>u.strength*templateStats(u.template).men));
        const beforeD=sum(defense.map(u=>u.strength*templateStats(u.template).men));
        const avgArmor=us=>sum(us.map(u=>templateStats(u.template).armor*(1+this.nation(u.owner).bonus.armor)))/Math.max(1,us.length);
        const defArmor=avgArmor(defense),atkArmor=avgArmor(attack);
        const power=(u,offense)=>{
          const c=this.nation(u.owner),t=templateStats(u.template),army=this.s.armies.find(a=>a.id===u.army),g=this.general(army);
          const enemyArmor=offense?defArmor:atkArmor,piercing=t.piercing*(1+c.bonus.piercing),armorFactor=enemyArmor>piercing?.7:1;
          const air=clamp(this.airSupport?.[u.owner+'_'+this.prov[pid].zone]||0,0,.35)*(1+c.bonus.air);
          const tactic=army?.tactic||'balanced';
          let result=(offense?t.soft+t.hard*.2:t.defense)*u.strength*(.35+u.org/154)*(.2+.8*u.supply)*armorFactor*(1+(offense?c.bonus.attack:c.bonus.defense)+air+(g?(offense?g.attack:g.defense)*.035:0));
          if(t.armor&&c.stock.fuel<10)result*=.5;
          if(u.pocketed)result*=offense?.70:.58;
          if(t.recon&&offense)result*=1.05;
          if(t.tank&&t.motor&&offense)result*=1.06;
          if(offense){if(tactic==='spearhead')result*=1.16;if(tactic==='elastic')result*=.88;}
          else if(tactic==='elastic')result*=1.14;
          if(offense){result*=weather.attack*(1+Math.min(.3,(approaches-1)*.1))*(1+(army?army.planning*.2:0)+c.bonus.planning);if(this.edge(u.pid,pid)?.sea)result*=.45;else result*=this.riverAttackFactor(u,pid);}
          else result*=terrain.defense*(1+fort*.15)*(1+u.entrench*.025)*(u.template.engineer?1.06:1);
          return Math.max(1,result)*(1+Math.min(.2,u.xp*.05)+this.groupModifier(army,offense))*(u.owner===this.s.player?1:this.s.difficulty==='veteran'?1.12:this.s.difficulty==='relaxed'?.88:1);
        };
        const ap=sum(attack.map(u=>power(u,true))),dp=sum(defense.map(u=>power(u,false))),ratio=ap/Math.max(1,dp),intensity=this.s.mod.balance.combat*(.92+this.random()*.16);
        for(const u of attack){busy.add(u.id);this.loss(u,clamp(.013/ratio,.002,.065)*intensity,clamp(4.5/ratio,1,18)*intensity);u.xp+=.003;this.nation(u.owner).xp+=.09;this.nation(u.owner).stock.fuel=Math.max(0,this.nation(u.owner).stock.fuel-(u.template.tank*4+u.template.motor*1.5));}
        for(const u of defense){busy.add(u.id);this.loss(u,clamp(.015*ratio,.002,.08)*intensity,clamp(5*ratio,1,20)*intensity);u.xp+=.003;this.nation(u.owner).xp+=.08;}
        for(const u of [...attack,...defense])if(u.org<8||u.strength<.10)this.retreat(u);
        defenders=defenders.filter(u=>u.pid===pid&&u.strength>0);
        const remaining=valid.filter(u=>u.strength>0&&u.path[0]===pid&&u.org>=8);
        const outcome=!defenders.length&&remaining.length?'breakthrough':!remaining.length?'repulsed':'engaged';
        this.recordCombat({pid,a:valid[0].owner,b:defenders[0]?.owner||this.s.provinces[pid].ctrl,
          outcome,attackers:attack.length,defenders:defense.length,
          lossesA:Math.max(0,Math.round(beforeA-sum(attack.map(u=>u.strength*templateStats(u.template).men)))),
          lossesD:Math.max(0,Math.round(beforeD-sum(defense.map(u=>u.strength*templateStats(u.template).men)))),
          river:attack.some(u=>this.riverAttackFactor(u,pid)<1),terrain:this.prov[pid].terrain,
          ap:Math.round(ap),dp:Math.round(dp)});
        if(outcome==='breakthrough')this.capture(pid,remaining);
        else if(remaining.length)this.s.battles.push({pid,a:remaining[0].owner,b:defenders[0]?.owner||this.s.provinces[pid].ctrl,attackers:remaining.map(u=>u.id),defenders:defenders.map(u=>u.id),ratio:ratio/(1+ratio),width:sum(attack.map(u=>templateStats(u.template).width)),maxWidth:width,terrain:this.prov[pid].terrain,weather:weather.name,river:attack.some(u=>this.riverAttackFactor(u,pid)<1),ap:Math.round(ap),dp:Math.round(dp)});
      }
      for(const u of this.s.units){
        if(u.strength<=0)continue;
        const c=this.nation(u.owner),t=templateStats(u.template);
        if(!busy.has(u.id)){u.org=clamp(u.org+(u.path.length?1:3)*(.2+u.supply),0,100);if(!u.path.length)u.entrench=Math.min(10,u.entrench+1);}
        if(u.supply<.22)this.loss(u,.0015*(1-u.supply),.7);
        if(u.pocketed)this.loss(u,.0025*(1.15-u.supply),1.8);
        if(u.strength<1&&u.supply>.35&&!u.pocketed&&!busy.has(u.id)){
          let change=Math.min(.006,1-u.strength,c.manpower/Math.max(1,t.men));for(const [k,n] of Object.entries(t.eq))if(n)change=Math.min(change,c.stock[k]/n);
          if(change>0){u.strength+=change;c.manpower-=change*t.men;for(const [k,n] of Object.entries(t.eq))c.stock[k]=Math.max(0,c.stock[k]-change*n);}
        }
      }
      this.s.units=this.s.units.filter(u=>u.strength>.04);this.indexUnits();
    }
    checkCapitulations() {
      for(const id of this.active()){
        const c=this.nation(id),enemies=this.enemies(id);if(!enemies.length)continue;
        const original=c.identity.cores?c.identity.cores.map(pid=>this.prov[pid]):this.prov.filter(p=>p.owner===id);
        const metro=original.filter(p=>distance(p,{x:c.identity.lon,y:c.identity.lat})<2300),scored=metro.length?metro:original;
        const total=sum(scored.map(p=>p.vp)),lost=sum(scored.filter(p=>this.war(id,this.s.provinces[p.id].ctrl)).map(p=>p.vp));
        const capCtrl=this.s.provinces[c.identity.capital]?.ctrl;
        if((total>0&&lost/total>.65&&this.war(id,capCtrl))||!this.owned(id).length){
          if(id==='FRA'&&this.s.historical&&!c.identity.exile&&this.s.historyState&&!this.s.historyState.flags.france_armistice&&capCtrl==='GER'){
            const event=this.catalog.historicalEvents.find(e=>e.id==='h_french_armistice');
            if(event&&this.owned('FRA').some(p=>distance(p,{x:2.35,y:48.86})>2300)){
              if(!this.s.seenEvents.includes(event.id)){this.s.seenEvents.push(event.id);if(this.s.player==='FRA'){this.s.eventQueue.push({country:'FRA',event:clone(event)});this.historyRecord(event,'queued');}else this.historyChoice('FRA',event,0);}
              continue;
            }
          }
          const conqueror=this.war(id,capCtrl)?capCtrl:enemies[0];this.annex(conqueror,id);
        }
      }
    }
    tick(days=1) {
      assert(Number.isInteger(days)&&days>=1&&days<=10000,'Nombre de jours invalide.');
      for(let i=0;i<days;i++){
        if(this.s.pending||this.s.outcome)break;
        this.s.day++;this.indexUnits();this.updateStats();
        for(const id of this.active())this.economics(id);
        this.strategyAI();
        if(this.s.day%2===0){this.computeSupply();this.armyAI();}
        this.airStep();this.navalStep();this.intelStep();this.militaryStep();
        if(this.s.day%3===0)this.checkCapitulations();
        this.eventsStep();this.releaseDay();this.s.tension=clamp(this.s.tension-(this.s.wars.length?0:.015),0,100);
        if(this.s.day%30===0){
          for(const id of this.active()){
            const c=this.nation(id);c.history.push({day:this.s.day,civ:c.stats.civ,mil:c.stats.mil,divisions:c.stats.divisionCount,losses:c.casualties});if(c.history.length>160)c.history.shift();
          }
          this.checkInvariants();
        }
        this.s.revision++;
      }
      return this.s;
    }
    dispatch(action,p={}) {
      assert(this.s,'Aucune partie active.');
      const before=clone(this.s);
      try{const result=this.execute(action,p);this.campaignProgress();this.s.revision++;return result;}catch(error){this.s=before;this.indexUnits();throw error;}
    }
    execute(action,p) {
      const id=this.s.player,c=this.nation(id),pp=cost=>assert(c.pp>=cost,'Il faut '+cost+' points politiques.');
      if(!['pause','speed','event','continue'].includes(action))assert(c.alive,'Le gouvernement a capitul\u00e9.');
      const foreign=target=>{assert(this.nation(target)?.alive&&target!==id,'Pays cible invalide.');return this.nation(target);};
      if(this.releaseExecute(action,p))return;
      switch(action){
        case 'pause':this.s.paused=this.s.pending||this.s.outcome?true:!this.s.paused;return;
        case 'speed':assert(Number.isInteger(p.value)&&p.value>=1&&p.value<=5,'Vitesse invalide.');this.s.speed=p.value;return;
        case 'continue':assert(this.s.outcome?.type==='victory','Aucune victoire a poursuivre.');this.s.outcome=null;this.s.campaign.mode='sandbox';return;
        case 'research':this.researchStart(id,p.id);return;
        case 'cancelResearch':assert(c.research.some(r=>r.id===p.id),'Recherche inconnue.');c.research=c.research.filter(r=>r.id!==p.id);return;
        case 'focus':this.focusStart(id,p.id);return;
        case 'build':assert(!this.historyBlocked(id,p.pid)||!['fort','airbase','mil','hub'].includes(p.kind),'La zone rhenane est demilitarisee.');this.construct(id,p.pid,p.kind);return;
        case 'cancelBuild':assert(c.build.some(b=>b.id===p.id),'Chantier inconnu.');c.build=c.build.filter(b=>b.id!==p.id);return;
        case 'prioritizeBuild':{const i=c.build.findIndex(b=>b.id===p.id);assert(i>=0,'Chantier inconnu.');c.build.unshift(c.build.splice(i,1)[0]);return;}
        case 'production':{
          const eq=this.catalog.equipment[p.key];assert(eq&&[-1,1].includes(p.delta),'Allocation invalide.');
          const used=sum(Object.keys(c.allocation).filter(k=>!!this.catalog.equipment[k].naval===!!eq.naval).map(k=>c.allocation[k]));
          if(p.delta>0)assert(used<(eq.naval?c.stats.dock:c.stats.mil),'Toutes les installations de ce type sont affect\u00e9es.');
          assert(c.allocation[p.key]+p.delta>=0,'Aucune usine \u00e0 retirer.');c.allocation[p.key]+=p.delta;if(p.delta>0)c.efficiency[p.key]=Math.max(.2,c.efficiency[p.key]-.015);return;
        }
        case 'autoProduction':this.defaultProduction(id);return;
        case 'recruit':this.recruit(id,p.template,p.pid,p.count||1);return;
        case 'cancelTraining':{
          const t=c.training.find(t=>t.id===p.id);assert(t,'Entra\u00eenement inconnu.');const st=templateStats(t.template);c.manpower+=st.men;for(const [k,n] of Object.entries(st.eq))c.stock[k]+=n;c.training=c.training.filter(x=>x.id!==p.id);return;
        }
        case 'template':{
          assert(c.xp>=15,'Il faut 15 points d\u2019exp\u00e9rience.');assert(c.templates.length<24,'Maximum : 24 mod\u00e8les.');
          const t={id:'custom_'+this.s.uid++,name:String(p.name||'Division personnalis\u00e9e').slice(0,70),inf:p.inf,art:p.art,tank:p.tank,motor:p.motor,engineer:!!p.engineer,logistics:!!p.logistics,recon:!!p.recon,antiTank:!!p.antiTank,hospital:!!p.hospital};
          for(const k of ['inf','art','tank','motor'])assert(Number.isInteger(t[k])&&t[k]>=0&&t[k]<=15,'Nombre de bataillons invalide.');
          const st=templateStats(t);assert(st.width>=2&&st.width<=45,'Largeur comprise entre 2 et 45 requise.');c.xp-=15;c.templates.push(t);return t.id;
        }
        case 'order':{
          assert(Array.isArray(p.ids)&&p.ids.length>0,'S\u00e9lectionnez des divisions.');assert(this.prov[p.target],'Province inconnue.');let count=0;
          for(const uid of new Set(p.ids)){const u=this.s.units.find(u=>u.id===uid&&u.owner===id);if(!u)continue;const path=this.path(u.pid,p.target,id);if(path!==null){u.path=path;u.progress=0;u.entrench=0;const a=this.s.armies.find(a=>a.id===u.army);if(a)a.auto=false;count++;}}
          assert(count,'Aucun trajet autoris\u00e9. V\u00e9rifiez les acc\u00e8s, les guerres, les ports, les convois et la ma\u00eetrise navale.');return count;
        }
        case 'halt':for(const u of this.s.units.filter(u=>u.owner===id&&(p.ids||[]).includes(u.id))){u.path=[];u.progress=0;const a=this.s.armies.find(a=>a.id===u.army);if(a)a.auto=false;}return;
        case 'newArmy':return this.addArmy(id,String(p.name||'').slice(0,70)||undefined).id;
        case 'assignArmy':{
          const a=this.s.armies.find(a=>a.id===p.army&&a.owner===id);assert(a,'Arm\u00e9e inconnue.');
          for(const u of this.s.units.filter(u=>u.owner===id&&(p.ids||[]).includes(u.id)))u.army=a.id;return;
        }
        case 'general':{
          const a=this.s.armies.find(a=>a.id===p.army&&a.owner===id);assert(a,'Arm\u00e9e inconnue.');
          assert(!p.general||!this.s.groups.some(g=>g.owner===id&&g.marshal===p.general),'Cet officier commande un groupe d’armees.');
          assert(p.general===null||c.identity.commanders.some(g=>g.id===p.general),'Officier inconnu.');assert(!p.general||!this.s.armies.some(x=>x.id!==a.id&&x.general===p.general),'Cet officier commande d\u00e9j\u00e0 une arm\u00e9e.');a.general=p.general;return;
        }
        case 'armyPlan':{
          const a=this.s.armies.find(a=>a.id===p.army&&a.owner===id);assert(a,'Arm\u00e9e inconnue.');foreign(p.target);assert(['attack','defend','garrison'].includes(p.order),'Ordre inconnu.');assert(['cautious','balanced','aggressive'].includes(p.stance),'Attitude inconnue.');
          a.target=p.target;a.order=p.order;a.stance=p.stance;a.auto=!!p.auto;a.planning=0;
          if(p.order==='garrison'){
            const units=this.s.units.filter(u=>u.army===a.id&&u.owner===id),targets=this.owned(id).sort((a,b)=>this.s.provinces[b.id].resistance-this.s.provinces[a.id].resistance);
            units.forEach((u,i)=>{if(targets.length)u.path=this.path(u.pid,targets[i%targets.length].id,id)||[];});a.auto=false;
          }
          return;
        }
        case 'armyTactic': {
          const a=this.s.armies.find(a=>a.id===p.army&&a.owner===id);
          assert(a,'Armee inconnue.');
          assert(['balanced','spearhead','elastic'].includes(p.tactic),'Doctrine tactique invalide.');
          if(a.tactic===p.tactic)return;
          assert(c.xp>=10,"Il faut 10 XP pour changer la doctrine d'une armee.");
          c.xp-=10;a.tactic=p.tactic;a.planning=0;
          this.log(a.name+' adopte la doctrine '+p.tactic+'.','tip');return;
        }
        case 'refitDivision': {
          assert(Array.isArray(p.ids)&&p.ids.length>0&&p.ids.length<=60,'Choisissez entre 1 et 60 divisions.');
          const template=c.templates.find(t=>t.id===p.template);
          assert(template,'Modele de division introuvable.');
          const list=[...new Set(p.ids)].map(uid=>this.s.units.find(u=>u.id===uid&&u.owner===id));
          assert(list.every(Boolean),'Une division ne vous appartient pas.');
          assert(list.every(u=>this.s.provinces[u.pid].ctrl===id&&!u.path.length&&!this.s.battles.some(b=>b.attackers.includes(u.id)||b.defenders.includes(u.id))),
            "Reequiper seulement dans une province nationale, a l'arret et hors combat.");
          assert(list.some(u=>u.template.id!==template.id),'Ces divisions possedent deja ce modele.');
          assert(c.xp>=5,'Il faut 5 XP pour lancer le re-equipement.');
          const needed={},men=[];
          for(const u of list) {
            if(u.template.id===template.id)continue;
            const old=templateStats(u.template),next=templateStats(template),delta=(next.men-old.men)*u.strength;
            men.push(delta);
            for(const key of Object.keys(next.eq))needed[key]=(needed[key]||0)+(next.eq[key]-old.eq[key])*u.strength;
          }
          const manpowerNeeded=sum(men);
          assert(c.manpower>=Math.max(0,manpowerNeeded),'Reserves humaines insuffisantes.');
          for(const [key,value] of Object.entries(needed))assert(value<=0||c.stock[key]>=value,'Materiel insuffisant : '+key);
          c.manpower=Math.max(0,c.manpower-manpowerNeeded);
          for(const [key,value] of Object.entries(needed))c.stock[key]=Math.max(0,c.stock[key]-(value>0?value:value*.7));
          c.xp-=5;
          for(const u of list)if(u.template.id!==template.id){u.template=clone(template);u.org=Math.max(12,u.org-18);u.entrench=0;u.progress=0;}
          this.log(list.length+' divisions ont recu un nouvel equipement.','success');return;
        }
        case 'airCreate':{
          assert(['fighters','bombers'].includes(p.kind),'Type d\u2019appareil inconnu.');assert(Number.isInteger(p.size)&&p.size>=10&&p.size<=500,'Taille : 10 \u00e0 500 appareils.');
          const st=this.s.provinces[p.base];assert(st?.ctrl===id&&st.airbase>0,'Base a\u00e9rienne nationale requise.');assert(c.stock[p.kind]>=p.size,'Appareils en r\u00e9serve insuffisants.');
          c.stock[p.kind]-=p.size;this.s.wings.push({id:this.s.uid++,owner:id,name:p.kind==='fighters'?'Escadre de chasse':'Escadre de bombardement',kind:p.kind,size:p.size,base:p.base,zone:this.prov[p.base].zone,mission:'reserve',xp:0});return;
        }
        case 'airMission':{
          const w=this.s.wings.find(w=>w.id===p.id&&w.owner===id);assert(w,'Escadre inconnue.');assert(this.world.zones.some(z=>z.id===p.zone),'R\u00e9gion a\u00e9rienne inconnue.');
          assert((w.kind==='fighters'?['reserve','superiority','intercept']:['reserve','support','strategic','logistics']).includes(p.mission),'Mission incompatible avec ces appareils.');w.zone=p.zone;w.mission=p.mission;return;
        }
        case 'airRebase':{const w=this.s.wings.find(w=>w.id===p.id&&w.owner===id);assert(w,'Escadre inconnue.');const st=this.s.provinces[p.base];assert(st?.ctrl===id&&st.airbase>0,'Base nationale requise.');w.base=p.base;w.mission='reserve';return;}
        case 'airReinforce':{const w=this.s.wings.find(w=>w.id===p.id&&w.owner===id);assert(w,'Escadre inconnue.');const amount=Math.min(50,Math.floor(c.stock[w.kind]));assert(amount>0,'Aucun appareil en r\u00e9serve.');w.size+=amount;c.stock[w.kind]-=amount;return;}
        case 'fleetCreate':{
          const st=this.s.provinces[p.base];assert(st?.ctrl===id&&st.port>0,'Port national requis.');
          for(const k of ['destroyers','submarines'])assert(Number.isInteger(p[k])&&p[k]>=0&&p[k]<=100&&c.stock[k]>=p[k],'Nombre de navires invalide ou r\u00e9serves insuffisantes.');assert(p.destroyers+p.submarines>0,'Une flotte doit comporter un navire.');
          c.stock.destroyers-=p.destroyers;c.stock.submarines-=p.submarines;this.s.fleets.push({id:this.s.uid++,owner:id,name:String(p.name||'Groupe naval').slice(0,60),base:p.base,zone:this.prov[p.base].seaZone,mission:'port',eta:0,ships:{destroyers:p.destroyers,submarines:p.submarines},strength:1});return;
        }
        case 'fleetMission':{
          const f=this.s.fleets.find(f=>f.id===p.id&&f.owner===id);assert(f,'Flotte inconnue.');assert(this.world.seas.some(z=>z.id===p.zone),'R\u00e9gion maritime inconnue.');assert(['port','patrol','escort','raid','invasion'].includes(p.mission),'Mission navale inconnue.');
          if(f.zone!==p.zone){f.eta=5;f.zone=p.zone;}f.mission=p.mission;return;
        }
        case 'relations':{foreign(p.target);assert(!this.war(id,p.target),'Impossible en guerre.');pp(25);c.pp-=25;c.relations[p.target]=clamp((c.relations[p.target]||0)+25,-100,100);return;}
        case 'alliance':{const t=foreign(p.target);assert(!this.war(id,p.target)&&t.faction==='none'&&!t.subject,'Ce pays ne peut pas rejoindre votre faction.');assert((c.relations[p.target]||0)>=50,'Au moins 50 de relations sont n\u00e9cessaires.');pp(75);c.pp-=75;if(c.faction==='none')c.faction='Pacte '+id;t.faction=c.faction;this.log(this.info(p.target).name+' rejoint votre faction.','success');return;}
        case 'access':{const t=foreign(p.target);assert(!this.war(id,p.target)&&(c.relations[p.target]||0)>=25,'Il faut \u00eatre en paix et avoir 25 de relations.');pp(20);c.pp-=20;if(!c.access.includes(p.target))c.access.push(p.target);return;}
        case 'guarantee':{foreign(p.target);assert(!this.war(id,p.target),'Garantie impossible en guerre.');assert(!c.guarantees.includes(p.target),'Pays d\u00e9j\u00e0 garanti.');pp(40);c.pp-=40;c.guarantees.push(p.target);return;}
        case 'pact':{const t=foreign(p.target);assert(!this.war(id,p.target),'Pacte impossible en guerre.');pp(40);c.pp-=40;c.pacts.push({target:p.target,until:this.s.day+365});t.pacts.push({target:id,until:this.s.day+365});return;}
        case 'justify':{foreign(p.target);assert(!this.allies(id,p.target)&&!this.war(id,p.target),'Objectif invalide.');assert(!c.justifications.some(j=>j.target===p.target),'Justification d\u00e9j\u00e0 engag\u00e9e.');pp(40);c.pp-=40;c.justifications.push({target:p.target,progress:0,days:c.ideology==='democratic'?120:60});this.s.tension=clamp(this.s.tension+3,0,100);return;}
        case 'war':this.declareWar(id,p.target);return;
        case 'peace':{
          const t=foreign(p.target),war=this.s.wars.find(w=>(w.a===id&&w.b===p.target)||(w.b===id&&w.a===p.target));assert(war,'Aucune guerre en cours.');assert(this.s.day-war.start>=60,'Il faut au moins 60 jours de guerre.');pp(50);
          const own=this.units(id).length,enemy=this.units(p.target).length;assert(own>=enemy*.8||t.stability<40,'Le gouvernement adverse refuse l\u2019armistice.');
          if(p.terms==='puppet'){assert(t.stats.vpHeld<.4&&own>enemy*1.2,'Une soumission exige un avantage militaire d\u00e9cisif.');this.annex(id,p.target,true);}
          else {
            const aBloc=this.active().filter(o=>this.allies(id,o)),bBloc=this.active().filter(o=>this.allies(p.target,o));
            this.s.wars=this.s.wars.filter(w=>!((aBloc.includes(w.a)&&bBloc.includes(w.b))||(aBloc.includes(w.b)&&bBloc.includes(w.a))));
            for(const p of this.prov){const st=this.s.provinces[p.id];if((aBloc.includes(p.owner)&&bBloc.includes(st.ctrl))||(bBloc.includes(p.owner)&&aBloc.includes(st.ctrl)))st.ctrl=p.owner;}
            for(const u of this.s.units)if(!this.access(u.owner,this.s.provinces[u.pid].ctrl)&&!this.war(u.owner,this.s.provinces[u.pid].ctrl)){u.pid=this.cap(u.owner);u.path=[];}
            this.log('Armistice entre '+this.info(id).name+' et '+this.info(p.target).name+'.','success');
          }
          // Immediately remove stale engagements and pocket statuses after peace,
          // rather than leaving phantom encirclements visible for two more days.
          this.s.fronts={};this.s.battles=[];this.computeSupply();
          c.pp-=50;c.pacts.push({target:p.target,until:this.s.day+180});t.pacts.push({target:id,until:this.s.day+180});return;
        }
        case 'trade':{const t=foreign(p.target);assert(!this.war(id,p.target),'Commerce impossible avec un ennemi.');assert(['steel','oil','rubber'].includes(p.resource),'Ressource inconnue.');assert(c.trades.length<8&&c.stats.freeCiv>0,'Une usine civile libre est n\u00e9cessaire.');assert(t.stats[p.resource]>=8,'Capacit\u00e9 d\u2019exportation insuffisante.');c.trades.push({id:this.s.uid++,from:p.target,resource:p.resource,active:false});this.updateStats();return;}
        case 'cancelTrade':assert(c.trades.some(t=>t.id===p.id),'Contrat inconnu.');c.trades=c.trades.filter(t=>t.id!==p.id);this.updateStats();return;
        case 'lendLease':{foreign(p.target);assert(!this.war(id,p.target)&&this.catalog.equipment[p.equipment],'Aide impossible.');assert(Number.isInteger(p.daily)&&p.daily>=1&&p.daily<=500,'Quantit\u00e9 quotidienne invalide.');assert(c.lendLease.length<8,'Maximum huit accords.');c.lendLease.push({id:this.s.uid++,target:p.target,equipment:p.equipment,daily:p.daily});return;}
        case 'cancelLease':c.lendLease=c.lendLease.filter(t=>t.id!==p.id);return;
        case 'spy':{foreign(p.target);assert(['recon','sabotage','resistance'].includes(p.mission),'Mission inconnue.');assert(c.spies.length<3,'Les trois r\u00e9seaux sont occup\u00e9s.');pp(p.mission==='recon'?35:65);c.pp-=p.mission==='recon'?35:65;c.spies.push({id:this.s.uid++,target:p.target,mission:p.mission,progress:0,days:p.mission==='recon'?30:60});return;}
        case 'law':{
          if(p.kind==='economy'){assert(['civilian','partial','war'].includes(p.value),'Loi inconnue.');assert(c.economy!==p.value,'Loi d\u00e9j\u00e0 en vigueur.');const cost=p.value==='war'?100:60;pp(cost);assert(p.value!=='war'||this.enemies(id).length||c.support>=60,'Il faut une guerre active ou 60 % de soutien.');c.pp-=cost;c.economy=p.value;c.stability=clamp(c.stability-4,0,100);}
          else if(p.kind==='conscription'){assert(c.conscription<4,'Conscription maximale atteinte.');pp(80);c.pp-=80;c.conscription++;c.pool+=c.identity.manpower*.35;c.stability=clamp(c.stability-6,0,100);}
          else if(p.kind==='occupation'){assert(['civil','police','military'].includes(p.value),'Politique inconnue.');c.occupation=p.value;}
          else assert(false,'Type de loi inconnu.');this.updateStats();return;
        }
        case 'decision':{
          assert(['stability','support','party'].includes(p.id),'D\u00e9cision inconnue.');assert((c.policyCooldown[p.id]||0)<=this.s.day,'Cette d\u00e9cision est encore en recharge.');pp(45);c.pp-=45;
          if(p.id==='stability')c.stability=clamp(c.stability+8,0,100);
          if(p.id==='support')c.support=clamp(c.support+10,0,100);
          if(p.id==='party'){assert(p.party in c.parties,'Courant inconnu.');for(const k in c.parties)c.parties[k]*=.9;c.parties[p.party]+=10;}
          c.policyCooldown[p.id]=this.s.day+30;return;
        }
        case 'event':{assert(this.s.pending,'Aucun \u00e9v\u00e9nement \u00e0 r\u00e9soudre.');const {country,event}=this.s.pending;assert(Number.isInteger(p.index),'Choix invalide.');this.eventChoice(country,event,p.index);this.s.pending=null;this.s.paused=true;this.eventsStep();return;}
        default:throw new Error('Commande inconnue : '+action);
      }
    }
    checkInvariants(state=this.s) {
      assert(state&&state.version===5&&state.mapId===this.world.mapId,'Carte ou format incompatible. Les sauvegardes 1.0 restent utilisables dans la version 1.0.');
      assert(Number.isInteger(state.day)&&state.day>=0&&state.day<=100000,'Date invalide.');assert(state.countries?.[state.player],'Pays joueur inconnu.');
      assert(Array.isArray(state.provinces)&&state.provinces.length===this.prov.length,'Carte incompatible.');
      if(state.geoKeys!==undefined){
        assert(Array.isArray(state.geoKeys)&&state.geoKeys.length===this.prov.length,'Identifiants géographiques incomplets.');
        assert(state.geoKeys.every((key,i)=>key===this.prov[i].geoKey),'Ordre géographique incohérent.');
        assert(state.geoOrderFingerprint===this.world.geoOrderFingerprint,'Empreinte cartographique incohérente.');
      }
      const ids=new Set(Object.keys(state.countries));
      for(const p of state.provinces){assert(ids.has(p.ctrl),'Contr\u00f4leur territorial invalide.');for(const k of ['civ','mil','dock','infra','rail','hub','fort','port','airbase','radar','damage','supply','resistance','compliance'])assert(finite(p[k]),'Valeur provinciale invalide : '+k);}
      for(const k of ['units','armies','wings','fleets','wars','battles','navalReports','airReports','eventQueue','seenEvents','log'])assert(Array.isArray(state[k])&&state[k].length<30000,'Structure invalide : '+k);
      const armies=new Map(state.armies.map(a=>[a.id,a]));
      for(const a of state.armies)assert(Number.isInteger(a.id)&&ids.has(a.owner)&&['attack','defend','garrison'].includes(a.order)&&finite(a.planning,0,1.001),'Armee invalide.');
      const seen=new Set();
      for(const u of state.units){assert(typeof u.pocketed==='boolean','Encerclement militaire invalide.');assert(Number.isInteger(u.id)&&!seen.has(u.id)&&ids.has(u.owner)&&this.prov[u.pid],'R\u00e9f\u00e9rence d\u2019unit\u00e9 invalide.');seen.add(u.id);assert(u.army===null||(armies.has(u.army)&&armies.get(u.army).owner===u.owner),'Affectation militaire invalide.');assert(finite(u.strength,0,1.001)&&finite(u.org,0,100.001)&&finite(u.supply,0,1.001),'\u00c9tat militaire invalide.');assert(Array.isArray(u.path)&&u.path.every(p=>Number.isInteger(p)&&this.prov[p]),'Trajet invalide.');for(const k of ['inf','art','tank','motor'])assert(Number.isInteger(u.template?.[k])&&u.template[k]>=0&&u.template[k]<=15,'Mod\u00e8le invalide.');}
      for(const [id,c] of Object.entries(state.countries)){
        assert(c.identity?.id===id&&typeof c.identity.name==='string'&&this.prov[c.identity.capital],'Identit\u00e9 nationale invalide.');
        for(const k of ['tech','research','focusDone','build','training','templates','relations_PLACEHOLDER','access','guarantees','pacts','trades','justifications','spies','lendLease','history','achievements'].filter(k=>k!=='relations_PLACEHOLDER'))assert(Array.isArray(c[k]),'Donn\u00e9e nationale invalide : '+k);
        for(const k of ['manpower','pool','pp','stability','support','casualties','xp','slots'])assert(finite(c[k]),'Ressource nationale invalide : '+k);
        assert((this.catalog.laws?.economy?.map(l=>l.id)||['civilian','partial','war']).includes(c.economy)&&['civil','police','military'].includes(c.occupation),'Loi invalide.');
        assert(c.stock&&c.bonus&&c.allocation&&c.efficiency&&c.relations&&c.intel&&c.parties&&c.policyCooldown,'Structures nationales manquantes.');
        for(const k of Object.keys(this.catalog.equipment))assert(finite(c.stock[k])&&Number.isInteger(c.allocation[k])&&c.allocation[k]>=0&&finite(c.efficiency[k],0,1),'Stock ou allocation invalide : '+k);
        assert(finite(c.stock.fuel),'Carburant invalide.');
        for(const value of Object.values(c.bonus))assert(finite(value,-.5,5),'Bonus national invalide.');
        assert(Array.isArray(c.identity.commanders)&&Number.isInteger(c.conscription)&&c.conscription>=0&&c.conscription<(this.catalog.laws?.conscription?.length||5),'Commandement ou conscription invalide.');
        if(c.macro||['1.3.0','1.3.1'].includes(state.release)){
          const m=c.macro,p=c.politics;
          assert(m&&p,'État politique ou macroéconomique manquant.');
          for(const k of ['treasury','debt','priceIndex','inflation','gdp','output','employment'])assert(finite(m[k],0,1e12),'Indicateur économique invalide : '+k);
          assert(['low','standard','high'].includes(m.tax)&&['austerity','standard','expanded'].includes(m.welfare)&&
            ['none','limited','severe'].includes(m.ration)&&['market','mixed','planned'].includes(m.system),'Politique économique invalide.');
          assert(m.budget&&['income','spending','interest'].every(k=>finite(m.budget[k],0,1e11))&&finite(m.budget.balance,-1e11,1e11),'Budget invalide.');
          // 1.3.0 saves can omit arrears; they receive the field during migration.
          if(state.release==='1.3.1'||m.arrears!==undefined)
            assert(finite(m.arrears,0,1e11),'Arriérés budgétaires invalides.');
          for(const cooldown of [m.cooldown,p.cooldown])if(cooldown!==undefined){
            assert(cooldown&&typeof cooldown==='object'&&!Array.isArray(cooldown)&&
              Object.values(cooldown).every(n=>Number.isInteger(n)&&n>=0&&n<=100000),
              'Période de transition politique invalide.');
          }
          assert(Array.isArray(m.history)&&m.history.length<=80&&m.history.every(h=>Number.isInteger(h.day)&&finite(h.treasury)&&finite(h.debt)&&finite(h.gdp)&&finite(h.inflation)&&finite(h.output)&&finite(h.balance,-1e11,1e11))&&m.cooldown&&finite(m.strikeUntil),'Historique économique invalide.');
          assert(finite(p.legitimacy,0,100)&&finite(p.unrest,0,100)&&
            ['restricted','regulated','protected'].includes(p.rights)&&Array.isArray(p.coalition)&&p.coalition.length<=4&&
            p.coalition.every(k=>k in c.parties),'Institutions politiques invalides.');
          assert(p.election&&Number.isInteger(p.election.nextDay)&&p.election.nextDay>=0&&
            (p.election.lastDay===null||Number.isInteger(p.election.lastDay)&&p.election.lastDay>=0)&&
            Array.isArray(p.history)&&p.history.length<=80&&p.history.every(h=>Number.isInteger(h.day)&&finite(h.legitimacy,0,100)&&finite(h.unrest,0,100)&&finite(h.stability,0,100)&&finite(h.support,0,100))&&p.cooldown&&finite(p.lastStrike,-1e8,1e8),'Calendrier politique invalide.');
          if(p.election.result)assert(Number.isInteger(p.election.result.day)&&finite(p.election.result.majority,0,100)&&
            Array.isArray(p.election.result.coalition)&&p.election.result.coalition.every(k=>k in c.parties)&&
            Object.entries(p.election.result.votes||{}).every(([k,v])=>k in c.parties&&finite(v,0,100)),'Résultat électoral invalide.');
        }
        assert(c.training.every(t=>Number.isInteger(t.pid)&&this.prov[t.pid]&&finite(t.progress)&&finite(t.days,1)&&t.template&&['inf','art','tank','motor'].every(k=>Number.isInteger(t.template[k])&&t.template[k]>=0&&t.template[k]<=15)),'Entrainement invalide.');
        assert(c.tech.every(k=>this.tech(k))&&c.research.every(r=>this.tech(r.id)&&finite(r.progress)),'Recherche inconnue.');
        assert(!c.focus||this.focus(id,c.focus.id)&&finite(c.focus.progress),'Priorit\u00e9 inconnue.');
        for(const b of c.build)assert(this.prov[b.pid]&&this.catalog.buildings[b.kind]&&finite(b.progress)&&finite(b.cost,1),'Chantier invalide.');
      }
      for(const w of state.wings)assert(ids.has(w.owner)&&this.prov[w.base]&&(['fighters','bombers'].includes(w.kind)||this.catalog.equipment[w.kind]?.domain==='air')&&finite(w.size)&&this.world.zones.some(z=>z.id===w.zone),'Escadre invalide.');
      for(const f of state.fleets)assert(ids.has(f.owner)&&this.prov[f.base]&&finite(f.ships?.destroyers)&&finite(f.ships?.submarines)&&this.world.seas.some(z=>z.id===f.zone),'Flotte invalide.');
      for(const w of state.wars)assert(ids.has(w.a)&&ids.has(w.b)&&w.a!==w.b,'Guerre invalide.');
      assert(Array.isArray(state.combatLedger)&&state.combatLedger.length<=160,'Journal tactique invalide.');
      for(const r of state.combatLedger){
        assert(Number.isInteger(r.pid)&&this.prov[r.pid]&&Number.isInteger(r.day)&&r.day>=0&&
          ['engaged','breakthrough','repulsed','unopposed'].includes(r.outcome),'Rapport de bataille invalide.');
        assert(ids.has(r.a)&&ids.has(r.b)&&r.a!==r.b&&finite(r.lossesA,0,1e8)&&finite(r.lossesD,0,1e8),
          'Rapport tactique : pays ou pertes invalides.');
        for(const k of ['attackers','defenders','ap','dp'])if(r[k]!==undefined)
          assert(Number.isFinite(r[k])&&r[k]>=0&&r[k]<=1e8,'Rapport tactique : valeur invalide.');
      }
      if(state.groups){assert(Array.isArray(state.groups)&&state.groups.length<1000,'Groupes invalides.');const gs=new Set();for(const g of state.groups){assert(Number.isInteger(g.id)&&!gs.has(g.id)&&ids.has(g.owner),'Groupe invalide.');gs.add(g.id);}for(const a of state.armies)assert(a.group===null||a.group===undefined||state.groups.some(g=>g.id===a.group&&g.owner===a.owner),'Affectation de groupe invalide.');}
      for(const a of state.armies){assert(['balanced','spearhead','elastic'].includes(a.tactic),'Doctrine tactique invalide.');assert(a.objective==null||Number.isInteger(a.objective)&&this.prov[a.objective],'Objectif invalide.');assert(a.reserveRatio===undefined||[0,.15,.3].includes(a.reserveRatio),'Reserve invalide.');assert(a.frontSelection===undefined||Array.isArray(a.frontSelection)&&a.frontSelection.length<=20&&a.frontSelection.every(pid=>Number.isInteger(pid)&&this.prov[pid]),'Secteur de front invalide.');}
      for(const c of Object.values(state.countries)){assert(c.warFatigue===undefined||finite(c.warFatigue,0,100),'Fatigue invalide.');assert(c.advisor==null||['economy','science','logistics'].includes(c.advisor),'Conseil invalide.');}
      for(const f of state.fleets)for(const k of ['cruisers','battleships','carriers'])assert(f.ships[k]===undefined||finite(f.ships[k]),'Navire capital invalide.');
      if(state.campaign)assert(['sandbox','strategic','development'].includes(state.campaign.mode)&&finite(state.campaign.score)&&Array.isArray(state.campaign.goals),'Campagne invalide.');

      const hs=state.historyState;
      assert(hs&&hs.version===1&&['1936','1939'].includes(hs.scenario),'Historique de campagne invalide.');
      assert(Array.isArray(hs.dmz)&&hs.dmz.every(i=>Number.isInteger(i)&&this.prov[i]),'Zone demilitarisee invalide.');
      assert(Array.isArray(hs.ledger)&&hs.ledger.length<10000&&Array.isArray(hs.scheduled)&&hs.scheduled.length<1000,'Journal historique invalide.');
      assert(hs.flags&&Object.values(hs.flags).every(v=>typeof v==='boolean'),'Drapeaux historiques invalides.');
      for(const j of hs.scheduled)assert(Number.isInteger(j.day)&&j.day>=0&&Array.isArray(j.actions),'Calendrier diplomatique invalide.');
      return true;
    }
    // The geography is unchanged from 1.1.0. geoKeys are independent of the array
    // order, so a future pure permutation can be loaded without destroying a game.
    // Geometry alterations are intentionally refused without an explicit migration.
    normalizeGeography(state){
      const expected=this.prov.map(p=>p.geoKey);
      if(!state.geoKeys){
        // 1.1.0 state: exact same mapId, province order and geometry as this build.
        state.geoKeys=expected;
        state.geoOrderFingerprint=this.world.geoOrderFingerprint;
        return;
      }
      assert(Array.isArray(state.geoKeys)&&state.geoKeys.length===expected.length,
        'Sauvegarde : liste géographique invalide.');
      const positions=new Map(expected.map((key,i)=>[key,i]));
      const permutation=state.geoKeys.map(key=>positions.get(key));
      assert(permutation.every(n=>Number.isInteger(n))&&new Set(permutation).size===expected.length,
        'Le découpage des provinces a changé : une migration géographique explicite est nécessaire.');
      if(permutation.some((dest,src)=>dest!==src)){
        const index=id=>{
          assert(Number.isInteger(id)&&id>=0&&id<permutation.length,
            'Référence de province invalide durant la migration.');
          return permutation[id];
        };
        const old=state.provinces;
        state.provinces=new Array(old.length);
        old.forEach((p,i)=>{state.provinces[permutation[i]]=p;});
        for(const country of Object.values(state.countries||{})){
          const identity=country.identity;
          identity.capital=index(identity.capital);
          for(const field of ['provinces','cores'])if(Array.isArray(identity[field]))
            identity[field]=identity[field].map(index);
          for(const project of country.build||[])project.pid=index(project.pid);
          for(const trainee of country.training||[])trainee.pid=index(trainee.pid);
        }
        for(const u of state.units||[]){u.pid=index(u.pid);u.path=u.path.map(index);}
        for(const a of state.armies||[]){
          if(a.objective!==null&&a.objective!==undefined)a.objective=index(a.objective);
          if(Array.isArray(a.frontSelection))a.frontSelection=a.frontSelection.map(index);
        }
        for(const w of state.wings||[])w.base=index(w.base);
        for(const f of state.fleets||[])f.base=index(f.base);
        for(const b of state.battles||[])if(b.pid!==undefined)b.pid=index(b.pid);
        for(const history of [state.navalReports,state.airReports,state.battleHistory,state.combatLedger])
          if(Array.isArray(history))for(const report of history){
            if(Number.isInteger(report.pid))report.pid=index(report.pid);
            if(Number.isInteger(report.targetProvince))report.targetProvince=index(report.targetProvince);
          }
        if(state.historyState?.dmz)state.historyState.dmz=state.historyState.dmz.map(index);
        // Calculated transient front caches are rebuilt from the new order.
        state.fronts={};state.battles=[];
        state.revision=(state.revision||0)+1;
      }
      state.geoKeys=expected;
      state.geoOrderFingerprint=this.world.geoOrderFingerprint;
    }
    save(){this.checkInvariants();return clone(this.s);}
    load(raw) {
      raw=clone(raw);assert(raw&&[2,3,4,5].includes(raw.version),'Version de sauvegarde incompatible.');
      assert(raw.mapId===this.world.mapId,'Cette sauvegarde utilise une autre carte : les parties commenc\u00e9es avant la version 1.7 (3 396 provinces) ne peuvent pas \u00eatre ouvertes sur la carte d\u00e9taill\u00e9e.');const migrating=raw.version<5;raw.version=5;
      raw.combatLedger??=[];raw.pocketSummary??={};
      for(const a of raw.armies||[])a.tactic??='balanced';
      for(const u of raw.units||[])u.pocketed??=false;
      for(const c of Object.values(raw.countries||{})){for(const k of ['cruisers','battleships','carriers']){if(c.stock)c.stock[k]??=0;if(c.allocation)c.allocation[k]??=0;if(c.efficiency)c.efficiency[k]??=.45;}}
      const size=JSON.stringify(raw).length;assert(size<18000000,'Sauvegarde trop volumineuse.');Engine.safeObject(raw);
      this.normalizeGeography(raw);
      const oldCatalog=this.catalog;this.catalog=clone(this.baseCatalog);
      try{const mod=Engine.validateMod(raw.mod,this.vanillaWorld||this.world,this.catalog);this.applyModCatalog(mod);this.checkInvariants(raw);this.s=clone(raw);this.s.mod=mod;this.s.paused=true;this.initializeRelease({},true);this.indexUnits();this.checkInvariants();return this.s;}catch(e){this.catalog=oldCatalog;throw e;}
    }
    applyModCatalog(mod){
      if(mod.technologies?.length)this.catalog.techs.push(...clone(mod.technologies));
      if(mod.focus)for(const [id,tree] of Object.entries(mod.focus))this.catalog.focus[id]=clone(tree);
    }
    static safeObject(obj,depth=0){
      assert(depth<32,'Imbrication excessive.');
      if(typeof obj==='number')assert(Number.isFinite(obj),'Nombre non fini.');
      if(typeof obj==='string')assert(obj.length<1500000,'Texte excessif.');
      if(obj&&typeof obj==='object')for(const [k,v] of Object.entries(obj)){assert(!['__proto__','prototype','constructor'].includes(k),'Cl\u00e9 interdite.');Engine.safeObject(v,depth+1);}
    }
    static mergePacks(packs,world,catalog){
      assert(Array.isArray(packs)&&packs.length>=1&&packs.length<=6,'Un empilement contient de 1 \u00e0 6 paquets.');
      const merged={id:'stack',name:'',balance:{production:1,research:1,combat:1},events:[],technologies:[],countries:{},focus:{},components:[]};
      const seen=new Set();
      for(const pack of packs){
        assert(pack&&typeof pack==='object'&&!pack.packs,'Les empilements imbriqu\u00e9s ne sont pas accept\u00e9s.');
        const clean=Engine.validateMod(pack,world,catalog);assert(!seen.has(clean.id),'Paquet dupliqu\u00e9 : '+clean.id);seen.add(clean.id);
        merged.components.push(...(clean.components||[clean.name]));
        for(const k in merged.balance)merged.balance[k]*=clean.balance[k];
        merged.events.push(...clean.events);merged.technologies.push(...(clean.technologies||[]));
        for(const [id,patch] of Object.entries(clean.countries||{})){
          const current=merged.countries[id]||{};
          for(const [key,value] of Object.entries(patch)){
            if(key==='bonus'){current.bonus??={};for(const [effect,n] of Object.entries(value)){current.bonus[effect]=(current.bonus[effect]||0)+n;}}
            else {assert(current[key]===undefined||current[key]===value,'Conflit de mods : '+id+'.'+key);current[key]=value;}
          }
          merged.countries[id]=current;
        }
        for(const [id,tree] of Object.entries(clean.focus||{})){assert(!merged.focus[id],'Deux mods remplacent le m\u00eame arbre : '+id);merged.focus[id]=tree;}
      }
      merged.id='stack_'+[...seen].join('_').slice(0,65);merged.name=merged.components.join(' + ').slice(0,100);
      if(!merged.technologies.length)delete merged.technologies;
      if(!Object.keys(merged.countries).length)delete merged.countries;
      if(!Object.keys(merged.focus).length)delete merged.focus;
      return Engine.validateMod(merged,world,catalog);
    }
    static validateMod(raw,world,catalog) {
      if(raw?.packs)return Engine.mergePacks(raw.packs,world,catalog);
      if(!raw)return {id:'base',name:'1936 standard',version:1,balance:{production:1,research:1,combat:1},events:[]};
      Engine.safeObject(raw);assert(typeof raw==='object'&&!Array.isArray(raw),'Le mod doit \u00eatre un objet JSON.');
      assert(JSON.stringify(raw).length<1000000,'Mod trop volumineux.');
      const out={id:String(raw.id||'custom').slice(0,80),name:String(raw.name||'Mod personnalis\u00e9').slice(0,100),version:1,balance:{production:1,research:1,combat:1},events:[]};
      if(raw.components){assert(Array.isArray(raw.components)&&raw.components.length<=24,'Trop de composants.');out.components=raw.components.map(x=>String(x).slice(0,100));}
      for(const k in out.balance)if(raw.balance?.[k]!==undefined){assert(finite(raw.balance[k],.25,4),'Multiplicateur invalide : '+k);out.balance[k]=raw.balance[k];}
      const effects=new Set(['pp','stability','support','manpower','xp','civ','mil','dock','slots','tension','fuel',...Object.keys(catalog.equipment),'attack','defense','production','construction','research','supply','planning','speed','armor','piercing','air','bombing','navy','raiding','intel','buildingSlots','recruitment','ppGain','consumer','organization','airDefense','invasion','paradrop','reliability','attrition','breakthrough','entrench','mines','convoy','naval','casualties','resources','stabilityGrowth','supportGrowth','surrender']);
      const checkEffect=e=>{assert(e&&typeof e==='object'&&!Array.isArray(e),'Effet invalide.');for(const [k,v] of Object.entries(e)){assert(effects.has(k)&&finite(v,-1e6,1e6),'Effet interdit ou invalide : '+k);if(['attack','defense','production','construction','research','supply','planning','speed','armor','piercing','air','bombing','navy','raiding','intel','buildingSlots','recruitment','ppGain','consumer','organization','airDefense','invasion','paradrop','reliability','attrition','breakthrough','entrench','mines','convoy','naval','casualties','resources','stabilityGrowth','supportGrowth','surrender'].includes(k))assert(v>=-.5&&v<=2,'Bonus de mod compris entre -0.5 et 2 requis.');if(['civ','mil','dock','slots'].includes(k))assert(Number.isInteger(v)&&v>=0&&v<=20,'B\u00e2timent ou emplacement invalide.');}};
      const ids=new Set(world.countries.map(c=>c.id));
      assert(!raw.events||Array.isArray(raw.events)&&raw.events.length<=200,'Maximum : 200 \u00e9v\u00e9nements.');
      const eventIds=new Set(catalog.historicalEvents.map(e=>e.id));
      for(const [i,e] of (raw.events||[]).entries()){
        assert(Number.isInteger(e.day)&&e.day>=1&&e.day<=20000,'Date d\u2019\u00e9v\u00e9nement invalide.');const country=e.country||'player';assert(country==='player'||ids.has(country),'Pays d\u2019\u00e9v\u00e9nement inconnu.');
        assert(Array.isArray(e.choices)&&e.choices.length>=1&&e.choices.length<=5,'Un \u00e9v\u00e9nement doit avoir 1 \u00e0 5 choix.');
        const eid=String(e.id||out.id+'_'+i);assert(!eventIds.has(eid),'Identifiant d\u2019\u00e9v\u00e9nement dupliqu\u00e9.');eventIds.add(eid);
        const choices=e.choices.map(choice=>{checkEffect(choice.effect||{});return {text:String(choice.text||'Continuer').slice(0,250),effect:clone(choice.effect||{})};});
        out.events.push({id:eid,day:e.day,country,title:String(e.title||'\u00c9v\u00e9nement').slice(0,200),text:String(e.text||'').slice(0,4000),choices});
      }
      if(raw.countries){out.countries={};for(const [id,p] of Object.entries(raw.countries)){assert(ids.has(id),'Pays de mod inconnu.');const entry={};for(const k of ['name','leader'])if(p[k])entry[k]=String(p[k]).slice(0,100);if(p.color){assert(/^#[0-9a-f]{6}$/i.test(p.color),'Couleur invalide.');entry.color=p.color;}if(p.ideology){assert(['democratic','communist','fascist','authoritarian'].includes(p.ideology),'Id\u00e9ologie invalide.');entry.ideology=p.ideology;}if(p.bonus){checkEffect(p.bonus);entry.bonus=clone(p.bonus);}out.countries[id]=entry;}}
      if(raw.technologies){assert(Array.isArray(raw.technologies)&&raw.technologies.length<=80,'Trop de technologies.');const techIds=new Set(catalog.techs.map(t=>t.id));out.technologies=[];for(const t of raw.technologies){assert(typeof t.id==='string'&&!techIds.has(t.id),'Identifiant de technologie dupliqu\u00e9.');assert(Number.isInteger(t.year)&&t.year>=1900&&t.year<=2100&&finite(t.days,10,2000),'Recherche invalide.');assert(Array.isArray(t.req)&&t.req.every(k=>techIds.has(k)),'Pr\u00e9requis de technologie inconnus ou cycliques.');checkEffect(t.effect||{});techIds.add(t.id);out.technologies.push({id:t.id,name:String(t.name).slice(0,100),group:String(t.group||'mod').slice(0,40),year:t.year,days:t.days,req:clone(t.req),effect:clone(t.effect||{})});}}
      if(raw.focus){out.focus={};for(const [id,tree] of Object.entries(raw.focus)){assert(ids.has(id)||id==='generic','Arbre pour pays inconnu.');assert(Array.isArray(tree)&&tree.length<=60&&tree.length>0,'Arbre invalide.');const keys=new Set();const result=[];for(const f of tree){assert(typeof f.id==='string'&&!keys.has(f.id),'Priorit\u00e9 dupliqu\u00e9e.');assert(Array.isArray(f.req)&&f.req.every(r=>keys.has(r)),'Pr\u00e9requis inconnus ou cycliques.');assert(finite(f.days,1,1000)&&Number.isInteger(f.col)&&f.col>=0&&f.col<=5&&Number.isInteger(f.row)&&f.row>=0&&f.row<=20,'Position ou dur\u00e9e invalide.');checkEffect(f.effect||{});keys.add(f.id);result.push({id:f.id,name:String(f.name).slice(0,100),days:f.days,req:clone(f.req),effect:clone(f.effect||{}),col:f.col,row:f.row,exclusive:f.exclusive||null});}for(const f of result)assert(!f.exclusive||keys.has(f.exclusive),'Branche exclusive inconnue.');out.focus[id]=result;}}
      return out;
    }
    // ---- 1.0 single-player campaign systems ----
    // ---- History 1.1: canonical dates, conditional decisions, territorial treaties ----
    riverAttackFactor(unit,target) {const key=[unit.pid,target].sort((a,b)=>a-b).join(':');return this.world.riverCrossings?.[key]?(unit.template.engineer?.88:.72):1;}
    historyRegion(id) {return this.world.historicalRegions?.find(r=>r.id===id)?.provinces||[];}
    historyRecord(event,status,choice=null,reason='') {
      const h=this.s.historyState;if(!h)return;
      const id=event.parentId||event.id;let row=h.ledger.find(x=>x.id===id);
      const data={id,date:event.date||null,day:this.s.day,status,choice,reason};
      if(row)Object.assign(row,data);else h.ledger.push(data);
    }
    historyConditionReason(e) {
      const c=e.conditions||{},h=this.s.historyState;
      for(const id of c.alive||[])if(!this.nation(id)?.alive)return this.info(id)?.name+' n\u2019est plus un \u00c9tat actif.';
      for(const [id,ideology] of Object.entries(c.ideology||{}))if(this.nation(id)?.ideology!==ideology)return 'Le r\u00e9gime politique a chang\u00e9.';
      for(const [a,b] of c.wars||[])if(!this.war(a,b))return 'La guerre requise n\u2019a pas lieu.';
      for(const [a,b] of c.peace||[])if(this.war(a,b))return 'Une guerre rend le sc\u00e9nario diplomatique caduc.';
      for(const [a,b] of c.notAllies||[])if(this.allies(a,b))return 'Les pays sont devenus alli\u00e9s.';
      for(const [key,value] of Object.entries(c.flags||{}))if(h.flags[key]!==value)return 'Une d\u00e9cision ant\u00e9rieure a modifi\u00e9 cette trajectoire.';
      const country=e.country==='player'?this.s.player:e.country;
      for(const [key,value] of Object.entries(c.identity||{}))if(this.info(country)?.[key]!==value)return 'La succession historique ne correspond plus au gouvernement.';
      if(e.kind==='government'&&this.s.mod.countries?.[country]?.leader)return 'L\u2019identit\u00e9 du dirigeant est remplac\u00e9e par le mod.';
      if(c.pressure){const n=this.nation(c.pressure);if(!n||!this.enemies(c.pressure).length||n.stats.vpHeld>.94&&n.casualties<15000)return 'La pression militaire requise n\u2019est pas atteinte.';}
      if(c.capitalEnemy){const n=this.nation(c.capitalEnemy),owner=this.s.provinces[n.identity.capital]?.ctrl;if(!this.war(c.capitalEnemy,owner))return 'La capitale n\u2019est pas occup\u00e9e par un ennemi.';}
      return '';
    }
    historyBlocked(id,pid) {return id==='GER'&&(this.s.historyState?.dmz||[]).includes(pid)&&!this.enemies('GER').length;}
    initializeHistory(options={}) {
      const bookmark=this.catalog.bookmarks?.find(b=>b.id===(options.scenario||'1936'));
      assert(bookmark,'Point de d\u00e9part inconnu.');
      assert(!bookmark.unavailable.includes(this.s.player),'Ce pays n\u2019est pas ind\u00e9pendant dans le point de d\u00e9part 1939. Choisissez 1936.');
      this.s.historyState={version:1,scenario:bookmark.id,startDay:bookmark.day,flags:{},ledger:[],scheduled:[],territoryLog:[],dmz:bookmark.id==='1936'&&this.s.historical?[...this.historyRegion('rhineland')]:[],bootstrap:false};
      const h=this.s.historyState;
      this.nation('FRA').identity.headOfState='Albert Lebrun';
      this.nation('ITA').identity.headOfState='Victor-Emmanuel III';
      this.nation('JPN').identity.headOfState='Hirohito';
      this.nation('TIB').identity.description='Autonomie de fait ; statut historique et limites contest\u00e9s. Reconstruction sch\u00e9matique.';
      if(bookmark.id==='1939') {
        h.bootstrap=true;
        // A bookmark is an authored initial state, NOT a secretly simulated victorious campaign.
        for(const e of this.catalog.historicalEvents.filter(e=>e.day<=bookmark.day&&e.bookmark)) {
          this.s.day=e.day;
          if(e.kind==='government'&&!this.nation(e.country)?.alive)continue;
          if(this.historyConditionReason(e))continue;
          this.historyChoice(e.country,e,0,true);
          this.historyScheduled(true);
        }
        this.s.day=bookmark.day;this.historyScheduled(true);
        for(const [a,b] of [['ITA','ETH'],['ITA','ALB']])if(this.nation(b)?.alive)this.annex(a,b);
        const sp=this.nation('SPA');sp.identity.leader='Francisco Franco';sp.identity.wiki='Francisco Franco';sp.identity.role='Chef de l\u2019\u00c9tat';sp.ideology='fascist';sp.parties={democratic:8,communist:5,fascist:70,authoritarian:17};
        h.flags.albania_invasion=true;
        // Date-correct prime minister; head of state remains Hirohito.
        this.nation('JPN').identity.cabinet='Nobuyuki Abe';
        this.nation('FRA').identity.cabinet='\u00c9douard Daladier';
        this.nation('RAJ').identity.leader='Victor Hope';this.nation('RAJ').identity.wiki='Victor Hope, 2nd Marquess of Linlithgow';
        this.nation('AST').identity.leader='Robert Menzies';this.nation('AST').identity.wiki='Robert Menzies';
        this.nation('EGY').identity.leader='Farouk';this.nation('EGY').identity.wiki='Farouk of Egypt';
        this.nation('TUR').identity.leader='\u0130smet \u0130n\u00f6n\u00fc';this.nation('TUR').identity.wiki='\u0130smet \u0130n\u00f6n\u00fc';
        this.nation('FIN').identity.leader='Ky\u00f6sti Kallio';this.nation('FIN').identity.wiki='Ky\u00f6sti Kallio';
        this.nation('BEL').identity.cabinet='Hubert Pierlot';
        // Operational reconstruction of the Chinese front, explicitly marked as approximate.
        for(const p of this.prov)if(p.owner==='CHI'&&((p.x>115&&p.x<120&&p.y>36.5&&p.y<40.8)||(p.x>118&&p.x<122&&p.y>29.6&&p.y<33.2)||(p.x>113&&p.x<115.5&&p.y>29&&p.y<31.2)||(p.x>112.7&&p.x<114.4&&p.y>22&&p.y<23.8)))this.s.provinces[p.id].ctrl='JPN';
        const cq=this.owned('CHI').reduce((a,p)=>distance(p,{x:106.55,y:29.56})<distance(a,{x:106.55,y:29.56})?p:a);
        Object.assign(this.nation('CHI').identity,{capital:cq.id,capitalName:'Chongqing',lon:106.55,lat:29.56});
        h.bootstrap=false;
        for(const e of this.catalog.historicalEvents.filter(e=>e.day<=bookmark.day)){
          if(!this.s.seenEvents.includes(e.id))this.s.seenEvents.push(e.id);
          if(!h.ledger.some(r=>r.id===e.id))this.historyRecord(e,'bookmark',null,'Rep\u00e8re ant\u00e9rieur au point de d\u00e9part.');
        }
        for(const c of Object.values(this.s.countries)) {
          const initial=this.catalog.techs.filter(t=>t.year<=1938&&t.req.length===0).slice(0,6);
          for(const t of initial)if(!c.tech.includes(t.id)){c.tech.push(t.id);this.effect(c.identity.id,t.effect);}
        }
        this.repairHistoryPositions(true);this.s.pending=null;this.s.eventQueue=[];
      }
      for(const u of this.s.units)if(this.historyBlocked(u.owner,u.pid)) {
        const p=this.owned(u.owner).filter(p=>!h.dmz.includes(p.id)).sort((a,b)=>distance(a,this.prov[u.pid])-distance(b,this.prov[u.pid]))[0];
        if(p){u.pid=p.id;u.path=[];}
      }
      this.updateStats();for(const id of this.active())this.defaultProduction(id);
      this.log('Atlas 1.1 : '+bookmark.date+'. Les fronti\u00e8res corrig\u00e9es sont des reconstructions document\u00e9es, pas un atlas cadastral.','tip');
    }
    historyScheduled(force=false) {
      const h=this.s.historyState;if(!h)return;
      const due=h.scheduled.filter(j=>j.day<=this.s.day);
      h.scheduled=h.scheduled.filter(j=>j.day>this.s.day);
      for(const j of due){this.applyHistoryActions(j.actions,j.eventId);this.log('Application du calendrier diplomatique : '+(this.catalog.historicalEvents.find(e=>e.id===j.eventId)?.title||j.eventId),'event');}
    }
    historyAffected(actions) {
      const result=new Set();
      for(const a of actions||[]) {
        if(a.type==='annex')result.add(a.loser);
        if(a.type==='transfer')result.add(a.fromCountry);
        if(a.type==='czechPartition')result.add('CZE');
        if(a.type==='schedule')for(const id of this.historyAffected(a.actions))result.add(id);
      }
      return result;
    }
    historyChoice(country,event,index,bootstrap=false) {
      const choice=event.choices[index];assert(choice,'Choix historique invalide.');
      const h=this.s.historyState;
      if(event.historyResponse) {
        if(index===0) {
          this.applyHistoryActions(event.proposal.actions,event.parentId);
          this.effect(event.aggressor,event.proposal.effect||{});
          Object.assign(h.flags,event.proposal.flags||{});
          this.historyRecord(event,'applied','Accord accept\u00e9');
        } else {
          for(const key of Object.keys(event.proposal.flags||{}))h.flags[key]=false;
          this.applyHistoryActions([ {type:'war',a:event.aggressor,b:country,callAllies:false} ],event.parentId);
          this.historyRecord(event,'diverged','Ultimatum refus\u00e9');
        }
        this.updateStats();this.repairHistoryPositions();this.log(event.title+' : '+choice.text,'event');return;
      }
      const reason=this.historyConditionReason(event);
      if(reason&&!bootstrap){this.historyRecord(event,'cancelled',null,reason);this.log(event.title+' : d\u00e9cision devenue caduque. '+reason,'event');return;}
      const affected=this.historyAffected(choice.actions);
      if(!bootstrap&&country!==this.s.player&&affected.has(this.s.player)&&this.nation(this.s.player)?.alive) {
        const response={history:true,historyResponse:true,id:event.id+'_response',parentId:event.id,date:event.date,day:event.day,aggressor:country,title:event.title+' : votre r\u00e9ponse',historicalText:event.historicalText,sourceIds:event.sourceIds,region:event.region,text:'Votre territoire est vis\u00e9. Accepter applique les cessions indiqu\u00e9es ; refuser ouvre une branche de r\u00e9sistance arm\u00e9e. Une annexion compl\u00e8te met fin \u00e0 votre ind\u00e9pendance.',proposal:clone(choice),choices:[{text:'Accepter les conditions territoriales',effect:{}},{text:'Refuser et r\u00e9sister (uchronie)',effect:{}}]};
        this.s.eventQueue.push({country:this.s.player,event:response});this.historyRecord(event,'offered',null,'Ultimatum soumis au joueur.');return;
      }
      this.applyHistoryActions(choice.actions||[],event.id);
      this.effect(country,choice.effect||{});Object.assign(h.flags,choice.flags||{});
      this.historyRecord(event,bootstrap?'bookmark':index===0?'applied':'diverged',choice.text);
      this.log(event.title+' : '+choice.text,'event');
      this.updateStats();this.repairHistoryPositions();
    }
    transferHistoryRegion(region,from,to,eventId) {
      if(!this.nation(to)?.alive)return 0;
      let count=0;
      for(const pid of this.historyRegion(region)){
        const st=this.s.provinces[pid];if(st.ctrl!==from)continue;
        st.ctrl=to;st.compliance=35;st.resistance=5;count++;
      }
      if(count)this.s.historyState.territoryLog.push({day:this.s.day,region,from,to,count,eventId});
      this.frontCache={};return count;
    }
    releaseHistoryCountry(id,name,owner,pids,fields={}) {
      if(this.nation(id))return this.nation(id);
      const eligible=pids.filter(pid=>this.s.provinces[pid].ctrl===owner);if(!eligible.length)return null;
      const parent=this.nation(owner),d=clone(parent.identity),target=fields.position||{x:this.prov[eligible[0]].x,y:this.prov[eligible[0]].y};
      const capital=eligible.map(i=>this.prov[i]).sort((a,b)=>distance(a,target)-distance(b,target))[0];
      Object.assign(d,{id,name,capital:capital.id,capitalName:fields.capitalName||capital.name,lon:target.x,lat:target.y,provinces:eligible,cores:eligible,commanders:[],divisions:0,civ:0,mil:0,fleet:0,air:0,manpower:50000,color:fields.color||'#969075',faction:fields.faction||'none'},fields);
      delete d.position;
      const c=this.createNation(d);c.subject=fields.subject||null;this.s.countries[id]=c;
      for(const key of Object.keys(c.stock)){c.stock[key]=(parent.stock[key]||0)*.15;parent.stock[key]=Math.max(0,(parent.stock[key]||0)-c.stock[key]);}
      for(const pid of eligible){this.s.provinces[pid].ctrl=id;this.s.provinces[pid].resistance=0;}
      const transferred=this.units(owner).filter(u=>eligible.includes(u.pid));
      if(transferred.length){const a=this.addArmy(id);for(const u of transferred){u.owner=id;u.army=a.id;u.path=[];}}
      this.frontCache={};this.updateStats();this.defaultProduction(id);return c;
    }
    franceHistoryArmistice(vichy=true) {
      const c=this.nation('FRA');if(!c?.alive||!this.nation('GER')?.alive)return;
      const metro=this.prov.filter(p=>p.owner==='FRA'&&p.x>-6&&p.x<10&&p.y>41&&p.y<52).map(p=>p.id);
      const colonies=this.owned('FRA').filter(p=>!metro.includes(p.id));
      if(!colonies.length)return;
      const south=this.historyRegion('south_france');
      // De facto division is approximate; never overwrite the territory of an unrelated third state.
      for(const pid of metro)if(['FRA','GER'].includes(this.s.provinces[pid].ctrl))this.s.provinces[pid].ctrl='GER';
      if(vichy){
        for(const pid of south)if(this.s.provinces[pid].ctrl==='GER')this.s.provinces[pid].ctrl='FRA';
        this.releaseHistoryCountry('VIC','\u00c9tat fran\u00e7ais','FRA',south,{leader:'Philippe P\u00e9tain',wiki:'Philippe P\u00e9tain',role:'Chef de l\u2019\u00c9tat',ideology:'authoritarian',subject:'GER',capitalName:'Vichy',position:{x:3.43,y:46.13},color:'#859190'});
      }
      const capital=colonies.sort((a,b)=>distance(a,{x:15.28,y:-4.27})-distance(b,{x:15.28,y:-4.27}))[0];
      Object.assign(c.identity,{name:'France libre',leader:'Charles de Gaulle',wiki:'Charles de Gaulle',role:'Chef de la France libre',cabinet:'Comit\u00e9 de la France libre',capital:capital.id,capitalName:capital.name,lon:capital.x,lat:capital.y,cores:colonies.map(p=>p.id),exile:true});
      c.faction=this.nation('GBR').faction==='none'?'Alli\u00e9s':this.nation('GBR').faction;
      for(const u of this.units('FRA'))if(metro.includes(u.pid)){u.pid=capital.id;u.path=[];u.org=Math.min(u.org,45);}
      this.s.historyState.flags.france_armistice=true;this.s.outcome=null;
      this.log('La France libre poursuit la guerre depuis l\u2019Empire. La partition m\u00e9tropolitaine est une reconstruction de jeu.','war');
    }
    repairHistoryPositions(force=false) {
      for(const u of this.s.units){
        const owner=this.s.provinces[u.pid]?.ctrl;
        if(this.nation(u.owner)?.alive&&(force&&owner!==u.owner||!this.access(u.owner,owner)&&!this.war(u.owner,owner))){
          const lands=this.owned(u.owner);if(lands.length){lands.sort((a,b)=>distance(a,this.prov[u.pid])-distance(b,this.prov[u.pid]));u.pid=lands[0].id;u.path=[];u.progress=0;}
        }
      }
      for(const w of this.s.wings)if(this.nation(w.owner)?.alive&&!this.access(w.owner,this.s.provinces[w.base].ctrl)){w.base=this.cap(w.owner);w.mission='reserve';}
      for(const f of this.s.fleets)if(this.nation(f.owner)?.alive&&!this.access(f.owner,this.s.provinces[f.base].ctrl)){
        const port=this.owned(f.owner).find(p=>p.port);if(port){f.base=port.id;f.zone=port.seaZone;f.mission='port';}
      }
      this.indexUnits();
    }
    applyHistoryActions(actions,eventId='history') {
      for(const a of actions||[]) {
        switch(a.type){
          case 'schedule':this.s.historyState.scheduled.push({day:Math.max(a.day,this.s.day),actions:clone(a.actions),eventId});break;
          case 'demilitarize':this.s.historyState.dmz=a.active?[...this.historyRegion('rhineland')]:[];break;
          case 'government':if(this.nation(a.country)?.alive)Object.assign(this.nation(a.country).identity,clone(a.fields));break;
          case 'ideology':if(this.nation(a.country)?.alive){const c=this.nation(a.country);c.ideology=a.value;for(const k in c.parties)c.parties[k]=k===a.value?70:10;}break;
          case 'nonbelligerent':if(this.nation(a.country))this.nation(a.country).nonBelligerent=!!a.active;break;
          case 'faction':if(this.nation(a.country)?.alive){
            const old=this.nation(a.country).faction;this.nation(a.country).faction=a.name;
            if(a.country==='GBR'&&old==='Commonwealth')for(const id of ['CAN','AST','NZL','SAF','RAJ'])if(this.nation(id)?.faction===old)this.nation(id).faction=a.name;
            if(a.country==='GER')for(const id of ['SLO'])if(this.nation(id)?.subject==='GER')this.nation(id).faction=a.name;
          }break;
          case 'guarantee':if(this.nation(a.country)?.alive&&this.nation(a.target)?.alive&&!this.nation(a.country).guarantees.includes(a.target))this.nation(a.country).guarantees.push(a.target);break;
          case 'pact':if(this.nation(a.a)?.alive&&this.nation(a.b)?.alive&&!this.war(a.a,a.b))for(const [x,y] of [[a.a,a.b],[a.b,a.a]]){this.nation(x).pacts=this.nation(x).pacts.filter(p=>p.target!==y);this.nation(x).pacts.push({target:y,until:this.s.day+a.days});}break;
          case 'breakPact':for(const [x,y] of [[a.a,a.b],[a.b,a.a]])if(this.nation(x))this.nation(x).pacts=this.nation(x).pacts.filter(p=>p.target!==y);break;
          case 'war':if(this.nation(a.a)?.alive&&this.nation(a.b)?.alive&&!this.war(a.a,a.b)&&!this.allies(a.a,a.b)&&!this.nation(a.a).pacts.some(p=>p.target===a.b&&p.until>this.s.day))this.declareWar(a.a,a.b,true,!!a.callAllies);break;
          case 'peace':this.s.wars=this.s.wars.filter(w=>!(w.a===a.a&&w.b===a.b||w.a===a.b&&w.b===a.a));this.frontCache={};this.repairHistoryPositions();break;
          case 'annex':if(this.nation(a.winner)?.alive&&this.nation(a.loser)?.alive&&!this.allies(a.winner,a.loser))this.annex(a.winner,a.loser);break;
          case 'transfer':this.transferHistoryRegion(a.region,a.fromCountry,a.toCountry,eventId);break;
          case 'civilWar':if(this.nation(a.country)?.alive)this.civilWar(a.country);break;
          case 'czechPartition':if(this.nation('CZE')?.alive&&this.nation('GER')?.alive){
            this.releaseHistoryCountry('SLO','Slovaquie','CZE',this.historyRegion('slovakia'),{leader:'Jozef Tiso',wiki:'Jozef Tiso',role:'Chef du gouvernement',ideology:'authoritarian',subject:'GER',capitalName:'Bratislava',position:{x:17.11,y:48.15}});
            this.transferHistoryRegion('ruthenia','CZE','HUN',eventId);this.annex('GER','CZE');
          }break;
          case 'franceArmistice':this.franceHistoryArmistice(a.vichy);break;
          case 'operation':if(this.nation(a.country)?.alive&&this.nation(a.target)?.alive&&this.war(a.country,a.target)){
            for(const army of this.s.armies.filter(x=>x.owner===a.country)){army.target=a.target;army.order='attack';army.auto=true;army.stance='balanced';}
          }break;
          case 'airOperation':for(const w of this.s.wings.filter(w=>w.owner===a.country&&w.kind==='fighters')){w.zone=a.zone;w.mission=a.mission;}break;
          case 'aid':if(this.nation(a.fromCountry)?.alive&&this.nation(a.toCountry)?.alive){const amount=Math.min(a.amount,this.nation(a.fromCountry).stock[a.equipment]||0);this.nation(a.fromCountry).stock[a.equipment]-=amount;this.nation(a.toCountry).stock[a.equipment]+=amount;}break;
          case 'pacificRaid':for(const f of this.s.fleets.filter(f=>f.owner==='USA'&&['NPAC','JAPANSEA','SPAC','CORAL'].includes(f.zone))){this.fleetLoss(f,Math.min(4,sum(Object.values(f.ships))*.15));}break;
          case 'torch':{const target=this.nation('VIC')?.alive?'VIC':'GER';this.applyHistoryActions([ {type:'war',a:'USA',b:target}, {type:'operation',country:'USA',target} ],eventId);}break;
          case 'overlord':{
            const coast=this.historyRegion('north_france').map(i=>this.prov[i]).filter(p=>p.port&&this.s.provinces[p.id].ctrl==='GER');
            if(coast.length)for(const army of this.s.armies.filter(x=>['GBR','USA'].includes(x.owner)&&this.war(x.owner,'GER')).slice(0,6)){army.target='GER';army.order='attack';army.auto=true;army.objective=coast[0].id;}
          }break;
          default:throw Error('Action historique inconnue : '+a.type);
        }
      }
    }
    historicalStep() {
      const h=this.s.historyState;if(!h||!this.s.historical)return;
      this.historyScheduled();
      for(const e of this.catalog.historicalEvents){
        if(e.day>this.s.day||this.s.seenEvents.includes(e.id))continue;
        if(e.kind==='information'){
          this.s.seenEvents.push(e.id);this.historyRecord(e,'documentary');continue;
        }
        const reason=this.historyConditionReason(e);
        if(reason){if(this.s.day>e.day+e.windowDays){this.s.seenEvents.push(e.id);this.historyRecord(e,'skipped',null,reason);}continue;}
        const country=e.country==='player'?this.s.player:e.country;
        if(!this.nation(country)?.alive)continue;
        this.s.seenEvents.push(e.id);
        if(country===this.s.player&&e.kind==='decision'){
          this.s.eventQueue.push({country,event:clone(e)});this.historyRecord(e,'queued');
        }else this.historyChoice(country,e,0);
      }
      // The secret protocol is not an instant annexation of a still resisting Poland.
      if(h.flags.partition_poland&&!this.nation('POL')?.alive&&h.flags.molotov&&!this.war('GER','SOV'))this.transferHistoryRegion('eastern_poland','GER','SOV','h_soviet_poland');
      // Return the capital after an actual liberation, not because a calendar date is reached.
      const f=this.nation('FRA');const paris=this.defs.FRA.capital;
      if(f?.alive&&f.identity.exile&&this.s.provinces[paris].ctrl==='FRA'){
        Object.assign(f.identity,{name:'R\u00e9publique fran\u00e7aise',capital:paris,capitalName:'Paris',lon:2.35,lat:48.86,cores:this.defs.FRA.provinces,exile:false});this.log('Le gouvernement fran\u00e7ais revient \u00e0 Paris apr\u00e8s sa lib\u00e9ration.','success');
      }
      this.updateStats();this.indexUnits();
    }

    initializeRelease(options={},migrated=false) {
      const s=this.s;s.version=5;s.release='1.3.1';s.geoKeys??=this.prov.map(p=>p.geoKey);s.geoOrderFingerprint=this.world.geoOrderFingerprint;s.groups??=[];s.battleHistory??=[];s.combatLedger??=[];s.pocketSummary??={};
      s.tutorial??={dismissed:false,completed:[]};
      for(const [id,c] of Object.entries(s.countries)) {
        for(const key in this.catalog.equipment){c.stock[key]??=0;c.allocation[key]??=0;c.efficiency[key]??=.45;}
        c.warFatigue??=0;c.lastLosses??=c.casualties;c.advisor??=null;
        c.achievements??=[];c.politicalCooldown??=0;
        this.ensureGovernance(id,c);
      }
      for(const a of s.armies){a.group??=null;a.objective??=null;a.frontSelection??=[];a.reserveRatio??=.15;a.tactic??='balanced';a.assessment??={status:'En attente'};}
      for(const u of s.units)u.pocketed??=false;
      for(const f of s.fleets){for(const k of ['cruisers','battleships','carriers'])f.ships[k]??=0;f.reinforce??=false;}
      if(!migrated){
        for(const f of s.fleets){const d=this.info(f.owner),c=this.nation(f.owner);
          f.ships.cruisers=Math.floor((d.fleet||0)/18);
          f.ships.battleships=Math.floor((d.fleet||0)/35);
          f.ships.carriers=['GBR','USA','JPN'].includes(f.owner)?2:0;
          c.stock.cruisers=Math.floor(f.ships.cruisers/2);c.stock.battleships=0;c.stock.carriers=0;
          if(f.ships.cruisers&&!c.tech.includes('cruiser_hull'))c.tech.push('cruiser_hull');
          if(f.ships.battleships&&!c.tech.includes('capital_ships'))c.tech.push('capital_ships');
          if(f.ships.carriers&&!c.tech.includes('carrier_ops'))c.tech.push('carrier_ops');
        }
      }
      if(!s.campaign){const c=this.nation();s.campaign={mode:['development','strategic','sandbox'].includes(options.campaign)?options.campaign:'sandbox',startDay:s.day,initialIndustry:c.stats.civ+c.stats.mil,initialProvinces:this.owned(s.player).length,finished:false,score:0,goals:[]};}
      if(!migrated)this.updateStats();this.campaignProgress();
    }
    fleetRating(f) {
      const ships=f.ships,c=this.nation(f.owner),screens=(ships.destroyers||0)+(ships.cruisers||0)*1.5;
      const capitals=(ships.battleships||0)+(ships.carriers||0),screening=clamp(screens/Math.max(1,capitals*3),.3,1);
      const airReady=c.stock.fuel>50?clamp((c.stock.fighters+this.s.wings.filter(w=>w.owner===f.owner&&w.kind==='fighters').reduce((n,w)=>n+w.size,0))/Math.max(1,(ships.carriers||0)*65),.25,1):.2;
      return ((ships.destroyers||0)*2+(ships.submarines||0)*1.2+(ships.cruisers||0)*5+((ships.battleships||0)*13+(ships.carriers||0)*15*airReady)*screening)*f.strength;
    }
    groupModifier(army,offense) {
      if(!army?.group)return 0;
      const g=this.s.groups.find(g=>g.id===army.group&&g.owner===army.owner);
      if(!g)return 0;
      const leader=this.nation(army.owner).identity.commanders.find(c=>c.id===g.marshal),size=this.s.armies.filter(a=>a.group===g.id).length;
      return leader?(offense?leader.attack:leader.defense)*.018*Math.min(1,5/Math.max(1,size)):0;
    }
    campaignProgress() {
      const s=this.s,c=this.nation(),camp=s.campaign;if(!camp)return;
      const industry=c.stats.civ+c.stats.mil,foreignCaps=this.prov.filter(p=>p.capital&&p.owner!==s.player&&s.provinces[p.id].ctrl===s.player).length;
      const original=c.identity.cores||this.prov.filter(p=>p.owner===s.player&&distance(p,{x:c.identity.lon,y:c.identity.lat})<2300).map(p=>p.id);
      const territorial=original.length?original.filter(pid=>this.access(s.player,s.provinces[pid].ctrl)).length/original.length:1;
      camp.score=Math.round(industry*10+c.tech.length*35+c.stability*2+foreignCaps*180+c.stats.supply*100);
      const goal=(id,name,value,target,unit='')=>({id,name,value,target,unit,done:value>=target});
      if(camp.mode==='development')camp.goals=[
        goal('industry','D\u00e9velopper les capacit\u00e9s industrielles',industry,Math.max(camp.initialIndustry+6,Math.ceil(camp.initialIndustry*1.35)),'usines'),
        goal('science','Moderniser les connaissances',c.tech.length,14,'technologies'),
        goal('cohesion','Consolider le pays',Math.floor(c.stability),70,'% stabilit\u00e9'),
        goal('defend','Pr\u00e9server le territoire m\u00e9tropolitain',Math.round(territorial*100),95,'%'),
        goal('year','Maintenir cet effort une ann\u00e9e',s.day-camp.startDay,365,'jours')
      ];
      else if(camp.mode==='strategic')camp.goals=[
        goal('capitals','Contr\u00f4ler des capitales \u00e9trang\u00e8res',foreignCaps,3,'capitales'),
        goal('industry','Soutenir une industrie de guerre',c.stats.mil,Math.max(18,Math.ceil(camp.initialIndustry*.6)),'usines militaires'),
        goal('science','Achever la modernisation',c.tech.length,18,'technologies'),
        goal('cohesion','Maintenir la coh\u00e9sion du pays',Math.floor(c.stability),55,'% stabilit\u00e9'),
        goal('logistics','Soutenir les arm\u00e9es',Math.round(c.stats.supply*100),65,'% ravitaillement')
      ];else camp.goals=[];
      const tutorial=[['research',c.research.length>0||c.tech.length>3],['focus',!!c.focus||c.focusDone.length>0],['construction',c.build.length>0||industry>camp.initialIndustry],['training',c.training.length>0],['army',s.armies.some(a=>a.owner===s.player&&a.auto&&a.target)],['time',s.day>=camp.startDay+7]];
      for(const [key,done] of tutorial)if(done&&!s.tutorial.completed.includes(key))s.tutorial.completed.push(key);
      const achievements=[['modernization','Modernisation',c.tech.length>=20],['industry','Puissance industrielle',industry>=camp.initialIndustry+20],['logistics','Intendance efficace',s.day>30&&c.stats.supply>=.9],['staff','Commandement unifi\u00e9',s.groups.some(g=>g.owner===s.player)&&s.armies.some(a=>a.owner===s.player&&a.objective!==null)],['convoys','Communications prot\u00e9g\u00e9es',s.day>30&&s.fleets.some(f=>f.owner===s.player&&f.mission==='escort'&&f.strength>.9)]];
      for(const [key,name,done] of achievements)if(done&&!c.achievements.some(a=>a.id===key)){c.achievements.push({id:key,name,day:s.day});this.log('Jalon atteint : '+name+'.','success');}
      if(camp.mode!=='sandbox'&&!camp.finished&&camp.goals.length&&camp.goals.every(g=>g.done)&&!s.outcome&&c.alive&&!s.pending){
        camp.finished=true;camp.finishDay=s.day;s.outcome={type:'victory',day:s.day,score:camp.score,mode:camp.mode};s.paused=true;this.log('Les objectifs de cette campagne sont atteints.','success');
      }
    }
    releaseDay() {
      if(!this.s.campaign)return;
      // Physical, bounded replacements. No creation of aircraft/ships without stocks.
      for(const w of this.s.wings)if(w.autoReinforce){const c=this.nation(w.owner),amount=Math.max(0,Math.min(3,(w.targetSize||100)-w.size,c.stock[w.kind]));w.size+=amount;c.stock[w.kind]-=amount;}
      for(const f of this.s.fleets)if(f.reinforce&&f.mission==='port'&&f.strength<1){const c=this.nation(f.owner);f.strength=clamp(f.strength+Math.min(.02,c.stats.dock*.001),0,1);}
      if(this.s.day%10===0)for(const id of this.active()){
        const c=this.nation(id),atWar=this.enemies(id).length>0,losses=Math.max(0,c.casualties-c.lastLosses);c.lastLosses=c.casualties;
        c.warFatigue=clamp(c.warFatigue+(atWar?.13+losses/Math.max(3000,c.identity.manpower*.03):-1.2),0,100);
        if(atWar&&c.warFatigue>20){c.stability=clamp(c.stability-c.warFatigue*.008,0,100);c.support=clamp(c.support-c.warFatigue*.006,0,100);}
      }
      if(this.s.day%7===0){
        const report={day:this.s.day,land:this.s.battles.length,air:this.s.airReports.reduce((n,r)=>n+r.losses,0),naval:this.s.navalReports.length};
        this.s.battleHistory.push(report);if(this.s.battleHistory.length>150)this.s.battleHistory.shift();
      }
      this.campaignProgress();
    }
    releaseExecute(action,p) {
      if(['macroPolicy','treasury','civicReform','coalitionTalk','earlyElection'].includes(action)){
        assert(this.nation().alive,'Le gouvernement a capitulé.');
        return this.policyAction(action,p,this.s.player);
      }
      const c=this.nation(),id=this.s.player,requirePP=n=>assert(c.pp>=n,'Pouvoir politique insuffisant ('+n+' requis).');
      const myArmy=()=>{const a=this.s.armies.find(a=>a.id===p.army&&a.owner===id);assert(a,'Arm\u00e9e inconnue.');return a;};
      switch(action){
        case 'campaignContinue':assert(this.s.outcome?.type==='victory','Aucune victoire \u00e0 poursuivre.');this.s.outcome=null;this.s.campaign.mode='sandbox';this.s.paused=true;return true;
        case 'dismissTutorial':this.s.tutorial.dismissed=!!p.value;return true;
        case 'newGroup':assert(this.s.groups.filter(g=>g.owner===id).length<12,'Maximum : 12 groupes d\u2019arm\u00e9es.');this.s.groups.push({id:this.s.uid++,owner:id,name:String(p.name||'Groupe d\u2019arm\u00e9es').slice(0,70),marshal:null});return true;
        case 'assignGroup':{const a=myArmy();assert(p.group===null||this.s.groups.some(g=>g.id===p.group&&g.owner===id),'Groupe inconnu.');a.group=p.group;return true;}
        case 'marshal':{const group=this.s.groups.find(g=>g.id===p.group&&g.owner===id);assert(group,'Groupe inconnu.');assert(p.marshal===null||c.identity.commanders.some(g=>g.id===p.marshal),'Officier inconnu.');assert(!p.marshal||!this.s.groups.some(g=>g.id!==group.id&&g.marshal===p.marshal),'Cet officier dirige d\u00e9j\u00e0 un groupe.');assert(!p.marshal||!this.s.armies.some(a=>a.owner===id&&a.general===p.marshal),'Lib\u00e9rez cet officier de son arm\u00e9e avant sa nomination.');group.marshal=p.marshal;return true;}
        case 'setObjective':{const a=myArmy();assert(p.pid===null||Number.isInteger(p.pid)&&this.prov[p.pid],'Objectif g\u00e9ographique invalide.');a.objective=p.pid;if(p.pid!==null){const ctrl=this.s.provinces[p.pid].ctrl;if(ctrl!==id&&!this.allies(id,ctrl))a.target=ctrl;}a.planning=0;return true;}
        case 'frontSector':{const a=myArmy();assert(Array.isArray(p.provinces)&&p.provinces.length<=20,'Un secteur contient au maximum 20 points.');assert(p.provinces.every(pid=>Number.isInteger(pid)&&this.prov[pid]&&this.access(id,this.s.provinces[pid].ctrl)),'Le secteur doit \u00eatre trac\u00e9 en territoire accessible.');a.frontSelection=[...new Set(p.provinces)];a.planning=0;return true;}
        case 'reserveRatio':{const a=myArmy();assert([0,.15,.3].includes(p.value),'R\u00e9serve invalide.');a.reserveRatio=p.value;return true;}
        case 'renameArmy':{const a=myArmy();assert(typeof p.name==='string'&&p.name.trim().length>0,'Nom manquant.');a.name=p.name.trim().slice(0,70);return true;}
        case 'exerciseArmy':{const a=myArmy(),troops=this.s.units.filter(u=>u.army===a.id&&u.owner===id);assert(troops.length,'Arm\u00e9e vide.');assert(troops.every(u=>!this.s.battles.some(b=>b.attackers.includes(u.id)||b.defenders.includes(u.id))),'Une arm\u00e9e engag\u00e9e ne peut pas man\u0153uvrer.');requirePP(20);assert((c.policyCooldown['exercise_'+a.id]||0)<=this.s.day,'Man\u0153uvres d\u00e9j\u00e0 men\u00e9es ce mois-ci.');assert(c.stock.rifles>=troops.length*15,'Fusils insuffisants pour les man\u0153uvres.');c.pp-=20;c.stock.rifles-=troops.length*15;c.xp+=10;for(const u of troops){u.xp=Math.min(4,u.xp+.15);u.org=Math.max(15,u.org-8);}c.policyCooldown['exercise_'+a.id]=this.s.day+30;return true;}
        case 'politicalCampaign':{assert(['democratic','fascist','communist','authoritarian'].includes(p.ideology),'Tendance inconnue.');requirePP(60);assert(c.politicalCooldown<=this.s.day,'Une campagne politique est d\u00e9j\u00e0 engag\u00e9e (30 jours).');const current=c.parties[p.ideology],gain=Math.min(8,100-current);for(const k of Object.keys(c.parties))c.parties[k]=k===p.ideology?current+gain:c.parties[k]*(100-current-gain)/Math.max(1,100-current);c.pp-=60;c.politicalCooldown=this.s.day+30;c.stability=clamp(c.stability-2,0,100);return true;}
        case 'reformGovernment':{assert(p.ideology!==c.ideology&&c.parties[p.ideology]>=55,'Une majorit\u00e9 de 55 % est requise pour une r\u00e9orientation.');requirePP(100);c.pp-=100;c.ideology=p.ideology;c.stability=clamp(c.stability-12,0,100);c.identity.role='Chef de l\u2019\u00c9tat / trajectoire uchronique';this.log('R\u00e9orientation politique : '+c.identity.name+'. Les institutions suivent une branche alternative.','event');return true;}
        case 'advisor':{const effects={economy:['construction',.12],science:['research',.10],logistics:['supply',.12]};assert(p.kind===null||effects[p.kind],'Conseil inconnu.');requirePP(80);assert(c.advisor!==p.kind,'Ce conseil est d\u00e9j\u00e0 actif.');if(c.advisor){const [key,n]=effects[c.advisor];c.bonus[key]-=n;}if(p.kind){const [key,n]=effects[p.kind];c.bonus[key]+=n;}c.advisor=p.kind;c.pp-=80;return true;}
        case 'airAutoReinforce':{const w=this.s.wings.find(w=>w.id===p.id&&w.owner===id);assert(w,'Escadre inconnue.');w.autoReinforce=!!p.value;w.targetSize=Math.max(100,Math.ceil(w.size/50)*50);return true;}
        case 'fleetCreate':{
          const base=this.s.provinces[p.base];assert(base?.ctrl===id&&base.port>0,'Port national requis.');
          const keys=['destroyers','submarines','cruisers','battleships','carriers'],needed={cruisers:'cruiser_hull',battleships:'capital_ships',carriers:'carrier_ops'},ships={};
          for(const k of keys){const n=p[k]??0;assert(Number.isInteger(n)&&n>=0&&n<=100&&c.stock[k]>=n,'Stock ou nombre invalide : '+this.catalog.equipment[k].name);if(n&&needed[k])assert(c.tech.includes(needed[k]),'Doctrine requise : '+this.tech(needed[k]).name);ships[k]=n;}
          assert(sum(Object.values(ships))>0,'Ajoutez au moins un navire.');for(const k of keys)c.stock[k]-=ships[k];
          this.s.fleets.push({id:this.s.uid++,owner:id,name:String(p.name||'Groupe naval').slice(0,70),base:p.base,zone:this.prov[p.base].seaZone,mission:'port',eta:0,ships,strength:1,reinforce:false});return true;
        }
        case 'fleetReinforce':{const f=this.s.fleets.find(f=>f.id===p.id&&f.owner===id);assert(f&&f.mission==='port','La flotte doit \u00eatre au port.');assert(['destroyers','submarines','cruisers','battleships','carriers'].includes(p.kind),'Classe inconnue.');assert(c.stock[p.kind]>=1,'Aucun navire de cette classe en r\u00e9serve.');f.ships[p.kind]=(f.ships[p.kind]||0)+1;c.stock[p.kind]--;return true;}
        case 'disband':{assert(Array.isArray(p.ids)&&p.ids.length>0,'S\u00e9lectionnez des divisions.');const troops=this.s.units.filter(u=>u.owner===id&&p.ids.includes(u.id));assert(troops.every(u=>this.s.provinces[u.pid].ctrl===id&&!this.s.battles.some(b=>b.attackers.includes(u.id)||b.defenders.includes(u.id))),'Dissolution uniquement dans un territoire national hors combat.');for(const u of troops){const t=templateStats(u.template);c.manpower+=Math.floor(t.men*u.strength);for(const [k,n] of Object.entries(t.eq))c.stock[k]+=Math.floor(n*u.strength*.8);}this.s.units=this.s.units.filter(u=>!troops.includes(u));this.indexUnits();return true;}
        case 'demobilize':requirePP(40);assert(!this.enemies(id).length,'D\u00e9mobilisation impossible pendant une guerre.');c.pp-=40;c.economy='civilian';c.warFatigue=Math.max(0,c.warFatigue-20);c.stability=clamp(c.stability+6,0,100);this.updateStats();return true;
        default:return false;
      }
    }
    static templateStats(t){return templateStats(t);}
    static distance(a,b){return distance(a,b);}
  }
    // --- Frontieres 1.4: sandboxed data-only alternate-history mod framework. ---
    // Implemented at the engine boundary: the geometry and simulation remain native.
    const legacyValidate14=Engine.validateMod;
    const legacyNew14=Engine.prototype.newGame;
    const legacyLoad14=Engine.prototype.load;
    const legacyEvent14=Engine.prototype.eventChoice;
    const legacyEventsStep14=Engine.prototype.eventsStep;
    const mod14Color=/^#[0-9a-f]{6}$/i;
    const mod14Code=/^[A-Z][A-Z0-9]{2}$/;
    const mod14Flag=/^[a-z][a-z0-9_]{0,39}$/i;
    const mod14Ideos=new Set(['democratic','communist','fascist','authoritarian']);
    const mod14Country=(ids,id,label='Pays')=>assert(ids.has(id),label+' inconnu : '+id);
    const mod14Region=(world,id)=>world.historicalRegions?.find(r=>r.id===id);
    const mod14Province=(world,key)=>world.provinces.find(p=>p.geoKey===key);
    const mod14Targets=(world,selector)=>{
      if(selector.region!==undefined){const region=mod14Region(world,selector.region);assert(region,'Region historique inconnue : '+selector.region);return region.provinces;}
      if(selector.provinceKey!==undefined){const p=mod14Province(world,selector.provinceKey);assert(p,'Province geographique inconnue : '+selector.provinceKey);return [p.id];}
      if(selector.province!==undefined){assert(Number.isInteger(selector.province)&&world.provinces[selector.province], 'Indice de province inconnu.');return [selector.province];}
      throw Error('Un territoire doit fournir region, provinceKey ou province.');
    };
    const mod14Selector=selector=>{
      assert(selector&&typeof selector==='object'&&!Array.isArray(selector),'Selecteur territorial invalide.');
      assert(['region','provinceKey','province'].filter(k=>selector[k]!==undefined).length===1,'Exactement un selecteur territorial requis.');
      for(const k of Object.keys(selector))assert(['region','provinceKey','province','to','type'].includes(k),'Cle de selecteur interdite : '+k);
    };
    const mod14When=(when,ids,world,depth=0)=>{
      assert(depth<=5,'Conditions trop imbriquees (maximum cinq niveaux).');
      assert(when&&typeof when==='object'&&!Array.isArray(when),'Condition de mod invalide.');
      const allowed=['flags','atWarWith','notAtWarWith','controlsRegion','controlsProvince','minStability','maxStability','minPP','minDay','maxDay','minTension','countryAlive','all','any','not'];
      for(const k of Object.keys(when))assert(allowed.includes(k),'Condition inconnue : '+k);
      if(when.flags!==undefined){
        assert(when.flags&&typeof when.flags==='object'&&!Array.isArray(when.flags),'Drapeaux de condition invalides.');
        for(const [k,v] of Object.entries(when.flags))assert(mod14Flag.test(k)&&['string','boolean','number'].includes(typeof v)&&(typeof v!=='number'||finite(v,-1e6,1e6)),'Drapeau de condition invalide.');
      }
      for(const k of ['atWarWith','notAtWarWith','countryAlive'])if(when[k]!==undefined)mod14Country(ids,when[k],'Partenaire');
      if(when.controlsRegion!==undefined)assert(mod14Region(world,when.controlsRegion),'Region de condition inconnue.');
      if(when.controlsProvince!==undefined)assert(mod14Province(world,when.controlsProvince),'Province de condition inconnue.');
      for(const k of ['minStability','maxStability','minTension'])if(when[k]!==undefined)assert(finite(when[k],0,100),'Valeur de condition invalide : '+k);
      if(when.minPP!==undefined)assert(finite(when.minPP,0,1e7),'Seuil politique invalide.');
      for(const k of ['minDay','maxDay'])if(when[k]!==undefined)assert(Number.isInteger(when[k])&&when[k]>=0&&when[k]<=30000,'Date de condition invalide.');
      if(when.minDay!==undefined&&when.maxDay!==undefined)assert(when.minDay<=when.maxDay,'Intervalle de dates incoherent.');
      for(const k of ['all','any'])if(when[k]!==undefined){
        assert(Array.isArray(when[k])&&when[k].length>=1&&when[k].length<=12,'Groupe de conditions invalide.');
        for(const rule of when[k])mod14When(rule,ids,world,depth+1);
      }
      if(when.not!==undefined)mod14When(when.not,ids,world,depth+1);
      return clone(when);
    };
    const mod14Action=(action,ids,world)=>{
      assert(action&&typeof action==='object'&&!Array.isArray(action),'Action de mod invalide.');
      const type=action.type;
      if(type==='flag'){
        assert(mod14Flag.test(action.key)&&['boolean','number','string'].includes(typeof action.value),'Action de drapeau invalide.');
        assert(typeof action.value!=='string'||action.value.length<=100,'Drapeau trop long.');
        assert(typeof action.value!=='number'||finite(action.value,-1e6,1e6),'Nombre de drapeau invalide.');
        return {type,key:action.key,value:action.value};
      }
      if(type==='government'){
        if(action.country!==undefined&&action.country!=='event')mod14Country(ids,action.country);
        assert(action.leader===undefined||(typeof action.leader==='string'&&action.leader.length>=1&&action.leader.length<=100),'Dirigeant invalide.');
        assert(action.ideology===undefined||mod14Ideos.has(action.ideology),'Ideologie invalide.');
        assert(action.leader!==undefined||action.ideology!==undefined,'Changement de gouvernement vide.');
        return {type,country:action.country||'event',leader:action.leader,ideology:action.ideology};
      }
      if(type==='war'){
        mod14Country(ids,action.target);return {type,target:action.target};
      }
      if(type==='peace'){
        mod14Country(ids,action.target);
        assert(Object.keys(action).every(k=>['type','target'].includes(k)),'Champ de paix inconnu.');
        return {type,target:action.target};
      }
      if(type==='equipment'){
        const goods=['rifles','artillery','supportEq','trucks','tanks','fighters','bombers','destroyers','submarines','cruisers','battleships','carriers','convoys','fuel','antiTank','antiAir','rocketArtillery','mechanized','armoredCars','lightTanks','heavyTanks','cas','strategicBombers','navalBombers','transportPlanes'];
        assert(action.country===undefined||action.country==='event'||ids.has(action.country),'Destinataire materiel inconnu.');
        assert(goods.includes(action.key),'Type de materiel inconnu.');
        assert(Number.isInteger(action.amount)&&action.amount>=-200000&&action.amount<=200000,'Quantite de materiel invalide.');
        assert(Object.keys(action).every(k=>['type','country','key','amount'].includes(k)),'Champ de materiel interdit.');
        return {type,country:action.country||'event',key:action.key,amount:action.amount};
      }
      if(type==='relations'){
        mod14Country(ids,action.target);
        assert(Number.isInteger(action.change)&&action.change>=-100&&action.change<=100,'Variation diplomatique invalide.');
        assert(Object.keys(action).every(k=>['type','target','change'].includes(k)),'Champ diplomatique interdit.');
        return {type,target:action.target,change:action.change};
      }
      if(type==='faction'){
        assert(action.country===undefined||action.country==='event'||ids.has(action.country),'Pays de faction inconnu.');
        assert(typeof action.name==='string'&&/^[A-Za-z0-9 _.-]{2,45}$/.test(action.name),'Nom de faction invalide.');
        assert(Object.keys(action).every(k=>['type','country','name'].includes(k)),'Champ de faction interdit.');
        return {type,country:action.country||'event',name:action.name};
      }
      if(type==='transfer'){
        mod14Country(ids,action.to);mod14Selector(action);
        const targets=mod14Targets(world,action);assert(targets.length<=250,'Transfert trop volumineux.');
        return {type,to:action.to,...(action.region!==undefined?{region:action.region}:action.provinceKey!==undefined?{provinceKey:action.provinceKey}:{province:action.province})};
      }
      throw Error('Type d\'action de mod inconnu : '+type);
    };
    const mod14Allowed=new Set(['id','name','version','balance','countries','technologies','focus','events','components','newCountries','territories','scenario','map']);
    Engine.validateMod=function(raw,world,catalog){
      if(raw?.packs)return Engine.mergePacks(raw.packs,world,catalog);
      if(!raw||raw.version!==2&&!raw.newCountries&&!raw.territories&&!raw.scenario){return legacyValidate14.call(Engine,raw,world,catalog);}
      Engine.safeObject(raw);
      assert(raw&&typeof raw==='object'&&!Array.isArray(raw),'Manifeste invalide.');
      assert(JSON.stringify(raw).length<1400000,'Mod trop volumineux (1,4 Mo maximum).');
      for(const k of Object.keys(raw))assert(mod14Allowed.has(k),'Cle de manifeste inconnue : '+k);
      assert(raw.version===2,'Le format avance demande version: 2.');
      assert(typeof raw.id==='string'&&/^[a-z][a-z0-9_.-]{2,63}$/i.test(raw.id),'Identifiant de paquet invalide.');
      assert(typeof raw.name==='string'&&raw.name.length>=1&&raw.name.length<=100,'Nom de paquet invalide.');
      const mapClean=raw.map?Engine.validateMapPatch(raw.map,world,(raw.newCountries||[]).map(c=>c.id)):null;
      const mapWorld=mapClean?Engine.modMapWorld(world,mapClean):world;
      const ids=new Set(world.countries.map(c=>c.id));
      const additions=[];
      assert(raw.newCountries===undefined||Array.isArray(raw.newCountries)&&raw.newCountries.length<=10,'Maximum dix nouveaux pays.');
      for(const n of raw.newCountries||[]){
        assert(n&&typeof n==='object'&&!Array.isArray(n),'Nouvel Etat invalide.');
        for(const k of Object.keys(n))assert(['id','from','name','leader','ideology','color','capitalKey','civ','mil','divisions','manpower','air','fleet','faction','commanders'].includes(k),'Champ national inconnu : '+k);
        assert(mod14Code.test(n.id)&&!ids.has(n.id),'Code national deja utilise ou invalide : '+n.id);
        mod14Country(new Set(world.countries.map(c=>c.id)),n.from,'Modele de pays');
        assert(typeof n.name==='string'&&n.name.length>=2&&n.name.length<=85,'Nom national invalide.');
        assert(typeof n.leader==='string'&&n.leader.length>=2&&n.leader.length<=100,'Dirigeant national invalide.');
        assert(!n.ideology||mod14Ideos.has(n.ideology),'Ideologie nationale invalide.');
        assert(!n.color||mod14Color.test(n.color),'Couleur nationale invalide.');
        assert(!n.capitalKey||mod14Province(mapWorld,n.capitalKey),'Capitale geographique inconnue.');
        for(const [key,max] of Object.entries({civ:200,mil:200,divisions:150,manpower:5000000,air:2500,fleet:300}))if(n[key]!==undefined)assert(Number.isInteger(n[key])&&n[key]>=0&&n[key]<=max,'Valeur nationale invalide : '+key);
        assert(!n.faction||typeof n.faction==='string'&&n.faction.length<=50,'Faction invalide.');
        if(n.commanders!==undefined){
          assert(Array.isArray(n.commanders)&&n.commanders.length<=12,'Maximum douze officiers.');
          for(const g of n.commanders){assert(typeof g.name==='string'&&g.name.length<=100&&g.name.length>1,'Nom d\'officier invalide.');for(const k of ['attack','defense','planning','logistics'])assert(Number.isInteger(g[k])&&g[k]>=0&&g[k]<=6,'Competence d\'officier invalide.');}
        }
        ids.add(n.id);additions.push(clone(n));
      }
      const territories=[];const claimed=new Map();
      assert(raw.territories===undefined||Array.isArray(raw.territories)&&raw.territories.length<=250,'Maximum 250 changements territoriaux.');
      for(const t of raw.territories||[]){
        assert(t&&typeof t==='object'&&!Array.isArray(t),'Territoire invalide.');
        for(const k of Object.keys(t))assert(['to','region','provinceKey','province'].includes(k),'Cle territoriale interdite : '+k);
        mod14Country(ids,t.to,'Destinataire territorial');
        mod14Selector(t);const target=mod14Targets(mapWorld,t);assert(target.length<=250,'Une region comporte trop de provinces.');
        for(const pid of target){assert(!claimed.has(pid)||claimed.get(pid)===t.to,'Conflit territorial sur province '+pid);claimed.set(pid,t.to);}
        territories.push({to:t.to,...(t.region!==undefined?{region:t.region}:t.provinceKey!==undefined?{provinceKey:t.provinceKey}:{province:t.province})});
      }
      for(const n of additions)assert([...claimed.values()].includes(n.id)||mapWorld.provinces.some(p=>p.owner===n.id),'Un nouvel Etat doit recevoir au moins une province.');
      const scenario=raw.scenario?(()=>{
        const p=raw.scenario;assert(p&&typeof p==='object'&&!Array.isArray(p),'Scenario invalide.');
        for(const k of Object.keys(p))assert(['title','description','bookmark','startDay','historical','initialWars'].includes(k),'Cle de scenario inconnue : '+k);
        assert(p.bookmark===undefined||['1936','1939'].includes(p.bookmark),'Point de depart inconnu.');
        assert(p.historical===undefined||typeof p.historical==='boolean','Chronologie invalide.');
        if(p.startDay!==undefined&&p.startDay!==null)assert(Number.isInteger(p.startDay)&&p.startDay>=0&&p.startDay<=30000,'Jour de depart invalide.');
        assert(p.initialWars===undefined||Array.isArray(p.initialWars)&&p.initialWars.length<=15,'Trop de guerres initiales.');
        for(const pair of p.initialWars||[]){assert(Array.isArray(pair)&&pair.length===2,'Guerre initiale invalide.');mod14Country(ids,pair[0]);mod14Country(ids,pair[1]);assert(pair[0]!==pair[1],'Guerre contre soi-meme.');}
        if(additions.length||territories.length)assert(!p.bookmark||p.bookmark==='1936','La carte alternative utilise le depart 1936.');
        if(p.startDay!==undefined&&p.startDay!==null)assert(!p.bookmark||p.bookmark==='1936','Date personnalisee reservee au depart 1936.');
        return {title:String(p.title||raw.name).slice(0,100),description:String(p.description||'').slice(0,900),bookmark:p.bookmark||'1936',startDay:p.startDay??null,historical:p.historical===true,initialWars:clone(p.initialWars||[])};
      })():null;
      // Validate all legacy technology/focus/effect rules on the augmented national IDs.
      const virtualWorld={...mapWorld,countries:[...mapWorld.countries,...additions.map(n=>({id:n.id}))]};
      const bridge={...raw,version:1,newCountries:undefined,territories:undefined,scenario:undefined,
        events:(raw.events||[]).map(e=>({...e,when:undefined,choices:(e.choices||[]).map(c=>({...c,actions:undefined}))}))};
      const clean=legacyValidate14.call(Engine,bridge,virtualWorld,catalog);
      clean.version=2;clean.newCountries=additions;clean.territories=territories;
      if(mapClean)clean.map=mapClean;
      if(scenario)clean.scenario=scenario;
      for(let i=0;i<(raw.events||[]).length;i++){
        const e=raw.events[i],v=clean.events[i];
        if(e.when!==undefined)v.when=mod14When(e.when,ids,mapWorld);
        for(let j=0;j<e.choices.length;j++){
          const actions=e.choices[j].actions;
          if(actions!==undefined){assert(Array.isArray(actions)&&actions.length<=12,'Maximum douze actions par choix.');v.choices[j].actions=actions.map(a=>mod14Action(a,ids,mapWorld));}
        }
      }
      return clean;
    };
    Engine.mergePacks=function(packs,world,catalog){
      assert(Array.isArray(packs)&&packs.length>=1&&packs.length<=6,'Empilement limite a six paquets.');
      const merged={id:'stack',name:'',version:2,balance:{production:1,research:1,combat:1},events:[],technologies:[],countries:{},focus:{},newCountries:[],territories:[],components:[]};
      let customMap=null;
      const names=new Set(),territorialTargets=new Map();let scenario=null;
      for(const pack of packs){
        assert(pack&&!pack.packs,'Empilements imbriques interdits.');
        const clean=Engine.validateMod(pack,world,catalog);assert(!names.has(clean.id),'Paquet duplique : '+clean.id);names.add(clean.id);
        merged.components.push(...(clean.components||[clean.name]));
        if(clean.map){assert(!customMap,'Deux cartes personnalisees simultanees non autorisees.');customMap=clean.map;}
        for(const k of Object.keys(merged.balance))merged.balance[k]*=clean.balance[k];
        merged.events.push(...clean.events);merged.technologies.push(...(clean.technologies||[]));
        for(const n of clean.newCountries||[]){assert(!merged.newCountries.some(c=>c.id===n.id),'Pays ajoute deux fois : '+n.id);merged.newCountries.push(n);}
        for(const t of clean.territories||[]){for(const pid of mod14Targets(customMap?Engine.modMapWorld(world,customMap):world,t)){assert(!territorialTargets.has(pid)||territorialTargets.get(pid)===t.to,'Conflit de territoire : '+pid);territorialTargets.set(pid,t.to);}merged.territories.push(t);}
        for(const [id,patch] of Object.entries(clean.countries||{})){
          const dest=merged.countries[id]||{};
          for(const [key,value] of Object.entries(patch)){
            if(key==='bonus'){dest.bonus??={};for(const [effect,n] of Object.entries(value))dest.bonus[effect]=(dest.bonus[effect]||0)+n;}
            else{assert(dest[key]===undefined||dest[key]===value,'Conflit national : '+id+'.'+key);dest[key]=value;}
          }
          merged.countries[id]=dest;
        }
        for(const [id,tree] of Object.entries(clean.focus||{})){assert(!merged.focus[id],'Conflit de focus : '+id);merged.focus[id]=tree;}
        if(clean.scenario){assert(!scenario,'Deux scenarios simultanes non autorises.');scenario=clean.scenario;}
      }
      merged.id='stack_'+[...names].join('_').replace(/[^a-z0-9_.-]/gi,'_').slice(0,55);merged.name=merged.components.join(' + ').slice(0,100);
      if(scenario)merged.scenario=scenario;
      if(customMap)merged.map=customMap;
      const raw=Engine.validateMod(merged,world,catalog);
      for(const k of Object.keys(raw.balance))assert(raw.balance[k]<=4&&raw.balance[k]>=.25,'Multiplicateurs cumules hors limites.');
      return raw;
    };
    Engine.previewModWorld=function(raw,world,catalog){
      const e=new Engine(world,catalog),m=Engine.validateMod(raw,world,catalog);
      e.configureModWorld(m);return {world:e.world,countries:e.world.countries,provinces:e.world.provinces,
        mapId:e.world.mapId,mod:m};
    };
    Engine.prototype.configureModWorld=function(m){
      this.vanillaWorld??=this.world;
      if(!(m.newCountries?.length||m.territories?.length||m.map)){
        this.world=this.vanillaWorld;this.prov=this.world.provinces;
        this.defs=Object.fromEntries(this.world.countries.map(c=>[c.id,c]));return;
      }
      const world=Engine.modMapWorld(this.vanillaWorld,m.map),dict=Object.fromEntries(world.countries.map(c=>[c.id,c]));
      for(const n of m.newCountries||[]){
        const d=clone(dict[n.from]);d.id=n.id;d.name=n.name;d.leader=n.leader;d.wiki=n.leader;
        d.ideology=n.ideology||'authoritarian';d.color=n.color||'#8d9caf';d.faction=n.faction||'none';
        for(const key of ['civ','mil','divisions','manpower','air','fleet'])d[key]=n[key]??(key==='manpower'?100000:key==='divisions'?4:key==='civ'?4:key==='mil'?3:0);
        d.commanders=(n.commanders||[]).map((g,i)=>({id:n.id+'_modg'+i,...g}));
        d.provinces=[];d.role='Dirigeant du scenario alternatif';d.description='Etat defini par un paquet de donnees de Frontieres 1.4.';
        world.countries.push(d);dict[d.id]=d;
      }
      for(const t of m.territories||[])for(const pid of mod14Targets(world,t))world.provinces[pid].owner=t.to;
      for(const d of world.countries){
        d.provinces=world.provinces.filter(p=>p.owner===d.id).map(p=>p.id);
        assert(d.provinces.length,'Le scenario retire tous les territoires de '+d.id+'.');
        const wanted=(m.newCountries||[]).find(n=>n.id===d.id)?.capitalKey;
        if(wanted){const cp=mod14Province(world,wanted);assert(cp.owner===d.id,'La capitale de '+d.id+' doit appartenir au pays.');d.capital=cp.id;d.capitalName=cp.name;}
        else if(!d.provinces.includes(d.capital)){
          const cp=world.provinces[d.provinces.slice().sort((a,b)=>world.provinces[b].vp-world.provinces[a].vp)[0]];
          d.capital=cp.id;d.capitalName=cp.name;
        }
        d.lon=world.provinces[d.capital].x;d.lat=world.provinces[d.capital].y;
      }
      this.world=world;this.prov=world.provinces;this.defs=dict;
    };
    Engine.prototype.newGame=function(player='FRA',options={},raw=null){
      const m=Engine.validateMod(raw,this.vanillaWorld||this.world,this.baseCatalog);
      this.configureModWorld(m);
      const scenario=m.scenario;
      const bookmark=scenario?.bookmark||options.scenario||'1936';
      const isAlternative=!!(m.newCountries?.length||m.territories?.length||m.map);
      const historical=isAlternative?false:scenario?scenario.historical:options.historical!==false;
      const state=legacyNew14.call(this,player,{...options,scenario:isAlternative?'1936':bookmark,historical},m);
      state.modFlags={};state.release='1.4.1';
      state.modManifestHash=mod141Hash(JSON.stringify(state.mod));
      if(scenario?.startDay!==null&&scenario?.startDay!==undefined){
        state.day=scenario.startDay;state.historyState.startDay=scenario.startDay;
        state.historyState.dmz=[];state.campaign.startDay=scenario.startDay;
        for(const c of Object.values(state.countries)){
          if(c.politics?.election){c.politics.election.nextDay=state.day+1460;c.politics.election.lastDay=null;}
        }
      }
      for(const pair of scenario?.initialWars||[]){
        if(!this.war(pair[0],pair[1])&&!this.allies(pair[0],pair[1]))this.declareWar(pair[0],pair[1],true,false);
      }
      this.updateStats();this.indexUnits();this.computeSupply();this.checkInvariants();return state;
    };
    Engine.prototype.load=function(raw){
      const oldWorld=this.world,oldProv=this.prov,oldDefs=this.defs,oldState=this.s,oldCatalog=this.catalog;
      try{
        const m=Engine.validateMod(raw?.mod,this.vanillaWorld||this.world,this.baseCatalog);
        const manifestHash=mod141Hash(JSON.stringify(m));
        if(raw?.modManifestHash!==undefined)assert(raw.modManifestHash===manifestHash,'Le mod de la sauvegarde a ete modifie ou corrompu.');
        else assert(raw?.release!=='1.4.1','Empreinte de mod manquante pour une sauvegarde 1.4.1.');
        this.configureModWorld(m);
        const state=legacyLoad14.call(this,raw);
        state.modFlags??={};state.release='1.4.1';state.modManifestHash=manifestHash;
        this.checkInvariants();return state;
      }catch(error){this.world=oldWorld;this.prov=oldProv;this.defs=oldDefs;this.s=oldState;this.catalog=oldCatalog;if(oldState)this.indexUnits();throw error;}
    };
    Engine.prototype.modEventCondition=function(event){
      const id=event.country==='player'?this.s.player:event.country;
      const matches=w=>{
        if(!w)return true;
        if(w.all&&!w.all.every(matches))return false;
        if(w.any&&!w.any.some(matches))return false;
        if(w.not&&matches(w.not))return false;
        const c=this.nation(id);
        if(w.minDay!==undefined&&this.s.day<w.minDay)return false;
        if(w.maxDay!==undefined&&this.s.day>w.maxDay)return false;
        if(w.minStability!==undefined&&c.stability<w.minStability)return false;
        if(w.maxStability!==undefined&&c.stability>w.maxStability)return false;
        if(w.minPP!==undefined&&c.pp<w.minPP)return false;
        if(w.minTension!==undefined&&this.s.tension<w.minTension)return false;
        if(w.countryAlive&&!this.nation(w.countryAlive)?.alive)return false;
        for(const [key,v] of Object.entries(w.flags||{}))if(this.s.modFlags?.[key]!==v)return false;
        if(w.atWarWith&&!this.war(id,w.atWarWith))return false;
        if(w.notAtWarWith&&this.war(id,w.notAtWarWith))return false;
        if(w.controlsRegion&&!mod14Region(this.world,w.controlsRegion).provinces.every(pid=>this.s.provinces[pid].ctrl===id))return false;
        if(w.controlsProvince&&this.s.provinces[mod14Province(this.world,w.controlsProvince).id].ctrl!==id)return false;
        return true;
      };
      return matches(event.when);
    };
    Engine.prototype.eventsStep=function(){
      const events=this.s.mod.events;
      // Keep not-yet-eligible events live, without treating them as fired.
      for(const e of events)if(e.when?.maxDay!==undefined&&this.s.day>e.when.maxDay&&
        !this.s.seenEvents.includes(e.id))this.s.seenEvents.push(e.id);
      this.s.mod.events=events.filter(e=>this.modEventCondition(e));
      try{return legacyEventsStep14.call(this);}finally{this.s.mod.events=events;}
    };
    Engine.prototype.eventChoice=function(country,event,index){
      const result=legacyEvent14.call(this,country,event,index);
      if(!event.history){
        const actions=event.choices[index]?.actions||[];
        let changed=false;
        for(const action of actions){
          if(action.type==='flag'){this.s.modFlags??={};this.s.modFlags[action.key]=action.value;}
          else if(action.type==='government'){
            const target=action.country==='event'?country:action.country;
            const c=this.nation(target);if(!c?.alive)continue;
            if(action.leader){c.identity.leader=action.leader;c.identity.wiki=action.leader;c.identity.portraitKey=null;}
            if(action.ideology)c.ideology=action.ideology;
          } else if(action.type==='war'){
            if(this.nation(action.target)?.alive&&!this.war(country,action.target)&&!this.allies(country,action.target))
              this.declareWar(country,action.target,true,false);
          } else if(action.type==='peace'){
            this.s.wars=this.s.wars.filter(w=>!((w.a===country&&w.b===action.target)||(w.b===country&&w.a===action.target)));
            this.s.battles=[];changed=true;
          } else if(action.type==='equipment'){
            const target=action.country==='event'?country:action.country;
            const recipient=this.nation(target);if(recipient?.alive)
              recipient.stock[action.key]=Math.max(0,(recipient.stock[action.key]||0)+action.amount);
          } else if(action.type==='relations'){
            const c=this.nation(country);if(c?.alive)
              c.relations[action.target]=clamp((c.relations[action.target]||0)+action.change,-100,100);
          } else if(action.type==='faction'){
            const target=action.country==='event'?country:action.country;
            const c=this.nation(target);if(c?.alive)c.faction=action.name;
          } else if(action.type==='transfer'){
            for(const pid of mod14Targets(this.world,action))this.s.provinces[pid].ctrl=action.to;
            changed=true;
          }
        }
        if(changed){
          for(const id of this.active()){
            const c=this.nation(id);
            if(this.s.provinces[c.identity.capital]?.ctrl!==id){
              const lands=this.owned(id);
              if(lands.length){const home=lands.sort((a,b)=>b.vp-a.vp)[0];c.identity.capital=home.id;c.identity.capitalName=home.name;}
            }
          }
          this.updateStats();this.indexUnits();this.computeSupply();
        }
      }
      return result;
    };

    // Frontieres 1.4.1 — deterministic, declarative cartography and campaign scripting.
    // All inputs come from JSON; no eval, dynamic import or executable mod callbacks.
    const mod141Key=/^[A-Za-z][A-Za-z0-9:_-]{2,79}$/;
    const mod141MapId=/^[a-z][a-z0-9_.-]{2,63}$/i;
    const mod141Fields=new Set(['geoKey','name','owner','x','y','polygons','terrain','zone','seaZone','coast','port','airbase','vp','steel','oil','rubber','aluminium','tungsten','chromium','neighbors','sea']);
    const mod141Hash=s=>{let a=2166136261,b=2246822519;for(let i=0;i<s.length;i++){a=Math.imul(a^s.charCodeAt(i),16777619)>>>0;b=Math.imul(b^s.charCodeAt(i),3266489917)>>>0;}return a.toString(16).padStart(8,'0')+b.toString(16).padStart(8,'0');};
    const mod141Polygon=polygons=>{
      assert(Array.isArray(polygons)&&polygons.length>=1&&polygons.length<=5,'Une province doit posseder de 1 a 5 polygones.');
      let total=0,area=0;
      for(const ring of polygons){
        assert(Array.isArray(ring)&&ring.length>=3&&ring.length<=90,'Contour invalide (3 a 90 sommets).');
        total+=ring.length;
        for(let i=0;i<ring.length;i++){
          const p=ring[i],q=ring[(i+1)%ring.length];
          assert(Array.isArray(p)&&p.length===2&&finite(p[0],-180,180)&&finite(p[1],-85,85),'Coordonnees geographiques invalides.');
          area+=p[0]*q[1]-q[0]*p[1];
        }
      }
      assert(total<=220&&Math.abs(area)>.000001,'Polygone vide ou trop complexe.');
      return clone(polygons);
    };
    Engine.validateMapPatch=function(map,base,extraIds=[]){
      Engine.safeObject(map);
      assert(map&&typeof map==='object'&&!Array.isArray(map),'Carte de mod invalide.');
      for(const k of Object.keys(map))assert(['id','title','edits','addProvinces','regions','description'].includes(k),'Champ cartographique interdit : '+k);
      assert(typeof map.id==='string'&&mod141MapId.test(map.id),'Identifiant de carte invalide.');
      assert(map.title===undefined||typeof map.title==='string'&&map.title.length<=100,'Titre de carte invalide.');
      assert(map.description===undefined||typeof map.description==='string'&&map.description.length<=800,'Description de carte invalide.');
      assert(map.edits===undefined||Array.isArray(map.edits)&&map.edits.length<=180,'Maximum 180 corrections de provinces.');
      assert(map.addProvinces===undefined||Array.isArray(map.addProvinces)&&map.addProvinces.length<=120,'Maximum 120 provinces ajoutees.');
      assert(map.regions===undefined||Array.isArray(map.regions)&&map.regions.length<=30,'Maximum 30 nouvelles regions.');
      assert((map.edits?.length||0)+(map.addProvinces?.length||0)>0,'Une carte personnalisee doit modifier la geometrie ou ajouter une province.');
      const keys=new Set(base.provinces.map(p=>p.geoKey));
      const ids=new Set([...base.countries.map(c=>c.id),...extraIds]);
      const zones=new Set(base.zones.map(z=>z.id)),seas=new Set(base.seas.map(z=>z.id));
      const added=[];
      for(const p of map.addProvinces||[]){
        assert(p&&typeof p==='object'&&!Array.isArray(p),'Nouvelle province invalide.');
        assert(typeof p.geoKey==='string'&&mod141Key.test(p.geoKey)&&!keys.has(p.geoKey),'Identifiant de province ajoutee duplique ou invalide.');
        keys.add(p.geoKey);added.push(p);
      }
      const validate=(p,addition)=>{
        for(const k of Object.keys(p))assert(mod141Fields.has(k),'Champ provincial interdit : '+k);
        assert(typeof p.geoKey==='string'&&keys.has(p.geoKey),'Reference geographique invalide.');
        if(addition){assert(typeof p.name==='string'&&p.name.length>=2&&p.name.length<=100,'Nom provincial obligatoire.');assert(typeof p.owner==='string'&&ids.has(p.owner),'Proprietaire provincial inconnu.');assert(p.polygons!==undefined,'Geometrie obligatoire pour une nouvelle province.');}
        if(p.name!==undefined)assert(typeof p.name==='string'&&p.name.length>=2&&p.name.length<=100,'Nom provincial invalide.');
        if(p.owner!==undefined)assert(ids.has(p.owner),'Proprietaire provincial inconnu : '+p.owner);
        if(p.terrain!==undefined)assert(['plains','forest','mountains','desert','urban','hills','marsh','jungle'].includes(p.terrain),'Terrain invalide.');
        if(p.zone!==undefined)assert(zones.has(p.zone),'Zone aerienne inconnue.');
        if(p.seaZone!==undefined)assert(p.seaZone===null||seas.has(p.seaZone),'Zone maritime inconnue.');
        if(p.coast!==undefined)assert(typeof p.coast==='boolean','Etat cotier invalide.');
        if(p.x!==undefined)assert(finite(p.x,-180,180),'Longitude invalide.');
        if(p.y!==undefined)assert(finite(p.y,-85,85),'Latitude invalide.');
        if(p.polygons!==undefined)mod141Polygon(p.polygons);
        for(const k of ['vp','port','airbase','steel','oil','rubber','aluminium','tungsten','chromium'])if(p[k]!==undefined)assert(Number.isInteger(p[k])&&p[k]>=0&&p[k]<=1000,'Valeur provinciale invalide : '+k);
        if(p.neighbors!==undefined){
          assert(Array.isArray(p.neighbors)&&p.neighbors.length<=16,'Maximum 16 voisins terrestres.');
          assert(new Set(p.neighbors).size===p.neighbors.length,'Voisin terrestre duplique.');
          for(const key of p.neighbors)assert(typeof key==='string'&&keys.has(key)&&key!==p.geoKey,'Voisin terrestre invalide.');
        }
        if(p.sea!==undefined){
          assert(Array.isArray(p.sea)&&p.sea.length<=12,'Maximum douze routes maritimes.');
          const seen=new Set();
          for(const route of p.sea){
            assert(route&&typeof route==='object'&&!Array.isArray(route),'Route maritime invalide.');
            for(const k of Object.keys(route))assert(['to','days'].includes(k),'Champ maritime inconnu.');
            assert(typeof route.to==='string'&&keys.has(route.to)&&route.to!==p.geoKey&&!seen.has(route.to),'Destination maritime invalide.');
            assert(Number.isInteger(route.days)&&route.days>=1&&route.days<=90,'Duree maritime invalide.');
            seen.add(route.to);
          }
        }
        return clone(p);
      };
      const edits=[],changed=new Set();
      for(const p of map.edits||[]){
        assert(base.provinces.some(x=>x.geoKey===p.geoKey),'Correction inconnue : '+p.geoKey);
        assert(!changed.has(p.geoKey),'Province modifiee plusieurs fois.');changed.add(p.geoKey);
        edits.push(validate(p,false));
      }
      const allAdd=added.map(p=>validate(p,true));
      const regionIds=new Set(base.historicalRegions.map(r=>r.id)),regions=[];
      for(const r of map.regions||[]){
        assert(r&&typeof r==='object'&&!Array.isArray(r),'Region personnalisee invalide.');
        for(const k of Object.keys(r))assert(['id','name','provinces'].includes(k),'Champ regional inconnu.');
        assert(typeof r.id==='string'&&mod141MapId.test(r.id)&&!regionIds.has(r.id),'Region dupliquee ou invalide.');regionIds.add(r.id);
        assert(typeof r.name==='string'&&r.name.length>=2&&r.name.length<=100,'Nom de region invalide.');
        assert(Array.isArray(r.provinces)&&r.provinces.length>=1&&r.provinces.length<=200,'Taille de region invalide.');
        assert(new Set(r.provinces).size===r.provinces.length&&r.provinces.every(key=>typeof key==='string'&&keys.has(key)),'Province regionale inconnue ou dupliquee.');
        regions.push({id:r.id,name:r.name,provinces:clone(r.provinces)});
      }
      return {id:map.id,title:String(map.title||map.id),description:String(map.description||''),edits,addProvinces:allAdd,regions};
    };
    Engine.modMapWorld=function(base,map){
      if(!map)return clone(base);
      const world=clone(base),keys=new Map(world.provinces.map(p=>[p.geoKey,p.id]));
      const changes=[...(map.edits||[]),...(map.addProvinces||[])];
      for(const p of map.addProvinces||[]){
        const coords=p.polygons.flat().slice(0,30),x=p.x??coords.reduce((n,v)=>n+v[0],0)/coords.length,
          y=p.y??coords.reduce((n,v)=>n+v[1],0)/coords.length;
        const id=world.provinces.length;
        world.provinces.push({id,geoKey:p.geoKey,name:p.name,owner:p.owner,x,y,polygons:clone(p.polygons),
          city:true,capital:false,zone:p.zone||world.zones[0].id,seaZone:p.seaZone||null,
          neighbors:[],sea:[],terrain:p.terrain||'plains',coast:p.coast??true,
          port:p.port??1,airbase:p.airbase??0,vp:p.vp??2,steel:p.steel??0,oil:p.oil??0,rubber:p.rubber??0,aluminium:p.aluminium??0,tungsten:p.tungsten??0,chromium:p.chromium??0,
          historicalRegions:[],administration:'Scenario modde',cartographicConfidence:'fictional',overseas:false});
        keys.set(p.geoKey,id);
      }
      for(const edit of changes){
        const p=world.provinces[keys.get(edit.geoKey)];
        for(const k of ['name','owner','x','y','terrain','zone','seaZone','coast','port','airbase','vp','steel','oil','rubber','aluminium','tungsten','chromium'])if(edit[k]!==undefined)p[k]=edit[k];
        if(edit.polygons)p.polygons=clone(edit.polygons);
        if(edit.x===undefined&&edit.polygons&&!(map.addProvinces||[]).some(a=>a.geoKey===edit.geoKey)){
          const ring=edit.polygons[0];p.x=ring.reduce((a,b)=>a+b[0],0)/ring.length;
        }
        if(edit.y===undefined&&edit.polygons&&!(map.addProvinces||[]).some(a=>a.geoKey===edit.geoKey)){
          const ring=edit.polygons[0];p.y=ring.reduce((a,b)=>a+b[1],0)/ring.length;
        }
      }
      const graph=world.provinces.map(p=>new Set(p.neighbors));
      const marine=world.provinces.map(p=>new Map(p.sea.map(e=>[e.to,e.days])));
      for(const edit of changes){
        const id=keys.get(edit.geoKey);
        if(edit.neighbors!==undefined){
          for(const n of graph[id])graph[n].delete(id);
          graph[id].clear();
          for(const key of edit.neighbors){const to=keys.get(key);graph[id].add(to);graph[to].add(id);}
        }
        if(edit.sea!==undefined){
          for(const to of marine[id].keys())marine[to].delete(id);
          marine[id].clear();
          for(const e of edit.sea){const to=keys.get(e.to);marine[id].set(to,e.days);marine[to].set(id,e.days);}
        }
      }
      for(const p of world.provinces){
        p.neighbors=[...graph[p.id]].sort((a,b)=>a-b);
        p.sea=[...marine[p.id]].map(([to,days])=>({to,days})).sort((a,b)=>a.to-b.to);
        assert(p.neighbors.length<=250&&p.sea.length<=100,'Trop de liaisons sur la province '+p.id);
      }
      for(const r of map.regions||[]){
        const ids=r.provinces.map(k=>keys.get(k));
        world.historicalRegions.push({id:r.id,name:r.name,provinces:ids,source:'mod',precision:'custom'});
        for(const pid of ids)world.provinces[pid].historicalRegions.push(r.id);
      }
      const fingerprint=mod141Hash(JSON.stringify(map));
      world.mapId=base.mapId+'-custom-'+fingerprint;
      world.geoOrderFingerprint=mod141Hash(base.geoOrderFingerprint+'|'+fingerprint+'|'+world.provinces.map(p=>p.geoKey).join(','));
      world.source=base.source+'; carte personnalisee : '+map.title;
      world.modMap={id:map.id,title:map.title,hash:fingerprint};
      return world;
    };
    // Manifest checksum binds saves to the validated data package. This is a
    // deterministic integrity check, NOT a cryptographic signature of a creator.
    const mod141Check=Engine.prototype.checkInvariants;
    Engine.prototype.checkInvariants=function(state=this.s){
      const result=mod141Check.call(this,state);
      if(state?.release==='1.4.1'){
        assert(typeof state.modManifestHash==='string'&&/^[a-f0-9]{16}$/.test(state.modManifestHash),
          'Empreinte de mod manquante dans la sauvegarde.');
        assert(state.modManifestHash===mod141Hash(JSON.stringify(state.mod)),
          'Le manifeste du mod ne correspond plus a la sauvegarde.');
      }
      return result;
    };

    // Frontieres 1.5: no save-map migration is required. The simulation contents
    // and manifest format are unchanged; only the release identifier advances.
    // The 1.4.1 manifest guard remains active and is extended to new snapshots.
    const check141For15=Engine.prototype.checkInvariants;
    Engine.prototype.checkInvariants=function(state=this.s){
      const result=check141For15.call(this,state);
      if(state?.release==='1.5'){
        assert(typeof state.modManifestHash==='string'&&/^[a-f0-9]{16}$/.test(state.modManifestHash),
          'Empreinte de mod absente dans une sauvegarde 1.5.');
        assert(state.modManifestHash===mod141Hash(JSON.stringify(state.mod)),
          'Empreinte du manifeste de mod invalide.');
      }
      return result;
    };
    const newGame141For15=Engine.prototype.newGame;
    Engine.prototype.newGame=function(...args){
      const state=newGame141For15.apply(this,args);
      state.release='1.5';this.checkInvariants();return state;
    };
    const load141For15=Engine.prototype.load;
    Engine.prototype.load=function(raw){
      // Never silently admit a 1.5 snapshot without a valid manifest.
      if(raw?.release==='1.5'){
        assert(typeof raw.modManifestHash==='string'&&/^[a-f0-9]{16}$/.test(raw.modManifestHash),
          'La sauvegarde 1.5 ne contient pas d\'empreinte de mod valide.');
      }
      const state=load141For15.call(this,raw);
      state.release='1.5';this.checkInvariants();return state;
    };

    // Frontieres 1.6: grand strategy systems (src/systems.js).
    assert(typeof installSystems16==='function','Le module des syst\u00e8mes 1.6 est absent.');
    installSystems16(Engine,{clone,clamp,sum,assert,finite,distance,hash:mod141Hash,
      getTemplateStats:()=>templateStats,setTemplateStats:f=>{templateStats=f;}});

  return Engine;
}
if(typeof module!=='undefined'){
  if(typeof installSystems16==='undefined')globalThis.installSystems16=require('./systems.js').installSystems16;
  module.exports={createEngineClass,Engine:createEngineClass()};
}
