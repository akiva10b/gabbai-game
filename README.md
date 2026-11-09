# GABBAI! Run the Shul

A 2D shul-management game in the "restaurant dash" style. You're the gabbai. Hand out the
kibbudim, call up the aliyot, fetch siddurim, shush the talkers, roll the Torah to the right
parsha, and signal the candy at exactly the right moment.

## How to play

Double-click **`index.html`**. It runs in any modern browser with no install and no server.

(Or serve the folder: `python3 -m http.server 8765`, then open http://localhost:8765.)

- **Hover** a person to see his name, tribe (gold **K** = Kohen, blue **L** = Levi) and why he's here.
- **Click** a person to walk over. His card lets you give an honor or handle his request.
- **Click places:** bimah (call aliyot, add hosafot, roll the Torah), bookshelf, tallit rack, Aron Kodesh.
- **Esc** closes a card · **P** pauses · **C** signals candy · ← → / Space in the scroll mini-game.
- On the menu, **Unlock all levels** lets you jump straight to any level.

## Levels

See **[LEVELS.md](LEVELS.md)** for the full design map: what each level contains, its complexity,
random events and curveballs.

1. **Monday Morning**: 3 aliyot, one chazan, and only 9 men inside.
2. **Rosh Chodesh Thursday**: Hallel, Musaf, 4 aliyot, a yahrzeit, *no Levi*, a Torah rolled to the wrong spot.
3. **Shabbat Morning**: 7 aliyot + Maftir, Haftarah, drasha, two Kohanim, a new father, seat fights.
4. **Bar Mitzvah Shabbat**: too many relatives, hosafot, the candy signal, early-candy kids.
5. **Shabbat Rosh Chodesh Mega-Simcha**: two Sifrei Torah, aufruf + bar mitzvah, a pasul Torah, a late Kohen.

## Files

- `index.html`, `css/style.css`: layout and UI
- `js/data.js`: levels, honors, request types, names (edit this to tune or add levels)
- `js/game.js`: engine (pathfinding, stages, Torah reading, requests, scoring, rendering)
- `test/bot.js`, `test/humanbot.js`: autoplay bots used for balance testing (load them in the console, then `await humanPlay(0)`)
