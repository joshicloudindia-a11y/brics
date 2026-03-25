import { TrendingUp } from 'lucide-react';

const StatCard = ({ title, value, subtitle, subtitleColor = "text-gray-500", icon, onClick, valueColor = "text-gray-800", compact = false,bgColor }) => {
  if (compact) {
    return (
      <div
        onClick={onClick}
        className={`bg-white rounded-xl border border-[var(--color-border)] shadow-sm p-4 sm:p-4 flex items-center justify-between gap-4 
                    ${onClick ? 'cursor-default hover:shadow-md hover:border-[var(--color-primary-blue-light)]' : ''} transition-all duration-200`}
      >
        <div className="flex flex-col min-w-0 flex-1">
          <p className="text-md font-medium text-[var(--color-text-secondary)]">{title}</p>
          <p className={`text-2xl mt-2  sm:text-4xl font-semibold ${valueColor}`}>{value}</p>
          {subtitle && (
            <div className="flex items-center gap-2 ">
              {
                subtitle.includes('month') && (
                  <span className="text-xs font-medium mt-1 bg-[#E3F2D9] text-[#005A00] px-4 rounded-md">
                    <TrendingUp width={16}/>
                  </span>
                )
              }
            <p className={`text-xs font-medium ${subtitleColor} mt-1`}>{subtitle}</p>
            </div>
          )}
        </div>

        {icon && (
          <div className={`flex-none flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full ${bgColor}`}>
            <span className="flex items-center justify-center text-[var(--color-text-tertiary)]">
              {icon}
            </span>
          </div>
        )}
      </div>
    );
  } 

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-[var(--color-border)] shadow-sm p-5 sm:p-6 
                  ${onClick ? 'cursor-pointer hover:shadow-md hover:border-[var(--color-primary-blue-light)]' : ''} 
                  transition-all duration-200`}
    >
      <div className="flex flex-col space-y-2">
        <p className="text-xs sm:text-sm font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
          {title}
        </p>
        <div className="flex items-baseline gap-2">
          <p className={`text-3xl sm:text-4xl font-bold ${valueColor}`}>
            {value}
          </p>
          {icon && <span className="text-[var(--color-text-tertiary)]">{icon}</span>}
        </div>
        {subtitle && (
          <p className={`text-xs sm:text-sm font-medium ${subtitleColor} mt-1`}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default StatCard;
