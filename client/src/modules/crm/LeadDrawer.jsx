import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { crmApi } from "../../services/crmService";
import { usePermission } from "../auth/usePermission";
import { showError } from '../../utils/toast';

export default function LeadDrawer({ open, onClose, leadId, mode, onSaved }) {
  const navigate = useNavigate();
  const isEdit = mode === "edit";
  const { allowed: canWrite } = usePermission("crm", "write");
  const [data, setData] = useState({ name: "", company: "", email: "", phone: "", statusId: "", tags: "" });
  const [currentLeadId, setCurrentLeadId] = useState(leadId);
  const [statuses, setStatuses] = useState([]);
  const [tab, setTab] = useState("details");
  const [files, setFiles] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  // NEW: appointment form state + helpers
  const [apptForm, setApptForm] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), Math.ceil(now.getMinutes() / 5) * 5);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    return { startsAt: toLocalInput(start), endsAt: toLocalInput(end), location: "", notes: "" };
  });

  function toLocalInput(d) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function fromLocalInput(v) {
    // v like "2025-10-28T14:30"
    return new Date(v);
  }

  // Update currentLeadId when leadId prop changes
  useEffect(() => {
    setCurrentLeadId(leadId);
  }, [leadId]);

  useEffect(() => {
    const init = async () => {
      const statusRes = await crmApi.listStatuses();
      setStatuses(statusRes.data.items || statusRes.data);
      const effectiveLeadId = currentLeadId || leadId;
      if (isEdit && effectiveLeadId) {
        const response = await crmApi.getLead(effectiveLeadId);
        const lead = response.data || response; // Handle both response formats
        setData({
          name: lead.name || "",
          company: lead.company || "",
          email: lead.email || "",
          phone: lead.phone || "",
          statusId: lead.statusId || "",
          tags: lead.tags || "",
        });
        const [filesRes, apptRes] = await Promise.all([
          crmApi.listFiles(effectiveLeadId), 
          crmApi.listAppointments(effectiveLeadId)
        ]);
        setFiles(filesRes.data?.items || filesRes.data || []);
        setAppointments(apptRes.data?.items || apptRes.data || []);
      } else {
        setFiles([]);
        setAppointments([]);
        // Reset form when creating new lead
        if (!isEdit) {
          setData({ name: "", company: "", email: "", phone: "", statusId: "", tags: "" });
        }
      }
    };
    if (open) init().catch(console.error);
  }, [open, currentLeadId, leadId, isEdit]);

  const save = async () => {
    if (!data.name?.trim()) {
      showError("Name is required");
      return;
    }
    
    setSaving(true);
    try {
      if (isEdit && (currentLeadId || leadId)) {
        // Update existing lead
        const effectiveLeadId = currentLeadId || leadId;
        const updatedLead = await crmApi.updateLead(effectiveLeadId, data);
        // Reload files and appointments after update
        const [filesRes, apptRes] = await Promise.all([
          crmApi.listFiles(effectiveLeadId),
          crmApi.listAppointments(effectiveLeadId)
        ]);
        setFiles(filesRes.data?.items || filesRes.data || []);
        setAppointments(apptRes.data?.items || apptRes.data || []);
        onSaved?.();
        onClose();
      } else {
        // Create new lead
        const response = await crmApi.createLead(data);
        const createdLead = response.data || response; // Handle both response formats
        // Store the new leadId so we can use it for file uploads
        setCurrentLeadId(createdLead.id);
        // Update the parent component to switch to edit mode with the new leadId
        if (onSaved) {
          onSaved(createdLead.id); // Pass the new leadId so parent can update
        }
        // Keep drawer open and switch to edit mode
        // Reload files/appointments (should be empty for new lead)
        const [filesRes, apptRes] = await Promise.all([
          crmApi.listFiles(createdLead.id),
          crmApi.listAppointments(createdLead.id)
        ]);
        setFiles(filesRes.data?.items || filesRes.data || []);
        setAppointments(apptRes.data?.items || apptRes.data || []);
        // Update form data with saved lead
        setData({
          name: createdLead.name || "",
          company: createdLead.company || "",
          email: createdLead.email || "",
          phone: createdLead.phone || "",
          statusId: createdLead.statusId || "",
          tags: createdLead.tags || "",
        });
      }
    } catch (error) {
      console.error("Failed to save lead:", error);
      showError(error?.response?.data?.error || "Failed to save lead. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const uploadFile = async (file) => {
    const effectiveLeadId = currentLeadId || leadId;
    if (!effectiveLeadId) {
      showError("Please save the lead first before uploading files");
      return;
    }
    try {
      await crmApi.uploadFile(effectiveLeadId, file);
      // Refresh files list after upload
      const filesRes = await crmApi.listFiles(effectiveLeadId);
      setFiles(filesRes.data?.items || filesRes.data || []);
    } catch (error) {
      console.error("Failed to upload file:", error);
      showError(error?.response?.data?.error || "Failed to upload file. Please try again.");
    }
  };

  const deleteFile = async (leadFileId) => {
    const effectiveLeadId = currentLeadId || leadId;
    if (!effectiveLeadId) return;
    try {
      await crmApi.deleteFile(effectiveLeadId, leadFileId);
      // Refresh files list after deletion
      const filesRes = await crmApi.listFiles(effectiveLeadId);
      setFiles(filesRes.data?.items || filesRes.data || []);
    } catch (error) {
      console.error("Failed to delete file:", error);
      showError(error?.response?.data?.error || "Failed to delete file. Please try again.");
    }
  };

  // UPDATED: use selected datetime instead of new Date()
  const createAppt = async () => {
    const effectiveLeadId = currentLeadId || leadId;
    if (!effectiveLeadId) {
      showError("Please save the lead first before adding appointments");
      return;
    }
    try {
      const payload = {
        startsAt: fromLocalInput(apptForm.startsAt),
        endsAt: apptForm.endsAt ? fromLocalInput(apptForm.endsAt) : null,
        location: apptForm.location || "",
        notes: apptForm.notes || "",
      };
      await crmApi.createAppointment(effectiveLeadId, payload);
      const apptRes = await crmApi.listAppointments(effectiveLeadId);
      setAppointments(apptRes.data?.items || apptRes.data || []);
      // Reset form
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), Math.ceil(now.getMinutes() / 5) * 5);
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      setApptForm({ startsAt: toLocalInput(start), endsAt: toLocalInput(end), location: "", notes: "" });
    } catch (error) {
      console.error("Failed to create appointment:", error);
      showError(error?.response?.data?.error || "Failed to create appointment. Please try again.");
    }
  };

  // Compose email to lead
  const composeEmailToLead = () => {
    if (data.email) {
      navigate('/dashboard/email', {
        state: {
          composeTo: data.email,
          leadId: leadId,
          leadName: data.name
        }
      });
      onClose(); // Close drawer when navigating
    } else {
      showError('This lead has no email address.');
    }
  };

  return (
    <div className={`fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white text-slate-900 border-l border-slate-200 shadow-xl transform transition-transform duration-300 z-50 flex flex-col ${open ? "translate-x-0" : "translate-x-full"}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
        <h2 className="text-lg font-semibold text-slate-900">{isEdit ? "Edit Lead" : "New Lead"}</h2>
        <button 
          onClick={onClose} 
          className="p-2 rounded-lg hover:bg-slate-200 transition-colors text-slate-600 hover:text-slate-900"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex gap-2 mb-6 border-b border-slate-200 pb-2">
          {["details", "appointments", "files"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t 
                  ? "bg-indigo-600 text-white shadow-md" 
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === "details" && (
          <div className="space-y-3">
            {canWrite && (mode === "create" || mode === "edit") ? (
              <>
                <Input label="Name" value={data.name} onChange={(v) => setData((d) => ({ ...d, name: v }))} required />
                <Input label="Company" value={data.company} onChange={(v) => setData((d) => ({ ...d, company: v }))} />
                <Input label="Email" value={data.email} onChange={(v) => setData((d) => ({ ...d, email: v }))} type="email" />
                <Input label="Phone" value={data.phone} onChange={(v) => setData((d) => ({ ...d, phone: v }))} />
                <Select
                  label="Status"
                  value={data.statusId}
                  onChange={(v) => setData((d) => ({ ...d, statusId: v || null }))}
                  options={[{ value: "", label: "None" }, ...statuses.map((s) => ({ value: String(s.id), label: s.value }))]}
                />
                <TextArea label="Tags (comma separated)" value={data.tags || ""} onChange={(v) => setData((d) => ({ ...d, tags: v }))} />
              </>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Name</div>
                  <div className="px-3 py-2 bg-slate-50 rounded-lg text-slate-900">{data.name || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Company</div>
                  <div className="px-3 py-2 bg-slate-50 rounded-lg text-slate-900">{data.company || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Email</div>
                  <div className="px-3 py-2 bg-slate-50 rounded-lg text-slate-900">{data.email || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Phone</div>
                  <div className="px-3 py-2 bg-slate-50 rounded-lg text-slate-900">{data.phone || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Status</div>
                  <div className="px-3 py-2 bg-slate-50 rounded-lg text-slate-900">
                    {statuses.find(s => s.id === data.statusId)?.value || "None"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Tags</div>
                  <div className="px-3 py-2 bg-slate-50 rounded-lg text-slate-900">{data.tags || "—"}</div>
                </div>
              </div>
            )}
            
            {/* Email shortcut button - only show if lead has email and has an ID */}
            {(currentLeadId || leadId) && data.email && (
              <button
                onClick={composeEmailToLead}
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-4 py-3 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 font-semibold"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Compose Email to {data.name}
              </button>
            )}
          </div>
        )}

        {tab === "appointments" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {canWrite ? (
              <>
                <label className="block">
                  <div className="text-xs text-slate-500 mb-1">Starts at</div>
                  <input
                    type="datetime-local"
                    value={apptForm.startsAt}
                    onChange={(e) => setApptForm((f) => ({ ...f, startsAt: e.target.value }))}
                    className="w-full bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-lg outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
                  />
                </label>
                <label className="block">
                  <div className="text-xs text-slate-500 mb-1">Ends at (optional)</div>
                  <input
                    type="datetime-local"
                    value={apptForm.endsAt}
                    onChange={(e) => setApptForm((f) => ({ ...f, endsAt: e.target.value }))}
                    className="w-full bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-lg outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
                  />
                </label>
              </>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Starts at</div>
                  <div className="px-3 py-2 bg-slate-50 rounded-lg text-slate-900">—</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Ends at</div>
                  <div className="px-3 py-2 bg-slate-50 rounded-lg text-slate-900">—</div>
                </div>
              </div>
            )}
          </div>
          {canWrite ? (
            <>
              <label className="block">
                <div className="text-xs text-slate-500 mb-1">Location</div>
                <input
                  value={apptForm.location}
                  onChange={(e) => setApptForm((f) => ({ ...f, location: e.target.value }))}
                  className="w-full bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-lg outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
                />
              </label>
              <label className="block">
                <div className="text-xs text-slate-500 mb-1">Notes</div>
                <textarea
                  value={apptForm.notes}
                  onChange={(e) => setApptForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-lg outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 min-h-24"
                />
              </label>
              <div className="flex justify-end">
                <button
                  onClick={createAppt}
                  className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Appointment
                </button>
              </div>
            </>
          ) : null}

            <ul className="space-y-2">
              {appointments.map((a) => (
                <li key={a.id} className="bg-white border border-slate-200 p-3 rounded-lg flex items-start justify-between">
                  <div>
                    <div className="text-sm font-medium">{new Date(a.startsAt).toLocaleString()}</div>
                    {a.endsAt && <div className="text-xs text-slate-500">Ends {new Date(a.endsAt).toLocaleString()}</div>}
                    {a.location && <div className="text-xs text-slate-500">{a.location}</div>}
                    {a.notes && <div className="text-xs text-slate-600 mt-1">{a.notes}</div>}
                  </div>
                </li>
              ))}
              {!appointments.length && <div className="text-slate-500">No appointments</div>}
            </ul>
          </div>
        )}

        {tab === "files" && (
          <div className="space-y-3">
            {!(currentLeadId || leadId) && <div className="text-slate-500 text-sm">Save the lead before uploading files.</div>}
            {(currentLeadId || leadId) && canWrite && (
              <>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-4 py-2.5 rounded-lg cursor-pointer shadow-md hover:shadow-lg transition-all font-medium"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Trigger file input click using ref
                    if (fileInputRef.current) {
                      fileInputRef.current.click();
                    }
                  }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload File
                </button>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      uploadFile(e.target.files[0]);
                    }
                    // Reset input after handling
                    e.target.value = '';
                  }}
                />
                <ul className="space-y-2">
                  {files.map((f) => {
                    const fileName = f.file?.path 
                      ? f.file.path.split('/').pop() || f.file.path 
                      : `File #${f.fileId}`;
                    const fileSize = f.file?.size ? Math.round(f.file.size / 1024) : 0;
                    return (
                      <li key={f.id} className="bg-white border border-slate-200 p-3 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-sm truncate" title={fileName}>{fileName}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500 whitespace-nowrap">{fileSize} KB</span>
                          {canWrite && (
                            <button
                              type="button"
                              onClick={() => deleteFile(f.id)}
                              className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
                              title="Delete file"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                  {!files.length && <div className="text-slate-500 text-sm">No files uploaded yet</div>}
                </ul>
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer - Sticky with prominent buttons */}
      <div className="border-t border-slate-200 bg-white p-4 shadow-lg">
        <div className="flex gap-3 justify-end">
          <button 
            onClick={onClose} 
            className="px-4 py-2.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium transition-colors shadow-sm"
          >
            Close
          </button>
          {canWrite && (mode === "create" || mode === "edit") && (
            <button
              onClick={save}
              disabled={!data.name?.trim() || saving}
              className="px-6 py-2.5 rounded-lg text-white font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", required }) {
  return (
    <label className="block">
      <div className="text-xs text-slate-500 mb-1">
        {label}
        {required && " *"}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        className="w-full bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-lg outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
      />
    </label>
  );
}
function TextArea({ label, value, onChange }) {
  return (
    <label className="block">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-lg outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 min-h-24"
      />
    </label>
  );
}
function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-lg outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
