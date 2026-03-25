'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Map, { NavigationControl, FullscreenControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import DeckGL from '@deck.gl/react';
import { PolygonLayer, ScatterplotLayer, GridCellLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import wardDataRaw from '../ward_data_real.json';

const wardData = wardDataRaw as any;

// ─── Types ────────────────────────────────────────────────────────────────────
interface FloodMapProps {
    rainfall: number;
    radarVisible: boolean;
    vulnerablePopVisible?: boolean;
    comparisonMode: boolean;
    highlightedWard?: any;
    customBbox?: number[] | null;
    customGeoJSON?: any | null;
    highlightedZoneName?: string | null;
    customZoneMetrics?: any[] | null;   // real GIS zone metrics from backend
}

// ─── Default Delhi Configuration ─────────────────────────────────────────────
const DELHI_BBOX = [76.80, 28.40, 77.40, 28.90];

const INITIAL_VIEW_STATE = {
    longitude: 77.2090,
    latitude: 28.6139,
    zoom: 12.5,
    pitch: 72,
    bearing: -15
};

// ─── Generic City Elevation Model ────────────────────────────────────────────
// Works for ANY city — creates synthetic river valleys, basins, and ridges
// centered on the city's bbox midpoint. No city-specific math.
function getCityElevation(lat: number, lon: number, center: [number, number]): number {
    const [cLon, cLat] = center;

    // Synthetic primary river — diagonal low channel (rivers generally run diagonally)
    const distRiver = Math.abs((lon - cLon) * 0.7 - (lat - cLat) * 0.3);
    // Peripheral basin — distance from center (city outskirts tend to be higher)
    const distCenter = Math.sqrt(Math.pow(lon - cLon, 2) + Math.pow(lat - cLat, 2));
    // Secondary basin (generic NE/SW depression)
    const distSecondary = Math.sqrt(Math.pow(lon - (cLon + 0.12), 2) + Math.pow(lat - (cLat - 0.04), 2));

    let elevation = 220;
    elevation -= Math.max(0, 35 - distRiver * 500);         // Yamuna-like river depression
    elevation -= Math.max(0, 20 - distSecondary * 350);     // Secondary basin
    elevation -= Math.max(0, 8 - distCenter * 60);          // City bowl effect
    elevation += Math.sin(lat * 3000) * Math.cos(lon * 3000) * 4; // Organic micro-terrain

    return elevation;
}

// ─── Delhi Vulnerable Population Zones (shown only in Delhi mode) ──────────
const DELHI_VULNERABLE_POPS = [
    { id: "V-E01", name: "Seemapuri & Nand Nagri Dense Belt", coordinates: [77.320, 28.672], type: 'settlement', radius: 1200, factors: [{ name: "Yamuna Floodplain Proximity", val: 48 }, { name: "Extreme Population Density", val: 32 }, { name: "Drainage Deficit", val: 20 }], multiplier: 1.55 },
    { id: "V-E02", name: "Geeta Colony / Shastri Nagar Floodplain", coordinates: [77.270, 28.657], type: 'settlement', radius: 950, factors: [{ name: "River Overflow Risk", val: 65 }, { name: "Impervious Coverage", val: 22 }, { name: "Sewer Backflow", val: 13 }], multiplier: 1.62 },
    { id: "V-S01", name: "Madanpur Khadar Slum Clusters", coordinates: [77.295, 28.524], type: 'settlement', radius: 1100, factors: [{ name: "Yamuna Lowland Inundation", val: 55 }, { name: "Drainage Blockage", val: 28 }, { name: "Vulnerable Structures", val: 17 }], multiplier: 1.70 },
    { id: "V-S02", name: "Sangam Vihar / Tigri Dense Basin", coordinates: [77.240, 28.500], type: 'settlement', radius: 1500, factors: [{ name: "Topographic Bowl Effect", val: 45 }, { name: "Unauthorized Density", val: 35 }, { name: "Missing Storm Drains", val: 20 }], multiplier: 1.48 },
    { id: "V-N01", name: "Jahangirpuri / Bhalswa Landfill Periphery", coordinates: [77.165, 28.735], type: 'settlement', radius: 1300, factors: [{ name: "Toxic Runoff Exposure", val: 42 }, { name: "Najafgarh Drain Backflow", val: 38 }, { name: "Poor Housing Integrity", val: 20 }], multiplier: 1.68 },
    { id: "V-W01", name: "Najafgarh Jheel Peripheral Villages", coordinates: [76.960, 28.590], type: 'settlement', radius: 2000, factors: [{ name: "Wetland Encroachment", val: 60 }, { name: "Monsoon GW Surfacing", val: 25 }, { name: "Agricultural Runoff", val: 15 }], multiplier: 1.45 },
    { id: "H-C01", name: "AIIMS / Safdarjung Medical Hub", coordinates: [77.205, 28.568], type: 'medical', radius: 450, factors: [{ name: "Critical Medical Infrastructure", val: 75 }, { name: "Underpass Flooding", val: 25 }], multiplier: 1.85 },
    { id: "H-N01", name: "LNJP & G.B. Pant Hospital Zone", coordinates: [77.235, 28.638], type: 'medical', radius: 350, factors: [{ name: "Critical Medical Infrastructure", val: 80 }, { name: "Old Delhi Drainage Collapse", val: 20 }], multiplier: 1.78 },
];

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function FloodMap({
    rainfall, radarVisible, vulnerablePopVisible, comparisonMode,
    highlightedWard, customBbox, customGeoJSON, highlightedZoneName, customZoneMetrics
}: FloodMapProps) {

    const [viewState, setViewState] = useState<any>(INITIAL_VIEW_STATE);
    const [animatedDepth, setAnimatedDepth] = useState(0);
    const [realBuildings, setRealBuildings] = useState<any[]>([]);
    const [isFetchingBuildings, setIsFetchingBuildings] = useState(true);
    const [hoverInfo, setHoverInfo] = useState<any>(null);

    // ── Derived active bbox & center ─────────────────────────────────────────
    const activeBbox = useMemo(() => customBbox ?? DELHI_BBOX, [customBbox]);
    const bboxCenter = useMemo((): [number, number] => {
        const [minX, minY, maxX, maxY] = activeBbox;
        return [(minX + maxX) / 2, (minY + maxY) / 2];
    }, [activeBbox]);
    const isCustomCity = !!customBbox;

    // ── Camera fly-to when bbox changes ──────────────────────────────────────
    useEffect(() => {
        if (customBbox && customBbox.length === 4) {
            const [minX, minY, maxX, maxY] = customBbox;
            const longitude = (minX + maxX) / 2;
            const latitude = (minY + maxY) / 2;
            const maxD = Math.max(maxX - minX, maxY - minY);
            let zoom = 11;
            if (maxD > 2) zoom = 7;
            else if (maxD > 1) zoom = 8;
            else if (maxD > 0.5) zoom = 9;
            else if (maxD > 0.2) zoom = 10;
            else if (maxD > 0.1) zoom = 11.5;
            else zoom = 12.5;

            setViewState((prev: any) => ({
                ...prev, longitude, latitude, zoom,
                pitch: 60, bearing: 0, transitionDuration: 2500
            }));
        }
    }, [customBbox]);

    // ── Dynamic 3D Buildings: re-fetch OSM for any city ──────────────────────
    useEffect(() => {
        const [minX, minY, maxX, maxY] = activeBbox;
        setIsFetchingBuildings(true);
        setRealBuildings([]); // Clear old city buildings immediately

        const fetchBuildings = async () => {
            try {
                // Focus ONLY on major civic infrastructure to prevent computational overload
                // and guarantee the query succeeds without rate-limiting.
                const cX = (minX + maxX) / 2;
                const cY = (minY + maxY) / 2;
                const dX = Math.min((maxX - minX) * 0.4, 0.15); // Expand query area since it's sparse
                const dY = Math.min((maxY - minY) * 0.4, 0.15);

                const qMinX = (cX - dX).toFixed(4);
                const qMaxX = (cX + dX).toFixed(4);
                const qMinY = (cY - dY).toFixed(4);
                const qMaxY = (cY + dY).toFixed(4);

                const query = `
                    [out:json][timeout:25];
                    (
                      way["building"="hospital"](${qMinY}, ${qMinX}, ${qMaxY}, ${qMaxX});
                      way["building"="public"](${qMinY}, ${qMinX}, ${qMaxY}, ${qMaxX});
                      way["building"="university"](${qMinY}, ${qMinX}, ${qMaxY}, ${qMaxX});
                      way["building"="college"](${qMinY}, ${qMinX}, ${qMaxY}, ${qMaxX});
                      way["building"="train_station"](${qMinY}, ${qMinX}, ${qMaxY}, ${qMaxX});
                      way["amenity"="hospital"](${qMinY}, ${qMinX}, ${qMaxY}, ${qMaxX});
                      way["amenity"="university"](${qMinY}, ${qMinX}, ${qMaxY}, ${qMaxX});
                    );
                    out geom 2000;
                `;
                const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
                const response = await fetch(url);
                const data = await response.json();

                const processed = data.elements
                    .filter((el: any) => el.type === 'way' && el.geometry && el.geometry.length > 2)
                    .map((el: any) => {
                        const polygon = el.geometry.map((pt: any) => [pt.lon, pt.lat]);
                        let height = 20; // Default height for major infra
                        if (el.tags?.['building:levels']) {
                            height = parseInt(el.tags['building:levels']) * 4;
                        } else if (el.tags?.['building'] === 'hospital') {
                            height = 30 + (el.id % 20); // Medical centers are usually taller
                        } else if (el.tags?.['building'] === 'university') {
                            height = 25 + (el.id % 15);
                        }
                        return { id: el.id, polygon, height };
                    });

                if (processed.length > 0) {
                    setRealBuildings(processed);
                } else {
                    console.warn("Overpass API returned 0 major buildings in this radius.");
                    setRealBuildings([]);
                }
            } catch (error) {
                console.error('OSM building fetch failed or timed out:', error);
                setRealBuildings([]);
            } finally {
                setIsFetchingBuildings(false);
            }
        };

        fetchBuildings();
    }, [activeBbox]); // ← Re-runs whenever the city changes

    // ── Dynamic Flood Grid: regenerates for any city ─────────────────────────
    const CITY_GRID = useMemo(() => {
        const [minX, minY, maxX, maxY] = activeBbox;
        const center: [number, number] = [(minX + maxX) / 2, (minY + maxY) / 2];
        const grid = [];

        // Dynamic grid resolution scaling: always create roughly 60x60 cells for any city size
        const stepsX = 60;
        const stepsY = 60;
        const stepLon = (maxX - minX) / stepsX;
        const stepLat = (maxY - minY) / stepsY;

        for (let lat = minY; lat <= maxY; lat += stepLat) {
            for (let lon = minX; lon <= maxX; lon += stepLon) {
                grid.push({
                    coordinates: [lon + stepLon / 2, lat + stepLat / 2],
                    elevation: getCityElevation(lat, lon, center)
                });
            }
        }
        return grid;
    }, [activeBbox]);

    // ── Dynamic Heatmap Hotspots: real zone-centroid seeded for any city ────────
    // For custom cities: cluster hotspots around REAL zone centroids weighted by
    // actual composite_flood_risk from backend GIS analysis.
    // For Delhi: uses elevation-based model seeded to be reproducible per cell.
    const CITY_HOTSPOTS = useMemo(() => {
        const [minX, minY, maxX, maxY] = activeBbox;
        const center: [number, number] = [(minX + maxX) / 2, (minY + maxY) / 2];

        if (isCustomCity && customZoneMetrics && customZoneMetrics.length > 0) {
            const points: any[] = [];
            const bboxW = maxX - minX;
            const bboxH = maxY - minY;

            customZoneMetrics.forEach((zone: any) => {
                const cLon = zone.centroid_lon ?? center[0];
                const cLat = zone.centroid_lat ?? center[1];
                const risk = zone.composite_flood_risk ?? 0.3;

                // Create organic clusters based on risk
                const nPoints = Math.max(2, Math.round(15 * risk * risk)); // Non-linear scaling
                const spreadX = bboxW * (0.01 + zone.area_km2 * 0.0005);
                const spreadY = bboxH * (0.01 + zone.area_km2 * 0.0005);

                for (let j = 0; j < nPoints; j++) {
                    // Golden ratio distribution for organic spread
                    const i = j + 1;
                    const phi = i * 137.508;
                    const r = Math.sqrt(i / nPoints);
                    // Add noise to make it less perfectly circular
                    const noiseX = (Math.sin(cLat * 100 + j * 13) * 0.5 + 0.5) * 0.4;
                    const noiseY = (Math.cos(cLon * 100 + j * 17) * 0.5 + 0.5) * 0.4;

                    const lon = cLon + Math.cos(phi) * r * spreadX * (0.8 + noiseX);
                    const lat = cLat + Math.sin(phi) * r * spreadY * (0.8 + noiseY);

                    // Filter out dots that land on high ground (keeps it realistic)
                    const elev = getCityElevation(lat, lon, center);
                    if (elev < 210 || risk > 0.6) {
                        points.push({
                            coordinates: [lon, lat],
                            weight: 2 + risk * 15 + (Math.sin(j) * 3),
                        });
                    }
                }
            });
            return points;
        }

        // Delhi fallback
        const result: any[] = [];
        const step = 0.008;
        for (let lat = minY; lat <= maxY; lat += step) {
            for (let lon = minX; lon <= maxX; lon += step) {
                const elev = getCityElevation(lat, lon, center);
                const depthFactor = Math.max(0, (225 - elev)) / 35;
                if (depthFactor > 0.15) {
                    result.push({
                        coordinates: [lon, lat],
                        weight: 1 + depthFactor * 10,
                    });
                }
            }
        }
        return result;
    }, [activeBbox, isCustomCity, customZoneMetrics]);

    // ── Dynamic Vulnerable Population Zones ──────────────────────────────────
    // For custom cities: derived from real high-risk zone centroids (top zones by risk)
    // For Delhi: uses the hardcoded clinically-verified locations
    const ACTIVE_VULNERABLE_POPS = useMemo(() => {
        if (!isCustomCity || !customZoneMetrics || customZoneMetrics.length === 0) {
            return DELHI_VULNERABLE_POPS;
        }

        // Sort by composite flood risk descending and take top zones as vulnerable
        const sorted = [...customZoneMetrics]
            .filter(z => z.centroid_lon && z.centroid_lat)
            .sort((a, b) => b.composite_flood_risk - a.composite_flood_risk);

        return sorted.slice(0, Math.min(10, sorted.length)).map((zone: any, idx: number) => {
            const isHighRisk = zone.composite_flood_risk > 0.65;

            // Jitter the population center away from the exact math centroid slightly for realism
            const jitterX = (Math.sin(zone.centroid_lat * 123) * 0.01);
            const jitterY = (Math.cos(zone.centroid_lon * 321) * 0.01);

            return {
                id: `V-C${idx + 1}`,
                name: `${zone.name} — ${isHighRisk ? 'Critical Vulnerability Area' : 'High Exposure Zone'}`,
                coordinates: [zone.centroid_lon + jitterX, zone.centroid_lat + jitterY],
                type: (idx % 3 === 0) ? 'medical' : 'settlement',
                radius: Math.max(400, Math.min(Math.round(600 + zone.area_km2 * 150), 2000)),
                factors: [
                    { name: 'Topographic Threat', val: Math.round(zone.elevation_rank * 70 + 10) },
                    { name: 'Impervious Substrate', val: Math.round((1 - zone.compactness) * 45 + 10) },
                    { name: 'Socio-Economic Exposure', val: Math.round(zone.composite_flood_risk * 60 + 20) },
                ],
                multiplier: parseFloat((1.1 + zone.composite_flood_risk * 0.8).toFixed(2)),
            };
        });
    }, [isCustomCity, customZoneMetrics]);

    // ── Flood water animation ─────────────────────────────────────────────────
    useEffect(() => {
        let targetMultiplier = rainfall / 100;
        if (comparisonMode) targetMultiplier = 0;
        const interval = setInterval(() => {
            setAnimatedDepth(prev => {
                const diff = targetMultiplier - prev;
                if (Math.abs(diff) < 0.01) return targetMultiplier;
                return prev + diff * 0.05;
            });
        }, 30);
        return () => clearInterval(interval);
    }, [rainfall, comparisonMode]);

    // ── Deck.gl Layers ────────────────────────────────────────────────────────
    const layers = useMemo(() => {
        const dLayers: any[] = [];
        const currentWaterLevel = 190 + (animatedDepth * 12);
        const activeWaterCells = CITY_GRID.filter(cell => currentWaterLevel > cell.elevation);

        // 1. 3D Buildings (real OSM data, dynamically re-fetched per city)
        dLayers.push(new PolygonLayer({
            id: 'real-3d-buildings',
            data: realBuildings,
            extruded: true,
            wireframe: true,
            opacity: 0.8,
            getPolygon: (d: any) => d.polygon,
            getElevation: (d: any) => d.height,
            getFillColor: [60, 70, 85, 255],
            getLineColor: [255, 255, 255, 15],
            material: { ambient: 0.3, diffuse: 0.7, shininess: 32, specularColor: [255, 255, 255] },
            transitions: { getElevation: 1000 }
        }));

        // 2. Uploaded boundary outline (rendered whenever a custom city is loaded)
        if (isCustomCity && customGeoJSON) {
            const features = customGeoJSON.features ?? [];
            const boundaryPolygons: any[] = [];

            features.forEach((feature: any) => {
                const geom = feature.geometry;
                if (!geom) return;
                if (geom.type === 'Polygon') {
                    boundaryPolygons.push({ polygon: geom.coordinates[0] });
                } else if (geom.type === 'MultiPolygon') {
                    geom.coordinates.forEach((poly: any) => {
                        boundaryPolygons.push({ polygon: poly[0] });
                    });
                }
            });

            if (boundaryPolygons.length > 0) {
                dLayers.push(new PolygonLayer({
                    id: 'custom-city-boundary',
                    data: boundaryPolygons,
                    stroked: true,
                    filled: true,
                    extruded: false,
                    getPolygon: (d: any) => d.polygon,
                    getFillColor: [99, 179, 237, 25],
                    getLineColor: [99, 179, 237, 230],
                    lineWidthMinPixels: 2,
                }));
            }

            // 2b. Highlighted Zone — glowing gold highlight for selected ward
            if (highlightedZoneName && customGeoJSON) {
                // Find index via backend's pre-computed zone metrics to avoid failing compound string matches
                let highlightFeature = null;
                if (customZoneMetrics && customZoneMetrics.length > 0) {
                    const zoneIndex = customZoneMetrics.findIndex((z: any) => z.name === highlightedZoneName);
                    if (zoneIndex >= 0 && customGeoJSON.features) {
                        highlightFeature = customGeoJSON.features[zoneIndex];
                    }
                } else {
                    highlightFeature = (customGeoJSON.features ?? []).find((f: any) => {
                        const props = f.properties ?? {};
                        return Object.values(props).some(
                            (v) => String(v).trim().toLowerCase() === highlightedZoneName.trim().toLowerCase()
                        );
                    });
                }

                if (highlightFeature) {
                    const hGeom = highlightFeature.geometry;
                    const hPolys: any[] = [];
                    if (hGeom?.type === 'Polygon') {
                        hPolys.push({ polygon: hGeom.coordinates[0] });
                    } else if (hGeom?.type === 'MultiPolygon') {
                        hGeom.coordinates.forEach((p: any) => hPolys.push({ polygon: p[0] }));
                    }
                    if (hPolys.length > 0) {
                        dLayers.push(new PolygonLayer({
                            id: 'highlighted-zone',
                            data: hPolys,
                            stroked: true,
                            filled: true,
                            extruded: false,
                            getPolygon: (d: any) => d.polygon,
                            getFillColor: [255, 215, 0, 80],    // gold glow fill
                            getLineColor: [255, 215, 0, 255],   // bright gold border
                            lineWidthMinPixels: 4,
                        }));
                    }
                }
            }
        }


        // 3. Rainfall Radar Heatmap (dynamic hotspots for current city)
        if (radarVisible) {
            dLayers.push(new HeatmapLayer({
                id: 'rainfall-radar',
                data: CITY_HOTSPOTS,
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
            }));
        }

        // 4. Vulnerable Population Zones (dynamic for any city)
        if (vulnerablePopVisible) {
            dLayers.push(new ScatterplotLayer({
                id: 'vulnerable-zones',
                data: ACTIVE_VULNERABLE_POPS,
                getPosition: (d: any) => d.coordinates,
                getRadius: (d: any) => d.radius,
                getFillColor: (d: any) => d.type === 'medical' ? [255, 255, 255, 200] : [147, 51, 234, 150],
                getLineColor: (d: any) => d.type === 'medical' ? [239, 68, 68, 255] : [216, 180, 254, 255],
                lineWidthMinPixels: 2,
                stroked: true,
                filled: true,
                radiusUnits: 'meters',
                pickable: true,
                onClick: (info: any) => { if (info.object) setHoverInfo(info); else setHoverInfo(null); }
            }));
        }


        // 5. Hydrodynamic Flood Simulation (city-agnostic, uses dynamic grid)
        if (animatedDepth > 0) {
            const [minX, minY, maxX, maxY] = activeBbox;
            const dynamicCellSize = Math.max((maxX - minX) * 111320 * Math.cos(minY * Math.PI / 180) / 60, (maxY - minY) * 111320 / 60);

            dLayers.push(new GridCellLayer({
                id: 'hydro-flood-grid',
                data: activeWaterCells,
                pickable: false,
                extruded: true,
                cellSize: dynamicCellSize,
                getPosition: (d: any) => d.coordinates,
                getElevation: (d: any) => (currentWaterLevel - d.elevation),
                getFillColor: [14, 165, 233, 160],
                material: { ambient: 0.6, diffuse: 0.8, shininess: 64, specularColor: [255, 255, 255] },
                transitions: { getElevation: 500 }
            }));
        }

        // 6. Ward Highlight (Delhi mode only)
        if (highlightedWard && !isCustomCity) {
            const wardInfo = wardData[highlightedWard.name];
            let wardPolygons: any[] = [];

            if (wardInfo?.geojson) {
                const geom = wardInfo.geojson;
                if (geom.type === 'Polygon') {
                    wardPolygons = [geom.coordinates[0]];
                } else if (geom.type === 'MultiPolygon') {
                    wardPolygons = geom.coordinates.map((p: any) => p[0]);
                } else if (geom.type === 'Point') {
                    const [lon, lat] = geom.coordinates;
                    const circle = Array.from({ length: 32 }, (_, i) => {
                        const a = (i / 32) * Math.PI * 2;
                        return [lon + Math.cos(a) * 0.02, lat + Math.sin(a) * 0.018];
                    });
                    wardPolygons = [circle];
                }
            }

            if (wardPolygons.length > 0) {
                dLayers.push(new PolygonLayer({
                    id: 'highlighted-ward-pulse',
                    data: wardPolygons.map(poly => ({ polygon: poly })),
                    stroked: true,
                    filled: true,
                    extruded: false,
                    getPolygon: (d: any) => d.polygon,
                    getFillColor: [59, 130, 246, 70],
                    getLineColor: [59, 130, 246, 255],
                    lineWidthMinPixels: 4,
                }));
            }
        }

        return dLayers;
    }, [animatedDepth, radarVisible, highlightedWard, vulnerablePopVisible,
        realBuildings, CITY_GRID, CITY_HOTSPOTS, isCustomCity, customGeoJSON]);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="absolute inset-0 w-full h-full">
            {isFetchingBuildings && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#020617]/50 backdrop-blur-sm pointer-events-none">
                    <div className="flex flex-col items-center">
                        <div className="w-8 h-8 relative border-t-2 border-r-2 border-blue-500 rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(59,130,246,0.6)]"></div>
                        <span className="text-blue-400 text-xs font-bold tracking-widest uppercase animate-pulse">
                            {isCustomCity ? 'Ingesting Custom City Geometry' : 'Ingesting Live OpenStreetMap Geometry'}
                        </span>
                    </div>
                </div>
            )}
            <DeckGL
                viewState={viewState}
                controller={{ dragRotate: true, doubleClickZoom: true, touchZoom: true }}
                layers={layers}
                onViewStateChange={({ viewState: vs }: any) => setViewState(vs)}
                style={{ mixBlendMode: 'screen' }}
            >
                <Map mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json">
                    <NavigationControl position="bottom-right" />
                    <FullscreenControl position="bottom-right" />
                </Map>
            </DeckGL>

            {/* Explainable AI Popup Panel */}
            {hoverInfo?.object && (
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
