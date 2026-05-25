import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { getDoc, saveDoc } from "../../../server/desk";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Loader2,
  Calendar,
  Layers,
  Sparkles
} from "lucide-react";

import CustomerSchema from "../../../doctypes/Customer.json";
import ItemSchema from "../../../doctypes/Item.json";
import SalesInvoiceSchema from "../../../doctypes/Sales_Invoice.json";
import PaymentEntrySchema from "../../../doctypes/Payment_Entry.json";
import BankTransactionSchema from "../../../doctypes/Bank_Transaction.json";
import SalesInvoiceItemSchema from "../../../doctypes/Sales_Invoice_Item.json";
import PaymentEntryReferenceSchema from "../../../doctypes/Payment_Entry_Reference.json";

const SCHEMAS: Record<string, any> = {
  "Customer": CustomerSchema,
  "Item": ItemSchema,
  "Sales Invoice": SalesInvoiceSchema,
  "Payment Entry": PaymentEntrySchema,
  "Bank Transaction": BankTransactionSchema,
  "Sales Invoice Item": SalesInvoiceItemSchema,
  "Payment Entry Reference": PaymentEntryReferenceSchema
};

export const Route = createFileRoute("/desk/$doctype/$name")({
  loader: async ({ params }) => {
    const { doctype, name } = params;
    if (name === "new") {
      return { id: "" };
    }
    try {
      return await getDoc({ data: { doctype, name } });
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  },
  component: DoctypeFormPage
});

// Helper component for select fields
function LinkFieldSelector({
  doctype,
  value,
  onChange,
  disabled
}: {
  doctype: string;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}) {
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!doctype) return;
    setLoading(true);

    // Call dynamic list with a high limit to get all options
    // Using import for getList to avoid circular or environment dependency issues
    import("../../../server/desk").then(({ getList }) => {
      getList({ data: { doctype, limit: 100 } })
        .then((res) => {
          setOptions(res.data.map((row: any) => row.id));
        })
        .catch((err) => {
          console.error(`Error loading link options for ${doctype}:`, err);
        })
        .finally(() => {
          setLoading(false);
        });
    });
  }, [doctype]);

  return (
    <select
      disabled={disabled || loading}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3.5 py-2 border border-slate-250 dark:border-slate-850 bg-white dark:bg-slate-950 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-60"
    >
      <option value="">{loading ? "Loading options..." : `Select ${doctype}...`}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

// Child Table Editable Grid
function ChildEditableGrid({
  doctype,
  value = [],
  onChange,
  disabled
}: {
  doctype: string;
  value: any[];
  onChange: (val: any[]) => void;
  disabled?: boolean;
}) {
  const schema = SCHEMAS[doctype];
  if (!schema) {
    return <div className="text-red-500 text-xs">Schema for child DocType "{doctype}" not found.</div>;
  }

  // Get first 5 data-carrying fields
  const fields = (schema.fields || [])
    .filter(
      (f: any) =>
        f.fieldname &&
        !["Section Break", "Column Break", "Tab Break", "HTML", "Button", "Heading", "Table"].includes(f.fieldtype)
    )
    .slice(0, 5);

  const handleRowChange = (index: number, fieldname: string, val: any) => {
    const newRows = [...value];
    newRows[index] = { ...newRows[index], [fieldname]: val };

    // Auto calculate Sales Invoice Item amount
    if (doctype === "Sales Invoice Item") {
      if (fieldname === "qty" || fieldname === "rate") {
        const qty = parseFloat(newRows[index].qty) || 0;
        const rate = parseFloat(newRows[index].rate) || 0;
        newRows[index].amount = qty * rate;
      }
    }

    onChange(newRows);
  };

  const addRow = () => {
    const newRow: any = {};
    for (const f of fields) {
      if (f.default !== undefined) {
        newRow[f.fieldname] = f.default;
      }
    }
    onChange([...value, newRow]);
  };

  const deleteRow = (index: number) => {
    const newRows = value.filter((_, i) => i !== index);
    onChange(newRows);
  };

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden mt-3">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-850 text-slate-550 dark:text-slate-400 font-bold border-b border-slate-250 dark:border-slate-800 uppercase tracking-wider text-[10px]">
              {fields.map((f: any) => (
                <th key={f.fieldname} className="px-4 py-3 font-semibold">
                  {f.label || f.fieldname}
                </th>
              ))}
              {!disabled && <th className="px-4 py-3 w-16 text-center">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
            {value.length === 0 ? (
              <tr>
                <td colSpan={fields.length + (disabled ? 0 : 1)} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                  No records. Click "Add Row" to add entries.
                </td>
              </tr>
            ) : (
              value.map((row, index) => (
                <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                  {fields.map((f: any) => {
                    const val = row[f.fieldname] ?? "";
                    return (
                      <td key={f.fieldname} className="px-3 py-2.5">
                        {f.fieldtype === "Check" ? (
                          <input
                            type="checkbox"
                            disabled={disabled}
                            checked={!!val}
                            onChange={(e) => handleRowChange(index, f.fieldname, e.target.checked)}
                            className="w-4 h-4 text-indigo-600 border-slate-350 dark:border-slate-700 rounded"
                          />
                        ) : f.fieldtype === "Select" ? (
                          <select
                            disabled={disabled}
                            value={val}
                            onChange={(e) => handleRowChange(index, f.fieldname, e.target.value)}
                            className="w-full px-2 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                          >
                            <option value="">Select...</option>
                            {(f.options || "").split("\n").map((opt: string) => {
                              const o = opt.trim();
                              return o ? (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ) : null;
                            })}
                          </select>
                        ) : f.fieldtype === "Link" ? (
                          <LinkFieldSelector
                            doctype={f.options}
                            disabled={disabled}
                            value={val}
                            onChange={(v) => handleRowChange(index, f.fieldname, v)}
                          />
                        ) : (
                          <input
                            type={["Int", "Float", "Currency", "Percent"].includes(f.fieldtype) ? "number" : "text"}
                            disabled={disabled}
                            value={val}
                            onChange={(e) => handleRowChange(index, f.fieldname, e.target.value)}
                            className="w-full px-2 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                          />
                        )}
                      </td>
                    );
                  })}
                  {!disabled && (
                    <td className="px-3 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => deleteRow(index)}
                        className="text-red-500 hover:text-red-750 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 px-2 py-1 rounded-md text-xs font-semibold transition-all"
                      >
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {!disabled && (
        <div className="p-3 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-150 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={addRow}
            className="px-3.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            + Add Line
          </button>
        </div>
      )}
    </div>
  );
}

// Layout interfaces
interface LayoutField {
  fieldname: string;
  label?: string;
  fieldtype: string;
  options?: string;
  reqd?: number;
  read_only?: number;
  description?: string;
}
interface LayoutColumn {
  fields: LayoutField[];
}
interface LayoutSection {
  label?: string;
  columns: LayoutColumn[];
}
interface LayoutTab {
  label: string;
  sections: LayoutSection[];
}

// Layout parser
function parseLayout(fields: any[]): LayoutTab[] {
  const tabs: LayoutTab[] = [];
  let currentTab: LayoutTab = { label: "Details", sections: [] };
  let currentSection: LayoutSection = { columns: [] };
  let currentColumn: LayoutColumn = { fields: [] };

  for (const field of fields) {
    if (field.fieldtype === "Tab Break") {
      if (currentColumn.fields.length > 0) {
        currentSection.columns.push(currentColumn);
        currentColumn = { fields: [] };
      }
      if (currentSection.columns.length > 0) {
        currentTab.sections.push(currentSection);
        currentSection = { label: field.label, columns: [] };
      }
      if (currentTab.sections.length > 0 || currentTab.label !== "Details") {
        tabs.push(currentTab);
      }
      currentTab = { label: field.label || "Details", sections: [] };
    } else if (field.fieldtype === "Section Break") {
      if (currentColumn.fields.length > 0) {
        currentSection.columns.push(currentColumn);
        currentColumn = { fields: [] };
      }
      if (currentSection.columns.length > 0) {
        currentTab.sections.push(currentSection);
      }
      currentSection = { label: field.label, columns: [] };
    } else if (field.fieldtype === "Column Break") {
      if (currentColumn.fields.length > 0) {
        currentSection.columns.push(currentColumn);
      }
      currentColumn = { fields: [] };
    } else {
      if (field.fieldname) {
        currentColumn.fields.push(field);
      }
    }
  }

  // Flush remaining
  if (currentColumn.fields.length > 0) {
    currentSection.columns.push(currentColumn);
  }
  if (currentSection.columns.length > 0) {
    currentTab.sections.push(currentSection);
  }
  if (currentTab.sections.length > 0) {
    tabs.push(currentTab);
  }

  if (tabs.length === 0) {
    tabs.push({ label: "Details", sections: [] });
  }

  return tabs;
}

function DoctypeFormPage() {
  const { doctype, name } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const navigate = useNavigate();

  const isNew = name === "new";
  const schema = SCHEMAS[doctype];

  const [doc, setDoc] = useState<any>(loaderData || {});
  const [saving, setSaving] = useState(false);
  const [activeTabIdx, setActiveTabIdx] = useState(0);

  // Synchronize when loader data changes (e.g. going from new to saved)
  useEffect(() => {
    setDoc(loaderData || {});
  }, [loaderData]);

  if (!schema) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-xl">
        DocType "{doctype}" not found or unsupported.
      </div>
    );
  }

  const parsedTabs = parseLayout(schema.fields || []);

  const handleFieldChange = (fieldname: string, val: any) => {
    const updated = { ...doc, [fieldname]: val };

    // Auto-calculate grand_total for Sales Invoice
    if (doctype === "Sales Invoice" && fieldname === "items") {
      const items = Array.isArray(val) ? val : [];
      const total = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      updated.grand_total = total;
      updated.base_grand_total = total;
    }

    setDoc(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check required fields
    for (const f of schema.fields || []) {
      if (f.reqd === 1 && f.fieldname) {
        const val = doc[f.fieldname];
        if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
          toast.error(`"${f.label || f.fieldname}" is a required field.`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const result = await saveDoc({ data: { doctype, name, doc } });
      toast.success(`${doctype} saved successfully!`);
      if (isNew) {
        // Navigate to the newly created document
        navigate({
          to: "/desk/$doctype/$name",
          params: { doctype, name: result.id }
        });
      } else {
        // Refresh/invalidate router to get updated database view
        navigate({
          to: "/desk/$doctype/$name",
          params: { doctype, name }
        });
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to save document.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Top sticky form bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-205 dark:border-slate-850 pb-5 sticky top-16 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <Link
            to="/desk/$doctype"
            params={{ doctype }}
            className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-500 hover:text-slate-900 transition-all bg-white dark:bg-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <span>{isNew ? `New ${doctype}` : `${doctype}`}</span>
              {!isNew && <span className="text-sm font-normal text-slate-500">/ {name}</span>}
            </h1>
            <p className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 tracking-wide uppercase mt-0.5">
              DocType Schema View
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <Link
            to="/desk/$doctype"
            params={{ doctype }}
            className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-sm transition-colors bg-white dark:bg-slate-900 text-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-sm font-semibold shadow-sm shadow-indigo-200 dark:shadow-none transition-colors disabled:opacity-50 min-w-[100px]"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Custom ID for New Doc */}
      {isNew && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="max-w-md">
            <label className="block text-sm font-semibold text-slate-850 dark:text-slate-250 mb-1">
              Document ID / Name
            </label>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
              Specify a custom ID for this {doctype} record. If left blank, a unique name will be generated.
            </p>
            <input
              type="text"
              placeholder="e.g. acme-corp or item-001"
              value={doc.id || ""}
              onChange={(e) => handleFieldChange("id", e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-250 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="hidden md:flex items-center gap-2 bg-indigo-50/40 dark:bg-indigo-950/20 px-4 py-3 rounded-xl border border-indigo-100/30 text-xs text-slate-600 dark:text-slate-400 max-w-sm">
            <Sparkles className="w-4 h-4 text-indigo-500 flex-shrink-0" />
            <span>ERPNext standard uses unique names for records to prevent duplicates in link relations.</span>
          </div>
        </div>
      )}

      {/* Tabs Layout Selector */}
      {parsedTabs.length > 1 && (
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
          {parsedTabs.map((tab, idx) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => setActiveTabIdx(idx)}
              className={`pb-3 text-sm font-semibold transition-all border-b-2 px-1 ${
                activeTabIdx === idx
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Active Tab Contents */}
      {parsedTabs.length > 0 && (
        <div className="space-y-8">
          {parsedTabs[activeTabIdx].sections.map((section, sIdx) => (
            <div
              key={sIdx}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden"
            >
              {section.label && (
                <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-850 border-b border-slate-150 dark:border-slate-800 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-slate-400" />
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                    {section.label}
                  </h3>
                </div>
              )}

              <div className="p-6">
                <div className={`grid grid-cols-1 md:grid-cols-${Math.max(1, section.columns.length)} gap-6`}>
                  {section.columns.map((column, cIdx) => (
                    <div key={cIdx} className="space-y-5">
                      {column.fields.map((field) => {
                        const val = doc[field.fieldname];
                        const isRequired = field.reqd === 1;
                        const isReadOnly = field.read_only === 1 || field.fieldname === "id";

                        return (
                          <div key={field.fieldname} className="flex flex-col">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5 flex items-center gap-1">
                              <span>{field.label || field.fieldname}</span>
                              {isRequired && <span className="text-red-500">*</span>}
                            </label>

                            {/* Render fields based on type */}
                            {field.fieldtype === "Check" ? (
                              <div className="flex items-center h-10">
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    disabled={isReadOnly}
                                    checked={!!val}
                                    onChange={(e) => handleFieldChange(field.fieldname, e.target.checked)}
                                    className="sr-only peer"
                                  />
                                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-850 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:height-4 after:w-4 after:transition-all dark:border-slate-800 peer-checked:bg-indigo-650"></div>
                                  <span className="ml-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                                    {val ? "Enabled" : "Disabled"}
                                  </span>
                                </label>
                              </div>
                            ) : field.fieldtype === "Select" ? (
                              <select
                                disabled={isReadOnly}
                                value={val || ""}
                                onChange={(e) => handleFieldChange(field.fieldname, e.target.value)}
                                className="w-full px-3.5 py-2 border border-slate-250 dark:border-slate-850 bg-white dark:bg-slate-950 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-60"
                              >
                                <option value="">Select Option...</option>
                                {(field.options || "").split("\n").map((opt: string) => {
                                  const o = opt.trim();
                                  return o ? (
                                    <option key={o} value={o}>
                                      {o}
                                    </option>
                                  ) : null;
                                })}
                              </select>
                            ) : field.fieldtype === "Link" ? (
                              <LinkFieldSelector
                                doctype={field.options || ""}
                                disabled={isReadOnly}
                                value={val}
                                onChange={(v) => handleFieldChange(field.fieldname, v)}
                              />
                            ) : field.fieldtype === "Table" ? (
                              <ChildEditableGrid
                                doctype={field.options || ""}
                                disabled={isReadOnly}
                                value={val}
                                onChange={(v) => handleFieldChange(field.fieldname, v)}
                              />
                            ) : ["Small Text", "Text", "Long Text"].includes(field.fieldtype) ? (
                              <textarea
                                disabled={isReadOnly}
                                rows={3}
                                value={val || ""}
                                onChange={(e) => handleFieldChange(field.fieldname, e.target.value)}
                                className="w-full px-3.5 py-2 border border-slate-250 dark:border-slate-850 bg-white dark:bg-slate-950 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-60"
                              />
                            ) : (
                              <div className="relative">
                                <input
                                  type={
                                    ["Int", "Float", "Currency", "Percent"].includes(field.fieldtype)
                                      ? "number"
                                      : field.fieldtype === "Date"
                                        ? "date"
                                        : "text"
                                  }
                                  disabled={isReadOnly}
                                  step="any"
                                  value={val || ""}
                                  onChange={(e) => handleFieldChange(field.fieldname, e.target.value)}
                                  className="w-full px-3.5 py-2 border border-slate-250 dark:border-slate-850 bg-white dark:bg-slate-950 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-60"
                                />
                                {field.fieldtype === "Date" && (
                                  <Calendar className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none hidden" />
                                )}
                              </div>
                            )}

                            {field.description && (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 font-medium leading-relaxed">
                                {field.description}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </form>
  );
}
