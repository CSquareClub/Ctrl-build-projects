export default function TopNavbar() {

  return (

    <header className="fixed top-0 w-full h-14 z-50 bg-[#181c22] flex justify-between items-center px-6">

      <div className="flex items-center gap-8">

        <span className="text-xl font-mono font-bold text-slate-100">
          OpenIssue
        </span>

        <nav className="hidden md:flex items-center gap-6">

          <a className="text-sm uppercase tracking-widest text-slate-400 hover:text-blue-300">
            Home
          </a>

          <a className="text-sm uppercase tracking-widest text-slate-400 hover:text-blue-300">
            Triage
          </a>

          <a className="text-sm uppercase tracking-widest text-slate-400 hover:text-blue-300">
            Dashboard
          </a>

          <a className="text-sm uppercase tracking-widest text-slate-400 hover:text-blue-300">
            Docs
          </a>

        </nav>

      </div>

      <div className="flex items-center gap-4">

        <button className="bg-primary-container px-4 py-1.5 text-xs uppercase rounded-lg font-bold">
          Connect GitHub
        </button>

      </div>

    </header>

  );

}