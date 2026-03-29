"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Option {
  id: string;
  title: string;
}

interface ReminderFormModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: {
    title: string;
    description?: string;
    remind_at: string;
    linked_issue_id?: string | null;
    linked_ticket_id?: string | null;
  }) => Promise<void>;
  creating: boolean;
  issueOptions?: Option[];
  ticketOptions?: Option[];
  defaultIssueId?: string | null;
  defaultTicketId?: string | null;
}

function toLocalInputValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
}

function defaultRemindAtValue() {
  return toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000).toISOString());
}

export default function ReminderFormModal({
  open,
  onClose,
  onCreate,
  creating,
  issueOptions = [],
  ticketOptions = [],
  defaultIssueId = null,
  defaultTicketId = null,
}: ReminderFormModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [remindAt, setRemindAt] = useState(() => defaultRemindAtValue());
  const [linkedIssueId, setLinkedIssueId] = useState<string>(defaultIssueId ?? "");
  const [linkedTicketId, setLinkedTicketId] = useState<string>(defaultTicketId ?? "");
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  const closeModal = () => {
    setTitle("");
    setDescription("");
    setRemindAt(defaultRemindAtValue());
    setLinkedIssueId(defaultIssueId ?? "");
    setLinkedTicketId(defaultTicketId ?? "");
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!title.trim() || !remindAt) {
      setError("Title and remind time are required.");
      return;
    }

    setError(null);

    await onCreate({
      title: title.trim(),
      description: description.trim() || undefined,
      remind_at: new Date(remindAt).toISOString(),
      linked_issue_id: linkedIssueId || null,
      linked_ticket_id: linkedTicketId || null,
    });

    setTitle("");
    setDescription("");
    setRemindAt(defaultRemindAtValue());
    setLinkedIssueId(defaultIssueId ?? "");
    setLinkedTicketId(defaultTicketId ?? "");
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={closeModal}
      />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="border-b border-slate-800/60 p-5">
          <h3 className="text-xl font-medium text-white">Create Reminder</h3>
          <p className="mt-1 text-sm text-slate-400">
            Schedule a follow-up action for an issue, a ticket, or a standalone task.
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
              placeholder="Reminder title"
              className="h-11 rounded-xl border-slate-800 bg-slate-950 text-slate-100 placeholder:text-slate-600"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Description</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional context for the follow-up"
              className="h-28 w-full resize-none rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-colors focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Remind At</label>
            <Input
              type="datetime-local"
              value={remindAt}
              onChange={(event) => setRemindAt(event.target.value)}
              className="h-11 rounded-xl border-slate-800 bg-slate-950 text-slate-100"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Link Issue</label>
              <select
                value={linkedIssueId}
                onChange={(event) => setLinkedIssueId(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition-colors focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="">None</option>
                {issueOptions.map((issue) => (
                  <option key={issue.id} value={issue.id}>
                    {issue.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Link Ticket</label>
              <select
                value={linkedTicketId}
                onChange={(event) => setLinkedTicketId(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition-colors focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="">None</option>
                {ticketOptions.map((ticket) => (
                  <option key={ticket.id} value={ticket.id}>
                    {ticket.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-slate-800/60 p-5">
          <Button variant="ghost" onClick={closeModal} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={creating}>
            {creating ? "Saving..." : "Create Reminder"}
          </Button>
        </div>
      </div>
    </div>
  );
}
