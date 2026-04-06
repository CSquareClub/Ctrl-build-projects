export default function SideNavbar() {

  return (

    <aside className="fixed left-0 top-14 h-[calc(100vh-56px)] w-60 bg-[#181c22] flex flex-col py-4 gap-2">

      <div className="px-6 py-2 mb-4">

        <h3 className="text-[10px] uppercase text-slate-500">
          Navigation
        </h3>

        <p className="text-xs text-slate-400">
          Management
        </p>

      </div>

      <div className="flex flex-col gap-1">

        <a className="flex items-center gap-3 px-6 py-2 text-slate-400 hover:bg-[#262a31]">
          Dashboard
        </a>

        <a className="flex items-center gap-3 px-6 py-2 text-slate-400 hover:bg-[#262a31]">
          Issues
        </a>

        <a className="flex items-center gap-3 px-6 py-2 text-blue-400 border-l-2 border-blue-400 bg-blue-400/5">
          Settings
        </a>

      </div>

    </aside>

  );

}