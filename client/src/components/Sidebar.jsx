// src/components/Sidebar.jsx
import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import { ClipboardList, Image, Menu, LogOut, Mail } from "lucide-react";
import { Layout } from "lucide-react";


export default function Sidebar({
  isOpen,
  collapsed,
  onToggleCollapse,
  onCloseMobile,
}) {
  const navigate = useNavigate();
  const drawerRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && isOpen) onCloseMobile();
    };
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
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity sm:hidden ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!isOpen}
        onClick={onCloseMobile}
      />

      {/* Sidebar container */}
      <aside
        ref={drawerRef}
        className={`
          fixed left-0 top-0 bottom-0 z-50
          bg-gray-900 text-white
          ${baseWidth}
          flex flex-col justify-between
          transition-[width,transform] duration-300 will-change-transform
          sm:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"}
        `}
        aria-label="Sidebar"
      >
        {/* Top */}
        <div>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <h1 className={`${collapsed ? "sr-only" : "block"} text-xl font-bold`}>
              MyApps
            </h1>
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
            <SideItem
              to="/dashboard/todo"
              icon={<ClipboardList className="w-5 h-5" />}
              collapsed={collapsed}
              label="To-Do App"
            />
            <SideItem
              to="/dashboard/image-converter"
              icon={<Image className="w-5 h-5" />}
              collapsed={collapsed}
              label="Image Converter"
            />
            <SideItem
              to="/dashboard/email"
              icon={<Mail className="w-5 h-5" />}
              collapsed={collapsed}
              label="Email"
            />
            <SideItem
          to="/dashboard/kanban"
          icon={<Layout className="w-5 h-5" />}  // or: <span className="w-5 h-5">🗂️</span>
           collapsed={collapsed}
         label="Kanban"
           />
           <SideItem to="/dashboard/crm" icon={<Layout className="w-5 h-5" />} collapsed={collapsed} label="CRM" />
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

function SideItem({ to, icon, label, collapsed }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `
        group flex items-center gap-3 px-3 py-2 rounded-md transition-colors
        outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
        hover:bg-gray-800
        ${isActive ? "bg-gray-800 text-indigo-400 font-semibold" : "text-gray-300"}
      `
      }
      aria-current={({ isActive }) => (isActive ? "page" : undefined)}
      title={label}
    >
      <span aria-hidden="true">{icon}</span>
      <span className={collapsed ? "sr-only" : "block"}>{label}</span>
    </NavLink>
  );
}
