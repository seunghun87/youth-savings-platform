const test = require('node:test');
const assert = require('node:assert/strict');
const {
  pickTerm,
  meetsBaseEligibility,
  meetsMonthlyLimit,
} = require('../src/services/productRules');

test('목표 기간을 상품 최대기간으로 자른 뒤 적용 가능한 최장 옵션을 고른다', () => {
  const product = { max_period: 12, options: [{ term: 6, rate: 3.1 }, { term: 12, rate: 4.2 }] };
  // 60개월을 원해도 상품이 12개월까지만 되면 12개월 옵션이 적용된다
  assert.deepEqual(pickTerm(product, 60), { months: 12, rate: 4.2 });
  // 6개월만 넣으면 6개월 옵션까지만 적용 가능
  assert.deepEqual(pickTerm(product, 6), { months: 6, rate: 3.1 });
});

test('같은 기간에 옵션이 여러 개면 최고금리를 고른다', () => {
  const product = { max_period: 12, options: [{ term: 12, rate: 3.0 }, { term: 12, rate: 3.8 }] };
  assert.deepEqual(pickTerm(product, 12), { months: 12, rate: 3.8 });
});

test('목표 기간이 최단 옵션보다 짧으면 적용할 금리가 없어 제외된다', () => {
  const product = { max_period: 24, options: [{ term: 24, rate: 5 }] };
  assert.equal(pickTerm(product, 12), null);
});

test('기간 옵션이 없는 정책 상품은 base_rate를 상품 최대기간까지 적용한다', () => {
  const product = { max_period: 60, base_rate: '6.00', options: null };
  assert.deepEqual(pickTerm(product, 600), { months: 60, rate: 6 });
});

test('금리와 계산 기간은 항상 같은 옵션에서 나온다', () => {
  // 회귀 방지: 예전 배분 로직은 기간과 무관하게 전체 최고금리(6개월 4.2%)를 뽑은 뒤
  // 목표 기간(60개월)으로 이자를 계산해, 실제로는 불가능한 만기액을 만들어냈다.
  const product = { max_period: 12, options: [{ term: 6, rate: 4.2 }, { term: 12, rate: 3.0 }] };
  const picked = pickTerm(product, 60);

  // 최장 적용 가능 옵션인 12개월/3.0%가 선택되어야 한다 (6개월 4.2%가 더 높더라도)
  assert.deepEqual(picked, { months: 12, rate: 3.0 });
  const matching = product.options.find(o => o.term === picked.months);
  assert.equal(matching.rate, picked.rate);
});

test('기본 자격은 나이·최소기간·소득상한만 본다', () => {
  const product = { min_age: 19, max_age: 34, min_period: 12, max_period: 60, income_limit: 7500 };
  const input = { age: 26, period_months: 24, personal_income: 3000 };

  assert.equal(meetsBaseEligibility(product, input), true);
  // 목표 기간이 상품 최대기간보다 길어도 자격은 유지된다(pickTerm이 잘라서 운용)
  assert.equal(meetsBaseEligibility(product, { ...input, period_months: 600 }), true);
  assert.equal(meetsBaseEligibility(product, { ...input, age: 40 }), false);
  assert.equal(meetsBaseEligibility(product, { ...input, period_months: 6 }), false);
  assert.equal(meetsBaseEligibility(product, { ...input, personal_income: 9000 }), false);
});

test('제한 없음(null)인 소득·월납입 한도는 항상 통과한다', () => {
  const unlimited = { min_age: 0, max_age: 99, min_period: 1, income_limit: null, monthly_limit: null };
  assert.equal(meetsBaseEligibility(unlimited, { age: 50, period_months: 12, personal_income: 99999 }), true);
  assert.equal(meetsMonthlyLimit(unlimited, 99999), true);
  assert.equal(meetsMonthlyLimit({ monthly_limit: 70 }, 100), false);
  assert.equal(meetsMonthlyLimit({ monthly_limit: 70 }, 70), true);
});
