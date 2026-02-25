export function roundUpToOdd(num) {
  return num % 2 === 1  ? num
                        : num + 1;
};

export function clamp(value, low, high) {
  return value < low ? low
    : value > high ? high
    : value;
};

export function roundUpToMultiple(value, multiple) {
  if (multiple <= 0) return value;
  return Math.ceil(value / multiple) * multiple;
};