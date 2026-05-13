import { Sidebar } from "./components/Sidebar";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Amdox Branding Header */}
        <header className="flex h-16 shrink-0 items-center border-b border-slate-200 bg-white px-6 text-slate-900 shadow-sm z-10">
          <h1 className="text-lg font-bold tracking-wide">
            AMDOX <span className="text-[#ff5a00]">ERP</span> <span className="text-slate-400 font-normal ml-2">| Dashboard</span>
          </h1>
        </header>
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6 relative">
          {/* Subtle background glow */}
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-[#ff5a00] opacity-5 blur-[150px] pointer-events-none"></div>
          <div className="relative z-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}