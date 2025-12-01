"use client";

import { useState } from "react";

// Keep a simple view of the same presets we use on /adhd
type BlockType = "academic" | "workout" | "break" | "routine";

interface BlockTemplate {
  id: string;
  label: string;
  type: BlockType;
  durationSlots: number; // 1 slot = 15 minutes
}

interface PresetPlacement {
  slotIndex: number; // 0 = 7:00, 1 = 7:15, ...
  templateId: string;
}

interface Preset {
  id: string;
  label: string;
  description: string;
  placements: PresetPlacement[];
}

// Same templates as on /adhd (shortened labels for the preview grid)
const BLOCK_TEMPLATES: BlockTemplate[] = [
  { id: "wake", label: "Wake", type: "routine", durationSlots: 2 },
  { id: "walk-dog", label: "Dog walk", type: "routine", durationSlots: 2 },
  { id: "math-45", label: "Math", type: "academic", durationSlots: 3 },
  { id: "ela-45", label: "ELA", type: "academic", durationSlots: 3 },
  { id: "science-45", label: "Science", type: "academic", durationSlots: 3 },
  {
    id: "social-45",
    label: "Social Studies",
    type: "academic",
    durationSlots: 3,
  },
  {
    id: "special-project-45",
    label: "Special Project",
    type: "academic",
    durationSlots: 3,
  },
  { id: "bible-30", label: "Bible", type: "academic", durationSlots: 2 },
  { id: "ai-course-30", label: "AI Course", type: "academic", durationSlots: 2 },
  {
    id: "workout-1-30",
    label: "Workout #1",
    type: "workout",
    durationSlots: 2,
  },
  {
    id: "workout-2-30",
    label: "Workout #2",
    type: "workout",
    durationSlots: 2,
  },
  {
    id: "generic-workout-30",
    label: "Workout",
    type: "workout",
    durationSlots: 2,
  },
  {
    id: "pack-bag-15",
    label: "Pack bag",
    type: "routine",
    durationSlots: 1,
  },
  {
    id: "practice-60",
    label: "Practice / Skate",
    type: "routine",
    durationSlots: 4,
  },
  {
    id: "reset-15",
    label: "Reset / Stretch",
    type: "break",
    durationSlots: 1,
  },
  {
    id: "routine-15",
    label: "Routine / Chore",
    type: "routine",
    durationSlots: 1,
  },
];

// Same presets as /adhd so the parent can see what they do
const PRESETS: Preset[] = [
  {
    id: "blank",
    label: "Blank day",
    description: "Empty grid; David builds from scratch.",
    placements: [],
  },
  {
    id: "regular-monday",
    label: "Regular Monday",
    description:
      "Wake, dog walk, two spaced workouts, Math & ELA, pack bag before practice.",
    placements: [
      { slotIndex: 0, templateId: "wake" }, // 7:00
      { slotIndex: 5, templateId: "walk-dog" }, // 8:15
      { slotIndex: 11, templateId: "workout-1-30" }, // 9:45
      { slotIndex: 14, templateId: "math-45" }, // 10:30
      { slotIndex: 18, templateId: "ela-45" }, // 11:30
      { slotIndex: 24, templateId: "workout-2-30" }, // 13:00
      { slotIndex: 27, templateId: "pack-bag-15" }, // 13:45
    ],
  },
  {
    id: "tournament-day",
    label: "Tournament Day",
    description:
      "Light academics, early pack, mid-day practice block, extra resets.",
    placements: [
      { slotIndex: 0, templateId: "wake" }, // 7:00
      { slotIndex: 5, templateId: "walk-dog" }, // 8:15
      { slotIndex: 8, templateId: "reset-15" }, // 9:00
      { slotIndex: 9, templateId: "special-project-45" }, // 9:15
      { slotIndex: 14, templateId: "pack-bag-15" }, // 10:30
      { slotIndex: 16, templateId: "practice-60" }, // 11:00
      { slotIndex: 21, templateId: "reset-15" }, // 12:15
    ],
  },
];

// Build a tiny preview grid: 8 hours * 4 slots = 32
const TOTAL_SLOTS = 32;
const START_HOUR = 7;

interface PreviewSlot {
  label: string;
  blockLabel: string | null;
  type: BlockType | null;
}

function buildPreviewSlots(preset: Preset): PreviewSlot[] {
  const slots: PreviewSlot[] = [];
  for (let i = 0; i < TOTAL_SLOTS; i++) {
    const minutes = (START_HOUR * 60) + i * 15;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    slots.push({
      label: `${h}:${m.toString().padStart(2, "0")}`,
      blockLabel: null,
      type: null,
    });
  }

  for (const placement of preset.placements) {
    const tmpl = BLOCK_TEMPLATES.find((t) => t.id === placement.templateId);
    if (!tmpl) continue;
    const start = placement.slotIndex;
    const end = start + tmpl.durationSlots - 1;
    if (end >= slots.length) continue;

    for (let i = start; i <= end; i++) {
      slots[i].blockLabel = tmpl.label;
      slots[i].type = tmpl.type;
    }
  }

  return slots;
}

export default function ParentConsolePage() {
  const [activePresetId, setActivePresetId] = useState<string>("regular-monday");

  const activePreset =
    PRESETS.find((p) => p.id === activePresetId) ?? PRESETS[0];
  const previewSlots = buildPreviewSlots(activePreset);

  // group into hours for a compact preview
  const hourGroups: PreviewSlot[][] = [];
  for (let i = 0; i < previewSlots.length; i += 4) {
    hourGroups.push(previewSlots.slice(i, i + 4));
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-stretch justify-center px-4 py-6">
      <div className="w-full max-w-5xl flex flex-col gap-6">
        <header className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl">
          <h1 className="text-2xl font-semibold mb-1">
            Parent Console — Daily Command Center
          </h1>
          <p className="text-sm text-slate-400">
            This page is for parents only. Here you can review and (later) edit
            the daily presets that David sees on his Command Center page.
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Current status: read-only preview. In the next step we&apos;ll add
            toggles to control which presets are available to your child and a
            simple editor to create new ones.
          </p>
        </header>

        <section className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 md:p-5 shadow-xl flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            <div className="md:w-1/2 space-y-3">
              <h2 className="text-sm font-semibold">Presets</h2>
              <p className="text-xs text-slate-400">
                Click a preset to see how it fills the day. These match exactly
                what the Command Center uses on{" "}
                <span className="font-mono text-[11px]">/adhd</span>.
              </p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((preset) => {
                  const active = preset.id === activePresetId;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setActivePresetId(preset.id)}
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
              <div className="mt-2 text-xs text-slate-300">
                <div className="font-semibold mb-1">
                  {activePreset.label} — overview
                </div>
                <p className="text-slate-400">{activePreset.description}</p>
                <ul className="mt-2 list-disc list-inside space-y-1 text-slate-400">
                  <li>
                    Total blocks:{" "}
                    <span className="font-mono">
                      {activePreset.placements.length}
                    </span>
                  </li>
                  <li>
                    Earliest time used:{" "}
                    <span className="font-mono">
                      {previewSlots.find((s) => s.blockLabel)?.label ??
                        "none"}
                    </span>
                  </li>
                  <li>
                    Latest time used:{" "}
                    <span className="font-mono">
                      {[...previewSlots]
                        .reverse()
                        .find((s) => s.blockLabel)?.label ?? "none"}
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Preview grid */}
            <div className="md:w-1/2">
              <h2 className="text-sm font-semibold mb-2">Day preview</h2>
              <p className="text-xs text-slate-400 mb-2">
                Each box is a 1-hour block from 7:00–15:00, split into four
                15-minute chunks (same as the child view).
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
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
                          {start.label} – {end.label}
                        </span>
                        <span className="uppercase tracking-wide text-[10px] text-slate-500">
                          Hour block
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {group.map((slot, i) => {
                          const filled = !!slot.blockLabel;
                          let pillClass =
                            "text-[9px] px-2 py-0.5 rounded-full border border-slate-700";
                          if (slot.type === "academic") {
                            pillClass +=
                              " bg-sky-500/20 border-sky-500/60 text-sky-200";
                          } else if (slot.type === "workout") {
                            pillClass +=
                              " bg-emerald-500/20 border-emerald-500/60 text-emerald-200";
                          } else if (slot.type === "break") {
                            pillClass +=
                              " bg-violet-500/15 border-violet-500/60 text-violet-200";
                          } else if (slot.type === "routine") {
                            pillClass +=
                              " bg-amber-500/15 border-amber-500/60 text-amber-200";
                          }

                          return (
                            <div
                              key={i}
                              className="rounded-xl border border-slate-800 bg-slate-900/80 px-2 py-2 flex flex-col justify-between min-h-[56px]"
                            >
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="font-mono text-[9px] text-slate-500">
                                  {slot.label}
                                </span>
                                {filled && (
                                  <span className={pillClass}>
                                    {slot.type === "academic"
                                      ? "School"
                                      : slot.type === "workout"
                                      ? "Workout"
                                      : slot.type === "break"
                                      ? "Reset"
                                      : "Routine"}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-100 line-clamp-2">
                                {filled ? slot.blockLabel : "Empty"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Roadmap / explanation */}
          <div className="border-t border-slate-800 pt-3 mt-2 text-xs text-slate-400">
            <h3 className="font-semibold mb-1">What this page will do next</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Add toggles for each preset (e.g., “David can use this
                preset”) and save that to the browser, so the{" "}
                <span className="font-mono text-[11px]">/adhd</span> page only
                shows approved presets.
              </li>
              <li>
                Add a simple “Create new preset” wizard where you drag blocks
                into a grid here, then save it as <em>School Day A</em>,{" "}
                <em>Tournament Day</em>, etc.
              </li>
              <li>
                Optionally lock this page behind a simple PIN so kids can&apos;t
                change rules on their own.
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
