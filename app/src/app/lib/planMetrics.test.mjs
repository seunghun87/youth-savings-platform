import test from "node:test";
import assert from "node:assert/strict";
import { accountProgressPercent, accountProjectedValue, afterTaxInterestFromGross, buildAccountSnapshot, calculatePlanMetrics, estimatedAccountAfterTaxInterest, estimatedAfterTaxInterest, monthDiff, remainingPaymentPrincipal } from "./planMetrics.mjs";

const account = (changes={}) => ({ status:"가입완료", monthly:300000, paid:300000, remainingMonths:12, interest:100000, support:0, ...changes });
const scenarios = [
  ["신규 사용자", {target:30000000,current:0,unallocated:500000,accounts:[]}, {budget:500000,remaining:30000000,baseMonths:60}],
  ["목표 달성 사용자", {target:10000000,current:12000000,unallocated:300000,accounts:[]}, {remaining:0,baseMonths:0,progressPercent:100}],
  ["적금 1개 사용자", {target:50000000,current:5000000,unallocated:200000,accounts:[account()]}, {budget:500000,paid:300000,futurePrincipal:3300000}],
  ["적금 3개 사용자", {target:80000000,current:10000000,unallocated:100000,accounts:[account(),account({monthly:200000,paid:0}),account({monthly:100000,paid:50000})]}, {budget:700000,paid:350000}],
  ["일부 납입 사용자", {target:20000000,current:2000000,unallocated:0,accounts:[account({monthly:400000,paid:150000})]}, {paid:150000,remaining:18000000,baseMonths:45}],
  ["만기 완료 포함 사용자", {target:40000000,current:15000000,unallocated:250000,accounts:[account({status:"만기완료",monthly:500000,paid:500000,remainingMonths:6}),account({monthly:200000})]}, {budget:450000,paid:300000,futurePrincipal:2200000}],
  ["중도해지 포함 사용자", {target:40000000,current:8000000,unallocated:300000,accounts:[account({status:"중도해지",monthly:400000,paid:400000}),account({monthly:100000,paid:0})]}, {budget:400000,paid:0}],
  ["월 저축 0원 사용자", {target:10000000,current:1000000,unallocated:0,accounts:[]}, {budget:0,remaining:9000000,baseMonths:null}],
  ["큰 목표 사용자", {target:1000000000,current:100000000,unallocated:3000000,accounts:[account({monthly:2000000,remainingMonths:60})]}, {budget:5000000,baseMonths:180,futurePrincipal:119700000}],
  ["목표 초과·활성 적금 사용자", {target:5000000,current:7000000,unallocated:100000,accounts:[account({monthly:100000})]}, {remaining:0,baseMonths:0,progressPercent:100}],
];

for (const [name, input, expected] of scenarios) {
  test(`사용자 시나리오: ${name}`, () => {
    const actual = calculatePlanMetrics(input);
    for (const [key, value] of Object.entries(expected)) assert.equal(actual[key], value, `${key} 불일치`);
  });
}

test("날짜 월 차이는 연도 경계를 정확히 계산한다",()=>assert.equal(monthDiff("2026-11-10","2027-02-01"),3));
test("적금 진행률은 실제 납입 회차 비율이며 100%를 넘지 않는다",()=>{assert.equal(accountProgressPercent(6,24),25);assert.equal(accountProgressPercent(30,24),100)});
test("세후 예상 이자는 0원·0개월에서 음수가 되지 않는다",()=>{assert.equal(estimatedAfterTaxInterest(0,5,12),0);assert.equal(estimatedAfterTaxInterest(300000,5,0),0)});
test("이번 달 미납이면 남은 회차 수만큼 원금을 계산한다",()=>assert.equal(remainingPaymentPrincipal(300000,0,5),1500000));
test("이번 달 부분납입이면 남은 회차 원금에서 납입액을 차감한다",()=>assert.equal(remainingPaymentPrincipal(300000,120000,5),1380000));
test("이번 달 완납·초과납입은 한 회차까지만 차감한다",()=>{assert.equal(remainingPaymentPrincipal(300000,300000,5),1200000);assert.equal(remainingPaymentPrincipal(300000,500000,5),1200000)});
test("내 적금 목표 기여 예상은 현재 원금과 미래 원금·이자·지원금을 모두 포함한다",()=>assert.equal(accountProjectedValue({balance:1000000,monthly:300000,paid:0,remainingMonths:2,interest:50000,support:100000}),1750000));
test("계좌 예상 이자는 이미 쌓인 원금의 남은 기간 이자도 포함한다",()=>{
  const withBalance=estimatedAccountAfterTaxInterest({balance:5000000,monthly:0,paidThisMonth:0,annualRate:6,remainingMonths:12});
  assert.equal(withBalance,253800);
  assert.ok(withBalance>estimatedAccountAfterTaxInterest({balance:0,monthly:0,paidThisMonth:0,annualRate:6,remainingMonths:12}));
});
test("월 20만 원·12개월·연 6% 적금의 세후 만기액은 2,465,988원이다",()=>{
  const monthly=200000,months=12,principal=remainingPaymentPrincipal(monthly,0,months);
  const afterTaxInterest=estimatedAccountAfterTaxInterest({balance:0,monthly,paidThisMonth:0,annualRate:6,remainingMonths:months});
  assert.equal(principal,2400000);
  assert.equal(afterTaxInterest,65988);
  assert.equal(principal+afterTaxInterest,2465988);
});
test("세전 이자 78,000원의 세금과 세후 이자를 원 단위로 계산한다",()=>assert.deepEqual(afterTaxInterestFromGross(78000),{pretaxInterest:78000,tax:12012,afterTaxInterest:65988}));

const baseProduct={product_name:"테스트적금",opening_balance:0,monthly_amount:200000,interest_rate:6,started_at:"2026-08-04",matures_at:"2027-08-04",status:"가입완료"};
const snapshot=(product={},contributions=[])=>buildAccountSnapshot({product:{...baseProduct,...product},contributions,currentMonth:"2026-08",currentDate:"2026-08-04"});
const accountScenarios=[
  ["01 신규 12개월 적금",{},[],{balance:0,paid:0,remainingMonths:12,futurePrincipal:2400000,interest:65988,status:"가입완료"}],
  ["02 이번 달 완납",{},[{product_name:"테스트적금",amount:200000,contributed_at:"2026-08-04"}],{balance:200000,paid:200000,futurePrincipal:2200000,interest:65988}],
  ["03 이번 달 부분납입",{},[{product_name:"테스트적금",amount:100000,contributed_at:"2026-08-04"}],{balance:100000,paid:100000,futurePrincipal:2300000,interest:65988}],
  ["04 이번 달 초과납입",{},[{product_name:"테스트적금",amount:300000,contributed_at:"2026-08-04"}],{balance:300000,paid:300000,futurePrincipal:2200000}],
  ["05 초기 원금만 보유",{opening_balance:1000000,monthly_amount:0},[],{balance:1000000,futurePrincipal:0,interest:50760}],
  ["06 금리 0%",{interest_rate:0},[],{interest:0,futurePrincipal:2400000}],
  ["07 금리 미입력",{interest_rate:null},[],{interest:0}],
  ["08 만기일 미입력",{matures_at:null},[],{projectionAvailable:false,remainingMonths:0,futurePrincipal:0,interest:0}],
  ["09 만기일 경과",{started_at:"2025-08-01",matures_at:"2026-08-01"},[],{status:"만기완료",futurePrincipal:0,interest:0}],
  ["10 만기완료 상태",{status:"만기완료"},[],{status:"만기완료",futurePrincipal:0,interest:0}],
  ["11 중도해지 상태",{status:"중도해지"},[],{status:"중도해지",futurePrincipal:0,interest:0}],
  ["12 미래 납입 기록 제외",{},[{product_name:"테스트적금",amount:200000,contributed_at:"2026-08-05"}],{balance:0,paid:0}],
  ["13 다른 상품 기록 제외",{},[{product_name:"다른적금",amount:900000,contributed_at:"2026-08-04"}],{balance:0,paid:0}],
  ["14 같은 달 분할납입 합산",{},[{product_name:"테스트적금",amount:50000,contributed_at:"2026-08-01"},{product_name:"테스트적금",amount:150000,contributed_at:"2026-08-04"}],{balance:200000,paid:200000,paidMonths:1}],
  ["15 이전 달 납입은 원금만 반영",{},[{product_name:"테스트적금",amount:200000,contributed_at:"2026-07-04"}],{balance:200000,paid:0,paidMonths:1}],
  ["16 음수 납입 데이터 방어",{},[{product_name:"테스트적금",amount:-100000,contributed_at:"2026-08-04"}],{balance:0,paid:0}],
  ["17 시작일 미입력",{started_at:null},[],{totalMonths:null,projectionAvailable:true,remainingMonths:12}],
  ["18 이번 달 만기",{started_at:"2025-08-04",matures_at:"2026-08-25"},[],{remainingMonths:0,futurePrincipal:0}],
  ["19 고액 장기 적금",{monthly_amount:3000000,interest_rate:5,matures_at:"2031-08-04"},[],{remainingMonths:60,futurePrincipal:180000000}],
  ["20 월 약정액 미입력",{monthly_amount:null},[],{monthly:0,futurePrincipal:0,interest:0}],
];
for(const [name,product,contributions,expected] of accountScenarios){
  test(`내 적금 시나리오 ${name}`,()=>{const actual=snapshot(product,contributions);for(const [key,value] of Object.entries(expected))assert.equal(actual[key],value,`${key} 불일치`)});
}
