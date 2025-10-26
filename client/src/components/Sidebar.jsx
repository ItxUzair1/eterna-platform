// src/components/Sidebar.jsx
import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { ClipboardList, Image, Menu, LogOut } from "lucide-react";
import { Mail } from 'lucide-react'; // add icon import


export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div
      className={`${
        collapsed ? "w-20" : "w-64"
      } bg-gray-900 text-white min-h-screen flex flex-col justify-between transition-all duration-300`}
    >
      {/* ---- Top Section ---- */}
      <div>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h1 className={`${collapsed ? "hidden" : "block"} text-xl font-bold`}>MyApps</h1>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hover:bg-gray-800 p-2 rounded-md transition"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="mt-6 space-y-2">
          <NavLink
            to="/dashboard/todo"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2 rounded-md transition-all duration-200
              hover:bg-gray-800 ${
                isActive ? "bg-gray-800 text-indigo-400 font-semibold" : "text-gray-300"
              }`
            }
          >
            <ClipboardList className="w-5 h-5" />
            {!collapsed && <span>To-Do App</span>}
          </NavLink>

          <NavLink
            to="/dashboard/image-converter"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2 rounded-md transition-all duration-200
              hover:bg-gray-800 ${
                isActive ? "bg-gray-800 text-indigo-400 font-semibold" : "text-gray-300"
              }`
            }
          >
            <Image className="w-5 h-5" />
            {!collapsed && <span>Image Converter</span>}
          </NavLink>

          <NavLink
             to="/dashboard/email"
           className={({ isActive }) =>
             `flex items-center gap-3 px-4 py-2 rounded-md transition-all duration-200 hover:bg-gray-800 ${
              isActive ? 'bg-gray-800 text-indigo-400 font-semibold' : 'text-gray-300'
                   }`
                     }>
                       <Mail className="w-5 h-5" />
                         {!collapsed && <span>Email</span>}
            </NavLink>
        </nav>
      </div>

      {/* ---- Bottom Section (Logout) ---- */}
      <div className="border-t border-gray-700 p-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2 rounded-md text-red-400 hover:bg-gray-800 transition"
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}
