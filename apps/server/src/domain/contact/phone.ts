export interface FormattedPhone {
  readonly display: string;
  readonly tel: string;
}

const POLISH_NUMBER = /^\+48(\d{3})(\d{3})(\d{3})$/;

/** Cosmetic only: +1 and +7 are one digit, every other code is treated as two. */
function countryCodeLength(digits: string): number {
  return digits.startsWith('1') || digits.startsWith('7') ? 1 : 2;
}

/** `e164` is validated by config (`^\+[1-9]\d{6,14}$`); `tel` is the number unchanged. */
export function formatPhone(e164: string): FormattedPhone {
  const polish = POLISH_NUMBER.exec(e164);
  if (polish !== null) {
    return { display: `+48 ${polish[1]} ${polish[2]} ${polish[3]}`, tel: e164 };
  }
  const digits = e164.slice(1);
  const split = countryCodeLength(digits);
  const groups = digits.slice(split).match(/\d{1,3}/g) ?? [];
  return { display: `+${digits.slice(0, split)} ${groups.join(' ')}`, tel: e164 };
}
