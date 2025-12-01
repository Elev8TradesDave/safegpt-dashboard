"use client";

import { useState } from "react";
import type { DragEvent } from "react";
import KidSafeGPTWrapper from "@/components/KidSafeGPTWrapper";

type BlockType = "academic" | "workout" | "break" | "routine";

interface Slot {
  index: number;
  timeLabel: string;
  blockType: BlockType | null;
  label: string | null;
}

interface BlockTemplate {
  id: string;
  label: string;
  type: BlockType;
  durationSlots: number; // 1 slot = 15 minutes
}

interface PresetPlacement {
  slotIndex: number; // starting slot index (0 = 7:00, 1 = 7:15, ...)
  templateId: string;
}

interface Preset {
  id: string;
  label: string;
  description: string;
  placements: PresetPlacement[];
}

type ThemeId = "hockey" | "cars" | "jets";
type TopicId = "none" | "history" | "nhl";

const THEME_LABELS: Record<ThemeId, string> = {
  hockey: "Hockey",
  cars: "Cars",
  jets: "Jets",
};

const THEME_GRADIENTS: Record<ThemeId, string> = {
  hockey: "from-sky-500/20 via-emerald-500/10 to-slate-900",
  cars: "from-amber-500/20 via-red-500/10 to-slate-900",
  jets: "from-cyan-400/20 via-indigo-500/10 to-slate-900",
};

const SUBTOPIC_OPTIONS: Record<TopicId, { id: string; label: string }[]> = {
  none: [],
  history: [
    { id: "us-history", label: "US History" },
    { id: "civil-war", label: "Civil War" },
  ],
  nhl: [{ id: "caps", label: "Washington Capitals" }],
};

// Palette of draggable blocks David can use
const BLOCK_TEMPLATES: BlockTemplate[] = [
  // Morning routines
  {
    id: "wake",
    label: "Wake up routine (30)",
    type: "routine",
    durationSlots: 2,
  },
  {
    id: "walk-dog",
    label: "Walk dog (30)",
    type: "routine",
    durationSlots: 2,
  },

  // Academics (45 min)
  {
    id: "math-45",
    label: "Math (45)",
    type: "academic",
    durationSlots: 3,
  },
  {
    id: "ela-45",
    label: "ELA (45)",
    type: "academic",
    durationSlots: 3,
  },
  {
    id: "science-45",
    label: "Science (45)",
    type: "academic",
    durationSlots: 3,
  },
  {
    id: "social-45",
    label: "Social Studies (45)",
    type: "academic",
    durationSlots: 3,
  },
  {
    id: "special-project-45",
    label: "Special Project (45)",
    type: "academic",
    durationSlots: 3,
  },
  {
    id: "bible-30",
    label: "Bible Study (30)",
    type: "academic",
    durationSlots: 2,
  },
  {
    id: "ai-course-30",
    label: "AI Course (30)",
    type: "academic",
    durationSlots: 2,
  },

  // Workouts
  {
    id: "workout-1-30",
    label: "Strenuous Workout #1 (30)",
    type: "workout",
    durationSlots: 2,
  },
  {
    id: "workout-2-30",
    label: "Strenuous Workout #2 (30)",
    type: "workout",
    durationSlots: 2,
  },
  {
    id: "generic-workout-30",
    label: "Workout (30)",
    type: "workout",
    durationSlots: 2,
  },

  // Hockey prep / practice
  {
    id: "pack-bag-15",
    label: "Pack hockey bag (15)",
    type: "routine",
    durationSlots: 1,
  },
  {
    id: "practice-60",
    label: "Practice / Skate (60)",
    type: "routine", // treat as routine so it doesn't clash with workout spacing
    durationSlots: 4,
  },

  // Generic reset / routine tiles
  {
    id: "reset-15",
    label: "Reset / Stretch (15)",
    type: "break",
    durationSlots: 1,
  },
  {
    id: "routine-15",
    label: "Routine / Chore (15)",
    type: "routine",
    durationSlots: 1,
  },
];

// Presets: these can later move to a parent-only builder screen
// Slot index reference: 0=7:00, 1=7:15, 2=7:30, ... 31=14:45
const PRESETS: Preset[] = [
  {
    id: "blank",
    label: "Blank day",
    description: "Empty grid, build from scratch.",
    placements: [],
  },
  {
    id: "regular-monday",
    label: "Regular Monday",
    description: "Wake, dog walk, 2 workouts, core school blocks.",
    placements: [
      // Wake 7:00–7:30
      { slotIndex: 0, templateId: "wake" },
      // Walk dog 8:15–8:45
      { slotIndex: 5, templateId: "walk-dog" },
      // Workout #1 9:45–10:15
      { slotIndex: 11, templateId: "workout-1-30" },
      // Math 10:30–11:15
      { slotIndex: 14, templateId: "math-45" },
      // ELA 11:30–12:15
      { slotIndex: 18, templateId: "ela-45" },
      // Workout #2 13:00–13:30 (2+ hours after #1)
      { slotIndex: 24, templateId: "workout-2-30" },
      // Pack hockey bag 13:45–14:00
      { slotIndex: 27, templateId: "pack-bag-15" },
    ],
  },
  {
    id: "tournament-day",
    label: "Tournament Day",
    description: "Light school, pack early, mid-day practice block.",
    placements: [
      // Wake 7:00–7:30
      { slotIndex: 0, templateId: "wake" },
      // Walk dog 8:15–8:45
      { slotIndex: 5, templateId: "walk-dog" },
      // Reset 9:00–9:15
      { slotIndex: 8, templateId: "reset-15" },
      // Special project 9:15–10:00
      { slotIndex: 9, templateId: "special-project-45" },
      // Pack bag 10:30–10:45
      { slotIndex: 14, templateId: "pack-bag-15" },
      // Practice 11:00–12:00
      { slotIndex: 16, templateId: "practice-60" },
      // Reset 12:15–12:30
      { slotIndex: 21, templateId: "reset-15" },
    ],
  },
];

// Build 15-minute slots from 07:00 to 15:00 (8 hours = 32 slots)
function buildInitialSlots(): Slot[] {
  const slots: Slot[] = [];
  const startMinutes = 7 * 60; // 07:00

  for (let i = 0; i < 32; i++) {
    const totalMinutes = startMinutes + i * 15;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const label = `${hours}:${mins.toString().padStart(2, "0")}`;
    slots.push({
      index: i,
      timeLabel: label,
      blockType: null,
      label: null,
    });
  }
  return slots;
}

// Rule checks: return null if OK, or a string explaining the problem
function canPlaceBlock(
  slots: Slot[],
  startIndex: number,
  template: BlockTemplate
): string | null {
  const endIndex = startIndex + template.durationSlots - 1;

  if (endIndex >= slots.length) {
    return "That block doesn’t fit at the end of the day.";
  }

  // 1) Check if any target slot is already used
  for (let i = startIndex; i <= endIndex; i++) {
    if (slots[i].blockType !== null) {
      return "Those 15-minute slots already have something in them.";
    }
  }

  // 2) No back-to-back academic blocks
  if (template.type === "academic") {
    const prev = startIndex - 1;
    const next = endIndex + 1;

    if (prev >= 0 && slots[prev].blockType === "academic") {
      return "No back-to-back school blocks. Add a reset or break in between.";
    }
    if (next < slots.length && slots[next].blockType === "academic") {
      return "No back-to-back school blocks. Add a reset or break in between.";
    }
  }

  // 3) At least 2 hours (8 slots) between strenuous workouts
  if (template.type === "workout") {
    const MIN_GAP_SLOTS = 8; // 8 * 15 = 120 minutes

    const existingWorkoutSlots = slots.filter(
      (s) => s.blockType === "workout"
    );

    for (const w of existingWorkoutSlots) {
      const distance = Math.abs(w.index - startIndex);
      if (distance < MIN_GAP_SLOTS) {
        return "Workouts must be at least 2 hours apart. Try a different time or add resets in between.";
      }
    }
  }

  return null;
}

function buildSuggestion(topic: TopicId, subtopicId: string): string | null {
  if (topic === "history") {
    if (subtopicId === "civil-war") {
      return "Tell me one important Civil War battle and why it mattered, in kid-friendly language.";
    }
    if (subtopicId === "us-history") {
      return "Give me a short story from US history that a middle schooler would find interesting.";
    }
    return "Give me a short, true story from history that I probably haven&apos;t heard before.";
  }

  if (topic === "nhl") {
    if (subtopicId === "caps") {
      return "Give me three fun facts about the Washington Capitals that a kid would like.";
    }
    return "Give me three fun facts about an NHL team for kids.";
  }

  return null;
}

export default function DailyCommandCenterPage() {
  const [slots, setSlots] = useState<Slot[]>(() => buildInitialSlots());
  const [message, setMessage] = useState<string | null>(
    "Choose a preset or drag a block into one of the hour boxes. Rules: no back-to-back school • workouts 2+ hours apart."
  );
  const [activePresetId, setActivePresetId] = useState<string>("blank");
  const [theme, setTheme] = useState<ThemeId>("hockey");
  const [topic, setTopic] = useState<TopicId>("none");
  const [subtopic, setSubtopic] = useState<string>("none");

  const suggestion = buildSuggestion(topic, subtopic);

  function handleDragStart(e: DragEvent<HTMLDivElement>, templateId: string) {
    e.dataTransfer.setData("text/plain", templateId);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    // Needed so the drop event will fire
    e.preventDefault();
  }

  function handleDrop(e: DragEvent<HTMLDivElement>, targetIndex: number) {
    e.preventDefault();
    const templateId = e.dataTransfer.getData("text/plain");
    const template = BLOCK_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    const error = canPlaceBlock(slots, targetIndex, template);
    if (error) {
      setMessage(error);
      return;
    }

    // placing manually cancels preset "selection"
    setActivePresetId("blank");

    // Place the block
    const endIndex = targetIndex + template.durationSlots - 1;
    const newSlots = slots.map((slot) => ({ ...slot }));

    for (let i = targetIndex; i <= endIndex; i++) {
      newSlots[i].blockType = template.type;
      newSlots[i].label = template.label;
    }

    setSlots(newSlots);
    setMessage("Nice. You can keep adding blocks, just following the rules.");
  }

  function clearDay() {
    setSlots(buildInitialSlots());
    setActivePresetId("blank");
    setMessage("Day cleared. Start again with 15-minute blocks.");
  }

  function handleClearBlock(index: number) {
    setSlots((prev) => {
      const newSlots = prev.map((s) => ({ ...s }));
      const target = newSlots[index];
      if (!target.blockType) return newSlots;

      const t = target.blockType;
      const lbl = target.label;

      // clear contiguous block backwards
      let i = index;
      while (
        i >= 0 &&
        newSlots[i].blockType === t &&
        newSlots[i].label === lbl
      ) {
        newSlots[i].blockType = null;
        newSlots[i].label = null;
        i--;
      }

      // clear contiguous block forwards
      i = index + 1;
      while (
        i < newSlots.length &&
        newSlots[i].blockType === t &&
        newSlots[i].label === lbl
      ) {
        newSlots[i].blockType = null;
        newSlots[i].label = null;
        i++;
      }

      return newSlots;
    });
    setActivePresetId("blank");
    setMessage("Block removed. Adjust the day however you like.");
  }

  function applyPreset(presetId: string) {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    const freshSlots = buildInitialSlots();
    // We bypass rule checks here because the preset itself is already rule-aware
    for (const placement of preset.placements) {
      const template = BLOCK_TEMPLATES.find(
        (t) => t.id === placement.templateId
      );
      if (!template) continue;
      const startIndex = placement.slotIndex;
      const endIndex = startIndex + template.durationSlots - 1;
      if (endIndex >= freshSlots.length) continue;

      for (let i = startIndex; i <= endIndex; i++) {
        freshSlots[i].blockType = template.type;
        freshSlots[i].label = template.label;
      }
    }

    setSlots(freshSlots);
    setActivePresetId(presetId);
    setMessage(preset.description);
  }

  // Group slots into hours: 4 slots per hour box
  const hourGroups: Slot[][] = [];
  for (let i = 0; i < slots.length; i += 4) {
    hourGroups.push(slots.slice(i, i + 4));
  }

  const subtopicOptions = SUBTOPIC_OPTIONS[topic];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-stretch justify-center px-4 py-6">
      <div className="w-full max-w-6xl grid gap-6 md:grid-cols-[1.2fr,1.4fr]">
        {/* LEFT: Daily planner with hour boxes */}
        <section className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col gap-4">
          {/* Theme banner */}
          <div
            className={`mb-2 rounded-2xl border border-slate-800 bg-gradient-to-r ${THEME_GRADIENTS[theme]} px-3 py-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between`}
          >
            <div className="text-xs md:text-sm">
              <div className="font-semibold">
                Theme: {THEME_LABELS[theme]}{" "}
                {theme === "hockey" ? "🏒" : theme === "cars" ? "🏎️" : "✈️"}
              </div>
              <div className="text-[11px] text-slate-200/80">
                Just for visuals and motivation. Rules stay the same.
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["hockey", "cars", "jets"] as ThemeId[]).map((t) => {
                const active = t === theme;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTheme(t)}
                    className={
                      "text-[11px] px-3 py-1.5 rounded-full border transition-colors " +
                      (active
                        ? "border-white/80 bg-slate-900/70 text-slate-50"
                        : "border-slate-700 bg-slate-900/60 hover:bg-slate-900/80 text-slate-100")
                    }
                  >
                    {THEME_LABELS[t]}
                  </button>
                );
              })}
            </div>
          </div>

          <header>
            <h1 className="text-xl md:text-2xl font-semibold">
              David&apos;s Daily Command Center
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-1">
              15-minute blocks inside 1-hour boxes • No back-to-back school •
              Workouts spaced 2+ hours apart
            </p>
          </header>

          {/* Focus topic / subtopic */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 space-y-2">
            <h2 className="text-sm font-semibold">Focus topic</h2>
            <div className="flex flex-col md:flex-row gap-2 text-[11px]">
              <div className="flex flex-col gap-1 md:flex-1">
                <label className="text-slate-400">Topic</label>
                <select
                  value={topic}
                  onChange={(e) => {
                    const value = e.target.value as TopicId;
                    setTopic(value);
                    setSubtopic("none");
                  }}
                  className="bg-slate-950/70 border border-slate-700 rounded-full px-3 py-1 outline-none text-slate-100"
                >
                  <option value="none">None</option>
                  <option value="history">History</option>
                  <option value="nhl">NHL Teams</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 md:flex-1">
                <label className="text-slate-400">Subtopic</label>
                <select
                  value={subtopic}
                  onChange={(e) => setSubtopic(e.target.value)}
                  disabled={topic === "none" || subtopicOptions.length === 0}
                  className="bg-slate-950/70 border border-slate-700 rounded-full px-3 py-1 outline-none text-slate-100 disabled:opacity-40"
                >
                  <option value="none">Choose…</option>
                  {subtopicOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              This doesn&apos;t change the schedule rules; it just gives ideas
              for what to ask in SafeGPT (like Civil War or Washington Capitals
              questions).
            </p>
          </div>

          {/* Presets + palette in one card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 space-y-3">
            {/* Presets row */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Presets</h2>
                <button
                  onClick={clearDay}
                  className="text-[11px] px-3 py-1 rounded-full border border-slate-700 bg-slate-900 hover:bg-slate-800"
                  type="button"
                >
                  Clear day
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((preset) => {
                  const active = preset.id === activePresetId;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset.id)}
                      className={
                        "text-[11px] px-3 py-1.5 rounded-full border transition-colors " +
                        (active
                          ? "border-emerald-400 bg-emerald-500/20 text-emerald-100"
                          : "border-slate-700 bg-slate-800/80 hover:bg-slate-700/80 text-slate-100")
                      }
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Palette of draggable blocks */}
            <div>
              <p className="text-[11px] text-slate-400 mb-2">
                Drag one of these into any quadrant in the hour boxes below, or
                start from a preset and tweak.
              </p>
              <div className="flex flex-wrap gap-2">
                {BLOCK_TEMPLATES.map((block) => (
                  <div
                    key={block.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, block.id)}
                    className="cursor-grab active:cursor-grabbing text-[11px] px-3 py-1.5 rounded-full border border-slate-700 bg-slate-800/80 hover:bg-slate-700/80 select-none"
                  >
                    {block.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Message / rule / preset feedback */}
          <div className="text-[11px] text-slate-300 min-h-[1.5rem]">
            {message}
          </div>

          {/* Hour boxes with 4 quadrants each */}
          <div className="flex-1 overflow-auto rounded-2xl">
            <div className="grid gap-3 md:grid-cols-2">
              {hourGroups.map((group, idx) => {
                const start = group[0];
                const end = group[group.length - 1];

                return (
                  <div
                    key={idx}
                    className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span className="font-mono">
                        {start.timeLabel} – {end.timeLabel}
                      </span>
                      <span className="uppercase tracking-wide text-[10px] text-slate-500">
                        Hour block
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {group.map((slot) => {
                        const filled = slot.blockType !== null;
                        const type = slot.blockType;

                        let pillClass =
                          "text-[10px] px-2 py-0.5 rounded-full border border-slate-700";
                        if (type === "academic") {
                          pillClass +=
                            " bg-sky-500/20 border-sky-500/60 text-sky-200";
                        } else if (type === "workout") {
                          pillClass +=
                            " bg-emerald-500/20 border-emerald-500/60 text-emerald-200";
                        } else if (type === "break") {
                          pillClass +=
                            " bg-violet-500/15 border-violet-500/60 text-violet-200";
                        } else if (type === "routine") {
                          pillClass +=
                            " bg-amber-500/15 border-amber-500/60 text-amber-200";
                        }

                        return (
                          <div
                            key={slot.index}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, slot.index)}
                            className="rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800/90 transition-colors px-2 py-2 flex flex-col justify-between min-h-[64px]"
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-mono text-[10px] text-slate-400">
                                {slot.timeLabel}
                              </span>
                              {filled && (
                                <span className={pillClass}>
                                  {type === "academic"
                                    ? "School"
                                    : type === "workout"
                                    ? "Workout"
                                    : type === "break"
                                    ? "Reset"
                                    : "Routine"}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] text-slate-100 line-clamp-2">
                                {filled ? slot.label : "Empty 15-minute slot"}
                              </span>
                              {filled && (
                                <button
                                  type="button"
                                  onClick={() => handleClearBlock(slot.index)}
                                  className="text-[10px] px-2 py-0.5 rounded-full border border-violet-500/60 text-violet-100 bg-violet-500/10 hover:bg-violet-500/20 whitespace-nowrap"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* RIGHT: SafeGPT / KidSafe GPT wrapper */}
        <section className="bg-slate-900/80 border border-slate-800 rounded-3xl p-3 md:p-4 shadow-xl">
          <header className="mb-2 md:mb-3">
            <h2 className="text-lg md:text-xl font-semibold">SafeGPT Helper</h2>
            <p className="text-[11px] md:text-xs text-slate-400 mt-1">
              Ask about your day, workouts, or school. For any restricted
              topics, it will tell you to ask a parent.
            </p>
            {suggestion && (
              <p className="text-[11px] text-slate-400 mt-1">
                Focus idea:{" "}
                <span className="italic">
                  {suggestion}
                </span>
              </p>
            )}
          </header>

          <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950/60">
            <KidSafeGPTWrapper />
          </div>
        </section>
      </div>
    </div>
  );
}
