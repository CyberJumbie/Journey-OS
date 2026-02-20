"use client";

import { useState, useEffect } from "react";
import { Input } from "@web/components/ui/input";
import { Button } from "@web/components/ui/button";
import { Card, CardContent } from "@web/components/ui/card";
import { Search, X, User } from "lucide-react";
import { searchInstitutionUsers } from "@web/lib/api/courses";

export interface CourseWizardStep4Props {
  readonly selectedDirectorId: string | null;
  readonly selectedDirectorName: string | null;
  readonly selectedDirectorEmail: string | null;
  readonly onSelectDirector: (id: string, name: string, email: string) => void;
  readonly onClearDirector: () => void;
  readonly institutionId: string;
}

interface UserResult {
  readonly id: string;
  readonly email: string;
  readonly full_name: string;
  readonly role: string;
}

export function CourseWizardStep4({
  selectedDirectorId,
  selectedDirectorName,
  selectedDirectorEmail,
  onSelectDirector,
  onClearDirector,
  institutionId,
}: CourseWizardStep4Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<readonly UserResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Async IIFE pattern to satisfy react-hooks/set-state-in-effect
  useEffect(() => {
    if (query.length < 2) {
      const clear = async () => {
        setResults([]);
      };
      clear();
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      const res = await searchInstitutionUsers(institutionId, query);
      if (res.data) {
        setResults(res.data);
      }
      setLoading(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, institutionId]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Search for a faculty member to assign as Course Director. This step is
        optional — you can assign one later.
      </p>

      {selectedDirectorId ? (
        <Card className="bg-parchment">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-deep text-white">
              <User className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-text-primary">
                {selectedDirectorName}
              </p>
              <p className="text-sm text-text-secondary">
                {selectedDirectorEmail}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearDirector}
            >
              <X className="mr-1 h-4 w-4" /> Clear
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="pl-9"
            />
          </div>

          {loading && (
            <p className="text-sm text-text-secondary">Searching...</p>
          )}

          {results.length > 0 && (
            <div className="space-y-1 rounded-md border border-border-light bg-white p-1">
              {results.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-parchment transition-colors"
                  onClick={() =>
                    onSelectDirector(user.id, user.full_name, user.email)
                  }
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warm-gray text-text-secondary">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {user.full_name}
                    </p>
                    <p className="text-xs text-text-secondary">{user.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {query.length >= 2 && !loading && results.length === 0 && (
            <p className="text-sm text-text-secondary">
              No faculty members found matching &ldquo;{query}&rdquo;
            </p>
          )}
        </div>
      )}
    </div>
  );
}
