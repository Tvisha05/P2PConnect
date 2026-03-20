"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const DEPARTMENTS = [
  { value: "CSE", label: "Computer Science & Engineering" },
  { value: "ECE", label: "Electronics & Communication Engineering" },
  { value: "EEE", label: "Electrical & Electronics Engineering" },
  { value: "ME", label: "Mechanical Engineering" },
  { value: "CE", label: "Chemical Engineering" },
  { value: "IT", label: "Information Technology" },
  { value: "AI_ML", label: "Artificial Intelligence & Machine Learning" },
  { value: "DS", label: "Data Science" },
  { value: "CIVIL", label: "Civil Engineering" },
  { value: "OTHER", label: "Other" },
] as const;

const YEARS = [
  { value: 1, label: "1st Year" },
  { value: 2, label: "2nd Year" },
  { value: 3, label: "3rd Year" },
  { value: 4, label: "4th Year" },
] as const;

interface AcademicProfileFormProps {
  mode: "setup" | "edit";
  initialData?: {
    rollNumber: string;
    department: string;
    year: number;
    semester: number;
    strongSubjects: string[];
  };
}

export function AcademicProfileForm({
  mode,
  initialData,
}: AcademicProfileFormProps) {
  const router = useRouter();
  const { update } = useSession();

  const [formData, setFormData] = useState({
    rollNumber: initialData?.rollNumber ?? "",
    department: initialData?.department ?? "",
    year: initialData?.year ?? 0,
    semester: initialData?.semester ?? 0,
    strongSubjects: initialData?.strongSubjects ?? [],
  });

  const [strongInput, setStrongInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const addSubject = () => {
    const trimmed = strongInput.trim();
    if (!trimmed) return;
    if (formData.strongSubjects.length >= 10) return;
    if (formData.strongSubjects.some((s) => s.toLowerCase() === trimmed.toLowerCase()))
      return;

    setFormData((prev) => ({
      ...prev,
      strongSubjects: [...prev.strongSubjects, trimmed],
    }));
    setStrongInput("");
  };

  const removeSubject = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      strongSubjects: prev.strongSubjects.filter((_, i) => i !== index),
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSubject();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/profile/academic", {
        method: mode === "setup" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({
          type: "error",
          text: data.error || "Failed to save academic profile",
        });
        return;
      }

      if (mode === "setup") {
        // Update session to reflect profileComplete
        await update({ profileComplete: true });
        router.push("/");
        router.refresh();
      } else {
        setMessage({ type: "success", text: "Academic profile updated successfully" });
      }
    } catch {
      setMessage({
        type: "error",
        text: "Something went wrong. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Compute available semesters based on year
  const availableSemesters =
    formData.year > 0
      ? [
          { value: formData.year * 2 - 1, label: `Semester ${formData.year * 2 - 1}` },
          { value: formData.year * 2, label: `Semester ${formData.year * 2}` },
        ]
      : [];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Roll Number */}
      <div>
        <label
          htmlFor="rollNumber"
          className="block text-sm font-medium text-foreground mb-2"
        >
          Roll Number
        </label>
        <input
          id="rollNumber"
          type="text"
          required
          value={formData.rollNumber}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, rollNumber: e.target.value }))
          }
          className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          placeholder="e.g. AP21110010001"
        />
      </div>

      {/* Department */}
      <div>
        <label
          htmlFor="department"
          className="block text-sm font-medium text-foreground mb-2"
        >
          Department
        </label>
        <select
          id="department"
          required
          value={formData.department}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, department: e.target.value }))
          }
          className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        >
          <option value="">Select department</option>
          {DEPARTMENTS.map((dept) => (
            <option key={dept.value} value={dept.value}>
              {dept.label}
            </option>
          ))}
        </select>
      </div>

      {/* Year & Semester */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="year"
            className="block text-sm font-medium text-foreground mb-2"
          >
            Year
          </label>
          <select
            id="year"
            required
            value={formData.year || ""}
            onChange={(e) => {
              const year = Number(e.target.value);
              setFormData((prev) => ({
                ...prev,
                year,
                semester: year > 0 ? year * 2 - 1 : 0,
              }));
            }}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          >
            <option value="">Select</option>
            {YEARS.map((y) => (
              <option key={y.value} value={y.value}>
                {y.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="semester"
            className="block text-sm font-medium text-foreground mb-2"
          >
            Semester
          </label>
          <select
            id="semester"
            required
            value={formData.semester || ""}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                semester: Number(e.target.value),
              }))
            }
            disabled={formData.year === 0}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50"
          >
            <option value="">Select</option>
            {availableSemesters.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Strong Subjects */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Strong Subjects
          <span className="text-muted-foreground font-normal ml-1">
            (subjects you can help others with)
          </span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={strongInput}
            onChange={(e) => setStrongInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            placeholder="e.g. Data Structures"
          />
          <button
            type="button"
            onClick={addSubject}
            className="rounded-xl bg-primary/10 text-primary px-4 py-3 text-sm font-medium hover:bg-primary/20 transition-colors"
          >
            Add
          </button>
        </div>
        {formData.strongSubjects.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {formData.strongSubjects.map((subject, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 text-sm border border-emerald-500/20"
              >
                {subject}
                <button
                  type="button"
                  onClick={() => removeSubject(i)}
                  className="hover:text-destructive transition-colors"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
        {formData.strongSubjects.length === 0 && (
          <p className="text-xs text-muted-foreground mt-1.5">
            Add at least one strong subject
          </p>
        )}
      </div>

      {/* Message */}
      {message && (
        <div
          className={`rounded-xl p-4 text-sm border ${
            message.type === "success"
              ? "bg-success/10 text-success border-success/20"
              : "bg-destructive/10 text-destructive border-destructive/20"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-primary/20"
      >
        {isLoading
          ? mode === "setup"
            ? "Setting up..."
            : "Saving..."
          : mode === "setup"
            ? "Complete Setup"
            : "Save Changes"}
      </button>
    </form>
  );
}
