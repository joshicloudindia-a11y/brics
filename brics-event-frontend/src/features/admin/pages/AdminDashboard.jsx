import { useCallback, useEffect, useState } from "react";
import StatCard from "../../../components/ui/StatCard";
import QuickActions from "../../../components/ui/QuickActions";
import CreateEventDrawer from "../components/CreateEventDrawer";
import { useNavigate } from "react-router-dom";
import {
  getEvents,
  getDashboardCounts,
  getManagerEvents,
} from "../../../services/events";
import { Calendar, Mic, Users } from "lucide-react";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { Plus } from "lucide-react";

const AdminDashboard = () => {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);

  const { data, isLoading: userLoading } = useCurrentUser();
  const navigate = useNavigate();

  const role = data?.role?.name;

  const isSuperAdmin = role === "SUPER ADMIN";
  const isEventManager = role === "EVENT MANAGER";
  const isDAO = role === "DAO";

  const normalizeManagerEvents = useCallback((payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.events)) return payload.events;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);

    try {
      if (isEventManager) {
        const managerRes = await getManagerEvents();
        const managerEvents = normalizeManagerEvents(managerRes);

        const aggregate = managerEvents.reduce(
          (acc, event) => {
            const dao = Number(
              event?.dao_invite_count ??
                event?.daoInviteCount ??
                event?.dao_count ??
                0,
            );
            const delegates = Number(
              event?.delegate_invite_count ??
                event?.delegateInviteCount ??
                event?.delegate_count ??
                0,
            );

            acc.totalDaoInvited += Number.isFinite(dao) ? dao : 0;
            acc.totalDelegatesInvited += Number.isFinite(delegates)
              ? delegates
              : 0;

            return acc;
          },
          { totalDaoInvited: 0, totalDelegatesInvited: 0 },
        );

        setEvents(managerEvents || []);
        setCounts({
          totalEvents: managerEvents.length,
          totalDelegatesInvited: aggregate.totalDelegatesInvited,
          totalDaoInvited: aggregate.totalDaoInvited,
          totalEventManagers: 0,
        });
      } else {
        const [eventsRes, countsRes] = await Promise.all([
          getEvents(),
          getDashboardCounts(),
        ]);

        setEvents(eventsRes || []);
        setCounts(countsRes || {});
      }
    } catch (error) {
      setEvents([]);
      setCounts({
        totalEvents: 0,
        totalDelegatesInvited: 0,
        totalDaoInvited: 0,
        totalEventManagers: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [isEventManager, normalizeManagerEvents]);

  useEffect(() => {
    if (userLoading) return;

    fetchAll();
  }, [userLoading, fetchAll]);

  useEffect(() => {
    if (!open && !userLoading) {
      fetchAll();
    }
  }, [open, userLoading, fetchAll]);

  const adminName =
    data?.user?.name ||
    `${data?.user?.first_name || ""} ${data?.user?.last_name || ""}`.trim() ||
    "User";

  return (
    <div className="mt-6 lg:ml-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-800">
            Welcome Back, {adminName}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage BRICS 2026 events and operations
          </p>
        </div>

        {(isSuperAdmin || isEventManager) && (
          <button
            onClick={() => setOpen(true)}
            className="bg-[#1e4788] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#163761] transition-colors w-full md:w-fit flex items-center gap-2"
          >
             <Plus size={16} />
            Create Event
          </button>
        )}
      </div>

      <CreateEventDrawer
        open={open}
        onClose={() => setOpen(false)}
        setEvents={setEvents}
      />

      {/* ================= STATS (REAL DATA) ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-4">

        {/* Total Events → everyone */}
        <StatCard
          title="Total Events"
          value={loading ? "—" : counts?.totalEvents || 0}
          icon={<Calendar />}
          onClick={() => navigate("/admin/events")}
        />

        {/* DAO + Event Manager + Super Admin */}
        {(isSuperAdmin || isEventManager || isDAO) && (
          <StatCard
            title="Total Delegates"
            value={loading ? "—" : counts?.totalDelegatesInvited || 0}
            icon={<Users />}
          />
        )}

        {/* Event Manager + Super Admin */}
        {(isSuperAdmin || isEventManager) && (
          <StatCard
            title="Total DAO's"
            value={loading ? "—" : counts?.totalDaoInvited || 0}
            icon={<Users />}
          />
        )}

        {/* Only Super Admin */}
        {isSuperAdmin && (
          <StatCard
            title="Total Managers"
            value={loading ? "—" : counts?.totalEventManagers || 0}
            icon={<Mic />}
          />
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-4">
        <QuickActions />
      </div>
    </div>
  );
};

export default AdminDashboard;

