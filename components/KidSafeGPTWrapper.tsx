"use client";
import React, { useMemo, useState } from "react";

/**
 * KidSafe GPT — Parent-Controlled Wrapper (React + Tailwind)
 * Single-file React component that wraps a ChatGPT-style model behind
 * parent-defined profiles and a rule library.
 */

// ------------------------------ Types ------------------------------
type Rule = {
  id: string;
  label: string;
  description: string;
  mode: "allow" | "block" | "transform";
  keywords: string[];
  systemFragment: string;
};

type Profile = {
  id: string;
  name: string;
  age: number;
  enabledRuleIds: string[];
  requireCitations: boolean;
  requireParentForSensitive: boolean;
  faithModule:
    | "none"
    | "christian_reformed"
    | "jewish"
    | "muslim"
    | "hindu"
    | "buddhist"
    | "custom";
  customFaithNote: string;
};

type ChatMessage = { role: "user" | "assistant" | "system"; content: string; t?: number; profile?: string };

// ------------------------- Rule Library (Demo) -------------------------
const RULE_LIBRARY: Rule[] = [
  {
    id: "no_sexual_topics",
    label: "Block sexual/interpersonal topics",
    description: "Decline content about sex, dating, explicit material; redirect to parent.",
    mode: "block",
    keywords: ["sex", "sexual", "dating", "porn", "nsfw", "explicit"],
    systemFragment:
      "Politely refuse any sexual, pornographic, dating, or explicit content. Say you cannot discuss that and suggest asking a parent.",
  },
  {
    id: "violence_filter",
    label: "Filter graphic violence",
    description: "Allow historical discussion but omit graphic details; reinforce safety.",
    mode: "transform",
    keywords: ["gore", "graphic", "blood"],
    systemFragment:
      "If violence appears, keep discussion factual and age-appropriate, omit graphic details, and emphasize safety and empathy.",
  },
  {
    id: "political_neutrality",
    label: "Political neutrality",
    description: "Avoid partisan persuasion; focus on verifiable facts and balanced views.",
    mode: "transform",
    keywords: ["election", "democrat", "republican", "liberal", "conservative"],
    systemFragment:
      "Maintain political neutrality. Provide balanced, sourced information and avoid persuasive language.",
  },
  {
    id: "faith_options",
    label: "Faith-aware companion",
    description: "When asked for, append an optional faith-based companion section.",
    mode: "transform",
    keywords: ["faith", "bible", "scripture", "quran", "torah"],
    systemFragment:
      "When FAITH_COMPANION is requested, add a short, respectful faith-based companion section matching the selected faith tradition.",
  },
  {
    id: "scholarly_citations",
    label: "Require citations",
    description: "For educational topics, cite peer-reviewed or reputable sources when applicable.",
    mode: "transform",
    keywords: ["study", "paper", "citation", "evidence"],
    systemFragment:
      "When the user asks academic/educational questions, include a concise 'Sources' list referencing peer-reviewed or reputable sources, with author/title/year or DOI/URL.",
  },
  {
    id: "ask_parent_redirect",
    label: "Ask-a-Parent redirect",
    description: "Intercept sensitive topics and ask for parent approval before proceeding.",
    mode: "transform",
    keywords: ["suicide", "self-harm", "sex", "drugs", "extremism", "gore"],
    systemFragment:
      "If a topic appears sensitive for minors, suggest asking a parent or trusted adult and pause until approved.",
  },
];

// ---------------------- Demo Profiles (Starter) ----------------------
const DEMO_PROFILES: Profile[] = [
  {
    id: "p_8_primary",
    name: "Paige (8)",
    age: 8,
    enabledRuleIds: [
      "no_sexual_topics",
      "violence_filter",
      "political_neutrality",
      "scholarly_citations",
      "ask_parent_redirect",
    ],
    requireCitations: true,
    requireParentForSensitive: true,
    faithModule: "christian_reformed",
    customFaithNote: "",
  },
  {
    id: "d_12_middle",
    name: "David (12)",
    age: 12,
    enabledRuleIds: [
      "no_sexual_topics",
      "violence_filter",
      "political_neutrality",
      "scholarly_citations",
    ],
    requireCitations: true,
    requireParentForSensitive: true,
    faithModule: "none",
    customFaithNote: "",
  },
];

// ------------------------- Utility: Safe Regex -------------------------
const SENSITIVE_KEYWORDS = [
  "sex",
  "sexual",
  "dating",
  "porn",
  "suicide",
  "self-harm",
  "self harm",
  "extremism",
  "gore",
  "drugs",
  "nsfw",
];
const sensitiveRegex = new RegExp(`\\b(${SENSITIVE_KEYWORDS.join("|")})\\b`, "i");

// ------------------------- Prompt Assembly -------------------------
function buildSystemPrompt(profile: Profile) {
  const ruleMap = Object.fromEntries(RULE_LIBRARY.map((r) => [r.id, r]));
  const activeRules = profile.enabledRuleIds.map((id) => ruleMap[id]).filter(Boolean) as Rule[];

  const base = [
    "You are KidSafe GPT, a helpful, age-aware educational assistant.",
    `Respond for a child approximately age ${profile.age}. Use simple, friendly language without being patronizing.`,
    "If a question is unclear or seems sensitive for minors, explain why and suggest asking a parent.",
    "Keep answers concise, factual, and non-sensational; avoid graphic detail.",
  ];

  const rules = activeRules.map((r) => `Rule(${r.label}): ${r.systemFragment}`);

  const citationPolicy = profile.requireCitations
    ? "When claims involve facts, history, science, or health, include a short 'Sources' list with reputable/peer-reviewed references."
    : "";

  const faithSwitch =
    profile.faithModule === "none"
      ? "Do not add any faith content unless explicitly requested by the user or parent."
      : `If the parent toggles 'Faith Companion', append a short '${profile.faithModule}' perspective. ${
          profile.customFaithNote ? "Parent note: " + profile.customFaithNote : ""
        }`;

  return [...base, ...rules, citationPolicy, faithSwitch, "If a topic is blocked by policy, politely refuse and suggest discussing with a parent."]
    .filter(Boolean)
    .join("\n");
}

// ---------------------- Minimal OpenAI call shim ----------------------
async function callOpenAI(messages: ChatMessage[]) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Model call failed (${res.status})`);
  }
  const data = (await res.json()) as any;
  return String(data?.content ?? "");
}

// -------------------------- Helpers --------------------------
function needsParentApproval(text: string) {
  return sensitiveRegex.test(text || "");
}
function extractSources(markdown: string) {
  const m = markdown.match(/(?:^|\n)\s*(Sources|References)\s*:\n([\s\S]*)$/i);
  if (!m) return [] as string[];
  return m[2].split(/\n+/).map((s) => s.trim()).filter(Boolean).slice(0, 10);
}

// ------------------------------- UI ---------------------------------
export default function KidSafeGPTWrapper() {
  const [profiles, setProfiles] = useState<Profile[]>(DEMO_PROFILES);
  const [activeProfileId, setActiveProfileId] = useState<string>(profiles[0]?.id || "");
  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeProfileId) || profiles[0],
    [profiles, activeProfileId]
  );

  const [faithCompanionOn, setFaithCompanionOn] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastSources, setLastSources] = useState<string[]>([]);
  const [parentGate, setParentGate] = useState<{ pending: boolean; reason: string }>({
    pending: false,
    reason: "",
  });

  // PIN state for approval
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Core send; skipGate=true prevents loop after approval
  async function onSend(skipGate = false) {
    const text = input.trim();
    if (!text || !activeProfile) return;

    if (!skipGate && activeProfile.requireParentForSensitive && needsParentApproval(text)) {
      setParentGate({ pending: true, reason: "Sensitive keywords detected" });
      return;
    }

    const system = buildSystemPrompt(activeProfile);
    const user = faithCompanionOn ? `${text}\n\nParent setting: FAITH_COMPANION = ON.` : text;

    const newMsgs: ChatMessage[] = [
      ...messages,
      { role: "user", content: text, t: Date.now(), profile: activeProfile.name },
    ];
    setMessages(newMsgs);
    setInput("");
    setBusy(true);

    try {
      const modelReply = await callOpenAI([
        { role: "system", content: system },
        { role: "user", content: user },
      ]);
      const sources = extractSources(modelReply);
      setLastSources(sources);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: modelReply, t: Date.now(), profile: activeProfile.name },
      ]);
    } catch (err: any) {
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ Error: ${err?.message || "Unknown error"}` }]);
    } finally {
      setBusy(false);
    }
  }

  async function submitParentApproval() {
    setVerifying(true);
    setPinError("");
    try {
      const r = await fetch("/api/parent-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      let data: any = {};
      try {
        data = await r.json();
      } catch {}
      const ok = r.ok && (data?.ok === true || data?.success === true);
      if (!ok) {
        setPinError("Incorrect PIN.");
        return;
      }
      // success → close gate, clear pin, and send WITHOUT gating again
      setParentGate({ pending: false, reason: "" });
      setPin("");
      await onSend(true);
    } catch {
      setPinError("Network error. Is the dev server running?");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-100">
      <header className="sticky top-0 z-10 backdrop-blur bg-neutral-950/70 border-b border-neutral-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-emerald-500/20 border border-emerald-500/40" />
            <div>
              <h1 className="text-lg font-semibold">KidSafe GPT</h1>
              <p className="text-xs text-neutral-400">Parent-controlled chat wrapper</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-sm"
              value={activeProfileId}
              onChange={(e) => setActiveProfileId(e.target.value)}
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-emerald-500"
                checked={faithCompanionOn}
                onChange={(e) => setFaithCompanionOn(e.target.checked)}
                disabled={activeProfile?.faithModule === "none"}
              />
              <span>Faith Companion</span>
            </label>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid md:grid-cols-12 gap-4 p-4">
        {/* Rules panel */}
        <aside className="md:col-span-4 space-y-4">
          <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4">
            <h2 className="text-base font-semibold mb-2">Profile Controls</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Require citations</span>
                <input
                  type="checkbox"
                  className="accent-emerald-500"
                  checked={!!activeProfile?.requireCitations}
                  onChange={() =>
                    setProfiles((ps) =>
                      ps.map((p) =>
                        p.id === activeProfile.id ? { ...p, requireCitations: !p.requireCitations } : p
                      )
                    )
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <span>Parent approval on sensitive</span>
                <input
                  type="checkbox"
                  className="accent-emerald-500"
                  checked={!!activeProfile?.requireParentForSensitive}
                  onChange={() =>
                    setProfiles((ps) =>
                      ps.map((p) =>
                        p.id === activeProfile.id
                          ? { ...p, requireParentForSensitive: !p.requireParentForSensitive }
                          : p
                      )
                    )
                  }
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Faith module</label>
                <select
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm"
                  value={activeProfile?.faithModule}
                  onChange={(e) =>
                    setProfiles((ps) =>
                      ps.map((p) => (p.id === activeProfile.id ? { ...p, faithModule: e.target.value as Profile["faithModule"] } : p))
                    )
                  }
                >
                  <option value="none">None</option>
                  <option value="christian_reformed">Christian (Reformed)</option>
                  <option value="jewish">Jewish</option>
                  <option value="muslim">Muslim</option>
                  <option value="hindu">Hindu</option>
                  <option value="buddhist">Buddhist</option>
                  <option value="custom">Custom</option>
                </select>
                {activeProfile?.faithModule === "custom" && (
                  <textarea
                    placeholder="Short note for the faith companion (e.g., texts to reference, tone)."
                    className="mt-2 w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm"
                    rows={2}
                    value={activeProfile?.customFaithNote || ""}
                    onChange={(e) =>
                      setProfiles((ps) =>
                        ps.map((p) => (p.id === activeProfile.id ? { ...p, customFaithNote: e.target.value } : p))
                      )
                    }
                  />
                )}
              </div>
            </div>
          </section>

          <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4">
            <h2 className="text-base font-semibold mb-2">Rule Library</h2>
            <ul className="space-y-3">
              {RULE_LIBRARY.map((rule) => {
                const enabled = activeProfile?.enabledRuleIds.includes(rule.id);
                return (
                  <li key={rule.id} className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 accent-emerald-500"
                      checked={enabled}
                      onChange={() =>
                        setProfiles((ps) =>
                          ps.map((p) =>
                            p.id === activeProfile.id
                              ? {
                                  ...p,
                                  enabledRuleIds: enabled
                                    ? p.enabledRuleIds.filter((id) => id !== rule.id)
                                    : [...p.enabledRuleIds, rule.id],
                                }
                              : p
                          )
                        )
                      }
                    />
                    <div>
                      <p className="text-sm font-medium">{rule.label}</p>
                      <p className="text-xs text-neutral-400">{rule.description}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4">
            <h2 className="text-base font-semibold mb-2">Parent Log</h2>
            <p className="text-xs text-neutral-400 mb-3">
              Last 5 messages (local demo). Persist server-side in production.
            </p>
            <ol className="space-y-2 text-sm max-h-40 overflow-auto pr-2">
              {[...messages].slice(-5).map((m, i) => (
                <li key={i} className="border border-neutral-800 rounded-lg p-2">
                  <div className="text-xs text-neutral-400">
                    {new Date(m.t || Date.now()).toLocaleTimeString()} · {m.role} · {m.profile || ""}
                  </div>
                  <div className="line-clamp-3 whitespace-pre-wrap">{m.content}</div>
                </li>
              ))}
            </ol>
          </section>
        </aside>

        {/* Chat panel */}
        <section className="md:col-span-8 flex flex-col gap-3">
          <div className="flex-1 bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 overflow-auto min-h-[50vh]">
            {messages.length === 0 ? (
              <div className="h-full grid place-items-center text-neutral-400 text-sm">
                Start a kid-safe conversation. Your rules and profile shape the answers.
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((m, idx) => (
                  <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 whitespace-pre-wrap leading-relaxed ${
                        m.role === "user"
                          ? "bg-emerald-600/20 border border-emerald-500/40"
                          : "bg-neutral-950 border border-neutral-800"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {lastSources?.length > 0 && (
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4">
              <h3 className="text-sm font-semibold mb-2">Sources (as provided by the model)</h3>
              <ul className="text-xs list-disc pl-5 space-y-1">
                {lastSources.map((s, i) => (
                  <li key={i} className="break-words">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Parent gate notice with PIN input */}
          {parentGate.pending && (
            <div className="bg-amber-900/30 border border-amber-500/50 rounded-2xl p-3 text-sm">
              <div className="font-semibold mb-1">Held for Parent Approval</div>
              <p className="text-neutral-300 mb-2">
                {parentGate.reason}. The prompt appears sensitive for minors.
              </p>

              <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-end">
                <label className="text-xs text-neutral-300">
                  Parent PIN
                  <input
                    type="password"
                    inputMode="numeric"
                    className="block mt-1 w-40 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm"
                    placeholder="Enter PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                  />
                </label>

                <div className="flex gap-2">
                  <button
                    className="px-3 py-2 rounded-xl bg-neutral-800 border border-neutral-700 disabled:opacity-50"
                    onClick={() => {
                      setParentGate({ pending: false, reason: "" });
                      setPin("");
                      setPinError("");
                    }}
                    disabled={verifying}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-3 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/40 disabled:opacity-50"
                    onClick={submitParentApproval}
                    disabled={verifying || pin.trim().length === 0}
                    title="Approve & Send"
                  >
                    {verifying ? "Verifying…" : "Approve & Send"}
                  </button>
                </div>
              </div>

              {pinError && <p className="text-red-400 text-xs mt-2">{pinError}</p>}
            </div>
          )}

          {/* Composer */}
          <div className="flex items-end gap-2">
            <textarea
              className="flex-1 bg-neutral-900/60 border border-neutral-800 rounded-2xl p-3 text-sm"
              placeholder="Ask a question… (educational topics will request sources; sensitive topics may require parent approval)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!busy) onSend();
                }
              }}
              rows={3}
            />
            <button
              className="px-4 py-2 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 disabled:opacity-50"
              onClick={() => onSend()}
              disabled={busy || !input.trim()}
            >
              {busy ? "Thinking…" : "Send"}
            </button>
          </div>

          <p className="text-[11px] text-neutral-500 pl-1">
            This demo runs all logic client-side; in production move rules, logs, and moderation to a server with auth.
            Do not expose keys client-side.
          </p>
        </section>
      </main>
    </div>
  );
}
