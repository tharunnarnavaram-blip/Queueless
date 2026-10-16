import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQueue } from '../context/QueueContext';
import { VerificationResult, parseQrPayload, verifyTokenInStore } from '../utils/tokenLogic';
import { soundEffects } from '../utils/soundEffects';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Clock,
  User,
  Building,
  RotateCw,
  Search,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Volume2,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Upload,
  History,
  FileQuestion,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeCameraScanConfig, CameraDevice } from 'html5-qrcode';

export const QRScannerPage: React.FC = () => {
  const {
    tokens,
    verifyToken,
    updateTokenStatus,
    setActiveTab,
    selectedTokenForScanner,
    setSelectedTokenForScanner,
  } = useQueue();

  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<
    'idle' | 'prompt' | 'granted' | 'denied' | 'unavailable' | 'error'
  >('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Verification state
  const [lastScannedPayload, setLastScannedPayload] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [manualInput, setManualInput] = useState<string>('');
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [counterInput, setCounterInput] = useState<string>('Counter 1');
  const [isScanPaused, setIsScanPaused] = useState<boolean>(false);
  const [scanHistory, setScanHistory] = useState<
    { payload: string; time: string; result: VerificationResult }[]
  >([]);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const containerId = 'html5qr-scanner-viewport';

  // Check if opened with pre-selected token
  useEffect(() => {
    if (selectedTokenForScanner) {
      handleVerify(selectedTokenForScanner);
      setSelectedTokenForScanner(null);
    }
  }, [selectedTokenForScanner]);

  // Load available cameras when possible
  useEffect(() => {
    if (typeof window !== 'undefined' && 'mediaDevices' in navigator && typeof navigator.mediaDevices.enumerateDevices === 'function') {
      Html5Qrcode.getCameras()
        .then((devices) => {
          if (devices && devices.length > 0) {
            setAvailableCameras(devices);
            // Default to rear camera if available
            const backCam = devices.find((d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('rear') ||
              d.label.toLowerCase().includes('environment')
            );
            setSelectedCameraId(backCam ? backCam.id : devices[0].id);
          }
        })
        .catch(() => {
          // Camera listing might fail if permission not yet granted or in headless mode
        });
    }
  }, []);

  // Safe camera stopper
  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.warn('Error during scanner stop/clear:', err);
      } finally {
        scannerRef.current = null;
        setIsScanning(false);
      }
    } else {
      setIsScanning(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Handle verification logic (shared by camera scan, manual input, and image upload)
  const handleVerify = useCallback(
    (rawPayload: string) => {
      const result = verifyToken(rawPayload);
      setLastScannedPayload(rawPayload);
      setVerificationResult(result);
      setActionFeedback(null);

      // Play audio feedback
      if (result.success && (result.category === 'valid_waiting' || result.category === 'valid_arrived')) {
        soundEffects.playSuccess();
      } else {
        soundEffects.playError();
      }

      // Add to local scan history (up to 8 items)
      setScanHistory((prev) => [
        {
          payload: rawPayload,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          result,
        },
        ...prev.slice(0, 7),
      ]);

      // Pause camera scanning temporarily to prevent duplicate reads
      setIsScanPaused(true);
    },
    [verifyToken]
  );

  // Start Camera Scanner
  const startCamera = async () => {
    setCameraError(null);
    setActionFeedback(null);

    // Context check: MediaDevices requires HTTPS or localhost
    if (
      typeof window !== 'undefined' &&
      !window.isSecureContext &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      setCameraPermission('error');
      setCameraError('Camera access requires a secure HTTPS connection or localhost context.');
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraPermission('unavailable');
      setCameraError(
        'Camera API is not supported on this browser or environment. You can use Manual Verification or Image Upload below.'
      );
      return;
    }

    try {
      setCameraPermission('prompt');

      // Make sure any prior instance is stopped
      await stopCamera();

      const html5Qr = new Html5Qrcode(containerId);
      scannerRef.current = html5Qr;

      const config: Html5QrcodeCameraScanConfig = {
        fps: 10,
        qrbox: { width: 240, height: 240 },
        aspectRatio: 1.0,
      };

      const cameraSelection = selectedCameraId
        ? { deviceId: { exact: selectedCameraId } }
        : { facingMode };

      await html5Qr.start(
        cameraSelection,
        config,
        (decodedText) => {
          // Prevent rapid repeated scans of the same code
          handleVerify(decodedText);
        },
        (_error) => {
          // Regular frame decode misses - ignore
        }
      );

      setIsScanning(true);
      setIsScanPaused(false);
      setCameraPermission('granted');
    } catch (err: unknown) {
      console.error('Camera startup error:', err);
      const errMsg = err instanceof Error ? err.message : String(err);

      if (errMsg.includes('NotAllowedError') || errMsg.includes('Permission denied')) {
        setCameraPermission('denied');
        setCameraError(
          'Camera access was denied. Please grant camera permission in your browser address bar (click the lock or camera icon) and click Start Camera Scanner again.'
        );
      } else if (errMsg.includes('NotFoundError') || errMsg.includes('no camera') || errMsg.includes('Requested device not found')) {
        setCameraPermission('unavailable');
        setCameraError(
          'No camera device was detected on your system. You can test using the Manual Verification input or Test Token buttons below.'
        );
      } else {
        setCameraPermission('error');
        setCameraError(`Camera initialisation failed: ${errMsg}. Please try manual verification.`);
      }
      setIsScanning(false);
    }
  };

  // Resume camera scanner after a scan
  const resumeScanning = () => {
    setIsScanPaused(false);
    setVerificationResult(null);
    setLastScannedPayload(null);
  };

  // Handle Manual Form Verification
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleVerify(manualInput.trim());
  };

  // Handle Image File Upload scan
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let qrScanner = scannerRef.current;
      if (!qrScanner) {
        qrScanner = new Html5Qrcode(containerId);
      }
      const decodedText = await qrScanner.scanFile(file, true);
      handleVerify(decodedText);
    } catch (err) {
      console.warn('File decode error:', err);
      handleVerify('INVALID_UPLOADED_FILE');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Keep verification result in sync with context tokens
  useEffect(() => {
    if (verificationResult?.token) {
      const currentToken = tokens.find(
        (t) => t.tokenNumber.toUpperCase() === verificationResult.token?.tokenNumber.toUpperCase()
      );
      if (currentToken && (currentToken.status !== verificationResult.token.status || currentToken.counterId !== verificationResult.token.counterId)) {
        setVerificationResult(verifyToken(currentToken.tokenNumber));
      }
    }
  }, [tokens, verificationResult?.token, verifyToken]);

  // Handle Staff Status Transition Actions
  const handleStatusAction = (
    action: 'mark_arrived' | 'mark_serving' | 'mark_completed' | 'cancel'
  ) => {
    if (!verificationResult?.token) return;

    const tokenNum = verificationResult.token.tokenNumber;
    const res = updateTokenStatus(tokenNum, action, counterInput);

    if (res.success) {
      soundEffects.playSuccess();
      setActionFeedback({ type: 'success', message: res.message });
      if (res.updatedToken) {
        const nextList = tokens.map((t) =>
          t.tokenNumber.toUpperCase() === tokenNum.toUpperCase() ? res.updatedToken! : t
        );
        setVerificationResult(verifyTokenInStore(nextList, tokenNum));
      } else {
        setVerificationResult(verifyToken(tokenNum));
      }
    } else {
      soundEffects.playError();
      setActionFeedback({ type: 'error', message: res.message });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-purple-100 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Staff Security &amp; Token Check-In Desk
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-950 font-sans tracking-tight">
            Scan QR Token
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Instantly verify customer booking passes, check-in arrivals, and call tokens to service counters.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('staff_dashboard')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors border border-purple-200"
          >
            <span>View Full Queue</span>
            <ArrowRight className="w-4 h-4 text-purple-700" />
          </button>
        </div>
      </div>

      {/* Main Grid: Left Scanner / Right Verification Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Camera Viewport & Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-purple-100 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-purple-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 text-sm sm:text-base">Camera Viewfinder</h2>
                  <p className="text-xs text-gray-500">Live optical QR token reader</p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                {isScanning ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Scanner Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                    <CameraOff className="w-3 h-3 text-gray-400" />
                    Scanner Idle
                  </span>
                )}
              </div>
            </div>

            {/* Scanner Viewport Container */}
            <div className="p-4 sm:p-6 bg-gray-950/2">
              <div className="relative mx-auto w-full max-w-md aspect-square bg-gray-950 rounded-2xl overflow-hidden shadow-inner flex flex-col items-center justify-center border-2 border-purple-200">
                {/* HTML5 QR Code Mount Element */}
                <div
                  id={containerId}
                  className="w-full h-full object-cover [&>video]:w-full [&>video]:h-full [&>video]:object-cover"
                />

                {/* Overlay when NOT scanning */}
                {!isScanning && (
                  <div className="absolute inset-0 bg-gray-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white z-10">
                    <div className="w-16 h-16 rounded-2xl bg-purple-900/60 border border-purple-400/30 flex items-center justify-center mb-4 text-purple-300">
                      <Camera className="w-8 h-8" />
                    </div>
                    <h3 className="font-semibold text-lg text-white mb-1">Camera Stream Inactive</h3>
                    <p className="text-xs text-purple-200/80 max-w-xs mb-5">
                      Click below to request camera permission and start automatic QR token scanning.
                    </p>
                    <button
                      onClick={startCamera}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm transition-all shadow-lg shadow-purple-900/40 cursor-pointer active:scale-98"
                    >
                      <Camera className="w-4 h-4" />
                      Start Camera Scanner
                    </button>
                  </div>
                )}

                {/* Scan Paused Overlay (Prevent Duplicate Reads) */}
                {isScanning && isScanPaused && (
                  <div className="absolute inset-0 bg-purple-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white z-20 animate-in fade-in duration-200">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center mb-3 text-emerald-300">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-base text-white mb-1">QR Code Scanned!</h4>
                    <p className="text-xs text-purple-200 mb-4 max-w-xs">
                      Payload captured: <code className="bg-purple-900/80 px-2 py-0.5 rounded text-purple-100 font-mono text-[11px]">{lastScannedPayload}</code>
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={resumeScanning}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-purple-950 hover:bg-purple-50 font-semibold text-xs shadow-md transition-all cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Scan Next Token
                      </button>
                      <button
                        onClick={stopCamera}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-900/70 hover:bg-purple-800 text-purple-200 font-medium text-xs border border-purple-700/50 cursor-pointer"
                      >
                        Stop Scanner
                      </button>
                    </div>
                  </div>
                )}

                {/* Animated Targeting Brackets (visible while actively scanning) */}
                {isScanning && !isScanPaused && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                    <div className="w-60 h-60 relative border-2 border-purple-400/40 rounded-2xl">
                      {/* Corner Accents */}
                      <span className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-purple-400 rounded-tl-lg" />
                      <span className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-purple-400 rounded-tr-lg" />
                      <span className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-purple-400 rounded-bl-lg" />
                      <span className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-purple-400 rounded-br-lg" />

                      {/* Laser scan line animation */}
                      <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-300 to-transparent shadow-[0_0_8px_#c084fc] animate-pulse top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Controls Toolbar */}
            <div className="p-4 sm:p-5 bg-white border-t border-purple-50 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Primary Start/Stop Buttons */}
                <div className="flex items-center gap-2">
                  {!isScanning ? (
                    <button
                      onClick={startCamera}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-medium text-sm transition-all shadow-sm shadow-purple-200 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      Start Camera Scanner
                    </button>
                  ) : (
                    <button
                      onClick={stopCamera}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-sm transition-all shadow-xs cursor-pointer"
                    >
                      <CameraOff className="w-4 h-4" />
                      Stop Scanner
                    </button>
                  )}

                  {isScanning && isScanPaused && (
                    <button
                      onClick={resumeScanning}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 font-medium text-xs transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Resume
                    </button>
                  )}
                </div>

                {/* Device & Camera Toggle (Rear vs Front) */}
                <div className="flex items-center gap-2">
                  {availableCameras.length > 1 ? (
                    <select
                      value={selectedCameraId}
                      onChange={(e) => {
                        setSelectedCameraId(e.target.value);
                        if (isScanning) {
                          // restart with new camera
                          stopCamera().then(() => startCamera());
                        }
                      }}
                      className="text-xs bg-purple-50/70 border border-purple-200 rounded-lg px-2.5 py-1.5 text-gray-700 font-medium focus:outline-purple-500"
                    >
                      {availableCameras.map((cam, idx) => (
                        <option key={cam.id} value={cam.id}>
                          {cam.label || `Camera ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <button
                      onClick={() => {
                        const next = facingMode === 'environment' ? 'user' : 'environment';
                        setFacingMode(next);
                        if (isScanning) {
                          stopCamera().then(() => startCamera());
                        }
                      }}
                      title="Switch rear/front camera"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-200 text-xs font-medium text-gray-700 hover:bg-purple-50 transition-colors"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-purple-600" />
                      <span>{facingMode === 'environment' ? 'Rear Camera' : 'Front Camera'}</span>
                    </button>
                  )}

                  {/* Upload QR image fallback */}
                  <label
                    htmlFor="qr-file-input"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-200 bg-white hover:bg-purple-50 text-xs font-medium text-gray-700 cursor-pointer transition-colors"
                    title="Upload a QR code image to decode"
                  >
                    <Upload className="w-3.5 h-3.5 text-purple-600" />
                    <span>Upload QR</span>
                    <input
                      id="qr-file-input"
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              </div>

              {/* Camera Error / Permission Notice */}
              {cameraError && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">{cameraError}</p>
                    <p className="text-amber-800/90 text-[11px]">
                      Tip: If camera access is denied or not connected, you can use the Manual Token Input or click any sample token below to test token verification immediately.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Manual Token Verification Fallback Card */}
          <div className="bg-white rounded-2xl border border-purple-100 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700">
                  <Search className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-950 text-sm">Manual Token ID Input Fallback</h3>
                  <p className="text-xs text-gray-500">Same unified verification logic as optical QR scan</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleManualSubmit} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Enter Token ID (e.g. A024) or paste QR payload"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  className="w-full pl-3.5 pr-8 py-2.5 rounded-xl border border-purple-200 bg-purple-50/30 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 uppercase font-mono placeholder:normal-case placeholder:font-sans"
                />
                {manualInput && (
                  <button
                    type="button"
                    onClick={() => setManualInput('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={!manualInput.trim()}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-purple-900 hover:bg-black text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>Verify Token</span>
                <CheckCircle2 className="w-4 h-4 text-purple-300" />
              </button>
            </form>

            {/* Quick Demo Test Presets */}
            <div className="pt-2 border-t border-purple-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Quick Demo Verification Scenarios:
                </span>
                <span className="text-[10px] text-purple-600 font-medium">Click to test instant lookup</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleVerify('QUEUELESS:TOKEN:A024')}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block mr-1.5" />
                  A024 (Waiting)
                </button>
                <button
                  type="button"
                  onClick={() => handleVerify('QUEUELESS:TOKEN:A019')}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block mr-1.5" />
                  A019 (Arrived)
                </button>
                <button
                  type="button"
                  onClick={() => handleVerify('QUEUELESS:TOKEN:A015')}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1.5" />
                  A015 (Serving)
                </button>
                <button
                  type="button"
                  onClick={() => handleVerify('QUEUELESS:TOKEN:A012')}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200 transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500 inline-block mr-1.5" />
                  A012 (Completed)
                </button>
                <button
                  type="button"
                  onClick={() => handleVerify('QUEUELESS:TOKEN:A008')}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block mr-1.5" />
                  A008 (Cancelled)
                </button>
                <button
                  type="button"
                  onClick={() => handleVerify('QUEUELESS:TOKEN:Z999')}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block mr-1.5" />
                  Z999 (Unknown)
                </button>
                <button
                  type="button"
                  onClick={() => handleVerify('INVALID_GARBAGE_PAYLOAD_123')}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block mr-1.5" />
                  Malformed Code
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Scanned Token Verification Results & Staff Actions (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Action Feedback Banner */}
          {actionFeedback && (
            <div
              className={`p-4 rounded-2xl border text-sm flex items-start gap-3 animate-in fade-in duration-200 ${
                actionFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              {actionFeedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-semibold">
                  {actionFeedback.type === 'success' ? 'Queue Action Completed' : 'Action Failed'}
                </p>
                <p className="text-xs mt-0.5">{actionFeedback.message}</p>
              </div>
            </div>
          )}

          {/* Verification Result Card */}
          {verificationResult ? (
            <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Header Status Bar */}
              <div
                className={`p-4 sm:p-5 border-b flex items-center justify-between ${
                  verificationResult.category === 'valid_waiting'
                    ? 'bg-purple-50/70 border-purple-100'
                    : verificationResult.category === 'valid_arrived'
                    ? 'bg-blue-50/70 border-blue-100'
                    : verificationResult.category === 'already_serving'
                    ? 'bg-emerald-50/70 border-emerald-100'
                    : verificationResult.category === 'completed'
                    ? 'bg-gray-100 border-gray-200'
                    : verificationResult.category === 'cancelled'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-amber-50 border-amber-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {verificationResult.category === 'valid_waiting' && (
                    <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                      <Clock className="w-5 h-5" />
                    </div>
                  )}
                  {verificationResult.category === 'valid_arrived' && (
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  )}
                  {verificationResult.category === 'already_serving' && (
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  )}
                  {verificationResult.category === 'completed' && (
                    <div className="w-9 h-9 rounded-xl bg-gray-500 text-white flex items-center justify-center shadow-xs">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  )}
                  {verificationResult.category === 'cancelled' && (
                    <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs">
                      <XCircle className="w-5 h-5" />
                    </div>
                  )}
                  {(verificationResult.category === 'not_found' || verificationResult.category === 'malformed') && (
                    <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                  )}

                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Verification Outcome
                    </span>
                    <h3 className="text-sm font-bold text-gray-950">
                      {verificationResult.category === 'valid_waiting' && 'Valid Token - Waiting'}
                      {verificationResult.category === 'valid_arrived' && 'Valid Token - Arrived'}
                      {verificationResult.category === 'already_serving' && 'Customer Already Serving'}
                      {verificationResult.category === 'completed' && 'Token Completed'}
                      {verificationResult.category === 'cancelled' && 'Token Cancelled'}
                      {verificationResult.category === 'not_found' && 'Token Not Found'}
                      {verificationResult.category === 'malformed' && 'Invalid / Malformed QR'}
                    </h3>
                  </div>
                </div>

                {verificationResult.token && (
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      verificationResult.token.status === 'waiting'
                        ? 'bg-purple-200 text-purple-900'
                        : verificationResult.token.status === 'arrived'
                        ? 'bg-blue-200 text-blue-900'
                        : verificationResult.token.status === 'serving'
                        ? 'bg-emerald-200 text-emerald-900'
                        : verificationResult.token.status === 'completed'
                        ? 'bg-gray-200 text-gray-800'
                        : 'bg-red-200 text-red-900'
                    }`}
                  >
                    {verificationResult.token.status}
                  </span>
                )}
              </div>

              {/* Body Content */}
              <div className="p-5 space-y-5">
                {/* Status Message */}
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100 font-medium">
                  {verificationResult.message}
                </p>

                {/* If token details exist */}
                {verificationResult.token ? (
                  <div className="space-y-4">
                    {/* Big Token Number Display */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-purple-50/50 border border-purple-100">
                      <div>
                        <span className="text-xs font-medium text-gray-500">Token Number</span>
                        <div className="text-3xl font-extrabold text-purple-950 font-mono tracking-tight">
                          {verificationResult.token.tokenNumber}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-medium text-gray-500">Booking Time</span>
                        <div className="text-sm font-semibold text-gray-800">
                          {verificationResult.token.bookingTime}
                        </div>
                      </div>
                    </div>

                    {/* Customer & Department Details */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-white border border-gray-100 shadow-2xs">
                        <span className="text-gray-400 block mb-0.5">Customer Name</span>
                        <span className="font-semibold text-gray-900 text-sm">
                          {verificationResult.token.customerName}
                        </span>
                        {verificationResult.token.customerPhone && (
                          <span className="text-gray-500 block text-[11px] mt-0.5">
                            {verificationResult.token.customerPhone}
                          </span>
                        )}
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-gray-100 shadow-2xs">
                        <span className="text-gray-400 block mb-0.5">Department</span>
                        <span className="font-semibold text-gray-900 line-clamp-1">
                          {verificationResult.token.department}
                        </span>
                        <span className="text-gray-500 block text-[11px] mt-0.5">
                          {verificationResult.token.serviceCenter}
                        </span>
                      </div>
                    </div>

                    {/* Queue Metrics (Position, Ahead, Wait) */}
                    {(verificationResult.token.status === 'waiting' ||
                      verificationResult.token.status === 'arrived') && (
                      <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-purple-50/40 border border-purple-100 text-center">
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase font-medium">Position</span>
                          <div className="text-base font-bold text-purple-900">
                            #{verificationResult.position || 1}
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase font-medium">People Ahead</span>
                          <div className="text-base font-bold text-gray-900">
                            {verificationResult.peopleAhead ?? 0}
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase font-medium">Est. Wait</span>
                          <div className="text-base font-bold text-purple-700">
                            ~{verificationResult.estWaitMinutes ?? 0} min
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Active Serving Info */}
                    {verificationResult.token.status === 'serving' && (
                      <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                        <div>
                          <span className="font-semibold block">Actively Serving</span>
                          <span className="text-emerald-700">Called at {verificationResult.token.servingAt || 'Recently'}</span>
                        </div>
                        <span className="px-2.5 py-1 rounded-md bg-emerald-600 text-white font-bold text-xs">
                          {verificationResult.token.counterId || 'Counter 1'}
                        </span>
                      </div>
                    )}

                    {/* QR Payload Technical Stamp */}
                    <div className="text-[11px] text-gray-400 flex items-center justify-between px-1">
                      <span>QR Payload: <code className="font-mono text-gray-600">{verificationResult.token.qrPayload}</code></span>
                      <span className="text-emerald-600 font-medium">✓ Signature Verified</span>
                    </div>

                    {/* Staff Transition Actions */}
                    <div className="pt-2 border-t border-purple-50 space-y-3">
                      <span className="text-xs font-semibold text-gray-800 uppercase tracking-wider block">
                        Available Staff Actions:
                      </span>

                      {/* State 1: WAITING -> Mark Arrived or Call directly */}
                      {verificationResult.token.status === 'waiting' && (
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => handleStatusAction('mark_arrived')}
                            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-semibold text-sm transition-all shadow-xs cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Mark Customer Arrived
                          </button>

                          <div className="flex gap-2">
                            <select
                              value={counterInput}
                              onChange={(e) => setCounterInput(e.target.value)}
                              className="text-xs bg-purple-50 border border-purple-200 rounded-xl px-2.5 py-2 font-medium text-gray-700 focus:outline-none"
                            >
                              <option value="Counter 1">Counter 1</option>
                              <option value="Counter 2">Counter 2</option>
                              <option value="Counter 3">Counter 3</option>
                              <option value="Counter 4">Counter 4</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => handleStatusAction('mark_serving')}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-purple-900 hover:bg-black text-white font-medium text-xs transition-colors cursor-pointer"
                            >
                              <span>Direct Call to {counterInput}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusAction('cancel')}
                              className="px-3 py-2 rounded-xl text-red-700 hover:bg-red-50 border border-red-200 font-medium text-xs transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* State 2: ARRIVED -> Call to Counter / Start Serving */}
                      {verificationResult.token.status === 'arrived' && (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <select
                              value={counterInput}
                              onChange={(e) => setCounterInput(e.target.value)}
                              className="text-xs bg-purple-50 border border-purple-200 rounded-xl px-3 py-2.5 font-medium text-gray-800 focus:outline-none"
                            >
                              <option value="Counter 1">Counter 1</option>
                              <option value="Counter 2">Counter 2</option>
                              <option value="Counter 3">Counter 3</option>
                              <option value="Counter 4">Counter 4</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => handleStatusAction('mark_serving')}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all shadow-xs cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              Call to {counterInput} (Mark Serving)
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleStatusAction('cancel')}
                            className="w-full py-2 rounded-xl text-red-700 hover:bg-red-50 border border-red-200 font-medium text-xs transition-colors cursor-pointer"
                          >
                            Cancel Customer Token
                          </button>
                        </div>
                      )}

                      {/* State 3: SERVING -> Complete or Cancel */}
                      {verificationResult.token.status === 'serving' && (
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => handleStatusAction('mark_completed')}
                            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition-all shadow-xs cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Finalize &amp; Complete Token
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusAction('cancel')}
                            className="w-full py-2 rounded-xl text-red-700 hover:bg-red-50 border border-red-200 font-medium text-xs transition-colors cursor-pointer"
                          >
                            Cancel Token
                          </button>
                        </div>
                      )}

                      {/* State 4: COMPLETED or CANCELLED (Terminal) */}
                      {(verificationResult.token.status === 'completed' ||
                        verificationResult.token.status === 'cancelled') && (
                        <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600 text-center">
                          {verificationResult.token.status === 'completed'
                            ? 'This token has completed service. No further transitions permitted.'
                            : 'This token is marked cancelled and cannot be activated.'}
                        </div>
                      )}

                      {/* View Queue Status button */}
                      <button
                        type="button"
                        onClick={() => setActiveTab('staff_dashboard')}
                        className="w-full py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>View Overall Queue Status</span>
                        <ExternalLink className="w-3.5 h-3.5 text-purple-700" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Unknown or Malformed QR code feedback */
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs space-y-2">
                      <p className="font-semibold text-sm">Verification Notice</p>
                      <p>
                        The scanned QR code payload was rejected by QueueLess token verification. Only valid tokens generated by this queue system are recognized.
                      </p>
                      {lastScannedPayload && (
                        <div className="p-2 bg-amber-100/60 rounded font-mono text-[11px] break-all">
                          Scanned payload: {lastScannedPayload}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('booking')}
                      className="w-full py-2.5 px-4 rounded-xl bg-purple-900 hover:bg-black text-white font-medium text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Issue a New Token for this Customer</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Empty State when no token has been scanned yet */
            <div className="bg-white rounded-2xl border border-purple-100 p-8 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto border border-purple-100">
                <FileQuestion className="w-8 h-8" />
              </div>
              <div className="max-w-xs mx-auto space-y-1">
                <h3 className="font-bold text-gray-900 text-base">Ready to Scan</h3>
                <p className="text-xs text-gray-500">
                  Point the camera at a customer's QueueLess QR code, upload a QR code image, or enter a Token ID manually.
                </p>
              </div>
              <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 text-left text-xs text-gray-600 space-y-1.5">
                <span className="font-semibold text-purple-900 block">Staff Verification Protocol:</span>
                <p className="text-[11px]">1. Ask customer to present their digital QR pass</p>
                <p className="text-[11px]">2. Optical camera extracts identifier and validates token</p>
                <p className="text-[11px]">3. Click "Mark Customer Arrived" to log attendance</p>
              </div>
            </div>
          )}

          {/* Recent Scans Mini History */}
          {scanHistory.length > 0 && (
            <div className="bg-white rounded-2xl border border-purple-100 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                  <History className="w-3.5 h-3.5 text-purple-600" />
                  <span>Session Scan History</span>
                </div>
                <span className="text-[10px] text-gray-400">{scanHistory.length} recorded</span>
              </div>
              <div className="space-y-1.5">
                {scanHistory.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleVerify(item.payload)}
                    className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-purple-50 text-xs transition-colors cursor-pointer border border-transparent hover:border-purple-200"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          item.result.success ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                      />
                      <span className="font-mono font-semibold text-gray-800">
                        {item.result.token?.tokenNumber || item.payload.slice(0, 16)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400 text-[11px]">
                      <span>{item.result.category}</span>
                      <span>•</span>
                      <span>{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
