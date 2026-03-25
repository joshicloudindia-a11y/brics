const TabButton = ({ tab, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`
        relative pb-2 sm:pb-3 font-medium transition-colors text-sm sm:text-sm whitespace-nowrap
        ${
          isActive
            ? "text-[#1f4788] hover:text-[#1f4788]"
            : "text-[#4E5C73] hover:text-[#5E5C73]"
        }
      `}
    >
      {tab.label}

      {isActive && (
        <span className="absolute left-0 -bottom-[1px] h-[2px] w-full bg-[#1f4788] " />
      )}
    </button>
  );
};

export default TabButton;
