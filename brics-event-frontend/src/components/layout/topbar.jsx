import { Bell, HelpCircle, LogOut, Menu, User } from "lucide-react";
import bricsLogo from "../../assets/images/logo1.svg";
import national from "../../assets/images/national-emblem.svg";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { logout } from "../../utils/logout";

const VTopbar = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const { data, isLoading } = useCurrentUser();

  const [imageError, setImageError] = useState(false);

  if (isLoading) return null;

  const profileImage = data?.user?.documents?.photo_url;

  const profileCompletion = data?.profile_completion?.percentage || 0;

  const userName =
    `${data?.user?.first_name || ""} ${data?.user?.last_name || ""}`.trim() ||
    "Guest";

  const roleName = data?.role?.name || "Role Not Found";

  const handleProfileClick = () => {
    navigate("/profile");
  };

  return (
    <header className="h-16 bg-white  flex items-center justify-between px-4 sm:px-6">
      {/* LEFT */}
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="md:hidden text-gray-700">
          <Menu size={22} />
        </button>

        <div className="flex gap-3 items-center">
          <img
            src={bricsLogo}
            alt="BRICS Logo"
            className="w-[46px] h-[38px] md:w-[78px] md:h-[57px]"
          />
        </div>

        <span className="hidden sm:block text-sm text-gray-600">
          Welcome,{" "}
          <span className="font-semibold text-blue-600 capitalize">
            {userName}
          </span>
          <span className="bg-gradient-orange px-3 py-1 rounded-full ml-2">
            Role - {roleName}
          </span>
        </span>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-4">

       <Bell size={24} className="cursor-pointer text-gray-700" />

        <HelpCircle
          size={24}
          className="cursor-pointer text-gray-700"
          onClick={() => navigate("/help")}
        />


        {/* PROFILE IMAGE + COMPLETION */}
        <div onClick={handleProfileClick} className="relative cursor-pointer">
          <div className="w-9 h-9 rounded-full border flex items-center justify-center overflow-hidden bg-gray-100">
            {profileImage && !imageError ? (
              <img
                src={profileImage}
                alt="Profile"
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <User size={18} className="text-gray-500" />
            )}
          </div>

          <span
            className={`absolute -bottom-1 -right-1 text-[10px] font-semibold text-white px-1.5 py-0.5 rounded-full
              ${profileCompletion === 100 ? "bg-green-600" : "bg-orange-500"}
            `}
          >
            {profileCompletion}%
          </span>
        </div>

        <button
          className=" hidden md:flex items-center gap-1 text-red-600"
          onClick={logout}
        >
          <LogOut size={24} />
          <span className=" sm:block">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default VTopbar;
