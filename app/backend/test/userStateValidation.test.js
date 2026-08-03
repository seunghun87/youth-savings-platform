const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ENROLLED_STATUSES,
  requiredString,
  integer,
  decimal,
  boolean,
  date,
  oneOf,
} = require('../src/validation/userState');
const { safeEqual } = require('../src/middleware/requireSyncSecret');
const { calculateMaturityAmount } = require('../src/services/calculationService');

test('월 20만 원을 12개월간 연 6%로 납입하면 세후 2,465,988원이다', () => {
  assert.deepEqual(calculateMaturityAmount(200000, 12, 6), {
    principal: 2400000,
    pretaxInterest: 78000,
    tax: 12012,
    aftertaxInterest: 65988,
    maturityAmount: 2465988,
  });
});

test('문자열 입력의 공백을 제거하고 길이를 제한한다', () => {
  assert.equal(requiredString('  청년도약계좌  ', '상품명', 20), '청년도약계좌');
  assert.throws(() => requiredString('   ', '상품명'), { message: '상품명을(를) 입력해주세요' });
  assert.throws(() => requiredString('1234', '이름', 3), /3자 이하/);
});

test('금액은 안전한 정수와 허용 범위만 받는다', () => {
  assert.equal(integer('500000', '납입액', { min: 1 }), 500000);
  assert.equal(integer(null, '납입액', { nullable: true }), null);
  assert.throws(() => integer(0, '납입액', { min: 1 }), /확인해주세요/);
  assert.throws(() => integer(1.5, '납입액', { min: 1 }), /확인해주세요/);
  assert.throws(() => integer(Number.MAX_VALUE, '납입액'), /확인해주세요/);
});

test('금리는 유한한 범위의 숫자만 받는다', () => {
  assert.equal(decimal('4.5', '금리', { min: 0, max: 100 }), 4.5);
  assert.throws(() => decimal(Infinity, '금리'), /확인해주세요/);
  assert.throws(() => decimal(101, '금리', { max: 100 }), /확인해주세요/);
});

test('불리언 문자열을 참값으로 오인하지 않는다', () => {
  assert.equal(boolean(false, '저장 여부'), false);
  assert.throws(() => boolean('false', '저장 여부'), /확인해주세요/);
});

test('실재하는 ISO 날짜만 허용한다', () => {
  assert.equal(date('2026-07-27', '납입일'), '2026-07-27');
  assert.throws(() => date('2026-02-30', '납입일'), /올바른 날짜/);
  assert.throws(() => date('07/27/2026', '납입일'), /YYYY-MM-DD/);
});

test('가입 상태 화이트리스트를 적용한다', () => {
  assert.equal(oneOf('가입완료', '가입 상태', ENROLLED_STATUSES), '가입완료');
  assert.throws(() => oneOf('관리자승인', '가입 상태', ENROLLED_STATUSES), /확인해주세요/);
});

test('동기화 비밀키를 상수 시간 비교하며 빈 값은 거부한다', () => {
  assert.equal(safeEqual('correct-secret', 'correct-secret'), true);
  assert.equal(safeEqual('correct-secret', 'wrong-secret'), false);
  assert.equal(safeEqual('', ''), false);
});

test('만기 계산 결과의 원금·이자·수령액 관계가 일치한다', () => {
  const result = calculateMaturityAmount(500000, 12, 4.5);
  assert.equal(result.principal, 6000000);
  assert.equal(result.maturityAmount, result.principal + result.aftertaxInterest);
  assert.ok(result.pretaxInterest >= result.aftertaxInterest);
});
