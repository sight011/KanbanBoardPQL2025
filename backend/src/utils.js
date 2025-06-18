// Utility for parsing and validating effort/time strings to hours
// Supports: '4', '2.5', '1d', '0.5d', '1d 4h' (not '1.5d 2h')
// Enforces 0.5-hour increments

/**
 * Parses a time string (hours/days/mixed) to hours as a number.
 * @param {string|number|null} input - The input value (e.g., '1d 4h', '4', 0.5, null)
 * @param {number} hoursPerDay - The number of hours in a day (from settings, default 8)
 * @returns {number|null} - The value in hours, or null if input is null/empty
 * @throws {Error} - If the input is invalid or not a 0.5 step
 */
function parseHours(input, hoursPerDay = 8) {
  if (input === null || input === undefined || input === '') return null;
  if (typeof input === 'number') {
    if (!isHalfHourStep(input)) throw new Error('Value must be in 0.5 hour steps');
    return input;
  }
  if (typeof input !== 'string') throw new Error('Invalid input type');
  const trimmed = input.trim().toLowerCase();
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    // Pure hours
    const val = parseFloat(trimmed);
    if (!isHalfHourStep(val)) throw new Error('Value must be in 0.5 hour steps');
    return val;
  }
  if (/^\d+(\.\d+)?h$/.test(trimmed)) {
    // e.g. 4h, 2.5h
    const val = parseFloat(trimmed.replace('h', ''));
    if (!isHalfHourStep(val)) throw new Error('Value must be in 0.5 hour steps');
    return val;
  }
  if (/^0\.5d$/.test(trimmed)) {
    // Only allow 0.5d as a decimal day
    return 0.5 * hoursPerDay;
  }
  if (/^\d+d$/.test(trimmed)) {
    // e.g. 1d, 2d
    const days = parseInt(trimmed.replace('d', ''), 10);
    return days * hoursPerDay;
  }
  if (/^\d+d \d+(\.\d+)?h$/.test(trimmed)) {
    // e.g. 1d 4h
    const [dPart, hPart] = trimmed.split(' ');
    const days = parseInt(dPart.replace('d', ''), 10);
    const hours = parseFloat(hPart.replace('h', ''));
    const total = days * hoursPerDay + hours;
    if (!isHalfHourStep(total)) throw new Error('Value must be in 0.5 hour steps');
    return total;
  }
  throw new Error('Invalid time format. Use numbers with h (hours) or d (days).');
}

function isHalfHourStep(val) {
  return typeof val === 'number' && Math.abs(val * 2 - Math.round(val * 2)) < 1e-8;
}

module.exports = { parseHours }; 