import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link2 } from "lucide-react";
import LeadTable from "../modules/crm/LeadTable";
import LeadDrawer from "../modules/crm/LeadDrawer";
import ImportModal from "../modules/crm/importModal";
import PageContainer from "../components/PageContainer";
import PageHeader from "../components/PageHeader";
import { useNotifications } from "../context/NotificationContext";

export default function CRM() {
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState({ open: false, mode: "create", leadId: null });
  const [importOpen, setImportOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { refresh: refreshNotifications } = useNotifications();

  return (
    <PageContainer>
      <PageHeader
        title="CRM - Customer Relationship Management"
        description="Manage your leads, track statuses, and grow your business"
        actions={
          <button
            onClick={() => navigate("/dashboard/integrations")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition shadow-sm hover:shadow"
          >
            <Link2 className="w-4 h-4" />
            Google Sheets Integration
          </button>
        }
      />
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
            refreshNotifications();
            // If a new lead was created, switch to edit mode with the new ID
            if (newLeadId) {
              setDrawer({ open: true, mode: "edit", leadId: newLeadId });
            }
          }}
        />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onDone={() => { setRefreshKey((k) => k + 1); refreshNotifications(); }} />
    </PageContainer>
  );
}
