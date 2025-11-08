// src/components/Sidebar.jsx
import { NavLink, useNavigate } from "react-router-dom";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { ClipboardList, Image, Menu, LogOut, Mail, Layout, Shield, DollarSign, CreditCard } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import http from "../services/api";
import useBillingStore from "../store/billingStore";

const ALL_ITEMS = [
  { to: "/dashboard/todo", key: "todos", label: "To-Do App", icon: <ClipboardList className="w-5 h-5" /> },
  { to: "/dashboard/image-converter", key: "image", label: "Image Converter", icon: <Image className="w-5 h-5" /> },
  { to: "/dashboard/email", key: "email", label: "Email", icon: <Mail className="w-5 h-5" /> },
  { to: "/dashboard/kanban", key: "kanban", label: "Kanban", icon: <Layout className="w-5 h-5" /> },
  { to: "/dashboard/crm", key: "crm", label: "CRM", icon: <Layout className="w-5 h-5" /> },
  { to: "/dashboard/money", key: "money", label: "Money Management", icon: <DollarSign className="w-5 h-5" /> },
  { to: "/billing", key: "billing", label: "Billing", icon: <CreditCard className="w-5 h-5" /> },
  // Admin appears only if enabled via RBAC (key: 'admin')
  { to: "/admin", key: "admin", label: "Admin", icon: <Shield className="w-5 h-5" /> }
];

export default function Sidebar({ isOpen, collapsed, onToggleCollapse, onCloseMobile }) {
  const navigate = useNavigate();
  const drawerRef = useRef(null);
  const { enabledApps = [], permissions = {} } = useContext(AuthContext) || {};
  const [lifecycleState, setLifecycleState] = useState(null);
  const [billingStatus, setBillingStatus] = useState(null);
  const [plan, setPlan] = useState(null);

  // Fetch billing to know if we are in trial; refresh on window focus as well
  useEffect(() => {
    let mounted = true;
    const fetchBilling = () => {
      http.get('/me/billing').then(r => {
        if (!mounted) return;
        setLifecycleState(r.data?.lifecycle_state || null);
        setBillingStatus(r.data?.status || null);
        setPlan(r.data?.plan || null);
      }).catch(() => {});
    };
    fetchBilling();
    const onFocus = () => fetchBilling();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') fetchBilling();
    });
    return () => { mounted = false; window.removeEventListener('focus', onFocus); };
  }, []);

  // Filter items by enabled apps; 'dashboard' key is not used here, so strictly RBAC-driven
  const items = useMemo(() => {
    return ALL_ITEMS.filter(i => enabledApps.includes(i.key));
  }, [enabledApps]);

  const trialLocked = useMemo(() => new Set(["crm","kanban","email"]), []);
  const isTrial = (lifecycleState === 'trial_active' || billingStatus === 'trialing') && !(plan === 'individual' || (plan || '').startsWith('enterprise'));

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    navigate("/");
  };

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && isOpen) onCloseMobile(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onCloseMobile]);

  // Lightweight focus handling for drawer
  useEffect(() => {
    if (!isOpen) return;
    const el = drawerRef.current;
    const prevFocus = document.activeElement;
    const firstFocusable = el?.querySelector("button, a");
    firstFocusable?.focus?.();
    return () => prevFocus?.focus?.();
  }, [isOpen]);

  const baseWidth = collapsed ? "w-20" : "w-64";

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity sm:hidden ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        aria-hidden={!isOpen}
        onClick={onCloseMobile}
      />

      {/* Sidebar container */}
      <aside
        ref={drawerRef}
        className={`fixed left-0 top-0 bottom-0 z-50 bg-gray-900 text-white ${baseWidth}
          flex flex-col justify-between transition-[width,transform] duration-300 will-change-transform
          sm:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"}`}
        aria-label="Sidebar"
      >
        {/* Top */}
        <div>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <h1 className={`${collapsed ? "sr-only" : "block"} text-xl font-bold`}>MyApps</h1>
            <button
              onClick={onToggleCollapse}
              className="hover:bg-gray-800 p-2 rounded-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-pressed={collapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title="Toggle collapse"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          {/* Nav */}
          <nav className="mt-4 space-y-1 px-2" role="navigation" aria-label="Primary">
            {items.map(it => (
              <SideItem
                key={it.to}
                to={it.to}
                icon={it.icon}
                collapsed={collapsed}
                label={it.label}
                disabled={isTrial && trialLocked.has(it.key)}
              />
            ))}
          </nav>
        </div>

        {/* Bottom: Logout */}
        <div className="border-t border-gray-800 p-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-red-400 hover:bg-gray-800 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Log out"
          >
            <LogOut className="w-5 h-5" />
            <span className={collapsed ? "sr-only" : "block"}>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

function SideItem({ to, icon, label, collapsed, disabled }) {
  const onClick = (e) => {
    if (!disabled) return;
    e.preventDefault();
    useBillingStore.getState().openUpgradeModal({ code: 'UPGRADE_REQUIRED', attemptedAction: to });
  };
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `group flex items-center gap-3 px-3 py-2 rounded-md transition-colors
         outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
         ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-800'} ${isActive ? "bg-gray-800 text-indigo-400 font-semibold" : "text-gray-300"}`
      }
      aria-current={({ isActive }) => (isActive ? "page" : undefined)}
      title={label}
    >
      <span aria-hidden="true">{icon}</span>
      <span className={collapsed ? "sr-only" : "block"}>{label}</span>
    </NavLink>
  );
}
