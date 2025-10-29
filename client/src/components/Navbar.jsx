// src/components/NavBar.jsx
import { Bell, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function NavBar({ onToggleSidebar }) {
  const navigate = useNavigate();

  return (
    <nav
      className="bg-white/90 backdrop-blur shadow-sm px-4 sm:px-6 h-14 flex items-center justify-between sticky top-0 z-30"
      role="navigation"
      aria-label="Top navigation"
    >
      {/* Left: mobile hamburger */}
      <button
        onClick={onToggleSidebar}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-gray-100 active:bg-gray-200 sm:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5 text-gray-700" />
      </button>

      <div className="flex-1" />

      {/* Right: Notification + Avatar */}
      <div className="flex items-center gap-3 sm:gap-5">
        <button
          className="relative p-2 rounded-full hover:bg-gray-100 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell size={22} className="text-gray-700" />
          <span
            className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px] leading-[12px] w-3 h-3 rounded-full"
            aria-hidden="true"
          />
          <span className="sr-only">You have new notifications</span>
        </button>

        <button
          onClick={() => navigate("account-settings")}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-500 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          title="Account Settings"
          aria-label="Account Settings"
        >
          <img
            src="https://i.pravatar.cc/100"
            alt="User avatar"
            className="w-full h-full object-cover"
          />
        </button>
      </div>
    </nav>
  );
}
