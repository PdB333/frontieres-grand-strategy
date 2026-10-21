function workerMain(Engine) {
  'use strict';
  let engine=null,last=performance.now(),acc=0,lastPublish=0;
  let sampleMs=[];
  const recordSample=ms=>{
    sampleMs.push(ms);if(sampleMs.length>120)sampleMs.shift();
    const ordered=[...sampleMs].sort((a,b)=>a-b);
    return {stepMs:+ms.toFixed(2),avgMs:+(sampleMs.reduce((a,b)=>a+b,0)/sampleMs.length).toFixed(2),p95Ms:+ordered[Math.min(ordered.length-1,Math.floor(ordered.length*.95))].toFixed(2)};
  };
  const postState=()=>{if(engine?.s)postMessage({type:'state',state:engine.s,perf:engine.timing});};
  onmessage=({data:m})=>{
    try{
      if(m.type==='new'){
        const candidate=new Engine(m.world,m.catalog);candidate.newGame(m.player,m.options,m.mod);engine=candidate;sampleMs=[];acc=0;last=performance.now();postState();postMessage({type:'ack',request:m.request});
      }else if(m.type==='load'){
        const candidate=new Engine(m.world,m.catalog);candidate.load(m.state);engine=candidate;sampleMs=[];acc=0;postState();postMessage({type:'ack',request:m.request});
      }else if(m.type==='command'){
        if(!engine)throw Error('Aucune campagne.');
        const result=engine.dispatch(m.action,m.params||{});postState();postMessage({type:'ack',request:m.request,result});
      }else if(m.type==='diagnostics'){
        if(!engine)throw Error('Lancez une campagne.');
        const results=[],original=engine.save();results.push({name:'Int\u00e9grit\u00e9 du monde',ok:true});
        const run=()=>{const e=new Engine(engine.world,engine.baseCatalog);e.load(original);e.s.pending=null;e.s.eventQueue=[];e.s.historical=false;e.s.mod.events=[];for(let i=0;i<30;i++)e.tick();e.checkInvariants();return JSON.stringify(e.s);};
        const t=performance.now(),a=run(),b=run();
        results.push({name:'30 jours simul\u00e9s sur une copie',ok:true},{name:'D\u00e9terminisme \u00e0 graine identique',ok:a===b},{name:'Partie originale non modifi\u00e9e',ok:JSON.stringify(original)===JSON.stringify(engine.s)});
        postMessage({type:'diagnostics',results,ms:performance.now()-t});
      }
    }catch(error){postMessage({type:'error',request:m.request,message:error.message,stack:error.stack});}
  };
  setInterval(()=>{
    const now=performance.now(),elapsed=Math.min(500,now-last);last=now;
    if(!engine?.s||engine.s.paused||engine.s.pending){acc=0;return;}
    acc+=elapsed;const speeds=[0,1000,500,240,115,55];let count=0;
    try{
      while(acc>=speeds[engine.s.speed]&&count<5&&!engine.s.paused&&!engine.s.pending){
        acc-=speeds[engine.s.speed];const t=performance.now();engine.tick();engine.timing=recordSample(performance.now()-t);count++;
      }
      if(count&&(now-lastPublish>(engine.timing.avgMs>22?330:200)||engine.s.paused)){lastPublish=now;postState();}
    }catch(error){engine.s.paused=true;postMessage({type:'error',message:'Simulation mise en pause : '+error.message,stack:error.stack});postState();}
  },30);
}
