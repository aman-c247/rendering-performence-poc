# Viewport-Based Loading POC (Next.js + pnpm)

A proof of concept showing how to load content **only when it approaches the viewport**, using the `IntersectionObserver` API instead of a scroll-event listener.

---

## Table of Contents

1. [Goal](#1-goal)
2. [Problems this solves](#2-problems-this-solves)
3. [Core concepts](#3-core-concepts)
4. [Tech stack](#4-tech-stack)
5. [Project setup](#5-project-setup)
6. [Project structure](#6-project-structure)
7. [How it works (code walkthrough)](#7-how-it-works-code-walkthrough)
8. [Running the project](#8-running-the-project)
9. [How to test](#9-how-to-test)
10. [Configuration guide](#10-configuration-guide)
11. [Common mistakes](#11-common-mistakes)
12. [Key takeaways](#12-key-takeaways)
13. [References](#13-references)

---

## 1. Goal

**Expected outcome:** understand how to implement efficient viewport-based loading so the page loads fewer resources initially, **without** a scroll-event listener.

**What the POC delivers:**

- A reusable component that loads content when it approaches the viewport
- A placeholder shown before the content loads
- A tuned `rootMargin` so content is ready just before the user arrives
- The observer is disconnected after loading and on unmount

---

## 2. Problems this solves

| Problem | How this POC addresses it |
|---|---|
| All content loads immediately | Content mounts only when near the viewport |
| Unnecessary image requests | `<img>` is not in the DOM until needed, so the browser never downloads it |
| Unnecessary API requests | The `fetch` lives inside the lazy child, so it runs only when the child mounts |
| Expensive scroll-event listeners | `IntersectionObserver` is notified by the browser; no scroll handler runs |
| Slow initial page load | Fewer requests and less JavaScript work on first load |
| Poor performance on long pages | Work grows with what the user actually scrolls to, not with page length |

---

## 3. Core concepts

### Why not a scroll listener?

```js
// The old way: runs on every scroll tick, on the main thread
window.addEventListener('scroll', () => {
  const rect = el.getBoundingClientRect(); // forces layout calculation
  if (rect.top < window.innerHeight) load();
});
```

This fires dozens of times per second, and `getBoundingClientRect()` forces the browser to recalculate layout. The result is janky scrolling, and you must remember to remove the listener.

### The better way: `IntersectionObserver`

You tell the browser: *"notify me when this element gets near the viewport."* The browser tracks it efficiently and calls your callback **only when the state changes**.

### The building blocks

| Piece | Purpose |
|---|---|
| **Placeholder** | A fixed-height skeleton. It prevents layout shift (CLS) and gives the observer an element to watch |
| **`rootMargin`** | Expands (or shrinks) the detection area. `200px 0px` means "trigger 200px *before* the element is visible" |
| **`threshold`** | How much of the element must be inside the area. `0` means 1px is enough |
| **`disconnect()`** | Stops observing. Called after loading and on unmount to avoid leaks |
| **Render-on-visible** | The real child mounts only when visible, so its image and API call do not exist until then |

### How `rootMargin` works

```
 ┌───────────────────────────────┐
 │     rootMargin (+200px)       │  ← detection starts here
 │  ┌─────────────────────────┐  │
 │  │       VIEWPORT          │  │  ← what the user sees
 │  └─────────────────────────┘  │
 │     rootMargin (+200px)       │
 └───────────────────────────────┘
```

Format: CSS-margin style, `"top right bottom left"` or shorthand like `"200px 0px"` (vertical, horizontal).


### Optional: unit-test dependencies

```bash
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

---

## 6. Project structur

```
viewport-loading-poc/
├─ src/
│  ├─ app/
│  │  ├─ api/card/[id]/route.ts   # Logs every request, simulates latency
│  │  ├─ layout.tsx               # Root layout (required)
│  │  └─ page.tsx                 # Demo page with 30 lazy cards
│  ├─ components/
│  │  ├─ LazyLoad.tsx             # Reusable wrapper (placeholder + children)
│  │  └─ CardContent.tsx          # Heavy content: image + API call
│  ├─ hooks/
│  │  └─ useInView.ts             # IntersectionObserver logic
│  └─ __tests__/
│     └─ LazyLoad.test.tsx        # Unit tests with a mocked observer
├─ next.config.mjs
├─ vitest.config.mts
├─ vitest.setup.ts
├─ tsconfig.json
└─ package.json
```

---

## 7. How it works (code walkthrough)

### Data flow

```
page.tsx renders 30 <LazyLoad>
        │
        ▼
LazyLoad renders a placeholder (grey box, fixed height)
        │
        ▼
useInView creates an IntersectionObserver on the wrapper div
        │
        ▼  (user scrolls; wrapper comes within 200px of the viewport)
        │
Observer callback: isIntersecting = true
        │
        ├── setInView(true)
        └── observer.disconnect()
        │
        ▼
LazyLoad re-renders and mounts <CardContent>
        │
        ├── <img> added to the DOM → browser downloads the image
        └── useEffect runs → fetch('/api/card/N')
```

### `useInView.ts`: the hook

```ts
export function useInView<T extends Element>({
  rootMargin = '200px 0px',   // start loading 200px early
  threshold = 0,              // fire when 1px intersects
  once = true,                // stop after the first intersection
}: Options = {}) {
  const ref = useRef<T | null>(null);       // holds the DOM element
  const [inView, setInView] = useState(false); // starts false: placeholder first

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Fallback for browsers without IntersectionObserver
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();   // disconnect after loading
        } else if (!once) {
          setInView(false);                  // repeat mode: hide again
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();      // disconnect on unmount
  }, [rootMargin, threshold, once]);

  return { ref, inView };
}
```

**Key points**

- The observer is created inside `useEffect` because `IntersectionObserver` only exists in the browser, not on the server.
- `'use client'` is required because the hook uses state and effects.
- Cleanup (`return () => observer.disconnect()`) runs on unmount. Calling `disconnect()` twice is harmless.

### `LazyLoad.tsx`: the reusable component

```tsx
const { ref, inView } = useInView<HTMLDivElement>({ rootMargin });

<div ref={ref} style={{ minHeight }}>
  {inView ? children : placeholder ?? <DefaultSkeleton />}
</div>
```

**Key points**

- `minHeight` is critical. A zero-height wrapper would put all 30 wrappers on top of each other inside the viewport, and everything would load at once.
- It prevents layout shift because space is reserved before the content arrives.
- Children are not just hidden; they are **not rendered**. That is why their requests never happen.

### `CardContent.tsx`: the expensive part

```tsx
useEffect(() => {
  fetch(`/api/card/${id}`).then((r) => r.json()).then(setData);
}, [id]);

<img src={`https://picsum.photos/seed/${id}/600/200`} width={600} height={200} />
```

Both the image download and the API call start only when this component mounts.

### `route.ts`: the instrumented API

```ts
console.log(`[API] /api/card/${id} requested`);   // visible in the terminal
await new Promise((r) => setTimeout(r, 400));      // simulates a slow API
```

The log lets you count server-side requests and compare them with the Network tab.

---

## 8. Running the project

```bash
pnpm install

pnpm dev                      # development server at http://localhost:3000

pnpm build && pnpm start      # production build (use this when measuring)

pnpm test                     # run unit tests
```

> Always measure in **production mode**. Dev mode adds extra renders and logging that distort request counts and timings.

---

## 9. How to test

### Test A: Network requests (main proof)

1. Open `http://localhost:3000`, then DevTools → **Network**.
2. Tick **Disable cache**; filter by `Fetch/XHR` and `Img`.
3. Reload without scrolling and count the requests.
4. Scroll slowly and watch new requests appear.

**Pass:** about 2 to 3 `/api/card/N` calls and images initially (not 30). New requests appear about 200px before each card enters the screen. The terminal `[API]` logs match.

### Test B: Baseline comparison

1. In `page.tsx`, replace `<LazyLoad minHeight={320}><CardContent id={id} /></LazyLoad>` with `<CardContent id={id} />`.
2. Reload, then record the **request count**, **transferred size**, and **Load time**.
3. Restore `LazyLoad` and record the same three numbers.

**Pass:** noticeably fewer requests and less data with `LazyLoad`. Record both sets in [Results template](#10-results-template).

### Test C: No scroll listener

In the Console:

```js
getEventListeners(window)
getEventListeners(document)
```

(`getEventListeners` only works in the DevTools console.)

**Pass:** no `scroll` entry appears.

### Test D: `rootMargin` behavior

Try `'0px'`, `'200px 0px'` and `'600px 0px'`, with network throttled to **Fast 3G**.

| Value | Expected behavior |
|---|---|
| `0px` | Loads as the card appears, so users often see the placeholder |
| `200px 0px` | Usually ready on arrival, little waste |
| `600px 0px` | Always ready, but extra cards load upfront |

**Pass:** you can justify your chosen value from what you observed.

### Test E: Disconnect behavior

1. Temporarily add `console.log('disconnected')` after `observer.disconnect()` in the hook.
2. Scroll down, back up, then reload; also navigate to another route and back.

**Pass:** the log appears **once per card** and never again when scrolling back up. No console errors.

### Test F: Slow network and layout shift

1. Set throttling to **Slow 4G**, reload and scroll.
2. Run **Lighthouse** (Performance) and check **CLS**.

**Pass:** no visible jumping; CLS near 0 (under 0.1 is "good").


## 10. Configuration guide

| Option | Default | When to change |
|---|---|---|
| `rootMargin` | `'200px 0px'` | Increase for slow APIs or fast scrollers (300 to 600px); decrease for heavy content on slow devices |
| `threshold` | `0` | Use `0.5` or `1` when the content should be mostly visible first (for example, to start a video) |
| `once` | `true` | Set `false` to unload content when it leaves (heavy widgets, videos) |
| `minHeight` | `300` | Match the real content height as closely as possible |
| `placeholder` | grey box | Pass a custom skeleton that matches your content layout |

Usage:

```tsx
<LazyLoad minHeight={400} rootMargin="300px 0px" placeholder={<MySkeleton />}>
  <HeavyComponent />
</LazyLoad>
```

---

## 11. Common mistakes

| Mistake | Result | Fix |
|---|---|---|
| Wrapper has no height | All wrappers overlap in the viewport, so everything loads at once | Always set `minHeight` |
| Hiding content with CSS (`display: none`) | Images and API calls still run | Do not render the children at all |
| Creating the observer during render | Crashes on the server (`IntersectionObserver` undefined) | Create it inside `useEffect` |
| Forgetting `disconnect()` | Memory leaks and wasted work | Disconnect after load and in cleanup |
| Lazy-loading above-the-fold content | Slower LCP, visible pop-in | Load hero and first-screen content normally |
| Placeholder smaller than real content | Layout shift (high CLS) | Match placeholder height to content |
| Missing root `layout.tsx` | Build error: *page.tsx doesn't have a root layout* | Create `src/app/layout.tsx` with `<html>` and `<body>` |


## 12. Key takeaways

1. `IntersectionObserver` replaces scroll listeners: the browser does the tracking and calls you only on change.
2. `rootMargin` loads content **before** it is visible, which hides latency from the user.
3. Do not render lazy content at all until needed. Hiding it does not stop requests.
4. Always reserve space with `minHeight` to avoid layout shift and the all-load-at-once bug.
5. Disconnect the observer after loading and on unmount.
6. Measure before and after, and always in production mode.

---

## 13. References

- [MDN: Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [MDN: `rootMargin`](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver/rootMargin)
- [Next.js: App Router layouts](https://nextjs.org/docs/app/building-your-application/routing/layouts-and-templates)
- [web.dev: Cumulative Layout Shift](https://web.dev/articles/cls)
- [web.dev: Lazy loading](https://web.dev/articles/lazy-loading)