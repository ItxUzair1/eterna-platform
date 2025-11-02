import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { crmApi } from "../../services/crmService";
import { usePermission } from "../auth/usePermission";

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
      alert("Name is required");
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
      alert(error?.response?.data?.error || "Failed to save lead. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const uploadFile = async (file) => {
    const effectiveLeadId = currentLeadId || leadId;
    if (!effectiveLeadId) {
      alert("Please save the lead first before uploading files");
      return;
    }
    try {
      await crmApi.uploadFile(effectiveLeadId, file);
      const filesRes = await crmApi.listFiles(effectiveLeadId);
      setFiles(filesRes.data?.items || filesRes.data || []);
    } catch (error) {
      console.error("Failed to upload file:", error);
      alert(error?.response?.data?.error || "Failed to upload file. Please try again.");
    }
  };

  // UPDATED: use selected datetime instead of new Date()
  const createAppt = async () => {
    const effectiveLeadId = currentLeadId || leadId;
    if (!effectiveLeadId) {
      alert("Please save the lead first before adding appointments");
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
      alert(error?.response?.data?.error || "Failed to create appointment. Please try again.");
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
      alert('This lead has no email address.');
    }
  };

  return (
    <div className={`fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white text-slate-900 border-l border-slate-200 shadow-xl transform transition-transform duration-300 z-50 ${open ? "translate-x-0" : "translate-x-full"}`}>
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <h2 className="text-lg font-semibold">{isEdit ? "Edit Lead" : "New Lead"}</h2>
        <button onClick={onClose} className="p-2 rounded hover:bg-slate-100">✕</button>
      </div>

      <div className="p-4">
        <div className="flex gap-2 mb-4">
          {["details", "appointments", "files"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 rounded-full text-sm ${tab === t ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
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
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-4 py-2 rounded-lg shadow-sm hover:shadow transition flex items-center justify-center gap-2 font-semibold"
              >
                ✉️ Compose Email to {data.name}
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
                  className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-3 py-2 rounded-lg shadow-sm"
                >
                  Add appointment
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
                <label className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 px-3 py-2 rounded-lg cursor-pointer shadow-sm hover:shadow">
                  <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
                  Upload file
                </label>
                <ul className="space-y-2">
                  {files.map((f) => (
                    <li key={f.id} className="bg-white border border-slate-200 p-3 rounded-lg flex items-center justify-between">
                      <span className="text-sm">{f.file?.path || `File #${f.fileId}`}</span>
                      <span className="text-xs text-slate-500">{Math.round((f.file?.size || 0) / 1024)} KB</span>
                    </li>
                  ))}
                  {!files.length && <div className="text-slate-500">No files</div>}
                </ul>
              </>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-200 flex gap-2 justify-end bg-white rounded-b-lg">
        <button onClick={onClose} className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200">Close</button>
        {canWrite && (mode === "create" || mode === "edit") && (
          <button
            onClick={save}
            disabled={!data.name || saving}
            className="px-3 py-2 rounded-lg text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 shadow-sm hover:shadow"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        )}
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
