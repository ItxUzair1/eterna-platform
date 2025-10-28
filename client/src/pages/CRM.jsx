import { useState } from "react";
import LeadTable from "../modules/crm/LeadTable";
import LeadDrawer from "../modules/crm/LeadDrawer";
import ImportModal from "../modules/crm/importModal";

export default function CRM() {
  const [drawer, setDrawer] = useState({ open: false, mode: "create", leadId: null });
  const [importOpen, setImportOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-900">CRM</h2>
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
        onClose={() => setDrawer({ open: false })}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onDone={() => setRefreshKey((k) => k + 1)} />
    </div>
  );
}
