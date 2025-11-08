import { useContext, useMemo } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import PageContainer from '../components/PageContainer.jsx';
import { Link } from 'react-router-dom';
import { Mail, Layout, ClipboardList, DollarSign, Users, Image as ImageIcon, Shield } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const ALL_QUICK_LINKS = [
  { to: '/dashboard/email', key: 'email', title: 'Email Workspace', description: 'Compose, automate, and track emails in real time.', icon: Mail, accent: 'from-indigo-500 to-sky-500' },
  { to: '/dashboard/kanban', key: 'kanban', title: 'Kanban Boards', description: 'Manage projects with Trello-style boards, lists, and cards.', icon: Layout, accent: 'from-fuchsia-500 to-purple-500' },
  { to: '/dashboard/todo', key: 'todos', title: 'To-do Manager', description: 'Plan your day with smart priorities, reminders, and categories.', icon: ClipboardList, accent: 'from-emerald-500 to-teal-500' },
  { to: '/dashboard/money', key: 'money', title: 'Money Management', description: 'Track revenue, expenses, invoices, and cash flow with ease.', icon: DollarSign, accent: 'from-amber-500 to-orange-500' },
  { to: '/dashboard/crm', key: 'crm', title: 'CRM & Leads', description: 'Nurture prospects, schedule appointments, and close deals.', icon: Users, accent: 'from-pink-500 to-rose-500' },
  { to: '/dashboard/image-converter', key: 'image', title: 'Image Converter', description: 'Convert formats, optimize assets, and automate pipelines.', icon: ImageIcon, accent: 'from-cyan-500 to-blue-500' }
];

export default function DashboardHome() {
  const { enabledApps = [] } = useContext(AuthContext) || {};

  // Filter quick links by enabled apps, excluding admin and billing
  const quickLinks = useMemo(() => {
    return ALL_QUICK_LINKS.filter(link =>
      enabledApps.includes(link.key) &&
      link.key !== 'admin' &&
      link.key !== 'billing'
    );
  }, [enabledApps]);

  return (
    <PageContainer>
      <PageHeader
        title="Welcome back to Eterna Platform"
        description="Your integrated workspace for communication, projects, finance, and client success."

      />

      <section className="section-card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Workspace shortcuts</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">Jump directly into each module to keep momentum going.</p>
          </div>
          <Link to="/dashboard/integrations" className="hidden sm:inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-500">
            <Shield className="w-4 h-4" /> Configure access
          </Link>
        </div>

        <div className="grid gap-4 mt-6 sm:grid-cols-2 xl:grid-cols-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                className="group relative overflow-hidden rounded-2xl border border-white/40 bg-white/85 backdrop-blur shadow-lg shadow-indigo-200/50 transition hover:-translate-y-1 hover:shadow-2xl"
              >
                <div className={`absolute inset-x-0 -top-1 h-1 bg-gradient-to-r ${link.accent}`} aria-hidden="true" />
                <div className="flex flex-col gap-3 p-5">
                  <div className="flex items-center justify-between">
                    <div className="rounded-xl bg-slate-900/90 text-white p-2">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500 bg-indigo-50 px-2 py-1 rounded-full group-hover:bg-indigo-500 group-hover:text-white transition">
                      Open
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 group-hover:text-indigo-600 transition">
                    {link.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {link.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </PageContainer>
  );
}
