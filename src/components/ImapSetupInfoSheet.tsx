"use client";

import { CircleHelp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function ImapSetupInfoSheet() {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="border border-slate-800 bg-slate-950/70 text-slate-400 hover:bg-slate-900 hover:text-white"
          />
        }
      >
        <CircleHelp className="h-3.5 w-3.5" />
        <span className="sr-only">How to connect your email</span>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full max-w-md border-slate-800 bg-slate-950 text-slate-200"
      >
        <SheetHeader className="border-b border-slate-800 px-6 py-5">
          <SheetTitle className="text-xl text-white">
            How to connect your email
          </SheetTitle>
          <SheetDescription className="text-sm text-slate-400">
            Use your mailbox credentials to connect any IMAP inbox. Product Pulse
            auto-fills common providers, and you can override the settings if needed.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-6 py-6">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
              General
            </h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-400">
              <li>Enter your email address and password or app password.</li>
              <li>If login fails, check that IMAP access is enabled for your mailbox.</li>
              <li>You can edit the detected host and port manually at any time.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-200">
              Gmail
            </h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-100/85">
              <li>Enable 2-step verification on your Google account.</li>
              <li>Generate an App Password and use that instead of your normal password.</li>
            </ul>
            <a
              href="https://myaccount.google.com/apppasswords"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-amber-200 hover:text-white"
            >
              Open Google App Passwords
              <ExternalLink className="h-4 w-4" />
            </a>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
              Outlook
            </h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-400">
              <li>Make sure IMAP access is enabled in Outlook settings.</li>
              <li>Use your normal password or an app password if your account requires one.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
              Custom Domains
            </h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-400">
              <li>Ask your email provider or IT team for the IMAP host, port, and SSL setting.</li>
              <li>A common pattern is <span className="font-medium text-slate-200">imap.yourdomain.com</span>.</li>
            </ul>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
