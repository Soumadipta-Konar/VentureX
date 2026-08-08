# Re-Energize EV — Battery Aggregation & Grading Platform (India)

> **B2C Sourcing + B2B Institutional Secondary Exchange for Retired Electric Vehicle Batteries**
> 
> Compliant with Ministry of Environment, Forest and Climate Change (MoEFCC) **Battery Waste Management Rules (BWMR) 2022**.

---

## ⚡ Overview

**Re-Energize EV** is an aggregation and grading prototype for retired EV batteries in India. It connects individual EV owners and fleet operators (B2C Sourcing) with institutional secondary energy storage buyers (B2B Telecom Towers, Solar Micro-Grids, Commercial UPS).

The platform uses an **Empirical Electrochemistry Degradation Engine** built with modular JavaScript modules (`src/`) to compute State-of-Health (SOH), assign 4-tier grade classifications, specify prorated warranty coverage, calculate seller payouts (including Extended Producer Responsibility credits), and perform Stage 2 physical doorstep verification.

---

## 🛠️ Codebase Architecture & Degradation Math

The calculation engine in `src/engine/degradationModel.js` is an **arithmetic electrochemistry degradation model** based on cyclic degradation and Arrhenius thermal calendar aging.

### 1. Cyclic Degradation Component

```
Loss_cyclic = 20.0 * (N_cycles / N_nominal)^alpha * (1 + 0.6 * (DoD% - 80) / 100)
```

- **LFP (Lithium Iron Phosphate)**: Nominal cycle life `N_nominal = 2,800` cycles, `alpha = 0.85`.
- **NMC (Nickel Manganese Cobalt)**: Nominal cycle life `N_nominal = 1,600` cycles, `alpha = 0.95`.

### 2. Calendar Aging & Arrhenius Thermal Acceleration

```
Loss_calendar = (Cal_rate * 100) * Age_years * e^(gamma * (Temp - 25))
```

- **LFP**: Baseline calendar decay `= 1.2%/year`, thermal sensitivity `gamma = 0.025`.
- **NMC**: Baseline calendar decay `= 2.2%/year`, thermal sensitivity `gamma = 0.045`.

### 3. Total State of Health (SOH %)

```
SOH% = 100 - (Loss_cyclic + Loss_calendar)
```

---

## 🚀 System Pipeline & Core Features

### 1. Two-Stage Valuation & Verification Pipeline
- **Stage 1 (Provisional Estimate)**: Computes online estimate from self-reported data (Vehicle category, chemistry, age, km/cycles, DoD%, temp). Labeled as *"Estimated SOH based on usage history"*.
- **Stage 2 (Doorstep Physical Verification)** (`src/engine/physicalVerification.js`):
  - **BMS Logged Cycle Sync**: Compares BMS cycles vs self-reported cycles. Deviations **> 15%** trigger an automatic re-grading alert.
  - **Terminal Voltage Check**: Applies SOH penalties for cell drop/imbalance if measured voltage falls below nominal thresholds.
  - **Physical Damage Check**: Casing, water, or structural damage caps the grade at Grade C or Reject.

### 2. Tiered Grading & Warranty Matrix (`src/engine/gradingAndWarranty.js`)
- **Grade A (> 80% SOH)**: BESS Commercial Storage & Solar Micro-Grids (36-Month Prorated Warranty, >= 70% capacity guarantee).
- **Grade B (65% – 80% SOH)**: Telecom Tower Backup (18-Month Prorated Warranty, >= 55% capacity guarantee).
- **Grade C (50% – 65% SOH)**: Low-Stakes Emergency UPS (As-Is / 90-Day DOA replacement).
- **Reject (< 50% SOH)**: Black Mass Recycling (Safe Transfer Clearance).

### 3. Seller Payout & EPR Credit Model (`src/engine/valuationEngine.js`)
- **Total Payout = Platform Base Valuation + Estimated EPR Credit (BWMR 2022)**
- **EPR Credit Rate**: ₹520 / kWh for LFP and ₹680 / kWh for NMC.
- Benchmarked against un-graded informal scrap (~₹1,450 / kWh).

### 4. Institutional B2B Secondary Exchange
- Bulk procurement quote calculator benchmarked against New Lead-Acid (~₹5,200 / kWh) and New Lithium (~₹12,500 / kWh), including avoided manufacturing CO2 offset calculations (~85 kg CO2 / kWh).

---

## 📦 Project Directory Structure

```
VentureX/
├── package.json                   # ESM module definition & npm test scripts
├── src/
│   ├── config/
│   │   ├── vehicleSpecs.js        # Vehicle categories (2W, 3W, 4W) & voltage defaults
│   │   ├── chemistryConfig.js     # Degradation parameters & nominal cycle limits (LFP vs NMC)
│   │   └── marketBenchmarks.js    # EPR credit rates, informal scrap & replacement benchmarks
│   ├── engine/
│   │   ├── degradationModel.js    # Arithmetic SOH degradation math (Power-law cyclic + Arrhenius calendar)
│   │   ├── physicalVerification.js# Stage 2 doorstep technician verification logic & BMS sync
│   │   ├── gradingAndWarranty.js  # Grade tier mapping (A/B/C/Reject) & warranty terms
│   │   └── valuationEngine.js     # Seller payout & B2B institutional bulk pricing calculators
│   └── index.js                   # Unified ES Module entry point
├── index.html                     # Responsive Light-Mode SaaS Application UI
├── app.js                         # UI interactions, modals, filters & Chart.js simulator
├── style.css                      # Stripe/Linear-style Light Mode Design System
└── README.md                      # Platform documentation
```

---

## 🛠️ Local Setup & Testing

1. **Clone Repository**:
   ```bash
   git clone https://github.com/Soumadipta-Konar/VentureX.git
   cd VentureX
   ```

2. **Run Engine Unit Tests**:
   ```bash
   npm test
   ```

3. **Run Application**:
   Open `index.html` directly in a browser or launch a local web server:
   ```bash
   python -m http.server 8080
   ```
   Navigate to `http://localhost:8080`.

---

## 🔮 Future Plans & Roadmap

- **Reinforcement Learning (RL) Integration (Planned for Future Phases)**: Exploring Reinforcement Learning algorithms to dynamically match aggregated battery packs with institutional buyer demand profiles, optimizing bulk pricing and inventory allocation in real time.
- **Hardware Diagnostic Dongle**: Plug-and-play OBD-II hardware tool for doorstep technicians to extract BMS logs in under 60 seconds.
- **Direct CPCB Portal Sync**: Automated integration with Central Pollution Control Board (CPCB) EPR portal for instant certificate transfer.

---

## 📜 Compliance

- **Regulatory Compliance**: Extended Producer Responsibility (EPR) credit mechanisms aligned with the **Battery Waste Management Rules (BWMR) 2022** notified by the Ministry of Environment, Forest and Climate Change (MoEFCC), Govt of India.

---

## 👥 About Team 'Team Incognito'

- **Gyan Ranjan** — Technical Build
- **Soumadipta Konar** — Business Model and Unit Economics
- **Vijaya Laxmi Singh** — Pitch Deck
- **Brinda Pal** — Research and Market Data
