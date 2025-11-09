// javelin-tracker-frontend/src/components/layout/WifiPanel.jsx
import React, { useState, useEffect } from 'react';
import { scanWifiNetworks, connectToWifi, disconnectFromWifi } from '../../services/api';

// Note the changed props: it now receives `onActionComplete`
const WifiPanel = ({ isConnected, currentSsid, onActionComplete, closePanel }) => {
  const [networks, setNetworks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSsid, setSelectedSsid] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');

  const handleScan = async () => {
    setLoading(true);
    setError('');
    setNetworks([]);
    setStatus('Scanning for networks...');
    try {
      const scannedNetworks = await scanWifiNetworks();
      setNetworks(scannedNetworks);
      setStatus(scannedNetworks.length > 0 ? 'Select a network to connect.' : 'No networks found.');
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to scan networks.';
      setError(errorMessage);
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isConnected) {
      handleScan();
    }
    // eslint-disable-next-line
  }, [isConnected]);

  const handleConnect = async (e) => {
    if (e) e.preventDefault();
    if (!selectedSsid) return;

    setLoading(true);
    setError('');
    setStatus(`Connecting to ${selectedSsid}...`);

    try {
      const response = await connectToWifi(selectedSsid, password);
      setStatus(response.message);
      await onActionComplete(); // Tell the Header to refresh its state from the server
      setTimeout(closePanel, 2000);
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to connect.';
      setError(errorMessage);
      setStatus('');
      await onActionComplete(); // Refresh state even on failure
    } finally {
      setLoading(false);
      setPassword('');
      setSelectedSsid('');
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setError('');
    setStatus(`Disconnecting from ${currentSsid}...`);
    try {
      const response = await disconnectFromWifi();
      setStatus(response.message);
      await onActionComplete(); // Tell the Header to refresh its state
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to disconnect.';
      setError(errorMessage);
      setStatus('');
      await onActionComplete(); // Refresh state even on failure
    } finally {
      setLoading(false);
    }
  };
  
  const requiresPassword = (network) => {
    return network.security && network.security.toLowerCase() !== 'open';
  };

  const handleNetworkClick = (network) => {
    if (loading) return;
    setSelectedSsid(network.ssid);
    // If the network is open, immediately try to connect without showing password form
    if (!requiresPassword(network)) {
        // Temporarily set password to empty and trigger form submission logic
        setPassword(''); 
        // We wrap this in a timeout to allow the state to update before handleConnect is called
        setTimeout(() => {
            document.getElementById('wifi-connect-form')?.requestSubmit();
        }, 0);
    }
  };

  const renderSignalIcon = (signalLevel) => {
    const quality = Math.min(Math.max(2 * (signalLevel + 100), 0), 100);
    let bars = 1;
    if (quality > 80) bars = 4;
    else if (quality > 60) bars = 3;
    else if (quality > 30) bars = 2;

    return (
      <div className="flex items-end space-x-0.5 h-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`w-1 ${i < bars ? 'bg-primary' : 'bg-gray-600'} ${i === 0 ? 'h-1/4' : ''} ${i === 1 ? 'h-2/4' : ''} ${i === 2 ? 'h-3/4' : ''} ${i === 3 ? 'h-full' : ''}`} />
        ))}
      </div>
    );
  };

  return (
    <div className="absolute top-16 right-0 w-80 bg-surface border border-border-color rounded-lg shadow-2xl p-4 z-50 text-on-surface">
      <h3 className="font-bold text-lg mb-3">Wi-Fi Connection</h3>
      
      {isConnected ? (
        // --- CONNECTED VIEW ---
        <div>
          <div className="text-center p-4 bg-background rounded-md border border-border-color">
            <p className="text-on-surface-secondary text-sm">Connected to:</p>
            <p className="font-bold text-lg text-primary truncate">{currentSsid}</p>
          </div>
          {status && !error && <p className="text-on-surface-secondary text-sm mt-3 text-center">{status}</p>}
          {error && <p className="text-red-400 text-sm mt-3 text-center">{error}</p>}
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="w-full mt-4 bg-red-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-red-700 transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>
      ) : (
        // --- DISCONNECTED VIEW ---
        <div>
          <button
            onClick={handleScan}
            disabled={loading}
            className="w-full bg-primary text-white font-semibold py-2 px-4 rounded-md hover:bg-purple-700 transition duration-200 disabled:opacity-50"
          >
            {loading && status.startsWith('Scanning') ? 'Scanning...' : 'Re-scan Networks'}
          </button>

          {error && <p className="text-red-400 text-sm mt-3 text-center">{error}</p>}
          {status && !error && <p className="text-on-surface-secondary text-sm mt-3 text-center">{status}</p>}

          {selectedSsid && (
            <form onSubmit={handleConnect} id="wifi-connect-form">
              <p className="text-center font-semibold mb-2">Connect to <span className="text-primary">{selectedSsid}</span></p>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full bg-background border border-border-color rounded-md px-3 py-2 text-on-background focus:outline-none focus:ring-2 focus:ring-primary" autoFocus />
              <div className="flex items-center gap-2 mt-2">
                <button type="button" onClick={() => setSelectedSsid('')} className="w-full bg-border-color hover:bg-gray-600 text-on-surface font-semibold py-2 px-4 rounded-md transition">Cancel</button>
                <button type="submit" disabled={loading} className="w-full bg-primary text-white font-semibold py-2 px-4 rounded-md hover:bg-purple-700 transition disabled:opacity-50">{loading ? 'Connecting...' : 'Connect'}</button>
              </div>
            </form>
          )}

          {!selectedSsid && networks.length > 0 && (
            <div className="mt-4 max-h-60 overflow-y-auto space-y-1 pr-1">
              {networks.map((net) => (
                <div
                  key={net.ssid + net.bssid}
                  onClick={() => handleNetworkClick(net)}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-background cursor-pointer"
                >
                  <span className="font-medium text-sm truncate pr-2">{net.ssid}</span>
                  <div className="flex items-center flex-shrink-0">
                    <span className="text-xs mr-3 text-on-surface-secondary">{net.signal_level} dBm</span>
                    {renderSignalIcon(net.signal_level)}
                    {requiresPassword(net) && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-on-surface-secondary ml-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a3 3 0 00-3 3v2H6a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-8a2 2 0 00-2-2h-1V5a3 3 0 00-3-3zm-1 3a1 1 0 112 0v2H9V5z" clipRule="evenodd" /></svg>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WifiPanel;