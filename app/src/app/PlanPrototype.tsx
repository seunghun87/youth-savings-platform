import { useMemo, useState } from "react";
import {
  ArrowLeft, BriefcaseBusiness, Check, ChevronRight, Home,
  Landmark, MapPin, PiggyBank, Plus, Search, Sparkles, Target, Trash2, UserRound, X,
} from "lucide-react";
import {
  addEnrolledProduct,
  fetchRecommendations,
  updateSavingsPlan,
  updateUserProfile,
  type UserSavingsState,
} from "./lib/api";
import "./plan-prototype.css";

const steps = ["기본 정보", "재무 상황", "생활 정보", "목표 설정"];
const regions = [
  "서울특별시 강남구", "서울특별시 강서구", "서울특별시 마포구", "서울특별시 중구",
  "부산광역시 강서구", "부산광역시 해운대구", "부산광역시 중구",
  "대구광역시 달서구", "대구광역시 수성구", "인천광역시 남동구", "인천광역시 연수구",
  "광주광역시 광산구", "광주광역시 북구", "대전광역시 유성구", "대전광역시 서구",
  "울산광역시 남구", "울산광역시 울주군", "세종특별자치시",
  "경기도 고양시", "경기도 성남시", "경기도 수원시", "경기도 용인시",
  "강원특별자치도 강릉시", "강원특별자치도 춘천시", "충청북도 청주시",
  "충청남도 천안시", "전북특별자치도 전주시", "전라남도 순천시",
  "경상북도 포항시", "경상남도 창원시", "제주특별자치도 제주시",
];

type ChoiceProps = {
  selected: boolean;
  icon: React.ReactNode;
  title: string;
  description?: string;
  onClick: () => void;
};

type SavingProduct = {
  id: number;
  productId?: string;
  name: string;
  interestRate: string;
  startedAt: string;
  maturesAt: string;
  monthlyAmount: string;
};

const emptySavingProduct = (id: number): SavingProduct => ({
  id, name: "", interestRate: "", startedAt: "", maturesAt: "", monthlyAmount: "",
});

function Choice({ selected, icon, title, description, onClick }: ChoiceProps) {
  return (
    <button className={`pp-choice ${selected ? "selected" : ""}`} onClick={onClick}>
      <i>{icon}</i>
      <span><strong>{title}</strong>{description && <small>{description}</small>}</span>
      <b>{selected && <Check size={13} />}</b>
    </button>
  );
}

export default function PlanPrototype({ clientId, initialState, onSaved }: {
  clientId?: string;
  initialState?: UserSavingsState | null;
  onSaved?: () => Promise<void> | void;
} = {}) {
  const [step, setStep] = useState(0);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState(initialState?.profile.name ?? "");
  const [age, setAge] = useState(initialState?.profile.age ?? 26);
  const [city, setCity] = useState(initialState?.profile.city ?? "");
  const [regionQuery, setRegionQuery] = useState("");
  const [annualIncome, setAnnualIncome] = useState(String(initialState?.profile.annual_income ?? 3600));
  const [isHomeowner, setIsHomeowner] = useState(initialState?.profile.is_homeowner ?? false);
  const [incomeReported, setIncomeReported] = useState(initialState?.profile.income_reported ?? true);
  const [asset, setAsset] = useState("예적금 보유");
  const [savingBalance, setSavingBalance] = useState(initialState ? String(Math.round(Number(initialState.plan.current_amount) / 10000)) : "");
  const [savingProducts, setSavingProducts] = useState<SavingProduct[]>(initialState?.enrolled_products.length
    ? initialState.enrolled_products.map((product, index) => ({
        id:index + 1, productId:product.product_id, name:product.product_name,
        interestRate:String(product.interest_rate ?? ""), startedAt:product.started_at ?? "",
        maturesAt:product.matures_at ?? "", monthlyAmount:String(Math.round(Number(product.monthly_amount ?? 0) / 10000) || ""),
      }))
    : [emptySavingProduct(1)]);
  const [job, setJob] = useState("재직 중");
  const [household, setHousehold] = useState("1인 가구");
  const [monthly, setMonthly] = useState(initialState ? Math.round(Number(initialState.plan.monthly_target) / 10000) : 50);
  const [target, setTarget] = useState(initialState ? Math.round(Number(initialState.plan.target_amount) / 10000) : 5000);
  const [interests, setInterests] = useState(["저축", "정부지원"]);

  const currentBalance = asset === "예적금 보유" ? Math.max(0, Number(savingBalance) || 0) : 0;
  const existingMonthly = asset === "예적금 보유"
    ? savingProducts.reduce((sum, product) => sum + Math.max(0, Number(product.monthlyAmount) || 0), 0)
    : 0;
  const totalMonthly = monthly + existingMonthly;
  const months = Math.max(0, Math.ceil((target - currentBalance) / totalMonthly));
  const boostedMonths = Math.max(1, months - 10);
  const period = `${Math.floor(months / 12)}년 ${months % 12}개월`;
  const boostedPeriod = `${Math.floor(boostedMonths / 12)}년 ${boostedMonths % 12}개월`;
  const toggleInterest = (name: string) =>
    setInterests(v => v.includes(name) ? v.filter(x => x !== name) : [...v, name]);
  const updateSavingProduct = (id: number, field: keyof Omit<SavingProduct, "id">, value: string) =>
    setSavingProducts(products => products.map(product => product.id === id ? { ...product, [field]: value } : product));
  const addSavingProduct = () =>
    setSavingProducts(products => [...products, emptySavingProduct(Math.max(...products.map(product => product.id), 0) + 1)]);
  const removeSavingProduct = (id: number) =>
    setSavingProducts(products => products.length === 1 ? [emptySavingProduct(products[0].id)] : products.filter(product => product.id !== id));
  const regionResults = regionQuery.trim()
    ? regions.filter(region => region.replace(/\s/g, "").includes(regionQuery.replace(/\s/g, ""))).slice(0, 6)
    : [];

  const buttonLabel = useMemo(() => {
    if (step === 0) return "재무 정보 입력하기";
    if (step === 1) return "생활 정보 입력하기";
    if (step === 2) return "내 목표 계산하기";
    return "맞춤 플랜 만들기";
  }, [step]);

  const canContinue = useMemo(() => {
    if (step === 0) return name.trim().length > 0 && city.length > 0;
    if (step === 1) {
      const incomeAmount = Number(annualIncome);
      const entered = asset === "예적금 보유" ? savingProducts.filter(product => product.name.trim()) : [];
      return Number.isInteger(incomeAmount) && incomeAmount >= 0 && entered.every(product =>
        Boolean(product.startedAt) && Boolean(product.maturesAt) &&
        Number(product.monthlyAmount) > 0 && Number(product.interestRate) >= 0 &&
        product.startedAt <= product.maturesAt
      );
    }
    if (step === 2) return Boolean(job) && Boolean(household);
    return monthly >= 10 && target > 0 && currentBalance <= target && totalMonthly > 0 && interests.length > 0;
  }, [step, name, city, annualIncome, asset, savingProducts, job, household, monthly, target, currentBalance, totalMonthly, interests]);

  const savePlan = async () => {
    if (!clientId) { setFinished(true); return; }
    const entered = asset === "예적금 보유" ? savingProducts.filter(product => product.name.trim()) : [];
    const incomeAmount = Number(annualIncome);
    if (!name.trim() || !city || !Number.isInteger(incomeAmount) || incomeAmount < 0 || currentBalance > target ||
        entered.some(product => !product.startedAt || !product.maturesAt || Number(product.monthlyAmount) <= 0 || Number(product.interestRate) < 0)) {
      setError("이름, 지역, 금액과 저축 상품 정보를 다시 확인해주세요.");
      return;
    }
    setSaving(true); setError("");
    try {
      await updateSavingsPlan(clientId, {
        target_amount:target * 10000, monthly_target:monthly * 10000, current_amount:currentBalance * 10000,
      });
      await Promise.all(entered.map((product, index) => addEnrolledProduct(clientId, {
        product_id:product.productId ?? `manual-${Date.now()}-${index}`,
        product_name:product.name.trim(), bank:"직접 입력", status:"가입완료",
        applied_at:product.startedAt, started_at:product.startedAt, matures_at:product.maturesAt,
        interest_rate:Number(product.interestRate), monthly_amount:Number(product.monthlyAmount) * 10000,
      })));
      await updateUserProfile(clientId, {
        name:name.trim(), age, city, annual_income:incomeAmount, is_homeowner:isHomeowner, income_reported:incomeReported, onboarding_completed:true,
      });
      await fetchRecommendations({
        monthly_amount:totalMonthly, period_months:Math.max(1, months), age, personal_income:incomeAmount,
        is_homeowner:isHomeowner, income_reported:incomeReported,
      });
      setFinished(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "플랜을 저장하지 못했습니다.");
    } finally { setSaving(false); }
  };

  const openMatchedProducts = async () => {
    if (onSaved) {
      await onSaved();
      return;
    }
    window.location.assign(window.location.pathname);
  };

  if (finished) {
    return (
      <div className="pp-shell pp-result-shell">
        <div className="pp-result">
          <div className="pp-success"><Check size={31} /></div>
          <p>맞춤 플랜이 완성됐어요</p>
          <h1>매달 {monthly}만 원으로<br />{target.toLocaleString()}만 원 만들기</h1>
          <div className="pp-result-card">
            {currentBalance > 0 && <div><span>현재 저축액</span><strong>{currentBalance.toLocaleString()}만 원</strong></div>}
            {savingProducts.some(product => product.name) && <div><span>진행 중 상품</span><strong>{savingProducts.filter(product => product.name).length}개</strong></div>}
            {existingMonthly > 0 && <div><span>기존 월 납입액</span><strong>{existingMonthly.toLocaleString()}만 원</strong></div>}
            <div><span>추가 월 저축</span><strong>{monthly}만 원</strong></div>
            {existingMonthly > 0 && <div><span>총 월 저축</span><strong>{totalMonthly.toLocaleString()}만 원</strong></div>}
            <div><span>목표 금액</span><strong>{target.toLocaleString()}만 원</strong></div>
            <div><span>예상 기간</span><strong>{period}</strong></div>
            <div><span>관심 혜택</span><strong>{interests.join(" · ")}</strong></div>
          </div>
          <div className="pp-saving-tip">
            <Sparkles size={18} />
            <div><strong>추천 상품을 활용하면</strong><span>최대 {boostedPeriod}까지 줄일 수 있어요</span></div>
          </div>
        </div>
        <div className="pp-footer">
          <button className="pp-primary" onClick={openMatchedProducts}>내 맞춤 상품 보기 <ChevronRight size={18} /></button>
          <button className="pp-text" onClick={() => { setFinished(false); setStep(3); }}>플랜 다시 수정하기</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pp-shell">
      <header className="pp-header">
        <div className="pp-head-row">
          <button className="pp-back" aria-label="뒤로" onClick={() => setStep(v => Math.max(0, v - 1))}>
            {step > 0 && <ArrowLeft size={21} />}
          </button>
          <strong>맞춤 플랜 만들기</strong>
          <span>{step + 1}/{steps.length}</span>
        </div>
        <div className="pp-progress"><i style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
      </header>

      <main className="pp-content">
        <p className="pp-step-label">STEP {step + 1} · {steps[step]}</p>

        {step === 0 && <>
          <h1>기본 정보부터<br />간단히 알려주세요</h1>
          <p className="pp-description">거주 지역과 나이에 맞는 혜택을 찾아드릴게요.</p>
          <section className="pp-block">
            <div className="pp-card-label">이름</div>
            <div className="pp-name-input"><UserRound size={18}/><input placeholder="이름을 입력해주세요" value={name} onChange={e=>setName(e.target.value)}/></div>
          </section>
          <section className="pp-card">
            <div className="pp-card-label">현재 나이</div>
            <div className="pp-age">
              <button onClick={() => setAge(v => Math.max(19, v - 1))}>−</button>
              <strong>{age}<small>세</small></strong>
              <button onClick={() => setAge(v => Math.min(39, v + 1))}>＋</button>
            </div>
          </section>
          <section className="pp-block">
            <div className="pp-card-label">거주 지역</div>
            {city ? (
              <div className="pp-region-selected">
                <i><MapPin size={19}/></i>
                <div><span>선택한 지역</span><strong>{city}</strong></div>
                <button aria-label="지역 변경" onClick={() => setCity("")}><X size={17}/></button>
              </div>
            ) : (
              <div className="pp-region-search">
                <label>
                  <Search size={18}/>
                  <input
                    autoComplete="off"
                    placeholder="시·군·구를 검색해주세요"
                    value={regionQuery}
                    onChange={e => setRegionQuery(e.target.value)}
                  />
                  {regionQuery && <button aria-label="검색어 지우기" onClick={() => setRegionQuery("")}><X size={15}/></button>}
                </label>
                <small>예: 서울 강남구, 대전 유성구</small>
                {regionQuery && (
                  <div className="pp-region-results">
                    {regionResults.length ? regionResults.map(region => (
                      <button key={region} onClick={() => { setCity(region); setRegionQuery(""); }}>
                        <MapPin size={16}/><span>{region}</span><ChevronRight size={16}/>
                      </button>
                    )) : <p>검색 결과가 없어요. 지역명을 다시 확인해주세요.</p>}
                  </div>
                )}
              </div>
            )}
          </section>
        </>}

        {step === 1 && <>
          <h1>정확하지 않아도<br />괜찮아요</h1>
          <p className="pp-description">대략적인 수준만 알아도 충분히 추천할 수 있어요.</p>
          <section className="pp-block">
            <div className="pp-card-label">직전년도 개인 연소득</div>
            <div className="pp-income-amount"><input type="number" min="0" inputMode="numeric" value={annualIncome} onChange={e=>setAnnualIncome(e.target.value)} /><b>만 원</b></div>
            <p className="pp-field-help">소득확인증명서의 개인 연소득을 입력해주세요.</p>
            <Choice selected={incomeReported} icon={<Check size={20}/>} title="직전년도 신고소득이 있어요" description="근로·사업·기타소득 신고 내역이 있어요" onClick={()=>setIncomeReported(v=>!v)} />
          </section>
          <section className="pp-block">
            <div className="pp-card-label">현재 자산 상태</div>
            <Choice selected={asset === "예적금 보유"} icon={<PiggyBank size={21}/>} title="예금·적금이 있어요" description="현재 모아둔 자금이 있어요" onClick={() => setAsset("예적금 보유")} />
            <Choice selected={asset === "처음 시작"} icon={<Sparkles size={21}/>} title="이제 시작하려고 해요" description="첫 저축 계획을 만들고 싶어요" onClick={() => setAsset("처음 시작")} />
            {asset === "예적금 보유" && (
              <div className="pp-existing-saving">
                <div className="pp-existing-head">
                  <PiggyBank size={18}/>
                  <div>
                    <strong>현재 저축 현황을 알려주세요</strong>
                    <span>총 저축액과 진행 중인 상품을 플랜에 반영할게요.</span>
                  </div>
                </div>
                <label>
                  <span>현재 총 얼마를 모았나요?</span>
                  <div className="pp-money-input">
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="예: 1,200"
                      value={savingBalance}
                      onChange={e => setSavingBalance(e.target.value)}
                    />
                    <b>만 원</b>
                  </div>
                </label>
                <div className="pp-products-head">
                  <div><strong>현재 들고 있는 저축 상품</strong><span>상품이 여러 개라면 추가할 수 있어요.</span></div>
                  <em>{savingProducts.length}개</em>
                </div>
                <div className="pp-saving-products">
                  {savingProducts.map((product, index) => (
                    <div className="pp-saving-product" key={product.id}>
                      <div className="pp-product-title">
                        <strong>저축 상품 {index + 1}</strong>
                        <button aria-label="상품 삭제" onClick={() => removeSavingProduct(product.id)}><Trash2 size={15}/></button>
                      </div>
                      <label>
                        <span>저축 상품명</span>
                        <input placeholder="예: 청년도약계좌" value={product.name} onChange={e => updateSavingProduct(product.id, "name", e.target.value)}/>
                      </label>
                      <div className="pp-existing-grid">
                        <label>
                          <span>금리</span>
                          <div className="pp-money-input">
                            <input type="number" inputMode="decimal" placeholder="예: 4.5" value={product.interestRate} onChange={e => updateSavingProduct(product.id, "interestRate", e.target.value)}/>
                            <b>%</b>
                          </div>
                        </label>
                        <label>
                          <span>매달 납입액</span>
                          <div className="pp-money-input">
                            <input type="number" inputMode="numeric" placeholder="예: 30" value={product.monthlyAmount} onChange={e => updateSavingProduct(product.id, "monthlyAmount", e.target.value)}/>
                            <b>만 원</b>
                          </div>
                        </label>
                        <label>
                          <span>시작일</span>
                          <input type="date" value={product.startedAt} onChange={e => updateSavingProduct(product.id, "startedAt", e.target.value)}/>
                        </label>
                        <label>
                          <span>만기일</span>
                          <input type="date" value={product.maturesAt} onChange={e => updateSavingProduct(product.id, "maturesAt", e.target.value)}/>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="pp-add-product" onClick={addSavingProduct}><Plus size={17}/> 저축 상품 추가</button>
              </div>
            )}
          </section>
        </>}

        {step === 2 && <>
          <h1>현재 생활과 가장<br />가까운 항목을 골라주세요</h1>
          <p className="pp-description">가입 조건을 확인하는 데만 사용돼요.</p>
          <section className="pp-block">
            <div className="pp-card-label">고용 상태</div>
            <div className="pp-two-grid">
              {["재직 중", "구직 중", "학생", "프리랜서"].map(x =>
                <button className={job === x ? "selected" : ""} onClick={() => setJob(x)} key={x}><BriefcaseBusiness size={18}/>{x}</button>
              )}
            </div>
          </section>
          <section className="pp-block">
            <div className="pp-card-label">가구 형태</div>
            <Choice selected={household === "1인 가구"} icon={<Home size={21}/>} title="1인 가구" description="혼자 거주하고 있어요" onClick={() => setHousehold("1인 가구")} />
            <Choice selected={household === "가족과 함께"} icon={<UserRound size={21}/>} title="가족과 함께" description="부모님, 배우자 또는 자녀와 살아요" onClick={() => setHousehold("가족과 함께")} />
          </section>
          <section className="pp-block">
            <div className="pp-card-label">주택 보유 여부</div>
            <Choice selected={!isHomeowner} icon={<Home size={21}/>} title="무주택이에요" description="본인 명의 주택을 보유하지 않았어요" onClick={() => setIsHomeowner(false)} />
            <Choice selected={isHomeowner} icon={<Home size={21}/>} title="주택을 보유하고 있어요" onClick={() => setIsHomeowner(true)} />
          </section>
        </>}

        {step === 3 && <>
          <h1>목표를 정하면<br />기간을 계산해드려요</h1>
          <p className="pp-description">금액을 움직여 나에게 맞는 계획을 만들어보세요.</p>
          <section className="pp-goal-card">
            <div className="pp-goal-head"><span>앞으로 추가로 저축할 금액</span><strong>{monthly}만 원</strong></div>
            <input type="range" min="10" max="100" step="5" value={monthly} onChange={e => setMonthly(Number(e.target.value))} />
            <div className="pp-range-label"><span>10만 원</span><span>100만 원</span></div>
            {existingMonthly > 0 && <div className="pp-total-monthly">기존 적금 포함 월 저축액 <strong>{totalMonthly.toLocaleString()}만 원</strong></div>}
          </section>
          <section className="pp-block">
            <div className="pp-card-label">목표 선택</div>
            <div className="pp-targets">
              {[["비상금", 1000], ["전세 자금", 3000], ["종잣돈", 5000]].map(([label, value]) =>
                <button className={target === value ? "selected" : ""} onClick={() => setTarget(value as number)} key={label as string}>
                  <span>{label}</span><strong>{Number(value).toLocaleString()}만 원</strong>
                </button>
              )}
            </div>
          </section>
          <section className="pp-estimate">
            <div><Target size={20}/><span>예상 달성 기간</span></div>
            <strong>{period}</strong>
            {(currentBalance > 0 || existingMonthly > 0) && <p className="pp-balance-note">현재 {currentBalance.toLocaleString()}만 원과 기존 월 납입 {existingMonthly.toLocaleString()}만 원을 반영했어요.</p>}
            <p>추천 상품 적용 시 <b>{boostedPeriod}</b>까지 단축 가능</p>
          </section>
          <section className="pp-block pp-interest">
            <div className="pp-card-label">관심 혜택</div>
            <div>
              {[["저축", <PiggyBank size={17}/>], ["정부지원", <Landmark size={17}/>], ["지역혜택", <MapPin size={17}/>]].map(([x, icon]) =>
                <button className={interests.includes(x as string) ? "selected" : ""} onClick={() => toggleInterest(x as string)} key={x as string}>{icon}{x}</button>
              )}
            </div>
          </section>
        </>}
      </main>

      {error && <div className="pp-error">{error}</div>}
      <footer className="pp-footer">
        <button className="pp-primary" disabled={saving || !canContinue} onClick={() => step < 3 ? setStep(v => v + 1) : savePlan()}>
          {saving ? "플랜 저장 중" : buttonLabel} {!saving && <ChevronRight size={18}/>}
        </button>
      </footer>
    </div>
  );
}
