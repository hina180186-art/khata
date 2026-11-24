'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Camera,
  Layers,
  BookOpen,
  FileSpreadsheet,
  Plus,
  Coins,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Building2,
  Sparkles,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { RoznamchaModal } from './RoznamchaModal';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const { business, todayMetrics, resetToDemoData } = useStore();
  const [isRoznamchaOpen, setIsRoznamchaOpen] = useState(false);

  const navItems = [
    {
      label: 'Dashboard',
      urdu: 'ڈیش بورڈ',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Smart Stock',
      urdu: 'اسٹاک رجسٹر',
      href: '/stock',
      icon: Layers,
      badge: todayMetrics.lowStockCount > 0 ? `${todayMetrics.lowStockCount}` : null,
      badgeColor: 'bg-amber-500',
    },
    {
      label: 'Khatay',
      urdu: 'کھاتے و ادھار',
      href: '/khatay',
      icon: BookOpen,
    },
    {
      label: 'EOD Reports',
      urdu: 'روزنامچہ و رپورٹس',
      href: '/reports',
      icon: FileSpreadsheet,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row antialiased">
      {/* ----------------- DESKTOP SIDEBAR ----------------- */}
      <aside className="hidden md:flex md:w-64 lg:w-72 flex-col bg-slate-900 text-white border-r border-slate-800 flex-shrink-0 min-h-screen sticky top-0 h-screen overflow-y-auto">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center shadow-lg text-white font-black text-xl">
              SK
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight text-white">SteelKhata</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  AI OCR
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Stainless Steel & Pipe SaaS</p>
            </div>
          </div>

          {/* Store Info Card */}
          <div className="mt-4 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              <span className="truncate">{business.business_name}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">{business.city || 'Gujranwala / Lahore'}</p>
          </div>
        </div>

        {/* Live Galla Box */}
        <div className="p-4 border-b border-slate-800">
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-800 to-slate-850 border border-slate-700/80 shadow-subtle">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Asli Cash in Galla (گلہ)</span>
              <Coins className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-black text-emerald-400 mt-1 tabular-nums">
              Rs. {todayMetrics.asliCashInGalla.toLocaleString()}
            </div>
            <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-700/50">
              <span>Today's Udhaar:</span>
              <span className="font-bold text-amber-400 tabular-nums">
                Rs. {todayMetrics.todayUdhaarGiven.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Primary Scan Button (Desktop) */}
        <div className="p-4 pb-2">
          <Link
            href="/scan"
            className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-900/40 transition active:scale-[0.98]"
          >
            <Camera className="w-5 h-5" />
            <span>Scan Katchi Parchi (کچی پرچی)</span>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <div>
                    <span>{item.label}</span>
                    <span className="block text-[10px] text-slate-400 font-normal leading-tight">
                      {item.urdu}
                    </span>
                  </div>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Quick Actions Footer */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <button
            onClick={() => setIsRoznamchaOpen(true)}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 border border-slate-700 transition"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>+ Roznamcha (Wasooli/Kharcha)</span>
          </button>

          <button
            onClick={resetToDemoData}
            title="Reset to fresh demo sample store data"
            className="w-full py-2 px-3 rounded-lg text-slate-500 hover:text-slate-300 text-[11px] flex items-center justify-center gap-1.5 transition"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Demo Store Data</span>
          </button>
        </div>
      </aside>

      {/* ----------------- MAIN CONTENT AREA ----------------- */}
      <div className="flex-1 flex flex-col min-w-0 pb-24 md:pb-8">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="md:hidden flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-black flex items-center justify-center text-sm shadow">
                SK
              </div>
              <div>
                <h1 className="text-sm font-black text-slate-900 leading-tight">SteelKhata AI</h1>
                <p className="text-[10px] text-slate-500">{business.business_name}</p>
              </div>
            </div>

            <div className="hidden md:block">
              <div className="text-xs uppercase tracking-wider font-bold text-slate-600">
                Stainless Steel Pipe & Tube Store OS
              </div>
              <div className="text-base font-bold text-slate-900">
                {pathname === '/dashboard' && 'Shop Overview & Live Galla (خلاصہ دکان)'}
                {pathname === '/scan' && 'Smart AI Camera Scanner (اسکینر)'}
                {pathname === '/stock' && 'Stainless Steel Pipe Stock Register (اسٹاک)'}
                {pathname.startsWith('/khatay') && 'Customer & Fabricator Khatay (کھاتے)'}
                {pathname === '/reports' && 'End-of-Day Reports & Galla Audit (رپورٹس)'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Live Galla Button (Mobile View Pill) */}
            <div className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold tabular-nums">
              <Coins className="w-3.5 h-3.5 text-emerald-600" />
              <span>Rs. {todayMetrics.asliCashInGalla.toLocaleString()}</span>
            </div>

            {/* Quick Roznamcha Button */}
            <button
              onClick={() => setIsRoznamchaOpen(true)}
              className="h-9 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">+ Roznamcha</span>
              <span className="sm:hidden">+ Kharcha</span>
            </button>
          </div>
        </header>

        {/* Page View Body */}
        <main className="flex-1 px-4 md:px-8 py-5 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* ----------------- MOBILE STICKY BOTTOM NAVIGATION ----------------- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 pb-safe shadow-floating">
        <div className="relative flex items-center justify-around h-16 px-2">
          {/* Dashboard */}
          <Link
            href="/dashboard"
            className={`flex flex-col items-center justify-center flex-1 h-full transition ${
              pathname === '/dashboard' ? 'text-blue-600 font-bold' : 'text-slate-500'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] mt-1">Dashboard</span>
          </Link>

          {/* Smart Stock */}
          <Link
            href="/stock"
            className={`flex flex-col items-center justify-center flex-1 h-full transition relative ${
              pathname.startsWith('/stock') ? 'text-blue-600 font-bold' : 'text-slate-500'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span className="text-[10px] mt-1">Stock</span>
            {todayMetrics.lowStockCount > 0 && (
              <span className="absolute top-2 right-4 w-4 h-4 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {todayMetrics.lowStockCount}
              </span>
            )}
          </Link>

          {/* Central Floating Camera Scan Button */}
          <div className="flex-1 flex justify-center -mt-6">
            <Link
              href="/scan"
              className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-500 text-white flex flex-col items-center justify-center shadow-lg shadow-emerald-600/40 border-4 border-slate-50 active:scale-95 transition"
            >
              <Camera className="w-6 h-6" />
              <span className="text-[8px] font-black uppercase tracking-wider">Scan</span>
            </Link>
          </div>

          {/* Khatay */}
          <Link
            href="/khatay"
            className={`flex flex-col items-center justify-center flex-1 h-full transition ${
              pathname.startsWith('/khatay') ? 'text-blue-600 font-bold' : 'text-slate-500'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px] mt-1">Khatay</span>
          </Link>

          {/* Reports */}
          <Link
            href="/reports"
            className={`flex flex-col items-center justify-center flex-1 h-full transition ${
              pathname.startsWith('/reports') ? 'text-blue-600 font-bold' : 'text-slate-500'
            }`}
          >
            <FileSpreadsheet className="w-5 h-5" />
            <span className="text-[10px] mt-1">Reports</span>
          </Link>
        </div>
      </nav>

      {/* Roznamcha Modal */}
      <RoznamchaModal
        isOpen={isRoznamchaOpen}
        onClose={() => setIsRoznamchaOpen(false)}
      />
    </div>
  );
};
