import { useEffect, useState } from "react";
import {
  Bell,
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronRight,
  Compass,
  FileText,
  Gift,
  Home,
  Landmark,
  LogOut,
  MapPin,
  PiggyBank,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  TrendingUp,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import "./savings-prototype.css";
import "./savings-prototype-v2.css";
import "./savings-filters.css";
import "./savings-ux.css";
import {
  addSavingsContribution,
  addEnrolledProduct,
  deleteSavingsContribution,
  deleteUserAccount,
  fetchRecommendations,
  fetchAllocation,
  fetchSavingsProducts,
  fetchUserSavingsState,
  fetchYouthPolicies,
  setSavedProduct,
  updateSavingsPlan,
  updateSavingsContribution,
  updateEnrolledProduct,
  updateUserProfile,
  type AllocationResult,
  type RecommendResult,
  type UserSavingsState,
  type YouthPolicy,
} from "./lib/api";
import PlanPrototype from "./PlanPrototype";
import SavingsPlanV2Prototype from "./SavingsPlanV2Prototype";

type Tab = "home" | "find" | "plan" | "benefits" | "my";
type ProductView = {
  id:string;
  name:string;
  org:string;
  amount:string;
  desc:string;
  fit:string;
  tag:string;
  type:"정책"|"시중";
  rate:number;
  minPeriod:number;
  maxPeriod:number;
  contributionType:"fixed"|"flexible"|"step_up";
  paymentFrequency:"monthly"|"weekly"|"daily";
  minMonthly:number;
  maxMonthly:number|null;
  installmentStep:number|null;
  minAge?:number;
  maxAge?:number;
  incomeLimit?:number|null;
  /** 청년 개인이 가입할 수 없는 상품일 때 그 조건(가입대상 원문). 가입 가능하면 null */
  restriction?:string|null;
  source?:"manual"|"finlife";
  recommendation?: RecommendResult;
};
const products:ProductView[] = [
  {
    name: "청년도약계좌",
    org: "서민금융진흥원",
    amount: "4,980만 원",
    desc: "정부기여금 약 144만 원 포함",
    fit: "내 조건 4개 모두 충족",
    tag: "가장 잘 맞아요",
    id:"sample-policy", type:"정책", rate:6, minPeriod:60, maxPeriod:60, contributionType:"flexible", paymentFrequency:"monthly", minMonthly:10000, maxMonthly:700000, installmentStep:null,
  },
  {
    name: "KB 청년 주택드림 청약",
    org: "KB국민은행",
    amount: "1,326만 원",
    desc: "월 20만 원 · 5년 예상",
    fit: "주거 준비에 적합",
    tag: "목표 맞춤",
    id:"sample-housing", type:"정책", rate:3.3, minPeriod:24, maxPeriod:600, contributionType:"flexible", paymentFrequency:"monthly", minMonthly:20000, maxMonthly:500000, installmentStep:null,
  },
  {
    name: "카카오뱅크 자유적금",
    org: "카카오뱅크",
    amount: "743만 원",
    desc: "월 20만 원 · 3년 예상",
    fit: "자유로운 추가 납입",
    tag: "유연한 저축",
    id:"sample-bank", type:"시중", rate:4.2, minPeriod:12, maxPeriod:36, contributionType:"fixed", paymentFrequency:"monthly", minMonthly:10000, maxMonthly:1000000, installmentStep:null,
  },
];
const contributionLabel={fixed:"정액적립식",flexible:"자유적립식",step_up:"증액적립식"} as const;
const frequencyLabel={monthly:"월",weekly:"주",daily:"일"} as const;
const segmentColors=["#72d99b","#ffd27a","#87b8ff","#d9a7ff","#ff9f91"];
const monthsUntil=(date:string|null)=>{if(!date)return 12;const end=new Date(date),now=new Date();return Math.max(0,(end.getFullYear()-now.getFullYear())*12+end.getMonth()-now.getMonth())};
const expectedInterest=(monthly:number,months:number,annualRate:number)=>Math.max(0,Math.floor(monthly*(annualRate/100/12)*(months*(months+1)/2)*(1-.154)));

function Header({ eyebrow, title, onNotifications }: { eyebrow: string; title: string; onNotifications:()=>void }) {
  return (
    <header className="sp-head">
      <div>
        <p>{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      <button onClick={onNotifications} aria-label="알림 보기">
        <Bell size={20} />
        <i />
      </button>
    </header>
  );
}

function HomePage({state,onRecord,onQuickPay,onNotifications,onShowAll,onProduct,onBenefits}:{state:UserSavingsState|null;onRecord:()=>void;onQuickPay:(product:UserSavingsState["enrolled_products"][number])=>void;onNotifications:()=>void;onShowAll:()=>void;onProduct:(p:ProductView)=>void;onBenefits:()=>void}) {
  const existingMonthly=(state?.enrolled_products??[]).reduce((sum,product)=>sum+Number(product.monthly_amount??0),0);
  const current=Number(state?.plan.current_amount??0), target=Number(state?.plan.target_amount??50000000), monthly=Number(state?.plan.monthly_target??700000)+existingMonthly;
  const pct=Math.min(100,Math.round(current/target*100));
  const monthTotal=(state?.contributions??[]).filter(x=>x.contributed_at.slice(0,7)===new Date().toISOString().slice(0,7)).reduce((s,x)=>s+Number(x.amount),0);
  const now=new Date();
  const monthLabel=new Intl.DateTimeFormat("ko-KR",{month:"long"}).format(now);
  const previousMonth=new Date(now.getFullYear(),now.getMonth()-1,1).toISOString().slice(0,7);
  const previousMonthTotal=(state?.contributions??[]).filter(x=>x.contributed_at.slice(0,7)===previousMonth).reduce((s,x)=>s+Number(x.amount),0);
  const remaining=Math.max(0,target-current);
  const monthsToGoal=monthly>0?Math.ceil(remaining/monthly):null;
  const goalDate=monthsToGoal===null?null:new Date(now.getFullYear(),now.getMonth()+monthsToGoal,1);
  const goalDateLabel=goalDate?`${goalDate.getFullYear()}. ${goalDate.getMonth()+1}`:"계산 전";
  const paceDiff=monthTotal-previousMonthTotal;
  return (
    <>
      <section className="sp-balance sp-balance-card">
        <div className="sp-balance-top">
          <p>내 저축 자산</p>
          <button aria-label="알림" onClick={onNotifications}>
            <Bell size={19} />
            <i />
          </button>
        </div>
        <strong>
          {current.toLocaleString()}<small>원</small>
        </strong>
        <div className="sp-growth">
          <TrendingUp size={14} />
          <span>납입 기록이 실시간으로 자산에 반영돼요</span>
        </div>
        <div className="sp-goal-label">
          <span>{(target/10000).toLocaleString()}만 원 목표</span>
          <b>{pct}%</b>
        </div>
        <div className="sp-line">
          <i style={{width:`${pct}%`}} />
        </div>
        <div className="sp-balance-meta">
          <span>
            남은 금액 <b>{(Math.max(0,target-current)/10000).toLocaleString()}만 원</b>
          </span>
          <span>
            예상 달성 <b>{goalDateLabel}</b>
          </span>
        </div>
        <div className="sp-orbit sp-orbit-one" />
        <div className="sp-orbit sp-orbit-two" />
      </section>
      <section className="sp-section">
        <div className="sp-title">
          <h2>{monthLabel} 적금</h2>
          <span>{Math.round(monthTotal/10000)}만 원 / {Math.round(monthly/10000)}만 원</span>
        </div>
        <article className="sp-payment">
          {(state?.enrolled_products??[]).map((product)=>{
            const paid=(state?.contributions??[]).filter(x=>x.product_name===product.product_name&&x.contributed_at.slice(0,7)===new Date().toISOString().slice(0,7)).reduce((sum,x)=>sum+Number(x.amount),0);
            return <div className="sp-pay-row" key={product.id}><i className={paid>0?"done":""}>{paid>0?"✓":"·"}</i><div><b>{product.product_name}</b><span>{paid>0?"이번 달 납입 완료":`${Number(product.monthly_amount??0).toLocaleString()}원 예정`}</span></div><button className={paid>0?"sp-quick-paid":"sp-quick-pay"} disabled={paid>0} onClick={()=>onQuickPay(product)}>{paid>0?"완료 ✓":"납입 완료"}</button></div>;
          })}
          {!state?.enrolled_products?.length&&<div className="sp-empty-payment"><b>아직 추가한 적금이 없어요</b><span>적금 찾기에서 신청한 상품을 추가해주세요.</span></div>}
          <button onClick={onRecord}>납입 기록 추가하기</button>
        </article>
      </section>
      <section className="sp-insight" aria-live="polite">
        <TrendingUp size={19} />
        <div>
          <b>{monthTotal===0?"이번 달 첫 납입을 기록해보세요":paceDiff>=0?"이번 달 저축 페이스가 좋아요":"목표는 언제든 다시 조정할 수 있어요"}</b>
          <p>{monthTotal===0?`월 목표 ${Math.round(monthly/10000).toLocaleString()}만 원을 향한 진행 상황을 정확히 보여드릴게요.`:paceDiff===0?"지난달과 같은 금액을 모으고 있어요.":`지난달보다 ${Math.round(Math.abs(paceDiff)/10000).toLocaleString()}만 원 ${paceDiff>0?"더":"적게"} 모았어요.`}</p>
        </div>
      </section>
      <section className="sp-section">
        <div className="sp-title">
          <h2>플랜을 더 좋게 만드는 적금</h2>
          <button onClick={onShowAll}>전체보기</button>
        </div>
        <Product p={products[0]} onOpen={onProduct} />
      </section>
      <button className="sp-side sp-side-button" onClick={onBenefits}>
        <Gift size={19} />
        <div>
          <span>저축 여유를 만드는 추가 혜택</span>
          <b>청년월세 지원 · 월 최대 20만 원</b>
        </div>
        <ChevronRight size={18} />
      </button>
    </>
  );
}
function Product({ p, onOpen, saved=false, onSave }: { p: ProductView; onOpen:(p:ProductView)=>void; saved?:boolean; onSave?:(p:ProductView)=>void }) {
  const reason = p.recommendation?.recommendation_reasons.join(" · ");
  return (
    <article className="sp-product" role="button" tabIndex={0} onClick={()=>onOpen(p)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onOpen(p)}}}>
      <span className={`sp-tag ${p.type==="정책"?"policy":"market"}`}>{p.type==="정책"?"정부지원":"시중은행"}</span>
      <small>{p.org}</small>
      <h3>{p.name}</h3>
      <p>{p.amount.startsWith("연 ")?"조건 충족 시 표시 금리":"예상 만기 금액"}</p>
      <strong>{p.amount}</strong>
      <em>{p.desc}</em>
      <div>✓ {reason || p.fit}</div>
      {onSave&&<button className="sp-save" aria-label={saved?"저장 해제":"저장"} onClick={e=>{e.stopPropagation();onSave(p)}}>{saved?<BookmarkCheck size={19}/>:<Bookmark size={19}/>}</button>}
      {p.recommendation && (
        <small>
          자격 조건 {p.recommendation.checks.filter((check) => check.met).length}/
          {p.recommendation.checks.length} 충족 · 세후 예상 수령액{" "}
          {p.recommendation.expected_amount.toLocaleString()}원
          <span className="sp-breakdown">{p.recommendation.calculation_period_months}개월 기준 · 원금 {p.recommendation.principal.toLocaleString()}원 · 세후 이자 {p.recommendation.aftertax_interest.toLocaleString()}원{p.recommendation.government_contribution>0?` · 정부기여금 ${p.recommendation.government_contribution.toLocaleString()}원`:""}</span>
        </small>
      )}
      <ChevronRight className="sp-chevron" size={20} />
    </article>
  );
}
// 월 저축액을 여러 상품에 나눠 담았을 때의 결과. 한 상품의 월 한도를 넘는 금액을
// 다음 상품으로 넘기는 계산이라, 한 상품에 몰아넣는 것보다 이자가 커질 수 있다.
function AllocationCard({state}:{state:UserSavingsState}) {
  const [result,setResult]=useState<AllocationResult|null>(null);
  const [loading,setLoading]=useState(true);
  const [open,setOpen]=useState(false);

  const monthly=Math.round(Number(state.plan.monthly_target)/10000);        // 만원
  const target=Number(state.plan.target_amount);
  const periodMonths=Math.max(1,Math.ceil(target/Math.max(1,Number(state.plan.monthly_target))));

  useEffect(()=>{
    let active=true;
    setLoading(true);
    fetchAllocation({
      monthly_amount:monthly,
      period_months:Math.min(600,periodMonths),
      age:state.profile.age,
      personal_income:Math.max(0,Math.round(Number(state.profile.annual_income))),
    })
      .then(data=>{if(active)setResult(data)})
      .finally(()=>{if(active)setLoading(false)});
    return ()=>{active=false};
  },[monthly,periodMonths,state.profile.age,state.profile.annual_income]);

  // 월 저축액이 없거나 배분할 상품을 못 찾으면 이 카드를 아예 숨긴다
  if(loading||!result||result.allocations.length===0||monthly<=0) return null;

  const totalInterest=result.allocations.reduce((sum,x)=>sum+x.aftertax_interest,0);
  const shown=open?result.allocations:result.allocations.slice(0,2);

  return (
    <section className="sp-split">
      <div className="sp-split-head">
        <div>
          <span>월 {monthly.toLocaleString()}만 원을 나눠 담으면</span>
          <strong>세후 이자 약 {Math.round(totalInterest/10000).toLocaleString()}만 원</strong>
        </div>
        <em>{result.allocations.length}개 상품</em>
      </div>

      <div className="sp-split-bar" aria-label="상품별 배분 비율">
        {result.allocations.map((a,i)=>(
          <i key={a.name}
             style={{width:`${a.monthly_allocation/Math.max(1,result.total_monthly_allocated)*100}%`,
                     background:segmentColors[i%segmentColors.length]}}
             title={`${a.name} ${a.monthly_allocation.toLocaleString()}만 원`} />
        ))}
      </div>

      <ul className="sp-split-list">
        {shown.map((a,i)=>(
          <li key={a.name}>
            <i style={{background:segmentColors[i%segmentColors.length]}} />
            <div>
              <b>{a.name}</b>
              <span>{a.bank} · 연 {a.base_rate.toFixed(2)}% · {a.calculation_period_months}개월</span>
            </div>
            <strong>월 {a.monthly_allocation.toLocaleString()}만 원</strong>
          </li>
        ))}
      </ul>

      {result.allocations.length>2 && (
        <button className="sp-split-more" onClick={()=>setOpen(v=>!v)}>
          {open?"접기":`나머지 ${result.allocations.length-2}개 더 보기`}
        </button>
      )}

      {result.unallocated_amount>0 && (
        <p className="sp-split-note">
          상품별 월 한도를 다 채워도 <b>{result.unallocated_amount.toLocaleString()}만 원</b>이 남아요.
          예금이나 다른 상품을 함께 알아보세요.
        </p>
      )}
      <p className="sp-split-caption">
        가입 가능한 상품만 대상으로, 금리가 높은 순서로 월 한도까지 채워 계산했어요.
        우대금리는 반영되지 않은 참고용 수치예요.
      </p>
    </section>
  );
}

function FindPage({
  items,
  loading,
  savedIds,
  state,
  restricted,
  onProduct,
  onSave,
  onNotifications,
}: {
  items: ProductView[];
  restricted: ProductView[];
  loading: boolean;
  savedIds:string[];
  state:UserSavingsState;
  onProduct:(p:ProductView)=>void;
  onSave:(p:ProductView)=>void;
  onNotifications:()=>void;
}) {
  const [q, setQ] = useState("");
  const [showRestricted,setShowRestricted]=useState(false);
  const [eligibleOnly,setEligibleOnly]=useState(false);
  const [mode,setMode]=useState<"all"|"policy"|"market"|"high"|"short">("all");
  const normalizedQuery=q.trim().toLocaleLowerCase("ko-KR");
  const meetsProfile=(p:ProductView)=>(p.minAge==null||state.profile.age>=p.minAge)&&(p.maxAge==null||state.profile.age<=p.maxAge)&&(p.incomeLimit==null||state.profile.annual_income<=p.incomeLimit);
  const shown = items.filter((p) => `${p.name} ${p.org}`.toLocaleLowerCase("ko-KR").includes(normalizedQuery)).filter(p=>!eligibleOnly||meetsProfile(p)).filter(p=>mode==="policy"?p.type==="정책":mode==="market"?p.type==="시중":mode==="short"?p.minPeriod<=12:true).sort((a,b)=>mode==="short"?a.minPeriod-b.minPeriod:mode==="high"?b.rate-a.rate:0);
  const filters=[{id:"all",label:"전체"},{id:"policy",label:"정부지원"},{id:"market",label:"시중은행"},{id:"high",label:"높은 금리순"},{id:"short",label:"단기 저축"}] as const;
  return (
    <>
      <Header eyebrow="목표에 맞는 상품만 골랐어요" title="적금 찾기" onNotifications={onNotifications} />
      <label className="sp-search">
        <Search size={18} />
        <input
          type="search"
          aria-label="적금 상품 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="적금 상품을 검색해보세요"
        />
      </label>
      <button
        type="button"
        className={`sp-eligible-toggle ${eligibleOnly?"on":""}`}
        aria-pressed={eligibleOnly}
        onClick={()=>setEligibleOnly(value=>!value)}
      >
        <ShieldCheck size={18}/>
        <span><b>자격 충족 상품만 보기</b><small>내 나이와 소득 조건에 맞는 적금만 표시</small></span>
        <i>{eligibleOnly?"ON":"OFF"}</i>
      </button>
      <div className="sp-chips sp-eligibility-filter">
        {filters.map(f=><button key={f.id} className={mode===f.id?"on":""} onClick={()=>setMode(f.id)}>{f.label}</button>)}
      </div>
      <AllocationCard state={state} />
      <aside className="sp-product-disclosure">
        <ShieldCheck size={17}/>
        <p><b>상품 성격을 구분해 확인하세요</b><span>정부지원 상품은 정책 운영기관 정보를, 시중은행 상품은 금융감독원 공시 정보를 바탕으로 표시합니다. 현재 유료 광고·제휴 상품은 없습니다.</span></p>
      </aside>
      <div className="sp-title sp-result">
        <div>
          <h2>{loading ? "상품을 불러오는 중" : `적금 ${shown.length}개`}</h2>
          <span>{mode==="policy"?"정부 정책 적금만 표시하고 있어요":mode==="market"?"시중은행 적금만 표시하고 있어요":mode==="high"?"최고 금리가 높은 순서예요":mode==="short"?"12개월 이내 가입 상품이에요":"추천 순서로 모든 상품을 보여드려요"}</span>
        </div>
      </div>
      <div className="sp-list">
        {loading&&[0,1,2].map(x=><div className="sp-product-skeleton" key={x} aria-hidden="true"><i/><b/><span/><span/></div>)}
        {!loading&&shown.map((p) => (
          <Product key={p.id} p={p} onOpen={onProduct} saved={savedIds.includes(p.id)} onSave={onSave} />
        ))}
        {!loading&&shown.length===0&&<div className="sp-empty-results"><Search size={24}/><b>조건에 맞는 적금이 없어요</b><span>검색어를 줄이거나 다른 필터를 선택해보세요.</span><button onClick={()=>{setQ("");setMode("all")}}>검색 초기화</button></div>}
      </div>

      {/* 자녀·반려동물 등 별도 조건이 붙어 추천 대상에서 뺀 상품들. 조건과 함께 소개만 한다 */}
      {!loading && restricted.length > 0 && (
        <section className="sp-other">
          <button className="sp-other-head" onClick={()=>setShowRestricted(v=>!v)} aria-expanded={showRestricted}>
            <div>
              <b>그 외의 적금 {restricted.length}개</b>
              <span>가입 조건이 따로 있어 추천에서 제외했어요</span>
            </div>
            <ChevronRight size={18} className={showRestricted?"open":""} />
          </button>
          {showRestricted && (
            <ul className="sp-other-list">
              {restricted.map(p=>(
                <li key={p.id}>
                  <div>
                    <b>{p.name}</b>
                    <span>{p.org} · {p.amount}</span>
                  </div>
                  <p>{p.restriction}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
function PlanPage({state,onGoalEdit,onAllocationEdit,onNotifications,onFind,onTerminate}:{state:UserSavingsState;onGoalEdit:()=>void;onAllocationEdit:()=>void;onNotifications:()=>void;onFind:()=>void;onTerminate:(product:UserSavingsState["enrolled_products"][number])=>void}) {
  const activeProducts=state.enrolled_products.filter(product=>!['중도해지','만기완료'].includes(product.status));
  const existingMonthly=activeProducts.reduce((sum,product)=>sum+Number(product.monthly_amount??0),0);
  const monthly=Math.round((Number(state.plan.monthly_target)+existingMonthly)/10000);
  const [simulated,setSimulated]=useState(Math.min(120,Math.max(30,monthly)));
  const remaining=Math.max(0,Number(state.plan.target_amount)-Number(state.plan.current_amount));
  const months=Math.ceil(remaining/Math.max(1,simulated*10000));
  const progress=Math.min(100,Math.round(Number(state.plan.current_amount)/Math.max(1,Number(state.plan.target_amount))*100));
  const currentMonth=new Date().toISOString().slice(0,7);
  const allocations=state.enrolled_products.map((product)=>{
    const paid=state.contributions
      .filter(x=>x.product_name===product.product_name&&x.contributed_at.slice(0,7)===currentMonth)
      .reduce((sum,x)=>sum+Number(x.amount),0);
    const total=state.contributions.filter(x=>x.product_name===product.product_name).reduce((sum,x)=>sum+Number(x.amount),0);
    return {...product,paid,total};
  });
  const monthPaid=allocations.reduce((sum,x)=>sum+x.paid,0);
  const monthsSince=(date:string|null)=>{
    if(!date)return 0;
    const start=new Date(date),now=new Date();
    return Math.max(1,(now.getFullYear()-start.getFullYear())*12+now.getMonth()-start.getMonth()+1);
  };
  const projectedInterest=activeProducts.reduce((sum,p)=>sum+expectedInterest(Number(p.monthly_amount??0),monthsUntil(p.matures_at),Number(p.interest_rate??0)),0);
  const interestBoost=Number(state.plan.current_amount)>0?projectedInterest/Number(state.plan.current_amount)*100:0;
  return (
    <>
      <Header eyebrow="목표까지 가장 안정적인 경로" title="내 플랜" onNotifications={onNotifications} />
      <section className="sp-planhero">
        <button className="sp-planhero-edit" onClick={onGoalEdit}>편집</button>
        <span>{Math.round(Number(state.plan.target_amount)/10000).toLocaleString()}만 원 만들기</span>
        <strong>{Math.floor(months/12)}년 {months%12}개월</strong>
        <p>현재 입력한 저축액을 기준으로 계산했어요</p>
        <div className="sp-segmented-progress" aria-label={`목표 달성률 ${progress}%`}>
          {allocations.filter(x=>x.total>0).map((product,index)=><i key={product.id} title={`${product.product_name} ${Math.round(product.total/10000).toLocaleString()}만 원`} style={{width:`${Math.min(100,product.total/Math.max(1,Number(state.plan.target_amount))*100)}%`,background:segmentColors[index%segmentColors.length]}} />)}
          <i className="base" style={{width:`${Math.max(0,Math.min(100,(Number(state.plan.current_amount)-allocations.reduce((sum,x)=>sum+x.total,0))/Math.max(1,Number(state.plan.target_amount))*100))}%`}} />
        </div>
        <small>{Math.round(Number(state.plan.current_amount)/10000).toLocaleString()}만 원 모음 · {Math.round(remaining/10000).toLocaleString()}만 원 남음 · {progress}%</small>
      </section>
      {!!allocations.some(x=>x.total>0)&&<section className="sp-contribution-share"><div className="sp-title"><h2>적금별 목표 기여도</h2><span>누적 원금 기준</span></div>{allocations.filter(x=>x.total>0).map((product,index)=><div key={product.id}><i style={{background:segmentColors[index%segmentColors.length]}}/><span>{product.product_name}{product.status==='중도해지'&&<em>중도해지</em>}</span><b>{(product.total/Math.max(1,Number(state.plan.target_amount))*100).toFixed(1)}%</b><strong>{Math.round(product.total/10000).toLocaleString()}만 원</strong></div>)}</section>}
      <section className="sp-interest-impact"><div><span>현재 플랜 예상 세후 이자</span><strong>+{Math.round(projectedInterest/10000).toLocaleString()}만 원</strong></div><div><span>원금 대비 상승률</span><strong>+{interestBoost.toFixed(1)}%</strong></div><p>현재 금리와 남은 납입기간을 기준으로 한 단순 예상치이며 실제 중도해지 이율·우대조건에 따라 달라질 수 있어요.</p></section>
      {(monthly>0||allocations.length>0)&&<section className="sp-section">
        <div className="sp-title">
          <h2>월 {monthly.toLocaleString()}만 원 배분</h2>
          <button onClick={onAllocationEdit}>기록 수정</button>
        </div>
        <div className="sp-allocation">
          {allocations.map(product=><div key={product.id} className={product.status==='중도해지'?"ended":""}>
            <i style={{width:`${Math.min(100,product.paid/Math.max(1,Number(state.plan.monthly_target))*100)}%`}} />
            <span>{product.started_at?`${product.started_at.slice(0,7).replace("-",".")} 시작 · ${monthsSince(product.started_at)}개월차`:product.status}</span>
            <b>{product.product_name}</b>
            <strong>{product.status==='중도해지'?"해지됨":product.paid?`${Math.round(product.paid/10000).toLocaleString()}만 원`:"미납입"}</strong>
            {!['중도해지','만기완료'].includes(product.status)&&<button className="sp-impact-button" onClick={()=>onTerminate(product)}>중도해지 영향</button>}
          </div>)}
          {!allocations.length&&<div className="sp-plan-empty"><span>가입 상품 없음</span><b>신청한 적금을 플랜에 연결해보세요</b><button onClick={onFind}>적금 찾기</button></div>}
        </div>
        {!!allocations.length&&<p className="sp-plan-month-total">이번 달 총 납입 <b>{Math.round(monthPaid/10000).toLocaleString()}만 원</b> / 목표 {monthly.toLocaleString()}만 원</p>}
      </section>}
      <section className="sp-simulator">
        <div>
          <SlidersHorizontal size={19} />
          <h2>플랜 시뮬레이터</h2>
        </div>
        <p>월 저축액을 조절하면</p>
        <strong>약 {Math.floor(months/12)}년 {months%12}개월 뒤 목표를 달성해요</strong>
        <input type="range" min="30" max="120" value={simulated} onChange={e=>setSimulated(Number(e.target.value))} />
        <div>
          <span>30만 원</span>
          <b>월 {simulated}만 원</b>
          <span>120만 원</span>
        </div>
      </section>
    </>
  );
}
// 온통청년 정책 대분류별 아이콘. 분류가 없거나 새 분류가 생기면 Gift로 떨어진다.
const POLICY_ICONS: Record<string, typeof Landmark> = {
  "주거": Landmark,
  "일자리": WalletCards,
  "교육": WalletCards,
  "복지문화": Gift,
  "참여권리": Gift,
};

function BenefitsPage({profile,onNotifications,onOpen}:{profile:UserSavingsState["profile"];onNotifications:()=>void;onOpen:(policy:YouthPolicy)=>void}) {
  const [category,setCategory]=useState("전체");
  const [eligibleOnly,setEligibleOnly]=useState(false);
  const [policies,setPolicies]=useState<YouthPolicy[]|null>(null);
  const [eligibleTotal,setEligibleTotal]=useState(0);
  const [loading,setLoading]=useState(true);
  const [failed,setFailed]=useState(false);

  // 나이·연소득(만원)·거주지역을 넘기면 백엔드가 자격 판정과 지역 매칭까지 함께 처리해 내려준다
  useEffect(()=>{
    let active=true;
    setLoading(true);setFailed(false);
    fetchYouthPolicies({age:profile.age,income:profile.annual_income,city:profile.city,limit:50})
      .then(data=>{if(!active)return;if(data){setPolicies(data.items);setEligibleTotal(data.eligibleTotal);}else setFailed(true)})
      .finally(()=>{if(active)setLoading(false)});
    return ()=>{active=false};
  },[profile.age,profile.annual_income,profile.city]);

  // category_large는 "일자리, 교육"처럼 여러 분류가 콤마로 같이 올 수 있어(백엔드에서 중복은
  // 이미 제거됨), 탭 목록·필터 모두 콤마로 나눈 개별 분류 단위로 판단해 두 분류 모두에
  // 속하는 정책이 양쪽 탭에서 다 보이게 한다.
  const policyCategories=(p:YouthPolicy)=>p.category_large?p.category_large.split(", "):[];
  const categories=["전체",...Array.from(new Set((policies??[]).flatMap(policyCategories)))];
  const shown=(policies??[]).filter(p=>(category==="전체"||policyCategories(p).includes(category))&&(!eligibleOnly||p.status==="충족"));

  return (
    <>
      <Header
        eyebrow={loading?"맞춤 혜택을 찾는 중":`만 ${profile.age}세 · 연소득 ${profile.annual_income.toLocaleString()}만원 기준`}
        title="추가 혜택"
        onNotifications={onNotifications}
      />
      <button
        type="button"
        className={`sp-eligible-toggle ${eligibleOnly?"on":""}`}
        aria-pressed={eligibleOnly}
        onClick={()=>setEligibleOnly(value=>!value)}
      >
        <ShieldCheck size={18}/>
        <span><b>자격 충족 정책만 보기</b><small>내 나이·소득·거주지역 조건에 맞는 정책만 표시</small></span>
        <i>{eligibleOnly?"ON":"OFF"}</i>
      </button>
      <div className="sp-chips sp-eligibility-filter">
        {categories.map(x=><button key={x} className={category===x?"on":""} onClick={()=>setCategory(x)}>{x}</button>)}
      </div>
      {loading ? (
        <div className="sp-benefits sp-benefits-loading" aria-busy="true" aria-label="청년정책 불러오는 중">
          <article /><article /><article />
        </div>
      ) : failed ? (
        <p className="sp-benefits-empty" role="alert">
          청년정책을 불러오지 못했어요.<br />잠시 후 다시 시도해주세요.
        </p>
      ) : shown.length===0 ? (
        <p className="sp-benefits-empty">조건에 맞는 청년정책을 찾지 못했어요.</p>
      ) : (
        <>
          {eligibleTotal>0 && (
            <p className="sp-benefits-summary">거주 지역과 조건에 맞는 정책이 <b>{eligibleTotal}건</b> 있어요.</p>
          )}
          {eligibleOnly&&shown.length===0&&<p className="sp-benefits-empty">현재 조건과 선택한 분류를 모두 충족하는 정책이 없어요.</p>}
          <div className="sp-benefits">
            {shown.map(p=>{
              const Icon=POLICY_ICONS[policyCategories(p)[0]??""]??Gift;
              return (
                <article key={p.id} role="button" tabIndex={0} onClick={()=>onOpen(p)} onKeyDown={e=>e.key==="Enter"&&onOpen(p)}>
                  <i><Icon /></i>
                  <div>
                    <span>{p.category_large??"청년정책"}{p.category_medium?` · ${p.category_medium}`:""}</span>
                    <h3>{p.name}</h3>
                    {p.status && (
                      <em className={`sp-policy-status ${p.status==="충족"?"ok":p.status==="확인 필요"?"maybe":"no"}`}>
                        {p.status}
                      </em>
                    )}
                    {p.support_content && <strong>{p.support_content}</strong>}
                    {/* 미충족이면 사유를, 아니면 정책 설명을 보여준다 */}
                    <p>{p.status==="미충족"&&p.reason?p.reason:(p.description??p.supervising_org??"")}</p>
                  </div>
                  <ChevronRight size={19} />
                </article>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
function MyPage({state,user,onProfile,onMenu,onNotifications,onSignOut,onDeleteAccount}:{state:UserSavingsState;user:User;onProfile:()=>void;onMenu:(title:string)=>void;onNotifications:()=>void;onSignOut:()=>void;onDeleteAccount:()=>void}) {
  const menus = [
    { icon: Bookmark, title: "저장한 적금", desc: `관심 상품 ${state.saved_product_ids.length}개` },
    { icon: FileText, title: "내 가입 조건", desc: "소득·재직 정보 관리" },
    { icon: MapPin, title: "지역 및 개인 정보", desc: `${state.profile.city} · 만 ${state.profile.age}세` },
    { icon: Settings, title: "알림 설정", desc: "납입일·만기·혜택 알림" },
    {
      icon: ShieldCheck,
      title: "데이터 및 개인정보",
      desc: "안전하게 관리되고 있어요",
    },
  ];
  return (
    <>
      <Header eyebrow="나의 저축 설정" title="마이" onNotifications={onNotifications} />
      <section className="sp-profile">
        <div className="sp-avatar">{user.user_metadata.avatar_url ? <img src={user.user_metadata.avatar_url} alt="" style={{width:"100%",height:"100%",borderRadius:"inherit",objectFit:"cover"}} /> : state.profile.name.trim().slice(0,1)||"나"}</div>
        <div>
          <strong>{state.profile.name || user.user_metadata.full_name || "Google 사용자"}</strong>
          <span>{user.email}</span>
        </div>
        <button onClick={onProfile}>프로필 수정</button>
      </section>
      <section className="sp-my-numbers">
        <div>
          <strong>{Math.round(Number(state.plan.current_amount)/10000).toLocaleString()}만 원</strong>
          <span>총 저축 자산</span>
        </div>
        <div>
          <strong>{state.enrolled_products.length}개</strong>
          <span>운용 중인 적금</span>
        </div>
      </section>
      <div className="sp-my-menu">
        {menus.map((x) => (
          <button key={x.title} onClick={()=>onMenu(x.title)}>
            <i>
              <x.icon size={19} />
            </i>
            <div>
              <strong>{x.title}</strong>
              <span>{x.desc}</span>
            </div>
            <ChevronRight size={18} />
          </button>
        ))}
        <button onClick={onSignOut}>
          <i><LogOut size={19} /></i>
          <div><strong>로그아웃</strong><span>현재 Google 계정에서 로그아웃</span></div>
          <ChevronRight size={18} />
        </button>
        <button className="sp-account-delete" onClick={onDeleteAccount}>
          <i><X size={19} /></i>
          <div><strong>회원탈퇴</strong><span>계정과 연결된 모든 자산·목표 정보를 삭제</span></div>
          <ChevronRight size={18} />
        </button>
      </div>
      <p className="sp-version">
        자산 정보는 입력한 납입 기록을 기준으로 계산돼요.
      </p>
    </>
  );
}
function TerminationPreview({state,product,onClose,onConfirm}:{state:UserSavingsState;product:UserSavingsState["enrolled_products"][number];onClose:()=>void;onConfirm:(reason:string,payout:number)=>Promise<void>}){
  const principal=state.contributions.filter(x=>x.product_name===product.product_name).reduce((sum,x)=>sum+Number(x.amount),0);
  const active=state.enrolled_products.filter(x=>!["중도해지","만기완료"].includes(x.status));
  const beforeMonthly=Number(state.plan.monthly_target)+active.reduce((sum,x)=>sum+Number(x.monthly_amount??0),0);
  const afterMonthly=Math.max(0,beforeMonthly-Number(product.monthly_amount??0));
  const remaining=Math.max(0,Number(state.plan.target_amount)-Number(state.plan.current_amount));
  const beforeMonths=Math.ceil(remaining/Math.max(1,beforeMonthly)),afterMonths=afterMonthly?Math.ceil(remaining/afterMonthly):null;
  const lostInterest=expectedInterest(Number(product.monthly_amount??0),monthsUntil(product.matures_at),Number(product.interest_rate??0));
  const totalInterest=active.reduce((sum,x)=>sum+expectedInterest(Number(x.monthly_amount??0),monthsUntil(x.matures_at),Number(x.interest_rate??0)),0);
  const [reason,setReason]=useState("자금이 필요해서"),[payout,setPayout]=useState(String(principal)),[saving,setSaving]=useState(false);
  const submit=async()=>{const amount=Number(payout);if(!Number.isInteger(amount)||amount<0)return;setSaving(true);try{await onConfirm(reason,amount)}finally{setSaving(false)}};
  return <div className="sp-modal-backdrop" onClick={onClose}><section className="sp-modal sp-termination" role="dialog" aria-modal="true" aria-labelledby="termination-title" onClick={e=>e.stopPropagation()}><button className="sp-modal-close" onClick={onClose} aria-label="닫기"><X size={20}/></button><small>해지 전 영향 확인</small><h2 id="termination-title">{product.product_name}</h2><div className="sp-impact-compare"><div><span>목표 예상 기간</span><b>{Math.floor(beforeMonths/12)}년 {beforeMonths%12}개월</b><ChevronRight size={16}/><strong>{afterMonths===null?"계산 불가":`${Math.floor(afterMonths/12)}년 ${afterMonths%12}개월`}</strong><em>{afterMonths===null?"월 저축액을 다시 설정해야 해요":`약 ${Math.max(0,afterMonths-beforeMonths)}개월 늦어져요`}</em></div><div><span>예상 세후 이자</span><b>{Math.round(totalInterest/10000).toLocaleString()}만 원</b><ChevronRight size={16}/><strong>{Math.round((totalInterest-lostInterest)/10000).toLocaleString()}만 원</strong><em>{Math.round(lostInterest/10000).toLocaleString()}만 원 감소 예상</em></div></div><p className="sp-impact-note">지금까지 납입한 원금 {principal.toLocaleString()}원은 목표 기여도에 남고, 앞으로의 납입과 만기 이자만 전망에서 제외돼요.</p><label>실제 중도해지 수령액<input inputMode="numeric" value={payout} onChange={e=>setPayout(e.target.value.replace(/[^0-9]/g,""))}/><span>은행에서 안내받은 세후 수령액으로 수정할 수 있어요.</span></label><label>해지 사유<select value={reason} onChange={e=>setReason(e.target.value)}><option>자금이 필요해서</option><option>금리가 더 좋은 상품으로 이동</option><option>월 납입이 부담돼서</option><option>기타</option></select></label><button className="sp-danger-button" disabled={saving||!payout} onClick={submit}>{saving?"반영 중...":"중도해지로 반영"}</button><button className="sp-modal-secondary" onClick={onClose}>계속 유지하기</button></section></div>
}

export default function SavingsPrototype({user,onSignOut,initialTab="home"}:{user:User;onSignOut:()=>void;initialTab?:Tab}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [items, setItems] = useState(products);
  // 청년이 가입할 수 없는 조건이 붙은 상품. "그 외의 적금" 코너에 따로 소개한다
  const [restrictedItems, setRestrictedItems] = useState<ProductView[]>([]);
  const [loading, setLoading] = useState(true);
  const [recommendations,setRecommendations]=useState<RecommendResult[]>([]);
  const [userState,setUserState]=useState<UserSavingsState|null>(null);
  const [stateLoading,setStateLoading]=useState(true);
  const [selectedProduct,setSelectedProduct]=useState<ProductView|null>(null);
  const [notice,setNotice]=useState<string|null>(null);
  const [contributionOpen,setContributionOpen]=useState(false);
  const [contribution,setContribution]=useState({productName:"",amount:"",date:new Date().toISOString().slice(0,10)});
  const [enrollmentAmount,setEnrollmentAmount]=useState("");
  const [planEditOpen,setPlanEditOpen]=useState(false);
  const [replanning,setReplanning]=useState(false);
  const [planDraft,setPlanDraft]=useState({target:"",monthly:"",current:"",starts:{} as Record<string,string>});
  const [recordsOpen,setRecordsOpen]=useState(false);
  const [terminationProduct,setTerminationProduct]=useState<UserSavingsState["enrolled_products"][number]|null>(null);
  const [recordDrafts,setRecordDrafts]=useState<Record<string,{product_name:string;amount:string;contributed_at:string}>>({});
  const clientId=user.id;
  // 세션 만료(AuthExpiredError)면 api 계층이 이미 로그아웃 처리해 AuthGate가 로그인 화면을 띄운다.
  // 여기서는 unhandled rejection만 막고 로딩 상태를 푼다.
  const reloadState=()=>fetchUserSavingsState(clientId).then(setUserState).catch(()=>undefined).finally(()=>setStateLoading(false));
  useEffect(() => {
    // 가입 조건이 있는 상품까지 한 번에 받아 화면에서 나눈다.
    // 판정은 백엔드가 youth_joinable로 내려주므로 규칙을 여기서 다시 구현하지 않는다.
    fetchSavingsProducts({ includeRestricted: true })
      .then((data) => {
        if (!data?.length) return;
        const all = data.map((p) => ({
          id:p.id,
          name: p.name,
          org: p.bank,
          amount: `연 ${p.rate.toFixed(2)}%`,
          desc: `${p.min_period}~${p.max_period}개월 · 월 한도 ${p.monthly_limit ?? "제한 없음"}${p.monthly_limit ? "만 원" : ""}`,
          fit:
            p.product_type === "정책" ? "청년 정책 적금" : "시중은행 적금",
          tag: p.product_type,
          type:p.product_type,
          rate:p.rate,
          minPeriod:p.min_period,
          maxPeriod:p.max_period,
          contributionType:p.contribution_type||"flexible",
          paymentFrequency:p.payment_frequency||"monthly",
          minMonthly:Number(p.min_monthly_amount??1)*10000,
          maxMonthly:p.monthly_limit==null?null:Number(p.monthly_limit)*10000,
          installmentStep:p.installment_step_amount==null?null:Number(p.installment_step_amount)*10000,
          minAge:p.min_age,
          maxAge:p.max_age,
          incomeLimit:p.income_limit,
          restriction:p.youth_joinable?null:(p.join_member||"별도 가입 조건이 있어요"),
          source:p.source,
        }));
        setItems(all.filter(p=>!p.restriction));
        setRestrictedItems(all.filter(p=>p.restriction));
      })
      .finally(() => setLoading(false));
  }, []);
  useEffect(()=>{reloadState()},[]);
  useEffect(()=>{
    if(!userState)return;
    const existingMonthly=userState.enrolled_products.reduce((sum,product)=>sum+Number(product.monthly_amount??0),0);
    const monthlyTarget=Math.max(1,Number(userState.plan.monthly_target)+existingMonthly);
    const remaining=Math.max(0,Number(userState.plan.target_amount)-Number(userState.plan.current_amount));
    fetchRecommendations({
      monthly_amount:Math.max(1,Math.round(monthlyTarget/10000)),
      period_months:Math.max(1,Math.ceil(remaining/monthlyTarget)),
      age:Number(userState.profile.age),
      personal_income:Math.max(0,Math.round(Number(userState.profile.annual_income))),
      is_homeowner:!!userState.profile.is_homeowner,
      income_reported:!!userState.profile.income_reported,
    }).then((data)=>setRecommendations(data??[]));
  },[userState]);
  const rankedItems = recommendations.length
    ? items
        .map((item) => ({
          ...item,
          recommendation: recommendations.find(
            (rec) => rec.id === item.id || rec.name === item.name,
          ),
        }))
        .sort((a,b)=>(a.recommendation?.rank??999)-(b.recommendation?.rank??999))
    : items;
  useEffect(()=>{if(selectedProduct)setEnrollmentAmount(String(Math.min(selectedProduct.maxMonthly??selectedProduct.minMonthly,Math.max(selectedProduct.minMonthly,200000))))},[selectedProduct]);
  const openContribution=()=>{const first=userState?.enrolled_products?.[0];setContribution({productName:first?.product_name??"",amount:first?.monthly_amount?String(first.monthly_amount):"",date:new Date().toISOString().slice(0,10)});setContributionOpen(true);};
  const recordContribution=async()=>{const amount=Number(contribution.amount.replace(/,/g,""));if(!contribution.productName){setNotice("먼저 적금 찾기에서 신청한 상품을 추가해주세요.");return;}if(!Number.isInteger(amount)||amount<=0){setNotice("올바른 납입 금액을 입력해주세요.");return;}try{await addSavingsContribution(clientId,contribution.productName,amount,contribution.date);await reloadState();setContributionOpen(false);setNotice("납입 기록이 저장되고 총 저축 자산에 반영됐어요.");}catch(e){setNotice(e instanceof Error?e.message:"저장에 실패했습니다");}};
  const quickPay=async(product:UserSavingsState["enrolled_products"][number])=>{if(!userState)return;const productPayments=userState.contributions.filter(x=>x.product_name===product.product_name);const amount=product.contribution_type==="step_up"?Number(product.monthly_amount??0)+Number(product.installment_step_amount??0)*productPayments.length:Number(product.monthly_amount??0);if(!Number.isInteger(amount)||amount<=0){setNotice("약정 납입액이 없어요. 상세 기록에서 금액을 입력해주세요.");openContribution();return;}try{await addSavingsContribution(clientId,product.product_name,amount,new Date().toISOString().slice(0,10));await reloadState();setNotice(`${product.product_name}\n\n이번 달 ${amount.toLocaleString()}원 납입을 기록했어요.`);}catch(e){setNotice(e instanceof Error?e.message:"납입 기록 저장에 실패했습니다");}};
  const enrollProduct=async(p:ProductView)=>{const amount=Number(enrollmentAmount);if(!Number.isInteger(amount)||amount<p.minMonthly||(p.maxMonthly!==null&&amount>p.maxMonthly)){setNotice(`납입액은 ${p.minMonthly.toLocaleString()}원${p.maxMonthly?`~${p.maxMonthly.toLocaleString()}원`:" 이상"}으로 입력해주세요.`);return;}try{await addEnrolledProduct(clientId,{product_id:p.id,product_name:p.name,bank:p.org,status:"가입완료",interest_rate:p.rate,monthly_amount:amount,contribution_type:p.contributionType,payment_frequency:p.paymentFrequency,min_amount:p.minMonthly,max_amount:p.maxMonthly??undefined,installment_step_amount:p.installmentStep??undefined});await reloadState();setSelectedProduct(null);setNotice("가입 조건과 약정 납입액을 플랜에 반영했어요.");}catch(e){setNotice(e instanceof Error?e.message:"상품을 추가하지 못했습니다.");}};
  // 정책 카드를 열면 지원 내용·신청 기간·자격 판정 사유를 정리해 보여준다.
  const openPolicy=(p:YouthPolicy)=>{
    const lines=[p.support_content,p.description].filter(Boolean);
    if(p.apply_period)lines.push(`신청 기간: ${p.apply_period}`);
    if(p.supervising_org)lines.push(`주관: ${p.supervising_org}`);
    if(p.status==="미충족"&&p.reason)lines.push(`자격 확인: ${p.reason}`);
    else if(p.status==="확인 필요")lines.push("자격 확인: 추가 조건이 있어 기관 안내를 확인해주세요.");
    const url=p.apply_url??p.ref_url;
    if(url)lines.push(`신청/안내: ${url}`);
    setNotice(`${p.name}\n\n${lines.join("\n\n")}`);
  };
  const showNotifications=()=>setNotice("새 알림\n\n• 이번 달 저축 목표를 확인해보세요.\n• 관심 적금의 금리 정보가 갱신됐어요.\n• 청년월세 지원 신청 기간을 확인해보세요.");
  const toggleSaved=async(p:ProductView)=>{if(!userState)return;const saved=!userState.saved_product_ids.includes(p.id);try{await setSavedProduct(clientId,p.id,saved);await reloadState();setNotice(saved?"관심 상품에 저장했어요.":"관심 상품에서 삭제했어요.");}catch(e){setNotice(e instanceof Error?e.message:"저장 상태를 변경하지 못했습니다.");}};
  const openPlanEdit=()=>{if(!userState)return;setPlanDraft({target:String(userState.plan.target_amount),monthly:String(userState.plan.monthly_target),current:String(userState.plan.current_amount),starts:Object.fromEntries(userState.enrolled_products.map(x=>[x.product_id,x.started_at?.slice(0,7)??""]))});setPlanEditOpen(true);};
  const savePlan=async()=>{if(!userState)return;const target=Number(planDraft.target),current=Number(planDraft.current),monthly=Number(planDraft.monthly);if(!Number.isInteger(target)||target<=0||!Number.isInteger(current)||current<0||current>target||!Number.isInteger(monthly)||monthly<10000){setNotice("목표 금액, 현재 자산, 월 저축액을 다시 확인해주세요.");return;}try{await updateSavingsPlan(clientId,{target_amount:target,monthly_target:monthly,current_amount:current});await Promise.all(userState.enrolled_products.filter(x=>planDraft.starts[x.product_id]).map(x=>updateEnrolledProduct(clientId,x.product_id,{started_at:`${planDraft.starts[x.product_id]}-01`})));await reloadState();setPlanEditOpen(false);setNotice("목표와 월 저축액을 플랜에 반영했어요.");}catch(e){setNotice(e instanceof Error?e.message:"플랜을 변경하지 못했습니다.");}};
  const openRecords=()=>{if(!userState)return;const month=new Date().toISOString().slice(0,7);setRecordDrafts(Object.fromEntries(userState.contributions.filter(x=>x.contributed_at.slice(0,7)===month).map(x=>[x.id,{product_name:x.product_name,amount:String(x.amount),contributed_at:x.contributed_at}])));setRecordsOpen(true);};
  const saveRecord=async(id:string)=>{const draft=recordDrafts[id],amount=Number(draft.amount);if(!Number.isInteger(amount)||amount<=0){setNotice("납입 금액을 다시 확인해주세요.");return;}try{await updateSavingsContribution(clientId,id,{...draft,amount});await reloadState();setNotice("납입 기록을 수정했어요.");}catch(e){setNotice(e instanceof Error?e.message:"기록을 수정하지 못했습니다.");}};
  const removeRecord=async(id:string)=>{if(!window.confirm("이 납입 기록을 삭제할까요?"))return;try{await deleteSavingsContribution(clientId,id);await reloadState();setRecordDrafts(x=>{const next={...x};delete next[id];return next});setNotice("납입 기록을 삭제했어요.");}catch(e){setNotice(e instanceof Error?e.message:"기록을 삭제하지 못했습니다.");}};
  const terminateProduct=async(reason:string,payout:number)=>{if(!userState||!terminationProduct)return;const principal=userState.contributions.filter(x=>x.product_name===terminationProduct.product_name).reduce((sum,x)=>sum+Number(x.amount),0);try{await updateEnrolledProduct(clientId,terminationProduct.product_id,{status:"중도해지",ended_at:new Date().toISOString().slice(0,10),termination_reason:reason,termination_payout:payout});if(payout!==principal)await updateSavingsPlan(clientId,{target_amount:Number(userState.plan.target_amount),monthly_target:Number(userState.plan.monthly_target),current_amount:Math.max(0,Number(userState.plan.current_amount)+payout-principal)});await reloadState();setTerminationProduct(null);setNotice("중도해지를 반영하고 목표 기간과 예상 이자를 다시 계산했어요.");}catch(e){setNotice(e instanceof Error?e.message:"중도해지를 반영하지 못했습니다.");}};
  const editProfile=async()=>{if(!userState)return;const name=window.prompt("이름을 입력해주세요",userState.profile.name);if(!name?.trim())return;const city=window.prompt("거주 지역을 입력해주세요",userState.profile.city);if(!city?.trim())return;try{await updateUserProfile(clientId,{name:name.trim(),age:userState.profile.age,city:city.trim(),annual_income:userState.profile.annual_income,is_homeowner:userState.profile.is_homeowner,income_reported:userState.profile.income_reported,onboarding_completed:userState.profile.onboarding_completed});await reloadState();setNotice("프로필을 수정했어요.");}catch(e){setNotice(e instanceof Error?e.message:"프로필을 수정하지 못했습니다.");}};
  const openMenu=(title:string)=>{if(title==="저장한 적금"){setTab("find");setNotice("북마크 아이콘이 채워진 상품이 저장한 적금이에요.");return;}setNotice(`${title}\n\n해당 설정은 현재 입력된 사용자 정보를 기준으로 관리됩니다.`);};
  const removeAccount=async()=>{const confirmation=window.prompt("회원탈퇴 시 자산·납입·목표 데이터가 모두 삭제되고 복구할 수 없습니다. 계속하려면 '회원탈퇴'를 입력해주세요.");if(confirmation!=="회원탈퇴")return;try{await deleteUserAccount(clientId);await onSignOut();}catch(e){setNotice(e instanceof Error?e.message:"회원탈퇴를 처리하지 못했습니다.");}};
  if(stateLoading)return <div className="sp-shell"><main className="sp-loading" aria-busy="true" aria-label="저축 데이터 불러오는 중"><div/><section/><section/></main></div>;
  if(!userState?.profile.onboarding_completed)return <PlanPrototype clientId={clientId} onSaved={reloadState}/>;
  if(replanning)return <PlanPrototype clientId={clientId} initialState={userState} onSaved={async()=>{await reloadState();setReplanning(false);setTab("plan")}}/>;
  return (
    <div className="sp-shell">
      <main>
        {tab === "home" ? (
          <HomePage state={userState} onRecord={openContribution} onQuickPay={quickPay} onNotifications={showNotifications} onShowAll={()=>setTab("find")} onProduct={setSelectedProduct} onBenefits={()=>setTab("benefits")} />
        ) : tab === "find" ? (
          <FindPage items={rankedItems} restricted={restrictedItems} loading={loading} savedIds={userState.saved_product_ids} state={userState} onProduct={setSelectedProduct} onSave={toggleSaved} onNotifications={showNotifications} />
        ) : tab === "plan" ? (
          <SavingsPlanV2Prototype clientId={clientId} live embedded initialState={userState} onChanged={reloadState} onRecord={openContribution} />
        ) : tab === "benefits" ? (
          <BenefitsPage profile={userState.profile} onNotifications={showNotifications} onOpen={openPolicy} />
        ) : (
          <MyPage state={userState} user={user} onProfile={()=>setReplanning(true)} onMenu={openMenu} onNotifications={showNotifications} onSignOut={onSignOut} onDeleteAccount={removeAccount} />
        )}
      </main>
      <nav>
        {[
          ["home", Home, "홈"],
          ["find", Compass, "적금 찾기"],
          ["plan", Target, "내 플랜"],
          ["benefits", Gift, "혜택"],
          ["my", UserRound, "마이"],
        ].map(([id, Icon, label]) => (
          <button
            key={id as string}
            className={tab === id ? "on" : ""}
            aria-current={tab===id?"page":undefined}
            onClick={() => setTab(id as Tab)}
          >
            <Icon size={20} />
            <span>{label as string}</span>
          </button>
        ))}
      </nav>
      {selectedProduct&&<div className="sp-modal-backdrop" onClick={()=>setSelectedProduct(null)}><section className="sp-modal sp-product-detail" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}><button className="sp-modal-close" onClick={()=>setSelectedProduct(null)} aria-label="닫기"><X size={20}/></button><span className={`sp-tag ${selectedProduct.type==="정책"?"policy":"market"}`}>{selectedProduct.type}</span><small>{selectedProduct.org}</small><h2>{selectedProduct.name}</h2><strong>{selectedProduct.amount}</strong><p>{selectedProduct.desc}</p><div className="sp-contribution-rule"><b>{contributionLabel[selectedProduct.contributionType]} · {frequencyLabel[selectedProduct.paymentFrequency]} 납입</b><span>{selectedProduct.minMonthly.toLocaleString()}원 ~ {selectedProduct.maxMonthly?.toLocaleString()??"한도 없음"}{selectedProduct.installmentStep?` · 회차마다 ${selectedProduct.installmentStep.toLocaleString()}원 증액`:""}</span></div><div className="sp-modal-fit"><Check size={17}/>{selectedProduct.recommendation?.recommendation_reasons.join(" · ")||selectedProduct.fit}</div>{userState.enrolled_products.some(x=>x.product_id===selectedProduct.id)?<div className="sp-enrolled"><Check size={17}/> 내 적금에 추가됨</div>:<><label className="sp-enrollment-amount">가입 시 선택한 {selectedProduct.paymentFrequency==="monthly"?"월":"회차별"} 납입액<input inputMode="numeric" value={enrollmentAmount} onChange={e=>setEnrollmentAmount(e.target.value.replace(/[^0-9]/g,""))}/><span>상품 한도 안에서 실제 약정한 금액을 입력해주세요.</span></label><button className="sp-modal-primary" onClick={()=>enrollProduct(selectedProduct)}><PiggyBank size={18}/> 약정액으로 내 적금에 추가</button></>}<button className="sp-modal-secondary" onClick={()=>toggleSaved(selectedProduct)}>{userState.saved_product_ids.includes(selectedProduct.id)?<BookmarkCheck size={18}/>:<Bookmark size={18}/>} {userState.saved_product_ids.includes(selectedProduct.id)?"저장 해제":"관심 상품 저장"}</button><button className="sp-modal-secondary" onClick={()=>setNotice("상품 신청은 금융기관의 공식 채널에서 본인인증 후 진행해주세요.")}>신청 방법 보기</button></section></div>}
      {contributionOpen&&<div className="sp-modal-backdrop" onClick={()=>setContributionOpen(false)}><section className="sp-modal sp-form-modal" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}><button className="sp-modal-close" onClick={()=>setContributionOpen(false)} aria-label="닫기"><X size={20}/></button><small>저축 자산 업데이트</small><h2>납입 기록 추가</h2>{userState.enrolled_products.length?<><label>적금 상품<select value={contribution.productName} onChange={e=>{const product=userState.enrolled_products.find(x=>x.product_name===e.target.value);setContribution(x=>({...x,productName:e.target.value,amount:product?.monthly_amount?String(product.monthly_amount):""}))}}>{userState.enrolled_products.map(x=><option key={x.id} value={x.product_name}>{x.product_name} · {x.bank}</option>)}</select></label>{(()=>{const product=userState.enrolled_products.find(x=>x.product_name===contribution.productName);return product?<div className="sp-contribution-hint"><b>{contributionLabel[product.contribution_type||"flexible"]} · {frequencyLabel[product.payment_frequency||"monthly"]} 납입</b><span>{product.contribution_type==="fixed"?`약정액 ${Number(product.monthly_amount??0).toLocaleString()}원`:product.contribution_type==="step_up"?`시작액 ${Number(product.monthly_amount??0).toLocaleString()}원 · 회차별 증액 적용`:`이번 달 한도 ${Number(product.max_amount??0).toLocaleString()}원`}</span></div>:null})()}<label>실제 납입 금액<input inputMode="numeric" value={contribution.amount} onChange={e=>setContribution(x=>({...x,amount:e.target.value.replace(/[^0-9]/g,"")}))} placeholder="예: 300000" /></label><label>납입일<input type="date" value={contribution.date} max={new Date().toISOString().slice(0,10)} onChange={e=>setContribution(x=>({...x,date:e.target.value}))}/></label><button className="sp-modal-primary" onClick={recordContribution}>납입 기록 저장</button></>:<><div className="sp-empty-payment"><b>등록 가능한 적금이 없어요</b><span>적금 찾기에서 실제 신청한 상품을 먼저 추가해주세요.</span></div><button className="sp-modal-primary" onClick={()=>{setContributionOpen(false);setTab("find")}}>적금 검색하기</button></>}</section></div>}
      {planEditOpen&&<div className="sp-modal-backdrop" onClick={()=>setPlanEditOpen(false)}><section className="sp-modal sp-form-modal sp-plan-edit" role="dialog" aria-modal="true" aria-labelledby="plan-edit-title" onClick={e=>e.stopPropagation()}><button className="sp-modal-close" onClick={()=>setPlanEditOpen(false)} aria-label="닫기"><X size={20}/></button><small>목표 현황 편집</small><h2 id="plan-edit-title">저축 플랜 조정</h2><label>목표 금액<input inputMode="numeric" value={planDraft.target} onChange={e=>setPlanDraft(x=>({...x,target:e.target.value.replace(/[^0-9]/g,"")}))}/></label><label>현재까지 모은 금액<input inputMode="numeric" value={planDraft.current} onChange={e=>setPlanDraft(x=>({...x,current:e.target.value.replace(/[^0-9]/g,"")}))}/><span className="sp-field-help">이전에 모은 금액을 한 번에 입력해도 돼요. 이후 납입 기록은 자동으로 더해집니다.</span></label><label>매달 추가로 저축할 금액<input inputMode="numeric" value={planDraft.monthly} onChange={e=>setPlanDraft(x=>({...x,monthly:e.target.value.replace(/[^0-9]/g,"")}))}/></label>{userState.enrolled_products.length>0&&<div className="sp-start-list"><b>적금 시작월</b>{userState.enrolled_products.map(product=><label key={product.id}>{product.product_name}<input type="month" max={new Date().toISOString().slice(0,7)} value={planDraft.starts[product.product_id]||""} onChange={e=>setPlanDraft(x=>({...x,starts:{...x.starts,[product.product_id]:e.target.value}}))}/></label>)}</div>}<button className="sp-modal-primary" onClick={savePlan}>변경사항 저장</button></section></div>}
      {recordsOpen&&<div className="sp-modal-backdrop" onClick={()=>setRecordsOpen(false)}><section className="sp-modal sp-form-modal sp-plan-edit" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}><button className="sp-modal-close" onClick={()=>setRecordsOpen(false)} aria-label="닫기"><X size={20}/></button><small>이번 달 배분 편집</small><h2>납입 기록 수정</h2>{Object.entries(recordDrafts).map(([id,draft])=><div className="sp-record-edit" key={id}><label>적금 상품<select value={draft.product_name} onChange={e=>setRecordDrafts(x=>({...x,[id]:{...x[id],product_name:e.target.value}}))}>{userState.enrolled_products.map(x=><option key={x.id} value={x.product_name}>{x.product_name}</option>)}</select></label><div className="sp-record-grid"><label>납입 금액<input inputMode="numeric" value={draft.amount} onChange={e=>setRecordDrafts(x=>({...x,[id]:{...x[id],amount:e.target.value.replace(/[^0-9]/g,"")}}))}/></label><label>납입일<input type="date" value={draft.contributed_at} onChange={e=>setRecordDrafts(x=>({...x,[id]:{...x[id],contributed_at:e.target.value}}))}/></label></div><div className="sp-record-actions"><button onClick={()=>removeRecord(id)}>삭제</button><button onClick={()=>saveRecord(id)}>수정 저장</button></div></div>)}{!Object.keys(recordDrafts).length&&<div className="sp-empty-payment"><b>이번 달 납입 기록이 없어요</b><span>홈의 납입 기록 추가하기에서 먼저 등록해주세요.</span></div>}<button className="sp-modal-secondary" onClick={()=>setRecordsOpen(false)}>닫기</button></section></div>}
      {terminationProduct&&<TerminationPreview state={userState} product={terminationProduct} onClose={()=>setTerminationProduct(null)} onConfirm={terminateProduct}/>}
      {notice&&<div className="sp-modal-backdrop" onClick={()=>setNotice(null)}><section className="sp-notice-modal" role="alertdialog" onClick={e=>e.stopPropagation()}><button className="sp-modal-close" onClick={()=>setNotice(null)} aria-label="닫기"><X size={20}/></button><Bell size={24}/><p>{notice}</p><button className="sp-modal-primary" onClick={()=>setNotice(null)}>확인</button></section></div>}
    </div>
  );
}
