"use client";

/**
 * ════════════════════════════════════════════════════════════════════
 * FEATURE 6 — TanStack Query: useInfiniteQuery (Pulse Feed)
 * ════════════════════════════════════════════════════════════════════
 *
 * WHAT IT IS
 * ----------
 * useInfiniteQuery manages paginated data where each page is appended
 * to the previous pages (infinite scroll / "load more" pattern).
 *
 * WHAT WE CURRENTLY USE INSTEAD
 * ------------------------------
 * Manual page state + allItems accumulator array + useEffect merging.
 * From our actual usePulseFeedPage.ts (real code):
 *
 *   const [page, setPage] = useState(1);
 *   const [allItems, setAllItems] = useState<SignalLog[]>([]);
 *   const prevPageRef = useRef(0);
 *
 *   const { data } = useGetPulseLogs({ page, limit: 10 });
 *
 *   useEffect(() => {
 *     if (!data || page === prevPageRef.current) return;
 *     prevPageRef.current = page;
 *     setAllItems((prev) =>
 *       page === 1 ? newItems : [...prev, ...newItems]
 *     );
 *   }, [data, page]);
 *
 * HOW useInfiniteQuery IMPROVES THIS
 * ------------------------------------
 * 1. No manual page state, no allItems accumulator, no prevPageRef.
 * 2. data.pages is a stable array of all fetched pages.
 * 3. fetchNextPage() advances the cursor automatically.
 * 4. hasNextPage, isFetchingNextPage built-in.
 * 5. Background refetch of all pages on window focus.
 *
 * REAL BETSIGNAL USE-CASES
 * -------------------------
 * • Pulse feed (usePulseFeedPage) — 3 refs + useEffect currently
 * • Signals drawer logs (useGetPulseLogs with page param)
 * • Admin user management table pagination
 * • Sportsbook infinite list (useAddToScoreSportsbooks has this!)
 *
 * HOW IT IMPACTS THE PROJECT
 * ---------------------------
 * - Removes ~40 lines of manual pagination state in usePulseFeedPage
 * - Eliminates stale closure bugs with prevPageRef pattern
 * - Enables smooth infinite scroll without page-flip UX
 * ════════════════════════════════════════════════════════════════════
 */

import React from "react";

import { QueryClient, QueryClientProvider, useInfiniteQuery } from "@tanstack/react-query";

// ─── Types (mirrors SignalLog from our API) ───────────────────────────────────

interface SignalLog {
  id: number;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  signalType: "value_bet" | "sharp_money" | "line_move" | "injury_alert";
  outcome: "win" | "loss" | "pending" | "push";
  profitLoss: number;
  odds: string;
  timestamp: string;
  isUnread: boolean;
}

const SIGNAL_TYPES = ["value_bet", "sharp_money", "line_move", "injury_alert"] as const;
const OUTCOMES = ["win", "loss", "pending", "push"] as const;
const SPORTS_DATA = ["NFL", "NBA", "MLB", "NHL"];

function generateSignalLogs(page: number, limit = 10): SignalLog[] {
  return Array.from({ length: limit }, (_, i) => {
    const idx = (page - 1) * limit + i;
    const outcome = OUTCOMES[idx % 4]!;
    return {
      id: idx + 1,
      sport: SPORTS_DATA[idx % 4]!,
      league: `League ${(idx % 6) + 1}`,
      homeTeam: `Team ${idx * 2 + 1}`,
      awayTeam: `Team ${idx * 2 + 2}`,
      signalType: SIGNAL_TYPES[idx % 4]!,
      outcome,
      profitLoss:
        outcome === "win"
          ? +(Math.random() * 200).toFixed(2)
          : outcome === "loss"
            ? -(Math.random() * 150).toFixed(2)
            : 0,
      odds: (1.5 + (idx % 20) * 0.1).toFixed(2),
      timestamp: new Date(Date.now() - idx * 1800000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isUnread: idx < 3,
    };
  });
}

async function fetchSignalLogs(page: number): Promise<{
  items: SignalLog[];
  total: number;
  nextPage: number | null;
}> {
  await new Promise((r) => setTimeout(r, 600));
  const TOTAL = 47; // mirrors our pulse feed total
  const items = generateSignalLogs(page);
  return {
    items,
    total: TOTAL,
    nextPage: page * 10 < TOTAL ? page + 1 : null,
  };
}

// ─── CURRENT APPROACH (mirrors usePulseFeedPage.ts pattern) ──────────────────

function PulseFeedOLD() {
  const [page, setPage] = React.useState(1);
  const [allItems, setAllItems] = React.useState<SignalLog[]>([]);
  const prevPageRef = React.useRef(0);
  const [hasNextPage, setHasNextPage] = React.useState(false);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);

  // Manual fetch simulation
  React.useEffect(() => {
    if (page === prevPageRef.current) return;
    prevPageRef.current = page;
    setIsLoadingMore(true);
    fetchSignalLogs(page).then(({ items, nextPage }) => {
      setAllItems((prev) => (page === 1 ? items : [...prev, ...items]));
      setHasNextPage(!!nextPage);
      setIsLoadingMore(false);
    });
  }, [page]);

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">
        ❌ Current — manual page state + allItems accumulator + 2 refs
      </p>
      <SignalLogList
        items={allItems}
        isLoadingMore={isLoadingMore}
        hasNextPage={hasNextPage}
        onLoadMore={() => setPage((p) => p + 1)}
        total={47}
      />
    </div>
  );
}

// ─── NEW APPROACH with useInfiniteQuery ──────────────────────────────────────

function PulseFeedNEW() {
  /**
   * useInfiniteQuery — manages ALL pages automatically.
   * data.pages is an array of each page's response.
   * data.pages.flatMap() gives you all items across pages.
   */
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ["pulse", "feed"] as const,
    queryFn: ({ pageParam }) => fetchSignalLogs(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    // No allItems state, no prevPageRef, no useEffect merging needed
  });

  if (isLoading) return <SignalLogSkeleton />;

  const allItems = data.pages.flatMap((p) => p.items);
  const total = data.pages[0]?.total ?? 0;

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">
        ✅ With useInfiniteQuery — no manual page state, no refs, no useEffect
      </p>
      <SignalLogList
        items={allItems}
        isLoadingMore={isFetchingNextPage}
        hasNextPage={!!hasNextPage}
        onLoadMore={() => fetchNextPage()}
        total={total}
      />
    </div>
  );
}

// ─── Shared display components ────────────────────────────────────────────────

const OUTCOME_STYLE = {
  win: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  loss: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
  pending: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300",
  push: "bg-muted text-muted-foreground",
};

const SIGNAL_LABEL: Record<string, string> = {
  value_bet: "Value Bet",
  sharp_money: "Sharp Money",
  line_move: "Line Move",
  injury_alert: "Injury Alert",
};

function SignalLogList({
  items,
  isLoadingMore,
  hasNextPage,
  onLoadMore,
  total,
}: {
  items: SignalLog[];
  isLoadingMore: boolean;
  hasNextPage: boolean;
  onLoadMore: () => void;
  total: number;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Showing {items.length} of {total} signals
      </p>

      <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
        {items.map((log) => (
          <div
            key={log.id}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
              log.isUnread ? "border-primary/40 bg-primary/5" : "border-border bg-background"
            }`}
          >
            {log.isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">{log.sport}</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{SIGNAL_LABEL[log.signalType]}</span>
              </div>
              <p className="mt-0.5 truncate text-sm font-medium text-foreground">
                {log.homeTeam} vs {log.awayTeam}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span className={`rounded px-2 py-0.5 text-xs font-semibold ${OUTCOME_STYLE[log.outcome]}`}>
                {log.outcome.toUpperCase()}
              </span>
              {log.profitLoss !== 0 && (
                <p className={`mt-0.5 text-xs font-mono ${log.profitLoss > 0 ? "text-green-600" : "text-red-500"}`}>
                  {log.profitLoss > 0 ? "+" : ""}${Math.abs(log.profitLoss).toFixed(2)}
                </p>
              )}
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{log.timestamp}</span>
          </div>
        ))}
      </div>

      {hasNextPage && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={isLoadingMore}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50"
        >
          {isLoadingMore ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Loading more signals…
            </>
          ) : (
            "Load more signals"
          )}
        </button>
      )}
    </div>
  );
}

function SignalLogSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}

// ─── Isolated QueryClient ─────────────────────────────────────────────────────

const demoClient = new QueryClient();

// ─── Demo ─────────────────────────────────────────────────────────────────────

export function InfiniteQueryPOC() {
  const [view, setView] = React.useState<"old" | "new">("new");
  return (
    <QueryClientProvider client={demoClient}>
      <section className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-base font-bold text-foreground">Feature 6 — useInfiniteQuery (Pulse Feed)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <strong>Scenario:</strong> Pulse signal feed with "load more". Currently 40+ lines of manual state. With
            useInfiniteQuery — 8 lines.
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
                {v === "old" ? "Current (manual page state + refs)" : "New (useInfiniteQuery)"}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          {view === "old" ? <PulseFeedOLD /> : <PulseFeedNEW />}
        </div>
      </section>
    </QueryClientProvider>
  );
}
