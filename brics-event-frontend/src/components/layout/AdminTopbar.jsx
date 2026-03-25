// frontend/src/components/layout/AdminTopbar.jsx

import { useEffect, useState, useRef } from "react";
import { Bell, HelpCircle, LogOut, Menu, User, Calendar, ShieldCheck, Mail, CheckCheck, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { logout } from "../../utils/logout";
import bricsLogo from "../../assets/images/logo1.svg";
import { toast } from "react-toastify";
import axios from "axios";

import { getMessaging, onMessage } from "firebase/messaging"; 
import { requestForToken } from "../../lib/firebase";

const AdminTopbar = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const { data, isLoading } = useCurrentUser();
  const [imageError, setImageError] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const listenerAttached = useRef(false);

  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem("brics_admin_notifs");
    return saved ? JSON.parse(saved) : [];
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    localStorage.setItem("brics_admin_notifs", JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    const registerPushToken = async () => {
      const isRegisteredInSession = sessionStorage.getItem("fcm_synced");
      
      if (!data || !data.user || isRegisteredInSession) {
        console.log("ℹ️ FCM already synced or data missing. Skipping API call.");
        return;
      }

      try {
        console.log("Attempting to get Firebase FCM Token...");
        const token = await requestForToken();
        
        if (token) {
          const authToken = localStorage.getItem("token"); 
          if (authToken) {
            await axios.post('http://localhost:3000/api/auth/update-fcm-token', 
              { fcmToken: token }, 
              { headers: { Authorization: `Bearer ${authToken}` } }
            );
            sessionStorage.setItem("fcm_synced", "true");
            console.log("✅ FCM Token successfully synced with backend.");
          }
        }
      } catch (err) {
        console.error("❌ Token Registration Failed:", err.message);
      }
    };

    if (data) {
      registerPushToken();
    }
  }, [data?.user?.id]);  

  useEffect(() => {
    let unsubscribe;
    const setupListener = async () => {
      try {
        const messaging = getMessaging();
        if (listenerAttached.current) return;
        listenerAttached.current = true;

        unsubscribe = onMessage(messaging, (payload) => {
          console.log("🔔 New Push Received:", payload);
          const messageId = payload.messageId || Date.now().toString();
          
          setNotifications((prev) => {
            if (prev.find(n => n.msgId === messageId)) return prev;

            const title = payload.notification?.title || payload.data?.title || "Alert";
            const body = payload.notification?.body || payload.data?.body || "Update.";
            
            const newNotif = {
              id: Date.now(),
              msgId: messageId, 
              title,
              body,
              isRead: false,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            toast.info(
              <div className="flex flex-col cursor-pointer" onClick={() => setIsDropdownOpen(true)}>
                <span className="font-bold text-sm">🔔 {title}</span>
                <span className="text-xs line-clamp-1">{body}</span>
              </div>,
              { icon: false }
            );

            return [newNotif, ...prev].slice(0, 30);
          });
        });
      } catch (err) { console.error("Messaging setup error:", err); }
    };
    setupListener();
    return () => {
      if (unsubscribe) {
        unsubscribe();
        listenerAttached.current = false;
      }
    };
  }, []);

  const handleMarkAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const handleMarkAllRead = (e) => {
    e.stopPropagation();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleClearAll = (e) => {
    e.stopPropagation();
    if(window.confirm("Are you sure?")) setNotifications([]);
  };

  if (isLoading) return null;

  const adminName = data?.user?.name || "Super Admin";
  const roleName = data?.role?.name || "Admin";
  const profileImage = data?.user?.documents?.photo_url;
  const profileCompletion = data?.profile_completion?.percentage || 0;

  return (
    <header className="h-16 bg-white flex items-center justify-between px-4 sm:px-6 fixed top-0 left-0 right-0 z-[100] border-b shadow-sm">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="md:hidden text-gray-700 hover:bg-gray-100 p-1.5 rounded-md border">
          <Menu size={22} />
        </button>
        <img src={import.meta.env.VITE_APP_BRICS_LOGO || bricsLogo} alt="BRICS Logo" className="w-[46px] h-[38px] md:w-[78px] md:h-[57px]" />
        <span className="hidden sm:block text-sm text-gray-600">
          Welcome, <span className="font-semibold text-[#1f4788] capitalize">{adminName}</span>
          <span className="bg-gradient-orange px-3 py-1 rounded-full ml-2 text-black text-xs font-bold shadow-sm">Role - {roleName}</span>
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm relative">
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="p-2 text-gray-700 hover:bg-gray-100 rounded-full transition-all relative"
          >
            <Bell size={24} className={unreadCount > 0 ? "text-blue-600 animate-pulse" : "text-gray-700"} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 bg-red-600 text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center border-2 border-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {isDropdownOpen && (
            <>
              <div className="fixed inset-0 z-[99]" onClick={() => setIsDropdownOpen(false)}></div>
              <div className="fixed left-4 right-4 md:absolute md:left-auto md:right-0 mt-3 w-auto md:w-96 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[1000] overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-gray-100 bg-white flex justify-between items-center">
                  <h3 className="font-extrabold text-gray-900 text-sm">ALERTS {unreadCount > 0 && <span className="ml-1 text-blue-600">({unreadCount})</span>}</h3>
                  <div className="flex gap-2">
                    <button onClick={handleMarkAllRead} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><CheckCheck size={18}/></button>
                    <button onClick={handleClearAll} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                  </div>
                </div>
                <div className="max-h-[60vh] md:max-h-[420px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-16 text-center text-gray-300 italic text-xs">No activity alerts.</div>
                  ) : (
                    notifications.map((notif) => (
                      <div key={notif.id} onClick={() => handleMarkAsRead(notif.id)} className={`p-4 border-b border-gray-50 transition-all cursor-pointer relative ${notif.isRead ? 'bg-white opacity-50' : 'bg-blue-50/40'}`}>
                        <div className="flex gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${notif.isRead ? 'bg-gray-100' : 'bg-blue-100 text-blue-600'}`}>
                            {notif.isRead ? <Mail size={18} /> : <ShieldCheck size={18} />}
                          </div>
                          <div className="flex-1 min-w-0"> 
                            <div className="flex justify-between items-start mb-0.5">
                              <h4 className={`text-[13px] truncate pr-4 ${notif.isRead ? 'font-medium' : 'font-bold text-gray-900'}`}>{notif.title}</h4>
                              <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">{notif.time}</span>
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-2">{notif.body}</p>
                          </div>
                          {!notif.isRead && <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-3 border-t flex justify-center bg-gray-50/50">
                  <button onClick={() => setIsDropdownOpen(false)} className="text-xs font-bold text-gray-500 hover:text-gray-700">CLOSE PANEL</button>
                </div>
              </div>
            </>
          )}
        </div>

        <HelpCircle size={24} className="cursor-pointer text-gray-700 hidden md:block hover:text-blue-600" onClick={() => navigate("/admin/help")} />

        <div onClick={() => navigate("/admin/profile")} className="relative cursor-pointer">
          <div className="w-10 h-10 rounded-full border-2 border-gray-100 overflow-hidden bg-gray-100">
            {profileImage && !imageError ? <img src={profileImage} alt="Profile" className="w-full h-full object-cover" onError={() => setImageError(true)} /> : <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-500 rounded-full"><User size={20} /></div>}
          </div>
          <div className={`absolute -bottom-1 -right-1 h-5 w-5 flex items-center justify-center border-2 border-white rounded-full text-[8px] font-black text-white shadow-sm ${profileCompletion === 100 ? "bg-green-500" : "bg-orange-500"}`}>{profileCompletion}%</div>
        </div>

        <button className="hidden md:flex items-center gap-1.5 text-red-500 font-bold hover:bg-red-50 py-2 px-3 rounded-xl transition-all" onClick={logout}>
          <LogOut size={20} />
          <span className="hidden lg:block text-sm">Sign Out</span>
        </button>
      </div>
    </header>
  );
};

export default AdminTopbar;