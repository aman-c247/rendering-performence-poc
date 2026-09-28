"use client";

import { MutableRefObject } from "react";

export default function BoxGrid({
  count,
  refsArray,
  variant = "default",
}: {
  count: number;
  refsArray: MutableRefObject<(HTMLDivElement | null)[]>;
  variant?: "default" | "composited";
}) {
  return (
    <div className="box-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            refsArray.current[i] = el;
          }}
          className={variant === "composited" ? "box-composited" : "box"}
        />
      ))}
    </div>
  );
}
