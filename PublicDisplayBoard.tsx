import React, { useState, useEffect } from 'react';
import { useQueue } from '../context/QueueContext';
import { Tv, Sparkles, Clock, Volume2, ArrowRight } from 'lucide-react';

export const PublicDisplayBoard: React.FC = () => {
  const { tokens, setActiveTab } = useQueue();
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const servingTokens = tokens.filter((t) => t.status === 'serving');
  const arrivedTokens = tokens.filter((t) => t.status === 'arrived');
  const waitingTokens = tokens.filter((t) => t.status === 'waiting');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Lobby Display Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-gray-950 to-purple-950 text-white p-6 sm:p-8 rounded-3xl border border-purple-800/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-purple-300 text-xs font-bold uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Live Lobby Queue Board
          </div>
          <h1 className="text-2xl sm:text-4xl font-black font-sans tracking-tight">
            Queue<span className="text-purple-400">Less</span> Smart Display
          </h1>
          <p className="text-xs sm:text-sm text-purple-200/80 mt-1">
            Central Innovation Hub • Ground Lobby Displays
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-xs text-purple-300 uppercase tracking-widest font-mono">Current Time</span>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-wider">
              {currentTime}
            </div>
          </div>

          <button
            onClick={() => setActiveTab('scanner')}
            className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-medium text-xs transition-colors"
          >
            <span>Staff Scanner</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Grid: Serving Counters (Big High Contrast) & Next In Line */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Serving Counters - 7 Columns */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-950 flex items-center gap-2 uppercase tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Now Serving at Counters
            </h2>
            <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
              {servingTokens.length} Active Sessions
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {servingTokens.length > 0 ? (
              servingTokens.map((tok) => (
                <div
                  key={tok.id}
                  className="bg-white rounded-3xl border-2 border-purple-600/40 p-6 shadow-md shadow-purple-500/5 relative overflow-hidden flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-purple-50">
                    <span className="px-3 py-1 rounded-full bg-purple-900 text-white text-xs font-extrabold uppercase tracking-wider">
                      {tok.counterId || 'Counter 1'}
                    </span>
                    <span className="text-[11px] font-mono text-purple-600 font-semibold">
                      {tok.servingAt ? `Called ${tok.servingAt}` : 'Just Called'}
                    </span>
                  </div>

                  <div className="py-6 text-center">
                    <span className="text-xs uppercase tracking-widest text-gray-400 font-bold">
                      Ticket Number
                    </span>
                    <div className="text-5xl font-black text-purple-950 font-mono tracking-tight mt-1">
                      {tok.tokenNumber}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-purple-50 text-center">
                    <p className="text-xs font-bold text-gray-800 truncate">{tok.customerName}</p>
                    <p className="text-[11px] text-gray-500 truncate">{tok.department}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 bg-white rounded-3xl border border-purple-100 p-12 text-center text-gray-400 space-y-2">
                <Clock className="w-8 h-8 mx-auto text-purple-300" />
                <p className="font-semibold text-gray-700">All Counters Currently Available</p>
                <p className="text-xs text-gray-400">Waiting for staff to call the next customer.</p>
              </div>
            )}
          </div>
        </div>

        {/* Up Next & Queue Status - 5 Columns */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-950 flex items-center gap-2 uppercase tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
              Up Next (Checked-In &amp; Ready)
            </h2>
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
              {arrivedTokens.length} Ready
            </span>
          </div>

          <div className="bg-white rounded-3xl border border-purple-100 p-5 shadow-xs space-y-3">
            {arrivedTokens.length > 0 ? (
              <div className="space-y-2.5">
                {arrivedTokens.map((tok, idx) => (
                  <div
                    key={tok.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-purple-50/50 border border-purple-100 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-purple-200 text-purple-900 font-bold flex items-center justify-center text-xs">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-mono font-bold text-purple-950 text-sm">
                          {tok.tokenNumber}
                        </div>
                        <div className="text-gray-500 text-[11px]">{tok.department}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold uppercase">
                        Checked-In
                      </span>
                      <div className="text-[10px] text-gray-400 mt-0.5">{tok.bookingTime}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-400 text-xs">
                No checked-in customers in line.
              </div>
            )}

            {/* Waiting (Not yet arrived) */}
            {waitingTokens.length > 0 && (
              <div className="pt-3 border-t border-purple-50">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">
                  Pre-Booked Waiting Arrival ({waitingTokens.length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {waitingTokens.map((tok) => (
                    <span
                      key={tok.id}
                      className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 font-mono text-xs font-semibold border border-gray-200"
                    >
                      {tok.tokenNumber}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
