"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Folder, FileText } from "lucide-react";
import type { SectionWithSessions } from "@journey-os/types";

interface CourseHierarchyTreeProps {
  readonly sections: readonly SectionWithSessions[];
}

export function CourseHierarchyTree({ sections }: CourseHierarchyTreeProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (sections.length === 0) {
    return (
      <div className="py-6 text-center font-sans text-sm text-text-muted">
        No sections or sessions yet.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {sections.map((section) => {
        const isCollapsed = collapsed.has(section.id);
        return (
          <div key={section.id}>
            <button
              type="button"
              onClick={() => toggle(section.id)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-parchment"
            >
              {isCollapsed ? (
                <ChevronRight size={14} className="text-text-muted" />
              ) : (
                <ChevronDown size={14} className="text-text-muted" />
              )}
              <Folder size={14} className="text-blue-mid" />
              <span className="font-sans text-sm font-semibold text-text-primary">
                {section.position}. {section.title}
              </span>
              <span className="font-mono text-[0.625rem] text-text-muted">
                {section.sessions.length} sessions
              </span>
            </button>

            {!isCollapsed && (
              <div className="ml-6 space-y-0.5 border-l border-border-light pl-4">
                {section.sessions.map((session, idx) => (
                  <div
                    key={session.id}
                    className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-parchment"
                  >
                    <FileText size={12} className="text-text-muted" />
                    <span className="font-sans text-sm text-text-secondary">
                      {idx + 1}. {session.title}
                    </span>
                  </div>
                ))}
                {section.sessions.length === 0 && (
                  <div className="px-2 py-1 font-sans text-xs text-text-muted">
                    No sessions
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
