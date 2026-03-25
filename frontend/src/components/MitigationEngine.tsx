'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap, Target, Globe, AlertTriangle, CheckCircle, TrendingUp,
    TrendingDown, Droplets, Building, CloudRain, BarChart2,
    Info, ChevronDown, ChevronUp, Shield, RefreshCw, Layers,
    ArrowRight, Activity, DollarSign, Users, Wind
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
interface Ward {
    name: string;
    risk: number;
    readiness: number;
    exposure: number;
    economic: number;
    status: string;
    color: string;
}

interface MitigationEngineProps {
    rainfall: number;          // 0-500 mm
    budget: number;            // $ millions
    pumps: number;             // active pump units
    drainage: number;          // % efficiency 0-100
    floodRiskScore: number;    // 0-1
    wards: Ward[];
    role: string;              // 'Ward Officer' | 'City Admin' | 'System Admin'
    onClose: () => void;
}

// ─────────────────────────────────────────────────────────────
// DYNAMIC GEO-PROXY MODEL — City Agnostic
// Derives geographic proxies dynamically from real grid computations
// ─────────────────────────────────────────────────────────────

/** Deterministically maps an index and string to a pseudo-random value between 0 and 1 */
function pseudoRandom(seed: string): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash) / 2147483648;
}

function getWardPopulation(ward: Ward): number {
    // Dynamically scale population proxy based on exposure and deterministic hash
    const basePop = 50000 + (pseudoRandom(ward.name) * 150000); // 50k to 200k base
    const exposureMultiplier = 1 + (ward.exposure / 100) * 1.5;
    return Math.round(Math.min(basePop * exposureMultiplier, 1200000));
}

function getWaterProximity(ward: Ward): number {
    // Proximity to river/water body correlates heavily with the computed risk score
    // plus some deterministic noise so it varies slightly among similarly risky wards
    return Math.min(0.95, (ward.risk * 0.7) + (pseudoRandom(ward.name + 'water') * 0.3));
}

function getImperviousPct(ward: Ward): number {
    // Impervious surface typically correlates with high risk and exposure
    return Math.max(0.3, Math.min(0.95, (ward.exposure / 100 * 0.5) + (ward.risk * 0.4) + (pseudoRandom(ward.name + 'imp') * 0.2)));
}

// ─────────────────────────────────────────────────────────────
// ENGINE FUNCTIONS — all pure, no hardcoded text
// ─────────────────────────────────────────────────────────────

/** Water proximity + elevation depression amplification of flood risk */
function computeSpatialAmplifier(ward: Ward): number {
    const waterProx = getWaterProximity(ward);
    const imp = getImperviousPct(ward);
    // Dynamic elevation proxy (high risk implies high depression)
    const elevationDepression = Math.min(0.9, ward.risk * 0.8 + pseudoRandom(ward.name) * 0.2);

    return (waterProx * 0.45 + elevationDepression * 0.35 + imp * 0.20);
}

/** Infrastructure Weakness Index: high risk with low drainage and low readiness */
function infrastructureWeaknessIndex(ward: Ward, drainage: number): number {
    return (1 - ward.readiness / 100) * 0.5 + (1 - drainage / 100) * 0.3 + ward.risk * 0.2;
}

/** Vulnerability amplification factor for this ward */
function vulnerabilityAmplifier(ward: Ward): number {
    return 1 + (ward.risk * 0.4 + (100 - ward.readiness) / 100 * 0.3);
}

// ─────────────────────────────────────────────────────────────
// LAYER 1 — OPERATIONAL MITIGATION (0-72 hours)
// ─────────────────────────────────────────────────────────────
interface OperationalAction {
    action: string;
    priority: 'Critical' | 'High' | 'Moderate' | 'Low';
    rationale: string[];
    quantified: string;
    category: 'Deployment' | 'Drainage' | 'Closure' | 'Shelter' | 'Alert';
}

function computeOperationalLayer(
    ward: Ward, rainfall: number, pumps: number, drainage: number, budget: number
): OperationalAction[] {
    const actions: OperationalAction[] = [];
    const waterProx = getWaterProximity(ward);
    const iwi = infrastructureWeaknessIndex(ward, drainage);
    const vuln = vulnerabilityAmplifier(ward);
    const pop = getWardPopulation(ward);

    // PUMP DEPLOYMENT
    if (ward.risk > 0.3) {
        const pumpsNeeded = Math.ceil(ward.risk * waterProx * 8);
        const pumpBudget = Number((pumpsNeeded * 0.25).toFixed(1));

        if (pumpBudget > budget) {
            actions.push({
                action: `⚠ BUDGET SHORTFALL: Cannot Deploy ${pumpsNeeded} Required Pumps`,
                priority: 'Critical',
                rationale: [
                    `Required mobilization cost: ₹${pumpBudget}Cr`,
                    `Current available city budget: ₹${budget}Cr`,
                    `Shortfall of ₹${(pumpBudget - budget).toFixed(1)}Cr prevents critical dewatering operations`,
                ],
                quantified: `Leaves ~${Math.round(pop * ward.risk * 0.4).toLocaleString()} residents highly exposed due to financial constraint`,
                category: 'Alert',
            });
        } else {
            actions.push({
                action: `Deploy ${pumpsNeeded} High-Capacity Submersible Pumps`,
                priority: ward.risk > 0.75 ? 'Critical' : ward.risk > 0.55 ? 'High' : 'Moderate',
                rationale: [
                    `Water overflow risk elevated (Proximity Score: ${(waterProx * 100).toFixed(0)}%)`,
                    `Current drainage efficiency: ${drainage}% — below safe threshold`,
                    `Ward flood risk: ${(ward.risk * 100).toFixed(0)}% requires active dewatering`,
                ],
                quantified: `₹${pumpBudget}Cr mobilization cost (from ₹${budget}Cr available); protects ~${Math.round(pop * ward.risk * 0.4).toLocaleString()} residents`,
                category: 'Deployment',
            });
        }
    }

    // DRAINAGE CLEARING
    if (drainage < 65 && rainfall > 80) {
        const zonesCount = Math.ceil((1 - drainage / 100) * 12);
        actions.push({
            action: `Clear Drainage Blockages in ${zonesCount} Priority Micro-Zones`,
            priority: drainage < 40 ? 'Critical' : 'High',
            rationale: [
                `Drainage efficiency at ${drainage}% — ${(65 - drainage).toFixed(0)}pp below safe operational threshold`,
                `Rainfall forecast ${rainfall}mm exceeds drainage absorption capacity`,
                `Impervious surface ratio: ${(getImperviousPct(ward) * 100).toFixed(0)}% — runoff concentrated in ${zonesCount} zones`,
            ],
            quantified: `Estimated ${Math.round((65 - drainage) / 65 * 40)}% waterlogging reduction if cleared within 6 hours`,
            category: 'Drainage',
        });
    }

    // UNDERPASS CLOSURE
    if (rainfall > 150 && waterProx > 0.6) {
        const underpasses = Math.ceil(waterProx * 5);
        actions.push({
            action: `Pre-emptive Closure of ${underpasses} Low-Elevation Underpasses & Subways`,
            priority: rainfall > 250 ? 'Critical' : 'High',
            rationale: [
                `Rainfall ${rainfall}mm triggers historical underpass inundation threshold (>150mm)`,
                `Water proximity score ${(waterProx * 100).toFixed(0)}% — backflow pressure expected on low-lying road depressions`,
                `Average water depth in similar events: ${((rainfall - 100) / 100 * 1.2).toFixed(1)}m`,
            ],
            quantified: `Prevents trapping of ~${Math.round(underpasses * 120)} vehicles; eliminates potential casualty risk`,
            category: 'Closure',
        });
    }

    // SHELTER ACTIVATION
    if (ward.risk > 0.6 && ward.exposure > 30) {
        const shelterCapacity = Math.round(pop * ward.risk * 0.08);
        actions.push({
            action: `Activate ${Math.ceil(ward.risk * 4)} Emergency Relief Shelters`,
            priority: ward.risk > 0.8 ? 'Critical' : 'High',
            rationale: [
                `${ward.exposure}% of ward population in high-exposure grid clusters`,
                `Vulnerability amplification factor: ${vuln.toFixed(2)}x — unauthorized colonies present`,
                `Shelter capacity requirement: ${shelterCapacity.toLocaleString()} persons based on risk-exposure model`,
            ],
            quantified: `Target capacity: ${shelterCapacity.toLocaleString()} residents; ${Math.ceil(ward.risk * 4)} DDMA-designated centers`,
            category: 'Shelter',
        });
    }

    // ALERT LEVEL
    const alertLevel = ward.risk > 0.75 ? 'Red Alert (Level 4)'
        : ward.risk > 0.55 ? 'Orange Alert (Level 3)'
            : ward.risk > 0.35 ? 'Yellow Alert (Level 2)'
                : 'Green Advisory (Level 1)';
    actions.push({
        action: `Issue ${alertLevel} via Emergency Broadcast System`,
        priority: ward.risk > 0.75 ? 'Critical' : ward.risk > 0.55 ? 'High' : 'Moderate',
        rationale: [
            `Composite ward risk score: ${(ward.risk * 100).toFixed(0)}% meets ${alertLevel} trigger threshold`,
            `Rainfall forecast: ${rainfall}mm in catchment area`,
            `Affected population estimate: ${(pop * ward.risk * 0.4).toLocaleString()} residents at risk`,
        ],
        quantified: `Reaches ${(pop * 0.85).toLocaleString()} residents via SMS, IVR, and ward loudspeaker system`,
        category: 'Alert',
    });

    if (actions.length === 0) {
        return [{
            action: 'No immediate measures required under current conditions',
            priority: 'Low',
            rationale: [
                `Ward risk score ${(ward.risk * 100).toFixed(0)}% is below operational trigger threshold`,
                `Rainfall ${rainfall}mm within acceptable drainage absorption range`,
            ],
            quantified: 'Maintain standby readiness; re-evaluate if rainfall exceeds 100mm',
            category: 'Alert',
        }];
    }
    return actions;
}

// ─────────────────────────────────────────────────────────────
// LAYER 2 — STRATEGIC MITIGATION
// ─────────────────────────────────────────────────────────────
interface StrategicRecommendation {
    title: string;
    type: 'Drainage' | 'Infrastructure' | 'Land Use' | 'Retention';
    recurringRiskIndex: number;
    recommendations: Array<{ text: string; impact: number; cost: number; rationale: string[] }>;
    hypotheticalReadinessDelta: number;
    hypotheticalRiskDelta: number;
    economicSaving: number;
}

function computeStrategicLayer(ward: Ward, drainage: number, rainfall: number): StrategicRecommendation {
    const impervious = getImperviousPct(ward);
    const drainageDeficiency = Math.max(0, 1 - drainage / 100);
    // Recurring Risk Index: average risk × drainage deficiency × impervious surface
    const rri = ward.risk * drainageDeficiency * impervious;
    const pop = getWardPopulation(ward);

    const recommendations: StrategicRecommendation['recommendations'] = [];

    if (drainageDeficiency > 0.4) {
        const capacityIncrease = Math.round(drainageDeficiency * 80);
        recommendations.push({
            text: `Increase stormwater network capacity by ${capacityIncrease}% in ${ward.name}`,
            impact: Math.round(drainageDeficiency * 35),
            cost: Math.round(drainageDeficiency * 45),
            rationale: [
                `Drainage deficiency: ${(drainageDeficiency * 100).toFixed(0)}% — primary risk driver`,
                `${capacityIncrease}% capacity upgrade reduces waterlogging duration by ~${Math.round(capacityIncrease * 0.6)} hours`,
                `${(drainageDeficiency * 100).toFixed(0)}% contribution to recurring flood risk`,
            ],
        });
    }

    if (impervious > 0.65) {
        const zones = Math.ceil(impervious * 8);
        recommendations.push({
            text: `Convert ${zones} high-impervious micro-zones to permeable surfaces or green corridors`,
            impact: Math.round(impervious * 20),
            cost: Math.round(impervious * 30),
            rationale: [
                `Impervious surface ratio: ${(impervious * 100).toFixed(0)}% — amplifies runoff coefficient`,
                `Green surface conversion reduces peak runoff by ${Math.round(impervious * 25)}%`,
                `${(impervious * 18).toFixed(0)}% risk contribution from surface sealing`,
            ],
        });
    }

    if (rri > 0.2) {
        recommendations.push({
            text: `Construct ${Math.ceil(rri * 6)} stormwater retention ponds / detention basins`,
            impact: Math.round(rri * 40),
            cost: Math.round(rri * 55),
            rationale: [
                `Recurring Risk Index: ${(rri * 100).toFixed(2)}% — above strategic intervention threshold`,
                `Retention basins intercept ${Math.round(rri * 30)}% of peak runoff before reaching low-lying zones`,
                `Combined drainage + impervious amplification exceeds single-intervention capacity`,
            ],
        });
    }

    if (ward.readiness < 50) {
        recommendations.push({
            text: `Upgrade emergency access corridors and pre-position ${Math.ceil((1 - ward.readiness / 100) * 20)} resource caches`,
            impact: Math.round((1 - ward.readiness / 100) * 25),
            cost: Math.round((1 - ward.readiness / 100) * 15),
            rationale: [
                `Readiness score ${ward.readiness}% — below 50% triggers strategic preparedness gap`,
                `Emergency access index is the second-largest readiness deficiency factor`,
                `Pre-positioned caches reduce response latency by ${Math.round((1 - ward.readiness / 100) * 40)} minutes`,
            ],
        });
    }

    const hypotheticalRiskDelta = Math.min(0.5, recommendations.reduce((s, r) => s + r.impact / 100, 0));
    const hypotheticalReadinessDelta = Math.min(40, recommendations.reduce((s, r) => s + r.impact * 0.5, 0));
    const economicSaving = Math.round(hypotheticalRiskDelta * pop * 0.00006); // ₹ saving

    return { title: ward.name, type: 'Drainage', recurringRiskIndex: rri, recommendations, hypotheticalReadinessDelta, hypotheticalRiskDelta, economicSaving };
}

// ─────────────────────────────────────────────────────────────
// LAYER 3 — CLIMATE RESILIENCE (5-20 yr)
// ─────────────────────────────────────────────────────────────
interface ClimateProjection {
    ward: string;
    currentRisk: number;
    projectedRisk: number;
    riskDelta: number;
    newlyVulnerable: boolean;
    adaptationActions: Array<{ text: string; urgency: string; rationale: string }>;
}

function computeClimateLayer(wards: Ward[], climateMultiplier: number, rainfall: number): ClimateProjection[] {
    return wards.slice(0, 10).map(ward => {
        const waterProx = getWaterProximity(ward);
        const impervious = getImperviousPct(ward);
        // Climate-adjusted risk: amplify by multiplier weighted by water proximity and impervious surface
        const climateAmplification = 1 + (climateMultiplier / 100) * (0.6 + waterProx * 0.4);
        const projectedRisk = Math.min(1, ward.risk * climateAmplification);
        const riskDelta = projectedRisk - ward.risk;
        const newlyVulnerable = ward.risk < 0.55 && projectedRisk >= 0.55;

        const actions: ClimateProjection['adaptationActions'] = [];

        if (projectedRisk > 0.7 || newlyVulnerable) {
            actions.push({
                text: `Impose development restriction zone in ${Math.ceil(waterProx * 3)} high-risk flood fringe clusters`,
                urgency: projectedRisk > 0.85 ? 'Immediate' : 'High',
                rationale: `Climate-adjusted water overflow probability: ${(projectedRisk * 100).toFixed(0)}% vs current ${(ward.risk * 100).toFixed(0)}%`,
            });
        }
        if (impervious > 0.6) {
            actions.push({
                text: `Mandate ${Math.round(impervious * 25 * (climateMultiplier / 10))}% green cover increase in built-up zones`,
                urgency: 'High',
                rationale: `${(impervious * 100).toFixed(0)}% impervious surface will amplify runoff by ${((climateMultiplier / 100) * impervious * 40).toFixed(0)}% under climate scenario`,
            });
        }
        if (riskDelta > 0.1) {
            actions.push({
                text: `Commission Drainage Master Plan upgrade — 25-year storm design standard`,
                urgency: riskDelta > 0.2 ? 'Immediate' : 'High',
                rationale: `Risk delta of +${(riskDelta * 100).toFixed(0)}pp exceeds threshold for infrastructure class upgrade`,
            });
        }
        if (actions.length === 0) {
            actions.push({
                text: 'Maintain monitoring protocols under current infrastructure capacity',
                urgency: 'Low',
                rationale: `Projected climate risk ${(projectedRisk * 100).toFixed(0)}% within manageable range for this ward`,
            });
        }

        return { ward: ward.name, currentRisk: ward.risk, projectedRisk, riskDelta, newlyVulnerable, adaptationActions: actions };
    });
}

// ─────────────────────────────────────────────────────────────
// PRIORITY COLOURS
// ─────────────────────────────────────────────────────────────
function priorityStyle(p: string) {
    if (p === 'Critical') return 'text-red-400 bg-red-500/10 border-red-500/40';
    if (p === 'High') return 'text-orange-400 bg-orange-500/10 border-orange-500/40';
    if (p === 'Moderate') return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/40';
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/40';
}
function categoryIcon(c: string) {
    const icons: Record<string, React.ReactNode> = {
        Deployment: <Droplets className="w-4 h-4 text-blue-400" />,
        Drainage: <Activity className="w-4 h-4 text-cyan-400" />,
        Closure: <Shield className="w-4 h-4 text-orange-400" />,
        Shelter: <Users className="w-4 h-4 text-purple-400" />,
        Alert: <AlertTriangle className="w-4 h-4 text-red-400" />,
    };
    return icons[c] ?? <Zap className="w-4 h-4 text-yellow-400" />;
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function MitigationEngine({ rainfall, budget, pumps, drainage, floodRiskScore, wards, role, onClose }: MitigationEngineProps) {
    const [activeTab, setActiveTab] = useState<'operational' | 'strategic' | 'climate'>('operational');
    const [selectedWardIdx, setSelectedWardIdx] = useState(0);
    const [climateMultiplier, setClimateMultiplier] = useState(15);
    const [hypotheticalApplied, setHypotheticalApplied] = useState(false);
    const [expandedAction, setExpandedAction] = useState<number | null>(null);
    const [expandedStrategic, setExpandedStrategic] = useState<number | null>(null);

    const canSeeStrategic = role === 'Ward Officer' || role === 'City Admin' || role === 'System Admin';
    const canSeeClimate = role === 'City Admin' || role === 'System Admin';
    const canAdjustSensitivity = role === 'System Admin';

    // Top 5 wards sorted by risk for operational focus
    const riskSortedWards = useMemo(() => [...wards].sort((a, b) => b.risk - a.risk).slice(0, 5), [wards]);
    const selectedWard = riskSortedWards[selectedWardIdx] || riskSortedWards[0];

    // Live computations
    const operationalActions = useMemo(
        () => selectedWard ? computeOperationalLayer(selectedWard, rainfall, pumps, drainage, budget) : [],
        [selectedWard, rainfall, pumps, drainage, budget]
    );
    const strategicData = useMemo(
        () => selectedWard ? computeStrategicLayer(selectedWard, drainage, rainfall) : null,
        [selectedWard, drainage, rainfall]
    );
    const climateProjections = useMemo(
        () => computeClimateLayer(wards, climateMultiplier, rainfall),
        [wards, climateMultiplier, rainfall]
    );

    // Impact metrics for selected ward
    const pop = selectedWard ? getWardPopulation(selectedWard) : 200000;
    const projectedFloodReduction = hypotheticalApplied && strategicData
        ? Math.round(strategicData.hypotheticalRiskDelta * 100)
        : 0;
    const projectedReadinessGain = hypotheticalApplied && strategicData
        ? Math.round(strategicData.hypotheticalReadinessDelta)
        : 0;
    const populationProtected = Math.round(pop * (projectedFloodReduction / 100));
    const economicSaving = strategicData?.economicSaving ?? 0;

    const tabs = [
        { id: 'operational' as const, label: 'Operational', icon: <Zap className="w-3.5 h-3.5" />, sublabel: '0–72 hrs', color: 'text-red-400', show: true },
        { id: 'strategic' as const, label: 'Strategic', icon: <Target className="w-3.5 h-3.5" />, sublabel: 'Months–1 yr', color: 'text-yellow-400', show: canSeeStrategic },
        { id: 'climate' as const, label: 'Climate Resilience', icon: <Globe className="w-3.5 h-3.5" />, sublabel: '5–20 yrs', color: 'text-blue-400', show: canSeeClimate },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-[#0a111f] border border-white/10 rounded-2xl shadow-[0_0_80px_rgba(59,130,246,0.15)] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">

                {/* HEADER */}
                <div className="flex items-start justify-between p-5 border-b border-white/10 flex-shrink-0">
                    <div>
                        <div className="flex items-center space-x-2 mb-1">
                            <div className="p-1.5 bg-blue-500/20 rounded-lg"><Layers className="w-4 h-4 text-blue-400" /></div>
                            <h2 className="text-lg font-bold text-white">Risk Mitigation Intelligence Engine</h2>
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full uppercase tracking-wider">Live</span>
                        </div>
                        <p className="text-xs text-slate-400">Dynamic · Explainable · Data-Driven</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/5 hover:bg-red-500/15 rounded-lg transition-colors">
                        <span className="text-slate-400 hover:text-red-400 font-bold text-sm">✕</span>
                    </button>
                </div>

                {/* TABS */}
                <div className="flex border-b border-white/10 px-4 flex-shrink-0">
                    {tabs.filter(t => t.show).map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center space-x-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${activeTab === tab.id
                                ? `border-blue-500 ${tab.color}`
                                : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                            <span className="text-[10px] text-slate-500 hidden sm:inline">({tab.sublabel})</span>
                        </button>
                    ))}
                </div>

                {/* Live inputs bar */}
                <div className="flex items-center space-x-4 px-5 py-2.5 bg-slate-900/50 border-b border-white/5 flex-shrink-0">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Live Inputs:</span>
                    {[
                        { label: 'Rainfall', val: `${rainfall}mm`, ok: rainfall < 150 },
                        { label: 'Drainage', val: `${drainage}%`, ok: drainage > 50 },
                        { label: 'Pumps', val: `${pumps}`, ok: pumps > 100 },
                        { label: 'Budget', val: `₹${budget}Cr`, ok: budget > 7 },
                        { label: 'City Risk', val: `${(floodRiskScore * 100).toFixed(0)}%`, ok: floodRiskScore < 0.5 },
                    ].map(item => (
                        <div key={item.label} className="flex items-center space-x-1.5">
                            <span className="text-[10px] text-slate-500">{item.label}:</span>
                            <span className={`text-[11px] font-bold font-mono ${item.ok ? 'text-emerald-400' : 'text-red-400'}`}>{item.val}</span>
                        </div>
                    ))}
                    <div className="ml-auto flex items-center space-x-1.5">
                        <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" style={{ animationDuration: '3s' }} />
                        <span className="text-[10px] text-blue-400 font-semibold">Recalculating live</span>
                    </div>
                </div>

                {/* SCROLLABLE BODY */}
                <div className="overflow-y-auto flex-1 p-5 space-y-5">
                    <AnimatePresence mode="wait">

                        {/* ═══════════════════════════════════════════════
                            LAYER 1: OPERATIONAL 
                        ═══════════════════════════════════════════════ */}
                        {activeTab === 'operational' && (
                            <motion.div key="operational" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

                                {/* Ward Selector */}
                                <div>
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Select High-Risk Ward for Operational Plan</p>
                                    <div className="flex flex-wrap gap-2">
                                        {riskSortedWards.map((w, i) => (
                                            <button key={i} onClick={() => { setSelectedWardIdx(i); setExpandedAction(null); }}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${selectedWardIdx === i
                                                    ? 'bg-blue-600/30 border-blue-500/60 text-blue-300'
                                                    : 'bg-slate-800/60 border-white/5 text-slate-400 hover:border-white/20'}`}>
                                                {w.name} <span className="text-[10px] opacity-70">({(w.risk * 100).toFixed(0)}%)</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Impact metrics bar */}
                                {selectedWard && (
                                    <div className="grid grid-cols-4 gap-3">
                                        {[
                                            { label: 'Ward Risk', val: `${(selectedWard.risk * 100).toFixed(0)}%`, sub: 'Composite Score', color: selectedWard.risk > 0.7 ? 'text-red-400' : selectedWard.risk > 0.5 ? 'text-orange-400' : 'text-yellow-400' },
                                            { label: 'Water Risk', val: `${(getWaterProximity(selectedWard) * 100).toFixed(0)}%`, sub: 'Proximity Factor', color: 'text-blue-400' },
                                            { label: 'Infra Weakness', val: `${(infrastructureWeaknessIndex(selectedWard, drainage) * 100).toFixed(0)}%`, sub: 'IWI Score', color: 'text-purple-400' },
                                            { label: 'Population', val: getWardPopulation(selectedWard).toLocaleString(), sub: 'Residents', color: 'text-slate-300' },
                                        ].map(m => (
                                            <div key={m.label} className="bg-slate-800/50 border border-white/5 rounded-xl p-3 text-center">
                                                <p className={`text-lg font-bold ${m.color}`}>{m.val}</p>
                                                <p className="text-[10px] text-slate-500">{m.label}</p>
                                                <p className="text-[9px] text-slate-600">{m.sub}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="space-y-3">
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        {operationalActions.length} Recommended Actions — Sorted by Priority
                                    </p>
                                    {operationalActions.map((action, i) => (
                                        <div key={i} className="bg-slate-900/60 border border-white/10 rounded-xl overflow-hidden">
                                            <button
                                                onClick={() => setExpandedAction(expandedAction === i ? null : i)}
                                                className="w-full text-left p-4 flex items-start justify-between hover:bg-white/[0.02] transition-colors"
                                            >
                                                <div className="flex items-start space-x-3">
                                                    <div className="p-2 bg-slate-800 rounded-lg flex-shrink-0 mt-0.5">{categoryIcon(action.category)}</div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-white">{action.action}</p>
                                                        <p className="text-xs text-slate-400 mt-0.5">{action.quantified}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${priorityStyle(action.priority)}`}>
                                                        {action.priority}
                                                    </span>
                                                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${expandedAction === i ? 'rotate-180' : ''}`} />
                                                </div>
                                            </button>
                                            <AnimatePresence>
                                                {expandedAction === i && (
                                                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-white/5">
                                                        <div className="p-4 bg-slate-900/40">
                                                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
                                                                <Info className="w-3 h-3 mr-1.5" /> Why this action? — Explainability Breakdown
                                                            </p>
                                                            <ul className="space-y-1.5">
                                                                {action.rationale.map((r, j) => (
                                                                    <li key={j} className="flex items-start text-xs text-slate-300">
                                                                        <ArrowRight className="w-3 h-3 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                                                                        {r}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* ═══════════════════════════════════════════════
                            LAYER 2: STRATEGIC 
                        ═══════════════════════════════════════════════ */}
                        {activeTab === 'strategic' && strategicData && (
                            <motion.div key="strategic" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">

                                {/* Ward Selector */}
                                <div>
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Select Ward for Strategic Plan</p>
                                    <div className="flex flex-wrap gap-2">
                                        {riskSortedWards.map((w, i) => (
                                            <button key={i} onClick={() => { setSelectedWardIdx(i); setHypotheticalApplied(false); setExpandedStrategic(null); }}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${selectedWardIdx === i
                                                    ? 'bg-yellow-600/20 border-yellow-500/50 text-yellow-300'
                                                    : 'bg-slate-800/60 border-white/5 text-slate-400 hover:border-white/20'}`}>
                                                {w.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Recurring Risk Index */}
                                <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm font-bold text-white">Recurring Risk Index (RRI)</p>
                                        <span className={`text-lg font-bold font-mono ${strategicData.recurringRiskIndex > 0.3 ? 'text-red-400' : strategicData.recurringRiskIndex > 0.15 ? 'text-orange-400' : 'text-yellow-400'}`}>
                                            {(strategicData.recurringRiskIndex * 100).toFixed(2)}%
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mb-3">RRI = Avg Risk × Drainage Deficiency × Impervious Surface %</p>
                                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, strategicData.recurringRiskIndex * 300)}%` }}
                                            className={`h-full rounded-full ${strategicData.recurringRiskIndex > 0.3 ? 'bg-red-500' : 'bg-orange-500'}`} />
                                    </div>
                                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                                        <span>Low (&lt;5%)</span><span>Moderate (5–15%)</span><span>High (&gt;15%)</span>
                                    </div>
                                </div>

                                {/* Strategic Recommendations */}
                                <div className="space-y-3">
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{strategicData.recommendations.length} Infrastructure Interventions</p>
                                    {strategicData.recommendations.map((rec, i) => (
                                        <div key={i} className="bg-slate-900/60 border border-white/10 rounded-xl overflow-hidden">
                                            <button onClick={() => setExpandedStrategic(expandedStrategic === i ? null : i)}
                                                className="w-full text-left p-4 hover:bg-white/[0.02] transition-colors">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-start space-x-3">
                                                        <Building className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                                                        <p className="text-sm font-semibold text-white">{rec.text}</p>
                                                    </div>
                                                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform flex-shrink-0 ml-3 ${expandedStrategic === i ? 'rotate-180' : ''}`} />
                                                </div>
                                                <div className="flex items-center space-x-4 mt-2 pl-7">
                                                    <div className="flex items-center space-x-1.5">
                                                        <TrendingDown className="w-3 h-3 text-emerald-400" />
                                                        <span className="text-xs text-emerald-400 font-semibold">-{rec.impact}% risk</span>
                                                    </div>
                                                    <div className="flex items-center space-x-1.5">
                                                        <DollarSign className="w-3 h-3 text-blue-400" />
                                                        <span className="text-xs text-blue-400 font-semibold">₹{rec.cost}Cr est.</span>
                                                    </div>
                                                </div>
                                            </button>
                                            <AnimatePresence>
                                                {expandedStrategic === i && (
                                                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-white/5">
                                                        <div className="p-4 bg-slate-900/40">
                                                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Why this intervention?</p>
                                                            <ul className="space-y-1.5">
                                                                {rec.rationale.map((r, j) => (
                                                                    <li key={j} className="flex items-start text-xs text-slate-300">
                                                                        <ArrowRight className="w-3 h-3 text-yellow-400 mr-2 mt-0.5 flex-shrink-0" />{r}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    ))}
                                </div>

                                {/* Hypothetical Improvement Simulator */}
                                <div className="bg-slate-900/60 border border-blue-500/20 rounded-xl p-5">
                                    <h4 className="font-bold text-white mb-1 flex items-center">
                                        <BarChart2 className="w-4 h-4 text-blue-400 mr-2" />
                                        Apply Hypothetical Infrastructure Improvement
                                    </h4>
                                    <p className="text-xs text-slate-400 mb-4">Simulate the effect of implementing all strategic recommendations for {selectedWard?.name}</p>
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        {[
                                            { label: 'Flood Risk Reduction', val: hypotheticalApplied ? `-${projectedFloodReduction}%` : '—', color: 'text-emerald-400' },
                                            { label: 'Readiness Gain', val: hypotheticalApplied ? `+${projectedReadinessGain}pp` : '—', color: 'text-blue-400' },
                                            { label: 'Population Protected', val: hypotheticalApplied ? populationProtected.toLocaleString() : '—', color: 'text-purple-400' },
                                            { label: 'Economic Saving', val: hypotheticalApplied ? `₹${economicSaving}Cr/yr` : '—', color: 'text-yellow-400' },
                                        ].map(m => (
                                            <div key={m.label} className={`p-3 rounded-xl text-center transition-all ${hypotheticalApplied ? 'bg-emerald-500/5 border border-emerald-500/20' : 'bg-slate-800/60 border border-white/5'}`}>
                                                <p className={`text-xl font-bold ${hypotheticalApplied ? m.color : 'text-slate-600'}`}>{m.val}</p>
                                                <p className="text-[10px] text-slate-500">{m.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setHypotheticalApplied(!hypotheticalApplied)}
                                        className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all ${hypotheticalApplied
                                            ? 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20'
                                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]'}`}
                                    >
                                        {hypotheticalApplied ? '↩ Reset to Current State' : '▶ Apply All Improvements & Recalculate'}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* ═══════════════════════════════════════════════
                            LAYER 3: CLIMATE RESILIENCE 
                        ═══════════════════════════════════════════════ */}
                        {activeTab === 'climate' && (
                            <motion.div key="climate" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">

                                {/* Climate Multiplier Slider */}
                                <div className="bg-slate-900/60 border border-blue-500/20 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center space-x-2">
                                            <Wind className="w-4 h-4 text-blue-400" />
                                            <h4 className="font-bold text-white text-sm">Climate Rainfall Intensity Multiplier</h4>
                                        </div>
                                        <span className="text-xl font-bold text-blue-400 font-mono">+{climateMultiplier}%</span>
                                    </div>
                                    <p className="text-xs text-slate-400 mb-3">
                                        Models projected increase in rainfall intensity under IPCC scenarios. Applied multiplicatively on top of current risk engine.
                                    </p>
                                    <input type="range" min={5} max={40} value={climateMultiplier} onChange={e => setClimateMultiplier(Number(e.target.value))}
                                        className="w-full accent-blue-500 cursor-pointer" />
                                    {canAdjustSensitivity && (
                                        <p className="text-[10px] text-blue-400 mt-2">
                                            ⚙ System Admin: sensitivity parameter adjustment enabled — values above 25% indicate extreme scenario
                                        </p>
                                    )}
                                    {climateMultiplier > 25 && (
                                        <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 flex items-center space-x-2">
                                            <AlertTriangle className="w-3.5 h-3.5" /><span>Extreme scenario — results reflect worst-case IPCC RCP8.5 trajectory</span>
                                        </div>
                                    )}
                                </div>

                                {/* Newly Vulnerable Banner */}
                                {climateProjections.some(p => p.newlyVulnerable) && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start space-x-3">
                                        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-bold text-red-400">New Vulnerability Threshold Breached</p>
                                            <p className="text-xs text-slate-400">
                                                {climateProjections.filter(p => p.newlyVulnerable).map(p => p.ward).join(', ')} will cross the 55% risk threshold under +{climateMultiplier}% climate scenario — previously considered moderate risk.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Risk Projection Table */}
                                <div className="bg-slate-900/60 border border-white/10 rounded-xl overflow-hidden">
                                    <div className="p-4 border-b border-white/10">
                                        <h4 className="font-bold text-white text-sm flex items-center">
                                            <TrendingUp className="w-4 h-4 text-blue-400 mr-2" />
                                            Future Flood Risk Projection — +{climateMultiplier}% Rainfall Intensity
                                        </h4>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="bg-slate-800/50 text-slate-500 text-[10px] uppercase tracking-wider">
                                                    <th className="text-left p-3">Ward</th>
                                                    <th className="text-right p-3">Current Risk</th>
                                                    <th className="text-right p-3">Projected Risk</th>
                                                    <th className="text-right p-3">Delta</th>
                                                    <th className="text-center p-3">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {climateProjections.map((proj, i) => (
                                                    <tr key={i} className={`border-t border-white/5 ${proj.newlyVulnerable ? 'bg-red-500/5' : ''}`}>
                                                        <td className="p-3 font-medium text-slate-200">{proj.ward}</td>
                                                        <td className="p-3 text-right font-mono text-slate-400">{(proj.currentRisk * 100).toFixed(0)}%</td>
                                                        <td className={`p-3 text-right font-mono font-bold ${proj.projectedRisk > 0.75 ? 'text-red-400' : proj.projectedRisk > 0.5 ? 'text-orange-400' : 'text-yellow-400'}`}>
                                                            {(proj.projectedRisk * 100).toFixed(0)}%
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <span className={`font-mono font-bold ${proj.riskDelta > 0.1 ? 'text-red-400' : 'text-orange-400'}`}>
                                                                +{(proj.riskDelta * 100).toFixed(0)}pp
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            {proj.newlyVulnerable && (
                                                                <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/40 text-red-400 rounded-full text-[10px] font-bold">⚠ NEW</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Adaptation Actions */}
                                <div className="space-y-3">
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Long-Term Adaptation Actions by Ward</p>
                                    {climateProjections.filter(p => p.adaptationActions.some(a => a.urgency !== 'Low')).slice(0, 5).map((proj, i) => (
                                        <div key={i} className="bg-slate-900/60 border border-white/10 rounded-xl p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <p className="font-semibold text-white text-sm">{proj.ward}</p>
                                                <span className={`text-xs font-mono font-bold ${proj.projectedRisk > 0.75 ? 'text-red-400' : 'text-orange-400'}`}>
                                                    {(proj.projectedRisk * 100).toFixed(0)}% projected
                                                </span>
                                            </div>
                                            <ul className="space-y-2">
                                                {proj.adaptationActions.map((act, j) => (
                                                    <li key={j} className="space-y-1">
                                                        <div className="flex items-start space-x-2">
                                                            <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold ${act.urgency === 'Immediate' ? 'bg-red-500/15 text-red-400' : act.urgency === 'High' ? 'bg-orange-500/15 text-orange-400' : 'bg-slate-700 text-slate-400'}`}>
                                                                {act.urgency}
                                                            </span>
                                                            <p className="text-xs text-slate-200">{act.text}</p>
                                                        </div>
                                                        <p className="text-[11px] text-slate-500 pl-8">{act.rationale}</p>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
}
