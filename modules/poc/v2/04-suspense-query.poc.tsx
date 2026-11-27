"use client";

/**
 * ════════════════════════════════════════════════════════════════════
 * FEATURE 4 — TanStack Query: useSuspenseQuery + queryOptions()
 * ════════════════════════════════════════════════════════════════════
 *
 * WHAT IT IS
 * ----------
 * useSuspenseQuery — integrates TanStack Query with React Suspense.
 *   The component suspends while loading; `data` is always defined
 *   (never undefined/null) so no isLoading guards needed.
 *
 * queryOptions() — a factory helper that co-locates queryKey + queryFn
 *   + options in one reusable object. Use in useQuery, useSuspenseQuery,
 *   prefetchQuery, and dehydrate all with the same key.
 *
 * WHAT WE CURRENTLY USE INSTEAD
 * ------------------------------
 * Raw useQuery with inline queryKey + inline isLoading/isError guards.
 * From our actual usePublicPrimeAiData.ts (real code):
 *
 *   const { data: statesData, isLoading: statesLoading, isError } =
 *     useGetPrimeAiProfitOverTime({ ... }, { query: { select: ... } });
 *
 *   // Then in JSX (every single component does this):
 *   if (isLoading) return <SkeletonBlock className="h-32 w-full" />;
 *   if (isError)   return <SectionError ... />;
 *   return <Chart data={data!} />;   // non-null assertion needed
 *
 * HOW useSuspenseQuery + queryOptions IMPROVES THIS
 * --------------------------------------------------
 * 1. data is ALWAYS defined — no ! assertions, no undefined checks.
 * 2. Loading → moved to Suspense boundary (one place, not every component).
 * 3. Error   → moved to ErrorBoundary (one place, not every component).
 * 4. queryOptions() makes query key shareable for prefetching & cache ops.
 * 5. TypeScript types flow through perfectly from query factory.
 *
 * REAL BETSIGNAL USE-CASES
 * -------------------------
 * • usePublicPrimeAiData — multiple isLoading flags (chartLoading,
 *   timelineLoading, monthlyLoading, statesLoading) → 1 Suspense boundary
 * • ScoreDashboardCharts — isLoading prop drilled 3 levels deep
 * • SportsOddsPanel — multiple data-loading guards in JSX
 * • Admin tables — always triple-condition (loading/error/data)
 *
 * HOW IT IMPACTS THE PROJECT
 * ---------------------------
 * - Removes ~200 lines of isLoading/isError conditional JSX across the app
 * - data is guaranteed to be defined — fewer TS non-null assertions
 * - Centralizes loading UX in Suspense boundaries (consistent skeleton design)
 * ════════════════════════════════════════════════════════════════════
 */

import React, { Suspense } from "react";

import { QueryClient, QueryClientProvider, queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";

// ─── Shared types (mirrors our PrimeAI stat cards) ───────────────────────────

interface PrimeAiStats {
  initialBankroll: number;
  currentBankroll: number;
  netProfit: number;
  roi: number;
  winRate: number;
  totalBets: number;
  record: string;
  daysTracked: number;
}

interface BankrollPoint {
  label: string;
  profit: number;
  bankroll: number;
}

// ─── Query factories with queryOptions() ─────────────────────────────────────

/**
 * queryOptions() co-locates key + fetchFn + options.
 * Use this same object in useQuery, useSuspenseQuery, prefetchQuery.
 */
const primeAiStatsQuery = queryOptions({
  queryKey: ["primeAi", "stats"] as const,
  queryFn: async (): Promise<PrimeAiStats> => {
    await new Promise((r) => setTimeout(r, 900));
    return {
      initialBankroll: 10000,
      currentBankroll: 14250,
      netProfit: 4250,
      roi: 42.5,
      winRate: 67.3,
      totalBets: 312,
      record: "210-91-11",
      daysTracked: 187,
    };
  },
  staleTime: 60_000,
});

const bankrollChartQuery = queryOptions({
  queryKey: ["primeAi", "chart"] as const,
  queryFn: async (): Promise<BankrollPoint[]> => {
    await new Promise((r) => setTimeout(r, 1400));
    return Array.from({ length: 24 }, (_, i) => ({
      label: `Month ${i + 1}`,
      profit: Math.round((Math.random() - 0.3) * 800),
      bankroll: 10000 + i * 180,
    }));
  },
  staleTime: 60_000,
});

// ─── CURRENT APPROACH (mirrors usePublicPrimeAiData + StatCards) ─────────────

function PrimeAiStatCardsOLD() {
  // Real pattern: separate isLoading, isError per query
  const { data: stats, isLoading: statsLoading, isError: statsError } = useQuery(primeAiStatsQuery);

  const { data: chart, isLoading: chartLoading, isError: chartError } = useQuery(bankrollChartQuery);

  // Every component duplicates this triple guard
  if (statsLoading || chartLoading) {
    return (
      <div className="space-y-3">
        <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">
          ❌ Current — isLoading guards in every component
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (statsError || chartError) {
    return (
      <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950">Failed to load Prime AI data</div>
    );
  }

  // Now stats and chart need ! assertions because TS doesn't know they're defined
  return <PrimeAiView stats={stats!} chart={chart!} label="Current" />;
}

// ─── NEW APPROACH with useSuspenseQuery ──────────────────────────────────────

function PrimeAiStatCardsNEW() {
  /**
   * useSuspenseQuery — same API as useQuery but:
   * • Suspends while loading (Suspense fallback shows)
   * • Throws on error (ErrorBoundary catches it)
   * • data is ALWAYS defined — no undefined/null, no ! needed
   */
  const { data: stats } = useSuspenseQuery(primeAiStatsQuery);
  const { data: chart } = useSuspenseQuery(bankrollChartQuery);

  // No loading check. No error check. data is always defined. ✓
  return <PrimeAiView stats={stats} chart={chart} label="New" />;
}

// ─── Shared display component ─────────────────────────────────────────────────

const STAT_CONFIGS = [
  {
    key: "currentBankroll",
    label: "Current Bankroll",
    format: (v: number) => `$${v.toLocaleString()}`,
    color: "text-primary",
  },
  {
    key: "netProfit",
    label: "Net Profit",
    format: (v: number) => `${v > 0 ? "+" : ""}$${v.toLocaleString()}`,
    color: (v) => (v > 0 ? "text-green-600" : "text-red-500"),
  },
  { key: "roi", label: "ROI", format: (v: number) => `${v.toFixed(1)}%`, color: "text-primary" },
  { key: "record", label: "Record (W-L-P)", format: (v: any) => v as string, color: "text-foreground" },
  { key: "winRate", label: "Win Rate", format: (v: number) => `${v.toFixed(1)}%`, color: "text-primary" },
  { key: "totalBets", label: "Total Bets", format: (v: number) => v.toString(), color: "text-foreground" },
  { key: "daysTracked", label: "Days Tracked", format: (v: number) => `${v}d`, color: "text-foreground" },
  {
    key: "initialBankroll",
    label: "Starting Bankroll",
    format: (v: number) => `$${v.toLocaleString()}`,
    color: "text-muted-foreground",
  },
] as const;

function PrimeAiView({ stats, chart, label }: { stats: PrimeAiStats; chart: BankrollPoint[]; label: string }) {
  return (
    <div className="space-y-4">
      {label === "New" && (
        <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">
          ✅ With useSuspenseQuery — no isLoading/isError guards, data always defined
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STAT_CONFIGS.map((cfg) => {
          const val = stats[cfg.key as keyof PrimeAiStats] as any;
          const formatted = cfg.format(val);
          const colorClass = typeof cfg.color === "function" ? cfg.color(val) : cfg.color;
          return (
            <div key={cfg.key} className="rounded-xl border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">{cfg.label}</p>
              <p className={`mt-1 text-lg font-bold ${colorClass}`}>{formatted}</p>
            </div>
          );
        })}
      </div>

      {/* Mini sparkline chart */}
      <div className="rounded-xl border border-border bg-background p-4">
        <p className="mb-3 text-sm font-semibold text-foreground">Bankroll Over Time</p>
        <div className="flex h-24 items-end gap-1">
          {chart.slice(-20).map((pt, i) => {
            const h = Math.max(4, Math.min(100, 50 + pt.profit / 20));
            return (
              <div
                key={i}
                className={`flex-1 rounded-t ${pt.profit >= 0 ? "bg-green-500/70" : "bg-red-400/70"}`}
                style={{ height: `${h}%` }}
                title={`${pt.label}: ${pt.profit > 0 ? "+" : ""}$${pt.profit}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton for Suspense fallback ──────────────────────────────────────────

function PrimeAiSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-36 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

// ─── Isolated QueryClient for this demo ──────────────────────────────────────

const demoQueryClient = new QueryClient();

// ─── Demo ─────────────────────────────────────────────────────────────────────

export function SuspenseQueryPOC() {
  const [view, setView] = React.useState<"old" | "new">("new");
  return (
    <QueryClientProvider client={demoQueryClient}>
      <section className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-base font-bold text-foreground">Feature 4 — useSuspenseQuery + queryOptions()</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <strong>Scenario:</strong> Prime AI stat cards (like PublicPrimeAiStatCards). Currently 4 separate isLoading
            flags. With useSuspenseQuery — one Suspense boundary.
          </p>
          <div className="mt-3 flex gap-2">
            {(["old", "new"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  view === v
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {v === "old" ? "Current (isLoading guards)" : "New (useSuspenseQuery)"}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          {view === "old" ? (
            <PrimeAiStatCardsOLD />
          ) : (
            /* Suspense replaces all the isLoading conditionals */
            <Suspense fallback={<PrimeAiSkeleton />}>
              <PrimeAiStatCardsNEW />
            </Suspense>
          )}
        </div>
      </section>
    </QueryClientProvider>
  );
}
