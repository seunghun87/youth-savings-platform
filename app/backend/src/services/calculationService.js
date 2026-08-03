const TAX_RATE = 0.154; // 이자소득세 15.4%

// 적금(매월 납입) 단리 기준 만기 수령액 계산
function calculateMaturityAmount(monthlyAmount, periodMonths, annualRate, taxRate = TAX_RATE) {
  const principal = monthlyAmount * periodMonths;
  const monthlyRate = annualRate / 100 / 12;
  const pretaxInterest = Math.floor(monthlyAmount * monthlyRate * ((periodMonths * (periodMonths + 1)) / 2));
  const tax = Math.floor(pretaxInterest * taxRate);
  const aftertaxInterest = pretaxInterest - tax;
  return {
    principal,
    pretaxInterest,
    tax,
    aftertaxInterest,
    maturityAmount: principal + aftertaxInterest,
  };
}

module.exports = { calculateMaturityAmount };
