import React, { useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

/**
 * Reusable Sortable Header Component
 * @param {Object} props - Component props
 * @param {string} props.column - Column identifier
 * @param {string} props.children - Header text/content
 * @param {function} props.onSort - Sort handler function
 * @param {Object} props.sortInfo - Current sort information { isActive, order }
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.style - Inline styles
 * @returns {JSX.Element} - Sortable header component
 */
const SortableHeader = ({
  column,
  children,
  onSort,
  sortInfo,
  className = "",
  style = {},
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (onSort) {
      onSort(column);
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <th
      className={`cursor-pointer hover:bg-gray-100 transition-colors select-none ${className}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={style}
      {...props}
    >
      <div className="flex items-center gap-1">
        <span>{children}</span>
        <SortIndicator
          isActive={sortInfo?.isActive}
          order={sortInfo?.order}
          isHovered={isHovered}
        />
      </div>
    </th>
  );
};

/**
 * Sort Indicator Component - Shows arrow indicators for sorting
 * @param {Object} props - Component props
 * @param {boolean} props.isActive - Whether this column is actively sorted
 * @param {string} props.order - Sort order ('asc' or 'desc')
 * @param {boolean} props.isHovered - Whether header is being hovered
 * @returns {JSX.Element|null} - Sort indicator or null
 */
const SortIndicator = ({ isActive, order, isHovered }) => {
  if (!isActive && !isHovered) return null;

  const activeColor = "#1f4788";
  const iconSize = 24;

  if (isActive) {
    return order === "asc" ? (
      <ArrowUp
        size={iconSize}
        className="inline"
        style={{ color: activeColor }}
      />
    ) : (
      <ArrowDown
        size={iconSize}
        className="inline"
        style={{ color: activeColor }}
      />
    );
  }

  // Show default up arrow on hover when not actively sorted
  return <ArrowUp size={iconSize} className="inline text-gray-400" />;
};

export default SortableHeader;
export { SortIndicator };