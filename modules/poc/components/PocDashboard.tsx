"use client";

import { useState } from "react";

import {
  ImageMetadataDemo,
  ReactCompilerDemo,
  RoutingPatternsDemo,
  TanStackQueryV5Demo,
  TransitionDeferredDemo,
  UseActionStateDemo,
  UseHookDemo,
  UseOptimisticDemo,
  ViewTransitionsDemo,
} from "@modules/poc";

const DEMOS = [
  {
    id: "useOptimistic",
    title: "useOptimistic",
    badge: "React 19",
    component: UseOptimisticDemo,
  },
  {
    id: "useActionState",
    title: "useActionState",
    badge: "React 19",
    component: UseActionStateDemo,
  },
  {
    id: "useHook",
    title: "use() hook",
    badge: "React 19",
    component: UseHookDemo,
  },
  {
    id: "transitions",
    title: "useTransition + useDeferredValue",
    badge: "React 18+",
    component: TransitionDeferredDemo,
  },
  {
    id: "image",
    title: "Image Optimization",
    badge: "Next.js",
    component: ImageMetadataDemo,
  },
  {
    id: "routing",
    title: "Parallel & Intercepting Routes",
    badge: "Next.js",
    component: RoutingPatternsDemo,
  },
  {
    id: "compiler",
    title: "React Compiler",
    badge: "React 19",
    component: ReactCompilerDemo,
  },
  {
    id: "viewTransitions",
    title: "View Transitions API",
    badge: "Browser + Next.js",
    component: ViewTransitionsDemo,
  },
  {
    id: "tanstack",
    title: "TanStack Query v5 Patterns",
    badge: "TanStack",
    component: TanStackQueryV5Demo,
  },
] as const;

type DemoId = (typeof DEMOS)[number]["id"];

const BADGE_COLORS: Record<string, string> = {
  "React 19": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "React 18+": "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  "Next.js": "bg-black text-white dark:bg-white dark:text-black",
  "Browser + Next.js": "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  TanStack: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export function PocDashboard() {
  const [activeId, setActiveId] = useState<DemoId>("useOptimistic");

  const active = DEMOS.find((d) => d.id === activeId)!;
  const ActiveComponent = active.component;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-xl font-bold">BetSignal — React & Next.js POC</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Practical examples of modern React 19 & Next.js features not currently used in the codebase.
          </p>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 p-6">
        {/* Sidebar navigation */}
        <nav className="w-56 shrink-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">POC Examples</p>
          <ul className="space-y-1">
            {DEMOS.map((demo) => (
              <li key={demo.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(demo.id)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    activeId === demo.id
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <span
                    className={`mb-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      activeId === demo.id ? "bg-white/20 text-white" : BADGE_COLORS[demo.badge]
                    }`}
                  >
                    {demo.badge}
                  </span>
                  <br />
                  {demo.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Main content */}
        <main className="min-w-0 flex-1">
          <ActiveComponent />
        </main>
      </div>
    </div>
  );
}
