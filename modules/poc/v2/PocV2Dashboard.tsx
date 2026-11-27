"use client";

import React, { Suspense, useState } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";


import { UseActionStatePOC } from "./02-use-action-state";
import { UseDeferredValuePOC } from "./03-use-deferred-value.poc";
import { SuspenseQueryPOC } from "./04-suspense-query.poc";
import { OptimisticMutationPOC } from "./05-optimistic-mutation.poc";
import { InfiniteQueryPOC } from "./06-infinite-query.poc";
import { ViewTransitionsPOC } from "./07-view-transitions.poc";
import { ImageOptimizationPOC } from "./08-image-optimization.poc";
import { UseOptimisticPOC } from "./01-use-optimistic.poc";

// ─── Feature registry ─────────────────────────────────────────────────────────

const FEATURES = [
  {
    id: "useOptimistic",
    title: "useOptimistic",
    badge: "React 19",
    badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    summary: "Instant UI updates with auto-rollback on error",
    replaces: "isPending + disabled buttons",
    impact: "🔴 High",
    effort: "1 day",
    component: UseOptimisticPOC,
  },
  {
    id: "useActionState",
    title: "useActionState",
    badge: "React 19",
    badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    summary: "Eliminates manual form submission state variables",
    replaces: "isSubmitting + error + success useState",
    impact: "🟡 Medium",
    effort: "2 days",
    component: UseActionStatePOC,
  },
  {
    id: "useDeferredValue",
    title: "useDeferredValue",
    badge: "React 18+",
    badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    summary: "Responsive search filters without manual debouncing",
    replaces: "setTimeout + 3 useRef + useEffect debounce",
    impact: "🔴 High",
    effort: "1 day",
    component: UseDeferredValuePOC,
  },
  {
    id: "suspenseQuery",
    title: "useSuspenseQuery + queryOptions()",
    badge: "TanStack v5",
    badgeColor: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    summary: "data is always defined — no more isLoading guards in JSX",
    replaces: "isLoading + isError conditionals in every component",
    impact: "🔴 High",
    effort: "3 days",
    component: SuspenseQueryPOC,
  },
  {
    id: "optimisticMutation",
    title: "Optimistic Mutations",
    badge: "TanStack v5",
    badgeColor: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    summary: "Instant toggle with automatic cache rollback on failure",
    replaces: "invalidateQueries after success (extra round-trip)",
    impact: "🔴 High",
    effort: "2 days",
    component: OptimisticMutationPOC,
  },
  {
    id: "infiniteQuery",
    title: "useInfiniteQuery",
    badge: "TanStack v5",
    badgeColor: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    summary: "Infinite scroll / load-more without manual page state",
    replaces: "page useState + allItems + prevPageRef + useEffect",
    impact: "🟡 Medium",
    effort: "2 days",
    component: InfiniteQueryPOC,
  },
  {
    id: "viewTransitions",
    title: "View Transitions API",
    badge: "Browser + React",
    badgeColor: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    summary: "Smooth tab animations — zero library overhead",
    replaces: "Instant tab content swap (no animation)",
    impact: "🟢 Low",
    effort: "1 day",
    component: ViewTransitionsPOC,
  },
  {
    id: "imageOptimization",
    title: "Image: priority + sizes + blur",
    badge: "Next.js",
    badgeColor: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    summary: "LCP, CLS and bandwidth improvements in 3 props",
    replaces: "Missing priority/sizes/placeholder on existing Images",
    impact: "🔴 High",
    effort: "1 day",
    component: ImageOptimizationPOC,
  },
] as const;

type FeatureId = (typeof FEATURES)[number]["id"];

// ─── Global query client for the dashboard ────────────────────────────────────

const globalQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: 0 } },
});

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function PocV2Dashboard() {
  const [activeId, setActiveId] = useState<FeatureId>("useOptimistic");
  const active = FEATURES.find((f) => f.id === activeId)!;
  const ActiveComponent = active.component;

  return (
    <QueryClientProvider client={globalQueryClient}>
      <div className="flex min-h-screen flex-col bg-background">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur px-6 py-4">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-foreground">BetSignal — React 19 & Next.js POC</h1>
                <p className="text-xs text-muted-foreground">
                  8 features · Realistic examples based on actual BetSignal code patterns
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
                <span className="rounded-full bg-primary/10 px-2 py-1 text-primary font-medium">React 19.3.1</span>
                <span className="rounded-full bg-muted px-2 py-1 font-medium">Next.js 16</span>
                <span className="rounded-full bg-muted px-2 py-1 font-medium">TanStack v5</span>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-7xl flex-1 gap-0 sm:gap-6 p-0 sm:p-6">
          {/* Sidebar */}
          <aside className="hidden sm:block w-64 shrink-0">
            <nav className="sticky top-24 space-y-1">
              {FEATURES.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveId(f.id)}
                  className={`w-full rounded-xl px-3 py-3 text-left transition-all ${
                    activeId === f.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        activeId === f.id ? "bg-white/20 text-white" : f.badgeColor
                      }`}
                    >
                      {f.badge}
                    </span>
                    <span className="text-[10px]">{f.impact}</span>
                  </div>
                  <p className="mt-1 text-xs font-semibold leading-tight">{f.title}</p>
                  <p
                    className={`mt-0.5 text-[10px] leading-tight ${
                      activeId === f.id ? "text-white/70" : "text-muted-foreground"
                    }`}
                  >
                    {f.summary}
                  </p>
                </button>
              ))}
            </nav>
          </aside>

          {/* Mobile tab strip */}
          <div className="sm:hidden flex overflow-x-auto gap-2 p-4 pb-0 scrollbar-none">
            {FEATURES.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveId(f.id)}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  activeId === f.id
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground"
                }`}
              >
                {f.title}
              </button>
            ))}
          </div>

          {/* Main content */}
          <main className="min-w-0 flex-1 p-4 sm:p-0">
            {/* Context strip */}
            <div className="mb-4 rounded-xl border border-border bg-muted px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>
                  <strong className="text-foreground">Replaces:</strong> {active.replaces}
                </span>
                <span>
                  <strong className="text-foreground">Impact:</strong> {active.impact}
                </span>
                <span>
                  <strong className="text-foreground">Effort:</strong> {active.effort}
                </span>
              </div>
            </div>

            <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
              <ActiveComponent />
            </Suspense>
          </main>
        </div>
      </div>
    </QueryClientProvider>
  );
}
