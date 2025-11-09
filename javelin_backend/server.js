// javelin_backend/server.js
const express = require("express");
const cors = require("cors");
const wifi = require("node-wifi");
const { exec } = require("child_process");
const iconv = require('iconv-lite');

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

wifi.init({ iface: null });

// --- Helper Functions ---

const execPromise = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, { encoding: 'buffer' }, (error, stdout, stderr) => {
      const codepage = 'cp' + (require('os').platform() === 'win32' ? require('child_process').execSync('chcp').toString().split(':').pop().trim() : '437');
      if (error) {
        const stderrStr = iconv.decode(stderr, codepage);
        console.error(`Exec error for command "${command}":`, stderrStr);
        reject(new Error(stderrStr || error.message));
        return;
      }
      const stdoutStr = iconv.decode(stdout, codepage);
      resolve(stdoutStr.trim());
    });
  });
};

const getWifiInterfaceDetails = async () => {
  try {
    const output = await execPromise("netsh wlan show interfaces");
    if (!output.includes("interface")) return null;
    const lines = output.split(/\r?\n/);
    let interfaceName = null;
    let interfaceState = null;
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("Name")) interfaceName = trimmedLine.split(":")[1]?.trim();
      if (trimmedLine.startsWith("State")) interfaceState = trimmedLine.split(":")[1]?.trim();
    }
    if (interfaceName && interfaceState) {
      console.log(`[WiFi Server] Found Wi-Fi interface: '${interfaceName}', State: '${interfaceState}'`);
      return { name: interfaceName, state: interfaceState.toLowerCase() };
    }
    return null;
  } catch (err) {
    console.error("[WiFi Server] Command to list Wi-Fi interfaces failed:", err.message);
    return null;
  }
};

const enableWifiInterface = async (interfaceName) => {
  console.log(`[WiFi Server] Attempting to enable/reset interface '${interfaceName}'...`);
  await execPromise(`netsh interface set interface name="${interfaceName}" admin=enabled`);
  console.log(`[WiFi Server] 'Enable' command sent for '${interfaceName}'.`);
};

// --- THIS IS THE NEW, RELIABLE STATUS FUNCTION ---
const getSystemWifiStatus = async () => {
    try {
        const output = await execPromise("netsh wlan show interfaces");
        const lines = output.split(/\r?\n/);
        let ssid = null;
        let state = null;

        if (!output.includes("interface on the system")) {
            return { isConnected: false, ssid: null };
        }

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith("State")) {
                state = trimmedLine.split(":")[1]?.trim().toLowerCase();
            }
            if (trimmedLine.startsWith("SSID")) {
                ssid = trimmedLine.split(":")[1]?.trim();
            }
        }

        // Only return the SSID if the state is truly 'connected'
        if (state === 'connected' && ssid) {
            return { isConnected: true, ssid: ssid };
        }
        
        return { isConnected: false, ssid: null };

    } catch (err) {
        console.error("[WiFi Server] Failed to get system Wi-Fi status via netsh:", err.message);
        return { isConnected: false, ssid: null };
    }
};


const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));


// --- API Endpoints ---

// GET /status: Now uses the new reliable function
app.get("/status", async (req, res) => {
  console.log("[WiFi Server] Received /status request.");
  const status = await getSystemWifiStatus();
  console.log(`[WiFi Server] Status determined via netsh:`, status);
  res.json(status);
});

// GET /scan: Scans for available networks.
app.get("/scan", async (req, res) => {
  console.log("[WiFi Server] Received /scan request.");
  try {
    const networks = await wifi.scan();
    console.log("[WiFi Server] Scan successful.");
    return res.json(networks);
  } catch (initialError) {
    console.warn(`[WiFi Server] Initial scan failed. Checking adapter state...`);
    try {
      const details = await getWifiInterfaceDetails();
      if (!details || !details.name) throw new Error("Could not find a Wi-Fi adapter.");
      if (details.state.includes("connected")) throw new Error("Scan failed despite being connected.");
      
      await enableWifiInterface(details.name);
      await delay(3000);
      const networks = await wifi.scan();
      console.log("[WiFi Server] Second scan successful after reset attempt.");
      return res.json(networks);
    } catch (secondaryError) {
      console.error("[WiFi Server] Secondary action failed:", secondaryError.message);
      let userMessage = "No Wi-Fi networks found. Ensure Airplane Mode is off.";
      if (secondaryError.message.includes("netsh interface set interface")) {
          userMessage = "Failed to enable Wi-Fi. Please enable it manually and run this app as Administrator.";
      }
      res.status(500).json({ error: userMessage });
    }
  }
});

// POST /connect: Connects to a network and verifies connection.
app.post("/connect", async (req, res) => {
  const { ssid, password } = req.body;
  if (!ssid) return res.status(400).json({ error: "SSID is required." });
  
  console.log(`[WiFi Server] Received /connect request for SSID: ${ssid}.`);
  try {
    await wifi.connect({ ssid, password });
    console.log(`[WiFi Server] Connect command sent. Verifying connection...`);

    for (let i = 0; i < 5; i++) {
        await delay(2000);
        const status = await getSystemWifiStatus();
        if (status.isConnected && status.ssid === ssid) {
            console.log(`[WiFi Server] Successfully connected to ${ssid}.`);
            return res.json({ message: `Successfully connected to ${ssid}.`, ssid: ssid });
        }
    }
    throw new Error(`Connection to ${ssid} timed out.`);

  } catch (err) {
    console.error(`[WiFi Server] Connect process for ${ssid} failed:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /disconnect: Disconnects from the current network and verifies.
app.post("/disconnect", async (req, res) => {
  console.log("[WiFi Server] Received /disconnect request.");
  try {
    await wifi.disconnect();
    console.log("[WiFi Server] Disconnect command sent. Verifying...");
    
    for (let i = 0; i < 5; i++) {
        await delay(1000);
        const status = await getSystemWifiStatus();
        if (!status.isConnected) {
            console.log(`[WiFi Server] Successfully disconnected.`);
            return res.json({ message: "Successfully disconnected." });
        }
    }
    throw new Error("Disconnection could not be confirmed.");

  } catch (err) {
    console.error("[WiFi Server] Disconnect command failed:", err.message);
    res.status(500).json({ error: "Failed to disconnect." });
  }
});


app.listen(PORT, '0.0.0.0', () => {
  console.log(`--- Javelin Node.js WiFi Server running at http://localhost:${PORT} ---`);
});