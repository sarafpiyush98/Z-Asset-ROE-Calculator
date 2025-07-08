

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
    
    // --- State for User Inputs (as strings for better UX) ---
    const [apartmentValue, setApartmentValue] = useState('2500000');
    const [downPaymentPercent, setDownPaymentPercent] = useState('20');
    const [interestRate, setInterestRate] = useState('8.7');
    const [loanTerm, setLoanTerm] = useState('15');
    const [initialRentYield, setInitialRentYield] = useState('5');
    const [rentEscalation, setRentEscalation] = useState('10');
    const [rentEscalationFrequency, setRentEscalationFrequency] = useState('3');
    const [capitalAppreciation, setCapitalAppreciation] = useState('7');
    const [saleTime, setSaleTime] = useState('15');
    const [inflation, setInflation] = useState('6');

    // --- Input Handlers ---
    const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setter(e.target.value);
    };

    const handleInputBlur = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.FocusEvent<HTMLInputElement>) => {
        if (e.target.value.trim() === '') {
            setter('0');
        }
    };

    // --- Parsed Numeric Values for Calculation ---
    const p = (s: string): number => parseFloat(s) || 0;
    const apartmentValueNum = p(apartmentValue);
    const downPaymentPercentNum = p(downPaymentPercent);
    const interestRateNum = p(interestRate);
    const loanTermNum = p(loanTerm);
    const initialRentYieldNum = p(initialRentYield);
    const rentEscalationNum = p(rentEscalation);
    const rentEscalationFrequencyNum = p(rentEscalationFrequency);
    const capitalAppreciationNum = p(capitalAppreciation);
    const saleTimeNum = p(saleTime);
    const inflationNum = p(inflation);

    // --- Financial Calculations using useMemo for efficiency ---
    
    const initialMonthlyRent = useMemo(() => (apartmentValueNum * (initialRentYieldNum / 100)) / 12, [apartmentValueNum, initialRentYieldNum]);
    const downPaymentAmount = useMemo(() => apartmentValueNum * (downPaymentPercentNum / 100), [apartmentValueNum, downPaymentPercentNum]);
    const loanAmount = useMemo(() => apartmentValueNum - downPaymentAmount, [apartmentValueNum, downPaymentAmount]);

    const emi = useMemo(() => {
        if (loanAmount <= 0) return 0;
        const monthlyRate = (interestRateNum / 100) / 12;
        if (monthlyRate === 0) return loanAmount / (loanTermNum * 12);
        const nper = loanTermNum * 12;
        const pvif = Math.pow(1 + monthlyRate, nper);
        return (monthlyRate * loanAmount * pvif) / (pvif - 1);
    }, [loanAmount, interestRateNum, loanTermNum]);

    const { futureAssetValue, pendingLoan, monthlyBreakdown } = useMemo(() => {
        const breakdownData: MonthlyBreakdownRow[] = [];
        const totalMonths = saleTimeNum * 12;
        const totalLoanMonths = loanTermNum * 12;
        
        if (totalMonths <= 0 || apartmentValueNum <= 0) {
             return { futureAssetValue: apartmentValueNum, pendingLoan: loanAmount, monthlyBreakdown: [] };
        }

        const annualEscalationRate = rentEscalationNum / 100;
        const r = (interestRateNum / 100) / 12;
        const P = loanAmount;
        
        for (let m = 1; m <= totalMonths; m++) {
            const yearsPassed = Math.floor((m - 1) / 12);
            const numEscalations = rentEscalationFrequencyNum > 0 ? Math.floor(yearsPassed / rentEscalationFrequencyNum) : 0;

            const currentMonthlyRent = initialMonthlyRent * Math.pow(1 + annualEscalationRate, numEscalations);
            const currentEmi = (m > totalLoanMonths || loanAmount <= 0) ? 0 : emi;
            const netEmiForMonth = currentEmi - currentMonthlyRent;
            const annualizedGrossYield = (currentMonthlyRent * 12 / apartmentValueNum) * 100;

            breakdownData.push({
                month: m,
                emi: currentEmi,
                rent: currentMonthlyRent,
                netEmi: netEmiForMonth,
                annualizedRoi: annualizedGrossYield,
            });
        }
        
        const finalAssetValue = apartmentValueNum * Math.pow(1 + (capitalAppreciationNum / 100), saleTimeNum);
        
        let finalPendingLoan;
        if (saleTimeNum >= loanTermNum || loanAmount <= 0) {
            finalPendingLoan = 0;
        } else {
             finalPendingLoan = r === 0 ? P - (emi * totalMonths) : P * Math.pow(1 + r, totalMonths) - emi * ((Math.pow(1 + r, totalMonths) - 1) / r);
        }
        
        return {
            futureAssetValue: finalAssetValue,
            pendingLoan: Math.max(0, finalPendingLoan),
            monthlyBreakdown: breakdownData,
        };
    }, [apartmentValueNum, saleTimeNum, rentEscalationNum, rentEscalationFrequencyNum, emi, initialMonthlyRent, interestRateNum, capitalAppreciationNum, loanAmount, loanTermNum]);

    const totalEquityNpv = useMemo(() => {
        const monthlyInflationRate = (inflationNum / 100) / 12;
        const totalMonths = saleTimeNum * 12;
        if (totalMonths <= 0) return downPaymentAmount;

        let pvOfNetEmis = monthlyBreakdown.reduce((acc, row, index) => {
            const m = index + 1;
            const discountedNetEmi = monthlyInflationRate === 0 ? row.netEmi : row.netEmi / Math.pow(1 + monthlyInflationRate, m);
            return acc + discountedNetEmi;
        }, 0);

        return downPaymentAmount + pvOfNetEmis;
    }, [downPaymentAmount, inflationNum, saleTimeNum, monthlyBreakdown]);
    
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
        saleDate.setMonth(today.getMonth() + saleTimeNum * 12);
        cashflows.push({ amount: netFutureEquity, date: saleDate });
        
        const hasPositive = cashflows.some(cf => cf.amount > 0);
        const hasNegative = cashflows.some(cf => cf.amount < 0);
        if (!hasPositive || !hasNegative) return 0;
        
        const result = calculateXirr(cashflows);
        return isNaN(result) ? 0 : result;

    }, [downPaymentAmount, saleTimeNum, futureAssetValue, pendingLoan, monthlyBreakdown]);
    
    const averageGrossYield = useMemo(() => {
        if (!monthlyBreakdown || monthlyBreakdown.length === 0 || apartmentValueNum === 0) {
            return 0;
        }
        const totalRent = monthlyBreakdown.reduce((acc, row) => acc + row.rent, 0);
        const averageMonthlyRent = totalRent / monthlyBreakdown.length;
        const averageYearlyRent = averageMonthlyRent * 12;
        return (averageYearlyRent / apartmentValueNum) * 100;
    }, [monthlyBreakdown, apartmentValueNum]);


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
            ["Inputs", "Agreement Value", formatCurrency(apartmentValueNum)],
            ["Inputs", "Down Payment", `${downPaymentPercentNum}% (${formatCurrency(downPaymentAmount)})`],
            ["Inputs", "Loan Amount", formatCurrency(loanAmount)],
            ["Inputs", "Interest Rate", formatPercent(interestRateNum)],
            ["Inputs", "Loan Term", `${loanTermNum} years`],
            ["Inputs", "Sale Time", `${saleTimeNum} years`],
            ["Assumptions", "Initial Annual Rent Yield", formatPercent(initialRentYieldNum)],
            ["Assumptions", "Annual Rent Escalation", `${formatPercent(rentEscalationNum)} every ${rentEscalationFrequencyNum} years`],
            ["Assumptions", "Annual Capital Appreciation", formatPercent(capitalAppreciationNum)],
            ["Assumptions", "Inflation (for NPV)", formatPercent(inflationNum)],
            [], // Blank Row
            ["Key Results", "XIRR", formatPercent(xirr)],
            ["Key Results", "ROE (NPV-adjusted)", formatPercent(roe)],
            ["Key Results", "Average Gross Yield", formatPercent(averageGrossYield)],
            ["Key Results", "Loan EMI", formatCurrency(emi)],
            ["Key Results", "Initial Monthly Rent", formatCurrency(initialMonthlyRent)],
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
                        <NumberInput label="Agreement Value" value={apartmentValue} onChange={handleInputChange(setApartmentValue)} onBlur={handleInputBlur(setApartmentValue)} unit="₹" min={500000} max={50000000} step={100000} />
                        <NumberInput label="Down Payment" value={downPaymentPercent} onChange={handleInputChange(setDownPaymentPercent)} onBlur={handleInputBlur(setDownPaymentPercent)} unit="%" min={0} max={100} step={1} />
                        <NumberInput label="Loan Interest Rate" value={interestRate} onChange={handleInputChange(setInterestRate)} onBlur={handleInputBlur(setInterestRate)} unit="%" min={1} max={15} step={0.05} />
                        <NumberInput label="Loan Term" value={loanTerm} onChange={handleInputChange(setLoanTerm)} onBlur={handleInputBlur(setLoanTerm)} unit="years" min={1} max={30} step={1} />
                    </section>
                    <section>
                        <div className="section-title">Assumptions</div>
                        <NumberInput label="Initial Annual Rent Yield" helpText="(% of agreement value)" value={initialRentYield} onChange={handleInputChange(setInitialRentYield)} onBlur={handleInputBlur(setInitialRentYield)} unit="%" min={1} max={15} step={0.1} />
                        <NumberInput label="Annual Rent Escalation" value={rentEscalation} onChange={handleInputChange(setRentEscalation)} onBlur={handleInputBlur(setRentEscalation)} unit="%" min={0} max={20} step={0.5} />
                        <NumberInput label="Escalation Frequency" helpText="(in years)" value={rentEscalationFrequency} onChange={handleInputChange(setRentEscalationFrequency)} onBlur={handleInputBlur(setRentEscalationFrequency)} unit="years" min={1} max={10} step={1} />
                        <NumberInput label="Capital Appreciation" helpText="(Annual Rate)" value={capitalAppreciation} onChange={handleInputChange(setCapitalAppreciation)} onBlur={handleInputBlur(setCapitalAppreciation)} unit="%" min={0} max={20} step={0.5} />
                        <NumberInput label="Sale Time" value={saleTime} onChange={handleInputChange(setSaleTime)} onBlur={handleInputBlur(setSaleTime)} unit="years" min={1} max={50} step={1} />
                        <NumberInput label="Inflation" helpText="(For NPV Calculation)" value={inflation} onChange={handleInputChange(setInflation)} onBlur={handleInputBlur(setInflation)} unit="%" min={0} max={15} step={0.1} />
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
                            <label>Initial Monthly Rent</label>
                            <span>{formatCurrency(initialMonthlyRent)}</span>
                        </div>
                        <div className="output-row">
                            <label>{`Net Proceeds on Sale (${saleTimeNum} yrs)`}</label>
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