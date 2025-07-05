
import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom/client';

// --- Helper Functions ---

// A simple implementation of XIRR using the Newton-Raphson method
const calculateXirr = (cashflows, guess = 0.1) => {
    const MAX_ITERATIONS = 100;
    const PRECISION = 1e-7;

    if (!cashflows || cashflows.length === 0) return NaN;

    const npv = (rate) => cashflows.reduce((acc, cf) => {
        const daysDiff = (cf.date.getTime() - cashflows[0].date.getTime()) / (1000 * 60 * 60 * 24);
        return acc + cf.amount / Math.pow(1 + rate, daysDiff / 365.0);
    }, 0);

    const npvDerivative = (rate) => cashflows.reduce((acc, cf) => {
        const daysDiff = (cf.date.getTime() - cashflows[0].date.getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff <= 0 || rate <= -1) return acc;
        return acc - (cf.amount * daysDiff) / (365.0 * Math.pow(1 + rate, (daysDiff / 365.0) + 1));
    }, 0);

    let rate = guess;
    for (let i = 0; i < MAX_ITERATIONS; i++) {
        const npvValue = npv(rate);
        const derivativeValue = npvDerivative(rate);
        if (Math.abs(npvValue) < PRECISION) return rate * 100;
        if (derivativeValue === 0) break;
        rate = rate - npvValue / derivativeValue;
    }
    return NaN;
};

// --- Helper Components ---

const ZAssetsLogo = () => (
    <h1 className="z-logo" aria-label="Z-Assets">
      Z-
      <span className="z-logo-a">A</span>
      SSE<span className="z-logo-special-char">T</span>S
    </h1>
);

const NumberInput = ({ label, value, onChange, unit, helpText = null, min, max, step }) => (
    <div className="input-row">
        <label htmlFor={label}>
            {label}
            {helpText && <span className="help-text">{helpText}</span>}
        </label>
        <div className="input-container">
            <input
                id={label}
                type="number"
                value={value}
                onChange={onChange}
                min={min}
                max={max}
                step={step}
                aria-label={label}
            />
            {unit && <span className="unit">{unit}</span>}
        </div>
    </div>
);


const StatCard = ({ label, value, helpText, primary = false }) => (
    <div className={`stat-card ${primary ? 'primary' : ''}`} title={helpText}>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
    </div>
);

const DetailsTable = ({ data, formatCurrency, formatPercent }) => (
    <div className="details-table-container">
        <table className="details-table">
            <thead>
                <tr>
                    <th>Month</th>
                    <th>EMI</th>
                    <th>Rent</th>
                    <th>Net Payment</th>
                    <th>Gross Yield</th>
                </tr>
            </thead>
            <tbody>
                {data.map(row => (
                    <tr key={row.month}>
                        <td>{row.month}</td>
                        <td>{formatCurrency(row.emi)}</td>
                        <td>{formatCurrency(row.rent)}</td>
                        <td>{formatCurrency(row.netEmi)}</td>
                        <td>{formatPercent(row.annualizedRoi)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const Accordion = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className={`accordion ${isOpen ? 'open' : ''}`}>
            <button className="accordion-header" onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen}>
                <span>{title}</span>
                <span className="accordion-icon">›</span>
            </button>
            <div className="accordion-content">{children}</div>
        </div>
    );
};

// --- Main Application ---
const App = () => {
    // --- State for User Inputs ---
    const [apartmentValue, setApartmentValue] = useState(2500000);
    const [downPaymentPercent, setDownPaymentPercent] = useState(20);
    const [interestRate, setInterestRate] = useState(8.7);
    const [loanTerm, setLoanTerm] = useState(15);
    const [rentEscalation, setRentEscalation] = useState(10);
    const [rentEscalationFrequency, setRentEscalationFrequency] = useState(3);
    const [capitalAppreciation, setCapitalAppreciation] = useState(7);
    const [saleTime, setSaleTime] = useState(15);
    const [inflation, setInflation] = useState(6);

    // --- Financial Calculations using useMemo for efficiency ---
    
    const initialMonthlyRent = useMemo(() => (apartmentValue * 0.05) / 12, [apartmentValue]);
    const downPaymentAmount = useMemo(() => apartmentValue * (downPaymentPercent / 100), [apartmentValue, downPaymentPercent]);
    const loanAmount = useMemo(() => apartmentValue - downPaymentAmount, [apartmentValue, downPaymentAmount]);

    const emi = useMemo(() => {
        if (loanAmount <= 0) return 0;
        const monthlyRate = (interestRate / 100) / 12;
        if (monthlyRate === 0) return loanAmount / (loanTerm * 12);
        const nper = loanTerm * 12;
        const pvif = Math.pow(1 + monthlyRate, nper);
        return (monthlyRate * loanAmount * pvif) / (pvif - 1);
    }, [loanAmount, interestRate, loanTerm]);

    const { futureAssetValue, pendingLoan, monthlyBreakdown } = useMemo(() => {
        const breakdownData = [];
        const totalMonths = saleTime * 12;
        const totalLoanMonths = loanTerm * 12;
        
        if (totalMonths <= 0 || apartmentValue <= 0) {
             return { futureAssetValue: apartmentValue, pendingLoan: loanAmount, monthlyBreakdown: [] };
        }

        const annualEscalationRate = rentEscalation / 100;
        const r = (interestRate / 100) / 12;
        const P = loanAmount;
        
        for (let m = 1; m <= totalMonths; m++) {
            const yearsPassed = Math.floor((m - 1) / 12);
            const numEscalations = rentEscalationFrequency > 0 ? Math.floor(yearsPassed / rentEscalationFrequency) : 0;

            const currentMonthlyRent = initialMonthlyRent * Math.pow(1 + annualEscalationRate, numEscalations);
            const currentEmi = (m > totalLoanMonths || loanAmount <= 0) ? 0 : emi;
            const netEmiForMonth = currentEmi - currentMonthlyRent;
            const annualizedGrossYield = (currentMonthlyRent * 12 / apartmentValue) * 100;

            breakdownData.push({
                month: m,
                emi: currentEmi,
                rent: currentMonthlyRent,
                netEmi: netEmiForMonth,
                annualizedRoi: annualizedGrossYield,
            });
        }
        
        const finalAssetValue = apartmentValue * Math.pow(1 + (capitalAppreciation / 100), saleTime);
        
        let finalPendingLoan;
        if (saleTime >= loanTerm || loanAmount <= 0) {
            finalPendingLoan = 0;
        } else {
             finalPendingLoan = r === 0 ? P - (emi * totalMonths) : P * Math.pow(1 + r, totalMonths) - emi * ((Math.pow(1 + r, totalMonths) - 1) / r);
        }
        
        return {
            futureAssetValue: finalAssetValue,
            pendingLoan: Math.max(0, finalPendingLoan),
            monthlyBreakdown: breakdownData,
        };
    }, [apartmentValue, saleTime, rentEscalation, rentEscalationFrequency, emi, initialMonthlyRent, interestRate, capitalAppreciation, loanAmount, loanTerm]);

    const totalEquityNpv = useMemo(() => {
        const monthlyInflationRate = (inflation / 100) / 12;
        const totalMonths = saleTime * 12;
        if (totalMonths <= 0) return downPaymentAmount;

        let pvOfNetEmis = monthlyBreakdown.reduce((acc, row, index) => {
            const m = index + 1;
            const discountedNetEmi = monthlyInflationRate === 0 ? row.netEmi : row.netEmi / Math.pow(1 + monthlyInflationRate, m);
            return acc + discountedNetEmi;
        }, 0);

        return downPaymentAmount + pvOfNetEmis;
    }, [downPaymentAmount, inflation, saleTime, monthlyBreakdown]);
    
    const roe = useMemo(() => {
        const netFutureEquity = futureAssetValue - pendingLoan;
        if (totalEquityNpv <= 0) return 0;
        const ratio = netFutureEquity / totalEquityNpv;
        return (ratio - 1) * 100;
    }, [futureAssetValue, pendingLoan, totalEquityNpv]);
    
    const xirr = useMemo(() => {
        const cashflows = [];
        const today = new Date();

        if (downPaymentAmount > 0) {
            cashflows.push({ amount: -downPaymentAmount, date: today });
        }

        monthlyBreakdown.forEach((row, index) => {
             const cfDate = new Date(today);
             cfDate.setMonth(today.getMonth() + index + 1);
             cashflows.push({ amount: -row.netEmi, date: cfDate });
        });

        const netFutureEquity = futureAssetValue - pendingLoan;
        const saleDate = new Date(today);
        saleDate.setMonth(today.getMonth() + saleTime * 12);
        cashflows.push({ amount: netFutureEquity, date: saleDate });
        
        const hasPositive = cashflows.some(cf => cf.amount > 0);
        const hasNegative = cashflows.some(cf => cf.amount < 0);
        if (!hasPositive || !hasNegative) return 0;
        
        const result = calculateXirr(cashflows);
        return isNaN(result) ? 0 : result;

    }, [downPaymentAmount, saleTime, futureAssetValue, pendingLoan, monthlyBreakdown]);
    
    const averageGrossYield = useMemo(() => {
        if (!monthlyBreakdown || monthlyBreakdown.length === 0 || apartmentValue === 0) {
            return 0;
        }
        const totalRent = monthlyBreakdown.reduce((acc, row) => acc + row.rent, 0);
        const averageMonthlyRent = totalRent / monthlyBreakdown.length;
        const averageYearlyRent = averageMonthlyRent * 12;
        return (averageYearlyRent / apartmentValue) * 100;
    }, [monthlyBreakdown, apartmentValue]);


    // --- Formatting Helpers ---
    const formatCurrency = (val) => `₹ ${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    const formatPercent = (val) => `${val.toFixed(2)}%`;
    const xirrHelpText = `Internal Rate of Return on your cashflows. Assumes: \n1. Initial Down Payment (Outflow)\n2. Net Monthly Payments (EMI - Rent) \n3. Final Net Sale Proceeds (Inflow)`;

    const handleDownload = () => {
        const arrayToCsv = (data) => {
            return data.map(row =>
                row.map(String)
                   .map(v => v.includes(',') ? `"${v}"` : v)
                   .join(',')
            ).join('\r\n');
        };

        const summaryData = [
            ["Investment Summary", ""],
            ["Category", "Metric", "Value"],
            ["Inputs", "Agreement Value", formatCurrency(apartmentValue)],
            ["Inputs", "Down Payment", `${downPaymentPercent}% (${formatCurrency(downPaymentAmount)})`],
            ["Inputs", "Loan Amount", formatCurrency(loanAmount)],
            ["Inputs", "Interest Rate", formatPercent(interestRate)],
            ["Inputs", "Loan Term", `${loanTerm} years`],
            ["Inputs", "Sale Time", `${saleTime} years`],
            ["Assumptions", "Initial Monthly Rent", formatCurrency(initialMonthlyRent)],
            ["Assumptions", "Annual Rent Escalation", `${formatPercent(rentEscalation)} every ${rentEscalationFrequency} years`],
            ["Assumptions", "Annual Capital Appreciation", formatPercent(capitalAppreciation)],
            ["Assumptions", "Inflation (for NPV)", formatPercent(inflation)],
            [], // Blank Row
            ["Key Results", "XIRR", formatPercent(xirr)],
            ["Key Results", "ROE (NPV-adjusted)", formatPercent(roe)],
            ["Key Results", "Average Gross Yield", formatPercent(averageGrossYield)],
            ["Key Results", "Loan EMI", formatCurrency(emi)],
            ["Key Results", "Future Asset Value", formatCurrency(futureAssetValue)],
            ["Key Results", "Pending Loan at Sale", formatCurrency(pendingLoan)],
            ["Key Results", "Net Proceeds on Sale", formatCurrency(futureAssetValue - pendingLoan)],
            ["Key Results", "Total Equity Invested (NPV)", formatCurrency(totalEquityNpv)],
        ];
        
        const breakdownHeader = ["Month", "EMI", "Rent", "Net Payment", "Annualized Gross Yield"];
        const breakdownRows = monthlyBreakdown.map(row => [
            row.month,
            formatCurrency(row.emi),
            formatCurrency(row.rent),
            formatCurrency(row.netEmi),
            formatPercent(row.annualizedRoi),
        ]);

        const fullReport = [
            ...summaryData,
            [], // Blank Row
            [], // Blank Row
            ["Monthly Breakdown", ""],
            breakdownHeader,
            ...breakdownRows
        ];

        const csvContent = arrayToCsv(fullReport);
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");

        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "ZAssets_ROE_Report.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };


    return (
        <>
            <style>{`
                :root {
                    --bg-color: #111827; /* Deep dark blue */
                    --card-bg: #1F2937; /* Muted dark blue/gray */
                    --text-color: #E5E7EB; /* Off-white */
                    --label-color: #9CA3AF; /* Lighter gray */
                    --border-color: #374151; /* Subtle border */
                    --accent-color-1: #00D1FF; /* Z-Assets Bright Blue */
                    --accent-color-2: #00AEEF; /* Z-Assets Darker Blue */
                    --accent-color-rgb: 0, 209, 255;
                    --shadow-color: rgba(0,0,0,0.2);
                    --font-family: 'Inter', sans-serif;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideInUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }

                body {
                    margin: 0;
                    font-family: var(--font-family);
                    background-color: var(--bg-color);
                    background-image: radial-gradient(circle at top, rgba(255,255,255,0.03), transparent 40%);
                    color: var(--text-color);
                    padding: 2rem;
                }
                .app-container { max-width: 1300px; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 3rem; animation: slideInUp 0.6s ease-out, fadeIn 0.6s ease-out; }
                
                .z-logo {
                    font-family: 'Inter', sans-serif;
                    font-weight: 800;
                    font-size: 3.5rem;
                    color: var(--accent-color-1);
                    text-shadow: 0 0 15px rgba(var(--accent-color-rgb), 0.35);
                    letter-spacing: 0.08em;
                    margin-bottom: 1rem;
                    filter: drop-shadow(0 2px 3px rgba(0,0,0,0.4));
                    text-align: center;
                }
                .z-logo-a {
                    position: relative;
                }
                .z-logo-a::before { /* Keyhole circle */
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 0.2em;
                    height: 0.2em;
                    background: var(--bg-color);
                    border-radius: 50%;
                    transform: translate(-50%, -80%);
                    z-index: 1;
                }
                .z-logo-a::after { /* Keyhole bottom */
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 0.08em;
                    height: 0.25em;
                    background: var(--bg-color);
                    transform: translate(-50%, -15%);
                    z-index: 1;
                }

                .header p { font-size: 1.1rem; color: var(--label-color); margin-top: -0.5rem; max-width: 600px; margin-left: auto; margin-right: auto; }
                
                .main-layout { display: grid; grid-template-columns: 400px 1fr; gap: 2rem; align-items: flex-start; }
                
                .panel {
                    background: var(--card-bg);
                    border-radius: 16px;
                    border: 1px solid var(--border-color);
                    padding: 2rem;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                    animation: slideInUp 0.6s ease-out 0.2s, fadeIn 0.6s ease-out 0.2s;
                    animation-fill-mode: backwards;
                }
                .input-panel { display: flex; flex-direction: column; gap: 1.75rem; }
                .output-panel { display: flex; flex-direction: column; gap: 1.5rem; animation-delay: 0.4s; }
                
                .section-title { font-size: 1.25rem; font-weight: 600; color: var(--text-color); padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-color); margin-bottom: 1rem; }
                
                .input-row { display: flex; flex-direction: column; gap: 0.5rem; }
                label { font-weight: 500; color: var(--label-color); font-size: 0.9rem; }
                .help-text { display: inline-block; font-size: 0.8rem; color: #6B7280; font-weight: 400; margin-left: 8px; }

                .input-container { display: flex; align-items: center; background-color: var(--bg-color); border: 1px solid var(--border-color); border-radius: 8px; transition: all 0.2s; }
                .input-container:focus-within {
                    border-color: var(--accent-color-1);
                    box-shadow: 0 0 0 3px rgba(var(--accent-color-rgb), 0.2);
                }
                input[type="number"] { width: 100%; padding: 0.75rem 1rem; border: none; background: transparent; font-size: 1rem; font-family: var(--font-family); color: var(--text-color); -moz-appearance: textfield; }
                input[type="number"]::-webkit-outer-spin-button, input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                input[type="number"]:focus { outline: none; }
                .unit { padding-right: 1rem; color: var(--label-color); font-weight: 500; white-space: nowrap; }

                .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
                .stat-card { background: var(--card-bg); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border-color); transition: transform 0.2s, box-shadow 0.2s; }
                .stat-card:hover { transform: translateY(-4px); box-shadow: 0 8px 20px rgba(0,0,0,0.25); }
                .stat-card.primary {
                    background-image: linear-gradient(to right, var(--accent-color-1), var(--accent-color-2));
                    border-color: var(--accent-color-1);
                    color: white;
                }
                .stat-card.primary .stat-label { color: rgba(255,255,255,0.85); }
                .stat-card.primary .stat-value { color: white; }
                
                .stat-label { font-size: 1rem; color: var(--label-color); margin-bottom: 0.5rem; font-weight: 500; }
                .stat-value { font-size: 2.5rem; font-weight: 700; color: var(--text-color); line-height: 1; }

                .output-row { display: flex; justify-content: space-between; align-items: center; padding: 1rem 0; border-bottom: 1px solid var(--border-color); }
                .output-row:last-child { border-bottom: none; padding-bottom: 0;}
                .output-row:first-child { padding-top: 0;}
                .output-row > label { font-size: 1rem; color: var(--label-color)}
                .output-row > span { font-size: 1.1rem; font-weight: 600; }
                
                .accordion { transition: background-color 0.2s; }
                .accordion-header { background: transparent; border: none; color: var(--text-color); width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0; font-size: 1.25rem; font-weight: 600; cursor: pointer; }
                .accordion-header:hover .accordion-icon { color: var(--accent-color-1); }
                .accordion-icon { font-size: 1.5rem; transition: transform 0.3s ease, color 0.2s; transform-origin: center; }
                .accordion.open .accordion-icon { transform: rotate(90deg); }
                
                .accordion-content { overflow: hidden; max-height: 0; transition: max-height 0.5s ease-in-out, padding-top 0.5s ease; }
                .accordion.open .accordion-content { max-height: 500px; padding-top: 1.5rem; }

                .details-table-container { max-height: 400px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 8px; background-color: var(--bg-color); }
                .details-table { width: 100%; border-collapse: collapse; text-align: right; }
                .details-table th, .details-table td { padding: 0.85rem 1rem; border-bottom: 1px solid var(--border-color); font-size: 0.9rem; white-space: nowrap; }
                .details-table th { position: sticky; top: 0; background-color: #2a3547; font-weight: 600; color: var(--label-color); text-align: right; }
                .details-table th:first-child, .details-table td:first-child { text-align: left; }
                .details-table tbody tr:last-child td { border-bottom: none; }
                .details-table tbody tr:hover { background-color: rgba(var(--accent-color-rgb), 0.1); }

                .download-button {
                    width: 100%;
                    padding: 1rem;
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: white;
                    background-image: linear-gradient(to right, var(--accent-color-1), var(--accent-color-2));
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                }
                .download-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 15px rgba(var(--accent-color-rgb), 0.3);
                }

                @media (max-width: 1200px) { 
                    .main-layout { 
                        grid-template-columns: 1fr; 
                        gap: 1.5rem;
                    } 
                }
                @media (max-width: 992px) {
                    .stats-grid {
                        grid-template-columns: 1fr 1fr;
                    }
                }
                @media (max-width: 768px) {
                    body { padding: 1rem; }
                    .z-logo { font-size: 2.8rem; }
                    .header p { font-size: 1rem; }
                    .panel { padding: 1.5rem; }
                }
                @media (max-width: 600px) { 
                    .stats-grid { 
                        grid-template-columns: 1fr;
                        gap: 1rem;
                     } 
                    .stat-value { font-size: 2rem; }
                    .header { margin-bottom: 2rem; }
                    .z-logo { font-size: 2.2rem; }
                }
            `}</style>

            <div className="app-container">
                <header className="header">
                    <ZAssetsLogo />
                    <h1>ROE Calculator</h1>
                    <p>An advanced calculator to determine the Return on Equity (ROE) and profitability of your real estate investments.</p>
                </header>
                <div className="main-layout">
                    <div className="panel input-panel">
                        <section>
                            <div className="section-title">Property & Loan</div>
                            <NumberInput label="Agreement Value" value={apartmentValue} onChange={e => setApartmentValue(Number(e.target.value))} unit="₹" min={500000} max={50000000} step={100000} />
                            <NumberInput label="Down Payment" value={downPaymentPercent} onChange={e => setDownPaymentPercent(Number(e.target.value))} unit="%" min={0} max={100} step={1}/>
                            <NumberInput label="Loan Interest Rate" value={interestRate} onChange={e => setInterestRate(Number(e.target.value))} unit="%" min={1} max={15} step={0.05}/>
                            <NumberInput label="Loan Term" value={loanTerm} onChange={e => setLoanTerm(Number(e.target.value))} unit="years" min={1} max={30} step={1}/>
                        </section>
                        <section>
                            <div className="section-title">Assumptions</div>
                             <div className="input-row">
                                <label>Initial Monthly Rent</label>
                                <div className="input-container" style={{backgroundColor: '#111827', padding: '0.75rem 1rem'}}>
                                    <span style={{color: 'var(--text-color)', fontSize: '1rem'}}>{formatCurrency(initialMonthlyRent)}</span>
                                    <span className="help-text" style={{marginLeft:'auto'}}>Fixed at 5% of value/year</span>
                                </div>
                            </div>
                            <NumberInput label="Annual Rent Escalation" value={rentEscalation} onChange={e => setRentEscalation(Number(e.target.value))} unit="%" min={0} max={20} step={0.5}/>
                            <NumberInput label="Escalation Frequency" helpText="(in years)" value={rentEscalationFrequency} onChange={e => setRentEscalationFrequency(Number(e.target.value))} unit="years" min={1} max={10} step={1}/>
                            <NumberInput label="Capital Appreciation" helpText="(Annual Rate)" value={capitalAppreciation} onChange={e => setCapitalAppreciation(Number(e.target.value))} unit="%" min={0} max={20} step={0.5}/>
                            <NumberInput label="Sale Time" value={saleTime} onChange={e => setSaleTime(Number(e.target.value))} unit="years" min={1} max={50} step={1}/>
                            <NumberInput label="Inflation" helpText="(For NPV Calculation)" value={inflation} onChange={e => setInflation(Number(e.target.value))} unit="%" min={0} max={15} step={0.1}/>
                        </section>
                    </div>

                    <div className="output-panel">
                        <div className="stats-grid">
                            <StatCard label="XIRR" value={formatPercent(xirr)} helpText={xirrHelpText} primary />
                            <StatCard label="ROE (NPV)" value={formatPercent(roe)} helpText="Return on Equity (adjusted for inflation)" />
                            <StatCard label="Average Gross Yield" value={formatPercent(averageGrossYield)} helpText="Average annual rent as a percentage of the initial property value." />
                        </div>
                         <div className="panel">
                            <div className="section-title">Key Figures</div>
                             <div className="output-row">
                                 <label>Down Payment</label>
                                 <span>{formatCurrency(downPaymentAmount)}</span>
                             </div>
                             <div className="output-row">
                                 <label>Loan EMI</label>
                                 <span>{formatCurrency(emi)}</span>
                             </div>
                              <div className="output-row">
                                 <label>Net Proceeds on Sale ({saleTime} yrs)</label>
                                 <span>{formatCurrency(futureAssetValue - pendingLoan)}</span>
                             </div>
                             <div className="output-row">
                                 <label>Total Equity Invested (NPV)</label>
                                 <span>{formatCurrency(totalEquityNpv)}</span>
                             </div>
                        </div>
                         <div className="panel">
                            <button onClick={handleDownload} className="download-button">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                                  <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                                </svg>
                                <span>Download Report (.csv)</span>
                            </button>
                        </div>
                         <div className="panel">
                             <Accordion title="View Monthly Breakdown">
                                <DetailsTable data={monthlyBreakdown} formatCurrency={formatCurrency} formatPercent={formatPercent} />
                             </Accordion>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
