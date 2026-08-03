import { Capacitor } from "@capacitor/core";
import { supabase } from "./supabase";

// Android 에뮬레이터에서 10.0.2.2는 호스트 PC(localhost)를 가리키는 특수 주소.
// 실제 기기/운영 배포 시에는 배포된 백엔드 도메인(HTTPS)으로 교체해야 한다.
// Render Blueprint는 서비스 주소를 스킴 없이 호스트명만 넘겨준다(예: foo.onrender.com).
// 사람이 주소를 붙여넣을 때도 스킴을 빠뜨리는 경우가 잦아, 없으면 https를 붙인다.
const withScheme = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

const configuredApiBase = import.meta.env.VITE_API_BASE_URL?.trim();
const API_BASE_URL = (
  (configuredApiBase && withScheme(configuredApiBase)) ||
  (Capacitor.getPlatform() === "android"
    ? "http://10.0.2.2:3000"
    : import.meta.env.DEV
      ? `${window.location.protocol}//${window.location.hostname}:3000`
      : window.location.origin)
).replace(/\/+$/, "");

const LOCAL_STATE_KEY = "moa-savings-state";
const localStateKey = (clientId:string) => `${LOCAL_STATE_KEY}:${clientId}`;

export class AuthExpiredError extends Error {
  constructor() {
    super("로그인 세션이 만료됐어요. 다시 로그인해주세요.");
    this.name = "AuthExpiredError";
  }
}

async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  if (data.session?.access_token) {
    headers.set("Authorization", `Bearer ${data.session.access_token}`);
  }
  const res = await fetch(input, { ...init, headers });

  // 401/403을 로컬 폴백으로 흡수하면 사용자에게는 "예전 데이터가 그대로 보이는" 상태가 된다.
  // 세션을 정리해 AuthGate가 로그인 화면을 다시 띄우도록 하고, 호출부에는 명시적으로 알린다.
  if (res.status === 401 || res.status === 403) {
    await supabase.auth.signOut().catch(() => undefined);
    throw new AuthExpiredError();
  }
  return res;
}

function createLocalState(clientId:string): UserSavingsState {
  return {
    profile:{client_id:clientId,name:"",age:26,city:"",annual_income:0,is_homeowner:false,income_reported:true,onboarding_completed:false},
    plan:{client_id:clientId,target_amount:50000000,monthly_target:500000,current_amount:0},
    contributions:[],saved_product_ids:[],enrolled_products:[],
  };
}

function readLocalState(clientId:string): UserSavingsState {
  try {
    const saved=window.localStorage.getItem(localStateKey(clientId));
    if(saved) return JSON.parse(saved) as UserSavingsState;
  } catch { /* 손상된 로컬 데이터는 초기 상태로 복구 */ }
  return createLocalState(clientId);
}

function writeLocalState(state:UserSavingsState) {
  window.localStorage.setItem(localStateKey(state.profile.client_id),JSON.stringify(state));
}

export interface RecommendRequest {
  monthly_amount: number;
  period_months: number;
  age: number;
  personal_income: number;
  income_bracket?: number | null;
  is_homeowner?: boolean;
  income_reported?: boolean;
}

export interface RecommendResult {
  id: string;
  name: string;
  bank: string;
  product_type: "정책" | "시중";
  base_rate: number;
  expected_amount: number;
  principal: number;
  aftertax_interest: number;
  government_contribution: number;
  calculation_period_months: number;
  rank: number;
  notice: string | null;
  eligibility_status: "eligible";
  eligibility_score: number;
  checks: Array<{
    key: "age" | "period" | "income" | "monthly" | "housing" | "income_reported";
    label: string;
    met: boolean;
  }>;
  recommendation_reasons: string[];
  data_source: "manual" | "finlife";
}

export interface DbSavingsProduct {
  id: string;
  name: string;
  bank: string;
  product_type: "정책" | "시중";
  rate: number;
  min_age: number;
  max_age: number;
  min_period: number;
  max_period: number;
  income_limit: number | null;
  monthly_limit: number | null;
  min_monthly_amount: number | null;
  contribution_type: "fixed" | "flexible" | "step_up";
  payment_frequency: "monthly" | "weekly" | "daily";
  installment_step_amount: number | null;
  source: "manual" | "finlife";
  /** 청년 개인이 가입할 수 있는지에 대한 백엔드 판정 결과 */
  youth_joinable: boolean;
  /** 가입제한 1=제한없음 2=서민전용 3=일부제한. 정책 상품은 null */
  join_deny: number | null;
  /** 가입대상 원문 (예: "반려동물을 등록한 개인") */
  join_member: string | null;
  /** 우대조건·기타 유의사항 */
  special_note: string | null;
}

export interface UserSavingsState {
  profile: { client_id:string; name:string; age:number; city:string; annual_income:number; is_homeowner:boolean; income_reported:boolean; onboarding_completed:boolean };
  plan: { client_id:string; target_amount:number; monthly_target:number; current_amount:number };
  contributions: Array<{ id:string; product_name:string; amount:number; contributed_at:string }>;
  saved_product_ids: string[];
  enrolled_products: Array<{id:string;product_id:string;product_name:string;bank:string;status:"신청중"|"신청완료"|"가입완료"|"만기완료"|"중도해지";applied_at:string;started_at:string|null;matures_at:string|null;ended_at:string|null;termination_reason:string|null;termination_payout:number|null;interest_rate:number|null;monthly_amount:number|null;opening_balance:number;contribution_type:"fixed"|"flexible"|"step_up";payment_frequency:"monthly"|"weekly"|"daily";min_amount:number|null;max_amount:number|null;installment_step_amount:number|null}>;
}

export async function fetchUserSavingsState(clientId:string): Promise<UserSavingsState|null> {
  try {
    const res = await authFetch(`${API_BASE_URL}/api/user-state/${clientId}`);
    return res.ok ? await res.json() : readLocalState(clientId);
  } catch (e) {
    // 세션 만료는 로컬 데이터로 가리지 않고 그대로 올린다 (AuthGate가 로그인 화면으로 되돌림)
    if (e instanceof AuthExpiredError) throw e;
    // 그 외(백엔드 미기동, 오프라인 등)는 기존대로 로컬 상태로 폴백
    return readLocalState(clientId);
  }
}

export async function addSavingsContribution(clientId:string, productName:string, amount:number, contributedAt?:string) {
  try { const res=await authFetch(`${API_BASE_URL}/api/user-state/${clientId}/contributions`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({product_name:productName,amount,contributed_at:contributedAt})});if(!res.ok){const body=await res.json().catch(()=>null);throw new Error(body?.error||"납입 기록 저장에 실패했습니다");}return res.json(); }
  catch(e){if(!(e instanceof TypeError))throw e;const state=readLocalState(clientId);if(!state.enrolled_products.some(x=>x.product_name===productName))throw new Error("가입한 적금 상품만 납입할 수 있습니다");const row={id:`local-contribution-${Date.now()}`,product_name:productName,amount,contributed_at:contributedAt||new Date().toISOString().slice(0,10)};state.contributions=[row,...state.contributions];state.plan.current_amount+=amount;writeLocalState(state);return row;}
}

export async function updateSavingsContribution(clientId:string, contributionId:string, data:{product_name:string;amount:number;contributed_at:string}) {
  try {const res=await authFetch(`${API_BASE_URL}/api/user-state/${clientId}/contributions/${contributionId}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});if(!res.ok)throw new Error("납입 기록 수정에 실패했습니다");return res.json();}
  catch(e){if(!(e instanceof TypeError))throw e;const state=readLocalState(clientId),index=state.contributions.findIndex(x=>x.id===contributionId);if(index<0)throw new Error("납입 기록을 찾을 수 없습니다");const old=state.contributions[index];state.contributions[index]={...old,...data};state.plan.current_amount=Math.max(0,state.plan.current_amount+data.amount-old.amount);writeLocalState(state);return state.contributions[index];}
}

export async function deleteSavingsContribution(clientId:string, contributionId:string) {
  try {const res=await authFetch(`${API_BASE_URL}/api/user-state/${clientId}/contributions/${contributionId}`,{method:"DELETE"});if(!res.ok)throw new Error("납입 기록 삭제에 실패했습니다");}
  catch(e){if(!(e instanceof TypeError))throw e;const state=readLocalState(clientId),old=state.contributions.find(x=>x.id===contributionId);if(!old)throw new Error("납입 기록을 찾을 수 없습니다");state.contributions=state.contributions.filter(x=>x.id!==contributionId);state.plan.current_amount=Math.max(0,state.plan.current_amount-old.amount);writeLocalState(state);}
}

export async function addEnrolledProduct(clientId:string, product:{product_id:string;product_name:string;bank:string;status:string;applied_at?:string;started_at?:string;matures_at?:string;interest_rate?:number;monthly_amount?:number;opening_balance?:number;contribution_type?:"fixed"|"flexible"|"step_up";payment_frequency?:"monthly"|"weekly"|"daily";min_amount?:number;max_amount?:number;installment_step_amount?:number}) {
  try {
    const res=await authFetch(`${API_BASE_URL}/api/user-state/${clientId}/enrolled-products`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(product)});
    if(!res.ok) { const body=await res.json().catch(()=>null); throw new Error(body?.error||"신청 상품 추가에 실패했습니다"); }
    return res.json();
  } catch(e) {
    if(!(e instanceof TypeError)) throw e;
    const state=readLocalState(clientId),today=new Date().toISOString().slice(0,10);
    const row={id:`local-${Date.now()}`,product_id:product.product_id,product_name:product.product_name,bank:product.bank,status:product.status as UserSavingsState["enrolled_products"][number]["status"],applied_at:product.applied_at||today,started_at:product.started_at||product.applied_at||today,matures_at:product.matures_at||null,ended_at:null,termination_reason:null,termination_payout:null,interest_rate:product.interest_rate??null,monthly_amount:product.monthly_amount??null,opening_balance:product.opening_balance??0,contribution_type:product.contribution_type||"flexible",payment_frequency:product.payment_frequency||"monthly",min_amount:product.min_amount??null,max_amount:product.max_amount??null,installment_step_amount:product.installment_step_amount??null};
    state.enrolled_products=[...state.enrolled_products.filter(x=>x.product_id!==product.product_id),row];writeLocalState(state);return row;
  }
}

export async function updateEnrolledProduct(clientId:string, productId:string, changes:{started_at?:string;status?:string;ended_at?:string;termination_reason?:string;termination_payout?:number}) {
  try {const res=await authFetch(`${API_BASE_URL}/api/user-state/${clientId}/enrolled-products/${encodeURIComponent(productId)}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(changes)});if(!res.ok)throw new Error("적금 정보를 수정하지 못했습니다");return res.json();}
  catch(e){if(!(e instanceof TypeError))throw e;const state=readLocalState(clientId),index=state.enrolled_products.findIndex(x=>x.product_id===productId);if(index<0)throw new Error("적금 정보를 찾을 수 없습니다");state.enrolled_products[index]={...state.enrolled_products[index],...changes,status:(changes.status||state.enrolled_products[index].status) as UserSavingsState["enrolled_products"][number]["status"]};writeLocalState(state);return state.enrolled_products[index];}
}

export async function updateSavingsPlan(clientId:string, plan:{target_amount:number;monthly_target:number;current_amount:number}) {
  try { const res=await authFetch(`${API_BASE_URL}/api/user-state/${clientId}/plan`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(plan)});if(!res.ok)throw new Error("플랜 저장에 실패했습니다");return res.json(); }
  catch(e){if(!(e instanceof TypeError))throw e;const state=readLocalState(clientId);state.plan={...state.plan,...plan};writeLocalState(state);return state.plan;}
}

export async function updateUserProfile(clientId:string, profile:{name:string;age:number;city:string;annual_income:number;is_homeowner:boolean;income_reported:boolean;onboarding_completed:boolean}) {
  try { const res=await authFetch(`${API_BASE_URL}/api/user-state/${clientId}/profile`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(profile)});if(!res.ok)throw new Error("사용자 정보 저장에 실패했습니다");return res.json(); }
  catch(e){if(!(e instanceof TypeError))throw e;const state=readLocalState(clientId);state.profile={...state.profile,...profile};writeLocalState(state);return state.profile;}
}

export async function setSavedProduct(clientId:string, productId:string, saved:boolean) {
  try {const res=await authFetch(`${API_BASE_URL}/api/user-state/${clientId}/saved/${encodeURIComponent(productId)}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({saved})});if(!res.ok)throw new Error("관심 상품 저장에 실패했습니다");return res.json() as Promise<{saved:boolean}>;}
  catch(e){if(!(e instanceof TypeError))throw e;const state=readLocalState(clientId);state.saved_product_ids=saved?Array.from(new Set([...state.saved_product_ids,productId])):state.saved_product_ids.filter(id=>id!==productId);writeLocalState(state);return {saved};}
}

/** 사용자 계정과 연결된 프로필·플랜·납입·저장·가입 데이터를 함께 삭제한다. */
export async function deleteUserAccount(clientId:string) {
  const res = await authFetch(`${API_BASE_URL}/api/user-state/${clientId}/account`, { method:"DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(()=>null);
    throw new Error(body?.error||"회원탈퇴를 처리하지 못했습니다");
  }
  window.localStorage.removeItem(localStateKey(clientId));
}

/**
 * 백엔드(/api/recommend) 호출. 백엔드가 꺼져 있거나 Supabase 키가
 * 아직 설정되지 않은 경우 null을 반환하므로, 호출부는 항상 로컬 목업
 * 데이터로 폴백할 수 있어야 한다.
 */
export async function fetchRecommendations(
  req: RecommendRequest,
): Promise<RecommendResult[] | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** 배분 결과의 상품 한 건. 금액 단위는 만원(monthly_allocation)과 원(expected_amount 등)이 섞여 있다. */
export interface Allocation {
  name: string;
  bank: string;
  base_rate: number;
  /** 이 상품에 넣을 월 납입액 (만원) */
  monthly_allocation: number;
  /** 실제로 적용되는 상품 옵션 기간 (개월) */
  calculation_period_months: number;
  /** 만기 수령액 (원) */
  expected_amount: number;
  principal: number;
  aftertax_interest: number;
}

export interface AllocationResult {
  allocations: Allocation[];
  /** 실제로 배분된 월 저축액 (만원) */
  total_monthly_allocated: number;
  /** 상품 한도를 다 채워도 담지 못한 금액 (만원). 0보다 크면 안내 필요 */
  unallocated_amount: number;
  total_expected_amount: number;
}

/**
 * 백엔드(/api/allocate) 호출. 월 저축액을 금리 높은 상품부터 한도까지 나눠 담는다.
 * 실패 시 null 반환 — 호출부는 이 기능을 숨기고 넘어간다.
 */
export async function fetchAllocation(
  req: { monthly_amount: number; period_months: number; age: number; personal_income: number },
): Promise<AllocationResult | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/allocate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export type PolicyStatus = "충족" | "확인 필요" | "미충족";

/** 온통청년 청년정책. status/reason은 나이·소득을 넘겼을 때만 채워진다. */
export interface YouthPolicy {
  id: string;
  plcy_no: string;
  name: string;
  description: string | null;
  support_content: string | null;
  min_age: number | null;
  max_age: number | null;
  income_min: number | null;
  income_max: number | null;
  income_etc: string | null;
  eligibility_text: string | null;
  exclusion_text: string | null;
  category_large: string | null;
  category_medium: string | null;
  keywords: string | null;
  zip_cd: string | null;
  supervising_org: string | null;
  operating_org: string | null;
  apply_period: string | null;
  apply_url: string | null;
  ref_url: string | null;
  status: PolicyStatus | null;
  reason: string | null;
}

export interface YouthPolicyListResult {
  items: YouthPolicy[];
  total: number;
  eligibleTotal: number;
}

/**
 * 백엔드(/api/youth-policy) 호출. 나이·연소득(만원)을 넘기면 자격 판정과 미충족 사유가
 * 함께 내려오고, 충족 > 확인 필요 > 미충족 순으로 정렬된다.
 * 실패 시 null 반환 — 호출부는 에러 상태로 처리.
 */
export async function fetchYouthPolicies(
  params: { age?: number; income?: number; bracket?: number; keyword?: string; limit?: number; city?: string } = {},
): Promise<YouthPolicyListResult | null> {
  const query = new URLSearchParams();
  if (params.age != null) query.set("age", String(params.age));
  if (params.income != null) query.set("income", String(params.income));
  if (params.bracket != null) query.set("bracket", String(params.bracket));
  if (params.keyword) query.set("keyword", params.keyword);
  if (params.limit != null) query.set("limit", String(params.limit));
  if (params.city) query.set("city", params.city);

  try {
    const res = await fetch(`${API_BASE_URL}/api/youth-policy?${query.toString()}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * 백엔드(/api/products) 호출. 실패 시 null 반환 — 호출부는 로딩/에러 상태로 처리.
 */
export async function fetchSavingsProducts(
  opts: { includeRestricted?: boolean } = {},
): Promise<DbSavingsProduct[] | null> {
  // includeRestricted를 주면 가입 조건이 있는 상품(join_deny 2·3)도 함께 내려온다.
  // 호출부가 join_deny로 나눠 별도 코너에 보여줄 수 있다.
  const query = opts.includeRestricted ? "?include_restricted=true" : "";
  try {
    const res = await fetch(`${API_BASE_URL}/api/products${query}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
