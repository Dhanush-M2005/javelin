// src/components/dashboard/CalendarFilter.jsx
import React, { useState, useEffect } from 'react';
import { XCircleIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { fetchJavelinDataByDate } from '../../services/api';

const ThrowItem = ({ date, throwData, index, isChecked, onThrowChange, isDisabled }) => (
  <label className={`flex items-center p-2 rounded-md pl-4 ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-background cursor-pointer'}`}>
    <input
      type="checkbox"
      className="h-4 w-4 accent-primary rounded mr-3 flex-shrink-0"
      checked={isChecked}
      onChange={() => onThrowChange(date, index)}
      disabled={isDisabled}
    />
    <div className="flex items-baseline whitespace-nowrap text-sm">
      <span className="mr-2 text-on-background">{`Throw ${index + 1}`}</span>
      <span className="text-on-surface-secondary mr-3">({throwData.time})</span>
      <span className="font-semibold text-on-surface bg-border-color px-1.5 py-0.5 rounded">
        {throwData.playerStats.range}m
      </span>
    </div>
  </label>
);

const DateSection = ({ date, throws, selectedThrows, onThrowChange, isOpen, onToggle, isLimitReached }) => {
  const formatDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-');
    return `${month}/${day}/${year}`;
  };

  return (
    <div className="border-b border-border-color last:border-b-0">
      <button
        onClick={() => onToggle(date)}
        className="w-full flex items-center justify-between p-2 text-left hover:bg-background"
      >
        <h3 className="font-bold text-md text-on-surface">
          {formatDate(date)}
        </h3>
        <ChevronRightIcon
          className={`h-5 w-5 text-on-surface-secondary transform transition-transform ${
            isOpen ? 'rotate-90' : ''
          }`}
        />
      </button>
      {isOpen && (
        <div className="py-2 space-y-1">
          {throws.map((throwData, index) => {
            const isChecked = selectedThrows[date]?.includes(index) ?? false;
            return (
              <ThrowItem
                key={index}
                date={date}
                throwData={throwData}
                index={index}
                isChecked={isChecked}
                onThrowChange={onThrowChange}
                isDisabled={isLimitReached && !isChecked}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

const CalendarFilter = ({
  availableDates = [],
  selectedThrows = {},
  onChange = () => {},
  onReset = () => {},
  totalSelectedCount = 0,
  selectionLimit = 5,
}) => {
  const [allThrowsData, setAllThrowsData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [openSections, setOpenSections] = useState({});
  
  const isLimitReached = totalSelectedCount >= selectionLimit;

  useEffect(() => {
    const fetchAllThrows = async () => {
      if (availableDates.length === 0) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const promises = availableDates.map(d => fetchJavelinDataByDate(d.value));
        const results = await Promise.all(promises);
        const throwsByDate = {};
        availableDates.forEach((dateInfo, index) => {
          throwsByDate[dateInfo.value] = results[index].throws;
        });
        setAllThrowsData(throwsByDate);
      } catch (error) {
        console.error("Failed to fetch all throw data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllThrows();
  }, [availableDates]);

  const handleThrowCheckboxChange = (dateStr, throwIndex) => {
    const isCurrentlyChecked = selectedThrows[dateStr]?.includes(throwIndex) ?? false;
    if (isLimitReached && !isCurrentlyChecked) return;
    
    const newSelection = JSON.parse(JSON.stringify(selectedThrows));
    const dateSelections = newSelection[dateStr] || [];
    if (dateSelections.includes(throwIndex)) {
      newSelection[dateStr] = dateSelections.filter(i => i !== throwIndex);
      if (newSelection[dateStr].length === 0) delete newSelection[dateStr];
    } else {
      newSelection[dateStr] = [...dateSelections, throwIndex].sort((a, b) => a - b);
    }
    onChange(newSelection);
  };
  
  const handleToggleSection = (date) => {
    setOpenSections(prev => ({ ...prev, [date]: !prev[date] }));
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <label className="block text-lg font-bold text-on-surface">
          Select Throws
        </label>
        <button
          onClick={onReset}
          disabled={totalSelectedCount === 0}
          className="p-2 bg-red-500 text-white rounded-md shadow-sm transition-all hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Reset selections"
        >
          <XCircleIcon className="h-5 w-5" />
        </button>
      </div>

      {isLimitReached && (
        <div className="p-2 mb-2 text-sm text-center text-purple-200 bg-primary bg-opacity-20 rounded-md">
          You can compare a maximum of {selectionLimit} throws.
        </div>
      )}

      <div className="flex-1 border border-border-color rounded-lg overflow-y-auto">
        {isLoading ? (
          <p className="p-4 text-center text-on-surface-secondary">Loading throws...</p>
        ) : Object.keys(allThrowsData).length > 0 ? (
          <div>
            {Object.keys(allThrowsData).map(date => (
              <DateSection
                key={date}
                date={date}
                throws={allThrowsData[date]}
                selectedThrows={selectedThrows}
                onThrowChange={handleThrowCheckboxChange}
                isOpen={!!openSections[date]}
                onToggle={handleToggleSection}
                isLimitReached={isLimitReached}
              />
            ))}
          </div>
        ) : (
          <p className="p-4 text-center text-on-surface-secondary">No throws available.</p>
        )}
      </div>
    </div>
  );
};

export default CalendarFilter;