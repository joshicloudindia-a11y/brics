const TabPanel = ({ tabs, activeTab }) => {
  const currentTab = tabs.find((tab) => tab.id === activeTab);

  return (
    <div className="pt-6">
      {currentTab?.content}
    </div>
  );
};

export default TabPanel;
