"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Ticket, TicketPriority } from "@/lib/api";

interface TicketFormModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: {
    title: string;
    description: string;
    priority: TicketPriority;
  }) => Promise<void>;
  creating: boolean;
}

export default function TicketFormModal({
  open,
  onClose,
  onCreate,
  creating,
}: TicketFormModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Ticket["priority"]>("medium");
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  const handleSubmit = async () => {
    const nextTitle = title.trim();
    const nextDescription = description.trim();

    if (!nextTitle || !nextDescription) {
      setError("Title and description are required.");
      return;
    }

    setError(null);
    await onCreate({
      title: nextTitle,
      description: nextDescription,
      priority,
    });
    setTitle("");
    setDescription("");
    setPriority("medium");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="border-b border-slate-800/60 p-5">
          <h3 className="text-xl font-medium text-white">Create Ticket</h3>
          <p className="mt-1 text-sm text-slate-400">
            Add a structured internal issue and feed it into Product Pulse.
          </p>
        </div>
        <div className="space-y-4 p-5">
          {error && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Title</label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ticket title"
              className="h-11 rounded-xl border-slate-800 bg-slate-950 text-slate-100 placeholder:text-slate-600"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Description</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe the issue, request, or action that needs tracking."
              className="h-36 w-full resize-none rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-colors focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Priority</label>
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as TicketPriority)}
              className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition-colors focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-slate-800/60 p-5">
          <Button variant="ghost" onClick={onClose} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={creating}>
            {creating ? "Creating..." : "Create Ticket"}
          </Button>
        </div>
      </div>
    </div>
  );
}
