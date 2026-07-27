// listYouthPolicies의 자격 판정·정렬·개수 제한을 확인한다.
// supabase는 고정 목록을 돌려주는 스텁으로 대체한다.
const test = require('node:test');
const assert = require('node:assert/strict');

const ROWS = [
  // 나이 범위가 넓은 충족 정책
  { id: '1', name: '전국 청년 지원', min_age: 19, max_age: 39, income_max: null, income_min: null,
    eligibility_text: null, exclusion_text: null, income_etc: null, keywords: null, category_large: '복지문화' },
  // 나이 범위가 좁은 충족 정책 → 더 특정 대상이므로 위로
  { id: '2', name: '만 25~27세 특별지원', min_age: 25, max_age: 27, income_max: null, income_min: null,
    eligibility_text: null, exclusion_text: null, income_etc: null, keywords: null, category_large: '주거' },
  // 소득 상한 초과 → 미충족
  { id: '3', name: '저소득 청년 지원', min_age: 19, max_age: 39, income_max: 2000, income_min: null,
    eligibility_text: null, exclusion_text: null, income_etc: null, keywords: '주거', category_large: '주거' },
  // 참여제한 문구가 있어 자동 판정 불가 → 확인 필요
  { id: '4', name: '청년 창업 지원', min_age: 19, max_age: 39, income_max: null, income_min: null,
    eligibility_text: null, exclusion_text: '기창업자 제외', income_etc: null, keywords: null, category_large: '일자리' },
];

// 서비스는 require 시점에 supabase 참조를 붙잡으므로, 스텁 객체를 나중에 바꿔치기할 수 없다.
// 대신 이 스텁 안에서 조회 횟수를 세어 캐시 동작을 확인한다.
const reads = { count: 0 };

const supabaseStub = {
  from: () => {
    const builder = {
      select: () => builder,
      order: () => builder,
      range: () => {
        reads.count += 1;
        return Promise.resolve({ data: ROWS, error: null });
      },
    };
    return builder;
  },
};

const supabasePath = require.resolve('../src/services/supabaseClient');
require.cache[supabasePath] = { id: supabasePath, filename: supabasePath, loaded: true, exports: supabaseStub };

const { listYouthPolicies, invalidatePolicyCache } = require('../src/services/youthPolicyService');

test.beforeEach(() => invalidatePolicyCache());

test('나이·소득으로 3상태 자격 판정을 매긴다', async () => {
  const result = await listYouthPolicies({ age: 26, personalIncome: 3000 });
  const byId = Object.fromEntries(result.map(p => [p.id, p]));

  assert.equal(byId['1'].status, '충족');
  assert.equal(byId['2'].status, '충족');
  assert.equal(byId['3'].status, '미충족');
  assert.match(byId['3'].reason, /소득 조건 불충족/);
  assert.equal(byId['4'].status, '확인 필요');
});

test('충족 > 확인 필요 > 미충족 순으로, 같은 상태면 좁은 연령대가 먼저 온다', async () => {
  const result = await listYouthPolicies({ age: 26, personalIncome: 3000 });
  assert.deepEqual(result.map(p => p.id), ['2', '1', '4', '3']);
});

test('limit으로 응답 건수를 제한한다', async () => {
  const result = await listYouthPolicies({ age: 26, personalIncome: 3000, limit: 2 });
  assert.equal(result.length, 2);
  // 정렬 후 상위 2건이어야 한다
  assert.deepEqual(result.map(p => p.id), ['2', '1']);
});

test('나이·소득이 없으면 판정하지 않고 정렬도 바꾸지 않는다', async () => {
  const result = await listYouthPolicies({});
  assert.deepEqual(result.map(p => p.id), ['1', '2', '3', '4']);
  assert.equal(result.every(p => p.status === null && p.reason === null), true);
});

test('검색어는 정책명과 키워드 양쪽에서 찾는다', async () => {
  const byName = await listYouthPolicies({ age: 26, keyword: '창업' });
  assert.deepEqual(byName.map(p => p.id), ['4']);

  // id 3은 이름에 '주거'가 없지만 keywords에 있다
  const byKeyword = await listYouthPolicies({ age: 26, keyword: '주거' });
  assert.equal(byKeyword.some(p => p.id === '3'), true);
});

test('콜드 상태에서 동시 요청이 와도 DB는 한 번만 읽는다', async () => {
  invalidatePolicyCache();
  reads.count = 0;

  await Promise.all([
    listYouthPolicies({ age: 26 }),
    listYouthPolicies({ age: 30 }),
    listYouthPolicies({ age: 35 }),
  ]);
  assert.equal(reads.count, 1);
});

test('캐시가 살아있는 동안 반복 조회해도 DB를 다시 읽지 않는다', async () => {
  invalidatePolicyCache();
  reads.count = 0;

  await listYouthPolicies({ age: 26 });
  await listYouthPolicies({ age: 26 });
  await listYouthPolicies({ age: 31 });
  assert.equal(reads.count, 1);

  // sync 이후에는 캐시를 버리고 다시 읽어야 한다
  invalidatePolicyCache();
  await listYouthPolicies({ age: 26 });
  assert.equal(reads.count, 2);
});
