// /api/products의 가입 제한 필터 동작을 실제 요청으로 확인한다.
const test = require('node:test');
const assert = require('node:assert/strict');

const ROWS = [
  { id: '1', name: '일반적금', bank: 'A은행', product_type: '시중', base_rate: 3.0, options: null,
    min_age: 0, max_age: 99, min_period: 12, max_period: 24, income_limit: null, monthly_limit: null,
    source: 'finlife', join_deny: 1, join_member: '실명의 개인', special_note: null },
  { id: '2', name: '반려동물적금', bank: 'B은행', product_type: '시중', base_rate: 5.0, options: null,
    min_age: 0, max_age: 99, min_period: 12, max_period: 12, income_limit: null, monthly_limit: null,
    source: 'finlife', join_deny: 3, join_member: '반려동물을 등록한 개인', special_note: '펫 등록 시 우대' },
  { id: '3', name: '청년도약계좌', bank: '시중은행 공통', product_type: '정책', base_rate: 6.0, options: null,
    min_age: 19, max_age: 34, min_period: 60, max_period: 60, income_limit: 7500, monthly_limit: 70,
    source: 'manual', join_deny: null, join_member: null, special_note: null },
];

// 서비스가 .or()를 호출했는지로 필터 적용 여부를 판별한다
const captured = { orCalled: false };

const supabaseStub = {
  from: () => {
    const builder = {
      select: () => builder,
      eq: () => builder,
      or: () => { captured.orCalled = true; return Promise.resolve({ data: ROWS.filter(r => r.join_deny == null || r.join_deny === 1), error: null }); },
      then: (resolve, reject) => Promise.resolve({ data: ROWS, error: null }).then(resolve, reject),
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

test('기본 조회는 가입 제한 상품을 제외한다', async () => {
  captured.orCalled = false;
  const res = await fetch(`${baseUrl}/api/products`);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(captured.orCalled, true, '제한 필터(.or)가 적용되어야 한다');
  assert.equal(body.some(p => p.name === '반려동물적금'), false);
  // 정책 상품은 join_deny가 없어도 그대로 노출된다
  assert.equal(body.some(p => p.name === '청년도약계좌'), true);
});

test('include_restricted=true면 제한 상품도 함께 내려준다', async () => {
  captured.orCalled = false;
  const res = await fetch(`${baseUrl}/api/products?include_restricted=true`);
  const body = await res.json();

  assert.equal(captured.orCalled, false, '제한 필터를 적용하지 않아야 한다');
  assert.equal(body.some(p => p.name === '반려동물적금'), true);
});

test('가입 조건을 구분·표시할 수 있도록 필드를 함께 내려준다', async () => {
  const res = await fetch(`${baseUrl}/api/products?include_restricted=true`);
  const body = await res.json();
  const pet = body.find(p => p.name === '반려동물적금');

  assert.equal(pet.join_deny, 3);
  assert.equal(pet.join_member, '반려동물을 등록한 개인');
  assert.equal(pet.special_note, '펫 등록 시 우대');
});

test('true 이외의 값은 제한 해제로 취급하지 않는다', async () => {
  for (const value of ['1', 'yes', 'TRUE', '']) {
    captured.orCalled = false;
    await fetch(`${baseUrl}/api/products?include_restricted=${value}`);
    assert.equal(captured.orCalled, true, `include_restricted=${value}는 필터를 유지해야 한다`);
  }
});

test('대표금리 높은 순으로 정렬한다', async () => {
  const res = await fetch(`${baseUrl}/api/products?include_restricted=true`);
  const rates = (await res.json()).map(p => p.rate);
  assert.deepEqual(rates, [...rates].sort((a, b) => b - a));
});
