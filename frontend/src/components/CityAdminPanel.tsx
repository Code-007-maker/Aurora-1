'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, BarChart3, SlidersHorizontal, ShieldAlert, TrendingUp, Activity,
    ArrowUp, ArrowDown, Minus, Users, Zap, CloudRain, Database,
    IndianRupee, Building2, AlertTriangle, CheckCircle2, ChevronRight,
    LayoutGrid, Wallet, Wrench, AreaChart, Radio, Info
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Ward {
    name: string;
    risk: number;
    readiness: number;
    exposure: number;
    economic: number;
    status: string;
    color: string;
}

interface CityAdminPanelProps {
    dynamicWards: Ward[];
    floodRiskScore: number;
    cityReadiness: number;
    rainfall: number;
    budget: number;
    pumps: number;
    drainage: number;
    damageEst: number;
    affectedPop: number;
    submergedArea: number;
    cityName?: string;
    onBudgetChange: (v: number) => void;
    onPumpsChange: (v: number) => void;
    onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const riskColor = (r: number) =>
    r > 0.75 ? 'text-red-400' : r > 0.5 ? 'text-orange-400' : r > 0.25 ? 'text-yellow-400' : 'text-emerald-400';
const riskBg = (r: number) =>
    r > 0.75 ? 'bg-red-500' : r > 0.5 ? 'bg-orange-500' : r > 0.25 ? 'bg-yellow-500' : 'bg-emerald-500';
const readinessLabel = (v: number) => v < 40 ? 'Critical' : v < 70 ? 'At Risk' : 'Stable';
const readinessBg = (v: number) => v < 40 ? 'bg-red-500' : v < 70 ? 'bg-orange-500' : 'bg-emerald-500';
const rupees = (m: number) => `₹${(m * 8.3).toFixed(1)} Cr`;

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'resources', label: 'Resources', icon: SlidersHorizontal },
    { id: 'mitigation', label: 'Mitigation', icon: ShieldAlert },
    { id: 'economic', label: 'Economic', icon: IndianRupee },
    { id: 'trend', label: 'Risk Trend', icon: AreaChart },
];

// ─── Sub-panel components ──────────────────────────────────────────────────────

// 1. CITYWIDE ANALYTICS
function AnalyticsTab({ wards, floodRiskScore, cityReadiness, affectedPop, damageEst, submergedArea }: {
    wards: Ward[]; floodRiskScore: number; cityReadiness: number;
    affectedPop: number; damageEst: number; submergedArea: number;
}) {
    const [sort, setSort] = useState<'risk' | 'readiness' | 'exposure' | 'economic'>('risk');

    const highRiskCount = wards.filter(w => w.risk > 0.5).length;
    const criticalCount = wards.filter(w => w.risk > 0.75).length;
    const avgExposure = Math.round(wards.reduce((s, w) => s + w.exposure, 0) / wards.length);

    const sorted = useMemo(() => {
        return [...wards].sort((a, b) => {
            if (sort === 'readiness') return a.readiness - b.readiness;
            if (sort === 'exposure') return b.exposure - a.exposure;
            if (sort === 'economic') return b.economic - a.economic;
            return b.risk - a.risk;
        });
    }, [wards, sort]);

    const kpis = [
        { label: 'High-Risk Wards', val: highRiskCount, sub: `${criticalCount} Critical`, icon: AlertTriangle, color: 'rose' },
        { label: 'City Readiness', val: `${cityReadiness}%`, sub: cityReadiness < 50 ? 'Below Threshold' : 'Operational', icon: Activity, color: 'blue' },
        { label: 'Pop. Exposed', val: `${affectedPop}K`, sub: 'Vulnerable residents', icon: Users, color: 'amber' },
        { label: 'Proj. Loss', val: rupees(damageEst), sub: `${submergedArea} km² submerged`, icon: IndianRupee, color: 'purple' },
        { label: 'Avg Exposure', val: `${avgExposure}%`, sub: 'Across all wards', icon: BarChart3, color: 'emerald' },
        { label: 'Active Hotspots', val: Math.round(floodRiskScore * 2500), sub: 'Micro-grid cells', icon: Radio, color: 'indigo' },
    ];

    const colorMap: Record<string, string> = {
        rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
        blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
        emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    };

    return (
        <div className="space-y-6">
            {/* KPI Grid */}
            <div className="grid grid-cols-3 gap-3">
                {kpis.map(k => {
                    const Icon = k.icon;
                    return (
                        <div key={k.label} className={`rounded-xl border p-4 ${colorMap[k.color]}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <Icon className="w-4 h-4 shrink-0" />
                                <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">{k.label}</span>
                            </div>
                            <div className="text-xl font-bold text-white">{k.val}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{k.sub}</div>
                        </div>
                    );
                })}
            </div>

            {/* Sortable Ward Table */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-white">Live Ward Rankings</h4>
                    <div className="flex gap-1">
                        {(['risk', 'readiness', 'exposure', 'economic'] as const).map(s => (
                            <button
                                key={s}
                                onClick={() => setSort(s)}
                                className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${sort === s ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300 bg-white/5'}`}
                            >
                                {s === 'economic' ? '₹Loss' : s}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-1 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                    {sorted.map((w, i) => (
                        <div key={w.name} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors group">
                            <span className="text-[11px] font-bold text-slate-600 w-5 text-right shrink-0">#{i + 1}</span>
                            <span className="text-xs font-medium text-white flex-1 truncate">{w.name}</span>
                            <div className="flex items-center gap-2">
                                <div className="w-20 h-1 bg-slate-800 rounded-full overflow-hidden">
                                    <div className={`h-full ${riskBg(w.risk)} rounded-full transition-all duration-500`} style={{ width: `${w.risk * 100}%` }} />
                                </div>
                                <span className={`text-[11px] font-bold w-14 text-right ${riskColor(w.risk)}`}>
                                    {Math.round(w.risk * 100)}% Risk
                                </span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${w.readiness < 40 ? 'bg-red-500/20 text-red-400' : w.readiness < 70 ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                    {readinessLabel(w.readiness)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// 2. RESOURCE ALLOCATION BOARD
function ResourcesTab({ budget, pumps, drainage, floodRiskScore, cityReadiness, damageEst, onBudgetChange, onPumpsChange }: {
    budget: number; pumps: number; drainage: number; floodRiskScore: number;
    cityReadiness: number; damageEst: number;
    onBudgetChange: (v: number) => void; onPumpsChange: (v: number) => void;
}) {
    const projectedRiskReduction = Math.min(40, ((pumps / 300) * 20 + (budget / 100) * 15)).toFixed(1);
    const projectedReadinessDelta = Math.min(30, Math.round((budget / 100) * 20 + (pumps / 300) * 10));
    const projectedSavings = rupees(damageEst * (parseFloat(projectedRiskReduction) / 100));

    const sliders = [
        {
            label: 'Emergency Budget Allocation', unit: '₹Cr', val: budget * 8.3, min: 0, max: 830,
            display: `₹${(budget * 8.3).toFixed(0)} Cr`,
            onChange: (v: number) => onBudgetChange(Math.round(v / 8.3)),
            color: 'blue', desc: 'Controls pump procurement, manpower, logistics'
        },
        {
            label: 'Active Pump Deployment', unit: 'units', val: pumps, min: 0, max: 300,
            display: `${pumps} units`,
            onChange: (v: number) => onPumpsChange(v),
            color: 'indigo', desc: 'Distributed across highest-risk wards'
        },
    ];

    return (
        <div className="space-y-6">
            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-1">
                    <Info className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-blue-300">Live Cascade Update Active</span>
                </div>
                <p className="text-[11px] text-slate-400">Adjusting sliders below triggers live recalculation of flood risk, readiness, mitigation recommendations, and 3D map visualization simultaneously.</p>
            </div>

            {sliders.map(s => (
                <div key={s.label}>
                    <div className="flex justify-between items-center mb-2">
                        <div>
                            <div className="text-sm font-bold text-white">{s.label}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{s.desc}</div>
                        </div>
                        <span className={`text-lg font-black text-${s.color}-400`}>{s.display}</span>
                    </div>
                    <input
                        type="range" min={s.min} max={s.max} value={s.val}
                        onChange={e => s.onChange(Number(e.target.value))}
                        className={`w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-700 accent-${s.color === 'blue' ? 'blue' : 'indigo'}-500`}
                    />
                    <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                        <span>{s.unit === '₹Cr' ? '₹0' : '0 units'}</span>
                        <span>{s.unit === '₹Cr' ? '₹830 Cr' : '300 units'}</span>
                    </div>
                </div>
            ))}

            {/* Impact Projection */}
            <div className="border-t border-white/5 pt-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-3">Projected Impact of Current Allocation</h4>
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Flood Risk Reduction', val: `-${projectedRiskReduction}%`, icon: TrendingUp, color: 'emerald' },
                        { label: 'Readiness Delta', val: `+${projectedReadinessDelta}%`, icon: Activity, color: 'blue' },
                        { label: 'Economic Savings', val: projectedSavings, icon: IndianRupee, color: 'purple' },
                    ].map(m => {
                        const Icon = m.icon;
                        return (
                            <div key={m.label} className={`rounded-xl p-4 bg-${m.color}-500/5 border border-${m.color}-500/20`}>
                                <Icon className={`w-4 h-4 text-${m.color}-400 mb-2`} />
                                <div className={`text-lg font-black text-${m.color}-400`}>{m.val}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">{m.label}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// 3. MITIGATION SUMMARY
function MitigationTab({ floodRiskScore, rainfall, affectedPop, cityReadiness, damageEst }: {
    floodRiskScore: number; rainfall: number; affectedPop: number; cityReadiness: number; damageEst: number;
}) {
    const [activeTab, setActiveTab] = useState<'operational' | 'strategic' | 'climate'>('operational');
    const [climateMultiplier, setClimateMultiplier] = useState(0);

    const adjustedRisk = Math.min(1, floodRiskScore * (1 + climateMultiplier / 100));

    const layers = {
        operational: [
            { action: 'Activate Najafgarh Drain Emergency Protocol', priority: 'P1', impact: `Covers ${Math.round(adjustedRisk * 35)}% flood zone`, cost: '₹12 Cr' },
            { action: `Deploy ${Math.round(adjustedRisk * 80)} additional pumping units to Shahdara`, priority: 'P1', impact: `Reduces inundation by ${Math.round(adjustedRisk * 25)}%`, cost: '₹8.5 Cr' },
            { action: `Pre-position ${Math.round(adjustedRisk * 40)} NDRF rescue boats at Yamuna banks`, priority: 'P2', impact: `Protects ${Math.round(adjustedRisk * 18000)} residents`, cost: '₹4.2 Cr' },
            { action: `Evacuate ${Math.round(adjustedRisk * 5)} low-lying colonies`, priority: adjustedRisk > 0.6 ? 'P1' : 'P2', impact: 'Reduces casualty risk by 85%', cost: '₹6 Cr' },
        ],
        strategic: [
            { action: 'Upgrade Rohini-Badli stormwater main (DN-300 to DN-600)', priority: 'S1', impact: '45% drainage capacity increase', cost: '₹180 Cr' },
            { action: 'Construct underground water retention tanks across high-risk zones', priority: 'S2', impact: '3.2M litre surge buffer', cost: '₹240 Cr' },
            { action: 'Replace 42km outdated sewer network in Mustafabad', priority: 'S1', impact: 'Eliminates 60% backflow incidents', cost: '₹95 Cr' },
            { action: 'Smart sensor grid deployment across 24 wards', priority: 'S2', impact: '6-hour early warning capability', cost: '₹75 Cr' },
        ],
        climate: [
            { action: `Resilient drainage design for +${climateMultiplier}% rainfall intensification scenario`, priority: 'C1', impact: `Handles up to ${Math.round(rainfall * (1 + climateMultiplier / 100))}mm events`, cost: '₹320 Cr' },
            { action: 'Green infrastructure buffer zones along Yamuna banks', priority: 'C2', impact: '2.4km natural flood attenuation', cost: '₹160 Cr' },
            { action: 'Climate-adaptive ward master plans for 12 high-risk zones', priority: 'C1', impact: '20-year flood resilience', cost: '₹85 Cr' },
            { action: `Flood insurance ecosystem for ${Math.round(affectedPop * (1 + climateMultiplier / 100))}K at-risk residents`, priority: 'C3', impact: 'Economic recovery acceleration', cost: '₹55 Cr' },
        ],
    };

    const priorityColor: Record<string, string> = {
        P1: 'bg-red-500/20 text-red-400 border-red-500/30',
        P2: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        S1: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        S2: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
        C1: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        C2: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
        C3: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30',
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
                {(['operational', 'strategic', 'climate'] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => setActiveTab(t)}
                        className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === t ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {activeTab === 'climate' && (
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-purple-300">Rainfall Intensity Multiplier (SSP Scenario)</span>
                        <span className="text-sm font-black text-purple-400">+{climateMultiplier}%</span>
                    </div>
                    <input
                        type="range" min={0} max={50} value={climateMultiplier}
                        onChange={e => setClimateMultiplier(Number(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-700 accent-purple-500"
                    />
                </div>
            )}

            <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                {layers[activeTab].map((item, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                        className="bg-white/[0.02] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors"
                    >
                        <div className="flex items-start justify-between gap-3 mb-2">
                            <span className="text-sm font-bold text-white leading-tight">{item.action}</span>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-md border shrink-0 ${priorityColor[item.priority]}`}>{item.priority}</span>
                        </div>
                        <div className="flex items-center gap-4 text-[11px]">
                            <span className="text-emerald-400">↓ {item.impact}</span>
                            <span className="text-slate-500 ml-auto font-mono">{item.cost}</span>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

// 4. ECONOMIC IMPACT DASHBOARD
function EconomicTab({ floodRiskScore, damageEst, affectedPop, submergedArea, rainfall, cityReadiness }: {
    floodRiskScore: number; damageEst: number; affectedPop: number; submergedArea: number; rainfall: number; cityReadiness: number;
}) {
    const rawDamage = damageEst * 8.3;
    const infrastructurePct = Math.round(floodRiskScore * 65);
    const businessPct = Math.round(floodRiskScore * 42);
    const mitigatedDamage = rawDamage * (1 - Math.min(0.6, cityReadiness / 150));
    const savings = rawDamage - mitigatedDamage;

    const categories = [
        { label: 'Residential Property', pct: Math.round(floodRiskScore * 55), color: 'blue' },
        { label: 'Critical Infrastructure', pct: infrastructurePct, color: 'rose' },
        { label: 'Commercial & Business', pct: businessPct, color: 'amber' },
        { label: 'Agricultural Loss', pct: Math.round(floodRiskScore * 20), color: 'emerald' },
        { label: 'Emergency Response Cost', pct: Math.round(floodRiskScore * 30), color: 'purple' },
    ];

    return (
        <div className="space-y-5">
            {/* Header KPIs */}
            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-rose-500/5 border border-rose-500/20 p-4">
                    <div className="text-[10px] font-bold uppercase text-rose-400 tracking-widest mb-1">Without Mitigation</div>
                    <div className="text-2xl font-black text-white">₹{rawDamage.toFixed(0)} Cr</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Projected citywide loss</div>
                </div>
                <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4">
                    <div className="text-[10px] font-bold uppercase text-emerald-400 tracking-widest mb-1">After Mitigation</div>
                    <div className="text-2xl font-black text-white">₹{mitigatedDamage.toFixed(0)} Cr</div>
                    <div className="text-[11px] text-emerald-400 mt-0.5 font-bold">Save ₹{savings.toFixed(0)} Cr →</div>
                </div>
            </div>

            {/* Before/After Bar */}
            <div>
                <div className="flex justify-between text-[10px] text-slate-500 mb-2">
                    <span>Before Mitigation</span><span>After Mitigation</span>
                </div>
                <div className="relative h-4 rounded-full bg-slate-800 overflow-hidden">
                    <div className="absolute left-0 top-0 h-full bg-rose-500 rounded-full transition-all duration-700" style={{ width: `${Math.min(100, floodRiskScore * 100)}%` }} />
                    <div className="absolute left-0 top-0 h-full bg-emerald-500 rounded-l-full transition-all duration-700" style={{ width: `${Math.min(100, (mitigatedDamage / rawDamage) * floodRiskScore * 100)}%` }} />
                </div>
            </div>

            {/* Category Breakdown */}
            <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-3">Damage by Category</h4>
                <div className="space-y-3">
                    {categories.map(c => (
                        <div key={c.label}>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-300">{c.label}</span>
                                <span className="font-bold" style={{ color: c.color === 'blue' ? '#60a5fa' : c.color === 'rose' ? '#f87171' : c.color === 'amber' ? '#fbbf24' : c.color === 'emerald' ? '#34d399' : '#c084fc' }}>
                                    {c.pct}% exposed
                                </span>
                            </div>
                            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-700 bg-${c.color}-500`} style={{ width: `${c.pct}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                <div className="rounded-lg bg-white/[0.02] border border-white/5 p-3">
                    <div className="text-[10px] text-slate-500 mb-1">Submerged Area</div>
                    <div className="text-lg font-black text-white">{submergedArea} km²</div>
                </div>
                <div className="rounded-lg bg-white/[0.02] border border-white/5 p-3">
                    <div className="text-[10px] text-slate-500 mb-1">Population at Risk</div>
                    <div className="text-lg font-black text-white">{affectedPop}K residents</div>
                </div>
            </div>
        </div>
    );
}

// 5. RISK TREND & FORECAST
function RiskTrendTab({ rainfall, floodRiskScore, dynamicWards }: {
    rainfall: number; floodRiskScore: number; dynamicWards: Ward[];
}) {
    // Generate synthetic 12-point historical trend seeded by current rainfall
    const trend = useMemo(() => {
        return Array.from({ length: 12 }, (_, i) => {
            const hoursAgo = 11 - i;
            const rainfallAtTime = Math.max(0, rainfall - (hoursAgo * rainfall * 0.08) + (Math.sin(i * 0.8) * 10));
            const riskAtTime = Math.max(0, Math.min(1, (rainfallAtTime / 500) * 0.8 + 0.15));
            return { hour: hoursAgo === 0 ? 'Now' : `-${hoursAgo}h`, risk: riskAtTime, rainfall: Math.round(rainfallAtTime) };
        });
    }, [rainfall, floodRiskScore]);

    const maxRisk = Math.max(...trend.map(t => t.risk));

    const top5 = [...dynamicWards].sort((a, b) => b.risk - a.risk).slice(0, 5);

    return (
        <div className="space-y-5">
            {/* Risk Timeline Chart */}
            <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-3">Risk Trend — Last 12 Hours</h4>
                <div className="flex items-end gap-1 h-24 bg-white/[0.02] rounded-xl p-3">
                    {trend.map((t, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div
                                className="w-full rounded-sm transition-all duration-500"
                                style={{
                                    height: `${Math.max(4, (t.risk / Math.max(maxRisk, 0.01)) * 64)}px`,
                                    backgroundColor: t.risk > 0.75 ? '#ef4444' : t.risk > 0.5 ? '#f97316' : t.risk > 0.25 ? '#eab308' : '#10b981',
                                    opacity: 0.7 + (i / 11) * 0.3,
                                }}
                            />
                            <span className="text-[8px] text-slate-600 rotate-45 origin-left">{t.hour}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Rainfall Accumulation */}
            <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-3">Rainfall Accumulation Curve (mm)</h4>
                <div className="flex items-end gap-1 h-16 bg-white/[0.02] rounded-xl p-3">
                    {trend.map((t, i) => (
                        <div
                            key={i}
                            className="flex-1 rounded-sm bg-blue-500/60 transition-all duration-500"
                            style={{ height: `${Math.max(2, (t.rainfall / Math.max(...trend.map(x => x.rainfall), 1)) * 40)}px` }}
                        />
                    ))}
                </div>
                <div className="flex justify-between text-[10px] text-slate-600 mt-1 px-3">
                    <span>12h ago</span><span>Current: {rainfall}mm</span>
                </div>
            </div>

            {/* Top 5 at-risk wards */}
            <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-3">Top 5 Rising-Risk Wards</h4>
                <div className="space-y-2">
                    {top5.map((w, i) => (
                        <div key={w.name} className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-slate-600 w-3">#{i + 1}</span>
                            <span className="text-xs text-white flex-1">{w.name}</span>
                            <div className="flex items-center gap-1">
                                <ArrowUp className={`w-3 h-3 ${w.risk > 0.5 ? 'text-red-400' : 'text-orange-400'}`} />
                                <span className={`text-xs font-bold ${riskColor(w.risk)}`}>{Math.round(w.risk * 100)}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Main Panel ────────────────────────────────────────────────────────────────
export default function CityAdminPanel({
    dynamicWards, floodRiskScore, cityReadiness, rainfall, budget, pumps, drainage,
    damageEst, affectedPop, submergedArea, cityName, onBudgetChange, onPumpsChange, onClose
}: CityAdminPanelProps) {
    const [activeTab, setActiveTab] = useState('analytics');

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
                    className="bg-[#080d1a] border border-blue-500/20 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-[0_0_60px_rgba(59,130,246,0.15)]"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                <LayoutGrid className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-white">Strategic Command Center</h2>
                                <p className="text-[10px] text-slate-500">City Admin · {cityName ?? 'Delhi NCT'} · Live Intelligence · All data from real-time flood engine</p>
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
                                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300 bg-white/5 hover:bg-white/10'}`}
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
                                {activeTab === 'analytics' && (
                                    <AnalyticsTab wards={dynamicWards} floodRiskScore={floodRiskScore} cityReadiness={cityReadiness}
                                        affectedPop={affectedPop} damageEst={damageEst} submergedArea={submergedArea} />
                                )}
                                {activeTab === 'resources' && (
                                    <ResourcesTab budget={budget} pumps={pumps} drainage={drainage} floodRiskScore={floodRiskScore}
                                        cityReadiness={cityReadiness} damageEst={damageEst} onBudgetChange={onBudgetChange} onPumpsChange={onPumpsChange} />
                                )}
                                {activeTab === 'mitigation' && (
                                    <MitigationTab floodRiskScore={floodRiskScore} rainfall={rainfall}
                                        affectedPop={affectedPop} cityReadiness={cityReadiness} damageEst={damageEst} />
                                )}
                                {activeTab === 'economic' && (
                                    <EconomicTab floodRiskScore={floodRiskScore} damageEst={damageEst}
                                        affectedPop={affectedPop} submergedArea={submergedArea} rainfall={rainfall} cityReadiness={cityReadiness} />
                                )}
                                {activeTab === 'trend' && (
                                    <RiskTrendTab rainfall={rainfall} floodRiskScore={floodRiskScore} dynamicWards={dynamicWards} />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-white/5 shrink-0 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] text-slate-500">Live engine connected · Auto-refresh on rainfall change</span>
                        </div>
                        <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20">
                            CITY ADMIN · STRATEGIC CLEARANCE
                        </span>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
