import { CalendarPlus, Users, Mic, FileText } from "lucide-react";
import { useState } from "react";
import QuickActionCard from "./QuickActionCard";
import CreateEventDrawer from "../../features/admin/components/CreateEventDrawer";
import AddManagers from "../../features/admin/components/AddManagers";
import { useCurrentUser } from "../../hooks/useCurrentUser";

const QuickActions = () => {
  const [openCreateEvent, setOpenCreateEvent] = useState(false);
  const [openAddManager, setOpenAddManager] = useState(false);

  const { data } = useCurrentUser();
  const isEventManager = data?.role?.name === "EVENT MANAGER";

  return (
    <div className="bg-white rounded-xl border shadow-sm p-5">
      <h3 className="text-sm text-gray-800 mb-4">Quick Actions</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickActionCard
          icon={<CalendarPlus size={19} />}
          label="Create Event"
          onClick={() => setOpenCreateEvent(true)}
        />

        <QuickActionCard icon={<Users size={19} />} label="Invite Team" />

        {/* Only Admin / Super Admin */}
        {!isEventManager && (
          <QuickActionCard
            icon={<Mic size={19} />}
            label="Add Managers"
            onClick={() => setOpenAddManager(true)}
          />
        )}

        <QuickActionCard icon={<FileText size={19} />} label="View Reports" />
      </div>

      <CreateEventDrawer
        open={openCreateEvent}
        onClose={() => setOpenCreateEvent(false)}
      />

      {!isEventManager && (
        <AddManagers
          open={openAddManager}
          onClose={() => setOpenAddManager(false)}
        />
      )}
    </div>
  );
};

export default QuickActions;
