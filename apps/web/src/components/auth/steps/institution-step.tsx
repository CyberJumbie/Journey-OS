"use client";

import { useState, useEffect, useRef } from "react";
import type { InstitutionSearchResult } from "@journey-os/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface InstitutionStepProps {
  selectedInstitutionId: string | null;
  selectedInstitutionName: string | null;
  onSelect: (id: string, name: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function InstitutionStep({
  selectedInstitutionId,
  selectedInstitutionName,
  onSelect,
  onNext,
  onBack,
}: InstitutionStepProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<InstitutionSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `${API_URL}/api/v1/auth/institutions/search?q=${encodeURIComponent(query.trim())}`,
        );
        if (res.ok) {
          const json = await res.json();
          setResults(json.data ?? []);
        }
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  return (
    <div>
      <h2 className="mb-2 text-center font-serif text-xl font-semibold text-navy-deep">
        Institution
      </h2>
      <p className="mb-6 text-center text-sm text-text-secondary">
        Search for your institution by name or domain.
      </p>

      <div>
        <label
          htmlFor="institutionSearch"
          className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-text-muted"
        >
          Search Institutions
        </label>
        <input
          id="institutionSearch"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-border bg-parchment px-3 py-2 text-sm text-text-primary focus:border-blue-mid focus:outline-none focus:ring-2 focus:ring-blue-mid/15"
          placeholder="e.g. Meharry Medical College or msm.edu"
        />
      </div>

      {isSearching && (
        <p className="mt-2 text-sm text-text-muted">Searching...</p>
      )}

      {results.length > 0 && (
        <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border-light">
          {results.map((inst) => (
            <li key={inst.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(inst.id, inst.name);
                  setQuery("");
                  setResults([]);
                }}
                className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-parchment ${
                  selectedInstitutionId === inst.id ? "bg-blue-mid/5" : ""
                }`}
              >
                <span className="font-medium text-text-primary">
                  {inst.name}
                </span>
                <span className="ml-2 text-text-muted">{inst.domain}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {query.trim().length >= 2 && !isSearching && results.length === 0 && (
        <div className="mt-3 rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm">
          <p className="font-medium text-warning">Institution not found?</p>
          <p className="mt-1 text-text-secondary">
            Your institution may need to be registered first.{" "}
            <a
              href="/request-institution"
              className="font-medium text-blue-mid underline transition-colors hover:text-navy-deep"
            >
              Request new institution
            </a>
          </p>
        </div>
      )}

      {selectedInstitutionId && selectedInstitutionName && (
        <div className="mt-3 rounded-lg bg-blue-mid/5 p-3 text-sm">
          <span className="font-medium text-text-primary">Selected:</span>{" "}
          <span className="text-text-secondary">{selectedInstitutionName}</span>
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-parchment"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!selectedInstitutionId}
          className="flex-1 rounded-lg bg-navy-deep px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue disabled:opacity-60"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
