import test from "node:test";
import assert from "node:assert/strict";
import { accountProgressPercent, accountProjectedValue, calculatePlanMetrics, estimatedAccountAfterTaxInterest, estimatedAfterTaxInterest, monthDiff, remainingPaymentPrincipal } from "./planMetrics.mjs";

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
