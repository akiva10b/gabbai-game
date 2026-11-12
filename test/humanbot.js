// "Human-like" bot: really walks everywhere, does one thing at a time, reacts with delays.
// Usage: await humanPlay(levelIdx) -> summary
window.humanPlay = async function (levelIdx, opts = {}) {
  const H = window.__gabbai; H.startLevel(levelIdx);
  const G = () => H.G, g = () => G().gabbai;
  const present = p => p && !['offstage', 'gone', 'leaving', 'door'].includes(p.state);
  const react = opts.react || 0.8;   // seconds of "thinking" after each action
  let busyT = 0, task = null, steps = 0;
  const ALI = ['kohen', 'levi', 'shlishi', 'revii', 'chamishi', 'shishi', 'shevii', 'maftir'];
  function bestFor(slot) {
    const ppl = G().people.filter(p => present(p) && !p.busy && !p.door);
    const free = ppl.filter(p => !G().slots.some(s => s.assignee === p.id && !s.done && s !== slot) && !(ALI.includes(slot.id) || slot.hosafa ? p.honors.some(h => ALI.includes(h) || h.startsWith('hosafa')) : false));
    let ok = free.filter(p => !H.validate(slot, p));
    if (!ok.length) ok = ppl.filter(p => !H.validate(slot, p));
    if (slot.rule === 'levi' && !ok.length) { const k = H.slotById('kohen'); const kp = k && H.personById(k.doneBy || k.assignee); if (kp) ok = [kp]; }
    const wants = ok.filter(p => p.wants.some(w => !w.done && ((w.w === 'amud' && slot.kind === 'chazan') || (w.w === 'aliyah' && (['aliyah', 'maftir'].includes(slot.kind) || slot.hosafa) && slot.kind !== 'maftir') || (w.w === 'maftir' && slot.kind === 'maftir') || (w.w === 'kohen' && slot.id === 'kohen') || (w.w === 'honor' && ['petichah', 'gelilah', 'hagbah'].includes(slot.kind)))));
    wants.sort((a, b) => (b.tags.has('chatan') + b.tags.has('barmitzvah')) - (a.tags.has('chatan') + a.tags.has('barmitzvah')));
    if (slot.kind === 'maftir') return wants[0] || ok.find(p => p.tags.has('knowsHaftarah')) || ok[0];
    if (slot.kind === 'gelilah') return wants[0] || ok.find(p => p.kid) || ok[0];
    return wants[0] || ok.find(p => !p.kid && !p.wants.some(w => !w.done && w.w !== 'honor')) || ok.find(p => !p.kid) || ok[0];
  }
  function pickTask() {
    const R = G().reading;
    if (G().candy && G().candy.phase === 'window') return { kind: 'candy' };
    if (G().pasul && G().pasul.stage === 'aron' && g().carrying !== 'torah') return { kind: 'place', ref: 'aron', act: () => H.takeTorahFromAron() };
    if (G().pasul && g().carrying === 'torah') return { kind: 'place', ref: 'bimah', act: () => H.placeNewTorah() };
    if (G().wrongSpot) return { kind: 'place', ref: 'bimah', act: () => { G().wrongSpot.pos = G().wrongSpot.target; busyT += 5; H.scrollHere(); } };
    if (G().mistake) return { kind: 'place', ref: 'bimah', act: () => H.correctReader() };
    if (R && R.phase === 'needCall') {
      const s = H.slotById(R.calls[R.idx]); let a = s && s.assignee && H.personById(s.assignee);
      if (!a || !present(a) || a.busy) a = bestFor(s);
      if (a) return { kind: 'place', ref: 'bimah', act: () => H.callUp(a) };
    }
    // blocking: minyan door guy
    const dg = G().people.find(p => p.door && p.req);
    if (dg && G().waiting) return { kind: 'person', ref: dg, act: () => H.doRequestAction(dg) };
    // hosafot for extra wanters
    if (G().L.shabbat && G().hosafot < 2 && !opts.noHosafa) {
      const wanters = G().people.filter(p => present(p) && p.tribe === 'yisrael' && p.wants.some(w => !w.done && w.w === 'aliyah') && !G().slots.some(s => s.assignee === p.id && !s.done)).length;
      const open = G().slots.filter(s => !s.done && (s.rule === 'yisrael' || s.hosafa) && !(s.assignee && H.personById(s.assignee).wants.some(w => !w.done))).length;
      if (wanters > open && (!R || R.calls.indexOf('shevii') > R.idx)) H.addHosafa();
    }
    // slots: assign the most urgent unfilled
    const stIdx = G().stageIdx, rIdx = G().stages.findIndex(s => s.type === 'reading');
    for (const s of G().slots) {
      if (s.done) continue;
      const a = s.assignee && H.personById(s.assignee);
      const b = bestFor(s); if (!b) continue;
      const kohenHere = G().people.some(p => present(p) && p.tribe === 'kohen');
      const better = (!a || !present(a)) || (s.id === 'kohen' && a.tribe !== 'kohen' && kohenHere) || (b.wants.some(w => !w.done) && !a.wants.some(w => !w.done) && b !== a);
      if (!better) continue;
      if (s.kind !== 'chazan' && stIdx < rIdx - 3) continue;
      return { kind: 'person', ref: b, act: () => H.assign(s, b) };
    }
    // requests: nearest
    const reqs = G().people.filter(p => p.req && present(p) && !['leaving', 'minyan'].includes(p.req.type) && !(p.req.type === 'seat' && p.req.data.isGuestSide));
    if (reqs.length) {
      reqs.sort((a, b) => Math.hypot(a.x - g().x, a.y - g().y) - Math.hypot(b.x - g().x, b.y - g().y));
      const p = reqs[0], need = { siddur: 'siddur', chumash: 'chumash', tallit: 'tallit' }[p.req.type];
      if (need && g().carrying !== need) return { kind: 'place', ref: need === 'tallit' ? 'rack' : 'shelf', act: () => { g().carrying = need; } };
      return { kind: 'person', ref: p, act: () => H.doRequestAction(p) };
    }
    if (R) return { kind: 'place', ref: 'bimah', act: () => { } };
    return null;
  }
  let guard = 0;
  while (!G().over && guard++ < 6000) {
    const dt = 0.25;
    if (busyT > 0) { busyT -= dt; H.step(dt); continue; }
    if (G().candy && G().candy.phase === 'window') { H.signalCandy(); busyT = react; }
    if (!task) {
      task = pickTask();
      if (task && task.kind === 'person') H.setGabbaiTarget({ type: 'person', ref: task.ref });
      else if (task && task.kind === 'place') H.setGabbaiTarget({ type: 'place', ref: task.ref });
      else if (task && task.kind === 'candy') task = null;
      task && (task.t = 0);
    }
    if (task) {
      task.t += dt;
      const popupOpen = H.ui.popup && (task.kind === 'person' ? H.ui.popup.ref === task.ref : H.ui.popup.ref === task.ref);
      if (popupOpen) { task.act(); H.closePopup(); task = null; busyT = react; }
      else if (task.t > 15) { task = null; H.closePopup(); }
    }
    H.step(dt); steps++;
  }
  const r = G();
  return { level: r.L.title, t: Math.round(r.t), shalom: Math.round(r.shalom), score: Math.round(r.score), errors: r.errors.length, errs: r.errors.map(e => e.slice(0, 70)), handled: r.reqHandled, missed: r.reqMissed, fired: r.shalom <= 0 };
};
