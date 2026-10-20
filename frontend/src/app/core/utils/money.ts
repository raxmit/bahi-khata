const INR_PARTS = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const INTEGER_GROUPING = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** Accept a positive decimal amount with at most two fractional digits. */
export function isValidRupeeInput(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{1,13}(?:\.\d{1,2})?$/.test(value)) return false;
  const [rupees, paise = ''] = value.split('.');
  return BigInt(rupees) * 100n + BigInt(paise.padEnd(2, '0') || '0') > 0n;
}

/** Normalize accepted user text to the canonical two-decimal API representation. */
export function canonicalRupees(value: string): string {
  const [rupees, paise = ''] = value.split('.');
  return `${BigInt(rupees)}.${paise.padEnd(2, '0')}`;
}

/** Format canonical INR text without converting its value to a JavaScript Number. */
export function formatRupees(amount: string): string {
  const match = /^(-?)(\d+)(?:\.(\d{2}))$/.exec(amount);
  if (!match) return 'Invalid amount';
  const [, sign, rupees, paise] = match;
  const currencyParts = INR_PARTS.formatToParts(sign ? -1 : 1);
  const currency = currencyParts.find((part) => part.type === 'currency')?.value ?? '₹';
  const grouped = INTEGER_GROUPING.format(BigInt(rupees));
  return `${sign ? '-' : ''}${currency}${grouped}.${paise}`;
}
