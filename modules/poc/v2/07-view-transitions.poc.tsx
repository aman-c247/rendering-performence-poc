"use client";

/**
 * ════════════════════════════════════════════════════════════════════
 * FEATURE 7 — View Transitions API (Signals Drawer Tab Switching)
 * ════════════════════════════════════════════════════════════════════
 *
 * WHAT IT IS
 * ----------
 * The View Transitions API is a native browser API that animates
 * between two DOM states. React 19 integrates with it via
 * document.startViewTransition(() => startTransition(...)).
 *
 * WHAT WE CURRENTLY USE INSTEAD
 * ------------------------------
 * Instantaneous tab switches with no animation.
 * From SignalsDrawer.tsx (real code):
 *
 *   <Button onClick={() => setActiveTab(tab.key)}>
 *     ...
 *   </Button>
 *   // The content changes with zero transition — abrupt visual jump
 *
 * Also from tab-switcher.tsx shared component:
 *   onClick: (value: string) => void
 *   // All tab content swaps are instant throughout the app
 *
 * HOW VIEW TRANSITIONS IMPROVE THIS
 * ------------------------------------
 * 1. Smooth cross-fade between tab content — no library needed.
 * 2. Zero JS bundle cost — it's a browser API.
 * 3. Automatically degrades gracefully in unsupported browsers.
 * 4. respects prefers-reduced-motion OS setting natively.
 * 5. Can morph specific elements between states (card → detail).
 *
 * REAL BETSIGNAL USE-CASES
 * -------------------------
 * • SignalsDrawer tab switching (Signals / Weather / Injury)
 * • SportsLeagueTabBar (Schedule / Teams / Injuries / Trends)
 * • Score page chart tab (profitOverTime / by sportsbook / by sport)
 * • Prime AI chart period switcher (All Time / Monthly / Weekly)
 * • Admin sports detail tabs (Overview / Schedule / Teams / Leagues)
 *
 * HOW IT IMPACTS THE PROJECT
 * ---------------------------
 * - Polished "app-like" feel with zero external dependencies
 * - Drop-in enhancement on existing onClick handlers (3 lines)
 * - Differentiating UX improvement for tab-heavy pages
 * ════════════════════════════════════════════════════════════════════
 */

import React, { startTransition, useState } from "react";

// ─── Feature detection ────────────────────────────────────────────────────────

function withViewTransition(cb: () => void) {
  if (typeof document !== "undefined" && "startViewTransition" in document) {
    document.startViewTransition(() => startTransition(cb));
  } else {
    startTransition(cb);
  }
}

// ─── Types (mirrors SignalsDrawer tab structure) ──────────────────────────────

type SignalTab = "signals" | "weather" | "injury";

interface TabConfig {
  key: SignalTab;
  label: string;
  icon: string;
}

const TABS: TabConfig[] = [
  { key: "signals", label: "Signals", icon: "📊" },
  { key: "weather", label: "Weather", icon: "🌤" },
  { key: "injury", label: "Injuries", icon: "🩹" },
];

// ─── Tab content (mirrors our actual drawer tabs) ─────────────────────────────

function SignalsContent() {
  const logs = [
    { id: 1, type: "Value Bet", match: "Chiefs vs Eagles", outcome: "win", pnl: +142.5, odds: "2.10" },
    { id: 2, type: "Sharp Money", match: "Lakers vs Celtics", outcome: "loss", pnl: -88.0, odds: "1.85" },
    { id: 3, type: "Line Move", match: "Yankees vs Red Sox", outcome: "pending", pnl: 0, odds: "1.95" },
    { id: 4, type: "Value Bet", match: "49ers vs Cowboys", outcome: "win", pnl: +95.0, odds: "2.40" },
    { id: 5, type: "Injury Alert", match: "Celtics vs Heat", outcome: "push", pnl: 0, odds: "1.75" },
  ];
  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div key={log.id} className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{log.type}</p>
            <p className="truncate text-sm font-medium">{log.match}</p>
          </div>
          <div className="text-right shrink-0">
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                log.outcome === "win"
                  ? "bg-green-50 text-green-700 dark:bg-green-950"
                  : log.outcome === "loss"
                    ? "bg-red-50 text-red-600 dark:bg-red-950"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {log.outcome}
            </span>
            {log.pnl !== 0 && (
              <p className={`mt-0.5 font-mono text-xs ${log.pnl > 0 ? "text-green-600" : "text-red-500"}`}>
                {log.pnl > 0 ? "+" : ""}${Math.abs(log.pnl).toFixed(2)}
              </p>
            )}
          </div>
          <span className="font-mono text-xs text-primary">{log.odds}</span>
        </div>
      ))}
    </div>
  );
}

function WeatherContent() {
  const data = [
    { team: "Chiefs", city: "Kansas City", temp: "28°F", wind: "15mph NW", condition: "⛄ Snow", impact: "High" },
    { team: "Eagles", city: "Philadelphia", temp: "42°F", wind: "8mph E", condition: "🌧 Rain", impact: "Medium" },
  ];
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Weather conditions for tracked matches</p>
      {data.map((w) => (
        <div key={w.team} className="rounded-xl border border-border bg-background p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">{w.team}</p>
              <p className="text-xs text-muted-foreground">{w.city}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl">{w.condition.split(" ")[0]}</p>
              <p className="text-xs text-muted-foreground">{w.condition.split(" ").slice(1).join(" ")}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-muted p-2">
              <p className="text-xs text-muted-foreground">Temp</p>
              <p className="text-sm font-bold">{w.temp}</p>
            </div>
            <div className="rounded-lg bg-muted p-2">
              <p className="text-xs text-muted-foreground">Wind</p>
              <p className="text-sm font-bold">{w.wind}</p>
            </div>
            <div className="rounded-lg bg-muted p-2">
              <p className="text-xs text-muted-foreground">Impact</p>
              <p className={`text-sm font-bold ${w.impact === "High" ? "text-red-500" : "text-orange-500"}`}>
                {w.impact}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function InjuryContent() {
  const injuries = [
    { player: "P. Mahomes", team: "Chiefs", position: "QB", status: "Questionable", injury: "Ankle" },
    { player: "J. Hurts", team: "Eagles", position: "QB", status: "Probable", injury: "Shoulder" },
    { player: "L. James", team: "Lakers", position: "SF", status: "Out", injury: "Knee" },
    { player: "J. Tatum", team: "Celtics", position: "SF", status: "Active", injury: "—" },
  ];
  const STATUS_COLOR: Record<string, string> = {
    Out: "bg-red-50 text-red-600 dark:bg-red-950",
    Questionable: "bg-orange-50 text-orange-600 dark:bg-orange-950",
    Probable: "bg-yellow-50 text-yellow-600 dark:bg-yellow-950",
    Active: "bg-green-50 text-green-600 dark:bg-green-950",
  };
  return (
    <div className="space-y-2">
      {injuries.map((inj) => (
        <div
          key={inj.player}
          className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{inj.player}</p>
            <p className="text-xs text-muted-foreground">
              {inj.team} · {inj.position}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[inj.status] ?? ""}`}>
              {inj.status}
            </span>
            {inj.injury !== "—" && <p className="mt-0.5 text-xs text-muted-foreground">{inj.injury}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

const TAB_CONTENT: Record<SignalTab, React.ReactNode> = {
  signals: <SignalsContent />,
  weather: <WeatherContent />,
  injury: <InjuryContent />,
};

// ─── CURRENT APPROACH (mirrors SignalsDrawer.tsx tab switching) ───────────────

function SignalsDrawerOLD() {
  const [activeTab, setActiveTab] = useState<SignalTab>("signals");
  const [match] = useState({ home: "Chiefs", away: "Eagles", time: "Sun 4:25 PM ET" });

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border bg-muted px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">📊 Signals</span>
          <span className="text-xs text-muted-foreground">
            · {match.home} vs {match.away} · {match.time}
          </span>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-border bg-background px-4 py-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)} // ← instant, no animation
            className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        <p className="mb-3 text-xs font-semibold text-red-500 uppercase">
          ❌ Current — instant content swap, no animation
        </p>
        {/* Instant switch — abrupt visual jump */}
        {TAB_CONTENT[activeTab]}
      </div>
    </div>
  );
}

// ─── NEW APPROACH with View Transitions ──────────────────────────────────────

function SignalsDrawerNEW() {
  const [activeTab, setActiveTab] = useState<SignalTab>("signals");
  const [match] = useState({ home: "Chiefs", away: "Eagles", time: "Sun 4:25 PM ET" });

  function handleTabChange(tab: SignalTab) {
    // 3-line drop-in — no library, no Framer Motion
    withViewTransition(() => setActiveTab(tab));
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border bg-muted px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">📊 Signals</span>
          <span className="text-xs text-muted-foreground">
            · {match.home} vs {match.away} · {match.time}
          </span>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-border bg-background px-4 py-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleTabChange(tab.key)} // ← smooth cross-fade
            className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* view-transition-name enables the cross-fade on this element */}
      <div className="p-4" style={{ viewTransitionName: "signals-drawer-content" }}>
        <p className="mb-3 text-xs font-semibold text-green-600 uppercase">
          ✅ New — smooth cross-fade via View Transitions API (3 lines added)
        </p>
        {TAB_CONTENT[activeTab]}
      </div>
    </div>
  );
}

// ─── Demo ─────────────────────────────────────────────────────────────────────

export function ViewTransitionsPOC() {
  const [view, setView] = React.useState<"old" | "new">("new");
  const supported = typeof document !== "undefined" && "startViewTransition" in document;

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-bold text-foreground">Feature 7 — View Transitions API</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          <strong>Scenario:</strong> SignalsDrawer tab switching (Signals / Weather / Injury). Click tabs rapidly — feel
          the difference between instant and animated transitions.
        </p>
        {!supported && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950">
            ⚠ Your browser doesn't support View Transitions yet — tabs still work, just without animation.
          </p>
        )}
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
              {v === "old" ? "Current (instant swap)" : "New (View Transitions)"}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        {view === "old" ? <SignalsDrawerOLD /> : <SignalsDrawerNEW />}
      </div>

      <div className="rounded-lg bg-muted px-4 py-3 text-xs text-muted-foreground">
        <strong>Add to globals.css</strong> to customise the animation:
        <pre className="mt-2 overflow-x-auto text-[11px]">{`::view-transition-old(signals-drawer-content) {
  animation: 150ms ease-out fade-out;
}
::view-transition-new(signals-drawer-content) {
  animation: 200ms ease-in fade-in;
}`}</pre>
      </div>
    </section>
  );
}
