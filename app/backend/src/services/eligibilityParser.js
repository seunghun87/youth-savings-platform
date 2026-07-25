// 알고리즘설계서 2.3 "자격요건 텍스트 파싱(분류 + 숫자 추출)" 구현.
// 정책의 자격요건 자유텍스트(eligibility_text)를 조건 단위로 쪼개 종류를 분류하고,
// 판정 가능한(bracket/personal_income) 조건은 숫자를 뽑아내고, 나머지는 unknown으로 넘긴다.

// ① 조건 종류 분류 전 텍스트를 절 단위로 분리
function splitClauses(text) {
  return text
    .split(/[,\n·/]|(?:\s+및\s+)/)
    .map(s => s.trim())
    .filter(Boolean);
}

// ② 숫자 추출: 콤마 제거 + "만원"/"억" 단위 정규화
function extractAmount(str) {
  const eokMatch = str.match(/([\d.]+)\s*억/);
  const manMatch = str.match(/([\d,]+)\s*만\s*원/);
  let value = null;
  if (eokMatch) {
    value = parseFloat(eokMatch[1]) * 10000;
    if (manMatch) value += Number(manMatch[1].replace(/,/g, ''));
  } else if (manMatch) {
    value = Number(manMatch[1].replace(/,/g, ''));
  }
  return Number.isFinite(value) ? value : null;
}

function extractBracket(str) {
  const m = str.match(/(\d{1,2})\s*분위/);
  return m ? Number(m[1]) : null;
}

// 분류 순서 주의(설계서 명시): "가구/중위소득"을 개인소득보다 먼저 검사해야
// "가구소득 연 …" 같은 문구가 개인소득으로 잘못 잡히지 않는다
function classifyClause(clause) {
  if (/만\s*\d{1,3}\s*세|\d{1,3}\s*[~\-]\s*\d{1,3}\s*세/.test(clause)) {
    // age는 온통청년 API가 이미 구조화 필드(min_age/max_age)로 제공하므로
    // 여기서는 "이 절은 나이 얘기다"만 표시하고 숫자는 뽑지 않는다 (구조화 필드가 항상 우선)
    return { type: 'age', value: null };
  }
  if (/분위/.test(clause)) {
    return { type: 'bracket', value: extractBracket(clause) };
  }
  if (/가구|기준중위소득|중위소득/.test(clause)) {
    return { type: 'household', value: null };
  }
  if (/연소득|소득\s*[\d,]+\s*만\s*원/.test(clause)) {
    return { type: 'personal_income', value: extractAmount(clause) };
  }
  return { type: 'unknown', value: null };
}

function parseRequirements(text) {
  if (!text) return [];
  return splitClauses(text).map(classifyClause);
}

module.exports = { parseRequirements };
