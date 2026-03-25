const QuickActionCard = ({ icon, label, onClick }) => {
  return (
    // <button className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all group">
      <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between bg-[#f9fafd] p-4 rounded-xl 
                  border-gray-200 hover:border-[#1f4788] hover:shadow-sm 
                 transition-all group w-full"
    >
      <div className="flex items-center gap-3 text-sm font-medium text-gray-700 group-hover:text-[#1f4788] transition-colors">
        <span className="text-[#1f4788] group-hover:text-[#1f4788] transition-colors">
          {icon}
        </span>
        {label}
      </div>
      <span className="text-gray-400 group-hover:text-[#1f4788] transition-colors text-lg">›</span>
    </button>
  );
};

export default QuickActionCard;
