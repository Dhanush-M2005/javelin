// javelin-tracker-frontend/src/App.jsx
import React, { useState, useEffect } from "react";
import Header from "./components/layout/Header";
import SciChart3DComponent from "./components/dashboard/SciChart3DComponent";
import { fetchAvailableDates, fetchJavelinDataByDate } from "./services/api";
import CalendarFilter from "./components/dashboard/CalendarFilter";
import Sidebar from "./components/layout/Sidebar";

function App() {
  const [allAvailableDates, setAllAvailableDates] = useState([]);
  const [selectedThrows, setSelectedThrows] = useState({});
  const [comparisonData, setComparisonData] = useState([]);
  const [sidebarStats, setSidebarStats] = useState({});
  const [sidebarThrowDetails, setSidebarThrowDetails] = useState(null);
  const [comparisonStats, setComparisonStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [visibility, setVisibility] = useState({});

  // --- NEW: State for managing mobile sidebar visibility ---
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);

  // Load available dates
  useEffect(() => {
    const getDates = async () => {
      try {
        const dates = await fetchAvailableDates();
        setAllAvailableDates(dates);
      } catch (error) {
        console.error("Failed to fetch dates:", error);
      }
    };
    getDates();
  }, []);

  // Load data for selected throws
  useEffect(() => {
    const datesToFetch = Object.keys(selectedThrows);
    const totalSelectedCount = Object.values(selectedThrows).reduce(
      (acc, throwsArr) => acc + throwsArr.length,
      0
    );

    if (totalSelectedCount === 0) {
      setComparisonData([]);
      setSidebarStats({});
      setSidebarThrowDetails(null);
      setComparisonStats([]);
      setVisibility({});
      return;
    }

    const getDataForComparison = async () => {
      setLoading(true);
      try {
        const dateDataPromises = datesToFetch.map((date) =>
          fetchJavelinDataByDate(date)
        );
        const fetchedDateResults = await Promise.all(dateDataPromises);
        const dateDataMap = new Map(
          datesToFetch.map((date, i) => [date, fetchedDateResults[i]])
        );

        const newChartData = [];
        const newComparisonStats = [];

        for (const date in selectedThrows) {
          const selectedIndices = selectedThrows[date];
          const dateData = dateDataMap.get(date);
          if (dateData?.throws) {
            selectedIndices.forEach((throwIndex) => {
              const throwData = dateData.throws[throwIndex];
              if (throwData) {
                const throwId = `${date} - Throw ${throwIndex + 1}`;
                newChartData.push({
                  id: throwId,
                  trajectory: throwData.trajectory,
                });
                newComparisonStats.push({
                  id: throwId,
                  date,
                  throwNum: throwIndex + 1,
                  time: throwData.time,
                  playerStats: throwData.playerStats,
                });
              }
            });
          }
        }

        setComparisonData(newChartData);
        setComparisonStats(newComparisonStats);

        setVisibility((prev) => {
          const merged = {};
          newComparisonStats.forEach((stat) => {
            merged[stat.id] = prev.hasOwnProperty(stat.id) ? prev[stat.id] : true;
          });
          return merged;
        });

        if (totalSelectedCount === 1) {
          const singleThrow = newComparisonStats[0];
          setSidebarStats(singleThrow.playerStats);
          setSidebarThrowDetails({
            date: singleThrow.date,
            throwNum: singleThrow.throwNum,
            time: singleThrow.time,
          });
        } else {
          setSidebarStats({});
          setSidebarThrowDetails(null);
        }
      } catch (error) {
        console.error("Failed to fetch comparison data:", error);
      } finally {
        setLoading(false);
      }
    };

    getDataForComparison();
  }, [selectedThrows]);

  const handleResetSelection = () => {
    setSelectedThrows({});
    setIsLeftSidebarOpen(false); // Close sidebar on reset
  };
  
  const handleSelectionChange = (newSelection) => {
    setSelectedThrows(newSelection);
    // Optional: close sidebar after a selection is made on mobile
    // setIsLeftSidebarOpen(false);
  }

  const totalSelectedCount = Object.values(selectedThrows).reduce(
    (acc, throwsArr) => acc + throwsArr.length,
    0
  );

  return (
    <div className="flex flex-col h-screen">
      <Header 
        onToggleLeftSidebar={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
        onToggleRightSidebar={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
      />
      
      <div className="flex flex-1 overflow-hidden relative">
        {/* --- NEW: Overlay for mobile when sidebars are open --- */}
        {(isLeftSidebarOpen || isRightSidebarOpen) && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
            onClick={() => {
              setIsLeftSidebarOpen(false);
              setIsRightSidebarOpen(false);
            }}
          ></div>
        )}

        {/* Left Sidebar for Calendar Filter */}
        <aside
          className={`
            bg-surface border-r border-border-color p-6 overflow-y-auto w-full max-w-xs sm:max-w-sm
            fixed lg:relative inset-y-0 left-0 z-30
            transform transition-transform duration-300 ease-in-out
            ${isLeftSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:translate-x-0 lg:w-[300px] lg:flex-shrink-0
          `}
        >
          <CalendarFilter
            availableDates={allAvailableDates}
            selectedThrows={selectedThrows}
            onChange={handleSelectionChange}
            onReset={handleResetSelection}
            totalSelectedCount={totalSelectedCount}
            selectionLimit={5}
          />
        </aside>

        {/* Main Content Area (Center) */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <main className="flex-1 p-4 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-on-surface mb-2">
              Javelin Throw Analytics
            </h1>
            <p className="text-on-surface-secondary mb-6">
              Select one or more throws from the calendar to begin comparison.
            </p>
            <SciChart3DComponent
              comparisonData={comparisonData}
              loading={loading}
              visibility={visibility}
              setVisibility={setVisibility}
            />
          </main>
        </div>

        {/* Right Sidebar for Stats */}
        <Sidebar
          isOpen={isRightSidebarOpen}
          onClose={() => setIsRightSidebarOpen(false)}
          isComparisonView={totalSelectedCount > 1}
          playerStats={sidebarStats}
          throwDetails={sidebarThrowDetails}
          comparisonStats={comparisonStats}
          visibility={visibility}
          loading={loading && totalSelectedCount < 2}
        />
      </div>
    </div>
  );
}

export default App;