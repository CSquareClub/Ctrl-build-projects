import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import IssueForm from "../components/IssueForm";
import { triageIssue } from "../services/api";

export default function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async (formData) => {
    setLoading(true);
    try {
      const result = await triageIssue(formData.title, formData.description, formData.repository);
      navigate("/triage", { state: { issue: formData, result } });
    } catch (error) {
      console.error("Triage failed:", error);
      navigate("/triage", { state: { issue: formData } });
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

      {/* Form + Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <IssueForm onAnalyze={handleAnalyze} loading={loading} />
        </div>

        {/* Info Card */}
        <div className="space-y-4">
          <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/20 space-y-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">info</span>
              <h3 className="font-label text-xs uppercase tracking-widest text-primary">How It Works</h3>
            </div>
            <ul className="space-y-3 text-sm text-outline font-body">
              <li className="flex gap-2"><span>1.</span><span>Submit your issue details</span></li>
              <li className="flex gap-2"><span>2.</span><span>AI analyzes and classifies</span></li>
              <li className="flex gap-2"><span>3.</span><span>Finds similar issues</span></li>
              <li className="flex gap-2"><span>4.</span><span>Suggests priority level</span></li>
            </ul>
          </div>

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
    </div>
  );
}
