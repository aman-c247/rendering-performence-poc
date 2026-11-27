"use client";

/**
 * ════════════════════════════════════════════════════════════════════
 * FEATURE 3 — useDeferredValue + useTransition (React Concurrent)
 * ════════════════════════════════════════════════════════════════════
 *
 * WHAT IT IS
 * ----------
 * useDeferredValue(value) — returns a "deferred" copy of a value.
 *   React renders with the old value first (keeping input snappy),
 *   then re-renders with the new value when the browser is idle.
 *
 * useTransition() — marks a state update as "non-urgent", so React
 *   can interrupt it in favour of higher-priority work (e.g. keystrokes).
 *
 * WHAT WE CURRENTLY USE INSTEAD
 * ------------------------------
 * Manual debouncing with setTimeout refs + multiple useEffect chains.
 * From the real SearchMatchDropdown.tsx in our codebase:
 *
 *   const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 *   const skipInitialDebounceRef = useRef(true);
 *   const lastEmittedRef = useRef<string | null>(null);
 *
 *   useEffect(() => {
 *     if (skipInitialDebounceRef.current) {
 *       skipInitialDebounceRef.current = false;
 *       return;
 *     }
 *     if (debounceRef.current) clearTimeout(debounceRef.current);
 *     debounceRef.current = setTimeout(() => {
 *       // ... 20 more lines
 *     }, DEFAULT_DEBOUNCE_MS);
 *   }, [localValue]);
 *
 * HOW useDeferredValue IMPROVES THIS
 * ------------------------------------
 * 1. No manual setTimeout/clearTimeout/useRef management.
 * 2. React schedules the deferred render automatically.
 * 3. Input stays at 60fps even while filtering 500+ odds rows.
 * 4. Shows "stale" data while computing — better than blank.
 * 5. Zero delay on slow machines (adapts to frame budget).
 *
 * REAL BETSIGNAL USE-CASES
 * -------------------------
 * • SearchMatchDropdown — search through 300-500 live odds matches
 * • MarketSelectDropdown — filter market categories
 * • SportsLeagueListTable — filter league/team names
 * • Admin user management search
 *
 * HOW IT IMPACTS THE PROJECT
 * ---------------------------
 * - Removes ~30 lines of debounce boilerplate per search input
 * - Eliminates timing bugs (double-fire, stale closure issues)
 * - Better UX on mobile / slow devices
 * ════════════════════════════════════════════════════════════════════
 */

import React, { memo, useDeferredValue, useMemo, useState, useTransition } from "react";

// ─── Mock data: 400 live odds matches (like our SportsOdds table) ─────────────

const SPORTS = ["NFL", "NBA", "MLB", "NHL", "MLS", "UFC"];
const LEAGUES = {
  NFL: ["AFC East", "NFC North", "AFC South"],
  NBA: ["Eastern Conf", "Western Conf"],
  MLB: ["AL East", "NL West"],
  NHL: ["Metropolitan", "Pacific"],
  MLS: ["Eastern Conf", "Western Conf"],
  UFC: ["Heavyweight", "Welterweight"],
};
const TEAMS = [
  "Chiefs",
  "Eagles",
  "Patriots",
  "Cowboys",
  "Packers",
  "49ers",
  "Lakers",
  "Celtics",
  "Warriors",
  "Bulls",
  "Nets",
  "Heat",
  "Yankees",
  "Red Sox",
  "Dodgers",
  "Cubs",
  "Astros",
  "Mets",
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

interface OddsMatch {
  id: number;
  sport: string;
  league: string;
  home: string;
  away: string;
  homeOdds: string;
  awayOdds: string;
  drawOdds: string;
  status: "live" | "pre" | "ended";
  startsAt: string;
}

const ALL_MATCHES: OddsMatch[] = Array.from({ length: 400 }, (_, i) => {
  const sport = SPORTS[i % SPORTS.length]!;
  const leagueArr = LEAGUES[sport as keyof typeof LEAGUES];
  return {
    id: i + 1,
    sport,
    league: randomItem(leagueArr),
    home: randomItem(TEAMS),
    away: randomItem(TEAMS),
    homeOdds: (1.5 + (i % 20) * 0.1).toFixed(2),
    awayOdds: (2.0 + (i % 15) * 0.1).toFixed(2),
    drawOdds: (3.0 + (i % 10) * 0.1).toFixed(2),
    status: (["live", "pre", "ended"] as const)[i % 3]!,
    startsAt: `${String(10 + (i % 12)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")} ET`,
  };
});

// ─── Shared filter logic ──────────────────────────────────────────────────────

function filterMatches(matches: OddsMatch[], query: string, sport: string): OddsMatch[] {
  return matches.filter((m) => {
    const q = query.toLowerCase();
    const matchesSport = sport === "all" || m.sport === sport;
    const matchesQuery =
      !q || m.home.toLowerCase().includes(q) || m.away.toLowerCase().includes(q) || m.league.toLowerCase().includes(q);
    return matchesSport && matchesQuery;
  });
}

// ─── CURRENT APPROACH (mirrors real SearchMatchDropdown debounce) ─────────────

function OddsSearchOLD() {
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [sport, setSport] = React.useState("all");
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipRef = React.useRef(true);

  React.useEffect(() => {
    if (skipRef.current) {
      skipRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const filtered = useMemo(() => filterMatches(ALL_MATCHES, debouncedQuery, sport), [debouncedQuery, sport]);

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">
        ❌ Current — manual debounce: 3 refs + useEffect + setTimeout
      </p>
      <SearchBar query={query} onQuery={setQuery} sport={sport} onSport={setSport} />
      <MatchTable matches={filtered.slice(0, 30)} isPending={false} total={filtered.length} />
    </div>
  );
}

// ─── NEW APPROACH with useDeferredValue ───────────────────────────────────────

function OddsSearchNEW() {
  const [query, setQuery] = useState("");
  const [sport, setSport] = useState("all");

  // One line replaces all the debounce boilerplate above ↑
  const deferredQuery = useDeferredValue(query);
  const deferredSport = useDeferredValue(sport);
  const isPending = query !== deferredQuery || sport !== deferredSport;

  const filtered = useMemo(
    () => filterMatches(ALL_MATCHES, deferredQuery, deferredSport),
    [deferredQuery, deferredSport],
  );

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">
        ✅ With useDeferredValue — 1 line, no refs, no setTimeout
      </p>
      <SearchBar query={query} onQuery={setQuery} sport={sport} onSport={setSport} />
      <MatchTable matches={filtered.slice(0, 30)} isPending={isPending} total={filtered.length} />
    </div>
  );
}

// ─── Shared UI components ─────────────────────────────────────────────────────

function SearchBar({
  query,
  onQuery,
  sport,
  onSport,
}: {
  query: string;
  onQuery: (v: string) => void;
  sport: string;
  onSport: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <input
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="Search match, team, league…"
        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
      />
      <select
        value={sport}
        onChange={(e) => onSport(e.target.value)}
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="all">All Sports</option>
        {SPORTS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}

const MatchTable = memo(function MatchTable({
  matches,
  isPending,
  total,
}: {
  matches: OddsMatch[];
  isPending: boolean;
  total: number;
}) {
  const STATUS_COLOR = {
    live: "text-green-600 bg-green-50 dark:bg-green-950",
    pre: "text-blue-600 bg-blue-50 dark:bg-blue-950",
    ended: "text-muted-foreground bg-muted",
  };

  return (
    <div className={`space-y-1 transition-opacity ${isPending ? "opacity-50" : "opacity-100"}`}>
      <p className="text-xs text-muted-foreground">
        {isPending ? "Filtering…" : `Showing ${matches.length} of ${total} matches`}
      </p>
      <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
        {matches.map((m) => (
          <div
            key={m.id}
            className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <span className="truncate font-medium">
              {m.home} <span className="text-muted-foreground">vs</span> {m.away}
            </span>
            <span className="text-xs text-muted-foreground">{m.sport}</span>
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[m.status]}`}>
              {m.status.toUpperCase()}
            </span>
            <span className="font-mono text-xs text-primary">{m.homeOdds}</span>
            <span className="font-mono text-xs text-muted-foreground">{m.awayOdds}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

// ─── Demo ─────────────────────────────────────────────────────────────────────

export function UseDeferredValuePOC() {
  const [view, setView] = React.useState<"old" | "new">("new");
  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-bold text-foreground">Feature 3 — useDeferredValue</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          <strong>Scenario:</strong> Sports Odds search (like our SearchMatchDropdown filtering 400 live odds rows).
          Type fast and notice input responsiveness.
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
              {v === "old" ? "Current (manual debounce)" : "New (useDeferredValue)"}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        {view === "old" ? <OddsSearchOLD /> : <OddsSearchNEW />}
      </div>
    </section>
  );
}
