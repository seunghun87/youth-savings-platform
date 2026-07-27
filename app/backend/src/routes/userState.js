const express = require('express');
const router = express.Router();
const supabase = require('../services/supabaseClient');
const authenticateUser = require('../middleware/authenticateUser');
const {
  ENROLLED_STATUSES,
  CONTRIBUTION_TYPES,
  PAYMENT_FREQUENCIES,
  requiredString,
  optionalString,
  integer,
  decimal,
  boolean,
  date,
  oneOf,
  badRequest,
} = require('../validation/userState');

// 이 라우터의 모든 경로는 로그인 사용자 본인의 :id에 대해서만 허용된다
// (authenticateUser가 JWT의 사용자 ID와 :id가 다르면 403).
router.use('/:id', authenticateUser);

// 최초 접근 시 프로필/플랜 행을 만들어 둔다. 이미 있으면 아무것도 하지 않는다.
async function ensureUser(id) {
  let result = await supabase
    .from('user_profile')
    .upsert({ client_id: id }, { onConflict: 'client_id', ignoreDuplicates: true });
  if (result.error) throw result.error;

  result = await supabase
    .from('savings_plan')
    .upsert({ client_id: id }, { onConflict: 'client_id', ignoreDuplicates: true });
  if (result.error) throw result.error;
}

// 검증 함수는 값이 잘못되면 status 400짜리 예외를 던진다.
// 라우트 핸들러 앞에 미들웨어로 끼워 넣어, 통과한 요청만 핸들러에 도달하게 한다.
function guard(validateRequest) {
  return (req, res, next) => {
    try {
      validateRequest(req);
      next();
    } catch (error) {
      next(error);
    }
  };
}

const validateProfile = guard(req => {
  // 화이트리스트 방식: 검증을 통과한 필드만 남기고 나머지 입력은 버린다
  req.body = {
    name: requiredString(req.body.name, '이름', 50),
    age: integer(req.body.age, '나이', { min: 14, max: 120 }),
    city: requiredString(req.body.city, '거주 지역', 100),
    annual_income: integer(req.body.annual_income, '연소득', { min: 0 }),
    is_homeowner: boolean(req.body.is_homeowner, '주택 보유 여부'),
    income_reported: boolean(req.body.income_reported, '소득 신고 여부'),
    onboarding_completed: boolean(req.body.onboarding_completed, '온보딩 완료 여부'),
  };
});

const validatePlan = guard(req => {
  req.body = {
    target_amount: integer(req.body.target_amount, '목표 금액', { min: 1 }),
    monthly_target: integer(req.body.monthly_target, '월 저축 목표', { min: 1 }),
    current_amount: integer(req.body.current_amount, '현재 저축액', { min: 0 }),
  };
});

const validateNewContribution = guard(req => {
  req.body.amount = integer(req.body.amount, '납입액', { min: 1 });
  req.body.product_name = requiredString(req.body.product_name, '상품명', 200);
  if (req.body.contributed_at !== undefined) {
    req.body.contributed_at = date(req.body.contributed_at, '납입일');
  }
});

const validateContributionUpdate = guard(req => {
  req.body.amount = integer(req.body.amount, '납입액', { min: 1 });
  if (req.body.product_name !== undefined) {
    req.body.product_name = requiredString(req.body.product_name, '상품명', 200);
  }
  if (req.body.contributed_at !== undefined) {
    req.body.contributed_at = date(req.body.contributed_at, '납입일');
  }
});

const validateNewEnrolledProduct = guard(req => {
  req.body.product_id = requiredString(req.body.product_id, '상품 ID', 200);
  req.body.product_name = requiredString(req.body.product_name, '상품명', 200);
  req.body.bank = requiredString(req.body.bank, '금융기관', 100);
  req.body.status = oneOf(req.body.status || '신청완료', '가입 상태', ENROLLED_STATUSES);
  req.body.contribution_type = oneOf(req.body.contribution_type || 'flexible', '적립 방식', CONTRIBUTION_TYPES);
  req.body.payment_frequency = oneOf(req.body.payment_frequency || 'monthly', '납입 주기', PAYMENT_FREQUENCIES);
  req.body.monthly_amount = integer(req.body.monthly_amount, '약정 납입액', { min: 1, nullable: true });
  req.body.opening_balance = integer(req.body.opening_balance ?? 0, '현재 상품 잔액', { min: 0 });
  req.body.min_amount = integer(req.body.min_amount, '최소 납입액', { min: 0, nullable: true });
  req.body.max_amount = integer(req.body.max_amount, '최대 납입액', { min: 1, nullable: true });
  req.body.installment_step_amount = integer(req.body.installment_step_amount, '증액 금액', { min: 0, nullable: true });
  req.body.interest_rate = decimal(req.body.interest_rate, '금리', { min: 0, max: 100, nullable: true });

  if (req.body.applied_at !== undefined) req.body.applied_at = date(req.body.applied_at, '신청일');
  if (req.body.started_at !== undefined) req.body.started_at = date(req.body.started_at, '가입일');
  if (req.body.matures_at !== undefined) req.body.matures_at = date(req.body.matures_at, '만기일', { nullable: true });

  if (req.body.min_amount !== null && req.body.max_amount !== null && req.body.min_amount > req.body.max_amount) {
    throw badRequest('최소 납입액은 최대 납입액보다 클 수 없습니다');
  }
  if (req.body.started_at && req.body.matures_at && req.body.matures_at < req.body.started_at) {
    throw badRequest('만기일은 가입일보다 빠를 수 없습니다');
  }
});

const validateEnrolledProductUpdate = guard(req => {
  if (req.body.status !== undefined) {
    req.body.status = oneOf(req.body.status, '가입 상태', ENROLLED_STATUSES);
  }
  if (req.body.started_at !== undefined) {
    req.body.started_at = date(req.body.started_at, '가입일');
  }
  if (req.body.ended_at !== undefined) {
    req.body.ended_at = date(req.body.ended_at, '종료일', { nullable: true });
  }
  if (req.body.termination_reason !== undefined) {
    req.body.termination_reason = optionalString(req.body.termination_reason, '해지 사유', 500);
  }
  if (req.body.termination_payout !== undefined) {
    req.body.termination_payout = integer(req.body.termination_payout, '중도해지 수령액', { min: 0 });
  }
});

const validateSavedToggle = guard(req => {
  req.body.saved = boolean(req.body.saved, '저장 여부');
});

// ─────────────────────────────────────────────
// 전체 상태 조회
// ─────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    await ensureUser(req.params.id);
    const [profile, plan, contributions, saved, enrolled] = await Promise.all([
      supabase.from('user_profile').select('*').eq('client_id', req.params.id).single(),
      supabase.from('savings_plan').select('*').eq('client_id', req.params.id).single(),
      supabase
        .from('savings_contribution')
        .select('*')
        .eq('client_id', req.params.id)
        .order('contributed_at', { ascending: false }),
      supabase.from('saved_product').select('product_id').eq('client_id', req.params.id),
      supabase
        .from('user_enrolled_product')
        .select('*')
        .eq('client_id', req.params.id)
        .order('applied_at', { ascending: false }),
    ]);

    const failure = profile.error || plan.error || contributions.error || saved.error || enrolled.error;
    if (failure) throw failure;

    res.json({
      profile: profile.data,
      plan: plan.data,
      contributions: contributions.data,
      saved_product_ids: saved.data.map(row => row.product_id),
      enrolled_products: enrolled.data,
    });
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────
// 프로필 / 플랜
// ─────────────────────────────────────────────
router.put('/:id/profile', validateProfile, async (req, res, next) => {
  try {
    await ensureUser(req.params.id);
    const { name, age, city, annual_income, is_homeowner, income_reported, onboarding_completed } = req.body;

    const result = await supabase
      .from('user_profile')
      .update({
        name,
        age,
        city,
        annual_income,
        is_homeowner,
        income_reported,
        onboarding_completed,
        updated_at: new Date().toISOString(),
      })
      .eq('client_id', req.params.id)
      .select()
      .single();
    if (result.error) throw result.error;

    res.json(result.data);
  } catch (error) {
    next(error);
  }
});

router.put('/:id/plan', validatePlan, async (req, res, next) => {
  try {
    await ensureUser(req.params.id);
    const { target_amount, monthly_target, current_amount } = req.body;

    const result = await supabase
      .from('savings_plan')
      .update({ target_amount, monthly_target, current_amount, updated_at: new Date().toISOString() })
      .eq('client_id', req.params.id)
      .select()
      .single();
    if (result.error) throw result.error;

    res.json(result.data);
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────
// 납입 기록
// ─────────────────────────────────────────────

// 상품의 적립 방식별로 이번 납입이 규칙에 맞는지 확인한다.
// 규칙 위반이면 사용자에게 보여줄 메시지를 반환하고, 문제가 없으면 null을 반환한다.
async function checkContributionRule(clientId, enrolled, amount, contributedAt) {
  const { contribution_type: contributionType, monthly_amount: monthlyAmount } = enrolled;

  // 정액적립식: 약정한 금액과 정확히 같아야 한다
  if (contributionType === 'fixed' && Number(monthlyAmount) > 0 && amount !== Number(monthlyAmount)) {
    return `정액적립식 약정액은 ${Number(monthlyAmount).toLocaleString()}원입니다`;
  }

  // 체증식: 회차가 올라갈 때마다 약정액에 증액분이 더해진다
  if (contributionType === 'step_up' && Number(monthlyAmount) > 0) {
    const counted = await supabase
      .from('savings_contribution')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('product_name', enrolled.product_name);
    if (counted.error) throw counted.error;

    const expected =
      Number(monthlyAmount) + Number(enrolled.installment_step_amount || 0) * Number(counted.count || 0);
    if (amount !== expected) {
      return `이번 회차 납입 예정액은 ${expected.toLocaleString()}원입니다`;
    }
  }

  // 자유적립식: 같은 달 납입 합계가 상품 월 한도를 넘으면 안 된다
  if (contributionType === 'flexible' && enrolled.max_amount) {
    const month = contributedAt.slice(0, 7);
    const existing = await supabase
      .from('savings_contribution')
      .select('amount')
      .eq('client_id', clientId)
      .eq('product_name', enrolled.product_name)
      .gte('contributed_at', `${month}-01`)
      .lte('contributed_at', `${month}-31`);
    if (existing.error) throw existing.error;

    const total = existing.data.reduce((sum, row) => sum + Number(row.amount), 0) + amount;
    if (total > Number(enrolled.max_amount)) {
      return `이번 달 상품 한도 ${Number(enrolled.max_amount).toLocaleString()}원을 초과합니다`;
    }
  }

  return null;
}

router.post('/:id/contributions', validateNewContribution, async (req, res, next) => {
  try {
    await ensureUser(req.params.id);
    const { amount, product_name: productName } = req.body;
    const contributedAt = req.body.contributed_at || new Date().toISOString().slice(0, 10);

    const enrolled = await supabase
      .from('user_enrolled_product')
      .select('*')
      .eq('client_id', req.params.id)
      .eq('product_name', productName)
      .maybeSingle();
    if (enrolled.error) throw enrolled.error;
    if (!enrolled.data) {
      return res.status(400).json({ error: '가입한 적금 상품만 납입할 수 있습니다' });
    }

    const ruleViolation = await checkContributionRule(req.params.id, enrolled.data, amount, contributedAt);
    if (ruleViolation) return res.status(400).json({ error: ruleViolation });

    const inserted = await supabase
      .from('savings_contribution')
      .insert({ client_id: req.params.id, product_name: productName, amount, contributed_at: contributedAt })
      .select()
      .single();
    if (inserted.error) throw inserted.error;

    // 플랜의 누적 저축액에 반영 (동시 요청에도 값이 밀리지 않도록 DB 함수로 원자적 증가)
    const incremented = await supabase.rpc('increment_plan_amount', {
      p_client_id: req.params.id,
      p_amount: amount,
    });
    if (incremented.error) throw incremented.error;

    res.status(201).json(inserted.data);
  } catch (error) {
    next(error);
  }
});

router.put('/:id/contributions/:contributionId', validateContributionUpdate, async (req, res, next) => {
  try {
    const { amount } = req.body;

    const previous = await supabase
      .from('savings_contribution')
      .select('*')
      .eq('id', req.params.contributionId)
      .eq('client_id', req.params.id)
      .single();
    if (previous.error) throw previous.error;

    const updated = await supabase
      .from('savings_contribution')
      .update({
        product_name: req.body.product_name || previous.data.product_name,
        amount,
        contributed_at: req.body.contributed_at || previous.data.contributed_at,
      })
      .eq('id', req.params.contributionId)
      .eq('client_id', req.params.id)
      .select()
      .single();
    if (updated.error) throw updated.error;

    // 누적 저축액에는 변경분(신규 - 기존)만 반영한다
    const incremented = await supabase.rpc('increment_plan_amount', {
      p_client_id: req.params.id,
      p_amount: amount - Number(previous.data.amount),
    });
    if (incremented.error) throw incremented.error;

    res.json(updated.data);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/contributions/:contributionId', async (req, res, next) => {
  try {
    const previous = await supabase
      .from('savings_contribution')
      .select('*')
      .eq('id', req.params.contributionId)
      .eq('client_id', req.params.id)
      .single();
    if (previous.error) throw previous.error;

    const deleted = await supabase
      .from('savings_contribution')
      .delete()
      .eq('id', req.params.contributionId)
      .eq('client_id', req.params.id);
    if (deleted.error) throw deleted.error;

    const incremented = await supabase.rpc('increment_plan_amount', {
      p_client_id: req.params.id,
      p_amount: -Number(previous.data.amount),
    });
    if (incremented.error) throw incremented.error;

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────
// 가입 상품
// ─────────────────────────────────────────────
router.post('/:id/enrolled-products', validateNewEnrolledProduct, async (req, res, next) => {
  try {
    await ensureUser(req.params.id);
    const {
      product_id,
      product_name,
      bank,
      status,
      applied_at,
      started_at,
      matures_at,
      interest_rate,
      monthly_amount,
      opening_balance,
      contribution_type,
      payment_frequency,
      min_amount,
      max_amount,
      installment_step_amount,
    } = req.body;

    // 약정 납입액이 상품의 최소/최대 납입액 범위 안에 있는지 확인
    if (min_amount !== null && monthly_amount !== null && monthly_amount < min_amount) {
      return res.status(400).json({ error: `최소 납입액은 ${min_amount.toLocaleString()}원입니다` });
    }
    if (max_amount !== null && monthly_amount !== null && monthly_amount > max_amount) {
      return res.status(400).json({ error: `최대 납입액은 ${max_amount.toLocaleString()}원입니다` });
    }

    const today = new Date().toISOString().slice(0, 10);
    const result = await supabase
      .from('user_enrolled_product')
      .upsert(
        {
          client_id: req.params.id,
          product_id,
          product_name,
          bank,
          status,
          applied_at: applied_at || today,
          started_at: started_at || applied_at || today,
          matures_at: matures_at || null,
          interest_rate: interest_rate ?? null,
          monthly_amount,
          opening_balance,
          contribution_type,
          payment_frequency,
          min_amount,
          max_amount,
          installment_step_amount: installment_step_amount ?? null,
        },
        { onConflict: 'client_id,product_id' },
      )
      .select()
      .single();
    if (result.error) throw result.error;

    res.status(201).json(result.data);
  } catch (error) {
    next(error);
  }
});

router.put('/:id/enrolled-products/:productId', validateEnrolledProductUpdate, async (req, res, next) => {
  try {
    const { started_at, status, ended_at, termination_reason, termination_payout } = req.body;

    // 요청에 담겨 온 필드만 수정한다
    const values = {};
    if (started_at) values.started_at = started_at;
    if (status) values.status = status;
    if (ended_at) values.ended_at = ended_at;
    if (termination_reason !== undefined) values.termination_reason = termination_reason;
    if (termination_payout !== undefined) values.termination_payout = termination_payout;

    const result = await supabase
      .from('user_enrolled_product')
      .update(values)
      .eq('client_id', req.params.id)
      .eq('product_id', req.params.productId)
      .select()
      .single();
    if (result.error) throw result.error;

    res.json(result.data);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/enrolled-products/:productId', async (req, res, next) => {
  try {
    const result = await supabase
      .from('user_enrolled_product')
      .delete()
      .eq('client_id', req.params.id)
      .eq('product_id', req.params.productId);
    if (result.error) throw result.error;

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────
// 관심 상품
// ─────────────────────────────────────────────
router.put('/:id/saved/:productId', validateSavedToggle, async (req, res, next) => {
  try {
    await ensureUser(req.params.id);
    const { saved } = req.body;

    const result = await (saved
      ? supabase.from('saved_product').upsert({ client_id: req.params.id, product_id: req.params.productId })
      : supabase
          .from('saved_product')
          .delete()
          .eq('client_id', req.params.id)
          .eq('product_id', req.params.productId));
    if (result.error) throw result.error;

    res.json({ saved });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
