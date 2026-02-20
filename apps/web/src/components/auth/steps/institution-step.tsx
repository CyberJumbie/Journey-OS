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
      <h2
        className="mb-2 text-center text-xl font-semibold"
        style={{ fontFamily: "Source Sans 3, sans-serif" }}
      >
        Institution
      </h2>
      <p className="mb-6 text-center text-sm text-gray-600">
        Search for your institution by name or domain.
      </p>

      <div>
        <label
          htmlFor="institutionSearch"
          className="mb-1 block text-sm font-medium text-gray-700"
          style={{ fontFamily: "DM Mono, monospace" }}
        >
          Search Institutions
        </label>
        <input
          id="institutionSearch"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2"
          style={{ "--tw-ring-color": "#2b71b9" } as React.CSSProperties}
          placeholder="e.g. Meharry Medical College or msm.edu"
        />
      </div>

      {isSearching && (
        <p className="mt-2 text-sm text-gray-500">Searching...</p>
      )}

      {results.length > 0 && (
        <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-md border border-gray-200">
          {results.map((inst) => (
            <li key={inst.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(inst.id, inst.name);
                  setQuery("");
                  setResults([]);
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                  selectedInstitutionId === inst.id ? "bg-blue-50" : ""
                }`}
              >
                <span className="font-medium">{inst.name}</span>
                <span className="ml-2 text-gray-500">{inst.domain}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {query.trim().length >= 2 && !isSearching && results.length === 0 && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
          <p className="font-medium text-amber-800">Institution not found?</p>
          <p className="mt-1 text-amber-700">
            Your institution may need to be registered first.{" "}
            <a
              href="/request-institution"
              className="underline"
              style={{ color: "#2b71b9" }}
            >
              Request new institution
            </a>
          </p>
        </div>
      )}

      {selectedInstitutionId && selectedInstitutionName && (
        <div
          className="mt-3 rounded-md p-3 text-sm"
          style={{ backgroundColor: "#f0f6ff", borderColor: "#2b71b9" }}
        >
          <span className="font-medium">Selected:</span>{" "}
          {selectedInstitutionName}
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!selectedInstitutionId}
          className="flex-1 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          style={{ backgroundColor: "#2b71b9" }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
