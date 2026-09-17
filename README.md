# Resilia — Supply Chain Resilience Platform

Resilia is an autonomous enterprise supply chain intelligence and resilience platform. It creates dynamic, multi-tier digital twins of global trade networks to stress-test supplier ecosystems, simulate cascading disruptions, and quantify financial risk in real time.

---

## Executive Overview

Modern supply chains are highly interconnected networks vulnerable to geopolitical conflicts, extreme climate events, critical supplier insolvency, and shipping lane chokepoints. 

Resilia transforms raw operational supplier data into an actionable digital twin that reveals hidden multi-tier dependencies, identifies single points of failure (SPOFs), and provides stochastic Value-at-Risk (VaR) analysis before disruptions impact revenue.

---

## Core Capabilities

### 1. Multi-Tier Digital Twin Mapping
- **End-to-End Visibility**: Maps the full supply network across all tiers:
  - **Tier 3**: Raw Materials Extraction & Refining (Lithium, Silicon, Rare Earths, Specialty Metals)
  - **Tier 2**: Component Manufacturing (Semiconductors, Wire Harnesses, Structural Enclosures)
  - **Tier 1**: Sub-Assembly Integration (Battery Packs, Powertrains, Precision Actuators)
  - **Assembly Plants**: OEM Final Production Lines
  - **Distribution Centers**: Global Fulfillment Hubs
- **Dynamic Topologies**: Switch between Tiered Hierarchical Pipeline, Force-Directed Physical Flow, and Regional Cluster representations.
- **Active Flow Monitoring**: Live trade arc pulses illustrating shipment velocity and link capacity.

### 2. Failure Cascade & Time-Horizon Scrubber
- **Ripple Propagation**: Simulates upstream vendor outages and tracks how shortfalls cascade through intermediate assemblies to final manufacturing lines.
- **Buffer Stock Absorption**: Models inventory buffer consumption over 30 to 60 days to identify when safety stocks run dry and line stoppage occurs.
- **Financial Exposure Quantification**: Continuously calculates weekly gross revenue at risk ($M/week) and daily downtime burn rates.

### 3. Monte Carlo Value-at-Risk (VaR) Engine
- **Stochastic Risk Modeling**: Simulates 1,000 to 5,000 randomized disruption trials using correlated Gaussian copula factor structures.
- **Actuarial Risk Metrics**:
  - **95% VaR**: Maximum weekly financial loss expected at a 95% confidence interval (1-in-20 year shock).
  - **99% VaR**: Severe tail risk representing 1-in-100 year Black Swan events.
  - **Conditional VaR (Expected Shortfall)**: Average exposure during the worst 5% of disruption outcomes.
  - **Expected Annual Loss (EAL)**: Annualized baseline financial risk.
- **Interactive Visuals**: Includes probability density histograms, Loss Exceedance Curves (LEC), and Tornado sensitivity charts ranking the top component bottlenecks driving tail risk.
- **Mitigation ROI Sandbox**: Test expanding inventory buffers on specific suppliers to measure the immediate percentage reduction in tail financial exposure.

### 4. Digital Twin Studio & Custom Network Builder
- **Custom Facility Builder**: Add custom factories, supplier sites, and distribution nodes with custom volume, lead times, and recovery days.
- **Trade Arc Creator**: Connect upstream suppliers to downstream plants and define weekly transfer quantities.
- **Starter Templates**: Load pre-configured industry networks including Clean Energy Storage, Precision MedTech Robotics, and Consumer Electronics OEM architectures.

### 5. Global Geographic Corridors & Chokepoints
- **Interactive Geographic Map**: Visualizes trade lanes and supply hubs across APAC, EMEA, and the Americas.
- **Regional Stress Testing**: Simulate geopolitical trade embargoes, canal blockades, or regional extreme weather events to evaluate regional concentration vulnerabilities.

### 6. Scope 3 Carbon & ESG Auditing
- **Carbon Footprint Tracking**: Audit estimated CO2 emissions across transportation modes (air, ocean, rail, road).
- **Supplier Health Metrics**: Integrates environmental, social, and operational governance indicators across every tier.

### 7. Executive Board Presentation Mode
- **Board-Ready Briefing Deck**: Built-in 5-slide executive presentation modal designed for C-suite and board risk review.
- **One-Click Reports**: Export complete risk profiles, network audits, and scenario comparison data for executive distribution.

---

## Quick Start Guide

### Prerequisites
- Node.js (version 18 or higher)
- npm

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/Dhruu04/Resilia-Supply_Chain_Resilience.git
cd Resilia-Supply_Chain_Resilience
npm install
```

### 2. Run Locally
Start the development server:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000`.

### 3. Build for Production
To generate the optimized production bundle:
```bash
npm run build
```
Preview the built application:
```bash
npm run preview
```

---

## Deployment on Vercel

This repository is pre-configured for zero-configuration deployment on Vercel:

1. **Import to Vercel**: Connect your GitHub account and select the `Resilia-Supply_Chain_Resilience` repository.
2. **Build Settings**:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
3. **Routing Configuration**: The included `vercel.json` file handles all client-side Single Page Application (SPA) routing rewrites.
4. **Deploy**: Click **Deploy** and your production digital twin will be live with full SSL and global edge CDN distribution.

---

## License

Private and proprietary enterprise software. All rights reserved.
