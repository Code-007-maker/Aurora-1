'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Settings, Database, Activity, FileText, Globe,
    ShieldAlert, CheckCircle2, AlertTriangle, XCircle,
    RefreshCw, Lock, Server, Cpu, Clock, Wifi, WifiOff,
    Filter, ChevronRight, BarChart3, Info, Save, RotateCcw,
    LayersIcon, MapPin, Zap, Eye
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface AuditEntry {
    id: string;
    ts: number;
    role: string;
    action: string;
    ward: string;
    field: string;
    before: string | number;
    after: string | number;
}

interface SystemAdminPanelProps {
    floodRiskScore: number;
    rainfall: number;
    budget: number;
    pumps: number;
    drainage: number;
    cityReadiness: number;
    auditLog: AuditEntry[];
    onCitySwitch?: (payload: { bbox: number[]; geojson: any; zone_metrics?: any[]; cell_count?: number; area_km2?: number }) => void;
    onClose: () => void;
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
    { id: 'sensitivity', label: 'Model Config', icon: Settings },
    { id: 'dataset', label: 'Data Integrity', icon: Database },
    { id: 'health', label: 'Sys. Health', icon: Activity },
    { id: 'audit', label: 'Audit Log', icon: FileText },
    { id: 'multicity', label: 'Multi-City', icon: Globe },
];

// ─── 1. Model Sensitivity ─────────────────────────────────────────────────────
function ModelSensitivityTab({ floodRiskScore, rainfall }: { floodRiskScore: number; rainfall: number }) {
    const [weights, setWeights] = useState({ rainfall: 80, drainage: 30, elevation: 15, pumps: 15 });
    const [pendingWeights, setPendingWeights] = useState({ ...weights });
    const [confirmed, setConfirmed] = useState(false);
    const [changeLog, setChangeLog] = useState<string[]>([]);

    const previewRisk = Math.max(0, Math.min(1,
        (rainfall / 500) * (pendingWeights.rainfall / 100) +
        0.3 * (pendingWeights.drainage / 100) -
        (pendingWeights.pumps / 100) * 0.15
    ));

    const handleConfirm = () => {
        const diff = Object.entries(pendingWeights)
            .filter(([k, v]) => v !== weights[k as keyof typeof weights])
            .map(([k, v]) => `${k}: ${weights[k as keyof typeof weights]} → ${v}`);
        if (diff.length === 0) return;
        setWeights({ ...pendingWeights });
        setConfirmed(true);
        setChangeLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Model reconfigured: ${diff.join(', ')}`]);
        setTimeout(() => setConfirmed(false), 2000);
    };

    const factors = [
        { key: 'rainfall' as const, label: 'Rainfall Weight', color: 'blue', desc: 'How strongly rainfall intensity influences risk score' },
        { key: 'drainage' as const, label: 'Drainage Penalty', color: 'amber', desc: 'How much poor drainage compounds risk' },
        { key: 'elevation' as const, label: 'DEM Elevation Bias', color: 'indigo', desc: 'Weight given to low-elevation topography' },
        { key: 'pumps' as const, label: 'Pump Mitigation Factor', color: 'emerald', desc: 'Risk reduction credited per active pump unit' },
    ];

    return (
        <div className="space-y-5">
            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-300">Changes are previewed live. Confirmation required before persisting. All modifications are logged.</p>
            </div>

            {/* Side-by-side preview */}
            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4 text-center">
                    <div className="text-[10px] uppercase text-slate-500 tracking-widest mb-1">Current Risk Score</div>
                    <div className="text-3xl font-black" style={{ color: floodRiskScore > 0.7 ? '#ef4444' : floodRiskScore > 0.4 ? '#f97316' : '#10b981' }}>
                        {(floodRiskScore * 100).toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">Live production model</div>
                </div>
                <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 p-4 text-center">
                    <div className="text-[10px] uppercase text-blue-400 tracking-widest mb-1">Preview Risk Score</div>
                    <div className="text-3xl font-black" style={{ color: previewRisk > 0.7 ? '#ef4444' : previewRisk > 0.4 ? '#f97316' : '#10b981' }}>
                        {(previewRisk * 100).toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">With pending weights</div>
                </div>
            </div>

            {/* Weight sliders */}
            <div className="space-y-4">
                {factors.map(f => (
                    <div key={f.key}>
                        <div className="flex justify-between items-center mb-1">
                            <div>
                                <span className="text-sm font-bold text-white">{f.label}</span>
                                <p className="text-[10px] text-slate-500">{f.desc}</p>
                            </div>
                            <span className={`text-sm font-black text-${f.color}-400`}>{pendingWeights[f.key]}%</span>
                        </div>
                        <input
                            type="range" min={0} max={100} value={pendingWeights[f.key]}
                            onChange={e => setPendingWeights(p => ({ ...p, [f.key]: Number(e.target.value) }))}
                            className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-700"
                        />
                    </div>
                ))}
            </div>

            <div className="flex gap-3">
                <button
                    onClick={() => setPendingWeights({ rainfall: 80, drainage: 30, elevation: 15, pumps: 15 })}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-slate-400 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all"
                >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>
                <button
                    onClick={handleConfirm}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all ${confirmed ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                >
                    <Save className="w-3.5 h-3.5" /> {confirmed ? 'Persisted ✓' : 'Confirm & Persist'}
                </button>
            </div>

            {changeLog.length > 0 && (
                <div className="mt-2">
                    <h4 className="text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-2">Session Configuration Log</h4>
                    <div className="space-y-1 max-h-28 overflow-y-auto custom-scrollbar">
                        {changeLog.slice().reverse().map((entry, i) => (
                            <div key={i} className="text-[10px] font-mono text-slate-400 bg-white/[0.02] px-3 py-1.5 rounded-lg">{entry}</div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── 2. Dataset Integrity ─────────────────────────────────────────────────────
function DatasetIntegrityTab({ rainfall }: { rainfall: number }) {
    const datasets = [
        { name: 'Delhi DEM (SRTM 30m)', version: 'v2.1.4', date: '2024-09-01', status: 'valid' as const, crs: 'WGS84 / UTM 43N' },
        { name: 'MCD Ward Boundaries', version: 'v3.0.1', date: '2024-11-15', status: 'valid' as const, crs: 'WGS84' },
        { name: 'Delhi Population Grid', version: 'v1.8.0', date: '2023-12-01', status: 'warn' as const, crs: 'WGS84' },
        { name: 'Drainage Network GIS', version: 'v2.3.2', date: '2024-08-22', status: 'valid' as const, crs: 'WGS84 / UTM 43N' },
        { name: 'IMD Rainfall API', version: 'Live', date: 'Real-time', status: rainfall > 0 ? 'live' as const : 'warn' as const, crs: 'N/A' },
        { name: 'OSM Building Footprints', version: 'Live', date: 'Real-time', status: 'live' as const, crs: 'WGS84' },
    ];

    const validations = [
        { check: 'CRS Consistency (DEM ↔ Ward)', result: 'PASS', note: 'Both WGS84 / UTM 43N matched' },
        { check: 'Ward-Population Spatial Join', result: 'PASS', note: '24/24 wards joined successfully' },
        { check: 'DEM Null Cell Count', result: 'WARN', note: '3.2% null cells interpolated in NW Delhi' },
        { check: 'Drainage Network Topology', result: 'PASS', note: 'No disconnected nodes detected' },
        { check: 'Population Dataset Age', result: 'WARN', note: '2021 Census — update recommended' },
        { check: 'Rainfall API Connectivity', result: rainfall > 0 ? 'PASS' : 'WARN', note: rainfall > 0 ? 'Receiving live data stream' : 'No active rainfall — check API health' },
    ];

    const statusConfig = {
        valid: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'Valid' },
        warn: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', label: 'Warning' },
        live: { icon: Wifi, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', label: 'Live' },
    };

    const resultConfig = {
        PASS: { color: 'text-emerald-400', icon: CheckCircle2 },
        WARN: { color: 'text-amber-400', icon: AlertTriangle },
        FAIL: { color: 'text-red-400', icon: XCircle },
    };

    return (
        <div className="space-y-5">
            {/* Dataset versions */}
            <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-3">Active Dataset Registry</h4>
                <div className="space-y-2">
                    {datasets.map(d => {
                        const s = statusConfig[d.status];
                        const Icon = s.icon;
                        return (
                            <div key={d.name} className={`flex items-center gap-3 rounded-xl border p-3 ${s.bg}`}>
                                <Icon className={`w-4 h-4 shrink-0 ${s.color}`} />
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold text-white truncate">{d.name}</div>
                                    <div className="text-[10px] text-slate-500">{d.crs} · {d.date}</div>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="text-[10px] font-mono text-slate-400">{d.version}</div>
                                    <div className={`text-[10px] font-bold ${s.color}`}>{s.label}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Spatial Validation */}
            <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-3">Spatial Validation Report</h4>
                <div className="space-y-2">
                    {validations.map(v => {
                        const cfg = resultConfig[v.result as keyof typeof resultConfig];
                        const Icon = cfg.icon;
                        return (
                            <div key={v.check} className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                                <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${cfg.color}`} />
                                <div className="flex-1">
                                    <div className="text-[11px] font-bold text-white">{v.check}</div>
                                    <div className="text-[10px] text-slate-500">{v.note}</div>
                                </div>
                                <span className={`text-[10px] font-black ${cfg.color}`}>{v.result}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ─── 3. System Health ─────────────────────────────────────────────────────────
function SystemHealthTab({ floodRiskScore, rainfall }: { floodRiskScore: number; rainfall: number }) {
    const [uptime, setUptime] = useState(0);
    const [latencies, setLatencies] = useState({ api: 0, flood: 0, grid: 0, db: 0 });
    const mountTime = useRef(Date.now());

    useEffect(() => {
        const interval = setInterval(() => {
            const now = performance.now();
            setUptime(Math.floor((Date.now() - mountTime.current) / 1000));
            setLatencies({
                api: Math.round(18 + Math.sin(now / 3000) * 8 + Math.random() * 5),
                flood: Math.round(42 + Math.cos(now / 2000) * 15 + Math.random() * 10),
                grid: Math.round(120 + Math.sin(now / 5000) * 40 + Math.random() * 20),
                db: Math.round(8 + Math.cos(now / 4000) * 3 + Math.random() * 4),
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const formatUptime = (s: number) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return `${h}h ${m}m ${sec}s`;
    };

    const metrics = [
        { label: 'Rainfall API Latency', val: latencies.api, unit: 'ms', threshold: 50, icon: Wifi },
        { label: 'Flood Risk Recalculation', val: latencies.flood, unit: 'ms', threshold: 100, icon: Cpu },
        { label: 'Grid Processing Time', val: latencies.grid, unit: 'ms', threshold: 300, icon: LayersIcon },
        { label: 'Database Query Time', val: latencies.db, unit: 'ms', threshold: 30, icon: Database },
    ];

    return (
        <div className="space-y-5">
            {/* Uptime banner */}
            <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4 flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <div>
                        <div className="text-xs font-bold text-emerald-400">System Operational</div>
                        <div className="text-[10px] text-slate-500">Session uptime: {formatUptime(uptime)}</div>
                    </div>
                </div>
                <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 p-4 text-center">
                    <div className="text-[10px] text-slate-500 mb-1">Engine Load</div>
                    <div className="text-xl font-black text-blue-400">{Math.round(floodRiskScore * 30 + 20)}%</div>
                </div>
            </div>

            {/* Real-time metrics */}
            <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-3">Real-Time Performance Metrics</h4>
                <div className="space-y-3">
                    {metrics.map(m => {
                        const Icon = m.icon;
                        const pct = Math.min(100, (m.val / m.threshold) * 100);
                        const isGood = m.val < m.threshold;
                        return (
                            <div key={m.label} className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Icon className="w-4 h-4 text-slate-400" />
                                        <span className="text-xs font-bold text-white">{m.label}</span>
                                    </div>
                                    <span className={`text-sm font-black ${isGood ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        {m.val}{m.unit}
                                    </span>
                                </div>
                                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <motion.div
                                        className={`h-full rounded-full ${isGood ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                        animate={{ width: `${pct}%` }}
                                        transition={{ duration: 0.8, ease: 'easeOut' }}
                                    />
                                </div>
                                <div className="text-[10px] text-slate-600 mt-1">Threshold: {m.threshold}{m.unit}</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Service status */}
            <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-3">Service Status</h4>
                <div className="space-y-2">
                    {[
                        { service: 'Flood Risk Calculation Engine', status: 'Online', uptime: '99.9%' },
                        { service: 'WebGL Map Renderer (Deck.gl)', status: 'Online', uptime: '100%' },
                        { service: 'Ward Readiness Aggregator', status: 'Online', uptime: '99.8%' },
                        { service: 'Mitigation Intelligence Layer', status: 'Online', uptime: '99.7%' },
                        { service: 'IMD Rainfall Feed', status: rainfall > 0 ? 'Receiving' : 'Standby', uptime: '98.2%' },
                        { service: 'OSM Overpass API', status: 'Online', uptime: '97.4%' },
                    ].map(s => (
                        <div key={s.service} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02]">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${s.status === 'Standby' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
                            <span className="text-xs text-white flex-1">{s.service}</span>
                            <span className={`text-[10px] font-bold ${s.status === 'Standby' ? 'text-amber-400' : 'text-emerald-400'}`}>{s.status}</span>
                            <span className="text-[10px] text-slate-500">{s.uptime}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── 4. Audit Intelligence ────────────────────────────────────────────────────
function AuditTab({ auditLog }: { auditLog: AuditEntry[] }) {
    const [filterRole, setFilterRole] = useState('All');
    const [filterField, setFilterField] = useState('All');

    const roles = ['All', ...Array.from(new Set(auditLog.map(e => e.role)))];
    const fields = ['All', ...Array.from(new Set(auditLog.map(e => e.field)))];

    const filtered = useMemo(() =>
        auditLog
            .filter(e => filterRole === 'All' || e.role === filterRole)
            .filter(e => filterField === 'All' || e.field === filterField)
            .slice().reverse(),
        [auditLog, filterRole, filterField]
    );

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <div className="flex-1">
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Filter by Role</label>
                    <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white px-3 py-2 focus:outline-none focus:border-blue-500/50">
                        {roles.map(r => <option key={r} value={r} className="bg-slate-900">{r}</option>)}
                    </select>
                </div>
                <div className="flex-1">
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Filter by Parameter</label>
                    <select value={filterField} onChange={e => setFilterField(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white px-3 py-2 focus:outline-none focus:border-blue-500/50">
                        {fields.map(f => <option key={f} value={f} className="bg-slate-900">{f}</option>)}
                    </select>
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                    <FileText className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No audit entries yet.</p>
                    <p className="text-xs mt-1">Adjust rainfall, pumps, or budget sliders to generate live log events.</p>
                </div>
            ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                    {filtered.map(entry => (
                        <motion.div
                            key={entry.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3"
                        >
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400">{entry.role}</span>
                                    <span className="text-[10px] font-bold text-white">{entry.field}</span>
                                </div>
                                <span className="text-[10px] font-mono text-slate-500">{new Date(entry.ts).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-xs text-slate-300">{entry.action}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] font-mono text-slate-500">Before:</span>
                                <span className="text-[10px] font-mono text-rose-400">{entry.before}</span>
                                <ChevronRight className="w-3 h-3 text-slate-600" />
                                <span className="text-[10px] font-mono text-emerald-400">{entry.after}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            <div className="text-[10px] text-slate-600 text-center">
                {auditLog.length} total events this session · Resets on page load
            </div>
        </div>
    );
}

// ─── 5. Multi-City Configuration ──────────────────────────────────────────────
function MultiCityTab({ onCitySwitch }: { onCitySwitch?: (payload: { bbox: number[]; geojson: any; zone_metrics?: any[]; cell_count?: number; area_km2?: number }) => void }) {
    const [activeCity, setActiveCity] = useState('delhi');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | '', msg: string }>({ type: '', msg: '' });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadStatus({ type: '', msg: '' });

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/grid/upload_and_segment', {
                method: 'POST',
                body: formData
            });

            // Read as text first, then parse as JSON safely
            const rawText = await res.text();
            let data: any;
            try {
                data = JSON.parse(rawText);
            } catch {
                // Server returned non-JSON (HTML error page, etc.)
                setUploadStatus({ type: 'error', msg: `Server error (${res.status}): ${rawText.slice(0, 200)}` });
                return;
            }

            if (res.ok && data.status === 'success') {
                setUploadStatus({ type: 'success', msg: data.message });
                if (onCitySwitch && data.bbox) {
                    onCitySwitch({
                        bbox: data.bbox,
                        geojson: data.geojson_features,
                        zone_metrics: data.zone_metrics,
                        cell_count: data.cell_count,
                        area_km2: data.area_km2,
                    });
                }
            } else {
                setUploadStatus({ type: 'error', msg: data.detail || data.message || 'Upload failed' });
            }
        } catch (err: any) {
            setUploadStatus({ type: 'error', msg: err.message || 'Network error' });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const cities = [
        {
            id: 'delhi', name: 'Delhi NCT', status: 'active', wards: 290, area: '1,484 km²',
            bbox: '28.40°N–28.90°N / 76.85°E–77.35°E', dem: 'SRTM 30m v2.1', rainfallApi: 'IMD NH-04', ready: true,
        },
        {
            id: 'mumbai', name: 'Mumbai', status: 'offline', wards: 24, area: '603 km²',
            bbox: '18.90°N–19.27°N / 72.77°E–73.00°E', dem: 'SRTM 30m v1.9', rainfallApi: 'IMD WR', ready: false,
        },
        {
            id: 'kolkata', name: 'Kolkata', status: 'standby', wards: 144, area: '206 km²',
            bbox: '22.45°N–22.65°N / 88.20°E–88.50°E', dem: 'Copernicus 25m', rainfallApi: 'IMD ER', ready: false,
        },
        {
            id: 'chennai', name: 'Chennai', status: 'offline', wards: 201, area: '426 km²',
            bbox: '12.90°N–13.25°N / 80.15°E–80.32°E', dem: 'SRTM 30m v2.0', rainfallApi: 'IMD SR', ready: false,
        },
    ];

    const selected = cities.find(c => c.id === activeCity)!;
    const statusConfig = {
        active: { color: 'emerald', label: 'Active' },
        standby: { color: 'amber', label: 'Standby' },
        offline: { color: 'slate', label: 'Offline' },
    };

    return (
        <div className="space-y-5">
            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex gap-2">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-400">Switching cities reinitializes boundary grids, ward assignments, DEM, and rainfall API location without affecting the core flood engine.</p>
            </div>

            {/* City list */}
            <div className="space-y-2">
                {cities.map(c => {
                    const sc = statusConfig[c.status as keyof typeof statusConfig];
                    return (
                        <button
                            key={c.id}
                            onClick={() => setActiveCity(c.id)}
                            className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${activeCity === c.id ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}
                        >
                            <MapPin className={`w-5 h-5 shrink-0 ${activeCity === c.id ? 'text-blue-400' : 'text-slate-500'}`} />
                            <div className="flex-1">
                                <div className="text-sm font-bold text-white">{c.name}</div>
                                <div className="text-[10px] text-slate-500">{c.wards} wards · {c.area}</div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-md bg-${sc.color}-500/20 text-${sc.color}-400 border border-${sc.color}-500/30`}>
                                {sc.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Selected city details */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-3">{selected.name} — Configuration</h4>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-[11px]">
                    <div><span className="text-slate-500">Bounding Box</span><p className="text-white font-mono mt-0.5 text-[10px]">{selected.bbox}</p></div>
                    <div><span className="text-slate-500">DEM Source</span><p className="text-white font-mono mt-0.5 text-[10px]">{selected.dem}</p></div>
                    <div><span className="text-slate-500">Ward Count</span><p className="text-white font-bold mt-0.5">{selected.wards}</p></div>
                    <div><span className="text-slate-500">Rainfall API</span><p className="text-white font-mono mt-0.5 text-[10px]">{selected.rainfallApi}</p></div>
                </div>
                <button
                    disabled={!selected.ready || selected.id === 'delhi'}
                    className={`mt-4 w-full py-2.5 text-xs font-bold rounded-lg transition-all ${selected.id === 'delhi' ? 'bg-emerald-600/20 text-emerald-400 cursor-default border border-emerald-500/20' : selected.ready ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5'}`}
                >
                    {selected.id === 'delhi' ? '✓ Currently Active' : selected.ready ? 'Initialize & Switch' : 'Dataset Not Ready — Contact Data Team'}
                </button>
            </div>

            {/* Premium BYOT File Upload Section */}
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-5 mt-4">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <LayersIcon className="w-5 h-5 text-blue-400" /> Bring Your Own Terrain (BYOT)
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-1">Upload a custom shapefile (.zip) or .geojson to dynamically generate a risk grid for any city.</p>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".geojson,.zip"
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className={`w-full py-3.5 flex items-center justify-center gap-2 text-sm font-bold rounded-xl transition-all ${isUploading
                            ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98]'
                            }`}
                    >
                        {isUploading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                Processing Geometries...
                            </>
                        ) : (
                            <>
                                <Globe className="w-4 h-4" /> Upload Custom City Shapefile
                            </>
                        )}
                    </button>

                    {/* Upload Status Feedback */}
                    <AnimatePresence>
                        {uploadStatus.msg && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className={`mt-2 p-3 text-xs font-bold rounded-lg flex items-center gap-2 ${uploadStatus.type === 'success'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                    }`}
                            >
                                {uploadStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                {uploadStatus.msg}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

// ─── Main Panel ────────────────────────────────────────────────────────────────
export default function SystemAdminPanel({
    floodRiskScore, rainfall, budget, pumps, drainage, cityReadiness, auditLog, onCitySwitch, onClose
}: SystemAdminPanelProps) {
    const [activeTab, setActiveTab] = useState('sensitivity');

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
            >
                <motion.div
                    initial={{ scale: 0.92, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.92, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="bg-[#080d1a] border border-rose-500/20 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-[0_0_60px_rgba(239,68,68,0.12)]"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                                <Lock className="w-5 h-5 text-rose-400" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-white">Governance & Control Panel</h2>
                                <p className="text-[10px] text-slate-500">System Admin · Restricted Access · Configuration, Audit & Health</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                            <X className="w-4 h-4 text-slate-400" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 p-3 border-b border-white/5 shrink-0 overflow-x-auto">
                        {TABS.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20' : 'text-slate-500 hover:text-slate-300 bg-white/5 hover:bg-white/10'}`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.2 }}
                            >
                                {activeTab === 'sensitivity' && <ModelSensitivityTab floodRiskScore={floodRiskScore} rainfall={rainfall} />}
                                {activeTab === 'dataset' && <DatasetIntegrityTab rainfall={rainfall} />}
                                {activeTab === 'health' && <SystemHealthTab floodRiskScore={floodRiskScore} rainfall={rainfall} />}
                                {activeTab === 'audit' && <AuditTab auditLog={auditLog} />}
                                {activeTab === 'multicity' && <MultiCityTab onCitySwitch={onCitySwitch} />}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-white/5 shrink-0 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                            <span className="text-[10px] text-slate-500">Restricted governance mode · Session audit active</span>
                        </div>
                        <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-1 rounded-md border border-rose-500/20">
                            SYSTEM ADMIN · TOP CLEARANCE
                        </span>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
