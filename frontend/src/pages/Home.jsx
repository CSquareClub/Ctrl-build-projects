import React, { useState } from "react";

export default function Home() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    repository: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setResult({
        priority: "high",
        analysis: "Issue detected as high priority",
      });
      setLoading(false);
    }, 1000);
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-outline text-xs uppercase tracking-widest font-label mb-2">Priority</p>
              <p className="text-on-background font-headline text-lg capitalize">{result.priority}</p>
            </div>
            <div>
              <p className="text-outline text-xs uppercase tracking-widest font-label mb-2">Status</p>
              <p className="text-tertiary font-headline text-lg">Ready</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}