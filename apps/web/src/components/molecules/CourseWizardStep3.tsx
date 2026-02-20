"use client";

import { useState } from "react";
import type {
  WizardSectionInput,
  WizardSessionInput,
  DayOfWeek,
  SessionType,
} from "@journey-os/types";
import { DAY_OF_WEEK_LABELS, SESSION_TYPE_LABELS } from "@journey-os/types";
import { Input } from "@web/components/ui/input";
import { Label } from "@web/components/ui/label";
import { Button } from "@web/components/ui/button";
import { Card, CardContent, CardHeader } from "@web/components/ui/card";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";

export interface CourseWizardStep3Props {
  readonly sections: readonly WizardSectionInput[];
  readonly onSectionsChange: (sections: WizardSectionInput[]) => void;
}

const DEFAULT_SESSION: WizardSessionInput = {
  title: "",
  week_number: 1,
  day_of_week: "monday" as DayOfWeek,
  start_time: "09:00",
  end_time: "10:00",
  session_type: "lecture" as SessionType,
};

const dayOptions = Object.entries(DAY_OF_WEEK_LABELS) as [DayOfWeek, string][];
const typeOptions = Object.entries(SESSION_TYPE_LABELS) as [
  SessionType,
  string,
][];

export function CourseWizardStep3({
  sections,
  onSectionsChange,
}: CourseWizardStep3Props) {
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  function addSection() {
    const next: WizardSectionInput = {
      title: "",
      position: sections.length + 1,
      sessions: [],
    };
    onSectionsChange([...sections, next]);
  }

  function removeSection(idx: number) {
    const updated = sections
      .filter((_, i) => i !== idx)
      .map((s, i) => ({ ...s, position: i + 1 }));
    onSectionsChange(updated);
  }

  function updateSectionTitle(idx: number, title: string) {
    const updated = [...sections];
    updated[idx] = { ...updated[idx]!, title };
    onSectionsChange(updated);
  }

  function swapSections(a: number, b: number) {
    if (b < 0 || b >= sections.length) return;
    const updated = [...sections];
    const temp = updated[a]!;
    updated[a] = { ...updated[b]!, position: a + 1 };
    updated[b] = { ...temp, position: b + 1 };
    onSectionsChange(updated);
  }

  function addSession(sectionIdx: number) {
    const updated = [...sections];
    const section = updated[sectionIdx]!;
    updated[sectionIdx] = {
      ...section,
      sessions: [...section.sessions, { ...DEFAULT_SESSION }],
    };
    onSectionsChange(updated);
  }

  function removeSession(sectionIdx: number, sessionIdx: number) {
    const updated = [...sections];
    const section = updated[sectionIdx]!;
    updated[sectionIdx] = {
      ...section,
      sessions: section.sessions.filter((_, i) => i !== sessionIdx),
    };
    onSectionsChange(updated);
  }

  function updateSession(
    sectionIdx: number,
    sessionIdx: number,
    field: keyof WizardSessionInput,
    value: string | number,
  ) {
    const updated = [...sections];
    const section = updated[sectionIdx]!;
    const sessions = [...section.sessions];
    sessions[sessionIdx] = { ...sessions[sessionIdx]!, [field]: value };
    updated[sectionIdx] = { ...section, sessions };
    onSectionsChange(updated);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Add sections to organize your course content. Each section can contain
        multiple sessions.
      </p>

      {sections.map((section, sIdx) => (
        <Card key={sIdx} className="bg-parchment">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  disabled={sIdx === 0}
                  onClick={() => swapSections(sIdx, sIdx - 1)}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  disabled={sIdx === sections.length - 1}
                  onClick={() => swapSections(sIdx, sIdx + 1)}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1">
                <Label className="text-xs text-text-secondary">
                  Section {section.position}
                </Label>
                <Input
                  value={section.title}
                  onChange={(e) => updateSectionTitle(sIdx, e.target.value)}
                  placeholder="Section title"
                  className="bg-white"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-[var(--color-red-500)]"
                onClick={() => removeSection(sIdx)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setCollapsed((p) => ({ ...p, [sIdx]: !p[sIdx] }))
                }
              >
                {collapsed[sIdx] ? "Show" : "Hide"} sessions
              </Button>
            </div>
          </CardHeader>

          {!collapsed[sIdx] && (
            <CardContent className="space-y-3">
              {section.sessions.map((session, ssIdx) => (
                <div key={ssIdx} className="rounded-md bg-white p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-text-secondary">
                      Session {ssIdx + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-[var(--color-red-500)]"
                      onClick={() => removeSession(sIdx, ssIdx)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <Label className="text-xs">Title</Label>
                      <Input
                        value={session.title}
                        onChange={(e) =>
                          updateSession(sIdx, ssIdx, "title", e.target.value)
                        }
                        placeholder="Session title"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Week</Label>
                      <Input
                        type="number"
                        min={1}
                        max={52}
                        value={session.week_number}
                        onChange={(e) =>
                          updateSession(
                            sIdx,
                            ssIdx,
                            "week_number",
                            parseInt(e.target.value, 10) || 1,
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Day</Label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                        value={session.day_of_week}
                        onChange={(e) =>
                          updateSession(
                            sIdx,
                            ssIdx,
                            "day_of_week",
                            e.target.value,
                          )
                        }
                      >
                        {dayOptions.map(([val, label]) => (
                          <option key={val} value={val}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Start</Label>
                      <Input
                        type="time"
                        value={session.start_time}
                        onChange={(e) =>
                          updateSession(
                            sIdx,
                            ssIdx,
                            "start_time",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">End</Label>
                      <Input
                        type="time"
                        value={session.end_time}
                        onChange={(e) =>
                          updateSession(sIdx, ssIdx, "end_time", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Type</Label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                        value={session.session_type}
                        onChange={(e) =>
                          updateSession(
                            sIdx,
                            ssIdx,
                            "session_type",
                            e.target.value,
                          )
                        }
                      >
                        {typeOptions.map(([val, label]) => (
                          <option key={val} value={val}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-navy-deep"
                onClick={() => addSession(sIdx)}
              >
                <Plus className="mr-1 h-4 w-4" /> Add Session
              </Button>
            </CardContent>
          )}
        </Card>
      ))}

      <Button
        type="button"
        variant="ghost"
        className="text-navy-deep"
        onClick={addSection}
      >
        <Plus className="mr-1 h-4 w-4" /> Add Section
      </Button>
    </div>
  );
}
