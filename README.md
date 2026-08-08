# ⚡ Re-Energize EV — Battery Aggregation & Grading Platform

<p align="center">
  <strong>India's B2C EV Battery Sourcing & B2B Institutional Secondary Exchange</strong><br>
  <em>Compliant with MoEFCC Battery Waste Management Rules (BWMR) 2022</em>
</p>

---

## 🌟 Executive Summary

**Re-Energize EV** is an end-to-end aggregation and health grading platform for retired Electric Vehicle (EV) batteries in India. It bridges individual EV owners and fleet operators looking to trade spent packs (**B2C Sourcing**) with institutional energy storage buyers like telecom tower backups, solar micro-grids, and commercial UPS operators (**B2B Exchange**).

Rather than relying on black-box assumptions, the platform features a transparent **Electrochemistry Degradation Engine** that computes a battery's State-of-Health (SOH), assigns verified grade tiers (Grade A/B/C/Reject), issues performance warranties, and calculates itemized seller payouts including Extended Producer Responsibility (EPR) credits.

---

## 🔬 How Battery Grading Works (Concept & Degradation Math)

Battery health degradation is determined by **four core physical factors** working together:

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│   [ 1. Cycle Usage ]   ──> Distance driven & charge cycles             │
│   [ 2. Calendar Time ] ──> Age of battery pack in years                │
│   [ 3. Heat Exposure ] ──> Indian ambient temperature acceleration    │
│   [ 4. Chemistry ]     ──> LFP (long life) vs NMC (high density)       │
│                                                                        │
│   ========> Dynamic State-of-Health (SOH %) & Grade Tier <========     │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 1. Basic Intuitive Breakdown
- **Cycle Wear**: Distance driven converts to cycle count based on vehicle category (2W: 40 km/cycle, 3W: 55 km/cycle, 4W: 120 km/cycle).
- **Time & Heat Decay**: Ageing combined with Indian summer temperatures (30°C–45°C) accelerates calendar decay via the Arrhenius effect.
- **Chemistry Profiles**: **LFP** offers high durability (2,800 nominal cycle baseline), whereas **NMC** offers higher energy density with steeper decay (1,600 nominal cycle baseline).

---

### 2. Exact Degradation Math Formulation

The calculation engine in `src/engine/degradationModel.js` computes SOH using the following arithmetic equations:

#### A. Cyclic Degradation Component

```
Loss_cyclic = 20.0 * (N_cycles / N_nominal)^alpha * (1 + 0.6 * (DoD% - 80) / 100)
```

- **LFP (Lithium Iron Phosphate)**: Nominal cycle life `N_nominal = 2,800` cycles, sub-linear exponent `alpha = 0.85`.
- **NMC (Nickel Manganese Cobalt)**: Nominal cycle life `N_nominal = 1,600` cycles, near-linear exponent `alpha = 0.95`.
- **DoD Factor**: Adjusts degradation based on average Depth of Discharge (DoD %).

#### B. Calendar Aging & Arrhenius Thermal Acceleration

```
Loss_calendar = (Cal_rate * 100) * Age_years * e^(gamma * (Temp - 25))
```

- **LFP**: Baseline calendar decay `= 1.2%/year`, thermal sensitivity `gamma = 0.025`.
- **NMC**: Baseline calendar decay `= 2.2%/year`, thermal sensitivity `gamma = 0.045`.
- **Arrhenius Factor**: `e^(gamma * (Temp - 25))` applies exponential thermal acceleration above 25°C baseline.

#### C. Total State of Health (SOH %)

```
SOH% = 100 - (Loss_cyclic + Loss_calendar)
```

---

### 3. Dynamic Grade Tier & Warranty Mapping

Once SOH % is calculated, the battery is automatically categorized into a second-life grade:

| SOH Range | Grade Tier | Recommended Second-Life Application | Warranty Coverage |
| :--- | :--- | :--- | :--- |
| **> 80%** | **Grade A** | Commercial Solar Storage (BESS) & Charging Buffers | 36-Month Prorated Warranty |
| **65% – 80%** | **Grade B** | Telecom Tower Backup Power & Agritech Solar Pumps | 18-Month Prorated Warranty |
| **50% – 65%** | **Grade C** | Low-Stakes Emergency UPS & Off-Grid Rural Lighting | 90-Day DOA Swap Only |
| **< 50%** | **Reject** | Black Mass Hydrometallurgical Recycling | Safe EPR Transfer Clearance |

---

## 💰 Seller Payout & EPR Credit Valuation

Platform seller payouts offer a **50%–250% premium** over informal un-graded scrap rates (~₹1,450 / kWh) by combining two transparent components:

```
Total Payout = Platform Base Valuation + EPR Credit Value
```

- **Platform Base Valuation**: Value calculated from verified SOH % and remaining kWh capacity.
- **Extended Producer Responsibility (EPR) Credit**: Government mandate under **BWMR 2022** rewarding certified recycling/second-life transfer (₹520 / kWh for LFP, ₹680 / kWh for NMC).

---

## 📋 Two-Stage Valuation & Verification Pipeline

```
  ┌──────────────────────────────────────────────────────────────┐
  │ STAGE 1: Provisional Online Valuation                        │
  │ • Seller inputs: Category, Chemistry, Age, Km/Cycles         │
  │ • Output: Provisional SOH % & Estimated Seller Payout        │
  └──────────────────────────────┬───────────────────────────────┘
                                 │
                                 ▼
  ┌──────────────────────────────────────────────────────────────┐
  │ STAGE 2: Doorstep Technician Physical Inspection             │
  │ • Sync BMS Logged Cycles (Flag alert if >15% discrepancy)   │
  │ • Measure Terminal Voltage (Penalty applied for cell drop)   │
  │ • Physical Damage Check (Casing damage caps grade at C/Reject)│
  └──────────────────────────────┬───────────────────────────────┘
                                 │
                                 ▼
  ┌──────────────────────────────────────────────────────────────┐
  │ FINAL RESULT: Verified Grade & Guaranteed Payout             │
  └──────────────────────────────┴───────────────────────────────┘
```

---

## 📦 Modular Codebase Architecture

The application is built with a clean, decoupled ES Module structure (`src/`):

```
VentureX/
├── package.json                   # ESM module configuration & npm test scripts
├── src/
│   ├── config/
│   │   ├── vehicleSpecs.js        # Vehicle specs & voltage defaults (2W, 3W, 4W)
│   │   ├── chemistryConfig.js     # Degradation parameters & cycle limits (LFP vs NMC)
│   │   └── marketBenchmarks.js    # EPR credit rates & market pricing benchmarks
│   ├── engine/
│   │   ├── degradationModel.js    # SOH degradation calculations
│   │   ├── physicalVerification.js# Stage 2 technician inspection logic & BMS sync
│   │   ├── gradingAndWarranty.js  # Grade tier mapping & warranty structures
│   │   └── valuationEngine.js     # Seller payout & B2B institutional pricing
│   └── index.js                   # Unified ES Module entry point
├── index.html                     # Responsive Light-Mode SaaS Application UI
├── app.js                         # UI interactions, modals, filters & Chart.js simulator
├── style.css                      # Stripe/Linear-style Light Mode Design System
└── README.md                      # Documentation
```

---

## 🛠️ Quick Start & Testing

1. **Clone Repository**:
   ```bash
   git clone https://github.com/Soumadipta-Konar/VentureX.git
   cd VentureX
   ```

2. **Run Engine Tests**:
   ```bash
   npm test
   ```

3. **Launch Platform Locally**:
   Open `index.html` directly in a browser or start a local web server:
   ```bash
   python -m http.server 8080
   ```
   Navigate to `http://localhost:8080`.

---

## 🔮 Future Strategic Roadmap

- **Reinforcement Learning (RL) Integration (Planned for Future Phases)**: Exploring Reinforcement Learning algorithms to dynamically match aggregated battery pools with institutional buyer demand profiles, optimizing bulk pricing and inventory allocation in real time.
- **Doorstep Diagnostic Dongle**: OBD-II hardware tool for doorstep technicians to extract BMS logs in under 60 seconds.
- **CPCB EPR Portal Sync**: Automated integration with Central Pollution Control Board (CPCB) portal for instant credit transfer.

---

## 👥 About 'Team Incognito'

- 🛠️ **Gyan Ranjan** — Technical Build
- 📈 **Soumadipta Konar** — Business Model & Unit Economics
- 📊 **Vijaya Laxmi Singh** — Pitch Deck
- 🔍 **Brinda Pal** — Research & Market Data
