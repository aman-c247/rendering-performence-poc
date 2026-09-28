"use client";

import { useCallback, useRef, useState } from "react";
import BoxGrid from "@/components/BoxGrid";
import FpsMeter from "@/components/FpsMeter";

const COUNT = 150;

export default function OptimizedPage() {
  const boxRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafId = useRef<number | null>(null);
  const tick = useRef(0);
  const [running, setRunning] = useState(false);

  const animate = useCallback(() => {
    tick.current += 1;
    const boxes = boxRefs.current;
    const n = boxes.length;

    // ✅ GOOD, PASS 1: batch every READ first.
    // The layout is only flushed once (if at all - see note below),
    // and we cache every value we need before touching styles.
    const heights = new Array<number>(n);
    for (let i = 0; i < n; i++) {
      const el = boxes[i];
      heights[i] = el ? el.offsetHeight : 0;
    }

    // ✅ GOOD, PASS 2: batch every WRITE second.
    // No reads happen in this loop, so no element write forces a
    // layout the browser has to do before continuing. The browser
    // batches all these style writes and computes layout ONCE,
    // right before the next paint.
    for (let i = 0; i < n; i++) {
      const el = boxes[i];
      if (!el) continue;
      const size = 22 + Math.abs(Math.sin((tick.current + i) / 12)) * 26;
      el.style.width = `${size + (heights[i] % 2)}px`;
      el.style.height = `${size}px`;
    }

    // Scheduling the whole read+write batch inside a single
    // requestAnimationFrame callback also guarantees we do this at
    // most once per frame, synced with the browser's refresh rate,
    // instead of e.g. on every scroll/resize event.
    rafId.current = requestAnimationFrame(animate);
  }, []);

  const start = () => {
    if (running) return;
    setRunning(true);
    rafId.current = requestAnimationFrame(animate);
  };

  const stop = () => {
    setRunning(false);
    if (rafId.current !== null) cancelAnimationFrame(rafId.current);
  };

  return (
    <main>
      <span className="tag tag-good">GOOD</span>
      <h1>Batched Reads/Writes + requestAnimationFrame</h1>
      <p>
        Same visual animation as the &quot;Bad&quot; page, same element count,
        but reads and writes are grouped into two separate passes inside one
        rAF callback. Record this page and compare: far fewer, shorter Layout
        blocks, and a steadier FPS meter.
      </p>

      <FpsMeter />

      <div className="controls">
        <button onClick={start} disabled={running}>
          Start
        </button>
        <button className="secondary" onClick={stop} disabled={!running}>
          Stop
        </button>
      </div>

      <BoxGrid count={COUNT} refsArray={boxRefs} />
    </main>
  );
}
