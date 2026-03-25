import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, CalendarDays, Users as UsersIcon, AlertTriangle,CalendarCheck, Luggage,BedDouble} from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import PendingActions from './PendingActions';
import UpcomingEventsTable from './UpcomingEventsTable';
import UpcomingEventsCards from './UpcomingEventsCards';
import PageLoader from '../../components/common/PageLoader';
import InviteDelegatesDrawer from '../delegates/InviteDelegatesDrawer';
import TravelDetailsDrawer from '../travel/TravelDetailsDrawer';
import { getDashboardCounts, attendEventList } from '../../services/events';
import { useCurrentUser } from '../../hooks/useCurrentUser';
const Overview = () => {
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();

  // State management for drawers
  const [openInviteDrawer, setOpenInviteDrawer] = useState(false);
  const [openTravelDrawer, setOpenTravelDrawer] = useState(false);
  const [delegates, setDelegates] = useState([]);

  // Fetch dashboard counts
  const { data: dashboardData, isLoading: countsLoading } = useQuery({
    queryKey: ['dashboard-counts'],
    queryFn: getDashboardCounts,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  // Fetch user events
  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['user-events-overview'],
    queryFn: attendEventList,
    staleTime: 1000 * 60 * 5,
  });

  // Process events data: keep both the full list and the upcoming list
  const allEvents = useMemo(() => {
    return Array.isArray(eventsData)
      ? eventsData
      : Array.isArray(eventsData?.events)
      ? eventsData.events
      : Array.isArray(eventsData?.data)
      ? eventsData.data
      : [];
  }, [eventsData]);

  const upcomingEvents = useMemo(() => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return allEvents
        .filter((event) => {
          if (!event?.start_date) return false;
          const startDate = new Date(event.start_date);
          startDate.setHours(0, 0, 0, 0);
          return startDate >= today;
        })
        .sort((a, b) => {
          const dateA = new Date(a.start_date || 0);
          const dateB = new Date(b.start_date || 0);
          return dateA - dateB;
        });
    } catch (e) {
      return [];
    }
  }, [allEvents]);

  // Extract next event details after events are processed
  const eventId = upcomingEvents?.[0]?._id || upcomingEvents?.[0]?.event_id || null;
  const maxDelegates = upcomingEvents?.[0]?.delegate_count || 0;
  const delegateCount = upcomingEvents?.[0]?.total_delegates || 0;

  // Generic role checker
  const hasRole = (role) => {
    if (!currentUser || !currentUser.role) return false;
    // Support both string and object role
    if (typeof currentUser.role === 'string') {
      return currentUser.role.toLowerCase() === role.toLowerCase();
    }
    if (typeof currentUser.role.name === 'string') {
      return currentUser.role.name.toLowerCase() === role.toLowerCase();
    }
    return false;
  };

  // Define isDAO variable
  const isDAO = hasRole('dao');

  // Calculate statistics
  const stats = useMemo(() => {
    const totalEvents = dashboardData?.data?.total_events || allEvents.length || 0;
    const upcomingCount = upcomingEvents.length;
    const apiEventsThisMonth = dashboardData?.data?.events_this_month;
    const eventsThisMonth =
      typeof apiEventsThisMonth === 'number'
        ? apiEventsThisMonth
        : upcomingEvents.reduce((count, ev) => {
            try {
              if (!ev?.start_date) return count;
              const sd = new Date(ev.start_date);
              const today = new Date();
              if (sd.getFullYear() === today.getFullYear() && sd.getMonth() === today.getMonth()) {
                return count + 1;
              }
            } catch (e) {
              // ignore parse errors
            }
            return count;
          }, 0);
    const delegatesInvited =
      typeof dashboardData?.data?.delegates_invited === 'number'
        ? dashboardData.data.delegates_invited
        : allEvents.reduce(
            (sum, ev) => sum + (ev?.total_delegates ?? ev?.delegate_invite_count ?? 0),
            0,
          );

    const delegatesAccepted =
      typeof dashboardData?.data?.delegates_accepted === 'number'
        ? dashboardData.data.delegates_accepted
        : 0;
    const pendingActionsCount = dashboardData?.data?.pending_actions || 0;

    // Calculate next event start time based on upcoming events
    let nextEventText = '';
    if (upcomingEvents.length > 0 && upcomingEvents[0]?.start_date) {
      const nextEventDate = new Date(upcomingEvents[0].start_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      nextEventDate.setHours(0, 0, 0, 0);

      const diffTime = nextEventDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        nextEventText = 'Event starts today';
      } else if (diffDays === 1) {
        nextEventText = 'Next event starts tomorrow';
      } else if (diffDays > 1) {
        nextEventText = `Next event starts in ${diffDays} days`;
      }
    }

    return {
      totalEvents,
      upcomingCount,
      eventsThisMonth,
      delegatesInvited,
      delegatesAccepted,
      pendingActionsCount,
      nextEventText,
    };
  }, [dashboardData, allEvents, upcomingEvents]);

  // Generate pending actions
  const pendingActions = useMemo(() => {
    const actions = [];

    // Check for events with pending delegate invitations
    allEvents.forEach((event) => {
      if (event.delegate_count && event.total_delegates < event.delegate_count) {
        actions.push({
          id: `delegate-${event._id || event.event_id}`,
          type: 'delegate-invitation',
          title: `Delegate invitation pending - ${event.name}`,
          subtitle: `${event.total_delegates || 0}/${event.delegate_count} delegates invited`,
          actionText: 'Send Reminder',
          onAction: () => navigate(`/events/${event._id || event.event_id}`),
        });
      }
    });

    // Check for events starting soon without travel details
    const now = new Date();
    allEvents.forEach((event) => {
      if (!event.start_date) return;

      const startDate = new Date(event.start_date);
      const daysUntilStart = Math.ceil((startDate - now) / (1000 * 60 * 60 * 24));

      // If event starts within 7 days and user hasn't added travel details
      if (daysUntilStart >= 0 && daysUntilStart <= 7) {
        const hasTravelDetails = event.has_travel_details || false;

        if (!hasTravelDetails) {
          actions.push({
            id: `travel-${event._id || event.event_id}`,
            type: 'travel-details',
            title: 'Travel details not added for you',
            subtitle: null,
            actionText: 'Add Travel Details',
            onAction: () => navigate('/travel-details'),
          });
        }

        // Check if delegates haven't added travel details
        const delegatesWithoutTravel = event.delegates_without_travel || 0;
        if (delegatesWithoutTravel > 0) {
          actions.push({
            id: `delegate-travel-${event._id || event.event_id}`,
            type: 'travel-details',
            title: `${delegatesWithoutTravel} delegate${
              delegatesWithoutTravel > 1 ? 's have' : ' has'
            } not added travel details`,
            subtitle: null,
            actionText: 'Add Travel Details',
            onAction: () => navigate(`/events/${event._id || event.event_id}`),
          });
        }
      }

      // Event starting soon notification
      if (daysUntilStart >= 0 && daysUntilStart <= 2) {
        actions.push({
          id: `starting-${event._id || event.event_id}`,
          type: 'event-starting',
          title: `${event.name} starts in ${daysUntilStart} day${
            daysUntilStart !== 1 ? 's' : ''
          }`,
          subtitle: null,
          actionText: 'View Event',
          onAction: () => navigate(`/events/${event._id || event.event_id}`),
        });
      }
    });

    return actions;
  }, [allEvents, navigate]);

  // Define generic quick actions config with custom SVG icons
  const quickActionsConfig = [
    {
      key: 'addDelegate',
      label: 'Add Delegate',
      icon: (
        <svg 
          width="28" 
          height="28" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <line x1="20" y1="8" x2="20" y2="14"/>
          <line x1="23" y1="11" x2="17" y2="11"/>
        </svg>
      ),
      roles: ['super admin', 'event manager', 'admin', 'dao'],
      onClick: () => setOpenInviteDrawer(true),
    },
    {
      key: 'addTravel',
      label: 'Add Travel Details',
      icon: ( <Luggage />
),
      roles: ['super admin', 'event manager', 'admin', 'dao'],
      onClick: () => setOpenTravelDrawer(true),
    },
    {
      key: 'viewNextEvent',
      label: 'View Next Event',
      icon: (
          <BedDouble />
      ),
      roles: ['super admin', 'event manager', 'admin', 'dao', 'delegate'],
      onClick: () => eventId && navigate(`/events/${eventId}`),
    },
  ];

  // Filter actions by user role
  const normalizedRole = (currentUser?.role?.name || currentUser?.role || '').toLowerCase();
  const availableActions = quickActionsConfig.filter((action) =>
    action.roles.includes(normalizedRole)
  );

  const isLoading = countsLoading || eventsLoading;

  if (isLoading) {
    return <PageLoader />;
  }

  // Prepare subtitle for Upcoming Events card to ensure consistent string value
  const upcomingSubtitle = (() => {
    if (stats.nextEventText) return stats.nextEventText;
    if (!upcomingEvents || upcomingEvents.length === 0) return null;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Prefer the nearest event whose start_date is today or in the future
      const nextEvent = upcomingEvents.find((ev) => {
        if (!ev?.start_date) return false;
        const sd = new Date(ev.start_date);
        sd.setHours(0, 0, 0, 0);
        return sd >= today;
      }) || upcomingEvents[0];

      if (!nextEvent || !nextEvent.start_date) return null;

      const nextEventDate = new Date(nextEvent.start_date);
      nextEventDate.setHours(0, 0, 0, 0);
      const diffTime = nextEventDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Event starts today';
      if (diffDays === 1) return 'Next event starts tomorrow';
      if (diffDays > 1) return `Next event starts in ${diffDays} days`;
      return null;
    } catch (e) {
      return null;
    }
  })();
  console.log('upcomingSubtitle:==============', upcomingSubtitle)



  return (
    <div className="min-h-screen py-6 sm:px-6">
      <div className="max-w-[1400px] mx-auto space-y-4 flex-1 flex flex-col overflow-visible">
        {/* Header */}
        <div className=" rounded-xl  py-4 shrink-0">
          <h1 className="text-2xl sm:text-2xl font-bold text-gray-900">Overview</h1>
          <p className="text-base text-gray-600 mt-1 ">
            Overview of upcoming events and pending actions
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          <StatCard
            compact
            title="Total Events"
            value={stats.totalEvents}
            subtitle={stats.eventsThisMonth > 0 ? `+${stats.eventsThisMonth} this month` : null}
            subtitleColor="text-[#64748B]"
            icon={<CalendarDays className="w-7 h-7 text-[#4B3A8F]" />}
            onClick={() => navigate('/dashboard')}
            bgColor="bg-[#F6F3FC]"
          />

          <StatCard
            compact
            title="Upcoming Events"
            value={stats.upcomingCount}
            subtitle={upcomingSubtitle}
            subtitleColor="text-gray-600"
            icon={<CalendarCheck className="w-7 h-7 text-[#4B5A2A]" />}
            onClick={() => navigate('/dashboard')}
            bgColor="bg-[#F1F4EA]"
          />

          <StatCard
            compact
            title="Delegates Invited"
            value={stats.delegatesInvited}
            subtitle={
              stats.delegatesAccepted > 0 ? `${stats.delegatesAccepted} Accepted` : null
            }
            subtitleColor="text-gray-600"
            icon={<UsersIcon className="w-7 h-7 text-[#F58220]" />}
            // onClick={() => navigate('/delegates')}
            bgColor="bg-[#FFF4EB]"

          />

          <StatCard
            compact
            title="Pending Actions"
            value={stats.pendingActionsCount || pendingActions.length}
            // subtitle={
            //   (stats.pendingActionsCount || pendingActions.length) > 0
            //     ? 'Require Attention'
            //     : null
            // }
            // subtitleColor="text-red-600"
            // valueColor="text-red-600"
            icon={<AlertTriangle className="w-7 h-7 text-[#B7131A]" />}
            bgColor="bg-[#FFEEEA]"
          />
        </div>

        {/* Pending Actions and Quick Actions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-auto">
          {/* Pending Actions - Takes 2 columns on large screens */}
          <div className="lg:col-span-2 flex flex-col h-full">
            <div className="bg-white rounded-xl shadow-sm flex flex-col h-full">
              <div className="flex-1 flex flex-col justify-center text-sm px-4">
                <PendingActions
                  actions={pendingActions}
                  onViewAll={() => navigate('/dashboard')}
                />
              </div>
            </div>
          </div>

          {/* Quick Actions - Takes 1 column on large screens */}
          <div className="lg:col-span-1 flex flex-col h-full">
            <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col h-full">
              <h3 className="text-base font-semibold mb-3 text-[var(--color-primary-blue-dark)]">Quick Actions</h3>
              <div className="flex flex-col gap-4 flex-1 justify-center">
                {availableActions.map((action) => (
                  <button
                    key={action.key}
                    onClick={action.onClick}
                    disabled={action.key === 'viewNextEvent' && !eventId}
                    className="flex items-center gap-8 bg-[#F8FAFD] hover:bg-[#E3EBF6] transition-all duration-200 p-3 rounded-lg group disabled:opacity-50 disabled:cursor-not-allowed w-full"
                  >
                    <span className="bg-[#F1F4F9] p-2 rounded-lg text-[#1E4A8B] flex items-center justify-center shadow-sm min-w-[40px] min-h-[40px]">
                      {action.icon}
                    </span>
                    <span className="flex-1 text-left text-sm font-medium text-[#1E4A8B]">{action.label}</span>
                    <span className="text-[#1E4A8B] text-2xl font-light leading-none group-hover:translate-x-1 transition-transform duration-200">›</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Events Table - Show on all screens */}
        <div className="shrink-0">
          <UpcomingEventsTable
            events={upcomingEvents}
            onViewAll={() => navigate('/events')}
            onViewEvent={(event) => navigate(`/events/${event._id || event.event_id}`)}
          />
        </div>

        {/* Upcoming Events Cards */}
        <div className="shrink-0">
          <UpcomingEventsCards
            events={upcomingEvents}
            onViewEvent={(event) => navigate(`/events/${event._id || event.event_id}`)}
          />
        </div>
      </div>

      {/* Drawers */}
      <InviteDelegatesDrawer
        open={openInviteDrawer}
        onClose={() => setOpenInviteDrawer(false)}
        delegates={delegates}
        setDelegates={setDelegates}
        maxDelegates={maxDelegates}
        eventId={eventId}
        delegateCount={delegateCount}
      />
      <TravelDetailsDrawer
        open={openTravelDrawer}
        onClose={() => setOpenTravelDrawer(false)}
      />
    </div>
  );
};

export default Overview;
