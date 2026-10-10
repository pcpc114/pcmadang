// A small, open courtyard drawn for 성인PC마당. All shapes are native SVG.
const palette = { paper: '#f6f3e9', pale: '#e8e5d6', green: '#264f40', ink: '#24392e', ochre: '#c49956', brick: '#ad624b', sage: '#b3bea7' };
const point = (x, y, z = 0) => [324 + x - y, 140 + (x + y) * .46 - z];
const coords = points => points.map(p => point(...p).map(n => +n.toFixed(2)).join(',')).join(' ');
const poly = (points, fill, extra = '') => `<polygon points="${coords(points)}" fill="${fill}" ${extra}/>`;
const line = (points, extra = '') => `<polyline points="${coords(points)}" fill="none" ${extra}/>`;
const wallY = (x, y, z, content) => { const [px, py] = point(x, y, z); return `<g transform="matrix(1 .46 0 1 ${px} ${py})">${content}</g>`; };
const wallX = (x, y, z, content) => { const [px, py] = point(x, y, z); return `<g transform="matrix(-1 .46 0 1 ${px} ${py})">${content}</g>`; };

function planter(x, y, size = 20) {
  const z = 20;
  const [cx, cy] = point(x + size / 2, y + size / 2, z + 2);
  return `${poly([[x,y,0],[x+size,y,0],[x+size+3,y-3,z],[x-3,y-3,z]], palette.brick)}
    ${poly([[x+size,y,0],[x+size,y+size,0],[x+size+3,y+size+3,z],[x+size+3,y-3,z]], '#995740')}
    ${poly([[x,y+size,0],[x+size,y+size,0],[x+size+3,y+size+3,z],[x-3,y+size+3,z]], palette.brick)}
    ${poly([[x-3,y-3,z],[x+size+3,y-3,z],[x+size+3,y+size+3,z],[x-3,y+size+3,z]], palette.paper)}
    <g transform="translate(${cx} ${cy})" fill="${palette.green}" stroke="${palette.green}" stroke-width="1.6">
      <path d="M0 1C-3-12-1-25 3-39M0-10C-8-16-14-17-20-17M1-19C8-25 14-26 19-26" fill="none"/>
      <path d="M2-32C-5-33-9-38-9-44C0-43 4-39 2-32ZM2-23C8-26 11-32 9-37C2-35 0-30 2-23ZM-8-14C-18-11-23-15-26-20C-17-24-11-20-8-14ZM10-23C15-19 22-21 27-27C19-31 13-28 10-23Z"/>
    </g>`;
}

const backWall = wallY(48, 48, 91, `
  <rect width="130" height="91" fill="${palette.paper}"/>
  <rect x="8" y="9" width="114" height="23" fill="${palette.green}"/>
  <text x="65" y="25" fill="${palette.paper}" stroke="none" text-anchor="middle" font-family="Pretendard, 'Malgun Gothic', sans-serif" font-size="11" font-weight="700" letter-spacing="1.25">성인PC마당</text>
  <rect x="9" y="42" width="78" height="42" fill="${palette.pale}"/>
  <rect x="93" y="42" width="29" height="49" fill="${palette.green}"/>
  <rect x="98" y="47" width="19" height="24" fill="${palette.sage}"/>
  <path d="M115 78v5M48 43v40M10 72h77"/>
  <rect x="20" y="54" width="19" height="13" rx=".5" fill="${palette.paper}"/>
  <path d="M29.5 67v5m-6 0h12"/>
  <rect x="58" y="54" width="19" height="13" rx=".5" fill="${palette.paper}"/>
  <path d="M67.5 67v5m-6 0h12"/>
  <path d="m15 45 6 5m49-5 6 5" stroke="${palette.paper}"/>
`);

const awning = `${poly([[53,48,53],[173,48,53],[173,66,46],[53,66,46]], palette.paper)}
  ${[0,2,4,6,8].map(i => poly([[53+i*12,48,53],[65+i*12,48,53],[65+i*12,66,46],[53+i*12,66,46]], palette.green, 'stroke="none"')).join('')}
  ${poly([[53,66,46],[173,66,46],[173,66,39],[53,66,39]], palette.paper)}
  ${[0,2,4,6,8].map(i => poly([[53+i*12,66,46],[65+i*12,66,46],[65+i*12,66,39],[53+i*12,66,39]], palette.green, 'stroke="none"')).join('')}
  ${line([[53,48,53],[173,48,53],[173,66,46],[53,66,46],[53,48,53]])}
  ${line([[53,66,39],[173,66,39]])}`;

const leftWall = wallX(48, 48, 83, `
  <rect width="132" height="83" fill="${palette.paper}"/>
  <path d="M7 12h118M7 17h118" stroke="${palette.sage}"/>
  <rect x="9" y="28" width="58" height="40" fill="${palette.sage}"/>
  <path d="M38 29v38M10 62h56"/>
  <rect x="17" y="40" width="16" height="14" fill="${palette.paper}"/>
  <rect x="44" y="40" width="16" height="14" fill="${palette.paper}"/>
  <path d="M25 54v8m27-8v8M19 62h12m15 0h12"/>
  <rect x="81" y="27" width="37" height="56" fill="${palette.green}"/>
  <rect x="86" y="32" width="27" height="31" fill="${palette.pale}"/>
  <path d="M109 69v6" stroke="${palette.paper}"/>
  <path d="M5 79h72M121 79h7"/>
`);

const bench = `
  ${line([[127,164,0],[127,164,16],[176,164,16],[176,164,0]], 'stroke-width="3"')}
  ${line([[127,179,0],[127,179,16],[176,179,16],[176,179,0]], 'stroke-width="3"')}
  ${poly([[121,159,18],[183,159,18],[183,179,18],[121,179,18]], palette.ochre)}
  ${line([[121,165,18],[183,165,18]])}
  ${line([[121,172,18],[183,172,18]])}
  ${line([[127,159,0],[127,159,38],[176,159,38],[176,159,0]], 'stroke-width="2.5"')}
  ${poly([[121,158,27],[183,158,27],[183,158,39],[121,158,39]], palette.ochre)}
`;

const standingSign = `
  ${poly([[76,186,0],[78,167,33],[99,167,33],[105,186,0]], palette.paper)}
  ${poly([[76,173,0],[78,167,33],[99,167,33],[100,173,0]], palette.ochre)}
  ${wallY(79,167,29, `<rect width="17" height="22" fill="${palette.green}"/><path d="M4 7h9v7H4zm4.5 7v3M6 17h5" stroke="${palette.paper}" fill="none" stroke-width="1.2"/>`)}
  ${line([[76,180,9],[103,180,9]])}
`;

export const courtyardArt = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 380" fill="none" role="img" aria-labelledby="madang-courtyard-title madang-courtyard-desc">
  <title id="madang-courtyard-title">가게와 가게 사이, 열린 마당</title>
  <desc id="madang-courtyard-desc">성인PC마당 간판과 줄무늬 차양, PC 모니터가 놓인 창가, 벤치와 화분이 모인 작은 상가 마당을 그린 브랜드 삽화입니다.</desc>
  <g stroke="${palette.ink}" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round">
    ${poly([[-14,-9,0],[241,-9,0],[241,213,0],[-14,213,0]], palette.pale, 'stroke="none"')}
    ${poly([[-14,213,0],[241,213,0],[241,213,-6],[-14,213,-6]], '#d8dccb', 'stroke="none"')}
    ${poly([[241,-9,0],[241,213,0],[241,213,-6],[241,-9,-6]], '#c7d0bd', 'stroke="none"')}
    <g stroke="#b6bfaa" stroke-width="1.05">
      ${line([[61,100,0],[167,100,0]])}
      ${line([[61,136,0],[176,136,0]])}
      ${line([[50,194,0],[217,194,0]])}
      ${line([[103,74,0],[103,160,0]])}
      ${line([[147,77,0],[147,149,0]])}
      ${line([[201,140,0],[201,207,0]])}
      ${line([[25,189,0],[25,207,0]])}
    </g>
    <!-- The roof line follows three wings, leaving a generous open court. -->
    ${poly([[0,48,0],[218,48,0],[218,48,96],[0,48,96]], palette.paper)}
    ${poly([[218,0,0],[218,48,0],[218,48,96],[218,0,96]], palette.sage)}
    ${backWall}
    ${poly([[0,0,96],[218,0,96],[218,48,96],[0,48,96]], palette.green)}
    ${poly([[7,5,97],[211,5,97],[211,41,97],[7,41,97]], '#45614d', 'stroke="none"')}
    ${line([[18,8,98],[204,8,98]], 'stroke="#aebba1" stroke-width="1"')}
    ${awning}
    <!-- Workshop wing; the repeated monitor shapes are deliberately understated. -->
    ${poly([[0,180,0],[48,180,0],[48,180,86],[0,180,86]], palette.sage)}
    ${leftWall}
    ${poly([[0,48,86],[48,48,86],[48,180,86],[0,180,86]], palette.green)}
    ${poly([[7,55,87],[41,55,87],[41,173,87],[7,173,87]], '#45614d', 'stroke="none"')}
    ${line([[8,62,88],[8,168,88]], 'stroke="#aebba1" stroke-width="1"')}
    ${wallY(9,180,65, `<rect width="29" height="36" fill="${palette.paper}"/><path d="M0 25h29m-23 6h17"/><path d="M14.5 0v25"/>`)}
    ${poly([[42,154,1],[62,154,1],[62,182,1],[42,182,1]], '#ccd1bd')}
    <!-- A lower third wing makes the meeting space feel open. -->
    ${poly([[178,118,0],[218,118,0],[218,118,72],[178,118,72]], palette.brick)}
    ${poly([[218,48,0],[218,118,0],[218,118,72],[218,48,72]], '#b9bca5')}
    ${poly([[178,48,72],[218,48,72],[218,118,72],[178,118,72]], palette.paper)}
    ${line([[184,55,73],[212,55,73],[212,112,73]], 'stroke="#8c9c80"')}
    ${wallY(185,118,55, `<rect width="25" height="34" fill="${palette.paper}"/><rect x="4" y="5" width="17" height="14" fill="${palette.green}"/><path d="M12.5 19v5m-5 0h10M5 29h15"/>`)}
    ${wallX(218,61,48, `<rect width="43" height="28" fill="${palette.paper}"/><path d="M4 8h35M4 14h35M4 20h35" stroke="${palette.green}" stroke-width="1.3"/>`)}
    ${planter(61,86,17)}
    ${bench}
    ${standingSign}
    ${planter(190,185,20)}
    <!-- Quiet paving marks frame the foreground instead of enclosing it. -->
    ${line([[33,215,1],[59,215,1]], 'stroke="'+palette.green+'" stroke-width="3"')}
    ${line([[213,215,1],[233,215,1]], 'stroke="'+palette.green+'" stroke-width="3"')}
    ${line([[243,158,0],[258,158,0]], 'stroke="#849779"')}
    ${line([[-23,153,0],[-23,170,0]], 'stroke="#849779"')}
  </g>
</svg>`;
