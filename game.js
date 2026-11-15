// ROCK N' BIRA BATTLE (antigo Axe Masters): protótipo jogável com lendas da guitarra
// Lógica em passo fixo de 60 quadros por segundo; tempos em quadros (ver docs/eddie-ficha.md).

const W = 960, H = 540, FLOOR = 472; // linha do piso do palco
const FW = 460, FH = 300, AX = 220, AY = 290;
// SC: tamanho dos lutadores em relação ao cenário; caixas de acerto, efeitos e pulo acompanham
const SC = 0.8, px = v => Math.round(v * SC);
const BIG_T = 64; // quadros do título gigante do super (some antes do raio)
const MIN_GAP = px(125), ROUND_TIME = 99, WALL = px(85);
const JUMP_V = -15.2, GRAV = 0.85, JUMP_VX = 3.6;
const P2_TINT = 0x9fc8ff; // azul do P2 quando os dois lutadores têm a mesma cara

// tipografia anos 80: cromado pesado (Kanit Black Italic), neon em script (Mr Dafoe) e arcade (Press Start 2P)
const FONT_CHROME = 'Kanit', FONT_NEON = '"Mr Dafoe"', FONT_PIXEL = '"Press Start 2P"';

// ---------------------------------------------------------------------------------------------
// EDDIE
// ---------------------------------------------------------------------------------------------
// folhas (assets/<dir>/<nome>.png, 460x300 por quadro) e quantos quadros cada uma tem
const EDDIE_ANIMS = {
  idle: 10, walk_fwd: 10, walk_back: 10, lp: 10, hp: 10, lk: 10, hk: 10, eruption: 4, block: 2, hit: 3, ko: 5,
  jump: 6, crouch: 3, jumpkick: 2, projectile: 4, divebomb: 5, bomb: 2, explosion: 4,
  brownsound: 10, panama: 10, victory: 10, sharkbite: 10, bumblebee: 10, drill: 10,
  fx_bee: 4, fx_drill: 4, fx_smoke: 4, react: 10, jumpcall: 5, dlr: 5, teacher: 10, fx_beam: 4, fx_zap: 4, spanish: 10, sleep: 5, fx_hypno: 5, dance: 5, bira: 10,
  fx_spark: 5, fx_block: 5, fx_wave: 5, fx_notes: 5, fx_dust: 5,
};
// letreiro de cada especial: nome cromado + assinatura neon na cor do poder
const EDDIE_POWERS = {
  eruption:   { name: 'ERUPTION',    tag: 'Fireball',     neon: '#ff7a1a', edge: 0xff7a1a, deep: 0x3a0d00 },
  brownsound: { name: 'BROWN SOUND', tag: 'Distortion',        neon: '#ffb347', edge: 0xc8742a, deep: 0x2a1408 },
  sharkbite:  { name: 'SHARK BITE',  tag: 'Ibanez Shark',     neon: '#3cf0ff', edge: 0x3cf0ff, deep: 0x04243a },
  bumblebee:  { name: 'BUMBLEBEE',   tag: 'Killer Bees',           neon: '#ffe14a', edge: 0xffe14a, deep: 0x1a1600 },
  drill:      { name: 'POUNDCAKE',   tag: 'Makita Drill', neon: '#7dff6a', edge: 0x7dff6a, deep: 0x0b2a12 },
  panama:     { name: 'PANAMA',      tag: 'Lamborghini',      neon: '#ff3d6e', edge: 0xff3d6e, deep: 0x33040f },
  spanish:    { name: 'SPANISH FLY', tag: 'Nylon Strings',    neon: '#ff8cf5', edge: 0xff8cf5, deep: 0x2a0a26 },
  teacher:    { name: '5150',        tag: 'Super!',    neon: '#ff3df0', edge: 0xff3df0, deep: 0x2a0630 },
  jumpcall:   { name: 'JUMP!',       tag: 'David Lee Roth',   neon: '#ff4fd8', edge: 0xff4fd8, deep: 0x2a0626 },
  divebomb:   { name: 'DIVE BOMB',   tag: 'Whammy Bar',         neon: '#c77dff', edge: 0xc77dff, deep: 0x1d0838 },
};

// o que cada acerto faz (dano, atordoamento, empurrão, piada); os especiais apontam para eles em "payload"
const JUMPKICK = { dmg: 75, dmgLight: 50, hit: { x: 10, y: -150, w: 120, h: 120 }, hitstun: 18, blockstun: 12, push: 7, overhead: true };
const PROJ = { dmg: 80, hitstun: 18, blockstun: 12, push: 8, chip: 10, gag: 'burnt', word: ['TOASTED!', '#ff7a1a'] };
const BEE = { dmg: 15, hitstun: 12, blockstun: 6, push: 3, chip: 3, gag: 'swell' };
const BOMB = { dmg: 45, hitstun: 20, blockstun: 12, push: 6, chip: 6, shake: 0.008, gag: 'dizzy', word: ['KABOOM!', '#ffb347'] };
// o David Lee Roth caindo sentado: não dá para defender agachado
const DLR = { dmg: 100, hitstun: 30, blockstun: 16, push: 9, chip: 10, shake: 0.012, overhead: true, gag: 'dizzy', word: ['YEAAAH!', '#ff4fd8'] };
// onda hipnótica: dano pequeno, mas quem leva cai no sono e fica sem defesa
const HYPNO = { dmg: 20, hitstun: 10, blockstun: 8, push: 1, chip: 2, gag: 'sleep', word: ['SLEEPY...', '#c77dff'] };

// Golpes. hit: retângulo relativo aos pés, x para frente. frames: quadros da folha usados em cada etapa (anim: outra folha).
// Mecânicas genéricas (qualquer lutador pode usar com outras folhas e números):
//   spawn      projétil (tex, payload, speed [normal, com S])     bombs   objetos caindo do céu (tex, payload, offsets)
//   swarm      enxame que persegue (tex, payload, count)          summon  ajudante que cai do céu (tex, payload)
//   waves      ondas lentas, uma basta (tex, payload)             beam    raio que atravessa a tela (tex, hitFx)
//   step/dash/slide  andar durante o golpe    ghost [de, até] rastro rosa    wave/dust/blast/smoke/sparks  efeitos
//   super      gasta a barra cheia, título gigante (bigTitle)     inv     quadros invencível no começo
const EDDIE_MOVES = {
  // Pick Slash: palhetada em leque com onda sonora
  lp: { dur: [1, 1, 1, 2, 2, 2, 1, 1, 2, 1], active: [3, 4], dmg: 30, hit: { x: 40, y: -195, w: 105, h: 55 }, hitstun: 14, blockstun: 8, push: 5, wave: 3 },
  // Frankenswing: golpe com o corpo da guitarra
  hp: { dur: [2, 2, 3, 2, 2, 4, 4, 3, 3, 3], active: [4, 5], dmg: 90, hit: { x: 20, y: -190, w: 165, h: 95 }, hitstun: 22, blockstun: 14, push: 10, shake: 0.006 },
  // Sneaker Snap: chute curto de tênis
  lk: { dur: [1, 2, 2, 1, 3, 3, 2, 2, 1, 1], active: [3, 4], dmg: 35, hit: { x: 30, y: -140, w: 125, h: 60 }, hitstun: 14, blockstun: 8, push: 6 },
  // Stage Leap: o pulo de palco com chute alto
  hk: { dur: [2, 3, 3, 3, 2, 4, 4, 4, 4, 3], active: [4, 5, 6], dmg: 95, hit: { x: 20, y: -320, w: 145, h: 160 }, hitstun: 22, blockstun: 14, push: 10, shake: 0.006, dust: 8 },
  eruption: { dur: [10, 5, 16, 12], frames: [0, 1, 1, 3], spawn: 1, tex: 'projectile', payload: PROJ, speed: [5, 8], ghost: [0, 24] },
  // BROWN SOUND: coluna de distorção que explode do chão em volta do Eddie (pega quem pula; invencível no começo)
  brownsound: { dur: [4, 2, 3, 3, 4, 6, 6, 5, 4, 3], active: [3, 4, 5, 6], dmg: 120, hit: { x: -60, y: -340, w: 200, h: 340 }, hitstun: 26, blockstun: 16, push: 11, shake: 0.01, blast: 3, inv: 10, gag: 'dizzy', word: ['BWAAAM!', '#ffb347'], ghost: [0, 24] },
  // SHARK BITE: troca pela Ibanez Destroyer 'Shark' e dá 3 mordidas
  sharkbite: { dur: [3, 5, 4, 3, 2, 6, 6, 6, 4, 3], active: [5, 6, 7], multi: 6, dmg: 40, hit: { x: 10, y: -230, w: 175, h: 160 }, hitstun: 14, blockstun: 8, push: 4, shake: 0.006, smoke: 1, step: [3, 4, 4], gag: 'chomp', ghost: [0, 24] },
  // BUMBLEBEE SWARM: troca pela Bumblebee e o acorde solta um enxame de abelhas
  bumblebee: { dur: [3, 5, 4, 3, 2, 8, 6, 5, 4, 3], smoke: 1, swarm: 5, tex: 'fx_bee', payload: BEE, count: 6 },
  // POUNDCAKE DRILL: Frankenstrat original + furadeira Makita nas cordas
  drill: { dur: [3, 5, 4, 4, 6, 6, 3, 6, 6, 3], active: [4, 5, 6, 7], multi: 4, dmg: 14, hit: { x: 20, y: -205, w: 150, h: 115 }, hitstun: 10, blockstun: 6, push: 2, smoke: 1, step: [5, 7, 6], sparks: [4, 7], gag: 'buzz', ghost: [0, 24] },
  // PANAMA: estala os dedos, o Lamborghini aparece, acelera, arranca, atropela, ele acena e salta fora
  panama: { dur: [6, 8, 8, 5, 3, 4, 3, 8, 8, 6], active: [4, 5, 6], dmg: 110, hit: { x: -40, y: -150, w: 210, h: 150 }, hitstun: 24, blockstun: 14, push: 12, shake: 0.008, dash: [3, 6], dust: 3,
    rev: { at: 2, fx: 'projectile', word: ['VROOOM!', '#ff3d6e'] }, gag: 'flat', word: ['ROADKILL!', '#ff3d6e'], ghost: [22, 40] },
  // DIVE BOMB: 3 bombas caem do céu onde o oponente está
  divebomb: { dur: [8, 6, 10, 26, 10], bombs: 2, tex: 'bomb', payload: BOMB, offsets: [-70, 0, 70], ghost: [0, 24] },
  // JUMP!: o Eddie assobia, aponta para o céu e o David Lee Roth despenca em espacate em cima do oponente
  jumpcall: { dur: [6, 14, 14, 26, 14], summon: 2, tex: 'dlr', payload: DLR },
  // SPANISH FLY (A + D): tapping no violão clássico; três ondas hipnóticas fazem o oponente dormir
  spanish: { dur: [6, 10, 10, 8, 8, 8, 8, 10, 14, 10], waves: [3, 5, 7], tex: 'fx_hypno', payload: HYPNO },
  // SUPER 5150 (A + S com a barra Feedback cheia): óculos de professor, tapping, joelhada deslizando
  // e um raio que atravessa a tela; quem leva todos os acertos termina tostado
  teacher: { dur: [6, 20, 5, 5, 5, 5, 12, 12, 16, 16, 16, 16], frames: [0, 1, 2, 3, 2, 3, 4, 5, 6, 7, 8, 9], active: [8, 9], multi: 3, dmg: 22,
    hit: { x: 60, y: -235, w: 1100, h: 150 }, hitstun: 12, blockstun: 8, push: 1, chip: 4, gag: 'zap', beam: [8, 9], slide: 6, inv: 30, dark: true,
    super: true, tex: 'fx_beam', hitFx: 'fx_zap', notes: [2, 5], finish: { at: 10, gag: 'burnt', word: ['TOASTED!', '#ff7a1a'] } },
};

// Como cada especial sai, em ordem de prioridade (o primeiro que bater ganha).
//   chord: [b1, b2]  dois botões juntos (até 5 quadros de diferença); cancela o golpe normal do primeiro botão
//   btn: 'punch' (A/S) | 'kick' (D/F) | 'lp' | 'hp' | 'lk' | 'hk'   +   motion: setas (6 frente, 4 trás, 2 baixo, 5 solta)
//   lock: campo do lutador que, se ocupado, impede repetir (proj, bombs, swarm, dlr, hypno)
//   super: precisa da barra cheia e zera ela
const EDDIE_SPECIALS = [
  { move: 'teacher',    chord: ['lp', 'hp'], super: true },
  { move: 'spanish',    chord: ['lp', 'lk'], lock: 'hypno' },
  { move: 'panama',     chord: ['hp', 'lk'] },
  { move: 'jumpcall',   chord: ['hp', 'hk'], lock: 'dlr' },
  { move: 'brownsound', btn: 'punch', motion: [2, 5, 2] },
  { move: 'bumblebee',  btn: 'kick',  motion: [2, 5, 2], lock: 'swarm' },
  { move: 'jumpcall',   btn: 'kick',  motion: [6, 2], lock: 'dlr' },
  { move: 'panama',     btn: 'kick',  motion: [2, 6] },
  { move: 'sharkbite',  btn: 'kick',  motion: [2, 4] },
  { move: 'eruption',   btn: 'punch', motion: [2, 6], lock: 'proj' },
  { move: 'divebomb',   btn: 'punch', motion: [2, 4], lock: 'bombs' },
  { move: 'drill',      btn: 'punch', motion: [6, 5, 6] },
];

// CPU do Eddie: devolve a entrada do quadro (inp.special pede um especial pelo nome, sem precisar das setas)
function eddieCpu(me, op, scene) {
  const d = Math.abs(op.x - me.x), r = Math.random(), inp = {};
  const projIncoming = scene.projs.some(pr => pr.owner !== me && Math.abs(pr.x - me.x) < 280);
  const threat = (op.state === 'attack' && d < 260) || projIncoming;
  if (me.meter >= 100 && d < 600 && r < 0.04) { inp.special = 'teacher'; inp.hp = true; me.cpuCD = 120; }
  else if (op.airborne && d < 230 && r < 0.25) { inp.special = 'brownsound'; inp.hp = true; me.cpuCD = 40; }
  else if (d > 200 && d < 420 && r > 0.93) { inp.special = 'panama'; inp.hk = true; me.cpuCD = 45; }
  else if (d < 200 && r > 0.9) { inp.special = r > 0.95 ? 'sharkbite' : 'drill'; inp[inp.special === 'drill' ? 'hp' : 'hk'] = true; me.cpuCD = 45; }
  else if (d > 200 && !me.hypno && r > 0.09 && r < 0.11) { inp.special = 'spanish'; inp.lp = true; me.cpuCD = 100; }
  else if (d > 160 && !me.dlr && r > 0.06 && r < 0.09) { inp.special = 'jumpcall'; inp.lk = true; me.cpuCD = 70; }
  else if (d > 300 && !me.swarm && r < 0.06) { inp.special = 'bumblebee'; inp.hk = true; me.cpuCD = 45; }
  else if (projIncoming && r < 0.25) { inp.up = true; inp.fwd = true; me.cpuCD = 10; }
  else if (threat && r < 0.6) { inp.back = true; me.cpuCD = 16; }
  else if (d > 330) {
    if (!me.proj && r < 0.25) { inp.special = 'eruption'; inp[r < 0.12 ? 'lp' : 'hp'] = true; me.cpuCD = 30; }
    else if (!me.bombs && r < 0.35) { inp.special = 'divebomb'; inp.hp = true; me.cpuCD = 40; }
    else { inp.fwd = true; me.cpuCD = 12; }
  } else if (d > 175) {
    if (r < 0.1) { inp.up = true; inp.fwd = true; me.cpuCD = 14; }
    else if (r < 0.75) inp.fwd = true;
    me.cpuCD = me.cpuCD || 8;
  }
  else if (r < 0.5) { inp[['lp', 'lk', 'hp', 'hk'][(Math.random() * 4) | 0]] = true; me.cpuCD = 24; }
  else if (r < 0.65) { inp.down = true; inp.back = true; me.cpuCD = 14; }
  else if (r < 0.85) { inp.back = true; me.cpuCD = 12; }
  else me.cpuCD = 8;
  return inp;
}

// ---------------------------------------------------------------------------------------------
// SLASH (ver docs/slash-ficha.md)
// ---------------------------------------------------------------------------------------------
const SLASH_ANIMS = {
  idle: 10, walk_fwd: 10, walk_back: 10, lp: 10, hp: 10, lk: 10, hk: 10, react: 10, victory: 10,
  tophat: 4, fx_hat: 4, block: 2, hit: 3, ko: 5, jump: 6, crouch: 3, jumpkick: 2,
  paradise: 10, jungle: 10, snakepit: 10, fx_snake: 5, smoke: 10, fx_cloud: 5, axlcall: 5, axl: 5, doubleneck: 10, sweet: 10, raincall: 5, piano: 5, appetite: 10,
  sleep: 5, dance: 5, fx_sweet: 5,
};
const SLASH_POWERS = {
  tophat:     { name: 'TOP HAT',        tag: 'Boomerang',        neon: '#c9a0ff', edge: 0xc9a0ff, deep: 0x1d0838 },
  raincall:   { name: 'NOVEMBER RAIN',  tag: 'Grand Piano',      neon: '#9fd8ff', edge: 0x9fd8ff, deep: 0x06182a },
  paradise:   { name: 'PARADISE CITY',  tag: 'Pyro',             neon: '#ffb347', edge: 0xff7a1a, deep: 0x3a0d00 },
  jungle:     { name: 'WELCOME TO THE JUNGLE', tag: 'Python',    neon: '#7dff6a', edge: 0x7dff6a, deep: 0x0b2a12 },
  axlcall:    { name: 'YOU COULD BE MINE', tag: 'Axl Rose',      neon: '#ff3d6e', edge: 0xff3d6e, deep: 0x33040f },
  doubleneck: { name: 'DOUBLE NECK',    tag: 'Gibson EDS-1275',  neon: '#ff5a5a', edge: 0xff5a5a, deep: 0x2a0606 },
  sweet:      { name: 'SWEET CHILD',    tag: "O' Mine",          neon: '#ff8cf5', edge: 0xff8cf5, deep: 0x2a0a26 },
  snakepit:   { name: 'SNAKE PIT',      tag: 'Top Hat Snakes',   neon: '#7dff6a', edge: 0x7dff6a, deep: 0x0b2a12 },
  smoke:      { name: 'SMOKE SCREEN',   tag: 'Cough cough',      neon: '#b9a6d9', edge: 0xb9a6d9, deep: 0x1a1426 },
  appetite:   { name: 'APPETITE',       tag: 'Super!',           neon: '#ffb347', edge: 0xffb347, deep: 0x2a1408 },
};
// a cartola vai e volta como bumerangue
const HAT = { dmg: 70, hitstun: 18, blockstun: 12, push: 7, chip: 8, gag: 'dizzy', word: ['BONK!', '#c9a0ff'] };
// o piano cai em cima: não dá para defender agachado
const PIANO = { dmg: 110, hitstun: 28, blockstun: 16, push: 6, chip: 12, shake: 0.014, overhead: true, gag: 'flat', word: ['PLONK!', '#ffffff'] };
// o Axl entra deslizando de joelhos rente ao chão: só se defende agachado
const AXL = { dmg: 100, hitstun: 28, blockstun: 16, push: 10, chip: 10, shake: 0.01, low: true, gag: 'dizzy', word: ['NA NA NA!', '#ff3d6e'] };
// o riff encanta: quem leva dança sem parar e fica sem defesa
const SWEET = { dmg: 20, hitstun: 10, blockstun: 8, push: 1, chip: 2, gag: 'dance', word: ['SWEET!', '#ff8cf5'] };
// cobrinhas que saem da cartola e rastejam no chão: golpe baixo
const SNAKE = { dmg: 18, hitstun: 12, blockstun: 6, push: 3, chip: 3, low: true, gag: 'chomp' };
// nuvem de fumaça: lenta e grande; quem leva fica tossindo, tonto
const CLOUD = { dmg: 60, hitstun: 20, blockstun: 12, push: 4, chip: 6, gag: 'dizzy', word: ['COUGH! COUGH!', '#b9a6d9'] };
// raio do super caindo do céu
const BOLT = { dmg: 30, hitstun: 16, blockstun: 8, push: 1, chip: 5, gag: 'zap' };
const SLASH_MOVES = {
  // Pick Flick: palhetada rápida com onda curta de som
  lp: { dur: [1, 1, 1, 2, 2, 2, 1, 1, 2, 1], active: [3, 4], dmg: 30, hit: { x: 40, y: -200, w: 110, h: 60 }, hitstun: 14, blockstun: 8, push: 5, wave: 3 },
  // Les Paul Swing: gira e acerta com o corpo da guitarra
  hp: { dur: [2, 2, 3, 3, 3, 4, 4, 3, 3, 3], active: [4, 5], dmg: 90, hit: { x: 20, y: -215, w: 175, h: 100 }, hitstun: 22, blockstun: 14, push: 10, shake: 0.006 },
  // Boot Kick: chute reto de bota
  lk: { dur: [1, 2, 2, 2, 3, 3, 2, 2, 1, 1], active: [3, 4], dmg: 35, hit: { x: 30, y: -175, w: 140, h: 60 }, hitstun: 14, blockstun: 8, push: 6 },
  // Hair Whip Kick: chute alto segurando a cartola
  hk: { dur: [2, 3, 3, 3, 3, 4, 4, 4, 4, 3], active: [4, 5, 6], dmg: 95, hit: { x: 20, y: -330, w: 150, h: 170 }, hitstun: 22, blockstun: 14, push: 10, shake: 0.006 },
  // TOP HAT: joga a cartola, que vai até longe e volta para a mão
  tophat: { dur: [8, 6, 16, 12], spawn: 2, tex: 'fx_hat', payload: HAT, speed: [6, 9], boomerang: true, projScale: 0.75, ghost: [0, 20] },
  // NOVEMBER RAIN: chuva e um piano de cauda despencando onde o oponente está
  raincall: { dur: [6, 12, 20, 16, 8], bombs: 2, tex: 'piano', payload: PIANO, offsets: [0], bombScale: 0.75, landY: 70, crash: 2, rain: 150 },
  // PARADISE CITY: coluna de fogos do chão (pega quem pula; invencível no começo)
  paradise: { dur: [4, 2, 3, 3, 4, 6, 6, 5, 4, 3], active: [3, 4, 5, 6], dmg: 120, hit: { x: -60, y: -360, w: 210, h: 360 }, hitstun: 26, blockstun: 16, push: 11, shake: 0.01, blast: 3, inv: 10, gag: 'burnt', word: ['KA-BLAM!', '#ffb347'], ghost: [0, 24] },
  // WELCOME TO THE JUNGLE: arrancada e a píton dá o bote
  jungle: { dur: [5, 6, 4, 4, 5, 5, 4, 6, 6, 5], frames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 8], active: [4, 5, 6], dmg: 110, hit: { x: 0, y: -270, w: 240, h: 190 }, hitstun: 24, blockstun: 14, push: 12, shake: 0.008, dash: [3, 4], dust: 3, gag: 'dizzy', word: ['SSSNAP!', '#7dff6a'], ghost: [12, 34] },
  // YOU COULD BE MINE: o Slash assobia e o Axl Rose cruza a tela deslizando de joelhos
  axlcall: { dur: [6, 12, 14, 20, 10], slider: 2, tex: 'axl', payload: AXL },
  // DOUBLE NECK: troca pela Gibson de dois braços e acerta 3 vezes
  doubleneck: { dur: [3, 5, 4, 5, 5, 6, 6, 5, 4, 3], frames: [0, 1, 2, 3, 4, 5, 7, 7, 8, 9], active: [3, 4, 5], multi: 6, dmg: 40, hit: { x: 10, y: -270, w: 185, h: 210 }, hitstun: 14, blockstun: 8, push: 4, shake: 0.006, smoke: 1, step: [3, 5, 3], word: ['TWANG!', '#ff5a5a'], ghost: [0, 24] },
  // SNAKE PIT: vira a cartola e saem cobrinhas que rastejam atrás do oponente (rente ao chão)
  snakepit: { dur: [3, 5, 5, 6, 5, 6, 6, 5, 5, 3], frames: [0, 1, 2, 3, 3, 6, 6, 7, 8, 9], swarm: 4, tex: 'fx_snake', payload: SNAKE, count: 3, ground: true, swarmScale: 0.5 },
  // SMOKE SCREEN: traga, incha as bochechas e sopra uma nuvem de fumaça que rola devagar até o oponente
  smoke: { dur: [4, 6, 6, 10, 8, 6, 8, 8, 6, 4], spawn: 5, tex: 'fx_cloud', payload: CLOUD, speed: [2.6, 3.6], projScale: 1.1, projY: 175, projBox: [110, 90] },
  // SWEET CHILD (A + D): o riff solta ondas de notas e corações; quem leva dança sem defesa
  sweet: { dur: [6, 8, 10, 10, 10, 10, 10, 8, 10, 8], waves: [3, 5, 7], tex: 'fx_sweet', payload: SWEET },
  // SUPER APPETITE (A + S com a barra cheia): tela escura, chuva, solo e raios do céu em cima do oponente
  appetite: { dur: [6, 14, 10, 10, 14, 16, 16, 16, 16, 12], bolts: [4, 8], payload: BOLT, rain: 220, dark: true, super: true, inv: 30, notes: [4, 7],
    finish: { at: 9, gag: 'burnt', word: ['TOASTED!', '#ff7a1a'] } },
};
const SLASH_SPECIALS = [
  { move: 'appetite',   chord: ['lp', 'hp'], super: true },
  { move: 'sweet',      chord: ['lp', 'lk'], lock: 'hypno' },
  { move: 'jungle',     chord: ['hp', 'lk'] },
  { move: 'axlcall',    chord: ['hp', 'hk'], lock: 'dlr' },
  { move: 'paradise',   btn: 'punch', motion: [2, 5, 2] },
  { move: 'snakepit',   btn: 'kick',  motion: [2, 5, 2], lock: 'swarm' },
  { move: 'axlcall',    btn: 'kick',  motion: [6, 2], lock: 'dlr' },
  { move: 'jungle',     btn: 'kick',  motion: [2, 6] },
  { move: 'doubleneck', btn: 'kick',  motion: [2, 4] },
  { move: 'tophat',     btn: 'punch', motion: [2, 6], lock: 'proj' },
  { move: 'raincall',   btn: 'punch', motion: [2, 4], lock: 'bombs' },
  { move: 'smoke',      btn: 'punch', motion: [6, 5, 6], lock: 'proj' },
];
function slashCpu(me, op, scene) {
  const d = Math.abs(op.x - me.x), r = Math.random(), inp = {};
  const projIncoming = scene.projs.some(pr => pr.owner !== me && Math.abs(pr.x - me.x) < 280);
  const threat = (op.state === 'attack' && d < 260) || projIncoming;
  if (me.meter >= 100 && d < 700 && r < 0.04) { inp.special = 'appetite'; inp.hp = true; me.cpuCD = 140; }
  else if (op.airborne && d < 230 && r < 0.25) { inp.special = 'paradise'; inp.hp = true; me.cpuCD = 40; }
  else if (d > 200 && d < 420 && r > 0.93) { inp.special = 'jungle'; inp.hk = true; me.cpuCD = 45; }
  else if (d < 200 && r > 0.9) { inp.special = 'doubleneck'; inp.hk = true; me.cpuCD = 45; }
  else if (d > 300 && !me.swarm && r < 0.05) { inp.special = 'snakepit'; inp.hk = true; me.cpuCD = 45; }
  else if (d > 220 && !me.proj && r > 0.95) { inp.special = 'smoke'; inp.hp = true; me.cpuCD = 60; }
  else if (d > 200 && !me.hypno && r > 0.09 && r < 0.11) { inp.special = 'sweet'; inp.lp = true; me.cpuCD = 100; }
  else if (d > 160 && !me.dlr && r > 0.06 && r < 0.09) { inp.special = 'axlcall'; inp.lk = true; me.cpuCD = 70; }
  else if (projIncoming && r < 0.25) { inp.up = true; inp.fwd = true; me.cpuCD = 10; }
  else if (threat && r < 0.6) { inp.back = true; me.cpuCD = 16; }
  else if (d > 330) {
    if (!me.proj && r < 0.25) { inp.special = 'tophat'; inp[r < 0.12 ? 'lp' : 'hp'] = true; me.cpuCD = 30; }
    else if (!me.bombs && r < 0.33) { inp.special = 'raincall'; inp.hp = true; me.cpuCD = 50; }
    else { inp.fwd = true; me.cpuCD = 12; }
  } else if (d > 175) {
    if (r < 0.1) { inp.up = true; inp.fwd = true; me.cpuCD = 14; }
    else if (r < 0.75) inp.fwd = true;
    me.cpuCD = me.cpuCD || 8;
  }
  else if (r < 0.5) { inp[['lp', 'lk', 'hp', 'hk'][(Math.random() * 4) | 0]] = true; me.cpuCD = 24; }
  else if (r < 0.65) { inp.down = true; inp.back = true; me.cpuCD = 14; }
  else if (r < 0.85) { inp.back = true; me.cpuCD = 12; }
  else me.cpuCD = 8;
  return inp;
}

// ---------------------------------------------------------------------------------------------
// LUTADORES. Texturas: chave `${dir}_${folha}` (ex.: eddie_idle, slash_lp), arquivo assets/<dir>/<folha>.png.
// Folha que o lutador não tem cai na do placeholder e depois na do Eddie (efeitos comuns); nada disso trava o jogo.
// ---------------------------------------------------------------------------------------------
const CHARS = {};
CHARS.eddie = {
  name: 'EDDIE', dir: 'eddie', hp: 950, walkF: 3.2, walkB: 2.6,
  anims: EDDIE_ANIMS, moves: EDDIE_MOVES, powers: EDDIE_POWERS, specials: EDDIE_SPECIALS, cpu: eddieCpu,
  jumpkick: JUMPKICK, bigTitle: '5150', blurb: 'Brown Sound',
  stage: 'eddie', // palco da casa (ver STAGES)
};
CHARS.slash = {
  name: 'SLASH', dir: 'slash', hp: 1000, walkF: 3.0, walkB: 2.5,
  anims: SLASH_ANIMS, moves: SLASH_MOVES, powers: SLASH_POWERS, specials: SLASH_SPECIALS, cpu: slashCpu,
  jumpkick: JUMPKICK, bigTitle: 'APPETITE', bigSize: 150, blurb: 'Top Hat',
  stage: 'slash',
};
for (const [id, c] of Object.entries(CHARS)) c.id = id;

// EASTER EGG (A + S + D, qualquer lutador): o Ricardinho entra correndo com a bandeira do Rock n' Bira nas costas
// e empurra o adversário para o outro lado do palco. Folha bira (pasta do Eddie): 0-1 correndo, 2 freando,
// 3-5 empurrando, 6-8 comemorando, 9 indo embora.
const BIRA = { name: 'RICARDINHO', tag: "Rock n' Bira", neon: '#4aa8ff', edge: 0x4aa8ff, deep: 0x04182e };
const BIRA_HIT = { dmg: 30, hitstun: 50, blockstun: 50, push: 0, chip: 30, word: ['MOSH!', '#4aa8ff'] };

// PALCOS (escolhidos depois dos lutadores). Palco sem imagem não aparece na escolha.
// Na vitória, qualquer palco dá lugar ao Templo dos Deuses da Guitarra (TEMPLE), com os holofotes no vencedor.
const STAGES = [
  { id: 'eddie',    name: "EDDIE'S STAGE",  tag: 'Arena rock',         file: 'assets/stages/palco-eddie.jpg?v=6046b4c' },
  { id: 'slash',    name: 'SUNSET STRIP',   tag: 'Rock bar',           file: 'assets/stages/palco-slash.jpg?v=6046b4c' },
  { id: 'stairway', name: 'STAIRWAY HILL',  tag: 'Airship at dusk',    file: 'assets/stages/cenario-dirigivel.jpg?v=6046b4c' },
  { id: 'pig',      name: 'POWER STATION',  tag: 'Flying pig',         file: 'assets/stages/cenario-usina-porco.jpg?v=6046b4c' },
  { id: 'rooftop',  name: 'LONDON ROOFTOP', tag: 'The last gig',       file: 'assets/stages/cenario-telhado-londres.jpg?v=6046b4c' },
  { id: 'voltage',  name: 'HIGH VOLTAGE',   tag: 'Thunder road',       file: 'assets/stages/cenario-alta-voltagem.jpg?v=6046b4c' },
  { id: 'stadium',  name: "STADIUM '85",    tag: 'Live for the world', file: 'assets/stages/cenario-estadio.jpg?v=6046b4c' },
];
const stageById = id => STAGES.find(st => st.id === id);
// templo da vitória: imagem e posição (em 960x540) e cor dos holofotes do teto
const TEMPLE = { file: 'assets/stages/templo-vitoria.jpg?v=6046b4c', lamps: [[106, 30, 0xffd27a], [184, 36, 0xffe9a8], [781, 36, 0xffe9a8], [845, 32, 0xffd27a]] };

// reações cômicas (folha react do lutador que apanhou): quadros e duração em quadros de jogo; quem está na piada fica invencível
const GAGS = {
  burnt: { dur: 80, frame: t => t < 62 ? (Math.floor(t / 8) % 2) : 2 },
  swell: { dur: 72, frame: t => t < 18 ? 3 : (Math.floor(t / 7) % 2 ? 4 : 3) },
  dizzy: { dur: 72, frame: t => 5 + (Math.floor(t / 12) % 2) },
  flat:  { dur: 62, frame: t => t < 38 ? 7 : t < 50 ? 8 : 9 },
  // Spanish Fly: hipnotizado, boceja, cai, dorme roncando e acorda; dormindo NÃO é invencível (pode apanhar)
  sleep: { dur: 150, tex: 'sleep', vuln: true, frame: t => t < 30 ? 0 : t < 45 ? 1 : t < 55 ? 2 : t < 125 ? 3 : 4 },
  // Sweet Child: dança enfeitiçado sem parar; também fica sem defesa
  dance: { dur: 130, tex: 'dance', vuln: true, frame: t => Math.floor(t / 9) % 5 },
};
const HURT = { x: -45, y: -235, w: 90, h: 235 };
const HURT_CROUCH = { x: -50, y: -150, w: 100, h: 150 };
const BTNS = { punch: ['lp', 'hp'], kick: ['lk', 'hk'], lp: ['lp'], hp: ['hp'], lk: ['lk'], hk: ['hk'] };

// quantos quadros cada textura carregada tem (declarado no anims do lutador)
const FRAMES = {};
// chave da textura de uma folha para um lutador: a dele, a do placeholder, a do Eddie ou __MISSING
function texKey(scene, ch, name) {
  const cache = ch._tex || (ch._tex = {});
  if (cache[name]) return cache[name];
  for (const c of [ch, CHARS[ch.placeholder], CHARS.eddie]) {
    if (!c) continue;
    const k = `${c.dir}_${name}`;
    if (scene.textures.exists(k)) return (cache[name] = k);
  }
  return '__MISSING'; // não guarda: pode ser que a folha ainda chegue
}
function texFrames(scene, key) {
  if (key === '__MISSING' || !scene.textures.exists(key)) return 1;
  const real = Math.max(1, scene.textures.get(key).frameTotal - 1); // frameTotal conta o __BASE
  return Math.min(FRAMES[key] || real, real);
}
// troca o quadro só se ele existe (textura faltando não enche o console nem trava)
function setFr(spr, n) { if (spr.texture.has(n)) spr.setFrame(n); }

class Fighter {
  constructor(scene, side, cpu, char) {
    this.scene = scene;
    this.side = side; // 0 = P1, 1 = P2
    this.cpu = cpu;
    this.char = char;
    this.tint = 0xffffff;
    this.spr = scene.add.sprite(0, FLOOR, texKey(scene, char, 'idle'), 0).setDepth(10);
    this.shadow = scene.add.ellipse(0, FLOOR + 2, px(120), px(16), 0x000000, 0.35).setDepth(5);
    this.reset();
  }
  reset() {
    this.x = this.side === 0 ? 300 : 660; this.y = 0; this.vy = 0;
    this.facing = this.side === 0 ? 1 : -1;
    this.hp = this.char.hp;
    this.state = 'idle'; this.t = 0; this.stun = 0; this.vx = 0;
    this.move = null; this.hasHit = false; this.buf = []; this.proj = null; this.bombs = 0; this.swarm = 0; this.jk = null;
    this.holdBack = false; this.holdDown = false; this.cpuCD = 0; this.cpuHold = {};
    this.last = { lp: -99, hp: -99, lk: -99, hk: -99 }; this.hypno = 0; this.dlr = false; this.meter = 0;
    this.gag = null; this.pendGag = null; this.stings = 0; this.spin = false; this.rot = 0; this.buzz = 0; this.inv = 0;
  }
  get free() { return ['idle', 'walk_fwd', 'walk_back', 'crouch'].includes(this.state); }
  get airborne() { return this.y < 0; }
  get m() { return this.move ? this.char.moves[this.move] : null; } // dados do golpe atual
  canBlock() { return this.free || this.state === 'block'; }
  hurtbox() {
    const hb = this.state === 'crouch' || (this.state === 'block' && this.holdDown) ? (this.char.hurtCrouch || HURT_CROUCH) : (this.char.hurt || HURT);
    return { x: this.x + hb.x * SC, y: FLOOR + this.y + hb.y * SC, w: hb.w * SC, h: hb.h * SC };
  }
  boxFrom(h) {
    const x = this.facing > 0 ? this.x + h.x * SC : this.x - (h.x + h.w) * SC;
    return { x, y: FLOOR + this.y + h.y * SC, w: h.w * SC, h: h.h * SC };
  }
  moveStep() {
    const d = this.m.dur; let acc = 0;
    for (let i = 0; i < d.length; i++) { acc += d[i]; if (this.t < acc) return i; }
    return d.length - 1;
  }
  startMove(name) {
    this.state = 'attack'; this.move = name; this.t = 0; this.hasHit = false; this.vx = 0; this.spawned = false; this.evWave = false; this.evDust = false; this.evRise = false; this.evSmoke = false; this.evRev = false; this.evFinish = false; this.lastHitT = -99;
  }
}

const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// Comandos só com as 4 setas, uma depois da outra (teclado não tem diagonal): ↓ → , → ↓ , ↓ ← , ↓ ↓ , → →.
// Olha as trocas de direção dos últimos 14 quadros. A última direção tem que estar apertada junto com o botão;
// para frente e para baixo ela aceita a diagonal (quem ainda segura ↓ ao apertar →), mas para trás não,
// para que defender agachado e depois atacar não solte especial sem querer.
const FINAL_OK = { 6: [6, 3], 2: [2, 1, 3], 4: [4] };
function hasMotion(buf, seq) {
  const runs = [];
  for (const d of buf.slice(-14)) if (runs[runs.length - 1] !== d) runs.push(d);
  if (!FINAL_OK[seq[seq.length - 1]].includes(runs[runs.length - 1])) return false;
  let k = seq.length - 2;
  for (let i = runs.length - 2; i >= 0 && k >= 0; i--) if (runs[i] === seq[k]) k--;
  return k < 0;
}

// gradiente cromado anos 80: céu claro em cima, horizonte escuro no meio, reflexo quente embaixo
function chrome(t, kind = 'steel') {
  const g = t.context.createLinearGradient(0, t.padding.top, 0, (t.height || 100) - t.padding.bottom);
  const stops = kind === 'gold'
    ? [[0, '#fffbe6'], [0.45, '#ffd23c'], [0.5, '#7a3b00'], [0.56, '#c96a00'], [1, '#ffe9a8']]
    : [[0, '#ffffff'], [0.2, '#cfeaff'], [0.48, '#5aa8e6'], [0.5, '#1b1033'], [0.55, '#5a2a6a'], [0.78, '#ff9a5a'], [1, '#fff1c4']];
  for (const [o, c] of stops) g.addColorStop(o, c);
  t.setFill(g);
}
const isTouch = () => !!(window.TOUCH && window.TOUCH.on);

// ---------------------------------------------------------------------------------------------
// carrega o palco e as folhas de todos os lutadores, depois vai para a escolha
// ---------------------------------------------------------------------------------------------
class Boot extends Phaser.Scene {
  constructor() { super('boot'); }
  preload() {
    const t = this.add.text(W / 2, H / 2, 'LOADING...', { fontFamily: FONT_PIXEL, fontSize: '14px', color: '#3cf0ff' }).setOrigin(0.5);
    this.load.on('progress', v => t.setText(`LOADING ${Math.round(v * 100)}%`));
    this.load.on('loaderror', file => console.warn('Rock n Bira Battle: missing file', file.src)); // segue sem ela
    this.load.image('stage', STAGES[0].file); // fundo da tela de escolha
    this.load.image('temple', TEMPLE.file);
    // capa: logo dourado do Rock n' Bira e as canecas de chopp do brinde
    this.load.image('logo_bira', `assets/ui/logo-rocknbira-gold.png?v=6046b4c`);
    this.load.image('title_bg', `assets/ui/festa.jpg`); // festa no bar, fundo da capa
    this.load.spritesheet('mug', `assets/ui/mug.png?v=6046b4c`, { frameWidth: 300, frameHeight: 300 });
    this.load.spritesheet('splash', `assets/ui/splash.png?v=6046b4c`, { frameWidth: 300, frameHeight: 300 });
    for (const st of STAGES) {
      this.load.image(`stage_${st.id}`, st.file);
    }
    for (const c of Object.values(CHARS)) {
      if (c.placeholder) continue; // sem arte própria ainda: texKey usa as folhas do placeholder
      for (const [n, count] of Object.entries(c.anims)) {
        const key = `${c.dir}_${n}`;
        FRAMES[key] = count;
        this.load.spritesheet(key, `assets/${c.dir}/${n}.png?v=6046b4c`, { frameWidth: FW, frameHeight: FH });
      }
    }
  }
  create() { this.scene.start('title'); }
}

// ---------------------------------------------------------------------------------------------
// CAPA ANIMADA: o logo do Rock n' Bira despenca, "BATTLE" entra rasgando, os holofotes varrem o palco,
// os lutadores acendem dos lados e o Ricardinho passa correndo com a bandeira. Qualquer botão começa.
// ---------------------------------------------------------------------------------------------
const TOAST_SPOTS = [[170, 92], [790, 92], [815, 240], [840, 385]];
const BIRA_X = 170; // onde o Ricardinho para na capa // onde as canecas se encontram na capa
class Title extends Phaser.Scene {
  constructor() { super('title'); }

  create() {
    this.t = 0; this.going = false;
    // fundo: a festa no bar, escurecida para o logo brilhar, com um zoom lento
    const bgKey = ['title_bg', 'temple', 'stage'].find(k => this.textures.exists(k));
    this.bg = this.add.image(W / 2, H / 2, bgKey).setDisplaySize(W * 1.08, H * 1.08).setTint(0x8a7a9a);
    this.add.rectangle(0, 0, W, H, 0x07030d, 0.5).setOrigin(0);
    // vinheta: mais escuro no meio de cima, atrás do logo
    const v = this.add.graphics();
    for (let i = 0; i < 12; i++) v.fillStyle(0x07030d, 0.05).fillEllipse(W / 2, 200, 640 - i * 36, 420 - i * 22);
    this.beams = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);

    // faíscas subindo do palco
    if (!this.textures.exists('spark_px')) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff, 1).fillRect(0, 0, 4, 4); g.generateTexture('spark_px', 4, 4); g.destroy();
    }
    this.add.particles(0, H + 6, 'spark_px', {
      x: { min: 0, max: W }, lifespan: { min: 2200, max: 4200 }, speedY: { min: -110, max: -40 }, speedX: { min: -20, max: 20 },
      scale: { start: 1.1, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: [0x4aa8ff, 0xffffff, 0xffb347, 0xff3d6e],
      frequency: 70, blendMode: 'ADD',
    });

    // o Ricardinho: entra correndo com a bandeira depois que o logo cai, freia e fica comemorando
    this.biraKey = texKey(this, CHARS.eddie, 'bira');
    this.bira = null;

    // o logo dourado: aura quente por trás, o logo, um reflexo de luz que passa por cima e estrelinhas piscando
    const LS = this.LS = 0.4, LY = this.LY = 196;
    this.glow = this.add.image(W / 2, LY, 'logo_bira').setScale(LS * 1.05).setTint(0xffb020).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(7);
    this.logo = this.add.image(W / 2, LY, 'logo_bira').setScale(LS * 4).setAlpha(0).setAngle(-12).setDepth(8);
    if (!this.textures.exists('shine_band')) {
      const c = this.textures.createCanvas('shine_band', 160, 420), x = c.getContext();
      const g = x.createLinearGradient(0, 0, 160, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,240,0.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 160, 420); c.refresh();
    }
    this.shine = this.add.image(-400, LY, 'shine_band').setAngle(18).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.8).setDepth(9);
    this.maskSrc = this.make.image({ x: W / 2, y: LY, key: 'logo_bira', add: false }).setScale(LS);
    this.shine.setMask(this.maskSrc.createBitmapMask());
    this.shineT = 40;
    if (!this.textures.exists('twinkle')) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff, 1);
      g.fillPoints([{ x: 16, y: 0 }, { x: 19, y: 13 }, { x: 32, y: 16 }, { x: 19, y: 19 }, { x: 16, y: 32 }, { x: 13, y: 19 }, { x: 0, y: 16 }, { x: 13, y: 13 }], true);
      g.fillCircle(16, 16, 3); g.generateTexture('twinkle', 32, 32); g.destroy();
    }
    this.mugs = []; this.cheerT = 0;
    this.intro = [];
    this.bigToast(() => this.tweens.add({ targets: this.logo, scale: LS, alpha: 1, angle: 0, duration: 650, ease: 'Back.easeOut',
      onComplete: () => this.land() }));

    // BATTLE: cromado, entra pela direita depois do logo
    this.battle = this.add.text(W + 400, 404, 'BATTLE', { fontFamily: FONT_CHROME, fontStyle: 'italic 900', fontSize: '104px', color: '#fff',
      stroke: '#0b0710', strokeThickness: 10, padding: { left: 20, right: 30, top: 6, bottom: 6 } }).setOrigin(0.5);
    chrome(this.battle, 'gold'); this.battle.setShadow(0, 0, '#ffb020', 26, true, false);
    this.slashBar = this.add.rectangle(W / 2, 458, 520, 5, 0xffb020).setBlendMode(Phaser.BlendModes.ADD).setScale(0, 1);

    this.press = this.add.text(W / 2, 486, isTouch() ? 'TAP TO START' : 'PRESS START', { fontFamily: FONT_PIXEL, fontSize: '18px', color: '#ffc93c',
      stroke: '#14061f', strokeThickness: 5 }).setOrigin(0.5).setAlpha(0);
    this.press.setShadow(0, 0, '#ffc93c', 10, false, true);
    this.foot = this.add.text(W / 2, H - 14, 'A / ENTER: START', { fontFamily: FONT_PIXEL, fontSize: '9px', color: '#9a8bb3' }).setOrigin(0.5).setAlpha(0);
    if (isTouch()) this.foot.setVisible(false);

    this.flash = this.add.rectangle(0, 0, W, H, 0xffffff, 0).setOrigin(0).setDepth(50);

    this.onKey = e => {
      if (['Enter', 'Space', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'Digit7'].includes(e.code)) this.go();
    };
    this.input.keyboard.on('keydown', this.onKey);
    this.input.on('pointerdown', () => this.go());
    this.events.once('shutdown', () => this.input.keyboard.off('keydown', this.onKey));
    this.input.keyboard.addCapture([32]);
  }

  // o logo bateu no palco: clarão, tremida, luzes acendem e BATTLE entra
  land() {
    this.cameras.main.shake(260, 0.012);
    this.flash.setAlpha(0.85); this.tweens.add({ targets: this.flash, alpha: 0, duration: 420 });
    this.landed = true;
    this.enterBira();
    this.tweens.add({ targets: this.slashBar, scaleX: 1, duration: 300, delay: 420, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: this.battle, x: W / 2, duration: 420, delay: 260, ease: 'Back.easeOut',
      onComplete: () => { this.cameras.main.shake(160, 0.008); this.ready = true; } });
    this.tweens.add({ targets: [this.press, this.foot], alpha: 1, duration: 300, delay: 900 });
    // brindão de abertura: quatro pares de canecas batendo em volta do logo
    TOAST_SPOTS.forEach(([x, y], i) => this.time.delayedCall(500 + i * 140, () => this.toast(x, y)));
    this.cheerT = 260;
  }

  // abertura: duas canecas gigantes entram pelos lados e se batem no meio da tela; depois o logo cai (then)
  bigToast(then) {
    if (!this.textures.exists('mug')) { then(); return; }
    const sc = 1.0, gap = 300 * sc * 0.42, y = 270;
    const mugs = [-1, 1].map(side => {
      const m = this.add.sprite(W / 2 + side * (W / 2 + 200), y + 40, 'mug', 0).setScale(sc).setFlipX(side > 0)
        .setAngle(side * 32).setDepth(20);
      this.intro.push(m);
      this.tweens.add({ targets: m, x: W / 2 + side * gap, y, angle: side * -12, duration: 520, delay: 200, ease: 'Cubic.easeIn' });
      return m;
    });
    this.time.delayedCall(720, () => {
      // CLINK! clarão, tela treme, espirro enorme de chopp e estrelinhas
      this.cameras.main.shake(260, 0.016);
      this.flash.setAlpha(0.7); this.tweens.add({ targets: this.flash, alpha: 0, duration: 380 });
      mugs.forEach((m, i) => {
        const side = i ? 1 : -1;
        m.setFrame(4); // espuma escorrendo
        this.tweens.add({ targets: m, x: W / 2 + side * (gap + 60), angle: side * 22, duration: 170, yoyo: true, ease: 'Quad.easeOut' });
      });
      if (this.textures.exists('splash')) {
        const sp = this.add.sprite(W / 2, y - 60, 'splash', 0).setScale(1.5).setOrigin(0.5, 1).setDepth(21);
        this.intro.push(sp);
        let f = 0;
        this.time.addEvent({ delay: 70, repeat: 7, callback: () => {
          f++; if (f < 5) sp.setFrame(f); else sp.setAlpha(Math.max(0, sp.alpha - 0.34));
        } });
      }
      for (let i = 0; i < 14; i++) this.spawnTwinkle(W / 2 + Phaser.Math.Between(-220, 220), y - Phaser.Math.Between(40, 260), 0.8 + Math.random() * 0.8);
    });
    // as canecas saem de cena (sobem e somem) e o logo despenca no lugar delas
    this.time.delayedCall(1550, () => {
      mugs.forEach((m, i) => this.tweens.add({ targets: m, x: W / 2 + (i ? 1 : -1) * (W / 2 + 220), y: y - 120, angle: (i ? 1 : -1) * 40,
        duration: 420, ease: 'Cubic.easeIn', onComplete: () => m.destroy() }));
      this.time.delayedCall(140, then);
    });
  }

  // um par de canecas entra pelos lados, bate no ponto (x, y), espirra chopp e volta
  toast(x, y) {
    if (!this.textures.exists('mug')) return;
    const sc = 0.3 + Math.random() * 0.06, gap = 300 * sc * 0.42;
    [-1, 1].forEach(side => {
      const m = this.add.sprite(x + side * (gap + 70), y + 40, 'mug', (Math.random() * 5) | 0).setScale(sc * 0.6).setFlipX(side > 0)
        .setAngle(side * 25).setDepth(4).setAlpha(0);
      this.tweens.add({ targets: m, alpha: 1, scale: sc, duration: 200 });
      this.tweens.add({ targets: m, x: x + side * gap, y, angle: side * -14, duration: 380, ease: 'Cubic.easeIn',
        onComplete: () => {
          // CLINK: as canecas quicam para trás e depois saem de cena
          this.tweens.add({ targets: m, x: x + side * (gap + 26), angle: side * 18, duration: 140, yoyo: true, ease: 'Quad.easeOut' });
          this.tweens.add({ targets: m, x: x + side * (gap + 70), y: y + 40, angle: side * 30, alpha: 0, scale: sc * 0.7, duration: 420, delay: 900, ease: 'Cubic.easeIn',
            onComplete: () => m.destroy() });
        } });
    });
    this.time.delayedCall(380, () => {
      if (!this.textures.exists('splash')) return;
      const sp = this.add.sprite(x, y - 300 * sc * 0.15, 'splash', 0).setScale(sc * 1.15).setOrigin(0.5, 1).setDepth(5);
      let f = 0;
      this.time.addEvent({ delay: 55, repeat: 6, callback: () => {
        f++; if (f < 5) sp.setFrame(f); else sp.setAlpha(sp.alpha - 0.45);
        if (f >= 6) sp.destroy();
      } });
      this.cameras.main.shake(80, 0.004);
      for (let i = 0; i < 4; i++) this.spawnTwinkle(x + Phaser.Math.Between(-50, 50), y - Phaser.Math.Between(20, 90), 0.6);
    });
  }

  spawnTwinkle(x, y, s = 0.5 + Math.random() * 0.6) {
    const tw = this.add.image(x, y, 'twinkle').setScale(0).setTint(Math.random() < 0.5 ? 0xffffff : 0xffe48a)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(6);
    this.tweens.add({ targets: tw, scale: s, angle: 90, duration: 260, yoyo: true, ease: 'Sine.easeOut', onComplete: () => tw.destroy() });
  }

  go() {
    if (this.going) return;
    if (!this.ready) { // apertou durante a abertura: pula direto para o fim
      this.tweens.killAll(); this.time.removeAllEvents();
      this.intro.forEach(o => o.destroy()); this.intro = []; this.flash.setAlpha(0); this.logo.setScale(this.LS).setAlpha(1).setAngle(0); this.battle.x = W / 2; this.slashBar.setScale(1, 1);
      this.enterBira(true); this.press.setAlpha(1); this.foot.setAlpha(1);
      this.landed = true; this.ready = true; return;
    }
    this.going = true;
    this.flash.setAlpha(1);
    this.tweens.add({ targets: this.flash, alpha: 0, duration: 120, yoyo: true, repeat: 1 });
    this.cameras.main.fadeOut(380, 0, 0, 0);
    this.time.delayedCall(400, () => this.scene.start('select'));
  }

  update(time, delta) {
    // k = quantos quadros de 60 fps se passaram: a capa anda na mesma velocidade em telas de 60, 120 ou 144 Hz
    const k = Math.min(delta, 100) / 16.67;
    this.t += k;
    const t = this.t;
    this.bg.setScale(this.bg.scaleX + 0.00004 * k);

    // holofotes varrendo de cima
    this.beams.clear();
    const cols = [0x4aa8ff, 0xff3d6e, 0xffc93c, 0x4aa8ff];
    [140, 360, 600, 820].forEach((x0, i) => {
      const a = Math.sin(t / 70 + i * 1.7) * 0.42, len = 640, w = 120;
      const ex = x0 + Math.sin(a) * len, ey = Math.cos(a) * len;
      const nx = Math.cos(a) * w, ny = -Math.sin(a) * w;
      this.beams.fillStyle(cols[i], this.landed ? 0.11 : 0.04);
      this.beams.fillTriangle(x0, -10, ex - nx, ey - ny, ex + nx, ey + ny);
      this.beams.fillStyle(0xffffff, this.landed ? 0.06 : 0.02);
      this.beams.fillTriangle(x0, -10, ex - nx * 0.35, ey - ny * 0.35, ex + nx * 0.35, ey + ny * 0.35);
    });

    // ouro do logo: aura pulsando, flutua de leve, reflexo passando e estrelinhas nas letras
    if (this.landed) {
      this.glow.setAlpha(0.22 + Math.sin(t / 12) * 0.1);
      const ly = this.LY + Math.sin(t / 40) * 3;
      this.logo.y = ly; this.glow.y = ly; this.maskSrc.y = ly; this.shine.y = ly;
      if ((this.shineT -= k) <= 0) { this.shine.x = W / 2 - 260; this.shineT = 170; }
      if (this.shine.x < W / 2 + 260) this.shine.x += 9 * k;
      if (Math.random() < 0.18 * k) {
        const tex = this.textures.get('logo_bira').getSourceImage(), lw = tex.width * this.LS, lh = tex.height * this.LS;
        for (let k = 0; k < 6; k++) { // procura um pixel do logo para a estrelinha nascer em cima das letras
          const u = Math.random(), v = Math.random();
          const a = this.textures.getPixelAlpha(u * tex.width | 0, v * tex.height | 0, 'logo_bira');
          if (a > 200) { this.spawnTwinkle(W / 2 - lw / 2 + u * lw, ly - lh / 2 + v * lh); break; }
        }
      }
      // brindes de vez em quando, em pontos diferentes ao redor do logo
      if ((this.cheerT -= k) <= 0) {
        const spots = TOAST_SPOTS.slice();
        const n = 1 + (Math.random() * 2 | 0);
        Phaser.Utils.Array.Shuffle(spots).slice(0, n).forEach(([x, y], i) => this.time.delayedCall(i * 180, () => this.toast(x, y)));
        this.cheerT = 150 + (Math.random() * 90 | 0);
      }
    }
    // BATTLE e PRESS START
    if (this.ready) this.press.setAlpha(Math.floor(t / 28) % 2 ? 0.25 : 1);

    // Ricardinho: corre (0-1), freia (2) e comemora (6-8, vai e volta)
    const b = this.bira;
    if (b) {
      b.t += k;
      if (b.phase === 'run') {
        b.x += 7 * k; setFr(b.spr, Math.floor(b.t / 6) % 2);
        if (b.x >= BIRA_X) { b.x = BIRA_X; b.phase = 'brake'; b.t = 0; setFr(b.spr, 2); this.cameras.main.shake(90, 0.004); }
      } else if (b.phase === 'brake') {
        if (b.t > 14) { b.phase = 'cheer'; b.t = 0; }
      } else {
        setFr(b.spr, [6, 7, 8, 7][Math.floor(b.t / 24) % 4]);
        b.spr.y = FLOOR + 44 - (Math.floor(b.t / 24) % 4 === 2 ? 5 : 0); // pulinho na comemoração
      }
      b.spr.x = Math.round(b.x);
      b.shadow.x = b.x;
    }
  }

  enterBira(now = false) {
    if (this.bira || !this.textures.exists(this.biraKey)) return;
    const spr = this.add.sprite(-160, FLOOR + 44, this.biraKey, 0).setScale(1.05).setOrigin(AX / FW, AY / FH).setDepth(6);
    const shadow = this.add.ellipse(-160, FLOOR + 46, 130, 16, 0x000000, 0.4).setDepth(5);
    this.bira = { x: now ? BIRA_X : -160, t: 0, phase: now ? 'cheer' : 'run', spr, shadow };
  }
}

// ---------------------------------------------------------------------------------------------
// ESCOLHA DE LUTADOR. P1: ← → e A/Enter. P2: CPU (P troca para humano: J L e 7). Toque: toca no retrato, toca de novo ou FIGHT.
// ---------------------------------------------------------------------------------------------
class Select extends Phaser.Scene {
  constructor() { super('select'); }

  create() {
    this.ids = Object.keys(CHARS);
    const prev = this.registry.get('pick');
    this.cur = prev ? [...prev.cur] : [0, Math.min(1, this.ids.length - 1)];
    this.cpu = prev ? prev.cpu : true;
    this.lock = [false, false];
    this.t = 0;

    // fundo: palco apagado, grade neon em perspectiva
    if (this.textures.exists('stage')) this.add.image(0, 0, 'stage').setOrigin(0).setDisplaySize(W, H).setAlpha(0.28);
    this.add.rectangle(0, 0, W, H, 0x0b0710, 0.55).setOrigin(0);
    const g = this.add.graphics();
    const hz = 300;
    for (let i = 0; i <= 8; i++) { g.lineStyle(1, 0xff3df0, 0.12 + i * 0.04); const y = hz + Math.pow(i / 8, 2) * (H - hz); g.lineBetween(0, y, W, y); }
    for (let i = -10; i <= 10; i++) { g.lineStyle(1, 0x3cf0ff, 0.22); g.lineBetween(W / 2 + i * 22, hz, W / 2 + i * 150, H); }

    const cr = { fontFamily: FONT_CHROME, fontStyle: 'italic 900', padding: { x: 24, y: 6 } };
    const title = this.add.text(W / 2, 18, 'SELECT YOUR AXE', { ...cr, fontSize: '54px', color: '#fff', stroke: '#14061f', strokeThickness: 8 }).setOrigin(0.5, 0);
    chrome(title); title.setShadow(0, 0, '#ff3d6e', 18, true, false);
    this.add.text(W / 2 + 170, 78, 'Choose your fighter', { fontFamily: FONT_NEON, fontSize: '30px', color: '#fff', padding: { x: 14, y: 8 } })
      .setOrigin(0.5).setAngle(-5).setStroke('#ff3df0', 2).setShadow(0, 0, '#ff3df0', 10, true, true);

    // os dois lutadores grandes, um de cada lado
    this.big = [0, 1].map(s => this.add.sprite(s === 0 ? 190 : W - 190, FLOOR - 10, '__MISSING').setScale(SC * 1.05)
      .setOrigin((s === 0 ? AX : FW - AX) / FW, AY / FH).setFlipX(s === 1).setDepth(2));
    this.names = [0, 1].map(s => this.add.text(s === 0 ? 40 : W - 40, 120, '', { ...cr, fontSize: '64px', color: '#fff', stroke: '#14061f', strokeThickness: 8 })
      .setOrigin(s === 0 ? 0 : 1, 0).setDepth(3));
    this.tags = [0, 1].map(s => this.add.text(s === 0 ? 46 : W - 46, 196, '', { fontFamily: FONT_PIXEL, fontSize: '12px', color: s === 0 ? '#ff3d6e' : '#3cf0ff' })
      .setOrigin(s === 0 ? 0 : 1, 0).setDepth(3));

    // retratos: quadro 0 do idle recortado no rosto/corpo
    const cw = 118, ch = 132, gap = 18, x0 = W / 2 - ((this.ids.length - 1) * (cw + gap)) / 2, cy = 300;
    this.cards = this.ids.map((id, i) => {
      const x = x0 + i * (cw + gap);
      const bg = this.add.rectangle(x, cy, cw, ch, 0x150d1f, 0.92).setStrokeStyle(2, 0x2c1f3d).setDepth(4);
      const key = texKey(this, CHARS[id], 'idle');
      const img = this.add.sprite(x, cy + ch / 2 - 4, key, 0).setOrigin(AX / FW, AY / FH).setDepth(5);
      if (key !== '__MISSING') img.setCrop(AX - 105, 50, 210, 240);
      img.setScale(Math.min((cw - 8) / 210, (ch - 8) / 240));
      const lbl = this.add.text(x, cy + ch / 2 + 14, CHARS[id].name, { fontFamily: FONT_PIXEL, fontSize: '11px', color: '#f3ecff' }).setOrigin(0.5).setDepth(5);
      bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.tapCard(i));
      return { x, y: cy, bg, img, lbl };
    });
    this.cursorG = this.add.graphics().setDepth(6);
    this.badge = [0, 1].map(s => this.add.text(0, 0, '', { fontFamily: FONT_PIXEL, fontSize: '10px', color: '#0b0710', backgroundColor: s === 0 ? '#ff3d6e' : '#3cf0ff', padding: { x: 4, y: 3 } }).setOrigin(0.5, 1).setDepth(7));

    // botão FIGHT (toque/clique) e dica
    this.fightBtn = this.add.text(W / 2, 430, 'FIGHT!', { ...cr, fontSize: '46px', color: '#fff', stroke: '#14061f', strokeThickness: 7, backgroundColor: '#2a0630' })
      .setOrigin(0.5).setDepth(8).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.tryStart(true));
    chrome(this.fightBtn, 'gold');
    this.hint = this.add.text(W / 2, H - 22, '', { fontFamily: FONT_PIXEL, fontSize: '10px', color: '#9a8bb3', align: 'center' }).setOrigin(0.5).setDepth(8);

    // teclado: ouvintes do plugin, removidos ao sair da cena
    this.onKey = e => this.key(e);
    this.input.keyboard.on('keydown', this.onKey);
    this.events.once('shutdown', () => this.input.keyboard.off('keydown', this.onKey));
    this.input.keyboard.addCapture([37, 38, 39, 40, 32]);
    this.stickX = 0;
    this.refresh();
  }

  key(e) {
    if (this.t < 10) return; // não herda a tecla que encerrou a luta
    const c = e.code;
    if (c === 'ArrowLeft') this.moveCur(0, -1);
    else if (c === 'ArrowRight') this.moveCur(0, 1);
    else if (c === 'KeyA' || c === 'Enter' || c === 'Space') { if (this.lock[0] && this.lock[1]) this.tryStart(); else this.pick(0); }
    else if (c === 'Escape' || c === 'Backspace') { this.lock = [false, false]; this.refresh(); }
    else if (c === 'KeyP') { this.cpu = !this.cpu; this.lock[1] = false; if (this.cpu && this.lock[0]) this.cpuPick(); this.refresh(); }
    else if (!this.cpu && c === 'KeyJ') this.moveCur(1, -1);
    else if (!this.cpu && c === 'KeyL') this.moveCur(1, 1);
    else if (!this.cpu && c === 'Digit7') { if (this.lock[0] && this.lock[1]) this.tryStart(); else this.pick(1); }
  }

  moveCur(s, d) {
    if (this.lock[s]) return;
    const n = this.ids.length;
    this.cur[s] = (this.cur[s] + d + n) % n;
    this.refresh();
  }
  pick(s) {
    this.lock[s] = true;
    if (s === 0 && this.cpu) this.cpuPick();
    this.refresh();
  }
  // CPU pega o outro lutador (ou o mesmo, se só houver um)
  cpuPick() {
    const other = this.ids.findIndex((_, i) => i !== this.cur[0]);
    this.cur[1] = other >= 0 ? other : this.cur[0];
    this.lock[1] = true;
  }
  tapCard(i) {
    if (this.lock[0] && this.cur[0] === i) { if (!this.lock[1]) this.pick(1); this.tryStart(true); return; }
    this.lock[0] = false; this.cur[0] = i; this.pick(0);
  }
  tryStart(fromTap) {
    if (!this.lock[0]) { if (fromTap) this.pick(0); else return; }
    if (!this.lock[1]) { if (this.cpu) this.cpuPick(); else return this.refresh(); }
    const chars = [this.ids[this.cur[0]], this.ids[this.cur[1]]];
    this.registry.set('pick', { cur: [...this.cur], cpu: this.cpu });
    this.cameras.main.flash(150, 255, 80, 240);
    this.scene.start('stagesel', { chars, cpu: this.cpu });
  }

  refresh() {
    const sameLook = texKey(this, CHARS[this.ids[this.cur[0]]], 'idle') === texKey(this, CHARS[this.ids[this.cur[1]]], 'idle');
    [0, 1].forEach(s => {
      const c = CHARS[this.ids[this.cur[s]]];
      const key = texKey(this, c, 'idle');
      if (this.big[s].texture.key !== key) this.big[s].setTexture(key);
      this.big[s].setTint(s === 1 && sameLook ? P2_TINT : 0xffffff).setAlpha(this.lock[s] ? 1 : 0.75);
      this.names[s].setText(c.name); chrome(this.names[s]);
      this.names[s].setShadow(0, 0, s === 0 ? '#ff3d6e' : '#3cf0ff', 16, true, false);
      const who = s === 0 ? '1P' : (this.cpu ? 'CPU' : '2P');
      this.tags[s].setText(`${who} ${this.lock[s] ? 'READY' : '...'}${c.placeholder ? '\n(ART COMING SOON)' : ''}`);
      this.badge[s].setText(who);
    });
    const ready = this.lock[0] && this.lock[1];
    this.fightBtn.setAlpha(this.lock[0] ? 1 : 0.45);
    this.hint.setText(isTouch() ? (ready ? 'TAP FIGHT! (OR THE PORTRAIT AGAIN)' : 'TAP A PORTRAIT TO PICK')
      : ready ? 'A / ENTER: FIGHT   ESC: CHANGE'
        : `1P: < > + A/ENTER   ${this.cpu ? 'P: 2P HUMAN' : '2P: J L + 7   P: 2P CPU'}`);
  }

  update() {
    this.t++;
    // controles de toque do index.html: analógico escolhe, botão A confirma
    const T = window.TOUCH;
    if (T && T.on) {
      const sx = T.l ? -1 : T.r ? 1 : 0;
      if (sx && sx !== this.stickX) this.moveCur(0, sx);
      this.stickX = sx;
      if (T.take('lp')) { if (this.lock[0] && this.lock[1]) this.tryStart(true); else this.pick(0); }
    }
    // moldura piscando em volta do retrato de cada jogador
    const g = this.cursorG; g.clear();
    [0, 1].forEach(s => {
      const cd = this.cards[this.cur[s]], same = this.cur[0] === this.cur[1], off = same ? (s === 0 ? -4 : 4) : 0;
      const col = s === 0 ? 0xff3d6e : 0x3cf0ff, a = this.lock[s] ? 1 : (this.t % 30 < 18 ? 1 : 0.35);
      g.lineStyle(this.lock[s] ? 5 : 3, col, a);
      g.strokeRect(cd.x - 59 + off, cd.y - 66 + off, 118, 132);
      this.badge[s].setPosition(cd.x + (same ? (s === 0 ? -30 : 30) : 0), cd.y - 68);
    });
    for (let s = 0; s < 2; s++) setFr(this.big[s], Math.floor(this.t / 6) % texFrames(this, this.big[s].texture.key));
    this.fightBtn.setScale(this.lock[0] && this.lock[1] ? 1 + Math.sin(this.t / 6) * 0.04 : 1);
  }
}

// ---------------------------------------------------------------------------------------------
// ESCOLHA DE PALCO. < > escolhe, A/Enter confirma, Esc volta aos lutadores. Toque: toca na miniatura, toca de novo ou FIGHT.
// ---------------------------------------------------------------------------------------------
class StageSelect extends Phaser.Scene {
  constructor() { super('stagesel'); }
  init(data) { this.data0 = data || {}; }

  create() {
    // só os palcos com imagem carregada, mais o sorteio no fim
    this.list = STAGES.filter(st => this.textures.exists(`stage_${st.id}`)).concat([{ id: 'random', name: 'RANDOM', tag: 'Surprise me' }]);
    const prev = this.registry.get('stagePick');
    const home = this.list.findIndex(st => st.id === (CHARS[(this.data0.chars || [])[1]] || {}).stage);
    this.cur = prev !== undefined && prev < this.list.length ? prev : Math.max(0, home);
    this.t = 0;

    this.preview = this.add.image(0, 0, 'stage').setOrigin(0).setDisplaySize(W, H);
    this.add.rectangle(0, 0, W, 128, 0x0b0710, 0.72).setOrigin(0);
    this.add.rectangle(0, H - 132, W, 132, 0x0b0710, 0.8).setOrigin(0);
    const cr = { fontFamily: FONT_CHROME, fontStyle: 'italic 900', padding: { x: 24, y: 6 } };
    const title = this.add.text(W / 2, 6, 'SELECT STAGE', { ...cr, fontSize: '50px', color: '#fff', stroke: '#14061f', strokeThickness: 8 }).setOrigin(0.5, 0);
    chrome(title); title.setShadow(0, 0, '#3cf0ff', 18, true, false);
    this.tName = this.add.text(W / 2, 62, '', { ...cr, fontSize: '34px', color: '#fff', stroke: '#14061f', strokeThickness: 6 }).setOrigin(0.5, 0);
    this.tTag = this.add.text(W / 2 + 170, 104, '', { fontFamily: FONT_NEON, fontSize: '26px', color: '#fff', padding: { x: 14, y: 8 } })
      .setOrigin(0.5).setAngle(-5).setStroke('#ff3df0', 2).setShadow(0, 0, '#ff3df0', 10, true, true);

    // miniaturas numa fileira
    const n = this.list.length, tw = Math.min(104, Math.floor((W - 40) / n) - 10), th = Math.round(tw * 0.5625), gap = 10, y = H - 92;
    this.tw = tw; this.th = th;
    this.cards = this.list.map((st, i) => {
      const x = W / 2 - ((n - 1) * (tw + gap)) / 2 + i * (tw + gap);
      const bg = this.add.rectangle(x, y, tw, th, 0x150d1f, 1).setStrokeStyle(2, 0x2c1f3d);
      if (st.id !== 'random') this.add.image(x, y, `stage_${st.id}`).setDisplaySize(tw - 4, th - 4);
      else this.add.text(x, y, '?', { ...cr, fontSize: '34px', color: '#ffe14a' }).setOrigin(0.5);
      bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.tap(i));
      return { x, y };
    });
    this.cursorG = this.add.graphics();
    this.fightBtn = this.add.text(W - 90, H - 34, 'FIGHT!', { ...cr, fontSize: '28px', color: '#fff', stroke: '#14061f', strokeThickness: 5, backgroundColor: '#2a0630' })
      .setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.go());
    chrome(this.fightBtn, 'gold');
    this.add.text(W / 2, H - 16, isTouch() ? 'TAP A STAGE, THEN FIGHT!' : '< > CHOOSE   A / ENTER: FIGHT   ESC: BACK',
      { fontFamily: FONT_PIXEL, fontSize: '10px', color: '#9a8bb3' }).setOrigin(0.5);

    this.onKey = e => {
      if (this.t < 10) return; // não herda a tecla que confirmou os lutadores
      const c = e.code;
      if (c === 'ArrowLeft' || c === 'KeyJ' || c === 'ArrowUp') this.move(-1);
      else if (c === 'ArrowRight' || c === 'KeyL' || c === 'ArrowDown') this.move(1);
      else if (c === 'KeyA' || c === 'Enter' || c === 'Space' || c === 'Digit7') this.go();
      else if (c === 'Escape' || c === 'Backspace') this.scene.start('select');
    };
    this.input.keyboard.on('keydown', this.onKey);
    this.events.once('shutdown', () => this.input.keyboard.off('keydown', this.onKey));
    this.stickX = 0;
    this.show();
  }

  move(d) { const n = this.list.length; this.cur = ((this.cur + d) % n + n) % n; this.show(); }
  tap(i) { if (i === this.cur) this.go(); else { this.cur = i; this.show(); } }
  show() {
    const st = this.list[this.cur];
    this.preview.setTexture(st.id === 'random' ? 'stage' : `stage_${st.id}`).setDisplaySize(W, H).setAlpha(st.id === 'random' ? 0.2 : 1);
    this.tName.setText(st.name); chrome(this.tName);
    this.tTag.setText(st.tag);
  }
  go() {
    if (this.gone) return;
    this.gone = true;
    let st = this.list[this.cur];
    this.registry.set('stagePick', this.cur);
    if (st.id === 'random') { const real = this.list.filter(x => x.id !== 'random'); st = real[Math.floor(Math.random() * real.length)]; }
    this.cameras.main.flash(150, 60, 240, 255);
    this.scene.start('fight', { ...this.data0, stage: st.id });
  }
  update() {
    this.t++;
    const T = window.TOUCH;
    if (T && T.on) {
      const sx = T.l ? -1 : T.r ? 1 : 0;
      if (sx && sx !== this.stickX) this.move(sx);
      this.stickX = sx;
      if (T.take('lp')) this.go();
    }
    const g = this.cursorG; g.clear();
    const cd = this.cards[this.cur], a = this.t % 30 < 18 ? 1 : 0.4;
    g.lineStyle(4, 0x3cf0ff, a); g.strokeRect(cd.x - this.tw / 2 - 3, cd.y - this.th / 2 - 3, this.tw + 6, this.th + 6);
    this.fightBtn.setScale(1 + Math.sin(this.t / 6) * 0.04);
  }
}

// ---------------------------------------------------------------------------------------------
// LUTA
// ---------------------------------------------------------------------------------------------
class Fight extends Phaser.Scene {
  constructor() { super('fight'); }

  init(data) {
    const ids = (data && data.chars) || ['eddie', 'eddie'];
    this.chars = ids.map(id => CHARS[id] || CHARS.eddie);
    this.startCpu = data && data.cpu !== undefined ? data.cpu : true;
    this.stageId = data && data.stage;
  }

  // chave de textura de uma folha para um lutador (ou para o Eddie, nos efeitos comuns)
  tk(ch, name) { return texKey(this, ch || CHARS.eddie, name); }
  nf(key) { return texFrames(this, key); }

  create() {
    this.drawStage();
    this.p = [new Fighter(this, 0, false, this.chars[0]), new Fighter(this, 1, this.startCpu, this.chars[1])];
    // mesma cara dos dois lados (Eddie x Eddie, ou um placeholder): o P2 fica azul
    this.mirror = this.chars[0] === this.chars[1];
    if (this.tk(this.chars[0], 'idle') === this.tk(this.chars[1], 'idle')) this.p[1].tint = P2_TINT;
    this.projs = []; this.bombList = []; this.booms = []; this.fx = []; this.ghosts = []; this.bees = []; this.words = []; this.dlrs = []; this.hypnos = []; this.sliders = []; this.biras = []; this.bolts = []; this.rainT = 0;
    this.flash = this.add.rectangle(0, 0, W, H, 0xffffff, 0).setOrigin(0).setDepth(55); this.flashT = 0;
    this.sparks = this.add.graphics().setDepth(30);
    this.beamG = this.add.graphics().setDepth(24).setBlendMode(Phaser.BlendModes.ADD);
    this.superShade = this.add.rectangle(0, 0, W, H, 0x12001c, 1).setOrigin(0).setDepth(9).setAlpha(0); this.superDark = 0;
    this.debug = this.add.graphics().setDepth(40);
    this.showBoxes = false;
    this.hud = this.add.graphics().setDepth(50);
    const pxf = { fontFamily: FONT_PIXEL };
    const cr = { fontFamily: FONT_CHROME, fontStyle: 'italic 900', padding: { x: 24, y: 6 } };
    this.tTimer = this.add.text(W / 2, 22, '99', { ...cr, fontSize: '44px', color: '#ffe14a', stroke: '#1a0b24', strokeThickness: 6 }).setOrigin(0.5, 0).setDepth(51);
    chrome(this.tTimer, 'gold');
    this.tN1 = this.add.text(12, 52, this.chars[0].name, { ...cr, fontSize: '24px', color: '#ffffff', stroke: '#1a0b24', strokeThickness: 5 }).setDepth(51);
    this.tN2 = this.add.text(W - 12, 52, '', { ...cr, fontSize: '24px', color: '#9fc8ff', stroke: '#1a0b24', strokeThickness: 5 }).setOrigin(1, 0).setDepth(51);
    this.tMsg = this.add.text(W / 2, 220, '', { ...cr, fontSize: '96px', color: '#ffffff', stroke: '#14061f', strokeThickness: 10 }).setOrigin(0.5).setDepth(60);
    this.tMsg.setShadow(0, 0, '#ff3d6e', 24, true, false);
    this.tSub = this.add.text(W / 2, 300, '', { ...pxf, fontSize: '14px', color: '#3cf0ff' }).setOrigin(0.5).setDepth(60);
    this.tSub.setShadow(0, 0, '#3cf0ff', 10, false, true);
    this.tMode = this.add.text(W / 2, H - 22, '', { ...pxf, fontSize: '10px', color: '#9a8bb3' }).setOrigin(0.5).setDepth(51);
    this.makeBanner();

    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = this.input.keyboard.addKeys({
      l1: K.LEFT, r1: K.RIGHT, d1: K.DOWN, u1: K.UP, lp1: K.A, hp1: K.S, lk1: K.D, hk1: K.F,
      l2: K.J, r2: K.L, d2: K.K, u2: K.I, lp2: K.SEVEN, hp2: K.EIGHT, lk2: K.NINE, hk2: K.ZERO,
    });
    // atalhos pelos ouvintes do plugin (os objetos Key são reaproveitados entre cenas e acumulariam ouvintes)
    this.onKey = e => {
      if (e.code === 'KeyH') this.showBoxes = !this.showBoxes;
      else if (e.code === 'KeyP') this.p[1].cpu = !this.p[1].cpu;
      else if (e.code === 'Enter' && this.phase === 'over' && this.phaseT > 20) this.toSelect();
    };
    this.onTap = () => { if (this.phase === 'over' && this.phaseT > 20) this.toSelect(); }; // no celular: tocar na tela
    this.input.keyboard.on('keydown', this.onKey);
    this.input.on('pointerdown', this.onTap);
    this.events.once('shutdown', () => { this.input.keyboard.off('keydown', this.onKey); this.input.off('pointerdown', this.onTap); });
    this.input.keyboard.addCapture([K.LEFT, K.RIGHT, K.DOWN, K.UP, K.SPACE]);

    this.acc = 0;
    this.newMatch();
  }

  toSelect() {
    this.registry.set('pick', { ...(this.registry.get('pick') || { cur: [0, 1] }), cpu: this.p[1].cpu });
    this.scene.start('select');
  }

  drawStage() {
    // luta no palco de quem está à direita (o adversário do P1, como nos fliperamas); sem palco próprio, o do Eddie
    // palco escolhido; sem escolha, o da casa de quem está à direita (como nos fliperamas)
    const ok = id => stageById(id) && this.textures.exists(`stage_${id}`);
    const id = [this.stageId, this.chars[1].stage, this.chars[0].stage, 'eddie'].find(ok);
    const st = stageById(id) || STAGES[0], key = id ? `stage_${id}` : 'stage';
    this.add.image(0, 0, key).setOrigin(0).setDisplaySize(W, H).setDepth(0);
    // vitória: o palco escurece, só o logo continua aceso e os canhões de luz miram o vencedor
    // vitória: o palco some num fundo escuro e o Templo dos Deuses da Guitarra aparece
    this.dark = this.add.rectangle(0, 0, W, H, 0x000000, 1).setOrigin(0).setDepth(7).setAlpha(0);
    this.temple = this.add.image(0, 0, this.textures.exists('temple') ? 'temple' : key).setOrigin(0).setDisplaySize(W, H).setDepth(8).setAlpha(0);
    this.templeGlow = this.add.image(0, 0, this.textures.exists('temple') ? 'temple' : key).setOrigin(0).setDisplaySize(W, H).setDepth(8)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.beams = this.add.graphics().setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
  }

  newMatch() { this.wins = [0, 0]; this.round = 1; this.newRound(); }
  newRound() {
    if (this.beamG) this.p.forEach(f => this.updateBeam(f, false));
    this.p.forEach(f => f.reset());
    [...this.projs, ...this.bombList, ...this.booms, ...(this.fx || []), ...(this.ghosts || []), ...(this.bees || [])].forEach(o => o.spr.destroy());
    this.projs = []; this.bombList = []; this.booms = []; this.fx = []; this.ghosts = []; this.bees = [];
    (this.words || []).forEach(w => w.t.destroy()); this.words = [];
    (this.dlrs || []).forEach(d => { d.spr.destroy(); d.shadow.destroy(); }); this.dlrs = [];
    (this.sliders || []).forEach(d => { d.spr.destroy(); d.shadow.destroy(); }); this.sliders = [];
    (this.biras || []).forEach(d => { d.spr.destroy(); d.shadow.destroy(); }); this.biras = [];
    this.bolts = []; this.rainT = 0; if (this.rainG) this.rainG.clear();
    (this.hypnos || []).forEach(h => h.spr.destroy()); this.hypnos = [];
    if (this.dark) { this.dark.setAlpha(0); this.temple.setAlpha(0); this.templeGlow.setAlpha(0); this.beams.clear(); }
    this.p.forEach(f => f.spr.setTint(f.tint));
    this.timer = ROUND_TIME; this.tick = 0; this.phase = 'intro'; this.phaseT = 0; this.hitstop = 0; this.slow = 0;
  }

  update(time, delta) {
    this.acc += Math.min(delta, 100);
    const step = 1000 / 60;
    while (this.acc >= step) { this.acc -= step; this.step(); }
    this.render();
  }

  readInput(f) {
    const n = f.side + 1, k = this.keys;
    if (f.cpu) return this.cpuThink(f, this.p[1 - f.side]);
    // controles de toque (celular) valem para o P1, somados ao teclado
    const T = n === 1 && window.TOUCH ? window.TOUCH : null;
    const left = k['l' + n].isDown || !!(T && T.l), right = k['r' + n].isDown || !!(T && T.r);
    const press = b => Phaser.Input.Keyboard.JustDown(k[b + n]) || !!(T && T.take(b));
    return {
      fwd: f.facing > 0 ? right && !left : left && !right,
      back: f.facing > 0 ? left && !right : right && !left,
      down: k['d' + n].isDown || !!(T && T.d), up: k['u' + n].isDown || !!(T && T.u),
      lp: press('lp'), hp: press('hp'), lk: press('lk'), hk: press('hk'),
    };
  }

  // a CPU de cada lutador decide a cada "respiro"; entre um e outro segura as direções
  cpuThink(me, op) {
    if (me.cpuCD > 0) { me.cpuCD--; return { ...me.cpuHold }; }
    const inp = (me.char.cpu || eddieCpu)(me, op, this);
    me.cpuHold = { fwd: inp.fwd, back: inp.back, down: inp.down };
    return inp;
  }

  step() {
    this.tick++;
    if (this.slow > 0) { this.slow--; if (this.slow % 2) return; }
    if (this.hitstop > 0) { this.hitstop--; return; }
    this.phaseT++;
    const [a, b] = this.p;

    if (this.phase === 'intro' && this.phaseT > 110) this.phase = 'fight';
    if (this.phase === 'fight' && this.tick % 60 === 0) {
      this.timer--;
      if (this.timer <= 0) this.endRound(a.hp === b.hp ? -1 : a.hp > b.hp ? 0 : 1, 'TIME');
    }
    if ((this.phase === 'ko' || this.phase === 'time') && this.winner >= 0) {
      const w = this.p[this.winner];
      if (w.state !== 'victory' && w.state !== 'ko' && !w.airborne && this.phaseT > 45) { w.state = 'victory'; w.t = 0; w.vx = 0; w.move = null; }
      if (w.state === 'victory' && w.t > 12 && w.t % 2 === 0) {
        const gx = w.x + w.facing * px(120), gy = FLOOR - px(150); // mãos na escala
        this.addFx('fx_notes', gx + Math.random() * 40 - 20, gy + Math.random() * 30 - 15, {
          vx: (Math.random() * 4 - 2) + w.facing * 1.2, vy: -1.5 - Math.random() * 3, rate: 5, scale: (0.35 + Math.random() * 0.5) * SC,
        }, w.char);
      }
    }
    if ((this.phase === 'ko' || this.phase === 'time') && this.phaseT > 300) {
      if (this.wins[0] >= 2 || this.wins[1] >= 2) { this.phase = 'over'; this.phaseT = 0; }
      else { this.round++; this.newRound(); }
    }

    for (const f of this.p) {
      const op = this.p[1 - f.side];
      const inp = this.phase === 'fight' && f.state !== 'ko' ? this.readInput(f) : {};
      const dir = inp.down ? (inp.fwd ? 3 : inp.back ? 1 : 2) : inp.up ? 8 : (inp.fwd ? 6 : inp.back ? 4 : 5);
      f.buf.push(dir); if (f.buf.length > 30) f.buf.shift();
      f.holdBack = !!inp.back; f.holdDown = !!inp.down;
      this.updateFighter(f, op, inp);
    }
    // raio do super some se o golpe foi interrompido (ex.: o lutador apanhou no meio)
    for (const f of this.p) if (f.beam && !(f.state === 'attack' && f.m && f.m.beam)) this.updateBeam(f, false);
    this.separate(a, b);
    for (const f of this.p) this.checkHit(f, this.p[1 - f.side]);
    this.updateProjectiles();
    this.updateBombs();
    this.updateBees();
    this.updateDLR();
    this.updateSliders();
    this.updateBira();
    this.updateHypno();
    if (this.rainT > 0) this.rainT--;
    this.updateFx();
  }

  // A + S + D juntos (até 8 quadros entre o primeiro e o último): o easter egg
  triple(f, inp) {
    const t = ['lp', 'hp', 'lk'].map(b => f.last[b]);
    return (inp.lp || inp.hp || inp.lk || inp.special === 'bira') && (inp.special === 'bira' || Math.max(...t) - Math.min(...t) <= 8);
  }
  // dois botões juntos (com até 5 quadros de diferença)
  chordOn(f, inp, s) {
    const [b1, b2] = s.chord;
    return (inp[b1] || inp[b2]) && Math.abs(f.last[b1] - f.last[b2]) <= 5;
  }
  // primeiro especial da lista do lutador que a entrada deste quadro dispara
  pickSpecial(f, inp) {
    for (const s of f.char.specials || []) {
      if (s.lock && f[s.lock]) continue;
      if (s.super && f.meter < 100) continue;
      if (!f.char.moves[s.move]) continue;
      if (s.chord) { if (this.chordOn(f, inp, s) || inp.special === s.move) return s; continue; }
      if ((BTNS[s.btn] || []).some(b => inp[b]) && (inp.special === s.move || (s.motion && hasMotion(f.buf, s.motion)))) return s;
    }
    return null;
  }
  startSpecial(f, op, s, inp) {
    const m = f.char.moves[s.move];
    if (s.super) { f.meterBack = f.meter; f.meter = 0; }
    f.startMove(s.move);
    if (m.inv) f.inv = m.inv;
    if (m.spawn !== undefined) f.projFast = !!inp.hp; // projétil mais rápido com o soco forte
    if (m.bombs !== undefined) f.bombTarget = op.x;
    this.announce(f, s.move);
    if (s.super) this.cameras.main.flash(120, 255, 80, 240);
  }

  updateFighter(f, op, inp) {
    const ch = f.char;
    f.t++;
    if (f.inv > 0) f.inv--;
    if (f.buzz > 0) f.buzz--;
    if (f.spin) f.rot += 0.33 * -f.facing;
    for (const b of ['lp', 'hp', 'lk', 'hk']) if (inp[b]) f.last[b] = this.tick;
    // o segundo botão do par chegou logo depois: cancela o golpe normal que o primeiro começou
    for (const s of ch.specials || []) {
      if (!s.chord || (s.super && f.meter < 100)) continue;
      const on = this.chordOn(f, inp, s) || (s.super && inp.special === s.move);
      if (on && f.state === 'attack' && s.chord.includes(f.move) && f.t <= 6) { f.state = 'idle'; f.move = null; }
    }
    // easter egg: o terceiro botão chegou logo depois de um par; desfaz o que o par começou (e devolve a barra do super)
    const egg = !f.bira && this.triple(f, inp);
    if (egg && f.state === 'attack' && f.t <= 10) {
      if (f.m && f.m.super && f.meterBack !== undefined) f.meter = f.meterBack;
      f.state = 'idle'; f.move = null; f.inv = 0; this.bannerT = 0; this.bigT = 0;
    }
    if (f.free && egg) { f.facing = op.x >= f.x ? 1 : -1; this.spawnBira(f); }
    else if (f.free) {
      f.facing = op.x >= f.x ? 1 : -1;
      const sp = this.pickSpecial(f, inp);
      if (sp) this.startSpecial(f, op, sp, inp);
      else if (inp.lp) f.startMove('lp');
      else if (inp.hp) f.startMove('hp');
      else if (inp.lk) f.startMove('lk');
      else if (inp.hk) f.startMove('hk');
      else if (inp.up) { f.state = 'prejump'; f.t = 0; f.jumpDir = inp.fwd ? 1 : inp.back ? -1 : 0; f.vx = 0; }
      else if (inp.down) { if (f.state !== 'crouch') { f.state = 'crouch'; f.t = 0; } f.vx = 0; }
      else if (inp.fwd) { if (f.state !== 'walk_fwd') { f.state = 'walk_fwd'; f.t = 0; } f.vx = ch.walkF * f.facing; }
      else if (inp.back) { if (f.state !== 'walk_back') { f.state = 'walk_back'; f.t = 0; } f.vx = -ch.walkB * f.facing; }
      else { if (f.state !== 'idle') { f.state = 'idle'; f.t = 0; } f.vx = 0; }
    } else if (f.state === 'prejump') {
      if (f.t >= 4) { f.state = 'air'; f.t = 0; f.vy = JUMP_V; f.vx = f.jumpDir * JUMP_VX * f.facing; f.jk = null; }
    } else if (f.state === 'air') {
      if (!f.jk && (inp.lk || inp.hk)) f.jk = { t: 0, hit: false, strong: !!inp.hk };
      if (f.jk) f.jk.t++;
    } else if (f.state === 'land') {
      if (f.t >= 5) { f.state = 'idle'; f.t = 0; f.facing = op.x >= f.x ? 1 : -1; }
    } else if (f.state === 'attack') {
      const m = f.m;
      if (m.spawn !== undefined && !f.spawned && f.moveStep() >= m.spawn) { f.spawned = true; this.spawnProjectile(f); }
      if (m.bombs !== undefined && !f.spawned && f.moveStep() >= m.bombs) { f.spawned = true; this.spawnBombs(f, op); }
      const st = f.moveStep();
      if (m.wave !== undefined && st === m.wave && !f.evWave) { f.evWave = true; this.addFx('fx_wave', f.x + f.facing * px(135), FLOOR - px(195), { vx: f.facing * 3, flip: f.facing < 0, rate: 3, scale: 0.8 * SC }, ch); }
      if (m.dust !== undefined && st === m.dust && !f.evDust) { f.evDust = true; this.addFx('fx_dust', f.x, FLOOR, { rate: 4, oy: 0.75 }, ch); }
      if (m.blast !== undefined && st >= m.blast && !f.evRise) { f.evRise = true; this.boom(f.x, FLOOR + 10, 1.3, ch); this.addFx('fx_dust', f.x - 70, FLOOR, { rate: 4, oy: 0.75 }, ch); this.addFx('fx_dust', f.x + 70, FLOOR, { rate: 4, oy: 0.75, flip: true }, ch); }
      if (m.smoke !== undefined && st === m.smoke && !f.evSmoke) { f.evSmoke = true; this.addFx('fx_smoke', f.x - f.facing * px(40), FLOOR - px(120), { rate: 4, scale: SC }, ch); }
      if (m.step) { if (st >= m.step[0] && st <= m.step[1]) f.vx = f.facing * m.step[2]; else f.vx = 0; }
      if (m.sparks && st >= m.sparks[0] && st <= m.sparks[1] && f.t % 3 === 0) this.addFx(m.sparksFx || 'fx_drill', f.x + f.facing * px(m.sparksFx ? 110 : 70), FLOOR - px(m.sparksFx ? 185 : 150), { rate: 2, scale: 0.8 * SC, flip: f.facing < 0, vx: m.sparksFx ? f.facing * 3 : 0 }, ch);
      if (m.swarm !== undefined && st >= m.swarm && !f.spawned) { f.spawned = true; this.spawnSwarm(f); }
      if (m.slide !== undefined) f.vx = st === m.slide ? f.facing * 5 : (st > m.slide ? 0 : f.vx);
      if (m.beam) this.updateBeam(f, st >= m.beam[0] && st <= m.beam[1]);
      if (m.dark) this.superDark = Math.min(0.78, (this.superDark || 0) + 0.06);
      if (m.notes && st >= m.notes[0] && st <= m.notes[1] && f.t % 4 === 0) this.addFx('fx_notes', f.x + f.facing * px(90), FLOOR - px(170), { vx: f.facing * 4, vy: -1 - Math.random() * 2, rate: 4, scale: 0.5 * SC }, ch);
      if (m.finish && st === m.finish.at && !f.evFinish) {
        f.evFinish = true;
        if (op.state !== 'ko' && f.hasHit && op.state === 'hit') { this.startGag(op, m.finish.gag); this.say(m.finish.word[0], op.x, FLOOR - px(270), m.finish.word[1], 44); }
      }
      if (m.waves && m.waves.includes(st) && f.evWave !== st) { f.evWave = st; this.spawnHypno(f); }
      if (m.summon !== undefined && st >= m.summon && !f.spawned) { f.spawned = true; this.spawnDLR(f, op); }
      if (m.slider !== undefined && st >= m.slider && !f.spawned) { f.spawned = true; this.spawnSlider(f); }
      if (m.rain && f.t === 1) this.rainT = Math.max(this.rainT || 0, m.rain);
      if (m.bolts && st >= m.bolts[0] && st <= m.bolts[1] && f.t % 11 === 0) this.strikeBolt(f, op);
      if (m.dash) { if (st >= m.dash[0] && st <= m.dash[1]) f.vx = f.facing * 13; else if (st > m.dash[1]) f.vx *= 0.9; }
      if (m.rev && st === m.rev.at && !f.evRev) {
        f.evRev = true; this.say(m.rev.word[0], f.x - f.facing * 40, FLOOR - px(200), m.rev.word[1], 38);
        this.addFx(m.rev.fx, f.x - f.facing * px(120), FLOOR - px(40), { rate: 3, scale: 0.5 * SC, flip: f.facing > 0, vx: -f.facing * 2 }, ch);
      }
      if (m.ghost && f.t >= m.ghost[0] && f.t < m.ghost[1] && f.t % 3 === 0) this.ghost(f);
      if (f.t >= m.dur.reduce((s, v) => s + v, 0)) { if (m.beam) this.updateBeam(f, false); f.state = f.airborne ? 'air' : 'idle'; f.t = 0; f.move = null; f.jk = null; }
    } else if (f.state === 'gag') {
      f.vx *= 0.8;
      if (f.gag.k === 'sleep' && f.t >= 55 && f.t < 125 && f.t % 22 === 0) this.say(['z', 'Zz', 'Zzz'][(f.t / 22 | 0) % 3], f.x + f.facing * -px(40), FLOOR - px(90) - (f.t % 44), '#c77dff', 30);
      if (f.gag.k === 'dance' && f.t % 14 === 0) this.addFx('fx_sweet', f.x, FLOOR - px(280), { vy: -1.2, rate: 5, scale: 0.35 * SC }, this.p[1 - f.side].char);
      if (f.gag.k === 'burnt' && f.t % 9 === 0 && f.t < 50) this.addFx('fx_smoke', f.x + (Math.random() * 30 - 15), FLOOR - px(250), { rate: 5, scale: 0.35 * SC, vy: -1 }, ch);
      if (f.t >= GAGS[f.gag.k].dur) { f.state = 'idle'; f.t = 0; f.gag = null; }
    } else if (f.state === 'hit' || f.state === 'block') {
      f.vx *= 0.85;
      if (--f.stun <= 0 && !f.airborne) { f.state = 'idle'; f.t = 0; f.vx = 0; }
    } else if (f.state === 'ko') {
      f.vx *= 0.94;
    }
    // gravidade
    if (f.airborne || f.vy !== 0) {
      f.vy += GRAV; f.y += f.vy;
      if (f.y >= 0) {
        f.y = 0; f.vy = 0;
        if (f.spin) { f.spin = false; f.rot = 0; this.addFx('fx_dust', f.x, FLOOR, { rate: 4, oy: 0.75 }, ch); this.cameras.main.shake(90, 0.004); }
        if (f.pendGag && f.state === 'hit') { this.startGag(f, f.pendGag); }
        f.pendGag = null;
        if (f.state === 'air') { f.state = 'land'; f.t = 0; f.vx = 0; f.jk = null; this.addFx('fx_dust', f.x, FLOOR, { rate: 4, oy: 0.75 }, ch); }
      }
    }
    f.x = Phaser.Math.Clamp(f.x + f.vx, WALL, W - WALL);
  }

  separate(a, b) {
    if (a.state === 'ko' || b.state === 'ko' || a.y < -px(120) || b.y < -px(120)) return;
    if ([a, b].some(f => f.state === 'gag' && f.gag.k === 'flat')) return; // o carro passa por cima de quem virou panqueca
    const d = b.x - a.x;
    if (Math.abs(d) < MIN_GAP) {
      const push = (MIN_GAP - Math.abs(d)) / 2 * (d >= 0 ? 1 : -1);
      a.x = Phaser.Math.Clamp(a.x - push, WALL, W - WALL);
      b.x = Phaser.Math.Clamp(b.x + push, WALL, W - WALL);
      // encurralado na parede: quem está livre leva o resto do empurrão, para nunca ficarem um dentro do outro
      const dir = d >= 0 ? 1 : -1;
      if (Math.abs(b.x - a.x) < MIN_GAP) {
        if (a.x <= WALL || a.x >= W - WALL) b.x = Phaser.Math.Clamp(a.x + dir * MIN_GAP, WALL, W - WALL);
        else a.x = Phaser.Math.Clamp(b.x - dir * MIN_GAP, WALL, W - WALL);
      }
    }
  }

  checkHit(att, def) {
    if (def.state === 'ko' || def.inv > 0) return;
    if (att.state === 'air' && att.jk && att.jk.t >= 4 && !att.jk.hit) {
      const JK = att.char.jumpkick || JUMPKICK;
      const hb = att.boxFrom(JK.hit);
      if (overlap(hb, def.hurtbox())) {
        att.jk.hit = true;
        const m = { ...JK, dmg: att.jk.strong ? JK.dmg : JK.dmgLight };
        this.applyHit(att, def, m, hb.x + (att.facing > 0 ? hb.w : 0), hb.y + hb.h / 2, false);
      }
      return;
    }
    if (att.state !== 'attack') return;
    const m = att.m;
    if (!m.hit || !m.active.includes(att.moveStep())) return;
    if (m.multi ? att.t - att.lastHitT < m.multi : att.hasHit) return;
    const hb = att.boxFrom(m.hit);
    if (!overlap(hb, def.hurtbox())) return;
    att.hasHit = true; att.lastHitT = att.t;
    this.applyHit(att, def, m, hb.x + (att.facing > 0 ? hb.w : 0), hb.y + hb.h / 2, false);
  }

  applyHit(att, def, m, sx, sy, isProj) {
    // golpe no pulo não pode ser defendido agachado
    const blocking = def.canBlock() && def.holdBack && !def.airborne && !(m.overhead && def.holdDown) && !(m.low && !def.holdDown);
    const away = def.x >= att.x ? 1 : -1;
    if (blocking) {
      def.state = 'block'; def.stun = m.blockstun; def.vx = away * m.push * 0.8; def.t = 0;
      if (m.chip) def.hp = Math.max(1, def.hp - m.chip);
      this.hitstop = 4; this.spark(sx, sy, P2_TINT, att.char);
      return;
    }
    if (def.state === 'gag' && def.gag && def.gag.k === 'sleep') this.say('WAKE UP!', def.x, FLOOR - px(250), '#ffe14a', 40);
    const am = att.m; // golpe que o atacante está fazendo agora (o super não enche a barra)
    def.hp -= m.dmg; def.move = null; def.jk = null;
    if (!(am && am.super)) { att.meter = Math.min(100, att.meter + m.dmg * 0.3); def.meter = Math.min(100, def.meter + m.dmg * 0.15); }
    const hitFx = am && am.hitFx ? this.tk(att.char, am.hitFx) : null;
    if (hitFx && hitFx !== '__MISSING') this.addFx(am.hitFx, def.x, FLOOR + def.y - px(160), { rate: 2, scale: 0.8 * SC }, att.char);
    else this.spark(sx, sy, 0xffe14a, att.char);
    if (m.shake) this.cameras.main.shake(120, m.shake);
    if (m.dmg >= 75) this.addFx('fx_notes', def.x, FLOOR + def.y - px(250), { vy: -1.2, rate: 5, scale: 0.9 * SC }, att.char);
    if (def.hp <= 0) {
      def.hp = 0; def.state = 'ko'; def.t = 0; def.vx = away * 7;
      if (m.gag === 'dizzy' || m.gag === 'flat') { def.vy = -13; def.spin = true; }
      if (m.word) this.say(m.word[0], sx, sy - 40, m.word[1], 40);
      this.slow = 90; this.cameras.main.shake(250, 0.01);
      this.endRound(att.side, 'KO');
    } else {
      def.state = 'hit'; def.stun = m.hitstun; def.vx = away * m.push; def.t = 0;
      if (def.airborne) def.vy = Math.min(def.vy, -4);
      this.hitstop = isProj ? 5 : m.dmg > 60 ? 9 : 6;
      this.gagHit(att, def, m, sx, sy);
    }
  }

  // raio do super: textura do golpe (m.tex), núcleo branco e arcos elétricos desenhados por cima
  updateBeam(f, on) {
    const g = this.beamG;
    if (!on) {
      if (f.beam) { f.beam.destroy(); f.beamGlow.destroy(); f.beam = f.beamGlow = null; g.clear(); }
      f.beamLen = 0; return;
    }
    const dir = f.facing, x0 = f.x + dir * px(100), y0 = FLOOR - px(152);
    const full = dir > 0 ? W - x0 + 40 : x0 + 40;
    const key = this.tk(f.char, (f.m && f.m.tex) || 'fx_beam'), nb = this.nf(key);
    if (!f.beam) {
      // disparo: clarão branco, tranco forte e o feixe cresce da guitarra até a borda
      this.cameras.main.flash(90, 255, 255, 255); this.cameras.main.shake(220, 0.016);
      this.say('ZZZAAAP!', x0 + dir * 160, y0 - 70, '#3cf0ff', 46);
      const mk = (depth) => this.add.tileSprite(x0, y0, 16, FH, key, 0).setOrigin(dir > 0 ? 0 : 1, 0.5).setDepth(depth).setFlipX(dir < 0).setBlendMode(Phaser.BlendModes.ADD);
      f.beamGlow = mk(22); f.beam = mk(23); f.beamLen = 0;
    }
    f.beamLen = Math.min(full, f.beamLen + 120);
    const len = f.beamLen, fr = Math.floor(f.t / 2) % nb, thick = (0.42 + Math.random() * 0.16) * SC;
    f.beam.setPosition(x0, y0).setSize(len, FH).setScale(1, thick); setFr(f.beam, fr);
    f.beam.tilePositionX += 38 * dir;
    f.beamGlow.setPosition(x0, y0).setSize(len, FH).setScale(1, thick * 2.1)
      .setTint(f.t % 4 < 2 ? 0xff3df0 : 0x3cf0ff).setAlpha(0.35 + Math.random() * 0.25);
    setFr(f.beamGlow, (fr + 2) % nb);
    f.beamGlow.tilePositionX -= 22 * dir;
    // núcleo branco pulsando e arcos elétricos em zigue-zague ao longo do feixe
    g.clear();
    const xa = dir > 0 ? x0 : x0 - len, core = px(8) + Math.random() * px(8);
    g.fillStyle(0xffffff, 0.95); g.fillRect(xa, y0 - core / 2, len, core);
    for (let k = 0; k < 4; k++) {
      g.lineStyle(k < 2 ? 3 : 2, [0xffffff, 0x9fefff, 0xff8cf5, 0xffe14a][k], 0.9);
      const pts = [];
      for (let x = 0; x <= len; x += 26) pts.push({ x: x0 + dir * x, y: y0 + (Math.random() * 2 - 1) * px(30) * (0.4 + k * 0.25) });
      g.strokePoints(pts, false);
    }
    // bola de energia na ponta da guitarra
    g.fillStyle(0xffffff, 0.9); g.fillCircle(x0, y0, px(16) + Math.random() * px(8));
    g.fillStyle(0x3cf0ff, 0.45); g.fillCircle(x0, y0, px(30) + Math.random() * px(10));
    if (f.t % 4 === 0) this.addFx('fx_zap', x0, y0, { rate: 2, scale: 0.5 * SC }, f.char);
    if (f.t % 3 === 0) this.addFx('fx_spark', x0 + dir * Math.random() * len, y0 + (Math.random() * 2 - 1) * px(20), { rate: 2, scale: 0.45 * SC }, f.char);
    if (f.t % 3 === 0) this.cameras.main.shake(60, 0.006);
  }

  // piada de cada especial: balão de quadrinho + reação exagerada de quem apanhou
  gagHit(att, def, m, sx, sy) {
    if (m.word) this.say(m.word[0], sx, sy - 40, m.word[1], 40);
    switch (m.gag) {
      case 'burnt': if (def.airborne) def.pendGag = 'burnt'; else this.startGag(def, 'burnt'); break;
      case 'flat': if (def.airborne) def.pendGag = 'flat'; else this.startGag(def, 'flat'); break;
      case 'dizzy': def.vy = -12; def.spin = true; def.pendGag = 'dizzy'; break;
      case 'swell':
        def.stings++;
        this.say('BZZ!', sx, sy - 20, '#ffe14a', 24);
        if (def.stings >= 3) { def.stings = 0; this.say('SWOLLEN!', def.x, FLOOR - px(290), '#ff5a5a', 44); if (def.airborne) def.pendGag = 'swell'; else this.startGag(def, 'swell'); }
        break;
      case 'chomp':
        this.say(Math.random() < 0.5 ? 'CHOMP!' : 'CRUNCH!', sx, sy - 30, '#3cf0ff', 38);
        if (!def.airborne) def.vy = -6;
        break;
      case 'zap': def.buzz = 8; break;
      case 'sleep': if (def.airborne) def.pendGag = 'sleep'; else this.startGag(def, 'sleep'); break;
      case 'dance': if (def.airborne) def.pendGag = 'dance'; else this.startGag(def, 'dance'); break;
      case 'wah':
        def.buzz = 12;
        if (att.t % 10 < 4) this.say(Math.random() < 0.5 ? 'WAH!' : 'WAH-WAH!', sx, sy - 30 - Math.random() * 30, '#c77dff', 32);
        break;
      case 'buzz':
        def.buzz = 14;
        if (att.t % 8 < 4) this.say('BRRRT!', sx, sy - 30 - Math.random() * 30, '#7dff6a', 32);
        break;
    }
  }

  startGag(f, k) {
    f.state = 'gag'; f.t = 0; f.gag = { k }; f.move = null; f.jk = null; f.stun = 0;
    f.inv = GAGS[k].vuln ? 0 : GAGS[k].dur + 20; f.spin = false; f.rot = 0;
    if (k === 'flat' || k === 'sleep' || k === 'dance') f.vx = 0;
  }

  // balão de onomatopeia: entra grande, encolhe com tranco, sobe e some
  say(text, x, y, color, size = 34) {
    // não empilha o mesmo balão: se ele acabou de sair, espera
    if (this.words.some(w => w.t.text === text && w.age < 20)) return;
    const t = this.add.text(Phaser.Math.Clamp(x, 90, W - 90), Phaser.Math.Clamp(y, 110, H - 80), text, {
      fontFamily: FONT_CHROME, fontStyle: 'italic 900', fontSize: size + 'px', color,
      stroke: '#14061f', strokeThickness: Math.round(size / 5), padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setDepth(57).setAngle(Math.random() * 24 - 12);
    t.setShadow(3, 4, '#000000', 0, true, false);
    this.words.push({ t, age: 0 });
  }

  endRound(winner, why) {
    if (this.phase !== 'fight') return;
    if (winner >= 0) this.wins[winner]++;
    this.phase = why === 'KO' ? 'ko' : 'time'; this.phaseT = 0; this.winner = winner;
  }

  // PROJÉTIL (Eruption): anda reto; dois projéteis se anulam
  spawnProjectile(f) {
    const m = f.m, x = f.x + f.facing * px(125), y = FLOOR - px(m.projY || 145);
    const spr = this.add.sprite(x, y, this.tk(f.char, m.tex || 'projectile'), 0).setDepth(20).setFlipX(f.facing < 0).setScale((m.projScale || 1.35) * SC);
    if (f.tint !== 0xffffff) spr.setTint(f.tint);
    const sp = m.speed || [5, 8];
    const pr = { owner: f, x, y, dir: f.facing, v: f.projFast ? sp[1] : sp[0], spr, t: 0, payload: m.payload || PROJ, boomerang: !!m.boomerang, box: m.projBox || [72, 48] };
    if (pr.boomerang) { pr.v0 = pr.v; pr.acc = -pr.v / 150; } // vai longe, freia e volta para a mão
    f.proj = pr; this.projs.push(pr);
  }

  updateProjectiles() {
    for (const pr of this.projs) {
      if (pr.boomerang) {
        pr.v += pr.acc; pr.y += Math.sin(pr.t / 9) * 0.8;
        pr.spr.y = pr.y;
        // voltando: some ao chegar de volta na mão de quem jogou
        if (pr.v < 0 && Math.abs(pr.x - pr.owner.x) < px(60)) { pr.dead = true; continue; }
        if (pr.v < -pr.v0 * 1.3) pr.v = -pr.v0 * 1.3;
      }
      pr.x += pr.dir * pr.v; pr.t++;
      const box = { x: pr.x - pr.box[0] / 2, y: pr.y - pr.box[1] / 2, w: pr.box[0], h: pr.box[1] };
      const def = this.p[1 - pr.owner.side];
      if (def.state !== 'ko' && !(def.inv > 0) && overlap(box, def.hurtbox())) { pr.dead = true; this.applyHit(pr.owner, def, pr.payload, pr.x + pr.dir * 30, pr.y, true); }
      for (const o of this.projs) if (o !== pr && !o.dead && o.owner !== pr.owner && Math.abs(o.x - pr.x) < 60) { o.dead = pr.dead = true; this.boom((o.x + pr.x) / 2, pr.y + 40, 0.8, pr.owner.char); }
      if (pr.x < -100 || pr.x > W + 100) pr.dead = true;
    }
    this.projs = this.projs.filter(pr => { if (pr.dead) { pr.spr.destroy(); pr.owner.proj = null; } return !pr.dead; });
  }

  // ENXAME (Bumblebee): saem da guitarra e perseguem o oponente
  spawnSwarm(f) {
    const m = f.m, n = m.count || 6, key = this.tk(f.char, m.tex || 'fx_bee');
    for (let i = 0; i < n; i++) {
      const x = f.x + f.facing * px(m.ground ? 90 + i * 35 : 110), y = m.ground ? FLOOR - px(22) : FLOOR - px(170) + (i - (n - 1) / 2) * 12;
      const spr = this.add.sprite(x, y, key, 0).setDepth(24).setScale((m.swarmScale || 0.55) * SC).setFlipX(f.facing < 0);
      this.bees.push({ owner: f, x, y, vx: f.facing * (m.ground ? 2 : 4 + Math.random() * 2), vy: m.ground ? 0 : (Math.random() - 0.5) * 3, t: 0, ph: Math.random() * 6, spr, n: this.nf(key), payload: m.payload || BEE, ground: !!m.ground });
    }
    f.swarm = n;
  }

  updateBees() {
    for (const b of this.bees) {
      b.t++;
      const def = this.p[1 - b.owner.side];
      const tx = def.x, ty = FLOOR + def.y - px(150);
      if (b.ground) {
        // rasteja no chão atrás do oponente, mais devagar e sem voar (quem pula escapa)
        b.vx = Phaser.Math.Clamp(b.vx + Math.sign(tx - b.x) * 0.18, -4, 4);
        b.x += b.vx;
        b.spr.setPosition(b.x, b.y).setFlipX(b.vx < 0); setFr(b.spr, Math.floor(b.t / 4) % b.n);
      } else {
        b.vx += Math.sign(tx - b.x) * 0.35; b.vy += Math.sign(ty - b.y) * 0.25;
        const sp = Math.hypot(b.vx, b.vy), max = 6;
        if (sp > max) { b.vx *= max / sp; b.vy *= max / sp; }
        b.x += b.vx; b.y += b.vy + Math.sin(b.t / 4 + b.ph) * 1.5;
        b.spr.setPosition(b.x, b.y).setFlipX(b.vx < 0); setFr(b.spr, Math.floor(b.t / 2) % b.n);
      }
      const box = b.ground ? { x: b.x - 30, y: b.y - 25, w: 60, h: 40 } : { x: b.x - 20, y: b.y - 15, w: 40, h: 30 };
      if (def.state !== 'ko' && !(def.inv > 0) && b.t > 8 && overlap(box, def.hurtbox())) { b.dead = true; this.applyHit(b.owner, def, b.payload, b.x, b.y, true); }
      if (b.t > 200) b.dead = true;
    }
    this.bees = this.bees.filter(b => { if (b.dead) { b.spr.destroy(); b.owner.swarm--; } return !b.dead; });
  }

  // ONDAS (Spanish Fly): andam devagar em direção ao oponente; dá para defender; uma basta
  spawnHypno(f) {
    const m = f.m, x = f.x + f.facing * px(120), y = FLOOR - px(150), key = this.tk(f.char, m.tex || 'fx_hypno');
    const spr = this.add.sprite(x, y, key, 0).setDepth(24).setScale(0.9 * SC).setFlipX(f.facing < 0).setBlendMode(Phaser.BlendModes.ADD);
    this.hypnos.push({ owner: f, x, y, dir: f.facing, t: 0, spr, n: this.nf(key), payload: m.payload || HYPNO });
    f.hypno++;
  }

  updateHypno() {
    for (const h of this.hypnos) {
      h.t++; h.x += h.dir * 3.4;
      const yy = h.y + Math.sin(h.t / 6) * px(14);
      h.spr.setPosition(h.x, yy).setScale((0.85 + Math.sin(h.t / 5) * 0.08) * SC); setFr(h.spr, Math.floor(h.t / 4) % h.n);
      if (h.t % 10 === 0) this.addFx('fx_notes', h.x - h.dir * px(30), yy, { vy: -1, rate: 5, scale: 0.35 * SC }, h.owner.char);
      const def = this.p[1 - h.owner.side];
      const box = { x: h.x - px(40), y: yy - px(40), w: px(80), h: px(80) };
      const already = def.state === 'gag' && def.gag.k === h.payload.gag; // quem já dorme não é atingido de novo
      if (def.state !== 'ko' && !(def.inv > 0) && !already && overlap(box, def.hurtbox())) {
        this.applyHit(h.owner, def, h.payload, h.x, yy, true);
        for (const o of this.hypnos) if (o.owner === h.owner) o.dead = true; // uma onda basta
      }
      if (h.x < -80 || h.x > W + 80) h.dead = true;
    }
    this.hypnos = this.hypnos.filter(h => { if (h.dead) { h.spr.destroy(); h.owner.hypno--; } return !h.dead; });
  }

  // AJUDANTE (Jump!): cai do céu onde o oponente está; sombra no chão avisa. Folha: 0-1 caindo, 2 impacto, 3 pose, 4 saindo.
  spawnDLR(f, op) {
    const m = f.m, x = Phaser.Math.Clamp(op.x, 90, W - 90);
    const spr = this.add.sprite(x, FLOOR - 560, this.tk(f.char, m.tex || 'dlr'), 0).setDepth(22).setFlipX(f.facing < 0).setScale(SC)
      .setOrigin((f.facing > 0 ? AX : FW - AX) / FW, AY / FH);
    const shadow = this.add.ellipse(x, FLOOR + 2, px(150), px(18), 0x000000, 0.4).setDepth(6).setScale(0.2);
    this.dlrs.push({ owner: f, x, dy: -560, vy: 3, phase: 'fall', t: 0, spr, shadow, payload: m.payload || DLR });
    f.dlr = true;
    this.say('INCOMING...', x, 140, '#ff4fd8', 26);
  }

  updateDLR() {
    for (const d of this.dlrs) {
      d.t++;
      const def = this.p[1 - d.owner.side];
      if (d.phase === 'fall') {
        d.vy += 0.75; d.dy += d.vy;
        setFr(d.spr, d.vy < 9 ? 0 : 1);
        d.shadow.setScale(Math.min(1, 0.2 + d.t / 45));
        if (d.dy >= 0) {
          d.dy = 0; d.phase = 'impact'; d.t = 0; setFr(d.spr, 2);
          this.cameras.main.shake(180, 0.012);
          this.addFx('fx_dust', d.x - 80, FLOOR, { rate: 4, oy: 0.75 }, d.owner.char); this.addFx('fx_dust', d.x + 80, FLOOR, { rate: 4, oy: 0.75, flip: true }, d.owner.char);
          const box = { x: d.x - px(115), y: FLOOR - px(190), w: px(230), h: px(190) };
          if (def.state !== 'ko' && !(def.inv > 0) && overlap(box, def.hurtbox())) this.applyHit(d.owner, def, d.payload, d.x, FLOOR - px(120), true);
          else this.say('OOPS!', d.x, FLOOR - 230, '#ff4fd8', 34);
        }
      } else if (d.phase === 'impact' && d.t > 24) { d.phase = 'pose'; d.t = 0; setFr(d.spr, 3); }
      else if (d.phase === 'pose' && d.t > 36) { d.phase = 'leave'; d.t = 0; d.vy = -17; setFr(d.spr, 4); }
      else if (d.phase === 'leave') {
        d.vy -= 0.4; d.dy += d.vy; d.x += d.owner.facing * -3; // sobe acelerando até sumir pelo alto
        d.shadow.setScale(Math.max(0, 1 + d.dy / 300));
        if (d.dy < -620) d.dead = true;
      }
      d.spr.setPosition(Math.round(d.x), Math.round(FLOOR + d.dy)); d.shadow.x = d.x;
    }
    this.dlrs = this.dlrs.filter(d => { if (d.dead) { d.spr.destroy(); d.shadow.destroy(); d.owner.dlr = false; } return !d.dead; });
  }

  // DESLIZANDO (You Could Be Mine): o ajudante entra pela borda de trás e cruza a tela rente ao chão.
  // Folha: 0 correndo, 1 se jogando, 2-3 deslizando, 4 pose no fim. Golpe baixo (só defende agachado).
  spawnSlider(f) {
    const m = f.m, dir = f.facing, x = dir > 0 ? -60 : W + 60;
    const spr = this.add.sprite(x, FLOOR, this.tk(f.char, m.tex || 'axl'), 0).setDepth(22).setFlipX(dir < 0).setScale(SC)
      .setOrigin((dir > 0 ? AX : FW - AX) / FW, AY / FH);
    const shadow = this.add.ellipse(x, FLOOR + 2, px(150), px(16), 0x000000, 0.35).setDepth(6);
    this.sliders.push({ owner: f, x, dir, t: 0, phase: 'run', spr, shadow, hit: false, payload: m.payload || AXL });
    f.dlr = true;
  }

  updateSliders() {
    for (const d of this.sliders) {
      d.t++;
      const def = this.p[1 - d.owner.side];
      if (d.phase === 'run') { d.x += d.dir * 9; setFr(d.spr, 0); if (d.t > 14) { d.phase = 'slide'; d.t = 0; this.say('YEAAAH!', d.x + d.dir * 80, FLOOR - px(260), '#ff3d6e', 34); } }
      else if (d.phase === 'slide') {
        d.x += d.dir * Math.max(5, 16 - d.t * 0.12);
        setFr(d.spr, d.t < 6 ? 1 : 2 + (Math.floor(d.t / 5) % 2));
        if (d.t % 4 === 0) this.addFx('fx_dust', d.x - d.dir * px(60), FLOOR, { rate: 3, oy: 0.75, scale: 0.6, flip: d.dir < 0 }, d.owner.char);
        const box = d.dir > 0 ? { x: d.x - px(40), y: FLOOR - px(110), w: px(190), h: px(110) } : { x: d.x - px(150), y: FLOOR - px(110), w: px(190), h: px(110) };
        if (!d.hit && def.state !== 'ko' && !(def.inv > 0) && overlap(box, def.hurtbox())) { d.hit = true; this.applyHit(d.owner, def, d.payload, d.x + d.dir * px(100), FLOOR - px(60), true); }
        // para depois de passar pelo oponente ou perto da borda
        const past = d.dir > 0 ? d.x > def.x + px(160) : d.x < def.x - px(160);
        if ((past && d.t > 20) || d.x < WALL || d.x > W - WALL) { d.phase = 'pose'; d.t = 0; setFr(d.spr, 4); }
      } else if (d.phase === 'pose') { if (d.t > 50) { d.phase = 'leave'; d.t = 0; } }
      else if (d.phase === 'leave') { d.spr.setAlpha(1 - d.t / 20); d.shadow.setAlpha(0.35 * (1 - d.t / 20)); if (d.t >= 20) d.dead = true; }
      d.spr.setPosition(Math.round(d.x), FLOOR); d.shadow.x = d.x;
    }
    this.sliders = this.sliders.filter(d => { if (d.dead) { d.spr.destroy(); d.shadow.destroy(); d.owner.dlr = false; } return !d.dead; });
  }

  // EASTER EGG: entra correndo pela borda de trás de quem chamou, empurra o adversário até a parede e comemora
  spawnBira(f) {
    const dir = f.facing, x = dir > 0 ? -80 : W + 80, key = this.tk(f.char, 'bira');
    const spr = this.add.sprite(x, FLOOR, key, 0).setDepth(22).setFlipX(dir < 0).setScale(SC)
      .setOrigin((dir > 0 ? AX : FW - AX) / FW, AY / FH);
    const shadow = this.add.ellipse(x, FLOOR + 2, px(110), px(14), 0x000000, 0.35).setDepth(6);
    this.biras.push({ owner: f, x, dir, t: 0, phase: 'run', spr, shadow });
    f.bira = true;
    this.bannerPow = BIRA; this.bannerT = 70; this.flashT = 8;
    this.bnName.setText(BIRA.name); chrome(this.bnName); this.bnName.setShadow(0, 0, BIRA.neon, 14, true, false);
    this.bnTag.setText(BIRA.tag).setStroke(BIRA.neon, 2).setShadow(0, 0, BIRA.neon, 10, true, true);
    this.bnTag.x = this.bnName.width * 0.18;
    this.say('OPEN BAR!', x + dir * 200, FLOOR - px(300), '#4aa8ff', 34);
  }

  updateBira() {
    for (const d of this.biras) {
      d.t++;
      const def = this.p[1 - d.owner.side], fr = n => setFr(d.spr, n);
      if (d.phase === 'run') {
        d.x += d.dir * 10; fr(Math.floor(d.t / 4) % 2);
        if (d.t % 6 === 0) this.addFx('fx_dust', d.x - d.dir * px(40), FLOOR, { rate: 3, oy: 0.75, scale: 0.5, flip: d.dir < 0 }, d.owner.char);
        // encosta no adversário (ou chega na parede do outro lado)
        const reach = d.dir > 0 ? d.x >= def.x - px(110) : d.x <= def.x + px(110);
        if (reach && def.state !== 'ko') { d.phase = 'push'; d.t = 0; if (!(def.inv > 0)) this.applyHit(d.owner, def, BIRA_HIT, def.x, FLOOR - px(130), true); }
        else if (d.x < -120 || d.x > W + 120) { d.phase = 'cheer'; d.t = 0; }
      } else if (d.phase === 'push') {
        // empurra até a parede; o adversário vai junto, sem poder fazer nada
        fr(3 + Math.floor(d.t / 8) % 3);
        const atWall = def.x <= WALL + 1 || def.x >= W - WALL - 1;
        if (def.state === 'hit' || def.state === 'block') { def.stun = Math.max(def.stun, 4); def.vx = 0; def.x = Phaser.Math.Clamp(def.x + d.dir * 7, WALL, W - WALL); }
        d.x = def.x - d.dir * px(110);
        if (d.t % 10 === 0) this.say(['HEAVE!', 'PUSH!', 'GO GO GO!'][(d.t / 10 | 0) % 3], d.x, FLOOR - px(270), '#4aa8ff', 28);
        if (atWall || d.t > 90 || def.state === 'ko') { d.phase = 'cheer'; d.t = 0; this.cameras.main.shake(140, 0.01); }
      } else if (d.phase === 'cheer') {
        fr(6 + Math.min(2, Math.floor(d.t / 18)));
        if (d.t === 1) this.say("ROCK N' ROLL!", Phaser.Math.Clamp(d.x, px(260), W - px(260)), FLOOR - px(300), '#4aa8ff', 40);
        if (d.t > 60) { d.phase = 'leave'; d.t = 0; }
      } else if (d.phase === 'leave') {
        // corre de volta para a borda de onde veio, já virado para lá
        fr(9); d.spr.setFlipX(d.dir > 0 ? false : true); d.x -= d.dir * 11;
        if (d.x < -150 || d.x > W + 150) d.dead = true;
      }
      d.spr.setPosition(Math.round(d.x), FLOOR); d.shadow.x = d.x;
    }
    this.biras = this.biras.filter(d => { if (d.dead) { d.spr.destroy(); d.shadow.destroy(); d.owner.bira = false; } return !d.dead; });
  }

  // RAIO DO CÉU (Appetite): cai em zigue-zague onde o oponente está
  strikeBolt(f, op) {
    const x = op.x + (Math.random() * 40 - 20);
    this.bolts.push({ x, t: 0, seed: Math.random() * 1000 });
    this.cameras.main.flash(70, 220, 230, 255); this.cameras.main.shake(140, 0.012);
    this.addFx('fx_zap', x, FLOOR - px(120), { rate: 2, scale: 0.7 * SC }, f.char);
    const box = { x: x - px(45), y: 0, w: px(90), h: FLOOR };
    if (op.state !== 'ko' && !(op.inv > 0) && overlap(box, op.hurtbox())) { f.hasHit = true; this.applyHit(f, op, f.m.payload || BOLT, x, FLOOR - px(160), true); }
    else this.addFx('fx_dust', x, FLOOR, { rate: 4, oy: 0.75 }, f.char);
    if (Math.random() < 0.5) this.say(Math.random() < 0.5 ? 'KRAKOOM!' : 'ZZAP!', x, FLOOR - px(330), '#9fefff', 36);
  }

  // chuva caindo (November Rain e o super) e os raios desenhados
  drawWeather() {
    const g = this.rainG || (this.rainG = this.add.graphics().setDepth(27));
    g.clear();
    const k = Math.min(1, (this.rainT || 0) / 30);
    if (k > 0) {
      g.lineStyle(2, 0x9fd8ff, 0.45 * k);
      for (let i = 0; i < 90; i++) {
        const x = (i * 97 + this.tick * 7) % (W + 80) - 40, y = (i * 53 + this.tick * 22) % (H + 40) - 20;
        g.lineBetween(x, y, x - 6, y + 22);
      }
    }
    for (const b of this.bolts) {
      b.t++;
      const a = 1 - b.t / 14;
      let x = b.x, y = 0;
      const pts = [{ x, y }];
      while (y < FLOOR) { y += 34; x = b.x + Math.sin(b.seed + y * 0.07) * 26 + (Math.random() * 16 - 8); pts.push({ x, y: Math.min(y, FLOOR) }); }
      g.lineStyle(16, 0x3cf0ff, 0.35 * a); g.strokePoints(pts, false);
      g.lineStyle(7, 0xffffff, 0.95 * a); g.strokePoints(pts, false);
    }
    this.bolts = this.bolts.filter(b => b.t < 14);
  }

  // CHUVA DO CÉU (Dive Bomb): caem miradas onde o oponente estava e só explodem no chão
  spawnBombs(f, op) {
    const m = f.m, target = op.x, key = this.tk(f.char, m.tex || 'bomb');
    (m.offsets || [-70, 0, 70]).forEach((off, i) => {
      const x = Phaser.Math.Clamp(target + off * f.facing, 40, W - 40);
      const spr = this.add.sprite(x, -60, key, 0).setDepth(25).setScale(m.bombScale || 1.6).setVisible(false).setFlipX(f.facing < 0);
      this.bombList.push({ owner: f, x, y: m.crash ? -260 : -60, vy: 5, delay: i * 12, spr, t: 0, n: m.crash ? m.crash : this.nf(key), payload: m.payload || BOMB, landY: m.landY || 25, crash: m.crash, key });
      f.bombs++;
    });
  }

  updateBombs() {
    for (const bm of this.bombList) {
      if (bm.delay > 0) { bm.delay--; continue; }
      bm.spr.setVisible(true); bm.t++;
      bm.vy += 0.55; bm.y += bm.vy;
      const def = this.p[1 - bm.owner.side];
      // a bomba atravessa tudo e só explode ao tocar o chão
      if (bm.y >= FLOOR - bm.landY) {
        bm.dead = true;
        if (bm.crash) {
          // o piano se espatifa: os quadros seguintes da folha viram um efeito no lugar
          this.fx.push({ spr: this.add.sprite(bm.x, bm.y, bm.key, bm.crash).setDepth(25).setScale(bm.spr.scaleX).setFlipX(bm.spr.flipX), x: bm.x, y: bm.y, t: 0, n: this.nf(bm.key) - bm.crash, from: bm.crash, rate: 10, vx: 0, vy: 0 });
          this.addFx('fx_dust', bm.x - 90, FLOOR, { rate: 4, oy: 0.75 }, bm.owner.char); this.addFx('fx_dust', bm.x + 90, FLOOR, { rate: 4, oy: 0.75, flip: true }, bm.owner.char);
          this.cameras.main.shake(200, 0.014);
        } else this.boom(bm.x, FLOOR + 10, 1.5, bm.owner.char);
        const blast = { x: bm.x - 70, y: FLOOR - 160, w: 140, h: 160 };
        if (def.state !== 'ko' && !(def.inv > 0) && overlap(blast, def.hurtbox())) this.applyHit(bm.owner, def, bm.payload, bm.x, FLOOR - 70, true);
      }
    }
    this.bombList = this.bombList.filter(bm => { if (bm.dead) { bm.spr.destroy(); bm.owner.bombs--; } return !bm.dead; });
    for (const bo of this.booms) bo.t++;
    this.booms = this.booms.filter(bo => { if (bo.t >= 20) { bo.spr.destroy(); return false; } return true; });
  }

  boom(x, y, scale, ch) {
    const key = this.tk(ch, 'explosion');
    const spr = this.add.sprite(x, y, key, 0).setDepth(26).setScale(scale).setOrigin(0.5, 0.7);
    this.booms.push({ spr, t: 0, n: this.nf(key) });
    this.cameras.main.shake(100, 0.005);
  }

  spark(x, y, color, ch) {
    const blocked = color === P2_TINT;
    this.addFx(blocked ? 'fx_block' : 'fx_spark', x, y, { rate: 3, scale: blocked ? 0.8 : 1.0 }, ch);
  }

  // efeito animado que some sozinho; usa a folha do lutador (ch) se ele tiver uma, senão a comum
  addFx(name, x, y, o = {}, ch) {
    const key = this.tk(ch, name);
    const spr = this.add.sprite(x, y, key, 0).setDepth(35).setScale(o.scale || 1).setFlipX(!!o.flip);
    if (o.oy !== undefined) spr.setOrigin(0.5, o.oy);
    this.fx.push({ spr, x, y, t: 0, n: this.nf(key), rate: o.rate || 3, vx: o.vx || 0, vy: o.vy || 0 });
  }

  // imagem-fantasma rosa atrás do lutador nos especiais
  ghost(f) {
    const g = this.add.sprite(f.spr.x, f.spr.y, f.spr.texture.key, f.spr.frame.name)
      .setOrigin(f.spr.originX, f.spr.originY).setFlipX(f.spr.flipX).setScale(f.spr.scaleX, f.spr.scaleY).setDepth(9).setTint(0xff4fd8).setAlpha(0.55);
    this.ghosts.push({ spr: g, t: 0 });
  }

  renderVictoryLights() {
    const w = this.winner >= 0 ? this.p[this.winner] : null;
    if (!w || w.state !== 'victory') return;
    const k = Math.min(1, w.t / 30); // escurece em meio segundo
    this.dark.setAlpha(k);
    this.temple.setAlpha(k);
    this.templeGlow.setAlpha(k * (0.06 + 0.06 * Math.sin(w.t / 10))); // o templo respira de leve
    this.p[1 - this.winner].spr.setTint(0x333344);
    // canhões de luz saindo das treliças e mirando o vencedor
    const g = this.beams; g.clear();
    const tx = w.x, ty = FLOOR - 120;
    TEMPLE.lamps.forEach(([lx, ly, c], i) => {
      const sway = Math.sin(w.t / 20 + i) * 12;
      g.fillStyle(c, 0.16 * k);
      g.fillTriangle(lx, ly, tx - 70 + sway, FLOOR + 10, tx + 70 + sway, FLOOR + 10);
      g.fillStyle(0xffffff, 0.5 * k); g.fillCircle(lx, ly, 10);
    });
    g.fillStyle(0xfff2c0, 0.18 * k); g.fillEllipse(tx, FLOOR + 4, 260, 40);
  }

  chrome(t, kind) { chrome(t, kind); }

  makeBanner() {
    const c = this.add.container(W / 2, 488).setDepth(58).setVisible(false);
    this.bnBand = this.add.graphics();
    this.bnName = this.add.text(0, 3, 'X', { fontFamily: FONT_CHROME, fontStyle: 'italic 900', fontSize: '38px', color: '#fff', stroke: '#0a0612', strokeThickness: 5, padding: { x: 16, y: 4 } }).setOrigin(0.5);
    this.bnTag = this.add.text(0, 34, 'x', { fontFamily: FONT_NEON, fontSize: '28px', color: '#fff', padding: { x: 16, y: 8 } }).setOrigin(0.5).setAngle(-4);
    c.add([this.bnBand, this.bnName, this.bnTag]);
    // título gigante do super (5150 no Eddie) bate no meio da tela; o texto vem do lutador
    this.tBig = this.add.text(W / 2, H / 2 - 40, '5150', { fontFamily: FONT_CHROME, fontStyle: 'italic 900', fontSize: '230px', color: '#fff',
      stroke: '#0a0612', strokeThickness: 16, padding: { x: 50, y: 24 } }).setOrigin(0.5).setDepth(59).setVisible(false);
    chrome(this.tBig);
    this.tBig.setShadow(0, 0, '#ff3df0', 48, true, false);
    this.bigLines = this.add.graphics().setDepth(58); this.bigT = 0;
    this.banner = c; this.bannerT = 0; this.bannerPow = null;
  }

  announce(f, key) {
    const pw = f.char.powers && f.char.powers[key]; if (!pw) return;
    if (f.char.moves[key].super) {
      const title = f.char.bigTitle || pw.name;
      if (this.tBig.text !== title) { this.tBig.setFontSize((f.char.bigSize || 230) + 'px').setText(title); chrome(this.tBig); }
      this.tBig.setShadow(0, 0, pw.neon, 48, true, false);
      this.bigT = BIG_T; this.flashT = 10; this.cameras.main.shake(260, 0.014); return;
    }
    this.bannerPow = pw; this.bannerT = 70; this.flashT = 8;
    this.bnName.setText(pw.name); chrome(this.bnName);
    this.bnName.setShadow(0, 0, pw.neon, 14, true, false);
    this.bnTag.setText(pw.tag).setStroke(pw.neon, 2).setShadow(0, 0, pw.neon, 10, true, true);
    this.bnTag.x = this.bnName.width * 0.18;
  }

  // faixa inclinada com linhas de velocidade e bordas neon, redesenhada a cada quadro
  drawBigTitle() {
    const t = this.bigT, g = this.bigLines; g.clear();
    this.tBig.setVisible(t > 0); if (t <= 0) return;
    const age = BIG_T - t;
    // entra de 3x para 1x em 7 quadros, segura tremendo, sai crescendo e sumindo
    const sc = age < 7 ? 3 - age * (2 / 7) : t < 16 ? 1 + (16 - t) * 0.03 : 1 + Math.sin(age * 0.9) * 0.012;
    this.tBig.setScale(sc).setAlpha(t < 16 ? t / 16 : Math.min(1, age / 4)).setAngle(-4 + (age < 10 ? Math.random() * 4 - 2 : 0));
    // faixas neon atrás do número, abrindo do centro
    const open = Math.min(1, age / 10), a = t < 16 ? t / 16 : 1, cy = H / 2 - 40;
    for (const [dy, c, w] of [[-108, 0xff3df0, 6], [-96, 0x3cf0ff, 3], [96, 0x3cf0ff, 3], [108, 0xff3df0, 6]]) {
      g.lineStyle(w, c, a); g.lineBetween(W / 2 - 470 * open, cy + dy, W / 2 + 470 * open, cy + dy);
    }
    g.fillStyle(0x0a0010, 0.55 * a); g.fillRect(W / 2 - 470 * open, cy - 92, 940 * open, 184);
  }

  drawBanner() {
    const bt = this.bannerT, pw = this.bannerPow, c = this.banner;
    c.setVisible(bt > 0); this.tMode.setVisible(bt <= 0); if (bt <= 0 || !pw) return;
    const age = 70 - bt, open = Math.min(1, age / 7), close = Math.min(1, bt / 10);
    const g = this.bnBand; g.clear();
    const hw = (this.bnName.width / 2 + 14) * open, top = -16, bot = 22, sk = 12;
    g.fillStyle(pw.deep, 0.88 * close);
    g.fillPoints([{ x: -hw + sk, y: top }, { x: hw + sk, y: top }, { x: hw - sk, y: bot }, { x: -hw - sk, y: bot }], true);
    g.lineStyle(2, pw.edge, 0.35 * close);
    for (let i = 0; i < 4; i++) {
      const yy = top + 7 + i * 8, span = hw * 2 + 200, off = ((age * 14 + i * 97) % span) - hw - 100;
      const x0 = Math.max(-hw, off), x1 = Math.min(hw, off + 90);
      if (x1 > x0) g.lineBetween(x0, yy, x1, yy);
    }
    for (const [wd, a] of [[10, 0.18], [4, 0.5], [2, 1]]) {
      g.lineStyle(wd, pw.edge, a * close);
      g.lineBetween(-hw + sk, top, hw + sk, top); g.lineBetween(-hw - sk, bot, hw - sk, bot);
    }
    // o nome bate com tranco; a assinatura neon acende logo depois e tremula
    const pop = age < 6 ? 1.3 - age * 0.05 : 1;
    this.bnName.setScale(pop).setAlpha(close);
    this.bnTag.setAlpha(close * Math.min(1, Math.max(0, (age - 5) / 6)) * (0.85 + 0.15 * Math.sin(age * 1.7)));
    c.x = W / 2 + (bt < 10 ? (10 - bt) * 12 : 0);
  }

  updateFx() {
    for (const e of this.fx) { e.t++; e.x += e.vx; e.y += e.vy; e.spr.setPosition(e.x, e.y); }
    this.fx = this.fx.filter(e => { if (e.t >= e.n * e.rate) { e.spr.destroy(); return false; } return true; });
    for (const g of this.ghosts) { g.t++; g.spr.setAlpha(0.55 * (1 - g.t / 16)); }
    this.ghosts = this.ghosts.filter(g => { if (g.t >= 16) { g.spr.destroy(); return false; } return true; });
    for (const w of this.words) {
      w.age++;
      w.t.y -= 0.7;
      w.t.setScale(w.age < 6 ? 1.9 - w.age * 0.15 : 1).setAlpha(w.age > 38 ? (50 - w.age) / 12 : 1);
    }
    this.words = this.words.filter(w => { if (w.age >= 50) { w.t.destroy(); return false; } return true; });
    if (this.bannerT > 0) this.bannerT--;
    if (this.bigT > 0) this.bigT--;
    if (this.flashT > 0) this.flashT--;
  }

  // [folha, quadro] do lutador neste instante (a folha é o nome; render() resolve a textura do lutador)
  frameFor(f) {
    const loop = (name, ticks) => [name, Math.floor(f.t / ticks) % (f.char.anims[name] || this.nf(this.tk(f.char, name)))];
    switch (f.state) {
      case 'idle': return loop('idle', 6);
      case 'walk_fwd': return loop('walk_fwd', 4);
      case 'walk_back': return loop('walk_back', 5);
      case 'crouch': return ['crouch', f.t < 4 ? 0 : 1 + (Math.floor(f.t / 16) % 2)];
      case 'prejump': return ['jump', 0];
      case 'air':
        if (f.jk) return ['jumpkick', f.jk.t < 4 ? 0 : 1];
        return ['jump', f.vy < -6 ? 1 : f.vy < 3 ? 2 : f.y > -70 ? 4 : 3];
      case 'land': return ['jump', 5];
      case 'attack': { const m = f.m, s = f.moveStep(); return [m.anim || f.move, m.frames ? m.frames[s] : s]; }
      case 'block': return ['block', f.holdDown ? 1 : 0];
      case 'hit': return ['hit', f.spin ? 2 : Math.min(2, Math.floor(f.t / 5))];
      case 'gag': return [GAGS[f.gag.k].tex || 'react', GAGS[f.gag.k].frame(f.t)];
      case 'victory': return ['victory', Math.floor(f.t / 6) % 10]; // tapping em loop, pose fixa
      case 'ko': { const d = [8, 10, 10, 12]; let acc = 0, i = 0; while (i < 4 && f.t >= (acc += d[i])) i++; return ['ko', i]; }
    }
    return ['idle', 0];
  }

  render() {
    for (const f of this.p) {
      const [name, fr] = this.frameFor(f);
      const tex = this.tk(f.char, name);
      if (f.spr.texture.key !== tex) f.spr.setTexture(tex);
      setFr(f.spr, Math.min(fr, this.nf(tex) - 1));
      const oy = f.spin ? 0.55 : AY / FH;
      f.spr.setFlipX(f.facing < 0).setOrigin((f.facing > 0 ? AX : FW - AX) / FW, oy).setRotation(f.spin ? f.rot : 0);
      const sw = 1 + f.stings * 0.06;
      const lift = f.spin ? -(AY - 0.55 * FH) * SC * sw : 0, jit = f.buzz > 0 ? (Math.random() * 10 - 5) : 0;
      f.spr.setScale(sw * SC);
      f.spr.x = Math.round(f.x + jit); f.spr.y = Math.round(FLOOR + f.y + lift);
      f.shadow.x = f.x; f.shadow.setScale(Math.max(0.4, 1 + f.y / 240));
    }
    for (const pr of this.projs) { pr.spr.x = pr.x; setFr(pr.spr, Math.floor(pr.t / 4) % this.nf(pr.spr.texture.key)); }
    for (const bm of this.bombList) { bm.spr.y = bm.y; setFr(bm.spr, Math.floor(bm.t / 5) % bm.n); }
    for (const bo of this.booms) setFr(bo.spr, Math.min(bo.n - 1, Math.floor(bo.t / 5)));

    this.renderVictoryLights();
    for (const e of this.fx) setFr(e.spr, (e.from || 0) + Math.min(e.n - 1, Math.floor(e.t / e.rate)));
    this.drawWeather();
    this.drawBanner();
    this.drawBigTitle();
    if (!this.p.some(f => f.m && f.m.dark)) this.superDark = Math.max(0, this.superDark - 0.05);
    this.superShade.setAlpha(this.superDark);
    this.flash.setAlpha(this.flashT > 0 ? this.flashT / 8 * 0.6 : 0);

    // caixas de colisão (tecla H)
    this.debug.clear();
    if (this.showBoxes) for (const f of this.p) {
      const hu = f.hurtbox(); this.debug.lineStyle(2, 0x3cf0ff).strokeRect(hu.x, hu.y, hu.w, hu.h);
      let hb = null;
      if (f.state === 'attack' && f.m.hit && f.m.active.includes(f.moveStep())) hb = f.boxFrom(f.m.hit);
      if (f.state === 'air' && f.jk && f.jk.t >= 4 && !f.jk.hit) hb = f.boxFrom((f.char.jumpkick || JUMPKICK).hit);
      if (hb) this.debug.lineStyle(2, 0xff3d6e).strokeRect(hb.x, hb.y, hb.w, hb.h);
    }

    // HUD
    const g = this.hud; g.clear();
    const bw = 380, bh = 22, y = 30;
    [[36, this.p[0]], [W - 36 - bw, this.p[1]]].forEach(([x, f], i) => {
      g.fillStyle(0x000000); g.fillRect(x - 3, y - 3, bw + 6, bh + 6);
      g.fillStyle(0xcc2222); g.fillRect(x, y, bw, bh);
      const w = bw * f.hp / f.char.hp;
      g.fillStyle(0xffd23c); g.fillRect(i === 0 ? x + bw - w : x, y, w, bh);
      const mw = 200, mx = i === 0 ? x + bw - mw : x, my = y + bh + 8, full = f.meter >= 100;
      g.fillStyle(0x000000); g.fillRect(mx - 2, my - 2, mw + 4, 12);
      g.fillStyle(full ? (this.tick % 20 < 10 ? 0xff3df0 : 0x3cf0ff) : 0x7a3cff); g.fillRect(i === 0 ? mx + mw - mw * f.meter / 100 : mx, my, mw * f.meter / 100, 8);
      for (let k = 0; k < this.wins[i]; k++) { g.fillStyle(0xffe14a); g.fillCircle(i === 0 ? x + bw - 10 - k * 22 : x + 10 + k * 22, y + bh + 34, 7); }
    });
    this.tTimer.setText(String(Math.max(0, this.timer)).padStart(2, '0'));
    // espelho (mesmo lutador dos dois lados): "EDDIE CPU" / "EDDIE 2P", como antes
    const n1 = this.chars[0].name, n2 = this.chars[1].name, cpu = this.p[1].cpu;
    this.tN2.setText(this.mirror ? `${n2} ${cpu ? 'CPU' : '2P'}` : `${n2}${cpu ? ' CPU' : ''}`);
    this.tMode.setText(`P: 2P ${cpu ? 'CPU' : 'HUMAN'}   H: HITBOXES`);
    if (isTouch()) this.tMode.setVisible(false); // no celular não há teclado

    let msg = '', sub = '';
    if (this.phase === 'intro') msg = this.phaseT < 60 ? `ROUND ${this.round}` : 'FIGHT!';
    if (this.phase === 'ko') msg = 'K.O.';
    if (this.phase === 'time') msg = 'TIME';
    if ((this.phase === 'ko' || this.phase === 'time') && this.phaseT > 90) {
      msg = this.winner < 0 ? 'DRAW' : this.winner === 0 ? `${n1} WINS`
        : this.mirror ? (cpu ? 'CPU WINS' : `${n2} 2P WINS`) : `${n2} WINS`;
    }
    if (this.phase === 'over') {
      msg = this.wins[0] > this.wins[1] ? 'P1 WINS!' : (cpu ? 'CPU WINS!' : 'P2 WINS!');
      sub = isTouch() ? 'TAP TO CHOOSE FIGHTERS' : 'PRESS ENTER TO CHOOSE FIGHTERS';
    }
    if (this.tMsg.text !== msg) { this.tMsg.setText(msg); if (msg) chrome(this.tMsg); }
    this.tSub.setText(sub);
  }
}

Promise.all(['16px "Press Start 2P"', 'italic 900 40px Kanit', '40px "Mr Dafoe"'].map(f => document.fonts.load(f))).catch(() => {}).finally(() => {
  const game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', width: W, height: H, backgroundColor: '#0b0710',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, fullscreenTarget: 'game' },
    scene: [Boot, Title, Select, StageSelect, Fight],
  });
  window.AXE = game; // para testes no console
  // tela cheia: botão da página ou tecla T
  const toggle = () => { try { game.scale.toggleFullscreen(); } catch (e) { /* navegador recusou */ } };
  document.getElementById('fs')?.addEventListener('click', toggle);
  window.addEventListener('keydown', e => { if (e.code === 'KeyT') toggle(); });
});
