"use client";

import { useCallback, useRef, useState } from "react";
import BoxGrid from "@/components/BoxGrid";
import FpsMeter from "@/components/FpsMeter";

const COUNT = 150;

export default function BadThrashingPage() {
  const boxRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafId = useRef<number | null>(null);
  const tick = useRef(0);
  const [running, setRunning] = useState(false);

  const animate = useCallback(() => {
    tick.current += 1;
    const boxes = boxRefs.current;

    // ❌ BAD: read then write, per element, interleaved.
    // el.offsetHeight forces the browser to flush any pending style
    // changes and run Layout synchronously *before* it can answer.
    // Because we wrote to a previous element's style.width/height in
    // the last iteration, EVERY read in this loop triggers a fresh,
    // synchronous layout pass -> "layout thrashing".
    for (let i = 0; i < boxes.length; i++) {
      const el = boxes[i];
      if (!el) continue;

      const height = el.offsetHeight; // READ -> forced synchronous layout
      const size = 22 + Math.abs(Math.sin((tick.current + i) / 12)) * 26;

      el.style.width = `${size + (height % 2)}px`; // WRITE -> invalidates layout
      el.style.height = `${size}px`;
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
      <span className="tag tag-bad">BAD</span>
      <h1>Layout Thrashing</h1>
      <p>
        Click Start, then record this page in the Performance panel. You will
        see a long, dense sawtooth of purple <strong>Layout</strong> blocks
        (often flagged as &quot;Forced reflow&quot;) and the FPS meter will drop.
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
