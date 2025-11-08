import PageHeader from '../components/PageHeader.jsx';
import PageContainer from '../components/PageContainer.jsx';
import { Link } from 'react-router-dom';
import { Mail, Layout, ClipboardList, DollarSign, Users, Image as ImageIcon, Calendar, Shield } from 'lucide-react';

const quickLinks = [
  { to: '/dashboard/email', title: 'Email Workspace', description: 'Compose, automate, and track emails in real time.', icon: Mail, accent: 'from-indigo-500 to-sky-500' },
  { to: '/dashboard/kanban', title: 'Kanban Boards', description: 'Manage projects with Trello-style boards, lists, and cards.', icon: Layout, accent: 'from-fuchsia-500 to-purple-500' },
  { to: '/dashboard/todo', title: 'To-do Manager', description: 'Plan your day with smart priorities, reminders, and categories.', icon: ClipboardList, accent: 'from-emerald-500 to-teal-500' },
  { to: '/dashboard/money', title: 'Money Management', description: 'Track revenue, expenses, invoices, and cash flow with ease.', icon: DollarSign, accent: 'from-amber-500 to-orange-500' },
  { to: '/dashboard/crm', title: 'CRM & Leads', description: 'Nurture prospects, schedule appointments, and close deals.', icon: Users, accent: 'from-pink-500 to-rose-500' },
  { to: '/dashboard/image-converter', title: 'Image Converter', description: 'Convert formats, optimize assets, and automate pipelines.', icon: ImageIcon, accent: 'from-cyan-500 to-blue-500' }
];

const timeline = [
  { title: 'Kanban update', time: '3 minutes ago', detail: 'You moved “Q2 campaign launch” to In Progress.' },
  { title: 'Invoice paid', time: '18 minutes ago', detail: 'Payment received for Invoice #INV-204 in Money Management.' },
  { title: 'New lead captured', time: '1 hour ago', detail: 'Marketing qualified lead - “Aria Stone” created via import.' }
];

export default function DashboardHome() {
  return (
    <PageContainer>
      <PageHeader
        title="Welcome back to Eterna Platform"
        description="Your integrated workspace for communication, projects, finance, and client success."
        actions={
          <Link
            to="/dashboard/integrations"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-medium shadow-lg shadow-slate-500/20 hover:bg-slate-800 transition"
          >
            Explore integrations
          </Link>
        }
      />

      <section className="section-card">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">This week at a glance</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Stay on track with milestones across email, projects, and finance.</p>

            <div className="grid gap-4 mt-6 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Emails sent', value: '128', sub: '+18% vs last week' },
                { label: 'Deals in pipeline', value: '24', sub: '8 in negotiation' },
                { label: 'Payments received', value: '$12,480', sub: '4 outstanding invoices' },
                { label: 'Tasks completed', value: '73', sub: '12 due this week' }
              ].map((stat) => (
                <div key={stat.label} className="stat-card">
                  <div className="text-xs uppercase tracking-wide text-slate-500">{stat.label}</div>
                  <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{stat.value}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{stat.sub}</div>
                </div>
              ))}
            </div>
          </div>

          <aside className="glass-panel w-full lg:w-80 p-6 space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Upcoming reminders</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Smart alerts from across your workspace.</p>
            </div>
            <ul className="space-y-4">
              {timeline.map((item) => (
                <li key={item.title} className="rounded-xl border border-white/20 bg-white/40 dark:bg-slate-900/40 px-4 py-3">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.title}</div>
                  <div className="text-xs text-indigo-500 font-medium mt-0.5">{item.time}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.detail}</div>
                </li>
              ))}
            </ul>
            <Link to="/dashboard/todo" className="inline-flex items-center gap-2 text-xs font-medium text-indigo-500 hover:text-indigo-600">
              <Calendar className="w-4 h-4" /> View all upcoming tasks
            </Link>
          </aside>
        </div>
      </section>

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

      <section className="section-card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Knowledge base & quick help</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">Boost adoption and onboard teammates faster.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/dashboard/integrations" className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-100">
              API & Integrations
            </Link>
            <Link to="/dashboard/email" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100">
              Product guides
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-white/50 bg-white/70 backdrop-blur px-5 py-4 shadow-lg">
            <h3 className="text-sm font-semibold text-slate-900">Workspace automation</h3>
            <p className="text-sm text-slate-600 mt-2">Use email templates, CRM sequences, and Kanban automations to accelerate delivery.</p>
            <Link to="/dashboard/email" className="text-xs font-semibold text-indigo-500 mt-3 inline-flex items-center gap-1">
              View automation tips →
            </Link>
          </article>
          <article className="rounded-2xl border border-white/50 bg-white/70 backdrop-blur px-5 py-4 shadow-lg">
            <h3 className="text-sm font-semibold text-slate-900">Financial health</h3>
            <p className="text-sm text-slate-600 mt-2">Manage invoices, forecast revenue, and surface high-risk customers from Money Management.</p>
            <Link to="/dashboard/money" className="text-xs font-semibold text-indigo-500 mt-3 inline-flex items-center gap-1">
              Explore financial dashboards →
            </Link>
          </article>
        </div>
      </section>
    </PageContainer>
  );
}

