import React, { useState } from "react";
import apiClient from "../services/api";

export default function Home() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    repository: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.title.trim() || !formData.description.trim()) {
      setError("Title and description are required.");
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.analyzeIssue({
        title: formData.title.trim(),
        description: formData.description.trim(),
        repository: formData.repository.trim() || undefined,
      });

      setResult({
        priority: response.priority,
        label: response.label,
        confidence: response.confidence,
        similar_issues: response.similar_issues || [],
      });
    } catch (err) {
      setError(err.message || "Failed to analyze issue. Ensure backend is running.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12">
      {/* Header */}
      <header className="mb-10">
        <h1 className="text-4xl font-headline font-bold tracking-tight text-on-background mb-2">
          Welcome to OpenIssue Analyzer
        </h1>
        <p className="text-outline font-body">
          Analyze and find similar issues with AI-powered classification.
        </p>
      </header>

      {/* Form Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <h2 className="font-label text-xs uppercase tracking-[0.2em] text-primary">Submit Issue</h2>
            <div className="h-[1px] flex-1 bg-outline-variant/20"></div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label className="block font-label text-[10px] uppercase text-outline">Issue Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Brief title of the issue"
              className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-3 text-sm text-on-background terminal-glow outline-none transition-all font-body placeholder:text-outline/50"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="block font-label text-[10px] uppercase text-outline">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Detailed description of the issue..."
              rows="6"
              className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-3 text-sm text-on-background terminal-glow outline-none transition-all font-body placeholder:text-outline/50"
            />
          </div>

          {/* Repository */}
          <div className="space-y-2">
            <label className="block font-label text-[10px] uppercase text-outline">Repository (Optional)</label>
            <input
              type="text"
              name="repository"
              value={formData.repository}
              onChange={handleChange}
              placeholder="Repository name"
              className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-3 text-sm text-on-background terminal-glow outline-none transition-all font-body placeholder:text-outline/50"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary-container font-label uppercase py-4 rounded-xl font-bold text-sm tracking-widest shadow-xl shadow-primary/5 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <span className="material-symbols-outlined animate-spin text-lg">settings</span>}
            {loading ? "Analyzing..." : "Analyze Issue"}
          </button>
          {error && (
            <div className="rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}
        </form>

        {/* Info Card */}
        <div className="space-y-4">
          <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/20 space-y-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">info</span>
              <h3 className="font-label text-xs uppercase tracking-widest text-primary">How It Works</h3>
            </div>
            <ul className="space-y-3 text-sm text-outline font-body">
              <li className="flex gap-2">
                <span>1.</span>
                <span>Submit your issue details</span>
              </li>
              <li className="flex gap-2">
                <span>2.</span>
                <span>AI analyzes and classifies</span>
              </li>
              <li className="flex gap-2">
                <span>3.</span>
                <span>Finds similar issues</span>
              </li>
              <li className="flex gap-2">
                <span>4.</span>
                <span>Suggests priority level</span>
              </li>
            </ul>
          </div>

          {/* Features */}
          <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/20 space-y-4">
            <h3 className="font-label text-xs uppercase tracking-widest text-primary">Features</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
                <span className="text-outline">Priority Classification</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
                <span className="text-outline">Similarity Detection</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
                <span className="text-outline">Content Analysis</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-surface-container-low p-8 rounded-xl border border-primary/20 space-y-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-tertiary text-2xl">check_circle</span>
            <h3 className="font-label text-xs uppercase tracking-widest text-tertiary">Analysis Complete</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-outline text-xs uppercase tracking-widest font-label mb-2">Priority</p>
              <p className="text-on-background font-headline text-lg capitalize">{result.priority}</p>
            </div>
            <div>
              <p className="text-outline text-xs uppercase tracking-widest font-label mb-2">Classification</p>
              <p className="text-on-background font-headline text-lg capitalize">{result.label}</p>
            </div>
            <div>
              <p className="text-outline text-xs uppercase tracking-widest font-label mb-2">Confidence</p>
              <p className="text-tertiary font-headline text-lg">
                {Math.round((result.confidence?.classification || 0) * 100)}%
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-outline-variant/20">
            <p className="text-outline text-xs uppercase tracking-widest font-label mb-3">
              Similar Issues ({result.similar_issues.length})
            </p>
            {result.similar_issues.length === 0 ? (
              <p className="text-outline text-sm">No similar issues found.</p>
            ) : (
              <div className="space-y-2">
                {result.similar_issues.map((issue) => (
                  <div
                    key={issue.id || issue.title}
                    className="rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-on-background font-medium truncate">
                        {issue.title || "Untitled issue"}
                      </p>
                      <span className="text-xs text-outline whitespace-nowrap">
                        {Math.round((issue.similarity || 0) * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}