import { randomInt } from 'crypto';

export function roundToDecimal(value: number, places: number = 2) {
  return Math.round(value * Math.pow(10, places)) / Math.pow(10, places);
}

export function createReference(): string {
  return `FX-${randomInt(1000, 9999)}-${new Date().getTime()}`;
}
