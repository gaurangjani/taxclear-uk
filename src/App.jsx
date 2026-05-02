import { useState, useMemo, useCallback } from "react";

// ─── TAX CONSTANTS 2024/25 ────────────────────────────────────────────────────
const TAX = {
  PERSONAL_ALLOWANCE: 12570,
  BASIC_RATE_LIMIT: 50270,
  HIGHER_RATE_LIMIT: 125140,
  BASIC_RATE: 0.20,
  HIGHER_RATE: 0.40,
  ADDITIONAL_RATE: 0.45,
  // NI Employee
  NI_PRIMARY_THRESHOLD: 12570,
  NI_UPPER_EARNINGS: 50270,
  NI_MAIN_RATE: 0.08,
  NI_UPPER_RATE: 0.02,
  // NI Self-Employed
  CLASS2_WEEKLY: 3.45,
  CLASS4_MAIN: 0.06,
  CLASS4_UPPER: 0.02,
  CLASS4_LOWER_PROFIT: 12570,
  CLASS4_UPPER_PROFIT: 50270,
  // Pension
  PENSION_ANNUAL_ALLOWANCE: 60000,
  // CGT
  CGT_ALLOWANCE: 3000,
  CGT_BASIC_RATE_RESIDENTIAL: 0.18,
  CGT_HIGHER_RATE_RESIDENTIAL: 0.28,
  CGT_BASIC_RATE_OTHER: 0.10,
  CGT_HIGHER_RATE_OTHER: 0.20,
  // Dividends
  DIVIDEND_ALLOWANCE: 500,
  DIVIDEND_BASIC: 0.0875,
  DIVIDEND_HIGHER: 0.3375,
  DIVIDEND_ADDITIONAL: 0.3938,
  // VAT
  VAT_STANDARD: 0.20,
  VAT_REDUCED: 0.05,
  // ISA
  ISA_ALLOWANCE: 20000,
  // Corporation Tax
  CORP_SMALL: 0.19,
  CORP_MAIN: 0.25,
  CORP_SMALL_LIMIT: 50000,
  CORP_MAIN_LIMIT: 250000,
  // Student Loan
  SL_PLAN1_THRESHOLD: 22015,
  SL_PLAN2_THRESHOLD: 27295,
  SL_PLAN4_THRESHOLD: 27660,
  SL_PLAN5_THRESHOLD: 25000,
  SL_RATE: 0.09,
  // Child Benefit
  CHILD_BENEFIT_RATE1: 25.60,
  CHILD_BENEFIT_ADDITIONAL: 16.95,
  HICBC_THRESHOLD: 60000,
  HICBC_UPPER: 80000,
  // Marriage Allowance
  MARRIAGE_ALLOWANCE: 1260,
};

const fmt = (n) => `£${Math.round(n).toLocaleString("en-GB")}`;
const fmtP = (n) => `${(n * 100).toFixed(1)}%`;
const fmtPct = (n) => `${n}%`;

// ─── CALCULATIONS ─────────────────────────────────────────────────────────────
function calcIncomeTax(grossIncome, personalAllowance = TAX.PERSONAL_ALLOWANCE, pensionContrib = 0) {
  const taxableIncome = Math.max(0, grossIncome - personalAllowance - pensionContrib);
  const basicBand = Math.max(0, TAX.BASIC_RATE_LIMIT - TAX.PERSONAL_ALLOWANCE);
  
  let basicTax = 0, higherTax = 0, additionalTax = 0;
  
  if (taxableIncome <= basicBand) {
    basicTax = taxableIncome * TAX.BASIC_RATE;
  } else if (taxableIncome <= TAX.HIGHER_RATE_LIMIT - TAX.PERSONAL_ALLOWANCE) {
    basicTax = basicBand * TAX.BASIC_RATE;
    higherTax = (taxableIncome - basicBand) * TAX.HIGHER_RATE;
  } else {
    basicTax = basicBand * TAX.BASIC_RATE;
    higherTax = (TAX.HIGHER_RATE_LIMIT - TAX.BASIC_RATE_LIMIT) * TAX.HIGHER_RATE;
    additionalTax = (taxableIncome - (TAX.HIGHER_RATE_LIMIT - TAX.PERSONAL_ALLOWANCE)) * TAX.ADDITIONAL_RATE;
  }
  
  const total = basicTax + higherTax + additionalTax;
  return { basicTax, higherTax, additionalTax, total, taxableIncome };
}

function calcNIEmployee(grossIncome) {
  const main = Math.max(0, Math.min(grossIncome, TAX.NI_UPPER_EARNINGS) - TAX.NI_PRIMARY_THRESHOLD) * TAX.NI_MAIN_RATE;
  const upper = Math.max(0, grossIncome - TAX.NI_UPPER_EARNINGS) * TAX.NI_UPPER_RATE;
  return { main, upper, total: main + upper };
}

function calcNISelfEmployed(profits) {
  const class2 = profits > TAX.NI_PRIMARY_THRESHOLD ? TAX.CLASS2_WEEKLY * 52 : 0;
  const class4Main = Math.max(0, Math.min(profits, TAX.CLASS4_UPPER_PROFIT) - TAX.CLASS4_LOWER_PROFIT) * TAX.CLASS4_MAIN;
  const class4Upper = Math.max(0, profits - TAX.CLASS4_UPPER_PROFIT) * TAX.CLASS4_UPPER;
  return { class2, class4Main, class4Upper, total: class2 + class4Main + class4Upper };
}

function calcDividendTax(dividends, otherIncome, personalAllowance = TAX.PERSONAL_ALLOWANCE) {
  const taxableOther = Math.max(0, otherIncome - personalAllowance);
  const taxableDividends = Math.max(0, dividends - TAX.DIVIDEND_ALLOWANCE);
  const remainingBasicBand = Math.max(0, (TAX.BASIC_RATE_LIMIT - TAX.PERSONAL_ALLOWANCE) - taxableOther);
  
  let basicDiv = 0, higherDiv = 0, additionalDiv = 0;
  if (taxableDividends <= remainingBasicBand) {
    basicDiv = taxableDividends * TAX.DIVIDEND_BASIC;
  } else if (taxableDividends <= remainingBasicBand + (TAX.HIGHER_RATE_LIMIT - TAX.BASIC_RATE_LIMIT)) {
    basicDiv = remainingBasicBand * TAX.DIVIDEND_BASIC;
    higherDiv = (taxableDividends - remainingBasicBand) * TAX.DIVIDEND_HIGHER;
  } else {
    basicDiv = remainingBasicBand * TAX.DIVIDEND_BASIC;
    higherDiv = (TAX.HIGHER_RATE_LIMIT - TAX.BASIC_RATE_LIMIT) * TAX.DIVIDEND_HIGHER;
    additionalDiv = (taxableDividends - remainingBasicBand - (TAX.HIGHER_RATE_LIMIT - TAX.BASIC_RATE_LIMIT)) * TAX.DIVIDEND_ADDITIONAL;
  }
  
  return { basicDiv, higherDiv, additionalDiv, total: basicDiv + higherDiv + additionalDiv };
}

function calcCGT(gain, otherIncome, assetType = "other", personalAllowance = TAX.PERSONAL_ALLOWANCE) {
  const taxableGain = Math.max(0, gain - TAX.CGT_ALLOWANCE);
  const taxableOther = Math.max(0, otherIncome - personalAllowance);
  const remainingBasicBand = Math.max(0, (TAX.BASIC_RATE_LIMIT - TAX.PERSONAL_ALLOWANCE) - taxableOther);
  const isResidential = assetType === "residential";
  const basicRate = isResidential ? TAX.CGT_BASIC_RATE_RESIDENTIAL : TAX.CGT_BASIC_RATE_OTHER;
  const higherRate = isResidential ? TAX.CGT_HIGHER_RATE_RESIDENTIAL : TAX.CGT_HIGHER_RATE_OTHER;
  
  const basicGain = Math.min(taxableGain, remainingBasicBand);
  const higherGain = Math.max(0, taxableGain - remainingBasicBand);
  const basicTax = basicGain * basicRate;
  const higherTax = higherGain * higherRate;
  
  return { basicTax, higherTax, total: basicTax + higherTax, taxableGain };
}

function calcStudentLoan(income, plan) {
  const thresholds = { 1: TAX.SL_PLAN1_THRESHOLD, 2: TAX.SL_PLAN2_THRESHOLD, 4: TAX.SL_PLAN4_THRESHOLD, 5: TAX.SL_PLAN5_THRESHOLD };
  const threshold = thresholds[plan] || TAX.SL_PLAN2_THRESHOLD;
  return Math.max(0, income - threshold) * TAX.SL_RATE;
}

function calcChildBenefit(children, income) {
  const firstChild = TAX.CHILD_BENEFIT_RATE1 * 52;
  const additionalChildren = Math.max(0, children - 1) * TAX.CHILD_BENEFIT_ADDITIONAL * 52;
  const totalBenefit = firstChild + additionalChildren;
  let hicbcCharge = 0;
  if (income > TAX.HICBC_THRESHOLD) {
    const excessProportion = Math.min(1, (income - TAX.HICBC_THRESHOLD) / (TAX.HICBC_UPPER - TAX.HICBC_THRESHOLD));
    hicbcCharge = totalBenefit * excessProportion;
  }
  return { totalBenefit, hicbcCharge, netBenefit: totalBenefit - hicbcCharge };
}

function calcVAT(amount, rate, direction) {
  if (direction === "add") {
    const vat = amount * rate;
    return { net: amount, vat, gross: amount + vat };
  } else {
    const net = amount / (1 + rate);
    const vat = amount - net;
    return { net, vat, gross: amount };
  }
}

function calcCorpTax(profit) {
  if (profit <= TAX.CORP_SMALL_LIMIT) return { tax: profit * TAX.CORP_SMALL, rate: TAX.CORP_SMALL };
  if (profit >= TAX.CORP_MAIN_LIMIT) return { tax: profit * TAX.CORP_MAIN, rate: TAX.CORP_MAIN };
  // Marginal relief
  const mainTax = profit * TAX.CORP_MAIN;
  const marginalRelief = (TAX.CORP_MAIN_LIMIT - profit) * ((TAX.CORP_MAIN - TAX.CORP_SMALL) / (TAX.CORP_MAIN_LIMIT - TAX.CORP_SMALL_LIMIT));
  const tax = mainTax - marginalRelief;
  return { tax, rate: tax / profit };
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

  :root {
    --bg: #0c1220;
    --surface: #111827;
    --surface2: #1a2436;
    --surface3: #243044;
    --border: rgba(255,255,255,0.06);
    --border-light: rgba(255,255,255,0.12);
    --gold: #c9a84c;
    --gold-light: #e8c97a;
    --gold-dim: rgba(201,168,76,0.15);
    --green: #34c98b;
    --green-dim: rgba(52,201,139,0.12);
    --red: #f4606c;
    --red-dim: rgba(244,96,108,0.12);
    --blue: #5b9cf6;
    --blue-dim: rgba(91,156,246,0.12);
    --purple: #a78bfa;
    --purple-dim: rgba(167,139,250,0.12);
    --orange: #fb923c;
    --orange-dim: rgba(251,146,60,0.12);
    --text: #e8edf5;
    --text-dim: rgba(232,237,245,0.55);
    --text-muted: rgba(232,237,245,0.3);
    --radius: 12px;
    --radius-sm: 8px;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'DM Sans', sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
  }

  .app {
    min-height: 100vh;
    background: var(--bg);
    background-image:
      radial-gradient(ellipse at 20% 0%, rgba(201,168,76,0.06) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 100%, rgba(91,156,246,0.04) 0%, transparent 50%);
  }

  .header {
    background: linear-gradient(135deg, #0c1a2e 0%, #111827 100%);
    border-bottom: 1px solid var(--border);
    padding: 0 24px;
    position: sticky;
    top: 0;
    z-index: 100;
    backdrop-filter: blur(10px);
  }

  .header-inner {
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 64px;
    gap: 16px;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .logo-badge {
    width: 34px;
    height: 34px;
    background: linear-gradient(135deg, var(--gold), var(--gold-light));
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: 700;
    color: #0c1220;
    font-family: 'Playfair Display', serif;
    flex-shrink: 0;
  }

  .logo-text {
    font-family: 'Playfair Display', serif;
    font-weight: 700;
    font-size: 17px;
    color: var(--text);
    letter-spacing: -0.2px;
  }

  .logo-sub {
    font-size: 10px;
    color: var(--gold);
    font-weight: 500;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    display: block;
    margin-top: -2px;
  }

  .tax-year-badge {
    background: var(--gold-dim);
    border: 1px solid rgba(201,168,76,0.25);
    color: var(--gold-light);
    font-size: 11px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 20px;
    letter-spacing: 0.5px;
  }

  .nav-tabs {
    max-width: 1400px;
    margin: 0 auto;
    padding: 16px 24px 0;
    display: flex;
    gap: 4px;
    overflow-x: auto;
    scrollbar-width: none;
    flex-wrap: wrap;
  }

  .nav-tabs::-webkit-scrollbar { display: none; }

  .tab-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border: 1px solid transparent;
    border-radius: var(--radius-sm) var(--radius-sm) 0 0;
    background: transparent;
    color: var(--text-dim);
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }

  .tab-btn:hover {
    color: var(--text);
    background: var(--surface2);
  }

  .tab-btn.active {
    color: var(--gold-light);
    background: var(--surface);
    border-color: var(--border-light);
    border-bottom-color: var(--surface);
  }

  .tab-icon { font-size: 14px; }

  .content {
    max-width: 1400px;
    margin: 0 auto;
    padding: 24px;
  }

  .section-header {
    margin-bottom: 24px;
  }

  .section-title {
    font-family: 'Playfair Display', serif;
    font-size: 26px;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 4px;
  }

  .section-desc {
    font-size: 13px;
    color: var(--text-dim);
    line-height: 1.5;
  }

  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }

  @media (max-width: 900px) {
    .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
  }

  @media (max-width: 600px) {
    .content { padding: 16px; }
    .nav-tabs { padding: 12px 16px 0; }
    .header { padding: 0 16px; }
  }

  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    transition: border-color 0.15s;
  }

  .card:hover { border-color: var(--border-light); }

  .card-title {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .card-title-icon { font-size: 14px; }

  .stat-value {
    font-family: 'Playfair Display', serif;
    font-size: 32px;
    font-weight: 700;
    color: var(--text);
    line-height: 1;
    margin-bottom: 4px;
  }

  .stat-sub {
    font-size: 12px;
    color: var(--text-dim);
  }

  .stat-value.green { color: var(--green); }
  .stat-value.red { color: var(--red); }
  .stat-value.gold { color: var(--gold-light); }
  .stat-value.blue { color: var(--blue); }

  .input-group {
    margin-bottom: 16px;
  }

  .input-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-dim);
    margin-bottom: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    letter-spacing: 0.3px;
  }

  .input-hint {
    font-size: 11px;
    color: var(--text-muted);
    font-weight: 400;
  }

  .input-wrap {
    position: relative;
  }

  .input-prefix {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--gold);
    font-weight: 600;
    font-size: 14px;
    pointer-events: none;
    z-index: 1;
  }

  input[type="number"], input[type="text"], select {
    width: 100%;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 500;
    padding: 10px 12px;
    outline: none;
    transition: border-color 0.15s;
    -moz-appearance: textfield;
    appearance: textfield;
  }

  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; }

  .has-prefix input { padding-left: 28px; }

  input:focus, select:focus {
    border-color: var(--gold);
    background: var(--surface3);
  }

  select option { background: var(--surface2); }

  .result-panel {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }

  .result-panel-header {
    padding: 14px 20px;
    background: var(--surface3);
    border-bottom: 1px solid var(--border);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .result-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 20px;
    border-bottom: 1px solid var(--border);
    transition: background 0.1s;
  }

  .result-row:hover { background: rgba(255,255,255,0.02); }
  .result-row:last-child { border-bottom: none; }

  .result-row-label {
    font-size: 13px;
    color: var(--text-dim);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .result-row-value {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }

  .result-row-value.red { color: var(--red); }
  .result-row-value.green { color: var(--green); }
  .result-row-value.gold { color: var(--gold-light); }
  .result-row-value.blue { color: var(--blue); }
  .result-row-value.purple { color: var(--purple); }

  .result-row.total {
    background: var(--gold-dim);
    border-top: 1px solid rgba(201,168,76,0.15);
  }

  .result-row.total .result-row-label { color: var(--gold-light); font-weight: 600; }
  .result-row.total .result-row-value { color: var(--gold-light); font-size: 16px; }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .dot.red { background: var(--red); }
  .dot.blue { background: var(--blue); }
  .dot.purple { background: var(--purple); }
  .dot.orange { background: var(--orange); }
  .dot.green { background: var(--green); }
  .dot.gold { background: var(--gold); }

  .info-box {
    background: var(--blue-dim);
    border: 1px solid rgba(91,156,246,0.15);
    border-radius: var(--radius-sm);
    padding: 12px 14px;
    font-size: 12px;
    color: var(--blue);
    line-height: 1.6;
    margin-top: 16px;
  }

  .info-box.gold {
    background: var(--gold-dim);
    border-color: rgba(201,168,76,0.2);
    color: var(--gold-light);
  }

  .info-box.green {
    background: var(--green-dim);
    border-color: rgba(52,201,139,0.2);
    color: var(--green);
  }

  .info-box.red {
    background: var(--red-dim);
    border-color: rgba(244,96,108,0.2);
    color: var(--red);
  }

  .progress-bar-wrap {
    margin-top: 12px;
    margin-bottom: 4px;
  }

  .progress-label {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--text-muted);
    margin-bottom: 4px;
  }

  .progress-track {
    height: 6px;
    background: var(--surface3);
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.4s ease;
  }

  .band-bar {
    display: flex;
    height: 24px;
    border-radius: 6px;
    overflow: hidden;
    margin: 12px 0 6px;
    gap: 2px;
  }

  .band-segment {
    height: 100%;
    transition: flex 0.4s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 600;
    color: rgba(0,0,0,0.6);
    overflow: hidden;
    white-space: nowrap;
  }

  .toggle-group {
    display: flex;
    gap: 2px;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 3px;
    margin-bottom: 16px;
  }

  .toggle-btn {
    flex: 1;
    padding: 7px 12px;
    background: transparent;
    border: none;
    border-radius: 5px;
    color: var(--text-dim);
    font-family: 'DM Sans', sans-serif;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .toggle-btn.active {
    background: var(--gold);
    color: #0c1220;
    font-weight: 600;
  }

  .rate-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
  }

  .rate-badge.basic { background: var(--blue-dim); color: var(--blue); }
  .rate-badge.higher { background: var(--orange-dim); color: var(--orange); }
  .rate-badge.additional { background: var(--red-dim); color: var(--red); }

  .divider {
    height: 1px;
    background: var(--border);
    margin: 20px 0;
  }

  .dashboard-summary {
    background: linear-gradient(135deg, #111827, #1a2436);
    border: 1px solid rgba(201,168,76,0.15);
    border-radius: var(--radius);
    padding: 24px;
    position: relative;
    overflow: hidden;
  }

  .dashboard-summary::before {
    content: '';
    position: absolute;
    top: -50px;
    right: -50px;
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%);
    pointer-events: none;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 20px;
    margin-top: 20px;
  }

  .summary-item { text-align: center; }

  .summary-item-value {
    font-family: 'Playfair Display', serif;
    font-size: 22px;
    font-weight: 700;
    margin-bottom: 2px;
  }

  .summary-item-label {
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }

  .pie-wrap {
    display: flex;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
  }

  .pie-legend {
    flex: 1;
    min-width: 150px;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 0;
    font-size: 12px;
    color: var(--text-dim);
    justify-content: space-between;
  }

  .legend-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .legend-value {
    font-weight: 600;
    color: var(--text);
    font-size: 12px;
  }

  .vat-toggle { margin-bottom: 12px; }

  .allowance-card {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .allowance-name { font-size: 13px; color: var(--text-dim); }
  .allowance-amount { font-size: 14px; font-weight: 700; color: var(--gold-light); }
  .allowance-note { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

  .tabs-content {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 0 var(--radius) var(--radius) var(--radius);
    padding: 0;
  }

  .effective-rate-ring {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .effective-rate-ring svg { transform: rotate(-90deg); }
  .effective-rate-center {
    position: absolute;
    text-align: center;
  }

  .effective-rate-pct {
    font-family: 'Playfair Display', serif;
    font-size: 20px;
    font-weight: 700;
    color: var(--gold-light);
    line-height: 1;
  }

  .effective-rate-label {
    font-size: 9px;
    color: var(--text-muted);
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
`;

// ─── SVG DONUT CHART ─────────────────────────────────────────────────────────
function DonutChart({ segments, size = 100, strokeWidth = 12 }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((a, s) => a + s.value, 0);
  let cumulative = 0;

  return (
    <svg width={size} height={size} style={{ overflow: "visible" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={strokeWidth} />
      {segments.map((seg, i) => {
        if (!seg.value || !total) return null;
        const pct = seg.value / total;
        const offset = circ - pct * circ;
        const rotate = (cumulative / total) * 360 - 90;
        cumulative += seg.value;
        return (
          <circle
            key={i} cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={seg.color} strokeWidth={strokeWidth}
            strokeDasharray={`${pct * circ} ${circ}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            style={{ transform: `rotate(${rotate + 90}deg)`, transformOrigin: `${size / 2}px ${size / 2}px`, transition: "all 0.4s" }}
          />
        );
      })}
    </svg>
  );
}

// ─── RING GAUGE ───────────────────────────────────────────────────────────────
function EffectiveRateRing({ rate, size = 110 }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, rate);
  return (
    <div className="effective-rate-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 110 110">
        <circle cx={55} cy={55} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={9} />
        <circle cx={55} cy={55} r={r} fill="none" stroke="url(#goldGrad)" strokeWidth={9}
          strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
          style={{ transform: "rotate(-90deg)", transformOrigin: "55px 55px", transition: "stroke-dasharray 0.5s" }}
        />
        <defs>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#c9a84c" />
            <stop offset="100%" stopColor="#e8c97a" />
          </linearGradient>
        </defs>
      </svg>
      <div className="effective-rate-center">
        <div className="effective-rate-pct">{(rate * 100).toFixed(1)}%</div>
        <div className="effective-rate-label">Effective</div>
      </div>
    </div>
  );
}

// ─── TABS ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "dashboard", label: "Dashboard", icon: "🏠" },
  { id: "income", label: "Income Tax", icon: "📊" },
  { id: "ni", label: "Nat. Insurance", icon: "🛡️" },
  { id: "vat", label: "VAT", icon: "🧾" },
  { id: "pension", label: "Pension", icon: "🏦" },
  { id: "cgt", label: "Capital Gains", icon: "📈" },
  { id: "dividends", label: "Dividends", icon: "💰" },
  { id: "corp", label: "Corp. Tax", icon: "🏢" },
  { id: "benefits", label: "Benefits & More", icon: "🎁" },
  { id: "allowances", label: "Allowances", icon: "✅" },
];

// ─── INCOME TAX TAB ───────────────────────────────────────────────────────────
function IncomeTaxTab() {
  const [income, setIncome] = useState(45000);
  const [pension, setPension] = useState(0);
  const [marriageAllowance, setMarriageAllowance] = useState(false);
  const [employmentType, setEmploymentType] = useState("employed");
  const [studentLoan, setStudentLoan] = useState("none");

  const pa = marriageAllowance ? TAX.PERSONAL_ALLOWANCE - TAX.MARRIAGE_ALLOWANCE : TAX.PERSONAL_ALLOWANCE;
  const it = useMemo(() => calcIncomeTax(income, pa, pension), [income, pa, pension]);
  const ni = useMemo(() => employmentType === "employed" ? calcNIEmployee(income) : calcNISelfEmployed(income), [income, employmentType]);
  const sl = useMemo(() => studentLoan !== "none" ? calcStudentLoan(income, parseInt(studentLoan)) : 0, [income, studentLoan]);
  const effectiveRate = income > 0 ? (it.total + ni.total) / income : 0;
  const takeHome = income - it.total - ni.total - sl - pension;
  const grossBands = TAX.BASIC_RATE_LIMIT - TAX.PERSONAL_ALLOWANCE;

  return (
    <div>
      <div className="grid-2" style={{ gap: 20 }}>
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title"><span className="card-title-icon">⚙️</span> Income Details</div>
            <div className="toggle-group">
              <button className={`toggle-btn ${employmentType === "employed" ? "active" : ""}`} onClick={() => setEmploymentType("employed")}>Employed</button>
              <button className={`toggle-btn ${employmentType === "self" ? "active" : ""}`} onClick={() => setEmploymentType("self")}>Self-Employed</button>
            </div>
            <div className="input-group">
              <div className="input-label">Gross Annual Income <span className="input-hint">{fmt(income)}</span></div>
              <div className="input-wrap has-prefix"><span className="input-prefix">£</span>
                <input type="number" value={income} onChange={e => setIncome(+e.target.value || 0)} min={0} max={500000} />
              </div>
            </div>
            <div className="input-group">
              <div className="input-label">Pension Contribution (Annual) <span className="input-hint">{fmt(pension)}</span></div>
              <div className="input-wrap has-prefix"><span className="input-prefix">£</span>
                <input type="number" value={pension} onChange={e => setPension(+e.target.value || 0)} min={0} />
              </div>
            </div>
            <div className="input-group">
              <div className="input-label">Student Loan</div>
              <select value={studentLoan} onChange={e => setStudentLoan(e.target.value)}>
                <option value="none">None</option>
                <option value="1">Plan 1 (pre-2012)</option>
                <option value="2">Plan 2 (2012-2023)</option>
                <option value="4">Plan 4 (Scotland)</option>
                <option value="5">Plan 5 (2023+)</option>
              </select>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "var(--text-dim)" }}>
              <input type="checkbox" checked={marriageAllowance} onChange={e => setMarriageAllowance(e.target.checked)} style={{ width: "auto", accentColor: "var(--gold)" }} />
              Transfer Marriage Allowance (partner unused allowance)
            </label>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1 }}>
              <EffectiveRateRing rate={effectiveRate} />
            </div>
            <div style={{ flex: 2 }}>
              <div style={{ marginBottom: 8 }}>
                <div className="stat-value green">{fmt(takeHome)}</div>
                <div className="stat-sub">Annual Take-Home</div>
              </div>
              <div style={{ marginBottom: 4 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{fmt(Math.round(takeHome / 12))}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Monthly</div>
              </div>
            </div>
          </div>

          {income > TAX.PERSONAL_ALLOWANCE && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Tax Band Exposure</div>
              <div className="band-bar">
                <div className="band-segment" style={{ flex: pa, background: "var(--green)", opacity: 0.7 }}>0%</div>
                {income > pa && (
                  <div className="band-segment" style={{ flex: Math.min(income, TAX.BASIC_RATE_LIMIT) - pa, background: "var(--blue)" }}>20%</div>
                )}
                {income > TAX.BASIC_RATE_LIMIT && (
                  <div className="band-segment" style={{ flex: Math.min(income, TAX.HIGHER_RATE_LIMIT) - TAX.BASIC_RATE_LIMIT, background: "var(--orange)" }}>40%</div>
                )}
                {income > TAX.HIGHER_RATE_LIMIT && (
                  <div className="band-segment" style={{ flex: income - TAX.HIGHER_RATE_LIMIT, background: "var(--red)" }}>45%</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="result-panel" style={{ marginBottom: 16 }}>
            <div className="result-panel-header">📊 Income Tax Breakdown</div>
            <div className="result-row">
              <div className="result-row-label"><div className="dot green" />Personal Allowance</div>
              <div className="result-row-value green">{fmt(pa)}</div>
            </div>
            {it.basicTax > 0 && (
              <div className="result-row">
                <div className="result-row-label"><div className="dot blue" />Basic Rate (20%) on {fmt(Math.min(it.taxableIncome, grossBands))}</div>
                <div className="result-row-value red">{fmt(it.basicTax)}</div>
              </div>
            )}
            {it.higherTax > 0 && (
              <div className="result-row">
                <div className="result-row-label"><div className="dot orange" />Higher Rate (40%)</div>
                <div className="result-row-value red">{fmt(it.higherTax)}</div>
              </div>
            )}
            {it.additionalTax > 0 && (
              <div className="result-row">
                <div className="result-row-label"><div className="dot red" />Additional Rate (45%)</div>
                <div className="result-row-value red">{fmt(it.additionalTax)}</div>
              </div>
            )}
            <div className="result-row total">
              <div className="result-row-label">Total Income Tax</div>
              <div className="result-row-value">{fmt(it.total)}</div>
            </div>
          </div>

          <div className="result-panel" style={{ marginBottom: 16 }}>
            <div className="result-panel-header">🛡️ National Insurance</div>
            {employmentType === "employed" ? (
              <>
                <div className="result-row">
                  <div className="result-row-label"><div className="dot blue" />Main Rate (8%)</div>
                  <div className="result-row-value red">{fmt(ni.main)}</div>
                </div>
                <div className="result-row">
                  <div className="result-row-label"><div className="dot purple" />Upper Rate (2%)</div>
                  <div className="result-row-value red">{fmt(ni.upper)}</div>
                </div>
              </>
            ) : (
              <>
                <div className="result-row">
                  <div className="result-row-label"><div className="dot blue" />Class 2 (£3.45/wk)</div>
                  <div className="result-row-value red">{fmt(ni.class2)}</div>
                </div>
                <div className="result-row">
                  <div className="result-row-label"><div className="dot orange" />Class 4 Main (6%)</div>
                  <div className="result-row-value red">{fmt(ni.class4Main)}</div>
                </div>
                <div className="result-row">
                  <div className="result-row-label"><div className="dot red" />Class 4 Upper (2%)</div>
                  <div className="result-row-value red">{fmt(ni.class4Upper)}</div>
                </div>
              </>
            )}
            <div className="result-row total">
              <div className="result-row-label">Total NI</div>
              <div className="result-row-value">{fmt(ni.total)}</div>
            </div>
          </div>

          {sl > 0 && (
            <div className="result-panel" style={{ marginBottom: 16 }}>
              <div className="result-panel-header">🎓 Student Loan Repayment</div>
              <div className="result-row total">
                <div className="result-row-label">Annual Repayment (9%)</div>
                <div className="result-row-value">{fmt(sl)}</div>
              </div>
            </div>
          )}

          <div className="result-panel">
            <div className="result-panel-header">💷 Net Summary</div>
            <div className="result-row">
              <div className="result-row-label">Gross Income</div>
              <div className="result-row-value">{fmt(income)}</div>
            </div>
            <div className="result-row">
              <div className="result-row-label">Total Deductions</div>
              <div className="result-row-value red">−{fmt(it.total + ni.total + sl + pension)}</div>
            </div>
            <div className="result-row total">
              <div className="result-row-label">Take-Home Pay</div>
              <div className="result-row-value green">{fmt(takeHome)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── NI TAB ───────────────────────────────────────────────────────────────────
function NITab() {
  const [type, setType] = useState("employee");
  const [income, setIncome] = useState(35000);
  const [employerMatch, setEmployerMatch] = useState(true);

  const emp = useMemo(() => calcNIEmployee(income), [income]);
  const self = useMemo(() => calcNISelfEmployed(income), [income]);
  const employerNI = Math.max(0, Math.min(income, TAX.NI_UPPER_EARNINGS) - 9100) * 0.138 + Math.max(0, income - TAX.NI_UPPER_EARNINGS) * 0.138;

  return (
    <div>
      <div className="grid-2">
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title"><span className="card-title-icon">⚙️</span> NI Calculator</div>
            <div className="toggle-group">
              <button className={`toggle-btn ${type === "employee" ? "active" : ""}`} onClick={() => setType("employee")}>Employee</button>
              <button className={`toggle-btn ${type === "self" ? "active" : ""}`} onClick={() => setType("self")}>Self-Employed</button>
              <button className={`toggle-btn ${type === "employer" ? "active" : ""}`} onClick={() => setType("employer")}>Employer</button>
            </div>
            <div className="input-group">
              <div className="input-label">
                {type === "self" ? "Annual Profits" : "Annual Salary"} <span className="input-hint">{fmt(income)}</span>
              </div>
              <div className="input-wrap has-prefix"><span className="input-prefix">£</span>
                <input type="number" value={income} onChange={e => setIncome(+e.target.value || 0)} min={0} />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title"><span className="card-title-icon">📋</span> 2024/25 NI Rates</div>
            {[
              ["Employee Class 1 (Main)", "8%", "£12,570 – £50,270"],
              ["Employee Class 1 (Upper)", "2%", "Above £50,270"],
              ["Employer Class 1", "13.8%", "Above £9,100"],
              ["Self-Emp Class 2", "£3.45/wk", "Profits > £12,570"],
              ["Self-Emp Class 4 (Main)", "6%", "£12,570 – £50,270"],
              ["Self-Emp Class 4 (Upper)", "2%", "Above £50,270"],
            ].map(([name, rate, band]) => (
              <div key={name} className="result-row">
                <div className="result-row-label" style={{ flexDirection: "column", alignItems: "flex-start", gap: 1 }}>
                  <span>{name}</span>
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{band}</span>
                </div>
                <div className="result-row-value blue">{rate}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          {type === "employee" && (
            <div className="result-panel">
              <div className="result-panel-header">🛡️ Employee NI Breakdown</div>
              <div className="result-row">
                <div className="result-row-label"><div className="dot green" />Below Threshold (£12,570)</div>
                <div className="result-row-value">£0</div>
              </div>
              <div className="result-row">
                <div className="result-row-label"><div className="dot blue" />Main Rate 8% on {fmt(Math.max(0, Math.min(income, TAX.NI_UPPER_EARNINGS) - TAX.NI_PRIMARY_THRESHOLD))}</div>
                <div className="result-row-value red">{fmt(emp.main)}</div>
              </div>
              <div className="result-row">
                <div className="result-row-label"><div className="dot purple" />Upper Rate 2% on {fmt(Math.max(0, income - TAX.NI_UPPER_EARNINGS))}</div>
                <div className="result-row-value red">{fmt(emp.upper)}</div>
              </div>
              <div className="result-row total">
                <div className="result-row-label">Total Employee NI</div>
                <div className="result-row-value">{fmt(emp.total)}</div>
              </div>
              <div className="result-row">
                <div className="result-row-label">Effective NI Rate</div>
                <div className="result-row-value gold">{income > 0 ? fmtP(emp.total / income) : "0%"}</div>
              </div>
            </div>
          )}

          {type === "self" && (
            <div className="result-panel">
              <div className="result-panel-header">🛡️ Self-Employed NI Breakdown</div>
              <div className="result-row">
                <div className="result-row-label"><div className="dot blue" />Class 2 (52 weeks × £3.45)</div>
                <div className="result-row-value red">{fmt(self.class2)}</div>
              </div>
              <div className="result-row">
                <div className="result-row-label"><div className="dot orange" />Class 4 Main (6%)</div>
                <div className="result-row-value red">{fmt(self.class4Main)}</div>
              </div>
              <div className="result-row">
                <div className="result-row-label"><div className="dot red" />Class 4 Upper (2%)</div>
                <div className="result-row-value red">{fmt(self.class4Upper)}</div>
              </div>
              <div className="result-row total">
                <div className="result-row-label">Total Self-Employed NI</div>
                <div className="result-row-value">{fmt(self.total)}</div>
              </div>
              <div className="result-row">
                <div className="result-row-label">Effective NI Rate</div>
                <div className="result-row-value gold">{income > 0 ? fmtP(self.total / income) : "0%"}</div>
              </div>
            </div>
          )}

          {type === "employer" && (
            <div className="result-panel">
              <div className="result-panel-header">🏢 Employer NI Cost</div>
              <div className="result-row">
                <div className="result-row-label"><div className="dot green" />Below Secondary Threshold (£9,100)</div>
                <div className="result-row-value">£0</div>
              </div>
              <div className="result-row">
                <div className="result-row-label"><div className="dot red" />13.8% on {fmt(Math.max(0, income - 9100))}</div>
                <div className="result-row-value red">{fmt(employerNI)}</div>
              </div>
              <div className="result-row total">
                <div className="result-row-label">Employer NI Cost</div>
                <div className="result-row-value">{fmt(employerNI)}</div>
              </div>
              <div className="result-row">
                <div className="result-row-label">Total Employment Cost</div>
                <div className="result-row-value blue">{fmt(income + employerNI)}</div>
              </div>
              <div className="result-row">
                <div className="result-row-label">Cost vs Salary</div>
                <div className="result-row-value gold">{income > 0 ? fmtP(employerNI / income) : "0%"} uplift</div>
              </div>
            </div>
          )}

          <div className="info-box" style={{ marginTop: 16 }}>
            💡 <strong>Employment Allowance:</strong> Eligible employers can reduce their Employer NI bill by up to £5,000 per tax year. Not available if the sole employee is also a director.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── VAT TAB ──────────────────────────────────────────────────────────────────
function VATTab() {
  const [amount, setAmount] = useState(1000);
  const [rate, setRate] = useState("standard");
  const [direction, setDirection] = useState("add");
  const [period, setPeriod] = useState("quarter");
  const [sales, setSales] = useState(25000);
  const [purchases, setPurchases] = useState(8000);

  const rates = { standard: TAX.VAT_STANDARD, reduced: TAX.VAT_REDUCED, zero: 0 };
  const vat = useMemo(() => calcVAT(amount, rates[rate], direction), [amount, rate, direction]);
  const netVAT = sales * rates[rate] - purchases * rates[rate];

  return (
    <div>
      <div className="grid-2">
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title"><span className="card-title-icon">🧮</span> VAT Calculator</div>
            <div className="toggle-group">
              <button className={`toggle-btn ${direction === "add" ? "active" : ""}`} onClick={() => setDirection("add")}>Add VAT</button>
              <button className={`toggle-btn ${direction === "remove" ? "active" : ""}`} onClick={() => setDirection("remove")}>Remove VAT</button>
            </div>
            <div className="input-group">
              <div className="input-label">Amount <span className="input-hint">{direction === "add" ? "Net (ex-VAT)" : "Gross (inc-VAT)"}</span></div>
              <div className="input-wrap has-prefix"><span className="input-prefix">£</span>
                <input type="number" value={amount} onChange={e => setAmount(+e.target.value || 0)} min={0} />
              </div>
            </div>
            <div className="input-group">
              <div className="input-label">VAT Rate</div>
              <select value={rate} onChange={e => setRate(e.target.value)}>
                <option value="standard">Standard Rate — 20%</option>
                <option value="reduced">Reduced Rate — 5%</option>
                <option value="zero">Zero Rate — 0%</option>
              </select>
            </div>

            <div className="result-panel">
              <div className="result-row">
                <div className="result-row-label">Net Amount (ex-VAT)</div>
                <div className="result-row-value">{fmt(vat.net)}</div>
              </div>
              <div className="result-row">
                <div className="result-row-label">VAT ({rate === "standard" ? "20%" : rate === "reduced" ? "5%" : "0%"})</div>
                <div className="result-row-value red">{fmt(vat.vat)}</div>
              </div>
              <div className="result-row total">
                <div className="result-row-label">Gross Amount (inc-VAT)</div>
                <div className="result-row-value">{fmt(vat.gross)}</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title"><span className="card-title-icon">📋</span> VAT Rates Guide</div>
            {[
              ["Standard 20%", "Most goods and services, electronics, clothes", "var(--red)"],
              ["Reduced 5%", "Home energy, children's car seats, sanitary products", "var(--orange)"],
              ["Zero 0%", "Food, books, children's clothes, public transport", "var(--green)"],
              ["Exempt", "Insurance, financial services, education, healthcare", "var(--blue)"],
            ].map(([rate, desc, color]) => (
              <div key={rate} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <div className="dot" style={{ background: color }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{rate}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", paddingLeft: 14 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title"><span className="card-title-icon">📊</span> VAT Return Estimator</div>
            <div className="toggle-group">
              <button className={`toggle-btn ${period === "quarter" ? "active" : ""}`} onClick={() => setPeriod("quarter")}>Quarterly</button>
              <button className={`toggle-btn ${period === "month" ? "active" : ""}`} onClick={() => setPeriod("month")}>Monthly</button>
              <button className={`toggle-btn ${period === "annual" ? "active" : ""}`} onClick={() => setPeriod("annual")}>Annual</button>
            </div>
            <div className="input-group">
              <div className="input-label">VAT-able Sales (ex-VAT)</div>
              <div className="input-wrap has-prefix"><span className="input-prefix">£</span>
                <input type="number" value={sales} onChange={e => setSales(+e.target.value || 0)} min={0} />
              </div>
            </div>
            <div className="input-group">
              <div className="input-label">VAT-able Purchases (ex-VAT)</div>
              <div className="input-wrap has-prefix"><span className="input-prefix">£</span>
                <input type="number" value={purchases} onChange={e => setPurchases(+e.target.value || 0)} min={0} />
              </div>
            </div>
            <div className="input-group">
              <div className="input-label">VAT Rate Applied</div>
              <select value={rate} onChange={e => setRate(e.target.value)}>
                <option value="standard">Standard — 20%</option>
                <option value="reduced">Reduced — 5%</option>
              </select>
            </div>

            <div className="result-panel">
              <div className="result-row">
                <div className="result-row-label">Output VAT (on sales)</div>
                <div className="result-row-value red">{fmt(sales * rates[rate])}</div>
              </div>
              <div className="result-row">
                <div className="result-row-label">Input VAT (reclaim)</div>
                <div className="result-row-value green">{fmt(purchases * rates[rate])}</div>
              </div>
              <div className="result-row total">
                <div className="result-row-label">Net VAT {netVAT >= 0 ? "Payable" : "Reclaimable"}</div>
                <div className="result-row-value" style={{ color: netVAT >= 0 ? "var(--red)" : "var(--green)" }}>{fmt(Math.abs(netVAT))}</div>
              </div>
            </div>
          </div>

          <div className="info-box gold">
            💡 <strong>VAT Registration Threshold:</strong> You must register for VAT when your taxable turnover exceeds £90,000 in any 12-month rolling period (2024/25). Voluntary registration is possible below this threshold.
          </div>

          <div className="info-box" style={{ marginTop: 12 }}>
            📦 <strong>Making Tax Digital:</strong> VAT-registered businesses must use MTD-compatible software to keep digital records and submit VAT returns.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PENSION TAB ──────────────────────────────────────────────────────────────
function PensionTab() {
  const [gross, setGross] = useState(45000);
  const [empPct, setEmpPct] = useState(5);
  const [emplrPct, setEmplrPct] = useState(3);
  const [age, setAge] = useState(35);
  const [currentPot, setCurrentPot] = useState(50000);
  const [growthRate, setGrowthRate] = useState(5);
  const [type, setType] = useState("relief");

  const empContrib = gross * (empPct / 100);
  const emplrContrib = gross * (emplrPct / 100);
  const total = empContrib + emplrContrib;
  const taxRelief = empContrib * TAX.BASIC_RATE;
  const netCost = empContrib - taxRelief;
  const yearsToRetirement = Math.max(0, 67 - age);
  
  // Project pot value
  const projectedPot = useMemo(() => {
    let pot = currentPot;
    const annualContrib = total;
    const r = growthRate / 100;
    for (let y = 0; y < yearsToRetirement; y++) {
      pot = pot * (1 + r) + annualContrib;
    }
    return pot;
  }, [currentPot, total, growthRate, yearsToRetirement]);

  const annualIncome = projectedPot * 0.04; // 4% drawdown rule

  return (
    <div>
      <div className="grid-2">
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title"><span className="card-title-icon">⚙️</span> Pension Details</div>
            <div className="toggle-group">
              <button className={`toggle-btn ${type === "relief" ? "active" : ""}`} onClick={() => setType("relief")}>Relief at Source</button>
              <button className={`toggle-btn ${type === "net" ? "active" : ""}`} onClick={() => setType("net")}>Net Pay</button>
              <button className={`toggle-btn ${type === "sipp" ? "active" : ""}`} onClick={() => setType("sipp")}>SIPP</button>
            </div>
            <div className="input-group">
              <div className="input-label">Gross Salary</div>
              <div className="input-wrap has-prefix"><span className="input-prefix">£</span>
                <input type="number" value={gross} onChange={e => setGross(+e.target.value || 0)} min={0} />
              </div>
            </div>
            <div className="grid-2" style={{ gap: 12 }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <div className="input-label">Employee %</div>
                <input type="number" value={empPct} onChange={e => setEmpPct(+e.target.value || 0)} min={0} max={100} />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <div className="input-label">Employer %</div>
                <input type="number" value={emplrPct} onChange={e => setEmplrPct(+e.target.value || 0)} min={0} max={100} />
              </div>
            </div>
          </div>

          <div className="result-panel">
            <div className="result-panel-header">💰 Contribution Summary</div>
            <div className="result-row">
              <div className="result-row-label">Your Contribution</div>
              <div className="result-row-value">{fmt(empContrib)}/yr</div>
            </div>
            <div className="result-row">
              <div className="result-row-label">Basic Rate Tax Relief (20%)</div>
              <div className="result-row-value green">+{fmt(taxRelief)}</div>
            </div>
            <div className="result-row">
              <div className="result-row-label">Net Cost to You</div>
              <div className="result-row-value blue">{fmt(netCost)}</div>
            </div>
            <div className="result-row">
              <div className="result-row-label"><div className="dot gold" />Employer Contribution</div>
              <div className="result-row-value gold">+{fmt(emplrContrib)}</div>
            </div>
            <div className="result-row total">
              <div className="result-row-label">Total Annual Pension Input</div>
              <div className="result-row-value">{fmt(total)}</div>
            </div>
          </div>

          <div className="info-box" style={{ marginTop: 12 }}>
            🏛️ <strong>Annual Allowance:</strong> £60,000 (2024/25). Unused allowance can be carried forward 3 years. Tapering applies for high earners (above £260,000 adjusted income).
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title"><span className="card-title-icon">🔭</span> Retirement Projector</div>
            <div className="grid-2" style={{ gap: 12 }}>
              <div className="input-group">
                <div className="input-label">Current Age</div>
                <input type="number" value={age} onChange={e => setAge(+e.target.value || 30)} min={18} max={66} />
              </div>
              <div className="input-group">
                <div className="input-label">Current Pot</div>
                <div className="input-wrap has-prefix"><span className="input-prefix">£</span>
                  <input type="number" value={currentPot} onChange={e => setCurrentPot(+e.target.value || 0)} min={0} />
                </div>
              </div>
            </div>
            <div className="input-group">
              <div className="input-label">Annual Growth Rate <span className="input-hint">{growthRate}%</span></div>
              <input type="range" min={1} max={12} step={0.5} value={growthRate} onChange={e => setGrowthRate(+e.target.value)}
                style={{ width: "100%", accentColor: "var(--gold)", cursor: "pointer" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                <span>1% (cautious)</span><span>6% (moderate)</span><span>12% (aggressive)</span>
              </div>
            </div>

            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div className="stat-value gold">{fmt(projectedPot)}</div>
              <div className="stat-sub" style={{ marginBottom: 12 }}>Projected Pot at 67 ({yearsToRetirement} years)</div>
              <div style={{ display: "flex", justifyContent: "center", gap: 24 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "var(--green)", fontFamily: "'Playfair Display', serif" }}>{fmt(annualIncome)}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Est. Annual Income</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "var(--blue)", fontFamily: "'Playfair Display', serif" }}>{fmt(annualIncome / 12)}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Monthly (4% rule)</div>
                </div>
              </div>
            </div>

            <div className="progress-bar-wrap">
              <div className="progress-label">
                <span>Auto-enrolment minimum ({empPct}%+{emplrPct}%)</span>
                <span style={{ color: total >= gross * 0.08 ? "var(--green)" : "var(--orange)" }}>{total >= gross * 0.08 ? "✓ Met" : "⚠ Below 8%"}</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${Math.min(100, (total / (gross * 0.15)) * 100)}%`, background: "linear-gradient(90deg, var(--gold), var(--green))" }} />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title"><span className="card-title-icon">📋</span> State Pension (2024/25)</div>
            <div className="result-row">
              <div className="result-row-label">Full New State Pension</div>
              <div className="result-row-value gold">£11,502/yr</div>
            </div>
            <div className="result-row">
              <div className="result-row-label">Weekly Rate</div>
              <div className="result-row-value">£221.20/wk</div>
            </div>
            <div className="result-row">
              <div className="result-row-label">Qualifying Years Needed</div>
              <div className="result-row-value blue">35 years</div>
            </div>
            <div className="result-row">
              <div className="result-row-label">State Pension Age</div>
              <div className="result-row-value">66 (rising to 67)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CGT TAB ──────────────────────────────────────────────────────────────────
function CGTTab() {
  const [gain, setGain] = useState(20000);
  const [otherIncome, setOtherIncome] = useState(35000);
  const [assetType, setAssetType] = useState("other");
  const [losses, setLosses] = useState(0);

  const netGain = Math.max(0, gain - losses);
  const cgt = useMemo(() => calcCGT(netGain, otherIncome, assetType), [netGain, otherIncome, assetType]);

  return (
    <div>
      <div className="grid-2">
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title"><span className="card-title-icon">⚙️</span> CGT Calculator</div>
            <div className="input-group">
              <div className="input-label">Capital Gain</div>
              <div className="input-wrap has-prefix"><span className="input-prefix">£</span>
                <input type="number" value={gain} onChange={e => setGain(+e.target.value || 0)} min={0} />
              </div>
            </div>
            <div className="input-group">
              <div className="input-label">Capital Losses (this year)</div>
              <div className="input-wrap has-prefix"><span className="input-prefix">£</span>
                <input type="number" value={losses} onChange={e => setLosses(+e.target.value || 0)} min={0} />
              </div>
            </div>
            <div className="input-group">
              <div className="input-label">Other Taxable Income (this year)</div>
              <div className="input-wrap has-prefix"><span className="input-prefix">£</span>
                <input type="number" value={otherIncome} onChange={e => setOtherIncome(+e.target.value || 0)} min={0} />
              </div>
            </div>
            <div className="input-group">
              <div className="input-label">Asset Type</div>
              <select value={assetType} onChange={e => setAssetType(e.target.value)}>
                <option value="other">Other Assets (shares, funds, crypto)</option>
                <option value="residential">Residential Property</option>
              </select>
            </div>
          </div>

          <div className="card">
            <div className="card-title"><span className="card-title-icon">📋</span> CGT Rates 2024/25</div>
            {[
              ["Basic Rate — Other Assets", "10%", "var(--blue)"],
              ["Higher/Additional — Other", "20%", "var(--orange)"],
              ["Basic Rate — Residential", "18%", "var(--purple)"],
              ["Higher/Additional — Residential", "24%", "var(--red)"],
              ["Annual Exempt Amount", fmt(TAX.CGT_ALLOWANCE), "var(--green)"],
            ].map(([label, val, color]) => (
              <div key={label} className="result-row">
                <div className="result-row-label">{label}</div>
                <div className="result-row-value" style={{ color }}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="result-panel" style={{ marginBottom: 16 }}>
            <div className="result-panel-header">📈 CGT Calculation</div>
            <div className="result-row">
              <div className="result-row-label">Gross Gain</div>
              <div className="result-row-value">{fmt(gain)}</div>
            </div>
            {losses > 0 && (
              <div className="result-row">
                <div className="result-row-label">Capital Losses Offset</div>
                <div className="result-row-value green">−{fmt(losses)}</div>
              </div>
            )}
            <div className="result-row">
              <div className="result-row-label">Net Gain</div>
              <div className="result-row-value">{fmt(netGain)}</div>
            </div>
            <div className="result-row">
              <div className="result-row-label"><div className="dot green" />Annual Exempt Amount</div>
              <div className="result-row-value green">−{fmt(TAX.CGT_ALLOWANCE)}</div>
            </div>
            <div className="result-row">
              <div className="result-row-label">Taxable Gain</div>
              <div className="result-row-value">{fmt(cgt.taxableGain)}</div>
            </div>
            {cgt.basicTax > 0 && (
              <div className="result-row">
                <div className="result-row-label"><div className="dot blue" />
                  {assetType === "residential" ? "18%" : "10%"} Rate Tax</div>
                <div className="result-row-value red">{fmt(cgt.basicTax)}</div>
              </div>
            )}
            {cgt.higherTax > 0 && (
              <div className="result-row">
                <div className="result-row-label"><div className="dot orange" />
                  {assetType === "residential" ? "24%" : "20%"} Rate Tax</div>
                <div className="result-row-value red">{fmt(cgt.higherTax)}</div>
              </div>
            )}
            <div className="result-row total">
              <div className="result-row-label">CGT Payable</div>
              <div className="result-row-value">{fmt(cgt.total)}</div>
            </div>
            <div className="result-row">
              <div className="result-row-label">Net Proceeds After CGT</div>
              <div className="result-row-value green">{fmt(netGain - cgt.total)}</div>
            </div>
          </div>

          <div className="info-box gold">
            ⚠️ <strong>Key Deadlines:</strong> CGT on property disposals must be reported and paid within 60 days of completion. Other CGT is reported via Self Assessment by 31 January.
          </div>

          <div className="info-box" style={{ marginTop: 12 }}>
            💡 <strong>Planning Tips:</strong> Use Bed & ISA strategies to crystallise gains within your annual exempt amount. Transfer assets to a spouse/civil partner to use their allowance (no CGT between spouses).
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DIVIDENDS TAB ────────────────────────────────────────────────────────────
function DividendsTab() {
  const [dividends, setDividends] = useState(10000);
  const [otherIncome, setOtherIncome] = useState(25000);

  const divTax = useMemo(() => calcDividendTax(dividends, otherIncome), [dividends, otherIncome]);
  const totalIncome = dividends + otherIncome;

  return (
    <div>
      <div className="grid-2">
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title"><span className="card-title-icon">⚙️</span> Dividend Tax Calculator</div>
            <div className="input-group">
              <div className="input-label">Annual Dividends</div>
              <div className="input-wrap has-prefix"><span className="input-prefix">£</span>
                <input type="number" value={dividends} onChange={e => setDividends(+e.target.value || 0)} min={0} />
              </div>
            </div>
            <div className="input-group">
              <div className="input-label">Other Taxable Income (salary/profit)</div>
              <div className="input-wrap has-prefix"><span className="input-prefix">£</span>
                <input type="number" value={otherIncome} onChange={e => setOtherIncome(+e.target.value || 0)} min={0} />
              </div>
            </div>

            <div className="result-panel">
              <div className="result-row">
                <div className="result-row-label">Total Income</div>
                <div className="result-row-value">{fmt(totalIncome)}</div>
              </div>
              <div className="result-row">
                <div className="result-row-label"><div className="dot green" />Dividend Allowance</div>
                <div className="result-row-value green">{fmt(TAX.DIVIDEND_ALLOWANCE)}</div>
              </div>
              <div className="result-row">
                <div className="result-row-label">Taxable Dividends</div>
                <div className="result-row-value">{fmt(Math.max(0, dividends - TAX.DIVIDEND_ALLOWANCE))}</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title"><span className="card-title-icon">📋</span> Dividend Tax Rates 2024/25</div>
            {[
              ["Basic Rate Band", "8.75%", "var(--blue)"],
              ["Higher Rate Band", "33.75%", "var(--orange)"],
              ["Additional Rate Band", "39.35%", "var(--red)"],
              ["Dividend Allowance", fmt(TAX.DIVIDEND_ALLOWANCE), "var(--green)"],
            ].map(([label, val, color]) => (
              <div key={label} className="result-row">
                <div className="result-row-label">{label}</div>
                <div className="result-row-value" style={{ color }}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="result-panel">
            <div className="result-panel-header">💰 Dividend Tax Breakdown</div>
            {divTax.basicDiv > 0 && (
              <div className="result-row">
                <div className="result-row-label"><div className="dot blue" />Basic Rate (8.75%)</div>
                <div className="result-row-value red">{fmt(divTax.basicDiv)}</div>
              </div>
            )}
            {divTax.higherDiv > 0 && (
              <div className="result-row">
                <div className="result-row-label"><div className="dot orange" />Higher Rate (33.75%)</div>
                <div className="result-row-value red">{fmt(divTax.higherDiv)}</div>
              </div>
            )}
            {divTax.additionalDiv > 0 && (
              <div className="result-row">
                <div className="result-row-label"><div className="dot red" />Additional Rate (39.35%)</div>
                <div className="result-row-value red">{fmt(divTax.additionalDiv)}</div>
              </div>
            )}
            {divTax.total === 0 && (
              <div className="result-row">
                <div className="result-row-label"><div className="dot green" />Within Dividend Allowance</div>
                <div className="result-row-value green">£0 tax</div>
              </div>
            )}
            <div className="result-row total">
              <div className="result-row-label">Total Dividend Tax</div>
              <div className="result-row-value">{fmt(divTax.total)}</div>
            </div>
            <div className="result-row">
              <div className="result-row-label">Effective Rate on Dividends</div>
              <div className="result-row-value gold">{dividends > 0 ? fmtP(divTax.total / dividends) : "0%"}</div>
            </div>
          </div>

          <div className="info-box green" style={{ marginTop: 16 }}>
            💡 <strong>Director Strategy:</strong> Many small company directors pay themselves a small salary (up to the NI Primary Threshold: ~£12,570) and top up with dividends to minimise NI while making use of the dividend allowance and basic rate band.
          </div>

          <div className="info-box" style={{ marginTop: 12 }}>
            📊 <strong>ISA Shield:</strong> Dividends received inside a Stocks & Shares ISA are completely tax-free. Use up to £20,000 ISA allowance each year.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CORPORATION TAX TAB ──────────────────────────────────────────────────────
function CorpTaxTab() {
  const [profit, setProfit] = useState(75000);
  const [directors, setDirectors] = useState(2);
  const [salary, setSalary] = useState(12570);

  const ct = useMemo(() => calcCorpTax(profit), [profit]);
  const afterTaxProfit = profit - ct.tax;
  const availableDividend = afterTaxProfit;
  const employerNI = Math.max(0, (salary - 9100) * 0.138) * directors;
  const effectiveCorp = profit > 0 ? ct.tax / profit : 0;

  return (
    <div>
      <div className="grid-2">
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title"><span className="card-title-icon">⚙️</span> Corporation Tax Calculator</div>
            <div className="input-group">
              <div className="input-label">Company Profit (before CT)</div>
              <div className="input-wrap has-prefix"><span className="input-prefix">£</span>
                <input type="number" value={profit} onChange={e => setProfit(+e.target.value || 0)} min={0} />
              </div>
            </div>
            <div className="input-group">
              <div className="input-label">Number of Directors</div>
              <input type="number" value={directors} onChange={e => setDirectors(+e.target.value || 1)} min={1} max={20} />
            </div>
            <div className="input-group">
              <div className="input-label">Director Salary Each</div>
              <div className="input-wrap has-prefix"><span className="input-prefix">£</span>
                <input type="number" value={salary} onChange={e => setSalary(+e.target.value || 0)} min={0} />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title"><span className="card-title-icon">📋</span> CT Rates 2024/25</div>
            {[
              ["Small Profits Rate (≤£50k)", "19%", "var(--green)"],
              ["Main Rate (≥£250k)", "25%", "var(--red)"],
              ["Marginal Relief", "£50k – £250k", "var(--orange)"],
              ["Marginal Relief Fraction", "3/200", "var(--blue)"],
              ["R&D Credit (SME)", "Up to 33%", "var(--purple)"],
              ["Annual Investment Allowance", "£1,000,000", "var(--gold-light)"],
            ].map(([label, val, color]) => (
              <div key={label} className="result-row">
                <div className="result-row-label">{label}</div>
                <div className="result-row-value" style={{ color }}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="result-panel" style={{ marginBottom: 16 }}>
            <div className="result-panel-header">🏢 Corporation Tax Breakdown</div>
            <div className="result-row">
              <div className="result-row-label">Company Profit</div>
              <div className="result-row-value">{fmt(profit)}</div>
            </div>
            <div className="result-row">
              <div className="result-row-label">
                CT Rate
                <span className="rate-badge" style={{ marginLeft: 8, background: profit <= TAX.CORP_SMALL_LIMIT ? "var(--green-dim)" : "var(--red-dim)", color: profit <= TAX.CORP_SMALL_LIMIT ? "var(--green)" : "var(--red)" }}>
                  {profit <= TAX.CORP_SMALL_LIMIT ? "Small" : profit >= TAX.CORP_MAIN_LIMIT ? "Main" : "Marginal"}
                </span>
              </div>
              <div className="result-row-value gold">{fmtP(effectiveCorp)}</div>
            </div>
            <div className="result-row">
              <div className="result-row-label">Corporation Tax</div>
              <div className="result-row-value red">{fmt(ct.tax)}</div>
            </div>
            <div className="result-row">
              <div className="result-row-label">After-Tax Profit</div>
              <div className="result-row-value green">{fmt(afterTaxProfit)}</div>
            </div>
            <div className="result-row">
              <div className="result-row-label">Employer NI ({directors} directors)</div>
              <div className="result-row-value red">{fmt(employerNI)}</div>
            </div>
            <div className="result-row total">
              <div className="result-row-label">Available for Dividend</div>
              <div className="result-row-value">{fmt(availableDividend)}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-title"><span className="card-title-icon">💡</span> Tax Efficiency Tips</div>
            {[
              ["Salary at £12,570", "Avoids Income Tax, minimal NI, CT deductible"],
              ["Pension contributions", "CT-deductible, no NI, grows tax-free"],
              ["R&D Tax Credits", "Up to 33p per £1 of qualifying spend (SME)"],
              ["Capital Allowances", "100% AIA on qualifying plant & machinery"],
              ["Loss Relief", "Carry back 1 year, carry forward indefinitely"],
            ].map(([tip, desc]) => (
              <div key={tip} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--gold-light)", marginBottom: 2 }}>⚡ {tip}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── BENEFITS TAB ────────────────────────────────────────────────────────────
function BenefitsTab() {
  const [children, setChildren] = useState(2);
  const [highestIncome, setHighestIncome] = useState(55000);
  const [slPlan, setSlPlan] = useState("2");
  const [slIncome, setSlIncome] = useState(30000);
  const [claimCB, setClaimCB] = useState(true);

  const cb = useMemo(() => calcChildBenefit(children, highestIncome), [children, highestIncome]);
  const sl = useMemo(() => calcStudentLoan(slIncome, parseInt(slPlan)), [slIncome, slPlan]);
  const hicbcApplies = highestIncome > TAX.HICBC_THRESHOLD;

  return (
    <div>
      <div className="grid-2">
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title"><span className="card-title-icon">👶</span> Child Benefit Calculator</div>
            <div className="input-group">
              <div className="input-label">Number of Children</div>
              <input type="number" value={children} onChange={e => setChildren(+e.target.value || 0)} min={0} max={20} />
            </div>
            <div className="input-group">
              <div className="input-label">Highest Earner Income in Household</div>
              <div className="input-wrap has-prefix"><span className="input-prefix">£</span>
                <input type="number" value={highestIncome} onChange={e => setHighestIncome(+e.target.value || 0)} min={0} />
              </div>
            </div>

            <div className="result-panel">
              <div className="result-row">
                <div className="result-row-label">Eldest Child (£25.60/wk)</div>
                <div className="result-row-value">{fmt(25.60 * 52)}/yr</div>
              </div>
              {children > 1 && (
                <div className="result-row">
                  <div className="result-row-label">Additional {children - 1} Child(ren) (£16.95/wk each)</div>
                  <div className="result-row-value">{fmt(16.95 * 52 * (children - 1))}/yr</div>
                </div>
              )}
              <div className="result-row">
                <div className="result-row-label">Total Child Benefit</div>
                <div className="result-row-value green">{fmt(cb.totalBenefit)}/yr</div>
              </div>
              {hicbcApplies && (
                <div className="result-row">
                  <div className="result-row-label">High Income Charge (HICBC)</div>
                  <div className="result-row-value red">−{fmt(cb.hicbcCharge)}/yr</div>
                </div>
              )}
              <div className="result-row total">
                <div className="result-row-label">Net Annual Benefit</div>
                <div className="result-row-value">{fmt(cb.netBenefit)}/yr</div>
              </div>
            </div>

            {hicbcApplies && highestIncome < TAX.HICBC_UPPER && (
              <div className="info-box" style={{ marginTop: 12 }}>
                ⚠️ HICBC applies. Between £60,000–£80,000 it's clawed back gradually. Consider whether pension contributions could reduce income below £60,000 to retain full benefit.
              </div>
            )}
            {highestIncome >= TAX.HICBC_UPPER && (
              <div className="info-box red" style={{ marginTop: 12 }}>
                ❌ At £80,000+ the charge equals 100% of Child Benefit. Claiming only makes sense if there are NI qualifying year benefits.
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title"><span className="card-title-icon">🎓</span> Student Loan Repayment</div>
            <div className="input-group">
              <div className="input-label">Loan Plan</div>
              <select value={slPlan} onChange={e => setSlPlan(e.target.value)}>
                <option value="1">Plan 1 — Threshold £22,015</option>
                <option value="2">Plan 2 — Threshold £27,295</option>
                <option value="4">Plan 4 (Scotland) — Threshold £27,660</option>
                <option value="5">Plan 5 — Threshold £25,000</option>
              </select>
            </div>
            <div className="input-group">
              <div className="input-label">Annual Income</div>
              <div className="input-wrap has-prefix"><span className="input-prefix">£</span>
                <input type="number" value={slIncome} onChange={e => setSlIncome(+e.target.value || 0)} min={0} />
              </div>
            </div>

            <div className="result-panel">
              <div className="result-row">
                <div className="result-row-label">Annual Repayment (9%)</div>
                <div className="result-row-value red">{fmt(sl)}</div>
              </div>
              <div className="result-row">
                <div className="result-row-label">Monthly Repayment</div>
                <div className="result-row-value red">{fmt(sl / 12)}</div>
              </div>
              <div className="result-row">
                <div className="result-row-label">Effective Rate on Total Income</div>
                <div className="result-row-value gold">{slIncome > 0 ? fmtP(sl / slIncome) : "0%"}</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title"><span className="card-title-icon">🎁</span> Other Key Benefits & Reliefs</div>
            {[
              ["Marriage Allowance", "Transfer £1,260 of unused personal allowance to basic-rate taxpaying spouse — saves up to £252/yr"],
              ["Blind Person's Allowance", "Additional £3,070 allowance if registered blind (2024/25)"],
              ["Trading Allowance", "First £1,000 of self-employment/trading income is tax-free"],
              ["Property Allowance", "First £1,000 of property income is tax-free"],
              ["Rent a Room Relief", "Up to £7,500/yr tax-free for letting a room in your home"],
              ["SEIS/EIS Relief", "30-50% Income Tax relief on qualifying startup investments"],
              ["Gift Aid", "HMRC adds 25p for every £1 donated to charity; higher-rate taxpayers can claim extra"],
              ["Seed Enterprise Scheme", "50% IT relief + CGT exemption on SEIS investments"],
            ].map(([name, desc]) => (
              <div key={name} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--gold-light)", marginBottom: 3 }}>{name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ALLOWANCES TAB ───────────────────────────────────────────────────────────
function AllowancesTab() {
  const allowances = [
    { cat: "Income Tax", items: [
      ["Personal Allowance", "£12,570", "Tax-free income for most individuals"],
      ["Blind Person's Allowance", "£3,070", "Additional allowance if registered blind"],
      ["Marriage Allowance Transfer", "£1,260", "Unused PA transfer to basic-rate spouse"],
      ["Trading Allowance", "£1,000", "Tax-free self-employment/trading income"],
      ["Property Allowance", "£1,000", "Tax-free property income"],
    ]},
    { cat: "Savings & Investments", items: [
      ["ISA Annual Allowance", "£20,000", "Total across all ISA types per tax year"],
      ["Personal Savings Allowance (Basic)", "£1,000", "Tax-free savings interest for basic-rate payers"],
      ["Personal Savings Allowance (Higher)", "£500", "Tax-free savings interest for higher-rate payers"],
      ["Dividend Allowance", "£500", "Tax-free dividends (2024/25 onwards)"],
      ["Lifetime ISA Bonus", "25%", "Government bonus up to £1,000/yr (age 18–39)"],
      ["Help to Save Bonus", "50%", "Government bonus for eligible low-income earners"],
    ]},
    { cat: "Capital Gains", items: [
      ["CGT Annual Exempt Amount", "£3,000", "Tax-free gains (reduced from £6,000 in 2023/24)"],
      ["Investors' Relief", "10% rate", "On qualifying business assets held 3+ years"],
      ["Business Asset Disposal Relief", "10%", "On lifetime gains up to £1,000,000 (BADR)"],
    ]},
    { cat: "Pension", items: [
      ["Annual Allowance", "£60,000", "Max pension input per tax year"],
      ["Money Purchase Annual Allowance", "£10,000", "If you've flexibly accessed pension"],
      ["Tapered Annual Allowance Min", "£10,000", "For adjusted incomes over £260,000"],
      ["Lifetime Allowance", "Abolished", "LTA removed from April 2024"],
    ]},
    { cat: "Business & Employment", items: [
      ["VAT Registration Threshold", "£90,000", "Must register if turnover exceeds this"],
      ["Employment Allowance", "£5,000", "Reduction in Employer NI for eligible businesses"],
      ["Annual Investment Allowance", "£1,000,000", "100% first-year deduction on plant & machinery"],
      ["Rent a Room Relief", "£7,500", "Tax-free rental income from letting a room"],
      ["Mileage Allowance (car)", "45p/mile", "First 10,000 miles; 25p/mile thereafter"],
      ["Home Working Allowance", "£6/week", "Flat rate for homeworking (or actual costs)"],
    ]},
    { cat: "Child & Family", items: [
      ["Child Benefit (eldest)", "£25.60/wk", "£1,331.20 per year"],
      ["Child Benefit (additional)", "£16.95/wk", "£881.40 per child per year"],
      ["HICBC Threshold", "£60,000", "High Income Child Benefit Charge starts here"],
      ["Free Childcare (30hrs)", "3–4 yr olds", "Eligible working parents in England"],
      ["Tax-Free Childcare", "£2,000/yr", "Government tops up 20p per £1 spent"],
    ]},
  ];

  return (
    <div>
      <div className="grid-2">
        {allowances.map(({ cat, items }) => (
          <div key={cat} className="card">
            <div className="card-title"><span className="card-title-icon">✅</span> {cat}</div>
            {items.map(([name, amount, note]) => (
              <div key={name} className="allowance-card">
                <div>
                  <div className="allowance-name">{name}</div>
                  <div className="allowance-note">{note}</div>
                </div>
                <div className="allowance-amount">{amount}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ onNavigate }) {
  const [income, setIncome] = useState(50000);
  const it = useMemo(() => calcIncomeTax(income), [income]);
  const ni = useMemo(() => calcNIEmployee(income), [income]);
  const takeHome = income - it.total - ni.total;
  const effectiveRate = income > 0 ? (it.total + ni.total) / income : 0;

  const segments = [
    { value: takeHome, color: "#34c98b", label: "Take-Home" },
    { value: it.total, color: "#f4606c", label: "Income Tax" },
    { value: ni.total, color: "#5b9cf6", label: "NI" },
  ];

  return (
    <div>
      <div className="dashboard-summary" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
              UK Tax Dashboard — 2024/25
            </div>
            <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
              Enter your gross income below for an instant overview of your tax position
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Gross Income</div>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--gold)", fontWeight: 600, fontSize: 14 }}>£</span>
              <input type="number" value={income} onChange={e => setIncome(+e.target.value || 0)} min={0} max={1000000}
                style={{ width: 160, paddingLeft: 26, background: "var(--surface3)", border: "1px solid var(--border-light)", borderRadius: 8, color: "var(--text)", fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, padding: "8px 12px 8px 26px", outline: "none" }} />
            </div>
          </div>
        </div>

        <div className="summary-grid">
          {[
            { label: "Take-Home", value: fmt(takeHome), color: "var(--green)" },
            { label: "Income Tax", value: fmt(it.total), color: "var(--red)" },
            { label: "National Insurance", value: fmt(ni.total), color: "var(--blue)" },
            { label: "Effective Rate", value: fmtP(effectiveRate), color: "var(--gold-light)" },
            { label: "Monthly Take-Home", value: fmt(takeHome / 12), color: "var(--green)" },
          ].map(({ label, value, color }) => (
            <div key={label} className="summary-item">
              <div className="summary-item-value" style={{ color }}>{value}</div>
              <div className="summary-item-label">{label}</div>
            </div>
          ))}
        </div>

        <div className="divider" />

        <div className="pie-wrap">
          <DonutChart segments={segments} size={120} strokeWidth={14} />
          <div className="pie-legend">
            {segments.map(s => (
              <div key={s.label} className="legend-item">
                <div className="legend-left">
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                  <span>{s.label}</span>
                </div>
                <div className="legend-value">{fmt(s.value)} ({income > 0 ? Math.round(s.value / income * 100) : 0}%)</div>
              </div>
            ))}
          </div>
          <EffectiveRateRing rate={effectiveRate} />
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 20 }}>
        {[
          { icon: "📊", title: "Income Tax", desc: "Calculate PAYE bands, personal allowance, and marginal rates", tab: "income", color: "var(--red)" },
          { icon: "🛡️", title: "National Insurance", desc: "Employee, employer and self-employed NI contributions", tab: "ni", color: "var(--blue)" },
          { icon: "🧾", title: "VAT", desc: "Calculate VAT, build VAT returns, understand rates", tab: "vat", color: "var(--orange)" },
          { icon: "🏦", title: "Pension", desc: "Contributions, tax relief, and retirement projections", tab: "pension", color: "var(--gold)" },
          { icon: "📈", title: "Capital Gains", desc: "CGT on shares, property, crypto and other assets", tab: "cgt", color: "var(--purple)" },
          { icon: "💰", title: "Dividends", desc: "Dividend tax across all rate bands with planning tips", tab: "dividends", color: "var(--green)" },
          { icon: "🏢", title: "Corp. Tax", desc: "Small company CT, marginal relief and director strategy", tab: "corp", color: "var(--red)" },
          { icon: "🎁", title: "Benefits & Credits", desc: "Child Benefit, HICBC, student loans and key reliefs", tab: "benefits", color: "var(--green)" },
          { icon: "✅", title: "All Allowances", desc: "Complete 2024/25 allowances and thresholds reference", tab: "allowances", color: "var(--gold)" },
        ].map(({ icon, title, desc, tab, color }) => (
          <div key={tab} className="card" style={{ cursor: "pointer", transition: "all 0.15s" }}
            onClick={() => onNavigate(tab)}
            onMouseEnter={e => e.currentTarget.style.borderColor = color}
            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>{title}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{desc}</div>
            <div style={{ marginTop: 10, fontSize: 11, color, fontWeight: 600 }}>Open calculator →</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-title">⚡ Key 2024/25 Tax Dates</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          {[
            ["6 Apr 2024", "Tax Year 2024/25 Begins"],
            ["31 Jul 2024", "Second Payment on Account"],
            ["5 Oct 2024", "Register for Self Assessment"],
            ["31 Oct 2024", "Paper Self Assessment Deadline"],
            ["31 Jan 2025", "Online SA & Tax Payment Deadline"],
            ["5 Apr 2025", "Tax Year 2024/25 Ends / Use ISA Allowance"],
          ].map(([date, event]) => (
            <div key={date} style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ background: "var(--gold-dim)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 6, padding: "4px 8px", fontSize: 10, fontWeight: 700, color: "var(--gold-light)", whiteSpace: "nowrap", flexShrink: 0 }}>{date}</div>
              <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{event}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="info-box" style={{ marginTop: 16 }}>
        ⚖️ <strong>Disclaimer:</strong> This tool is for educational and planning purposes only. All figures are based on 2024/25 HMRC rates. Always consult a qualified accountant or tax adviser for personalised advice. Tax laws change frequently.
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const renderTab = () => {
    switch (activeTab) {
      case "dashboard": return <Dashboard onNavigate={setActiveTab} />;
      case "income": return <IncomeTaxTab />;
      case "ni": return <NITab />;
      case "vat": return <VATTab />;
      case "pension": return <PensionTab />;
      case "cgt": return <CGTTab />;
      case "dividends": return <DividendsTab />;
      case "corp": return <CorpTaxTab />;
      case "benefits": return <BenefitsTab />;
      case "allowances": return <AllowancesTab />;
      default: return null;
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <header className="header">
          <div className="header-inner">
            <div className="logo">
              <div className="logo-badge">T</div>
              <div>
                <div className="logo-text">TaxClear UK</div>
                <span className="logo-sub">Open Source Tax Manager</span>
              </div>
            </div>
            <div className="tax-year-badge">Tax Year 2024/25</div>
          </div>
        </header>

        <div className="nav-tabs">
          {TABS.map(tab => (
            <button key={tab.id} className={`tab-btn ${activeTab === tab.id ? "active" : ""}`} onClick={() => setActiveTab(tab.id)}>
              <span className="tab-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="content">
          <div className="section-header">
            <div className="section-title">
              {TABS.find(t => t.id === activeTab)?.icon} {TABS.find(t => t.id === activeTab)?.label}
            </div>
          </div>
          {renderTab()}
        </div>
      </div>
    </>
  );
}
