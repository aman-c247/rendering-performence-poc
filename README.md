# Browser Rendering Performance — POC

A hands-on Next.js project demonstrating **layout thrashing** and how to fix it
with **batched DOM reads/writes** and **`requestAnimationFrame`**, plus a bonus
page showing the ideal **compositor-only** animation path.

## What's inside

| Route              | What it shows                                                              |
|---------------------|-----------------------------------------------------------------------------|
| `/bad-thrashing`    | ❌ Interleaved reads (`el.offsetHeight`) and writes (`el.style.width`) per element, every frame → forced synchronous layout on every iteration |
| `/optimized`        | ✅ All reads batched in one pass, all writes batched in a second pass, both inside a single `requestAnimationFrame` callback |
| `/composited`       | 🚀 Animates `transform: scale()` only → browser can skip Layout and Paint entirely and animate on the compositor (GPU) thread |

Each page renders 150 boxes and animates their size (or scale) continuously
while "Start" is running, with a live FPS meter so you can *see* jank as well
as measure it in DevTools.

## 1. Install & run

```bash
npm install
npm run dev
```

Open http://localhost:3000

## 2. Why the "bad" version thrashes

```js
for (let i = 0; i < boxes.length; i++) {
  const el = boxes[i];
  const height = el.offsetHeight;     // READ -> forces layout
  el.style.width = `${size}px`;       // WRITE -> invalidates layout
  el.style.height = `${size}px`;
}
```

Reading a layout-dependent property (`offsetHeight`, `offsetWidth`,
`getBoundingClientRect()`, `clientWidth`, `scrollTop`, etc.) forces the browser
to flush any pending style changes and run **Layout synchronously**, right
then, instead of waiting until the natural end of the frame. Because the loop
writes a style on one element and then reads from the next, **every single
iteration** triggers its own forced, synchronous layout — this is "layout
thrashing." With 150 elements that's 150 forced layouts per frame.

## 3. Why the "optimized" version doesn't

```js
// Pass 1: reads only
const heights = boxes.map(el => el.offsetHeight);

// Pass 2: writes only
boxes.forEach((el, i) => {
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
});
```

By separating all reads from all writes, no read is ever "poisoned" by a
preceding write, so the browser never has to force an early layout — it can
batch every write and compute Layout **once**, right before the next paint.
Wrapping this in one `requestAnimationFrame` callback also throttles the work
to at most once per display refresh (typically 60 times/sec), instead of
running on every scroll/resize/input event.

## 4. Why the "composited" version is fastest of all

`transform` and `opacity` don't affect the document layout and can usually be
painted once and then repositioned/rescaled by the compositor thread (often
GPU-accelerated) with no re-layout and no re-paint at all. If you don't need
to read a dimension, and you don't need layout to change, animate `transform`
instead of `width`/`height`/`top`/`left`.

## 5. Measuring it in Chrome DevTools

1. Open the page (e.g. `/bad-thrashing`) in Chrome.
2. Open DevTools → **Performance** panel (`Cmd+Opt+I` / `Ctrl+Shift+I`, then the "Performance" tab).
3. Check **Screenshots** is enabled (camera icon) — optional but helpful.
4. Click the **Record** button (●) in DevTools.
5. In the page, click **Start**, let it run for ~3–4 seconds, click **Stop**.
6. Click the record button again to stop the DevTools recording.
7. Read the results:
   - **Top summary bar**: look at the ratio of colors — a lot of **purple**
     (Rendering: Layout / Recalculate Style) and **pink** (Painting) is a red
     flag. A healthy animation is mostly **green** (Compositing) with thin
     **yellow** slivers (Scripting).
   - **Main thread flame chart**: zoom into a couple of frames. On
     `/bad-thrashing` you'll see a dense, repeating stack of small "Layout"
     and "Recalculate Style" blocks — one pair per element, per frame.
   - **Bottom-Up / Summary tabs**: DevTools often explicitly flags
     `"Forced reflow"` or `"Forced synchronous layout is a possible
     performance bottleneck"` with a stack trace pointing at the exact line
     that did the read.
   - **Frames track**: red bars = dropped frames. Compare frame count and
     color between the three pages for the same ~4 second window.
8. Repeat steps 1–7 for `/optimized` and `/composited` and compare:
   - Number and width of Layout/purple blocks (should shrink drastically).
   - Overall main-thread busy time for the same duration.
   - FPS meter reading on the page itself (steadier and closer to 60 on the
     optimized/composited pages).

## 6. Key takeaways

- **Never interleave DOM reads and writes in a loop.** Read everything you
  need first, then write everything, in two separate passes.
- **Schedule visual updates with `requestAnimationFrame`**, not directly
  inside scroll/resize/input handlers — this avoids doing the work more often
  than the screen can actually show it, and lets the browser time it right
  before a repaint.
- **Prefer `transform`/`opacity` for animation** over properties that affect
  layout (`width`, `height`, `top`, `left`, `margin`) whenever the visual
  effect allows it — it lets the browser skip Layout and Paint and animate on
  the compositor thread.
- **Watch for "Forced reflow" warnings** in the DevTools Performance panel —
  they point at the exact line of code causing a synchronous layout.

## Project structure

```
app/
  layout.tsx           root layout + nav
  page.tsx              home page with links
  bad-thrashing/page.tsx
  optimized/page.tsx
  composited/page.tsx
  globals.css
components/
  BoxGrid.tsx           renders the animated grid of boxes
  FpsMeter.tsx           live FPS counter
```
