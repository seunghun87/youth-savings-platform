import { Capacitor } from "@capacitor/core";

// Android 에뮬레이터에서 10.0.2.2는 호스트 PC(localhost)를 가리키는 특수 주소.
// 실제 기기/운영 배포 시에는 배포된 백엔드 도메인(HTTPS)으로 교체해야 한다.
const API_BASE_URL =
  Capacitor.getPlatform() === "android"
    ? "http://10.0.2.2:3000"
    : `${window.location.protocol}//${window.location.hostname}:3000`;

const LOCAL_STATE_KEY = "moa-demo-savings-state";

function createLocalState(clientId:string): UserSavingsState {
  return {
    profile:{client_id:clientId,name:"",age:26,city:"",annual_income:0,is_homeowner:false,income_reported:true,onboarding_completed:false},
    plan:{client_id:clientId,target_amount:50000000,monthly_target:500000,current_amount:0},
    contributions:[],saved_product_ids:[],enrolled_products:[],
  };
}

function readLocalState(clientId:string): UserSavingsState {
  try {
    const saved=window.localStorage.getItem(LOCAL_STATE_KEY);
    if(saved) return JSON.parse(saved) as UserSavingsState;
  } catch { /* 손상된 로컬 데이터는 초기 상태로 복구 */ }
  return createLocalState(clientId);
}

function writeLocalState(state:UserSavingsState) {
  window.localStorage.setItem(LOCAL_STATE_KEY,JSON.stringify(state));
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
}

export interface UserSavingsState {
  profile: { client_id:string; name:string; age:number; city:string; annual_income:number; is_homeowner:boolean; income_reported:boolean; onboarding_completed:boolean };
  plan: { client_id:string; target_amount:number; monthly_target:number; current_amount:number };
  contributions: Array<{ id:string; product_name:string; amount:number; contributed_at:string }>;
  saved_product_ids: string[];
  enrolled_products: Array<{id:string;product_id:string;product_name:string;bank:string;status:"신청중"|"신청완료"|"가입완료"|"만기완료"|"중도해지";applied_at:string;started_at:string|null;matures_at:string|null;ended_at:string|null;termination_reason:string|null;termination_payout:number|null;interest_rate:number|null;monthly_amount:number|null;opening_balance:number;contribution_type:"fixed"|"flexible"|"step_up";payment_frequency:"monthly"|"weekly"|"daily";min_amount:number|null;max_amount:number|null;installment_step_amount:number|null}>;
}

export async function fetchUserSavingsState(clientId:string): Promise<UserSavingsState|null> {
  try { const res=await fetch(`${API_BASE_URL}/api/user-state/${clientId}`); return res.ok?await res.json():readLocalState(clientId); } catch { return readLocalState(clientId); }
}

export async function addSavingsContribution(clientId:string, productName:string, amount:number, contributedAt?:string) {
  try { const res=await fetch(`${API_BASE_URL}/api/user-state/${clientId}/contributions`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({product_name:productName,amount,contributed_at:contributedAt})});if(!res.ok){const body=await res.json().catch(()=>null);throw new Error(body?.error||"납입 기록 저장에 실패했습니다");}return res.json(); }
  catch(e){if(!(e instanceof TypeError))throw e;const state=readLocalState(clientId);if(!state.enrolled_products.some(x=>x.product_name===productName))throw new Error("가입한 적금 상품만 납입할 수 있습니다");const row={id:`local-contribution-${Date.now()}`,product_name:productName,amount,contributed_at:contributedAt||new Date().toISOString().slice(0,10)};state.contributions=[row,...state.contributions];state.plan.current_amount+=amount;writeLocalState(state);return row;}
}

export async function updateSavingsContribution(clientId:string, contributionId:string, data:{product_name:string;amount:number;contributed_at:string}) {
  try {const res=await fetch(`${API_BASE_URL}/api/user-state/${clientId}/contributions/${contributionId}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});if(!res.ok)throw new Error("납입 기록 수정에 실패했습니다");return res.json();}
  catch(e){if(!(e instanceof TypeError))throw e;const state=readLocalState(clientId),index=state.contributions.findIndex(x=>x.id===contributionId);if(index<0)throw new Error("납입 기록을 찾을 수 없습니다");const old=state.contributions[index];state.contributions[index]={...old,...data};state.plan.current_amount=Math.max(0,state.plan.current_amount+data.amount-old.amount);writeLocalState(state);return state.contributions[index];}
}

export async function deleteSavingsContribution(clientId:string, contributionId:string) {
  try {const res=await fetch(`${API_BASE_URL}/api/user-state/${clientId}/contributions/${contributionId}`,{method:"DELETE"});if(!res.ok)throw new Error("납입 기록 삭제에 실패했습니다");}
  catch(e){if(!(e instanceof TypeError))throw e;const state=readLocalState(clientId),old=state.contributions.find(x=>x.id===contributionId);if(!old)throw new Error("납입 기록을 찾을 수 없습니다");state.contributions=state.contributions.filter(x=>x.id!==contributionId);state.plan.current_amount=Math.max(0,state.plan.current_amount-old.amount);writeLocalState(state);}
}

export async function addEnrolledProduct(clientId:string, product:{product_id:string;product_name:string;bank:string;status:string;applied_at?:string;started_at?:string;matures_at?:string;interest_rate?:number;monthly_amount?:number;opening_balance?:number;contribution_type?:"fixed"|"flexible"|"step_up";payment_frequency?:"monthly"|"weekly"|"daily";min_amount?:number;max_amount?:number;installment_step_amount?:number}) {
  try {
    const res=await fetch(`${API_BASE_URL}/api/user-state/${clientId}/enrolled-products`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(product)});
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
  try {const res=await fetch(`${API_BASE_URL}/api/user-state/${clientId}/enrolled-products/${encodeURIComponent(productId)}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(changes)});if(!res.ok)throw new Error("적금 정보를 수정하지 못했습니다");return res.json();}
  catch(e){if(!(e instanceof TypeError))throw e;const state=readLocalState(clientId),index=state.enrolled_products.findIndex(x=>x.product_id===productId);if(index<0)throw new Error("적금 정보를 찾을 수 없습니다");state.enrolled_products[index]={...state.enrolled_products[index],...changes,status:(changes.status||state.enrolled_products[index].status) as UserSavingsState["enrolled_products"][number]["status"]};writeLocalState(state);return state.enrolled_products[index];}
}

export async function updateSavingsPlan(clientId:string, plan:{target_amount:number;monthly_target:number;current_amount:number}) {
  try { const res=await fetch(`${API_BASE_URL}/api/user-state/${clientId}/plan`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(plan)});if(!res.ok)throw new Error("플랜 저장에 실패했습니다");return res.json(); }
  catch(e){if(!(e instanceof TypeError))throw e;const state=readLocalState(clientId);state.plan={...state.plan,...plan};writeLocalState(state);return state.plan;}
}

export async function updateUserProfile(clientId:string, profile:{name:string;age:number;city:string;annual_income:number;is_homeowner:boolean;income_reported:boolean;onboarding_completed:boolean}) {
  try { const res=await fetch(`${API_BASE_URL}/api/user-state/${clientId}/profile`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(profile)});if(!res.ok)throw new Error("사용자 정보 저장에 실패했습니다");return res.json(); }
  catch(e){if(!(e instanceof TypeError))throw e;const state=readLocalState(clientId);state.profile={...state.profile,...profile};writeLocalState(state);return state.profile;}
}

export async function setSavedProduct(clientId:string, productId:string, saved:boolean) {
  try {const res=await fetch(`${API_BASE_URL}/api/user-state/${clientId}/saved/${encodeURIComponent(productId)}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({saved})});if(!res.ok)throw new Error("관심 상품 저장에 실패했습니다");return res.json() as Promise<{saved:boolean}>;}
  catch(e){if(!(e instanceof TypeError))throw e;const state=readLocalState(clientId);state.saved_product_ids=saved?Array.from(new Set([...state.saved_product_ids,productId])):state.saved_product_ids.filter(id=>id!==productId);writeLocalState(state);return {saved};}
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

/**
 * 백엔드(/api/products) 호출. 실패 시 null 반환 — 호출부는 로딩/에러 상태로 처리.
 */
export async function fetchSavingsProducts(): Promise<
  DbSavingsProduct[] | null
> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/products`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
