'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Map, { NavigationControl, FullscreenControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import DeckGL from '@deck.gl/react';
import { PolygonLayer, ScatterplotLayer, GridCellLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import wardDataRaw from '../ward_data_real.json';

const wardData = wardDataRaw as any;

interface FloodMapProps {
    rainfall: number;
    radarVisible: boolean;
    vulnerablePopVisible?: boolean;
    comparisonMode: boolean;
    highlightedWard?: any;
}

// Delhi: Centered on ITO / Central Delhi (Yamuna riverbank area)
const INITIAL_VIEW_STATE = {
    longitude: 77.2090,
    latitude: 28.6139,
    zoom: 12.5,
    pitch: 72,
    bearing: -15
};

//its  Generates realistic micro-hotspots clustered around Delhi's entire topography, ye heavily bias hai towards low-elevation bowls
const MOCK_HOTSPOTS = Array.from({ length: 1500 }).map(() => {
    const lon = 76.85 + Math.random() * 0.50;
    const lat = 28.45 + Math.random() * 0.40;

    // Weight the intensity based on physical topography (water flows downhill)
    // The deeper the basin, the higher the hotspot intensity
    const elev = getDelhiElevation(lat, lon);
    const depthWeight = Math.max(0, 225 - elev) / 10;

    return {
        coordinates: [lon, lat],
        weight: (Math.random() * 3) + depthWeight * 8
    };
});

// Procedural GIS Topography Model for Delhi NCT
// Creates an organic, mathematical heightmap across the city simulating basins and ridges.
function getDelhiElevation(lat: number, lon: number): number {
    // Distance from Yamuna River (snaking diagonally) this formula calc gthe distance of hotspot points from river
    const distYamuna = Math.abs(lon - (77.26 - (lat - 28.60) * 0.15));
    // Distance from Najafgarh Jheel (SW depression basin)
    const distNajafgarh = Math.sqrt(Math.pow(lon - 76.95, 2) + Math.pow(lat - 28.58, 2));
    // Distance from Shahdara/East Delhi bowl
    const distShahdara = Math.sqrt(Math.pow(lon - 77.31, 2) + Math.pow(lat - 28.66, 2));

    let elevation = 220; // Average baseline height in meters(in delhi)

    // Excavate the valleys and basins
    elevation -= Math.max(0, 35 - distYamuna * 400); // Deep Yamuna channel
    elevation -= Math.max(0, 25 - distNajafgarh * 350); // Najafgarh drain sinking
    elevation -= Math.max(0, 30 - distShahdara * 400); // East Delhi bowl

    // Add organic noise for neighborhood-level waterlogging pockets
    elevation += Math.sin(lat * 3000) * Math.cos(lon * 3000) * 4;

    return elevation;
}

// ye generate krega high-resolution 10,000+ cellmesh puri city mein
const DELHI_GRID = (() => {
    const grid = [];
    for (let lat = 28.40; lat <= 28.90; lat += 0.005) {
        for (let lon = 76.80; lon <= 77.40; lon += 0.005) {
            grid.push({
                coordinates: [lon, lat],
                elevation: getDelhiElevation(lat, lon)
            });
        }
    }
    return grid;
})();

// Delhi Vulnerable Population Zones based on real Authentic City-Wide Distribution
const VULNERABLE_POPS = [
    // East Delhi / Trans-Yamuna
    {
        id: "V-E01", name: "Seemapuri & Nand Nagri Dense Belt", coordinates: [77.320, 28.672], type: 'settlement', radius: 1200,
        factors: [{ name: "Yamuna Floodplain Proximity", val: 48 }, { name: "Extreme Population Density", val: 32 }, { name: "Drainage Deficit", val: 20 }],
        multiplier: 1.55
    },
    {
        id: "V-E02", name: "Geeta Colony / Shastri Nagar Floodplain", coordinates: [77.270, 28.657], type: 'settlement', radius: 950,
        factors: [{ name: "River Overflow Risk", val: 65 }, { name: "Impervious Concrete Coverage", val: 22 }, { name: "Sewer Backflow", val: 13 }],
        multiplier: 1.62
    },

    // South / South-East Delhi
    {
        id: "V-S01", name: "Madanpur Khadar Slum Clusters", coordinates: [77.295, 28.524], type: 'settlement', radius: 1100,
        factors: [{ name: "Yamuna Lowland Inundation", val: 55 }, { name: "Solid Waste Drainage Blockage", val: 28 }, { name: "Vulnerable Structures", val: 17 }],
        multiplier: 1.70
    },
    {
        id: "V-S02", name: "Sangam Vihar / Tigri Dense Basin", coordinates: [77.240, 28.500], type: 'settlement', radius: 1500,
        factors: [{ name: "Topographic Bowl Effect", val: 45 }, { name: "Unauthorized Density", val: 35 }, { name: "Missing Storm Drains", val: 20 }],
        multiplier: 1.48
    },

    // North / North-West Delhi
    {
        id: "V-N01", name: "Jahangirpuri / Bhalswa Landfill Periphery", coordinates: [77.165, 28.735], type: 'settlement', radius: 1300,
        factors: [{ name: "Toxic Runoff Exposure", val: 42 }, { name: "Najafgarh Drain Backflow", val: 38 }, { name: "Poor Housing Integrity", val: 20 }],
        multiplier: 1.68
    },
    {
        id: "V-N02", name: "Kirari Suleman Nagar / Nithari", coordinates: [77.060, 28.690], type: 'settlement', radius: 1600,
        factors: [{ name: "Severe Waterlogging History", val: 50 }, { name: "No Primary Drain Access", val: 30 }, { name: "Low Pumping Capacity", val: 20 }],
        multiplier: 1.52
    },

    // West / South-West Delhi
    {
        id: "V-W01", name: "Najafgarh Jheel Peripheral Villages", coordinates: [76.960, 28.590], type: 'settlement', radius: 2000,
        factors: [{ name: "Natural Wetland Encroachment", val: 60 }, { name: "Monsoon Groundwater Surfacing", val: 25 }, { name: "Agricultural Runoff", val: 15 }],
        multiplier: 1.45
    },
    {
        id: "V-W02", name: "Uttam Nagar / Bindapur Gridlock", coordinates: [77.060, 28.620], type: 'settlement', radius: 1100,
        factors: [{ name: "Extreme Urban Sealing (98%)", val: 45 }, { name: "Drainage Capacity Exceeded", val: 40 }, { name: "High Commuter Trapping", val: 15 }],
        multiplier: 1.35
    },

    // Critical/ya main Infrastructure jo display krenge hum
    {
        id: "H-C01", name: "AIIMS / Safdarjung Medical Hub", coordinates: [77.205, 28.568], type: 'medical', radius: 450,
        factors: [{ name: "Critical Medical Infrastructure", val: 75 }, { name: "Local Underpass Flooding", val: 25 }],
        multiplier: 1.85
    },
    {
        id: "H-N01", name: "LNJP & G.B. Pant Hospital Zone", coordinates: [77.235, 28.638], type: 'medical', radius: 350,
        factors: [{ name: "Critical Medical Infrastructure", val: 80 }, { name: "Old Delhi Drainage Collapse", val: 20 }],
        multiplier: 1.78
    },
    {
        id: "T-01", name: "Kashmere Gate ISBT & Metro Hub", coordinates: [77.228, 28.667], type: 'medical', radius: 500, // Reusing medical color for critical infra
        factors: [{ name: "Mass Transit Lifeline", val: 65 }, { name: "Yamuna Proximity", val: 35 }],
        multiplier: 1.65
    }
];

// Actual Geographic Centers for Delhi's 12 MCD District Zones { Key Ward Areas}
const REAL_WARD_CENTERS: Record<string, [number, number]> = {
    "Ward A": [77.2310, 28.6618], // Civil Lines / North Delhi
    "Ward B": [77.2219, 28.6862], // Model Town / Burari
    "Ward C": [77.1025, 28.6836], // Rohini / Bawana
    "Ward D": [77.0776, 28.6279], // Dwarka / Najafgarh
    "Ward E": [77.1855, 28.6139], // Karol Bagh / Patel Nagar
    "Ward F-North": [77.2090, 28.6562], // Old Delhi / Chandni Chowk
    "Ward F-South": [77.2311, 28.6356], // Connaught Place / ITO
    "Ward G-North": [77.2538, 28.6775], // Shahdara / Vivek Vihar
    "Ward G-South": [77.2956, 28.6480], // East Delhi / Patparganj
    "Ward H-East": [77.3197, 28.6370], // Kondli / Gharoli
    "Ward H-West": [77.3450, 28.6620], // Seemapuri / Mustafabad
    "Ward K-East": [77.2513, 28.5921], // Lajpat Nagar / Okhla
    "Ward K-West": [77.2090, 28.5744], // Saket / Malviya Nagar
    "Ward L": [77.1734, 28.5355], // Mehrauli / Chattarpur
    "Ward M-East": [77.2950, 28.5350], // Jasola / Madanpur Khadar
    "Ward M-West": [77.2410, 28.5500], // New Friends Colony / Badarpur  
    "Ward N": [77.2800, 28.5670], // Kalindi Kunj / Jaitpur
    "Ward P-North": [77.1300, 28.7150], // Bawana / Narela
    "Ward P-South": [77.1550, 28.6850], // Sultanpuri / Mangolpuri
    "Ward R-Central": [77.1890, 28.7300], // Alipur / Timarpur
    "Ward R-North": [77.1600, 28.7550], // Burari / Mukherjee Nagar (North)
    "Ward R-South": [77.2100, 28.7100], // Shalimar Bagh / Tri Nagar
    "Ward S": [77.3650, 28.6850], // Mustafabad / Karawal Nagar
    "Ward T": [77.3200, 28.7100], // Babarpur / Gokulpuri
};

export default function FloodMap({ rainfall, radarVisible, vulnerablePopVisible, comparisonMode, highlightedWard }: FloodMapProps) {
    const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
    const [animatedDepth, setAnimatedDepth] = useState(0);
    const [realBuildings, setRealBuildings] = useState<any[]>([]);
    const [isFetchingBuildings, setIsFetchingBuildings] = useState(true);
    const [hoverInfo, setHoverInfo] = useState<any>(null);

    // Fetch REAL building footprints from OpenStreetMap Overpass API — Delhi Central / ITO zone
    useEffect(() => {
        const fetchRealBuildings = async () => {
            try {
                // Querying Entire Delhi Bounding Box (Southwest to Northeast)
                // Using specific building types ensures we get sparse, large infrastructure spanning the entire city, rather than clustering at the 10,000 limit limit.
                const query = `
                    [out:json][timeout:25];
                    (
                      way["building"="commercial"](28.400, 76.800, 28.900, 77.350);
                      way["building"="hospital"](28.400, 76.800, 28.900, 77.350);
                      way["building"="industrial"](28.400, 76.800, 28.900, 77.350);
                      way["building"="apartments"](28.400, 76.800, 28.900, 77.350);
                      way["amenity"="hospital"](28.400, 76.800, 28.900, 77.350);
                      way["amenity"="university"](28.400, 76.800, 28.900, 77.350);
                      way["amenity"="school"](28.400, 76.800, 28.900, 77.350);
                    );
                    out geom 10000;
                `;
                const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
                const response = await fetch(url);
                const data = await response.json();

                const processedBuildings = data.elements
                    .filter((el: any) => el.type === 'way' && el.geometry && el.geometry.length > 2)
                    .map((el: any) => {
                        const polygon = el.geometry.map((pt: any) => [pt.lon, pt.lat]);

                        // Parse real building:levels if available in OSM.
                        // Falls back to deterministic pseudo-height based on ID — models Delhi's skyline diversity.
                        let height = 12; // Base height (approx 3 stories)
                        if (el.tags && el.tags['building:levels']) {
                            height = parseInt(el.tags['building:levels']) * 4; // 4m per level
                        } else {
                            // Deterministic height variation based on building ID
                            const pseudoRandom = (el.id % 100) / 100;
                            height = 12 + Math.pow(pseudoRandom, 3) * 80;
                        }

                        return {
                            id: el.id,
                            polygon: polygon,
                            height: height
                        };
                    });

                setRealBuildings(processedBuildings);
            } catch (error) {
                console.error("Error fetching real OSM buildings:", error);
            } finally {
                setIsFetchingBuildings(false);
            }
        };

        fetchRealBuildings();
    }, []);

    // Smooth transition for Yamuna floodwater rising simulation
    useEffect(() => {
        // Dynamic rainfall-to-depth mapping: 100mm → 1.0, 250mm → 2.5, 500mm → 5.0
        let targetMultiplier = rainfall / 100;

        // If in "before" mode during comparison, drop water to 0
        if (comparisonMode) targetMultiplier = 0;

        const interval = setInterval(() => {
            setAnimatedDepth(prev => {
                const diff = targetMultiplier - prev;
                if (Math.abs(diff) < 0.01) return targetMultiplier;
                return prev + diff * 0.05; // Ease factor
            });
        }, 30);

        return () => clearInterval(interval);
    }, [rainfall, comparisonMode]);

    const layers = useMemo(() => {
        const dLayers = [];

        // 0. Compute dynamically flooding cells based on rainfall-driven water level
        // Base elevation in Delhi is ~220m. We start the floodwater table at 190m (Yamuna bottom) and rise.
        const currentWaterLevel = 190 + (animatedDepth * 12);
        const activeWaterCells = DELHI_GRID.filter(cell => currentWaterLevel > cell.elevation);

        // 1. Base 3D Building Layer — Real Delhi OSM footprints
        dLayers.push(
            new PolygonLayer({
                id: 'real-3d-buildings',
                data: realBuildings,
                extruded: true,
                wireframe: true,
                opacity: 0.8,
                getPolygon: (d: any) => d.polygon,
                getElevation: (d: any) => d.height,
                getFillColor: [60, 70, 85, 255],
                getLineColor: [255, 255, 255, 15],
                material: {
                    ambient: 0.3,
                    diffuse: 0.7,
                    shininess: 32,
                    specularColor: [255, 255, 255]
                },
                transitions: {
                    getElevation: 1000
                }
            })
        );

        // 2. Radar Heatmap Layer — Delhi rainfall intensity distribution
        if (radarVisible) {
            dLayers.push(
                new HeatmapLayer({
                    id: 'rainfall-radar',
                    data: MOCK_HOTSPOTS,
                    getPosition: (d: any) => d.coordinates,
                    getWeight: (d: any) => d.weight,
                    radiusPixels: 45,
                    intensity: 1.5,
                    threshold: 0.1,
                    colorRange: [
                        [59, 130, 246, 0],
                        [16, 185, 129, 100],
                        [245, 158, 11, 150],
                        [239, 68, 68, 220]
                    ]
                })
            );
        }

        // 3. Vulnerable Population Layer — Delhi unauthorized colonies and critical infrastructure
        if (vulnerablePopVisible) {
            dLayers.push(
                new ScatterplotLayer({
                    id: 'vulnerable-zones',
                    data: VULNERABLE_POPS,
                    getPosition: (d: any) => d.coordinates,
                    getRadius: (d: any) => d.radius,
                    getFillColor: (d: any) => d.type === 'medical' ? [255, 255, 255, 200] : [147, 51, 234, 150],
                    getLineColor: (d: any) => d.type === 'medical' ? [239, 68, 68, 255] : [216, 180, 254, 255],
                    lineWidthMinPixels: 2,
                    stroked: true,
                    filled: true,
                    radiusUnits: 'meters',
                    pickable: true,
                    onClick: (info) => {
                        if (info.object) setHoverInfo(info);
                        else setHoverInfo(null);
                    }
                })
            );
        }

        // 4. 3D Hydrodynamic Flood Simulation Layer (Procedural Topography Grid)
        if (animatedDepth > 0) {
            dLayers.push(
                new GridCellLayer({
                    id: 'hydro-flood-grid',
                    data: activeWaterCells,
                    pickable: false,
                    extruded: true,
                    cellSize: 450, // 450x450 meter resolution grid
                    getPosition: (d: any) => d.coordinates,
                    getElevation: (d: any) => (currentWaterLevel - d.elevation), // Flood depth
                    getFillColor: [14, 165, 233, 160], // Deep floodwater blue
                    material: {
                        ambient: 0.6,
                        diffuse: 0.8,
                        shininess: 64,
                        specularColor: [255, 255, 255]
                    },
                    transitions: {
                        getElevation: 500
                    }
                })
            );
        }

        // 5. Highlighted Ward Layer (from Analytics Panel) — Delhi ward boundary highlight
        if (highlightedWard) {
            const wardInfo = wardData[highlightedWard.name];

            let wardPolygons: any[] = [];

            if (wardInfo && wardInfo.geojson) {
                if (wardInfo.geojson.type === 'Polygon') {
                    wardPolygons = [wardInfo.geojson.coordinates[0]];
                } else if (wardInfo.geojson.type === 'MultiPolygon') {
                    wardPolygons = wardInfo.geojson.coordinates.map((poly: any) => poly[0]);
                } else if (wardInfo.geojson.type === 'Point') {
                    // Generate a realistic bounding radius
                    const [lon, lat] = wardInfo.geojson.coordinates;
                    const radius = 0.02; // ~2km
                    const circle = [];
                    for (let i = 0; i < 32; i++) {
                        const angle = (i / 32) * Math.PI * 2;
                        circle.push([lon + Math.cos(angle) * radius, lat + Math.sin(angle) * radius * 0.9]);
                    }
                    wardPolygons = [circle];
                }
            } else {
                // Fallback for missing wards (e.g., Darya Ganj)
                const fallbackCenters: Record<string, [number, number]> = {
                    "Ward Darya Ganj": [77.2405, 28.6430]
                };
                const center = fallbackCenters[highlightedWard.name];
                if (center) {
                    const [lon, lat] = center;
                    const radius = 0.015;
                    const circle = [];
                    for (let i = 0; i < 32; i++) {
                        const angle = (i / 32) * Math.PI * 2;
                        circle.push([lon + Math.cos(angle) * radius, lat + Math.sin(angle) * radius * 0.9]);
                    }
                    wardPolygons = [circle];
                }
            }

            if (wardPolygons.length > 0) {
                const polygonData = wardPolygons.map(poly => ({ polygon: poly }));

                dLayers.push(
                    new PolygonLayer({
                        id: 'highlighted-ward-pulse',
                        data: polygonData,
                        stroked: true,
                        filled: true,
                        extruded: false,
                        wireframe: true,
                        getPolygon: (d: any) => d.polygon,
                        getFillColor: [59, 130, 246, 70],
                        getLineColor: [59, 130, 246, 255],
                        lineWidthMinPixels: 4,
                        lineDashJustified: true,
                    })
                );
            }
        }

        return dLayers;
    }, [animatedDepth, radarVisible, highlightedWard, vulnerablePopVisible, realBuildings]);

    return (
        <div className="absolute inset-0 w-full h-full">
            {isFetchingBuildings && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#020617]/50 backdrop-blur-sm pointer-events-none">
                    <div className="flex flex-col items-center">
                        <div className="w-8 h-8 relative border-t-2 border-r-2 border-blue-500 rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(59,130,246,0.6)]"></div>
                        <span className="text-blue-400 text-xs font-bold tracking-widest uppercase animate-pulse">
                            Ingesting Live OpenStreetMap Geometry
                        </span>
                    </div>
                </div>
            )}
            <DeckGL
                initialViewState={INITIAL_VIEW_STATE}
                controller={{ dragRotate: true, doubleClickZoom: true, touchZoom: true }}
                layers={layers}
                onViewStateChange={({ viewState }: any) => setViewState(viewState)}
                style={{ mixBlendMode: 'screen' }}
            >
                <Map
                    mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
                >
                    <NavigationControl position="bottom-right" />
                    <FullscreenControl position="bottom-right" />
                </Map>
            </DeckGL>

            {/* Explainable AI Popup Panel */}
            {hoverInfo && hoverInfo.object && (
                <div
                    className="absolute z-50 pointer-events-none"
                    style={{ left: hoverInfo.x + 15, top: hoverInfo.y + 15 }}
                >
                    <div className="glass-panel border-l-4 border-l-purple-500 bg-slate-900/90 backdrop-blur-md p-4 rounded-xl shadow-[0_0_30px_rgba(147,51,234,0.3)] w-[260px]">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <p className="text-[10px] text-purple-400 font-bold tracking-widest uppercase">Cluster ID: {hoverInfo.object.id}</p>
                                <h3 className="text-sm font-bold text-white">{hoverInfo.object.name}</h3>
                            </div>
                        </div>

                        <div className="mt-3 space-y-2">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-white/10 pb-1">Vulnerability Factors</p>
                            {hoverInfo.object.factors.map((f: any, i: number) => (
                                <div key={i} className="flex justify-between items-center text-xs">
                                    <span className="text-slate-300">{f.name}</span>
                                    <span className="text-red-400 font-mono font-bold">{f.val}%</span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center bg-purple-500/10 -mx-4 -mb-4 p-3 rounded-b-xl border-t-purple-500/30">
                            <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider">Risk Multiplier</span>
                            <span className="text-sm font-bold text-white">{hoverInfo.object.multiplier}x</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
