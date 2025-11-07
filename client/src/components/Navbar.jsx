// src/components/NavBar.jsx
import { Bell, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getMe } from "../services/authService";

export default function NavBar({ onToggleSidebar }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const me = await getMe();
        setUser(me);
      } catch (err) {
        console.error('Failed to load user:', err);
      }
    })();
  }, []);

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
          {user?.photoUrl ? (
            <img
              src={user.photoUrl}
              alt="User avatar"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to avatar if image fails to load
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent((user.firstName || '') + ' ' + (user.lastName || '') || user.username || 'User')}&background=indigo&color=fff&size=128`;
              }}
            />
          ) : (
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent((user?.firstName || '') + ' ' + (user?.lastName || '') || user?.username || 'User')}&background=indigo&color=fff&size=128`}
              alt="User avatar"
              className="w-full h-full object-cover"
            />
          )}
        </button>
      </div>
    </nav>
  );
}
