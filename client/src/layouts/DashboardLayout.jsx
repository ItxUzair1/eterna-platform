// src/layouts/DashboardLayout.jsx
import Sidebar from "../components/Sidebar";
import NavBar from "../components/NavBar";
import { Outlet } from "react-router-dom";
import { useState, useCallback, useMemo } from "react";

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);  // desktop collapse
  const [mobileOpen, setMobileOpen] = useState(false); // mobile drawer

  const toggleCollapse = useCallback(() => setCollapsed((c) => !c), []);
  const toggleMobile = useCallback(() => setMobileOpen((o) => !o), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const sidebarWidthClass = useMemo(
    () => (collapsed ? "sm:pl-20" : "sm:pl-64"),
    [collapsed]
  );

  return (
    <div className="h-screen bg-gray-100">
      <Sidebar
        isOpen={mobileOpen}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        onCloseMobile={closeMobile}
      />

      <div className={`flex flex-col min-h-screen ${sidebarWidthClass} transition-[padding] duration-300`}>
        <NavBar onToggleSidebar={toggleMobile} />

        <main className="flex-1 p-4 sm:p-6 overflow-y-auto bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
