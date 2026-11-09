// Test bot: paste into the console (or inject) to auto-play a level and report results.
// Usage: await botPlay(levelIdx, {sloppy:false})
window.botPlay = async function (levelIdx, opts = {}) {
  const H = window.__gabbai;
  H.startLevel(levelIdx);
  const G = () => H.G;
  const log = [];
  const g = () => G().gabbai;
  const tp = (x, y) => { g().x = x; g().y = y; g().path = []; g().target = null; };
  const present = p => p && !['offstage', 'gone', 'leaving', 'door'].includes(p.state);
  function bestFor(slot) {
    const ppl = G().people.filter(p => present(p) && !p.busy);
    const free = ppl.filter(p => !G().slots.some(s => s.assignee === p.id && !s.done && s !== slot) && !p.honors.some(h => ['kohen','levi','shlishi','revii','chamishi','shishi','shevii','maftir'].includes(h) || h.startsWith('hosafa')));
    let ok = free.filter(p => !H.validate(slot, p));
    if (slot.rule === 'levi' && !ok.length) { const k = G().slots.find(x => x.id === 'kohen'); const kp = k && H.personById(k.doneBy || k.assignee); if (kp && present(kp)) ok = [kp]; }
    const want = ok.filter(p => p.wants.some(w => !w.done && (
      w.w === 'honor' || (w.w === 'amud' && slot.kind === 'chazan') || (w.w === 'aliyah' && (['aliyah','maftir'].includes(slot.kind))) ||
      (w.w === 'maftir' && slot.kind === 'maftir') || (w.w === 'kohen' && slot.id === 'kohen'))));
    if (slot.kind === 'maftir') { const k = ok.find(p => p.tags.has('knowsHaftarah') && p.wants.length); if (k) return k; const k2 = ok.find(p => p.tags.has('knowsHaftarah')); if (k2) return k2; }
    if (slot.kind === 'gelilah') { const kid = ok.find(p => p.kid); if (kid && !want.length) return kid; }
    return want[0] || ok.filter(p => !p.kid)[0] || ok[0];
  }
  let guard = 0;
  while (!G().over && guard++ < 4000) {
    const st = G().stage;
    // add hosafot if more aliyah-wanters than yisrael slots
    if (G().L.shabbat && !opts.sloppy && G().hosafot < 2) {
      const wanters = G().people.filter(p => present(p) && p.wants.some(w => !w.done && w.w === 'aliyah') && p.tribe === 'yisrael').length;
      const ys = G().slots.filter(s => !s.done && (s.rule === 'yisrael' || s.hosafa)).length;
      if (wanters > ys && (!G().reading || G().reading.calls.indexOf('shevii') > G().reading.idx)) { H.addHosafa(); log.push('added hosafa'); }
    }
    // assign open slots
    if (!opts.sloppy) for (const s of G().slots) {
      if (s.done) continue;
      const a = s.assignee && H.personById(s.assignee);
      const kohenHere = G().people.some(p => present(p) && p.tribe === 'kohen');
      const b = bestFor(s);
      const aWants = a && a.wants.some(w => !w.done);
      const bWants = b && b.wants.some(w => !w.done);
      if (a && present(a) && !(s.id === 'kohen' && a.tribe !== 'kohen' && kohenHere) && !(bWants && !aWants)) continue;
      if (b) H.assign(s, b);
    }
    // requests
    for (const p of G().people) {
      if (!p.req || opts.sloppy) continue;
      const t = p.req.type;
      if (t === 'leaving') continue;
      if (t === 'seat' && p.req.data.isGuestSide) continue;
      if (Math.random() < 0.15) { // react with some delay
        if (t === 'siddur' || t === 'chumash' || t === 'tallit') g().carrying = t;
        H.doRequestAction(p);
      }
    }
    if (G().reading) {
      tp(528, 382);
      if (G().wrongSpot) { G().wrongSpot.pos = G().wrongSpot.target; H.scrollHere(); log.push('rolled torah'); }
      if (G().mistake) { H.correctReader(); log.push('corrected'); }
      if (G().pasul) { H.takeTorahFromAron(); H.placeNewTorah(); log.push('pasul fixed'); }
      const R = G().reading;
      if (R && R.phase === 'needCall' && !G().wrongSpot) {
        const s = G().slots.find(x => x.id === R.calls[R.idx]);
        const a = s && s.assignee && H.personById(s.assignee);
        if (a && present(a) && !a.busy) H.callUp(a); else { const b = bestFor(s); if (b) H.callUp(b); }
      }
    }
    if (G().candy && G().candy.phase === 'window') { H.signalCandy(); log.push('candy!'); }
    H.step(0.5);
  }
  const r = G();
  return { level: r.L.title, over: r.over, t: Math.round(r.t), shalom: Math.round(r.shalom), score: Math.round(r.score), errors: r.errors, handled: r.reqHandled, missed: r.reqMissed, log: [...new Set(log)], stage: r.stage && r.stage.name, unmet: r.people.filter(p => p.wants.some(w => !w.done) && p.state !== 'gone').map(p => p.name + ':' + p.wants.filter(w => !w.done).map(w => w.w)) };
};
