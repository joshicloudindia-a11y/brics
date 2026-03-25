import React from 'react';
import { ChevronRight, Clock, Plane, AlertCircle, Calendar } from 'lucide-react';

const PendingActions = ({ actions = [], onViewAll }) => {
  const getActionIcon = (type) => {
    switch (type) {
      case 'delegate-invitation':
        return <Clock className="w-4 h-4 text-[var(--color-warning)]" />;
      case 'travel-details':
        return <Plane className="w-4 h-4 text-[var(--color-info)]" />;
      case 'event-starting':
        return <Calendar className="w-4 h-4 text-[var(--color-success)]" />;
      default:
        return <AlertCircle className="w-4 h-4 text-[var(--color-text-secondary)]" />;
    }
  };

  const getActionButtonText = (type) => {
    switch (type) {
      case 'delegate-invitation':
        return 'Send Reminder';
      case 'travel-details':
        return 'Add Travel Details';
      case 'event-starting':
        return 'View Event';
      default:
        return 'View';
    }
  };

  const getActionButtonStyle = (type) => {
    switch (type) {
      case 'delegate-invitation':
        return 'text-[var(--color-primary-blue)] hover:text-[var(--color-primary-blue-dark)] hover:underline';
      case 'travel-details':
        return 'text-[var(--color-primary-blue)] hover:text-[var(--color-primary-blue-dark)] hover:underline';
      case 'event-starting':
        return 'text-[var(--color-primary-blue)] hover:text-[var(--color-primary-blue-dark)] hover:underline';
      default:
        return 'text-[var(--color-primary-blue)] hover:text-[var(--color-primary-blue-dark)] hover:underline';
    }
  };

  if (!actions || actions.length === 0) {
    return (
      <div className="bg-white rounded-xl  p-6">
        <div className="flex items-center justify-between mb-4">
          {/* <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
            Pending Actions
          </h3> */}
        </div>
        <p className="text-sm text-[var(--color-text-secondary)] py-8 text-center">
          No pending actions at this time
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl py-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base px-3 font-semibold text-[var(--color-primary-blue-dark)]">
          Pending Actions
        </h3>
        {onViewAll && actions.length > 4 && (
          <button
            onClick={onViewAll}
            className="text-sm font-medium text-[var(--color-primary-blue)] hover:text-[var(--color-primary-blue-dark)] flex items-center gap-1 transition-colors"
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-2">
        {actions.slice(0, 4).map((action, index) => (
          <div
            key={action.id || index}
            className="flex items-center justify-between py-2 last:border-b-0  hover:bg-[var(--color-background-light)]  rounded-lg transition-colors px-3"
          >
            <div className="flex items-start  flex-1 min-w-0">
              {/* <div className="mt-0.5">{getActionIcon(action.type)}</div> */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--color-primary-blue-dark)] font-medium">
                  {action.title}
                </p>
                {action.subtitle && (
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    {action.subtitle}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={action.onAction}
              className={`text-xs sm:text-sm font-medium whitespace-nowrap ml-3 ${getActionButtonStyle(action.type)}`}
            >
              {action.actionText || getActionButtonText(action.type)}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PendingActions;
