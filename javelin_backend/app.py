from flask import Flask, jsonify
from flask_cors import CORS
from trajectory_processor import process_all_data

app = Flask(__name__)
CORS(app)

PROCESSED_DATA = {}

def load_data():
    """Loads and processes data from the raw_sensor_data folder."""
    global PROCESSED_DATA
    PROCESSED_DATA = process_all_data(data_folder='raw_sensor_data')

@app.route('/api/dates', methods=['GET'])
def get_available_dates():
    if not PROCESSED_DATA: return jsonify([])
    dates = [{"value": d, "label": d, "throwCount": len(t)} for d, t in PROCESSED_DATA.items()]
    dates.sort(key=lambda x: x['value'], reverse=True)
    return jsonify(dates)

@app.route('/api/throws/<string:date>', methods=['GET'])
def get_throws_by_date(date):
    throws = PROCESSED_DATA.get(date)
    return jsonify({"throws": throws}) if throws else (jsonify({"error": "No data found"}), 404)

@app.route('/api/refresh-data', methods=['POST'])
def refresh_data():
    print("--> [Web Server] Refresh request received. Reloading all data...")
    load_data()
    return jsonify({"status": "success", "message": "Data reloaded"}), 200

if __name__ == '__main__':
    print("--- Javelin Flask Web Server (with Real Physics) ---")
    load_data()
    app.run(host='0.0.0.0', port=5000)