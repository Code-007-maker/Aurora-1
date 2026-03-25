'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useUser, SignOutButton, SignInButton } from '@clerk/nextjs';
import Link from 'next/link';
import { ReactCompareSlider } from 'react-compare-slider';
import { 
    Layers, CloudRain, ShieldAlert, Activity, Users, MapPin, Database, 
    ChevronLeft, Droplets, Zap, ChevronRight, SlidersHorizontal, Radar, 
    ListOrdered, X, LayoutGrid, Lock, XCircle 
} from 'lucide-react';

// Dynamic Components
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

export default function DashboardPage() {
    const { user, isLoaded, isSignedIn } = useUser();
    
    // Extracted Role & Ward from Clerk Metadata
    const role = (user?.publicMetadata?.role as string) || 'Citizen';
    const ward_id = (user?.publicMetadata?.ward_id as string) || null;

    // Compatible auth state for existing components
    const authState = user ? { role, ward_id } : null;
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // UI & Simulation States
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

    // GIS & Custom City States
    const [customBbox, setCustomBbox] = useState<number[] | null>(null);
    const [customGeoJSON, setCustomGeoJSON] = useState<any>(null);
    const [customZoneMetrics, setCustomZoneMetrics] = useState<any[]>([]);
    const [selectedZoneName, setSelectedZoneName] = useState<string | null>(null);
    const [customCellCount, setCustomCellCount] = useState<number | null>(null);
    const [customAreaKm2, setCustomAreaKm2] = useState<number | null>(null);

    const handleCitySwitch = ({ bbox, geojson, zone_metrics, cell_count, area_km2 }: {
        bbox: number[]; geojson: any; zone_metrics?: any[];
        cell_count?: number; area_km2?: number;
    }) => {
        setCustomBbox(bbox);
        setCustomGeoJSON(geojson);
        setCustomZoneMetrics(zone_metrics ?? []);
        setCustomCellCount(cell_count ?? null);
        setCustomAreaKm2(area_km2 ?? null);
    };

    // ── Auto-load Delhi on first mount ────────────────────────────────────────
    const [defaultLoading, setDefaultLoading] = useState(true);
    useEffect(() => {
        const loadDefault = async () => {
            try {
                const res = await fetch('http://localhost:8000/api/grid/default');
                if (!res.ok) {
                    console.warn('Default city load failed:', await res.text());
                    return;
                }
                const data = await res.json();
                if (data.status === 'success') {
                    setCustomBbox(data.bbox);
                    setCustomGeoJSON(data.geojson_features);
                    setCustomZoneMetrics(data.zone_metrics ?? []);
                    setCustomCellCount(data.cell_count ?? null);
                    setCustomAreaKm2(data.area_km2 ?? null);
                }
            } catch (err) {
                console.warn('Could not reach backend for default city:', err);
            } finally {
                setDefaultLoading(false);
            }
        };
        loadDefault();
    }, []);

    // Audit log — captures real user interactions for System Admin
    const [auditLog, setAuditLog] = useState<any[]>([]);

    // Live Engine States
    const [rainfall, setRainfall] = useState(0); // 0-500mm
    const [budget, setBudget] = useState(10); // $M
    const [pumps, setPumps] = useState(142); // Active pumps
    const [drainage, setDrainage] = useState(45); // % efficiency

    // Audit log tracker
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
                    role: role,
                    action: `${f.label} adjusted from ${prev[f.key]} to ${current[f.key]}`,
                    ward: 'Citywide',
                    field: f.label,
                    before: prev[f.key],
                    after: current[f.key],
                }]);
                (prev as any)[f.key] = current[f.key];
            }
        });
    }, [rainfall, budget, pumps, drainage, role]);

    // Live Recomputation Engine Logic
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

    // City Readiness
    const cityReadiness = Math.round((drainage * 0.6) + (budget * 0.4));
    
    const getReadinessColor = (val: number) => {
        if (val < 40) return { bg: 'bg-red-500', text: 'text-red-400', shadow: 'shadow-[0_0_10px_rgba(239,68,68,0.5)]', label: 'Crit' };
        if (val < 70) return { bg: 'bg-orange-500', text: 'text-orange-400', shadow: 'shadow-[0_0_10px_rgba(249,115,22,0.5)]', label: 'High' };
        return { bg: 'bg-emerald-500', text: 'text-emerald-400', shadow: 'shadow-[0_0_10px_rgba(16,185,129,0.5)]', label: 'Safe' };
    };

    // ── Dynamic Zone/Ward Generation ─────────────────────────────────────────────
    const DELHI_WARD_NAMES = ['Civil Lines', 'Model Town', 'Chandni Chowk', 'Darya Ganj', 'Karol Bagh', 'Patel Nagar', 'Old Delhi', 'Connaught Place', 'Lutyens', 'Shahdara', 'Vivek Vihar', 'Seemapuri', 'Mustafabad', 'Rohini', 'Bawana', 'Narela', 'Dwarka', 'Najafgarh', 'Saket', 'Okhla', 'Jasola', 'Madanpur Khadar', 'Patparganj', 'Kondli'];

    const getCustomZoneNames = (geojson: any): string[] => {
        if (!geojson?.features?.length) return [];
        return geojson.features.map((feature: any, idx: number) => {
            const props: Record<string, any> = feature.properties ?? {};
            const rawKeys = Object.keys(props);
            const kLower = Object.fromEntries(rawKeys.map(k => [k.toLowerCase(), k]));

            let txtName: string | null = null;
            let numId: string | null = null;

            const nameCandidates = ['ward_name', 'name', 'ac_name', 'pc_name', 'locality', 'district', 'zone_name'];
            for (const cKey of nameCandidates) {
                if (cKey in kLower) {
                    const v = String(props[kLower[cKey]]).trim();
                    if (!['0', '', 'none', 'nan', 'null'].includes(v.toLowerCase()) && /[a-zA-Z]/.test(v)) {
                        txtName = v;
                        break;
                    }
                }
            }

            const idCandidates = ['ward_no', 'ward', 'zone_no', 'id', 'ac_no'];
            for (const cKey of idCandidates) {
                if (cKey in kLower) {
                    const v = String(props[kLower[cKey]]).trim();
                    if (!['0', '', 'none', 'nan', 'null'].includes(v.toLowerCase())) {
                        numId = v;
                        break;
                    }
                }
            }

            const titleCase = (str: string) => str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

            if (txtName && numId) {
                if (txtName.toLowerCase().includes('zone') || nameCandidates.find(c => c === 'zone_name' && c in kLower)) {
                    return `${titleCase(txtName)} - Ward ${numId}`;
                }
                return titleCase(txtName);
            } else if (txtName) {
                return titleCase(txtName);
            } else if (numId) {
                return `Ward ${numId}`;
            }

            for (const val of Object.values(props)) {
                const v = String(val).trim();
                if (!['0', '', 'none', 'nan', 'null'].includes(v.toLowerCase()) && /[a-zA-Z]/.test(v)) {
                    return titleCase(v);
                }
            }

            return `Zone ${idx + 1}`;
        });
    };

    const activeZoneNames: string[] = customGeoJSON ? getCustomZoneNames(customGeoJSON) : DELHI_WARD_NAMES;
    const topRiskZones = activeZoneNames.slice(0, 3);
    
    const rohiniC = getReadinessColor(Math.max(0, cityReadiness - 25));
    const shahdaraC = getReadinessColor(Math.max(0, cityReadiness - 10));
    const okhlaC = getReadinessColor(Math.min(100, cityReadiness + 15));

    const hasRealMetrics = customGeoJSON && customZoneMetrics.length > 0;

    let dynamicWards = activeZoneNames.map((name: string, i: number) => {
        let wardRisk: number;
        let exposure: number;
        let economic: number;
        let drainageScore: number | undefined;
        let emergencyScore: number | undefined;
        let infraScore: number | undefined;

        if (hasRealMetrics && customZoneMetrics[i]) {
            const m = customZoneMetrics[i];
            const liveBoost = (rainfall / 500) * 0.2 + ((100 - drainage) / 100) * 0.1;
            wardRisk = Math.max(0, Math.min(1, m.composite_flood_risk + liveBoost));
            exposure = m.exposure_pct ?? Math.round(wardRisk * 80);
            economic = m.economic_M ?? Math.round(wardRisk * 15);
            drainageScore = Math.max(10, Math.min(95, m.drainage_score - Math.round((100 - drainage) * 0.3)));
            emergencyScore = Math.max(10, Math.min(95, m.emergency_score));
            infraScore = Math.max(10, Math.min(95, m.infra_score));
        } else {
            const baseVuln = (i % 5) * 0.15;
            wardRisk = Math.max(0, Math.min(1, baseRisk + baseVuln - 0.2));
            exposure = Math.round(wardRisk * 80);
            economic = Math.round(wardRisk * 15);
        }

        const wardReadiness = Math.round(100 - (wardRisk * 100));
        let status = 'Ready';
        let color = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
        if (wardRisk > 0.75) { status = 'Critical'; color = 'text-red-400 bg-red-500/10 border-red-500/30'; }
        else if (wardRisk > 0.55) { status = 'High Risk'; color = 'text-orange-400 bg-orange-500/10 border-orange-500/30'; }
        else if (wardRisk > 0.30) { status = 'Moderate'; color = 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'; }

        return {
            name: customGeoJSON ? name : `Ward ${name}`,
            risk: wardRisk, readiness: wardReadiness,
            exposure, economic, status, color,
            area_km2: hasRealMetrics && customZoneMetrics[i] ? customZoneMetrics[i].area_km2 : undefined,
            elevation_m: hasRealMetrics && customZoneMetrics[i] ? customZoneMetrics[i].elevation_m : undefined,
            compactness: hasRealMetrics && customZoneMetrics[i] ? customZoneMetrics[i].compactness : undefined,
            drainage_score: drainageScore,
            emergency_score: emergencyScore,
            infra_score: infraScore,
        };
    });

    dynamicWards.sort((a: any, b: any) => {
        if (sortRule === 'readiness') return a.readiness - b.readiness;
        if (sortRule === 'exposure') return b.exposure - a.exposure;
        if (sortRule === 'economic') return b.economic - a.economic;
        return b.risk - a.risk;
    });

    const totalMicroGrids = customGeoJSON && customCellCount !== null
        ? customCellCount
        : dynamicWards.reduce((acc: number, ward: any) => acc + Math.round(2412 * (1 + ward.risk * 0.2)), 0);

    const totalIdentifiedHotspots = customGeoJSON && customAreaKm2 !== null
        ? Math.round(customAreaKm2 * floodRiskScore * 2.4)
        : dynamicWards.reduce((acc: number, ward: any) => acc + Math.round(ward.risk * 150), 0);

    const updateRole = async (newRole: string, newWard: string | null = null) => {
        setIsLoggingIn(true);
        try {
            const res = await fetch('/api/clerk/set-role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole, ward_id: newWard }),
            });
            if (res.ok) {
                window.location.reload();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoggingIn(false);
        }
    };

    if (!isLoaded) return (
        <div className="h-screen w-screen bg-[#020617] text-slate-100 flex flex-col items-center justify-center font-mono space-y-4">
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-sm tracking-widest text-blue-400 animate-pulse uppercase">Initializing Security Layers...</p>
        </div>
    );

    // Role-based logic
    if (!isSignedIn || !role || !authState) {
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
                            { role: "City Admin", desc: `${customGeoJSON ? 'City' : 'Delhi'} Wide Optimization`, icon: Activity, color: "orange", access: null },
                            { role: "System Admin", desc: "Full Threshold Control", icon: Database, color: "red", access: null },
                        ].map((r, i) => {
                            const Icon = r.icon;
                            return (
                                <SignInButton 
                                    key={i} 
                                    mode="modal" 
                                    fallbackRedirectUrl={`/dashboard?intended_role=${encodeURIComponent(r.role)}`}
                                >
                                    <button
                                        className={`w-full group relative overflow-hidden flex items-center p-4 rounded-xl border border-${r.color}-500/30 bg-slate-800/50 hover:bg-${r.color}-500/10 transition-all text-left duration-300`}
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
                                </SignInButton>
                            );
                        })}
                    </div>
                </motion.div>

                {isLoggingIn && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-md">
                        <div className="w-12 h-12 relative border-t-2 border-r-2 border-blue-500 rounded-full animate-spin mb-6"></div>
                        <p className="text-sm font-bold tracking-[0.2em] text-blue-400 uppercase animate-pulse">Assigning Role Metadata to Clerk Profile...</p>
                    </div>
                )}
            </main>
        );
    }

    if (role === 'Citizen') {
        return <CitizenDashboard onLogout={() => {}} cityName={customGeoJSON ? 'Custom City' : 'Delhi NCT'} customZones={customGeoJSON ? activeZoneNames : undefined} customZoneMetrics={customGeoJSON ? customZoneMetrics : undefined} />;
    }

    if (role === 'Ward Officer') {
        return <WardOfficerDashboard onLogout={() => {}} customZones={customGeoJSON ? activeZoneNames : undefined} customZoneMetrics={customGeoJSON ? customZoneMetrics : undefined} />;
    }

    return (
        <main className="relative w-full h-screen overflow-hidden bg-[#020617] text-slate-100 font-sans selection:bg-blue-500/30">
            {/* Background Interactive Map */}
            <div className="absolute inset-0 z-0 bg-[#020617]">
                {comparisonMode ? (
                    <ReactCompareSlider
                        className="w-full h-full"
                        itemOne={<FloodMap rainfall={0} radarVisible={radarVisible} vulnerablePopVisible={vulnerablePopVisible} comparisonMode={true} highlightedWard={selectedWard} customBbox={customBbox} customGeoJSON={customGeoJSON} highlightedZoneName={selectedZoneName} customZoneMetrics={customZoneMetrics} />}
                        itemTwo={<FloodMap rainfall={rainfall === 0 ? 100 : rainfall} radarVisible={radarVisible} vulnerablePopVisible={vulnerablePopVisible} comparisonMode={false} highlightedWard={selectedWard} customBbox={customBbox} customGeoJSON={customGeoJSON} highlightedZoneName={selectedZoneName} customZoneMetrics={customZoneMetrics} />}
                    />
                ) : (
                    <FloodMap rainfall={rainfall} radarVisible={radarVisible} vulnerablePopVisible={vulnerablePopVisible} comparisonMode={false} highlightedWard={selectedWard} customBbox={customBbox} customGeoJSON={customGeoJSON} highlightedZoneName={selectedZoneName} customZoneMetrics={customZoneMetrics} />
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

                    {role === 'City Admin' && (
                        <button
                            onClick={() => setShowCityAdmin(true)}
                            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center space-x-2 shadow-lg ${showCityAdmin ? 'bg-blue-600 text-white shadow-blue-500/30' : 'bg-gradient-to-r from-blue-600/80 to-indigo-600/80 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20'}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                            <span>Strategic Command</span>
                        </button>
                    )}

                    {role === 'System Admin' && (
                        <button
                            onClick={() => setShowSysAdmin(true)}
                            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center space-x-2 shadow-lg ${showSysAdmin ? 'bg-rose-600 text-white shadow-rose-500/30' : 'bg-gradient-to-r from-rose-600/80 to-red-600/80 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-500/20'}`}
                        >
                            <Lock className="w-4 h-4" />
                            <span>Governance Control</span>
                        </button>
                    )}

                    {(role === 'Ward Officer' || role === 'City Admin' || role === 'System Admin') && (
                        <button
                            onClick={() => setShowMitigation(true)}
                            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center space-x-2 shadow-lg ${showMitigation ? 'bg-orange-600 text-white shadow-orange-500/30' : 'bg-gradient-to-r from-orange-600/80 to-red-600/80 hover:from-orange-500 hover:to-red-500 text-white shadow-orange-500/20'}`}
                        >
                            <ShieldAlert className="w-4 h-4" />
                            <span>Mitigation Engine</span>
                        </button>
                    )}

                    <div className="w-px h-6 bg-white/10 mx-1"></div>

                    <div className="flex items-center space-x-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <ShieldAlert className="w-4 h-4 text-blue-400" />
                        <span className="text-xs font-bold text-blue-300 tracking-wider">
                            {role.toUpperCase()}
                            {ward_id ? ` : ${ward_id.toUpperCase()}` : ''}
                        </span>
                    </div>

                    <SignOutButton>
                        <button className="p-2 text-slate-400 hover:text-red-400 transition-colors bg-white/5 hover:bg-red-500/10 rounded-lg ml-2" title="End Secure Session">
                            <X className="w-4 h-4" />
                        </button>
                    </SignOutButton>
                </div>
            </header>

            {/* Sidebar UI */}
            <AnimatePresence>
                {panelExpanded && (
                    <>
                        {/* Left Metrics Sidebar */}
                        <motion.aside
                            initial={{ x: -100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -100, opacity: 0 }}
                            className="absolute left-6 top-28 bottom-6 w-[340px] flex flex-col space-y-6 z-10 overflow-y-auto pr-2 pb-6 custom-scrollbar"
                        >
                            <DashboardPanel title={`${customGeoJSON ? 'City' : 'Delhi'} Intelligence Grid`} icon={<Activity className="w-5 h-5 text-blue-400" />}>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="glass-panel p-4 rounded-xl col-span-2">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Micro-Grids</p>
                                                <p className="text-2xl font-light text-white">{totalMicroGrids.toLocaleString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[11px] font-bold text-red-400 uppercase tracking-wider mb-1">Identified Hotspots</p>
                                                <p className="text-2xl font-bold text-red-500">{totalIdentifiedHotspots.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="glass-panel p-4 rounded-xl">
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Threat Level</p>
                                        <div className={`inline-flex items-center px-2 py-1 ${threatLevel.bg} ${threatLevel.border} border rounded text-xs font-bold ${threatLevel.color} uppercase tracking-widest`}>
                                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse bg-current`}></span>
                                            {threatLevel.label}
                                        </div>
                                    </div>
                                    <div onClick={() => setShowTelemetry(true)} className="col-span-2 glass-panel p-4 rounded-xl flex items-center justify-between border-l-4 border-l-emerald-500 cursor-pointer">
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
                            
                            <DashboardPanel title="Pre-Monsoon Readiness" icon={<ShieldAlert className="w-5 h-5 text-indigo-400" />}>
                                <div className="space-y-5">
                                    <div className="flex justify-between items-end border-b border-slate-700/50 pb-4">
                                        <div><span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">City Average</span></div>
                                        <div className="text-4xl font-light text-emerald-400">{cityReadiness}%</div>
                                    </div>
                                    <div className="space-y-4">
                                        {[
                                            { name: topRiskZones[0] ?? 'Zone 1', val: Math.max(0, cityReadiness - 25) },
                                            { name: topRiskZones[1] ?? 'Zone 2', val: Math.max(0, cityReadiness - 10) },
                                            { name: topRiskZones[2] ?? 'Zone 3', val: Math.min(100, cityReadiness + 15) }
                                        ].map(z => {
                                            const c = getReadinessColor(z.val);
                                            return (
                                                <div key={z.name} className="relative">
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="font-medium text-white">{z.name}</span>
                                                        <span className={`${c.text} font-bold`}>{z.val}% <span className="text-xs font-normal text-slate-500">{c.label}</span></span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                                        <div className={`h-full ${c.bg} rounded-full transition-all duration-500`} style={{ width: `${z.val}%` }}></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </DashboardPanel>
                        </motion.aside>

                        {/* Right Simulation Sidebar */}
                        <motion.aside
                            initial={{ x: 100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 100, opacity: 0 }}
                            className="absolute right-6 top-28 bottom-6 w-[340px] flex flex-col space-y-6 z-10 overflow-y-auto pl-2 pb-6 custom-scrollbar"
                        >
                            <DashboardPanel title="Simulation Engine" icon={<CloudRain className="w-5 h-5 text-blue-400" />}>
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    <button onClick={() => setRadarVisible(!radarVisible)} className={`py-2 text-xs font-bold rounded-lg border transition-all ${radarVisible ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800/80 border-slate-700 text-slate-400'}`}>
                                        <Radar className="w-3 h-3 inline mr-1" /> Radar
                                    </button>
                                    <button onClick={() => setVulnerablePopVisible(!vulnerablePopVisible)} className={`py-2 text-[10px] font-bold rounded-lg border transition-all ${vulnerablePopVisible ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-800/80 border-slate-700 text-slate-400'}`}>
                                        <Users className="w-3 h-3 inline mr-1" /> Vulnerable
                                    </button>
                                    <button onClick={() => setComparisonMode(!comparisonMode)} className={`col-span-2 py-2 text-xs font-bold rounded-lg border transition-all ${comparisonMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-slate-800/80 border-slate-700 text-slate-400'}`}>
                                        <SlidersHorizontal className="w-3.5 h-3.5 inline mr-1" /> Split Compare
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between text-xs mb-1 font-semibold text-slate-300">
                                        <span>Rainfall: {rainfall}mm</span>
                                    </div>
                                    <input type="range" min="0" max="500" value={rainfall} onChange={(e) => setRainfall(Number(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 mb-1">Drainage: {drainage}%</p>
                                            <input type="range" min="0" max="100" value={drainage} onChange={(e) => setDrainage(Number(e.target.value))} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 mb-1">Pumps: {pumps}</p>
                                            <input type="range" min="0" max="300" value={pumps} onChange={(e) => setPumps(Number(e.target.value))} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                                        </div>
                                    </div>
                                </div>
                            </DashboardPanel>
                            
                            <DashboardPanel title="Live Impact Estimator" icon={<Activity className="w-5 h-5 text-orange-400" />}>
                                <div className="space-y-4">
                                    <div className="flex justify-between"><span className="text-xs text-slate-400">Pop. Affected</span><span className="text-xl text-purple-400 font-bold">{affectedPop}k</span></div>
                                    <div className="flex justify-between"><span className="text-xs text-slate-400">Submerged</span><span className="text-xl text-red-400 font-bold">{submergedArea}km²</span></div>
                                    <div className="flex justify-between"><span className="text-xs text-slate-400">Damage Est.</span><span className="text-xl text-orange-400 font-bold">${damageEst}M</span></div>
                                </div>
                                <button onClick={() => setShowOptimizer(true)} className="mt-6 w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-sm font-bold shadow-lg">Run Optimizer</button>
                            </DashboardPanel>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            <button onClick={() => setPanelExpanded(!panelExpanded)} className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-slate-800/80 backdrop-blur-md rounded-full border border-white/10 text-xs font-semibold text-slate-300">
                {panelExpanded ? 'Hide Analytics' : 'Show Analytics'}
            </button>

            {/* Modals */}
            <AnimatePresence>
                {showWardRankings && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-x-16 inset-y-24 z-50 glass-panel bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl flex flex-col">
                        <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center">
                            <h2 className="text-xl font-bold flex items-center text-white"><ListOrdered className="mr-2" /> Ward Rankings</h2>
                            <button onClick={() => { setShowWardRankings(false); setSelectedWard(null); }} className="p-2"><X /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            <table className="w-full text-left">
                                <thead className="text-xs text-slate-500 uppercase">
                                    <tr><th className="pb-3">Ward</th><th className="pb-3 text-right">Risk</th><th className="pb-3 text-right">Readiness</th></tr>
                                </thead>
                                <tbody>
                                    {dynamicWards.map((w, i) => (
                                        <tr key={i} onClick={() => { setSelectedWard(w); setSelectedZoneName(w.name); }} className={`border-b border-white/5 hover:bg-white/10 cursor-pointer ${selectedZoneName === w.name ? 'bg-blue-500/10' : ''}`}>
                                            <td className="py-4 font-bold">{w.name}</td>
                                            <td className="py-4 text-right text-red-400">{w.risk.toFixed(3)}</td>
                                            <td className="py-4 text-right text-emerald-400">{w.readiness}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}

                {selectedWard && (
                    <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="absolute right-8 top-1/2 -translate-y-1/2 w-[340px] z-[60] glass-panel bg-slate-900/95 border border-white/10 rounded-2xl p-5 shadow-2xl">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-bold">{selectedWard.name}</h3>
                            <button onClick={() => { setSelectedWard(null); setSelectedZoneName(null); }}><X /></button>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between"><span>Risk Score</span><span className="text-red-400 font-bold">{selectedWard.risk.toFixed(3)}</span></div>
                            <div className="flex justify-between"><span>Exposure</span><span className="text-purple-400 font-bold">{selectedWard.exposure}%</span></div>
                            <div className="flex justify-between"><span>Economic Loss</span><span className="text-orange-400 font-bold">${selectedWard.economic}M</span></div>
                            {selectedWard.elevation_m && <div className="flex justify-between"><span>Elevation</span><span className="text-blue-400 font-bold">{selectedWard.elevation_m.toFixed(1)}m</span></div>}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {showTelemetry && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-12">
                    <div className="glass-panel w-full max-w-4xl bg-slate-900/95 rounded-2xl p-6">
                        <div className="flex justify-between mb-6">
                            <h2 className="text-xl font-bold flex items-center"><Database className="mr-2" /> IoT Telemetry</h2>
                            <button onClick={() => setShowTelemetry(false)}><X /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="bg-emerald-500/10 p-6 rounded-xl text-center">
                                <p className="text-xs uppercase text-emerald-400 font-bold">Network Health</p>
                                <p className="text-4xl font-light">98.4%</p>
                            </div>
                            <div className="overflow-y-auto max-h-64 space-y-2">
                                {dynamicWards.slice(0, 5).map((w, i) => (
                                    <div key={i} className="flex justify-between p-3 bg-white/5 rounded-lg">
                                        <span>{w.name}</span>
                                        <span className="text-blue-400 font-mono">{(w.risk * 3.5).toFixed(1)}m</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showMitigation && (
                <MitigationEngine rainfall={rainfall} budget={budget} pumps={pumps} drainage={drainage} floodRiskScore={floodRiskScore} wards={dynamicWards} role={role} onClose={() => setShowMitigation(false)} />
            )}

            {showCityAdmin && role === 'City Admin' && (
                <CityAdminPanel dynamicWards={dynamicWards} floodRiskScore={floodRiskScore} cityReadiness={cityReadiness} rainfall={rainfall} budget={budget} pumps={pumps} drainage={drainage} damageEst={damageEst} affectedPop={affectedPop} submergedArea={submergedArea} cityName={customGeoJSON ? 'Custom City' : 'Delhi NCT'} onBudgetChange={setBudget} onPumpsChange={setPumps} onClose={() => setShowCityAdmin(false)} />
            )}

            {showSysAdmin && role === 'System Admin' && (
                <SystemAdminPanel floodRiskScore={floodRiskScore} rainfall={rainfall} budget={budget} pumps={pumps} drainage={drainage} cityReadiness={cityReadiness} auditLog={auditLog} onCitySwitch={handleCitySwitch} onClose={() => setShowSysAdmin(false)} />
            )}
        </main>
    );
}
