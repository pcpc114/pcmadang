import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {navGroups} from './navigation.mjs';

const expected=[
  ['PC방 팝니다',['성인PC방','일반PC방','기타업종']],
  ['PC방 삽니다',['성인PC방','일반PC방','기타업종']],
  ['중고장터',['판매','구매']],
  ['구인구직',['구인정보','구직정보']],
  ['커뮤니티',['자유게시판','사진','유머','매장 노하우&질문']],
  ['공지사항',['공지사항','최신 뉴스','심의게임 소식']],
  ['무료슬롯',[]],['고객센터',[]]
];
assert.deepEqual(navGroups.map(g=>[g.label,g.children.map(c=>c.label)]),expected);
const home=await readFile('dist/index.html','utf8');
const buildManifest=JSON.parse(await readFile('artifacts/seo/build-manifest.json','utf8'));
const nav=home.match(/<nav class="container main-nav category-navigation"[\s\S]*?<\/nav>/)?.[0];
assert(nav,'Missing main navigation');
let boards=0;
for(const group of navGroups){
  assert(nav.includes(`href="${group.href}"`),`Missing parent link ${group.href}`);
  for(const child of group.children){
    boards++;
    const html=await readFile('dist'+child.href+'index.html','utf8');
    assert(nav.includes(`href="${child.href}"`),`Missing child link ${child.href}`);
    assert(html.includes(`href="${child.href}" class="selected" aria-current="page"`),`Wrong active board ${child.href}`);
    assert.match(html,buildManifest.auditPreviewPages?/<meta name="robots" content="index, follow, max-image-preview:large">/:/<meta name="robots" content="noindex, follow">/);
    const data=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
    const crumbs=data['@graph'].find(x=>x['@type']==='BreadcrumbList').itemListElement;
    assert.equal(crumbs.length,3,`Wrong breadcrumb depth ${child.href}`);
    assert(crumbs[1].item.endsWith(group.href));
    assert(crumbs[2].item.endsWith(child.href));
    const main=html.match(/<main id="main">([\s\S]*?)<\/main>/)[1];
    if(child.kind==='notice')assert(!/data-action="write/.test(main),'Notices must not pretend to have public authoring');
    else assert(main.includes(`data-kind="${child.kind}" data-board="${child.href}"`),`Wrong form context ${child.href}`);
  }
}
const cases=[
  ['/stores/adult/',3,0],['/stores/general/',0,0],['/stores/other/',0,0],
  ['/equipment/sell/',5,0],['/equipment/buy/',0,0],
  ['/community/free/',0,1],['/community/tips/',0,3],['/community/photos/',0,0],['/community/humor/',0,0],
  ['/buy/adult/',0,0],['/jobs/recruit/',0,0],['/jobs/seeking/',0,0]
];
for(const [route,listings,posts] of cases){
  const html=await readFile('dist'+route+'index.html','utf8');
  const main=html.match(/<main id="main">([\s\S]*?)<\/main>/)[1];
  assert.equal((main.match(/data-listing="/g)||[]).length,listings,`Wrong listing category ${route}`);
  assert.equal((main.match(/class="community-article"/g)||[]).length,posts,`Wrong post category ${route}`);
}
const manifest=await readFile('dist/sitemap.xml','utf8');
for(const group of navGroups)for(const child of group.children)assert.equal(manifest.includes(child.href+'</loc>'),buildManifest.auditPreviewPages,`Board sitemap policy mismatch ${child.href}`);
console.log(JSON.stringify({topMenus:navGroups.length,boards,categoryCases:cases.length,result:'passed'},null,2));
