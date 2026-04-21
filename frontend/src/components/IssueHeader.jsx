import React from 'react';

export default function IssueHeader() {
  return (
    <header className="mb-10">
      <nav className="flex items-center gap-2 mb-4 text-xs font-mono uppercase tracking-widest text-outline">
        <a className="hover:text-primary" href="#">
          Home
        </a>
        <span className="material-symbols-outlined scale-75">chevron_right</span>
        <a className="hover:text-primary" href="#">
          Triage
        </a>
        <span className="material-symbols-outlined scale-75">chevron_right</span>
        <span className="text-on-surface">Results</span>
      </nav>
      <h1 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface max-w-4xl leading-tight">
        Authentication failure on secondary cluster nodes during OIDC challenge rotation
      </h1>
    </header>
  );
}
