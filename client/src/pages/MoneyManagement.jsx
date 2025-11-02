import { useState, useEffect, useMemo } from "react";
import { moneyApi } from "../services/moneyService";
import { Plus, Download, Filter, X, Upload, FileText, Calendar, DollarSign, ChevronDown } from "lucide-react";
import { usePermission } from "../modules/auth/usePermission";
import TransactionForm from "../modules/money/TransactionForm";
import MoneyCharts from "../modules/money/MoneyCharts";

function ExportDropdown({ onExport }) {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-slate-300 text-sm font-medium"
      >
        <Download className="w-4 h-4" />
        Export
        <ChevronDown className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-20">
            <button
              onClick={() => {
                onExport("csv");
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Export CSV
            </button>
            <button
              onClick={() => {
                onExport("xlsx");
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 border-t border-slate-200"
            >
              Export XLSX
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const PAYMENT_METHODS = ["Cash", "Card", "Bank Transfer", "Crypto", "Other"];
const TRANSACTION_TYPES = ["Revenue", "Expense"];
const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "INR", "Other"];

export default function MoneyManagement() {
  const { allowed: canWrite } = usePermission("money", "write");
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    q: "",
    type: "",
    category: "",
    paymentMethod: "",
    startDate: "",
    endDate: "",
  });
  
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  // Extract unique categories from transactions
  const categories = useMemo(() => {
    const cats = new Set();
    transactions.forEach(t => {
      if (t.category) cats.add(t.category);
    });
    return Array.from(cats).sort();
  }, [transactions]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        pageSize,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)),
      };
      const { data } = await moneyApi.listTransactions(params);
      setTransactions(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([k, v]) => v && ["type", "category", "paymentMethod", "startDate", "endDate"].includes(k))
      );
      const { data } = await moneyApi.getStats(params);
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, filters]);

  useEffect(() => {
    fetchStats();
  }, [filters]);

  const handleSave = () => {
    setFormOpen(false);
    setEditingId(null);
    fetchData();
    fetchStats();
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    try {
      await moneyApi.deleteTransaction(id);
      fetchData();
      fetchStats();
    } catch (error) {
      alert("Failed to delete transaction");
    }
  };

  const handleExport = async (format) => {
    try {
      const params = {
        format,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)),
      };
      const { data } = await moneyApi.exportTransactions(params);
      
      if (format === "csv") {
        const csv = exportToCSV(data.data);
        downloadFile(csv, `transactions_${new Date().toISOString().split("T")[0]}.csv`, "text/csv");
      } else if (format === "xlsx") {
        await exportToXLSX(data.data);
      }
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed");
    }
  };

  const exportToCSV = (data) => {
    if (!data || !data.length) return "";
    const headers = Object.keys(data[0]);
    const rows = data.map(row => 
      headers.map(h => {
        const val = row[h];
        return `"${String(val || "").replace(/"/g, '""')}"`;
      }).join(",")
    );
    return [headers.join(","), ...rows].join("\n");
  };

  const exportToXLSX = async (data) => {
    try {
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Transactions");
      XLSX.writeFile(wb, `transactions_${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch (err) {
      console.error("XLSX export error:", err);
      throw err;
    }
  };

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setFilters({
      q: "",
      type: "",
      category: "",
      paymentMethod: "",
      startDate: "",
      endDate: "",
    });
    setPage(1);
  };

  const hasFilters = Object.values(filters).some(v => v);

  // Calculate running balance
  let runningBalance = 0;
  const transactionsWithBalance = transactions.map(t => {
    const amount = Number(t.amount);
    if (t.type === "Revenue") {
      runningBalance += amount;
    } else {
      runningBalance -= amount;
    }
    return { ...t, runningBalance };
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-indigo-600" />
              Money Management
            </h1>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setFiltersOpen(!filtersOpen)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                    hasFilters
                      ? "bg-indigo-100 text-indigo-700 border border-indigo-300"
                      : "bg-white border border-slate-200 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  {hasFilters && (
                    <span className="ml-1 px-1.5 py-0.5 bg-indigo-600 text-white text-xs rounded-full">
                      {Object.values(filters).filter(v => v).length}
                    </span>
                  )}
                </button>
              </div>
              <ExportDropdown onExport={handleExport} />
              {canWrite && (
                <button
                  onClick={() => {
                    setEditingId(null);
                    setFormOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-sm font-medium shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  New Transaction
                </button>
              )}
            </div>
          </div>
          <p className="text-slate-600">Track your revenue and expenses in real-time</p>
        </div>

        {/* Filters Panel */}
        {filtersOpen && (
          <div className="mb-6 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Filters</h3>
              <button
                onClick={clearFilters}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                Clear All
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Search</label>
                <input
                  type="text"
                  value={filters.q}
                  onChange={(e) => setFilters({ ...filters, q: e.target.value, page: 1 })}
                  placeholder="Invoice, description..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Types</option>
                  {TRANSACTION_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                <input
                  type="text"
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value, page: 1 })}
                  placeholder="Category..."
                  list="categories-list"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <datalist id="categories-list">
                  {categories.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Payment Method</label>
                <select
                  value={filters.paymentMethod}
                  onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value, page: 1 })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Methods</option>
                  {PAYMENT_METHODS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value, page: 1 })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value, page: 1 })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Charts */}
        {stats && <MoneyCharts stats={stats} />}

        {/* Transactions Table */}
        <div className="bg-white/80 backdrop-blur rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left font-semibold p-3">Invoice No</th>
                  <th className="text-left font-semibold p-3">Date</th>
                  <th className="text-left font-semibold p-3">Type</th>
                  <th className="text-left font-semibold p-3">Category</th>
                  <th className="text-left font-semibold p-3">Description</th>
                  <th className="text-right font-semibold p-3">Amount</th>
                  <th className="text-left font-semibold p-3">Currency</th>
                  <th className="text-left font-semibold p-3">Payment Method</th>
                  <th className="text-right font-semibold p-3">Running Balance</th>
                  <th className="text-left font-semibold p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="10" className="p-8 text-center text-slate-500">
                      Loading...
                    </td>
                  </tr>
                ) : transactionsWithBalance.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="p-8 text-center text-slate-500">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  transactionsWithBalance.map((t) => (
                    <tr key={t.id} className="border-t border-slate-200 hover:bg-slate-50/50">
                      <td className="p-3 text-slate-800 font-medium">{t.invoiceNo}</td>
                      <td className="p-3 text-slate-600">
                        {new Date(t.date).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          t.type === "Revenue"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700">{t.category}</td>
                      <td className="p-3 text-slate-600 max-w-xs truncate" title={t.description}>
                        {t.description || "—"}
                      </td>
                      <td className="p-3 text-right font-medium text-slate-900">
                        {Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-slate-600">{t.currency}</td>
                      <td className="p-3 text-slate-600">{t.paymentMethod}</td>
                      <td className={`p-3 text-right font-medium ${
                        t.runningBalance >= 0 ? "text-green-700" : "text-red-700"
                      }`}>
                        {t.runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3">
                        {canWrite ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingId(t.id);
                                setFormOpen(true);
                              }}
                              className="px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(t.id)}
                              className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                            >
                              Delete
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">View only</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > pageSize && (
            <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-white">
              <div className="text-sm text-slate-600">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-600">
                  Page {page} of {Math.ceil(total / pageSize)}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(Math.ceil(total / pageSize), p + 1))}
                  disabled={page >= Math.ceil(total / pageSize)}
                  className="px-3 py-1 text-sm border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Transaction Form Modal */}
        {formOpen && (
          <TransactionForm
            transactionId={editingId}
            onClose={() => {
              setFormOpen(false);
              setEditingId(null);
            }}
            onSaved={handleSave}
            categories={categories}
          />
        )}
      </div>
    </div>
  );
}

