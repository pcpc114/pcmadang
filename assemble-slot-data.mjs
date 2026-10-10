import {readFile,writeFile} from 'node:fs/promises';
const {games,total}=JSON.parse(await readFile('artifacts/slots/catalogue.json','utf8'));
const images=JSON.parse(await readFile('artifacts/slots/images.json','utf8'));
const official=await readFile('artifacts/slots/official-demos.json','utf8').then(JSON.parse).catch(()=>({}));
const categories={'슬롯':'slot','메가웨이즈':'megaways','클래식':'classic','인기':'popular'};
const clean=text=>String(text??'').replace(/<\/?t\d+\s*\/?\s*>/g,'').trim();
const data=[];
let available=0,missing=0,pending=0;
for(const game of games){
  const detail=await readFile(`artifacts/slots/details/${game.slug}.json`,'utf8').then(JSON.parse).catch(()=>null);
  if(!categories[game.category]||!images[game.slug]?.image)throw new Error(`Missing game category/image: ${game.slug}`);
  const restored=official[game.slug];
  const demoUrl=detail?.demoUrl||restored?.demoUrl||null;
  if(demoUrl)available++;else if(detail)missing++;else pending++;
  data.push({slug:game.slug,name:clean(game.name),ko:clean(game.nameKo)||clean(game.name),category:categories[game.category],image:images[game.slug].image,sourcePage:`https://xn--hy1b122ayhbp54a.com/slot/${game.slug}`,sourceImage:game.thumbnail,demoUrl,demoStatus:demoUrl?'available':detail?'unavailable':'checking',demoSource:detail?.demoUrl?`https://xn--hy1b122ayhbp54a.com/api/slots/${game.slug}`:restored?.sourcePage||null,demoSourceVerifiedAt:detail||restored?'2026-10-09':null});
}
if(data.length!==total)throw new Error('Incomplete catalogue');
await writeFile('slot-data.json',JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify({total:data.length,available,missing,pending}));
