'use strict';
/* ============================================================
   GABBAI! — game engine
   ============================================================ */

// ---------- utilities ----------
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const $ = id => document.getElementById(id);
const fmtTime = s => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
function el(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    if (k === 'onclick') e.addEventListener('click', attrs[k]);
    else if (k === 'class') e.className = attrs[k];
    else if (k === 'html') e.innerHTML = attrs[k];
    else if (k === 'disabled') e.disabled = !!attrs[k];
    else e.setAttribute(k, attrs[k]);
  }
  for (const k of kids) if (k != null) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
}

// ---------- map ----------
const W = 960, H = 720, CELL = 20, COLS = W / CELL, ROWS = H / CELL;
const ROW_Y = [170, 235, 300, 365, 430, 495, 560];
const BLOCK_X = [70, 640], PEW_W = 240, SEAT_DX = 48, SEATS_PER = 5;
const PLACES = {
  bimah: { x: 410, y: 268, w: 140, h: 134, spot: { x: 528, y: 382 }, label: 'Bimah' },
  aron:  { x: 420, y: 6, w: 120, h: 70, spot: { x: 480, y: 102 }, label: 'Aron Kodesh' },
  amud:  { x: 372, y: 92, w: 36, h: 30, spot: { x: 390, y: 146 }, label: 'Amud' },
  shelf: { x: 36, y: 652, w: 140, h: 48, spot: { x: 106, y: 632 }, label: 'Bookshelf' },
  rack:  { x: 736, y: 652, w: 130, h: 48, spot: { x: 800, y: 632 }, label: 'Tallit Rack' },
  door:  { x: 440, y: 700, w: 80, h: 20, spot: { x: 480, y: 686 }, label: 'Door' },
};
const TABLE = { x: 446, y: 300, w: 68, h: 42 };
const SPOT = {
  baalKoreh: { x: 480, y: 360 }, oleh: { x: 452, y: 362 }, bimahG: { x: 528, y: 382 },
  chazan: { x: 390, y: 142 }, aronFront: { x: 480, y: 102 }, door: { x: 480, y: 690 },
  doorGuy: { x: 540, y: 676 }, rabbiSeat: { x: 610, y: 112 }, speech: { x: 480, y: 138 },
};
const SEATS = [];
for (let r = 0; r < ROW_Y.length; r++) for (let b = 0; b < 2; b++) for (let i = 0; i < SEATS_PER; i++)
  SEATS.push({ x: BLOCK_X[b] + 24 + i * SEAT_DX, y: ROW_Y[r], row: r, block: b, idx: i, taken: null });

const grid = new Uint8Array(COLS * ROWS);
function blockRect(x, y, w, h) {
  const c0 = Math.max(0, Math.floor(x / CELL)), c1 = Math.min(COLS - 1, Math.floor((x + w - 1) / CELL));
  const r0 = Math.max(0, Math.floor(y / CELL)), r1 = Math.min(ROWS - 1, Math.floor((y + h - 1) / CELL));
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) grid[r * COLS + c] = 1;
}
(function buildGrid() {
  blockRect(0, 0, W, 50);          // top wall
  blockRect(0, 0, 30, H);          // left wall
  blockRect(900, 0, 60, H);        // ezrat nashim lattice
  blockRect(0, 700, 440, 20); blockRect(520, 700, 440, 20); // bottom wall w/ door
  blockRect(PLACES.aron.x, 0, PLACES.aron.w, PLACES.aron.y + PLACES.aron.h);
  blockRect(PLACES.amud.x, PLACES.amud.y, PLACES.amud.w, PLACES.amud.h);
  blockRect(PLACES.shelf.x, PLACES.shelf.y, PLACES.shelf.w, PLACES.shelf.h);
  blockRect(PLACES.rack.x, PLACES.rack.y, PLACES.rack.w, PLACES.rack.h);
  blockRect(TABLE.x, TABLE.y, TABLE.w, TABLE.h);
  for (const ry of ROW_Y) for (const bx of BLOCK_X) blockRect(bx, ry - 8, PEW_W, 28);
})();
const free = (c, r) => c >= 0 && r >= 0 && c < COLS && r < ROWS && !grid[r * COLS + c];
const toCell = p => ({ c: clamp(Math.floor(p.x / CELL), 0, COLS - 1), r: clamp(Math.floor(p.y / CELL), 0, ROWS - 1) });
const cellCenter = (c, r) => ({ x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 });
function nearestFree(cell) {
  if (free(cell.c, cell.r)) return cell;
  const seen = new Set([cell.r * COLS + cell.c]); const q = [cell];
  while (q.length) {
    const cur = q.shift();
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const n = { c: cur.c + dc, r: cur.r + dr };
      if (n.c < 0 || n.r < 0 || n.c >= COLS || n.r >= ROWS) continue;
      const k = n.r * COLS + n.c; if (seen.has(k)) continue; seen.add(k);
      if (free(n.c, n.r)) return n; q.push(n);
    }
  }
  return cell;
}
function lineFree(a, b) {
  const d = dist(a, b), n = Math.ceil(d / 6);
  for (let i = 1; i < n; i++) {
    const t = i / n, c = toCell({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    if (!free(c.c, c.r)) return false;
  }
  return true;
}
/* A* on the grid. If exact, the final point is the exact target (used to step into a pew seat). */
function findPath(from, to, exact) {
  const s = nearestFree(toCell(from)), t = nearestFree(toCell(to));
  const key = (c, r) => r * COLS + c;
  const g = new Map(), came = new Map(), open = [{ c: s.c, r: s.r, f: 0 }];
  g.set(key(s.c, s.r), 0);
  const hfn = (c, r) => Math.hypot(c - t.c, r - t.r);
  let found = s.c === t.c && s.r === t.r, guard = 0;
  while (open.length && !found && guard++ < 4000) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const cur = open.splice(bi, 1)[0];
    if (cur.c === t.c && cur.r === t.r) { found = true; break; }
    const cg = g.get(key(cur.c, cur.r));
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const nc = cur.c + dc, nr = cur.r + dr;
      if (!free(nc, nr)) continue;
      if (dc && dr && (!free(cur.c + dc, cur.r) || !free(cur.c, cur.r + dr))) continue;
      const ng = cg + (dc && dr ? 1.414 : 1), k = key(nc, nr);
      if (!g.has(k) || ng < g.get(k)) { g.set(k, ng); came.set(k, key(cur.c, cur.r)); open.push({ c: nc, r: nr, f: ng + hfn(nc, nr) }); }
    }
  }
  const cells = [];
  let k = key(t.c, t.r);
  if (came.has(k) || (s.c === t.c && s.r === t.r)) {
    while (k !== undefined) { cells.unshift({ c: k % COLS, r: Math.floor(k / COLS) }); k = came.get(k); }
  } else cells.push(t);
  let pts = cells.map(c => cellCenter(c.c, c.r));
  // string-pull smoothing
  const out = []; let anchor = { x: from.x, y: from.y }, i = 0;
  while (i < pts.length) {
    let j = pts.length - 1;
    while (j > i && !lineFree(anchor, pts[j])) j--;
    out.push(pts[j]); anchor = pts[j]; i = j + 1;
  }
  if (exact) out.push({ x: to.x, y: to.y });
  else if (free(toCell(to).c, toCell(to).r) && lineFree(out[out.length - 1] || from, to)) out.push({ x: to.x, y: to.y });
  return out;
}

// ---------- audio ----------
const Sound = {
  ctx: null, muted: false,
  init() { if (!this.ctx) try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } },
  tone(f, d, type = 'sine', v = 0.12, delay = 0) {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + d);
  },
  good() { this.tone(660, .12); this.tone(880, .18, 'sine', .12, .09); },
  bad() { this.tone(180, .3, 'sawtooth', .08); },
  click() { this.tone(520, .05, 'triangle', .06); },
  pop() { this.tone(900, .07, 'triangle', .07); },
  candy() { for (let i = 0; i < 6; i++) this.tone(600 + i * 120, .12, 'square', .04, i * .05); },
  alert() { this.tone(740, .1, 'square', .05); this.tone(740, .1, 'square', .05, .15); },
};

// ---------- global state ----------
let G = null;               // current game
let ui = { screen: 'menu', hover: null, mouse: { x: 0, y: 0 }, popup: null, popupDirty: false };
const canvas = $('shul'), ctx = canvas.getContext('2d');

let progress = { unlocked: 1, stars: {}, pace: 0, maxPace: 0 };
try { const p = JSON.parse(localStorage.getItem('gabbai.progress')); if (p && p.unlocked) progress = Object.assign(progress, p); } catch (e) { }
progress.pace = clamp(progress.pace | 0, 0, PACES.length - 1); progress.maxPace = clamp(Math.max(progress.maxPace | 0, progress.pace), 0, PACES.length - 1);

/* A little chazan in a tallit, for the Chazan Speed scale. */
function chazanSvg(on, size = 22) {
  const c = on ? '#1f3a68' : '#c9b991', t = on ? '#fff' : '#efe6cf', sk = on ? '#f1c9a5' : '#e6dcc2';
  return `<svg width="${size}" height="${size * 1.2}" viewBox="0 0 20 24" aria-hidden="true"><path d="M3 23 Q3 12 10 12 Q17 12 17 23Z" fill="${t}" stroke="${c}" stroke-width="1.2"/><rect x="3.6" y="17" width="12.8" height="1.4" fill="${c}"/><rect x="3.4" y="19.6" width="13.2" height="1" fill="${c}"/><circle cx="10" cy="7.5" r="4.2" fill="${sk}" stroke="${c}" stroke-width=".8"/><path d="M6.2 6.2 A4 4 0 0 1 13.8 6.2Z" fill="${c}"/><path d="M6.6 9 Q10 14.5 13.4 9" fill="${c}" opacity=".85"/></svg>`;
}
function chazanScale(n, size) { let h = ''; for (let i = 1; i <= PACES.length; i++) h += chazanSvg(i <= n, size); return h; }
function saveProgress() { try { localStorage.setItem('gabbai.progress', JSON.stringify(progress)); } catch (e) { } }

// ---------- people ----------
let NEXT_ID = 1;
function makePerson(spec, usedNames) {
  const kid = !!spec.kid;
  let first, last, tries = 0;
  do {
    first = spec.first || (kid ? pick(KID_NAMES) : pick(FIRST_NAMES));
    last = spec.last || (spec.tribe === 'kohen' ? pick(KOHEN_LAST) : spec.tribe === 'levi' ? pick(LEVI_LAST) : pick(YIS_LAST));
    tries++;
  } while (usedNames.has(first + ' ' + last) && tries < 40);
  usedNames.add(first + ' ' + last);
  const tags = new Set(spec.tags || []);
  if (kid) tags.add('kid');
  const tribe = spec.tribe || 'yisrael';
  const p = {
    id: NEXT_ID++, first, last, tribe, tags, kid, bm: !!spec.bm,
    name: (tags.has('rabbi') ? 'Rabbi ' : kid || first.startsWith('Zaidy') ? '' : 'Reb ') + first + ' ' + last,
    wants: (spec.wants || []).map(w => ({ w, done: false })),
    arriveAt: spec.arriveAt != null ? spec.arriveAt : (spec.arrive ? rand(spec.arrive[0], spec.arrive[1]) : 0),
    door: !!spec.door, rabbi: !!spec.rabbi,
    x: SPOT.door.x, y: SPOT.door.y + 30, path: [], speed: kid ? 120 : 95, onArrive: null,
    state: 'offstage', seat: null, req: null, honors: [], hasTallit: true,
    hat: !kid && Math.random() < 0.35, skin: pick(['#f1c9a5', '#e8b88f', '#d9a27a', '#c68b62', '#f5d2b3']),
    beard: tags.has('elderly') ? '#ddd' : (!kid && !spec.bm && Math.random() < 0.55 ? pick(['#3b2a1a', '#5a3d22', '#222', '#7a5a3a', '#999']) : null),
    shirt: pick(['#3b5b92', '#7a3b3b', '#3b7a52', '#7a6a3b', '#5b3b7a', '#2f6f7a']),
    bob: Math.random() * 6.28, mood: 0,
  };
  return p;
}
function present(p) { return p && !['offstage', 'gone', 'leaving', 'door'].includes(p.state); }
function adultsPresent() { return G.people.filter(p => present(p) && !p.kid); }
function isAdult(p) { return !p.kid; }
function chiyuvRank(p) {
  if (p.tags.has('chatan')) return 5; if (p.tags.has('barmitzvah')) return 4; if (p.tags.has('newFather')) return 3;
  if (p.tags.has('yahrzeit')) return 2; if (p.tags.has('family') || p.tags.has('guest')) return 1; return 0;
}
function walkTo(p, target, exact, onArrive) {
  p.path = findPath(p, target, exact); p.onArrive = onArrive || null;
}
function sendToSeat(p) {
  if (!p.seat) p.seat = freeSeat(p);
  p.state = 'walking';
  walkTo(p, p.seat, true, () => { p.state = 'seated'; p.x = p.seat.x; p.y = p.seat.y; });
}
function freeSeat(p, prefer) {
  let cands = SEATS.filter(s => !s.taken);
  if (!cands.length) return { x: 330, y: 620 };
  let s;
  if (prefer) s = cands.sort((a, b) => dist(a, prefer) - dist(b, prefer))[0];
  else s = pick(cands);
  s.taken = p.id; return s;
}

// ---------- game creation ----------
function newGame(levelIdx) {
  const L = LEVELS[levelIdx];
  NEXT_ID = 1;
  SEATS.forEach(s => s.taken = null);
  const used = new Set();
  const people = [];
  for (const spec of L.cast) {
    const n = spec.n || 1;
    for (let i = 0; i < n; i++) people.push(makePerson(spec, used));
  }
  // seating: rabbi gets front special seat; family near each other; kids near random adult
  const familySeatRow = 1;
  for (const p of people) {
    if (p.rabbi) { p.seat = { x: SPOT.rabbiSeat.x, y: SPOT.rabbiSeat.y, special: true }; continue; }
    if (p.door) continue;
    if (p.tags.has('family')) {
      const s = SEATS.find(s => !s.taken && s.row === familySeatRow && s.block === 0) || SEATS.find(s => !s.taken && s.row <= 2);
      if (s) { s.taken = p.id; p.seat = s; continue; }
    }
  }
  for (const p of people) if (!p.seat && !p.door) p.seat = freeSeat(p);
  const speed = L.speed * PACES[progress.pace].mult;
  for (const p of people) p.arriveAt /= Math.pow(speed, 0.6);

  const slots = L.slots.map(id => ({ id, ...SLOT_DEFS[id], label: (L.slotLabels && L.slotLabels[id]) || SLOT_DEFS[id].label, assignee: null, done: false, doneBy: null, assignedAtStage: -1 }));

  G = {
    L, levelIdx, speed, pace: progress.pace, people, slots, stages: L.stages.map(st => ({ ...st })), t: 0, stageIdx: -1, stage: null, stageT: 0, waiting: false, waitT: 0,
    shalom: 75, score: 0, errors: [], praise: [], log: [], reqHandled: 0, reqMissed: 0,
    gabbai: { x: 520, y: 160, path: [], speed: 235, target: null, carrying: null, repathT: 0, bob: 0 },
    reqTimer: 6, misheberach: [], misheberachSaid: 0, announcements: [], hosafot: 0,
    reading: null, torahsOnBimah: 0, candy: null, mistake: null, pasul: null, wrongSpot: null,
    scheduled: L.scheduled.map(s => ({ ...s, fired: false, tries: 0 })),
    particles: [], floaters: [], timers: [], tipsShown: new Set(), over: false, paused: false,
    parTime: 0, extraNpcs: [],
  };
  let par = 0;
  for (const st of L.stages) par += st.type === 'reading' ? st.calls.length * 11 : st.dur;
  G.parTime = par / Math.pow(speed, 0.6) + 30;
  // door guy for minyan
  const dg = people.find(p => p.door);
  if (dg) { dg.state = 'door'; dg.x = SPOT.doorGuy.x; dg.y = SPOT.doorGuy.y; dg.req = mkReq('minyan'); }
  startStage(0);
  return G;
}

// ---------- slots / honors ----------
function slotById(id) { return G.slots.find(s => s.id === id); }
function personById(id) { return G.people.find(p => p.id === id); }
function slotsOf(p) { return G.slots.filter(s => s.assignee === p.id); }
const ALIYAH_KINDS = ['aliyah', 'maftir'];

/* Returns an error string if giving this slot to p breaks halacha / common sense, else null. */
/* Who was in shul when this slot's oleh was called up (SA 135:6: a Kohen who walks in after the
   bimkom-Kohen has started his bracha doesn't stop him). Falls back to "right now". */
/* The label shown for a slot, which changes when there's no Kohen (or no Levi) in shul. */
function slotLabel(s) {
  if (!s || !G) return s ? s.label : '';
  if (s.id === 'kohen' && !firstAliyahIsKohen()) return 'Rishon (bimkom Kohen)';
  if (s.id === 'levi') {
    if (!firstAliyahIsKohen()) return 'Sheni (Yisrael, no Levi)';
    if (!presence(s).leviim.length) return 'Levi (same Kohen again)';
  }
  return s.label;
}
function presence(slot) {
  if (slot && slot.callCtx) return slot.callCtx;
  const a = adultsPresent();
  return { kohanim: a.filter(x => x.tribe === 'kohen'), leviim: a.filter(x => x.tribe === 'levi') };
}
/* Did the first aliyah go (or is it going) to a real Kohen? If not, "nitparda hachavila". */
function firstAliyahIsKohen() {
  const k = slotById('kohen'); if (!k) return true;
  if (k.done) { const f = personById(k.doneBy); return !!f && f.tribe === 'kohen'; }
  return presence(k).kohanim.length > 0;
}
/* Returns an error string if giving this slot to p breaks halacha / common sense, else null. */
function validate(slot, p) {
  const { kohanim, leviim } = presence(slot);
  if (p.kid && !['gelilah', 'petichah'].includes(slot.kind))
    return `${p.first} is under bar mitzvah. Kids can't get an aliyah, hagbah or lead davening (gelilah or petichah is perfect for a kid!).`;
  switch (slot.rule) {
    case 'chazan':
      if (!p.tags.has('canLead')) return `${p.name} doesn't know the nusach. The davening was painful. Pick someone marked 🎤 "Can lead".`;
      break;
    case 'kohen':
      if (p.tribe !== 'kohen' && kohanim.length) return `There's a Kohen in shul (${kohanim[0].name}). The first aliyah must go to a Kohen.`;
      break; // no Kohen: a Yisrael (or, per the Rema, a Levi) is called "bimkom Kohen"
    case 'levi': {
      const k = slotById('kohen');
      if (!firstAliyahIsKohen()) {
        // SA OC 135:6: with no Kohen, a Yisrael goes up in his place, "v'lo ya'aleh acharav Levi"
        if (p.tribe === 'levi') return `There was no Kohen, so the first aliyah went to someone bimkom Kohen. Halacha (Shulchan Arukh 135:6): a Levi may NOT go up right after him, or people will think the first one was a Kohen. Give the second aliyah to a Yisrael.`;
        if (p.tribe === 'kohen') return `A Kohen who arrived late can't take the second aliyah. With no Kohen at the start, the second aliyah goes to a Yisrael.`;
        break;
      }
      if (p.tribe === 'levi') break;
      if (leviim.length) return `There's a Levi in shul (${leviim[0].name}). The second aliyah belongs to a Levi.`;
      const kohenOleh = k && (k.done ? k.doneBy : k.assignee);
      if (p.id !== kohenOleh) return `No Levi present: halacha (Shulchan Arukh 135:8) says the SAME Kohen who got the first aliyah takes the Levi aliyah too, not a different Kohen or a Yisrael.`;
      break;
    }
    case 'yisrael':
      if (p.tribe === 'kohen') return `A Kohen can't get ${slot.label}. Kohanim get the first aliyah, or Maftir / a hosafa.`;
      if (p.tribe === 'levi') return `A Levi can't get ${slot.label}. Leviim get the second aliyah, or Maftir / a hosafa.`;
      break;
    case 'hagbah':
      if (p.tags.has('elderly')) return `The Torah wobbled dangerously! ${p.name} is too frail for hagbah. Give it to someone with strong arms.`;
      if (p.tags.has('badBack')) return `${p.name} TOLD you his back was killing him! He did hagbah anyway, groaning, and he's very hurt you didn't listen.`;
      break;
  }
  if (ALIYAH_KINDS.includes(slot.kind) || slot.hosafa) {
    const had = G.slots.filter(s => s !== slot && s.done && s.doneBy === p.id && (ALIYAH_KINDS.includes(s.kind) || s.hosafa));
    const leviException = slot.rule === 'levi' && p.tribe === 'kohen' && had.length === 1 && had[0].id === 'kohen';
    if (had.length && !leviException) return `${p.name} already had an aliyah today (${had[0].label}). One aliyah per person.`;
  }
  return null;
}
function wantMatches(w, slot) {
  if (w === 'honor') return true;
  if (w === 'amud') return slot.kind === 'chazan';
  if (w === 'aliyah') return ALIYAH_KINDS.includes(slot.kind) || !!slot.hosafa;
  if (w === 'maftir') return slot.kind === 'maftir';
  if (w === 'kohen') return slot.id === 'kohen';
  return false;
}
function assign(slot, p) {
  if (slot.done) return;
  // A person usually gets one honor at a time, but allow multiples (e.g. Kohen + Levi).
  slot.assignee = p.id; slot.assignedAtStage = G.stageIdx; slot.assignedAtHotzaah = G.stage && (G.stage.type === 'hotzaah' || stageIndexOfType('hotzaah') < G.stageIdx);
  Sound.click();
  toast(`📋 ${p.name} → ${slot.label}`, '');
  // chazan for a stage we're waiting on: send him over
  if (G.stage && G.stage.leader === slot.id && G.stage.type === 'prayer') moveLeaderToAmud();
  if (G.L.hints && slot.id === 'kohen') tip('kohenTip', 'Nice. Remember: Levi goes to a Levi (blue L badge), and the Yisrael aliyot to everyone else.');
  ui.popupDirty = true;
}
function unassign(slot) { if (slot.done) return; slot.assignee = null; ui.popupDirty = true; }
function stageIndexOfType(type) { return G.stages.findIndex(s => s.type === type); }

function performHonor(slot, p) {
  slot.done = true; slot.doneBy = p.id; slot.assignee = p.id;
  p.honors.push(slot.id);
  const err = validate(slot, p);
  if (err) { penalty(10, err, p); return false; }
  let fulfilled = false;
  for (const w of p.wants) if (!w.done && wantMatches(w.w, slot)) {
    w.done = true; fulfilled = true;
    const icon = p.tags.has('chatan') ? '💍' : p.tags.has('barmitzvah') ? '🎉' : p.tags.has('yahrzeit') ? '🕯️' : p.tags.has('newFather') ? '👶' : p.tags.has('guest') ? '🧳' : '😊';
    reward(6, 100, `${icon} ${p.name} got what he hoped for: ${slot.label}!`, p);
    break;
  }
  if (slot.hosafa && !fulfilled) penalty(4, `An extra aliyah for ${p.name}, who didn't need one. The kiddush herring is getting warm…`, null, true);
  else if (!fulfilled) reward(3, 40, null, p);
  return true;
}

// ---------- scoring ----------
function reward(sh, pts, msg, p) {
  G.shalom = clamp(G.shalom + sh, 0, 100); G.score += pts;
  if (msg) { toast(msg, 'good'); G.praise.push(msg); Sound.good(); }
  if (p) floater(p.x, p.y - 30, `+${pts}`, '#2e7d32');
}
function penalty(sh, msg, p, soft) {
  G.shalom = clamp(G.shalom - sh, 0, 100); G.score -= sh * 5;
  if (msg) { toast((soft ? '😬 ' : '❌ ') + msg, 'bad'); if (!soft) G.errors.push(msg); else G.log.push(msg); Sound.bad(); }
  if (p) floater(p.x, p.y - 30, `-${sh}`, '#b3261e');
}
function floater(x, y, text, color) { G.floaters.push({ x, y, text, color, t: 1.4 }); }

// ---------- requests ----------
function patience(type) { return REQ_DEFS[type].base / spd(0.4); }
function mkReq(type, data) { const m = patience(type); return { type, t: m, max: m, data: data || {} }; }
function canTakeReq(p) { return present(p) && !p.req && p.state === 'seated' && !p.busy; }

function spawnRandomRequest() {
  const st = G.stage; if (!st) return;
  const types = { ...G.L.events.types };
  const readingIdx = stageIndexOfType('reading');
  const lateInReading = st.type === 'reading' && G.reading && G.reading.idx > G.reading.calls.length - 3;
  if (G.stageIdx > readingIdx || lateInReading) { delete types.misheberach; delete types.chiyuv; }
  const entries = Object.entries(types); if (!entries.length) return;
  const total = entries.reduce((a, [, w]) => a + w, 0);
  let r = Math.random() * total, type = entries[0][0];
  for (const [k, w] of entries) { r -= w; if (r <= 0) { type = k; break; } }
  const cands = G.people.filter(p => canTakeReq(p) && !p.kid && !p.rabbi);
  if (!cands.length) return;
  if (type === 'chiyuv') {
    const plain = cands.filter(p => !p.wants.length && chiyuvRank(p) === 0 && !p.honors.length && !p.tags.has('badBack') && !p.tags.has('elderly'));
    if (!plain.length) return;
    const p = pick(plain);
    const chazanOpen = G.slots.some(s => s.kind === 'chazan' && !s.done);
    const options = CHIYUV_NEWS.filter(n => !(n.weekdayOnly && G.L.shabbat) && !(n.want === 'amud' && !chazanOpen) && !(n.tag === 'guest' && p.tags.has('guest')));
    const news = pick(options);
    p.tags.add(news.tag);
    if (news.want) p.wants.push({ w: news.want, done: false });
    p.req = mkReq('chiyuv', { news });
    toast(`🙋 ${p.name} is waving you over. He has news!`, '');
    if (G.L.hints) tip('chiyuv', '🙋 Someone has news for the gabbai: a yahrzeit, a new baby, a bad back… Walk over and listen. It may change who should get which honor!');
    return;
  }
  const p = pick(cands);
  p.req = mkReq(type);
  if (type === 'misheberach' && G.L.hints) tip('mish', '🙏 A Mi Shebeirach request. Walk over and add the name before the Torah reading ends.');
}
function resolveReq(p, ok) {
  const r = p.req; if (!r) return;
  const def = REQ_DEFS[r.type];
  p.req = null;
  if (ok) {
    G.reqHandled++;
    reward(2, 30, null, p); Sound.pop();
  } else {
    G.reqMissed++;
    const msgs = {
      chiyuv: `${p.name} waved and waved, but the gabbai never came over. He feels ignored.`,
      misheberach: `${p.name}'s mother was left out of the Mi Shebeirach.`,
      kiddush: `The kiddush sponsor wasn't thanked. He is VERY upset.`,
      seat: `The makom kavua fight escalated. Two grown men, one seat, no shalom.`,
      candy: `Candy flew too early! The bar mitzvah boy got pelted mid-bracha.`,
    };
    penalty(r.type === 'kiddush' ? 8 : r.type === 'candy' ? 8 : 4, msgs[r.type] || 'A request expired.', p, r.type !== 'candy' && r.type !== 'kiddush');
    if (r.type === 'seat') { const g = personById(r.data.guest); p.seat = freeSeat(p); sendToSeat(p); }
    if (r.type === 'candy' && G.candy) G.candy.spoiled = true;
  }
  if (r.type === 'leaving' && !ok) { }
  ui.popupDirty = true;
}
function doRequestAction(p) {
  const r = p.req; if (!r) return;
  const def = REQ_DEFS[r.type];
  if (r.type === 'misheberach') G.misheberach.push(p.name);
  if (r.type === 'kiddush') G.announcements.push(`Kiddush sponsored by the ${p.last} family`);
  if (r.type === 'minyan') {
    p.req = null; p.door = false; sendToSeat(p);
    reward(4, 80, `🔟 ${p.name} stays. We have a minyan!`, p);
    ui.popupDirty = true; return;
  }
  if (r.type === 'seat') {
    const guest = personById(r.data.guest);
    if (guest) {
      const oldSeat = guest.seat;
      guest.seat = freeSeat(guest); sendToSeat(guest);
      if (guest.req && guest.req.type === 'seat') guest.req = null;
      const regular = personById(r.data.regular) || p;
      regular.seat = oldSeat; if (oldSeat) oldSeat.taken = regular.id; sendToSeat(regular);
      if (regular.req) regular.req = null;
      G.reqHandled++; reward(3, 50, null, regular); Sound.pop(); ui.popupDirty = true; closePopup();
      return;
    }
  }
  if (r.type === 'candy') { p.req = null; G.reqHandled++; reward(3, 50, `🍬 Crisis averted: ${p.first} puts the candy away. For now.`, p); sendToSeat(p); closePopup(); return; }
  resolveReq(p, true);
  closePopup();
}
function updateRequests(dt) {
  for (const p of G.people) {
    if (!p.req) continue;
    if (p.req.type === 'minyan') continue;
    if (p.req.type === 'seat' && p.req.data.guest === undefined) continue;
    p.req.t -= dt;
    if (p.req.t <= 0) {
      if (p.req.type === 'leaving') { p.req = null; continue; }
      if (p.req.type === 'seat' && p.req.data.isGuestSide) { p.req = null; continue; }
      resolveReq(p, false);
    }
  }
  G.reqTimer -= dt;
  if (G.reqTimer <= 0) {
    G.reqTimer = (G.L.events.rate / spd(0.6)) * rand(0.6, 1.4);
    if (G.stage && G.stage.type === 'speech') G.reqTimer *= 0.6;
    if (G.stage && G.stage.type !== 'arrival') spawnRandomRequest();
  }
}

// ---------- scheduled curveballs ----------
function fireScheduled(ev) {
  switch (ev.type) {
    case 'leaveEarly': {
      const futureAliyot = G.slots.filter(s => !s.done && s.assignee && personById(s.assignee) && present(personById(s.assignee)) && !personById(s.assignee).req && !personById(s.assignee).busy && chiyuvRank(personById(s.assignee)) === 0);
      if (!futureAliyot.length) { ev.tries++; return ev.tries > 12; }
      const s = pick(futureAliyot), p = personById(s.assignee);
      p.req = mkReq('leaving'); p.busy = true;
      later(2.5, () => {
        p.req = null; p.busy = false;
        const lost = slotsOf(p).filter(x => !x.done);
        lost.forEach(x => x.assignee = null);
        if (p.seat && !p.seat.special) p.seat.taken = null;
        p.state = 'leaving'; walkTo(p, SPOT.door, true, () => { p.state = 'gone'; p.x = -100; });
        toast(`🚪 ${p.name} had to leave! ${lost.map(x => x.label).join(', ')} is now EMPTY. Refill it!`, 'bad');
        const ks = slotById('kohen'), ls = slotById('levi');
        if (p.tribe === 'kohen' && ks && !ks.done && !presence(null).kohanim.length) {
          const lp = ls && !ls.done && ls.assignee && personById(ls.assignee);
          if (lp && lp.tribe === 'levi') ls.assignee = null;
          toast(`⚖️ No Kohen left in shul. A Yisrael (or a Levi) goes up first "bimkom Kohen", and then NO Levi may go up after him (Shulchan Arukh 135:6). ${lp && lp.tribe === 'levi' ? `${lp.name} can't have Levi anymore. ` : ''}The second aliyah now goes to a Yisrael.`, 'tip');
        }
        Sound.alert(); ui.popupDirty = true;
      });
      return true;
    }
    case 'seatFight': {
      const occupants = G.people.filter(p => p.state === 'seated' && !p.kid && !p.req && p.seat && !p.seat.special && chiyuvRank(p) <= 1 && !p.rabbi);
      if (!occupants.length) { ev.tries++; return ev.tries > 10; }
      const guest = occupants.find(p => p.tags.has('guest')) || pick(occupants);
      guest.tags.add('guest');
      const reg = makePerson({ tribe: 'yisrael', tags: ['makomKavua', 'elderly'] }, new Set(G.people.map(p => p.first + ' ' + p.last)));
      reg.seat = guest.seat; reg.state = 'walking'; reg.arriveAt = G.t;
      G.people.push(reg);
      const near = { x: guest.seat.x, y: guest.seat.y + 32 };
      walkTo(reg, near, false, () => {
        reg.state = 'standing'; reg.req = mkReq('seat', { guest: guest.id, regular: reg.id });
        guest.req = { type: 'seat', t: reg.req.t, max: reg.req.max, data: { guest: guest.id, regular: reg.id, isGuestSide: true } };
        toast(`💺 ${reg.name} found a guest in his seat of 30 years!`, '');
      });
      return true;
    }
    case 'kiddush': {
      const sp = G.people.find(p => p.tags.has('sponsor') && present(p) && !p.req && p.state === 'seated');
      if (!sp) { ev.tries++; return ev.tries > 20; }
      sp.req = mkReq('kiddush'); return true;
    }
    case 'lateKohen': {
      const k = makePerson({ tribe: 'kohen', tags: ['canLead', 'guest'] }, new Set(G.people.map(p => p.first + ' ' + p.last)));
      k.arriveAt = G.t; G.people.push(k); k.seat = freeSeat(k, { x: 330, y: 300 });
      k.state = 'arriving'; k.x = SPOT.door.x; k.y = SPOT.door.y;
      sendToSeat(k);
      toast(`🚶 A Kohen just walked in late: ${k.name}! If the Kohen aliyah hasn't been called yet, it's his.`, '');
      const ks = slotById('kohen'), ls = slotById('levi');
      if (ks && !ks.done && !ks.callCtx) {
        if (ks.assignee && personById(ks.assignee).tribe !== 'kohen') ks.assignee = null;
        const lp = ls && !ls.done && ls.assignee && personById(ls.assignee);
        const leviHere = presence(null).leviim.length > 0;
        if (lp && lp.tribe !== 'levi' && leviHere) ls.assignee = null;
        toast(`⚖️ Now there IS a Kohen: the first aliyah goes to him, and the second goes back to a Levi${leviHere ? '' : ' (no Levi here, so the same Kohen takes it again)'}. Check your Clipboard!`, 'tip');
      }
      Sound.alert();
      return true;
    }
  }
  return true;
}
function updateScheduled() {
  for (const ev of G.scheduled) {
    if (ev.fired || !ev.stage) continue;
    if (!G.stage || G.stage.name !== ev.stage || G.waiting) continue;
    if (G.stageT >= (ev.delay || 0) / spd(0.6) + ev.tries * 1) {
      if (fireScheduled(ev)) ev.fired = true;
    }
  }
}

// ---------- stages ----------
function stageDur(st) { return st.dur / spd(0.6); }
function spd(e) { return Math.pow(G.speed, e); }
function startStage(i) {
  G.stageIdx = i; G.stage = G.stages[i]; G.stageT = 0; G.waiting = false; G.waitT = 0;
  const st = G.stage; if (!st) return finishLevel(false);
  ui.popupDirty = true;
  if (st.type !== 'arrival') toast(`📢 ${st.name}`, '');
  // check maftir deadline
  if (st.maftirDeadline) {
    const m = slotById('maftir');
    if (m && !m.assignee) toast('⏰ The Torah is coming out and no Maftir is assigned! He won\'t have time to prepare the haftarah.', 'bad');
  }
  if (st.type === 'hotzaah') {
    const pet = slotById('petichah');
    const p = pet && pet.assignee && personById(pet.assignee);
    if (p && present(p) && !p.busy) {
      p.busy = true; p.state = 'walking';
      walkTo(p, SPOT.aronFront, true, () => { p.state = 'atAron'; });
      st._pet = p;
    } else if (pet) {
      pet.done = true; pet.doneBy = -1;
      penalty(3, 'Nobody was given petichah, so the gabbai opened the Aron himself. A missed chance to honor someone.', null, true);
    }
    if (G.L.hints) tip('hotz', 'The Torah is coming out. Next: Kriyat HaTorah. Be at the BIMAH to call each aliyah. Is your Clipboard full?');
  }
  if (st.type === 'reading') startReading(st);
  if (st.type === 'haftarah') {
    const m = slotById('maftir'); const p = m && personById(m.doneBy);
    st._reader = p;
    if (p && present(p)) {
      p.busy = true; p.state = 'walking'; walkTo(p, SPOT.oleh, true, () => { p.state = 'atBimah'; });
      if (p.tags.has('barmitzvah') && G.L.candy) startCandyMoment(p, 'haftarah');
    }
  }
  if (st.type === 'speech') {
    const r = G.people.find(p => p.rabbi && present(p));
    const bm = G.people.find(p => p.tags.has('barmitzvah') && present(p));
    const speaker = st.name.includes('Bar Mitzvah') ? (bm || r) : r;
    if (speaker) { st._speaker = speaker; speaker.busy = true; speaker.state = 'walking'; walkTo(speaker, SPOT.speech, true, () => { speaker.state = 'speaking'; }); }
  }
  if (st.type === 'prayer') checkNeeds();
}
function checkNeeds() {
  const st = G.stage; const missing = [];
  for (const n of st.needs || []) {
    if (n === 'minyan') { if (adultsPresent().length < 10) missing.push('a minyan (10 men)'); continue; }
    const s = slotById(n);
    const p = s && s.assignee && personById(s.assignee);
    if (!p || !present(p)) missing.push(s ? s.label : n);
  }
  if (missing.length) {
    if (!G.waiting) { Sound.alert(); }
    G.waiting = missing;
    if (G.L.hints) {
      if (missing.some(m => m.startsWith('a minyan'))) tip('minyan', '🔟 Only 9 men inside! There\'s a man by the DOOR. Go convince him to stay.');
      if (missing.some(m => m.startsWith('Chazan'))) tip('chazan', '🎤 Nobody is leading! Click someone with the 🎤 tag and make him chazan.');
    }
    return false;
  }
  if (G.waiting) { G.waiting = false; }
  moveLeaderToAmud();
  // chazan honor performed at the start of the stage he leads (first time)
  const s = st.leader && slotById(st.leader);
  if (s && !s.done && s.assignee && (st.needs || []).includes(s.id)) performHonor(s, personById(s.assignee));
  return true;
}
function moveLeaderToAmud() {
  const st = G.stage; if (!st || !st.leader) return;
  const s = slotById(st.leader); const p = s && s.assignee && personById(s.assignee);
  if (!p || !present(p)) return;
  // send any other person at the amud home
  for (const o of G.people) if (o !== p && o.state === 'atAmud') { o.busy = false; sendToSeat(o); }
  if (p.state !== 'atAmud' && !p.goingAmud) {
    p.busy = true; p.goingAmud = true; p.state = 'walking';
    walkTo(p, SPOT.chazan, true, () => { p.state = 'atAmud'; p.goingAmud = false; });
  }
}
function releaseAmud() { for (const o of G.people) if (o.state === 'atAmud' || o.goingAmud) { o.busy = false; o.goingAmud = false; sendToSeat(o); } }

function updateStage(dt) {
  const st = G.stage; if (!st) return;
  if (G.waiting) {
    if (st.type === 'prayer') checkNeeds();
    if (G.waiting) {
      G.waitT += dt;
      if (G.waitT > 3) { G.shalom = clamp(G.shalom - 1.1 * dt, 0, 100); G.score -= 3 * dt; }
      return;
    }
  }
  if (st.type === 'reading') { updateReading(dt); return; }
  G.stageT += dt;
  if (st.type === 'haftarah' && st._reader && !st._stumbled && G.stageT > stageDur(st) * 0.4) {
    st._stumbled = true;
    const m = slotById('maftir'); const p = st._reader;
    const prepared = p.tags.has('knowsHaftarah') || (m && m.assignedAtStage >= 0 && !m.assignedAtHotzaah);
    if (!prepared) penalty(8, `${p.name} wasn't told about Maftir in time and stumbled through the haftarah. Assign Maftir BEFORE the Torah comes out!`, p);
    else reward(3, 60, null, p);
  }
  if (st.type === 'hotzaah' && G.stageT > stageDur(st) * 0.5 && G.torahsOnBimah < st.torahs) {
    G.torahsOnBimah = st.torahs;
    if (st._pet && !st._petDone) {
      st._petDone = true; const s = slotById('petichah'); performHonor(s, st._pet); st._pet.busy = false; sendToSeat(st._pet);
    }
  }
  if (G.stageT >= stageDur(st)) endStage();
}
function endStage() {
  const st = G.stage;
  if (st.type === 'hotzaah' && st._pet && !st._petDone) { st._petDone = true; performHonor(slotById('petichah'), st._pet); st._pet.busy = false; sendToSeat(st._pet); }
  if (st.type === 'haftarah') {
    if (st._reader) { st._reader.busy = false; sendToSeat(st._reader); }
    if (G.candy && G.candy.at === 'haftarah') openCandyWindow();
  }
  if (st.type === 'speech' && st._speaker) { st._speaker.busy = false; sendToSeat(st._speaker); }
  if (st.name.startsWith('Hachnasat')) G.torahsOnBimah = 0;
  if (st.announce) {
    if (G.announcements.length) reward(4, 80, `📣 Announced: ${G.announcements.join('; ')}. Yasher koach!`);
  }
  // leader changes?
  const next = G.stages[G.stageIdx + 1];
  if (!next || next.leader !== st.leader) releaseAmud();
  if (st.last) return finishLevel(false);
  startStage(G.stageIdx + 1);
}

// ---------- Torah reading ----------
function startReading(st) {
  G.reading = { calls: st.calls.slice(), idx: 0, phase: 'needCall', t: 0, waitT: 0, oleh: null, st, torah: 1, events: [] };
  G.torahsOnBimah = Math.max(G.torahsOnBimah, (G.stages.find(s => s.type === 'hotzaah') || {}).torahs || 1);
  // events tied to calls
  for (const ev of G.scheduled) if (!ev.fired && ev.call) G.reading.events.push(ev);
  if (Math.random() < (st.wrongSpot || 0)) startWrongSpot(G.L.parsha);
  if (G.L.hints) tip('read', '📖 Kriyat HaTorah! Walk to the BIMAH (center). Each aliyah needs you there to call the person up.');
  if (G.L.id === 2 && !adultsPresent().some(p => p.tribe === 'levi')) tip('noLevi', '⚠️ No Levi in shul today! Halacha: the SAME Kohen gets the Levi aliyah too.');
  G.gabbaiPrompted = false;
}
function currentCallSlot() { const R = G.reading; return R && slotById(R.calls[R.idx]); }
function readingBlocked() { return G.wrongSpot || (G.pasul && G.reading && G.reading.phase === 'reading'); }
function callDuration(slot) {
  const base = slot.kind === 'hagbah' ? 4 : slot.kind === 'gelilah' ? 5 : 9;
  return base / spd(0.7);
}
function callUp(p) {
  const R = G.reading, slot = currentCallSlot();
  if (!slot || R.phase !== 'needCall' || G.wrongSpot) return;
  if (slot.assignee !== p.id) { slot.assignee = p.id; slot.assignedAtStage = G.stageIdx; slot.assignedAtHotzaah = true; }
  slot.callCtx = null; slot.callCtx = presence(slot);
  R.oleh = p; R.phase = 'goingUp'; R.waitT = 0;
  p.busy = true; p.state = 'walking'; if (p.req && p.req.type !== 'leaving') p.req = null;
  const spot = slot.kind === 'hagbah' || slot.kind === 'gelilah' ? { x: 480, y: 286 } : SPOT.oleh;
  walkTo(p, spot, true, () => { p.state = 'atBimah'; R.phase = 'reading'; R.t = 0; onAliyahStart(slot, p); });
  Sound.click();
  const tribeWord = slot.rule === 'kohen' && p.tribe === 'kohen' ? ' HaKohen' : slot.rule === 'levi' && p.tribe === 'levi' ? ' HaLevi' : '';
  const callWord = slot.rule === 'kohen' && p.tribe !== 'kohen' ? 'bimkom Kohen' : slot.rule === 'levi' && p.tribe !== 'levi' && p.tribe !== 'kohen' ? 'Sheni' : slotLabel(slot);
  toast(`🗣️ "Ya'amod, ${p.first} ben ${pick(['Avraham', 'Yitzchak', 'Yaakov', 'Moshe', 'Dovid', 'Shlomo', 'Chaim'])}${tribeWord}, ${callWord}!"`, '');
  ui.popupDirty = true;
}
function onAliyahStart(slot, p) {
  if (p.tags.has('chatan') && G.L.candy && (ALIYAH_KINDS.includes(slot.kind) || slot.hosafa)) startCandyMoment(p, 'chatan');
}
function updateReading(dt) {
  const R = G.reading; const slot = currentCallSlot();
  // second Torah may need rolling
  if (R.phase === 'needCall' && R.st.secondTorahAt && slot && slot.id === R.st.secondTorahAt && R.torah === 1) {
    R.torah = 2;
    if (Math.random() < (R.st.wrongSpot2 || 0)) startWrongSpot(G.L.parsha2 || 'Pinchas', 2);
  }
  if (!slot) return endReading();
  // blocked / waiting penalties
  const waitingOnGabbai = (R.phase === 'needCall') || G.wrongSpot || (G.pasul && R.phase === 'reading');
  if (waitingOnGabbai) {
    R.waitT += dt;
    if (R.waitT > 4) { G.shalom = clamp(G.shalom - 1.0 * dt, 0, 100); G.score -= 3 * dt; }
    const key = R.idx + '-' + !!G.wrongSpot + '-' + !!G.pasul;
    if (atBimah() && !ui.popup && !Scroll.open && R.autoOpened !== key) { R.autoOpened = key; openPlacePopup('bimah'); }
  } else R.waitT = 0;
  if (G.mistake) {
    G.mistake.t -= dt;
    if (G.mistake.t <= 0) { G.mistake = null; penalty(5, 'The baal koreh misread a word and nobody corrected him. Some say the aliyah has to be read again!', null); ui.popupDirty = true; }
  }
  if (R.phase === 'reading' && !G.pasul) {
    R.t += dt;
    const dur = callDuration(slot);
    for (const ev of R.events) {
      if (ev.fired || ev.call !== slot.id) continue;
      if (ev.type === 'mistake' && R.t > dur * 0.35) { ev.fired = true; G.mistake = { t: REQ_DEFS.candy.base * 1.3 / spd(0.4) }; toast('⚠️ The baal koreh misread a word! Get to the bimah and correct him!', 'bad'); Sound.alert(); ui.popupDirty = true; }
      if (ev.type === 'pasul' && R.t > dur * 0.5) { ev.fired = true; G.pasul = { stage: 'aron' }; toast('✋ STOP! A broken letter, the Torah is PASUL! Bring another Sefer Torah from the Aron Kodesh!', 'bad'); Sound.alert(); ui.popupDirty = true; }
    }
    if (G.pasul) return;
    if (R.t >= dur) {
      const p = R.oleh;
      performHonor(slot, p);
      if (G.candy && G.candy.at === 'chatan' && G.candy.who === p.id) openCandyWindow();
      p.busy = false; sendToSeat(p);
      R.oleh = null; R.idx++; R.phase = 'needCall'; R.waitT = 0;
      ui.popupDirty = true;
      if (R.idx >= R.calls.length) endReading();
    }
  }
}
function endReading() {
  if (G.misheberach.length) {
    reward(Math.min(8, G.misheberach.length * 2), 40 * G.misheberach.length, `🙏 Mi Shebeirach said for ${G.misheberach.length} ${G.misheberach.length === 1 ? 'person' : 'people'}. Refuah shleimah!`);
    G.misheberachSaid = G.misheberach.length;
  }
  for (const p of G.people) if (p.req && p.req.type === 'misheberach') resolveReq(p, false);
  G.reading = null; G.mistake = null;
  if (ui.popup && ui.popup.kind === 'place') closePopup();
  endStage();
}
function addHosafa() {
  if (!G.L.shabbat || G.hosafot >= 3) return;
  const R = G.reading;
  const sheviiIdxCalls = R ? R.calls.indexOf('shevii') : -1;
  if (R && (sheviiIdxCalls < 0 || sheviiIdxCalls < R.idx || (sheviiIdxCalls === R.idx && R.phase !== 'needCall'))) { toast("Too late for hosafot: Shevi'i has already been called.", 'bad'); return; }
  G.hosafot++;
  const id = 'hosafa' + G.hosafot;
  const slot = { id, label: 'Hosafa ' + G.hosafot, kind: 'aliyah', rule: 'any', group: 'Aliyot', hosafa: true, assignee: null, done: false, doneBy: null, assignedAtStage: -1 };
  const si = G.slots.findIndex(s => s.id === 'shevii');
  G.slots.splice(si, 0, slot);
  if (R) R.calls.splice(R.calls.indexOf('shevii'), 0, id);
  else { const rs = G.stages.find(s => s.type === 'reading'); rs._extra = (rs._extra || 0) + 1; }
  toast(`➕ Added ${slot.label}. Remember, every hosafa makes the service longer.`, '');
  ui.popupDirty = true;
}
function removeHosafa(slot) {
  if (slot.done) return;
  G.slots.splice(G.slots.indexOf(slot), 1);
  if (G.reading) { const i = G.reading.calls.indexOf(slot.id); if (i >= 0 && i >= G.reading.idx) G.reading.calls.splice(i, 1); }
  ui.popupDirty = true;
}
function atBimah() { const b = PLACES.bimah, g = G.gabbai; return g.x > b.x - 12 && g.x < b.x + b.w + 12 && g.y > b.y - 12 && g.y < b.y + b.h + 12; }

// ---------- game-clock timers (pause-safe) ----------
function later(sec, fn) { G.timers.push({ t: sec, fn }); }
function updateTimers(dt) {
  for (const tm of G.timers.slice()) { tm.t -= dt; if (tm.t <= 0) { G.timers.splice(G.timers.indexOf(tm), 1); tm.fn(); } }
}

// ---------- candy ----------
function startCandyMoment(p, at) {
  G.candy = { who: p.id, at, phase: 'pending', t: 0, spoiled: false };
  for (const ev of G.scheduled) if (ev.type === 'candyEarly' && ev.at === at && !ev.fired) {
    ev.fired = true;
    later(1.5, () => {
      const kids = G.people.filter(k => k.kid && canTakeReq(k));
      if (!kids.length) return;
      const k = pick(kids); k.req = mkReq('candy'); toast(`🍬 ${k.first} is about to throw his candy early! Stop him!`, 'bad'); Sound.alert();
    });
  }
}
function openCandyWindow() {
  if (!G.candy) return;
  G.candy.phase = 'window'; G.candy.t = 4.0;
  toast('🍬 NOW! Signal the candy!', 'tip'); Sound.alert();
}
function signalCandy() {
  if (!G || G.over) return;
  const c = G.candy;
  if (c && c.phase === 'window') {
    const p = personById(c.who);
    candyShower();
    if (c.spoiled) reward(3, 80, `🍬 Candy! (A bit of a mess after that early throw, but mazel tov!)`, p);
    else reward(8, 250, `🍬🍬 PERFECT timing! Candy rains down on ${p ? p.first : 'him'}. MAZEL TOV!`, p);
    G.candy = null;
  } else if (c && c.phase === 'pending') {
    candyShower();
    penalty(8, 'You signaled the candy too early! He was still in the middle of the bracha!', null);
    c.spoiled = true; c.signaledEarly = true;
  } else {
    penalty(4, 'Candy?! Nobody is being honored right now. The kids are confused and the floor is sticky.', null, true);
  }
}
function updateCandy(dt) {
  const c = G.candy; if (!c) return;
  if (c.phase === 'window') {
    c.t -= dt;
    if (c.t <= 0) {
      if (c.signaledEarly) { G.candy = null; return; }
      penalty(5, 'You missed the candy moment. The kids threw it all on their own, late and sticky.', null);
      candyShower(); G.candy = null;
    }
  }
}
function candyShower() {
  Sound.candy();
  for (let i = 0; i < 90; i++) {
    const fromLeft = Math.random() < 0.5;
    G.particles.push({ x: fromLeft ? rand(30, 300) : rand(905, 950), y: rand(150, 600), vx: fromLeft ? rand(60, 260) : rand(-330, -120), vy: rand(-260, -80), t: rand(1.2, 2), c: pick(['#ff4fb8', '#ffd23f', '#3fd2ff', '#7cff6b', '#ff8a3f', '#b06bff']), candy: true });
  }
}

// ---------- wrong-spot minigame ----------
function startWrongSpot(target, torahNum) {
  const ti = PARSHIYOT.indexOf(target);
  let off = randi(3, 9) * (Math.random() < 0.5 ? -1 : 1);
  let cur = clamp(ti + off, 0, PARSHIYOT.length - 1); if (cur === ti) cur = ti + 4;
  G.wrongSpot = { target: ti, pos: cur + rand(-0.3, 0.3), vel: 0, torahNum: torahNum || 1 };
  toast(`📜 The ${torahNum === 2 ? 'second ' : ''}Torah was rolled to Parshat ${PARSHIYOT[cur]}, but we need ${target}! Go to the bimah and roll it.`, 'bad');
  Sound.alert(); ui.popupDirty = true;
  if (G.L.hints || !G.tipsShown.has('wrongSpot')) tip('wrongSpot', '📜 Wrong spot! Walk to the bimah and choose "Roll the Torah".');
}
const Scroll = { open: false, held: 0, raf: 0, last: 0 };
function openScrollGame() {
  if (!G.wrongSpot) return;
  closePopup();
  Scroll.open = true; Scroll.held = 0; Scroll.last = performance.now();
  $('scroll-modal').classList.remove('hidden');
  scrollLoop();
}
function closeScrollGame() { Scroll.open = false; $('scroll-modal').classList.add('hidden'); cancelAnimationFrame(Scroll.raf); }
function scrollLoop() {
  if (!Scroll.open) return;
  const now = performance.now(), dt = Math.min(0.05, (now - Scroll.last) / 1000); Scroll.last = now;
  const ws = G && G.wrongSpot; if (!ws) { closeScrollGame(); return; }
  if (Scroll.held) ws.vel = clamp(ws.vel + Scroll.held * 5 * dt, -3.5, 3.5);
  else ws.vel *= Math.pow(0.02, dt);
  if (Math.abs(ws.vel) < 0.02 && !Scroll.held) ws.vel = 0;
  ws.pos = clamp(ws.pos + ws.vel * dt, 0, PARSHIYOT.length - 1);
  drawScroll(ws);
  Scroll.raf = requestAnimationFrame(scrollLoop);
}
function drawScroll(ws) {
  const c = $('scroll-canvas'), x = c.getContext('2d'), w = c.width, h = c.height, UNIT = 260;
  x.fillStyle = '#efe0b8'; x.fillRect(0, 0, w, h);
  // columns of "text"; higher index to the LEFT (Hebrew scroll: Bereshit on the right)
  const center = w / 2;
  for (let i = Math.floor(ws.pos) - 3; i <= Math.ceil(ws.pos) + 3; i++) {
    if (i < 0 || i >= PARSHIYOT.length) continue;
    const px = center + (ws.pos - i) * UNIT;
    // columns for this parsha span [px - UNIT, px] (it starts at px and continues left)
    for (let col = 0; col < 4; col++) {
      const cx = px - 20 - col * 62;
      if (cx < -60 || cx > w + 10) continue;
      x.fillStyle = '#2a1d10';
      for (let ln = 0; ln < 14; ln++) {
        const seed = (i * 131 + col * 17 + ln * 7) % 11;
        const lw = 44 - (seed % 4) * 3;
        x.globalAlpha = 0.75; x.fillRect(cx - lw, 46 + ln * 10, lw, 3); x.globalAlpha = 1;
        for (let k = 0; k < 5; k++) x.fillRect(cx - lw + k * 9 + (seed % 3), 45 + ln * 10, 2, 5);
      }
    }
    // parsha heading (petuchah gap + title)
    x.fillStyle = '#b3261e'; x.font = 'bold 15px Georgia'; x.textAlign = 'center';
    x.fillText(PARSHIYOT[i], px, 30);
    x.strokeStyle = 'rgba(179,38,30,.4)'; x.beginPath(); x.moveTo(px, 36); x.lineTo(px, h - 10); x.stroke();
  }
  // rollers
  x.fillStyle = '#6b4423'; x.fillRect(0, 0, 18, h); x.fillRect(w - 18, 0, 18, h);
  x.fillStyle = '#d9a520'; x.fillRect(4, 0, 10, 8); x.fillRect(w - 14, 0, 10, 8); x.fillRect(4, h - 8, 10, 8); x.fillRect(w - 14, h - 8, 10, 8);
  // gold marker
  x.strokeStyle = '#d9a520'; x.lineWidth = 4; x.beginPath(); x.moveTo(center, 0); x.lineTo(center, h); x.stroke(); x.lineWidth = 1;
  x.fillStyle = '#d9a520'; x.beginPath(); x.moveTo(center - 10, 0); x.lineTo(center + 10, 0); x.lineTo(center, 14); x.fill();
  const cur = PARSHIYOT[Math.round(ws.pos)];
  const dir = ws.target > ws.pos + 0.2 ? '◀◀ roll left' : ws.target < ws.pos - 0.2 ? 'roll right ▶▶' : 'right here!';
  $('scroll-info').innerHTML = `Showing: <b>${cur}</b> &nbsp;·&nbsp; We need: <b>${PARSHIYOT[ws.target]}</b> &nbsp;<span class="tiny">(${dir})</span>`;
}
function scrollHere() {
  const ws = G && G.wrongSpot; if (!ws) return;
  if (Math.abs(ws.pos - ws.target) < 0.22) {
    G.wrongSpot = null; closeScrollGame();
    reward(3, 80, `📜 Found Parshat ${PARSHIYOT[ws.target]}. The baal koreh nods approvingly.`);
    ui.popupDirty = true;
  } else {
    const box = document.querySelector('.scroll-box'); box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
    penalty(1.5, `That's ${PARSHIYOT[Math.round(ws.pos)]}, not ${PARSHIYOT[ws.target]}!`, null, true);
  }
}

// ---------- pasul / mistake actions ----------
function correctReader() { if (!G.mistake) return; G.mistake = null; reward(3, 60, '✅ You corrected the baal koreh. Crisis averted.'); ui.popupDirty = true; }
function takeTorahFromAron() { if (!G.pasul) return; G.gabbai.carrying = 'torah'; G.pasul.stage = 'carry'; toast('📜 You have the new Sefer Torah. Bring it to the bimah!', ''); closePopup(); }
function placeNewTorah() {
  if (!G.pasul || G.gabbai.carrying !== 'torah') return;
  G.gabbai.carrying = null; G.pasul = null;
  reward(4, 100, '📜 The new Sefer Torah is on the bimah. The reading continues.');
  ui.popupDirty = true;
}

// ---------- finishing ----------
function finishLevel(fired) {
  if (G.over) return;
  G.over = true;
  closePopup(); closeScrollGame();
  const unmet = [];
  if (!fired) {
    for (const p of G.people) {
      if (p.state === 'gone' || p.arriveAt > G.t) continue;
      for (const w of p.wants) if (!w.done) {
        const weight = w.w === 'maftir' ? 20 : p.tags.has('chatan') ? 15 : w.w === 'honor' ? 4 : 7;
        unmet.push({ p, w: w.w, weight });
        G.shalom = clamp(G.shalom - weight, 0, 100);
      }
    }
    const bonus = Math.max(0, Math.round((G.parTime - G.t) * 3));
    G.timeBonus = bonus; G.score += bonus;
  }
  const sh = Math.round(G.shalom);
  const stars = fired ? 0 : sh >= 85 ? 3 : sh >= 65 ? 2 : sh >= 40 ? 1 : 0;
  G.pacedUp = false;
  if (stars > 0) {
    progress.stars[G.L.id] = Math.max(progress.stars[G.L.id] || 0, stars);
    progress.unlocked = Math.max(progress.unlocked, G.L.id + 1);
    if (progress.pace < PACES.length - 1) { progress.pace++; G.pacedUp = true; }
    progress.maxPace = Math.max(progress.maxPace, progress.pace);
    saveProgress();
  }
  showResults({ fired, stars, unmet, shalom: sh });
}

// ---------- tips & toasts ----------
function toast(msg, cls) {
  const box = $('toasts');
  const t = el('div', { class: 'toast ' + (cls || '') }, msg);
  box.prepend(t);
  while (box.children.length > 3) box.lastChild.remove();
  const life = cls === 'tip' ? 9000 : cls === 'bad' ? 6500 : msg.startsWith('📢') || msg.startsWith('📋') ? 2200 : 4200;
  setTimeout(() => t.classList.add('out'), life);
  setTimeout(() => t.remove(), life + 600);
}
function tip(key, msg) { if (!G || G.tipsShown.has(key)) return; G.tipsShown.add(key); toast('💡 ' + msg, 'tip'); }

// ---------- gabbai movement & interaction ----------
function setGabbaiTarget(target) {
  const g = G.gabbai; g.target = target;
  const dest = targetPos(target);
  g.path = findPath(g, dest, false);
  g.repathT = 0.4;
  closePopup();
  if (interactionReady()) arrive();
}
function targetPos(t) {
  if (t.type === 'person') return { x: t.ref.x, y: t.ref.y };
  if (t.type === 'place') return PLACES[t.ref].spot;
  return t.ref;
}
function interactionReady() {
  const g = G.gabbai, t = g.target; if (!t) return false;
  if (t.type === 'person') return dist(g, t.ref) < 58;
  if (t.type === 'place') { if (t.ref === 'bimah') return atBimah(); return dist(g, PLACES[t.ref].spot) < 26; }
  return false;
}
function arrive() {
  const t = G.gabbai.target; G.gabbai.target = null; G.gabbai.path = [];
  if (t.type === 'person') openPersonCard(t.ref);
  else if (t.type === 'place') openPlacePopup(t.ref);
}
function updateGabbai(dt) {
  const g = G.gabbai;
  g.bob += dt * (g.path.length ? 12 : 0);
  if (g.target && g.target.type === 'person') {
    const p = g.target.ref;
    if (!present(p) && p.state !== 'door') { g.target = null; g.path = []; }
    else {
      g.repathT -= dt;
      if (g.repathT <= 0) { g.repathT = 0.4; if (p.path.length || dist(g.path[g.path.length - 1] || g, p) > 60) g.path = findPath(g, p, false); }
    }
  }
  moveAlong(g, dt);
  if (g.target && interactionReady()) arrive();
  else if (g.target && !g.path.length) { // couldn't reach exactly
    if (g.target.type === 'person' && dist(g, g.target.ref) < 80) arrive();
    else if (g.target.type === 'place' && dist(g, PLACES[g.target.ref].spot) < 60) arrive();
    else if (g.target.type === 'point') g.target = null;
  }
  // close person popup if they wandered off
  if (ui.popup && ui.popup.kind === 'person' && dist(g, ui.popup.ref) > 110) closePopup();
  if (ui.popup && ui.popup.kind === 'place' && ui.popup.ref === 'bimah' && !atBimah()) closePopup();
}
function moveAlong(e, dt) {
  let step = e.speed * dt;
  while (step > 0 && e.path.length) {
    const t = e.path[0], d = dist(e, t);
    if (d <= step) { e.x = t.x; e.y = t.y; e.path.shift(); step -= d; }
    else { e.x += (t.x - e.x) / d * step; e.y += (t.y - e.y) / d * step; step = 0; }
  }
  if (!e.path.length && e.onArrive) { const f = e.onArrive; e.onArrive = null; f(); }
}
function updatePeople(dt) {
  for (const p of G.people) {
    if (p.state === 'offstage' && G.t >= p.arriveAt) {
      p.state = 'arriving'; p.x = SPOT.door.x + rand(-10, 10); p.y = SPOT.door.y;
      walkTo(p, p.seat, true, () => {
        p.state = 'seated'; p.x = p.seat.x; p.y = p.seat.y;
      });
    }
    if (p.state === 'offstage' || p.state === 'gone') continue;
    p.bob += dt * (p.path.length ? 10 : 1);
    moveAlong(p, dt);
  }
}

// ---------- main update ----------
function update(dt) {
  if (!G || G.over || G.paused) return;
  G.t += dt;
  updatePeople(dt);
  updateGabbai(dt);
  updateStage(dt);
  if (G.over) return;
  updateRequests(dt);
  updateScheduled();
  updateCandy(dt);
  updateTimers(dt);
  for (const pt of G.particles) { pt.t -= dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += 380 * dt; }
  G.particles = G.particles.filter(p => p.t > 0);
  for (const f of G.floaters) { f.t -= dt; f.y -= 24 * dt; }
  G.floaters = G.floaters.filter(f => f.t > 0);
  if (G.shalom <= 0) finishLevel(true);
  if (ui.popupDirty && ui.popup) { ui.popupDirty = false; refreshPopup(); }
  ui.popupDirty = false;
}

// ============================================================
// RENDERING
// ============================================================
function drawShul() {
  // floor
  const fg = ctx.createLinearGradient(0, 0, 0, H);
  fg.addColorStop(0, '#c9a46c'); fg.addColorStop(1, '#b08850');
  ctx.fillStyle = fg; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(90,60,20,.18)'; ctx.lineWidth = 1;
  for (let y = 50; y < H; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  for (let y = 50, k = 0; y < H; y += 24, k++) for (let x = (k % 2) * 60; x < W; x += 120) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 24); ctx.stroke(); }
  // carpet runners (aisles)
  ctx.fillStyle = 'rgba(122,24,32,.55)';
  ctx.fillRect(322, 130, 76, 560); ctx.fillRect(562, 130, 66, 560);
  ctx.fillStyle = 'rgba(217,165,32,.5)';
  ctx.fillRect(322, 130, 3, 560); ctx.fillRect(395, 130, 3, 560); ctx.fillRect(562, 130, 3, 560); ctx.fillRect(625, 130, 3, 560);
  // walls
  ctx.fillStyle = '#e9dcc0'; ctx.fillRect(0, 0, W, 50);
  ctx.fillStyle = '#8a6a44'; ctx.fillRect(0, 46, W, 6);
  ctx.fillStyle = '#e9dcc0'; ctx.fillRect(0, 0, 30, H);
  ctx.fillStyle = '#8a6a44'; ctx.fillRect(26, 50, 5, H);
  // windows (stained glass) on top wall
  for (const wx of [80, 200, 300, 660, 760, 860]) {
    if (wx > 880) continue;
    const g = ctx.createLinearGradient(wx, 6, wx, 42);
    g.addColorStop(0, '#5aa0e0'); g.addColorStop(.5, '#e0c050'); g.addColorStop(1, '#b04060');
    ctx.fillStyle = g; roundRect(wx - 18, 6, 36, 36, 16, true);
    ctx.strokeStyle = '#6b4423'; ctx.lineWidth = 2; roundRect(wx - 18, 6, 36, 36, 16, false, true);
    ctx.fillStyle = '#fff8'; star(wx, 22, 7);
  }
  // bottom wall + door
  ctx.fillStyle = '#e9dcc0'; ctx.fillRect(0, 700, W, 20);
  ctx.fillStyle = '#5a3a1a'; ctx.fillRect(440, 700, 80, 20);
  ctx.fillStyle = '#d9a520'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('DOOR', 480, 714);
  // ezrat nashim lattice
  ctx.fillStyle = '#7a5530'; ctx.fillRect(900, 50, 60, H - 50);
  ctx.strokeStyle = '#c9a46c'; ctx.lineWidth = 2;
  for (let y = 60; y < H; y += 16) { ctx.beginPath(); ctx.moveTo(904, y); ctx.lineTo(956, y + 16); ctx.moveTo(956, y); ctx.lineTo(904, y + 16); ctx.stroke(); }
  ctx.save(); ctx.translate(934, 390); ctx.rotate(-Math.PI / 2); ctx.fillStyle = '#f6ecd2'; ctx.font = 'bold 13px Georgia'; ctx.fillText('Ezrat Nashim', 0, 0); ctx.restore();
  ctx.fillStyle = '#e9dcc0'; ctx.fillRect(900, 0, 60, 50);

  // Aron Kodesh
  const a = PLACES.aron;
  ctx.fillStyle = '#5a3a1a'; roundRect(a.x - 10, a.y, a.w + 20, a.h + 6, 6, true);
  ctx.fillStyle = '#7a1f2b'; ctx.fillRect(a.x, a.y + 8, a.w, a.h - 8);
  ctx.fillStyle = '#d9a520';
  ctx.fillRect(a.x, a.y + 8, a.w, 4); ctx.fillRect(a.x, a.y + a.h - 4, a.w, 4);
  ctx.font = 'bold 15px serif'; ctx.textAlign = 'center'; ctx.fillText('כתר תורה', a.x + a.w / 2, a.y + 52);
  crown(a.x + a.w / 2, a.y + 30);
  if (G && G.stage && G.stage.type === 'hotzaah') { ctx.fillStyle = 'rgba(255,240,180,.35)'; ctx.fillRect(a.x, a.y + 8, a.w, a.h - 8); }
  // ner tamid
  const glow = ctx.createRadialGradient(480, 86, 1, 480, 86, 16);
  glow.addColorStop(0, 'rgba(255,60,40,.95)'); glow.addColorStop(1, 'rgba(255,60,40,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(480, 86, 16, 0, 7); ctx.fill();
  // Amud
  const am = PLACES.amud;
  ctx.fillStyle = '#6b4423'; roundRect(am.x, am.y, am.w, am.h, 4, true);
  ctx.fillStyle = '#1f3a68'; ctx.fillRect(am.x + 4, am.y + 4, am.w - 8, am.h - 10);
  ctx.fillStyle = '#d9a520'; ctx.font = 'bold 9px serif'; ctx.fillText('שויתי', am.x + am.w / 2, am.y + 16);
  // Rabbi's chair
  ctx.fillStyle = '#5a2a1a'; roundRect(SPOT.rabbiSeat.x - 14, SPOT.rabbiSeat.y - 4, 28, 24, 5, true);
  ctx.fillStyle = '#7a1f2b'; roundRect(SPOT.rabbiSeat.x - 11, SPOT.rabbiSeat.y - 1, 22, 16, 4, true);

  // Bimah
  const b = PLACES.bimah;
  ctx.fillStyle = 'rgba(0,0,0,.18)'; roundRect(b.x + 4, b.y + 6, b.w, b.h, 10, true);
  ctx.fillStyle = '#a77b47'; roundRect(b.x, b.y, b.w, b.h, 10, true);
  ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 5; roundRect(b.x + 3, b.y + 3, b.w - 6, b.h - 6, 9, false, true);
  ctx.lineWidth = 1; ctx.strokeStyle = '#d9a520';
  for (let x = b.x + 12; x < b.x + b.w - 8; x += 12) { ctx.beginPath(); ctx.moveTo(x, b.y + 1); ctx.lineTo(x, b.y + 6); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, b.y + b.h - 6); ctx.lineTo(x, b.y + b.h - 1); ctx.stroke(); }
  // table
  ctx.fillStyle = '#4a2e16'; ctx.fillRect(TABLE.x - 2, TABLE.y - 2, TABLE.w + 4, TABLE.h + 4);
  ctx.fillStyle = '#1f3a68'; ctx.fillRect(TABLE.x, TABLE.y, TABLE.w, TABLE.h);
  ctx.fillStyle = '#d9a520'; ctx.fillRect(TABLE.x, TABLE.y + TABLE.h - 5, TABLE.w, 3);
  // torahs on table
  if (G && G.torahsOnBimah) {
    const reading = G.reading;
    const rs = G.stages.find(s => s.type === 'reading');
    const hagbahNow = reading && reading.phase === 'reading' && currentCallSlot() && currentCallSlot().kind === 'hagbah';
    if (hagbahNow) { drawTorah(480, 268, true, false); }
    else drawTorah(480, 318, true, G.pasul);
    if (G.torahsOnBimah > 1) drawTorah(428, 316, false, false, 0.7);
  }
  // bookshelf
  const sh = PLACES.shelf;
  ctx.fillStyle = '#4a2e16'; ctx.fillRect(sh.x, sh.y, sh.w, sh.h);
  const cols = ['#7a1f2b', '#1f3a68', '#2e5d3a', '#7a5a1f', '#3d2a5a'];
  for (let i = 0; i < 26; i++) { ctx.fillStyle = cols[i % 5]; ctx.fillRect(sh.x + 4 + i * 5.2, sh.y + 5, 4.4, 17); ctx.fillRect(sh.x + 4 + ((i * 7) % 26) * 5.2, sh.y + 26, 4.4, 17); }
  // tallit rack
  const rk = PLACES.rack;
  ctx.fillStyle = '#4a2e16'; ctx.fillRect(rk.x, rk.y + 4, rk.w, 6);
  for (let i = 0; i < 8; i++) { ctx.fillStyle = '#f7f3ea'; ctx.fillRect(rk.x + 6 + i * 15, rk.y + 10, 12, 34); ctx.fillStyle = '#222'; ctx.fillRect(rk.x + 6 + i * 15, rk.y + 30, 12, 2); ctx.fillRect(rk.x + 6 + i * 15, rk.y + 35, 12, 2); }
  // pews
  for (const ry of ROW_Y) for (const bx of BLOCK_X) {
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(bx + 3, ry + 4, PEW_W, 18);
    ctx.fillStyle = '#7a4f28'; roundRect(bx, ry + 2, PEW_W, 16, 4, true); // seat
    ctx.fillStyle = '#5a3818'; roundRect(bx, ry + 12, PEW_W, 9, 3, true);  // back
    ctx.fillStyle = '#8f6236'; ctx.fillRect(bx, ry - 8, PEW_W, 5);  // shtender ledge of the row in front
  }
}
function drawTorah(x, y, open, pasul, sc = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  if (open) {
    ctx.fillStyle = '#f6ecd2'; ctx.fillRect(-22, -10, 44, 22);
    ctx.fillStyle = '#333'; for (let i = 0; i < 4; i++) ctx.fillRect(-18, -6 + i * 5, 36, 1.5);
    ctx.fillStyle = '#6b4423'; ctx.fillRect(-28, -14, 8, 30); ctx.fillRect(20, -14, 8, 30);
    ctx.fillStyle = '#d9a520'; ctx.fillRect(-27, -18, 6, 5); ctx.fillRect(21, -18, 6, 5);
    if (pasul) { ctx.strokeStyle = '#b3261e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-14, -8); ctx.lineTo(14, 10); ctx.moveTo(14, -8); ctx.lineTo(-14, 10); ctx.stroke(); }
  } else {
    ctx.fillStyle = '#7a1f2b'; roundRect(-10, -16, 20, 32, 5, true);
    ctx.fillStyle = '#d9a520'; ctx.fillRect(-8, -20, 4, 5); ctx.fillRect(4, -20, 4, 5); ctx.fillRect(-10, -2, 20, 2);
  }
  ctx.restore();
}
function drawPerson(p, isGabbai) {
  const kid = p.kid, s = kid ? 0.78 : p.bm ? 0.88 : 1;
  const walking = p.path && p.path.length;
  const bob = walking ? Math.sin(p.bob) * 1.5 : 0;
  const x = p.x, y = p.y + bob;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(0, 8, 13, 5, 0, 0, 7); ctx.fill();
  // body
  if (isGabbai) {
    ctx.fillStyle = '#1e1e24'; ctx.beginPath(); ctx.ellipse(0, -2, 13, 12, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(-2, -12, 4, 12);
  } else if (!kid && p.hasTallit) {
    ctx.fillStyle = '#f7f3ea'; ctx.beginPath(); ctx.ellipse(0, -2, 13, 12, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#1b1b2a'; ctx.fillRect(-13, 1, 26, 2.2); ctx.fillRect(-13, 5, 26, 1.5);
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, -2, 13, 12, 0, 0, 7); ctx.stroke();
  } else {
    ctx.fillStyle = p.shirt; ctx.beginPath(); ctx.ellipse(0, -2, 12, 11, 0, 0, 7); ctx.fill();
  }
  // head
  ctx.fillStyle = p.skin || '#f1c9a5'; ctx.beginPath(); ctx.arc(0, -16, 8, 0, 7); ctx.fill();
  if (p.beard) { ctx.fillStyle = p.beard; ctx.beginPath(); ctx.arc(0, -12, 6.5, 0.1, Math.PI - 0.1); ctx.fill(); }
  // headwear
  if (isGabbai || p.hat || p.rabbi) {
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(0, -21, 12, 4, 0, 0, 7); ctx.fill();
    ctx.fillRect(-7, -30, 14, 9); ctx.fillStyle = '#333'; ctx.fillRect(-7, -23, 14, 2);
  } else {
    ctx.fillStyle = p.tags.has('barmitzvah') ? '#f5f5f5' : pick2(p.id, ['#1f3a68', '#111', '#5a3a1a', '#2e5d3a', '#7a1f2b']);
    ctx.beginPath(); ctx.arc(0, -20, 5.5, Math.PI, 0); ctx.fill();
  }
  if (isGabbai) { // clipboard
    ctx.fillStyle = '#8a6a44'; ctx.fillRect(8, -8, 9, 12); ctx.fillStyle = '#fff'; ctx.fillRect(9.5, -6, 6, 9);
  }
  ctx.restore();
  // tribe badge
  if (!isGabbai && (p.tribe === 'kohen' || p.tribe === 'levi')) {
    ctx.fillStyle = p.tribe === 'kohen' ? '#d9a520' : '#2f5596';
    ctx.beginPath(); ctx.arc(x + 11 * s, y - 4, 6, 0, 7); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(p.tribe === 'kohen' ? 'K' : 'L', x + 11 * s, y - 1.2);
  }
  // chiyuv icon
  const ci = p.tags.has('chatan') ? '💍' : p.tags.has('barmitzvah') ? '🎉' : p.tags.has('yahrzeit') ? '🕯️' : p.tags.has('newFather') ? '👶' : null;
  if (ci && !isGabbai) { ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(ci, x - 12 * s, y - 2); }
}
const pick2 = (id, arr) => arr[id % arr.length];
function drawBubble(p) {
  const r = p.req; if (!r) return;
  const def = REQ_DEFS[r.type];
  const x = p.x, y = p.y - 44;
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#4a2e16'; ctx.lineWidth = 2;
  roundRect(x - 15, y - 15, 30, 28, 9, true, true);
  ctx.beginPath(); ctx.moveTo(x - 5, y + 13); ctx.lineTo(x, y + 20); ctx.lineTo(x + 5, y + 13); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
  ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(def.icon, x, y);
  ctx.textBaseline = 'alphabetic';
  if (r.type !== 'minyan' && r.max < 999) {
    const f = clamp(r.t / r.max, 0, 1);
    ctx.strokeStyle = f > 0.5 ? '#3f9b46' : f > 0.25 ? '#e0a020' : '#d33';
    ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + 16, y - 14, 6, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); ctx.stroke();
  }
}
function drawBimahAlerts() {
  const b = PLACES.bimah; let icon = null;
  if (G.mistake) icon = '⚠️'; else if (G.pasul) icon = '✋'; else if (G.wrongSpot) icon = '📜';
  else if (G.reading && G.reading.phase === 'needCall') icon = '🗣️';
  if (!icon) return;
  const pulse = 1 + Math.sin(G.t * 8) * 0.08;
  ctx.save(); ctx.translate(b.x + b.w / 2, b.y - 20); ctx.scale(pulse, pulse);
  ctx.fillStyle = G.reading && G.reading.waitT > 4 ? '#ffd9d4' : '#fff'; ctx.strokeStyle = '#b3261e'; ctx.lineWidth = 3;
  roundRect(-18, -16, 36, 30, 10, true, true);
  ctx.font = '18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(icon, 0, 0); ctx.textBaseline = 'alphabetic';
  ctx.restore();
  if (G.pasul && G.pasul.stage === 'aron') {
    ctx.save(); ctx.translate(480, 92 + Math.sin(G.t * 6) * 3); ctx.font = '20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('⬆️', 0, 0); ctx.restore();
  }
}
function drawHUD() {
  // stage banner
  const st = G.stage; if (!st) return;
  let text = st.name, sub = '';
  if (G.waiting) sub = '⏳ WAITING FOR: ' + G.waiting.join(', ');
  else if (st.type === 'reading' && G.reading) {
    const s = currentCallSlot();
    if (G.wrongSpot) sub = '📜 Torah at the wrong spot! Roll it at the bimah';
    else if (G.pasul) sub = G.pasul.stage === 'aron' ? '✋ PASUL! Get another Torah from the Aron' : '📜 Bring the Torah to the bimah';
    else if (G.reading.phase === 'needCall') sub = `🗣️ Call up: ${s ? slotLabel(s) : ''}${atBimah() ? '' : ' (go to the bimah!)'}`;
    else if (G.reading.phase === 'goingUp') sub = `${G.reading.oleh.name} is walking up for ${s.label}`;
    else sub = `${s.label}: ${G.reading.oleh.name}`;
  }
  ctx.fillStyle = 'rgba(31,58,104,.88)'; roundRect(330, 120, 300, sub ? 40 : 24, 8, true);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Georgia'; ctx.textAlign = 'center'; ctx.fillText(text, 480, 137);
  if (sub) { ctx.font = 'bold 11.5px sans-serif'; ctx.fillStyle = G.waiting || (G.reading && G.reading.waitT > 4) ? '#ffb3a6' : '#ffe8a0'; ctx.fillText(sub.length > 52 ? sub.slice(0, 51) + '…' : sub, 480, 153); }
  // progress bar for timed stages
  if (!G.waiting && st.type !== 'reading') {
    const f = clamp(G.stageT / stageDur(st), 0, 1);
    ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(340, sub ? 157 : 141, 280, 3);
    ctx.fillStyle = '#d9a520'; ctx.fillRect(340, sub ? 157 : 141, 280 * f, 3);
  }
  // candy timing indicator
  if (G.candy) {
    const c = G.candy;
    ctx.fillStyle = c.phase === 'window' ? 'rgba(255,79,184,.92)' : 'rgba(80,40,70,.8)';
    roundRect(360, 166, 240, 22, 8, true);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif';
    ctx.fillText(c.phase === 'window' ? `🍬 SIGNAL CANDY NOW! ${c.t.toFixed(1)}s` : '🍬 Candy moment coming… wait for the last bracha', 480, 181);
  }
}
function drawHover() {
  const h = ui.hover; if (!h) return;
  if (h.kind === 'person') {
    const p = h.ref;
    const tags = [...p.tags].filter(t => TAG_INFO[t] && !['kohen', 'levi'].includes(t)).map(t => TAG_INFO[t].icon).join(' ');
    const tribe = p.kid ? 'Kid' : p.tribe === 'kohen' ? 'Kohen' : p.tribe === 'levi' ? 'Levi' : 'Yisrael';
    const hon = slotsOf(p).map(s => s.label).join(', ');
    const lines = [p.name, `${tribe} ${tags}`]; if (hon) lines.push('📋 ' + hon);
    ctx.font = 'bold 12px sans-serif';
    const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 16;
    let x = clamp(p.x - w / 2, 34, 896 - w), y = p.y - 66 - lines.length * 15;
    if (p.req) y -= 18;
    if (y < 52) y = p.y + 20;
    ctx.fillStyle = 'rgba(30,20,10,.88)'; roundRect(x, y, w, lines.length * 15 + 8, 6, true);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
    lines.forEach((l, i) => { ctx.font = (i === 0 ? 'bold ' : '') + '12px sans-serif'; ctx.fillText(l, x + 8, y + 16 + i * 15); });
  } else if (h.kind === 'place') {
    const pl = PLACES[h.ref];
    ctx.fillStyle = 'rgba(30,20,10,.8)'; ctx.font = 'bold 12px sans-serif';
    const w = ctx.measureText(pl.label).width + 14;
    roundRect(pl.x + pl.w / 2 - w / 2, pl.y + pl.h + 4, w, 20, 5, true);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(pl.label, pl.x + pl.w / 2, pl.y + pl.h + 18);
  }
}
function render() {
  ctx.clearRect(0, 0, W, H);
  drawShul();
  if (!G) return;
  // highlight hovered place
  if (ui.hover && ui.hover.kind === 'place') { const pl = PLACES[ui.hover.ref]; ctx.strokeStyle = 'rgba(255,240,150,.9)'; ctx.lineWidth = 3; roundRect(pl.x - 3, pl.y - 3, pl.w + 6, pl.h + 6, 8, false, true); }
  // baal koreh during torah service
  const rIdx = stageIndexOfType('reading');
  if (G.stageIdx >= rIdx - 1 && (G.stageIdx <= rIdx || (G.stage && G.stage.type === 'haftarah')))
    drawPerson({ x: SPOT.baalKoreh.x, y: SPOT.baalKoreh.y, kid: false, hasTallit: true, tags: new Set(), id: 3, skin: '#e8b88f', beard: '#3b2a1a', hat: false, path: [] });
  // entities sorted by y
  const ents = G.people.filter(p => p.state !== 'offstage' && p.state !== 'gone').map(p => ({ y: p.y, p }));
  ents.push({ y: G.gabbai.y, g: true });
  ents.sort((a, b) => a.y - b.y);
  for (const e of ents) {
    if (e.g) drawGabbai();
    else {
      const p = e.p;
      if (ui.hover && ui.hover.ref === p) { ctx.fillStyle = 'rgba(255,240,120,.45)'; ctx.beginPath(); ctx.arc(p.x, p.y - 6, 20, 0, 7); ctx.fill(); }
      if (ui.popup && ui.popup.ref === p) { ctx.strokeStyle = '#d9a520'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y - 6, 21, 0, 7); ctx.stroke(); }
      drawPerson(p);
    }
  }
  for (const p of G.people) if (p.state !== 'offstage' && p.state !== 'gone') drawBubble(p);
  drawBimahAlerts();
  // gabbai target marker
  if (G.gabbai.path.length) { const t = G.gabbai.path[G.gabbai.path.length - 1]; ctx.strokeStyle = 'rgba(31,58,104,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(t.x, t.y + 6, 9, 4, 0, 0, 7); ctx.stroke(); }
  // particles
  for (const pt of G.particles) { ctx.fillStyle = pt.c; ctx.save(); ctx.translate(pt.x, pt.y); ctx.rotate(pt.t * 8); ctx.fillRect(-4, -2.5, 8, 5); ctx.fillStyle = '#fff6'; ctx.fillRect(-1, -2.5, 2, 5); ctx.restore(); }
  for (const f of G.floaters) { ctx.globalAlpha = clamp(f.t, 0, 1); ctx.fillStyle = f.color; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeText(f.text, f.x, f.y); ctx.fillText(f.text, f.x, f.y); ctx.globalAlpha = 1; }
  drawHUD();
  drawHover();
}
function drawGabbai() {
  const g = G.gabbai;
  ctx.fillStyle = 'rgba(217,165,32,.35)'; ctx.beginPath(); ctx.ellipse(g.x, g.y + 8, 18, 7, 0, 0, 7); ctx.fill();
  drawPerson({ x: g.x, y: g.y, path: g.path, bob: g.bob, kid: false, tags: new Set(), id: 0, skin: '#f1c9a5', beard: '#5a3d22' }, true);
  ctx.fillStyle = '#1f3a68'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('GABBAI', g.x, g.y + 22);
  if (g.carrying) {
    const icon = { torah: '📜' }[g.carrying];
    ctx.font = '18px sans-serif'; ctx.fillText(icon, g.x + 16, g.y - 22);
  }
}
function roundRect(x, y, w, h, r, fill, stroke) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  if (fill) ctx.fill(); if (stroke) ctx.stroke();
}
function star(cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 - Math.PI / 2; ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  ctx.closePath(); ctx.globalAlpha = .5; ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
}
function crown(x, y) {
  ctx.fillStyle = '#d9a520'; ctx.beginPath();
  ctx.moveTo(x - 14, y + 6); ctx.lineTo(x - 14, y - 4); ctx.lineTo(x - 7, y + 1); ctx.lineTo(x, y - 8); ctx.lineTo(x + 7, y + 1); ctx.lineTo(x + 14, y - 4); ctx.lineTo(x + 14, y + 6); ctx.closePath(); ctx.fill();
}
function label(text, x, y) { ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(40,25,10,.85)'; ctx.fillText(text, x, y); }

// ============================================================
// POPUPS (HTML)
// ============================================================
function closePopup() { ui.popup = null; $('popup').classList.add('hidden'); }
function positionPopup(x, y) {
  const pop = $('popup');
  pop.classList.remove('hidden');
  const w = 300, h = pop.offsetHeight || 300;
  let px = x + 30, py = y - h / 2;
  if (px + w > 950) px = x - w - 30;
  px = clamp(px, 6, 950 - w); py = clamp(py, 6, 714 - h);
  pop.style.left = px + 'px'; pop.style.top = py + 'px';
}
function refreshPopup() {
  if (!ui.popup) return;
  if (ui.popup.kind === 'person') openPersonCard(ui.popup.ref, true);
  else openPlacePopup(ui.popup.ref, true);
}
function tribeBadge(p) {
  const t = p.kid ? 'yisrael' : p.tribe;
  return el('span', { class: 'badge ' + t }, p.kid ? '🧒' : t === 'kohen' ? 'K' : t === 'levi' ? 'L' : 'Y');
}
function openPersonCard(p, refresh) {
  ui.popup = { kind: 'person', ref: p };
  const pop = $('popup'); pop.innerHTML = '';
  pop.append(el('button', { class: 'close', onclick: closePopup }, '✕'));
  pop.append(el('h3', null, tribeBadge(p), p.name));
  const tags = el('div', { class: 'tags' });
  tags.append(el('span', { class: 'tag ' + (p.kid ? '' : p.tribe) }, p.kid ? 'Under bar mitzvah' : p.tribe === 'kohen' ? 'Kohen' : p.tribe === 'levi' ? 'Levi' : 'Yisrael'));
  for (const t of p.tags) if (TAG_INFO[t] && t !== 'kid') tags.append(el('span', { class: 'tag' + (['yahrzeit', 'barmitzvah', 'chatan', 'newFather', 'aveil', 'badBack'].includes(t) ? ' chiyuv' : '') }, TAG_INFO[t].icon + ' ' + TAG_INFO[t].label));
  pop.append(tags);
  if (p.wants.length) {
    const wd = el('div', { class: 'wants' });
    for (const w of p.wants) wd.append(el('div', null, (w.done ? '✅ ' : '⬜ ') + 'Hoping for: ' + WANT_LABEL[w.w]));
    pop.append(wd);
  }
  // request
  if (p.req) {
    const r = p.req, def = REQ_DEFS[r.type];
    const box = el('div', { class: 'req' }, el('div', null, def.icon + ' ' + (r.type === 'chiyuv' ? r.data.news.text : def.text)));
    if (r.type === 'leaving') { }
    else if (r.type === 'seat' && r.data.isGuestSide) box.append(el('div', { class: 'btns' }, el('button', { class: 'go', onclick: () => doRequestAction(personById(r.data.regular) || p) }, def.action)));
    else if (def.action) {
      box.append(el('div', { class: 'btns' }, el('button', { class: 'go', onclick: () => doRequestAction(p) }, def.action)));
    }
    pop.append(box);
  }
  if (p.door) { positionPopup(p.x, p.y); return; }
  // current honors
  const mine = slotsOf(p);
  if (mine.length) {
    const sec = el('div', { class: 'sec' }, el('div', { class: 'sec-t' }, 'Assigned to'));
    for (const s of mine) {
      const row = el('div', { class: 'btns' }, el('span', { class: 'note' }, (s.done ? '✔ ' : '📋 ') + s.label));
      if (!s.done) row.append(el('button', { onclick: () => { unassign(s); } }, 'Unassign'));
      sec.append(row);
    }
    pop.append(sec);
  }
  // honor options
  const open = G.slots.filter(s => !s.done && s.assignee !== p.id && !(G.reading && currentCallSlot() === s && G.reading.phase !== 'needCall'));
  if (open.length && present(p)) {
    const groups = {};
    for (const s of open) (groups[s.group] = groups[s.group] || []).push(s);
    const sec = el('div', { class: 'sec' }, el('div', { class: 'sec-t' }, 'Give an honor'));
    for (const g of ['Amud', 'Aliyot', 'Torah']) {
      if (!groups[g]) continue;
      const btns = el('div', { class: 'btns' });
      for (const s of groups[g]) {
        const err = G.L.hints ? validate(s, p) : null;
        const taken = s.assignee && personById(s.assignee);
        const b = el('button', { class: err ? 'bad' : '', title: err || (taken ? `Currently: ${taken.name}` : '') }, slotLabel(s) + (taken ? ' ↺' : ''));
        b.addEventListener('click', () => { assign(s, p); });
        btns.append(b);
      }
      sec.append(btns);
    }
    if (G.L.hints) sec.append(el('div', { class: 'tiny' }, 'Red = against the rules (hover to see why). ↺ = replaces whoever is assigned now.'));
    pop.append(sec);
  }
  if (!refresh) Sound.click();
  positionPopup(p.x, p.y);
}
function openPlacePopup(key, refresh) {
  ui.popup = { kind: 'place', ref: key };
  const pop = $('popup'); pop.innerHTML = '';
  pop.append(el('button', { class: 'close', onclick: closePopup }, '✕'));
  const pl = PLACES[key];
  pop.append(el('h3', null, pl.label));
  const g = G.gabbai;
  if (false) {
  } else if (key === 'aron') {
    if (G.pasul && G.pasul.stage === 'aron') pop.append(el('div', { class: 'btns' }, el('button', { class: 'go', onclick: takeTorahFromAron }, '📜 Take out another Sefer Torah')));
    else pop.append(el('div', { class: 'note' }, 'The Aron Kodesh. Whoever gets petichah opens it during Hotza\'at HaTorah.'));
  } else if (key === 'amud') {
    pop.append(el('div', { class: 'note' }, 'The chazan leads from here. Assign chazzanim from the people themselves.'));
  } else if (key === 'door') {
    pop.append(el('div', { class: 'note' }, 'People come and go. Mostly go, right before Aleinu.'));
  } else if (key === 'bimah') buildBimahPopup(pop);
  if (!refresh) Sound.click();
  positionPopup(pl.spot.x, pl.spot.y - 60);
}
function buildBimahPopup(pop) {
  const R = G.reading;
  if (G.mistake) pop.append(el('div', { class: 'req' }, el('div', null, '⚠️ The baal koreh misread a word!'), el('div', { class: 'btns' }, el('button', { class: 'go', onclick: correctReader }, '✋ Correct him!'))));
  if (G.pasul) {
    if (G.gabbai.carrying === 'torah') pop.append(el('div', { class: 'btns' }, el('button', { class: 'go', onclick: placeNewTorah }, '📜 Place the new Sefer Torah')));
    else pop.append(el('div', { class: 'req' }, '✋ The Torah is pasul. Go to the ARON KODESH and take out another one.'));
  }
  if (G.wrongSpot) {
    const ws = G.wrongSpot;
    pop.append(el('div', { class: 'req' }, el('div', null, `📜 The Torah is open at ${PARSHIYOT[Math.round(ws.pos)]}. We need ${PARSHIYOT[ws.target]}.`), el('div', { class: 'btns' }, el('button', { class: 'go', onclick: openScrollGame }, '🔄 Roll the Torah'))));
  }
  if (!R) {
    pop.append(el('div', { class: 'note' }, 'The bimah. During Kriyat HaTorah, stand here to call each person up.'));
    if (G.L.shabbat && G.hosafot < 3 && stageIndexOfType('reading') >= G.stageIdx) pop.append(el('div', { class: 'btns' }, el('button', { onclick: addHosafa }, '➕ Add a hosafa (extra aliyah)')));
    return;
  }
  const slot = currentCallSlot();
  if (!slot) return;
  if (R.phase !== 'needCall') {
    pop.append(el('div', { class: 'note' }, R.oleh ? `${slot.label}: ${R.oleh.name} ${R.phase === 'goingUp' ? 'is on his way up' : 'is up now'}.` : ''));
  } else if (!G.wrongSpot) {
    const sec = el('div', { class: 'sec' }, el('div', { class: 'sec-t' }, 'Now calling: ' + slotLabel(slot)));
    const ap = slot.assignee && personById(slot.assignee);
    if (ap) {
      if (present(ap) && !ap.busy) sec.append(el('div', { class: 'btns' }, el('button', { class: 'go big', onclick: () => callUp(ap) }, `🗣️ Call up ${ap.name}`)));
      else sec.append(el('div', { class: 'hint' }, `${ap.name} is ${ap.state === 'gone' ? 'GONE' : !present(ap) ? 'not here yet' : 'busy'}! Call someone else.`));
    } else sec.append(el('div', { class: 'hint' }, 'Nobody is assigned! Pick someone now:'));
    const list = el('div', { class: 'call-list' });
    const cands = G.people.filter(p => present(p) && !p.busy && p.id !== slot.assignee && !p.door)
      .sort((a, b) => chiyuvRank(b) - chiyuvRank(a) || (a.kid - b.kid));
    for (const p of cands.slice(0, 40)) {
      const err = G.L.hints ? validate(slot, p) : null;
      const tg = [...p.tags].filter(t => TAG_INFO[t] && t !== 'kid').map(t => TAG_INFO[t].icon).join('');
      const had = p.honors.length ? ' · had: ' + p.honors.map(id => (slotById(id) || {}).label).join(', ') : '';
      const b = el('button', { class: err ? 'bad' : '', title: err || '' }, tribeBadge(p), ` ${p.name} ${tg}`, el('span', { class: 'tiny' }, had));
      b.addEventListener('click', () => callUp(p));
      list.append(b);
    }
    sec.append(el('div', { class: 'tiny' }, ap ? 'Or call someone else instead:' : ''), list);
    pop.append(sec);
  }
  if (G.L.shabbat && G.hosafot < 3 && R.calls.indexOf('shevii') >= R.idx) pop.append(el('div', { class: 'btns', style: 'margin-top:6px' }, el('button', { onclick: addHosafa }, '➕ Add a hosafa (extra aliyah)')));
}

// ============================================================
// PANEL
// ============================================================
let panelSig = '';
function renderPanel() {
  if (!G) return;
  if ($('p-level').dataset.lv !== G.L.id + '-' + G.pace) { $('p-level').dataset.lv = G.L.id + '-' + G.pace; $('p-level').innerHTML = `Level ${G.L.id} · ${G.L.title}<div class="p-pace" title="Chazan Speed: ${PACES[G.pace].name}">${chazanScale(PACES[G.pace].chazans, 13)}</div>`; }
  const st = G.stage;
  $('p-stage').innerHTML = st ? (G.waiting ? `<span class="wait">⏳ ${st.name}: waiting for ${G.waiting.join(', ')}</span>` : `Now: <b>${st.name}</b>`) : '';
  $('p-shalom-fill').style.width = G.shalom + '%';
  $('p-shalom-num').textContent = Math.round(G.shalom);
  $('p-score').textContent = Math.round(G.score);
  $('p-time').textContent = fmtTime(G.t);
  const cb = $('btn-candy');
  cb.classList.toggle('hidden', !G.L.candy);
  cb.classList.toggle('hot', !!(G.candy && G.candy.phase === 'window'));
  const R = G.reading;
  const sig = JSON.stringify([firstAliyahIsKohen(), presence(null).leviim.length, G.stageIdx, !!G.waiting, G.slots.map(s => [s.id, s.assignee, s.done]), R && [R.idx, R.phase], G.misheberach.length, G.announcements.length, G.gabbai.carrying, G.hosafot]);
  if (sig === panelSig) return;
  panelSig = sig;
  // timeline
  const tl = $('p-timeline'); tl.innerHTML = '';
  G.stages.forEach((s, i) => {
    let cls = 'tl' + (i < G.stageIdx ? ' done' : i === G.stageIdx ? ' now' : '');
    if (i >= G.stageIdx && (s.needs || []).some(n => n !== 'minyan' && !(slotById(n) || {}).assignee)) cls += ' need';
    tl.append(el('span', { class: cls, title: s.needs ? 'Needs: ' + s.needs.map(n => n === 'minyan' ? 'minyan' : slotById(n).label).join(', ') : '' }, s.name));
  });
  // slots
  const box = $('p-slots'); box.innerHTML = '';
  const nowSlot = R && currentCallSlot();
  const rIdx = stageIndexOfType('reading');
  for (const s of G.slots) {
    const p = s.assignee != null && s.assignee !== -1 ? personById(s.assignee) : null;
    let urgent = false;
    if (!p && !s.done) {
      if (s.kind === 'chazan') { const si = G.stages.findIndex(x => (x.needs || []).includes(s.id)); urgent = si - G.stageIdx <= 1; }
      else if (s.kind === 'maftir') urgent = G.stageIdx >= rIdx - 2;
      else urgent = G.stageIdx >= rIdx - 1;
    }
    const row = el('div', { class: 'slot' + (s.done ? ' done' : '') + (nowSlot === s ? ' now' : '') + (urgent ? ' urgent' : '') });
    row.append(el('span', { class: 'sl', title: slotLabel(s) }, slotLabel(s)));
    row.append(el('span', { class: 'sn' + (p ? '' : ' empty') }, s.done && s.doneBy === -1 ? '(gabbai did it)' : p ? p.name + (present(p) ? '' : p.state === 'gone' ? ' (left!)' : ' (not here)') : '—'));
    if (!s.done && p) row.append(el('button', { class: 'x', title: 'Unassign', onclick: () => unassign(s) }, '✕'));
    if (!s.done && s.hosafa && !p) row.append(el('button', { class: 'x', title: 'Remove hosafa', onclick: () => removeHosafa(s) }, '🗑'));
    box.append(row);
  }
  if (G.L.shabbat && G.hosafot < 3 && (!R || R.calls.indexOf('shevii') >= R.idx) && G.stageIdx <= rIdx) {
    box.append(el('div', { class: 'slot add' }, el('button', { onclick: addHosafa }, '➕ Add hosafa (extra aliyah)')));
  }
  const ex = $('p-extra');
  ex.innerHTML = `${G.gabbai.carrying === 'torah' ? '🤲 Carrying: <b>📜 a Sefer Torah</b><br>' : ''}🙏 Mi Shebeirach list: <b>${G.misheberach.length}</b> &nbsp; 📣 Announcements: <b>${G.announcements.length}</b>`;
}

// ============================================================
// SCREENS
// ============================================================
function showScreen(id) {
  for (const s of ['screen-menu', 'screen-intro', 'screen-results', 'screen-help', 'screen-pause']) $(s).classList.toggle('hidden', s !== id);
}
function starsHtml(n, cls = '') { let s = ''; for (let i = 1; i <= 3; i++) s += i <= n ? '★' : `<span class="off">★</span>`; return s; }
function showMenu() {
  G = null; ui.screen = 'menu'; closePopup(); closeScrollGame();
  $('toasts').innerHTML = '';
  const box = $('level-cards'); box.innerHTML = '';
  const unlockAll = $('chk-unlock').checked;
  LEVELS.forEach((L, i) => {
    const locked = !unlockAll && L.id > progress.unlocked;
    const c = el('div', { class: 'lcard' + (locked ? ' locked' : '') });
    c.innerHTML = `${locked ? '<span class="lock">🔒</span>' : ''}<div class="num">LEVEL ${L.id}</div><div class="t">${L.title}</div><div class="s">${L.subtitle}</div><div class="spd">Complexity ${'●'.repeat(L.id)}${'○'.repeat(LEVELS.length - L.id)}</div><div class="stars">${starsHtml(progress.stars[L.id] || 0)}</div>`;
    c.addEventListener('click', () => { if (!locked) { Sound.init(); Sound.click(); showIntro(i); } });
    box.append(c);
  });
  renderPacePicker();
  showScreen('screen-menu');
}
function renderPacePicker() {
  const box = $('pace-picker'); box.innerHTML = '';
  box.append(el('div', { class: 'pace-title' }, 'Chazan Speed'));
  const row = el('div', { class: 'pace-row' });
  PACES.forEach((P, i) => {
    const locked = i > progress.maxPace && !$('chk-unlock').checked;
    const b = el('button', { class: 'pace' + (i === progress.pace ? ' on' : '') + (locked ? ' locked' : ''), title: locked ? 'Win a level to unlock' : P.blurb, disabled: locked });
    b.innerHTML = `<span class="pc">${chazanScale(P.chazans, 24)}</span><span class="pn">${P.name}</span>${locked ? '<span class="pl">🔒</span>' : ''}`;
    b.addEventListener('click', () => { progress.pace = i; saveProgress(); Sound.init(); Sound.click(); renderPacePicker(); });
    row.append(b);
  });
  box.append(row, el('div', { class: 'pace-note' }, `${PACES[progress.pace].blurb} Every win adds a chazan.`));
}
function showIntro(i) {
  const L = LEVELS[i];
  ui.screen = 'intro';
  const order = L.stages.map(s => s.name).join(' → ');
  const slots = L.slots.map(id => (L.slotLabels && L.slotLabels[id]) || SLOT_DEFS[id].label);
  $('intro-content').innerHTML = `
    <div class="tiny intro-pace">LEVEL ${L.id} · Chazan Speed ${chazanScale(PACES[progress.pace].chazans, 14)} ${PACES[progress.pace].name}</div>
    <h1>${L.title}</h1>
    <div class="sub">${L.blurb}</div>
    <b>What's new:</b>
    <ul>${L.news.map(n => `<li>${n}</li>`).join('')}</ul>
    <b>Service order:</b><div class="order">${order}</div>
    <b>Honors to hand out:</b><div class="slots-preview">${slots.map(s => `<span>${s}</span>`).join('')}${L.shabbat ? '<span>+ optional hosafot</span>' : ''}</div>
    <div class="row"><button class="big go" id="btn-start">Start the Davening ▶</button><button id="btn-back">Back</button></div>`;
  $('btn-start').onclick = () => startLevel(i);
  $('btn-back').onclick = showMenu;
  showScreen('screen-intro');
}
function startLevel(i) {
  Sound.init();
  $('toasts').innerHTML = '';
  panelSig = '';
  newGame(i);
  ui.screen = 'playing';
  showScreen(null);
  if (G.L.hints) tip('start', 'Welcome, gabbai! Hover over people to see who they are. CLICK someone to walk over and ask him. First job: find a chazan (🎤).');
  else toast(`📋 ${G.L.title}: fill the Clipboard before each part of the service. Good luck!`, 'tip');
}
function showResults(r) {
  ui.screen = 'results';
  const L = G.L;
  const verdict = r.fired ? '🔥 The shul board called an emergency meeting. You\'ve been replaced as gabbai.'
    : r.stars === 3 ? 'Yasher koach! A legendary gabbai. They\'re naming the kiddush herring after you.'
      : r.stars === 2 ? 'Well done! A smooth davening with a few bumps.'
        : r.stars === 1 ? 'You got through it. There will be some talk at kiddush.'
          : 'Oy. The shul is in an uproar. Try again!';
  const done = G.slots.filter(s => s.done && s.doneBy > 0);
  const errs = G.errors.slice(0, 30);
  const next = LEVELS[G.levelIdx + 1];
  $('results-content').innerHTML = `
    <h2 style="text-align:center">${L.title}: ${r.fired ? 'Fired!' : 'Service complete'}</h2>
    <div class="big-stars">${starsHtml(r.stars)}</div>
    <div class="verdict">${verdict}</div>
    <div class="stats">
      <span>☮ Final Shalom: <b>${r.shalom}</b></span>
      <span>⭐ Score: <b>${Math.round(G.score)}</b>${G.timeBonus ? ` <span class="tiny">(+${G.timeBonus} time bonus)</span>` : ''}</span>
      <span>⏱ ${fmtTime(G.t)}</span>
      <span>🫡 Requests: <b class="ok">${G.reqHandled}</b> / <b class="no">${G.reqMissed}</b> missed</span>
    </div>
    <div class="cols">
      <div class="col"><h3>📋 Honors given</h3><ul>${done.map(s => { const p = personById(s.doneBy); return `<li>${s.label}: ${p ? p.name : '?'}</li>`; }).join('') || '<li>none</li>'}</ul>
        ${r.unmet.length ? `<h3>😞 Disappointed</h3><ul>${r.unmet.map(u => `<li class="no">${u.p.name} wanted ${WANT_LABEL[u.w].toLowerCase()} (−${u.weight})</li>`).join('')}</ul>` : r.fired ? '' : '<h3 class="ok">Every chiyuv was honored!</h3>'}
      </div>
      <div class="col"><h3>❌ Mistakes (and the halacha)</h3><ul>${errs.map(e => `<li>${e}</li>`).join('') || '<li class="ok">No mistakes! 👏</li>'}</ul></div>
    </div>
    <div class="row">
      <button class="big" id="r-retry">↻ Try Again</button>
      ${next && r.stars > 0 ? `<button class="big go" id="r-next">Next: ${next.title} ▶</button>` : ''}
      <button id="r-menu">Menu</button>
    </div>
    ${G.pacedUp ? `<p class="paceup">⏩ Chazan Speed up! Next time: ${chazanScale(PACES[progress.pace].chazans, 16)} <b>${PACES[progress.pace].name}</b>. ${PACES[progress.pace].blurb}</p>` : ''}
    ${!next && r.stars > 0 ? '<p style="text-align:center"><b>🏆 You finished every level! You are a true Gabbai Rishon.</b></p>' : ''}`;
  $('r-retry').onclick = () => showIntro(G.levelIdx);
  if ($('r-next')) $('r-next').onclick = () => showIntro(G.levelIdx + 1);
  $('r-menu').onclick = showMenu;
  showScreen('screen-results');
}
function showHelp(which) {
  const back = ui.screen === 'playing' ? 'Resume' : 'Back';
  const howto = `
  <h2>How to Play</h2>
  <p>You're the <b>gabbai</b>. The service moves along by itself. Your job is to make sure every part of it has the right people, and that the congregation stays happy (<b>☮ Shalom</b>).</p>
  <h3>🖱️ Controls</h3>
  <ul>
    <li><b>Hover</b> over a person to see his name, tribe (gold <b>K</b> = Kohen, blue <b>L</b> = Levi) and why he's here today.</li>
    <li><b>Click</b> a person: the gabbai walks over and opens his card. Give him an honor, or handle his request bubble.</li>
    <li><b>Click places:</b> the bimah (call aliyot, add hosafot, roll the Torah) and the Aron Kodesh.</li>
    <li>The <b>Clipboard</b> on the right shows every honor and who you've asked. ✕ unassigns.</li>
    <li><b>Esc</b> closes a card · <b>P</b> pauses · <b>C</b> signals candy.</li>
  </ul>
  <h3>⏳ The service waits for you</h3>
  <ul>
    <li>No chazan (or no minyan) = nobody starts, and Shalom drains while everyone waits.</li>
    <li>During Kriyat HaTorah you must <b>stand at the bimah</b> to call each aliyah. The baal koreh waits, and so does everyone else.</li>
    <li>Assign <b>Maftir</b> before the Torah comes out, so he can prepare the haftarah (unless he's marked 📜).</li>
  </ul>
  <h3>🙋 Bubbles</h3>
  <table><tr><th>Bubble</th><th>What to do</th></tr>
    <tr><td>🙋 News</td><td>Someone has news: a yahrzeit, a new baby, a visit, a bad back, a mourner who wants the amud. Listen, then rethink the Clipboard</td></tr>
    <tr><td>🙏 Mi Shebeirach</td><td>Add the name before the reading ends</td></tr>
    <tr><td>🍷 Kiddush</td><td>Add it to the announcements</td></tr>
    <tr><td>💺 Seat fight</td><td>Move the guest</td></tr>
    <tr><td>🍬 Early candy</td><td>Stop the kid!</td></tr>
  </table>
  <h3>🎤 Chazan Speed</h3>
  <p>The whole service runs at a speed of one, two or three chazans. You start with one (Leisurely). Every win adds a chazan, up to three (Lightning). You can always pick a slower speed on the menu.</p>
  <h3>⭐ Stars</h3>
  <p>Your stars come from your final Shalom: ★ 40+, ★★ 65+, ★★★ 85+. Disappointed chiyuvim (yahrzeit, bar mitzvah, chatan, new father, guests) cost Shalom at the end. If Shalom hits 0, you're fired.</p>`;
  const cheat = `
  <h2>Halacha Cheat Sheet</h2>
  <table>
   <tr><th>Honor</th><th>Who can get it</th></tr>
   <tr><td>Kohen (1st aliyah)</td><td>A Kohen. If no Kohen is present, a Yisrael is called up <b>"bimkom Kohen"</b> (the Rema allows a Levi too). (SA 135:6)</td></tr>
   <tr><td>Levi (2nd aliyah)</td><td>A Levi. <b>If no Levi is present, the same Kohen gets it again</b>, not a different Kohen. (SA 135:8)<br><b>If there was no Kohen, NO Levi may go up second</b>, or people would think the first was a Kohen. The second aliyah goes to a Yisrael. (SA 135:6)</td></tr>
   <tr><td>Shlishi to Shevi'i</td><td>Yisraelim only. Never a Kohen or a Levi.</td></tr>
   <tr><td>Maftir / Hosafot</td><td>Anyone, including Kohanim and Leviim. Maftir needs to know (or prepare) the haftarah.</td></tr>
   <tr><td>Hagbah</td><td>A strong adult. Not the elderly.</td></tr>
   <tr><td>Gelilah, Petichah</td><td>Anyone. Great for kids!</td></tr>
   <tr><td>Chazan</td><td>An adult who knows the nusach (🎤).</td></tr>
  </table>
  <h3>Who gets priority (chiyuvim)</h3>
  <p>💍 Chatan (aufruf) → 🎉 Bar Mitzvah (gets Maftir) → 👶 New father → 🕯️ Yahrzeit (wants the amud and an aliyah) → 🧳 Guests and simcha family.</p>
  <h3>Other rules</h3>
  <ul>
   <li>One aliyah per person (except the Kohen taking the Levi aliyah).</li>
   <li>Kids under bar mitzvah don't count for a minyan, can't get aliyot, and can't lead.</li>
   <li>On Shabbat you may add <b>hosafot</b> (extra aliyot), but every one makes the service longer.</li>
   <li>With two Sifrei Torah (Shabbat Rosh Chodesh), the Maftir reads from the second Torah, rolled to Parshat Pinchas.</li>
   <li>Signal the 🍬 candy right after the final bracha: after the chatan's aliyah, or after the bar mitzvah boy's haftarah.</li>
  </ul>`;
  $('help-content').innerHTML = (which === 'cheat' ? cheat : which === 'both' ? howto + cheat : howto) + `<div class="row" style="margin-top:12px"><button class="big go" id="help-back">${back}</button></div>`;
  const wasPlaying = ui.screen === 'playing';
  if (wasPlaying) G.paused = true;
  showScreen('screen-help');
  $('help-back').onclick = () => {
    if (wasPlaying) { G.paused = false; showScreen(null); } else showMenu();
  };
}
function togglePause() {
  if (!G || G.over || ui.screen !== 'playing') return;
  G.paused = !G.paused;
  showScreen(G.paused ? 'screen-pause' : null);
}

// ============================================================
// INPUT
// ============================================================
function canvasPos(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
}
function hitTest(pt) {
  let best = null, bd = 18;
  for (const p of G.people) {
    if (p.state === 'offstage' || p.state === 'gone') continue;
    const d = Math.hypot(pt.x - p.x, pt.y - (p.y - 8));
    if (d < bd) { bd = d; best = p; }
  }
  if (best) return { kind: 'person', ref: best };
  for (const k in PLACES) { if (k === 'shelf' || k === 'rack') continue; const pl = PLACES[k]; if (pt.x >= pl.x && pt.x <= pl.x + pl.w && pt.y >= pl.y && pt.y <= pl.y + pl.h) return { kind: 'place', ref: k }; }
  return null;
}
canvas.addEventListener('mousemove', e => {
  if (!G || ui.screen !== 'playing') return;
  ui.mouse = canvasPos(e); ui.hover = hitTest(ui.mouse);
});
canvas.addEventListener('mouseleave', () => { ui.hover = null; });
canvas.addEventListener('click', e => {
  if (!G || G.over || G.paused || ui.screen !== 'playing') return;
  Sound.init();
  const pt = canvasPos(e), h = hitTest(pt);
  if (h && h.kind === 'person') setGabbaiTarget({ type: 'person', ref: h.ref });
  else if (h && h.kind === 'place') setGabbaiTarget({ type: 'place', ref: h.ref });
  else setGabbaiTarget({ type: 'point', ref: pt });
});
window.addEventListener('keydown', e => {
  if (Scroll.open) {
    if (e.key === 'ArrowLeft') { Scroll.held = 1; e.preventDefault(); }
    if (e.key === 'ArrowRight') { Scroll.held = -1; e.preventDefault(); }
    if (e.key === ' ' || e.key === 'Enter') { scrollHere(); e.preventDefault(); }
    if (e.key === 'Escape') closeScrollGame();
    return;
  }
  if (e.key === 'Escape') closePopup();
  if (e.key === 'p' || e.key === 'P') togglePause();
  if ((e.key === 'c' || e.key === 'C') && G && G.L.candy && ui.screen === 'playing' && !G.paused) signalCandy();
});
window.addEventListener('keyup', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') Scroll.held = 0; });
function holdBtn(id, dir) {
  const b = $(id);
  const on = e => { e.preventDefault(); Scroll.held = dir; }, off = () => { Scroll.held = 0; };
  b.addEventListener('mousedown', on); b.addEventListener('touchstart', on);
  b.addEventListener('mouseup', off); b.addEventListener('mouseleave', off); b.addEventListener('touchend', off);
}
holdBtn('scroll-left', 1); holdBtn('scroll-right', -1);
$('scroll-here').onclick = scrollHere;
$('scroll-close').onclick = closeScrollGame;
$('btn-candy').onclick = signalCandy;
$('btn-pause').onclick = togglePause;
$('btn-resume').onclick = togglePause;
$('btn-quit').onclick = () => { showMenu(); };
$('btn-help').onclick = () => showHelp('both');
$('btn-howto').onclick = () => showHelp('howto');
$('btn-cheat').onclick = () => showHelp('cheat');
$('btn-mute').onclick = () => { Sound.muted = !Sound.muted; $('btn-mute').textContent = Sound.muted ? '🔇' : '🔊'; };
$('chk-unlock').onchange = showMenu;

// ---------- scaling ----------
function fit() {
  const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
  const app = $('app');
  app.style.transform = `scale(${s})`;
  app.style.left = ((window.innerWidth - 1280 * s) / 2) + 'px';
  app.style.top = ((window.innerHeight - 720 * s) / 2) + 'px';
}
window.addEventListener('resize', fit); fit();

// ---------- loop ----------
let lastT = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  try {
    update(dt);
    render();
    if (G && ui.screen === 'playing') renderPanel();
  } catch (err) { console.error(err); }
  requestAnimationFrame(frame);
}
showMenu();
requestAnimationFrame(frame);

// debug hook for testing
window.__gabbai = {
  get G() { return G; }, get progress() { return progress; }, ui, closePopup, LEVELS, startLevel, finishLevel, callUp, assign, slotById, personById, signalCandy,
  fireScheduled, slotLabel, presence, doRequestAction, openScrollGame, scrollHere, correctReader, takeTorahFromAron, placeNewTorah, addHosafa, validate, setGabbaiTarget,
  step(sec) { for (let i = 0; i < sec * 30 && G && !G.over; i++) update(1 / 30); render(); renderPanel(); },
};
