import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { attendanceAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { FaCamera, FaKeyboard, FaQrcode, FaCheckCircle } from 'react-icons/fa';
import './Student.css';

const QRScanner = ({ onAttendanceMarked }) => {
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scannedCode, setScannedCode] = useState('');
  const scannerRef = useRef(null);
  const html5QrcodeScannerRef = useRef(null);

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
    setScannedCode(decodedText);
    
    // Stop scanner
    if (html5QrcodeScannerRef.current) {
      html5QrcodeScannerRef.current.clear();
      html5QrcodeScannerRef.current = null;
    }

    // Mark attendance
    setLoading(true);
    try {
      await attendanceAPI.markAttendance(decodedText);
      toast.success('✅ Attendance marked successfully!');
      setScanning(false);
      if (onAttendanceMarked) onAttendanceMarked();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to mark attendance');
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
      toast.error('Please enter QR code');
      return;
    }

    setLoading(true);
    try {
      await attendanceAPI.markAttendance(manualCode);
      toast.success('✅ Attendance marked successfully!');
      setManualCode('');
      if (onAttendanceMarked) onAttendanceMarked();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleStartCamera = () => {
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

        <div className="scanner-modes">
          {/* Camera Scan Button */}
          <button
            className={`mode-btn camera-btn ${scanning ? 'active' : ''}`}
            onClick={handleStartCamera}
            disabled={scanning}
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

        {scanning ? (
          <div className="camera-view">
            <div id="qr-reader" ref={scannerRef}></div>
            {loading && (
              <div className="scanning-overlay">
                <div className="scanning-loader">
                  <div className="spinner"></div>
                  <p>Marking attendance...</p>
                </div>
              </div>
            )}
            {scannedCode && (
              <div className="scanned-code-display">
                <FaCheckCircle className="success-icon" />
                <p>Code Scanned: {scannedCode}</p>
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
                />
              </div>
              <button
                type="submit"
                className="btn-submit-attendance"
                disabled={loading || !manualCode.trim()}
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

        <div className="scanner-tip">
          <span className="tip-icon">💡</span>
          <p><strong>Tip:</strong> Make sure you're in the correct class before marking attendance</p>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
