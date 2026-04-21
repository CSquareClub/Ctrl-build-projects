import React, { useState, useRef } from 'react';
import { UploadCloud, Loader2, AlertCircle } from 'lucide-react';
import { analyzeResume } from '../api/index';
import './UploadSection.css';

const UploadSection = ({ onUploadComplete, parsedJD }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [jobDescription, setJobDescription] = useState(
    "We are looking for a Senior Frontend Engineer with expertise in React, CSS, and modern UI design."
  );
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
      setIsDragActive(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file) => {
    setUploadError(null);

    if (!file || file.size === 0) {
      setUploadError("Empty file detected. Please select a valid PDF.");
      return;
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError("Only PDF files are accepted. Please upload a .pdf file.");
      return;
    }

    const jd = jobDescription.trim();
    if (!jd || jd.length < 10) {
      setUploadError("Please provide a more detailed Job Description (at least 10 characters).");
      return;
    }

    setIsUploading(true);
    try {
      const data = await analyzeResume(file, jd);
      setIsUploading(false);
      onUploadComplete(data);
    } catch (error) {
      console.error('Analysis error:', error);
      setIsUploading(false);
      setUploadError(error.message);
    }
  };

  return (
    <section className="upload-section" id="upload">
      <div className="upload-container">
        <h2 className="section-title">Initiate Analysis</h2>
        <p className="section-subtitle">Securely process resumes through our quantum-grade AI models</p>

        {/* Show parsed JD hint if available */}
        {parsedJD && (
          <div className="parsed-jd-hint glass-panel fade-in">
            <span>✅ JD parsed for <strong>{parsedJD.role_title}</strong></span>
          </div>
        )}

        <div className="jd-input-wrapper fade-in-up">
          <label>Target Job Role & Description</label>
          <textarea
            className="jd-textarea glass-panel"
            placeholder="Paste the job requirements here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />
          <p className="jd-tip">Higher detail leads to more accurate AI alignment scores</p>
        </div>

        {uploadError && (
          <div className="upload-error glass-panel fade-in">
            <AlertCircle size={16} />
            <span>{uploadError}</span>
          </div>
        )}

        <div
          className={`drop-zone premium-glass ${isDragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDragEnter}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current.click()}
        >
          <div className="color-plate-glow"></div>
          <div className="neural-particles"></div>
          <div className="drop-content-wrapper">
            <input
              ref={fileInputRef}
              type="file"
              className="file-input hidden"
              onChange={handleChange}
              accept=".pdf"
            />

            {isUploading ? (
              <div className="upload-state uploading fade-in">
                <div className="scan-line"></div>
                <Loader2 className="spinner-icon" size={48} />
                <h3 className="text-gradient">Analyzing Neural Pathways...</h3>
                <p>Matching candidate skills against parameters</p>
              </div>
            ) : (
              <div className="upload-state idle">
                <div className="upload-icon-wrapper">
                  <UploadCloud className="upload-icon" size={48} />
                </div>
                <h3>Drag & Drop Resume Here</h3>
                <p>or click to browse from local files (.pdf only)</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default UploadSection;
