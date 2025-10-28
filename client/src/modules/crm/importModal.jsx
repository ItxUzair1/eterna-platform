import { useState } from "react";
import { crmApi } from "../../services/crmService";

export default function ImportModal({ open, onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [mapping, setMapping] = useState({ name: "Name", email: "Email", phone: "Phone", company: "Company", status: "Status", tags: "Tags" });
  const uploading = false;

  const submit = async () => {
    if (!file) return;
    await crmApi.importCsv(file, mapping);
    onDone?.();
    onClose();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-xl">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold">Import leads (CSV)</h3>
          <button onClick={onClose} className="p-2 rounded hover:bg-slate-100">✕</button>
        </div>
        <div className="p-4 space-y-4">
          <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} className="block w-full text-sm text-slate-700" />
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(mapping).map(([field, header]) => (
              <label key={field} className="block">
                <div className="text-xs text-slate-500 mb-1">CSV column for {field}</div>
                <input
                  value={header}
                  onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value }))}
                  className="w-full bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-lg outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
                />
              </label>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200">Cancel</button>
          <button
            onClick={submit}
            disabled={!file || uploading}
            className="px-3 py-2 rounded-lg text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 shadow-sm hover:shadow"
          >
            {uploading ? "Importing…" : "Import"}
          </button>
        </div>
      </div>
    </div>
  );
}
