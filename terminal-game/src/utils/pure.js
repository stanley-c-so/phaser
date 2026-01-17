export function roundUpToOdd(num) {
  return num % 2 === 1  ? num
                        : num + 1;
};

export function clamp(value, low, high) {
  return value < low ? low
    : value > high ? high
    : value;
};