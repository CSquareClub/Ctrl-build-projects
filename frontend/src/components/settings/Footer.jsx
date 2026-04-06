import React from "react";

const Footer = () => {
  return (
    <footer className="mt-20 border-t border-outline-variant/10 bg-surface-container-lowest p-6 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          <div className="w-2 h-2 rounded-full bg-tertiary"></div>
          <span className="text-[10px] font-label text-outline uppercase tracking-tighter">System Status: Operational</span>
        </div>
        <div className="h-4 w-[1px] bg-outline-variant/30"></div>
        <span className="text-[10px] font-label text-outline uppercase tracking-tighter">V4.2.0-STABLE</span>
      </div>
      <div className="flex gap-6">
        <a className="text-[10px] font-label text-outline uppercase tracking-tighter hover:text-primary transition-colors" href="#">API Docs</a>
        <a className="text-[10px] font-label text-outline uppercase tracking-tighter hover:text-primary transition-colors" href="#">Changelog</a>
      </div>
    </footer>
  );
};

export default Footer;