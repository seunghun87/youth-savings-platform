import { useState } from "react";
import { ArrowRight, Check, PiggyBank, Target, UserRound } from "lucide-react";
import {
  fetchRecommendations,
  updateSavingsPlan,
  updateUserProfile,
} from "./lib/api";
import "./savings-onboarding.css";
export default function SavingsOnboarding({
  clientId,
  onComplete,
}: {
  clientId: string;
  onComplete: () => Promise<void> | void;
}) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [v, setV] = useState({
    name: "",
    age: 26,
    city: "서울특별시",
    income: 3600,
    monthly: 700000,
    target: 50000000,
  });
  const set = (k: string, value: string | number) =>
    setV((x) => ({ ...x, [k]: value }));
  const finish = async () => {
    if (!v.name.trim() || v.age < 14 || v.monthly < 10000 || v.target < v.monthly) {
      setError("입력한 금액과 정보를 다시 확인해주세요.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await updateSavingsPlan(clientId, {
        target_amount: v.target,
        monthly_target: v.monthly,
        current_amount: 0,
      });
      await fetchRecommendations({
        monthly_amount: Math.round(v.monthly / 10000),
        period_months: Math.max(1, Math.ceil(v.target / v.monthly)),
        age: v.age,
        personal_income: v.income,
      });
      await updateUserProfile(clientId, {
        name: v.name.trim(),
        age: v.age,
        city: v.city,
        annual_income: v.income,
        onboarding_completed: true,
      });
      await onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 중 문제가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="so-shell">
      <header>
        <b>모아</b>
        <span>{step + 1} / 3</span>
      </header>
      <div className="so-progress">
        <i style={{ width: `${((step + 1) / 3) * 100}%` }} />
      </div>
      <main>
        {step === 0 ? (
          <div className="so-question">
            <i>
              <UserRound />
            </i>
            <p>먼저 알려주세요</p>
            <h1>어떻게 불러드릴까요?</h1>
            <label>
              이름
              <input
                value={v.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="이름을 입력해주세요"
              />
            </label>
            <div className="so-two">
              <label>
                나이
                <input
                  type="number"
                  value={v.age}
                  onChange={(e) => set("age", Number(e.target.value))}
                />
              </label>
              <label>
                거주 지역
                <select
                  value={v.city}
                  onChange={(e) => set("city", e.target.value)}
                >
                  <option>서울특별시</option>
                  <option>경기도</option>
                  <option>인천광역시</option>
                  <option>부산광역시</option>
                  <option>기타</option>
                </select>
              </label>
            </div>
          </div>
        ) : step === 1 ? (
          <div className="so-question">
            <i>
              <PiggyBank />
            </i>
            <p>상품 추천에 사용해요</p>
            <h1>
              현재 저축 여력을
              <br />
              알려주세요
            </h1>
            <label>
              연소득<small>만원</small>
              <input
                type="number"
                value={v.income}
                onChange={(e) => set("income", Number(e.target.value))}
              />
            </label>
            <label>
              매월 저축 가능한 금액<small>원</small>
              <input
                type="number"
                value={v.monthly}
                onChange={(e) => set("monthly", Number(e.target.value))}
              />
            </label>
            <div className="so-presets">
              {[300000,500000,700000,1000000].map(n=><button key={n} className={v.monthly===n?"selected":""} onClick={()=>set("monthly",n)}>{n/10000}만 원</button>)}
            </div>
          </div>
        ) : (
          <div className="so-question">
            <i>
              <Target />
            </i>
            <p>마지막 단계예요</p>
            <h1>얼마를 모으고 싶나요?</h1>
            <label>
              목표 금액<small>원</small>
              <input
                type="number"
                value={v.target}
                onChange={(e) => set("target", Number(e.target.value))}
              />
            </label>
            <div className="so-presets so-targets">
              {[10000000,30000000,50000000,100000000].map(n=><button key={n} className={v.target===n?"selected":""} onClick={()=>set("target",n)}>{n/10000000}천만</button>)}
            </div>
            <div className="so-preview">
              <span>예상 목표 기간</span>
              <strong>{Math.ceil(v.target / v.monthly / 12)}년</strong>
              <p>
                월 {(v.monthly / 10000).toLocaleString()}만 원을 기준으로
                계산했어요.
              </p>
            </div>
          </div>
        )}
      </main>
      {error && <div className="so-error" role="alert">{error}</div>}
      <footer>
        {step > 0 && (
          <button className="back" onClick={() => setStep((x) => x - 1)}>
            이전
          </button>
        )}
        <button
          className="next"
          disabled={saving || (step === 0 && !v.name.trim())}
          onClick={() => (step < 2 ? setStep((x) => x + 1) : finish())}
        >
          {saving ? (
            "플랜 만드는 중"
          ) : step === 2 ? (
            <>
              내 플랜 만들기 <Check size={18} />
            </>
          ) : (
            <>
              다음 <ArrowRight size={18} />
            </>
          )}
        </button>
      </footer>
    </div>
  );
}
