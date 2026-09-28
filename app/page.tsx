export default function Home() {
  return (
    <main>
      <h1>Browser Rendering Performance — POC</h1>
      <p>
        This project demonstrates how DOM reads and writes affect the browser&apos;s
        rendering pipeline (Style → Layout → Paint → Composite), and how to fix{" "}
        <strong>layout thrashing</strong> using batched reads/writes and{" "}
        <code>requestAnimationFrame</code>.
      </p>

      <div className="home-links">
        <a className="home-card" href="/bad-thrashing">
          <span className="tag tag-bad">BAD</span>
          <h3>Layout Thrashing</h3>
          <p>
            Reads (offsetHeight) and writes (style.width) are interleaved per
            element inside the animation loop. Every read forces a synchronous
            layout recalculation because the previous write invalidated it.
          </p>
        </a>

        <a className="home-card" href="/optimized">
          <span className="tag tag-good">GOOD</span>
          <h3>Batched Reads/Writes + requestAnimationFrame</h3>
          <p>
            All reads happen first in one pass, then all writes happen in a
            second pass, both scheduled inside a single rAF callback. Layout is
            recalculated once per frame instead of once per element.
          </p>
        </a>

        <a className="home-card" href="/composited">
          <span className="tag tag-best">BEST</span>
          <h3>Compositor-only Animation (transform)</h3>
          <p>
            Animates with <code>transform</code> instead of width/height, so the
            browser can skip Layout and Paint entirely and animate purely on the
            compositor thread (GPU) — the smoothest possible path.
          </p>
        </a>
      </div>

      <h2>How to test with Chrome DevTools</h2>
      <p>See the README in the project for the full step-by-step walkthrough.</p>
    </main>
  );
}
