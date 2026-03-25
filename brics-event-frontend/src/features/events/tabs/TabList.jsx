import TabButton from "./TabButton";

const TabList = ({ tabs, activeTab, onChange }) => {
  return (
    <div className="flex gap-4 sm:gap-8 md:gap-12 lg:gap-24 border-b border-[#E3E8F0] overflow-x-auto scrollbar-hide px-2 sm:px-0 font-semibold">
      {tabs.map((tab) => (
        <TabButton
          key={tab.id}
          tab={tab}
          isActive={activeTab === tab.id}
          onClick={() => onChange(tab.id)}
        /> 
      ))}
    </div>
  );
};

export default TabList;
