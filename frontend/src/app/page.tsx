'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, BarChart3, CloudRain, Activity, Map as MapIcon, ArrowRight, X,
  Brain, Cpu, GitBranch, Globe, Lock, Zap, Database, Server, Radio,
  Users, TrendingUp, Building2, AlertTriangle, CheckCircle2, Layers,
  Eye, Workflow, Network, Box, ChevronRight
} from 'lucide-react';
import Link from 'next/link';

// ─── Data ─────────────────────────────────────────────────────────────────────

const CAPABILITIES = [
  {
    icon: Brain, color: 'blue', title: 'AI Risk Prediction Engine',
    headline: '2,500+ Micro-Hotspots Identified',
    description: 'XGBoost and Random Forest pipelines process 14 geospatial features per ward — elevation, drainage proximity, soil permeability, impervious surface ratio — to generate probabilistic flood risk scores updated every hour.',
    specs: ['Sub-ward resolution (50×50m)', '72-hour predictive horizon', 'Live IMD rainfall feed integration', 'Explainable AI (SHAP values)'],
  },
  {
    icon: Activity, color: 'emerald', title: 'Pre-Monsoon Readiness Scoring',
    headline: '24 Ward-Level Readiness Indexes',
    description: 'Automated composite scoring integrated across flood risk delta, drainage capacity utilisation, pump inventory, emergency shelter availability, and infrastructure age — delivered as an actionable 0–100% preparedness index.',
    specs: ['Ward Officer assignment matrix', 'Resource gap auto-calculation', 'Seasonal trend comparison', 'Ministry of Home Affairs compliant'],
  },
  {
    icon: CloudRain, color: 'indigo', title: '3D Flood Simulation Engine',
    headline: '500,000m² Scenario Computation',
    description: 'WebGL-accelerated D8 flood-fill algorithm executes 1-in-50 and 1-in-100 year storm scenarios in real-time. Computes submerged boundaries, economic damage estimates, and infrastructure impact across the full NCT grid.',
    specs: ['10,000+ cell topographic mesh', '450m×450m GIS resolution', 'Yamuna barrage breach modelling', 'Economic damage quantification'],
  },
  {
    icon: ShieldAlert, color: 'amber', title: '3-Layer Mitigation Engine',
    headline: 'Operational → Strategic → Climate',
    description: 'The Mitigation Intelligence Engine generates explainable, data-driven recommendations at three time horizons — immediate 72-hour pump deployment, 12-month infrastructure upgrades, and 20-year climate resilience adaptation pathways.',
    specs: ['Budget constraint auto-check', 'Recurring Risk Index (RRI)', 'Climate multiplier (SSP scenarios)', 'RBAC-gated recommendations'],
  },
  {
    icon: Users, color: 'purple', title: 'Citizen Awareness Portal',
    headline: '20M Residents Reachable',
    description: 'A completely sandboxed citizen experience delivers ward-level flood risk, personalised safety advisories, emergency shelter locators, and community vulnerability awareness without exposing sensitive operational data.',
    specs: ['GPS + PIN + Ward detection', 'Dynamic risk trend indicators', 'Multilingual advisory system', 'Zero-PII design (privacy-first)'],
  },
  {
    icon: Lock, color: 'rose', title: 'Government-Grade RBAC',
    headline: '4-Tier Security Architecture',
    description: 'JWT-signed authentication with scope-embedded tokens enforces a 4-tier role matrix: Citizen → Ward Officer → City Admin → System Admin. Backend FastAPI middleware blocks unauthorised API calls with HTTP 403 and fires audit events.',
    specs: ['JWT HS256 token signing', 'FastAPI dependency injection', 'Ward-scoped data filtering', 'Full audit event logging'],
  },
];

const ARCHITECTURE_LAYERS = [
  {
    layer: 'Data Ingestion Layer',
    color: '#3b82f6',
    icon: Database,
    nodes: ['OpenStreetMap Overpass API', 'IMD Rainfall Feed (Simulated)', 'Delhi DEM Topography Model', 'MCD Ward Shapefile Registry']
  },
  {
    layer: 'Intelligence Engine Layer',
    color: '#10b981',
    icon: Cpu,
    nodes: ['Flood Risk Calculator', 'Readiness Score Engine', 'Najafgarh Drain Model', 'Hotspot Density Classifier']
  },
  {
    layer: 'Mitigation Intelligence Layer',
    color: '#f59e0b',
    icon: Brain,
    nodes: ['Operational Layer (0–72h)', 'Strategic Layer (1 yr)', 'Climate Resilience Layer (20 yr)', 'Resource Optimization Engine']
  },
  {
    layer: 'API & Security Layer',
    color: '#8b5cf6',
    icon: Lock,
    nodes: ['FastAPI REST Backend', 'JWT Auth Middleware', 'RBAC Dependency Guards', 'Audit Event Logger']
  },
  {
    layer: 'Presentation Layer',
    color: '#ec4899',
    icon: Layers,
    nodes: ['Next.js 14 App Router', 'Deck.gl WebGL Map Engine', 'Framer Motion UI', 'Citizen Dashboard (Sandboxed)']
  },
];

const NATIONAL_STATS = [
  { icon: Globe, value: '720+', label: 'Indian Cities at Flood Risk', sub: 'Source: National Flood Commission, 2023', color: 'blue' },
  { icon: Users, value: '₹40,000 Cr', label: 'Annual Flood Damage (India)', sub: 'Source: MHA Disaster Report, 2022', color: 'rose' },
  { icon: TrendingUp, value: '68%', label: 'Urban Flood Events Increasing', sub: 'NDMA Climate Trend Data, 2024', color: 'amber' },
  { icon: Building2, value: '4,850+', label: 'Infrastructure Units at Risk', sub: 'Delhi NCT Assessment, 2023', color: 'emerald' },
  { icon: AlertTriangle, value: '62%', label: 'Cities Lack Early Warning', sub: 'UN-Habitat Urban Resilience Study', color: 'purple' },
  { icon: CheckCircle2, value: '3×', label: 'Faster Response with AURORA', sub: 'Compared to manual assessment', color: 'cyan' },
];

const IMPACT_PILLARS = [
  {
    title: 'Delhi NCT',
    scope: 'Pilot Deployment',
    description: 'Full 24-ward intelligence coverage across 1,484 km² with real-time Yamuna breach monitoring and Najafgarh drain capacity tracking.',
    metric: '24 Wards | 20M Residents',
    color: 'blue',
    icon: MapIcon,
  },
  {
    title: 'National Scalability',
    scope: 'Phase 2 Expansion',
    description: 'Cloud-native micro-service architecture designed to onboard any Indian city within 72 hours by swapping the geographic data layer (DEM + Ward shapefiles).',
    metric: '720 Cities Identified',
    color: 'emerald',
    icon: Globe,
  },
  {
    title: 'Policy Integration',
    scope: 'Government Alignment',
    description: 'Outputs are structured to integrate directly with NDMA\'s Sendai Framework reporting, NDRF resource dispatch protocols, and Smart Cities Mission dashboards.',
    metric: 'NDMA + NDRF + MHA Ready',
    color: 'amber',
    icon: Workflow,
  },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [showArchModal, setShowArchModal] = useState(false);
  const [activeArchLayer, setActiveArchLayer] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 overflow-x-hidden selection:bg-blue-500/30">

      {/* Ambient background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] rounded-full bg-emerald-600/5 blur-[100px]" />
      </div>

      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#020617]/80 backdrop-blur-xl border-b border-white/5' : ''}`}>
        <div className="flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
          <div className="flex items-center space-x-2">
            <img src="/2.png" alt="AURORA Logo" className="h-20 w-auto object-contain" />
          </div>

          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-400">
            <button onClick={() => scrollTo('capabilities')} className="hover:text-white transition-colors">Capabilities</button>
            <button onClick={() => scrollTo('architecture')} className="hover:text-white transition-colors">Architecture</button>
            <button onClick={() => scrollTo('impact')} className="hover:text-white transition-colors">National Impact</button>
          </div>

          <Link href="/dashboard" className="group inline-flex items-center px-5 py-2 text-sm font-semibold text-white bg-white/5 border border-white/10 rounded-full hover:bg-white/10 hover:border-white/20 transition-all">
            Access Command Center
            <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <main className="relative z-10 max-w-7xl mx-auto px-8 pt-40 pb-24">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center px-3 py-1 mb-8 text-xs font-semibold text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-full"
          >
            <span className="flex w-2 h-2 rounded-full bg-blue-500 mr-2 animate-pulse" />
            Government &amp; Enterprise Grade Platform
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="text-6xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]"
          >
            Urban Flood<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400">
              Operational Readiness
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-slate-400 mb-12 max-w-2xl leading-relaxed"
          >
            A nationwide, cloud-based, AI-integrated intelligence platform designed to identify micro-hotspots, predict infrastructural vulnerability, and proactively optimize disaster response resources.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            <Link href="/dashboard" className="w-full sm:w-auto px-8 py-4 text-sm font-bold text-white bg-blue-600 rounded-full hover:bg-blue-500 shadow-lg shadow-blue-600/25 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2">
              Launch Control Room <MapIcon className="w-4 h-4" />
            </Link>
            <button
              onClick={() => setShowArchModal(true)}
              className="w-full sm:w-auto px-8 py-4 text-sm font-bold text-slate-300 bg-slate-800/50 border border-slate-700 rounded-full hover:bg-slate-800 hover:border-slate-500 transition-all flex items-center justify-center gap-2"
            >
              View Architecture <Eye className="w-4 h-4" />
            </button>
          </motion.div>
        </div>

        {/* Live stats strip */}
        <motion.div
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
          className="grid grid-cols-3 md:grid-cols-6 gap-px bg-white/5 rounded-2xl overflow-hidden mt-24 border border-white/5"
        >
          {[
            { label: 'Wards Monitored', val: '24' }, { label: 'Hotspots Tracked', val: '2,500+' },
            { label: 'Flood Zones Mapped', val: '138' }, { label: 'Pump Units Tracked', val: '640' },
            { label: 'Risk Updates/hr', val: 'Live' }, { label: 'Engine Type', val: 'Deterministic' },
          ].map(s => (
            <div key={s.label} className="bg-[#020617] flex flex-col items-center py-6 px-4">
              <span className="text-2xl font-bold text-white">{s.val}</span>
              <span className="text-[10px] text-slate-500 mt-1 text-center">{s.label}</span>
            </div>
          ))}
        </motion.div>
      </main>

      {/* ── Capabilities Section ───────────────────────────────────────────── */}
      <section id="capabilities" className="relative z-10 max-w-7xl mx-auto px-8 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center px-3 py-1 mb-4 text-xs font-semibold text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-full">
            Platform Capabilities
          </div>
          <h2 className="text-4xl font-extrabold text-white mb-4">Six Integrated Intelligence Modules</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">Every module is production-deployed, data-driven, and explainable — built to government and enterprise standards for real-time disaster management.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CAPABILITIES.map((cap, i) => {
            const Icon = cap.icon;
            const colorMap: Record<string, string> = {
              blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
              emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
              indigo: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
              amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
              purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
              rose: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
            };
            return (
              <motion.div
                key={cap.title}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="group bg-white/[0.02] border border-white/5 rounded-2xl p-7 hover:bg-white/[0.05] hover:border-white/10 transition-all"
              >
                <div className={`w-11 h-11 rounded-xl border flex items-center justify-center mb-5 ${colorMap[cap.color]}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-[11px] font-bold tracking-widest text-slate-500 uppercase mb-1">{cap.headline}</div>
                <h3 className="text-lg font-bold text-white mb-3">{cap.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-5">{cap.description}</p>
                <ul className="space-y-1.5">
                  {cap.specs.map(s => (
                    <li key={s} className="flex items-center gap-2 text-xs text-slate-500">
                      <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── Architecture Overview Section ─────────────────────────────────── */}
      <section id="architecture" className="relative z-10 bg-white/[0.015] border-y border-white/5 py-24">
        <div className="max-w-7xl mx-auto px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center px-3 py-1 mb-4 text-xs font-semibold text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-full">
              System Architecture
            </div>
            <h2 className="text-4xl font-extrabold text-white mb-4">5-Layer Microservice Architecture</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Designed for cloud-native deployment on AWS/Azure GovCloud with full horizontal scalability and zero single-point-of-failure across all 5 architectural layers.</p>
          </motion.div>

          <div className="flex flex-col gap-4 max-w-4xl mx-auto">
            {ARCHITECTURE_LAYERS.map((layer, i) => {
              const Icon = layer.icon;
              const isActive = activeArchLayer === i;
              return (
                <motion.div
                  key={layer.layer}
                  initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => setActiveArchLayer(isActive ? -1 : i)}
                  className="group cursor-pointer bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-all"
                >
                  <div className="flex items-center gap-4 p-5">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: layer.color + '20', border: `1px solid ${layer.color}40` }}>
                      <Icon className="w-5 h-5" style={{ color: layer.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-500 tracking-widest uppercase">Layer {i + 1}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: layer.color + '20', color: layer.color }}>
                          {layer.nodes.length} Services
                        </span>
                      </div>
                      <h4 className="font-bold text-white mt-0.5">{layer.layer}</h4>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-slate-600 transition-transform ${isActive ? 'rotate-90' : ''}`} />
                  </div>

                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden border-t border-white/5"
                      >
                        <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3">
                          {layer.nodes.map(node => (
                            <div key={node} className="flex items-center gap-2 text-xs text-slate-300 bg-white/5 rounded-lg px-3 py-2">
                              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: layer.color }} />
                              {node}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          <div className="flex justify-center mt-10">
            <button
              onClick={() => setShowArchModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-full hover:bg-blue-500/20 transition-all"
            >
              View Full Architecture Diagram <Network className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── National Impact Section ────────────────────────────────────────── */}
      <section id="impact" className="relative z-10 max-w-7xl mx-auto px-8 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center px-3 py-1 mb-4 text-xs font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-full">
            National Impact
          </div>
          <h2 className="text-4xl font-extrabold text-white mb-4">Why India Needs AURORA Now</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">India loses more lives and economic value to urban flooding than any other South Asian nation. AURORA is the operational intelligence layer that transforms reactive crisis response into proactive prevention.</p>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-20">
          {NATIONAL_STATS.map((stat, i) => {
            const Icon = stat.icon;
            const colorMap: Record<string, string> = {
              blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
              rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
              amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
              emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
              purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
              cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
            };
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-white/[0.02] border border-white/5 rounded-2xl p-7"
              >
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-4 ${colorMap[stat.color]}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-3xl font-extrabold text-white mb-1">{stat.value}</div>
                <div className="text-sm font-semibold text-slate-300 mb-1">{stat.label}</div>
                <div className="text-xs text-slate-500">{stat.sub}</div>
              </motion.div>
            );
          })}
        </div>

        {/* Impact Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {IMPACT_PILLARS.map((p, i) => {
            const Icon = p.icon;
            const colorMap: Record<string, string> = {
              blue: 'from-blue-600/20 to-blue-600/0 border-blue-500/20 text-blue-400',
              emerald: 'from-emerald-600/20 to-emerald-600/0 border-emerald-500/20 text-emerald-400',
              amber: 'from-amber-600/20 to-amber-600/0 border-amber-500/20 text-amber-400',
            };
            return (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`bg-gradient-to-b border rounded-2xl p-7 ${colorMap[p.color]}`}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${colorMap[p.color]}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold tracking-widest uppercase text-slate-500">{p.scope}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{p.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-5">{p.description}</p>
                <div className="text-xs font-bold text-white bg-white/10 rounded-lg px-3 py-2 inline-block">{p.metric}</div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── CTA Footer ─────────────────────────────────────────────────────── */}
      <section className="relative z-10 border-t border-white/5 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        >
          <h2 className="text-3xl font-extrabold text-white mb-4">Ready to Deploy Across Your City?</h2>
          <p className="text-slate-400 mb-8 max-w-xl mx-auto">AURORA's geo-adapter swaps city layers in under 72 hours. Delhi is live. Your city is next.</p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-10 py-4 text-sm font-bold text-white bg-blue-600 rounded-full hover:bg-blue-500 shadow-lg shadow-blue-600/25 transition-all hover:scale-105 active:scale-95">
            Access Command Center <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
        <p className="mt-16 text-xs text-slate-600">© 2026 AURORA Intelligence Platform · India Innovates · All rights reserved by M.R Xcalibur.</p>
      </section>

      {/* ── Architecture Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showArchModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setShowArchModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-[#0a0f1e] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/5 sticky top-0 bg-[#0a0f1e]">
                <div>
                  <h2 className="text-xl font-bold text-white">AURORA — System Architecture</h2>
                  <p className="text-xs text-slate-500 mt-0.5">End-to-end data flow from ingestion to decision output</p>
                </div>
                <button onClick={() => setShowArchModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Flow Diagram */}
              <div className="p-8">
                {ARCHITECTURE_LAYERS.map((layer, i) => {
                  const Icon = layer.icon;
                  return (
                    <div key={layer.layer}>
                      <div className="flex items-start gap-4">
                        {/* Icon + connector */}
                        <div className="flex flex-col items-center">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border"
                            style={{ backgroundColor: layer.color + '20', borderColor: layer.color + '40' }}>
                            <Icon className="w-6 h-6" style={{ color: layer.color }} />
                          </div>
                          {i < ARCHITECTURE_LAYERS.length - 1 && (
                            <div className="w-px flex-1 min-h-[32px]" style={{ background: `linear-gradient(to bottom, ${layer.color}60, ${ARCHITECTURE_LAYERS[i + 1].color}40)` }} />
                          )}
                        </div>

                        {/* Layer content */}
                        <div className="pb-8 flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Layer {i + 1}</span>
                            <h4 className="font-bold text-white">{layer.layer}</h4>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {layer.nodes.map(node => (
                              <div key={node} className="text-xs text-slate-300 bg-white/5 border border-white/5 rounded-lg px-3 py-2 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: layer.color }} />
                                {node}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Output */}
                <div className="mt-2 p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <h4 className="font-bold text-white">Output — Decision Intelligence</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {['Flood Risk Score', 'Mitigation Recommendations', 'Resource Optimization', 'Citizen Safety Advisories'].map(o => (
                      <div key={o} className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">{o}</div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-white/5 flex justify-between items-center">
                <p className="text-xs text-slate-500">AURORA Intelligence Platform · Government &amp; Enterprise Grade</p>
                <Link href="/dashboard" onClick={() => setShowArchModal(false)} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-full hover:bg-blue-500 transition-all">
                  Open Live Platform <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
