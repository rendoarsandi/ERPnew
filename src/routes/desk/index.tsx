import { createFileRoute, Link } from "@tanstack/react-router";
import { getDashboardStats } from "../../server/desk";
import {
  TrendingUp,
  DollarSign,
  AlertCircle,
  Clock,
  Plus,
  ArrowUpRight,
  FileText,
  CreditCard,
  Users,
  Package
} from "lucide-react";

export const Route = createFileRoute("/desk/")({
  loader: async () => {
    return await getDashboardStats();
  },
  component: DashboardPage
});

function DashboardPage() {
  const { totalSales, totalPayments, unreconciledCount, recentActivity } = Route.useLoaderData();

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(val);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Desk Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time financial performance and operations overview.
          </p>
        </div>
        <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sales Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Sales</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-slate-950 dark:text-white">{formatCurrency(totalSales)}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Accumulated Sales Invoice amount</p>
          </div>
        </div>

        {/* Payments Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Payments Received</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-slate-950 dark:text-white">{formatCurrency(totalPayments)}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Total receive-type payment entries</p>
          </div>
        </div>

        {/* Unreconciled Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Unreconciled Bank Txns</span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${unreconciledCount > 0 ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400" : "bg-slate-50 dark:bg-slate-850 text-slate-400"}`}>
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <h3 className="text-3xl font-bold text-slate-950 dark:text-white">{unreconciledCount}</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Transactions pending match</p>
            </div>
            {unreconciledCount > 0 && (
              <Link
                to="/"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-0.5 group"
              >
                Reconcile Now
                <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-850 flex items-center gap-3">
            <Clock className="w-4 h-4 text-slate-400" />
            <h2 className="font-semibold text-slate-900 dark:text-white">Recent Activity</h2>
          </div>

          {recentActivity.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
              No recent activity. Try creating Sales Invoices or Payment Entries to see feed.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-850">
              {recentActivity.map((act) => (
                <div key={act.id} className="p-5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${act.type === "sales_invoice" ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400" : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"}`}>
                      {act.type === "sales_invoice" ? <FileText className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{act.title}</span>
                      <p className="text-sm font-medium text-slate-850 dark:text-slate-200 mt-0.5">{act.description}</p>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">{formatDate(act.date)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(act.amount)}
                    </span>
                    <Link
                      to="/desk/$doctype/$name"
                      params={{
                        doctype: act.type === "sales_invoice" ? "Sales Invoice" : "Payment Entry",
                        name: act.id
                      }}
                      className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm h-fit">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-3">
            <Link
              to="/desk/$doctype/$name"
              params={{ doctype: "Customer", name: "new" }}
              className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                <span>Create New Customer</span>
              </div>
              <Plus className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
            </Link>

            <Link
              to="/desk/$doctype/$name"
              params={{ doctype: "Item", name: "new" }}
              className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Package className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                <span>Create New Item</span>
              </div>
              <Plus className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
            </Link>

            <Link
              to="/desk/$doctype/$name"
              params={{ doctype: "Sales Invoice", name: "new" }}
              className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors group"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                <span>Create Sales Invoice</span>
              </div>
              <Plus className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
            </Link>

            <Link
              to="/desk/$doctype/$name"
              params={{ doctype: "Payment Entry", name: "new" }}
              className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors group"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                <span>Create Payment Entry</span>
              </div>
              <Plus className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
