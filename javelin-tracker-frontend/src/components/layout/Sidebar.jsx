// javelin-tracker-frontend/src/components/layout/Sidebar.jsx
import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';

const StatCard = ({ label, value, unit }) => (
  <div className="bg-background rounded-xl p-4">
    <p className="text-sm text-on-surface-secondary font-medium">{label}</p>
    <p className="text-2xl font-semibold text-on-surface">
      {value ?? '...'} <span className="text-base font-normal text-on-surface-secondary ml-1">{unit}</span>
    </p>
  </div>
);

const metricOrder = [
  { key: 'range', label: 'Range', unit: 'm' },
  { key: 'timeOfFlight', label: 'Time of Flight', unit: 's' },
  { key: 'peakHeight', label: 'Peak Height', unit: 'm' },
  { key: 'timeToPeak', label: 'Time to Peak', unit: 's' },
  { key: 'releaseSpeed', label: 'Release Speed', unit: 'm/s' },
  { key: 'releaseAngle', label: 'Release Angle', unit: '°' },
  { key: 'releaseHeight', label: 'Release Height', unit: 'm' },
];

const Sidebar = ({
  isOpen,         // New prop
  onClose,        // New prop
  isComparisonView,
  playerStats,
  throwDetails,
  comparisonStats,
  visibility,
  loading,
}) => {

  const renderSingleView = () => (
    <>
      {throwDetails && (
        <div className="mb-6 px-6">
          <h3 className="text-lg font-bold text-on-surface">{throwDetails.date}</h3>
          <p className="text-md text-on-surface-secondary">{`Throw ${throwDetails.throwNum} (${throwDetails.time})`}</p>
        </div>
      )}
      <h2 className="text-xl font-bold mb-4 text-on-surface px-6">Performance Metrics</h2>
      <div className="space-y-3 px-6">
        {loading
          ? Array(7).fill(0).map((_, index) => <div key={index} className="bg-background rounded-xl p-4 h-20 animate-pulse"></div>)
          : metricOrder.map(metric => (
              <StatCard key={metric.key} label={metric.label} value={playerStats[metric.key]} unit={metric.unit} />
            ))}
      </div>
    </>
  );

  const renderComparisonView = () => {
    const visibleStats = comparisonStats.filter(stat => visibility[stat.id]);
    
    return (
      <div className="flex flex-col h-full">
        <h2 className="text-xl font-bold text-on-surface px-6 pt-6 pb-4 flex-shrink-0">
          Performance Comparison
        </h2>
        <div className="flex-1 overflow-auto px-6 pb-6">
          {visibleStats.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-border-color">
                  <th className="py-3 pr-2 font-semibold text-on-surface-secondary text-sm sticky top-0 bg-surface">
                    Metric
                  </th>
                  {visibleStats.map(throwData => (
                    <th key={throwData.id} className="py-3 px-2 text-center font-semibold text-on-surface sticky top-0 bg-surface">
                      <div className="font-bold text-sm">{`${throwData.date.substring(5)}-${throwData.date.substring(2, 4)}`}</div>
                      <div className="text-xs text-on-surface-secondary font-normal">{`#${throwData.throwNum} (${throwData.time})`}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metricOrder.map(metric => (
                  <tr key={metric.key} className="border-b border-border-color last:border-b-0">
                    <td className="py-3 pr-2 font-semibold text-on-surface-secondary text-sm">
                      {metric.label}
                    </td>
                    {visibleStats.map(throwData => (
                      <td key={throwData.id} className="py-3 px-2 text-center text-lg font-medium text-on-surface">
                        {throwData.playerStats[metric.key]}
                        <span className="text-xs font-normal text-on-surface-secondary ml-1">{metric.unit}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
             <p className="text-on-surface-secondary text-center mt-8">
                Select a throw to see its performance data.
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <aside 
      className={`
        bg-surface h-full flex flex-col border-l border-border-color w-full max-w-xs sm:max-w-sm
        fixed lg:relative inset-y-0 right-0 z-40
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        lg:translate-x-0 lg:w-[340px] lg:flex-shrink-0
      `}
    >
      {/* --- NEW: Close button for mobile --- */}
      <div className="lg:hidden absolute top-4 right-4">
        <button
          onClick={onClose}
          className="p-2 rounded-md text-on-surface-secondary hover:bg-border-color"
          aria-label="Close performance metrics"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pt-6">
        {isComparisonView ? renderComparisonView() : renderSingleView()}
      </div>
    </aside>
  );
};

export default Sidebar;