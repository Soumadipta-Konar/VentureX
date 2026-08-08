# Re-Energize EV — Battery Aggregation & Grading Platform (India)

> **B2C Sourcing + B2B Institutional Secondary Exchange for Retired Electric Vehicle Batteries**
> 
> Compliant with Ministry of Environment, Forest and Climate Change (MoEFCC) **Battery Waste Management Rules (BWMR) 2022**.

---

## ⚡ Overview

**Re-Energize EV** is an end-to-end aggregation and valuation platform for retired EV batteries in India. It bridges individual EV owners/fleet operators (B2C Sourcing) with institutional secondary energy storage buyers (B2B Telecom Towers, Solar Micro-Grids, Commercial UPS).

The core of the platform is an **Empirical Electrochemistry Degradation Engine** built with a **Clean Modular ES Architecture** that computes dynamic State-of-Health (SOH), 4-tier grade classification, prorated performance warranty terms, itemized Extended Producer Responsibility (EPR) credit payouts, and doorstep physical technician verification.

---

## 🚀 Key Features

### 1. Two-Stage SOH Grading & Valuation Pipeline
- **Stage 1 (Provisional Estimate)**: Self-reported usage intake (Vehicle Category, Chemistry, Age, Km/Cycles, DoD%, Ambient Temperature). Labeled transparently as *"Estimated SOH based on usage history"*.
- **Stage 2 (Doorstep Physical Verification)**: Doorstep inspection syncs BMS logged cycle counts, checks terminal voltage drops, and inspects visual casing/water damage (caps grade at Grade C / Reject if damaged).
- **Discrepancy Re-Grading**: Automatically flags BMS log deviations (>15% vs self-reported) and recalibrates verified SOH.

### 2. Empirical Chemistry Degradation Physics (LFP vs. NMC)
- **LFP (Lithium Iron Phosphate)**: Base cycle life ~2,800 cycles to 80% SOH, lower calendar decay (~1.2%/yr), low thermal sensitivity.
- **NMC (Nickel Manganese Cobalt)**: Base cycle life ~1,600 cycles to 80% SOH, higher calendar decay (~2.2%/yr), higher Arrhenius thermal decay above 25°C.
- **Physics Equations**:
  - $\text{Degradation}_{\text{cyclic}} = 20.0 \times \left(\frac{N_{\text{cycles}}}{N_{\text{nominal}}}\right)^\alpha \times (1 + 0.6 \cdot \frac{\text{DoD}\% - 80}{100})$
  - $\text{Degradation}_{\text{calendar}} = (\text{Cal}_{\text{rate}} \times \text{Age}_{\text{yrs}}) \times e^{\gamma (T_{\text{avg}} - 25^\circ\text{C})}$

### 3. Tiered Grading & Prorated Performance Warranties
- **Grade A (>80% SOH)**: Commercial Storage (BESS) & Solar Micro-Grids (36-Month Prorated Warranty, $\ge 70\%$ capacity guarantee).
- **Grade B (65–80% SOH)**: Telecom Tower Backup (18-Month Prorated Warranty, $\ge 55\%$ capacity guarantee).
- **Grade C (50–65% SOH)**: Low-Stakes UPS & Emergency Lighting (As-Is / 90-Day DOA replacement).
- **Reject (<50% SOH)**: Black Mass Hydrometallurgical Recycling (EPR Safe Transfer Clearance).

### 4. Itemized Seller Payout & EPR Credit Mechanism
- Payout = Platform Base Valuation + **Estimated EPR Credit (BWMR 2022)**.
- Compares seller payout directly against un-graded informal scrap benchmarks (~₹1,450/kWh), demonstrating a 50%–250% seller premium.

### 5. Institutional B2B Secondary Exchange
- Bulk procurement quote simulator for Telecom, Solar Micro-Grids, and Commercial UPS.
- Institutional price benchmarked against New Lead-Acid (~₹5,200/kWh) and New Lithium (~₹12,500/kWh), including avoided manufacturing $\text{CO}_2$ offset calculations.

### 6. Transparency & Reporting
- **Dynamic Visual Capacity Meter**: Dynamic fill color and health percentage gauge.
- **Interactive Formula Trace Modal**: Step-by-step mathematical computation trace.
- **Printable Official Valuation Report**: Generates a PDF/Print certificate complete with unique tracking ID, vehicle metadata, and itemized payout details.

---

## 📦 Modular Project Architecture

The platform follows a clean, decoupled ES module architecture:

```
VentureX/
├── package.json                   # ESM module configuration & npm test scripts
├── src/
│   ├── config/
│   │   ├── vehicleSpecs.js        # Vehicle category specs & voltage defaults (2W, 3W, 4W)
│   │   ├── chemistryConfig.js     # Degradation constants & cycle limits (LFP vs NMC)
│   │   └── marketBenchmarks.js    # EPR credit rates, informal scrap & replacement benchmarks
│   ├── engine/
│   │   ├── degradationModel.js    # SOH degradation math (Power-law cyclic + Arrhenius calendar)
│   │   ├── physicalVerification.js# Stage 2 doorstep technician verification logic & BMS sync
│   │   ├── gradingAndWarranty.js  # Grade tier mapping (A/B/C/Reject) & warranty terms
│   │   └── valuationEngine.js     # Seller payout & B2B institutional bulk pricing calculators
│   └── index.js                   # Unified ES Module entry point & browser window global exporter
├── index.html                     # Responsive Light-Mode SaaS Application UI
├── app.js                         # UI interactions, modals, filters & Chart.js simulator
├── style.css                      # Stripe/Linear-style Light Mode Design System
└── README.md                      # Platform documentation
```

---

## 🛠️ Quick Start & Testing

1. **Clone Repository**:
   ```bash
   git clone https://github.com/Soumadipta-Konar/VentureX.git
   cd VentureX
   ```

2. **Run ES Module Tests**:
   ```bash
   npm test
   ```

3. **Run Web Platform Locally**:
   Simply open `index.html` in any web browser, or launch a local web server:
   ```bash
   python -m http.server 8080
   ```
   Then navigate to `http://localhost:8080`.

---

## 📊 Datasets & Future Strategic Roadmap

### 1. Research Datasets for Offline Model Calibration
- **NASA Ames Battery Aging Dataset**: Standard benchmark for capacity fade & internal resistance growth (B0005, B0006, B0007, B0018).
- **CALCE Battery Research Dataset (Univ. of Maryland)**: LFP & NMC cell degradation data under varying thermal stresses ($25^\circ\text{C}$–$45^\circ\text{C}$) and C-rates.
- **Stanford / MIT Battery Dataset (Severson et al.)**: 124 LFP/Graphite cells under dynamic charge/discharge profiles.
- **Oxford Battery Degradation Dataset**: Long-term drive-cycle battery degradation logs.

### 2. Proprietary Platform Sourced Datasets
- **Doorstep Technician BMS Dump Logs**: OBD-II / CAN bus diagnostic log files extracted during Stage 2 pickup verification.
- **OEM Telematics API Integrations**: Real-time charging logs synced via Indian EV Fleet APIs (Ather Grid / Ola Electric / Mahindra Last Mile Mobility).

---

## 🗺️ Future Strategic Roadmap

- **Phase 1 (Q1-Q2)**: Doorstep OBD-II / BMS Hardware Dongle for automated 60-second diagnostic health verification.
- **Phase 2 (Q3-Q4)**: Physics-Informed Neural Network (PINN) automated re-calibration using regional Indian thermal data ($35^\circ\text{C}$–$48^\circ\text{C}$).
- **Phase 3 (Year 2)**: Automated EPR Credit Clearinghouse & Direct Integration with Central Pollution Control Board (CPCB) EPR Portal.
- **Phase 4 (Year 2-3)**: Secondary Storage-as-a-Service (ESaaS) leasing for Indian Telecom Towers (Indus Towers) & Solar Micro-Grids.

---

## 📜 Compliance & Citations

- **Regulatory Compliance**: Extended Producer Responsibility (EPR) credit mechanisms aligned with the **Battery Waste Management Rules (BWMR) 2022** notified by the Ministry of Environment, Forest and Climate Change (MoEFCC), Govt of India.
- **Empirical Calibration**: Degradation curve parameters, cycle life limits, and Arrhenius thermal constants are calibrated to published NREL and IEEE battery degradation datasets.

---

## 👥 About Team 'Team Incognito'

- **Gyan Ranjan** — Technical Build
- **Soumadipta Konar** — Business Model and Unit Economics
- **Vijaya Laxmi Singh** — Pitch Deck
- **Brinda Pal** — Research and Market Data
