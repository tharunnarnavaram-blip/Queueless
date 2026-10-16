import React, { useState, useEffect, useRef } from 'react';
import { useQueue } from '../context/QueueContext';
import { DEPARTMENTS, SERVICE_CENTERS } from '../data/initialData';
import { calculateQueueMetrics } from '../utils/tokenLogic';
import { soundEffects } from '../utils/soundEffects';
import QRCode from 'qrcode';
import {
  QrCode,
  Download,
  Clock,
  Users,
  CheckCircle2,
  Calendar,
  Building2,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Printer,
  Copy,
  Check,
  Camera,
  AlertCircle,
  Share2,
} from 'lucide-react';

export const CustomerBookingPage: React.FC = () => {
  const {
    tokens,
    bookToken,
    activeCustomerTokenId,
    setActiveCustomerTokenId,
    setActiveTab,
    setSelectedTokenForScanner,
  } = useQueue();

  // Booking Form State
  const [selectedDept, setSelectedDept] = useState(DEPARTMENTS[0].name);
  const [selectedCenter, setSelectedCenter] = useState(SERVICE_CENTERS[0].name);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);

  // QR Code Data URL
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Active customer token lookup
  const activeToken = tokens.find((t) => t.id === activeCustomerTokenId) || null;

  // Department info
  const currentDeptInfo = DEPARTMENTS.find((d) => d.name === selectedDept) || DEPARTMENTS[0];

  // Generate QR Code data URL when active token changes
  useEffect(() => {
    if (activeToken) {
      QRCode.toDataURL(activeToken.qrPayload, {
        width: 320,
        margin: 2,
        color: {
          dark: '#1e1b4b', // Deep indigo / black
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR generation error:', err));
    } else {
      setQrDataUrl('');
    }
  }, [activeToken?.qrPayload, activeToken?.id]);

  // Handle Token Booking Form Submission
  const handleBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      const newToken = bookToken(fullName, phoneNumber, selectedDept, selectedCenter);
      soundEffects.playSuccess();
      setIsSubmitting(false);
      // Reset form fields
      setFullName('');
      setPhoneNumber('');
    }, 300);
  };

  // Metrics for active customer token
  const metrics = activeToken
    ? calculateQueueMetrics(tokens, activeToken.tokenNumber, currentDeptInfo.avgWaitMins)
    : { position: 0, peopleAhead: 0, estWaitMinutes: 0 };

  // Copy payload text
  const copyToClipboard = () => {
    if (!activeToken) return;
    navigator.clipboard?.writeText(activeToken.qrPayload);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  // Test scan this token in staff scanner
  const testScanInScanner = () => {
    if (!activeToken) return;
    setSelectedTokenForScanner(activeToken.tokenNumber);
    setActiveTab('scanner');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white p-6 sm:p-8 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 text-xs font-semibold backdrop-blur-xs border border-purple-400/20">
            <Sparkles className="w-3.5 h-3.5" />
            Fast-Track Smart Queue Registration
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Book Token &amp; Generate Digital QR Pass
          </h1>
          <p className="text-sm sm:text-base text-purple-200/80">
            Reserve your place in line before arriving. Present your unique dynamic QR code at the service desk for touchless camera check-in.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Booking Form (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-purple-100 p-6 shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-purple-50">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-gray-950 text-base">New Queue Reservation</h2>
                <p className="text-xs text-gray-500">Instant token assignment &amp; QR issuance</p>
              </div>
            </div>

            <form onSubmit={handleBooking} className="space-y-4">
              {/* Service Center Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Service Center Location
                </label>
                <select
                  value={selectedCenter}
                  onChange={(e) => setSelectedCenter(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-purple-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/30 font-medium"
                >
                  {SERVICE_CENTERS.map((sc) => (
                    <option key={sc.id} value={sc.name}>
                      {sc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Department / Service Type
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {DEPARTMENTS.map((dept) => {
                    const isSelected = selectedDept === dept.name;
                    return (
                      <div
                        key={dept.id}
                        onClick={() => setSelectedDept(dept.name)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-purple-50/80 border-purple-600 ring-1 ring-purple-600/30 shadow-2xs'
                            : 'border-purple-100 hover:border-purple-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold text-gray-900">
                          <span>{dept.name}</span>
                          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-mono">
                            Prefix {dept.codePrefix}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1">{dept.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-purple-700 font-medium">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> ~{dept.avgWaitMins}m / person
                          </span>
                          <span>•</span>
                          <span>{dept.activeCounters.join(', ')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Customer Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Customer Full Name <span className="text-purple-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jordan Hayes"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-purple-200 bg-purple-50/20 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
                />
              </div>

              {/* Customer Phone (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Mobile Number (for SMS wait updates)
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +1 (555) 019-2834"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-purple-200 bg-purple-50/20 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !fullName.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-semibold text-sm transition-all shadow-md shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Generating Secure Token...</span>
                ) : (
                  <>
                    <QrCode className="w-4 h-4" />
                    <span>Book Instant Token &amp; Generate QR</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Customer Active Pass & QR Code Display (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {activeToken ? (
            <div className="bg-white rounded-3xl border border-purple-100 shadow-sm overflow-hidden space-y-6 p-6 sm:p-8">
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-purple-50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold uppercase tracking-wider">
                      Active Customer Pass
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                        activeToken.status === 'waiting'
                          ? 'bg-purple-200 text-purple-900'
                          : activeToken.status === 'arrived'
                          ? 'bg-blue-200 text-blue-900'
                          : activeToken.status === 'serving'
                          ? 'bg-emerald-200 text-emerald-900 animate-pulse'
                          : activeToken.status === 'completed'
                          ? 'bg-gray-200 text-gray-800'
                          : 'bg-red-200 text-red-900'
                      }`}
                    >
                      {activeToken.status === 'serving' ? 'Serving Now!' : activeToken.status}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-950 mt-1">Digital QR Boarding Pass</h3>
                  <p className="text-xs text-gray-500">Show this QR code to staff at the entrance scanner</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={testScanInScanner}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-semibold border border-purple-200 transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5 text-purple-700" />
                    <span>Test in Staff Scanner</span>
                  </button>
                </div>
              </div>

              {/* QR Code and Token Number Showcase */}
              <div className="flex flex-col md:flex-row items-center justify-center gap-8 py-2">
                {/* Generated QR Code Card */}
                <div className="bg-white p-4 rounded-2xl border-2 border-purple-200 shadow-lg shadow-purple-500/5 flex flex-col items-center">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QueueLess QR Token ${activeToken.tokenNumber}`}
                      className="w-52 h-52 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-52 h-52 bg-purple-50 animate-pulse rounded-lg flex items-center justify-center text-purple-400">
                      Generating QR...
                    </div>
                  )}

                  <div className="mt-3 text-center">
                    <div className="font-mono text-xs font-bold text-purple-950 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-100">
                      {activeToken.tokenNumber}
                    </div>
                  </div>
                </div>

                {/* Token Stats and Details */}
                <div className="space-y-4 flex-1 w-full">
                  <div>
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Your Queue Number
                    </span>
                    <div className="text-4xl sm:text-5xl font-black text-gray-950 font-mono tracking-tight text-purple-950">
                      {activeToken.tokenNumber}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-purple-50/40 border border-purple-100">
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">
                        Customer
                      </span>
                      <span className="font-bold text-gray-900 text-sm block truncate">
                        {activeToken.customerName}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-purple-50/40 border border-purple-100">
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">
                        Booked Time
                      </span>
                      <span className="font-bold text-gray-900 text-sm block">
                        {activeToken.bookingTime}
                      </span>
                    </div>
                  </div>

                  {/* Live Position & Estimated Wait Counter */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 via-white to-purple-50 border border-purple-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-600">Queue Position:</span>
                      <span className="font-bold text-purple-900 text-base">
                        #{metrics.position > 0 ? metrics.position : 'Serving'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-600">People Ahead:</span>
                      <span className="font-bold text-gray-900">
                        {metrics.peopleAhead} {metrics.peopleAhead === 1 ? 'person' : 'people'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-600">Estimated Wait:</span>
                      <span className="font-bold text-purple-700">
                        ~{metrics.estWaitMinutes} minutes
                      </span>
                    </div>
                  </div>

                  {/* Service Department Info */}
                  <div className="text-xs text-gray-600 space-y-0.5">
                    <p className="font-semibold text-gray-900">{activeToken.department}</p>
                    <p className="text-gray-500 text-[11px]">{activeToken.serviceCenter}</p>
                  </div>
                </div>
              </div>

              {/* Download & Action Buttons */}
              <div className="pt-4 border-t border-purple-50 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {qrDataUrl && (
                    <a
                      href={qrDataUrl}
                      download={`QueueLess-Token-${activeToken.tokenNumber}.png`}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-900 hover:bg-black text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download QR Code</span>
                    </a>
                  )}

                  <button
                    onClick={copyToClipboard}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-purple-200 bg-white hover:bg-purple-50 text-gray-700 text-xs font-medium transition-colors"
                  >
                    {copiedPayload ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-semibold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-purple-600" />
                        <span>Copy QR Code Payload</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-[11px] text-gray-400 font-mono">
                  Payload: {activeToken.qrPayload}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-purple-100 p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto border border-purple-100">
                <QrCode className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">No Active Token Selected</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Fill in the booking form on the left to issue a live token with an optical QR code for entrance verification.
              </p>
            </div>
          )}

          {/* Customer Token Quick Switcher (If multiple tokens exist) */}
          <div className="bg-white rounded-3xl border border-purple-100 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900 text-xs uppercase tracking-wider">
                Switch or View Other Demo Customer Passes
              </h4>
              <span className="text-[11px] text-purple-600 font-medium">
                {tokens.length} total tokens in system
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {tokens.slice(0, 8).map((tok) => {
                const isSelected = activeCustomerTokenId === tok.id;
                return (
                  <button
                    key={tok.id}
                    onClick={() => setActiveCustomerTokenId(tok.id)}
                    className={`p-2.5 rounded-xl text-left border transition-all ${
                      isSelected
                        ? 'bg-purple-900 text-white border-purple-900 shadow-xs'
                        : 'bg-purple-50/50 hover:bg-purple-100/70 border-purple-100 text-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs">{tok.tokenNumber}</span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          tok.status === 'serving'
                            ? 'bg-emerald-400'
                            : tok.status === 'arrived'
                            ? 'bg-blue-400'
                            : tok.status === 'completed'
                            ? 'bg-gray-400'
                            : tok.status === 'cancelled'
                            ? 'bg-red-400'
                            : 'bg-purple-400'
                        }`}
                      />
                    </div>
                    <p className={`text-[11px] truncate mt-0.5 ${isSelected ? 'text-purple-200' : 'text-gray-500'}`}>
                      {tok.customerName}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
