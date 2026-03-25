// frontend/src/App.jsx

import React, { useEffect } from "react"; 
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import { Provider } from "react-redux";
import { store } from "./app/store";

import { useRegisterSW } from 'virtual:pwa-register/react';

import ErrorBoundary from "./components/common/ErrorBoundary.jsx";

import VisitorLogin from "./features/auth/visitorLogin.jsx";
import VerifyPage from "./features/profile/VerifyPage.jsx";

import DashboardLayout from "./components/layout/dashboardLayout.jsx";
import Overview from "./features/dashboard/Overview.jsx";
import Dashboard from "./features/dashboard/Dashboard.jsx";
import Profile from "./features/profile/profile.jsx";
import SpeakerProfile from "./features/profile/SpeakerProfile.jsx";
import Events from "./features/events/Events.jsx";
import EventDetails from "./features/events/EventDetails.jsx";
import Speakers from "./features/events/Speakers.jsx";

import AdminLayout from "./components/layout/AdminLayout.jsx";
import AdminDashboard from "./features/admin/pages/AdminDashboard.jsx";
import AllEvents from "./features/admin/pages/AllEvents.jsx";
import UpcomingEvents from "./features/admin/pages/UpcomingEvents.jsx";
import PastEvents from "./features/admin/pages/PastEvents.jsx";
import ConferenceHall from "./features/admin/pages/ConferenceHall.jsx";
import SpeakersManagement from "./features/admin/pages/Speakers.jsx";

import ProtectedRoute from "./components/common/ProtectedRoute.jsx";
import { useCurrentUser } from "./hooks/useCurrentUser.js";
import EventManagers from "./features/admin/pages/EventManagers.jsx";
import Help from "./features/admin/pages/Help.jsx";
import Travels from "./features/travel/Travels.jsx";
import Hotels from "./features/hotel/Hotels.jsx";
import HotelMaster from "./features/admin/pages/HotelMaster.jsx";
import MyItinerary from "./features/itinerary/MyItinerary.jsx";

const ProfileWrapper = () => {
  const { data: currentUser } = useCurrentUser();
  const isSpeaker = currentUser?.role?.name?.toLowerCase() === "speaker";
  return isSpeaker ? <SpeakerProfile /> : <Profile />;
};

const App = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log("✅ PWA Service Worker Registered Successfully");
    },
    onRegisterError(error) {
      console.error("❌ SW Registration Error:", error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      toast.info(
        <div className="flex flex-col gap-2">
          <span className="font-bold text-sm">New App Version Available! 🚀</span>
          <button 
            onClick={() => updateServiceWorker(true)}
            className="bg-blue-600 text-white text-xs py-1 px-3 rounded shadow-sm hover:bg-blue-700 transition"
          >
            Update Now
          </button>
        </div>,
        { closeOnClick: false, autoClose: false }
      );
    }
  }, [needRefresh, updateServiceWorker]);

  useEffect(() => {
    const handleInstallPrompt = (e) => {
      e.preventDefault();
      console.log("📲 App is ready to be installed on home screen");
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
  }, []);

  return (
    <Provider store={store}>
      <ErrorBoundary>
        <BrowserRouter>
          <ToastContainer position="top-right" autoClose={3000} />

          <Routes>
            <Route path="/login" element={<VisitorLogin />} />
            <Route path="/verify/:accreditationId" element={<VerifyPage />} />

            <Route element={<ProtectedRoute allowedGroup="NORMAL" />}>
              <Route path="/" element={<DashboardLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="itinerary" element={<MyItinerary />} />
                <Route path="profile" element={<ProfileWrapper />} />
                <Route path="events/:eventId" element={<EventDetails />} />
                <Route path="travels" element={<Travels />} />
                <Route path="hotels" element={<Hotels />} />
                <Route path="help" element={<Help />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute allowedGroup="ADMIN" />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="profile" element={<Profile />} />
                <Route path="conference-halls" element={<ConferenceHall />} />
                <Route path="speakers" element={<SpeakersManagement />} />
                <Route path="events" element={<AllEvents />} />
                <Route path="events/:eventId" element={<EventDetails />} />
                <Route path="events/:eventId/speakers" element={<Speakers />} />
                <Route path="events/upcoming" element={<UpcomingEvents />} />
                <Route path="events/past" element={<PastEvents />} />
                <Route path="events/drafts" element={<p>Drafts</p>} />
                <Route path="help" element={<Help />} />
                <Route path="event-managers" element={<EventManagers />} />
                <Route path="hotel-master" element={<HotelMaster />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </Provider>
  );
};

export default App;