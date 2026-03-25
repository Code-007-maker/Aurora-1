'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, CloudRain, AlertTriangle, Zap, MapPin, ChevronLeft,
    CheckCircle2, Info, Activity, TrendingUp, DollarSign
} from 'lucide-react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

// ─── GIS Data & Logic ──────────────
const DELHI_WARDS = [
    'Central Delhi – Chandni Chowk / Darya Ganj',
    'North Delhi – Civil Lines / Model Town',
    'North East Delhi – Shahdara / Seelampur',
    'East Delhi – Preet Vihar / Mayur Vihar',
    'New Delhi – Connaught Place / Chanakyapuri',
    'South Delhi – Hauz Khas / Saket',
    'South East Delhi – Okhla / Jasola',
    'South West Delhi – Vasant Vihar / Dwarka',
    'West Delhi – Rajouri Garden / Punjabi Bagh',
    'North West Delhi – Rohini / Bawana',
    'Shahdara – Vivek Vihar / Seemapuri'
];

interface WardData {
    risk: number;
    prob: number;
    trend: 'up' | 'down' | 'stable';
    drainage: number;
    emergency: number;
    infra: number;
    hotspots: Array<{ name: string; risk: string; reasons: string[], xai_reasoning?: string }>;
    rainfall: number;
    forecast: string;
}

const DELHI_WARD_DATA: Record<string, WardData> = {
    'Shahdara – Vivek Vihar / Seemapuri': {
        risk: 0.82, prob: 82, trend: 'up', drainage: 32, emergency: 52, infra: 44,
        hotspots: [
            { name: 'Seemapuri Underpass', risk: 'Severe', reasons: ['Low Elevation', 'Clogged Drains'], xai_reasoning: 'AI models detect a 94% probability of 2ft+ waterlogging due to topographical depression combined with reported 80% blockage in primary stormwater drains.' },
            { name: 'Vivek Vihar Block D', risk: 'High', reasons: ['Impervious Surface', 'Sewer Overflow'], xai_reasoning: 'Dense concrete coverage prevents natural absorption, forcing rapid runoff into backflowing municipal sewer lines.' },
            { name: 'Dilshad Garden Extension', risk: 'High', reasons: ['Proximity to major drain'], xai_reasoning: 'Hydrological simulation flags extreme risk of cascading overflow from the primary trunk drain during peak rainfall events.' },
        ],
        rainfall: 198, forecast: 'Extremely Heavy',
    },
    'East Delhi – Preet Vihar / Mayur Vihar': {
        risk: 0.78, prob: 78, trend: 'up', drainage: 35, emergency: 58, infra: 51,
        hotspots: [
            { name: 'Mayur Vihar Phase 1 (Low Lying)', risk: 'Severe', reasons: ['Floodplain proximity', 'High Density'], xai_reasoning: 'Proximity to Yamuna active floodplain creates a compounded risk multiplier when upstream discharge exceeds 50,000 cusecs.' },
            { name: 'Preet Vihar Ring Road', risk: 'High', reasons: ['Poor slope gradient'], xai_reasoning: 'Terrain mapping indicates a 0.2% slope gradient, entirely insufficient for gravity-assisted drainage during cloudburst scenarios.' },
        ],
        rainfall: 145, forecast: 'Heavy',
    },
    'South East Delhi – Okhla / Jasola': {
        risk: 0.74, prob: 74, trend: 'up', drainage: 38, emergency: 60, infra: 55,
        hotspots: [
            { name: 'Okhla Industrial Area Ph 1', risk: 'Severe', reasons: ['100% Impervious', 'Industrial Waste blockages'], xai_reasoning: 'Total lack of permeable surfaces combined with heavy industrial effluent solidifying in drainage channels causes immediate localized flash floods.' },
            { name: 'Jasola Vihar Junction', risk: 'High', reasons: ['Traffic choke point', 'Drainage backup'], xai_reasoning: 'Network topology reveals a critical bottleneck where three separate stormwater catchments merge without adequate outfall capacity.' },
        ],
        rainfall: 162, forecast: 'Heavy',
    },
    'North West Delhi – Rohini / Bawana': {
        risk: 0.44, prob: 44, trend: 'stable', drainage: 65, emergency: 72, infra: 69,
        hotspots: [
            { name: 'Bawana Industrial Canal', risk: 'Moderate', reasons: ['Silt accumulation'], xai_reasoning: 'Satellite imagery indicates 40% channel capacity reduction due to silt accumulation, mildly elevating overflow risk.' },
            { name: 'Rohini Sector 11 Main Road', risk: 'Moderate', reasons: ['Temporary waterlogging'], xai_reasoning: 'Minor localized pooling predicted due to uneven road resurfacing; resolves within 2 hours post-rainfall.' },
        ],
        rainfall: 76, forecast: 'Moderate',
    },
    'Central Delhi – Chandni Chowk / Darya Ganj': {
        risk: 0.62, prob: 62, trend: 'up', drainage: 45, emergency: 68, infra: 58,
        hotspots: [
            { name: 'Chandni Chowk Main Market', risk: 'High', reasons: ['Extreme High Density', 'Heritage Drainage System'], xai_reasoning: 'Centuries-old brick barrel drains are structurally intact but lack the volume metric capacity for modern extreme weather events.' },
            { name: 'Darya Ganj Ring Road', risk: 'Moderate', reasons: ['Yamuna embankment seepage'], xai_reasoning: 'Groundwater table saturation is causing reverse seepage through the embankment wall near the Ring Road.' },
        ],
        rainfall: 118, forecast: 'Heavy',
    }
};

// Fill missing
DELHI_WARDS.forEach(w => {
    if (!DELHI_WARD_DATA[w]) DELHI_WARD_DATA[w] = {
        risk: 0.35, prob: 35, trend: 'stable', drainage: 70, emergency: 80, infra: 75,
        hotspots: [
            { name: 'Local Market Area', risk: 'Low', reasons: ['Minor pooling'], xai_reasoning: 'Standard drainage networks are operating normally; only minor surface pooling expected.' },
        ],
        rainfall: 45, forecast: 'Light',
    };
});

// ─── Component ─────────────────────────────────────────────────────────────────
export default function WardOfficerDashboard({
    onLogout,
    customZones,
    customZoneMetrics
}: {
    onLogout: () => void;
    customZones?: string[];
    customZoneMetrics?: { risk: number, readiness: number, exposure: number, economic: number }[];
}) {
    // Determine active wards (Custom vs Default Delhi)
    const activeWards = useMemo(() => {
        if (customZones && customZones.length > 0) return customZones;
        return DELHI_WARDS;
    }, [customZones]);

    // Generate dynamic ward data for custom cities
    const activeWardDataMap = useMemo(() => {
        if (!customZones || !customZoneMetrics || customZones.length === 0) return DELHI_WARD_DATA;

        const dynamicData: Record<string, WardData> = {};
        customZones.forEach((zone, idx) => {
            const metrics = customZoneMetrics[idx] || { risk: 0.5, readiness: 50, exposure: 50, economic: 50 };

            // Deterministic pseudo-randomness for variety
            const noise = (str: string) => {
                let h = 0; for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
                return Math.abs(h) / 2147483648;
            };
            const n = noise(zone);

            const isHighRisk = metrics.risk > 0.6;

            dynamicData[zone] = {
                risk: metrics.risk,
                prob: Math.round(metrics.risk * 100),
                trend: metrics.risk > 0.6 ? 'up' : metrics.risk < 0.3 ? 'down' : 'stable',
                drainage: Math.round(metrics.readiness * 0.8 + n * 20),
                emergency: Math.round(metrics.readiness),
                infra: Math.round(metrics.economic * 0.6 + metrics.readiness * 0.4),
                rainfall: Math.round(50 + metrics.risk * 150 + (n * 30)),
                forecast: isHighRisk ? 'Heavy' : metrics.risk > 0.4 ? 'Moderate' : 'Light',
                hotspots: [
                    {
                        name: `${zone} Primary Intersection`,
                        risk: isHighRisk ? 'Severe' : 'Moderate',
                        reasons: isHighRisk ? ['High Imperviousness', 'Critical Drainage Bottleneck'] : ['Temporary pooling'],
                        xai_reasoning: isHighRisk
                            ? `AI topology analysis indicates severe runoff accumulation due to ${(metrics.exposure).toFixed(1)}% exposure and substandard outfall capacity.`
                            : `Expected to clear within 2 hours post-rainfall. Drainage network operating near normal capacity.`
                    },
                    ...(isHighRisk ? [{
                        name: `${zone} Low-Elevation Zone`,
                        risk: 'High',
                        reasons: ['Topographical depression', 'High Vulnerability'],
                        xai_reasoning: `Hydro-dynamic engine confirms ${(metrics.risk * 100).toFixed(0)}% inundation probability affecting local residential clusters.`
                    }] : [])
                ]
            };
        });
        return dynamicData;
    }, [customZones, customZoneMetrics]);

    const [selectedWard, setSelectedWard] = useState<string>(activeWards[0]);

    // Ensure selected ward is valid when switching datasets
    useEffect(() => {
        if (!activeWards.includes(selectedWard)) {
            setSelectedWard(activeWards[0]);
        }
    }, [activeWards, selectedWard]);

    const wardData = activeWardDataMap[selectedWard] || activeWardDataMap[activeWards[0]];

    const [rainfall, setRainfall] = useState(wardData?.rainfall || 100);
    const [pumps, setPumps] = useState(42);
    const [waterBodyOverflow, setWaterBodyOverflow] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'operations' | 'simulation'>('operations');

    // Sync rainfall when ward changes
    useEffect(() => {
        if (wardData) setRainfall(wardData.rainfall);
    }, [selectedWard, wardData]);

    useEffect(() => { setLastUpdate(new Date()); }, [selectedWard, rainfall, pumps, waterBodyOverflow]);

    // Risk Engine
    const baseRisk = (wardData?.risk || 0) + ((rainfall - (wardData?.rainfall || 100)) / 500) * 0.4 - (pumps / 200) * 0.15 + (waterBodyOverflow ? 0.2 : 0);
    const wardRisk = Math.max(0, Math.min(1, baseRisk));
    const wardReadiness = Math.round(Math.max(0, Math.min(100, (wardData?.infra || 50) - (wardRisk - (wardData?.risk || 0)) * 50)));

    const hotspots = useMemo(() => wardData?.hotspots || [], [wardData]);

    const mitigationActions = useMemo(() => {
        const actions: any[] = [];
        if (wardRisk > 0.6) actions.push({ title: 'Evacuate Low-Lying Clusters', detail: 'Issue RED Alert for immediate evacuation.', urgency: 'Critical' });
        if (wardRisk > 0.4) actions.push({ title: 'Activate Temporary Shelters', detail: 'Prepare shelters in elevated zones.', urgency: 'High' });
        if (wardRisk > 0.3) actions.push({ title: `Deploy ${Math.round(wardRisk * 15)} Pump Units`, detail: 'Dispatch to drainage choke points immediately.', urgency: 'High' });
        if (wardRisk > 0.2) actions.push({ title: 'Clear Priority Drainage Blockages', detail: 'Municipal clearing required.', urgency: 'Medium' });
        if (actions.length === 0) actions.push({ title: 'Standard Monitoring', detail: 'Current conditions are stable. No emergency actions required.', urgency: 'Low' });
        return actions;
    }, [wardRisk]);

    const requiredPumps = Math.round(wardRisk * 80);
    const pumpStatusColor = pumps >= requiredPumps ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10';

    // Natural Language Summary
    const statusSummary = useMemo(() => {
        const wardShortName = selectedWard.split(' – ')[0];
        if (wardRisk < 0.2) return `Conditions in ${wardShortName} are currently stable. Rainfall is manageable and drainage systems are operating within capacity.`;
        if (wardRisk < 0.5) return `Moderate flood risk detected due to ${rainfall}mm/hr rainfall. Watch low-elevation areas for early waterlogging.`;
        if (wardRisk < 0.75) return `High risk alert. Significant waterlogging expected in ${wardShortName}. ${hotspots.length} grid zones are at tipping point. Immediate pump deployment advised.`;
        return `CRITICAL EMERGENCY. Severe flooding imminent in ${hotspots.length} grid zones. Execute evacuation protocols immediately for ${wardShortName}.`;
    }, [wardRisk, rainfall, hotspots.length, selectedWard]);

    // Economic Impact Data
    const generateEconomicData = () => {
        return [
            { time: '0h', loss: 0 },
            { time: '2h', loss: wardRisk * 1.5 },
            { time: '4h', loss: wardRisk * 4.2 },
            { time: '6h', loss: wardRisk * 12.8 },
            { time: '12h', loss: wardRisk * 35.5 },
            { time: '24h', loss: wardRisk * 85.0 }
        ];
    };
    const economicData = generateEconomicData();
    const currentLoss = (wardRisk * 45).toFixed(1);

    // Risk Trend Data
    const generateRiskTrendData = () => {
        return [
            { time: '-6h', risk: Math.max(0, wardRisk - 0.2) * 100 },
            { time: '-4h', risk: Math.max(0, wardRisk - 0.1) * 100 },
            { time: '-2h', risk: Math.max(0, wardRisk - 0.05) * 100 },
            { time: 'Now', risk: Math.max(0, Math.min(100, wardRisk * 100)) },
            { time: '+2h', risk: Math.max(0, Math.min(100, (wardRisk + (rainfall > 100 ? 0.1 : 0)) * 100)) },
            { time: '+4h', risk: Math.max(0, Math.min(100, (wardRisk + (rainfall > 100 ? 0.2 : -0.1)) * 100)) },
        ];
    };
    const riskTrendData = generateRiskTrendData();

    return (
        <div className="min-h-screen bg-[#020617] text-slate-100 font-sans selection:bg-blue-500/30">
            {/* ── HEADER ── */}
            <header className="bg-slate-900/80 backdrop-blur-xl border-b border-white/10 px-6 py-4 sticky top-0 z-20 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                    <img src="/2.png" alt="AURORA" className="h-8 w-auto object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
                    <div className="w-px h-6 bg-white/10 mx-2" />
                    <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer relative group">
                        <MapPin className="w-4 h-4 text-blue-400" />
                        <select
                            value={selectedWard}
                            onChange={(e) => {
                                const newWard = e.target.value;
                                setSelectedWard(newWard);
                                setRainfall(DELHI_WARD_DATA[newWard].rainfall);
                            }}
                            className="bg-transparent text-sm font-bold text-white border-none focus:ring-0 cursor-pointer appearance-none outline-none pr-6 w-64 truncate relative z-10"
                        >
                            {DELHI_WARDS.map(w => (
                                <option key={w} value={w} className="bg-slate-900 text-white">{w}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 pointer-events-none text-slate-400 group-hover:text-white transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-800/50 p-1 rounded-lg border border-white/5 shadow-inner">
                        <button onClick={() => setViewMode('operations')} className={`px-5 py-1.5 text-sm font-semibold rounded-md transition-all ${viewMode === 'operations' ? 'bg-blue-500/20 text-blue-300 shadow-sm border border-blue-500/30' : 'text-slate-400 hover:text-white'}`}>Tactical View</button>
                        <button onClick={() => setViewMode('simulation')} className={`px-5 py-1.5 text-sm font-semibold rounded-md transition-all ${viewMode === 'simulation' ? 'bg-indigo-500/20 text-indigo-300 shadow-sm border border-indigo-500/30' : 'text-slate-400 hover:text-white'}`}>Simulate Scenarios</button>
                    </div>
                    <div className="w-px h-6 bg-white/10" />
                    <div className="text-right">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Last Updated</div>
                        <div className="text-xs font-mono text-slate-300">{lastUpdate.toLocaleTimeString()}</div>
                    </div>
                    <button onClick={onLogout} className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* ── MAIN LAYOUT ── */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                <AnimatePresence mode="wait">
                    {/* ──────────────────────────────────────────────────────────
                        VIEW: OPERATIONS (Clean, Action-Oriented)
                    ────────────────────────────────────────────────────────── */}
                    {viewMode === 'operations' && (
                        <motion.div key="operations" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} className="space-y-6">

                            {/* Executive Summary & KPI Row */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                {/* Status Overview */}
                                <div className={`col-span-2 rounded-2xl p-6 border ${wardRisk > 0.75 ? 'bg-rose-500/10 border-rose-500/30 shadow-[0_0_30px_rgba(244,63,94,0.1)]' : wardRisk > 0.4 ? 'bg-orange-500/10 border-orange-500/30' : 'bg-white/[0.02] border-white/10 shadow-sm'}`}>
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-xl ${wardRisk > 0.4 ? 'bg-rose-500/20 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 'bg-blue-500/20 text-blue-400'}`}>
                                            {wardRisk > 0.4 ? <AlertTriangle className="w-6 h-6" /> : <Info className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-white mb-2 tracking-tight">Executive Assessment</h2>
                                            <p className="text-slate-300 text-sm leading-relaxed">{statusSummary}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Key Metrics Stack */}
                                <div className="bg-gradient-to-br from-white/[0.03] to-white/[0.01] rounded-2xl p-5 border border-white/10 shadow-sm flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-semibold text-slate-400 mb-1 uppercase tracking-wider">Ward Readiness</div>
                                        <div className="text-3xl font-black text-white drop-shadow-md">{wardReadiness}%</div>
                                    </div>
                                    <Activity className={`w-8 h-8 ${wardReadiness < 50 ? 'text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`} />
                                </div>
                                <div className="bg-gradient-to-br from-white/[0.03] to-white/[0.01] rounded-2xl p-5 border border-white/10 shadow-sm flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-semibold text-slate-400 mb-1 uppercase tracking-wider">Live Rainfall</div>
                                        <div className="text-3xl font-black text-white drop-shadow-md">{rainfall} <span className="text-lg text-slate-500 font-medium tracking-normal">mm/h</span></div>
                                    </div>
                                    <CloudRain className="w-8 h-8 text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.5)]" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Left Column: Actions & Resources */}
                                <div className="lg:col-span-1 space-y-6">
                                    <div className="bg-white/[0.01] rounded-2xl border border-white/10 shadow-sm overflow-hidden flex flex-col h-[320px]">
                                        <div className="px-5 py-4 border-b border-white/5 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10 flex justify-between items-center">
                                            <h3 className="text-sm font-bold text-white tracking-wide uppercase">Priority Actions</h3>
                                            {mitigationActions.some(a => a.urgency === 'Critical') && (
                                                <span className="flex h-2 w-2 relative">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                                                </span>
                                            )}
                                        </div>
                                        <div className="divide-y divide-white/5 overflow-y-auto flex-1 overlay-scrollbar">
                                            {mitigationActions.map((action, idx) => (
                                                <div key={idx} className="p-4 flex gap-4 hover:bg-white/[0.03] transition-colors cursor-crosshair">
                                                    <div className="shrink-0 mt-0.5">
                                                        {action.urgency === 'Critical' ? <AlertTriangle className="w-5 h-5 text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]" /> :
                                                            action.urgency === 'High' ? <AlertTriangle className="w-5 h-5 text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" /> :
                                                                <CheckCircle2 className="w-5 h-5 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-white mb-0.5">{action.title}</h4>
                                                        <p className="text-xs text-slate-400 leading-relaxed">{action.detail}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-gradient-to-br from-white/[0.03] to-white/[0.01] rounded-2xl border border-white/10 shadow-sm p-6">
                                        <h3 className="text-sm font-bold text-white mb-5 uppercase tracking-wide">Pump Deployment Status</h3>
                                        <div className="flex items-center gap-5">
                                            <div className={`p-4 rounded-xl shrink-0 ${pumpStatusColor} shadow-inner`}>
                                                <Zap className="w-7 h-7" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between mb-2">
                                                    <span className="text-xs font-bold text-slate-300">Deployed: <span className="text-white">{pumps}</span></span>
                                                    <span className="text-xs font-bold text-slate-500">Required: <span className="text-white">{requiredPumps}</span></span>
                                                </div>
                                                <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                                    <div className={`h-full transition-all duration-700 ease-out relative ${pumps >= requiredPumps ? 'bg-emerald-500' : 'bg-gradient-to-r from-rose-600 to-rose-400'}`} style={{ width: `${Math.min(100, (pumps / Math.max(1, requiredPumps)) * 100)}%` }}>
                                                        <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Center/Right Column: Analytics & Data */}
                                <div className="lg:col-span-2 space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        {/* Risk Trend Chart */}
                                        <div className="bg-white/[0.02] rounded-2xl border border-white/10 shadow-sm p-6 flex flex-col justify-between">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wide">
                                                    <TrendingUp className="w-4 h-4 text-indigo-400" /> Risk Trend Focus
                                                </h3>
                                                <span className={`text-[10px] font-black tracking-widest px-2 py-1 rounded border ${wardData.trend === 'up' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                                    {wardData.trend === 'up' ? 'ESCALATING' : 'STABLE'}
                                                </span>
                                            </div>
                                            <div className="h-32 w-full mt-2 -ml-2">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={riskTrendData}>
                                                        <defs>
                                                            <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                                                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                                            </linearGradient>
                                                        </defs>
                                                        <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dy={5} />
                                                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', fontSize: '12px' }} itemStyle={{ color: '#fff' }} cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '3 3' }} />
                                                        <Area type="monotone" dataKey="risk" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRisk)" activeDot={{ r: 6, fill: '#6366f1', stroke: '#020617', strokeWidth: 2 }} />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        {/* Economic Impact Panel */}
                                        <div className="bg-gradient-to-br from-white/[0.03] to-white/[0.01] rounded-2xl border border-white/10 shadow-sm p-6 flex flex-col justify-between relative overflow-hidden">
                                            <div className="absolute -right-10 -top-10 text-blue-500/5 rotate-12 pointer-events-none">
                                                <svg width="150" height="150" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" /><path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z" /></svg>
                                            </div>
                                            <div className="flex items-center justify-between mb-4 relative z-10">
                                                <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wide">
                                                    <DollarSign className="w-4 h-4 text-emerald-400" /> Economic Forecast
                                                </h3>
                                            </div>
                                            <div className="mb-2 relative z-10">
                                                <div className="text-[10px] text-slate-400 tracking-[0.2em] uppercase font-bold mb-1">Projected 24h Loss Potential</div>
                                                <div className="text-4xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">₹{currentLoss} <span className="text-base font-bold text-slate-500 ml-1">Crores</span></div>
                                            </div>
                                            <div className="h-16 w-full relative z-10">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={economicData}>
                                                        <Line type="monotone" dataKey="loss" stroke="#38bdf8" strokeWidth={3} dot={{ r: 3, fill: '#020617', stroke: '#38bdf8', strokeWidth: 2 }} activeDot={{ r: 5 }} />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Critical Hotspots List */}
                                    <div className="bg-white/[0.02] rounded-2xl border border-white/10 shadow-sm overflow-hidden flex flex-col h-[340px]">
                                        <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
                                            <h3 className="text-sm font-bold text-white uppercase tracking-wide">Critical Area Intelligence</h3>
                                            <span className="px-3 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] font-black tracking-widest rounded-md">{hotspots.length} ACTIVE HOTSPOTS</span>
                                        </div>
                                        <div className="divide-y divide-white/5 overflow-y-auto flex-1 overlay-scrollbar">
                                            {hotspots.map((h, i) => (
                                                <div key={i} className="p-4 px-6 flex flex-col justify-center hover:bg-white/[0.03] transition-colors group">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-start gap-4">
                                                            <div className="w-8 h-8 shrink-0 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center text-xs font-black shadow-inner group-hover:bg-slate-700 transition-colors mt-0.5">{i + 1}</div>
                                                            <div>
                                                                <div className="font-bold text-white text-sm mb-1">{h.name}</div>
                                                                <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2 mb-2">
                                                                    {h.reasons.map((r, ri) => (
                                                                        <span key={ri} className="bg-black/30 px-2 py-0.5 rounded border border-white/5">{r}</span>
                                                                    ))}
                                                                </div>
                                                                {h.xai_reasoning && (
                                                                    <div className="mt-2.5 text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 p-2.5 rounded-lg flex items-start gap-2.5 leading-relaxed max-w-xl shadow-sm">
                                                                        <Zap className="w-4 h-4 shrink-0 mt-0.5 text-indigo-400" />
                                                                        <span><strong className="font-semibold text-indigo-400 uppercase tracking-wide text-[10px] block mb-0.5 mt-0.5">AI Risk Rationale</strong> {h.xai_reasoning}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0 ml-4">
                                                            <div className={`text-sm font-black tracking-wider uppercase ${h.risk === 'Severe' ? 'text-rose-400' : h.risk === 'High' ? 'text-orange-400' : 'text-blue-400'}`}>{h.risk}</div>
                                                            <div className="text-[9px] text-slate-500 font-bold tracking-widest mt-0.5">THREAT LEVEL</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {hotspots.length === 0 && (
                                                <div className="p-8 text-center text-slate-500 h-full flex flex-col items-center justify-center">
                                                    <CheckCircle2 className="w-10 h-10 text-emerald-500/30 mb-3" />
                                                    <p className="text-sm font-bold text-slate-300">All local grids are stable</p>
                                                    <p className="text-xs mt-1 max-w-[200px]">No active high-risk hotspots detected under current conditions.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ──────────────────────────────────────────────────────────
                        VIEW: SIMULATION (Scenario testing)
                    ────────────────────────────────────────────────────────── */}
                    {viewMode === 'simulation' && (
                        <motion.div key="simulation" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} className="max-w-3xl mx-auto mt-4">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-black text-white drop-shadow-sm tracking-tight">Predictive Scenario Simulation</h2>
                                <p className="text-sm font-medium text-slate-400 mt-2 max-w-xl mx-auto">Inject climate disruption parameters to model ward resilience limits. Visualizations in the Tactical View will update synchronously.</p>
                            </div>

                            <div className="bg-white/[0.02] rounded-3xl border border-white/10 shadow-2xl p-10 space-y-10 relative overflow-hidden backdrop-blur-md">
                                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-rose-500"></div>

                                {/* Rainfall Slider */}
                                <div>
                                    <div className="flex justify-between items-end mb-6">
                                        <div>
                                            <label className="text-sm font-black text-white uppercase tracking-wider">Atmospheric River Injection (Rainfall)</label>
                                            <p className="text-xs text-slate-400 mt-1 font-medium">Model impact of intense mm/hr anomalies.</p>
                                        </div>
                                        <div className="text-3xl font-black text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.4)]">{rainfall} <span className="text-base font-bold text-blue-500/70">mm/hr</span></div>
                                    </div>
                                    <div className="flex gap-2 mb-6">
                                        {[0, 50, 100, 150, 250, 400].map(v => (
                                            <button key={v} onClick={() => setRainfall(v)}
                                                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all ${rainfall === v ? 'bg-blue-600/90 text-white shadow-[0_4px_15px_rgba(37,99,235,0.4)] border border-blue-400/50' : 'bg-white/5 text-slate-400 border border-transparent hover:bg-white/10 hover:text-white'}`}>
                                                {v === 0 ? 'Clear' : `${v}mm`}
                                            </button>
                                        ))}
                                    </div>
                                    <input type="range" min={0} max={500} value={rainfall} onChange={e => setRainfall(Number(e.target.value))}
                                        className="w-full h-3 rounded-full appearance-none cursor-ew-resize bg-slate-900 border border-white/5 accent-blue-500 hover:accent-blue-400 transition-colors" />
                                </div>

                                <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                                {/* River Overflow Toggle */}
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <label className="text-sm font-black text-white uppercase tracking-wider">Major Water Body Override</label>
                                        <p className="text-xs text-slate-400 mt-1 font-medium pr-8">Simulate external river/waterbank overflow compounding local drainage failure.</p>
                                    </div>
                                    <button onClick={() => setWaterBodyOverflow(!waterBodyOverflow)}
                                        className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all focus:outline-none flex-shrink-0 ${waterBodyOverflow ? 'bg-rose-500/90 text-white shadow-[0_4px_20px_rgba(244,63,94,0.5)] border border-rose-400/50 scale-105' : 'bg-white/5 text-slate-400 border border-transparent hover:bg-white/10'}`}>
                                        {waterBodyOverflow ? 'Level Critical' : 'Safe Limits'}
                                    </button>
                                </div>

                                <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                                {/* Pump Adjustment */}
                                <div>
                                    <div className="flex justify-between items-end mb-6">
                                        <div>
                                            <label className="text-sm font-black text-white uppercase tracking-wider">Emergency Pump Procurement</label>
                                            <p className="text-xs text-slate-400 mt-1 font-medium">Test artificial reduction of threat limits via pump scaling. (Active: {pumps})</p>
                                        </div>
                                    </div>
                                    <input type="range" min={20} max={150} value={pumps} onChange={e => setPumps(Number(e.target.value))}
                                        className="w-full h-3 rounded-full appearance-none cursor-ew-resize bg-slate-900 border border-white/5 accent-emerald-500 hover:accent-emerald-400 transition-colors" />
                                    <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500 mt-3 tracking-widest">
                                        <span>20 units Limit</span>
                                        <span className="text-emerald-500/70">150 units Surge</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </main>
            <style jsx global>{`
                .overlay-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .overlay-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .overlay-scrollbar::-webkit-scrollbar-thumb {
                    background-color: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .overlay-scrollbar:hover::-webkit-scrollbar-thumb {
                    background-color: rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </div>
    );
}

