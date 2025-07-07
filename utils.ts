// A simple implementation of XIRR using the Newton-Raphson method.
export const calculateXirr = (cashflows: { amount: number, date: Date }[], guess = 0.1): number => {
    const MAX_ITERATIONS = 100;
    const PRECISION = 1e-7;

    if (!cashflows || cashflows.length === 0) {
        return NaN;
    }

    // NPV (Net Present Value) function
    const npv = (rate: number): number => {
        return cashflows.reduce((acc, cf) => {
            const daysDiff = (cf.date.getTime() - cashflows[0].date.getTime()) / (1000 * 60 * 60 * 24);
            return acc + cf.amount / Math.pow(1 + rate, daysDiff / 365.0);
        }, 0);
    };

    // Derivative of the NPV function
    const npvDerivative = (rate: number): number => {
        return cashflows.reduce((acc, cf) => {
            const daysDiff = (cf.date.getTime() - cashflows[0].date.getTime()) / (1000 * 60 * 60 * 24);
            if (daysDiff <= 0 || rate <= -1) {
                return acc;
            }
            return acc - (cf.amount * daysDiff) / (365.0 * Math.pow(1 + rate, (daysDiff / 365.0) + 1));
        }, 0);
    };

    let rate = guess;
    for (let i = 0; i < MAX_ITERATIONS; i++) {
        const npvValue = npv(rate);
        const derivativeValue = npvDerivative(rate);

        if (Math.abs(npvValue) < PRECISION) {
            return rate * 100; // Return as a percentage
        }
        if (derivativeValue === 0) {
            break;
        }
        rate = rate - npvValue / derivativeValue;
    }

    // Return NaN if no solution is found
    return NaN;
};
