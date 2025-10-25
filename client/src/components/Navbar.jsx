import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();

  return (
    <nav className="bg-white shadow-md px-6 py-3 flex justify-end items-center">
      {/* Right: Notification + Avatar */}
      <div className="flex items-center gap-5">
        {/* Notification */}
        <button
          className="relative p-2 hover:bg-gray-100 rounded-full transition"
          title="Notifications"
        >
          <Bell size={22} className="text-gray-700" />
          <span className="absolute top-1 right-1 bg-red-500 text-white text-xs w-3 h-3 rounded-full" />
        </button>

        {/* Avatar */}
        <div
          onClick={() => navigate("/account-settings")}
          className="w-10 h-10 rounded-full overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-500 transition"
          title="Account Settings"
        >
          <img
            src="https://i.pravatar.cc/100"
            alt="User Avatar"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
