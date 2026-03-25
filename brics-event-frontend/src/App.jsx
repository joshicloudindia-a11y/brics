// frontend/src/App.jsx

import React from "react"; 
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { Provider } from "react-redux";
import { store } from "./app/store";
import axios from "axios"; 

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