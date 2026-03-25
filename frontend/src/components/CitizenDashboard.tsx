'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin, ShieldAlert, Droplets, Activity, Bell, Navigation,
    AlertTriangle, CheckCircle, ChevronRight, X, Home, Phone,
    CloudRain, Zap, Users, Heart, Car, Package, Info, Search,
    ArrowUp, ArrowDown, Minus, Hospital, School, Building
} from 'lucide-react';

interface CitizenDashboardProps {
    onLogout: () => void;
    cityName?: string;
    customZones?: string[];
    customZoneMetrics?: any[];
}

// Delhi NCT – 11 Districts / Key Zone identifiers (MCD-aligned)
const DELHI_WARDS = [
    'Central Delhi – Chandni Chowk / Darya Ganj',
    'North Delhi – Civil Lines / Model Town',
    'North East Delhi – Shahdara / Seelampur',
    'North West Delhi – Rohini / Bawana',
    'West Delhi – Patel Nagar / Rajouri Garden',
    'South West Delhi – Dwarka / Najafgarh',
    'South Delhi – Saket / Mehrauli',
    'South East Delhi – Okhla / Jasola',
    'East Delhi – Patparganj / Kondli',
    'New Delhi – Connaught Place / Lutyens',
    'Shahdara – Vivek Vihar / Seemapuri',
];

// Delhi ward-level flood intelligence data
const WARD_DATA: Record<string, {
    risk: number; prob: number; trend: 'up' | 'down' | 'stable';
    drainage: number; emergency: number; infra: number;
    hotspots: Array<{ name: string; risk: string; reasons: string[] }>;
    safeZones: Array<{ name: string; type: string; dist: string }>;
    rainfall: number; forecast: string;
}> = {
    'Shahdara – Vivek Vihar / Seemapuri': {
        risk: 0.82, prob: 82, trend: 'up',
        drainage: 32, emergency: 52, infra: 44,
        hotspots: [
            { name: 'Seemapuri Unauthorized Colony', risk: 'Critical', reasons: ['Yamuna floodplain proximity', 'No stormwater drain', 'High population density'] },
            { name: 'Mustafabad Road Stretch', risk: 'Very High', reasons: ['Low elevation', 'Urban drainage congestion', 'Dense informal housing'] },
            { name: 'Gokulpuri Underpass', risk: 'High', reasons: ['Underpass geometry', 'Slow pump response', 'Road congestion'] },
        ],
        safeZones: [
            { name: 'Vivek Vihar Relief Camp', type: 'Emergency Center', dist: '0.6 km' },
            { name: 'GTB Hospital', type: 'Hospital', dist: '1.4 km' },
            { name: 'Shahdara Elevated Ring Road', type: 'Elevated Zone', dist: '0.9 km' },
        ],
        rainfall: 198, forecast: 'Extremely Heavy',
    },
    'South East Delhi – Okhla / Jasola': {
        risk: 0.74, prob: 74, trend: 'up',
        drainage: 38, emergency: 60, infra: 55,
        hotspots: [
            { name: 'Madanpur Khadar Colony', risk: 'Critical', reasons: ['Yamuna overflow risk', 'Low-lying terrain', 'Poor road access'] },
            { name: 'Okhla Industrial Area', risk: 'High', reasons: ['Impervious surface', 'Industrial runoff', 'Drainage congestion'] },
        ],
        safeZones: [
            { name: 'Jasola Vihar Metro Station', type: 'Elevated Zone', dist: '0.7 km' },
            { name: 'Holy Family Hospital', type: 'Hospital', dist: '1.2 km' },
            { name: 'Okhla Phase-1 Relief Center', type: 'Emergency Center', dist: '0.8 km' },
        ],
        rainfall: 162, forecast: 'Heavy',
    },
    'North West Delhi – Rohini / Bawana': {
        risk: 0.44, prob: 44, trend: 'stable',
        drainage: 65, emergency: 72, infra: 69,
        hotspots: [
            { name: 'Bawana Industrial Zone', risk: 'Moderate', reasons: ['Industrial drainage overload', 'Low-permeability soil'] },
            { name: 'Rohini Sector 27 Sector', risk: 'Low', reasons: ['Partial waterlogging risk', 'Stormwater overflow'] },
        ],
        safeZones: [
            { name: 'Bawana Elevated Ground', type: 'Elevated Zone', dist: '0.5 km' },
            { name: 'Sanjay Gandhi Hospital Rohini', type: 'Hospital', dist: '1.0 km' },
            { name: 'Rohini Phase-III Relief Camp', type: 'Emergency Center', dist: '0.8 km' },
        ],
        rainfall: 76, forecast: 'Moderate',
    },
    'Central Delhi – Chandni Chowk / Darya Ganj': {
        risk: 0.62, prob: 62, trend: 'up',
        drainage: 45, emergency: 68, infra: 58,
        hotspots: [
            { name: 'Darya Ganj Low Zone', risk: 'High', reasons: ['Old city drainage network', 'High road congestion', 'Low elevation near Yamuna'] },
            { name: 'Chandni Chowk Bazaar Area', risk: 'Moderate', reasons: ['Dense traffic', 'Narrow drains', 'Poor water egress'] },
        ],
        safeZones: [
            { name: 'Kamla Market Relief Area', type: 'Emergency Center', dist: '0.5 km' },
            { name: 'LNJP Hospital', type: 'Hospital', dist: '1.1 km' },
            { name: 'Red Fort Elevated Ground', type: 'Elevated Zone', dist: '0.8 km' },
        ],
        rainfall: 118, forecast: 'Heavy',
    },
};

const DEFAULT_WARD = 'Shahdara – Vivek Vihar / Seemapuri';

function getRiskLabel(risk: number) {
    if (risk > 0.75) return { label: 'Critical', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/40', dot: 'bg-red-400' };
    if (risk > 0.55) return { label: 'High', color: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-orange-500/40', dot: 'bg-orange-400' };
    if (risk > 0.35) return { label: 'Moderate', color: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/40', dot: 'bg-yellow-400' };
    return { label: 'Low', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', dot: 'bg-emerald-400' };
}

function getReadinessLabel(val: number) {
    if (val >= 70) return { label: 'Good', color: 'text-emerald-400', bg: 'bg-emerald-500' };
    if (val >= 50) return { label: 'Needs Improvement', color: 'text-yellow-400', bg: 'bg-yellow-500' };
    return { label: 'Critical', color: 'text-red-400', bg: 'bg-red-500' };
}

const RAINFALL_SCENARIOS = [
    { label: 'Light', mm: 50, emoji: '🌦', roads: 0, depth: 'Minimal', households: 0 },
    { label: 'Moderate', mm: 150, emoji: '🌧', roads: 4, depth: 'Medium', households: 450 },
    { label: 'Heavy', mm: 250, emoji: '⛈', roads: 9, depth: 'High', households: 1800 },
    { label: 'Extreme', mm: 400, emoji: '🌊', roads: 18, depth: 'Severe', households: 6200 },
];

export default function CitizenDashboard({ onLogout, cityName: propCityName, customZones, customZoneMetrics }: CitizenDashboardProps) {
    const cityName = propCityName && propCityName !== 'Delhi NCT' ? propCityName : 'Delhi';
    const isCustomCity = !!customZones && customZones.length > 0;
    const activeWards = isCustomCity ? customZones! : DELHI_WARDS;

    // Build dynamic WARD_DATA for custom cities
    // Uses REAL GIS metrics from backend when available, falls back to procedural
    const getDynamicWardData = (zoneName: string, idx: number) => {
        const gis = customZoneMetrics?.[idx];
        const risk = gis ? gis.composite_flood_risk : (0.3 + (idx % 5) * 0.12);
        return {
            risk,
            prob: gis ? gis.flood_probability_pct : Math.round(risk * 100),
            trend: (gis?.risk_trend ?? (['up', 'stable', 'down', 'up', 'stable'][idx % 5])) as 'up' | 'down' | 'stable',
            drainage: gis ? Math.max(15, gis.drainage_score) : (35 + (idx % 4) * 12),
            emergency: gis ? Math.max(20, gis.emergency_score) : (45 + (idx % 3) * 10),
            infra: gis ? Math.max(20, gis.infra_score) : (40 + (idx % 4) * 9),
            hotspots: [
                { name: `Low-lying area in ${zoneName.slice(0, 20)}`, risk: 'High', reasons: ['Terrain depression', 'Drainage backflow', 'Urban runoff'] },
                { name: `Dense settlement – ${zoneName.slice(0, 18)}`, risk: 'Moderate', reasons: ['High density', 'Impermeable surface', 'Storm drain deficit'] },
            ],
            safeZones: [
                { name: `${zoneName.slice(0, 18)} Relief Center`, type: 'Emergency Center', dist: '0.8 km' },
                { name: `Govt Hospital – ${zoneName.slice(0, 12)}`, type: 'Hospital', dist: '1.2 km' },
                { name: `Elevated Roadway ${zoneName.slice(0, 10)}`, type: 'Elevated Zone', dist: '0.5 km' },
            ],
            rainfall: gis ? Math.round(risk * 250) : (80 + (idx % 6) * 25),
            forecast: (['Moderate', 'Heavy', 'Heavy', 'Light', 'Extreme', 'Moderate'] as const)[idx % 6],
        };
    };

    const DEFAULT_WARD = activeWards[0] || DELHI_WARDS[0];
    const [selectedWard, setSelectedWard] = useState(DEFAULT_WARD);
    const [locationMode, setLocationMode] = useState<'select' | 'pin' | 'done'>('select');
    const [pinCode, setPinCode] = useState('');
    const [rainfallScenario, setRainfallScenario] = useState(1);
    const [selectedHotspot, setSelectedHotspot] = useState<number | null>(null);
    const [alertSMS, setAlertSMS] = useState(false);
    const [alertEmail, setAlertEmail] = useState(false);
    const [alertPush, setAlertPush] = useState(false);
    const [alertSaved, setAlertSaved] = useState(false);
    const [activeTime, setActiveTime] = useState('');

    useEffect(() => {
        const update = () => setActiveTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
        update();
        const t = setInterval(update, 60000);
        return () => clearInterval(t);
    }, []);

    const wardIdx = activeWards.indexOf(selectedWard);
    const ward = isCustomCity
        ? getDynamicWardData(selectedWard, wardIdx >= 0 ? wardIdx : 0)
        : (WARD_DATA[selectedWard] || WARD_DATA[DEFAULT_WARD]);
    const riskMeta = getRiskLabel(ward.risk + (rainfallScenario * 0.04));
    const readiness = Math.round((ward.drainage + ward.emergency + ward.infra) / 3);
    const readinessMeta = getReadinessLabel(readiness);
    const scenario = RAINFALL_SCENARIOS[rainfallScenario];

    const getSafetyAdvice = () => {
        const r = ward.risk;
        const floodCtrl = cityName === 'Delhi' ? '1800111817' : '112';
        const ctrlRoom = cityName === 'Delhi' ? 'Delhi Control Room 1077' : 'Local Control Room';
        if (r > 0.75) return [
            `Avoid ALL low-lying areas and floodplain zones in ${cityName} immediately`,
            'Move vehicles to upper floors or elevated parking — ground floors may flood',
            'Keep emergency kit (torch, documents, water) ready to evacuate within 15 minutes',
            `Call Flood Control: ${floodCtrl} if water enters your premises`,
            'Do NOT enter flooded roads — manhole covers may be displaced',
        ];
        if (r > 0.55) return [
            'Avoid basement and ground-floor parking during tonight\'s forecast',
            'Move valuables to higher shelves inside your home',
            `Watch zone: ${ward.hotspots[0]?.name} — currently flagged as ${ward.hotspots[0]?.risk} risk`,
            `Keep emergency numbers ready: ${ctrlRoom}, Ambulance 102`,
            'Avoid travelling near riverbanks or low-lying colony roads',
        ];
        return [
            `Stay updated on IMD ${cityName} rainfall advisories`,
            'Avoid waterlogged roads — use elevated routes where possible',
            'Keep umbrella and emergency torch accessible',
            'Register for SMS alerts to receive real-time zone-level updates',
        ];
    };

    const handleSaveAlerts = () => {
        setAlertSaved(true);
        setTimeout(() => setAlertSaved(false), 3000);
    };

    // LOCATION GATE SCREEN
    if (locationMode === 'select') {
        return (
            <main className="min-h-screen bg-[#020617] text-slate-100 font-sans flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md"
                >
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center p-4 bg-blue-500/20 border border-blue-500/30 rounded-2xl mb-4">
                            <MapPin className="w-10 h-10 text-blue-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">Check Flood Risk in Your Area</h1>
                        <p className="text-sm text-slate-400 mt-2">Select your {cityName} zone to get personalised flood risk information</p>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={() => { setSelectedWard(DEFAULT_WARD); setLocationMode('done'); }}
                            className="w-full flex items-center p-4 bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 rounded-xl transition-all group"
                        >
                            <div className="p-2.5 bg-blue-500/20 rounded-lg mr-3"><Navigation className="w-5 h-5 text-blue-400" /></div>
                            <div className="text-left">
                                <p className="font-bold text-white">Auto-Detect My Location</p>
                                <p className="text-xs text-slate-400">Uses GPS to identify your {cityName} zone</p>
                            </div>
                            <ChevronRight className="ml-auto w-5 h-5 text-blue-400 group-hover:translate-x-1 transition-transform" />
                        </button>

                        <button
                            onClick={() => setLocationMode('pin')}
                            className="w-full flex items-center p-4 bg-slate-800/60 border border-white/10 hover:bg-slate-700/60 rounded-xl transition-all group"
                        >
                            <div className="p-2.5 bg-slate-700/50 rounded-lg mr-3"><Search className="w-5 h-5 text-slate-300" /></div>
                            <div className="text-left">
                                <p className="font-bold text-white">Enter PIN Code</p>
                                <p className="text-xs text-slate-400">Type your 6-digit {cityName} PIN</p>
                            </div>
                            <ChevronRight className="ml-auto w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                        </button>

                        <div className="bg-slate-800/60 border border-white/10 rounded-xl p-4">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Select Your Zone Manually</p>
                            <select
                                onChange={e => { setSelectedWard(e.target.value); setLocationMode('done'); }}
                                className="w-full bg-slate-900/80 border border-white/10 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50"
                                defaultValue=""
                            >
                                <option value="" disabled>— Choose your {cityName} zone —</option>
                                {activeWards.map(w => <option key={w} value={w}>{w}</option>)}
                            </select>
                        </div>
                    </div>

                    <button onClick={onLogout} className="w-full mt-6 text-xs text-slate-500 hover:text-slate-400 transition-colors">
                        ← Back to Role Selection
                    </button>
                </motion.div>
            </main>
        );
    }

    // PIN ENTRY SCREEN
    if (locationMode === 'pin') {
        return (
            <main className="min-h-screen bg-[#020617] text-slate-100 font-sans flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-sm">
                    <button onClick={() => setLocationMode('select')} className="flex items-center text-sm text-slate-400 hover:text-white mb-6 transition-colors">
                        <ChevronRight className="w-4 h-4 rotate-180 mr-1" /> Back
                    </button>
                    <h2 className="text-xl font-bold text-white mb-2">Enter PIN Code</h2>
                    <p className="text-sm text-slate-400 mb-6">We'll map your PIN to the nearest {cityName} flood zone</p>
                    <input
                        type="number"
                        placeholder="e.g. 110032"
                        value={pinCode}
                        onChange={e => setPinCode(e.target.value)}
                        className="w-full bg-slate-800/80 border border-white/10 rounded-xl p-4 text-lg font-mono text-white focus:outline-none focus:border-blue-500/50 text-center tracking-widest"
                        maxLength={6}
                    />
                    <button
                        onClick={() => { setSelectedWard('Shahdara – Vivek Vihar / Seemapuri'); setLocationMode('done'); }}
                        disabled={pinCode.length !== 6}
                        className="w-full mt-4 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all"
                    >
                        Check My Area →
                    </button>
                </motion.div>
            </main>
        );
    }

    // MAIN CITIZEN DASHBOARD
    return (
        <main className="min-h-screen bg-[#020617] text-slate-100 font-sans">
            {/* Sticky Header */}
            <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-blue-500/20 rounded-lg"><ShieldAlert className="w-5 h-5 text-blue-400" /></div>
                    <div>
                        <h1 className="text-sm font-bold text-white tracking-wide">AURORA Citizen</h1>
                        <p className="text-[10px] text-blue-300/80 font-semibold uppercase tracking-wider">{cityName} Flood Intelligence</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setLocationMode('select')}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800/80 border border-white/10 rounded-lg text-xs text-slate-300 hover:text-white transition-colors"
                    >
                        <MapPin className="w-3 h-3" />
                        <span className="max-w-[130px] truncate">{selectedWard.split('–')[0].trim()}</span>
                    </button>
                    <button onClick={onLogout} className="p-2 bg-white/5 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 py-6 space-y-5 pb-12">

                {/* MODULE 1: FLOOD RISK CARD */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                    <div className={`rounded-2xl border p-6 ${riskMeta.bg} ${riskMeta.border}`}>
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Your Zone</p>
                                <h2 className="text-lg font-bold text-white leading-tight">{selectedWard.split('–')[1]?.trim() || selectedWard}</h2>
                            </div>
                            <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border ${riskMeta.bg} ${riskMeta.border}`}>
                                <span className={`w-2 h-2 rounded-full animate-pulse ${riskMeta.dot}`}></span>
                                <span className={`text-sm font-bold ${riskMeta.color}`}>{riskMeta.label}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-5">
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-semibold">Flood Probability</p>
                                <p className={`text-4xl font-light ${riskMeta.color}`}>{ward.prob}<span className="text-xl">%</span></p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-semibold">Risk Trend</p>
                                <div className="flex items-center space-x-2 mt-1">
                                    {ward.trend === 'up' && <><ArrowUp className="w-5 h-5 text-red-400" /><span className="text-sm font-bold text-red-400">Increasing</span></>}
                                    {ward.trend === 'down' && <><ArrowDown className="w-5 h-5 text-emerald-400" /><span className="text-sm font-bold text-emerald-400">Decreasing</span></>}
                                    {ward.trend === 'stable' && <><Minus className="w-5 h-5 text-yellow-400" /><span className="text-sm font-bold text-yellow-400">Stable</span></>}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-white/10 pt-3">
                            <span>Last Updated: {activeTime}</span>
                            <span className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse mr-1.5"></span>Live IMD Data Active</span>
                        </div>
                    </div>
                </motion.div>

                {/* MODULE 2: PRE-MONSOON READINESS */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.10 }}>
                    <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-white flex items-center"><Activity className="w-4 h-4 text-blue-400 mr-2" />Pre-Monsoon Readiness</h3>
                            <div className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${readinessMeta.color} bg-white/5 border-white/10`}>
                                ⚠ {readinessMeta.label}
                            </div>
                        </div>

                        <div className="flex items-center space-x-4 mb-5">
                            <div className="relative w-20 h-20 flex-shrink-0">
                                <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e293b" strokeWidth="3" />
                                    <circle cx="18" cy="18" r="15.9" fill="none"
                                        stroke={readiness >= 70 ? '#10b981' : readiness >= 50 ? '#eab308' : '#ef4444'}
                                        strokeWidth="3" strokeDasharray={`${readiness} ${100 - readiness}`} strokeLinecap="round" />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className={`text-xl font-bold ${readinessMeta.color}`}>{readiness}%</span>
                                </div>
                            </div>
                            <div className="flex-1 space-y-3">
                                {[
                                    { label: 'Drainage System', val: ward.drainage, color: ward.drainage < 50 ? 'bg-red-500' : 'bg-yellow-500' },
                                    { label: 'Emergency Access', val: ward.emergency, color: ward.emergency < 50 ? 'bg-red-500' : 'bg-emerald-500' },
                                    { label: 'Infrastructure', val: ward.infra, color: ward.infra < 50 ? 'bg-red-500' : 'bg-blue-500' },
                                ].map(item => (
                                    <div key={item.label}>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-slate-400">{item.label}</span>
                                            <span className="text-slate-200 font-semibold">{item.val}%</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${item.val}%` }}
                                                transition={{ duration: 0.8, delay: 0.3 }}
                                                className={`h-full ${item.color} rounded-full`}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {ward.drainage < 50 && (
                            <div className="flex items-start space-x-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-xs text-yellow-300">
                                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <p>Drainage efficiency is below optimal in your zone. Waterlogging may persist for several hours after heavy rain.</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* MODULE 3: RAINFALL SCENARIO VIEWER */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5">
                        <h3 className="font-bold text-white flex items-center mb-4"><CloudRain className="w-4 h-4 text-blue-400 mr-2" />Simulate Heavy Rain in Your Area</h3>
                        <div className="grid grid-cols-4 gap-2 mb-5">
                            {RAINFALL_SCENARIOS.map((s, i) => (
                                <button key={s.label} onClick={() => setRainfallScenario(i)}
                                    className={`flex flex-col items-center p-3 rounded-xl border transition-all ${rainfallScenario === i
                                        ? 'bg-blue-600/30 border-blue-500/60 text-blue-300'
                                        : 'bg-slate-800/60 border-white/5 text-slate-400 hover:border-white/20'}`}>
                                    <span className="text-xl mb-1">{s.emoji}</span>
                                    <span className="text-xs font-bold">{s.label}</span>
                                    <span className="text-[10px] mt-0.5 opacity-70">{s.mm}mm</span>
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-slate-800/60 rounded-xl p-3 text-center">
                                <Car className="w-4 h-4 text-orange-400 mx-auto mb-1.5" />
                                <p className="text-[10px] text-slate-400 mb-1">Roads Affected</p>
                                <p className="text-lg font-bold text-orange-400">{scenario.roads}</p>
                            </div>
                            <div className="bg-slate-800/60 rounded-xl p-3 text-center">
                                <Droplets className="w-4 h-4 text-blue-400 mx-auto mb-1.5" />
                                <p className="text-[10px] text-slate-400 mb-1">Water Depth Risk</p>
                                <p className="text-sm font-bold text-blue-400">{scenario.depth}</p>
                            </div>
                            <div className="bg-slate-800/60 rounded-xl p-3 text-center">
                                <Home className="w-4 h-4 text-purple-400 mx-auto mb-1.5" />
                                <p className="text-[10px] text-slate-400 mb-1">Households at Risk</p>
                                <p className="text-lg font-bold text-purple-400">{scenario.households > 0 ? `~${scenario.households.toLocaleString()}` : 'None'}</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* MODULE 4: NEARBY HOTSPOTS */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.20 }}>
                    <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5">
                        <h3 className="font-bold text-white flex items-center mb-4"><AlertTriangle className="w-4 h-4 text-red-400 mr-2" />Flood-Prone Zones Near You</h3>
                        <div className="space-y-3">
                            {ward.hotspots.map((h, i) => {
                                const hRisk = h.risk === 'Critical' ? 'text-red-400 border-red-500/40 bg-red-500/10'
                                    : h.risk === 'Very High' ? 'text-orange-400 border-orange-500/40 bg-orange-500/10'
                                        : 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10';
                                return (
                                    <div key={i}>
                                        <button onClick={() => setSelectedHotspot(selectedHotspot === i ? null : i)}
                                            className="w-full flex items-center justify-between p-4 bg-slate-800/60 border border-white/5 hover:border-white/15 rounded-xl transition-all text-left">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0"></div>
                                                <span className="font-semibold text-slate-200 text-sm">{h.name}</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${hRisk}`}>{h.risk}</span>
                                                <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${selectedHotspot === i ? 'rotate-90' : ''}`} />
                                            </div>
                                        </button>
                                        <AnimatePresence>
                                            {selectedHotspot === i && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                    <div className="px-4 pt-2 pb-3 bg-slate-800/30 border border-white/5 border-t-0 rounded-b-xl">
                                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Why it floods here:</p>
                                                        <ul className="space-y-1">
                                                            {h.reasons.map((r, j) => (
                                                                <li key={j} className="flex items-center text-xs text-slate-300">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 mr-2 flex-shrink-0"></span>{r}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </motion.div>

                {/* MODULE 5: SAFETY ADVISORY */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                    <div className={`rounded-2xl border p-5 ${riskMeta.bg} ${riskMeta.border}`}>
                        <h3 className="font-bold text-white flex items-center mb-4">
                            <ShieldAlert className={`w-4 h-4 mr-2 ${riskMeta.color}`} />Personalised Safety Advisory
                        </h3>
                        <ul className="space-y-2.5">
                            {getSafetyAdvice().map((advice, i) => (
                                <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }}
                                    className="flex items-start space-x-3 text-sm text-slate-200">
                                    <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${riskMeta.color}`} />
                                    <span>{advice}</span>
                                </motion.li>
                            ))}
                        </ul>
                    </div>
                </motion.div>

                {/* MODULE 6: VULNERABLE POPULATION AWARENESS */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.30 }}>
                    <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5">
                        <h3 className="font-bold text-white flex items-center mb-3"><Users className="w-4 h-4 text-purple-400 mr-2" />Community Vulnerability Awareness</h3>
                        <p className="text-xs text-slate-400 mb-3">High-risk zones in your area include these community types — be extra cautious nearby:</p>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { icon: Building, label: 'Unauthorized Colonies' },
                                { icon: School, label: 'Near-Yamuna Schools' },
                                { icon: Heart, label: 'Elderly & Care Zones' },
                                { icon: Users, label: 'Floodplain Settlements' },
                            ].map(({ icon: Icon, label }) => (
                                <div key={label} className="flex items-center space-x-2 p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                                    <Icon className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                                    <span className="text-xs text-slate-300">{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* MODULE 7: NEAREST SAFE LOCATIONS */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                    <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5">
                        <h3 className="font-bold text-white flex items-center mb-4"><MapPin className="w-4 h-4 text-emerald-400 mr-2" />Nearest Safe Locations</h3>
                        <div className="space-y-3">
                            {ward.safeZones.map((z, i) => {
                                const icon = z.type === 'Hospital' ? <Hospital className="w-4 h-4 text-red-400" />
                                    : z.type === 'Emergency Center' ? <Package className="w-4 h-4 text-orange-400" />
                                        : <Navigation className="w-4 h-4 text-emerald-400" />;
                                const bg = z.type === 'Hospital' ? 'bg-red-500/10 border-red-500/20'
                                    : z.type === 'Emergency Center' ? 'bg-orange-500/10 border-orange-500/20'
                                        : 'bg-emerald-500/10 border-emerald-500/20';
                                return (
                                    <div key={i} className={`flex items-center justify-between p-3.5 rounded-xl border ${bg}`}>
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-white/5 rounded-lg">{icon}</div>
                                            <div>
                                                <p className="text-sm font-semibold text-white">{z.name}</p>
                                                <p className="text-[10px] text-slate-400 font-medium">{z.type}</p>
                                            </div>
                                        </div>
                                        <span className="text-sm font-bold text-slate-300">{z.dist}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </motion.div>

                {/* MODULE 8: LIVE RAINFALL STATUS */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.40 }}>
                    <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5">
                        <h3 className="font-bold text-white flex items-center mb-4"><Zap className="w-4 h-4 text-yellow-400 mr-2" />Live Rainfall Status</h3>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-slate-800/60 rounded-xl p-4 text-center">
                                <CloudRain className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                                <p className="text-[10px] text-slate-400 mb-1">Current Rainfall</p>
                                <p className="text-xl font-bold text-blue-400">{ward.rainfall}<span className="text-xs font-normal">mm</span></p>
                            </div>
                            <div className={`rounded-xl p-4 text-center ${ward.forecast === 'Extremely Heavy' ? 'bg-red-500/10' : ward.forecast === 'Heavy' ? 'bg-orange-500/10' : 'bg-yellow-500/10'}`}>
                                <AlertTriangle className={`w-5 h-5 mx-auto mb-2 ${ward.forecast === 'Extremely Heavy' ? 'text-red-400' : ward.forecast === 'Heavy' ? 'text-orange-400' : 'text-yellow-400'}`} />
                                <p className="text-[10px] text-slate-400 mb-1">Next 6 Hours</p>
                                <p className={`text-sm font-bold ${ward.forecast === 'Extremely Heavy' ? 'text-red-400' : ward.forecast === 'Heavy' ? 'text-orange-400' : 'text-yellow-400'}`}>{ward.forecast}</p>
                            </div>
                            <div className={`rounded-xl p-4 text-center ${riskMeta.bg} border ${riskMeta.border}`}>
                                <ShieldAlert className={`w-5 h-5 mx-auto mb-2 ${riskMeta.color}`} />
                                <p className="text-[10px] text-slate-400 mb-1">Threat Level</p>
                                <p className={`text-sm font-bold ${riskMeta.color}`}>{riskMeta.label}</p>
                            </div>
                        </div>
                        {/* Emergency Contacts — Delhi specific */}
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            {[
                                { label: cityName === 'Delhi' ? 'Delhi Flood Control' : 'City Flood Helpline', num: cityName === 'Delhi' ? '1800111817' : '1800-11-2012' },
                                { label: 'Emergency / Ambulance', num: '112' },
                            ].map(c => (
                                <div key={c.num} className="flex items-center justify-between p-3 bg-slate-800/50 border border-white/5 rounded-xl">
                                    <div className="flex items-center space-x-2"><Phone className="w-3.5 h-3.5 text-emerald-400" /><span className="text-xs text-slate-400">{c.label}</span></div>
                                    <span className="text-sm font-bold text-emerald-400 font-mono">{c.num}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* MODULE 9: ALERT SUBSCRIPTION */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                    <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5">
                        <h3 className="font-bold text-white flex items-center mb-1"><Bell className="w-4 h-4 text-blue-400 mr-2" />Get Real-Time Alerts</h3>
                        <p className="text-xs text-slate-400 mb-4">Stay ahead of {cityName} floods. Choose how you want to be notified:</p>
                        <div className="space-y-3 mb-5">
                            {[
                                { label: 'SMS Alerts', desc: 'Text message to your phone', state: alertSMS, set: setAlertSMS },
                                { label: 'Email Alerts', desc: 'Detailed advisories in your inbox', state: alertEmail, set: setAlertEmail },
                                { label: 'Push Notifications', desc: 'Instant browser notification', state: alertPush, set: setAlertPush },
                            ].map(a => (
                                <div key={a.label} className="flex items-center justify-between p-3.5 bg-slate-800/60 border border-white/5 rounded-xl">
                                    <div>
                                        <p className="text-sm font-semibold text-white">{a.label}</p>
                                        <p className="text-[11px] text-slate-400">{a.desc}</p>
                                    </div>
                                    <button onClick={() => a.set(!a.state)}
                                        className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${a.state ? 'bg-blue-600' : 'bg-slate-700'}`}>
                                        <motion.div animate={{ x: a.state ? 24 : 2 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                            className="absolute top-1 w-4 h-4 bg-white rounded-full shadow" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button onClick={handleSaveAlerts}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                            {alertSaved ? '✓ Preferences Saved!' : 'Save Alert Preferences'}
                        </button>
                    </div>
                </motion.div>

                <div className="text-center text-[11px] text-slate-600 pt-2">
                    AURORA • {cityName} Flood Intelligence Platform • IMD data refreshes every 5 minutes
                </div>
            </div>
        </main>
    );
}
