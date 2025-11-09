import os
import re
import pandas as pd
import numpy as np
from scipy.signal import butter, filtfilt

class MadgwickFilter:
    """
    Madgwick AHRS algorithm for orientation estimation.
    """
    def __init__(self, sample_rate=125, beta=0.1):
        self.sample_rate = sample_rate
        self.beta = beta
        self.dt = 1.0 / sample_rate
        self.q = np.array([1.0, 0.0, 0.0, 0.0])  # [w, x, y, z]

    def update(self, gyro, accel):
        """Update the filter with new sensor data."""
        gyro = np.array(gyro, dtype=float)
        accel = np.array(accel, dtype=float)
        
        if np.linalg.norm(accel) == 0:
            return self.q
        accel /= np.linalg.norm(accel)

        q0, q1, q2, q3 = self.q
        
        # Gradient descent algorithm components
        f = np.array([
            2*(q1*q3 - q0*q2) - accel[0],
            2*(q0*q1 + q2*q3) - accel[1],
            2*(0.5 - q1**2 - q2**2) - accel[2]
        ])
        J = np.array([
            [-2*q2,  2*q3, -2*q0, 2*q1],
            [ 2*q1,  2*q0,  2*q3, 2*q2],
            [ 0,    -4*q1, -4*q2, 0]
        ])
        
        step = J.T @ f
        if np.linalg.norm(step) > 0:
            step /= np.linalg.norm(step)

        # Compute rate of change of quaternion from gyroscope
        q_dot_omega = 0.5 * np.array([
            -q1*gyro[0] - q2*gyro[1] - q3*gyro[2],
             q0*gyro[0] + q2*gyro[2] - q3*gyro[1],
             q0*gyro[1] - q1*gyro[2] + q3*gyro[0],
             q0*gyro[2] + q1*gyro[1] - q2*gyro[0]
        ])
        
        # Apply feedback step
        q_dot = q_dot_omega - self.beta * step
        
        # Integrate to yield quaternion
        self.q += q_dot * self.dt
        self.q /= np.linalg.norm(self.q)  # Normalize
        return self.q
    
    def get_gravity_vector(self):
        """Calculates the gravity vector in the sensor frame."""
        q0, q1, q2, q3 = self.q
        gx = 2 * (q1*q3 - q0*q2)
        gy = 2 * (q0*q1 + q2*q3)
        gz = q0*q0 - q1*q1 - q2*q2 + q3*q3
        return np.array([gx, gy, gz]) * 9.81

def butter_lowpass_filter(data, cutoff, fs, order=4):
    """Applies a low-pass Butterworth filter to the data."""
    b, a = butter(order, cutoff / (0.5 * fs), btype='low', analog=False)
    return filtfilt(b, a, data)

def integrate_with_drift_correction(acc_data, dt_values, fs, cutoff_freq=0.5):
    """Integrates acceleration data to velocity and position with drift correction."""
    if len(acc_data) < 10:  # Need sufficient data for polynomial fit
        return np.zeros_like(acc_data), np.zeros_like(acc_data)
    
    acc_filtered = butter_lowpass_filter(acc_data, cutoff_freq, fs)
    
    velocity = np.zeros_like(acc_data)
    for i in range(1, len(acc_data)):
        velocity[i] = velocity[i-1] + (acc_filtered[i-1] + acc_filtered[i]) / 2.0 * dt_values[i-1]
    
    time_points = np.arange(len(velocity))
    vel_coeffs = np.polyfit(time_points, velocity, 1)
    velocity_corrected = velocity - np.polyval(vel_coeffs, time_points)
    
    position = np.zeros_like(acc_data)
    for i in range(1, len(velocity_corrected)):
        position[i] = position[i-1] + (velocity_corrected[i-1] + velocity_corrected[i]) / 2.0 * dt_values[i-1]
        
    pos_coeffs = np.polyfit(np.arange(len(position)), position, 2)
    position_final = position - np.polyval(pos_coeffs, np.arange(len(position)))
    
    return velocity_corrected, position_final

def calculate_player_stats(df, vel_E, vel_N, vel_U, pos_E, pos_N, pos_U):
    """Calculates summary statistics from the processed trajectory data."""
    duration = df['Timestamp_s'].iloc[-1] - df['Timestamp_s'].iloc[0]
    range_m = np.sqrt((pos_E[-1] - pos_E[0])**2 + (pos_N[-1] - pos_N[0])**2)
    peak_height = np.max(pos_U) if len(pos_U) > 0 else 0
    release_speed = np.sqrt(vel_E[0]**2 + vel_N[0]**2 + vel_U[0]**2) if len(vel_E) > 0 else 0
    vel_horizontal = np.sqrt(vel_E[0]**2 + vel_N[0]**2) if len(vel_E) > 0 else 0
    release_angle = np.arctan2(vel_U[0], vel_horizontal) * 180 / np.pi if len(vel_U) > 0 and vel_horizontal > 0 else 0
    time_to_peak_idx = np.argmax(pos_U) if len(pos_U) > 0 else 0

    return {
        'range': round(range_m, 2), 
        'timeOfFlight': round(duration, 2),
        'peakHeight': round(peak_height, 2), 
        'timeToPeak': round(df['Timestamp_s'].iloc[time_to_peak_idx] - df['Timestamp_s'].iloc[0], 2),
        'releaseSpeed': round(release_speed, 2), 
        'releaseAngle': round(release_angle, 2),
        'releaseHeight': round(pos_U[0], 2) if len(pos_U) > 0 else 0
    }

def process_csv_file(filepath):
    """
    Main processing function. Takes a CSV filepath, runs the physics simulation,
    and returns structured JSON data for the frontend.
    """
    try:
        filename = os.path.basename(filepath)
        match = re.search(r'(\d{8})_(\d{6})', filename)
        if not match: 
            print(f"[Processor] SKIPPING: Filename format incorrect for '{filename}'")
            return None
        
        date_str, time_str = match.groups()
        formatted_date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}"
        formatted_time = f"{time_str[:2]}:{time_str[2:4]}"

        df = pd.read_csv(filepath)
        # Robustly clean column names
        df.columns = [col.strip().replace('"', '') for col in df.columns]
        
        required_cols = ['Timestamp_ms', 'AccX_Filt', 'AccY_Filt', 'AccZ_Filt', 'GyrX_Filt', 'GyrY_Filt', 'GyrZ_Filt']
        if not all(col in df.columns for col in required_cols):
            print(f"[Processor] SKIPPING: '{filename}' is missing required columns. Found: {list(df.columns)}")
            return None
        if df.isnull().values.any():
            print(f"[Processor] WARNING: '{filename}' contains null values. Dropping rows.")
            df.dropna(subset=required_cols, inplace=True)
        if len(df) < 50:
            print(f"[Processor] SKIPPING: '{filename}' has insufficient data ({len(df)} rows).")
            return None

        df['Timestamp_s'] = df['Timestamp_ms'] / 1000.0
        df['dt'] = df['Timestamp_s'].diff().bfill().fillna(0.008)
        
        acc_x, acc_y, acc_z = df['AccX_Filt'].values, df['AccY_Filt'].values, df['AccZ_Filt'].values
        gyr_x, gyr_y, gyr_z = [df[c].values * np.pi/180. for c in ['GyrX_Filt','GyrY_Filt','GyrZ_Filt']]
        fs = 1.0 / np.mean(df['dt'].values)
        
        madgwick = MadgwickFilter(sample_rate=fs)
        gravity_vectors = np.zeros((len(df), 3))
        
        # Correctly loop to update and then get the vector
        for i in range(len(df)):
            gyro_sample = [gyr_x[i], gyr_y[i], gyr_z[i]]
            accel_sample = [acc_x[i], acc_y[i], acc_z[i]]
            madgwick.update(gyro_sample, accel_sample)
            gravity_vectors[i] = madgwick.get_gravity_vector()
            
        FreeAcc_E, FreeAcc_N, FreeAcc_U = acc_x - gravity_vectors[:,0], acc_y - gravity_vectors[:,1], acc_z - gravity_vectors[:,2]
        
        vel_E, pos_E = integrate_with_drift_correction(FreeAcc_E, df['dt'].values, fs)
        vel_N, pos_N = integrate_with_drift_correction(FreeAcc_N, df['dt'].values, fs)
        vel_U, pos_U = integrate_with_drift_correction(FreeAcc_U, df['dt'].values, fs)
        
        # 'distance' for the chart is the horizontal displacement from the start
        horizontal_dist = np.sqrt(pos_E**2 + pos_N**2)
        trajectory = [{'distance': round(d, 2), 'height': round(h, 2)} for d, h in zip(horizontal_dist, pos_U)]
        stats = calculate_player_stats(df, vel_E, vel_N, vel_U, pos_E, pos_N, pos_U)

        print(f"[Processor] SUCCESS: Processed '{filename}'")
        return formatted_date, {"time": formatted_time, "playerStats": stats, "trajectory": trajectory}

    except Exception as e:
        print(f"!!!!!!!! ERROR processing '{filepath}': {e} !!!!!!!!");
        import traceback
        traceback.print_exc()
        return None

def process_all_data(data_folder='raw_sensor_data'):
    """
    Scans a directory for all .csv files, processes them, and aggregates the
    results into a dictionary keyed by date.
    """
    all_throws = {}
    print(f"--> [Processor] Scanning '{data_folder}' with real physics...")
    if not os.path.exists(data_folder):
        os.makedirs(data_folder)
        print(f"--> [Processor] Created data folder '{data_folder}' as it did not exist.")
    
    for filename in sorted(os.listdir(data_folder)):
        if filename.lower().endswith('.csv'):
            result = process_csv_file(os.path.join(data_folder, filename))
            if result:
                date, throw_data = result
                if date not in all_throws:
                    all_throws[date] = []
                all_throws[date].append(throw_data)
                
    for date in all_throws:
        all_throws[date].sort(key=lambda x: x['time'])
        
    print(f"--> [Processor] Processing complete. Found data for {len(all_throws)} unique dates.")
    return all_throws