// Format a number of hours as 'Xd Yh' or 'Xh' based on hoursPerDay
// Examples: 12h (8h/day) => '1d 4h', 8.5h => '1d 0.5h', 6h => '6h'

export function formatHours(hours, hoursPerDay = 8) {
  if (hours == null || isNaN(hours)) return '–';
  hours = Number(hours);
  if (hours < hoursPerDay) {
    return `${stripTrailingZero(hours)}h`;
  }
  const days = Math.floor(hours / hoursPerDay);
  const rem = +(hours % hoursPerDay).toFixed(2);
  let result = `${days}d`;
  if (rem > 0) {
    result += ` ${stripTrailingZero(rem)}h`;
  }
  return result;
}

function stripTrailingZero(val) {
  return val % 1 === 0 ? val.toFixed(0) : val.toFixed(1);
} 