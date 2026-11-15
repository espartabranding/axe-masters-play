// AXE MASTERS: protótipo jogável (Eddie x Eddie)
// Lógica em passo fixo de 60 quadros por segundo; tempos em quadros (ver docs/eddie-ficha.md).

const W = 960, H = 540, FLOOR = 472; // linha do piso do palco
const FW = 460, FH = 300, AX = 220, AY = 290;
const ANIMS = {
  idle: 10, walk_fwd: 10, walk_back: 10, lp: 10, hp: 10, lk: 10, hk: 10, eruption: 4, block: 2, hit: 3, ko: 5,
  jump: 6, crouch: 3, jumpkick: 2, projectile: 4, divebomb: 5, bomb: 2, explosion: 4,
  brownsound: 10, panama: 10, victory: 10, sharkbite: 10, bumblebee: 10, drill: 10,
  fx_bee: 4, fx_drill: 4, fx_smoke: 4, react: 10, jumpcall: 5, dlr: 5, teacher: 10, fx_beam: 4, fx_zap: 4,
  fx_spark: 5, fx_block: 5, fx_wave: 5, fx_notes: 5, fx_dust: 5,
};
// SC: tamanho dos lutadores em relação ao cenário; caixas de acerto, efeitos e pulo acompanham
const SC = 0.8, px = v => Math.round(v * SC);
const MAX_HP = 950, WALK_F = 3.2, WALK_B = 2.6, MIN_GAP = px(95), ROUND_TIME = 99, WALL = px(60);
const JUMP_V = -15.2, GRAV = 0.85, JUMP_VX = 3.6;

// tipografia anos 80: cromado pesado (Kanit Black Italic), neon em script (Mr Dafoe) e arcade (Press Start 2P)
const FONT_CHROME = 'Kanit', FONT_NEON = '"Mr Dafoe"', FONT_PIXEL = '"Press Start 2P"';
// letreiro de cada especial: nome cromado + assinatura neon na cor do poder
const POWERS = {
  eruption:   { name: 'ERUPTION',    tag: 'Bola de fogo',     neon: '#ff7a1a', edge: 0xff7a1a, deep: 0x3a0d00 },
  brownsound: { name: 'BROWN SOUND', tag: 'Distorção',        neon: '#ffb347', edge: 0xc8742a, deep: 0x2a1408 },
  sharkbite:  { name: 'SHARK BITE',  tag: 'Ibanez Shark',     neon: '#3cf0ff', edge: 0x3cf0ff, deep: 0x04243a },
  bumblebee:  { name: 'BUMBLEBEE',   tag: 'Enxame',           neon: '#ffe14a', edge: 0xffe14a, deep: 0x1a1600 },
  drill:      { name: 'POUNDCAKE',   tag: 'Furadeira Makita', neon: '#7dff6a', edge: 0x7dff6a, deep: 0x0b2a12 },
  panama:     { name: 'PANAMA',      tag: 'Lamborghini',      neon: '#ff3d6e', edge: 0xff3d6e, deep: 0x33040f },
  teacher:    { name: 'HOT FOR TEACHER', tag: 'Super!',    neon: '#ff3df0', edge: 0xff3df0, deep: 0x2a0630 },
  jumpcall:   { name: 'JUMP!',       tag: 'David Lee Roth',   neon: '#ff4fd8', edge: 0xff4fd8, deep: 0x2a0626 },
  divebomb:   { name: 'DIVE BOMB',   tag: 'Alavanca',         neon: '#c77dff', edge: 0xc77dff, deep: 0x1d0838 },
};

// hit: retângulo relativo aos pés, x para frente. frames: quadros da folha usados em cada etapa.
const MOVES = {
  // Pick Slash: palhetada em leque com onda sonora
  lp: { dur: [1, 1, 1, 2, 2, 2, 1, 1, 2, 1], active: [3, 4], dmg: 30, hit: { x: 40, y: -195, w: 105, h: 55 }, hitstun: 14, blockstun: 8, push: 5, wave: 3 },
  // Frankenswing: golpe com o corpo da guitarra
  hp: { dur: [2, 2, 3, 2, 2, 4, 4, 3, 3, 3], active: [4, 5], dmg: 90, hit: { x: 20, y: -190, w: 165, h: 95 }, hitstun: 22, blockstun: 14, push: 10, shake: 0.006 },
  // Sneaker Snap: chute curto de tênis
  lk: { dur: [1, 2, 2, 1, 3, 3, 2, 2, 1, 1], active: [3, 4], dmg: 35, hit: { x: 30, y: -140, w: 125, h: 60 }, hitstun: 14, blockstun: 8, push: 6 },
  // Stage Leap: o pulo de palco com chute alto
  hk: { dur: [2, 3, 3, 3, 2, 4, 4, 4, 4, 3], active: [4, 5, 6], dmg: 95, hit: { x: 20, y: -320, w: 145, h: 160 }, hitstun: 22, blockstun: 14, push: 10, shake: 0.006, dust: 8 },
  eruption: { dur: [10, 5, 16, 12], frames: [0, 1, 1, 3], spawn: 1 },
  // BROWN SOUND: coluna de distorção que explode do chão em volta do Eddie (pega quem pula; invencível no começo)
  brownsound: { dur: [4, 2, 3, 3, 4, 6, 6, 5, 4, 3], active: [3, 4, 5, 6], dmg: 120, hit: { x: -60, y: -340, w: 200, h: 340 }, hitstun: 26, blockstun: 16, push: 11, shake: 0.01, blast: 3, inv: 10, gag: 'dizzy', word: ['BWAAAM!', '#ffb347'] },
  // SHARK BITE: troca pela Ibanez Destroyer 'Shark' e dá 3 mordidas
  sharkbite: { dur: [3, 5, 4, 3, 2, 6, 6, 6, 4, 3], active: [5, 6, 7], multi: 6, dmg: 40, hit: { x: 10, y: -230, w: 175, h: 160 }, hitstun: 14, blockstun: 8, push: 4, shake: 0.006, smoke: 1, step: [3, 4, 4], gag: 'chomp' },
  // BUMBLEBEE SWARM: troca pela Bumblebee e o acorde solta um enxame de abelhas
  bumblebee: { dur: [3, 5, 4, 3, 2, 8, 6, 5, 4, 3], smoke: 1, swarm: 5 },
  // POUNDCAKE DRILL: Frankenstrat original + furadeira Makita nas cordas
  drill: { dur: [3, 5, 4, 4, 6, 6, 3, 6, 6, 3], active: [4, 5, 6, 7], multi: 4, dmg: 14, hit: { x: 20, y: -205, w: 150, h: 115 }, hitstun: 10, blockstun: 6, push: 2, smoke: 1, step: [5, 7, 6], sparks: [4, 7], gag: 'buzz' },
  // PANAMA: arrancada de Lamborghini com joelhada
  // estala os dedos, o Lamborghini aparece, acelera, arranca, atropela, ele acena e salta fora
  panama: { dur: [6, 8, 8, 5, 3, 4, 3, 8, 8, 6], active: [4, 5, 6], dmg: 110, hit: { x: -40, y: -150, w: 210, h: 150 }, hitstun: 24, blockstun: 14, push: 12, shake: 0.008, dash: [3, 6], dust: 3, rev: 2, gag: 'flat', word: ['ATROPELADO!', '#ff3d6e'] },
  divebomb: { dur: [8, 6, 10, 26, 10], bombs: 2 },
  // JUMP!: o Eddie assobia, aponta para o céu e o David Lee Roth despenca em espacate em cima do oponente
  jumpcall: { dur: [6, 14, 14, 26, 14], summon: 2 },
  // SUPER HOT FOR TEACHER (A + S com a barra Feedback cheia): óculos de professor, tapping, joelhada deslizando
  // e um raio que atravessa a tela; quem leva todos os acertos termina tostado
  teacher: { dur: [6, 20, 5, 5, 5, 5, 12, 12, 16, 16, 16, 16], frames: [0, 1, 2, 3, 2, 3, 4, 5, 6, 7, 8, 9], active: [8, 9], multi: 3, dmg: 22,
    hit: { x: 60, y: -235, w: 1100, h: 150 }, hitstun: 12, blockstun: 8, push: 1, chip: 4, gag: 'zap', beam: [8, 9], slide: 6, inv: 30, dark: true },
};
const JUMPKICK = { dmg: 75, hit: { x: 10, y: -150, w: 120, h: 120 }, hitstun: 18, blockstun: 12, push: 7, overhead: true };
const PROJ = { dmg: 80, hitstun: 18, blockstun: 12, push: 8, chip: 10, gag: 'burnt', word: ['TOSTADO!', '#ff7a1a'] };
const BEE = { dmg: 15, hitstun: 12, blockstun: 6, push: 3, chip: 3, gag: 'swell' };
const BOMB = { dmg: 45, hitstun: 20, blockstun: 12, push: 6, chip: 6, shake: 0.008, gag: 'dizzy', word: ['KABUM!', '#ffb347'] };
// reações cômicas (folha react): quadros e duração em quadros de jogo; quem está na piada fica invencível
const GAGS = {
  burnt: { dur: 80, frame: t => t < 62 ? (Math.floor(t / 8) % 2) : 2 },
  swell: { dur: 72, frame: t => t < 18 ? 3 : (Math.floor(t / 7) % 2 ? 4 : 3) },
  dizzy: { dur: 72, frame: t => 5 + (Math.floor(t / 12) % 2) },
  flat:  { dur: 62, frame: t => t < 38 ? 7 : t < 50 ? 8 : 9 },
};
// o David Lee Roth caindo sentado: não dá para defender agachado
const DLR = { dmg: 100, hitstun: 30, blockstun: 16, push: 9, chip: 10, shake: 0.012, overhead: true, gag: 'dizzy', word: ['YEAAAH!', '#ff4fd8'] };
const HURT = { x: -45, y: -235, w: 90, h: 235 };
const HURT_CROUCH = { x: -50, y: -150, w: 100, h: 150 };

class Fighter {
  constructor(scene, side, cpu) {
    this.scene = scene;
    this.side = side; // 0 = P1, 1 = P2
    this.cpu = cpu;
    this.spr = scene.add.sprite(0, FLOOR, 'idle', 0).setDepth(10);
    if (side === 1) this.spr.setTint(0x9fc8ff);
    this.shadow = scene.add.ellipse(0, FLOOR + 2, px(120), px(16), 0x000000, 0.35).setDepth(5);
    this.reset();
  }
  reset() {
    this.x = this.side === 0 ? 300 : 660; this.y = 0; this.vy = 0;
    this.facing = this.side === 0 ? 1 : -1;
    this.hp = MAX_HP;
    this.state = 'idle'; this.t = 0; this.stun = 0; this.vx = 0;
    this.move = null; this.hasHit = false; this.buf = []; this.proj = null; this.bombs = 0; this.swarm = 0; this.jk = null;
    this.holdBack = false; this.holdDown = false; this.cpuCD = 0; this.cpuHold = {};
    this.lastHp = -99; this.lastLk = -99; this.lastLp = -99; this.dlr = false; this.meter = 0;
    this.gag = null; this.pendGag = null; this.stings = 0; this.spin = false; this.rot = 0; this.buzz = 0; this.inv = 0;
  }
  get free() { return ['idle', 'walk_fwd', 'walk_back', 'crouch'].includes(this.state); }
  get airborne() { return this.y < 0; }
  canBlock() { return this.free || this.state === 'block'; }
  hurtbox() {
    const hb = this.state === 'crouch' || (this.state === 'block' && this.holdDown) ? HURT_CROUCH : HURT;
    return { x: this.x + hb.x * SC, y: FLOOR + this.y + hb.y * SC, w: hb.w * SC, h: hb.h * SC };
  }
  boxFrom(h) {
    const x = this.facing > 0 ? this.x + h.x * SC : this.x - (h.x + h.w) * SC;
    return { x, y: FLOOR + this.y + h.y * SC, w: h.w * SC, h: h.h * SC };
  }
  moveStep() {
    const d = MOVES[this.move].dur; let acc = 0;
    for (let i = 0; i < d.length; i++) { acc += d[i]; if (this.t < acc) return i; }
    return d.length - 1;
  }
  startMove(name) {
    this.state = 'attack'; this.move = name; this.t = 0; this.hasHit = false; this.vx = 0; this.spawned = false; this.evWave = false; this.evDust = false; this.evRise = false; this.evSmoke = false; this.evRev = false; this.evFinish = false; this.lastHitT = -99;
  }
}

const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// procura a sequência de direções (notação de teclado numérico) nos últimos 12 quadros.
// A direção final tem que estar apertada junto com o botão: assim defender agachado e depois atacar
// não solta especial sem querer.
function hasMotion(buf, seq) {
  if (buf[buf.length - 1] !== seq[seq.length - 1]) return false;
  let k = seq.length - 1;
  for (let i = buf.length - 1; i >= Math.max(0, buf.length - 12); i--) {
    if (buf[i] === seq[k] && --k < 0) return true;
  }
  return false;
}

class Fight extends Phaser.Scene {
  constructor() { super('fight'); }

  preload() {
    this.load.image('stage', 'assets/stages/palco-eddie.jpg?v=8876c20');
    for (const n of Object.keys(ANIMS)) this.load.spritesheet(n, `assets/eddie/${n}.png?v=8876c20`, { frameWidth: FW, frameHeight: FH });
  }

  create() {
    this.drawStage();
    this.p = [new Fighter(this, 0, false), new Fighter(this, 1, true)];
    this.projs = []; this.bombList = []; this.booms = []; this.fx = []; this.ghosts = []; this.bees = []; this.words = []; this.dlrs = [];
    this.flash = this.add.rectangle(0, 0, W, H, 0xffffff, 0).setOrigin(0).setDepth(55); this.flashT = 0;
    this.sparks = this.add.graphics().setDepth(30);
    this.superShade = this.add.rectangle(0, 0, W, H, 0x12001c, 1).setOrigin(0).setDepth(9).setAlpha(0); this.superDark = 0;
    this.debug = this.add.graphics().setDepth(40);
    this.showBoxes = false;
    this.hud = this.add.graphics().setDepth(50);
    const pxf = { fontFamily: FONT_PIXEL };
    const cr = { fontFamily: FONT_CHROME, fontStyle: 'italic 900', padding: { x: 24, y: 6 } };
    this.tTimer = this.add.text(W / 2, 22, '99', { ...cr, fontSize: '44px', color: '#ffe14a', stroke: '#1a0b24', strokeThickness: 6 }).setOrigin(0.5, 0).setDepth(51);
    this.chrome(this.tTimer, 'gold');
    this.tN1 = this.add.text(12, 52, 'EDDIE', { ...cr, fontSize: '24px', color: '#ffffff', stroke: '#1a0b24', strokeThickness: 5 }).setDepth(51);
    this.tN2 = this.add.text(W - 12, 52, 'EDDIE 2P', { ...cr, fontSize: '24px', color: '#9fc8ff', stroke: '#1a0b24', strokeThickness: 5 }).setOrigin(1, 0).setDepth(51);
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
      boxes: K.H, mode: K.P, enter: K.ENTER,
    });
    this.keys.boxes.on('down', () => { this.showBoxes = !this.showBoxes; });
    this.keys.mode.on('down', () => { this.p[1].cpu = !this.p[1].cpu; });
    this.keys.enter.on('down', () => { if (this.phase === 'over') this.newMatch(); });
    this.input.keyboard.addCapture([K.LEFT, K.RIGHT, K.DOWN, K.UP, K.SPACE]);

    this.acc = 0;
    this.newMatch();
  }

  drawStage() {
    this.add.image(0, 0, 'stage').setOrigin(0).setDisplaySize(W, H).setDepth(0);
    // vitória: o palco escurece, só o logo VH continua aceso e os canhões de luz miram o vencedor
    this.dark = this.add.rectangle(0, 0, W, H, 0x000000, 0).setOrigin(0).setDepth(7);
    const crop = [298, 90, 370, 150]; // região do logo VH no palco (imagem de 960x540)
    this.logo = this.add.image(0, 0, 'stage').setOrigin(0).setCrop(...crop).setDepth(8).setAlpha(0);
    this.logoGlow = this.add.image(0, 0, 'stage').setOrigin(0).setCrop(...crop).setDepth(8)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.beams = this.add.graphics().setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
  }

  drawStageOld() {
    const g = this.add.graphics().setDepth(0);
    const bands = [0x2a0f3d, 0x321246, 0x3a1550, 0x43185a, 0x4c1b63, 0x2a1838];
    bands.forEach((c, i) => { g.fillStyle(c); g.fillRect(0, i * 70, W, 70); });
    g.lineStyle(4, 0x6a4a8a);
    for (let x = 40; x < W; x += 220) { g.strokeRect(x, 60, 30, 330); }
    g.strokeRect(0, 60, W, 22);
    const lc = [0xff3d6e, 0xffc93c, 0xff4fd8, 0x3cf0ff];
    for (let i = 0; i < 12; i++) { g.fillStyle(lc[i % 4], 0.9); g.fillCircle(50 + i * 80, 96, 9); g.fillStyle(lc[i % 4], 0.08); g.fillTriangle(50 + i * 80, 96, 10 + i * 80, FLOOR, 90 + i * 80, FLOOR); }
    for (const ax of [20, 120, 760, 860]) {
      for (let r = 0; r < 3; r++) { g.fillStyle(0x161018); g.fillRect(ax, 230 + r * 90, 86, 86); g.lineStyle(3, 0x3a2a48); g.strokeRect(ax, 230 + r * 90, 86, 86); g.fillStyle(0x2a1f30); g.fillRect(ax + 8, 238 + r * 90, 70, 70); }
    }
    for (let y = FLOOR - 10; y < H; y += 10) for (let x = 0; x < W; x += 40) {
      g.fillStyle(((x / 40 + y / 10) | 0) % 2 ? 0x3a2148 : 0x2e1a3a); g.fillRect(x, y, 40, 10);
    }
    g.fillStyle(0x6a4a8a); g.fillRect(0, FLOOR - 12, W, 3);
  }

  newMatch() { this.wins = [0, 0]; this.round = 1; this.newRound(); }
  newRound() {
    this.p.forEach(f => f.reset());
    [...this.projs, ...this.bombList, ...this.booms, ...(this.fx || []), ...(this.ghosts || []), ...(this.bees || [])].forEach(o => o.spr.destroy());
    this.projs = []; this.bombList = []; this.booms = []; this.fx = []; this.ghosts = []; this.bees = [];
    (this.words || []).forEach(w => w.t.destroy()); this.words = [];
    (this.dlrs || []).forEach(d => { d.spr.destroy(); d.shadow.destroy(); }); this.dlrs = [];
    if (this.dark) { this.dark.setAlpha(0); this.logo.setAlpha(0); this.logoGlow.setAlpha(0); this.beams.clear(); }
    this.p.forEach(f => f.spr.setTint(f.side === 1 ? 0x9fc8ff : 0xffffff));
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
    const left = k['l' + n].isDown, right = k['r' + n].isDown;
    const press = b => Phaser.Input.Keyboard.JustDown(k[b + n]);
    return {
      fwd: f.facing > 0 ? right && !left : left && !right,
      back: f.facing > 0 ? left && !right : right && !left,
      down: k['d' + n].isDown, up: k['u' + n].isDown,
      lp: press('lp'), hp: press('hp'), lk: press('lk'), hk: press('hk'),
    };
  }

  cpuThink(me, op) {
    if (me.cpuCD > 0) { me.cpuCD--; return { ...me.cpuHold }; }
    const d = Math.abs(op.x - me.x), r = Math.random(), inp = {};
    const projIncoming = this.projs.some(pr => pr.owner !== me && Math.abs(pr.x - me.x) < 280);
    const threat = (op.state === 'attack' && d < 260) || projIncoming;
    if (me.meter >= 100 && d < 600 && r < 0.04) { inp.special = 'teacher'; inp.hp = true; me.cpuCD = 120; }
    else if (op.airborne && d < 230 && r < 0.25) { inp.special = 'brownsound'; inp.hp = true; me.cpuCD = 40; }
    else if (d > 200 && d < 420 && r > 0.93) { inp.special = 'panama'; inp.hk = true; me.cpuCD = 45; }
    else if (d < 200 && r > 0.9) { inp.special = r > 0.95 ? 'sharkbite' : 'drill'; inp[inp.special === 'drill' ? 'hp' : 'hk'] = true; me.cpuCD = 45; }
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
        });
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
    this.separate(a, b);
    for (const f of this.p) this.checkHit(f, this.p[1 - f.side]);
    this.updateProjectiles();
    this.updateBombs();
    this.updateBees();
    this.updateDLR();
    this.updateFx();
  }

  updateFighter(f, op, inp) {
    f.t++;
    if (f.inv > 0) f.inv--;
    if (f.buzz > 0) f.buzz--;
    if (f.spin) f.rot += 0.33 * -f.facing;
    if (inp.lp) f.lastLp = this.tick;
    if (inp.hp) f.lastHp = this.tick;
    if (inp.lk) f.lastLk = this.tick;
    const sd = (inp.hp || inp.lk) && Math.abs(f.lastHp - f.lastLk) <= 5;
    if (sd && f.state === 'attack' && (f.move === 'hp' || f.move === 'lk') && f.t <= 6) { f.state = 'idle'; f.move = null; }
    const as = f.meter >= 100 && (((inp.lp || inp.hp) && Math.abs(f.lastLp - f.lastHp) <= 5) || inp.special === 'teacher');
    if (as && f.state === 'attack' && (f.move === 'lp' || f.move === 'hp') && f.t <= 6) { f.state = 'idle'; f.move = null; }
    if (f.free) {
      f.facing = op.x >= f.x ? 1 : -1;
      const punch = inp.lp || inp.hp, kick = inp.lk || inp.hk;
      if (as) { f.meter = 0; f.startMove('teacher'); f.inv = MOVES.teacher.inv; this.announce('teacher'); this.cameras.main.flash(120, 255, 80, 240); }
      else if (sd || inp.special === 'panama' || (kick && hasMotion(f.buf, [2, 3, 6]))) { f.startMove('panama'); this.announce('panama'); }
      else if (kick && !f.dlr && (inp.special === 'jumpcall' || hasMotion(f.buf, [6, 2, 3]))) { f.startMove('jumpcall'); this.announce('jumpcall'); }
      else if (punch && (inp.special === 'brownsound' || hasMotion(f.buf, [2, 5, 2]))) { f.startMove('brownsound'); f.inv = MOVES.brownsound.inv; this.announce('brownsound'); }
      else if (kick && (inp.special === 'sharkbite' || hasMotion(f.buf, [2, 1, 4]))) { f.startMove('sharkbite'); this.announce('sharkbite'); }
      else if (kick && !f.swarm && (inp.special === 'bumblebee' || hasMotion(f.buf, [2, 5, 2]))) { f.startMove('bumblebee'); this.announce('bumblebee'); }
      else if (punch && (inp.special === 'drill' || hasMotion(f.buf, [6, 5, 6]))) { f.startMove('drill'); this.announce('drill'); }
      else if (punch && !f.proj && (inp.special === 'eruption' || hasMotion(f.buf, [2, 3, 6]))) { f.startMove('eruption'); f.projFast = !!inp.hp; this.announce('eruption'); }
      else if (punch && !f.bombs && (inp.special === 'divebomb' || hasMotion(f.buf, [2, 1, 4]))) { f.startMove('divebomb'); f.bombTarget = op.x; this.announce('divebomb'); }
      else if (inp.lp) f.startMove('lp');
      else if (inp.hp) f.startMove('hp');
      else if (inp.lk) f.startMove('lk');
      else if (inp.hk) f.startMove('hk');
      else if (inp.up) { f.state = 'prejump'; f.t = 0; f.jumpDir = inp.fwd ? 1 : inp.back ? -1 : 0; f.vx = 0; }
      else if (inp.down) { if (f.state !== 'crouch') { f.state = 'crouch'; f.t = 0; } f.vx = 0; }
      else if (inp.fwd) { if (f.state !== 'walk_fwd') { f.state = 'walk_fwd'; f.t = 0; } f.vx = WALK_F * f.facing; }
      else if (inp.back) { if (f.state !== 'walk_back') { f.state = 'walk_back'; f.t = 0; } f.vx = -WALK_B * f.facing; }
      else { if (f.state !== 'idle') { f.state = 'idle'; f.t = 0; } f.vx = 0; }
    } else if (f.state === 'prejump') {
      if (f.t >= 4) { f.state = 'air'; f.t = 0; f.vy = JUMP_V; f.vx = f.jumpDir * JUMP_VX * f.facing; f.jk = null; }
    } else if (f.state === 'air') {
      if (!f.jk && (inp.lk || inp.hk)) f.jk = { t: 0, hit: false, strong: !!inp.hk };
      if (f.jk) f.jk.t++;
    } else if (f.state === 'land') {
      if (f.t >= 5) { f.state = 'idle'; f.t = 0; f.facing = op.x >= f.x ? 1 : -1; }
    } else if (f.state === 'attack') {
      const m = MOVES[f.move];
      if (m.spawn !== undefined && !f.spawned && f.moveStep() >= m.spawn) { f.spawned = true; this.spawnProjectile(f); }
      if (m.bombs !== undefined && !f.spawned && f.moveStep() >= m.bombs) { f.spawned = true; this.spawnBombs(f, op); }
      const st = f.moveStep();
      if (m.wave !== undefined && st === m.wave && !f.evWave) { f.evWave = true; this.addFx('fx_wave', f.x + f.facing * px(135), FLOOR - px(195), { vx: f.facing * 3, flip: f.facing < 0, rate: 3, scale: 0.8 * SC }); }
      if (m.dust !== undefined && st === m.dust && !f.evDust) { f.evDust = true; this.addFx('fx_dust', f.x, FLOOR, { rate: 4, oy: 0.75 }); }
      if (m.blast !== undefined && st >= m.blast && !f.evRise) { f.evRise = true; this.boom(f.x, FLOOR + 10, 1.3); this.addFx('fx_dust', f.x - 70, FLOOR, { rate: 4, oy: 0.75 }); this.addFx('fx_dust', f.x + 70, FLOOR, { rate: 4, oy: 0.75, flip: true }); }
      if (m.smoke !== undefined && st === m.smoke && !f.evSmoke) { f.evSmoke = true; this.addFx('fx_smoke', f.x - f.facing * px(40), FLOOR - px(120), { rate: 4, scale: SC }); }
      if (m.step) { if (st >= m.step[0] && st <= m.step[1]) f.vx = f.facing * m.step[2]; else f.vx = 0; }
      if (m.sparks && st >= m.sparks[0] && st <= m.sparks[1] && f.t % 3 === 0) this.addFx('fx_drill', f.x + f.facing * px(70), FLOOR - px(150), { rate: 2, scale: 0.8 * SC });
      if (m.swarm !== undefined && st >= m.swarm && !f.spawned) { f.spawned = true; this.spawnSwarm(f); }
      if (m.slide !== undefined) f.vx = st === m.slide ? f.facing * 5 : (st > m.slide ? 0 : f.vx);
      if (m.beam) this.updateBeam(f, st >= m.beam[0] && st <= m.beam[1]);
      if (m.dark) this.superDark = Math.min(0.78, (this.superDark || 0) + 0.06);
      if (f.move === 'teacher' && st >= 2 && st <= 5 && f.t % 4 === 0) this.addFx('fx_notes', f.x + f.facing * px(90), FLOOR - px(170), { vx: f.facing * 4, vy: -1 - Math.random() * 2, rate: 4, scale: 0.5 * SC });
      if (f.move === 'teacher' && st === 10 && !f.evFinish) {
        f.evFinish = true;
        if (op.state !== 'ko' && f.hasHit && op.state === 'hit') { this.startGag(op, 'burnt'); this.say('TOSTADO!', op.x, FLOOR - px(270), '#ff7a1a', 44); }
      }
      if (m.summon !== undefined && st >= m.summon && !f.spawned) { f.spawned = true; this.spawnDLR(f, op); }
      if (m.dash) { if (st >= m.dash[0] && st <= m.dash[1]) f.vx = f.facing * 13; else if (st > m.dash[1]) f.vx *= 0.9; }
      if (m.rev !== undefined && st === m.rev && !f.evRev) {
        f.evRev = true; this.say('VRUUUM!', f.x - f.facing * 40, FLOOR - px(200), '#ff3d6e', 38);
        this.addFx('projectile', f.x - f.facing * px(120), FLOOR - px(40), { rate: 3, scale: 0.5 * SC, flip: f.facing > 0, vx: -f.facing * 2 });
      }
      if (['eruption', 'divebomb', 'brownsound', 'panama', 'sharkbite', 'drill'].includes(f.move) && (f.move === 'panama' ? f.t >= 22 && f.t < 40 : f.t < 24) && f.t % 3 === 0) this.ghost(f);
      if (f.t >= m.dur.reduce((s, v) => s + v, 0)) { if (m.beam) this.updateBeam(f, false); f.state = f.airborne ? 'air' : 'idle'; f.t = 0; f.move = null; f.jk = null; }
    } else if (f.state === 'gag') {
      f.vx *= 0.8;
      if (f.gag.k === 'burnt' && f.t % 9 === 0 && f.t < 50) this.addFx('fx_smoke', f.x + (Math.random() * 30 - 15), FLOOR - px(250), { rate: 5, scale: 0.35 * SC, vy: -1 });
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
        if (f.spin) { f.spin = false; f.rot = 0; this.addFx('fx_dust', f.x, FLOOR, { rate: 4, oy: 0.75 }); this.cameras.main.shake(90, 0.004); }
        if (f.pendGag && f.state === 'hit') { this.startGag(f, f.pendGag); }
        f.pendGag = null;
        if (f.state === 'air') { f.state = 'land'; f.t = 0; f.vx = 0; f.jk = null; this.addFx('fx_dust', f.x, FLOOR, { rate: 4, oy: 0.75 }); }
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
    }
  }

  checkHit(att, def) {
    if (def.state === 'ko' || def.inv > 0) return;
    if (att.state === 'air' && att.jk && att.jk.t >= 4 && !att.jk.hit) {
      const hb = att.boxFrom(JUMPKICK.hit);
      if (overlap(hb, def.hurtbox())) {
        att.jk.hit = true;
        const m = { ...JUMPKICK, dmg: att.jk.strong ? JUMPKICK.dmg : 50 };
        this.applyHit(att, def, m, hb.x + (att.facing > 0 ? hb.w : 0), hb.y + hb.h / 2, false);
      }
      return;
    }
    if (att.state !== 'attack') return;
    const m = MOVES[att.move];
    if (!m.hit || !m.active.includes(att.moveStep())) return;
    if (m.multi ? att.t - att.lastHitT < m.multi : att.hasHit) return;
    const hb = att.boxFrom(m.hit);
    if (!overlap(hb, def.hurtbox())) return;
    att.hasHit = true; att.lastHitT = att.t;
    this.applyHit(att, def, m, hb.x + (att.facing > 0 ? hb.w : 0), hb.y + hb.h / 2, false);
  }

  applyHit(att, def, m, sx, sy, isProj) {
    // golpe no pulo não pode ser defendido agachado
    const blocking = def.canBlock() && def.holdBack && !def.airborne && !(m.overhead && def.holdDown);
    const away = def.x >= att.x ? 1 : -1;
    if (blocking) {
      def.state = 'block'; def.stun = m.blockstun; def.vx = away * m.push * 0.8; def.t = 0;
      if (m.chip) def.hp = Math.max(1, def.hp - m.chip);
      this.hitstop = 4; this.spark(sx, sy, 0x9fc8ff);
      return;
    }
    def.hp -= m.dmg; def.move = null; def.jk = null;
    if (att.move !== 'teacher') { att.meter = Math.min(100, att.meter + m.dmg * 0.3); def.meter = Math.min(100, def.meter + m.dmg * 0.15); }
    if (att.move === 'teacher' && this.textures.exists('fx_zap')) this.addFx('fx_zap', def.x, FLOOR + def.y - px(160), { rate: 2, scale: 0.8 * SC });
    else this.spark(sx, sy, 0xffe14a);
    if (m.shake) this.cameras.main.shake(120, m.shake);
    if (m.dmg >= 75) this.addFx('fx_notes', def.x, FLOOR + def.y - px(250), { vy: -1.2, rate: 5, scale: 0.9 * SC });
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

  updateBeam(f, on) {
    if (!on) { if (f.beam) { f.beam.destroy(); f.beam = null; } return; }
    const x0 = f.x + f.facing * px(100), y0 = FLOOR - px(152);
    const reach = f.facing > 0 ? W - x0 + 40 : x0 + 40;
    const key = this.textures.exists('fx_beam') ? 'fx_beam' : 'bolt';
    if (!f.beam) f.beam = this.add.sprite(x0, y0, key, 0).setDepth(23).setOrigin(f.facing > 0 ? 0 : 1, 0.5).setFlipX(f.facing < 0);
    const fw = f.beam.frame.width;
    f.beam.setPosition(x0, y0).setFrame(Math.floor(f.t / 2) % (key === 'fx_beam' ? ANIMS.fx_beam : 3))
      .setScale(reach / fw, (0.38 + Math.random() * 0.18) * SC);
    if (f.t % 3 === 0) this.cameras.main.shake(60, 0.004);
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
        if (def.stings >= 3) { def.stings = 0; this.say('INCHOU!', def.x, FLOOR - px(290), '#ff5a5a', 44); if (def.airborne) def.pendGag = 'swell'; else this.startGag(def, 'swell'); }
        break;
      case 'chomp':
        this.say(Math.random() < 0.5 ? 'CHOMP!' : 'NHAC!', sx, sy - 30, '#3cf0ff', 38);
        if (!def.airborne) def.vy = -6;
        break;
      case 'zap': def.buzz = 8; break;
      case 'buzz':
        def.buzz = 14;
        if (att.t % 8 < 4) this.say('BRRRT!', sx, sy - 30 - Math.random() * 30, '#7dff6a', 32);
        break;
    }
  }

  startGag(f, k) {
    f.state = 'gag'; f.t = 0; f.gag = { k }; f.move = null; f.jk = null; f.stun = 0;
    f.inv = GAGS[k].dur + 20; f.spin = false; f.rot = 0;
    if (k === 'flat') f.vx = 0;
  }

  // balão de onomatopeia: entra grande, encolhe com tranco, sobe e some
  say(text, x, y, color, size = 34) {
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

  spawnProjectile(f) {
    const x = f.x + f.facing * px(125), y = FLOOR - px(145);
    const spr = this.add.sprite(x, y, 'projectile', 0).setDepth(20).setFlipX(f.facing < 0).setScale(1.35 * SC);
    if (f.side === 1) spr.setTint(0x9fc8ff);
    const pr = { owner: f, x, y, dir: f.facing, v: f.projFast ? 8 : 5, spr, t: 0 };
    f.proj = pr; this.projs.push(pr);
  }

  updateProjectiles() {
    for (const pr of this.projs) {
      pr.x += pr.dir * pr.v; pr.t++;
      const box = { x: pr.x - 36, y: pr.y - 24, w: 72, h: 48 };
      const def = this.p[1 - pr.owner.side];
      if (def.state !== 'ko' && !(def.inv > 0) && overlap(box, def.hurtbox())) { pr.dead = true; this.applyHit(pr.owner, def, PROJ, pr.x + pr.dir * 30, pr.y, true); }
      for (const o of this.projs) if (o !== pr && !o.dead && o.owner !== pr.owner && Math.abs(o.x - pr.x) < 60) { o.dead = pr.dead = true; this.boom(( o.x + pr.x) / 2, pr.y + 40, 0.8); }
      if (pr.x < -100 || pr.x > W + 100) pr.dead = true;
    }
    this.projs = this.projs.filter(pr => { if (pr.dead) { pr.spr.destroy(); pr.owner.proj = null; } return !pr.dead; });
  }

  // BUMBLEBEE: 6 abelhas saem da guitarra e perseguem o oponente
  spawnSwarm(f) {
    for (let i = 0; i < 6; i++) {
      const x = f.x + f.facing * px(110), y = FLOOR - px(170) + (i - 2.5) * 12;
      const spr = this.add.sprite(x, y, 'fx_bee', 0).setDepth(24).setScale(0.55 * SC).setFlipX(f.facing < 0);
      this.bees.push({ owner: f, x, y, vx: f.facing * (4 + Math.random() * 2), vy: (Math.random() - 0.5) * 3, t: 0, ph: Math.random() * 6, spr });
    }
    f.swarm = 6;
  }

  updateBees() {
    for (const b of this.bees) {
      b.t++;
      const def = this.p[1 - b.owner.side];
      const tx = def.x, ty = FLOOR + def.y - px(150);
      b.vx += Math.sign(tx - b.x) * 0.35; b.vy += Math.sign(ty - b.y) * 0.25;
      const sp = Math.hypot(b.vx, b.vy), max = 6;
      if (sp > max) { b.vx *= max / sp; b.vy *= max / sp; }
      b.x += b.vx; b.y += b.vy + Math.sin(b.t / 4 + b.ph) * 1.5;
      b.spr.setPosition(b.x, b.y).setFlipX(b.vx < 0).setFrame(Math.floor(b.t / 2) % 4);
      const box = { x: b.x - 20, y: b.y - 15, w: 40, h: 30 };
      if (def.state !== 'ko' && !(def.inv > 0) && b.t > 8 && overlap(box, def.hurtbox())) { b.dead = true; this.applyHit(b.owner, def, BEE, b.x, b.y, true); }
      if (b.t > 200) b.dead = true;
    }
    this.bees = this.bees.filter(b => { if (b.dead) { b.spr.destroy(); b.owner.swarm--; } return !b.dead; });
  }

  // JUMP!: o David Lee Roth cai do céu em espacate onde o oponente está; sombra no chão avisa
  spawnDLR(f, op) {
    const x = Phaser.Math.Clamp(op.x, 90, W - 90);
    const spr = this.add.sprite(x, FLOOR - 560, 'dlr', 0).setDepth(22).setFlipX(f.facing < 0).setScale(SC)
      .setOrigin((f.facing > 0 ? AX : FW - AX) / FW, AY / FH);
    const shadow = this.add.ellipse(x, FLOOR + 2, px(150), px(18), 0x000000, 0.4).setDepth(6).setScale(0.2);
    this.dlrs.push({ owner: f, x, dy: -560, vy: 3, phase: 'fall', t: 0, spr, shadow });
    f.dlr = true;
    this.say('FIIIIU...', x, 140, '#ff4fd8', 26);
  }

  updateDLR() {
    for (const d of this.dlrs) {
      d.t++;
      const def = this.p[1 - d.owner.side];
      if (d.phase === 'fall') {
        d.vy += 0.75; d.dy += d.vy;
        d.spr.setFrame(d.vy < 9 ? 0 : 1);
        d.shadow.setScale(Math.min(1, 0.2 + d.t / 45));
        if (d.dy >= 0) {
          d.dy = 0; d.phase = 'impact'; d.t = 0; d.spr.setFrame(2);
          this.cameras.main.shake(180, 0.012);
          this.addFx('fx_dust', d.x - 80, FLOOR, { rate: 4, oy: 0.75 }); this.addFx('fx_dust', d.x + 80, FLOOR, { rate: 4, oy: 0.75, flip: true });
          const box = { x: d.x - px(115), y: FLOOR - px(190), w: px(230), h: px(190) };
          if (def.state !== 'ko' && !(def.inv > 0) && overlap(box, def.hurtbox())) this.applyHit(d.owner, def, DLR, d.x, FLOOR - px(120), true);
          else this.say('OPS!', d.x, FLOOR - 230, '#ff4fd8', 34);
        }
      } else if (d.phase === 'impact' && d.t > 24) { d.phase = 'pose'; d.t = 0; d.spr.setFrame(3); }
      else if (d.phase === 'pose' && d.t > 36) { d.phase = 'leave'; d.t = 0; d.vy = -17; d.spr.setFrame(4); }
      else if (d.phase === 'leave') {
        d.vy -= 0.4; d.dy += d.vy; d.x += d.owner.facing * -3; // sobe acelerando até sumir pelo alto
        d.shadow.setScale(Math.max(0, 1 + d.dy / 300));
        if (d.dy < -620) d.dead = true;
      }
      d.spr.setPosition(Math.round(d.x), Math.round(FLOOR + d.dy)); d.shadow.x = d.x;
    }
    this.dlrs = this.dlrs.filter(d => { if (d.dead) { d.spr.destroy(); d.shadow.destroy(); d.owner.dlr = false; } return !d.dead; });
  }

  // DIVE BOMB: 3 bombas caem do céu, miradas onde o oponente estava
  spawnBombs(f, op) {
    const target = op.x;
    [-70, 0, 70].forEach((off, i) => {
      const x = Phaser.Math.Clamp(target + off * f.facing, 40, W - 40);
      const spr = this.add.sprite(x, -60, 'bomb', 0).setDepth(25).setScale(1.6).setVisible(false);
      this.bombList.push({ owner: f, x, y: -60, vy: 5, delay: i * 12, spr, t: 0 });
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
      if (bm.y >= FLOOR - 25) {
        bm.dead = true; this.boom(bm.x, FLOOR + 10, 1.5);
        const blast = { x: bm.x - 70, y: FLOOR - 160, w: 140, h: 160 };
        if (def.state !== 'ko' && !(def.inv > 0) && overlap(blast, def.hurtbox())) this.applyHit(bm.owner, def, BOMB, bm.x, FLOOR - 70, true);
      }
    }
    this.bombList = this.bombList.filter(bm => { if (bm.dead) { bm.spr.destroy(); bm.owner.bombs--; } return !bm.dead; });
    for (const bo of this.booms) bo.t++;
    this.booms = this.booms.filter(bo => { if (bo.t >= 20) { bo.spr.destroy(); return false; } return true; });
  }

  boom(x, y, scale) {
    const spr = this.add.sprite(x, y, 'explosion', 0).setDepth(26).setScale(scale).setOrigin(0.5, 0.7);
    this.booms.push({ spr, t: 0 });
    this.cameras.main.shake(100, 0.005);
  }

  spark(x, y, color) {
    const blocked = color === 0x9fc8ff;
    this.addFx(blocked ? 'fx_block' : 'fx_spark', x, y, { rate: 3, scale: blocked ? 0.8 : 1.0 });
  }

  addFx(key, x, y, o = {}) {
    const spr = this.add.sprite(x, y, key, 0).setDepth(35).setScale(o.scale || 1).setFlipX(!!o.flip);
    if (o.oy !== undefined) spr.setOrigin(0.5, o.oy);
    this.fx.push({ spr, x, y, t: 0, n: ANIMS[key], rate: o.rate || 3, vx: o.vx || 0, vy: o.vy || 0 });
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
    this.dark.setAlpha(0.97 * k);
    this.logo.setAlpha(k);
    this.logoGlow.setAlpha(k * (0.35 + 0.35 * Math.sin(w.t / 6)));
    this.p[1 - this.winner].spr.setTint(0x333344);
    // canhões de luz saindo das treliças e mirando o vencedor
    const g = this.beams; g.clear();
    const tx = w.x, ty = FLOOR - 120;
    [[90, 40, 0xffd27a], [300, 30, 0x7ab8ff], [660, 30, 0x7ab8ff], [870, 40, 0xffd27a]].forEach(([lx, ly, c], i) => {
      const sway = Math.sin(w.t / 20 + i) * 12;
      g.fillStyle(c, 0.16 * k);
      g.fillTriangle(lx, ly, tx - 70 + sway, FLOOR + 10, tx + 70 + sway, FLOOR + 10);
      g.fillStyle(0xffffff, 0.5 * k); g.fillCircle(lx, ly, 10);
    });
    g.fillStyle(0xfff2c0, 0.18 * k); g.fillEllipse(tx, FLOOR + 4, 260, 40);
  }

  // gradiente cromado anos 80: céu claro em cima, horizonte escuro no meio, reflexo quente embaixo
  chrome(t, kind = 'steel') {
    const g = t.context.createLinearGradient(0, t.padding.top, 0, (t.height || 100) - t.padding.bottom);
    const stops = kind === 'gold'
      ? [[0, '#fffbe6'], [0.45, '#ffd23c'], [0.5, '#7a3b00'], [0.56, '#c96a00'], [1, '#ffe9a8']]
      : [[0, '#ffffff'], [0.2, '#cfeaff'], [0.48, '#5aa8e6'], [0.5, '#1b1033'], [0.55, '#5a2a6a'], [0.78, '#ff9a5a'], [1, '#fff1c4']];
    for (const [o, c] of stops) g.addColorStop(o, c);
    t.setFill(g);
  }

  makeBanner() {
    const c = this.add.container(W / 2, 488).setDepth(58).setVisible(false);
    this.bnBand = this.add.graphics();
    this.bnName = this.add.text(0, 3, 'X', { fontFamily: FONT_CHROME, fontStyle: 'italic 900', fontSize: '38px', color: '#fff', stroke: '#0a0612', strokeThickness: 5, padding: { x: 16, y: 4 } }).setOrigin(0.5);
    this.bnTag = this.add.text(0, 34, 'x', { fontFamily: FONT_NEON, fontSize: '28px', color: '#fff', padding: { x: 16, y: 8 } }).setOrigin(0.5).setAngle(-4);
    c.add([this.bnBand, this.bnName, this.bnTag]);
    this.banner = c; this.bannerT = 0; this.bannerPow = null;
  }

  announce(key) {
    const pw = POWERS[key]; if (!pw) return;
    this.bannerPow = pw; this.bannerT = 70; this.flashT = 8;
    this.bnName.setText(pw.name); this.chrome(this.bnName);
    this.bnName.setShadow(0, 0, pw.neon, 14, true, false);
    this.bnTag.setText(pw.tag).setStroke(pw.neon, 2).setShadow(0, 0, pw.neon, 10, true, true);
    this.bnTag.x = this.bnName.width * 0.18;
  }

  // faixa inclinada com linhas de velocidade e bordas neon, redesenhada a cada quadro
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
    if (this.flashT > 0) this.flashT--;
  }

  frameFor(f) {
    const loop = (name, ticks) => [name, Math.floor(f.t / ticks) % ANIMS[name]];
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
      case 'attack': { const m = MOVES[f.move], s = f.moveStep(); return [f.move, m.frames ? m.frames[s] : s]; }
      case 'block': return ['block', f.holdDown ? 1 : 0];
      case 'hit': return ['hit', f.spin ? 2 : Math.min(2, Math.floor(f.t / 5))];
      case 'gag': return ['react', GAGS[f.gag.k].frame(f.t)];
      case 'victory': return ['victory', Math.floor(f.t / 6) % 10]; // tapping em loop, pose fixa
      case 'ko': { const d = [8, 10, 10, 12]; let acc = 0, i = 0; while (i < 4 && f.t >= (acc += d[i])) i++; return ['ko', i]; }
    }
    return ['idle', 0];
  }

  render() {
    for (const f of this.p) {
      const [tex, fr] = this.frameFor(f);
      if (f.spr.texture.key !== tex) f.spr.setTexture(tex);
      f.spr.setFrame(Math.min(fr, ANIMS[tex] - 1));
      const oy = f.spin ? 0.55 : AY / FH;
      f.spr.setFlipX(f.facing < 0).setOrigin((f.facing > 0 ? AX : FW - AX) / FW, oy).setRotation(f.spin ? f.rot : 0);
      const sw = 1 + f.stings * 0.06;
      const lift = f.spin ? -(AY - 0.55 * FH) * SC * sw : 0, jit = f.buzz > 0 ? (Math.random() * 10 - 5) : 0;
      f.spr.setScale(sw * SC);
      f.spr.x = Math.round(f.x + jit); f.spr.y = Math.round(FLOOR + f.y + lift);
      f.shadow.x = f.x; f.shadow.setScale(Math.max(0.4, 1 + f.y / 240));
    }
    for (const pr of this.projs) { pr.spr.x = pr.x; pr.spr.setFrame(Math.floor(pr.t / 4) % 4); }
    for (const bm of this.bombList) { bm.spr.y = bm.y; bm.spr.setFrame(Math.floor(bm.t / 5) % 2); }
    for (const bo of this.booms) bo.spr.setFrame(Math.min(3, Math.floor(bo.t / 5)));

    this.renderVictoryLights();
    for (const e of this.fx) e.spr.setFrame(Math.min(e.n - 1, Math.floor(e.t / e.rate)));
    this.drawBanner();
    if (!this.p.some(f => f.move === 'teacher')) this.superDark = Math.max(0, this.superDark - 0.05);
    this.superShade.setAlpha(this.superDark);
    this.flash.setAlpha(this.flashT > 0 ? this.flashT / 8 * 0.6 : 0);

    // caixas de colisão (tecla H)
    this.debug.clear();
    if (this.showBoxes) for (const f of this.p) {
      const hu = f.hurtbox(); this.debug.lineStyle(2, 0x3cf0ff).strokeRect(hu.x, hu.y, hu.w, hu.h);
      let hb = null;
      if (f.state === 'attack' && MOVES[f.move].hit && MOVES[f.move].active.includes(f.moveStep())) hb = f.boxFrom(MOVES[f.move].hit);
      if (f.state === 'air' && f.jk && f.jk.t >= 4 && !f.jk.hit) hb = f.boxFrom(JUMPKICK.hit);
      if (hb) this.debug.lineStyle(2, 0xff3d6e).strokeRect(hb.x, hb.y, hb.w, hb.h);
    }

    // HUD
    const g = this.hud; g.clear();
    const bw = 380, bh = 22, y = 30;
    [[36, this.p[0]], [W - 36 - bw, this.p[1]]].forEach(([x, f], i) => {
      g.fillStyle(0x000000); g.fillRect(x - 3, y - 3, bw + 6, bh + 6);
      g.fillStyle(0xcc2222); g.fillRect(x, y, bw, bh);
      const w = bw * f.hp / MAX_HP;
      g.fillStyle(0xffd23c); g.fillRect(i === 0 ? x + bw - w : x, y, w, bh);
      const mw = 200, mx = i === 0 ? x + bw - mw : x, my = y + bh + 8, full = f.meter >= 100;
      g.fillStyle(0x000000); g.fillRect(mx - 2, my - 2, mw + 4, 12);
      g.fillStyle(full ? (this.tick % 20 < 10 ? 0xff3df0 : 0x3cf0ff) : 0x7a3cff); g.fillRect(i === 0 ? mx + mw - mw * f.meter / 100 : mx, my, mw * f.meter / 100, 8);
      for (let k = 0; k < this.wins[i]; k++) { g.fillStyle(0xffe14a); g.fillCircle(i === 0 ? x + bw - 10 - k * 22 : x + 10 + k * 22, y + bh + 34, 7); }
    });
    this.tTimer.setText(String(Math.max(0, this.timer)).padStart(2, '0'));
    this.tN2.setText(this.p[1].cpu ? 'EDDIE CPU' : 'EDDIE 2P');
    this.tMode.setText(`P: 2P ${this.p[1].cpu ? 'CPU' : 'HUMANO'}   H: CAIXAS DE COLISÃO`);

    let msg = '', sub = '';
    if (this.phase === 'intro') msg = this.phaseT < 60 ? `ROUND ${this.round}` : 'FIGHT!';
    if (this.phase === 'ko') msg = 'K.O.';
    if (this.phase === 'time') msg = 'TIME';
    if ((this.phase === 'ko' || this.phase === 'time') && this.phaseT > 90) {
      msg = this.winner < 0 ? 'EMPATE' : this.winner === 0 ? 'EDDIE VENCE' : 'EDDIE 2P VENCE';
    }
    if (this.phase === 'over') {
      msg = this.wins[0] > this.wins[1] ? 'P1 VENCEU!' : 'P2 VENCEU!'; sub = 'APERTE ENTER PARA JOGAR DE NOVO';
    }
    if (this.tMsg.text !== msg) { this.tMsg.setText(msg); if (msg) this.chrome(this.tMsg); }
    this.tSub.setText(sub);
  }
}

Promise.all(['16px "Press Start 2P"', 'italic 900 40px Kanit', '40px "Mr Dafoe"'].map(f => document.fonts.load(f))).catch(() => {}).finally(() => {
  const game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', width: W, height: H, backgroundColor: '#0b0710',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, fullscreenTarget: 'game' },
    scene: Fight,
  });
  // tela cheia: botão da página ou tecla T
  const toggle = () => { try { game.scale.toggleFullscreen(); } catch (e) { /* navegador recusou */ } };
  document.getElementById('fs')?.addEventListener('click', toggle);
  window.addEventListener('keydown', e => { if (e.code === 'KeyT') toggle(); });
});
