import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { crmApi } from "../../services/crmService";

export default function LeadDrawer({ open, onClose, leadId, mode, onSaved }) {
  const navigate = useNavigate();
  const isEdit = mode === "edit";
  const [data, setData] = useState({ name: "", company: "", email: "", phone: "", statusId: "", tags: "" });
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

  useEffect(() => {
    const init = async () => {
      const statusRes = await crmApi.listStatuses();
      setStatuses(statusRes.data.items || statusRes.data);
      if (isEdit && leadId) {
        const { data: lead } = await crmApi.getLead(leadId);
        setData({
          name: lead.name || "",
          company: lead.company || "",
          email: lead.email || "",
          phone: lead.phone || "",
          statusId: lead.statusId || "",
          tags: lead.tags || "",
        });
        const [filesRes, apptRes] = await Promise.all([crmApi.listFiles(leadId), crmApi.listAppointments(leadId)]);
        setFiles(filesRes.data.items || filesRes.data);
        setAppointments(apptRes.data.items || apptRes.data);
      } else {
        setFiles([]);
        setAppointments([]);
      }
    };
    if (open) init().catch(console.error);
  }, [open, leadId, isEdit]);

  const save = async () => {
    setSaving(true);
    if (isEdit) await crmApi.updateLead(leadId, data);
    else await crmApi.createLead(data);
    setSaving(false);
    onSaved?.();
    onClose();
  };

  const uploadFile = async (file) => {
    if (!leadId) return;
    await crmApi.uploadFile(leadId, file);
    const filesRes = await crmApi.listFiles(leadId);
    setFiles(filesRes.data.items || filesRes.data);
  };

  // UPDATED: use selected datetime instead of new Date()
  const createAppt = async () => {
    if (!leadId) return;
    const payload = {
      startsAt: fromLocalInput(apptForm.startsAt),
      endsAt: apptForm.endsAt ? fromLocalInput(apptForm.endsAt) : null,
      location: apptForm.location || "",
      notes: apptForm.notes || "",
    };
    await crmApi.createAppointment(leadId, payload);
    const apptRes = await crmApi.listAppointments(leadId);
    setAppointments(apptRes.data.items || apptRes.data);
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
            
            {/* Email shortcut button - only show if lead has email and is being edited */}
            {isEdit && data.email && (
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
            </div>
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
            {!isEdit && <div className="text-slate-500 text-sm">Save the lead before uploading files.</div>}
            {isEdit && (
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
        <button onClick={onClose} className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200">Cancel</button>
        <button
          onClick={save}
          disabled={!data.name || saving}
          className="px-3 py-2 rounded-lg text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 shadow-sm hover:shadow"
        >
          {saving ? "Saving…" : "Save"}
        </button>
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
