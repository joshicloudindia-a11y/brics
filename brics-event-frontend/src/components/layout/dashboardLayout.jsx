import { useState } from "react";
import Sidebar from "./sidebar";
import Topbar from "./topbar";
import { Outlet } from "react-router-dom";

const DashboardLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col ">
      {/* TOPBAR */}
      <header className="h-16 w-full flex-shrink-0 bg-white  z-30">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
      </header>

      {/* BELOW TOPBAR */}
      <div className="flex flex-1 overflow-hidden ">

        {/* SIDEBAR */}
        <Sidebar
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
        <div className="lg:pb-4 lg:pr-4 md:pl-0 lg:pl-4 flex-1 overflow-y-auto">
        {/* MAIN CONTENT */}
        <main className="flex-1 lg:rounded-2xl overflow-y-auto px-4 h-full bg-gradient-dashboard ">
          <Outlet />
        </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
