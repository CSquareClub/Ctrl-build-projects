import React, { useState, useEffect } from "react";

export default function Settings() {
  const [settings, setSettings] = useState({
    projectName: "My Project",
    autoAnalyze: true,
    priorityThreshold: "medium",
    language: "en",
    theme: "dark",
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = () => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
    alert("Settings saved successfully!");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="mb-10">
        <h1 className="text-4xl font-headline font-bold tracking-tight text-on-background mb-2">
          Settings & Configuration
        </h1>
        <p className="text-outline font-body">
          Customize your OpenIssue analyzer experience.
        </p>
      </header>

      {/* General Settings */}
      <section className="bg-surface-container-low p-8 rounded-xl border border-outline-variant/20 space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <span className="material-symbols-outlined text-primary text-2xl">settings</span>
          <h2 className="font-label text-xs uppercase tracking-[0.2em] text-primary">General Settings</h2>
          <div className="h-[1px] flex-1 bg-outline-variant/20"></div>
        </div>

        {/* Project Name */}
        <div className="space-y-2">
          <label className="block font-label text-[10px] uppercase text-outline">Project Name</label>
          <input
            type="text"
            name="projectName"
            value={settings.projectName}
            onChange={handleChange}
            className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-3 text-sm text-on-background terminal-glow outline-none transition-all font-body"
          />
        </div>

        {/* Language */}
        <div className="space-y-2">
          <label className="block font-label text-[10px] uppercase text-outline">Language</label>
          <select
            name="language"
            value={settings.language}
            onChange={handleChange}
            className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-3 text-sm text-on-background terminal-glow outline-none transition-all font-body"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
          </select>
        </div>

        {/* Theme */}
        <div className="space-y-2">
          <label className="block font-label text-[10px] uppercase text-outline">Theme</label>
          <select
            name="theme"
            value={settings.theme}
            onChange={handleChange}
            className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-3 text-sm text-on-background terminal-glow outline-none transition-all font-body"
          >
            <option value="dark">Dark (Material Design)</option>
            <option value="light">Light</option>
            <option value="auto">Auto</option>
          </select>
        </div>
      </section>

      {/* Analysis Settings */}
      <section className="bg-surface-container-low p-8 rounded-xl border border-outline-variant/20 space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <span className="material-symbols-outlined text-primary text-2xl">analytics</span>
          <h2 className="font-label text-xs uppercase tracking-[0.2em] text-primary">Analysis Settings</h2>
          <div className="h-[1px] flex-1 bg-outline-variant/20"></div>
        </div>

        {/* Auto Analyze */}
        <label className="flex items-center gap-4 cursor-pointer p-4 rounded-lg hover:bg-surface-container-highest/50 transition-colors group">
          <input
            type="checkbox"
            name="autoAnalyze"
            checked={settings.autoAnalyze}
            onChange={handleChange}
            className="w-5 h-5 accent-primary cursor-pointer"
          />
          <div className="flex-1">
            <p className="font-label text-sm text-on-background">Auto-analyze on submit</p>
            <p className="text-outline text-xs">Automatically analyze issues as they are submitted</p>
          </div>
          <span className="material-symbols-outlined text-primary text-lg opacity-0 group-hover:opacity-100 transition-opacity">
            {settings.autoAnalyze ? "check_circle" : "radio_button_unchecked"}
          </span>
        </label>

        {/* Priority Threshold */}
        <div className="space-y-2">
          <label className="block font-label text-[10px] uppercase text-outline">Priority Threshold</label>
          <select
            name="priorityThreshold"
            value={settings.priorityThreshold}
            onChange={handleChange}
            className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-3 text-sm text-on-background terminal-glow outline-none transition-all font-body"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </section>

      {/* API Settings */}
      <section className="bg-surface-container-low p-8 rounded-xl border border-outline-variant/20 space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <span className="material-symbols-outlined text-primary text-2xl">api</span>
          <h2 className="font-label text-xs uppercase tracking-[0.2em] text-primary">API Configuration</h2>
          <div className="h-[1px] flex-1 bg-outline-variant/20"></div>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-lg border border-outline-variant/20">
          <p className="text-outline text-xs uppercase font-label mb-2">Backend URL</p>
          <p className="font-monospace text-sm text-primary">http://localhost:5000</p>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-lg border border-outline-variant/20">
          <p className="text-outline text-xs uppercase font-label mb-2">API Version</p>
          <p className="font-monospace text-sm text-primary">v1.0.0</p>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="bg-surface-container-low p-8 rounded-xl border border-error/20 space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <span className="material-symbols-outlined text-error text-2xl">warning</span>
          <h2 className="font-label text-xs uppercase tracking-[0.2em] text-error">Danger Zone</h2>
          <div className="h-[1px] flex-1 bg-outline-variant/20"></div>
        </div>

        <button className="w-full bg-error/10 border border-error/30 text-error hover:bg-error/20 font-label uppercase py-3 rounded-lg font-bold text-xs tracking-widest transition-all">
          Clear All Data
        </button>

        <button className="w-full bg-error/10 border border-error/30 text-error hover:bg-error/20 font-label uppercase py-3 rounded-lg font-bold text-xs tracking-widest transition-all">
          Reset to Defaults
        </button>
      </section>

      {/* Save Button */}
      <div className="flex gap-4 pt-4">
        <button
          onClick={handleSave}
          className="flex-1 bg-gradient-to-br from-primary to-primary-container text-on-primary-container font-label uppercase py-4 rounded-xl font-bold text-sm tracking-widest shadow-xl shadow-primary/5 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">save</span>
          Save Changes
        </button>
        <button className="flex-1 bg-surface-container border border-outline-variant/30 text-on-background hover:bg-surface-container-highest font-label uppercase py-4 rounded-xl font-bold text-sm tracking-widest transition-all">
          Cancel
        </button>
      </div>
    </div>
  );
}