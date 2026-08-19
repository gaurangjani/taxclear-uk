# TaxClear UK 🇬🇧

> Open-source UK tax manager for individuals and small businesses — supports 2024/25, 2025/26 & 2026/27 tax years

[![Deploy to GitHub Pages](https://github.com/gaurangjani/taxclear-uk/actions/workflows/deploy.yml/badge.svg)](https://github.com/gaurangjani/taxclear-uk/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Live:** https://taxclear-uk.netlify.app

---

## Features

| Module | Coverage |
|--------|----------|
| 📊 **Income Tax** | PAYE bands (20/40/45%), personal allowance, student loan, marriage allowance |
| 🛡️ **National Insurance** | Employee Class 1, Employer NI (13.8%), Self-Employed Class 2 & 4 |
| 🧾 **VAT** | Add/remove VAT, return estimator, MTD notes, registration threshold (£90k) |
| 🏦 **Pension** | Contributions, tax relief, employer match, retirement projector |
| 📈 **Capital Gains** | Shares, crypto & residential property, annual exempt amount, losses offset |
| 💰 **Dividends** | All three rate bands, ISA strategy, director salary planning |
| 🏢 **Corporation Tax** | 19/25% rates + marginal relief, R&D notes, director strategy |
| 🎁 **Benefits** | Child Benefit + HICBC, student loans (all 4 plans), EIS/SEIS, Rent-a-Room |
| ✅ **Allowances** | Full reference — 30+ allowances across all tax types |

---

## Quick Start

```bash
git clone https://github.com/gaurangjani/taxclear-uk.git
cd taxclear-uk
npm install
npm run dev
```

Open http://localhost:5173/taxclear-uk/

---

## Tech Stack

- **React 18** + **Vite 5** — zero runtime dependencies
- **GitHub Actions** — automated CI/CD on every push to `main`
- **GitHub Pages** — free hosting

---

## Deploy Your Own Fork

1. Fork this repo
2. Go to **Settings → Pages → Source → GitHub Actions**
3. Push any change to `main` — it auto-deploys

---

## Tax Rates Used (2024/25, 2025/26 & 2026/27)

All figures sourced from HMRC:

- Personal Allowance: £12,570
- Basic Rate (20%): £12,571 – £50,270
- Higher Rate (40%): £50,271 – £125,140
- Additional Rate (45%): above £125,140
- NI Main Rate: 8% (employee), 6% (self-employed Class 4)
- VAT Registration Threshold: £90,000
- Capital Gains Exempt Amount: £3,000
- Corporation Tax: 19% (≤£50k), 25% (≥£250k) with marginal relief
- Pension Annual Allowance: £60,000

---

## Disclaimer

This tool is for **educational and planning purposes only**. Always consult a qualified accountant or tax adviser for personalised advice. Tax laws change frequently — verify figures with HMRC directly.

---

## License

MIT © [Gaurang Jani](https://github.com/gaurangjani)
