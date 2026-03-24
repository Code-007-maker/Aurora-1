from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict
import numpy as np
import xgboost as xgb
from sklearn.cluster import DBSCAN
from routers.features import NormalizedFeatures

router = APIRouter(prefix="/api/ml", tags=["Flood Risk Prediction"])


# -----------------------------
# RESPONSE MODELS
# -----------------------------

class FloodRiskResult(BaseModel):
    grid_id: str
    flood_probability_score: float


class WardRiskResult(BaseModel):
    ward_id: str
    aggregate_risk_score: float


class PredictionResponse(BaseModel):
    grid_scores: List[FloodRiskResult]
    ward_scores: List[WardRiskResult]
    hotspot_clusters: int
    explainability: Dict[str, float]


# -----------------------------
# LOAD MODEL (IMPORTANT)
# -----------------------------

model = xgb.XGBClassifier()
model.load_model("flood_model.json")


# -----------------------------
# MAIN API
# -----------------------------

@router.post("/predict_risk", response_model=PredictionResponse)
async def predict_flood_risk(features: List[NormalizedFeatures]):

    grid_scores = []
    high_risk_coords = []

    for idx, feature in enumerate(features):

        # -----------------------------
        # ML INPUT (MATCH TRAINING)
        # -----------------------------
        X = [[
            feature.elevation_score,
            feature.slope_gradient,
            feature.drainage_proximity_index,
            feature.impervious_surface_ratio,
            feature.rainfall_intensity_index,
            feature.capacity_exceedance_ratio
        ]]

        # -----------------------------
        # ML PREDICTION
        # -----------------------------
        try:
            ml_prob = model.predict_proba(X)[0][1]
        except Exception:
            ml_prob = 0.5  # fallback

        # -----------------------------
        # HYBRID MODEL
        # -----------------------------
        final_risk = (
            0.8 * feature.capacity_exceedance_ratio +   # physics
            0.2 * ml_prob                              # ML
        )

        final_risk = min(max(final_risk, 0.0), 1.0)

        # -----------------------------
        # STORE RESULT
        # -----------------------------
        grid_scores.append(
            FloodRiskResult(
                grid_id=feature.grid_id,
                flood_probability_score=round(final_risk, 4)
            )
        )

        # -----------------------------
        # CLUSTERING INPUT
        # -----------------------------
        if final_risk > 0.7:
            high_risk_coords.append([idx % 100, idx // 100])

    # -----------------------------
    # DBSCAN CLUSTERING
    # -----------------------------
    num_clusters = 0
    if len(high_risk_coords) > 0:
        X_cluster = np.array(high_risk_coords)
        clustering = DBSCAN(eps=3, min_samples=2).fit(X_cluster)
        num_clusters = len(set(clustering.labels_)) - (1 if -1 in clustering.labels_ else 0)

    # -----------------------------
    # WARD AGGREGATION
    # -----------------------------
    avg_risk = (
        sum(g.flood_probability_score for g in grid_scores) / len(grid_scores)
        if grid_scores else 0
    )

    ward_scores = [
        WardRiskResult(
            ward_id="ward_1",
            aggregate_risk_score=round(avg_risk, 4)
        )
    ]

    # -----------------------------
    # EXPLAINABILITY (FIXED)
    # -----------------------------
    explainability = {
        "physics_weight": 0.8,
        "ml_weight": 0.2,
        "dominant_feature": "capacity_exceedance_ratio"
    }
    print("ML Prob:", ml_prob)
    print("Physics:", feature.capacity_exceedance_ratio)

    return PredictionResponse(
        grid_scores=grid_scores,
        ward_scores=ward_scores,
        hotspot_clusters=num_clusters,
        explainability=explainability
    )