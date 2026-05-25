import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  CreditCard,
  Coins,
  ArrowLeftRight,
  ChevronRight,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/desk")({
  component: DeskLayout,
});

const DOC_TYPES = [
  { name: "Customer", icon: Users, label: "Customer" },
  { name: "Item", icon: Package, label: "Item" },
  { name: "Sales Invoice", icon: FileText, label: "Sales Invoice" },
  { name: "Payment Entry", icon: CreditCard, label: "Payment Entry" },
  { name: "Bank Transaction", icon: Coins, label: "Bank Transaction" }
];

function DeskLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50/50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 sticky top-0 h-screen overflow-y-auto">
        <div className="p-6 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between">
          <Link to="/desk" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-lg shadow-sm shadow-indigo-200 dark:shadow-none">
              E
            </div>
            <div>
              <span className="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">ERPNext Desk</span>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium tracking-wider uppercase">Enterprise Suite</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-7">
          <div className="space-y-1">
            <p className="px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase">Overview</p>
            <Link
              to="/desk"
              activeProps={{ className: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-medium" }}
              inactiveProps={{ className: "text-slate-600 dark:text-slate-400 hover:bg-slate-55 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white" }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm group"
            >
              <LayoutDashboard className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400" />
              Dashboard
            </Link>
          </div>

          <div className="space-y-1.5">
            <p className="px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase">DocTypes</p>
            {DOC_TYPES.map((dt) => {
              const Icon = dt.icon;
              return (
                <Link
                  key={dt.name}
                  to="/desk/$doctype"
                  params={{ doctype: dt.name }}
                  activeProps={{ className: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold" }}
                  inactiveProps={{ className: "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white" }}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg transition-all text-sm group"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400" />
                    <span>{dt.label}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-slate-400" />
                </Link>
              );
            })}
          </div>

          <div className="space-y-1 border-t border-slate-100 dark:border-slate-800 pt-6">
            <Link
              to="/"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-slate-900 dark:hover:text-white transition-all text-sm group"
            >
              <ArrowLeftRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 dark:group-hover:text-emerald-400" />
              Bank Reconciliation
            </Link>
          </div>
        </nav>
      </aside>

      {/* Mobile Nav overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-slate-900/40 backdrop-blur-sm">
          <aside className="w-72 bg-white dark:bg-slate-900 p-6 flex flex-col h-full shadow-2xl relative animate-in slide-in-from-left duration-250">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-5 right-5 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-8 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                E
              </div>
              <span className="font-semibold text-slate-900 dark:text-white">ERPNext Desk</span>
            </div>

            <nav className="flex-1 space-y-6">
              <div className="space-y-1">
                <p className="px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase">Overview</p>
                <Link
                  to="/desk"
                  onClick={() => setMobileOpen(false)}
                  activeProps={{ className: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-medium" }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
              </div>

              <div className="space-y-1.5">
                <p className="px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase">DocTypes</p>
                {DOC_TYPES.map((dt) => {
                  const Icon = dt.icon;
                  return (
                    <Link
                      key={dt.name}
                      to="/desk/$doctype"
                      params={{ doctype: dt.name }}
                      onClick={() => setMobileOpen(false)}
                      activeProps={{ className: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold" }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm"
                    >
                      <Icon className="w-4 h-4" />
                      <span>{dt.label}</span>
                    </Link>
                  );
                })}
              </div>

              <div className="space-y-1 border-t border-slate-100 dark:border-slate-800 pt-6">
                <Link
                  to="/"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-600 dark:text-slate-400"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  Bank Reconciliation
                </Link>
              </div>
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-850 px-6 md:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-slate-400 dark:text-slate-500 font-medium text-sm hidden md:flex items-center gap-2">
              <span>System</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-600 dark:text-slate-300">Desk</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick status bar */}
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs text-slate-500 font-medium">System Online</span>
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 p-6 md:p-8 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
