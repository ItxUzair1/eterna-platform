import { useState } from "react";
import LeadTable from "../modules/crm/LeadTable";
import LeadDrawer from "../modules/crm/LeadDrawer";
import ImportModal from "../modules/crm/importModal";

export default function CRM() {
  const [drawer, setDrawer] = useState({ open: false, mode: "create", leadId: null });
  const [importOpen, setImportOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">CRM - Customer Relationship Management</h1>
          <p className="text-slate-600">Manage your leads, track statuses, and grow your business</p>
        </div>
        <LeadTable
          key={refreshKey}
          onOpenDrawer={(opts) => setDrawer({ open: true, ...opts })}
          onOpenImport={() => setImportOpen(true)}
        />
        <LeadDrawer
          open={drawer.open}
          mode={drawer.mode}
          leadId={drawer.leadId}
          onClose={() => setDrawer({ open: false, mode: "create", leadId: null })}
          onSaved={(newLeadId) => {
            setRefreshKey((k) => k + 1);
            // If a new lead was created, switch to edit mode with the new ID
            if (newLeadId) {
              setDrawer({ open: true, mode: "edit", leadId: newLeadId });
            }
          }}
        />
        <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onDone={() => setRefreshKey((k) => k + 1)} />
      </div>
    </div>
  );
}
