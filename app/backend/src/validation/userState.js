const ENROLLED_STATUSES = new Set(['신청중', '신청완료', '가입완료', '만기완료', '중도해지']);
const CONTRIBUTION_TYPES = new Set(['fixed', 'flexible', 'step_up']);
const PAYMENT_FREQUENCIES = new Set(['monthly', 'weekly', 'daily']);

function requiredString(value, label, maxLength = 200) {
  if (typeof value !== 'string' || !value.trim()) {
    throw badRequest(`${label}을(를) 입력해주세요`);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw badRequest(`${label}은(는) ${maxLength}자 이하여야 합니다`);
  }
  return normalized;
}

function optionalString(value, label, maxLength = 500) {
  if (value == null || value === '') return null;
  return requiredString(value, label, maxLength);
}

function integer(value, label, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, nullable = false } = {}) {
  if (nullable && (value == null || value === '')) return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw badRequest(`${label}을(를) 확인해주세요`);
  }
  return parsed;
}

function decimal(value, label, { min = 0, max = Number.MAX_SAFE_INTEGER, nullable = false } = {}) {
  if (nullable && (value == null || value === '')) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw badRequest(`${label}을(를) 확인해주세요`);
  }
  return parsed;
}

function boolean(value, label) {
  if (typeof value !== 'boolean') throw badRequest(`${label}을(를) 확인해주세요`);
  return value;
}

function date(value, label, { nullable = false } = {}) {
  if (nullable && (value == null || value === '')) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw badRequest(`${label}을(를) YYYY-MM-DD 형식으로 입력해주세요`);
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw badRequest(`${label}이(가) 올바른 날짜가 아닙니다`);
  }
  return value;
}

function oneOf(value, label, allowed) {
  if (!allowed.has(value)) throw badRequest(`${label}을(를) 확인해주세요`);
  return value;
}

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

module.exports = {
  ENROLLED_STATUSES,
  CONTRIBUTION_TYPES,
  PAYMENT_FREQUENCIES,
  requiredString,
  optionalString,
  integer,
  decimal,
  boolean,
  date,
  oneOf,
  badRequest,
};
