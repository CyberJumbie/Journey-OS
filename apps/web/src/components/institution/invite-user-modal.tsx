"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface InviteUserModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteUserModal({ onClose, onSuccess }: InviteUserModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("faculty");
  const [isCourseDirector, setIsCourseDirector] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const token = ""; // TODO: get from auth context
      const res = await fetch(`${API_URL}/api/v1/institution/users/invite`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          role,
          is_course_director: role === "faculty" ? isCourseDirector : undefined,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        if (res.status === 409) {
          setError("An active invitation already exists for this email.");
        } else {
          setError(json.error?.message ?? "Failed to send invitation.");
        }
        setSubmitting(false);
        return;
      }

      onSuccess();
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Invite User</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="invite-email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@institution.edu"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#2b71b9] focus:outline-none focus:ring-1 focus:ring-[#2b71b9]"
            />
          </div>

          <div>
            <label
              htmlFor="invite-role"
              className="block text-sm font-medium text-gray-700"
            >
              Role
            </label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                if (e.target.value !== "faculty") {
                  setIsCourseDirector(false);
                }
              }}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="faculty">Faculty</option>
              <option value="student">Student</option>
              <option value="advisor">Advisor</option>
            </select>
          </div>

          {role === "faculty" && (
            <div className="flex items-center gap-2">
              <input
                id="invite-cd"
                type="checkbox"
                checked={isCourseDirector}
                onChange={(e) => setIsCourseDirector(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#2b71b9] focus:ring-[#2b71b9]"
              />
              <label htmlFor="invite-cd" className="text-sm text-gray-700">
                Course Director
              </label>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-[#2b71b9] px-4 py-2 text-sm font-medium text-white hover:bg-[#245d9a] disabled:opacity-50"
            >
              {submitting ? "Sending..." : "Send Invitation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
