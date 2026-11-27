"use client";

/**
 * ════════════════════════════════════════════════════════════════════
 * FEATURE 5 — TanStack Query: Optimistic Mutations (onMutate pattern)
 * ════════════════════════════════════════════════════════════════════
 *
 * WHAT IT IS
 * ----------
 * TanStack Query's useMutation provides onMutate / onError / onSettled
 * lifecycle hooks that enable full optimistic update patterns with
 * automatic cache rollback on failure.
 *
 * WHAT WE CURRENTLY USE INSTEAD
 * ------------------------------
 * We call mutate(), then invalidate the query on success.
 * From useLeagueDetailPage.ts and BankrollTab.tsx (real code):
 *
 *   const { mutate: resetBankroll, isPending } = usePostScoreBankrollReset();
 *   function handleReset() {
 *     resetBankroll(undefined, {
 *       onSuccess: () => {
 *         queryClient.invalidateQueries({ queryKey: getGetScoreBankrollQueryKey() });
 *         toast.success("Bankroll reset");
 *       },
 *       onError: () => toast.error("Reset failed"),
 *     });
 *   }
 *   // UI: button is disabled while isPending, then refreshes after success
 *
 * HOW onMutate OPTIMISTIC UPDATES IMPROVE THIS
 * ----------------------------------------------
 * 1. UI reflects change instantly — no "button disabled + spinner".
 * 2. Cache is updated before server response — consistent reads.
 * 3. Automatic rollback: onError receives context.previous → restore.
 * 4. onSettled re-syncs with server in all cases.
 * 5. Works identically with useOptimistic for even richer UX.
 *
 * REAL BETSIGNAL USE-CASES
 * -------------------------
 * • Signal logs mark-as-read (Pulse feed badge count)
 * • Sportsbook status toggle in Auto-Exchange admin
 * • Score bankroll operations (add/reset/kelly)
 * • User management ban/unban in Admin
 * • Exchange enable/disable toggle
 *
 * HOW IT IMPACTS THE PROJECT
 * ---------------------------
 * - Eliminates 200ms+ perceived lag on common toggle/action operations
 * - Removes "wait for invalidate → re-fetch → re-render" waterfall
 * - Makes failed mutations recoverable without page refresh
 * ════════════════════════════════════════════════════════════════════
 */

import React, { Suspense } from "react";

import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ─── Types (mirrors our Exchange / Sportsbook domain) ────────────────────────

interface Exchange {
  id: string;
  name: string;
  logo: string;
  enabled: boolean;
  profitToday: number;
  ordersToday: number;
  apiStatus: "connected" | "error" | "inactive";
}

// ─── Simulated API ────────────────────────────────────────────────────────────

const EXCHANGES_DATA: Exchange[] = [
  {
    id: "betfair",
    name: "Betfair",
    logo: "🏦",
    enabled: true,
    profitToday: 142.5,
    ordersToday: 23,
    apiStatus: "connected",
  },
  {
    id: "pinnacle",
    name: "Pinnacle",
    logo: "📊",
    enabled: true,
    profitToday: -34.2,
    ordersToday: 11,
    apiStatus: "connected",
  },
  {
    id: "draftkings",
    name: "DraftKings",
    logo: "🎯",
    enabled: false,
    profitToday: 0,
    ordersToday: 0,
    apiStatus: "inactive",
  },
  {
    id: "fanduel",
    name: "FanDuel",
    logo: "🏈",
    enabled: true,
    profitToday: 89.75,
    ordersToday: 17,
    apiStatus: "error",
  },
];

async function apiGetExchanges(): Promise<Exchange[]> {
  await new Promise((r) => setTimeout(r, 600));
  return EXCHANGES_DATA;
}

async function apiToggleExchange(id: string, enabled: boolean): Promise<Exchange> {
  await new Promise((r) => setTimeout(r, 900));
  if (Math.random() < 0.2) throw new Error("API error — toggle failed");
  const ex = EXCHANGES_DATA.find((e) => e.id === id)!;
  return { ...ex, enabled };
}

// ─── CURRENT APPROACH (mirrors Auto-Exchange admin toggle pattern) ────────────

const EXCHANGE_QUERY_KEY = ["exchanges"] as const;

function ExchangeListOLD() {
  const queryClient = useQueryClient();
  const { data: exchanges, isLoading } = useQuery({
    queryKey: EXCHANGE_QUERY_KEY,
    queryFn: apiGetExchanges,
  });

  // Current pattern: isPending disables button, invalidate after success
  const {
    mutate: toggle,
    isPending,
    variables,
  } = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => apiToggleExchange(id, enabled),
    onSuccess: () => {
      // Re-fetches from server — UI lags by another round-trip
      queryClient.invalidateQueries({ queryKey: EXCHANGE_QUERY_KEY });
    },
    onError: () => alert("Toggle failed"),
  });

  if (isLoading) return <div className="h-48 animate-pulse rounded-xl bg-muted" />;

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">
        ❌ Current — disable button while pending, re-fetch after success
      </p>
      {exchanges!.map((ex) => {
        const isThisToggling = isPending && variables?.id === ex.id;
        return (
          <ExchangeRow
            key={ex.id}
            exchange={ex}
            isToggling={isThisToggling}
            onToggle={() => toggle({ id: ex.id, enabled: !ex.enabled })}
          />
        );
      })}
    </div>
  );
}

// ─── NEW APPROACH with optimistic mutation ────────────────────────────────────

function ExchangeListNEW() {
  const queryClient = useQueryClient();
  const { data: exchanges, isLoading } = useQuery({
    queryKey: EXCHANGE_QUERY_KEY,
    queryFn: apiGetExchanges,
  });

  const { mutate: toggle } = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => apiToggleExchange(id, enabled),

    /**
     * onMutate fires BEFORE the API call.
     * 1. Cancel in-flight queries (avoid overwrite race)
     * 2. Snapshot previous value (for rollback)
     * 3. Optimistically update cache immediately
     * 4. Return snapshot as context
     */
    onMutate: async ({ id, enabled }) => {
      await queryClient.cancelQueries({ queryKey: EXCHANGE_QUERY_KEY });

      const previous = queryClient.getQueryData<Exchange[]>(EXCHANGE_QUERY_KEY);

      queryClient.setQueryData<Exchange[]>(EXCHANGE_QUERY_KEY, (old) =>
        old?.map((ex) => (ex.id === id ? { ...ex, enabled } : ex)),
      );

      return { previous }; // passed to onError as context
    },

    /**
     * onError — rollback optimistic update to previous snapshot
     */
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(EXCHANGE_QUERY_KEY, context.previous);
      }
      // Show error toast here (like our sonner usage)
    },

    /**
     * onSettled — always re-sync with server (success or error)
     */
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: EXCHANGE_QUERY_KEY });
    },
  });

  if (isLoading) return <div className="h-48 animate-pulse rounded-xl bg-muted" />;

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">
        ✅ With optimistic mutation — instant toggle, auto-rollback on error
      </p>
      {exchanges!.map((ex) => (
        <ExchangeRow
          key={ex.id}
          exchange={ex}
          isToggling={false} // never disabled — optimistic update handles it
          onToggle={() => toggle({ id: ex.id, enabled: !ex.enabled })}
        />
      ))}
    </div>
  );
}

// ─── Shared row component ─────────────────────────────────────────────────────

const API_STATUS_STYLE = {
  connected: "text-green-600 bg-green-50 dark:bg-green-950",
  error: "text-red-500 bg-red-50 dark:bg-red-950",
  inactive: "text-muted-foreground bg-muted",
};

function ExchangeRow({
  exchange: ex,
  isToggling,
  onToggle,
}: {
  exchange: Exchange;
  isToggling: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-background px-4 py-3">
      <span className="text-2xl">{ex.logo}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{ex.name}</span>
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${API_STATUS_STYLE[ex.apiStatus]}`}
          >
            {ex.apiStatus}
          </span>
        </div>
        <div className="mt-0.5 flex gap-4 text-xs text-muted-foreground">
          <span>
            P&L Today:{" "}
            <span className={ex.profitToday >= 0 ? "text-green-600" : "text-red-500"}>
              {ex.profitToday >= 0 ? "+" : ""}${ex.profitToday.toFixed(2)}
            </span>
          </span>
          <span>Orders: {ex.ordersToday}</span>
        </div>
      </div>

      <button
        type="button"
        disabled={isToggling}
        onClick={onToggle}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40 ${
          ex.enabled ? "bg-primary" : "bg-muted-foreground/30"
        }`}
      >
        {isToggling ? (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </span>
        ) : (
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              ex.enabled ? "left-5" : "left-0.5"
            }`}
          />
        )}
      </button>
    </div>
  );
}

// ─── Isolated QueryClient ─────────────────────────────────────────────────────

const demoClient = new QueryClient();

// ─── Demo ─────────────────────────────────────────────────────────────────────

export function OptimisticMutationPOC() {
  const [view, setView] = React.useState<"old" | "new">("new");
  return (
    <QueryClientProvider client={demoClient}>
      <section className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-base font-bold text-foreground">Feature 5 — Optimistic Mutations (TanStack Query)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <strong>Scenario:</strong> Auto-Exchange admin — enable/disable exchanges. Toggle quickly and notice instant
            vs delayed feedback. 20% chance of server failure triggers rollback.
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
                {v === "old" ? "Current (invalidate after success)" : "New (optimistic + rollback)"}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          {view === "old" ? <ExchangeListOLD /> : <ExchangeListNEW />}
        </div>
      </section>
    </QueryClientProvider>
  );
}
