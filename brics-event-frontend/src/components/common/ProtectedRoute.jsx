import { Navigate, Outlet } from "react-router-dom";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import PageLoader from "./PageLoader";

const NORMAL_ROLES = [
  "dao",
  "delegate",
  "head of delegate",
  "security officer",
  "deputy",
  "delegation contact officer",
  "interpreter",
  "media",
  "speaker",
];
const ADMIN_ROLES = ["super admin", "event manager"];

const normalize = (v) => v?.toLowerCase().trim();

const ProtectedRoute = ({ allowedGroup }) => {
  const token = localStorage.getItem("token");
  const { data, isLoading, error } = useCurrentUser();

  /* NO TOKEN */
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  /* LOADING */
  if (isLoading) {
    return <PageLoader />;
  }

  /* API ERROR */
  if (error) {
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }

  /* ROLE FROM PROFILE */
  const role = normalize(data?.role?.name);

  /* INVALID ROLE */
  if (![...NORMAL_ROLES, ...ADMIN_ROLES].includes(role)) {
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }

  /* ACCESS CONTROL */
  if (allowedGroup === "NORMAL" && !NORMAL_ROLES.includes(role)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (allowedGroup === "ADMIN" && !ADMIN_ROLES.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
