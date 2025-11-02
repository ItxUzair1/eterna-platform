import { useState, useRef } from "react";
import { crmApi } from "../../services/crmService";
import Papa from "papaparse";

export default function ImportModal({ open, onClose, onDone }) {
  const [step, setStep] = useState(1); // 1: Upload, 2: Map, 3: Preview, 4: Result
  const [file, setFile] = useState(null);
  const [rawData, setRawData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [preview, setPreview] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const reset = () => {
    setStep(1);
    setFile(null);
    setRawData([]);
    setHeaders([]);
    setMapping({});
    setPreview([]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          alert("Failed to parse CSV. Please check the file format.");
          return;
        }
        setRawData(results.data);
        setHeaders(Object.keys(results.data[0] || {}));
        
        // Auto-map common column names
        const autoMap = {};
        const fieldNames = ["name", "company", "email", "phone", "status", "tags"];
        headers.forEach((header) => {
          const lowerHeader = header.toLowerCase().trim();
          fieldNames.forEach((field) => {
            if (lowerHeader.includes(field) && !autoMap[field]) {
              autoMap[field] = header;
            }
          });
        });
        setMapping(autoMap);
        setPreview(results.data.slice(0, 10)); // Preview first 10 rows
        setStep(2);
      },
      error: (error) => {
        alert(`Error parsing CSV: ${error.message}`);
      },
    });
  };

  const handleMapping = () => {
    // Validate required field
    if (!mapping.name) {
      alert("Please map the 'name' column (required field)");
      return;
    }
    setStep(3);
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const { data } = await crmApi.importCsv(file, mapping);
      
      // Use backend validation results
      const validation = {
        total: data?.total || rawData.length,
        success: data?.imported || 0,
        failed: (data?.total || rawData.length) - (data?.imported || 0),
        errors: data?.errors || [],
      };
      setResult(validation);
      setStep(4);
    } catch (error) {
      alert(error?.response?.data?.error || "Import failed. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-4xl bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="font-semibold text-lg">Import Leads</h3>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold", step >= 1 ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500")}>1</div>
              <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold", step >= 2 ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500")}>2</div>
              <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold", step >= 3 ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500")}>3</div>
              <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold", step >= 4 ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500")}>4</div>
            </div>
            <button onClick={() => { reset(); onClose(); }} className="p-2 rounded hover:bg-slate-100">✕</button>
          </div>
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-slate-600">Upload a CSV file with your leads data.</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-700 border border-slate-200 rounded-lg p-3"
              />
              <div className="text-xs text-slate-500">
                <p className="font-semibold mb-1">Expected columns:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Name (required)</li>
                  <li>Company</li>
                  <li>Email</li>
                  <li>Phone</li>
                  <li>Status</li>
                  <li>Tags</li>
                </ul>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-slate-600">Map CSV columns to lead fields:</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: "name", label: "Name", required: true },
                  { key: "company", label: "Company", required: false },
                  { key: "email", label: "Email", required: false },
                  { key: "phone", label: "Phone", required: false },
                  { key: "status", label: "Status", required: false },
                  { key: "tags", label: "Tags", required: false },
                ].map((field) => (
                  <label key={field.key} className="block">
                    <div className="text-sm font-medium text-slate-700 mb-1">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </div>
                    <select
                      value={mapping[field.key] || ""}
                      onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                      className="w-full bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-lg outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
                    >
                      <option value="">-- Skip --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              
              {preview.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm font-medium text-slate-700 mb-2">Preview (first 10 rows):</p>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="min-w-full text-xs">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="p-2 text-left">Name</th>
                          <th className="p-2 text-left">Company</th>
                          <th className="p-2 text-left">Email</th>
                          <th className="p-2 text-left">Phone</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.slice(0, 10).map((row, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="p-2">{row[mapping.name] || "-"}</td>
                            <td className="p-2">{row[mapping.company] || "-"}</td>
                            <td className="p-2">{row[mapping.email] || "-"}</td>
                            <td className="p-2">{row[mapping.phone] || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-slate-600">Ready to import {rawData.length} leads. Click Import to continue.</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Leads with invalid or missing required fields will be skipped. A validation report will be shown after import.
                </p>
              </div>
            </div>
          )}

          {step === 4 && result && (
            <div className="space-y-4">
              <h4 className="font-semibold text-lg">Import Complete</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">{result.success}</div>
                  <div className="text-sm text-green-700">Successfully imported</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-red-600">{result.failed}</div>
                  <div className="text-sm text-red-700">Failed</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-slate-600">{result.total}</div>
                  <div className="text-sm text-slate-700">Total rows</div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-slate-700 mb-2">Validation Errors:</p>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                    <table className="min-w-full text-xs">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="p-2 text-left">Row</th>
                          <th className="p-2 text-left">Field</th>
                          <th className="p-2 text-left">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.errors.slice(0, 50).map((err, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="p-2">{err.row}</td>
                            <td className="p-2">{err.field}</td>
                            <td className="p-2 text-red-600">{err.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {result.errors.length > 50 && (
                    <p className="text-xs text-slate-500 mt-2">Showing first 50 errors of {result.errors.length}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-end gap-2 sticky bottom-0 bg-white">
          {step > 1 && step < 4 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              Back
            </button>
          )}
          {step === 2 && (
            <button
              onClick={handleMapping}
              disabled={!mapping.name}
              className="px-4 py-2 rounded-lg text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 shadow-sm hover:shadow"
            >
              Continue
            </button>
          )}
          {step === 3 && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-4 py-2 rounded-lg text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 shadow-sm hover:shadow"
            >
              {importing ? "Importing…" : "Import"}
            </button>
          )}
          {step === 4 && (
            <button
              onClick={() => {
                reset();
                onDone?.();
                onClose();
              }}
              className="px-4 py-2 rounded-lg text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-sm hover:shadow"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function clsx(...args) {
  return args.filter(Boolean).join(" ");
}
