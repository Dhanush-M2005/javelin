import os
import re
import requests
import platform
import subprocess
import time
import logging
from bs4 import BeautifulSoup
from urllib.parse import urljoin, unquote
from apscheduler.schedulers.background import BackgroundScheduler

# --- ⬇️ IMPORTANT: CONFIGURE THESE VARIABLES ⬇️ ---
JAVELIN_WIFI_SSID = "ESP32-FileServer"
ESP32_FILE_SERVER_URL = "http://192.168.4.1" 
LOCAL_DOWNLOAD_PATH = "raw_sensor_data"
SYNC_INTERVAL_SECONDS = 300
FLASK_SERVER_URL = "http://127.0.0.1:5000"
# --- ⬆️ END CONFIGURATION ⬆️ ---

logging.basicConfig(level=logging.INFO, format='%(asctime)s - [Downloader] - %(message)s')

def get_current_ssid():
    try:
        if platform.system() == "Windows":
            output = subprocess.check_output("netsh wlan show interfaces", shell=True).decode('utf-8')
            for line in output.split('\n'):
                if "SSID" in line and ":" in line: return line.split(":")[1].strip()
        elif platform.system() == "Darwin":
            output = subprocess.check_output("/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I", shell=True).decode('utf-8')
            for line in output.split('\n'):
                if "SSID" in line and ":" in line: return line.split(":")[1].strip()
    except Exception: return None
    return None

def trigger_server_refresh():
    try:
        logging.info("Notifying web server to refresh data...")
        requests.post(f"{FLASK_SERVER_URL}/api/refresh-data", timeout=5)
        logging.info("Server refresh notification sent.")
    except requests.exceptions.RequestException as e:
        logging.error(f"Could not connect to the web server to trigger refresh: {e}")

def fix_csv_header_if_needed(filepath):
    try:
        with open(filepath, 'r+', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
            f.seek(0, 0)
            
            # Check if the very first line starts correctly
            if not lines[0].strip().lower().startswith('timestamp_ms'):
                logging.warning(f"Header 'Timestamp_ms' missing in {os.path.basename(filepath)}. Attempting to fix...")
                correct_header = "Timestamp_ms,AccX_Filt,AccY_Filt,AccZ_Filt,GyrX_Filt,GyrY_Filt,GyrZ_Filt,MagX_Filt,MagY_Filt,MagZ_Filt\n"
                
                # Overwrite the file with the correct header and original content
                f.write(correct_header)
                f.writelines(lines)
                f.truncate()
                logging.info(f" -> Successfully fixed header for {os.path.basename(filepath)}")
            else:
                logging.info(f" -> Header is correct for {os.path.basename(filepath)}")
    except Exception as e:
        logging.error(f"Could not read or fix header for {filepath}: {e}")

def sync_files_from_esp32():
    logging.info(f"Connected to Javelin Wi-Fi. Contacting ESP32 server at {ESP32_FILE_SERVER_URL}...")
    try:
        response = requests.get(ESP32_FILE_SERVER_URL, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # --- FINAL, ROBUST FILE FINDING LOGIC ---
        # Target the 'onclick' attribute of <button> tags, based on the screenshot
        filenames_on_server = []
        buttons = soup.find_all('button', onclick=True)
        for button in buttons:
            onclick_attr = button['onclick']
            if 'downloadFile' in onclick_attr: # Look for the specific JS function
                match = re.search(r"downloadFile\('([^']+)'\)", onclick_attr)
                if match:
                    filenames_on_server.append(match.group(1))

        if not filenames_on_server:
            logging.warning("Could not find any buttons with 'downloadFile' action on the ESP32 page.")
            return

        if not os.path.exists(LOCAL_DOWNLOAD_PATH): os.makedirs(LOCAL_DOWNLOAD_PATH)
        local_files = set(os.listdir(LOCAL_DOWNLOAD_PATH))
        missing_files = [f for f in filenames_on_server if f not in local_files]

        if not missing_files:
            logging.info("Local data is already up-to-date with the ESP32 server."); return

        logging.info(f"Found {len(missing_files)} new file(s) to download: {', '.join(missing_files)}")
        files_downloaded = False
        for filename in missing_files:
            # The JS function shows the download URL is '/download?file='
            file_url = urljoin(ESP32_FILE_SERVER_URL, f"/download?file={filename}")
            destination_path = os.path.join(LOCAL_DOWNLOAD_PATH, filename)
            
            try:
                logging.info(f"Downloading '{filename}'...")
                file_response = requests.get(file_url, timeout=30)
                file_response.raise_for_status()
                
                with open(destination_path, 'wb') as f:
                    f.write(file_response.content)
                logging.info(f" -> Saved to '{destination_path}'")
                
                fix_csv_header_if_needed(destination_path)
                files_downloaded = True
            except requests.exceptions.RequestException as e:
                logging.error(f"Failed to download file '{filename}': {e}")
        
        if files_downloaded:
            trigger_server_refresh()

    except requests.exceptions.RequestException as e:
        logging.error(f"Failed to connect to ESP32 server at {ESP32_FILE_SERVER_URL}. Error: {e}")

def main_check():
    logging.info("Performing network check...")
    if get_current_ssid() == JAVELIN_WIFI_SSID:
        sync_files_from_esp32()
    else:
        logging.info("Not on Javelin Wi-Fi. Standing by.")

if __name__ == "__main__":
    scheduler = BackgroundScheduler()
    scheduler.add_job(main_check, 'interval', seconds=SYNC_INTERVAL_SECONDS)
    logging.info("--- Javelin ESP32 Downloader Service (Final Version) ---")
    main_check()
    scheduler.start()
    logging.info(f"Scheduler started. Press Ctrl+C to stop.")
    try:
        while True: time.sleep(1)
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown(); logging.info("Downloader stopped.")