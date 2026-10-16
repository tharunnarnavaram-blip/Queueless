import React, { useState } from 'react';
import { useQueue } from '../context/QueueContext';
import { QueueToken, TokenStatus } from '../types';
import { DEPARTMENTS } from '../data/initialData';
import {
  Users,
  Camera,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Check,
  XCircle,
  Play,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Trash2,
} from 'lucide-react';

export const StaffDashboard: React.FC = () => {
  const {
    tokens,
    updateTokenStatus,
    setActiveTab,
    setSelectedTokenForScanner,
    deleteToken,
  } = useQueue();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TokenStatus>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [selectedCounter, setSelectedCounter] = useState<string>('Counter 1');

  // Filter tokens
  const filteredTokens = tokens.filter((t) => {
    const matchesSearch =
      t.tokenNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.department.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesDept = deptFilter === 'all' || t.department === deptFilter;

    return matchesSearch && matchesStatus && matchesDept;
  });

  // Aggregate stats
  const waitingTokens = tokens.filter((t) => t.status === 'waiting');
  const arrivedTokens = tokens.filter((t) => t.status === 'arrived');
  const servingTokens = tokens.filter((t) => t.status === 'serving');
  const completedTokens = tokens.filter((t) => t.status === 'completed');

  const handleOpenScannerWithToken = (tokenNumber: string) => {
    setSelectedTokenForScanner(tokenNumber);
    setActiveTab('scanner');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-purple-100 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold mb-2">
            <Users className="w-3.5 h-3.5" />
            Operations Command Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-950 font-sans tracking-tight">
            Staff Queue Management Desk
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Real-time multi-counter tracking, queue prioritization, and token verification actions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('scanner')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-semibold text-sm transition-all shadow-md shadow-purple-500/20 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Launch QR Scanner</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-2xs">
          <div className="flex items-center justify-between text-purple-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Waiting in Line
            </span>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-purple-950">{waitingTokens.length}</div>
          <span className="text-[11px] text-gray-500">Awaiting arrival check-in</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-2xs">
          <div className="flex items-center justify-between text-blue-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Arrived &amp; Ready
            </span>
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-950">{arrivedTokens.length}</div>
          <span className="text-[11px] text-gray-500">Ready to call to counter</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Actively Serving
            </span>
            <Play className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-950">{servingTokens.length}</div>
          <span className="text-[11px] text-gray-500">Occupying service counters</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-2xs">
          <div className="flex items-center justify-between text-gray-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Completed Today
            </span>
            <Check className="w-4 h-4 text-gray-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{completedTokens.length}</div>
          <span className="text-[11px] text-gray-500">Finalized services</span>
        </div>
      </div>

      {/* Queue Table and Filters */}
      <div className="bg-white rounded-3xl border border-purple-100 shadow-xs overflow-hidden">
        {/* Filters Bar */}
        <div className="p-5 border-b border-purple-50 space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search token number, customer name, department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-purple-200 bg-purple-50/20 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              />
            </div>

            {/* Department Filter */}
            <div className="flex items-center gap-2">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="text-xs bg-white border border-purple-200 rounded-xl px-3 py-2 text-gray-700 font-medium focus:outline-none"
              >
                <option value="all">All Departments</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>

              {/* Counter selection for instant actions */}
              <select
                value={selectedCounter}
                onChange={(e) => setSelectedCounter(e.target.value)}
                className="text-xs bg-purple-50 border border-purple-200 rounded-xl px-3 py-2 text-purple-900 font-semibold focus:outline-none"
              >
                <option value="Counter 1">My Counter: 1</option>
                <option value="Counter 2">My Counter: 2</option>
                <option value="Counter 3">My Counter: 3</option>
                <option value="Counter 4">My Counter: 4</option>
              </select>
            </div>
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {(
              [
                { id: 'all', label: 'All Tokens', count: tokens.length },
                { id: 'waiting', label: 'Waiting', count: waitingTokens.length },
                { id: 'arrived', label: 'Arrived', count: arrivedTokens.length },
                { id: 'serving', label: 'Serving', count: servingTokens.length },
                { id: 'completed', label: 'Completed', count: completedTokens.length },
                {
                  id: 'cancelled',
                  label: 'Cancelled',
                  count: tokens.filter((t) => t.status === 'cancelled').length,
                },
              ] as const
            ).map((pill) => {
              const isSelected = statusFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  onClick={() => setStatusFilter(pill.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-purple-900 text-white shadow-xs'
                      : 'bg-purple-50/60 text-gray-700 hover:bg-purple-100/70'
                  }`}
                >
                  <span>{pill.label}</span>
                  <span
                    className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] ${
                      isSelected ? 'bg-purple-700 text-purple-100' : 'bg-white text-gray-600'
                    }`}
                  >
                    {pill.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tokens List / Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-purple-50/50 border-b border-purple-100 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                <th className="py-3 px-4 sm:px-6">Token</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Department &amp; Center</th>
                <th className="py-3 px-4">Booked</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 sm:px-6 text-right">Staff Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50">
              {filteredTokens.length > 0 ? (
                filteredTokens.map((tok) => {
                  return (
                    <tr key={tok.id} className="hover:bg-purple-50/30 transition-colors">
                      {/* Token Number */}
                      <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-purple-950 text-base">
                        <div className="flex items-center gap-2">
                          <span>{tok.tokenNumber}</span>
                          <button
                            onClick={() => handleOpenScannerWithToken(tok.tokenNumber)}
                            title="Verify in QR Scanner"
                            className="p-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200"
                          >
                            <Camera className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Customer Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-900">{tok.customerName}</div>
                        {tok.customerPhone && (
                          <div className="text-[11px] text-gray-400">{tok.customerPhone}</div>
                        )}
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-gray-800">{tok.department}</div>
                        <div className="text-[11px] text-gray-400">{tok.serviceCenter}</div>
                      </td>

                      {/* Time */}
                      <td className="py-3.5 px-4 text-gray-600 text-xs">
                        {tok.bookingTime}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            tok.status === 'waiting'
                              ? 'bg-purple-100 text-purple-800'
                              : tok.status === 'arrived'
                              ? 'bg-blue-100 text-blue-800'
                              : tok.status === 'serving'
                              ? 'bg-emerald-100 text-emerald-800'
                              : tok.status === 'completed'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              tok.status === 'serving'
                                ? 'bg-emerald-500 animate-pulse'
                                : tok.status === 'arrived'
                                ? 'bg-blue-500'
                                : tok.status === 'completed'
                                ? 'bg-gray-500'
                                : tok.status === 'cancelled'
                                ? 'bg-red-500'
                                : 'bg-purple-500'
                            }`}
                          />
                          {tok.status}
                          {tok.status === 'serving' && tok.counterId && (
                            <span className="font-normal text-[10px] text-emerald-950">({tok.counterId})</span>
                          )}
                        </span>
                      </td>

                      {/* Staff Actions */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {tok.status === 'waiting' && (
                            <button
                              onClick={() => updateTokenStatus(tok.tokenNumber, 'mark_arrived')}
                              className="px-2.5 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 text-xs font-semibold transition-colors"
                            >
                              Check-In Arrived
                            </button>
                          )}

                          {tok.status === 'arrived' && (
                            <button
                              onClick={() => updateTokenStatus(tok.tokenNumber, 'mark_serving', selectedCounter)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-2xs"
                            >
                              Call to {selectedCounter}
                            </button>
                          )}

                          {tok.status === 'serving' && (
                            <button
                              onClick={() => updateTokenStatus(tok.tokenNumber, 'mark_completed')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors shadow-2xs"
                            >
                              Complete
                            </button>
                          )}

                          {tok.status !== 'completed' && tok.status !== 'cancelled' && (
                            <button
                              onClick={() => updateTokenStatus(tok.tokenNumber, 'cancel')}
                              className="px-2 py-1 rounded-lg text-red-600 hover:bg-red-50 text-xs font-medium"
                              title="Cancel Token"
                            >
                              Cancel
                            </button>
                          )}

                          <button
                            onClick={() => deleteToken(tok.tokenNumber)}
                            className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-gray-100"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-400 text-sm">
                    No queue tokens match your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
