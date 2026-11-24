'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Layers,
  Search,
  Plus,
  AlertTriangle,
  Clock,
  Camera,
  Filter,
  CheckCircle2,
  X,
  Edit2,
  Package,
  TrendingDown,
  DollarSign,
  Sparkles,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { Product } from '@/lib/types';

export default function StockPage() {
  const { products, updateProduct, addProduct } = useStore();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<'all' | '304' | '201'>('all');
  const [gaugeFilter, setGaugeFilter] = useState<string>('all');
  const [shapeFilter, setShapeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'low_stock' | 'dead_stock'>('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isRegisterScanModalOpen, setIsRegisterScanModalOpen] = useState(false);
  const [scanRegisterStatus, setScanRegisterStatus] = useState<string | null>(null);

  // New Product Form State
  const [newProdName, setNewProdName] = useState('');
  const [newProdSku, setNewProdSku] = useState('');
  const [newProdUnit, setNewProdUnit] = useState<'length' | 'kg' | 'pcs'>('length');
  const [newProdSize, setNewProdSize] = useState('1.5 inch');
  const [newProdGauge, setNewProdGauge] = useState('18G');
  const [newProdGrade, setNewProdGrade] = useState<'304' | '201'>('304');
  const [newProdShape, setNewProdShape] = useState<'round' | 'square' | 'rectangle' | 'cap' | 'elbow'>('round');
  const [newProdStock, setNewProdStock] = useState('20');
  const [newProdLowAlert, setNewProdLowAlert] = useState('10');
  const [newProdPurchaseRate, setNewProdPurchaseRate] = useState('2850');
  const [newProdSaleRate, setNewProdSaleRate] = useState('3350');
  const [newProdAliases, setNewProdAliases] = useState('');

  // 30 days ago timestamp for dead stock
  const thirtyDaysAgo = useMemo(() => Date.now() - 30 * 86400000, []);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Search query match (name, sku, aliases)
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesSku = p.sku_code.toLowerCase().includes(q);
        const matchesAliases = p.aliases.some(a => a.toLowerCase().includes(q));
        const matchesSize = p.attributes.size.toLowerCase().includes(q);
        if (!matchesName && !matchesSku && !matchesAliases && !matchesSize) {
          return false;
        }
      }

      // Grade filter
      if (gradeFilter !== 'all' && p.attributes.grade !== gradeFilter) {
        return false;
      }

      // Gauge filter
      if (gaugeFilter !== 'all' && p.attributes.gauge !== gaugeFilter) {
        return false;
      }

      // Shape filter
      if (shapeFilter !== 'all' && p.attributes.shape !== shapeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === 'low_stock' && p.current_stock > p.low_stock_alert) {
        return false;
      }
      if (statusFilter === 'dead_stock') {
        const isDead = !p.last_sold_at || new Date(p.last_sold_at).getTime() < thirtyDaysAgo;
        if (!isDead) return false;
      }

      return true;
    });
  }, [products, searchQuery, gradeFilter, gaugeFilter, shapeFilter, statusFilter, thirtyDaysAgo]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let totalLengths = 0;
    let totalSaleValue = 0;
    let totalPurchaseValue = 0;
    let lowStockCount = 0;
    let deadStockCount = 0;

    for (const p of products) {
      if (p.unit === 'length') {
        totalLengths += p.current_stock;
      }
      totalSaleValue += p.current_stock * p.sale_rate;
      totalPurchaseValue += p.current_stock * p.purchase_rate;
      if (p.current_stock <= p.low_stock_alert) {
        lowStockCount++;
      }
      if (!p.last_sold_at || new Date(p.last_sold_at).getTime() < thirtyDaysAgo) {
        deadStockCount++;
      }
    }

    return {
      totalLengths,
      totalSaleValue,
      totalPurchaseValue,
      lowStockCount,
      deadStockCount,
      totalSKUs: products.length,
    };
  }, [products, thirtyDaysAgo]);

  // Submit Add Product
  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) return;

    const aliasesArr = newProdAliases
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    addProduct({
      name: newProdName.trim(),
      sku_code: newProdSku.trim() || `SS-${newProdGrade}-${newProdShape.toUpperCase()}-${newProdSize}-${newProdGauge}`,
      unit: newProdUnit,
      current_stock: parseFloat(newProdStock) || 0,
      low_stock_alert: parseFloat(newProdLowAlert) || 10,
      purchase_rate: parseFloat(newProdPurchaseRate) || 0,
      sale_rate: parseFloat(newProdSaleRate) || 0,
      attributes: {
        size: newProdSize,
        gauge: newProdGauge,
        grade: newProdGrade,
        shape: newProdShape,
      },
      aliases: aliasesArr,
      last_sold_at: new Date().toISOString(),
    });

    setIsAddModalOpen(false);
    // Reset inputs
    setNewProdName('');
    setNewProdSku('');
    setNewProdAliases('');
  };

  // Submit Edit Stock
  const handleEditStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    updateProduct(editingProduct.id, {
      current_stock: editingProduct.current_stock,
      sale_rate: editingProduct.sale_rate,
      purchase_rate: editingProduct.purchase_rate,
      low_stock_alert: editingProduct.low_stock_alert,
    });

    setEditingProduct(null);
  };

  // Simulated Scan Stock Register Page
  const handleScanRegister = () => {
    setScanRegisterStatus('Analyzing handwritten register lines with Gemini OCR...');
    setTimeout(() => {
      // Simulate adding 10 lengths to the first low stock item
      const lowItem = products.find(p => p.current_stock <= p.low_stock_alert) || products[0];
      if (lowItem) {
        updateProduct(lowItem.id, {
          current_stock: lowItem.current_stock + 15,
        });
        setScanRegisterStatus(`✓ Matched "${lowItem.name}": Updated stock by +15 lengths from register page!`);
      }
      setTimeout(() => {
        setScanRegisterStatus(null);
        setIsRegisterScanModalOpen(false);
      }, 1500);
    }, 1200);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ----------------- TITLE & ACTION BUTTONS ----------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-blue-600" />
            Smart Steel Pipe Inventory (اسٹاک رجسٹر)
          </h1>
          <p className="text-xs md:text-sm text-slate-500">
            Real-time stainless steel inventory with size, gauge, grade tracking & dead-stock alerts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Scan Stock Register Button */}
          <button
            type="button"
            onClick={() => setIsRegisterScanModalOpen(true)}
            className="h-11 px-4 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition active:scale-95"
          >
            <Camera className="w-4 h-4" />
            <span>Scan Stock Page (رجسٹر اسکین)</span>
          </button>

          {/* Add Product Button */}
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="h-11 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>+ Add Pipe SKU</span>
          </button>
        </div>
      </div>

      {/* ----------------- INVENTORY METRICS CARDS ----------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-subtle">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total Pipe Lengths (نالیاں)
          </div>
          <div className="text-xl md:text-2xl font-black text-slate-900 mt-1 tabular-nums">
            {metrics.totalLengths.toLocaleString()} nali
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-medium">Across {metrics.totalSKUs} SKUs</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-subtle">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total Stock Value (مالیت)
          </div>
          <div className="text-xl md:text-2xl font-black text-emerald-700 mt-1 tabular-nums">
            Rs. {metrics.totalSaleValue.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
            Cost: Rs. {metrics.totalPurchaseValue.toLocaleString()}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'low_stock' ? 'all' : 'low_stock')}
          className={`p-4 rounded-2xl border text-left transition ${
            statusFilter === 'low_stock'
              ? 'bg-amber-500 text-white border-amber-600 shadow-md'
              : 'bg-white border-slate-200 shadow-subtle hover:border-amber-400'
          }`}
        >
          <div className={`text-xs font-bold uppercase tracking-wider ${statusFilter === 'low_stock' ? 'text-amber-100' : 'text-amber-600'}`}>
            Low Stock Alert (کم اسٹاک)
          </div>
          <div className={`text-xl md:text-2xl font-black mt-1 tabular-nums ${statusFilter === 'low_stock' ? 'text-white' : 'text-amber-700'}`}>
            {metrics.lowStockCount} SKUs
          </div>
          <div className={`text-[11px] mt-0.5 ${statusFilter === 'low_stock' ? 'text-amber-100' : 'text-slate-500'}`}>
            Below minimum threshold
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'dead_stock' ? 'all' : 'dead_stock')}
          className={`p-4 rounded-2xl border text-left transition ${
            statusFilter === 'dead_stock'
              ? 'bg-red-600 text-white border-red-700 shadow-md'
              : 'bg-white border-slate-200 shadow-subtle hover:border-red-400'
          }`}
        >
          <div className={`text-xs font-bold uppercase tracking-wider ${statusFilter === 'dead_stock' ? 'text-red-100' : 'text-red-600'}`}>
            Dead Stock Alert (ڈیڈ مال)
          </div>
          <div className={`text-xl md:text-2xl font-black mt-1 tabular-nums ${statusFilter === 'dead_stock' ? 'text-white' : 'text-red-700'}`}>
            {metrics.deadStockCount} SKUs
          </div>
          <div className={`text-[11px] mt-0.5 ${statusFilter === 'dead_stock' ? 'text-red-100' : 'text-slate-500'}`}>
            Unsold for 30+ days
          </div>
        </button>
      </div>

      {/* ----------------- SEARCH & STEEL FILTER CHIPS ----------------- */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-subtle space-y-3">
        {/* Search input */}
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by size (1.5, 2.0), gauge (18G), grade (304), or Urdu (dhedh inchi, chakor)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Filter Chips Bars */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          {/* Grade filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl font-bold">
            <span className="text-[10px] text-slate-400 px-1 uppercase">Grade:</span>
            {(['all', '304', '201'] as const).map(g => (
              <button
                key={g}
                type="button"
                onClick={() => setGradeFilter(g)}
                className={`py-1 px-2.5 rounded-lg transition ${
                  gradeFilter === g
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {g === 'all' ? 'All' : `SS ${g}`}
              </button>
            ))}
          </div>

          {/* Gauge filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl font-bold">
            <span className="text-[10px] text-slate-400 px-1 uppercase">Gauge:</span>
            {['all', '14G', '16G', '18G', '20G'].map(gauge => (
              <button
                key={gauge}
                type="button"
                onClick={() => setGaugeFilter(gauge)}
                className={`py-1 px-2.5 rounded-lg transition ${
                  gaugeFilter === gauge
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {gauge === 'all' ? 'All' : gauge}
              </button>
            ))}
          </div>

          {/* Shape filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl font-bold">
            <span className="text-[10px] text-slate-400 px-1 uppercase">Shape:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'round', label: 'Gol (Round)' },
              { id: 'square', label: 'Chakor (Square)' },
              { id: 'rectangle', label: 'Patti (Rect)' },
            ].map(sh => (
              <button
                key={sh.id}
                type="button"
                onClick={() => setShapeFilter(sh.id)}
                className={`py-1 px-2.5 rounded-lg transition ${
                  shapeFilter === sh.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {sh.label}
              </button>
            ))}
          </div>

          {/* Clear Filters */}
          {(gradeFilter !== 'all' || gaugeFilter !== 'all' || shapeFilter !== 'all' || statusFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setGradeFilter('all');
                setGaugeFilter('all');
                setShapeFilter('all');
                setStatusFilter('all');
                setSearchQuery('');
              }}
              className="text-xs text-blue-600 font-bold hover:underline px-2"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ----------------- PRODUCTS LIST TABLE / CARDS ----------------- */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-subtle">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Matching SKUs ({filteredProducts.length} of {products.length})
          </span>
          <span className="text-xs text-slate-400">Click any product to adjust stock or rates</span>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-600">No steel pipe SKUs match your filters.</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting the filter chips or search query.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredProducts.map(p => {
              const isLowStock = p.current_stock <= p.low_stock_alert;
              const isDeadStock = !p.last_sold_at || new Date(p.last_sold_at).getTime() < thirtyDaysAgo;

              return (
                <div
                  key={p.id}
                  onClick={() => setEditingProduct({ ...p })}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 cursor-pointer transition"
                >
                  {/* Left: Pipe details & attributes */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm text-slate-900">{p.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                        {p.sku_code}
                      </span>
                      {isLowStock && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Low Stock
                        </span>
                      )}
                      {isDeadStock && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-red-600" />
                          Dead Stock (30+ days)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-blue-700">Grade: {p.attributes.grade}</span>
                      <span>•</span>
                      <span>Gauge: {p.attributes.gauge}</span>
                      <span>•</span>
                      <span className="capitalize">Shape: {p.attributes.shape}</span>
                      {p.weight_per_length && (
                        <>
                          <span>•</span>
                          <span>{p.weight_per_length} kg / length</span>
                        </>
                      )}
                    </div>

                    {/* Urdu Aliases */}
                    {p.aliases && p.aliases.length > 0 && (
                      <div className="text-[11px] text-slate-400 font-urdu">
                        Aliases: {p.aliases.join(' • ')}
                      </div>
                    )}
                  </div>

                  {/* Right: Current Stock & Rates */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-2 sm:pt-0">
                    {/* Rates */}
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-800 tabular-nums">
                        Sale: Rs. {p.sale_rate.toLocaleString()} / {p.unit}
                      </div>
                      <div className="text-[11px] text-slate-400 tabular-nums">
                        Cost: Rs. {p.purchase_rate.toLocaleString()}
                      </div>
                    </div>

                    {/* Current Stock */}
                    <div className="text-right min-w-[90px]">
                      <div
                        className={`text-lg font-black tabular-nums ${
                          isLowStock ? 'text-amber-600' : 'text-slate-900'
                        }`}
                      >
                        {p.current_stock} {p.unit}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Alert at &le; {p.low_stock_alert}
                      </div>
                    </div>

                    {/* Edit button */}
                    <button
                      type="button"
                      title="Adjust stock or rates"
                      className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-slate-200"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ----------------- MODAL: EDIT STOCK / RATES ----------------- */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <div>
                <h3 className="font-bold text-sm">Adjust Stock & Rates</h3>
                <p className="text-xs text-slate-400 truncate max-w-xs">{editingProduct.name}</p>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditStockSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Current In-Hand Stock ({editingProduct.unit})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={editingProduct.current_stock}
                  onChange={e =>
                    setEditingProduct({
                      ...editingProduct,
                      current_stock: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl font-bold text-lg tabular-nums"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Sale Rate (Rs.)
                  </label>
                  <input
                    type="number"
                    required
                    value={editingProduct.sale_rate}
                    onChange={e =>
                      setEditingProduct({
                        ...editingProduct,
                        sale_rate: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl font-bold text-sm tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Purchase Rate (Rs.)
                  </label>
                  <input
                    type="number"
                    required
                    value={editingProduct.purchase_rate}
                    onChange={e =>
                      setEditingProduct({
                        ...editingProduct,
                        purchase_rate: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl font-bold text-sm tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Low Stock Threshold Alert
                </label>
                <input
                  type="number"
                  value={editingProduct.low_stock_alert}
                  onChange={e =>
                    setEditingProduct({
                      ...editingProduct,
                      low_stock_alert: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl font-bold text-sm tabular-nums"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full h-12 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold text-sm transition"
                >
                  Save Stock Updates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: ADD NEW PIPE SKU ----------------- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <h3 className="font-bold text-base">+ Add New Stainless Steel Pipe SKU</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProductSubmit} className="p-5 space-y-3.5 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Product Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder='e.g., 1.5" Round Pipe 18G - Grade 304'
                  value={newProdName}
                  onChange={e => setNewProdName(e.target.value)}
                  className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Grade (گریڈ)
                  </label>
                  <select
                    value={newProdGrade}
                    onChange={e => setNewProdGrade(e.target.value as any)}
                    className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-sm font-semibold"
                  >
                    <option value="304">Grade 304 (Premium Non-magnetic)</option>
                    <option value="201">Grade 201 (Commercial)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Shape (شکل)
                  </label>
                  <select
                    value={newProdShape}
                    onChange={e => setNewProdShape(e.target.value as any)}
                    className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-sm font-semibold"
                  >
                    <option value="round">Round / Gol (نالی)</option>
                    <option value="square">Square / Chakor (چورس)</option>
                    <option value="rectangle">Rectangle / Patti (پٹی ٹیوب)</option>
                    <option value="cap">Ball Cap / Topi (ٹوپی)</option>
                    <option value="elbow">Elbow / Bend (بینڈ)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Size (سائز)
                  </label>
                  <input
                    type="text"
                    placeholder='e.g., 1.5 inch, 2.0 inch'
                    value={newProdSize}
                    onChange={e => setNewProdSize(e.target.value)}
                    className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Gauge (گیج)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 14G, 16G, 18G, 20G"
                    value={newProdGauge}
                    onChange={e => setNewProdGauge(e.target.value)}
                    className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Initial Stock
                  </label>
                  <input
                    type="number"
                    value={newProdStock}
                    onChange={e => setNewProdStock(e.target.value)}
                    className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl font-bold tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Unit
                  </label>
                  <select
                    value={newProdUnit}
                    onChange={e => setNewProdUnit(e.target.value as any)}
                    className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl font-bold text-sm"
                  >
                    <option value="length">Length (نالی / 20ft)</option>
                    <option value="kg">Kg (کلو)</option>
                    <option value="pcs">Pcs (عدد)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Sale Rate (Rs.)
                  </label>
                  <input
                    type="number"
                    value={newProdSaleRate}
                    onChange={e => setNewProdSaleRate(e.target.value)}
                    className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl font-bold tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Purchase Rate (Rs.)
                  </label>
                  <input
                    type="number"
                    value={newProdPurchaseRate}
                    onChange={e => setNewProdPurchaseRate(e.target.value)}
                    className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl font-bold tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Roman Urdu Aliases (comma separated for AI OCR matching)
                </label>
                <input
                  type="text"
                  placeholder="e.g., 1.5 18g 304, dhedh inchi 304, 1.5 nali"
                  value={newProdAliases}
                  onChange={e => setNewProdAliases(e.target.value)}
                  className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition"
                >
                  Add SKU to Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: SCAN STOCK REGISTER PAGE ----------------- */}
      {isRegisterScanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-400" />
                Scan Physical Stock Register Page
              </h3>
              <button
                onClick={() => setIsRegisterScanModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Take a photo of your paper stock notebook (*maal aamad register*).
                AI OCR reads the pipe sizes, quantities, and automatically bulk adjusts your digital warehouse stock.
              </p>

              {scanRegisterStatus ? (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs font-bold text-blue-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600 animate-spin" />
                  <span>{scanRegisterStatus}</span>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">
                      Snap Register Page Photo
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Ensure good lighting over columns
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleScanRegister}
                    className="w-full h-11 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold text-xs shadow-md transition"
                  >
                    Simulate Camera Capture & OCR Parse
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
