"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface LeaveGroupButtonProps {
  groupId: string;
}

export function LeaveGroupButton({ groupId }: LeaveGroupButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLeave = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/matching/groups/${groupId}/leave`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to leave group");
        return;
      }

      router.push("/groups");
      router.refresh();
    } catch {
      alert("Failed to leave group");
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {confirming && (
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          disabled={loading}
        >
          Cancel
        </button>
      )}
      <button
        onClick={handleLeave}
        disabled={loading}
        className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
          confirming
            ? "bg-red-500 text-white border-red-500 hover:bg-red-600"
            : "text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/10"
        } disabled:opacity-50`}
      >
        {loading ? "Leaving..." : confirming ? "Confirm Leave" : "Leave Group"}
      </button>
    </div>
  );
}
