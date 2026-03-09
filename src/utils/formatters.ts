export const formatDate = (date: Date | string): string => {
    if (!date) return '';

    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';

    // Heuristic: If the time is exactly midnight UTC, it was likely from a 'YYYY-MM-DD' string.
    // Use UTC methods to format it to avoid the timezone shifting it to the previous day.
    if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0) {
        const year = d.getUTCFullYear();
        const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
        const day = d.getUTCDate().toString().padStart(2, '0');
        return `${month}/${day}/${year}`;
    }

    // Otherwise, assume it's a local date/time and format using local methods.
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${month}/${day}/${year}`;
};

/**
 * Calculates the difference in days between two dates, ignoring the time component.
 * @param date1 The first date.
 * @param date2 The second date.
 * @returns The number of full days between date1 and date2.
 */
export const dayDiff = (date1: Date, date2: Date): number => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    // Set to midnight UTC to remove time and timezone offset
    d1.setUTCHours(0, 0, 0, 0);
    d2.setUTCHours(0, 0, 0, 0);

    return (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
};

/**
 * Gets the ISO week number of a date.
 * @param d The date.
 * @returns The ISO week number.
 */
export const getWeek = (d: Date): number => {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    // Thursday in current week decides the week number
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    // January 4 is always in week 1.
    const week1 = new Date(date.getFullYear(), 0, 4);
    // Adjust to Thursday in week 1 and count number of weeks from date to week1.
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

/**
 * Generates an array of "nice" numbers for chart axis ticks.
 * @param maxValue The maximum value on the axis.
 * @param tickCount The desired number of ticks (approximate).
 * @returns An array of numbers for the ticks.
 */
export const generateTicks = (maxValue: number, tickCount = 5): number[] => {
    if (maxValue <= 0) return [0];
    const range = maxValue;
    const roughTickSize = range / (tickCount - 1);
    const niceMultiples = [1, 2, 2.5, 5, 10];
    const exponent = Math.floor(Math.log10(roughTickSize));
    const powerOf10 = Math.pow(10, exponent);
    const normalizedTickSize = roughTickSize / powerOf10;
    const niceTickSize = niceMultiples.find(m => m >= normalizedTickSize) ?? 10;
    const finalTickSize = niceTickSize * powerOf10;
    const niceMaxValue = Math.ceil(maxValue / finalTickSize) * finalTickSize;
    const ticks: number[] = [];
    for (let tick = 0; tick <= niceMaxValue; tick += finalTickSize) {
        ticks.push(tick);
    }
    return ticks;
};
