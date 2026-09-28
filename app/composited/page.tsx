"use client";

import { useCallback, useRef, useState } from "react";
import BoxGrid from "@/components/BoxGrid";
import FpsMeter from "@/components/FpsMeter";

const COUNT = 150;

export default function CompositedPage() {
  const boxRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafId = useRef<number | null>(null);
  const tick = useRef(0);
  const [running, setRunning] = useState(false);

  const animate = useCallback(() => {
    tick.current += 1;
    const boxes = boxRefs.current;

    // 🚀 BEST: no dimension reads at all, and the only write is to
    // `transform`. `transform` (and `opacity`) are "compositor-only"
    // properties: the browser doesn't need to recompute Layout or
    // repaint pixels, it just re-uses the existing painted layer and
    // asks the GPU to redraw it at a new position/scale. That skips
    // two of the three expensive rendering stages entirely.
    for (let i = 0; i < boxes.length; i++) {
      const el = boxes[i];
      if (!el) continue;
      const scale = 0.55 + Math.abs(Math.sin((tick.current + i) / 12)) * 0.6;
      el.style.transform = `scale(${scale})`;
    }

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
      <span className="tag tag-best">BEST</span>
      <h1>Compositor-only Animation (transform)</h1>
      <p>
        Instead of animating width/height, we animate <code>transform: scale()</code>.
        Record this page: the Performance panel timeline should show mostly
        thin green <strong>Composite</strong> bars, with little to no purple
        Layout or pink Paint activity. This is the ideal path for smooth
        animation and scrolling.
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

      <BoxGrid count={COUNT} refsArray={boxRefs} variant="composited" />
    </main>
  );
}
