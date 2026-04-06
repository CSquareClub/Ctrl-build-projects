import React from "react";

const Loader = ({ text = 'Analyzing Issue', subtext = 'Using AI to classify and find similar issues...', inline = false }) => {
  if (inline) {
    return (
      <span className="flex items-center gap-2">
        <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin inline-block"></span>
        <span>{text}</span>
      </span>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-surface-container to-background">
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-outline-variant/20"></div>
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin"></div>
          </div>
        </div>
        <h3 className="text-xl font-semibold text-on-background mb-2">{text}</h3>
        <p className="text-outline">{subtext}</p>
      </div>
    </div>
  );
};

export default Loader;
