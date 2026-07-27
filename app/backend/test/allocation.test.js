// allocateSavings의 배분 규칙을 확인한다. supabase는 고정 상품 목록 스텁으로 대체한다.
const test = require('node:test');
const assert = require('node:assert/strict');

// 금리 높은 순: 정책6% → 은행4.5% → 은행3% . 각각 월 한도가 있다
const PRODUCTS = [
  { name: '정책적금', bank: '시중은행 공통', base_rate: 6.0, options: null,
    min_age: 19, max_age: 34, min_period: 12, max_period: 60,
    income_limit: 7500, monthly_limit: 50, join_deny: null, available_for_signup: true },
  { name: '고금리적금', bank: 'A은행', base_rate: null,
    options: [{ term: 12, rate: 4.5 }, { term: 24, rate: 4.2 }],
    min_age: 0, max_age: 99, min_period: 12, max_period: 24,
    income_limit: null, monthly_limit: 30, join_deny: 1, available_for_signup: true },
  { name: '일반적금', bank: 'B은행', base_rate: null,
    options: [{ term: 24, rate: 3.0 }],
    min_age: 0, max_age: 99, min_period: 12, max_period: 24,
    income_limit: null, monthly_limit: null, join_deny: 1, available_for_signup: true },
  // 가입 제한 상품 — 금리가 가장 높지만 배분 대상이 아니어야 한다
  { name: '반려동물적금', bank: 'C은행', base_rate: null,
    options: [{ term: 12, rate: 9.9 }],
    min_age: 0, max_age: 99, min_period: 12, max_period: 12,
    income_limit: null, monthly_limit: null, join_deny: 3, available_for_signup: true },
];

// 서비스는 require 시점에 supabase 참조를 붙잡으므로 스텁 객체를 바꿔치기할 수 없다.
// 대신 스텁이 읽는 목록을 바꿔가며 테스트한다.
let currentProducts = PRODUCTS;

const supabaseStub = {
  from: () => {
    const builder = {
      select: () => builder,
      // 서비스가 .eq(...).or(...)로 끝내므로 or에서 결과를 돌려준다
      eq: () => builder,
      or: () => Promise.resolve({ data: currentProducts, error: null }),
    };
    return builder;
  },
};

const supabasePath = require.resolve('../src/services/supabaseClient');
require.cache[supabasePath] = { id: supabasePath, filename: supabasePath, loaded: true, exports: supabaseStub };

const { allocateSavings } = require('../src/services/allocationService');

const INPUT = { monthly_amount: 100, period_months: 24, age: 26, personal_income: 3000 };

test('금리 높은 상품부터 월 한도까지 채우고 남은 금액을 넘긴다', async () => {
  const result = await allocateSavings(INPUT);
  const split = result.allocations.map(a => [a.name, a.monthly_allocation]);

  // 정책 50(한도) → 고금리 30(한도) → 일반 20(잔액)
  assert.deepEqual(split, [['정책적금', 50], ['고금리적금', 30], ['일반적금', 20]]);
  assert.equal(result.total_monthly_allocated, 100);
  assert.equal(result.unallocated_amount, 0);
});

test('가입 제한 상품은 금리가 가장 높아도 배분하지 않는다', async () => {
  const result = await allocateSavings(INPUT);
  assert.equal(result.allocations.some(a => a.name === '반려동물적금'), false);
});

test('금리와 계산 기간이 같은 옵션에서 나온다', async () => {
  const result = await allocateSavings(INPUT);
  const high = result.allocations.find(a => a.name === '고금리적금');

  // 목표 24개월이므로 24개월 옵션(4.2%)이 적용되어야 한다. 12개월 4.5%가 더 높더라도.
  assert.equal(high.calculation_period_months, 24);
  assert.equal(high.base_rate, 4.2);
});

test('상품 한도를 다 채워도 남으면 미배분 금액으로 알린다', async () => {
  // 월 한도 없는 '일반적금'을 빼면 정책 50 + 고금리 30 = 80만 담긴다
  currentProducts = PRODUCTS.filter(p => p.name !== '일반적금');
  try {
    const result = await allocateSavings(INPUT);
    assert.equal(result.total_monthly_allocated, 80);
    assert.equal(result.unallocated_amount, 20);
  } finally {
    currentProducts = PRODUCTS;
  }
});

test('만기 수령액은 원금과 세후이자의 합이다', async () => {
  const result = await allocateSavings(INPUT);
  for (const a of result.allocations) {
    assert.equal(a.expected_amount, a.principal + a.aftertax_interest);
    assert.equal(a.principal, a.monthly_allocation * 10000 * a.calculation_period_months);
  }
  assert.equal(
    result.total_expected_amount,
    result.allocations.reduce((sum, a) => sum + a.expected_amount, 0),
  );
});
