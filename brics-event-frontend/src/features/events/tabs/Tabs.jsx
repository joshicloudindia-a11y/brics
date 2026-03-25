import { useState } from "react";
import TabList from "./TabList";
import TabPanel from "./TabPanel";

const Tabs = ({ tabs, defaultTab }) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0].id);

  return (
    <div className="w-full mt-12">
      <TabList
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <TabPanel tabs={tabs} activeTab={activeTab} />
    </div>
  );
};

export default Tabs;
