const TAX_RATE = 0.154; // 이자소득세 15.4%

// 적금(매월 납입) 단리 기준 만기 수령액 계산
function calculateMaturityAmount(monthlyAmount, periodMonths, annualRate) {
  const principal = monthlyAmount * periodMonths;
  const monthlyRate = annualRate / 100 / 12;
  const pretaxInterest = monthlyAmount * monthlyRate * ((periodMonths * (periodMonths + 1)) / 2);
  const aftertaxInterest = pretaxInterest * (1 - TAX_RATE);
  return Math.floor(principal + aftertaxInterest);
}

module.exports = { calculateMaturityAmount };
