# AURORA — AI Urban Flood Intelligence Platform

AURORA is an AI-powered GIS platform designed to predict, simulate, and mitigate urban flood risks. The system combines geospatial intelligence, machine learning, and hydrological modeling to identify flood-prone areas and support proactive disaster management.

## Key Features

* **AI Flood Risk Prediction Engine**

  * XGBoost and Random Forest models for flood probability estimation
  * Micro-grid risk analysis using terrain elevation, drainage proximity, and land-use data
  * Detection of 2,500+ flood micro-hotspots

* **Pre-Monsoon Readiness Scoring**

  * Ward-level readiness index (0–100%)
  * Infrastructure and drainage capacity evaluation
  * Risk classification and preparedness analytics

* **Flood Simulation Engine**

  * 3D terrain-based flood simulation
  * Rainfall scenario modeling
  * Submerged area estimation and infrastructure impact analysis

* **Mitigation & Resource Deployment**

  * Pump and manpower allocation planning
  * Drainage cleaning prioritization
  * Risk reduction projections

* **Citizen Awareness Portal**

  * Ward-level flood alerts
  * Risk visualization dashboard
  * Emergency advisory information

* **Government-Grade Security**

  * Role-based access control (Citizen / Ward Officer / City Admin / System Admin)
  * Secure API architecture

## Project Architecture

```
AURORA
│
├── backend
│   ├── main.py
│   ├── dependencies.py
│   ├── routers
│   │   ├── auth.py
│   │   ├── gis.py
│   │   ├── ml.py
│   │   ├── simulation.py
│   │   └── readiness.py
│
├── frontend
│   ├── src
│   │   ├── app
│   │   └── components
│   ├── public
│   └── package.json
│
└── docker-compose.yml
```

## Tech Stack

**Frontend**

* Next.js
* TypeScript
* Tailwind CSS
* Interactive Map Visualization

**Backend**

* Python
* FastAPI
* Geospatial Processing
* Machine Learning

**Data & Analytics**

* GIS datasets
* Terrain elevation models (DEM)
* Rainfall and drainage network data

## Installation

### Clone the repository

```
git clone https://github.com/Dhairya-33/AURORA.git
cd AURORA
```

### Run backend

```
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Run frontend

```
cd frontend
npm install
npm run dev
```

## Deployment

* Frontend can be deployed on Vercel
* Backend can be deployed using a Python hosting service
* Docker configuration available for containerized deployment

## Vision

AURORA aims to transform flood management from reactive disaster response into proactive urban resilience planning by combining AI, geospatial intelligence, and predictive analytics.
