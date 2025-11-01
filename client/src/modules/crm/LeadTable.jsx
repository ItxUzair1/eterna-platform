import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { crmApi } from "../../services/crmService";
import { ChevronDown, Filter, MoreHorizontal, Plus, Search, Upload, User2 } from "lucide-react";
import clsx from "clsx";

const columnsAll = [
  { key: "name", label: "Name", default: true },
  { key: "company", label: "Company", default: true },
  { key: "email", label: "Email", default: true },
  { key: "phone", label: "Phone", default: false },
  { key: "status", label: "Status", default: true },
  { key: "owner", label: "Owner", default: true },
  { key: "updatedAt", label: "Updated", default: true },
];

export default function LeadTable({ onOpenDrawer, onOpenImport }) {
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
  const [visibleCols, setVisibleCols] = useState(() => {
    const def = {};
    columnsAll.forEach((c) => (def[c.key] = c.default));
    return def;
  });

  // Use refs to prevent infinite loops
  const fetchingRef = useRef(false);
  const abortControllerRef = useRef(null);

  const columns = useMemo(() => columnsAll.filter((c) => visibleCols[c.key]), [visibleCols]);

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
        sort: "updatedAt:desc",
      };
      
      const [{ data: listRes }, { data: statusRes }] = await Promise.all([
        crmApi.listLeads(params),
        crmApi.listStatuses()
      ]);
      
      // Only update state if request wasn't aborted
      if (!abortControllerRef.current?.signal.aborted) {
        setLeads(listRes.items || []);
        setTotal(listRes.total || 0);
        setStatuses(statusRes.items || statusRes || []);
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
  }, [query, filters.statusId, filters.ownerId, page, pageSize]);

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
  }, [query, filters.statusId, filters.ownerId, page, fetchData]);

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

  return (
    <div className="bg-white/80 backdrop-blur rounded-2xl border border-slate-200 shadow-sm">
      <div className="p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, phone"
              className="bg-white border border-slate-200 text-slate-900 pl-9 pr-3 py-2 rounded-lg outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 w-72"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filters.statusId}
              onChange={(e) => setFilters((prev) => ({ ...prev, statusId: e.target.value }))}
              className="bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-lg outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
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
              className="bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-lg outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
              title="Filter by owner"
            >
              <option value="">All Owners</option>
              {owners.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username || u.email}
                </option>
              ))}
            </select>
            <ColumnPicker visible={visibleCols} setVisible={setVisibleCols} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenImport()}
            className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-4 py-2 rounded-lg transition shadow-sm hover:shadow"
          >
            <Upload className="w-4 h-4" /> Import
          </button>
          <button
            onClick={() => onOpenDrawer({ mode: "create" })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white shadow-sm hover:shadow transition bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500"
          >
            <Plus className="w-4 h-4" /> New Lead
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
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
              {columns.map((c) => (
                <th key={c.key} className="text-left font-semibold p-3">
                  {c.label}
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
                  <td className="p-3">
                    <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleSelect(l.id)} aria-label={`Select lead ${l.name}`} />
                  </td>
                  {columns.map((c) => (
                    <td key={c.key} className="p-3 text-slate-800">
                      {renderCell(c.key, l)}
                    </td>
                  ))}
                  <td className="p-3">
                    <button onClick={() => onOpenDrawer({ mode: "edit", leadId: l.id })} className="p-2 rounded hover:bg-slate-100" title="Open">
                      <MoreHorizontal className="w-4 h-4 text-slate-500" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-t border-slate-200 bg-white rounded-b-2xl">
        <div className="flex items-center gap-2">
          <button
            disabled={!selected.size}
            onClick={onBulkDelete}
            className={clsx(
              "px-3 py-2 rounded-lg transition",
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
        <Pagination page={page} setPage={setPage} pageSize={pageSize} total={total} />
      </div>
    </div>
  );
}

function renderCell(key, l) {
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
  if (key === "updatedAt") return <span className="text-slate-600">{new Date(l.updatedAt).toLocaleString()}</span>;
  return l[key] || <span className="text-slate-400">—</span>;
}

function ColumnPicker({ visible, setVisible }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-3 py-2 rounded-lg shadow-sm hover:shadow"
      >
        <Filter className="w-4 h-4" /> Columns <ChevronDown className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-10">
          {columnsAll.map((c) => (
            <label key={c.key} className="flex items-center gap-2 p-2 text-slate-700 hover:bg-slate-50 rounded-lg">
              <input
                type="checkbox"
                checked={!!visible[c.key]}
                onChange={(e) => setVisible((prev) => ({ ...prev, [c.key]: e.target.checked }))}
              />
              {c.label}
            </label>
          ))}
        </div>
      )}
    </div>
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

function Pagination({ page, setPage, pageSize, total }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center gap-2 text-slate-700">
      <button onClick={() => setPage(1)} disabled={page === 1} className="px-2 py-1 rounded-lg bg-white border border-slate-200 disabled:opacity-50">
        «
      </button>
      <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 rounded-lg bg-white border border-slate-200 disabled:opacity-50">
        ‹
      </button>
      <span className="text-xs">Page {page} of {pages}</span>
      <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="px-2 py-1 rounded-lg bg-white border border-slate-200 disabled:opacity-50">
        ›
      </button>
      <button onClick={() => setPage(pages)} disabled={page === pages} className="px-2 py-1 rounded-lg bg-white border border-slate-200 disabled:opacity-50">
        »
      </button>
    </div>
  );
}
