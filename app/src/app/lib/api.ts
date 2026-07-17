import { Capacitor } from "@capacitor/core";

// Android 에뮬레이터에서 10.0.2.2는 호스트 PC(localhost)를 가리키는 특수 주소.
// 실제 기기/운영 배포 시에는 배포된 백엔드 도메인(HTTPS)으로 교체해야 한다.
const API_BASE_URL =
  Capacitor.getPlatform() === "android"
    ? "http://10.0.2.2:3000"
    : `${window.location.protocol}//${window.location.hostname}:3000`;

export interface RecommendRequest {
  monthly_amount: number;
  period_months: number;
  age: number;
  personal_income: number;
  income_bracket?: number | null;
}

export interface RecommendResult {
  id: string;
  name: string;
  bank: string;
  product_type: "정책" | "시중";
  base_rate: number;
  expected_amount: number;
  rank: number;
  notice: string | null;
  eligibility_status: "eligible";
  eligibility_score: number;
  checks: Array<{
    key: "age" | "period" | "income" | "monthly";
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
  profile: { client_id:string; name:string; age:number; city:string; annual_income:number; onboarding_completed:boolean };
  plan: { client_id:string; target_amount:number; monthly_target:number; current_amount:number };
  contributions: Array<{ id:string; product_name:string; amount:number; contributed_at:string }>;
  saved_product_ids: string[];
  enrolled_products: Array<{id:string;product_id:string;product_name:string;bank:string;status:"신청중"|"신청완료"|"가입완료"|"만기완료"|"중도해지";applied_at:string;started_at:string|null;matures_at:string|null;ended_at:string|null;termination_reason:string|null;termination_payout:number|null;interest_rate:number|null;monthly_amount:number|null;opening_balance:number;contribution_type:"fixed"|"flexible"|"step_up";payment_frequency:"monthly"|"weekly"|"daily";min_amount:number|null;max_amount:number|null;installment_step_amount:number|null}>;
}

export async function fetchUserSavingsState(clientId:string): Promise<UserSavingsState|null> {
  try { const res=await fetch(`${API_BASE_URL}/api/user-state/${clientId}`); return res.ok?await res.json():null; } catch { return null; }
}

export async function addSavingsContribution(clientId:string, productName:string, amount:number, contributedAt?:string) {
  const res=await fetch(`${API_BASE_URL}/api/user-state/${clientId}/contributions`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({product_name:productName,amount,contributed_at:contributedAt})});
  if(!res.ok) { const body=await res.json().catch(()=>null); throw new Error(body?.error||"납입 기록 저장에 실패했습니다"); } return res.json();
}

export async function updateSavingsContribution(clientId:string, contributionId:string, data:{product_name:string;amount:number;contributed_at:string}) {
  const res=await fetch(`${API_BASE_URL}/api/user-state/${clientId}/contributions/${contributionId}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
  if(!res.ok) throw new Error("납입 기록 수정에 실패했습니다");
  return res.json();
}

export async function deleteSavingsContribution(clientId:string, contributionId:string) {
  const res=await fetch(`${API_BASE_URL}/api/user-state/${clientId}/contributions/${contributionId}`,{method:"DELETE"});
  if(!res.ok) throw new Error("납입 기록 삭제에 실패했습니다");
}

export async function addEnrolledProduct(clientId:string, product:{product_id:string;product_name:string;bank:string;status:string;applied_at?:string;started_at?:string;matures_at?:string;interest_rate?:number;monthly_amount?:number;opening_balance?:number;contribution_type?:"fixed"|"flexible"|"step_up";payment_frequency?:"monthly"|"weekly"|"daily";min_amount?:number;max_amount?:number;installment_step_amount?:number}) {
  const res=await fetch(`${API_BASE_URL}/api/user-state/${clientId}/enrolled-products`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(product)});
  if(!res.ok) { const body=await res.json().catch(()=>null); throw new Error(body?.error||"신청 상품 추가에 실패했습니다"); }
  return res.json();
}

export async function updateEnrolledProduct(clientId:string, productId:string, changes:{started_at?:string;status?:string;ended_at?:string;termination_reason?:string;termination_payout?:number}) {
  const res=await fetch(`${API_BASE_URL}/api/user-state/${clientId}/enrolled-products/${encodeURIComponent(productId)}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(changes)});
  if(!res.ok) throw new Error("적금 정보를 수정하지 못했습니다");
  return res.json();
}

export async function updateSavingsPlan(clientId:string, plan:{target_amount:number;monthly_target:number;current_amount:number}) {
  const res=await fetch(`${API_BASE_URL}/api/user-state/${clientId}/plan`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(plan)});
  if(!res.ok) throw new Error("플랜 저장에 실패했습니다"); return res.json();
}

export async function updateUserProfile(clientId:string, profile:{name:string;age:number;city:string;annual_income:number;onboarding_completed:boolean}) {
  const res=await fetch(`${API_BASE_URL}/api/user-state/${clientId}/profile`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(profile)});
  if(!res.ok) throw new Error("사용자 정보 저장에 실패했습니다"); return res.json();
}

export async function setSavedProduct(clientId:string, productId:string, saved:boolean) {
  const res=await fetch(`${API_BASE_URL}/api/user-state/${clientId}/saved/${encodeURIComponent(productId)}`,{
    method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({saved}),
  });
  if(!res.ok) throw new Error("관심 상품 저장에 실패했습니다");
  return res.json() as Promise<{saved:boolean}>;
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
