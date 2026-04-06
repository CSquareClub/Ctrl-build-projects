import React, { useState } from "react";

const IssueForm = ({ onAnalyze }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    repository: "",
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    } else if (formData.title.length < 5) {
      newErrors.title = "Title must be at least 5 characters";
    }
    
    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    } else if (formData.description.length < 20) {
      newErrors.description = "Description must be at least 20 characters";
    }
    
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    if (onAnalyze) {
      onAnalyze(formData);
    }
    setFormData({ title: "", description: "", repository: "" });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-surface-container-low p-8 rounded-xl border border-outline-variant/20">
      <h2 className="text-xl font-bold text-on-background">Submit An Issue</h2>

      <div>
        <label className="block text-sm font-medium text-on-surface mb-2">
          Issue Title <span className="text-error">*</span>
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Brief title of the issue"
          className={`w-full px-4 py-2 rounded-lg bg-surface border text-on-surface placeholder-outline/50 focus:outline-none focus:border-primary transition-colors ${
            errors.title ? "border-error" : "border-outline-variant/20"
          }`}
        />
        {errors.title && <p className="mt-1 text-xs text-error">{errors.title}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-on-surface mb-2">
          Issue Description <span className="text-error">*</span>
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Detailed description of the issue"
          rows="6"
          className={`w-full px-4 py-2 rounded-lg bg-surface border text-on-surface placeholder-outline/50 focus:outline-none focus:border-primary transition-colors resize-none ${
            errors.description ? "border-error" : "border-outline-variant/20"
          }`}
        />
        {errors.description && <p className="mt-1 text-xs text-error">{errors.description}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-on-surface mb-2">
          Repository (Optional)
        </label>
        <input
          type="text"
          name="repository"
          value={formData.repository}
          onChange={handleChange}
          placeholder="Repository name or URL"
          className="w-full px-4 py-2 rounded-lg bg-surface border border-outline-variant/20 text-on-surface placeholder-outline/50 focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      <button
        type="submit"
        className="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary-container font-medium py-3 rounded-lg hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
      >
        Analyze Issue
      </button>
    </form>
  );
};

export default IssueForm;
