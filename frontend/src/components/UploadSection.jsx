import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Loader2 } from 'lucide-react';
import './UploadSection.css';

const UploadSection = ({ onUploadComplete }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
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

  const handleFile = (file) => {
    setIsUploading(true);
    // Simulate upload & analysis delay
    setTimeout(() => {
      setIsUploading(false);
      onUploadComplete(file);
    }, 2500);
  };

  return (
    <section className="upload-section" id="upload">
      <div className="upload-container">
        <h2 className="section-title">Initiate Analysis</h2>
        <p className="section-subtitle">Securely process resumes through our quantum-grade AI models</p>
        
        <div 
          className={`drop-zone premium-glass ${isDragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragEnter}
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
            accept=".pdf,.doc,.docx"
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
              <p>or click to browse from local files (.pdf, .docx)</p>
            </div>
          )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default UploadSection;
