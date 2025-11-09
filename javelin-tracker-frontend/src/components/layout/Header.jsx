// javelin-tracker-frontend/src/components/layout/Header.jsx
import React from 'react';
import { Bars3Icon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline'; 
import WifiPanel from './WifiPanel';
import { getWifiStatus } from '../../services/api';
import { useState, useEffect, useRef } from 'react';

const Header = ({ onToggleLeftSidebar, onToggleRightSidebar }) => {
  const [showWifiPanel, setShowWifiPanel] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [currentSsid, setCurrentSsid] = useState('');
  const headerRef = useRef(null);

  useEffect(() => {
    const checkWifiStatus = async () => {
      const status = await getWifiStatus();
      setIsConnected(status.isConnected);
      setCurrentSsid(status.ssid || '');
    };
    checkWifiStatus();
    const interval = setInterval(checkWifiStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        setShowWifiPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const containerClasses = isConnected
    ? 'bg-primary border-purple-400'
    : 'bg-surface border-border-color hover:bg-border-color hover:border-gray-500';

  const iconClasses = isConnected
    ? 'text-white'
    : 'text-on-surface-secondary group-hover:text-on-surface';

  // --- THE ONLY CHANGE IS HERE: z-10 is changed to z-50 ---
  return (
    <header ref={headerRef} className="bg-surface p-4 flex justify-between items-center h-16 border-b border-border-color flex-shrink-0 z-50">
      {/* Left Side: Mobile Menu, Logo and Title */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleLeftSidebar}
          className="lg:hidden p-2 rounded-md text-on-surface-secondary hover:bg-border-color"
          aria-label="Open throw selection"
        >
          <Bars3Icon className="h-6 w-6" />
        </button>

        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span className="text-xl font-semibold text-on-surface hidden sm:inline">Javelin Tracker</span>
      </div>

      {/* Right Side: Mobile Stats, Wi-Fi Icon */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        <button
          onClick={onToggleRightSidebar}
          className="lg:hidden p-2 rounded-md text-on-surface-secondary hover:bg-border-color"
          aria-label="Open performance metrics"
        >
          <AdjustmentsHorizontalIcon className="h-6 w-6" />
        </button>

        <div className="relative">
          <div
            onClick={() => setShowWifiPanel(p => !p)}
            className={`group w-10 h-10 rounded-full flex items-center justify-center border cursor-pointer transition-colors duration-200 ${containerClasses}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-6 w-6 transition-colors duration-200 ${iconClasses}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 15a4.125 4.125 0 016.75 0" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 11.625a8.625 8.625 0 0113.5 0" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M1.875 8.25a13.125 13.125 0 0120.25 0M12 18.75a.75.75 0 100-1.5.75.75 0 000 1.5z" />
            </svg>
          </div>
          {showWifiPanel && (
            <WifiPanel
              isConnected={isConnected}
              currentSsid={currentSsid}
              onActionComplete={async () => {
                const status = await getWifiStatus();
                setIsConnected(status.isConnected);
                setCurrentSsid(status.ssid || '');
              }}
              closePanel={() => setShowWifiPanel(false)}
            />
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;