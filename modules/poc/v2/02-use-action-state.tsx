"use client";

/**
 * ════════════════════════════════════════════════════════════════════
 * FEATURE 2 — useActionState (React 19)
 * ════════════════════════════════════════════════════════════════════
 *
 * WHAT IT IS
 * ----------
 * useActionState wraps any async function (a "action") and returns
 * [state, dispatch, isPending].  It eliminates the need for separate
 * useState variables for submission state, error messages, success
 * messages, and field-level errors.
 *
 * WHAT WE CURRENTLY USE INSTEAD
 * ------------------------------
 * react-hook-form + multiple useState + useMutation from TanStack.
 * From InvestorAccountSettingsPage.tsx (real code):
 *
 *   const [isSaving, setIsSaving] = useState(false);
 *   const form = useForm({ resolver: zodResolver(schema) });
 *   const { mutate } = usePutAuthUpdateProfile();
 *
 *   async function onSubmit(data) {
 *     setIsSaving(true);                 // manual pending
 *     try {
 *       await mutate(data);
 *       toast.success("Profile updated");
 *     } catch {
 *       toast.error("Failed");
 *     } finally {
 *       setIsSaving(false);              // manual cleanup
 *     }
 *   }
 *
 * HOW useActionState IMPROVES THIS
 * ----------------------------------
 * 1. Single source of truth — state.status tells you everything.
 * 2. isPending is built-in — no setIsSaving(true/false).
 * 3. Field errors come back from the action — no separate setFieldErrors.
 * 4. Works with progressive enhancement (<form action={dispatch}>).
 * 5. Compatible alongside react-hook-form for validation-heavy forms.
 *
 * REAL BETSIGNAL USE-CASES
 * -------------------------
 * • Contact page form (src/app/contact)
 * • Score bankroll reset form
 * • Admin sports status quick-actions
 * • Cancel subscription modal
 * • Any "fire-and-forget" form without complex field validation
 *
 * HOW IT IMPACTS THE PROJECT
 * ---------------------------
 * - Removes 3-5 useState per form page
 * - Makes form state predictable and serializable
 * - Enables future migration to Server Actions without component changes
 * ════════════════════════════════════════════════════════════════════
 */

import React, { useActionState } from "react";

// ─── Shared types ─────────────────────────────────────────────────────────────

interface FormState {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Partial<Record<string, string>>;
}

const IDLE: FormState = { status: "idle", message: "" };

// ─── CURRENT APPROACH (what BetSignal does today) ────────────────────────────
// Mirrors the real pattern in InvestorAccountSettingsPage + useAccountSettings

function ProfileFormOLD() {
  const [isSaving, setIsSaving] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState("");
  const [firstName, setFirstName] = React.useState("John");
  const [lastName, setLastName] = React.useState("Doe");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true); // manual flag 1
    setSuccessMsg(""); // manual reset 2
    setErrorMsg(""); // manual reset 3

    try {
      await new Promise((r) => setTimeout(r, 1000));
      if (!firstName.trim()) throw new Error("First name required");
      setSuccessMsg("Profile updated successfully"); // manual success 4
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong"); // manual error 5
    } finally {
      setIsSaving(false); // manual cleanup 6
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">
        ❌ Current — 6 manual state variables for one simple form
      </p>
      {successMsg && (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700 dark:bg-green-950">✓ {successMsg}</div>
      )}
      {errorMsg && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950">{errorMsg}</div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">First Name</label>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Last Name</label>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={isSaving}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {isSaving ? "Saving…" : "Save Changes"}
      </button>
    </form>
  );
}

// ─── NEW APPROACH with useActionState ────────────────────────────────────────

/**
 * The "action" function — same interface as a Server Action.
 * prevState is the previous FormState (always passed by React).
 * formData is the native FormData from the <form>.
 */
async function updateProfileAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  await new Promise((r) => setTimeout(r, 1000));

  const firstName = formData.get("firstName")?.toString().trim() ?? "";
  const lastName = formData.get("lastName")?.toString().trim() ?? "";
  const email = formData.get("email")?.toString().trim() ?? "";

  // Validation
  const fieldErrors: FormState["fieldErrors"] = {};
  if (!firstName) fieldErrors.firstName = "First name is required";
  if (!email.includes("@")) fieldErrors.email = "Must be a valid email";
  if (Object.keys(fieldErrors).length) {
    return { status: "error", message: "Please fix the errors below.", fieldErrors };
  }

  // Simulate random server error
  if (Math.random() < 0.2) {
    return { status: "error", message: "Server error. Please try again." };
  }

  return {
    status: "success",
    message: `Profile updated for ${firstName} ${lastName}`,
  };
}

function ProfileFormNEW() {
  /**
   * [state, dispatch, isPending] = useActionState(actionFn, initialState)
   *
   * state     — current result of the last action call
   * dispatch  — pass as `action` prop on <form>, or call directly
   * isPending — true while action is executing (no manual useState needed)
   */
  const [state, dispatch, isPending] = useActionState(updateProfileAction, IDLE);

  if (state.status === "success") {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-5 dark:border-green-800 dark:bg-green-950">
        <p className="font-semibold text-green-800 dark:text-green-200">✓ {state.message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-3 text-xs text-green-700 underline dark:text-green-300"
        >
          Edit again
        </button>
      </div>
    );
  }

  return (
    <form action={dispatch} className="space-y-4">
      <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">
        ✅ With useActionState — zero manual state variables
      </p>

      {/* Top-level error */}
      {state.status === "error" && !state.fieldErrors && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950">{state.message}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="mb-1 block text-sm font-medium">
            First Name
          </label>
          <input
            id="firstName"
            name="firstName"
            defaultValue="John"
            className={`w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary ${
              state.fieldErrors?.firstName ? "border-red-400" : "border-border"
            }`}
          />
          {state.fieldErrors?.firstName && <p className="mt-1 text-xs text-red-500">{state.fieldErrors.firstName}</p>}
        </div>

        <div>
          <label htmlFor="lastName" className="mb-1 block text-sm font-medium">
            Last Name
          </label>
          <input
            id="lastName"
            name="lastName"
            defaultValue="Doe"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue="john@example.com"
          className={`w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary ${
            state.fieldErrors?.email ? "border-red-400" : "border-border"
          }`}
        />
        {state.fieldErrors?.email && <p className="mt-1 text-xs text-red-500">{state.fieldErrors.email}</p>}
      </div>

      {/* isPending is built-in — no disabled={isSaving} needed from useState */}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Save Changes"}
      </button>
    </form>
  );
}

// ─── Demo ─────────────────────────────────────────────────────────────────────

export function UseActionStatePOC() {
  const [view, setView] = React.useState<"old" | "new">("new");
  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-bold text-foreground">Feature 2 — useActionState</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          <strong>Scenario:</strong> Account Settings profile update form. Compare the amount of state management code
          needed.
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
              {v === "old" ? "Current (6 useState)" : "New (useActionState)"}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        {view === "old" ? <ProfileFormOLD /> : <ProfileFormNEW />}
      </div>
    </section>
  );
}
