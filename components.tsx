import React, { useState } from 'react';

// --- Types ---
export interface MonthlyBreakdownRow {
    month: number;
    emi: number;
    rent: number;
    netEmi: number;
    annualizedRoi: number;
}

// --- ThemeToggle ---
interface ThemeToggleProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, toggleTheme }) => (
    <button onClick={toggleTheme} className="theme-toggle" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
        {theme === 'dark' ? (
            // Sun Icon for switching to light
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        ) : (
            // Moon Icon for switching to dark
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
        )}
    </button>
);


// --- ZAssetsLogo ---
export const ZAssetsLogo = () => (
    <h1 className="z-logo" aria-label="Z-Assets">
        Z-<span className="z-logo-a">A</span>SSETS
    </h1>
);

// --- NumberInput ---
interface NumberInputProps {
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
    unit: string;
    helpText?: string | null;
    min?: number;
    max?: number;
    step?: number;
}

export const NumberInput: React.FC<NumberInputProps> = ({ label, value, onChange, onBlur, unit, helpText = null, min, max, step }) => (
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
                onBlur={onBlur}
                min={min}
                max={max}
                step={step}
                aria-label={label}
            />
            {unit && <span className="unit">{unit}</span>}
        </div>
    </div>
);


// --- StatCard ---
interface StatCardProps {
    label: string;
    value: string;
    helpText?: string;
    primary?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, helpText, primary = false }) => (
    <div className={`stat-card ${primary ? 'primary' : ''}`} title={helpText}>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
    </div>
);

// --- DetailsTable ---
interface DetailsTableProps {
    data: MonthlyBreakdownRow[];
    formatCurrency: (val: number) => string;
    formatPercent: (val: number) => string;
}

export const DetailsTable: React.FC<DetailsTableProps> = ({ data, formatCurrency, formatPercent }) => (
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


// --- Accordion ---
interface AccordionProps {
    title: string;
    children: React.ReactNode;
}

export const Accordion: React.FC<AccordionProps> = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className={`accordion ${isOpen ? 'open' : ''}`}>
            <button
                className="accordion-header"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <span>{title}</span>
                <span className="accordion-icon">›</span>
            </button>
            <div className="accordion-content">
                {children}
            </div>
        </div>
    );
};