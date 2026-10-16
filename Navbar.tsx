import React, { useState } from 'react';
import { useQueue } from '../context/QueueContext';
import { ActiveTab } from '../types';
import {
  QrCode,
  Users,
  Tv,
  Camera,
  RotateCcw,
  Volume2,
  VolumeX,
  Layers,
  Sparkles,
} from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';

export const Navbar: React.FC = () => {
  const { tokens, activeTab, setActiveTab, resetDemoData } = useQueue();
  const [soundOn, setSoundOn] = useState(true);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const waitingCount = tokens.filter((t) => t.status === 'waiting').length;
  const arrivedCount = tokens.filter((t) => t.status === 'arrived').length;
  const servingCount = tokens.filter((t) => t.status === 'serving').length;

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    soundEffects.enabled = next;
    if (next) soundEffects.playSuccess();
  };

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'scanner',
      label: 'Scan QR Token',
      icon: <Camera className="w-4 h-4" />,
      badge: 'Staff',
    },
    {
      id: 'staff_dashboard',
      label: 'Staff Queue Desk',
      icon: <Users className="w-4 h-4" />,
      badge: `${waitingCount + arrivedCount}`,
    },
    {
      id: 'booking',
      label: 'Customer Booking & QR',
      icon: <QrCode className="w-4 h-4" />,
    },
    {
      id: 'public_board',
      label: 'Live Display Board',
      icon: <Tv className="w-4 h-4" />,
      badge: `${servingCount} Active`,
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-purple-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('scanner')}>
            <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center shadow-md shadow-purple-500/20 ring-2 ring-purple-100">
              <QrCode className="w-5 h-5 text-purple-100" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg sm:text-xl tracking-tight text-gray-950 font-sans">
                  Queue<span className="text-purple-600">Less</span>
                </span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 tracking-wider hidden sm:inline-block">
                  Pro QR
                </span>
              </div>
              <p className="text-xs text-gray-500 hidden md:block">Smart Token & QR Verification</p>
            </div>
          </div>

          {/* Navigation Bar Tabs */}
          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-150 ${
                    isActive
                      ? 'bg-purple-900 text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-950 hover:bg-purple-50/80'
                  }`}
                >
                  {item.icon}
                  <span className="hidden lg:inline">{item.label}</span>
                  <span className="lg:hidden">
                    {item.id === 'scanner' ? 'Scanner' : item.id === 'booking' ? 'Book' : item.id === 'staff_dashboard' ? 'Queue' : 'Board'}
                  </span>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full hidden sm:inline-block ${
                        isActive
                          ? 'bg-purple-500 text-purple-50'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Actions & Live Status Indicator */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSound}
              title={soundOn ? 'Sound enabled (click to mute)' : 'Sound muted (click to enable)'}
              aria-label={soundOn ? 'Mute sound' : 'Enable sound'}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-purple-50 transition-colors"
            >
              {soundOn ? <Volume2 className="w-4 h-4 text-purple-600" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
            </button>

            <button
              onClick={() => {
                if (showConfirmReset) {
                  resetDemoData();
                  setShowConfirmReset(false);
                } else {
                  setShowConfirmReset(true);
                  setTimeout(() => setShowConfirmReset(false), 4000);
                }
              }}
              title="Reset demonstration queue tokens"
              aria-label="Reset demo data"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                showConfirmReset
                  ? 'bg-red-50 text-red-700 border-red-200 animate-pulse'
                  : 'bg-white text-gray-600 border-purple-200 hover:bg-purple-50'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{showConfirmReset ? 'Confirm Reset?' : 'Demo Reset'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
