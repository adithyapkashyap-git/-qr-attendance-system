import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { attendanceAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { 
  FaCamera, 
  FaKeyboard, 
  FaQrcode, 
  FaCheckCircle, 
  FaMapMarkerAlt,
  FaExclamationTriangle,
  FaSync
} from 'react-icons/fa';
import './Student.css';

const QRScanner = ({ onAttendanceMarked }) => {
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scannedCode, setScannedCode] = useState('');
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [watchId, setWatchId] = useState(null);
  const scannerRef = useRef(null);
  const html5QrcodeScannerRef = useRef(null);

  // Get location on component mount
  useEffect(() => {
    requestLocation();
    
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  // Initialize scanner when scanning mode is enabled
  useEffect(() => {
    if (scanning && scannerRef.current && !html5QrcodeScannerRef.current) {
      initializeScanner();
    }

    return () => {
      if (html5QrcodeScannerRef.current) {
        html5QrcodeScannerRef.current.clear().catch(error => {
          console.error('Failed to clear scanner', error);
        });
      }
    };
  }, [scanning]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      toast.error('❌ Geolocation not supported');
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    // Get current position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        setLocation(coords);
        setLocationLoading(false);
        toast.success('📍 Location obtained successfully');

        // Watch position for real-time updates
        const id = navigator.geolocation.watchPosition(
          (pos) => {
            setLocation({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy
            });
          },
          (error) => {
            console.error('Watch position error:', error);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 10000,
            timeout: 5000
          }
        );
        setWatchId(id);
      },
      (error) => {
        setLocationLoading(false);
        let message = 'Unable to get location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission denied. Please enable location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information is unavailable. Please check your device settings.';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out. Please try again.';
            break;
          default:
            message = 'An unknown error occurred while getting location.';
        }
        
        setLocationError(message);
        toast.error(`❌ ${message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  const initializeScanner = () => {
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      rememberLastUsedCamera: true,
      supportedScanTypes: [],
    };

    html5QrcodeScannerRef.current = new Html5QrcodeScanner(
      'qr-reader',
      config,
      false
    );

    html5QrcodeScannerRef.current.render(onScanSuccess, onScanError);
  };

  const onScanSuccess = async (decodedText, decodedResult) => {
    // Check if location is available
    if (!location) {
      toast.error('❌ Location not available. Please enable location services.');
      return;
    }

    setScannedCode(decodedText);
    
    // Stop scanner
    if (html5QrcodeScannerRef.current) {
      html5QrcodeScannerRef.current.clear();
      html5QrcodeScannerRef.current = null;
    }

    // Mark attendance with location
    setLoading(true);
    try {
      const response = await attendanceAPI.markAttendance({
        qrCode: decodedText,
        location: {
          latitude: location.latitude,
          longitude: location.longitude
        }
      });
      
      const distance = response.data.distance || 0;
      toast.success(
        `✅ Attendance marked successfully! Distance: ${distance}m`,
        { autoClose: 5000 }
      );
      
      setScanning(false);
      if (onAttendanceMarked) onAttendanceMarked();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to mark attendance';
      
      if (error.response?.data?.distance && error.response?.data?.requiredRadius) {
        toast.error(
          `❌ ${errorMessage}`,
          { autoClose: 7000 }
        );
      } else {
        toast.error(`❌ ${errorMessage}`);
      }
      
      setScanning(false);
    } finally {
      setLoading(false);
      setScannedCode('');
    }
  };

  const onScanError = (errorMessage) => {
    // Silent error handling for continuous scanning
    console.log(errorMessage);
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    
    if (!manualCode.trim()) {
      toast.error('❌ Please enter QR code');
      return;
    }

    if (!location) {
      toast.error('❌ Location not available. Please enable location services.');
      return;
    }

    setLoading(true);
    try {
      const response = await attendanceAPI.markAttendance({
        qrCode: manualCode,
        location: {
          latitude: location.latitude,
          longitude: location.longitude
        }
      });
      
      const distance = response.data.distance || 0;
      toast.success(
        `✅ Attendance marked successfully! Distance: ${distance}m`,
        { autoClose: 5000 }
      );
      
      setManualCode('');
      if (onAttendanceMarked) onAttendanceMarked();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to mark attendance';
      
      if (error.response?.data?.distance && error.response?.data?.requiredRadius) {
        toast.error(
          `❌ ${errorMessage}`,
          { autoClose: 7000 }
        );
      } else {
        toast.error(`❌ ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartCamera = () => {
    if (!location) {
      toast.error('❌ Please enable location first');
      return;
    }
    setScanning(true);
  };

  const handleStopCamera = () => {
    if (html5QrcodeScannerRef.current) {
      html5QrcodeScannerRef.current.clear();
      html5QrcodeScannerRef.current = null;
    }
    setScanning(false);
  };

  return (
    <div className="qr-scanner-container">
      <div className="scanner-card">
        <div className="scanner-header">
          <FaQrcode className="scanner-icon" />
          <h2>Scan QR Code</h2>
          <p>Use camera to scan or enter code manually</p>
        </div>

        {/* Location Status Section */}
        <div className={`location-status-card ${location ? 'active' : 'inactive'}`}>
          <div className="location-header">
            <FaMapMarkerAlt className={`location-icon ${location ? 'active' : ''}`} />
            <h3>Location Status</h3>
          </div>
          
          {locationLoading ? (
            <div className="location-loading">
              <div className="spinner-small"></div>
              <p>Getting your location...</p>
            </div>
          ) : location ? (
            <div className="location-info">
              <div className="location-details">
                <div className="location-item">
                  <span className="label">Latitude:</span>
                  <span className="value">{location.latitude.toFixed(6)}</span>
                </div>
                <div className="location-item">
                  <span className="label">Longitude:</span>
                  <span className="value">{location.longitude.toFixed(6)}</span>
                </div>
                <div className="location-item">
                  <span className="label">Accuracy:</span>
                  <span className="value">±{Math.round(location.accuracy)}m</span>
                </div>
              </div>
              <div className="location-status-badge success">
                <FaCheckCircle /> Location Active
              </div>
            </div>
          ) : (
            <div className="location-error-box">
              <FaExclamationTriangle className="error-icon" />
              <p className="error-message">{locationError || 'Location not available'}</p>
              <button onClick={requestLocation} className="btn-retry-location">
                <FaSync /> Retry Location
              </button>
            </div>
          )}
        </div>

        {/* Scanner Modes */}
        <div className="scanner-modes">
          {/* Camera Scan Button */}
          <button
            className={`mode-btn camera-btn ${scanning ? 'active' : ''}`}
            onClick={handleStartCamera}
            disabled={scanning || !location}
          >
            <FaCamera className="mode-icon" />
            <div className="mode-content">
              <h3>Camera Scan</h3>
              <p>Scan QR code using your camera</p>
            </div>
          </button>

          {/* Manual Entry Button */}
          <button
            className={`mode-btn manual-btn ${!scanning ? 'active' : ''}`}
            onClick={() => {
              handleStopCamera();
            }}
            disabled={!scanning}
          >
            <FaKeyboard className="mode-icon" />
            <div className="mode-content">
              <h3>Manual Entry</h3>
              <p>Enter QR code manually</p>
            </div>
          </button>
        </div>

        {/* Scanner View or Manual Entry */}
        {scanning ? (
          <div className="camera-view">
            <div id="qr-reader" ref={scannerRef}></div>
            {loading && (
              <div className="scanning-overlay">
                <div className="scanning-loader">
                  <div className="spinner"></div>
                  <p>Marking attendance...</p>
                  <p className="location-text">
                    📍 Location: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                  </p>
                </div>
              </div>
            )}
            {scannedCode && (
              <div className="scanned-code-display">
                <FaCheckCircle className="success-icon" />
                <p>Code Scanned: {scannedCode.substring(0, 20)}...</p>
              </div>
            )}
            <button className="btn-stop-camera" onClick={handleStopCamera}>
              Stop Camera
            </button>
          </div>
        ) : (
          <div className="manual-entry-section">
            <form onSubmit={handleManualSubmit} className="manual-form">
              <div className="input-group">
                <FaQrcode className="input-icon" />
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Enter QR Code"
                  className="qr-input"
                  disabled={!location}
                />
              </div>
              <button
                type="submit"
                className="btn-submit-attendance"
                disabled={loading || !manualCode.trim() || !location}
              >
                {loading ? (
                  <>
                    <div className="spinner-small"></div>
                    Marking...
                  </>
                ) : (
                  <>
                    <FaQrcode /> Mark Attendance
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Scanner Tips */}
        <div className="scanner-tips">
          <div className="scanner-tip">
            <span className="tip-icon">💡</span>
            <p><strong>Tip:</strong> Make sure you're in the correct classroom before marking attendance</p>
          </div>
          <div className="scanner-tip warning">
            <span className="tip-icon">⚠️</span>
            <p><strong>Note:</strong> You must be within the classroom radius to mark attendance</p>
          </div>
          <div className="scanner-tip info">
            <span className="tip-icon">🔄</span>
            <p><strong>Dynamic QR:</strong> QR codes change every 5 seconds for security</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;