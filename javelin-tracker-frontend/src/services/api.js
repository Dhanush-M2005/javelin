// javelin-tracker-frontend/src/services/api.js
import axios from 'axios';

// --- ⬇️ IMPORTANT: CONFIGURE THESE VARIABLES ⬇️ ---
const API_BASE_URL = 'http://127.0.0.1:5000/api'; // For Python Flask server
const WIFI_SERVER_URL = 'http://127.0.0.1:5001';   // For Node.js Express server
// --- ⬆️ END CONFIGURATION ⬆️ ---

export const fetchAvailableDates = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/dates`);
    return response.data;
  } catch (error) {
    console.error("Error fetching available dates:", error);
    throw error;
  }
};

export const fetchJavelinDataByDate = async (date) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/throws/${date}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching data for date ${date}:`, error);
    throw error;
  }
};

// --- Wi-Fi Functions ---

export const getWifiStatus = async () => {
  try {
    const response = await axios.get(`${WIFI_SERVER_URL}/status`);
    return response.data;
  } catch (error) {
    console.error("Error fetching Wi-Fi status:", error);
    // Return a default disconnected state on error
    return { isConnected: false, ssid: null };
  }
};

export const scanWifiNetworks = async () => {
  try {
    const response = await axios.get(`${WIFI_SERVER_URL}/scan`);
    return response.data;
  } catch (error) {
    console.error("Error scanning for Wi-Fi networks:", error);
    throw error;
  }
};

export const connectToWifi = async (ssid, password) => {
  try {
    const response = await axios.post(`${WIFI_SERVER_URL}/connect`, { ssid, password });
    return response.data;
  } catch (error) {
    console.error(`Error connecting to Wi-Fi network ${ssid}:`, error);
    throw error;
  }
};

export const disconnectFromWifi = async () => {
  try {
    const response = await axios.post(`${WIFI_SERVER_URL}/disconnect`);
    return response.data;
  } catch (error) {
    console.error("Error disconnecting from Wi-Fi:", error);
    throw error;
  }
};