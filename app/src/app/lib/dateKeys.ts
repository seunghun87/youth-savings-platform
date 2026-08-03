const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 기기 시간대와 관계없이 한국 표준시 기준 YYYY-MM-DD를 반환한다. */
export function seoulDateKey(date = new Date()) {
  return new Date(date.getTime() + SEOUL_OFFSET_MS).toISOString().slice(0, 10);
}

/** 기기 시간대와 관계없이 한국 표준시 기준 YYYY-MM을 반환한다. */
export function seoulMonthKey(date = new Date()) {
  return seoulDateKey(date).slice(0, 7);
}

export function previousSeoulMonthKey(date = new Date()) {
  const shifted = new Date(date.getTime() + SEOUL_OFFSET_MS);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() - 1, 1))
    .toISOString()
    .slice(0, 7);
}
