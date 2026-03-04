'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

const FloodMap = dynamic(() => import('@/components/Map'), {
    ssr: false,
    loading: () => <div className="absolute inset-0 bg-[#0a0f18] flex items-center justify-center text-slate-500 font-mono text-xs">INITIALIZING WEBGL SUBSYSTEM...</div>
});

import DashboardPanel from '@/components/DashboardPanel';
import CitizenDashboard from '@/components/CitizenDashboard';
import MitigationEngine from '@/components/MitigationEngine';
import CityAdminPanel from '@/components/CityAdminPanel';
import SystemAdminPanel from '@/components/SystemAdminPanel';
import WardOfficerDashboard from '@/components/WardOfficerDashboard';
import { Layers, CloudRain, ShieldAlert, Activity, Users, MapPin, Database, ChevronLeft, Droplets, Zap, ChevronRight, SlidersHorizontal, Radar, ListOrdered, X, LayoutGrid, Lock } from 'lucide-react';
import Link from 'next/link';
import { ReactCompareSlider } from 'react-compare-slider';

export default function DashboardPage() {
    // 4-Tier RBAC State (Null = Not Logged In)
    const [authState, setAuthState] = useState<{ role: string, ward_id: string | null } | null>(null);
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const [activeScenario, setActiveScenario] = useState('none');
    const [panelExpanded, setPanelExpanded] = useState(true);
    const [radarVisible, setRadarVisible] = useState(false);
    const [vulnerablePopVisible, setVulnerablePopVisible] = useState(false);
    const [comparisonMode, setComparisonMode] = useState(false);
    const [showWardRankings, setShowWardRankings] = useState(false);
    const [sortRule, setSortRule] = useState('risk'); // 'risk', 'readiness', 'exposure', 'economic'
    const [selectedWard, setSelectedWard] = useState<any>(null);
    const [showOptimizer, setShowOptimizer] = useState(false);
    const [showTelemetry, setShowTelemetry] = useState(false);
    const [showMitigation, setShowMitigation] = useState(false);
    const [showCityAdmin, setShowCityAdmin] = useState(false);
    const [showSysAdmin, setShowSysAdmin] = useState(false);

    // Audit log — captures real user interactions for System Admin
    const [auditLog, setAuditLog] = useState<any[]>([]);

    // Live Engine States
    const [rainfall, setRainfall] = useState(0); // 0-500mm
    const [budget, setBudget] = useState(10); // $M
    const [pumps, setPumps] = useState(142); // Active pumps
    const [drainage, setDrainage] = useState(45); // % efficiency

    // Audit log tracker — must come after state declarations
    const prevValues = useRef({ rainfall: 0, budget: 10, pumps: 142, drainage: 45 });
    useEffect(() => {
        const prev = prevValues.current;
        const fields: Array<{ key: 'rainfall' | 'budget' | 'pumps' | 'drainage'; label: string }> = [
            { key: 'rainfall', label: 'Rainfall Slider' },
            { key: 'budget', label: 'Budget Allocation' },
            { key: 'pumps', label: 'Pump Deployment' },
            { key: 'drainage', label: 'Drainage Efficiency' },
        ];
        const current = { rainfall, budget, pumps, drainage };
        fields.forEach(f => {
            if (prev[f.key] !== current[f.key]) {
                setAuditLog(log => [...log, {
                    id: `${Date.now()}-${f.key}`,
                    ts: Date.now(),
                    role: 'City Admin',
                    action: `${f.label} adjusted from ${prev[f.key]} to ${current[f.key]}`,
                    ward: 'Citywide',
                    field: f.label,
                    before: prev[f.key],
                    after: current[f.key],
                }]);
                (prev as any)[f.key] = current[f.key];
            }
        });
    }, [rainfall, budget, pumps, drainage]);

    // Live Recomputation Engine Logic
    // Flood risk goes UP with rainfall/poor drainage, DOWN with pumps/budget
    const baseRisk = (rainfall / 500) * 0.8 + ((100 - drainage) / 100) * 0.3 - (pumps / 300) * 0.15 + (budget / 100) * 0.05;
    const floodRiskScore = Math.max(0, Math.min(1, baseRisk));

    // Dynamic Impacts
    const affectedPop = Math.round(floodRiskScore * 480); // max 480k
    const submergedArea = Math.round(floodRiskScore * 180); // max 180 km2
    const damageEst = Math.round(floodRiskScore * 85); // max $85M

    // Dynamic Threat Level
    let threatLevel = { label: 'Low', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500' };
    if (floodRiskScore > 0.75) threatLevel = { label: 'Critical', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500' };
    else if (floodRiskScore > 0.5) threatLevel = { label: 'High', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500' };
    else if (floodRiskScore > 0.25) threatLevel = { label: 'Moderate', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500' };

    // Dynamic Readiness Engine — Delhi MCD District Zones
    const cityReadiness = Math.round((drainage * 0.6) + (budget * 0.4));
    // Rohini (North Delhi) — drainage is chronically poor, historically floods first
    const rohiniReadiness = Math.max(0, cityReadiness - 25);
    // Shahdara (East Delhi) — Yamuna floodplain proximity, moderate drain infrastructure
    const shahdaraReadiness = Math.max(0, cityReadiness - 10);
    // Okhla (South Delhi/Barapullah) — better drainage infra, readiness above average
    const okhlaReadiness = Math.min(100, cityReadiness + 15);

    const getReadinessColor = (val: number) => {
        if (val < 40) return { bg: 'bg-red-500', text: 'text-red-400', shadow: 'shadow-[0_0_10px_rgba(239,68,68,0.5)]', label: 'Crit' };
        if (val < 70) return { bg: 'bg-orange-500', text: 'text-orange-400', shadow: 'shadow-[0_0_10px_rgba(249,115,22,0.5)]', label: 'High' };
        return { bg: 'bg-emerald-500', text: 'text-emerald-400', shadow: 'shadow-[0_0_10px_rgba(16,185,129,0.5)]', label: 'Safe' };
    };

    const rohiniC = getReadinessColor(rohiniReadiness);
    const shahdaraC = getReadinessColor(shahdaraReadiness);
    const okhlaC = getReadinessColor(okhlaReadiness);

    // Generate Dynamic Delhi Wards (based on MCD Administrative Zones)
    const WARD_NAMES = ['Civil Lines', 'Model Town', 'Chandni Chowk', 'Darya Ganj', 'Karol Bagh', 'Patel Nagar', 'Old Delhi', 'Connaught Place', 'Lutyens', 'Shahdara', 'Vivek Vihar', 'Seemapuri', 'Mustafabad', 'Rohini', 'Bawana', 'Narela', 'Dwarka', 'Najafgarh', 'Saket', 'Okhla', 'Jasola', 'Madanpur Khadar', 'Patparganj', 'Kondli'];
    let dynamicWards = WARD_NAMES.map((name, i) => {
        // Deterministic but varied base vulnerabilities per ward
        const baseVuln = (i % 5) * 0.15;

        // Calculate dynamic live risk per ward based on global parameters + ward base vulnerability
        const wardRisk = Math.max(0, Math.min(1, baseRisk + baseVuln - 0.2));
        const wardReadiness = Math.round(100 - (wardRisk * 100));

        // Impact extrapolations
        const exposure = Math.round(wardRisk * 80); // %
        const economic = Math.round(wardRisk * 15); // $M

        let status = 'Ready';
        let color = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
        if (wardRisk > 0.8) { status = 'Critical'; color = 'text-red-400 bg-red-500/10 border-red-500/30'; }
        else if (wardRisk > 0.6) { status = 'High Risk'; color = 'text-orange-400 bg-orange-500/10 border-orange-500/30'; }
        else if (wardRisk > 0.3) { status = 'Moderate'; color = 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'; }

        return {
            name: `Ward ${name}`,
            risk: wardRisk,
            readiness: wardReadiness,
            exposure: exposure,
            economic: economic,
            status, color
        }
    });

    // Sorting Logic
    dynamicWards.sort((a, b) => {
        if (sortRule === 'readiness') return a.readiness - b.readiness; // Ascending (worst first)
        if (sortRule === 'exposure') return b.exposure - a.exposure;
        if (sortRule === 'economic') return b.economic - a.economic;
        return b.risk - a.risk; // default 'risk' descending
    });

    // Compute System-Wide Totals for Live Dashboard View
    const totalMicroGrids = dynamicWards.reduce((acc, ward) => acc + Math.round(2412 * (1 + ward.risk * 0.2)), 0);
    const totalIdentifiedHotspots = dynamicWards.reduce((acc, ward) => acc + Math.round(ward.risk * 150), 0);

    const handleLogin = (role: string, specificWard: string | null = null) => {
        setIsLoggingIn(true);
        setTimeout(() => {
            // Mocking the JWT Decryption extraction phase
            setAuthState({ role: role, ward_id: specificWard });
            setIsLoggingIn(false);
        }, 1500);
    };

    if (!authState) {
        return (
            <main className="relative w-full h-screen overflow-hidden bg-[#020617] text-slate-100 flex items-center justify-center font-sans">
                <div className="absolute inset-0 z-0 bg-blue-900/10 mix-blend-screen overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vw] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 pointer-events-none rounded-full blur-[80px]"></div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="z-10 bg-slate-900/80 backdrop-blur-2xl border border-white/10 p-12 rounded-3xl shadow-[0_0_80px_rgba(37,99,235,0.2)] w-full max-w-xl"
                >
                    <div className="flex flex-col items-center mb-10">
                        <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/20 mb-4 inline-block">
                            <ShieldAlert className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-3xl font-black tracking-widest text-white uppercase text-center shadow-blue-500 drop-shadow-md">AURORA Secure Access</h1>
                        <p className="text-xs text-blue-300/80 tracking-widest uppercase font-semibold mt-2 text-center">Restricted Government Operations Check</p>
                    </div>

                    <div className="space-y-4">
                        {[
                            { role: "Citizen", desc: "Public Advisory & Visual Risk", icon: Users, color: "emerald", access: null },
                            { role: "Ward Officer", desc: "Local Zone Command", icon: MapPin, color: "yellow", access: "Ward H-West" },
                            { role: "City Admin", desc: "Delhi Wide Optimization", icon: Activity, color: "orange", access: null },
                            { role: "System Admin", desc: "Full Threshold Control", icon: Database, color: "red", access: null },
                        ].map((r, i) => {
                            const Icon = r.icon;
                            return (
                                <button
                                    key={i}
                                    onClick={() => handleLogin(r.role, r.access)}
                                    disabled={isLoggingIn}
                                    className={`w-full group relative overflow-hidden flex items-center p-4 rounded-xl border border-${r.color}-500/30 bg-slate-800/50 hover:bg-${r.color}-500/10 transition-all text-left duration-300 disabled:opacity-50`}
                                >
                                    <div className={`p-3 rounded-lg bg-${r.color}-500/10 mr-4 group-hover:scale-110 transition-transform`}>
                                        <Icon className={`w-6 h-6 text-${r.color}-400`} />
                                    </div>
                                    <div>
                                        <h3 className={`text-lg font-bold text-white group-hover:text-${r.color}-300 transition-colors`}>{r.role}</h3>
                                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{r.desc}</p>
                                    </div>
                                    <ChevronRight className={`absolute right-6 w-5 h-5 text-${r.color}-500/50 group-hover:text-${r.color}-400 group-hover:translate-x-1 transition-all`} />
                                </button>
                            );
                        })}
                    </div>
                </motion.div>

                {isLoggingIn && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-md">
                        <div className="w-12 h-12 relative border-t-2 border-r-2 border-blue-500 rounded-full animate-spin mb-6"></div>
                        <p className="text-sm font-bold tracking-[0.2em] text-blue-400 uppercase animate-pulse">Decrypting Role Assignment Bearer Token...</p>
                    </div>
                )}
            </main>
        );
    }

    // Citizen gets dedicated full experience
    if (authState.role === 'Citizen') {
        return <CitizenDashboard onLogout={() => setAuthState(null)} />;
    }

    // Ward Officer gets dedicated 2D tactical dashboard (no 3D map)
    if (authState.role === 'Ward Officer') {
        return <WardOfficerDashboard onLogout={() => setAuthState(null)} />;
    }

    return (
        <main className="relative w-full h-screen overflow-hidden bg-[#020617] text-slate-100 font-sans selection:bg-blue-500/30">

            {/* Background Interactive Map */}
            <div className="absolute inset-0 z-0 bg-[#020617]">
                {comparisonMode ? (
                    <ReactCompareSlider
                        className="w-full h-full"
                        itemOne={<FloodMap rainfall={0} radarVisible={radarVisible} vulnerablePopVisible={vulnerablePopVisible} comparisonMode={true} highlightedWard={selectedWard} />}
                        itemTwo={<FloodMap rainfall={rainfall === 0 ? 100 : rainfall} radarVisible={radarVisible} vulnerablePopVisible={vulnerablePopVisible} comparisonMode={false} highlightedWard={selectedWard} />}
                    />
                ) : (
                    <FloodMap rainfall={rainfall} radarVisible={radarVisible} vulnerablePopVisible={vulnerablePopVisible} comparisonMode={false} highlightedWard={selectedWard} />
                )}
            </div>

            {/* Comparison Mode Labels */}
            {comparisonMode && (
                <div className="absolute top-24 left-1/2 transform -translate-x-1/2 flex justify-between w-[400px] z-10 pointer-events-none">
                    <span className="glass-panel px-4 py-1.5 rounded-full text-xs font-bold text-emerald-400 border border-emerald-500/30">Normal Condition</span>
                    <span className="glass-panel px-4 py-1.5 rounded-full text-xs font-bold text-red-400 border border-red-500/30">Post-Simulation</span>
                </div>
            )}

            {/* Top Glass Navigation */}
            <header className="absolute top-0 w-full z-20 bg-slate-900/40 backdrop-blur-xl border-b border-white/10 flex justify-between items-center px-6 py-4 shadow-2xl">
                <div className="flex items-center space-x-6">
                    <Link href="/" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                        <ChevronLeft className="w-5 h-5 text-slate-300" />
                    </Link>
                    <div className="flex items-center">
                        <img src="/2.png" alt="AURORA Logo" className="h-20 w-auto object-contain" />
                    </div>
                </div>

                <div className="flex items-center space-x-3 bg-slate-900/50 p-2 rounded-xl border border-white/10 shadow-xl">
                    <button
                        onClick={() => setShowWardRankings(true)}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center space-x-2 text-white shadow-lg ${showWardRankings ? 'bg-blue-600 shadow-blue-500/30' : 'bg-slate-800 hover:bg-slate-700'}`}
                    >
                        <ListOrdered className="w-4 h-4" />
                        <span>Live Ward Rankings</span>
                    </button>

                    {/* City Admin — Strategic Command Panel */}
                    {authState.role === 'City Admin' && (
                        <button
                            onClick={() => setShowCityAdmin(true)}
                            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center space-x-2 shadow-lg ${showCityAdmin
                                ? 'bg-blue-600 text-white shadow-blue-500/30'
                                : 'bg-gradient-to-r from-blue-600/80 to-indigo-600/80 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20'
                                }`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                            <span>Strategic Command</span>
                        </button>
                    )}

                    {/* System Admin — Governance & Control Panel */}
                    {authState.role === 'System Admin' && (
                        <button
                            onClick={() => setShowSysAdmin(true)}
                            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center space-x-2 shadow-lg ${showSysAdmin
                                ? 'bg-rose-600 text-white shadow-rose-500/30'
                                : 'bg-gradient-to-r from-rose-600/80 to-red-600/80 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-500/20'
                                }`}
                        >
                            <Lock className="w-4 h-4" />
                            <span>Governance Control</span>
                        </button>
                    )}

                    {/* Mitigation Engine — RBAC gated: Ward Officer, City Admin, System Admin */}
                    {(authState.role === 'Ward Officer' || authState.role === 'City Admin' || authState.role === 'System Admin') && (
                        <button
                            onClick={() => setShowMitigation(true)}
                            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center space-x-2 shadow-lg ${showMitigation
                                ? 'bg-orange-600 text-white shadow-orange-500/30'
                                : 'bg-gradient-to-r from-orange-600/80 to-red-600/80 hover:from-orange-500 hover:to-red-500 text-white shadow-orange-500/20'
                                }`}
                        >
                            <ShieldAlert className="w-4 h-4" />
                            <span>Mitigation Engine</span>
                        </button>
                    )}

                    <div className="w-px h-6 bg-white/10 mx-1"></div>

                    {/* Active RBAC Security Token Display */}
                    <div className="flex items-center space-x-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <ShieldAlert className="w-4 h-4 text-blue-400" />
                        <span className="text-xs font-bold text-blue-300 tracking-wider">
                            {authState.role.toUpperCase()}
                            {authState.ward_id ? ` : ${authState.ward_id.toUpperCase()}` : ''}
                        </span>
                    </div>

                    {/* Logout Button */}
                    <button
                        onClick={() => setAuthState(null)}
                        className="p-2 text-slate-400 hover:text-red-400 transition-colors bg-white/5 hover:bg-red-500/10 rounded-lg ml-2"
                        title="End Secure Session"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </header >

            {/* Main Admin UI - Left Metrics Sidebar */}
            <AnimatePresence>
                {
                    authState.role !== 'Citizen' && panelExpanded && (
                        <motion.aside
                            initial={{ x: -100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -100, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="absolute left-6 top-28 bottom-6 w-[340px] flex flex-col space-y-6 z-10 overflow-y-auto pr-2 pb-6 custom-scrollbar"
                        >

                            {/* System Status Overview */}
                            <DashboardPanel title="Delhi Intelligence Grid" icon={<Activity className="w-5 h-5 text-blue-400" />}>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="glass-panel p-4 rounded-xl relative overflow-hidden group col-span-2 shadow-inner">
                                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/10 to-transparent rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                                        <div className="relative flex justify-between items-center">
                                            <div>
                                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Micro-Grids</p>
                                                <p className="text-2xl font-light text-white tracking-tight">{totalMicroGrids.toLocaleString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[11px] font-bold text-red-400 uppercase tracking-wider mb-1">Identified Hotspots</p>
                                                <p className="text-2xl font-bold text-red-500 tracking-tight">{totalIdentifiedHotspots.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="glass-panel p-4 rounded-xl relative overflow-hidden group">
                                        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                                        <div className="relative">
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Threat Level</p>
                                            <div className={`inline-flex items-center px-2 py-1 ${threatLevel.bg} ${threatLevel.border} border rounded text-xs font-bold ${threatLevel.color} uppercase tracking-widest`}>
                                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse bg-current`}></span>
                                                {threatLevel.label}
                                            </div>
                                        </div>
                                    </div>
                                    <div
                                        onClick={() => setShowTelemetry(true)}
                                        className="col-span-2 glass-panel p-4 rounded-xl flex items-center justify-between border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-500/10 to-transparent cursor-pointer hover:bg-white/5 transition-colors"
                                    >
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sensor Telemetry</p>
                                            <p className="text-lg font-medium text-white flex items-center">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                                                98.4% Online
                                            </p>
                                        </div>
                                        <Database className="w-8 h-8 text-emerald-500/30" />
                                    </div>
                                </div>
                            </DashboardPanel>

                            {/* Ward Readiness Breakdown */}
                            <DashboardPanel title="Pre-Monsoon Readiness" icon={<ShieldAlert className="w-5 h-5 text-indigo-400" />}>
                                <div className="space-y-5">
                                    <div className="flex justify-between items-end border-b border-slate-700/50 pb-4">
                                        <div>
                                            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">City Average</span>
                                            <div className="text-sm text-slate-500 mt-1">Based on live parameters</div>
                                        </div>
                                        <div className="flex items-center">
                                            {cityReadiness > 60 ? <Activity className="w-5 h-5 text-emerald-400 mr-2" /> : <ChevronRight className="w-5 h-5 text-red-400 mr-2 rotate-90" />}
                                            <span className={`text-4xl font-light ${cityReadiness > 60 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {cityReadiness}%
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="relative">
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="font-medium text-white">Rohini (North Delhi)</span>
                                                <span className={`${rohiniC.text} font-bold`}>{rohiniReadiness}% <span className="text-xs font-normal text-slate-500">{rohiniC.label}</span></span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                                <div className={`h-full ${rohiniC.bg} rounded-full ${rohiniC.shadow} transition-all duration-500`} style={{ width: `${rohiniReadiness}%` }}></div>
                                            </div>
                                        </div>

                                        <div className="relative">
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="font-medium text-white">Shahdara (East Delhi)</span>
                                                <span className={`${shahdaraC.text} font-bold`}>{shahdaraReadiness}% <span className="text-xs font-normal text-slate-500">{shahdaraC.label}</span></span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                                <div className={`h-full ${shahdaraC.bg} rounded-full ${shahdaraC.shadow} transition-all duration-500`} style={{ width: `${shahdaraReadiness}%` }}></div>
                                            </div>
                                        </div>

                                        <div className="relative">
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="font-medium text-white">Okhla (South Delhi)</span>
                                                <span className={`${okhlaC.text} font-bold`}>{okhlaReadiness}% <span className="text-xs font-normal text-slate-500">{okhlaC.label}</span></span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                                <div className={`h-full ${okhlaC.bg} rounded-full ${okhlaC.shadow} transition-all duration-500`} style={{ width: `${okhlaReadiness}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </DashboardPanel>

                        </motion.aside>
                    )
                }
            </AnimatePresence >

            {/* Main Admin UI - Right Simulation Sidebar */}
            <AnimatePresence>
                {
                    authState.role !== 'Citizen' && panelExpanded && (
                        <motion.aside
                            initial={{ x: 100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 100, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="absolute right-6 top-28 bottom-6 w-[340px] flex flex-col space-y-6 z-10 overflow-y-auto pl-2 pb-6 custom-scrollbar"
                        >
                            {/* Scenario Simulation */}
                            <DashboardPanel title="Simulation Engine" icon={<CloudRain className="w-5 h-5 text-blue-400" />}>
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    <button
                                        onClick={() => setRadarVisible(!radarVisible)}
                                        className={`py-2 text-xs font-bold rounded-lg border transition-all flex items-center justify-center space-x-1 ${radarVisible ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_10px_rgba(79,70,229,0.5)]' : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'}`}
                                    >
                                        <Radar className="w-3 h-3" />
                                        <span>Hotspot Radar</span>
                                    </button>
                                    <button
                                        onClick={() => setVulnerablePopVisible(!vulnerablePopVisible)}
                                        className={`py-2 text-[10px] font-bold rounded-lg border transition-all flex items-center justify-center space-x-1 ${vulnerablePopVisible ? 'bg-purple-600 border-purple-500 text-white shadow-[0_0_10px_rgba(147,51,234,0.5)]' : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'}`}
                                    >
                                        <Users className="w-3 h-3" />
                                        <span>Vulnerable Pop.</span>
                                    </button>
                                    <button
                                        onClick={() => setComparisonMode(!comparisonMode)}
                                        className={`col-span-2 py-2 text-xs font-bold rounded-lg border transition-all flex items-center justify-center space-x-1 ${comparisonMode ? 'bg-slate-600 border-slate-500 text-white shadow-[0_0_10px_rgba(100,116,139,0.5)]' : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'}`}
                                    >
                                        <SlidersHorizontal className="w-3.5 h-3.5" />
                                        <span>Split Compare (Pre vs Post)</span>
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between items-center text-xs mb-1 font-semibold text-slate-300">
                                            <div className="flex items-center">
                                                <span>Rainfall Forecast</span>
                                                <div className="ml-2 flex items-center px-1.5 py-0.5 rounded bg-blue-500/20 border border-blue-500/30 text-[9px] text-blue-400">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse mr-1"></span> Live Feed Active
                                                </div>
                                            </div>
                                            <span className="text-blue-400">{rainfall} mm</span>
                                        </div>
                                        <input
                                            type="range" min="0" max="500" value={rainfall} onChange={(e) => setRainfall(Number(e.target.value))}
                                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                        />
                                        {rainfall > 400 && (
                                            <div className="mt-2 text-[10px] text-red-400 font-bold bg-red-500/10 border border-red-500/30 p-1.5 rounded flex items-center">
                                                <ShieldAlert className="w-3 h-3 mr-1 flex-shrink-0" />
                                                Extreme Scenario — Model Extrapolation Active
                                            </div>
                                        )}
                                        {rainfall === 0 && (
                                            <div className="mt-2 text-[10px] text-slate-400 font-bold bg-white/5 border border-white/10 p-1.5 rounded flex items-center">
                                                Clear conditions. Baseline risk mapped.
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="flex justify-between text-[10px] mb-1 font-semibold text-slate-400 uppercase tracking-wider">
                                                <span>Drainage Eff.</span>
                                                <span className="text-teal-400">{drainage}%</span>
                                            </div>
                                            <input
                                                type="range" min="0" max="100" value={drainage} onChange={(e) => setDrainage(Number(e.target.value))}
                                                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-[10px] mb-1 font-semibold text-slate-400 uppercase tracking-wider">
                                                <span>Active Pumps</span>
                                                <span className="text-emerald-400">{pumps}</span>
                                            </div>
                                            <input
                                                type="range" min="0" max="300" value={pumps} onChange={(e) => setPumps(Number(e.target.value))}
                                                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs mb-1 font-semibold text-slate-300">
                                            <span>Relief Budget</span>
                                            <span className="text-green-400">${budget}M</span>
                                        </div>
                                        <input
                                            type="range" min="0" max="100" value={budget} onChange={(e) => setBudget(Number(e.target.value))}
                                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-green-500"
                                        />
                                    </div>
                                </div>
                            </DashboardPanel>

                            <DashboardPanel title="Live Impact Estimator" icon={<Activity className="w-5 h-5 text-orange-400" />}>
                                <div className="space-y-5">
                                    <div className="flex justify-between items-center pb-3 border-b border-white/5">
                                        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Affected Pop.</span>
                                        <span className="font-light text-2xl text-purple-400 tracking-tight">{affectedPop}k</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-3 border-b border-white/5">
                                        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Submerged</span>
                                        <span className="font-light text-2xl text-red-400 tracking-tight">{submergedArea} km²</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-2">
                                        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Damage Est.</span>
                                        <span className="font-light text-2xl text-orange-400 tracking-tight">${damageEst}M</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowOptimizer(true)}
                                    className="mt-6 w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl text-sm font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    Run Resource Optimizer
                                </button>
                            </DashboardPanel>
                        </motion.aside>
                    )
                }
            </AnimatePresence >

            {/* Hide/Show Panel Toggle */}
            {
                authState.role !== 'Citizen' && !showWardRankings && (
                    <button
                        onClick={() => setPanelExpanded(!panelExpanded)}
                        className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 px-4 py-2 bg-slate-800/80 backdrop-blur-md rounded-full border border-white/10 text-xs font-semibold text-slate-300 hover:text-white flex items-center space-x-2"
                    >
                        {panelExpanded ? 'Hide Analytics' : 'Show Analytics'}
                    </button>
                )
            }

            {/* Live Ward Rankings Modal Overlay */}
            <AnimatePresence>
                {showWardRankings && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute inset-x-16 inset-y-24 z-50 glass-panel bg-slate-900/95 border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden"
                    >
                        <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-slate-800/50">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center">
                                    <ListOrdered className="w-5 h-5 text-blue-400 mr-2" />
                                    Dynamic Ward Classification & Ranking System
                                </h2>
                                <p className="text-xs text-slate-400 mt-1">Real-time computation based on {rainfall}mm rainfall, {drainage}% drainage efficiency, and {pumps} active pumps.</p>
                            </div>
                            <button onClick={() => setShowWardRankings(false)} className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 hover:text-red-400 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex items-center space-x-3 px-6 py-4 border-b border-white/5 bg-slate-900/50">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sort By:</span>
                            {['risk', 'readiness', 'exposure', 'economic'].map((rule) => (
                                <button
                                    key={rule}
                                    onClick={() => setSortRule(rule)}
                                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded border ${sortRule === rule ? 'bg-blue-600/20 text-blue-400 border-blue-500/50' : 'bg-transparent text-slate-500 border-white/5 hover:text-slate-300'}`}
                                >
                                    {rule}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/10 text-xs text-slate-400 uppercase tracking-wider">
                                        <th className="pb-3 pl-2">Ward</th>
                                        <th className="pb-3">Classification</th>
                                        <th className="pb-3 text-right">Flood Risk Score</th>
                                        <th className="pb-3 text-right">Live Readiness</th>
                                        <th className="pb-3 text-right">Vulnerable Exposure</th>
                                        <th className="pb-3 text-right pr-2">Economic Damage Est.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dynamicWards.filter(w => authState.role === 'Ward Officer' ? w.name === authState.ward_id : true).map((w, i) => (
                                        <tr key={i} onClick={() => setSelectedWard(w)} className="border-b border-white/5 hover:bg-white/10 transition-colors group cursor-pointer">
                                            <td className="py-4 pl-2 font-bold text-slate-200 group-hover:text-blue-400">{w.name}</td>
                                            <td className="py-4">
                                                <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest border rounded ${w.color}`}>
                                                    {w.status}
                                                </span>
                                            </td>
                                            <td className="py-4 text-right">
                                                <span className="font-mono text-sm text-slate-300">{(w.risk).toFixed(3)}</span>
                                            </td>
                                            <td className="py-4 text-right">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <div className="w-16 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                                                        <div className={`h-full ${w.readiness > 60 ? 'bg-emerald-500' : 'bg-red-500'} transition-all`} style={{ width: `${w.readiness}%` }}></div>
                                                    </div>
                                                    <span className="font-mono text-sm text-slate-300 w-8">{w.readiness}%</span>
                                                </div>
                                            </td>
                                            <td className="py-4 text-right">
                                                <span className="font-mono text-sm text-purple-400">{w.exposure}% Pop.</span>
                                            </td>
                                            <td className="py-4 text-right pr-2">
                                                <span className="font-mono text-sm text-orange-400">${w.economic}M</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Advanced Ward Analytics Panel (Opened on click) */}
            <AnimatePresence>
                {selectedWard && (
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 50 }}
                        className="absolute right-8 top-1/2 transform -translate-y-1/2 w-[340px] z-[60] glass-panel bg-slate-900/95 border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden"
                    >
                        <div className="p-5 border-b border-white/10 flex justify-between items-start bg-slate-800/50">
                            <div>
                                <h3 className="text-lg font-bold text-white tracking-wide">{selectedWard.name}</h3>
                                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">Advanced Diagnostics</p>
                            </div>
                            <button onClick={() => setSelectedWard(null)} className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-5 space-y-5">
                            <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                <div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Micro-Grids</p>
                                    <p className="text-lg font-light text-slate-200">2,412</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Hotspots Identified</p>
                                    <p className="text-lg font-bold text-red-400">{Math.round(selectedWard.risk * 150)}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <p className="text-xs text-slate-300 font-semibold">Vulnerable Pop. Exposure</p>
                                    <p className="text-sm font-bold text-purple-400">{selectedWard.exposure}%</p>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-xs text-slate-300 font-semibold">Economic Loss Est.</p>
                                    <p className="text-sm font-bold text-orange-400">${selectedWard.economic} Million</p>
                                </div>

                                <div className="pt-2">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Resource Allocation Suggestion</p>
                                    <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl">
                                        <p className="text-xs text-emerald-300 font-semibold">Deploy {Math.round(selectedWard.risk * 15 + 2)} High-Capacity Pumps</p>
                                        <p className="text-[10px] text-emerald-400/70 mt-1">Prioritize primary drainage junctions</p>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Top Risk Factors & Analytics</p>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-xs pb-1 border-b border-white/5">
                                            <span className="text-slate-200 font-semibold tracking-wide">Capacity Exceedance Ratio</span>
                                            <span className="text-rose-400 font-mono font-bold">{(1.0 + (selectedWard.risk * 1.5)).toFixed(2)}x</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs pb-2 mb-2 border-b border-white/5">
                                            <span className="text-slate-200 font-semibold tracking-wide">Effective Drainage Capacity</span>
                                            <span className="text-emerald-400 font-mono font-bold">{Math.round(50 * (1 - (selectedWard.risk * 0.4)) * (selectedWard.readiness / 100))} mm/hr</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-slate-300">Low Topo. Elevation</span>
                                            <span className="text-red-400 font-mono font-bold">{Math.round((selectedWard.risk) * 45)}%</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-slate-300">Impervious Surface Area</span>
                                            <span className="text-orange-400 font-mono font-bold">{Math.round((selectedWard.risk) * 35)}%</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-slate-300">Drainage Deficiency</span>
                                            <span className="text-yellow-400 font-mono font-bold">{Math.round((selectedWard.risk) * 20)}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sensor Telemetry Modal Overlay */}
            <AnimatePresence>
                {showTelemetry && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute inset-0 z-50 flex items-center justify-center p-12 bg-slate-900/60 backdrop-blur-sm"
                    >
                        <div className="glass-panel w-full max-w-4xl bg-slate-900/95 border border-white/10 rounded-2xl shadow-[0_0_80px_rgba(16,185,129,0.2)] overflow-hidden flex flex-col max-h-full">
                            <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-slate-800/50">
                                <div>
                                    <h2 className="text-xl font-bold text-white flex items-center">
                                        <Database className="w-5 h-5 text-emerald-400 mr-2" />
                                        IoT Sensor Telemetry Network
                                    </h2>
                                    <p className="text-xs text-slate-400 mt-1">Live status of 3,842 deployed water-level units across NCT Delhi.</p>
                                </div>
                                <button onClick={() => setShowTelemetry(false)} className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 hover:text-red-400 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-8 grid grid-cols-3 gap-6 overflow-y-auto">
                                <div className="col-span-1 space-y-4">
                                    <div className="bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-xl">
                                        <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-1">Network Status</p>
                                        <p className="text-3xl font-light text-white flex items-center">
                                            <span className="w-3 h-3 rounded-full bg-emerald-500 mr-3 animate-pulse"></span>
                                            98.4%
                                        </p>
                                        <p className="text-[10px] text-slate-400 mt-2">3,956 Sensors Active • 65 Offline</p>
                                    </div>
                                    <div className="glass-panel p-5 rounded-xl">
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">High-Risk Trigger Threshold</p>
                                        <div className="h-4 bg-slate-800 rounded-full overflow-hidden flex">
                                            <div className="h-full bg-emerald-500 w-1/3 border-r border-slate-900"></div>
                                            <div className="h-full bg-yellow-500 w-1/3 border-r border-slate-900"></div>
                                            <div className="h-full bg-red-500 w-1/3 relative">
                                                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white animate-pulse"></div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-[9px] text-slate-500 mt-1 font-bold">
                                            <span>0m</span>
                                            <span>1.5m</span>
                                            <span>3m+</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-span-2 glass-panel p-6 rounded-xl border border-white/5 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
                                    <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4 border-b border-white/10 pb-2">Live Node Readings</h3>
                                    <div className="space-y-3">
                                        {[
                                            { loc: "Mithi River Estuary", val: "2.4m", status: "Warning", color: "text-orange-400" },
                                            { loc: "Hindmata Junction", val: "0.8m", status: "Nominal", color: "text-emerald-400" },
                                            { loc: "Milan Subway", val: "1.2m", status: "Elevated", color: "text-yellow-400" },
                                            { loc: "Dharavi Sector 3", val: "3.1m", status: "Critical", color: "text-red-400" },
                                        ].map((node, i) => (
                                            <div key={i} className="flex justify-between items-center bg-slate-900/60 p-3 rounded-lg border border-white/5">
                                                <div className="flex items-center">
                                                    <Activity className={`w-4 h-4 mr-3 ${node.color}`} />
                                                    <span className="font-medium text-slate-200 text-sm">{node.loc}</span>
                                                </div>
                                                <div className="flex items-center space-x-4">
                                                    <span className={`font-mono font-bold ${node.color}`}>{node.val}</span>
                                                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${node.color.replace('text', 'bg').replace('400', '500/10')} ${node.color.replace('text', 'border').replace('400', '500/30')} ${node.color}`}>{node.status}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Resource Optimizer Modal Overlay */}
            <AnimatePresence>
                {showOptimizer && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="absolute inset-0 z-50 flex items-center justify-center p-12 bg-slate-900/60 backdrop-blur-sm"
                    >
                        <div className="glass-panel w-full max-w-5xl bg-slate-900/95 border border-white/10 rounded-2xl shadow-[0_0_80px_rgba(14,165,233,0.3)] overflow-hidden flex flex-col max-h-full">
                            <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-blue-900/40 to-slate-800/50">
                                <div>
                                    <h2 className="text-xl font-bold text-white flex items-center">
                                        <Zap className="w-5 h-5 text-blue-400 mr-2" />
                                        Linear Programming Resource Optimizer
                                    </h2>
                                    <p className="text-xs text-blue-200/60 mt-1">Autonomous allocation of {pumps} pumps and ${budget}M budget to maximize risk reduction.</p>
                                </div>
                                <button onClick={() => setShowOptimizer(false)} className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 hover:text-red-400 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-8 grid grid-cols-4 gap-6 overflow-y-auto">
                                <div className="col-span-1 space-y-4">
                                    <div className="bg-blue-500/10 border border-blue-500/30 p-5 rounded-xl">
                                        <p className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-2">Optimization Result</p>
                                        <p className="text-3xl font-light text-white tracking-tight">Success</p>
                                        <p className="text-[10px] text-blue-200/60 mt-1">Converged in 24ms</p>
                                    </div>
                                    <div className="glass-panel p-5 rounded-xl border-l-4 border-l-purple-500">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Maximized Impact</p>
                                        <p className="text-xl font-medium text-purple-400">-42% Risk</p>
                                        <p className="text-xs text-slate-500 mt-1">{Math.round((pumps * 12.4))}k lives secured</p>
                                    </div>
                                </div>

                                <div className="col-span-3 glass-panel rounded-xl border border-white/5 flex flex-col overflow-hidden">
                                    <div className="px-5 py-3 border-b border-white/10 bg-slate-800/50 flex justify-between items-center">
                                        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">Recommended Deployment Matrix</h3>
                                        <button className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded uppercase tracking-wider transition-colors shadow-[0_0_10px_rgba(37,99,235,0.4)]">Execute Deployment</button>
                                    </div>
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-white/5 text-[10px] text-slate-500 uppercase tracking-widest bg-slate-900/80">
                                                <th className="py-2 pl-4">Priority Ward</th>
                                                <th className="py-2 text-right">Pump Allocation</th>
                                                <th className="py-2 text-right">Budget Assigned</th>
                                                <th className="py-2 text-right pr-4">Expected Mitigation</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[
                                                { ward: "Ward H-East", req: "Critical", pumps: Math.round(pumps * 0.4), m: Math.round(budget * 0.45), drop: "18%" },
                                                { ward: "Ward M-West", req: "High", pumps: Math.round(pumps * 0.3), m: Math.round(budget * 0.25), drop: "12%" },
                                                { ward: "Ward G-South", req: "High", pumps: Math.round(pumps * 0.2), m: Math.round(budget * 0.20), drop: "8%" },
                                                { ward: "Ward A", req: "Moderate", pumps: Math.round(pumps * 0.1), m: Math.round(budget * 0.10), drop: "4%" }
                                            ].map((row, i) => (
                                                <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                                    <td className="py-3 pl-4 font-bold text-slate-200">
                                                        <div className="flex items-center">
                                                            <div className={`w-1.5 h-1.5 rounded-full mr-2 ${row.req === 'Critical' ? 'bg-red-500' : row.req === 'High' ? 'bg-orange-500' : 'bg-yellow-500'}`}></div>
                                                            {row.ward}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 text-right">
                                                        <span className="font-mono text-sm text-teal-400 font-bold">{row.pumps} units</span>
                                                    </td>
                                                    <td className="py-3 text-right">
                                                        <span className="font-mono text-sm text-green-400 font-bold">${row.m}M</span>
                                                    </td>
                                                    <td className="py-3 text-right pr-4">
                                                        <span className="text-sm font-bold text-purple-400">-{row.drop}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Citizens are redirected to CitizenDashboard before reaching this render path */}

            {/* Mitigation Intelligence Engine Modal */}
            <AnimatePresence>
                {showMitigation && authState && (
                    <MitigationEngine
                        rainfall={rainfall}
                        budget={budget}
                        pumps={pumps}
                        drainage={drainage}
                        floodRiskScore={floodRiskScore}
                        wards={dynamicWards}
                        role={authState.role}
                        onClose={() => setShowMitigation(false)}
                    />
                )}
            </AnimatePresence>

            {/* City Admin — Strategic Command Center */}
            {showCityAdmin && authState?.role === 'City Admin' && (
                <CityAdminPanel
                    dynamicWards={dynamicWards}
                    floodRiskScore={floodRiskScore}
                    cityReadiness={cityReadiness}
                    rainfall={rainfall}
                    budget={budget}
                    pumps={pumps}
                    drainage={drainage}
                    damageEst={damageEst}
                    affectedPop={affectedPop}
                    submergedArea={submergedArea}
                    onBudgetChange={setBudget}
                    onPumpsChange={setPumps}
                    onClose={() => setShowCityAdmin(false)}
                />
            )}

            {/* System Admin — Governance & Control Panel */}
            {showSysAdmin && authState?.role === 'System Admin' && (
                <SystemAdminPanel
                    floodRiskScore={floodRiskScore}
                    rainfall={rainfall}
                    budget={budget}
                    pumps={pumps}
                    drainage={drainage}
                    cityReadiness={cityReadiness}
                    auditLog={auditLog}
                    onClose={() => setShowSysAdmin(false)}
                />
            )}

        </main >
    );
}
