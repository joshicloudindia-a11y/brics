import Tabs from "./Tabs";
import Agenda from "../Agenda";
import Sessions from "../Sessions";
import Manager from "../Manager";
import DaoInvites from "../DaoInvites";
import TravelDetails from "../TravelDetails";
import HotelDetails from "../HotelDetails";
import ConferenceHall from "../ConferenceHall";
import { useCurrentUser } from "../../../hooks/useCurrentUser";

const EventDetailsTabs = () => {
  const { data } = useCurrentUser();
  const role = data?.role?.name || "";

  let tabs = [];

  if (role === "SUPER ADMIN") {
    tabs = [
      { id: "dao", label: "Invitees", content: <DaoInvites /> },
      { id: "sub", label: "Sessions", content: <Sessions /> },
      {
        id: "conference-hall",
        label: "Conference Hall",
        content: <ConferenceHall />,
      },
      { id: "travel", label: "Travel Details", content: <TravelDetails /> },
      { id: "hotel", label: "Hotel Accommodation", content: <HotelDetails /> },
      { id: "manager", label: "Manager", content: <Manager /> },
    ];
  } else if (role === "EVENT MANAGER") {
    tabs = [
      { id: "dao", label: "Invitees", content: <DaoInvites /> },
      { id: "sub", label: "Sessions", content: <Sessions /> },
      {
        id: "conference-hall",
        label: "Conference Hall",
        content: <ConferenceHall />,
      },
      { id: "travel", label: "Travel Details", content: <TravelDetails /> },
      { id: "hotel", label: "Hotel Accommodation", content: <HotelDetails /> },
    ];
  } else if (role === "DAO") {
    tabs = [
      { id: "dao", label: "Invitees", content: <DaoInvites /> },
      { id: "sub", label: "Sessions", content: <Sessions /> },
      { id: "travel", label: "Travel Details", content: <TravelDetails /> },
      { id: "hotel", label: "Hotel Accommodation", content: <HotelDetails /> },
    ];
  } else {
    tabs = [
      { id: "sub", label: "Sessions", content: <Sessions /> },
      { id: "travel", label: "Travel Details", content: <TravelDetails /> },
      { id: "hotel", label: "Hotel Accommodation", content: <HotelDetails /> },
    ];
  }

  // Default tab: Invites if present, else Sessions
  const defaultTab = tabs.find((tab) => tab.id === "dao") ? "dao" : "sub";

  return <Tabs tabs={tabs} defaultTab={defaultTab} />;
};

export default EventDetailsTabs;
