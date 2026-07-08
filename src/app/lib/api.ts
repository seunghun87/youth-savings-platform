import { Capacitor } from "@capacitor/core";

// Android 에뮬레이터에서 10.0.2.2는 호스트 PC(localhost)를 가리키는 특수 주소.
// 실제 기기/운영 배포 시에는 배포된 백엔드 도메인(HTTPS)으로 교체해야 한다.
const API_BASE_URL =
  Capacitor.getPlatform() === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000";

export interface RecommendRequest {
  monthly_amount: number;
  period_months: number;
  age: number;
  personal_income: number;
  income_bracket?: number | null;
}

export interface RecommendResult {
  name: string;
  bank: string;
  base_rate: number;
  expected_amount: number;
  rank: number;
  notice: string | null;
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
  source: "manual" | "finlife";
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
export async function fetchSavingsProducts(): Promise<DbSavingsProduct[] | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/products`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
