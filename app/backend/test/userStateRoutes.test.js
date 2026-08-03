// userState 라우터의 인증·검증 계층을 실제 요청으로 확인한다.
// supabase 클라이언트는 require 캐시에 스텁을 심어 대체하므로 DB 없이 동작한다.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const USER_ID = '11111111-2222-3333-4444-555555555555';

// ── supabase 스텁 ────────────────────────────────────────────
// 라우터가 호출하는 쿼리 빌더 체인을 흉내 낸다. 모든 종단 연산은 빈 성공 응답을 돌려주고,
// 마지막으로 upsert/update에 넘어간 값을 기록해 두어 검증 결과를 확인할 수 있게 한다.
const captured = { lastWrite: null, deletedUserId: null };

function queryBuilder() {
  const result = { data: {}, error: null, count: 0 };
  const builder = {
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    select: () => builder,
    eq: () => builder,
    gte: () => builder,
    lte: () => builder,
    order: () => builder,
    range: () => builder,
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve({ data: { product_name: 'x', contribution_type: 'flexible' }, error: null }),
    insert: values => { captured.lastWrite = values; return builder; },
    update: values => { captured.lastWrite = values; return builder; },
    upsert: values => { captured.lastWrite = values; return builder; },
    delete: () => builder,
  };
  return builder;
}

const supabaseStub = {
  from: () => queryBuilder(),
  rpc: () => Promise.resolve({ data: null, error: null }),
  auth: {
    getUser: async token =>
      token === 'valid-token'
        ? { data: { user: { id: USER_ID } }, error: null }
        : { data: { user: null }, error: new Error('invalid') },
    admin: {
      deleteUser: async id => { captured.deletedUserId = id; return { data: {}, error: null }; },
    },
  },
};

const supabasePath = require.resolve('../src/services/supabaseClient');
require.cache[supabasePath] = { id: supabasePath, filename: supabasePath, loaded: true, exports: supabaseStub };

const express = require('express');
const userStateRouter = require('../src/routes/userState');
const errorHandler = require('../src/middleware/errorHandler');

const app = express();
app.use(express.json());
app.use('/api/user-state', userStateRouter);
app.use(errorHandler);

let server;
let baseUrl;

test.before(async () => {
  server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => server.close());

function request(method, urlPath, { token = 'valid-token', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${baseUrl}${urlPath}`, { method, headers, body: body && JSON.stringify(body) });
}

const validProfile = {
  name: '김민준',
  age: 26,
  city: '서울특별시',
  annual_income: 3000,
  is_homeowner: false,
  income_reported: true,
  onboarding_completed: true,
};

test('토큰이 없으면 401을 반환한다', async () => {
  const res = await request('GET', `/api/user-state/${USER_ID}`, { token: null });
  assert.equal(res.status, 401);
});

test('다른 사용자의 ID에는 403을 반환한다', async () => {
  const res = await request('GET', '/api/user-state/99999999-0000-0000-0000-000000000000');
  assert.equal(res.status, 403);
  assert.match((await res.json()).error, /다른 사용자/);
});

test('회원탈퇴는 본인 앱 데이터와 Auth 계정을 함께 삭제한다', async () => {
  captured.deletedUserId = null;
  const res = await request('DELETE', `/api/user-state/${USER_ID}/account`);
  assert.equal(res.status, 204);
  assert.equal(captured.deletedUserId, USER_ID);
});

test('프로필 검증을 통과한 요청만 저장에 도달한다', async () => {
  captured.lastWrite = null;
  const res = await request('PUT', `/api/user-state/${USER_ID}/profile`, { body: validProfile });
  assert.equal(res.status, 200);
  assert.equal(captured.lastWrite.name, '김민준');
  assert.equal(captured.lastWrite.is_homeowner, false);
});

test('불리언 자리에 문자열이 오면 400으로 막는다', async () => {
  const res = await request('PUT', `/api/user-state/${USER_ID}/profile`, {
    body: { ...validProfile, is_homeowner: 'false' },
  });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /주택 보유 여부/);
});

test('검증을 통과한 필드만 남기고 나머지 입력은 버린다', async () => {
  captured.lastWrite = null;
  const res = await request('PUT', `/api/user-state/${USER_ID}/profile`, {
    body: { ...validProfile, client_id: 'someone-else', role: 'admin' },
  });
  assert.equal(res.status, 200);
  assert.equal(captured.lastWrite.client_id, undefined);
  assert.equal(captured.lastWrite.role, undefined);
});

test('가입 상태는 화이트리스트 밖의 값을 거부한다', async () => {
  const res = await request('POST', `/api/user-state/${USER_ID}/enrolled-products`, {
    body: { product_id: 'p1', product_name: '적금', bank: '우리은행', status: '관리자승인' },
  });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /가입 상태/);
});

test('최소 납입액이 최대 납입액보다 크면 400으로 막는다', async () => {
  const res = await request('POST', `/api/user-state/${USER_ID}/enrolled-products`, {
    body: { product_id: 'p1', product_name: '적금', bank: '우리은행', min_amount: 500000, max_amount: 100000 },
  });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /최소 납입액은 최대 납입액보다/);
});

test('약정 납입액이 상품 최소 납입액에 못 미치면 400으로 막는다', async () => {
  const res = await request('POST', `/api/user-state/${USER_ID}/enrolled-products`, {
    body: {
      product_id: 'p1', product_name: '적금', bank: '우리은행',
      min_amount: 100000, max_amount: 500000, monthly_amount: 50000,
    },
  });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /최소 납입액은/);
});

test('만기일이 가입일보다 빠르면 400으로 막는다', async () => {
  const res = await request('POST', `/api/user-state/${USER_ID}/enrolled-products`, {
    body: {
      product_id: 'p1', product_name: '적금', bank: '우리은행',
      started_at: '2026-07-01', matures_at: '2026-06-01',
    },
  });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /만기일은 가입일보다/);
});

test('가입 상품 저장 시 기본값(상태·적립방식·납입주기)이 채워진다', async () => {
  captured.lastWrite = null;
  const res = await request('POST', `/api/user-state/${USER_ID}/enrolled-products`, {
    body: { product_id: 'p1', product_name: '적금', bank: '우리은행' },
  });
  assert.equal(res.status, 201);
  assert.equal(captured.lastWrite.status, '신청완료');
  assert.equal(captured.lastWrite.contribution_type, 'flexible');
  assert.equal(captured.lastWrite.payment_frequency, 'monthly');
  assert.equal(captured.lastWrite.opening_balance, 0);
});

test('납입일은 YYYY-MM-DD 형식만 받는다', async () => {
  const res = await request('POST', `/api/user-state/${USER_ID}/contributions`, {
    body: { product_name: '적금', amount: 100000, contributed_at: '07/27/2026' },
  });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /YYYY-MM-DD/);
});

test('납입액은 1원 이상의 정수만 받는다', async () => {
  const res = await request('POST', `/api/user-state/${USER_ID}/contributions`, {
    body: { product_name: '적금', amount: 0 },
  });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /납입액/);
});
