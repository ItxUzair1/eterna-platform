// src/components/NavBar.jsx
import { Bell, Menu, CheckCircle2, AlertCircle, Info, XCircle, RefreshCw, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { getMe } from "../services/authService";
import { useNotifications } from '../context/NotificationContext.jsx';

export default function NavBar({ onToggleSidebar }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [openNotifications, setOpenNotifications] = useState(false);
  const dropdownRef = useRef(null);
  const { notifications, unreadCount, markAllRead, markRead, refresh } = useNotifications();
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenNotifications(false);
      }
    }
    if (openNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openNotifications]);

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
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => {
              setOpenNotifications((prev) => !prev);
              if (!openNotifications && unreadCount) {
                markAllRead();
              }
            }}
            className="relative p-2 rounded-full hover:bg-gray-100 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell size={22} className="text-gray-700" />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] leading-[12px] px-1 rounded-full"
                aria-hidden="true"
              >
                {unreadCount}
              </span>
            )}
            <span className="sr-only">You have notifications</span>
          </button>
          {openNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl z-50">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Notifications</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => refresh()}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                    title="Refresh notifications"
                  >
                    <RefreshCw size={14} />
                  </button>
                  <button
                    onClick={() => setOpenNotifications(false)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                    title="Close"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <div className="text-sm text-slate-500 dark:text-slate-400">No notifications yet.</div>
                  </div>
                ) : (
                  notifications.map((notification) => {
                    const payload = notification.payload || {};
                    const title = payload.title || 'Notification';
                    const message = payload.message || '';
                    const type = (notification.type || 'info').toLowerCase();
                    const isRead = !!notification.readAt;
                    
                    // Icon and color based on type
                    let Icon, bgColor, borderColor, textColor, iconColor;
                    switch (type) {
                      case 'success':
                        Icon = CheckCircle2;
                        bgColor = 'bg-emerald-50 dark:bg-emerald-900/20';
                        borderColor = 'border-emerald-200 dark:border-emerald-800';
                        textColor = 'text-emerald-900 dark:text-emerald-200';
                        iconColor = 'text-emerald-600 dark:text-emerald-400';
                        break;
                      case 'error':
                        Icon = XCircle;
                        bgColor = 'bg-red-50 dark:bg-red-900/20';
                        borderColor = 'border-red-200 dark:border-red-800';
                        textColor = 'text-red-900 dark:text-red-200';
                        iconColor = 'text-red-600 dark:text-red-400';
                        break;
                      case 'warning':
                        Icon = AlertCircle;
                        bgColor = 'bg-amber-50 dark:bg-amber-900/20';
                        borderColor = 'border-amber-200 dark:border-amber-800';
                        textColor = 'text-amber-900 dark:text-amber-200';
                        iconColor = 'text-amber-600 dark:text-amber-400';
                        break;
                      default:
                        Icon = Info;
                        bgColor = 'bg-blue-50 dark:bg-blue-900/20';
                        borderColor = 'border-blue-200 dark:border-blue-800';
                        textColor = 'text-blue-900 dark:text-blue-200';
                        iconColor = 'text-blue-600 dark:text-blue-400';
                    }
                    
                    return (
                      <div
                        key={notification.id}
                        onClick={() => {
                          if (!isRead) {
                            markRead(notification.id);
                          }
                        }}
                        className={`px-4 py-3 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer ${
                          !isRead ? 'bg-slate-50/50 dark:bg-slate-800/50' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${bgColor} ${borderColor} border flex items-center justify-center`}>
                            <Icon size={16} className={iconColor} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium ${!isRead ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>
                              {title}
                              {!isRead && (
                                <span className="ml-2 inline-block w-2 h-2 bg-indigo-500 rounded-full"></span>
                              )}
                            </div>
                            {message && (
                              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                                {message}
                              </div>
                            )}
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">
                              {new Date(notification.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              {notifications.length > 0 && unreadCount > 0 && (
                <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={() => markAllRead()}
                    className="w-full text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium py-1.5"
                  >
                    Mark all as read
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

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
