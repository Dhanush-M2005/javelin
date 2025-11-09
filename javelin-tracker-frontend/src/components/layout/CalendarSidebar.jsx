// src/components/layout/CalendarSidebar.jsx
import React from 'react';
import CalendarFilter from '../dashboard/CalendarFilter';

const CalendarSidebar = ({ availableDates, selectedThrows, onChange, onReset }) => {
  return (
    <aside
      className="bg-white border-r border-gray-200 p-6"
      style={{ width: "380px" }}
    >
      <CalendarFilter
        availableDates={availableDates}
        selectedThrows={selectedThrows}
        onChange={onChange}
        onReset={onReset}
      />
    </aside>
  );
};

export default CalendarSidebar;