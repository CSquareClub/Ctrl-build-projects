import React from "react";

const Loader = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-surface-container to-background">
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-outline-variant/20"></div>
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin"></div>
          </div>
        </div>
        <h3 className="text-xl font-semibold text-on-background mb-2">
          Analyzing Issue
        </h3>
        <p className="text-outline">
          Using AI to classify and find similar issues...
        </p>
      </div>
    </div>
  );
};

export default Loader;
