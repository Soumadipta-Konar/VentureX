/**
 * ============================================================================
 *  BATTERY AGGREGATION & GRADING PLATFORM — FRONTEND APPLICATION LOGIC
 *  Connects HTML UI to pure gradingEngine.js calculation library & Chart.js
 * ============================================================================
 */

'use strict';

// Store current provisional result globally for Stage 2 technician verification
let currentProvisionalResult = null;
let degradationChartInstance = null;

// Preset Vehicle Profiles
const PRESETS = {
  ola: {
    category: '2W',
    chemistry: 'LFP',
    ageYears: 2.0,
    packCapacityKWh: 4.0,
    odometerKm: 32000,
    dodPercent: 85,
    avgTempC: 33
  },
  treo: {
    category: '3W',
    chemistry: 'LFP',
    ageYears: 3.5,
    packCapacityKWh: 7.5,
    odometerKm: 45000,
    dodPercent: 80,
    avgTempC: 32
  },
  nexon: {
    category: '4W',
    chemistry: 'NMC',
    ageYears: 4.5,
    packCapacityKWh: 30.2,
    odometerKm: 78000,
    dodPercent: 75,
    avgTempC: 30
  }
};

document.addEventListener('DOMContentLoaded', () => {
  initTabNavigation();
  handleCategoryChange();
  runProvisionalValuation(); // Initial calculation with defaults
  renderB2BPool();
  runB2BQuote();
  initSimChart();
});

/**
 * Tab Navigation Setup
 */
function initTabNavigation() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetTabId = tab.getAttribute('data-tab');
      const targetPane = document.getElementById(targetTabId);
      if (targetPane) targetPane.classList.add('active');

      // Trigger chart resize if switching to simulator tab
      if (targetTabId === 'tab-simulator' && degradationChartInstance) {
        setTimeout(() => degradationChartInstance.resize(), 100);
      }
    });
  });
}

/**
 * Preset button click handler
 */
function applyPreset(presetKey) {
  const p = PRESETS[presetKey];
  if (!p) return;

  document.getElementById('vehicleCategory').value = p.category;
  document.getElementById('batteryChemistry').value = p.chemistry;
  document.getElementById('packAge').value = p.ageYears;
  document.getElementById('packCapacity').value = p.packCapacityKWh;
  document.getElementById('odometerKm').value = p.odometerKm;
  document.getElementById('avgDoD').value = p.dodPercent;
  document.getElementById('avgTemp').value = p.avgTempC;

  handleCategoryChange();
  runProvisionalValuation();
}

/**
 * Handle category dropdown change (updates capacity defaults & cycle text)
 */
function handleCategoryChange() {
  const cat = document.getElementById('vehicleCategory').value;
  const spec = window.GradingEngine.VEHICLE_SPECS[cat];

  if (spec) {
    document.getElementById('nominalVoltageRef').innerText = `Nominal Voltage: ${spec.nominalVoltage}V`;
    document.getElementById('techTerminalVoltage').value = spec.nominalVoltage;
  }
  syncCyclesFromKm();
}

/**
 * Update cycle count indicator when odometer km changes
 */
function syncCyclesFromKm() {
  const cat = document.getElementById('vehicleCategory').value;
  const km = Number(document.getElementById('odometerKm').value) || 0;
  const cycles = window.GradingEngine.deriveCyclesFromKm(cat, km);
  
  const spec = window.GradingEngine.VEHICLE_SPECS[cat];
  const kmPerCycle = spec ? spec.kmPerCycle : 40;

  const helpEl = document.getElementById('cycleEstimateHelp');
  if (helpEl) {
    helpEl.innerText = `Est. Cycle Count: ~${cycles.toLocaleString()} cycles (based on ~${kmPerCycle} km/cycle for ${cat})`;
  }

  // Sync Stage 2 BMS cycle default
  const bmsInput = document.getElementById('techBmsCycles');
  if (bmsInput && (!bmsInput.dataset.userEdited || bmsInput.dataset.userEdited === 'false')) {
    bmsInput.value = cycles;
  }
}

/**
 * STAGE 1: Calculate & Render Provisional Valuation
 */
function runProvisionalValuation() {
  const category = document.getElementById('vehicleCategory').value;
  const chemistry = document.getElementById('batteryChemistry').value;
  const ageYears = Number(document.getElementById('packAge').value) || 1;
  const packCapacityKWh = Number(document.getElementById('packCapacity').value) || 3.5;
  const odometerKm = Number(document.getElementById('odometerKm').value) || 0;
  const dodPercent = Number(document.getElementById('avgDoD').value) || 80;
  const avgTempC = Number(document.getElementById('avgTemp').value) || 30;

  // Run calculation engine
  currentProvisionalResult = window.GradingEngine.calculateProvisionalSOH({
    category,
    chemistry,
    ageYears,
    packCapacityKWh,
    odometerKm,
    dodPercent,
    avgTempC
  });

  const res = currentProvisionalResult;

  // Render DOM elements
  document.getElementById('provSohVal').innerText = `${res.estimatedSOH}%`;
  document.getElementById('provSohVal').style.color = res.gradeBadgeColor;

  const provGradeBadge = document.getElementById('provGradeBadge');
  provGradeBadge.innerText = res.gradeName.split(' ')[0] + ' ' + res.gradeName.split(' ')[1];
  const gradeMeta = window.GradingEngine.determineGrade(res.estimatedSOH);
  provGradeBadge.style.background = gradeMeta.badgeBg || '#d1fae5';
  provGradeBadge.style.color = gradeMeta.badgeText || '#065f46';
  provGradeBadge.style.border = `1px solid ${gradeMeta.badgeColor}40`;

  document.getElementById('provGradeName').innerText = res.secondLifeApplication.split(',')[0];

  // Capacity Progress Meter Fill
  const meterFill = document.getElementById('sohMeterFill');
  const meterLabel = document.getElementById('sohMeterLabel');
  if (meterFill) {
    meterFill.style.width = `${res.estimatedSOH}%`;
    meterFill.style.background = res.estimatedSOH > 80 ? 'linear-gradient(90deg, #10b981, #059669)' : (res.estimatedSOH >= 65 ? 'linear-gradient(90deg, #0284c7, #0369a1)' : 'linear-gradient(90deg, #d97706, #b45309)');
  }
  if (meterLabel) meterLabel.innerText = `${res.estimatedSOH}% SOH`;

  // Loss Attribution Breakdown
  if (document.getElementById('provCyclicLoss')) {
    document.getElementById('provCyclicLoss').innerText = `${res.degradationBreakdown.cyclicLossPercent}%`;
    document.getElementById('provCalendarLoss').innerText = `${res.degradationBreakdown.calendarLossPercent}%`;
    document.getElementById('provThermalMult').innerText = `${res.degradationBreakdown.arrheniusThermalMultiplier}x`;
  }

  // Payout rendering
  document.getElementById('provTotalPayout').innerText = `₹${res.payout.totalPayoutINR.toLocaleString('en-IN')}`;
  document.getElementById('provBasePayout').innerText = `₹${res.payout.platformBasePayoutINR.toLocaleString('en-IN')}`;
  document.getElementById('provEprCredit').innerText = `₹${res.payout.estimatedEPRCreditINR.toLocaleString('en-IN')}`;
  document.getElementById('provScrapBaseline').innerText = `₹${res.payout.informalScrapBaselineINR.toLocaleString('en-IN')}`;

  const premiumEl = document.getElementById('provScrapComparison');
  if (res.payout.sellerPremiumPercent > 0) {
    premiumEl.innerText = `+${res.payout.sellerPremiumPercent}% higher than un-graded informal scrap (₹${res.payout.informalScrapBaselineINR.toLocaleString('en-IN')})`;
    premiumEl.style.color = 'var(--accent-emerald)';
  } else {
    premiumEl.innerText = `Matched with informal scrap baseline`;
    premiumEl.style.color = 'var(--text-muted)';
  }

  // Warranty
  document.getElementById('provWarrantyTerms').innerText = res.warranty.terms;

  // Run Stage 2 Technician calculation to keep in sync
  runVerifiedValuation();
}

/**
 * STAGE 2: Doorstep Technician Inspection & Verification
 */
function runVerifiedValuation() {
  if (!currentProvisionalResult) return;

  const hasVisualDamage = document.getElementById('techVisualDamage').checked;
  const measuredVoltage = Number(document.getElementById('techTerminalVoltage').value);
  const bmsAccessible = document.getElementById('techBmsAccessible').checked;
  const bmsCycles = Number(document.getElementById('techBmsCycles').value);

  // Toggle BMS input visibility
  const bmsCyclesGroup = document.getElementById('bmsCyclesGroup');
  if (bmsCyclesGroup) {
    bmsCyclesGroup.style.display = bmsAccessible ? 'block' : 'none';
  }

  // Run Stage 2 calculation engine
  const verifiedRes = window.GradingEngine.calculateVerifiedSOH(currentProvisionalResult, {
    hasVisualDamage,
    measuredVoltage,
    bmsAccessible,
    bmsCycles
  });

  // Render Verified DOM elements
  document.getElementById('verSohVal').innerText = `${verifiedRes.verifiedSOH}%`;
  document.getElementById('verSohVal').style.color = verifiedRes.verifiedBadgeColor;

  const verBadge = document.getElementById('verBadge');
  const verMeta = window.GradingEngine.determineGrade(verifiedRes.verifiedSOH);
  verBadge.innerText = `${verifiedRes.verifiedGradeName.split(' ')[0]} ${verifiedRes.verifiedGradeName.split(' ')[1]} Verified`;
  verBadge.style.background = verMeta.badgeBg || '#d1fae5';
  verBadge.style.color = verMeta.badgeText || '#065f46';
  verBadge.style.border = `1px solid ${verMeta.badgeColor}40`;

  document.getElementById('verFinalPayout').innerText = `Final Payout: ₹${verifiedRes.payout.totalPayoutINR.toLocaleString('en-IN')}`;

  const diffEl = document.getElementById('verSohDiff');
  const sohDiff = verifiedRes.verifiedSOH - verifiedRes.provisionalSOH;
  if (sohDiff === 0) {
    diffEl.innerText = `No change vs Stage 1 Provisional (${verifiedRes.provisionalSOH}%)`;
    diffEl.style.color = 'var(--text-muted)';
  } else if (sohDiff < 0) {
    diffEl.innerText = `Adjusted ${sohDiff.toFixed(1)}% vs Stage 1 (${verifiedRes.provisionalSOH}%) due to inspection flags`;
    diffEl.style.color = 'var(--accent-red)';
  } else {
    diffEl.innerText = `Adjusted +${sohDiff.toFixed(1)}% vs Stage 1 (${verifiedRes.provisionalSOH}%)`;
    diffEl.style.color = 'var(--accent-emerald)';
  }

  // Inspection flags list
  const flagsContainer = document.getElementById('verInspectionFlags');
  flagsContainer.innerHTML = '';
  verifiedRes.inspection.verificationFlags.forEach(flag => {
    const div = document.createElement('div');
    if (flag.includes('PHYSICAL DAMAGE') || flag.includes('Discrepancy Alert') || flag.includes('Anomaly')) {
      div.style.color = 'var(--accent-amber)';
      div.style.marginBottom = '0.2rem';
    } else {
      div.style.color = 'var(--accent-emerald)';
      div.style.marginBottom = '0.2rem';
    }
    div.innerText = flag;
    flagsContainer.appendChild(div);
  });
}

/**
 * Render B2B Aggregated Supply Pool Table
 */
function renderB2BPool() {
  const tbody = document.querySelector('#poolTable tbody');
  if (!tbody) return;

  const pool = window.GradingEngine.generateAggregatedPool();
  tbody.innerHTML = '';

  pool.forEach(item => {
    const tr = document.createElement('tr');
    const gradeInfo = window.GradingEngine.determineGrade(item.avgSOH);
    const warranty = window.GradingEngine.getWarrantyStructure(item.grade);

    tr.innerHTML = `
      <td>
        <span class="result-header-badge" style="background: ${gradeInfo.badgeBg || '#d1fae5'}; color: ${gradeInfo.badgeText || '#065f46'}; border: 1px solid ${gradeInfo.badgeColor}40;">
          ${item.grade.replace('_', ' ')}
        </span>
      </td>
      <td><strong>${item.avgSOH}%</strong></td>
      <td><span class="tag-calibrated">${item.primaryChemistry}</span></td>
      <td><strong>${item.totalKWh} kWh</strong> (${item.availablePacks} packs)</td>
      <td>${item.targetUse}</td>
      <td><strong style="color: var(--accent-cyan);">₹${item.avgPricePerKWh.toLocaleString('en-IN')}</strong> / kWh</td>
      <td style="font-size: 0.8rem; color: var(--text-muted);">${warranty.durationMonths} Mo Prorated (${warranty.riskLevel})</td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Run B2B Institutional Quote Calculation
 */
function runB2BQuote() {
  const segment = document.getElementById('b2bSegment').value;
  const capacityKWh = Number(document.getElementById('b2bCapacityKWh').value) || 100;
  const requestedGrade = document.getElementById('b2bRequestedGrade').value;
  const chemistry = document.getElementById('b2bChemistry').value;

  const quote = window.GradingEngine.calculateB2BPricing({
    targetSegment: segment,
    requiredCapacityKWh: capacityKWh,
    requestedGrade,
    chemistry
  });

  document.getElementById('b2bSegmentLabel').innerText = `${quote.segmentLabel} (${capacityKWh} kWh ${quote.requestedGrade.replace('_', ' ')})`;
  document.getElementById('b2bTotalPrice').innerText = `₹${quote.totalSecondLifePriceINR.toLocaleString('en-IN')}`;
  document.getElementById('b2bUnitPrice').innerText = `₹${quote.secondLifePricePerKWh.toLocaleString('en-IN')} / kWh`;

  document.getElementById('b2bVsLithium').innerText = `Save ₹${quote.savingsVsNewLithiumINR.toLocaleString('en-IN')} (${quote.savingsPercentVsNewLithium}% Savings)`;
  
  const leadAcidDiff = quote.totalNewLeadAcidINR - quote.totalSecondLifePriceINR;
  if (leadAcidDiff > 0) {
    document.getElementById('b2bVsLeadAcid').innerText = `Save ₹${leadAcidDiff.toLocaleString('en-IN')} up-front (plus 3x lifespan)`;
  } else {
    document.getElementById('b2bVsLeadAcid').innerText = `Comparable up-front price (with 3x cycle lifespan vs Lead-Acid)`;
  }

  document.getElementById('b2bCo2Offset').innerText = `${quote.co2OffsetTons} Tons CO₂ Avoided`;
}

/**
 * Initialize Chart.js SOH Degradation Curve Simulator
 */
function initSimChart() {
  const ctx = document.getElementById('degradationChart');
  if (!ctx) return;

  degradationChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'LFP (Lithium Iron Phosphate)',
          borderColor: '#059669',
          backgroundColor: 'rgba(5, 150, 105, 0.1)',
          borderWidth: 2.5,
          data: [],
          tension: 0.3
        },
        {
          label: 'NMC (Nickel Manganese Cobalt)',
          borderColor: '#0284c7',
          backgroundColor: 'rgba(2, 132, 199, 0.1)',
          borderWidth: 2.5,
          data: [],
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: { display: true, text: 'Cycle Count', color: '#475569' },
          grid: { color: '#e2e8f0' },
          ticks: { color: '#475569' }
        },
        y: {
          title: { display: true, text: 'State of Health (SOH %)', color: '#475569' },
          min: 40,
          max: 100,
          grid: { color: '#e2e8f0' },
          ticks: { color: '#475569' }
        }
      },
      plugins: {
        legend: { labels: { color: '#0f172a' } }
      }
    }
  });

  updateSimChart();
}

/**
 * Update Simulator Chart when sliders move
 */
function updateSimChart() {
  const chemistry = document.getElementById('simChemistry').value;
  const ageYears = Number(document.getElementById('simAge').value) || 3;
  const dodPercent = Number(document.getElementById('simDoD').value) || 80;
  const avgTempC = Number(document.getElementById('simTemp').value) || 32;

  // Update slider label displays
  document.getElementById('simAgeVal').innerText = `${ageYears} yrs`;
  document.getElementById('simDoDVal').innerText = `${dodPercent} %`;
  document.getElementById('simTempVal').innerText = `${avgTempC} °C`;

  // Generate 0 to 3500 cycles points
  const cyclePoints = [0, 300, 600, 900, 1200, 1500, 1800, 2100, 2400, 2700, 3000, 3300];
  const lfpSoh = [];
  const nmcSoh = [];

  cyclePoints.forEach(cycles => {
    const resLFP = window.GradingEngine.calculateProvisionalSOH({
      category: '3W',
      chemistry: 'LFP',
      ageYears,
      cycleCount: cycles,
      dodPercent,
      avgTempC,
      packCapacityKWh: 7.5
    });
    lfpSoh.push(resLFP.estimatedSOH);

    const resNMC = window.GradingEngine.calculateProvisionalSOH({
      category: '3W',
      chemistry: 'NMC',
      ageYears,
      cycleCount: cycles,
      dodPercent,
      avgTempC,
      packCapacityKWh: 7.5
    });
    nmcSoh.push(resNMC.estimatedSOH);
  });

  if (degradationChartInstance) {
    degradationChartInstance.data.labels = cyclePoints.map(c => `${c}`);
    degradationChartInstance.data.datasets[0].data = lfpSoh;
    degradationChartInstance.data.datasets[1].data = nmcSoh;
    degradationChartInstance.update();
  }

  // Update text summary box
  const summaryEl = document.getElementById('simSummaryText');
  if (summaryEl) {
    const selectedRes = window.GradingEngine.calculateProvisionalSOH({
      category: '3W',
      chemistry,
      ageYears,
      cycleCount: 1200,
      dodPercent,
      avgTempC,
      packCapacityKWh: 7.5
    });

    summaryEl.innerHTML = `
      <div style="color: var(--accent-cyan); font-weight: 700; margin-bottom: 0.25rem;">
        Degradation Comparison at 1,200 Cycles (${ageYears} Yrs, ${avgTempC}°C, ${dodPercent}% DoD):
      </div>
      <div>• <strong>LFP:</strong> ~${lfpSoh[4]}% SOH (Flatter slope, highly thermal tolerant)</div>
      <div>• <strong>NMC:</strong> ~${nmcSoh[4]}% SOH (Steeper degradation under heat/high DoD)</div>
    `;
  }
}

/**
 * Filter B2B Inventory Pool Table by Grade Tier
 */
function filterB2BPool(selectedTier) {
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');

  const tbody = document.querySelector('#poolTable tbody');
  if (!tbody) return;

  const pool = window.GradingEngine.generateAggregatedPool();
  tbody.innerHTML = '';

  const filtered = selectedTier === 'ALL' ? pool : pool.filter(item => item.grade === selectedTier);

  filtered.forEach(item => {
    const tr = document.createElement('tr');
    const gradeInfo = window.GradingEngine.determineGrade(item.avgSOH);
    const warranty = window.GradingEngine.getWarrantyStructure(item.grade);

    tr.innerHTML = `
      <td>
        <span class="result-header-badge" style="background: ${gradeInfo.badgeBg || '#d1fae5'}; color: ${gradeInfo.badgeText || '#065f46'}; border: 1px solid ${gradeInfo.badgeColor}40;">
          ${item.grade.replace('_', ' ')}
        </span>
      </td>
      <td><strong>${item.avgSOH}%</strong></td>
      <td><span class="tag-calibrated">${item.primaryChemistry}</span></td>
      <td><strong>${item.totalKWh} kWh</strong> (${item.availablePacks} packs)</td>
      <td>${item.targetUse}</td>
      <td><strong style="color: var(--accent-cyan);">₹${item.avgPricePerKWh.toLocaleString('en-IN')}</strong> / kWh</td>
      <td style="font-size: 0.8rem; color: var(--text-muted);">${warranty.durationMonths} Mo Prorated (${warranty.riskLevel})</td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Certificate Modal Handlers
 */
function openCertificateModal() {
  if (!currentProvisionalResult) return;

  const res = currentProvisionalResult;
  const modal = document.getElementById('certificateModal');
  const content = document.getElementById('certificateContent');

  if (content) {
    const now = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    const certId = 'CERT-BWMR-' + Math.floor(100000 + Math.random() * 900000);

    content.innerHTML = `
      <div style="border: 2px solid var(--accent-emerald); padding: 1.5rem; border-radius: var(--radius-md); background: #ffffff;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid var(--border-color); padding-bottom: 1rem; margin-bottom: 1rem;">
          <div>
            <h2 style="color: var(--accent-emerald); font-size: 1.25rem; font-weight: 800;">OFFICIAL EV BATTERY VALUATION REPORT</h2>
            <p style="font-size: 0.8rem; color: var(--text-muted);">Re-Energize Secondary Exchange • MoEFCC BWMR 2022 Compliant</p>
          </div>
          <div style="text-align: right; font-size: 0.8rem; color: var(--text-muted);">
            <div><strong>ID:</strong> ${certId}</div>
            <div><strong>Date:</strong> ${now}</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; font-size: 0.85rem;">
          <div>
            <div><strong>Vehicle Category:</strong> ${res.inputs.categoryName}</div>
            <div><strong>Chemistry:</strong> ${res.inputs.chemistryName}</div>
            <div><strong>Age:</strong> ${res.inputs.ageYears} Years</div>
            <div><strong>Odometer:</strong> ${res.inputs.odometerKm.toLocaleString()} Km (~${res.inputs.cycles} cycles)</div>
          </div>
          <div>
            <div><strong>Verified SOH:</strong> <span style="color: var(--accent-emerald); font-weight: 800;">${res.estimatedSOH}%</span></div>
            <div><strong>Grading Tier:</strong> <strong>${res.gradeName}</strong></div>
            <div><strong>Second-Life Application:</strong> ${res.secondLifeApplication}</div>
            <div><strong>Warranty Term:</strong> ${res.warranty.durationMonths} Months (${res.warranty.type})</div>
          </div>
        </div>

        <div style="background: var(--bg-app); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); margin-bottom: 1rem;">
          <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.5rem;">Valuation & Legal Compliance Breakdown</h4>
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
            <span>Platform Graded Valuation Base:</span>
            <strong>₹${res.payout.platformBasePayoutINR.toLocaleString('en-IN')}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
            <span>Estimated EPR Credit Value (BWMR 2022):</span>
            <strong style="color: var(--accent-emerald);">₹${res.payout.estimatedEPRCreditINR.toLocaleString('en-IN')}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 1rem; font-weight: 800; border-top: 1px dashed var(--border-color); padding-top: 0.4rem; margin-top: 0.4rem;">
            <span>Total Certified Valuation Payout:</span>
            <span style="color: var(--accent-emerald);">₹${res.payout.totalPayoutINR.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div style="font-size: 0.75rem; color: var(--text-muted); line-height: 1.4;">
          * Certified under Extended Producer Responsibility (EPR) guidelines of Battery Waste Management Rules 2022. Valuation subject to doorstep physical verification and BMS sync.
        </div>
      </div>
    `;
  }

  if (modal) modal.classList.add('active');
}

function closeCertificateModal() {
  const modal = document.getElementById('certificateModal');
  if (modal) modal.classList.remove('active');
}

/**
 * Calculation Trace Modal Handlers
 */
function openCalculationTraceModal() {
  if (!currentProvisionalResult) return;

  const res = currentProvisionalResult;
  const modal = document.getElementById('traceModal');
  const content = document.getElementById('traceContent');

  if (content) {
    content.innerHTML = `
      <div style="font-family: monospace; font-size: 0.82rem; background: var(--bg-app); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); line-height: 1.6;">
        <div style="color: var(--accent-emerald); font-weight: 700; margin-bottom: 0.5rem;">[1] INPUT DECLARATION & CYCLES DERIVATION</div>
        <div>• Category: ${res.inputs.category} (${res.inputs.categoryName})</div>
        <div>• Chemistry: ${res.inputs.chemistry} (Nominal Cycle Life: ${res.inputs.chemistry === 'LFP' ? 2800 : 1600} cycles)</div>
        <div>• Distance: ${res.inputs.odometerKm.toLocaleString()} km ➔ Derived Cycles: ${res.inputs.cycles} cycles</div>
        
        <div style="color: var(--accent-cyan); font-weight: 700; margin-top: 1rem; margin-bottom: 0.5rem;">[2] DEGRADATION PHYSICS MODEL COMPUTE</div>
        <div>• Cyclic Loss = 20 * (${res.inputs.cycles} / N_nom)^alpha * DoD_factor</div>
        <div>  = <strong>${res.degradationBreakdown.cyclicLossPercent}% SOH Loss</strong></div>
        <div>• Calendar Loss = (Cal_rate * ${res.inputs.ageYears} yrs) * Arrhenius(${res.inputs.avgTempC}°C)</div>
        <div>  = <strong>${res.degradationBreakdown.calendarLossPercent}% SOH Loss</strong> (Thermal Multiplier: ${res.degradationBreakdown.arrheniusThermalMultiplier}x)</div>
        <div>• Total Degradation = ${res.degradationBreakdown.totalLossPercent}% ➔ Computed SOH = 100 - ${res.degradationBreakdown.totalLossPercent} = <strong style="color: var(--accent-emerald);">${res.estimatedSOH}% SOH</strong></div>

        <div style="color: var(--accent-amber); font-weight: 700; margin-top: 1rem; margin-bottom: 0.5rem;">[3] VALUATION & EPR CREDIT MAPPING</div>
        <div>• Grade Tier: <strong>${res.gradeName}</strong></div>
        <div>• Base Rate per kWh: ₹${res.payout.baseRatePerKWh} * ${res.inputs.packCapacityKWh} kWh = ₹${res.payout.platformBasePayoutINR.toLocaleString('en-IN')}</div>
        <div>• EPR Credit (BWMR 2022): ₹${res.payout.eprRatePerKWh} * ${res.inputs.packCapacityKWh} kWh = ₹${res.payout.estimatedEPRCreditINR.toLocaleString('en-IN')}</div>
        <div>• Total Payout = ₹${res.payout.totalPayoutINR.toLocaleString('en-IN')} (vs Un-graded Informal Scrap ₹${res.payout.informalScrapBaselineINR.toLocaleString('en-IN')})</div>
      </div>
    `;
  }

  if (modal) modal.classList.add('active');
}

function closeCalculationTraceModal() {
  const modal = document.getElementById('traceModal');
  if (modal) modal.classList.remove('active');
}

