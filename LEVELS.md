# GABBAI! — Level Design Map

You are the gabbai. Congregants arrive, sit down, and need things, like in a restaurant
"dash" game. But instead of taking orders, you hand out honors (kibbudim) and keep the
davening running. Each level is a harder service.

## Core loop (all levels)

| Mechanic | How it works |
|---|---|
| **Walk & ask** | Click a congregant. The gabbai walks over (it takes real time), then a card opens with their tribe (Kohen / Levi / Yisrael), what they're there for (yahrzeit, bar mitzvah, chatan…) and what you can do: give an honor or handle their request. |
| **The Clipboard** | Right-hand panel listing every honor slot for this service (chazan, petichah, aliyot, maftir, hagbah, gelilah…). It shows who you've asked. You can unassign from it at any time. |
| **Stage timeline** | The service moves forward on its own: Shacharit → (Hallel) → Torah service → (Haftarah, Speech, Musaf) → Aleinu. Some stages **block** until you've done something (no chazan = nobody starts, and the shul gets restless). |
| **Calling up** | During Kriyat HaTorah the gabbai has to **be at the bimah** to call each aliyah. If you're off fetching a siddur, the baal koreh waits and Shalom drops. |
| **Requests (bubbles)** | Bubbles appear over people's heads, each with a patience timer. Some need fetching (siddur/chumash from the bookshelf, tallit from the rack). Others need you to walk over: shush the talkers, silence a phone, send kids back to their seats, add a name to the Mi Shebeirach list, take a kiddush announcement. |
| **Shalom meter** | Overall shul harmony (0–100). Good gabbai work raises it; mistakes, waiting and unhappy chiyuvim lower it. If it hits 0, the board fires you. Your stars at the end come from final Shalom (★ ≥40, ★★ ≥65, ★★★ ≥85), and you need at least ★ to unlock the next level. |
| **Score** | Points for everything done right, plus a bonus for finishing on time. Used for bragging rights. |
| **Speed** | Each level runs faster: stages are shorter, requests come more often, patience is shorter. |

### Halachic rules the game enforces (and explains when you break them)
- **Kohen** aliyah goes to a Kohen. If no Kohen is present, a Yisrael may take it instead (*bimkom Kohen*).
- **Levi** aliyah goes to a Levi. **If no Levi is present, the same Kohen gets the Levi aliyah too.**
- Shlishi, Revi'i… Shevi'i go to Yisraelim. Never give these to a Kohen or Levi.
- **Maftir** and **hosafot** (extra aliyot, Shabbat only) can go to anyone, Kohen and Levi included.
- Nobody gets two aliyot (except the no-Levi case).
- Boys under bar mitzvah can't get aliyot or lead davening. They make great **gelilah** honorees.
- **Hagbah** needs strong arms. Don't give it to the elderly.
- **Maftir** needs preparation. Assign it **before the Torah comes out**, or the reader stumbles (unless they already know the haftarah).
- **Chiyuvim** come first: chatan > bar mitzvah > new father > yahrzeit > guest. A yahrzeit wants the amud and an aliyah.

---

## Level 1 — "Monday Morning" (speed 1.0×)
**What it contains:** weekday Shacharit, one Sefer Torah, 3 aliyot (Kohen, Levi, Yisrael), petichah, hagbah, gelilah, one chazan. About 10 men.

**Complexity:** learn the basics: walk, ask, fill the clipboard, call aliyot from the bimah.

**Random events:** "What page are we on?", someone needs a siddur, two guys talking during davening.

**Curveballs:**
- **Only 9!** The 10th man is standing by the door looking at his watch. Convince him to stay or Shacharit can't begin.
- A guest arrives without a tallit and needs one from the rack.

## Level 2 — "Rosh Chodesh Thursday with a Yahrzeit" (speed 1.2×)
**What it contains:** Shacharit + **Hallel** + Torah (4 aliyot: Kohen, Levi, Shlishi, Revi'i) + **Musaf**. Two chazzanim to assign. About 15 men.

**Complexity:** two amud slots, more aliyot, and a priority person (yahrzeit wants the Shacharit amud *and* an aliyah).

**Random events:** page questions, siddurim, talkers, a cell phone ringing, Mi Shebeirach requests for sick relatives.

**Curveballs:**
- **No Levi today.** The only fix is giving the Levi aliyah back to the Kohen.
- **"I have to leave early!"** Someone you already assigned walks out, so you have to refill their slot fast.
- **The Torah was rolled to the wrong place.** Roll it to the right parsha before the reading can start (mini-game).

## Level 3 — "Shabbat Morning" (speed 1.35×)
**What it contains:** Shabbat Shacharit, **7 aliyot + Maftir**, Haftarah, petichah, hagbah, gelilah, Rabbi's drasha, Musaf. About 25 people plus kids.

**Complexity:** many more slots. Maftir must be lined up **early**. Hosafot (extra aliyot) are allowed but make the service longer.

**Random events:** everything from before, plus kids running in the aisles, a kiddush sponsor who wants an announcement, and talkers that multiply during the drasha.

**Curveballs:**
- **Two Kohanim.** Only one gets Kohen. Can the other get Maftir?
- **A new father** wants an aliyah to name his baby girl.
- **An out-of-town guest** should get an honor.
- **An elderly regular** volunteers for hagbah. Don't let him.
- **The baal koreh misreads a word.** Run to the bimah and correct him.
- **"Someone's in my seat!"** A guest took a regular's makom kavua.
- The Torah is opened at the wrong spot.

## Level 4 — "Bar Mitzvah Shabbat" (speed 1.5×)
**What it contains:** everything in Level 3, plus a **bar mitzvah** and his whole family.

**Complexity:** too many people wanting aliyot (father, Kohen grandfather, Levi uncle, uncles, a yahrzeit, regulars). Use hosafot wisely. The bar mitzvah boy must get Maftir. **Signal the candy** at exactly the right moment, right after the haftarah's last bracha.

**Random events:** a flood of guests needing siddurim, chumashim and tallitot, seat fights, talkers, kids.

**Curveballs:**
- **The grandfather is a Kohen** and wants the Kohen aliyah, even though the shul's regular Kohen is there.
- **A kid throws candy early.** Stop him before the bar mitzvah boy gets pelted mid-haftarah.
- The baal koreh misreads, someone's phone rings, the Torah is rolled wrong.

## Level 5 — "Shabbat Rosh Chodesh Mega-Simcha" (speed 1.7×)
**What it contains:** **Two Sifrei Torah** (7 aliyot from the first, Maftir from the second), Hallel, **an aufruf chatan**, **a bar mitzvah**, **a yahrzeit**, **a new father**, two hagbahs, two gelilahs, Haftarah, drasha, Musaf. About 40 people plus kids.

**Complexity:** everything at once, at top speed. Two candy moments (after the chatan's aliyah and after the haftarah).

**Curveballs:**
- **A pasul Torah!** A letter is found broken mid-reading. Run to the Aron and bring out another Sefer Torah.
- **The second Torah is rolled to the wrong place** (it must be at Parshat Pinchas for the Rosh Chodesh maftir).
- **A late Kohen** shows up mid-service.
- Someone you assigned has to leave early. The baal koreh misreads twice. Candy kids. Phones. Seat fights. Mi Shebeirachs. Kiddush announcement.

---

### Random events reference

| Bubble | Who | Fix |
|---|---|---|
| ❓ Page? | anyone | walk over → "Tell the page" |
| 📕 Siddur / 📘 Chumash | anyone (chumash only around Torah reading) | grab one from the **bookshelf**, deliver it |
| 🧣 Tallit | guests | grab one from the **tallit rack**, deliver it |
| 💬 Talking | pairs of people | "Shhh!" (makes noise until handled) |
| 📱 Phone | anyone | "Silence it!" |
| 🏃 Running kid | kids | "Back to your seat!" |
| 🙏 Mi Shebeirach | anyone, before the reading ends | add to list |
| 🍷 Kiddush sponsor | sponsor | add announcement |
| 💺 Seat fight | regular vs. guest | move the guest |
| 🚪 Leaving early | an assigned person | (no fix) refill the slot |
| 🍬 Early candy | kids during simcha moments | "Not yet!" |
| ⚠️ Misread word | baal koreh (bimah) | correct him at the bimah |
| ✋ Pasul Torah | Aron | bring another Torah from the Aron |
| 📜 Wrong spot | bimah, at the start of a reading | roll the scroll to the right parsha (mini-game) |
| 🔟 Minyan | the man at the door (L1) | ask him to join |
