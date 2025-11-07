import React, { useEffect, useState } from 'react';
import api from '../services/api';
import PageContainer from '../components/PageContainer';
import PageHeader from '../components/PageHeader';

export default function Audit() {
  const [rows, setRows] = useState([]);
  const load = async () => {
    const r = await api.get('/audit?limit=100'); // implement a read-only audit endpoint
    setRows(r.data.rows || []);
  };
  useEffect(() => { load(); }, []);
  return (
    <PageContainer>
      <PageHeader
        title="Audit Log"
        description="View all permission changes and administrative actions"
      />
      <div className="section-card overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50 text-left text-sm text-slate-600">
            <tr><th className="p-3">Time</th><th className="p-3">Actor</th><th className="p-3">Action</th><th className="p-3">Target</th><th className="p-3">Diff</th></tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-3">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="p-3">{r.actor?.email}</td>
                <td className="p-3">{r.action}</td>
                <td className="p-3">{r.targetType} {r.targetId || ''}</td>
                <td className="p-3"><pre className="text-xs whitespace-pre-wrap">{JSON.stringify(r.diff, null, 2)}</pre></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageContainer>
  );
}
