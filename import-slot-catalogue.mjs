import {readFile,writeFile,mkdir} from 'node:fs/promises';

// Imports the public catalogue and detail endpoints observed in the reference UI.
// Keep provenance and a resumable cache; never invent a missing game symbol.
const base='https://xn--hy1b122ayhbp54a.com';
const cache='artifacts/slots';
await mkdir(cache+'/details',{recursive:true});
const log=message=>process.stdout.write(message+'\n');
async function json(url){
  for(let attempt=0;attempt<3;attempt++){
    try{
      const response=await fetch(url,{signal:AbortSignal.timeout(12000)});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      return await response.json();
    }catch(error){if(attempt===2)throw error;await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)));}
  }
}
const refresh=process.argv.includes('--refresh');
const savedCatalogue=refresh?null:await readFile(cache+'/catalogue.json','utf8').then(JSON.parse).catch(()=>null);
const first=savedCatalogue?{games:savedCatalogue.games,total:savedCatalogue.total,totalPages:1}:await json(base+'/api/slots?page=1&limit=48&q=&category=');
if(!Array.isArray(first.games)||!Number.isInteger(first.totalPages))throw new Error('Unexpected catalogue response');
const catalogue=[...first.games];
for(let page=2;page<=first.totalPages;page++){
  const result=await json(base+`/api/slots?page=${page}&limit=48&q=&category=`);
  if(result.page!==page||result.total!==first.total)throw new Error('Catalogue changed during import');
  catalogue.push(...result.games);
}
if(catalogue.length!==first.total||new Set(catalogue.map(g=>g.slug)).size!==first.total)throw new Error('Missing or duplicate catalogue entries');
await writeFile(cache+'/catalogue.json',JSON.stringify({retrievedAt:new Date().toISOString(),source:base+'/api/slots',total:first.total,games:catalogue},null,2)+'\n');
log(`Catalogue: ${catalogue.length} unique games${savedCatalogue?' from verified cache':` across ${first.totalPages} pages`}`);
let cursor=0,done=0,unavailable=0;
const details=new Array(catalogue.length),failures=[];
async function worker(){
  while(cursor<catalogue.length){
    const index=cursor++, game=catalogue[index];
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(game.slug))throw new Error('Invalid slug');
    const file=cache+'/details/'+game.slug+'.json';
    try{
      let detail=refresh?null:await readFile(file,'utf8').then(JSON.parse).catch(()=>null);
      if(!detail)detail=await json(base+'/api/slots/'+game.slug);
      if(detail.slug!==game.slug)throw new Error('Incorrect game detail');
      if(detail.demoUrl){
        const demo=new URL(detail.demoUrl);
        if(demo.protocol!=='https:'||demo.hostname!=='demogamesfree-asia.pragmaticplay.net'||demo.pathname!=='/gs2c/openGame.do')throw new Error('Unexpected demo host/path');
      }else unavailable++;
      await writeFile(file,JSON.stringify(detail,null,2)+'\n');
      details[index]=detail;
    }catch(error){failures.push({slug:game.slug,error:error.message});log(`Failed: ${game.slug}: ${error.message}`);}
    done++; if(done%50===0||done===catalogue.length)log(`Details: ${done}/${catalogue.length}; no source demo: ${unavailable}; failures: ${failures.length}`);
  }
}
await Promise.all(Array.from({length:6},worker));
await writeFile(cache+'/import-report.json',JSON.stringify({source:base,total:first.total,complete:failures.length===0,unavailable,retrievedAt:new Date().toISOString(),failures},null,2)+'\n');
if(failures.length)throw new Error(`${failures.length} game details missing; previous live catalogue preserved`);
await writeFile(cache+'/complete.json',JSON.stringify(details,null,2)+'\n');
log('Complete catalogue saved; available demo URLs and missing source URLs distinguished.');
