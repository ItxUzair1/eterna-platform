import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { crmApi } from "../../services/crmService";
import { listUsers } from "../../services/userService";
import { ChevronDown, ChevronUp, Filter, MoreHorizontal, Plus, Search, Upload, User2, Download, X, Settings2 } from "lucide-react";
import { usePermission } from "../auth/usePermission";
import clsx from "clsx";

// Base columns that can't be removed
const baseColumns = [
  { key: "name", label: "Name", default: true, required: true },
  { key: "company", label: "Company", default: true, required: false },
  { key: "email", label: "Email", default: true, required: false },
  { key: "phone", label: "Phone", default: false, required: false },
  { key: "status", label: "Status", default: true, required: false },
  { key: "owner", label: "Owner", default: true, required: false },
  { key: "tags", label: "Tags", default: false, required: false },
  { key: "createdAt", label: "Created", default: false, required: false },
  { key: "updatedAt", label: "Updated", default: true, required: false },
];

export default function LeadTable({ onOpenDrawer, onOpenImport }) {
  const { allowed: canWrite } = usePermission("crm", "write");
  const [leads, setLeads] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [owners, setOwners] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ statusId: "", ownerId: "" });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState({ field: "updatedAt", dir: "desc" });
  const [visibleCols, setVisibleCols] = useState(() => {
    const def = {};
    baseColumns.forEach((c) => (def[c.key] = c.default));
    return def;
  });
  const [customColumns, setCustomColumns] = useState([]);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnKey, setNewColumnKey] = useState("");

  // Use refs to prevent infinite loops
  const fetchingRef = useRef(false);
  const abortControllerRef = useRef(null);

  const allColumns = useMemo(() => [...baseColumns, ...customColumns], [customColumns]);
  const columns = useMemo(() => allColumns.filter((c) => visibleCols[c.key]), [allColumns, visibleCols]);
  
  const addCustomColumn = () => {
    if (!newColumnName.trim() || !newColumnKey.trim()) return;
    const key = newColumnKey.trim().toLowerCase().replace(/\s+/g, '_');
    if (allColumns.find(c => c.key === key)) {
      alert("Column key already exists");
      return;
    }
    const newCol = { key, label: newColumnName.trim(), default: true, required: false, custom: true };
    setCustomColumns([...customColumns, newCol]);
    setVisibleCols({ ...visibleCols, [key]: true });
    setNewColumnName("");
    setNewColumnKey("");
  };
  
  const removeCustomColumn = (key) => {
    setCustomColumns(customColumns.filter(c => c.key !== key));
    const newVisible = { ...visibleCols };
    delete newVisible[key];
    setVisibleCols(newVisible);
  };

  const toggleSelect = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  // Debounce timer ref
  const debounceTimerRef = useRef(null);

  // Fetch data function - memoized with stable dependencies
  const fetchData = useCallback(async () => {
    // Prevent concurrent calls
    if (fetchingRef.current) {
      return;
    }

    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    fetchingRef.current = true;
    setLoading(true);

    // Create new AbortController
    abortControllerRef.current = new AbortController();

    try {
      const params = {
        q: query || undefined,
        statusId: filters.statusId || undefined,
        ownerId: filters.ownerId || undefined,
        page,
        pageSize,
        sort: `${sort.field}:${sort.dir}`,
      };
      
      const [{ data: listRes }, { data: statusRes }, users] = await Promise.all([
        crmApi.listLeads(params),
        crmApi.listStatuses(),
        listUsers().catch(() => [])
      ]);
      
      // Only update state if request wasn't aborted
      if (!abortControllerRef.current?.signal.aborted) {
        setLeads(listRes.items || []);
        setTotal(listRes.total || 0);
        setStatuses(statusRes.items || statusRes || []);
        setOwners(users || []);
      }
    } catch (error) {
      // Only log if not aborted
      if (error.name !== 'AbortError' && error.name !== 'CanceledError' && !error.message?.includes('aborted')) {
        console.error('Failed to fetch CRM data:', error);
      }
    } finally {
      fetchingRef.current = false;
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [query, filters.statusId, filters.ownerId, page, pageSize, sort.field, sort.dir]);

  // Single useEffect with debouncing for search, immediate for filters/pagination
  useEffect(() => {
    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Debounce search queries, immediate for filters/pagination
    const delay = query ? 300 : 0;
    
    debounceTimerRef.current = setTimeout(() => {
      fetchData();
    }, delay);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      fetchingRef.current = false;
    };
  }, [query, filters.statusId, filters.ownerId, page, sort.field, sort.dir, fetchData]);

  const onBulkDelete = async () => {
    if (!selected.size) return;
    await crmApi.deleteLeads(Array.from(selected));
    setSelected(new Set());
    fetchData().catch(console.error);
  };

  const onBulkAssign = async (ownerId) => {
    if (!selected.size || !ownerId) return;
    await crmApi.assignLeads(Array.from(selected), ownerId);
    setSelected(new Set());
    fetchData().catch(console.error);
  };

  const handleSort = (field) => {
    setSort((prev) => ({
      field,
      dir: prev.field === field && prev.dir === "asc" ? "desc" : "asc",
    }));
  };

  const handleExport = async (format) => {
    try {
      const leadsToExport = selected.size > 0 
        ? leads.filter((l) => selected.has(l.id))
        : leads;
      
      if (format === "csv") {
        const csv = exportToCSV(leadsToExport);
        downloadFile(csv, "leads.csv", "text/csv");
      } else if (format === "xlsx") {
        await exportToXLSX(leadsToExport);
      }
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Please try again.");
    }
  };

  const exportToCSV = (data) => {
    const headers = ["Name", "Company", "Email", "Phone", "Status", "Owner", "Tags", "Created", "Updated"];
    const rows = data.map((lead) => [
      lead.name || "",
      lead.company || "",
      lead.email || "",
      lead.phone || "",
      lead.status?.value || "",
      lead.owner?.username || lead.owner?.email || "",
      lead.tags || "",
      new Date(lead.createdAt).toLocaleString(),
      new Date(lead.updatedAt).toLocaleString(),
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    return "\uFEFF" + csvContent; // BOM for Excel UTF-8 support
  };

  const exportToXLSX = async (data) => {
    try {
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(
        data.map((lead) => ({
          Name: lead.name || "",
          Company: lead.company || "",
          Email: lead.email || "",
          Phone: lead.phone || "",
          Status: lead.status?.value || "",
          Owner: lead.owner?.username || lead.owner?.email || "",
          Tags: lead.tags || "",
          Created: new Date(lead.createdAt).toLocaleString(),
          Updated: new Date(lead.updatedAt).toLocaleString(),
        }))
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Leads");
      XLSX.writeFile(wb, "leads.xlsx");
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

  return (
    <div className="bg-white/80 backdrop-blur rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header with better responsive layout */}
      <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/50">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left: Search and Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 min-w-0">
            <div className="relative flex-shrink-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email, phone..."
                className="bg-white border border-slate-200 text-slate-900 pl-9 pr-3 py-2 rounded-lg outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 w-full sm:w-64"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={filters.statusId}
                onChange={(e) => setFilters((prev) => ({ ...prev, statusId: e.target.value }))}
                className="bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-lg outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 text-sm"
                title="Filter by status"
              >
                <option value="">All Statuses</option>
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.value}
                  </option>
                ))}
              </select>
              <select
                value={filters.ownerId}
                onChange={(e) => setFilters((prev) => ({ ...prev, ownerId: e.target.value }))}
                className="bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-lg outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 text-sm"
                title="Filter by owner"
              >
                <option value="">All Owners</option>
                {owners.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username || u.email}
                  </option>
                ))}
              </select>
              <ColumnPicker 
                visible={visibleCols} 
                setVisible={setVisibleCols}
                allColumns={allColumns}
                customColumns={customColumns}
                onRemoveCustom={removeCustomColumn}
                onShowManager={() => setShowColumnManager(true)}
              />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <ExportMenu onExport={handleExport} disabled={!leads.length} />
            {canWrite && (
              <>
                <button
                  onClick={() => onOpenImport()}
                  className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-3 py-2 rounded-lg transition shadow-sm hover:shadow text-sm whitespace-nowrap"
                >
                  <Upload className="w-4 h-4" /> Import
                </button>
                <button
                  onClick={() => onOpenDrawer({ mode: "create" })}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white shadow-sm hover:shadow transition bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-sm whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" /> New Lead
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {canWrite && (
                <th className="w-10 p-3">
                  <input
                    type="checkbox"
                    checked={selected.size && leads.every((l) => selected.has(l.id))}
                    onChange={(e) => {
                      if (e.target.checked) setSelected(new Set(leads.map((l) => l.id)));
                      else setSelected(new Set());
                    }}
                    aria-label="Select all"
                  />
                </th>
              )}
              {columns.map((c) => (
                <th 
                  key={c.key} 
                  className="text-left font-semibold p-3 cursor-pointer hover:bg-slate-100 select-none"
                  onClick={() => handleSort(c.key === "status" ? "statusId" : c.key === "owner" ? "ownerId" : c.key)}
                >
                  <div className="flex items-center gap-2">
                    {c.label}
                    {sort.field === (c.key === "status" ? "statusId" : c.key === "owner" ? "ownerId" : c.key) && (
                      sort.dir === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
              ))}
              <th className="w-10 p-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-6 text-center text-slate-500" colSpan={columns.length + 2}>
                  Loading…
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td className="p-8 text-center text-slate-500" colSpan={columns.length + 2}>
                  No leads found
                </td>
              </tr>
            ) : (
              leads.map((l, idx) => (
                  <tr key={l.id} className={clsx("border-t border-slate-200", idx % 2 === 0 ? "bg-white" : "bg-slate-50/50", "hover:bg-indigo-50/40")}>
                  {canWrite && (
                    <td className="p-3">
                      <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleSelect(l.id)} aria-label={`Select lead ${l.name}`} />
                    </td>
                  )}
              {columns.map((c) => (
                <td key={c.key} className="p-3 text-slate-800">
                  {renderCell(c.key, l, c)}
                </td>
              ))}
                  <td className="p-3">
                    {canWrite ? (
                      <button onClick={() => onOpenDrawer({ mode: "edit", leadId: l.id })} className="p-2 rounded hover:bg-slate-100" title="Open">
                        <MoreHorizontal className="w-4 h-4 text-slate-500" />
                      </button>
                    ) : (
                      <button onClick={() => onOpenDrawer({ mode: "view", leadId: l.id })} className="p-2 rounded hover:bg-slate-100" title="View">
                        <MoreHorizontal className="w-4 h-4 text-slate-500" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-t border-slate-200 bg-white">
        {canWrite && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              disabled={!selected.size}
              onClick={onBulkDelete}
              className={clsx(
                "px-3 py-2 rounded-lg transition text-sm",
                selected.size
                  ? "text-white bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 shadow-sm hover:shadow"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              )}
            >
              Delete
            </button>
            <AssignMenu onAssign={onBulkAssign} owners={owners} disabled={!selected.size} />
            <span className="text-slate-500 text-xs">Selected: {selected.size}</span>
          </div>
        )}
        <Pagination page={page} setPage={setPage} pageSize={pageSize} total={total} />
      </div>

      {/* Column Manager Modal */}
      {showColumnManager && (
        <ColumnManagerModal
          allColumns={allColumns}
          customColumns={customColumns}
          newColumnName={newColumnName}
          newColumnKey={newColumnKey}
          setNewColumnName={setNewColumnName}
          setNewColumnKey={setNewColumnKey}
          onAdd={addCustomColumn}
          onRemove={removeCustomColumn}
          onClose={() => setShowColumnManager(false)}
        />
      )}
    </div>
  );
}

function renderCell(key, l, column) {
  if (key === "status") {
    return l.status ? (
      <span className="inline-flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ background: l.status.color || "#7c3aed" }} />
        <span className="text-slate-700">{l.status.value}</span>
      </span>
    ) : (
      <span className="text-slate-400">—</span>
    );
  }
  if (key === "owner") {
    return l.owner ? (
      <span className="inline-flex items-center gap-2">
        <User2 className="w-4 h-4 text-slate-400" />
        <span className="text-slate-700">{l.owner.username || l.owner.email}</span>
      </span>
    ) : (
      <span className="text-slate-400">Unassigned</span>
    );
  }
  if (key === "updatedAt" || key === "createdAt") {
    return <span className="text-slate-600 text-xs">{new Date(l[key]).toLocaleDateString()}</span>;
  }
  if (key === "tags") {
    return l.tags ? (
      <span className="text-xs text-slate-600 max-w-xs truncate">{l.tags}</span>
    ) : (
      <span className="text-slate-400">—</span>
    );
  }
  // Custom columns - check if column exists in lead data
  if (column?.custom) {
    return l[key] || <span className="text-slate-400">—</span>;
  }
  return l[key] || <span className="text-slate-400">—</span>;
}

function ColumnPicker({ visible, setVisible, allColumns, customColumns, onRemoveCustom, onShowManager }) {
  const [open, setOpen] = useState(false);
  
  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-3 py-2 rounded-lg shadow-sm hover:shadow text-sm"
        >
          <Filter className="w-4 h-4" /> Columns <ChevronDown className="w-4 h-4" />
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-20 max-h-96 overflow-y-auto">
            <div className="space-y-1">
              {allColumns.map((c) => (
                <div key={c.key} className="flex items-center justify-between p-2 text-slate-700 hover:bg-slate-50 rounded-lg group">
                  <label className="flex items-center gap-2 flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!visible[c.key]}
                      disabled={c.required}
                      onChange={(e) => {
                        if (!c.required) {
                          setVisible((prev) => ({ ...prev, [c.key]: e.target.checked }));
                        }
                      }}
                    />
                    <span className={c.required ? "text-slate-500" : ""}>{c.label}</span>
                    {c.required && <span className="text-xs text-slate-400">(required)</span>}
                  </label>
                  {c.custom && (
                    <button
                      onClick={() => onRemoveCustom(c.key)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded text-red-600 transition"
                      title="Remove column"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="border-t border-slate-200 mt-2 pt-2">
              <button
                onClick={() => {
                  setOpen(false);
                  onShowManager();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg"
              >
                <Settings2 className="w-4 h-4" /> Manage Columns
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function AssignMenu({ onAssign, owners, disabled }) {
  const [open, setOpen] = useState(false);
  const [ownerId, setOwnerId] = useState("");
  return (
    <div className="relative">
      <button
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "px-3 py-2 rounded-lg transition inline-flex items-center gap-2",
          disabled
            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
            : "bg-white border border-slate-200 hover:border-slate-300 text-slate-700 shadow-sm hover:shadow"
        )}
      >
        Assign <ChevronDown className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-60 bg-white border border-slate-200 rounded-xl p-3 z-10 shadow-lg">
          <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className="w-full bg-white border border-slate-200 text-slate-900 p-2 rounded-lg focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300">
            <option value="">Select owner</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.username || o.email}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              onAssign(ownerId);
              setOpen(false);
            }}
            className="w-full mt-3 text-white px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-sm hover:shadow"
          >
            Assign
          </button>
        </div>
      )}
    </div>
  );
}

function ExportMenu({ onExport, disabled }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "px-3 py-2 rounded-lg transition inline-flex items-center gap-2",
          disabled
            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
            : "bg-white border border-slate-200 hover:border-slate-300 text-slate-700 shadow-sm hover:shadow"
        )}
      >
        <Download className="w-4 h-4" /> Export <ChevronDown className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl p-2 z-10 shadow-lg">
          <button
            onClick={() => {
              onExport("csv");
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            Export as CSV
          </button>
          <button
            onClick={() => {
              onExport("xlsx");
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            Export as XLSX
          </button>
        </div>
      )}
    </div>
  );
}

function ColumnManagerModal({ allColumns, customColumns, newColumnName, newColumnKey, setNewColumnName, setNewColumnKey, onAdd, onRemove, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="text-xl font-semibold">Manage Columns</h3>
          <button onClick={onClose} className="p-2 rounded hover:bg-slate-100">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Add Custom Column */}
          <div>
            <h4 className="font-semibold text-slate-800 mb-3">Add Custom Column</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Column Label</label>
                <input
                  type="text"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="e.g., Custom Field"
                  className="w-full bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-lg outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Column Key</label>
                <input
                  type="text"
                  value={newColumnKey}
                  onChange={(e) => setNewColumnKey(e.target.value)}
                  placeholder="e.g., custom_field"
                  className="w-full bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-lg outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
                />
                <p className="text-xs text-slate-500 mt-1">Lowercase, underscores (will be auto-formatted)</p>
              </div>
            </div>
            <button
              onClick={onAdd}
              disabled={!newColumnName.trim() || !newColumnKey.trim()}
              className="mt-3 px-4 py-2 rounded-lg text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 shadow-sm hover:shadow"
            >
              Add Column
            </button>
          </div>

          {/* Custom Columns List */}
          {customColumns.length > 0 && (
            <div>
              <h4 className="font-semibold text-slate-800 mb-3">Custom Columns</h4>
              <div className="space-y-2">
                {customColumns.map((col) => (
                  <div key={col.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <span className="font-medium text-slate-700">{col.label}</span>
                      <span className="text-xs text-slate-500 ml-2">({col.key})</span>
                    </div>
                    <button
                      onClick={() => onRemove(col.key)}
                      className="p-2 hover:bg-red-50 rounded text-red-600 transition"
                      title="Remove column"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Custom columns are stored locally and won't be saved to the database. 
              They will be available for display and export only. To persist data, add custom fields to the Lead model.
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function Pagination({ page, setPage, pageSize, total }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center gap-2 text-slate-700">
      <button onClick={() => setPage(1)} disabled={page === 1} className="px-2 py-1 rounded-lg bg-white border border-slate-200 disabled:opacity-50 text-sm">
        «
      </button>
      <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 rounded-lg bg-white border border-slate-200 disabled:opacity-50 text-sm">
        ‹
      </button>
      <span className="text-xs">Page {page} of {pages}</span>
      <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="px-2 py-1 rounded-lg bg-white border border-slate-200 disabled:opacity-50 text-sm">
        ›
      </button>
      <button onClick={() => setPage(pages)} disabled={page === pages} className="px-2 py-1 rounded-lg bg-white border border-slate-200 disabled:opacity-50 text-sm">
        »
      </button>
    </div>
  );
}
