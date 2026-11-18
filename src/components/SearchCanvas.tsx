'use client';

import React, { useState, useRef } from 'react';
import { searchAction, updateWidgetPosition } from '@/app/actions';
import { Search, Move, ExternalLink, Clock, Layers, RotateCcw } from 'lucide-react';

export interface WidgetLayoutItem {
  id: string;
  label: string;
  x: number;
  y: number;
  zIndex: number;
  visible: boolean;
}

interface SearchCanvasProps {
  initialLayouts: WidgetLayoutItem[];
}

export default function SearchCanvas({ initialLayouts }: SearchCanvasProps) {
  // Default fallback positions if DB has no records yet
  const defaultLayouts: Record<string, { x: number; y: number; zIndex: number }> = {
    'search-bar': { x: 100, y: 80, zIndex: 10 },
    'results-feed': { x: 100, y: 220, zIndex: 5 },
    'quick-tabs': { x: 550, y: 80, zIndex: 4 },
    'clock-widget': { x: 550, y: 220, zIndex: 3 },
  };

  // Merge database layouts with defaults
  const [widgets, setWidgets] = useState<Record<string, { x: number; y: number; zIndex: number; label: string }>>(() => {
    const map: Record<string, { x: number; y: number; zIndex: number; label: string }> = {
      'search-bar': { label: 'Search Bar', ...defaultLayouts['search-bar'] },
      'results-feed': { label: 'Results Feed', ...defaultLayouts['results-feed'] },
      'quick-tabs': { label: 'Quick Tabs', ...defaultLayouts['quick-tabs'] },
      'clock-widget': { label: 'Clock Widget', ...defaultLayouts['clock-widget'] },
    };

    initialLayouts.forEach((item) => {
      map[item.id] = { label: item.label, x: item.x, y: item.y, zIndex: item.zIndex };
    });

    return map;
  });

  const [maxZ, setMaxZ] = useState(20);
  const draggingRef = useRef<{ id: string; startX: number; startY: number; initialX: number; initialY: number } | null>(null);

  // Search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ id: string; title: string; description: string; url: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('All');

  // Handle Dragging via Pointer Events
  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    // Prevent dragging if clicking input or interactive links
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).tagName === 'A') {
      return;
    }

    const newZ = maxZ + 1;
    setMaxZ(newZ);

    setWidgets((prev) => ({
      ...prev,
      [id]: { ...prev[id], zIndex: newZ },
    }));

    draggingRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: widgets[id].x,
      initialY: widgets[id].y,
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const { id, startX, startY, initialX, initialY } = draggingRef.current;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    setWidgets((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        x: Math.max(10, initialX + dx),
        y: Math.max(10, initialY + dy),
      },
    }));
  };

  const handlePointerUp = async (id: string, e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = null;

    try {
      const widget = widgets[id];
      await updateWidgetPosition(id, widget.label, widget.x, widget.y, widget.zIndex);
    } catch (err) {
      console.error('Failed to persist position:', err);
    }
  };

  // Perform search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    const data = await searchAction(query);
    setResults(data);
    setLoading(false);
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans select-none">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Top Bar / Canvas Helper */}
      <div className="absolute top-4 left-4 z-50 flex items-center gap-3 bg-slate-900/80 backdrop-blur border border-slate-800 px-4 py-2 rounded-xl shadow-xl">
        <Layers className="w-5 h-5 text-indigo-400" />
        <span className="text-sm font-medium tracking-wide">Modular Workspace Canvas</span>
        <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">Drag any component</span>
      </div>

      {/* --- WIDGET 1: SEARCH BAR --- */}
      <div
        style={{ transform: `translate(${widgets['search-bar'].x}px, ${widgets['search-bar'].y}px)`, zIndex: widgets['search-bar'].zIndex }}
        className="absolute w-[420px] bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-4 cursor-grab active:cursor-grabbing transition-shadow hover:border-indigo-500/50"
        onPointerDown={(e) => handlePointerDown('search-bar', e)}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => handlePointerUp('search-bar', e)}
      >
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Move className="w-3.5 h-3.5 text-indigo-400" /> Search Bar
          </span>
          <span className="text-[10px] text-slate-500">Freeform Draggable</span>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search knowledge base..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-indigo-600/20"
          >
            {loading ? '...' : 'Search'}
          </button>
        </form>
      </div>

      {/* --- WIDGET 2: RESULTS FEED --- */}
      <div
        style={{ transform: `translate(${widgets['results-feed'].x}px, ${widgets['results-feed'].y}px)`, zIndex: widgets['results-feed'].zIndex }}
        className="absolute w-[420px] max-h-[400px] overflow-y-auto bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-4 cursor-grab active:cursor-grabbing transition-shadow hover:border-indigo-500/50"
        onPointerDown={(e) => handlePointerDown('results-feed', e)}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => handlePointerUp('results-feed', e)}
      >
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Move className="w-3.5 h-3.5 text-indigo-400" /> Results Feed
          </span>
          <span className="text-[10px] text-slate-500">{results.length} items</span>
        </div>
        {results.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            {loading ? 'Searching live sources...' : 'Type a query above to see live results'}
          </div>
        ) : (
          <div className="space-y-2.5">
            {results.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-slate-950/60 border border-slate-800/80 hover:border-indigo-500/40 p-3 rounded-xl transition-all group"
              >
                <div className="flex items-center justify-between font-medium text-sm text-indigo-300 group-hover:text-indigo-200 mb-1">
                  {item.title}
                  <ExternalLink className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">{item.description}</p>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* --- WIDGET 3: QUICK TABS --- */}
      <div
        style={{ transform: `translate(${widgets['quick-tabs'].x}px, ${widgets['quick-tabs'].y}px)`, zIndex: widgets['quick-tabs'].zIndex }}
        className="absolute w-[280px] bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-4 cursor-grab active:cursor-grabbing transition-shadow hover:border-indigo-500/50"
        onPointerDown={(e) => handlePointerDown('quick-tabs', e)}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => handlePointerUp('quick-tabs', e)}
      >
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Move className="w-3.5 h-3.5 text-indigo-400" /> Filter Tabs
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {['All', 'Articles', 'Media', 'Bookmarks'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-3 rounded-xl text-xs font-medium transition-all ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'bg-slate-950/60 text-slate-400 hover:bg-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* --- WIDGET 4: CLOCK WIDGET --- */}
      <div
        style={{ transform: `translate(${widgets['clock-widget'].x}px, ${widgets['clock-widget'].y}px)`, zIndex: widgets['clock-widget'].zIndex }}
        className="absolute w-[280px] bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-4 cursor-grab active:cursor-grabbing transition-shadow hover:border-indigo-500/50"
        onPointerDown={(e) => handlePointerDown('clock-widget', e)}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => handlePointerUp('clock-widget', e)}
      >
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Move className="w-3.5 h-3.5 text-indigo-400" /> Workspace Info
          </span>
        </div>
        <div className="flex items-center gap-3 py-1">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-200">Modular Workspace</div>
            <div className="text-xs text-slate-400">Positions saved to SQLite</div>
          </div>
        </div>
      </div>
    </main>
  );
}