"use client";

import { useEffect, useRef, useState } from "react";

export default function FpsMeter() {
  const [fps, setFps] = useState(0);
  const frames = useRef(0);
  const lastTime = useRef<number>(0);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    lastTime.current = performance.now();

    const loop = () => {
      frames.current += 1;
      const now = performance.now();
      const delta = now - lastTime.current;

      if (delta >= 500) {
        setFps(Math.round((frames.current * 1000) / delta));
        frames.current = 0;
        lastTime.current = now;
      }

      rafId.current = requestAnimationFrame(loop);
    };

    rafId.current = requestAnimationFrame(loop);
    return () => {
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    };
  }, []);

  const color = fps >= 55 ? "#4ade80" : fps >= 30 ? "#facc15" : "#f87171";

  return (
    <div className="fps-meter" style={{ borderColor: color, color }}>
      FPS: {fps || "--"}
    </div>
  );
}
