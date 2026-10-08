const palettes = {
  sage: { bg: '#E8EDE4', wall: '#F5F4E8', main: '#6F8C74', dark: '#365A43', soft: '#B5C6AA', shade: '#CDD8C9', accent: '#D8B789' },
  sand: { bg: '#F0EAE0', wall: '#FBF7EE', main: '#B99D78', dark: '#665B4D', soft: '#D7CBB5', shade: '#E0D5C3', accent: '#76907A' },
  blue: { bg: '#E5EBEE', wall: '#F2F5F2', main: '#78949B', dark: '#405D66', soft: '#B8CBD0', shade: '#CDDADF', accent: '#D4B788' },
  rose: { bg: '#F0E7E2', wall: '#FAF3EC', main: '#BB9384', dark: '#76584E', soft: '#DBC1B3', shade: '#E2D0C6', accent: '#879C7F' },
};

function plant(x, y, scale = 1, p = palettes.sage) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <path d="M0 0V-52M0-19C-29-17-35-35-30-47C-12-46-2-35 0-19M0-33C29-31 36-49 29-61C10-60 1-47 0-33" fill="${p.main}" stroke="${p.dark}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M-20-2H20L15 31H-15Z" fill="${p.accent}"/>
    <rect x="-23" y="-5" width="46" height="9" rx="3" fill="${p.wall}"/>
    <path d="M-10 8L-8 23" stroke="${p.wall}" stroke-width="3" stroke-linecap="round" opacity=".65"/>
  </g>`;
}

function monitor(p, x, y, scale = 1, angle = 0) {
  return `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})">
    <path d="M91 130L85 170H149L142 130" fill="${p.dark}"/>
    <path d="M81 167H155L173 177H65Z" fill="${p.main}"/>
    <rect width="234" height="142" rx="10" fill="${p.dark}"/>
    <rect x="9" y="9" width="216" height="121" rx="4" fill="${p.soft}"/>
    <path d="M9 104C53 84 74 28 123 35C165 41 174 99 225 86V130H9Z" fill="${p.main}"/>
    <path d="M9 112C70 99 105 83 140 95C174 108 196 126 225 116V130H9Z" fill="${p.wall}" opacity=".55"/>
    <circle cx="177" cy="43" r="17" fill="${p.wall}" opacity=".8"/>
    <path d="M25 23H67" stroke="${p.wall}" stroke-width="4" stroke-linecap="round" opacity=".45"/>
    <circle cx="117" cy="136" r="2" fill="${p.soft}"/>
  </g>`;
}

function storefront(p) {
  return `<ellipse cx="320" cy="347" rx="228" ry="21" fill="${p.shade}"/>
    <path d="M159 129L479 111V325L159 343Z" fill="${p.wall}"/>
    <path d="M479 111L512 127V309L479 325Z" fill="${p.soft}"/>
    <path d="M148 115L474 97L516 118L190 137Z" fill="${p.soft}"/>
    <path d="M148 115L190 137V153L148 131Z" fill="${p.main}"/>
    <path d="M190 137L516 118V137L190 155Z" fill="${p.main}"/>
    <path d="M157 326L477 308L477 327L157 345Z" fill="${p.soft}"/>
    <path d="M168 344L480 326L508 339L196 358Z" fill="${p.wall}"/>
    <path d="M191 181L303 175V313L191 319Z" fill="${p.dark}"/>
    <path d="M201 192L293 187V301L201 306Z" fill="${p.soft}"/>
    <path d="M201 239L293 205V219L201 253Z" fill="${p.wall}" opacity=".55"/>
    <path d="M201 272L293 239V246L201 279Z" fill="${p.wall}" opacity=".38"/>
    <path d="M282 245V265" stroke="${p.dark}" stroke-width="4" stroke-linecap="round"/>
    <path d="M328 175L451 168V277L328 284Z" fill="${p.dark}"/>
    <path d="M337 184L442 178V268L337 274Z" fill="${p.soft}"/>
    <path d="M341 249L437 243" stroke="${p.main}" stroke-width="5"/>
    <path d="M349 217L381 215V236L349 238ZM397 214L429 212V233L397 235Z" fill="${p.dark}"/>
    <path d="M352 220L378 218V232L352 234ZM400 217L426 215V229L400 231Z" fill="${p.wall}" opacity=".7"/>
    <path d="M365 237V245M413 234V242" stroke="${p.dark}" stroke-width="3"/>
    <path d="M329 286L453 279V288L329 295Z" fill="${p.main}"/>
    <path d="M190 154L471 138L485 184L178 202Z" fill="${p.wall}"/>
    <path d="M190 154L223 152L214 200L178 202ZM257 150L291 148L287 196L251 198ZM325 146L359 144L360 192L323 194ZM393 142L427 140L435 188L398 190ZM460 139L471 138L485 184L471 185Z" fill="${p.main}"/>
    <path d="M178 201V209Q196 224 214 207V199M214 199V207Q233 220 251 205V197M251 197V205Q270 218 287 203V195M287 195V203Q305 216 323 201V193M323 193V201Q342 214 360 199V191M360 191V199Q379 212 398 197V189M398 189V197Q417 210 435 195V187M435 187V195Q453 208 471 193V185M471 185V193Q480 200 485 192V184" fill="${p.main}" stroke="${p.wall}" stroke-width="1.3"/>
    ${plant(142, 307, 1.15, p)}
    <path d="M474 291L497 290L503 327L471 329Z" fill="${p.accent}"/>
    <path d="M487 291V270M487 279Q467 277 472 263Q487 263 487 279M488 275Q508 272 501 258Q489 260 488 275" fill="${p.main}" stroke="${p.main}" stroke-width="2"/>
    <path d="M218 106L214 79M239 103L247 78" stroke="${p.wall}" stroke-width="4" stroke-linecap="round" opacity=".8"/>`;
}

function monitorScene(p) {
  return `<ellipse cx="322" cy="338" rx="227" ry="23" fill="${p.shade}"/>
    <path d="M106 310L507 299L537 325L137 337Z" fill="${p.wall}"/>
    ${monitor(p, 144, 108, 1.48, -3)}
    <path d="M241 321L376 316L405 330L266 336Z" fill="${p.main}"/>
    <path d="M258 323L373 319M267 327L382 323" stroke="${p.wall}" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>
    <path d="M438 315C428 304 440 298 449 301L467 313C474 323 453 328 438 315Z" fill="${p.main}"/>
    <path d="M446 305L451 309" stroke="${p.wall}" stroke-width="2" stroke-linecap="round"/>
    ${plant(116, 294, .67, p)}
    <path d="M476 274L505 272L507 303L479 305Z" fill="${p.accent}"/>
    <path d="M505 278C523 274 523 294 507 294" fill="none" stroke="${p.accent}" stroke-width="5"/>
    <path d="M486 256C479 248 492 246 486 237" fill="none" stroke="${p.wall}" stroke-width="3" stroke-linecap="round"/>`;
}

function deskScene(p) {
  return `<ellipse cx="320" cy="351" rx="235" ry="23" fill="${p.shade}"/>
    <path d="M150 260L166 259V348L150 350ZM464 242L478 244V335L464 337Z" fill="${p.dark}"/>
    <path d="M156 260L487 242L522 264L192 286Z" fill="${p.main}"/>
    <path d="M129 241L463 222L522 254L187 275Z" fill="${p.accent}"/>
    <path d="M129 241L187 275V286L129 252ZM187 275L522 254V265L187 286Z" fill="${p.wall}"/>
    ${monitor(p, 157, 111, .85, -3)}
    ${monitor(p, 349, 102, .61, -3)}
    <path d="M229 249L331 243L358 256L252 262Z" fill="${p.main}"/>
    <path d="M244 249L323 245M252 254L332 249" stroke="${p.wall}" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="391" cy="248" rx="14" ry="6" transform="rotate(-3 391 248)" fill="${p.dark}"/>
    <path d="M309 353V311" stroke="${p.dark}" stroke-width="10"/>
    <path d="M309 347L273 359M309 347L341 358" stroke="${p.dark}" stroke-width="7" stroke-linecap="round"/>
    <path d="M266 294Q266 283 280 282L332 279Q349 278 351 290L354 310Q355 319 340 320L281 323Q267 324 267 314Z" fill="${p.main}"/>
    <path d="M275 278L270 250Q269 236 284 235L327 232Q342 231 345 245L349 274Z" fill="${p.dark}"/>
    <path d="M280 275L277 251Q276 242 285 242L326 239Q335 238 337 247L341 272Z" fill="${p.soft}"/>
    ${plant(464, 214, .61, p)}`;
}

function chairScene(p) {
  return `<ellipse cx="324" cy="354" rx="177" ry="22" fill="${p.shade}"/>
    <path d="M322 276V335" stroke="${p.dark}" stroke-width="16"/>
    <path d="M322 327L253 350M322 327L380 352M322 327L314 359M322 327L369 331M322 327L281 329" stroke="${p.dark}" stroke-width="9" stroke-linecap="round"/>
    <g fill="${p.dark}"><rect x="245" y="346" width="18" height="11" rx="5"/><rect x="372" y="348" width="18" height="11" rx="5"/><rect x="305" y="355" width="19" height="11" rx="5"/></g>
    <path d="M245 238Q224 228 226 207L231 154Q232 125 263 123L350 117Q381 115 383 145L388 205Q390 225 373 240Z" fill="${p.dark}"/>
    <path d="M251 231Q237 224 239 208L244 154Q245 139 264 138L348 132Q365 131 367 149L372 207Q373 221 362 232Z" fill="${p.main}"/>
    <path d="M261 150L257 211M282 148L280 217M304 146V216M326 144L329 213M348 144L353 207" stroke="${p.soft}" stroke-width="2" opacity=".68"/>
    <path d="M259 127L257 108Q256 95 270 94L332 90Q347 89 348 103L349 120" fill="${p.dark}"/>
    <path d="M266 116L265 107Q265 102 271 102L332 98Q339 98 340 104L341 112Z" fill="${p.main}"/>
    <path d="M240 238L359 229Q377 228 386 243L395 258Q402 273 381 278L278 295Q260 298 248 284L229 264Q216 244 240 238Z" fill="${p.dark}"/>
    <path d="M241 238L359 229Q376 228 383 241L390 253Q393 260 381 263L277 280Q265 282 257 273L235 252Q228 243 241 238Z" fill="${p.main}"/>
    <path d="M249 247L367 239" stroke="${p.soft}" stroke-width="3" stroke-linecap="round" opacity=".65"/>
    <path d="M242 265L221 251V220M380 258L404 244V213" fill="none" stroke="${p.dark}" stroke-width="9" stroke-linejoin="round"/>
    <path d="M201 216L242 211M386 210L427 205" stroke="${p.dark}" stroke-width="13" stroke-linecap="round"/>
    <path d="M202 213L239 209M387 207L424 202" stroke="${p.main}" stroke-width="7" stroke-linecap="round"/>
    ${plant(475, 317, .78, p)}`;
}

export function illustration(kind, tone = 'sage') {
  const p = palettes[tone] || palettes.sage;
  const scenes = { store: storefront, monitor: monitorScene, desk: deskScene, chair: chairScene };
  const labels = { store: '차양이 있는 PC 매장 삽화', monitor: '책상 위 PC 모니터 삽화', desk: 'PC와 책상이 놓인 작업 공간 삽화', chair: '업무용 의자 삽화' };
  const chosen = Object.hasOwn(scenes, kind) ? kind : 'store';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420" role="img" aria-label="${labels[chosen]}"><rect width="640" height="420" fill="${p.bg}"/><circle cx="352" cy="196" r="140" fill="${p.wall}" opacity=".5"/>${scenes[chosen](p)}</svg>`;
}

export function heroArt() {
  const p = palettes.sage;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 310" role="img" aria-label="PC 매장과 모니터, 대화 말풍선 삽화">
    <rect width="520" height="310" rx="24" fill="#E8EDE3"/>
    <ellipse cx="267" cy="268" rx="204" ry="20" fill="#D8E1D2"/>
    <circle cx="302" cy="148" r="118" fill="#F2F4E9"/>
    <g transform="translate(-52 0) scale(.78)">${storefront(p)}</g>
    <g transform="translate(309 142)">
      <path d="M-16 89L132 81L154 99L4 108Z" fill="#D1C0A1"/>
      <path d="M4 108L154 99V105L4 115Z" fill="#B9A785"/>
      ${monitor({ ...p, soft: '#CAD9C3', main: '#89A183' }, 0, 0, .61, -4)}
      <path d="M38 96L91 92L109 99L54 103Z" fill="#6F8C74"/>
      <path d="M47 96L89 94" stroke="#EEF1E6" stroke-width="1.5" stroke-linecap="round"/>
    </g>
    <g transform="translate(351 44) rotate(5)">
      <path d="M0 13Q0 0 14 0H66Q80 0 80 14V47Q80 60 66 60H37L19 76V60H14Q0 60 0 46Z" fill="#43694C"/>
      <circle cx="23" cy="30" r="4" fill="#E7EDDF"/><circle cx="40" cy="30" r="4" fill="#E7EDDF"/><circle cx="57" cy="30" r="4" fill="#E7EDDF"/>
    </g>
    <g transform="translate(63 71) rotate(-8)"><rect width="54" height="45" rx="12" fill="#F9F8EF"/><path d="M16 23L24 30L38 15" fill="none" stroke="#6F8C74" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g>
    <path d="M446 134V146M440 140H452" stroke="#9AAA91" stroke-width="3" stroke-linecap="round"/>
    <circle cx="293" cy="35" r="4" fill="#C6B38D"/>
  </svg>`;
}
