const clamp = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), max);

const toDigits = (raw: string) => raw.replace(/\D/g, "");

function getDefaultDate() {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return {year: t.getFullYear(), month: t.getMonth() + 1, day: t.getDate()};
}

export { clamp, toDigits, getDefaultDate };