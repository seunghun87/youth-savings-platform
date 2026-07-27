// /api/products의 가입 조건 필터 동작을 실제 요청으로 확인한다.
const test = require('node:test');
const assert = require('node:assert/strict');

const base = {
  product_type: '시중', options: null, min_age: 0, max_age: 99,
  min_period: 12, max_period: 24, income_limit: null, monthly_limit: null,
  source: 'finlife', special_note: null,
};

const ROWS = [
  { ...base, id: '1', name: '일반적금', bank: 'A은행', base_rate: 3.0,
    join_deny: 1, join_member: '실명의 개인' },
  // 청년이 가입할 수 없는 상품
  { ...base, id: '2', name: '반려동물적금', bank: 'B은행', base_rate: 5.0,
    join_deny: 3, join_member: '반려견을 키우는 고객' },
  // 제한 표시는 있지만 청년 전용 상품 — 노출되어야 한다
  { ...base, id: '3', name: 'NH1934월복리적금', bank: '농협은행주식회사', base_rate: 4.0,
    join_deny: 3, join_member: '만19세~만34세 개인 및 개인사업자' },
  // 정책 상품은 금감원 필드가 없다
  { ...base, id: '4', name: '청년도약계좌', bank: '시중은행 공통', base_rate: 6.0,
    product_type: '정책', source: 'manual', join_deny: null, join_member: null },
];

const supabaseStub = {
  from: () => {
    const builder = {
      select: () => builder,
      eq: () => Promise.resolve({ data: ROWS, error: null }),
    };
    return builder;
  },
};

const supabasePath = require.resolve('../src/services/supabaseClient');
require.cache[supabasePath] = { id: supabasePath, filename: supabasePath, loaded: true, exports: supabaseStub };

const express = require('express');
const productsRouter = require('../src/routes/products');
const errorHandler = require('../src/middleware/errorHandler');

const app = express();
app.use('/api/products', productsRouter);
app.use(errorHandler);

let server;
let baseUrl;

test.before(async () => {
  server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => server.close());

const names = async query => (await (await fetch(`${baseUrl}/api/products${query}`)).json()).map(p => p.name);

test('기본 조회는 청년이 가입할 수 없는 상품만 제외한다', async () => {
  const shown = await names('');
  assert.equal(shown.includes('반려동물적금'), false);
  assert.equal(shown.includes('일반적금'), true);
  assert.equal(shown.includes('청년도약계좌'), true);
});

test('제한 표시가 있어도 청년 대상 상품은 노출한다', async () => {
  // 회귀 방지: join_deny=3만 보고 자르면 이 상품이 목록에서 사라졌다
  const shown = await names('');
  assert.equal(shown.includes('NH1934월복리적금'), true);
});

test('include_restricted=true면 조건 있는 상품도 함께 내려준다', async () => {
  const shown = await names('?include_restricted=true');
  assert.equal(shown.includes('반려동물적금'), true);
  assert.equal(shown.length, ROWS.length);
});

test('가입 조건을 표시할 수 있도록 필드를 함께 내려준다', async () => {
  const body = await (await fetch(`${baseUrl}/api/products?include_restricted=true`)).json();
  const pet = body.find(p => p.name === '반려동물적금');

  assert.equal(pet.join_deny, 3);
  assert.equal(pet.join_member, '반려견을 키우는 고객');
});

test('true 이외의 값은 제한 해제로 취급하지 않는다', async () => {
  for (const value of ['1', 'yes', 'TRUE', '']) {
    const shown = await names(`?include_restricted=${value}`);
    assert.equal(shown.includes('반려동물적금'), false, `include_restricted=${value}는 필터를 유지해야 한다`);
  }
});

test('대표금리 높은 순으로 정렬한다', async () => {
  const body = await (await fetch(`${baseUrl}/api/products?include_restricted=true`)).json();
  const rates = body.map(p => p.rate);
  assert.deepEqual(rates, [...rates].sort((a, b) => b - a));
});
