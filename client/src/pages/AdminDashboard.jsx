// Admin Dashboard - Entry point for all admin features
import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Shield, UsersRound, Layers, FileText, Settings } from 'lucide-react';

export default function AdminDashboard() {
  const adminFeatures = [
    {
      title: 'Permission Matrix',
      description: 'Manage user permissions and app access with toggle controls',
      icon: <Shield className="w-8 h-8" />,
      to: '/admin/permissions',
      gradient: 'from-indigo-500 to-purple-600',
      features: ['User → Apps matrix', 'Toggle app permissions', 'Granular scopes (read/write/manage)']
    },
    {
      title: 'Team Directory',
      description: 'View and manage all team members, their roles, and profiles',
      icon: <Users className="w-8 h-8" />,
      to: '/admin/members',
      gradient: 'from-purple-500 to-pink-600',
      features: ['Full directory listing', 'Edit/Delete users', 'Assign roles', 'Invite members']
    },
    {
      title: 'Teams & Groups',
      description: 'Create teams, manage members, and set team-level permissions',
      icon: <UsersRound className="w-8 h-8" />,
      to: '/admin/teams',
      gradient: 'from-pink-500 to-rose-600',
      features: ['Create/Edit teams', 'Add/Remove members', 'Team permissions', 'Invite to team']
    },
    {
      title: 'Roles Management',
      description: 'Create and manage roles with default permissions',
      icon: <Layers className="w-8 h-8" />,
      to: '/admin/roles',
      gradient: 'from-blue-500 to-cyan-600',
      features: ['Create custom roles', 'Set default permissions', 'Assign to users']
    },
    {
      title: 'Audit Log',
      description: 'View all permission changes and administrative actions',
      icon: <FileText className="w-8 h-8" />,
      to: '/admin/audit',
      gradient: 'from-slate-500 to-gray-600',
      features: ['Track all changes', 'Permission updates', 'User actions']
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent mb-2">
            Admin Dashboard
          </h1>
          <p className="text-slate-600 text-lg">
            Manage your enterprise: Teams, Permissions, and Members
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl border border-white/60 bg-gradient-to-br from-white/90 to-indigo-50/30 backdrop-blur-xl shadow-xl p-6">
            <div className="text-sm text-slate-600 mb-1">Total Members</div>
            <div className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              View Directory
            </div>
          </div>
          <div className="rounded-2xl border border-white/60 bg-gradient-to-br from-white/90 to-purple-50/30 backdrop-blur-xl shadow-xl p-6">
            <div className="text-sm text-slate-600 mb-1">Active Teams</div>
            <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Manage Teams
            </div>
          </div>
          <div className="rounded-2xl border border-white/60 bg-gradient-to-br from-white/90 to-pink-50/30 backdrop-blur-xl shadow-xl p-6">
            <div className="text-sm text-slate-600 mb-1">Permissions</div>
            <div className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
              Configure
            </div>
          </div>
          <div className="rounded-2xl border border-white/60 bg-gradient-to-br from-white/90 to-blue-50/30 backdrop-blur-xl shadow-xl p-6">
            <div className="text-sm text-slate-600 mb-1">Roles</div>
            <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Manage
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminFeatures.map((feature, idx) => (
            <Link
              key={idx}
              to={feature.to}
              className="group relative rounded-2xl border border-white/60 bg-white/80 backdrop-blur-xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 overflow-hidden"
            >
              {/* Gradient Background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
              
              {/* Content */}
              <div className="relative z-10">
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.gradient} text-white mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-slate-600 mb-4 text-sm">
                  {feature.description}
                </p>
                <ul className="space-y-2">
                  {feature.features.map((f, i) => (
                    <li key={i} className="flex items-center text-sm text-slate-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mr-2" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <span className="text-indigo-600 font-medium text-sm group-hover:underline">
                    Open {feature.title} →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 rounded-2xl border border-white/60 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-fuchsia-500/10 backdrop-blur-xl shadow-xl p-6">
          <h3 className="text-xl font-semibold text-slate-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/admin/members"
              className="flex items-center gap-3 p-4 rounded-xl bg-white/60 hover:bg-white/80 transition-colors border border-white/40"
            >
              <Users className="w-5 h-5 text-indigo-600" />
              <span className="font-medium text-slate-800">Invite New Member</span>
            </Link>
            <Link
              to="/admin/teams"
              className="flex items-center gap-3 p-4 rounded-xl bg-white/60 hover:bg-white/80 transition-colors border border-white/40"
            >
              <UsersRound className="w-5 h-5 text-purple-600" />
              <span className="font-medium text-slate-800">Create New Team</span>
            </Link>
            <Link
              to="/admin/permissions"
              className="flex items-center gap-3 p-4 rounded-xl bg-white/60 hover:bg-white/80 transition-colors border border-white/40"
            >
              <Shield className="w-5 h-5 text-pink-600" />
              <span className="font-medium text-slate-800">Manage Permissions</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

