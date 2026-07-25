import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  Landmark,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";
import "./savings-plan-v2-prototype.css";
import { addEnrolledProduct, fetchUserSavingsState, updateEnrolledProduct, updateSavingsPlan, type UserSavingsState } from "./lib/api";
import PlanPrototype from "./PlanPrototype";

type View = "all" | "now" | "assets" | "accounts" | "future";
type Scenario = "keep" | "cancel" | "lower";
const demoAccounts = [
  {
    id: "youth",
    name: "청년도약계좌",
    bank: "신한은행",
    kind: "정부지원 · 자유적립",
    monthly: 300000,
    paid: 300000,
    balance: 4800000,
    months: "17 / 60회",
    maturity: "2030. 02",
    interest: 940000,
    support: 720000,
    remainingMonths: 43,
    color: "#2f8f62",
  },
  {
    id: "free",
    name: "주거래 자유적금",
    bank: "토스뱅크",
    kind: "자유적립",
    monthly: 200000,
    paid: 200000,
    balance: 2400000,
    months: "12 / 24회",
    maturity: "2027. 07",
    interest: 210000,
    support: 0,
    remainingMonths: 12,
    color: "#efaa4f",
  },
  {
    id: "house",
    name: "청년주택드림청약",
    bank: "우리은행",
    kind: "정액 납입",
    monthly: 100000,
    paid: 0,
    balance: 1800000,
    months: "18회 납입",
    maturity: "유지형",
    interest: 120000,
    support: 0,
    remainingMonths: 60,
    color: "#6398dc",
  },
];
const money = (n: number) => `${Math.round(n / 10000).toLocaleString()}만 원`;

export default function SavingsPlanV2Prototype({live=false,embedded=false,initialState,onChanged,onRecord}:{live?:boolean;embedded?:boolean;initialState?:UserSavingsState;onChanged?:()=>Promise<void>|void;onRecord?:()=>void}) {
  const [view, setView] = useState<View>("all"),
    [scenario, setScenario] = useState<Scenario>("keep"),
    [addOpen, setAddOpen] = useState(false),
    [cancelProductId, setCancelProductId] = useState<string|null>(null),
    [showAllAccounts, setShowAllAccounts] = useState(false),
    [addDraft,setAddDraft]=useState({name:"",balance:"",monthly:"",maturity:""}),
    [saving,setSaving]=useState(false),
    [userState,setUserState]=useState<UserSavingsState|null>(initialState??null),
    [loading,setLoading]=useState(live&&!initialState);
  const clientId="demo-device";
  const reload=async()=>{const next=await fetchUserSavingsState(clientId);setUserState(next);await onChanged?.();setLoading(false)};
  useEffect(()=>{if(initialState){setUserState(initialState);setLoading(false)}else if(live)reload()},[live,initialState]);
  const currentMonth=new Date().toISOString().slice(0,7);
  const colors=["#2f8f62","#efaa4f","#6398dc","#a77bd6"];
  const accounts=live&&userState?userState.enrolled_products.filter(x=>x.status!=="중도해지").map((p,index)=>{
    const contributions=userState.contributions.filter(x=>x.product_name===p.product_name);
    const balance=Number(p.opening_balance??0)+contributions.reduce((sum,x)=>sum+Number(x.amount),0);
    const paid=contributions.filter(x=>x.contributed_at.slice(0,7)===currentMonth).reduce((sum,x)=>sum+Number(x.amount),0);
    const start=p.started_at?new Date(p.started_at):new Date(),end=p.matures_at?new Date(p.matures_at):null;
    const totalMonths=end?Math.max(1,(end.getFullYear()-start.getFullYear())*12+end.getMonth()-start.getMonth()):null;
    const paidMonths=new Set(contributions.map(x=>x.contributed_at.slice(0,7))).size;
    const remainingMonths=end?Math.max(0,(end.getFullYear()-new Date().getFullYear())*12+end.getMonth()-new Date().getMonth()):12;
    const interest=Math.floor(Number(p.monthly_amount??0)*(Number(p.interest_rate??0)/100/12)*(remainingMonths*(remainingMonths+1)/2)*(1-.154));
    return {id:p.product_id,name:p.product_name,bank:p.bank,kind:`${p.contribution_type==="fixed"?"정액":p.contribution_type==="step_up"?"증액":"자유"}적립 · ${p.payment_frequency==="weekly"?"주":"월"} 납입`,monthly:Number(p.monthly_amount??0),paid,balance,months:totalMonths?`${paidMonths} / ${totalMonths}회`:`${paidMonths}회 납입`,maturity:end?`${end.getFullYear()}. ${String(end.getMonth()+1).padStart(2,"0")}`:"유지형",interest,support:0,remainingMonths,color:colors[index%colors.length]};
  }):demoAccounts;
  const target = Number(userState?.plan.target_amount??50000000),
    current = Number(userState?.plan.current_amount??12000000),
    unallocated=Number(userState?.plan.monthly_target??200000),
    allocated = accounts.reduce((s, x) => s + x.monthly, 0),
    budget = allocated+unallocated,
    paid = accounts.reduce((s, x) => s + x.paid, 0);
  const commitmentAccounts=accounts.filter(x=>x.monthly>0);
  const managedAccount=accounts.find(x=>x.id===cancelProductId)??accounts[0];
  const totalInterest=accounts.reduce((sum,x)=>sum+x.interest,0),totalSupport=accounts.reduce((sum,x)=>sum+x.support,0),futurePrincipal=accounts.reduce((sum,x)=>sum+x.monthly*x.remainingMonths,0);
  const expectedAssets=current+futurePrincipal+totalInterest+totalSupport,accuracy=live&&userState?Math.round(userState.enrolled_products.reduce((sum,p)=>sum+40+(p.interest_rate?30:0)+(p.matures_at?30:0),0)/Math.max(1,userState.enrolled_products.length)):82;
  const remaining=Math.max(0,target-current),baseMonths=Math.ceil(remaining/Math.max(1,budget)),cancelAccount=accounts[0],cancelBudget=Math.max(1,budget-(cancelAccount?.monthly??0));
  const values = useMemo(()=>scenario === "cancel"?{monthly:cancelBudget,interest:Math.max(0,totalInterest-(cancelAccount?.interest??0)),support:Math.max(0,totalSupport-(cancelAccount?.support??0)),months:Math.ceil(remaining/cancelBudget),label:`${cancelAccount?.name??"적금"} 해지`}:scenario === "lower"?{monthly:Math.max(10000,budget-150000),interest:Math.floor(totalInterest*.82),support:totalSupport,months:Math.ceil(remaining/Math.max(10000,budget-150000)),label:"월 납입 15만 원 감액"}:{monthly:budget,interest:totalInterest,support:totalSupport,months:baseMonths,label:"현재 플랜 유지"},[scenario,budget,totalInterest,totalSupport,remaining,cancelBudget,cancelAccount,baseMonths]);
  if(loading)return <div className="pv2-shell"><main><section className="pv2-loading">저축 플랜을 불러오는 중...</section></main></div>;
  if(live&&!userState?.profile.onboarding_completed)return <PlanPrototype clientId={clientId} onSaved={reload}/>;
  const monthLabel=new Intl.DateTimeFormat("ko-KR",{month:"long"}).format(new Date()),monthEnd=new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate();
  const saveAccount=async()=>{const monthly=Number(addDraft.monthly),balance=Number(addDraft.balance);if(!addDraft.name.trim()||!Number.isInteger(monthly)||monthly<=0||!Number.isInteger(balance)||balance<0||!addDraft.maturity)return;setSaving(true);try{const productId=`manual-${Date.now()}`;await addEnrolledProduct(clientId,{product_id:productId,product_name:addDraft.name.trim(),bank:"직접 입력",status:"가입완료",started_at:new Date().toISOString().slice(0,10),matures_at:addDraft.maturity,monthly_amount:monthly,opening_balance:balance,contribution_type:"flexible",payment_frequency:"monthly",min_amount:10000});if(balance>0&&userState)await updateSavingsPlan(clientId,{target_amount:Number(userState.plan.target_amount),monthly_target:Number(userState.plan.monthly_target),current_amount:Number(userState.plan.current_amount)+balance});await reload();setAddOpen(false);setAddDraft({name:"",balance:"",monthly:"",maturity:""})}finally{setSaving(false)}};
  const terminateAccount=async()=>{if(!cancelProductId||!live)return;setSaving(true);try{await updateEnrolledProduct(clientId,cancelProductId,{status:"중도해지",ended_at:new Date().toISOString().slice(0,10),termination_reason:"사용자 직접 해지",termination_payout:managedAccount.balance});await reload();setCancelProductId(null)}finally{setSaving(false)}};
  return (
    <div className={`pv2-shell ${view === "all" ? "all" : ""} ${embedded?"embedded":""}`}>
      {!embedded&&<header className="pv2-top">
        <button className="pv2-brand" onClick={()=>{if(!live)window.location.assign(window.location.pathname)}} aria-label={live?"현재 메인 화면":"메인 화면으로 이동"}>
          {!live&&<ArrowLeft size={16}/>}<b>모아</b><span>저축 플랜</span>
        </button>
        <button className="pv2-home-link" onClick={()=>window.location.assign(window.location.pathname)} aria-label="메인 화면으로 이동">
          {!live?"메인":"새로고침"}
        </button>
      </header>}
      <main>
        {(view === "all" || view === "now") && (
          <>
            <section className="pv2-greeting">
              <p>{monthLabel}의 저축 약속</p>
              <h1>
                {paid>0?<>이번 달 <b>{money(budget)}</b> 중<br /><strong>{money(paid)}</strong>를 저축했어요</>:<>이번 달 저축 목표는<br/><strong>{money(budget)}</strong>이에요</>}
              </h1>
              <div>
                <i style={{ width: `${budget>0?Math.min(100,(paid / budget) * 100):0}%` }} />
              </div>
              <span>{paid>0?`${money(Math.max(0,budget-paid))} 남음`:`아직 납입 기록이 없어요`} · {monthLabel} {monthEnd}일까지</span>
            </section>
            <section className="pv2-actions">
              <div className="pv2-section-title">
                <div>
                  <h2>이번 달 할 일</h2>
                  <span>자동이체와 직접 납입을 구분했어요</span>
                </div>
                <b>{commitmentAccounts.filter(x=>x.paid>=x.monthly).length} / {commitmentAccounts.length}</b>
              </div>
              {commitmentAccounts.map((a, i) => (
                <article key={a.id} className={a.paid>=a.monthly ? "done" : ""}>
                  <i>
                    {a.paid>=a.monthly ? <Check size={16} /> : <CalendarDays size={16} />}
                  </i>
                  <div>
                    <b>{a.name}</b>
                    <span>
                      {a.paid>=a.monthly
                        ? "이번 달 약정액 납입 완료"
                        : a.paid>0
                          ? `${money(a.monthly-a.paid)} 더 납입하면 완료`
                        : i === 2
                          ? `${monthLabel} 25일 자동이체 예정`
                          : "직접 납입 필요"}
                    </span>
                  </div>
                  <strong>{money(a.monthly)}</strong>
                  {a.paid<a.monthly && <button onClick={onRecord}>납입 기록</button>}
                </article>
              ))}
              {!commitmentAccounts.length&&<div className="pv2-no-commitment"><b>월 납입액이 설정된 적금이 없어요</b><span>내 적금에서 약정 금액을 입력하면 이번 달 계획에 표시돼요.</span></div>}
            </section>
            <button
              className="pv2-unallocated"
              onClick={() => document.getElementById("pv2-accounts")?.scrollIntoView({ behavior: "smooth" })}
            >
              <Sparkles size={18} />
              <div>
                <span>아직 배분하지 않은 저축 여유</span>
                <b>{money(budget - allocated)}</b>
              </div>
              <ChevronRight size={18} />
            </button>
          </>
        )}
        {(view === "all" || view === "assets") && (
          <>
            <div className="pv2-page-title pv2-section-heading" id="pv2-assets">
              <div><p>확정된 돈과 예상 금액을 구분했어요</p><h1>쌓인 돈</h1></div>
            </div>
            <section className="pv2-asset-hero">
              <span>현재 확정 자산</span>
              <h1>{money(current)}</h1>
              <p>실제 입력된 원금과 지급된 이자만 포함해요</p>
              <div className="pv2-stacked">
                <i style={{ width: `${Math.min(100,current/target*100)}%` }} />
                <i style={{ width: `${Math.min(100,futurePrincipal/target*100)}%` }} />
                <i style={{ width: `${Math.min(100,totalInterest/target*100)}%` }} />
                <i style={{ width: `${Math.min(100,totalSupport/target*100)}%` }} />
              </div>
              <div className="pv2-legend">
                <span>
                  <i />
                  현재 확정 {(current/target*100).toFixed(1)}%
                </span>
                <span>
                  <i />
                  납입 예정 {(futurePrincipal/target*100).toFixed(1)}%
                </span>
                <span>
                  <i />
                  예상 이자 {(totalInterest/target*100).toFixed(1)}%
                </span>
                <span>
                  <i />
                  정부지원 {(totalSupport/target*100).toFixed(1)}%
                </span>
              </div>
            </section>
            <section className="pv2-breakdown">
              <div>
                <span>현재 확정 자산</span>
                <b>{money(current)}</b>
              </div>
              <div>
                <span>만기까지 납입할 원금</span>
                <b>{money(futurePrincipal)}</b>
              </div>
              <div>
                <span>예상 세후 이자</span>
                <b className="green">+{money(totalInterest)}</b>
              </div>
              <div>
                <span>정부지원금 예상</span>
                <b className="green">+{money(totalSupport)}</b>
              </div>
              <hr />
              <div>
                <strong>현재 플랜 예상 자산</strong>
                <strong>{money(expectedAssets)}</strong>
              </div>
              <p>
                <ShieldCheck size={14} /> 예상값은 가입 조건과 실제 금리에 따라
                달라질 수 있어요.
              </p>
            </section>
            <section className="pv2-accuracy">
              <div>
                <TrendingUp size={18} />
                <span>계산 정확도</span>
                <b>{accuracy}%</b>
              </div>
              <p>청년도약계좌의 우대금리 충족 여부를 입력하면 더 정확해져요.</p>
              <button>정확도 높이기</button>
            </section>
          </>
        )}
        {(view === "all" || view === "accounts") && (
          <>
            <div className="pv2-page-title pv2-section-heading" id="pv2-accounts">
              <div>
                <p>내가 지키고 있는 저축 약속</p>
                <h1>내 적금</h1>
              </div>
              <button onClick={() => setAddOpen(true)}>
                <Plus size={17} /> 적금 추가
              </button>
            </div>
            <section className="pv2-account-list">
              {(showAllAccounts ? accounts : accounts.slice(0, 1)).map((a, index) => (
                <article key={a.id}>
                  <div className="pv2-account-head">
                    <i style={{ background: a.color }}>
                      <Landmark size={18} />
                    </i>
                    <div>
                      <span>{a.bank}</span>
                      <h2>{a.name}</h2>
                      <em>{a.kind}</em>
                    </div>
                    <button
                      onClick={() => setCancelProductId(a.id)}
                    >
                      관리
                    </button>
                  </div>
                  <div className="pv2-account-numbers">
                    <div>
                      <span>현재 원금</span>
                      <b>{money(a.balance)}</b>
                    </div>
                    <div>
                      <span>월 약속</span>
                      <b>{money(a.monthly)}</b>
                    </div>
                    <div>
                      <span>예상 이자</span>
                      <b>+{money(a.interest)}</b>
                    </div>
                  </div>
                  <div className="pv2-account-progress">
                    <span>{a.months}</span>
                    <b>
                      {a.maturity} {a.maturity !== "유지형" && "만기"}
                    </b>
                    <div>
                      <i
                        style={{
                          width: `${Math.min(100, (index + 1) * 24)}%`,
                          background: a.color,
                        }}
                      />
                    </div>
                  </div>
                  <footer>
                    <span>전체 목표 기여 예상</span>
                    <b>
                      {(
                        ((a.balance + a.interest + a.support) / target) *
                        100
                      ).toFixed(1)}
                      %
                    </b>
                    <strong>{money(a.balance + a.interest + a.support)}</strong>
                  </footer>
                </article>
              ))}
              <button className="pv2-show-accounts" onClick={()=>setShowAllAccounts(x=>!x)}>{showAllAccounts?"적금 접기":`나머지 적금 ${accounts.length-1}개 보기`}<ChevronRight size={16}/></button>
            </section>
          </>
        )}
        {(view === "all" || view === "future") && (
          <>
            <div className="pv2-page-title pv2-section-heading" id="pv2-future">
              <div>
                <p>바꾸기 전에 결과부터 확인해요</p>
                <h1>앞으로</h1>
              </div>
              <button className="icon">
                <RotateCcw size={17} />
              </button>
            </div>
            <div className="pv2-scenario-tabs">
              {[
                ["keep", "현재 유지"],
                ["cancel", "1개 해지"],
                ["lower", "납입 줄이기"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  className={scenario === id ? "on" : ""}
                  onClick={() => setScenario(id as Scenario)}
                >
                  {label}
                </button>
              ))}
            </div>
            <section className="pv2-scenario-card">
              <span>{values.label}</span>
              <h2>
                {Math.floor(values.months / 12)}년 {values.months % 12}개월 뒤
              </h2>
              <p>목표 예상 달성 시점</p>
              <div className="pv2-scenario-grid">
                <div>
                  <span>월 부담</span>
                  <b>{money(values.monthly)}</b>
                </div>
                <div>
                  <span>예상 세후 이자</span>
                  <b>+{money(values.interest)}</b>
                </div>
                <div>
                  <span>정부지원 예상</span>
                  <b>+{money(values.support)}</b>
                </div>
                <div>
                  <span>현재안 대비</span>
                  <b className={scenario === "keep" ? "" : "bad"}>
                    {scenario === "keep"
                      ? "기준"
                      : `+${values.months - 43}개월`}
                  </b>
                </div>
              </div>
            </section>
            {scenario !== "keep" && (
              <section className="pv2-warning">
                <b>
                  {scenario === "cancel"
                    ? "해지하면 즉시 480만 원을 사용할 수 있어요"
                    : "매달 15만 원의 여유가 생겨요"}
                </b>
                <p>
                  {scenario === "cancel"
                    ? "대신 예상 이자 94만 원과 정부지원금 72만 원을 잃을 수 있어요."
                    : "예상 이자는 약 24만 원 줄고 목표 달성은 7개월 늦어져요."}
                </p>
                <button>
                  {scenario === "cancel"
                    ? "해지 영향 자세히 보기"
                    : "감액 플랜 적용하기"}
                </button>
              </section>
            )}
            <section className="pv2-alternatives">
              <h2>다른 선택지도 있어요</h2>
              {[
                "한 달만 납입 쉬기",
                "월 납입액만 낮추기",
                "더 나은 적금으로 갈아타기",
              ].map((x) => (
                <button key={x}>
                  <span>{x}</span>
                  <ChevronRight size={17} />
                </button>
              ))}
            </section>
          </>
        )}
      </main>
      <nav>
        {[
          ["now", Target, "지금"],
          ["assets", WalletCards, "쌓인 돈"],
          ["accounts", Landmark, "내 적금"],
          ["future", TrendingUp, "앞으로"],
        ].map(([id, Icon, label]) => (
          <button
            key={id as string}
            className={view === id ? "on" : ""}
            onClick={() => setView(id as View)}
          >
            <Icon size={20} />
            <span>{label as string}</span>
          </button>
        ))}
      </nav>
      {addOpen && (
        <div className="pv2-backdrop" onClick={() => setAddOpen(false)}>
          <section className="pv2-sheet" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setAddOpen(false)}>
              <X />
            </button>
            <p>4가지만 먼저 알려주세요</p>
            <h2>현재 적금 추가</h2>
            <label>
              상품명
              <div className="pv2-search">
                <Search size={17} />
                  <input value={addDraft.name} onChange={e=>setAddDraft(x=>({...x,name:e.target.value}))} placeholder="은행 또는 상품명 검색" />
              </div>
            </label>
            <label>
              현재 잔액
              <input inputMode="numeric" value={addDraft.balance} onChange={e=>setAddDraft(x=>({...x,balance:e.target.value.replace(/[^0-9]/g,"")}))} placeholder="예: 4800000" />
            </label>
            <div className="two">
              <label>
                매달 넣는 금액
                  <input inputMode="numeric" value={addDraft.monthly} onChange={e=>setAddDraft(x=>({...x,monthly:e.target.value.replace(/[^0-9]/g,"")}))} placeholder="300000" />
              </label>
              <label>
                만기일
                  <input type="date" value={addDraft.maturity} min={new Date().toISOString().slice(0,10)} onChange={e=>setAddDraft(x=>({...x,maturity:e.target.value}))} />
              </label>
            </div>
            <div className="pv2-later">
              <Sparkles size={17} />
              <span>
                <b>상세 조건은 나중에 입력해도 돼요</b>금리와 우대조건을
                추가하면 예상 이자가 더 정확해져요.
              </span>
            </div>
            <button className="primary" disabled={saving||!addDraft.name||!addDraft.monthly||!addDraft.maturity} onClick={saveAccount}>{saving?"저장 중...":"이 정보로 먼저 추가"}</button>
          </section>
        </div>
      )}
      {cancelProductId && (
        <div className="pv2-backdrop" onClick={() => setCancelProductId(null)}>
          <section className="pv2-sheet" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setCancelProductId(null)}>
              <X />
            </button>
            <p>변경 전 영향 확인</p>
            <h2>{managedAccount.name}을 해지하면</h2>
            <div className="pv2-cancel-compare">
              <div>
                <span>월 부담</span>
                <b>{money(budget)}</b>
                <ChevronRight />
                <strong>{money(Math.max(0,budget-managedAccount.monthly))}</strong>
              </div>
              <div>
                <span>목표 달성</span>
                <b>{Math.floor(baseMonths/12)}년 {baseMonths%12}개월</b>
                <ChevronRight />
                <strong>{Math.floor(Math.ceil(remaining/Math.max(1,budget-managedAccount.monthly))/12)}년 {Math.ceil(remaining/Math.max(1,budget-managedAccount.monthly))%12}개월</strong>
              </div>
              <div>
                <span>예상 혜택</span>
                <b>{money(managedAccount.interest+managedAccount.support)}</b>
                <ChevronRight />
                <strong>0원</strong>
              </div>
            </div>
            <div className="pv2-cancel-note">
              지금까지 납입한 {money(managedAccount.balance)}을 목표 자산에 남길지, 생활비로 사용할지에
              따라 결과가 달라져요.
            </div>
            {live&&<button className="primary" disabled={saving} onClick={terminateAccount}>{saving?"반영 중...":"중도해지로 반영"}</button>}
            <button className="secondary" onClick={() => setCancelProductId(null)}>
              계속 유지하기
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
