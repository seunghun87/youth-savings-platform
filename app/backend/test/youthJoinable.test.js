// 가입 조건 판정을 금감원 실제 데이터로 검증한다.
// 아래 목록은 운영 DB에서 join_deny가 2·3으로 내려온 상품 전체(2026-07 기준)이며,
// 기대값은 "청년 개인이 혼자서 가입할 수 있는가"로 사람이 판정한 결과다.
const test = require('node:test');
const assert = require('node:assert/strict');
const { isYouthJoinable, hasUnderageCeiling } = require('../src/services/productRules');

// [상품명, 가입대상(join_member), 청년 가입 가능 여부]
const REAL_RESTRICTED = [
  // ── 청년이 가입 가능해야 하는 것 ──
  ['NH1934월복리적금', '만19세~만34세 개인 및 개인사업자', true],
  ['청년플랜적금', '만 19세 이상 ~ 만 39세 이하 개인', true],
  ['청포도 청년적금', '19~39세', true],
  ['WELCOME 잔돈모아올림적금', '제한없음', true],
  ['웰뱅 잔돈자동적금', '제한없음', true],
  ['NH직장인월복리적금', '만18세이상 개인', true],
  ['파란 하늘 정기적금', '개인(1인,1계좌에 한함_활동좌기준)', true],
  ['직장인YES 정기적금', '개인 (직장인)', true],
  ['IBK중기근로자우대적금', '중소기업에서 근무하는 실명의 개인 (개인사업자 제외)', true],
  ['마이홈 정기적금', '19세 이상 주민등록증 혹은 운전면허증 보유한 무주택 개인', true],
  ['고려 든든한 첫거래 우대 정기적금', "당행 첫 고객 '-당행 미등록 고객 대상 -비거주 외국인 외 제한없음", true],
  ['처음만난적금', '실명의 개인중 첫거래 또는 장기미거래 고객', true],
  ['생일축하정기적금', '적금 가입월과 주민등록상 생일월이 일치하는 개인고객', true],
  ['12干支정기적금', '가입연도 12간지띠에 해당되는 고객', true],

  // ── 청년 개인이 가입할 수 없는 것 ──
  ['JT쩜피플러스 정기적금', '반려견을 키우는 고객', false],
  ['IBKSB 사랑 얼라 정기 적금', '① 출산예정인자-배우자 포함 ② 당해연도 출생한 부모 ③ 미성년자 자녀가 있는 한부모 가정의 부모', false],
  ['꿈나무정기적금', '만13세미만어린이', false],
  ['모아 다자녀 적금', '세명 이상의 미성년 자녀를 둔 부모', false],
  ['아이사랑 정기적금', '만 19세미만 자녀 2명 이상을 둔 부모 및 자녀 (각 1인 1계좌)', false],
  ['아이행복적금', '19세 이상 실명의 개인 - 18세 이하 자녀가 2명 이상인 부모 - 본인 혹은 배우자가 출산 예정인 자', false],
  ['자녀와 행복 PLUS 정기 적금', '-만 18세 이하 본인 -만 18세 이하 자녀를 둔 부모', false],
  ['장학적금자유식', '만19세 미만의 청소년만 가입가능', false],
  ['토스뱅크 아이 적금', '· 토스뱅크 아이 통장을 보유한 15세 이하 실명의 개인', false],
  ['퍼스트유 정기적금', '개인 (만 7세 이하 미성년자)', false],
];

test('금감원 실제 제한 상품 전체를 올바르게 판정한다', () => {
  const wrong = REAL_RESTRICTED.filter(
    ([, joinMember, expected]) =>
      isYouthJoinable({ join_deny: 3, join_member: joinMember, special_note: null }) !== expected,
  ).map(([name, , expected]) => `${name}(기대: ${expected ? '가입가능' : '제외'})`);

  assert.deepEqual(wrong, [], `오판정: ${wrong.join(', ')}`);
});

test('청년 전용 적금이 제한 상품으로 묻히지 않는다', () => {
  // 회귀 방지: join_deny=3만 보고 자르면 이 상품들이 목록에서 통째로 사라졌다
  for (const name of ['NH1934월복리적금', '청년플랜적금', '청포도 청년적금']) {
    const [, joinMember] = REAL_RESTRICTED.find(row => row[0] === name);
    assert.equal(
      isYouthJoinable({ join_deny: 3, join_member: joinMember, special_note: null }),
      true,
      `${name}은 청년 대상 상품이므로 노출되어야 한다`,
    );
  }
});

test('제한이 없는 상품과 정책 상품은 문구와 무관하게 통과한다', () => {
  assert.equal(isYouthJoinable({ join_deny: 1, join_member: '실명의 개인' }), true);
  // 정책 상품(manual)은 금감원 필드가 없다
  assert.equal(isYouthJoinable({ join_deny: null, join_member: null }), true);
  assert.equal(isYouthJoinable({ name: '청년도약계좌', source: 'manual' }), true);
});

test('제한이 있다면서 내용이 없으면 보수적으로 제외한다', () => {
  assert.equal(isYouthJoinable({ join_deny: 3, join_member: null, special_note: null }), false);
  assert.equal(isYouthJoinable({ join_deny: 3, join_member: '   ', special_note: null }), false);
});

test('연령 상한은 숫자를 비교해 19세 미만만 걸러낸다', () => {
  // 청년 대상 상품의 상한은 걸리면 안 된다
  assert.equal(hasUnderageCeiling('만 19세 이상 ~ 만 39세 이하 개인'), false);
  assert.equal(hasUnderageCeiling('만34세 이하'), false);
  assert.equal(hasUnderageCeiling('만18세이상 개인'), false); // 이상은 상한이 아니다

  // 미성년 대상만 걸린다
  assert.equal(hasUnderageCeiling('15세 이하'), true);
  assert.equal(hasUnderageCeiling('만13세미만'), true);
  assert.equal(hasUnderageCeiling('만19세 미만'), true); // 미만은 상한이 18세
  assert.equal(hasUnderageCeiling('만 7세 이하'), true);
});

test('우대조건 문구에 있는 부양 조건도 함께 본다', () => {
  assert.equal(
    isYouthJoinable({ join_deny: 3, join_member: '실명의 개인', special_note: '반려동물 등록 시 가입' }),
    false,
  );
});
