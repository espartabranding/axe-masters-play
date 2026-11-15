// AXE MASTERS: protótipo jogável (Eddie x Eddie)
// Lógica em passo fixo de 60 quadros por segundo; tempos em quadros (ver docs/eddie-ficha.md).

const W = 960, H = 540, FLOOR = 472; // linha do piso do palco
const FW = 460, FH = 300, AX = 220, AY = 290;
const ANIMS = {
  idle: 10, walk_fwd: 10, walk_back: 10, lp: 10, hp: 10, lk: 10, hk: 10, eruption: 4, block: 2, hit: 3, ko: 5,
  jump: 6, crouch: 3, jumpkick: 2, projectile: 4, divebomb: 5, bomb: 2, explosion: 4,
  brownsound: 10, panama: 10, victory: 10, sharkbite: 10, bumblebee: 10, drill: 10,
  fx_bee: 4, fx_drill: 4, fx_smoke: 4,
  fx_spark: 5, fx_block: 5, fx_wave: 5, fx_notes: 5, fx_dust: 5,
};
const MAX_HP = 950, WALK_F = 3.2, WALK_B = 2.6, MIN_GAP = 95, ROUND_TIME = 99;
const JUMP_V = -17, GRAV = 0.85, JUMP_VX = 3.6;

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
  brownsound: { dur: [4, 2, 3, 3, 4, 6, 6, 5, 4, 3], active: [3, 4, 5, 6], dmg: 120, hit: { x: -60, y: -340, w: 200, h: 340 }, hitstun: 26, blockstun: 16, push: 11, shake: 0.01, blast: 3, inv: 10 },
  // SHARK BITE: troca pela Ibanez Destroyer 'Shark' e dá 3 mordidas
  sharkbite: { dur: [3, 5, 4, 3, 2, 6, 6, 6, 4, 3], active: [5, 6, 7], multi: 6, dmg: 40, hit: { x: 10, y: -230, w: 175, h: 160 }, hitstun: 14, blockstun: 8, push: 4, shake: 0.006, smoke: 1, step: [3, 4, 4] },
  // BUMBLEBEE SWARM: troca pela Bumblebee e o acorde solta um enxame de abelhas
  bumblebee: { dur: [3, 5, 4, 3, 2, 8, 6, 5, 4, 3], smoke: 1, swarm: 5 },
  // POUNDCAKE DRILL: Frankenstrat original + furadeira Makita nas cordas
  drill: { dur: [3, 5, 4, 4, 6, 6, 3, 6, 6, 3], active: [4, 5, 6, 7], multi: 4, dmg: 14, hit: { x: 20, y: -205, w: 150, h: 115 }, hitstun: 10, blockstun: 6, push: 2, smoke: 1, step: [5, 7, 6], sparks: [4, 7] },
  // PANAMA: arrancada de Lamborghini com joelhada
  panama: { dur: [4, 4, 3, 3, 4, 4, 5, 5, 4, 3], active: [3, 4, 5], dmg: 110, hit: { x: 10, y: -210, w: 135, h: 160 }, hitstun: 24, blockstun: 14, push: 12, shake: 0.008, dash: [2, 5], dust: 6 },
  divebomb: { dur: [8, 6, 10, 26, 10], bombs: 2 },
};
const JUMPKICK = { dmg: 75, hit: { x: 10, y: -150, w: 120, h: 120 }, hitstun: 18, blockstun: 12, push: 7, overhead: true };
const PROJ = { dmg: 80, hitstun: 18, blockstun: 12, push: 8, chip: 10 };
const BEE = { dmg: 15, hitstun: 12, blockstun: 6, push: 3, chip: 3 };
const BOMB = { dmg: 45, hitstun: 20, blockstun: 12, push: 6, chip: 6, shake: 0.008 };
const HURT = { x: -45, y: -235, w: 90, h: 235 };
const HURT_CROUCH = { x: -50, y: -150, w: 100, h: 150 };

class Fighter {
  constructor(scene, side, cpu) {
    this.scene = scene;
    this.side = side; // 0 = P1, 1 = P2
    this.cpu = cpu;
    this.spr = scene.add.sprite(0, FLOOR, 'idle', 0).setDepth(10);
    if (side === 1) this.spr.setTint(0x9fc8ff);
    this.shadow = scene.add.ellipse(0, FLOOR + 2, 120, 16, 0x000000, 0.35).setDepth(5);
    this.reset();
  }
  reset() {
    this.x = this.side === 0 ? 300 : 660; this.y = 0; this.vy = 0;
    this.facing = this.side === 0 ? 1 : -1;
    this.hp = MAX_HP;
    this.state = 'idle'; this.t = 0; this.stun = 0; this.vx = 0;
    this.move = null; this.hasHit = false; this.buf = []; this.proj = null; this.bombs = 0; this.swarm = 0; this.jk = null;
    this.holdBack = false; this.holdDown = false; this.cpuCD = 0; this.cpuHold = {};
  }
  get free() { return ['idle', 'walk_fwd', 'walk_back', 'crouch'].includes(this.state); }
  get airborne() { return this.y < 0; }
  canBlock() { return this.free || this.state === 'block'; }
  hurtbox() {
    const hb = this.state === 'crouch' || (this.state === 'block' && this.holdDown) ? HURT_CROUCH : HURT;
    return { x: this.x + hb.x, y: FLOOR + this.y + hb.y, w: hb.w, h: hb.h };
  }
  boxFrom(h) {
    const x = this.facing > 0 ? this.x + h.x : this.x - h.x - h.w;
    return { x, y: FLOOR + this.y + h.y, w: h.w, h: h.h };
  }
  moveStep() {
    const d = MOVES[this.move].dur; let acc = 0;
    for (let i = 0; i < d.length; i++) { acc += d[i]; if (this.t < acc) return i; }
    return d.length - 1;
  }
  startMove(name) {
    this.state = 'attack'; this.move = name; this.t = 0; this.hasHit = false; this.vx = 0; this.spawned = false; this.evWave = false; this.evDust = false; this.evRise = false; this.evSmoke = false; this.lastHitT = -99;
  }
}

const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// procura a sequência de direções (notação de teclado numérico) nos últimos 20 quadros
function hasMotion(buf, seq) {
  let k = seq.length - 1;
  for (let i = buf.length - 1; i >= Math.max(0, buf.length - 20); i--) {
    if (buf[i] === seq[k] && --k < 0) return true;
  }
  return false;
}

class Fight extends Phaser.Scene {
  constructor() { super('fight'); }

  preload() {
    this.load.image('stage', 'assets/stages/palco-eddie.jpg');
    for (const n of Object.keys(ANIMS)) this.load.spritesheet(n, `assets/eddie/${n}.png`, { frameWidth: FW, frameHeight: FH });
  }

  create() {
    this.drawStage();
    this.p = [new Fighter(this, 0, false), new Fighter(this, 1, true)];
    this.projs = []; this.bombList = []; this.booms = []; this.fx = []; this.ghosts = []; this.bees = [];
    this.flash = this.add.rectangle(0, 0, W, H, 0xffffff, 0).setOrigin(0).setDepth(55); this.flashT = 0;
    this.sparks = this.add.graphics().setDepth(30);
    this.debug = this.add.graphics().setDepth(40);
    this.showBoxes = false;
    this.hud = this.add.graphics().setDepth(50);
    const f = { fontFamily: '"Press Start 2P", monospace' };
    this.tTimer = this.add.text(W / 2, 30, '99', { ...f, fontSize: '28px', color: '#ffe14a' }).setOrigin(0.5, 0).setDepth(51);
    this.tN1 = this.add.text(36, 58, 'EDDIE', { ...f, fontSize: '14px', color: '#ffffff' }).setDepth(51);
    this.tN2 = this.add.text(W - 36, 58, 'EDDIE 2P', { ...f, fontSize: '14px', color: '#9fc8ff' }).setOrigin(1, 0).setDepth(51);
    this.tMsg = this.add.text(W / 2, 220, '', { ...f, fontSize: '48px', color: '#ffe14a', stroke: '#ff3d6e', strokeThickness: 8 }).setOrigin(0.5).setDepth(60);
    this.tSub = this.add.text(W / 2, 290, '', { ...f, fontSize: '14px', color: '#ffffff' }).setOrigin(0.5).setDepth(60);
    this.tBanner = this.add.text(W / 2, 140, '', { ...f, fontSize: '40px', color: '#ffe14a', stroke: '#c0162f', strokeThickness: 10 }).setOrigin(0.5).setDepth(58); this.bannerT = 0;
    this.tMode = this.add.text(W / 2, H - 22, '', { ...f, fontSize: '10px', color: '#9a8bb3' }).setOrigin(0.5).setDepth(51);

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
    if (op.airborne && d < 230 && r < 0.25) { inp.special = 'brownsound'; inp.hp = true; me.cpuCD = 40; }
    else if (d > 200 && d < 420 && r > 0.93) { inp.special = 'panama'; inp.hk = true; me.cpuCD = 45; }
    else if (d < 200 && r > 0.9) { inp.special = r > 0.95 ? 'sharkbite' : 'drill'; inp[inp.special === 'drill' ? 'hp' : 'hk'] = true; me.cpuCD = 45; }
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
        const gx = w.x + w.facing * 120, gy = FLOOR - 150; // mãos na escala
        this.addFx('fx_notes', gx + Math.random() * 40 - 20, gy + Math.random() * 30 - 15, {
          vx: (Math.random() * 4 - 2) + w.facing * 1.2, vy: -1.5 - Math.random() * 3, rate: 5, scale: 0.35 + Math.random() * 0.5,
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
    this.updateFx();
  }

  updateFighter(f, op, inp) {
    f.t++;
    if (f.inv > 0) f.inv--;
    if (f.free) {
      f.facing = op.x >= f.x ? 1 : -1;
      const punch = inp.lp || inp.hp, kick = inp.lk || inp.hk;
      if (punch && (inp.special === 'brownsound' || hasMotion(f.buf, [2, 5, 2]))) { f.startMove('brownsound'); f.inv = MOVES.brownsound.inv; this.announce('BROWN SOUND!'); }
      else if (kick && (inp.special === 'sharkbite' || hasMotion(f.buf, [2, 1, 4]))) { f.startMove('sharkbite'); this.announce('SHARK BITE!'); }
      else if (kick && !f.swarm && (inp.special === 'bumblebee' || hasMotion(f.buf, [2, 5, 2]))) { f.startMove('bumblebee'); this.announce('BUMBLEBEE!'); }
      else if (punch && (inp.special === 'drill' || hasMotion(f.buf, [6, 5, 6]))) { f.startMove('drill'); this.announce('POUNDCAKE!'); }
      else if (kick && (inp.special === 'panama' || hasMotion(f.buf, [2, 3, 6]))) { f.startMove('panama'); this.announce('PANAMA!'); }
      else if (punch && !f.proj && (inp.special === 'eruption' || hasMotion(f.buf, [2, 3, 6]))) { f.startMove('eruption'); f.projFast = !!inp.hp; this.announce('ERUPTION!'); }
      else if (punch && !f.bombs && (inp.special === 'divebomb' || hasMotion(f.buf, [2, 1, 4]))) { f.startMove('divebomb'); f.bombTarget = op.x; this.announce('DIVE BOMB!'); }
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
      if (m.wave !== undefined && st === m.wave && !f.evWave) { f.evWave = true; this.addFx('fx_wave', f.x + f.facing * 135, FLOOR - 195, { vx: f.facing * 3, flip: f.facing < 0, rate: 3, scale: 0.8 }); }
      if (m.dust !== undefined && st === m.dust && !f.evDust) { f.evDust = true; this.addFx('fx_dust', f.x, FLOOR, { rate: 4, oy: 0.75 }); }
      if (m.blast !== undefined && st >= m.blast && !f.evRise) { f.evRise = true; this.boom(f.x, FLOOR + 10, 1.3); this.addFx('fx_dust', f.x - 70, FLOOR, { rate: 4, oy: 0.75 }); this.addFx('fx_dust', f.x + 70, FLOOR, { rate: 4, oy: 0.75, flip: true }); }
      if (m.smoke !== undefined && st === m.smoke && !f.evSmoke) { f.evSmoke = true; this.addFx('fx_smoke', f.x - f.facing * 40, FLOOR - 120, { rate: 4 }); }
      if (m.step) { if (st >= m.step[0] && st <= m.step[1]) f.vx = f.facing * m.step[2]; else f.vx = 0; }
      if (m.sparks && st >= m.sparks[0] && st <= m.sparks[1] && f.t % 3 === 0) this.addFx('fx_drill', f.x + f.facing * 70, FLOOR - 150, { rate: 2, scale: 0.8 });
      if (m.swarm !== undefined && st >= m.swarm && !f.spawned) { f.spawned = true; this.spawnSwarm(f); }
      if (m.dash) { if (st >= m.dash[0] && st <= m.dash[1]) f.vx = f.facing * 12; else if (st > m.dash[1]) f.vx *= 0.8; }
      if (['eruption', 'divebomb', 'brownsound', 'panama', 'sharkbite', 'drill'].includes(f.move) && f.t < 24 && f.t % 3 === 0) this.ghost(f);
      if (f.t >= m.dur.reduce((s, v) => s + v, 0)) { f.state = f.airborne ? 'air' : 'idle'; f.t = 0; f.move = null; f.jk = null; }
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
        if (f.state === 'air') { f.state = 'land'; f.t = 0; f.vx = 0; f.jk = null; this.addFx('fx_dust', f.x, FLOOR, { rate: 4, oy: 0.75 }); }
      }
    }
    f.x = Phaser.Math.Clamp(f.x + f.vx, 60, W - 60);
  }

  separate(a, b) {
    if (a.state === 'ko' || b.state === 'ko' || a.y < -120 || b.y < -120) return;
    const d = b.x - a.x;
    if (Math.abs(d) < MIN_GAP) {
      const push = (MIN_GAP - Math.abs(d)) / 2 * (d >= 0 ? 1 : -1);
      a.x = Phaser.Math.Clamp(a.x - push, 60, W - 60);
      b.x = Phaser.Math.Clamp(b.x + push, 60, W - 60);
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
    this.spark(sx, sy, 0xffe14a);
    if (m.shake) this.cameras.main.shake(120, m.shake);
    if (m.dmg >= 75) this.addFx('fx_notes', def.x, FLOOR + def.y - 250, { vy: -1.2, rate: 5, scale: 0.9 });
    if (def.hp <= 0) {
      def.hp = 0; def.state = 'ko'; def.t = 0; def.vx = away * 7;
      this.slow = 90; this.cameras.main.shake(250, 0.01);
      this.endRound(att.side, 'KO');
    } else {
      def.state = 'hit'; def.stun = m.hitstun; def.vx = away * m.push; def.t = 0;
      if (def.airborne) def.vy = Math.min(def.vy, -4);
      this.hitstop = isProj ? 5 : m.dmg > 60 ? 9 : 6;
    }
  }

  endRound(winner, why) {
    if (this.phase !== 'fight') return;
    if (winner >= 0) this.wins[winner]++;
    this.phase = why === 'KO' ? 'ko' : 'time'; this.phaseT = 0; this.winner = winner;
  }

  spawnProjectile(f) {
    const x = f.x + f.facing * 125, y = FLOOR - 145;
    const spr = this.add.sprite(x, y, 'projectile', 0).setDepth(20).setFlipX(f.facing < 0).setScale(1.35);
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
      const x = f.x + f.facing * 110, y = FLOOR - 170 + (i - 2.5) * 14;
      const spr = this.add.sprite(x, y, 'fx_bee', 0).setDepth(24).setScale(0.55).setFlipX(f.facing < 0);
      this.bees.push({ owner: f, x, y, vx: f.facing * (4 + Math.random() * 2), vy: (Math.random() - 0.5) * 3, t: 0, ph: Math.random() * 6, spr });
    }
    f.swarm = 6;
  }

  updateBees() {
    for (const b of this.bees) {
      b.t++;
      const def = this.p[1 - b.owner.side];
      const tx = def.x, ty = FLOOR + def.y - 150;
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
        if (def.state !== 'ko' && overlap(blast, def.hurtbox())) this.applyHit(bm.owner, def, BOMB, bm.x, FLOOR - 70, true);
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
      .setOrigin(f.spr.originX, f.spr.originY).setFlipX(f.spr.flipX).setDepth(9).setTint(0xff4fd8).setAlpha(0.55);
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

  announce(text) { this.tBanner.setText(text); this.bannerT = 60; this.flashT = 8; }

  updateFx() {
    for (const e of this.fx) { e.t++; e.x += e.vx; e.y += e.vy; e.spr.setPosition(e.x, e.y); }
    this.fx = this.fx.filter(e => { if (e.t >= e.n * e.rate) { e.spr.destroy(); return false; } return true; });
    for (const g of this.ghosts) { g.t++; g.spr.setAlpha(0.55 * (1 - g.t / 16)); }
    this.ghosts = this.ghosts.filter(g => { if (g.t >= 16) { g.spr.destroy(); return false; } return true; });
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
      case 'hit': return ['hit', Math.min(2, Math.floor(f.t / 5))];
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
      f.spr.setFlipX(f.facing < 0).setOrigin((f.facing > 0 ? AX : FW - AX) / FW, AY / FH);
      const lift = 0;
      f.spr.x = Math.round(f.x); f.spr.y = Math.round(FLOOR + f.y + lift);
      f.shadow.x = f.x; f.shadow.setScale(Math.max(0.4, 1 + f.y / 300));
    }
    for (const pr of this.projs) { pr.spr.x = pr.x; pr.spr.setFrame(Math.floor(pr.t / 4) % 4); }
    for (const bm of this.bombList) { bm.spr.y = bm.y; bm.spr.setFrame(Math.floor(bm.t / 5) % 2); }
    for (const bo of this.booms) bo.spr.setFrame(Math.min(3, Math.floor(bo.t / 5)));

    this.renderVictoryLights();
    for (const e of this.fx) e.spr.setFrame(Math.min(e.n - 1, Math.floor(e.t / e.rate)));
    const bt = this.bannerT;
    this.tBanner.setVisible(bt > 0).setScale(bt > 52 ? 1 + (bt - 52) * 0.12 : 1).setAlpha(bt < 10 ? bt / 10 : 1);
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
      for (let k = 0; k < this.wins[i]; k++) { g.fillStyle(0xffe14a); g.fillCircle(i === 0 ? x + bw - 10 - k * 22 : x + 10 + k * 22, y + bh + 22, 7); }
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
    this.tMsg.setText(msg); this.tSub.setText(sub);
  }
}

document.fonts.load('16px "Press Start 2P"').catch(() => {}).finally(() => {
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
