import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { getList } from "../../../server/desk";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper
} from "@tanstack/react-table";
import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet
} from "lucide-react";

import CustomerSchema from "../../../doctypes/Customer.json";
import ItemSchema from "../../../doctypes/Item.json";
import SalesInvoiceSchema from "../../../doctypes/Sales_Invoice.json";
import PaymentEntrySchema from "../../../doctypes/Payment_Entry.json";
import BankTransactionSchema from "../../../doctypes/Bank_Transaction.json";

const SCHEMAS: Record<string, any> = {
  "Customer": CustomerSchema,
  "Item": ItemSchema,
  "Sales Invoice": SalesInvoiceSchema,
  "Payment Entry": PaymentEntrySchema,
  "Bank Transaction": BankTransactionSchema
};

interface ListSearchParams {
  search?: string;
  page?: number;
  limit?: number;
}

export const Route = createFileRoute("/desk/$doctype/")({
  validateSearch: (search: Record<string, unknown>): ListSearchParams => {
    return {
      search: typeof search.search === "string" ? search.search : undefined,
      page: typeof search.page === "number" ? search.page : Number(search.page) || 1,
      limit: typeof search.limit === "number" ? search.limit : Number(search.limit) || 10
    };
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) => {
    const doctype = params.doctype;
    const { search, page = 1, limit = 10 } = deps;
    const offset = (page - 1) * limit;

    const result = await getList({ data: { doctype, search, limit, offset } });
    return result;
  },
  component: DoctypeListPage
});

function DoctypeListPage() {
  const { doctype } = Route.useParams();
  const { search, page = 1, limit = 10 } = Route.useSearch();
  const { data: rows, total } = Route.useLoaderData();
  const navigate = useNavigate({ from: Route.fullPath });

  const [searchVal, setSearchVal] = useState(search || "");

  // Update input when query param changes
  useEffect(() => {
    setSearchVal(search || "");
  }, [search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({
      search: (prev) => ({
        ...prev,
        search: searchVal ? searchVal : undefined,
        page: 1
      })
    });
  };

  const changePage = (newPage: number) => {
    navigate({
      search: (prev) => ({
        ...prev,
        page: newPage
      })
    });
  };

  const schema = SCHEMAS[doctype];
  if (!schema) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-xl">
        DocType "{doctype}" not found or unsupported.
      </div>
    );
  }

  // Get display fields
  const fields = schema.fields || [];
  let listFields = fields.filter((f: any) => f.in_list_view === 1 && f.fieldname);
  if (listFields.length === 0) {
    // Fallback to first 4 text/number/date/select fields
    listFields = fields
      .filter(
        (f: any) =>
          f.fieldname &&
          !["Section Break", "Column Break", "Tab Break", "HTML", "Button", "Heading", "Table"].includes(f.fieldtype)
      )
      .slice(0, 4);
  }

  // Create columns dynamically
  const columnHelper = createColumnHelper<any>();
  const columns = [
    columnHelper.accessor("id", {
      header: "ID / Name",
      cell: (info) => (
        <Link
          to="/desk/$doctype/$name"
          params={{ doctype, name: info.getValue() }}
          className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline transition-colors block max-w-[200px] truncate"
        >
          {info.getValue()}
        </Link>
      )
    }),
    ...listFields.map((field: any) => {
      return columnHelper.accessor(field.fieldname, {
        header: field.label || field.fieldname,
        cell: (info) => {
          const val = info.getValue();
          if (val === null || val === undefined) return <span className="text-slate-400">-</span>;
          if (typeof val === "object") return <span className="text-slate-400 text-xs">JSON</span>;
          if (field.fieldtype === "Currency") {
            return (
              <span className="font-medium text-slate-900 dark:text-white">
                {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(val))}
              </span>
            );
          }
          if (field.fieldtype === "Check") {
            return (
              <span
                className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  val ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-slate-100 text-slate-650 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {val ? "Yes" : "No"}
              </span>
            );
          }
          if (field.fieldtype === "Date") {
            return (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {new Date(val).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            );
          }
          return <span className="text-slate-600 dark:text-slate-350">{String(val)}</span>;
        }
      });
    })
  ];

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  const totalPages = Math.ceil(total / limit);
  const startIdx = (page - 1) * limit + 1;
  const endIdx = Math.min(page * limit, total);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-slate-450 dark:text-slate-500" />
            <span>{doctype} List</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Found {total} records in database
          </p>
        </div>

        <Link
          to="/desk/$doctype/$name"
          params={{ doctype, name: "new" }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-sm font-semibold shadow-sm shadow-indigo-200 dark:shadow-none transition-colors w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New {doctype}</span>
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${doctype}...`}
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium rounded-xl text-sm transition-colors"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="bg-slate-50/70 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-550 text-[11px] font-bold uppercase tracking-wider"
                >
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-6 py-4">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    No records found. Click "New {doctype}" to create one.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors text-sm"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-4 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {total > 0 && (
          <div className="px-6 py-4 border-t border-slate-150 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50/20 dark:bg-slate-900/50">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{startIdx}</span> to{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-200">{endIdx}</span> of{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-200">{total}</span> records
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => changePage(page - 1)}
                disabled={page <= 1}
                className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold px-2">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => changePage(page + 1)}
                disabled={page >= totalPages}
                className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
