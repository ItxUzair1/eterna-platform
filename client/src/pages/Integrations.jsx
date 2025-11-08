import { useState, useEffect } from "react";
import { googlesheetsApi } from "../services/googlesheetsService";
import { useAuth } from "../context/AuthContext";
import { Plus, Trash2, RefreshCw, ExternalLink, CheckCircle, XCircle } from "lucide-react";
import clsx from "clsx";
import { showError, showSuccess } from '../utils/toast';

export default function Integrations() {
  const { user } = useAuth();
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    apiKey: "",
    spreadsheetId: "",
    sheetName: "",
    syncDirection: "import",
  });
  const [spreadsheetInfo, setSpreadsheetInfo] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [fieldMapping, setFieldMapping] = useState({});
  const [syncing, setSyncing] = useState({});
  const [step, setStep] = useState(1); // 1: Basic, 2: Sheet Selection, 3: Mapping

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      const data = await googlesheetsApi.listConnections();
      setConnections(data);
    } catch (err) {
      console.error("Failed to load connections:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchSpreadsheet = async () => {
    if (!formData.spreadsheetId || !formData.apiKey) {
      showError("Please enter spreadsheet ID and API key");
      return;
    }

    try {
      const info = await googlesheetsApi.getSpreadsheetInfo(formData.spreadsheetId, formData.apiKey);
      setSpreadsheetInfo(info);
      setStep(2);
    } catch (err) {
      showError(err?.response?.data?.error || "Failed to fetch spreadsheet. Check your API key and spreadsheet ID.");
    }
  };

  const handleSelectSheet = async (sheetName) => {
    setFormData({ ...formData, sheetName });
    try {
      const sheetHeaders = await googlesheetsApi.getSheetHeaders(
        formData.spreadsheetId,
        sheetName,
        formData.apiKey
      );
      setHeaders(sheetHeaders);
      
      // Auto-map headers
      const autoMap = {};
      sheetHeaders.forEach((h) => {
        const lower = h.header.toLowerCase();
        if (lower.includes("name")) autoMap.name = h.column;
        else if (lower.includes("email")) autoMap.email = h.column;
        else if (lower.includes("phone")) autoMap.phone = h.column;
        else if (lower.includes("company")) autoMap.company = h.column;
        else if (lower.includes("status")) autoMap.status = h.column;
        else if (lower.includes("tag")) autoMap.tags = h.column;
      });
      setFieldMapping(autoMap);
      setStep(3);
    } catch (err) {
      showError(err?.response?.data?.error || "Failed to fetch sheet headers");
    }
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        fieldMapping,
      };
      
      if (editing) {
        await googlesheetsApi.updateConnection(editing.id, payload);
      } else {
        await googlesheetsApi.createConnection(payload);
      }
      
      resetForm();
      loadConnections();
    } catch (err) {
      showError(err?.response?.data?.error || "Failed to save connection");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this connection?")) return;
    try {
      await googlesheetsApi.deleteConnection(id);
      loadConnections();
    } catch (err) {
      showError(err?.response?.data?.error || "Failed to delete connection");
    }
  };

  const handleSync = async (id, direction) => {
    setSyncing({ ...syncing, [id]: true });
    try {
      let result;
      if (direction === "import") {
        result = await googlesheetsApi.syncImport(id);
      } else if (direction === "export") {
        result = await googlesheetsApi.syncExport(id);
      } else {
        result = await googlesheetsApi.syncBidirectional(id);
      }
      showSuccess(`Sync completed! ${JSON.stringify(result)}`);
      loadConnections();
    } catch (err) {
      showError(err?.response?.data?.error || "Sync failed");
    } finally {
      setSyncing({ ...syncing, [id]: false });
    }
  };

  const resetForm = () => {
    setShowModal(false);
    setEditing(null);
    setStep(1);
    setFormData({
      name: "",
      apiKey: "",
      spreadsheetId: "",
      sheetName: "",
      syncDirection: "import",
    });
    setSpreadsheetInfo(null);
    setHeaders([]);
    setFieldMapping({});
  };

  const startEdit = async (conn) => {
    try {
      // Fetch full connection details to get decrypted API key
      const fullConn = await googlesheetsApi.getConnection(conn.id);
      setEditing(conn);
      setFormData({
        name: fullConn.name,
        apiKey: fullConn.apiKey || "", // Decrypted key from backend
        spreadsheetId: fullConn.spreadsheetId || "",
        sheetName: fullConn.sheetName || "",
        syncDirection: fullConn.syncDirection || "import",
      });
      setFieldMapping(fullConn.fieldMapping || {});
      setShowModal(true);
    } catch (err) {
      showError("Failed to load connection details");
    }
  };

  // Extract spreadsheet ID from URL
  const extractSpreadsheetId = (url) => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : "";
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-cyan-50">
      <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-500 shadow-lg">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
          <h2 className="text-white text-2xl sm:text-3xl font-semibold">Integrations</h2>
          <p className="text-white/80 mt-2">Connect Google Sheets to sync your CRM leads</p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 -mt-6 pb-8">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-slate-800">Google Sheets Connections</h3>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-sm hover:shadow"
            >
              <Plus className="w-4 h-4" /> New Connection
            </button>
          </div>

          {connections.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p>No Google Sheets connections yet.</p>
              <p className="text-sm mt-2">Click "New Connection" to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {connections.map((conn) => (
                <div
                  key={conn.id}
                  className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-800">{conn.name}</h4>
                      <div className="mt-2 space-y-1 text-sm text-slate-600">
                        <p>Spreadsheet: {conn.spreadsheetId}</p>
                        <p>Sheet: {conn.sheetName || "Sheet1"}</p>
                        <p>Direction: {conn.syncDirection}</p>
                        {conn.lastSyncAt && (
                          <p>Last sync: {new Date(conn.lastSyncAt).toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSync(conn.id, conn.syncDirection)}
                        disabled={syncing[conn.id]}
                        className={clsx(
                          "px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2",
                          syncing[conn.id]
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                            : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                        )}
                      >
                        <RefreshCw className={clsx("w-4 h-4", syncing[conn.id] && "animate-spin")} />
                        Sync
                      </button>
                      <button
                        onClick={() => startEdit(conn)}
                        className="px-3 py-2 rounded-lg text-sm bg-slate-100 text-slate-700 hover:bg-slate-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(conn.id)}
                        className="px-3 py-2 rounded-lg text-sm bg-red-50 text-red-700 hover:bg-red-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h4 className="font-semibold text-blue-900 mb-2">Getting Started</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
            <li>Get a Google Sheets API key from <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
            <li>Enable Google Sheets API for your project</li>
            <li>Create a new spreadsheet or use an existing one</li>
            <li>Share the spreadsheet (if needed) and copy the spreadsheet ID from the URL</li>
            <li>Connect it here and configure the field mapping</li>
          </ol>
        </div>
      </div>

      {/* Connection Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-xl font-semibold">
                {editing ? "Edit Connection" : "New Google Sheets Connection"}
              </h3>
              <button onClick={resetForm} className="p-2 rounded hover:bg-slate-100">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {step === 1 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Connection Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="My CRM Sync"
                      className="w-full bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-lg outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Google Sheets API Key *
                    </label>
                    <input
                      type="password"
                      value={formData.apiKey}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                      placeholder="AIza..."
                      className="w-full bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-lg outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      {user?.role?.name === "Entrepreneur" 
                        ? "Use your personal API key" 
                        : "Use your enterprise API key"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Spreadsheet ID *
                    </label>
                    <input
                      type="text"
                      value={formData.spreadsheetId}
                      onChange={(e) => setFormData({ ...formData, spreadsheetId: e.target.value })}
                      placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                      className="w-full bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-lg outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Extract from URL: https://docs.google.com/spreadsheets/d/<strong>SPREADSHEET_ID</strong>/edit
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Sync Direction
                    </label>
                    <select
                      value={formData.syncDirection}
                      onChange={(e) => setFormData({ ...formData, syncDirection: e.target.value })}
                      className="w-full bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-lg outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
                    >
                      <option value="import">Import from Sheets → CRM</option>
                      <option value="export">Export from CRM → Sheets</option>
                      <option value="bidirectional">Bidirectional Sync</option>
                    </select>
                  </div>

                  <button
                    onClick={handleFetchSpreadsheet}
                    disabled={!formData.apiKey || !formData.spreadsheetId}
                    className="w-full px-4 py-2 rounded-lg text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 shadow-sm hover:shadow"
                  >
                    Next: Select Sheet
                  </button>
                </>
              )}

              {step === 2 && spreadsheetInfo && (
                <>
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-2">Select Sheet</h4>
                    <p className="text-sm text-slate-600 mb-4">Spreadsheet: {spreadsheetInfo.title}</p>
                    <div className="space-y-2">
                      {spreadsheetInfo.sheets.map((sheet) => (
                        <button
                          key={sheet.id}
                          onClick={() => handleSelectSheet(sheet.title)}
                          className="w-full text-left p-3 border border-slate-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition"
                        >
                          <div className="font-medium text-slate-800">{sheet.title}</div>
                          <div className="text-xs text-slate-500">
                            {sheet.rowCount} rows × {sheet.columnCount} columns
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => setStep(1)}
                    className="w-full px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                  >
                    Back
                  </button>
                </>
              )}

              {step === 3 && headers.length > 0 && (
                <>
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-4">Map Columns</h4>
                    <div className="space-y-3">
                      {[
                        { key: "name", label: "Name", required: true },
                        { key: "company", label: "Company", required: false },
                        { key: "email", label: "Email", required: false },
                        { key: "phone", label: "Phone", required: false },
                        { key: "status", label: "Status", required: false },
                        { key: "tags", label: "Tags", required: false },
                      ].map((field) => (
                        <div key={field.key}>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                          </label>
                          <select
                            value={fieldMapping[field.key] || ""}
                            onChange={(e) =>
                              setFieldMapping({ ...fieldMapping, [field.key]: e.target.value })
                            }
                            className="w-full bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-lg outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
                          >
                            <option value="">-- Skip --</option>
                            {headers.map((h) => (
                              <option key={h.column} value={h.column}>
                                {h.column}: {h.header}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setStep(2)}
                      className="flex-1 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={!fieldMapping.name}
                      className="flex-1 px-4 py-2 rounded-lg text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 shadow-sm hover:shadow"
                    >
                      {editing ? "Update" : "Create"} Connection
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

