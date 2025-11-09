// src/components/dashboard/PerformanceChart.jsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label } from 'recharts';
import { generateUniqueColor } from '../../utils/colors';

const CustomLegend = ({ payload, onLegendClick, visibility }) => {
  return (
    <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 mt-4">
      {payload.map((entry) => {
        const dataKey = entry.payload.name;
        const color = entry.color;
        const isVisible = visibility[dataKey];

        return (
          <div
            key={`item-${dataKey}`}
            onClick={() => onLegendClick(dataKey)}
            className={`flex items-center cursor-pointer transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-40'}`}
            role="button"
          >
            <div className="w-4 h-4 rounded-sm mr-2" style={{ backgroundColor: color }}></div>
            <span className="text-sm text-gray-700 font-medium">{dataKey}</span>
          </div>
        );
      })}
    </div>
  );
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-bold text-gray-800">{payload[0].name}</p>
        <p className="text-sm text-gray-600">{`Distance: ${payload[0].payload.distance.toFixed(2)} m`}</p>
        <p className="text-sm" style={{ color: payload[0].stroke }}>
          {`Height: ${payload[0].value.toFixed(2)} m`}
        </p>
      </div>
    );
  }
  return null;
};

const PerformanceChart = ({ comparisonData, loading, visibility, onLegendClick }) => {

  if (loading) {
    return <div className="bg-white p-6 rounded-xl shadow-lg h-[500px] animate-pulse"></div>;
  }

  if (!comparisonData || comparisonData.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-lg h-[500px] flex items-center justify-center">
        <p className="text-gray-500">Select one or more throws from the calendar to see the comparison.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg mt-6">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">Comparative Throw Trajectory</h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis type="number" dataKey="distance" domain={['dataMin', 'dataMax']} stroke="#6b7280" allowDuplicatedCategory={false}>
            <Label value="Distance (m)" offset={-5} position="insideBottom" />
          </XAxis>
          <YAxis stroke="#6b7280">
            <Label value="Height (m)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />
          </YAxis>
          <Tooltip content={<CustomTooltip />} />
          
          <Legend 
            content={<CustomLegend onLegendClick={onLegendClick} visibility={visibility} />} 
            verticalAlign="bottom" 
            wrapperStyle={{ paddingTop: '20px' }}
          />

          {comparisonData.map((session) => (
            <Line
              key={session.id}
              type="monotone"
              data={session.trajectory}
              dataKey="height"
              name={session.id}
              stroke={generateUniqueColor(session.id)}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 6 }}
              hide={!visibility[session.id]}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PerformanceChart;