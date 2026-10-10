// An open Korean ㅁ: a compact courtyard with a rust-colored doorstep.
// Broad strokes and a clear opening keep the mark readable at favicon sizes.
const markPaths = '<path fill="#242623" d="M5 5h38v38H30v-8h5V13H13v22h5v8H5Z"/><path fill="#a8432d" d="M21 38h6v5h-6Z"/>';
const brandFont = "'Malgun Gothic','Noto Sans KR','Apple SD Gothic Neo',sans-serif";
const bodyFont = brandFont;

export const logoMark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" role="img" aria-label="성인PC마당 로고">${markPaths}</svg>`;

export const logoLockup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 270 56" width="270" height="56" role="img" aria-label="성인PC마당"><g transform="translate(0 4)">${markPaths}</g><text x="59" y="38" fill="#242623" font-family="${brandFont}" font-size="32" font-weight="700" letter-spacing="-1.8">성인PC마당</text></svg>`;

export const socialCard = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" role="img" aria-label="성인PC마당, 성인PC·PC방 매매와 PC·집기 중고장터, 업주 이야기">
  <rect width="1200" height="630" fill="#faf9f6"/>
  <rect width="1200" height="8" fill="#a8432d"/>
  <g transform="translate(74 58) scale(1.12)">${markPaths}</g>
  <text x="142" y="99" fill="#242623" font-family="${brandFont}" font-size="34" font-weight="700" letter-spacing="-1.8">성인PC마당</text>
  <text x="1120" y="94" text-anchor="end" fill="#676960" font-family="${bodyFont}" font-size="18" font-weight="500">매물 · 중고장터 · 커뮤니티</text>
  <path d="M80 145h1040" fill="none" stroke="#dcdcd5"/>
  <text x="80" y="265" fill="#a8432d" font-family="${bodyFont}" font-size="21" font-weight="700" letter-spacing="-.5">사장님들의 거래와 이야기</text>
  <text x="76" y="352" fill="#242623" font-family="${brandFont}" font-size="64" font-weight="700" letter-spacing="-3">성인PC·PC방 매매</text>
  <text x="81" y="411" fill="#676960" font-family="${bodyFont}" font-size="27" font-weight="500" letter-spacing="-.8">PC·집기 중고장터와 업주 이야기</text>
  <g transform="translate(967 270) scale(3.2)">${markPaths}</g>
  <path d="M80 504h1040" fill="none" stroke="#242623" stroke-width="2"/>
  <text x="80" y="557" fill="#242623" font-family="${bodyFont}" font-size="21" font-weight="700" letter-spacing="-.5">점포 양도·양수</text>
  <circle cx="276" cy="550" r="2.5" fill="#a8432d"/>
  <text x="307" y="557" fill="#242623" font-family="${bodyFont}" font-size="21" font-weight="700" letter-spacing="-.5">PC·집기 거래</text>
  <circle cx="490" cy="550" r="2.5" fill="#a8432d"/>
  <text x="521" y="557" fill="#242623" font-family="${bodyFont}" font-size="21" font-weight="700" letter-spacing="-.5">업주 커뮤니티</text>
</svg>`;
