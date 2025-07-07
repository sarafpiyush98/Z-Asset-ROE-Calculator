import React, { useState, useMemo, useEffect } from 'react';
import { ZAssetsLogo, NumberInput, StatCard, Accordion, DetailsTable, ThemeToggle } from './components.tsx';
import type { MonthlyBreakdownRow } from './components.tsx';
import { calculateXirr } from './utils.ts';

// --- Main Application ---
const App = () => {
    // --- Theme State ---
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light' || savedTheme === 'dark') {
            return savedTheme;
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'light') {
            root.classList.add('theme-light');
        } else {
            root.classList.remove('theme-light');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };
    
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
        const breakdownData: MonthlyBreakdownRow[] = [];
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
        const cashflows: { amount: number, date: Date }[] = [];
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
    const formatCurrency = (val: number) => `₹ ${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    const formatPercent = (val: number) => `${val.toFixed(2)}%`;
    const xirrHelpText = `Internal Rate of Return on your cashflows. Assumes: \n1. Initial Down Payment (Outflow)\n2. Net Monthly Payments (EMI - Rent) \n3. Final Net Sale Proceeds (Inflow)`;

    const handleDownload = () => {
        const arrayToCsv = (data: (string | number)[][]) => {
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
            row.emi,
            row.rent,
            row.netEmi,
            row.annualizedRoi,
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
        <div className="app-container">
            <header className="header">
                <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
                <ZAssetsLogo />
                <h2>ROE Calculator</h2>
                <p>An advanced calculator to determine the Return on Equity (ROE) and profitability of your real estate investments.</p>
            </header>
            <div className="main-layout">
                <div className="panel input-panel">
                    <section>
                        <div className="section-title">Property & Loan</div>
                        <NumberInput label="Agreement Value" value={apartmentValue} onChange={e => setApartmentValue(Number(e.target.value))} unit="₹" min={500000} max={50000000} step={100000} />
                        <NumberInput label="Down Payment" value={downPaymentPercent} onChange={e => setDownPaymentPercent(Number(e.target.value))} unit="%" min={0} max={100} step={1} />
                        <NumberInput label="Loan Interest Rate" value={interestRate} onChange={e => setInterestRate(Number(e.target.value))} unit="%" min={1} max={15} step={0.05} />
                        <NumberInput label="Loan Term" value={loanTerm} onChange={e => setLoanTerm(Number(e.target.value))} unit="years" min={1} max={30} step={1} />
                    </section>
                    <section>
                        <div className="section-title">Assumptions</div>
                        <div className="input-row">
                            <label>Initial Monthly Rent</label>
                            <div className="input-container" style={{ padding: '0.75rem 1rem' }}>
                                <span style={{ color: 'var(--text-color)', fontSize: '1rem' }}>{formatCurrency(initialMonthlyRent)}</span>
                                <span className="help-text" style={{ marginLeft: 'auto' }}>Fixed at 5% of value/year</span>
                            </div>
                        </div>
                        <NumberInput label="Annual Rent Escalation" value={rentEscalation} onChange={e => setRentEscalation(Number(e.target.value))} unit="%" min={0} max={20} step={0.5} />
                        <NumberInput label="Escalation Frequency" helpText="(in years)" value={rentEscalationFrequency} onChange={e => setRentEscalationFrequency(Number(e.target.value))} unit="years" min={1} max={10} step={1} />
                        <NumberInput label="Capital Appreciation" helpText="(Annual Rate)" value={capitalAppreciation} onChange={e => setCapitalAppreciation(Number(e.target.value))} unit="%" min={0} max={20} step={0.5} />
                        <NumberInput label="Sale Time" value={saleTime} onChange={e => setSaleTime(Number(e.target.value))} unit="years" min={1} max={50} step={1} />
                        <NumberInput label="Inflation" helpText="(For NPV Calculation)" value={inflation} onChange={e => setInflation(Number(e.target.value))} unit="%" min={0} max={15} step={0.1} />
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
                            <label>{`Net Proceeds on Sale (${saleTime} yrs)`}</label>
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
                                <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" />
                                <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z" />
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
    );
};

export default App;