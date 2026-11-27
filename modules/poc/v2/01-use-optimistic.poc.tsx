"use client";

/**
 * ════════════════════════════════════════════════════════════════════
 * FEATURE 1 — useOptimistic (React 19)
 * ════════════════════════════════════════════════════════════════════
 *
 * WHAT IT IS
 * ----------
 * useOptimistic lets you show an instant, temporary "optimistic" UI
 * update while an async mutation is in-flight.  When the mutation
 * settles React automatically reverts to the real server state if it
 * fails, or keeps the optimistic state if it succeeds.
 *
 * WHAT WE CURRENTLY USE INSTEAD
 * ------------------------------
 * We set a local `isSaving / isPending` boolean, disable the button,
 * show a spinner, wait 1-2 s for the server, then update the UI.
 * Example from our codebase:
 *
 *   // useAccountSettings.ts  (actual pattern)
 *   const { mutate, isPending } = usePutAuthUpdateProfile();
 *   function onSubmit(data) {
 *     mutate(data, {
 *       onSuccess: () => toast.success("Saved"),
 *       onError:   () => toast.error("Failed"),
 *     });
 *   }
 *   // UI waits for `isPending` to clear before showing "saved" state
 *
 * HOW useOptimistic IMPROVES THIS
 * --------------------------------
 * 1. UI updates instantly — no spinner wait.
 * 2. Auto-rollback on error — no manual error-state cleanup.
 * 3. Works naturally inside startTransition — React handles concurrency.
 * 4. Perceived performance improvement is dramatic for toggle-style actions.
 *
 * REAL BETSIGNAL USE-CASES
 * -------------------------
 * • Notification preference toggles on Account Settings
 * • Signal bookmark / follow on Pulse feed
 * • Sportsbook enable/disable in Auto-Exchange admin
 * • Score bankroll reset confirmation (instant feedback)
 *
 * HOW IT IMPACTS THE PROJECT
 * ---------------------------
 * - UX: actions feel instant instead of "loading..."
 * - Code: removes isPending guards from JSX (cleaner render)
 * - Reliability: rollback is guaranteed by React, not custom logic
 * ════════════════════════════════════════════════════════════════════
 */

import { useOptimistic, useTransition } from "react";

// ─── Mock API (mirrors our usePutAuthUpdateProfile pattern) ──────────────────

async function apiUpdateNotificationPrefs(prefs: NotificationPref[]): Promise<NotificationPref[]> {
  await new Promise((r) => setTimeout(r, 1200));
  // Simulate 15% server failure (triggers rollback)
  if (Math.random() < 0.15) throw new Error("Server error — rolled back");
  return prefs;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface NotificationPref {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

// ─── CURRENT APPROACH (what BetSignal does today) ────────────────────────────

function NotificationSettingsOLD() {
  // Actual pattern from account-settings pages:
  // 3-5 useState + useMutation + isPending guard
  const [prefs, setPrefs] = React.useState<NotificationPref[]>(INITIAL_PREFS);
  const [savingId, setSavingId] = React.useState<string | null>(null);

  async function handleToggle(pref: NotificationPref) {
    setSavingId(pref.id); // show spinner on this row
    try {
      await apiUpdateNotificationPrefs(prefs.map((p) => (p.id === pref.id ? { ...p, enabled: !p.enabled } : p)));
      setPrefs((prev) => prev.map((p) => (p.id === pref.id ? { ...p, enabled: !p.enabled } : p)));
    } catch {
      // nothing — UI stays on old value
    } finally {
      setSavingId(null); // remove spinner
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">
        ❌ Current approach — user waits 1.2 s for each toggle
      </p>
      {prefs.map((pref) => (
        <div
          key={pref.id}
          className="flex items-center justify-between rounded-xl border border-border bg-background p-4"
        >
          <div>
            <p className="text-sm font-medium text-foreground">{pref.label}</p>
            <p className="text-xs text-muted-foreground">{pref.description}</p>
          </div>
          <button
            type="button"
            disabled={savingId === pref.id}
            onClick={() => handleToggle(pref)}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              pref.enabled ? "bg-primary" : "bg-muted-foreground/30"
            } disabled:opacity-40`}
          >
            {savingId === pref.id && (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
              </span>
            )}
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                pref.enabled ? "left-5" : "left-0.5"
              } ${savingId === pref.id ? "opacity-0" : ""}`}
            />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── NEW APPROACH with useOptimistic ─────────────────────────────────────────

function NotificationSettingsNEW() {
  /**
   * useOptimistic(realState, updateFn)
   * ────────────────────────────────────
   * optimisticPrefs  — what we render (may be ahead of server)
   * setOptimistic    — dispatcher that temporarily patches the state
   *
   * When startTransition's async fn settles:
   *   ✓ success → React keeps optimistic state as real state
   *   ✗ failure → React auto-reverts to `prefs` (the real state)
   */
  const [prefs, setPrefs] = React.useState<NotificationPref[]>(INITIAL_PREFS);
  const [optimisticPrefs, setOptimistic] = useOptimistic(
    prefs,
    (current, { id, enabled }: { id: string; enabled: boolean }) =>
      current.map((p) => (p.id === id ? { ...p, enabled } : p)),
  );
  const [isPending, startTransition] = useTransition();
  const [lastError, setLastError] = React.useState<string | null>(null);

  function handleToggle(pref: NotificationPref) {
    const nextEnabled = !pref.enabled;
    setLastError(null);

    startTransition(async () => {
      // 1. Instant UI update (before API call)
      setOptimistic({ id: pref.id, enabled: nextEnabled });

      try {
        // 2. Real API call
        const updated = await apiUpdateNotificationPrefs(
          prefs.map((p) => (p.id === pref.id ? { ...p, enabled: nextEnabled } : p)),
        );
        // 3. Persist real state from server response
        setPrefs(updated);
      } catch (err) {
        // 4. React auto-reverts optimisticPrefs → prefs (old value)
        setLastError("Failed to save. Changes reverted.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">
        ✅ With useOptimistic — instant toggle, auto-rollback on error
      </p>
      {lastError && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950 dark:text-red-400">
          {lastError}
        </div>
      )}
      {optimisticPrefs.map((pref) => (
        <div
          key={pref.id}
          className="flex items-center justify-between rounded-xl border border-border bg-background p-4"
        >
          <div>
            <p className="text-sm font-medium text-foreground">{pref.label}</p>
            <p className="text-xs text-muted-foreground">{pref.description}</p>
          </div>
          {/* No disabled state, no spinner — toggle is instant */}
          <button
            type="button"
            onClick={() => handleToggle(pref)}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              pref.enabled ? "bg-primary" : "bg-muted-foreground/30"
            }`}
            aria-pressed={pref.enabled}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                pref.enabled ? "left-5" : "left-0.5"
              }`}
            />
          </button>
        </div>
      ))}
      {isPending && <p className="text-xs text-muted-foreground animate-pulse">Syncing with server…</p>}
    </div>
  );
}

// ─── Data + Demo ─────────────────────────────────────────────────────────────

import React from "react";

const INITIAL_PREFS: NotificationPref[] = [
  {
    id: "new_signals",
    label: "New Signal Alerts",
    description: "Get notified when Prime AI generates a new signal",
    enabled: true,
  },
  {
    id: "edge_alerts",
    label: "Edge Alerts",
    description: "Line movement and sharp money detection",
    enabled: false,
  },
  {
    id: "odds_change",
    label: "Odds Changes",
    description: "Real-time odds movement for tracked matches",
    enabled: true,
  },
  {
    id: "pnl_summary",
    label: "Daily P&L Summary",
    description: "End-of-day bankroll performance email",
    enabled: false,
  },
];

export function UseOptimisticPOC() {
  const [view, setView] = React.useState<"old" | "new">("new");
  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-bold text-foreground">Feature 1 — useOptimistic</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          <strong>Scenario:</strong> Notification Preferences in Account Settings. Toggle a preference — does the UI
          wait for the server or update instantly?
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
              {v === "old" ? "Current (useState + isPending)" : "New (useOptimistic)"}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        {view === "old" ? <NotificationSettingsOLD /> : <NotificationSettingsNEW />}
      </div>
    </section>
  );
}
