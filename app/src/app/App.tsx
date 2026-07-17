import React from "react";
import { useState, useEffect } from "react";
import {
  Home, Wallet, Compass, User,
  ChevronRight, ArrowLeft, Check, X, Bell,
  ExternalLink, Plus, Minus, DollarSign, TrendingUp,
  FileText, RefreshCw, Search, Target, Sparkles,
  TrendingDown, LayoutList,
} from "lucide-react";
import { fetchRecommendations, type RecommendResult, fetchSavingsProducts, type DbSavingsProduct } from "./lib/api";
import DesignPreview from "./DesignPreview";
import SavingsPrototype from "./SavingsPrototype";
import PlanPrototype from "./PlanPrototype";
import SavingsPlanV2Prototype from "./SavingsPlanV2Prototype";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Screen = "onboarding" | "plan" | "home" | "savings" | "explore" | "detail" | "mypage";
type Tab    = "home" | "savings" | "explore" | "mypage";
type Category = "savings" | "support" | "scholarship" | "culture";
type SortMode = "all" | "popular" | "benefit";

interface PlanInfo {
  age: number; city: string; district: string;
  income: number; incomeAmt: string;
  hasSavings: boolean; hasDebt: boolean;
  employment: string; household: string;
  monthlySavings: number; targetAmount: number;
  interestCategories: Category[];
}

// ─────────────────────────────────────────────
// Category metadata
// ─────────────────────────────────────────────
const CAT_META: Record<Category, { label: string; desc: string; icon: string; color: string; tint: string; grad: string }> = {
  savings:    { label:"저축",      desc:"적금·예금·청약",     icon:"💰", color:"#2E7D32", tint:"#E6F0E6", grad:"linear-gradient(145deg,#1B5E20,#2E7D32)" },
  support:    { label:"지원 사업", desc:"창업·취업·생활지원", icon:"🏛", color:"#33691E", tint:"#ECF2E7", grad:"linear-gradient(145deg,#1E4012,#33691E)" },
  scholarship:{ label:"장학금",    desc:"국가·민간·지자체",   icon:"🎓", color:"#1B5E3A", tint:"#E4EFEA", grad:"linear-gradient(145deg,#103828,#1B5E3A)" },
  culture:    { label:"문화 산업", desc:"공연·전시·예술지원", icon:"🎨", color:"#4E6B2E", tint:"#EDF2E5", grad:"linear-gradient(145deg,#374C1E,#4E6B2E)" },
};

const FILTERS: Record<Category, { group: string; chips: { id: string; label: string }[] }[]> = {
  savings:    [{ group:"유형", chips:[{id:"gov",label:"정부지원"},{id:"bank",label:"은행"}] }, { group:"기간", chips:[{id:"short",label:"단기"},{id:"mid",label:"중기"},{id:"long",label:"장기"}] }],
  support:    [{ group:"대상", chips:[{id:"employed",label:"재직자"},{id:"seeking",label:"구직자"},{id:"startup",label:"창업자"},{id:"student",label:"학생"}] }],
  scholarship:[{ group:"유형", chips:[{id:"national",label:"국가장학금"},{id:"private",label:"민간"},{id:"local",label:"지자체"}] }],
  culture:    [{ group:"분야", chips:[{id:"perf",label:"공연"},{id:"exhibit",label:"전시"},{id:"movie",label:"영화"},{id:"art",label:"예술"}] }],
};

// ─────────────────────────────────────────────
// Products
// ─────────────────────────────────────────────
interface Product {
  id: string; name: string; provider: string; type: "gov"|"bank"|"org"; category: Category;
  benefit: string; expectedReturn: string; matchRate: number; deadline: string; isUrgent: boolean;
  interestRate: string; period: string; monthlyLimit: string;
  conditions: { text: string; met: boolean }[]; documents: string[];
  description: string; tags: string[]; supportAmount?: string; annualBenefit: number;
}

const PRODUCTS: Product[] = [
  { id:"s1", name:"청년도약계좌",        provider:"기획재정부",      type:"gov",  category:"savings",     benefit:"월 최대 6만원 정부기여금",  expectedReturn:"최대 5,000만원",   matchRate:92, deadline:"2025.02.28", isUrgent:true,  interestRate:"최대 6.0%",    period:"5년",      monthlyLimit:"70만원",    annualBenefit:222, tags:["gov","long","r5"], conditions:[{text:"만 19~34세 청년",met:true},{text:"개인소득 6,000만원 이하",met:true},{text:"가구소득 중위 250% 이하",met:true},{text:"금융종합과세 해당자 제외",met:false}], documents:["신분증","소득확인서류","건강보험료 납부확인서"], description:"5년 만기 시 정부기여금 포함 최대 5,000만원 수령 가능한 청년 전용 정책 금융상품." },
  { id:"s2", name:"청년내일저축계좌",    provider:"보건복지부",      type:"gov",  category:"savings",     benefit:"정부 매칭 최대 30만원/월",  expectedReturn:"최대 1,440만원",   matchRate:78, deadline:"2025.03.31", isUrgent:false, interestRate:"기본금리+지원", period:"3년",      monthlyLimit:"10만원",    annualBenefit:360, tags:["gov","mid"], conditions:[{text:"만 19~34세 청년",met:true},{text:"근로/사업소득 있음",met:true},{text:"기준 중위소득 100% 이하",met:false},{text:"재산 3.5억원 이하",met:true}], documents:["신분증","근로소득 확인서류","재산세 과세증명서"], description:"저소득 근로 청년의 자산 형성. 본인 납입금에 정부가 1:3 매칭 지원." },
  { id:"s3", name:"청년주택드림청약",    provider:"국토교통부",      type:"gov",  category:"savings",     benefit:"최대 4.5% 우대금리",        expectedReturn:"분양가 할인+이자", matchRate:85, deadline:"상시",       isUrgent:false, interestRate:"최대 4.5%",    period:"유지형",   monthlyLimit:"100만원",   annualBenefit:108, tags:["gov","long","r4"], conditions:[{text:"만 19~34세 무주택",met:true},{text:"연소득 5,000만원 이하",met:true},{text:"무주택 세대주",met:true},{text:"기존 청약통장 해지",met:true}], documents:["신분증","주민등록등본","소득확인서류"], description:"청년의 내 집 마련을 위한 우대금리 청약통장." },
  { id:"s4", name:"KB 청년우대 적금",    provider:"KB국민은행",      type:"bank", category:"savings",     benefit:"최대 연 5.0% 금리",         expectedReturn:"약 310만원",       matchRate:96, deadline:"2025.06.30", isUrgent:false, interestRate:"최대 5.0%",    period:"1년",      monthlyLimit:"50만원",    annualBenefit:155, tags:["bank","short","r5"], conditions:[{text:"만 18~34세 고객",met:true},{text:"KB 급여이체 실적",met:true},{text:"KB카드 30만원↑",met:true},{text:"KB 앱 전용 가입",met:true}], documents:["신분증","급여이체 확인"], description:"청년 고객 전용 고금리 적금." },
  { id:"s5", name:"토스뱅크 나눠 적금",  provider:"토스뱅크",        type:"bank", category:"savings",     benefit:"연 4.5% 자유적립",          expectedReturn:"약 280만원",       matchRate:88, deadline:"상시",       isUrgent:false, interestRate:"연 4.5%",      period:"1년",      monthlyLimit:"제한없음",  annualBenefit:135, tags:["bank","short","r4"], conditions:[{text:"토스뱅크 계좌 보유",met:true},{text:"만 19세 이상",met:true},{text:"비대면 가입",met:true},{text:"1인 1계좌",met:true}], documents:["신분증"], description:"자유롭게 납입 가능한 자유적립식 고금리 적금." },
  { id:"s6", name:"카카오뱅크 26주적금", provider:"카카오뱅크",      type:"bank", category:"savings",     benefit:"단계 납입, 습관 형성",       expectedReturn:"약 95만원",        matchRate:72, deadline:"상시",       isUrgent:false, interestRate:"연 3.5%",      period:"26주",     monthlyLimit:"주 1,000원~",annualBenefit:48, tags:["bank","short"], conditions:[{text:"카카오뱅크 계좌 보유",met:true},{text:"만 19세 이상",met:true},{text:"비대면 가입",met:true},{text:"26주 완납 우대금리",met:false}], documents:["신분증"], description:"소액으로 저축 습관을 기를 수 있는 단기 적금." },
  { id:"p1", name:"청년 창업지원금",     provider:"중소벤처기업부",  type:"gov",  category:"support",     benefit:"최대 1억원 사업화 자금",     expectedReturn:"1억원",            matchRate:74, deadline:"2025.04.30", isUrgent:false, interestRate:"-",            period:"2년",      monthlyLimit:"-",         annualBenefit:500, tags:["startup","gov","s1000"], supportAmount:"최대 1억원", conditions:[{text:"만 39세 이하 예비창업자",met:true},{text:"아이템 구체성 평가",met:true},{text:"기창업 3년 미만 예외",met:true},{text:"중복지원 불가",met:false}], documents:["사업계획서","신분증"], description:"아이디어·기술 기반 예비창업자에게 사업화 자금을 최대 1억원 지원." },
  { id:"p3", name:"청년 구직활동지원금", provider:"고용노동부",      type:"gov",  category:"support",     benefit:"월 50만원 최대 6개월",      expectedReturn:"총 300만원",       matchRate:91, deadline:"상시",       isUrgent:false, interestRate:"-",            period:"6개월",    monthlyLimit:"-",         annualBenefit:300, tags:["seeking","gov","s100"], supportAmount:"월 50만원", conditions:[{text:"만 18~34세 미취업 청년",met:true},{text:"기준 중위소득 120% 이하",met:true},{text:"졸업 후 2년 이내",met:true},{text:"구직활동 계획서 제출",met:true}], documents:["신분증","졸업증명서","주민등록등본"], description:"취업준비 청년에게 구직활동 비용을 6개월간 월 50만원 지원." },
  { id:"p4", name:"K-디지털 트레이닝",  provider:"고용노동부",      type:"gov",  category:"support",     benefit:"훈련비 전액 + 훈련장려금",  expectedReturn:"월 최대 31.6만원", matchRate:88, deadline:"2025.06.30", isUrgent:false, interestRate:"-",            period:"최대 1년", monthlyLimit:"-",         annualBenefit:190, tags:["seeking","student","gov","s100"], conditions:[{text:"만 15~45세 재직·구직자",met:true},{text:"국민내일배움카드 발급",met:true},{text:"AI·클라우드 등 분야",met:true},{text:"과정 기간 준수",met:true}], documents:["신분증","국민내일배움카드"], description:"AI, 클라우드, 빅데이터 등 디지털 핵심 역량 교육 훈련비 전액 지원." },
  { id:"p5", name:"청년 월세 특별지원",  provider:"국토교통부",      type:"gov",  category:"support",     benefit:"월 20만원 최대 12개월",     expectedReturn:"총 240만원",       matchRate:85, deadline:"2025.05.31", isUrgent:false, interestRate:"-",            period:"1년",      monthlyLimit:"-",         annualBenefit:240, tags:["seeking","student","gov","s100"], supportAmount:"월 20만원", conditions:[{text:"만 19~34세 무주택 청년",met:true},{text:"독립거주",met:true},{text:"중위소득 60% 이하",met:false},{text:"보증금 5천만원 이하",met:true}], documents:["임대차계약서","주민등록등본","소득확인서류"], description:"주거비 부담이 높은 저소득 청년에게 월세를 12개월간 한시 지원." },
  { id:"sc1", name:"국가장학금 I유형",   provider:"한국장학재단",    type:"gov",  category:"scholarship", benefit:"소득분위별 등록금 전액~일부", expectedReturn:"연 최대 570만원",  matchRate:88, deadline:"2025.02.14", isUrgent:true,  interestRate:"-",            period:"학기 단위",monthlyLimit:"-",         annualBenefit:570, tags:["d13","d46","national","sch300"], conditions:[{text:"국내 대학 재학 중",met:true},{text:"소득분위 8분위 이하",met:true},{text:"직전 학기 12학점 이수",met:true},{text:"성적 C+ 이상",met:true}], documents:["가족관계증명서","소득·재산 자료","재학증명서"], description:"소득 수준에 따라 차등 지원하는 국가 기반 장학금." },
  { id:"sc2", name:"근로장학금",          provider:"한국장학재단",    type:"gov",  category:"scholarship", benefit:"시급 9,860원 교내·외 근로",  expectedReturn:"월 최대 45만원",   matchRate:92, deadline:"상시",       isUrgent:false, interestRate:"-",            period:"학기 중",  monthlyLimit:"-",         annualBenefit:270, tags:["d13","d46","national","sch100"], conditions:[{text:"국내 대학 재학 중",met:true},{text:"소득분위 8분위 이하",met:true},{text:"학기 중 근로 가능",met:true},{text:"학점 2.0 이상",met:true}], documents:["재학증명서","통장사본"], description:"저소득 대학생이 교내외에서 일하며 학비를 마련하는 장학 프로그램." },
  { id:"c1",  name:"청년 문화예술패스",  provider:"문화체육관광부",  type:"gov",  category:"culture",     benefit:"연 15만원 문화활동 이용권",  expectedReturn:"공연·전시 관람",   matchRate:95, deadline:"상시",       isUrgent:false, interestRate:"-",            period:"1년",      monthlyLimit:"-",         annualBenefit:15,  tags:["perf","exhibit","movie","voucher","general"], conditions:[{text:"만 19~24세 청년",met:true},{text:"주민등록 기준",met:true},{text:"신청 후 앱 발급",met:true},{text:"문화활동 목적 사용",met:true}], documents:["신분증 (앱 인증)"], description:"공연·전시·영화 등 문화활동에 쓸 수 있는 연간 15만원 이용권 지급." },
  { id:"c3",  name:"청년 공연관람 지원", provider:"한국문화예술위원회",type:"gov", category:"culture",     benefit:"공연 티켓 50% 할인",         expectedReturn:"연 최대 10만원",   matchRate:89, deadline:"상시",       isUrgent:false, interestRate:"-",            period:"상시",     monthlyLimit:"-",         annualBenefit:10,  tags:["perf","voucher","general"], conditions:[{text:"만 19~34세 청년",met:true},{text:"공연예술통합전산망 가입",met:true},{text:"월 2회 이내",met:true},{text:"지원 공연 목록 해당",met:true}], documents:["신분증 (온라인 인증)"], description:"연극·뮤지컬·클래식 등 공연 관람 티켓 50% 할인 지원." },
  { id:"c4",  name:"영화 관람권 지원",   provider:"영화진흥위원회",  type:"gov",  category:"culture",     benefit:"월 4회 6,000원 할인쿠폰",   expectedReturn:"연 최대 28.8만원", matchRate:97, deadline:"상시",       isUrgent:false, interestRate:"-",            period:"1년",      monthlyLimit:"-",         annualBenefit:29,  tags:["movie","voucher","general"], conditions:[{text:"만 19~34세 청년",met:true},{text:"CGV·롯데·메가박스",met:true},{text:"영진위 앱 가입",met:true},{text:"월 4회 한도",met:true}], documents:["신분증 (앱 인증)"], description:"CGV·롯데·메가박스 전 극장 영화 관람 시 1회당 6,000원 할인쿠폰 월 4회." },
];

const NEWS = [
  { id:"n1", emoji:"📈", title:"청년도약계좌 금리 인상",   desc:"기본금리 6.0% → 6.5%로",     date:"01.22", tag:"금리변경", cat:"savings"     as Category },
  { id:"n2", emoji:"⏰", title:"국가장학금 마감 D-3",      desc:"2025년 1학기 신청 마감 임박",  date:"01.21", tag:"마감임박", cat:"scholarship" as Category },
  { id:"n3", emoji:"🏠", title:"청년월세 지원 기간 연장",  desc:"신청기간 2025.05.31까지",      date:"01.15", tag:"기간연장", cat:"support"     as Category },
  { id:"n4", emoji:"🎨", title:"문화예술패스 대상 확대",   desc:"만 19~24세 → 19~29세 확대",   date:"01.10", tag:"정책변경", cat:"culture"     as Category },
  { id:"n5", emoji:"💼", title:"청년 일자리도약장려금",    desc:"2025년 지원 규모 2배 확대",    date:"01.08", tag:"예산확대", cat:"support"     as Category },
];

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const mono = { fontFamily:"'JetBrains Mono',monospace" };
const kr   = { fontFamily:"'Pretendard Variable',Pretendard,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" };
const GRN  = "#2E7D32";
const BG   = "#F6F2E9";
const CARD = "#FFFFFF";
const DIV  = "#DDD8CC";
const TEXT = "#1B1B18";
const MUTED = "#8A8778";

// ─────────────────────────────────────────────
// Shared primitives
// ─────────────────────────────────────────────
function StatusBar({ light = false }: { light?: boolean }) {
  const fg = light ? "rgba(255,255,255,0.9)" : TEXT;
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 20px", height:28, backgroundColor: light ? "transparent" : CARD }}>
      <span style={{ ...mono, fontSize:11, fontWeight:600, color:fg }}>9:41</span>
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <div style={{ display:"flex", alignItems:"flex-end", gap:2, height:12 }}>
          {[4,6,8,10].map((h,i)=><div key={i} style={{ width:2, height:h, backgroundColor:i<3?fg:`${fg}40`, borderRadius:1 }}/>)}
        </div>
        <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
          <path d="M7 7C7.5 7 8 7.5 8 8S7.5 9 7 9 6 8.5 6 8 6.5 7 7 7Z" fill={fg}/>
          <path d="M4 5.5C4.9 4.6 5.9 4 7 4S9.1 4.6 10 5.5" stroke={fg} strokeWidth="1.2" strokeLinecap="round"/>
          <path d="M1.5 3C3 1.5 4.9 0.8 7 0.8S11 1.5 12.5 3" stroke={fg} strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        <div style={{ width:20, height:10, border:`1.5px solid ${fg}`, borderRadius:2, display:"flex", alignItems:"center", paddingLeft:1.5 }}>
          <div style={{ width:"75%", height:5, backgroundColor:fg, borderRadius:1 }}/>
        </div>
      </div>
    </div>
  );
}

function BottomNav({ activeTab, onTab }: { activeTab: Tab; onTab: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string; Icon: React.FC<any> }[] = [
    { id:"home",    label:"홈",      Icon: Home    },
    { id:"savings", label:"저축",    Icon: Wallet  },
    { id:"explore", label:"혜택 탐색",Icon: Compass },
    { id:"mypage",  label:"마이페이지",Icon: User  },
  ];
  return (
    <div style={{ position:"absolute", bottom:0, left:0, right:0, backgroundColor:CARD, borderTop:`1px solid ${DIV}`, display:"flex", alignItems:"center", height:68, paddingBottom:8, ...kr }}>
      {tabs.map(({ id, label, Icon }) => {
        const active = activeTab === id;
        return (
          <button key={id} onClick={() => onTab(id)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3, paddingTop:8, minHeight:48, position:"relative" }}>
            <div style={{ position:"absolute", top:0, height:3, width: active?32:0, borderRadius:99, backgroundColor:GRN, transition:"width 0.2s" }}/>
            <div style={{ width:36, height:28, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", backgroundColor: active?"#E6F0E6":"transparent", transition:"background 0.2s" }}>
              <Icon size={18} color={active ? GRN : MUTED} strokeWidth={active ? 2.5 : 1.8}/>
            </div>
            <span style={{ fontSize:9, fontWeight:600, color: active ? GRN : MUTED }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function TypeBadge({ type }: { type:"gov"|"bank"|"org" }) {
  const m = { gov:{bg:"#E6F0E6",fg:"#1B5E20",t:"정부지원"}, bank:{bg:"#EDEBE1",fg:"#3A3D32",t:"은행상품"}, org:{bg:"#E6F0E6",fg:"#2A4A1A",t:"민간기관"} }[type];
  return <span style={{ backgroundColor:m.bg, color:m.fg, fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:99, letterSpacing:"0.02em", ...kr }}>{m.t}</span>;
}

/** Large progress ring for home screen */
function ProgressRing({ pct, size=144, trackColor, ringColor, textColor }: { pct:number; size?:number; trackColor?:string; ringColor?:string; textColor?:string }) {
  const r=(size-14)/2, circ=2*Math.PI*r, clamped=Math.min(pct,100);
  const track  = trackColor  ?? "rgba(255,255,255,0.18)";
  const ring   = ringColor   ?? "white";
  const txtClr = textColor   ?? "white";
  return (
    <div style={{ width:size, height:size, position:"relative", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)", position:"absolute" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth={10}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={ring} strokeWidth={10} strokeDasharray={circ} strokeDashoffset={circ-(clamped/100)*circ} strokeLinecap="round"/>
      </svg>
      <div style={{ textAlign:"center", color:txtClr, position:"relative" }}>
        <div style={{ fontSize:26, fontWeight:900, lineHeight:1, ...mono }}>{clamped.toFixed(1)}%</div>
        <div style={{ fontSize:10, opacity:0.65, marginTop:4 }}>목표 달성률</div>
      </div>
    </div>
  );
}

/** Horizontal bar chart for summary view */
function HBarChart({ data }: { data:{name:string;value:number;color:string}[] }) {
  const max = Math.max(...data.map(d=>d.value), 1);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {data.map((d,i)=>(
        <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ width:60, textAlign:"right", fontSize:10, color:MUTED, ...kr, flexShrink:0, lineHeight:1.2 }}>{d.name}</span>
          <div style={{ flex:1, height:16, backgroundColor:"#E8E5DC", borderRadius:99, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${(d.value/max)*100}%`, backgroundColor:d.color, borderRadius:99, transition:"width 0.4s" }}/>
          </div>
          <span style={{ width:44, fontSize:11, fontWeight:600, color:d.color, ...mono, flexShrink:0 }}>{d.value.toLocaleString()}만</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Onboarding
// ─────────────────────────────────────────────
function OnboardingScreen({ onComplete }: { onComplete:()=>void }) {
  const [slide, setSlide] = useState(0);
  const slides = [
    { icon:"💰", title:"저축 목표 설계",  desc:"나이·소득·목표 금액을 입력하면\n최적의 청년 저축 상품을\n자동으로 설계해드립니다" },
    { icon:"🔍", title:"혜택 통합 탐색",  desc:"지원사업·장학금·문화 혜택을\n인기순·관심도순으로 탐색하고\n원하는 상품을 찾아보세요" },
    { icon:"📊", title:"달성 현황 확인",  desc:"월 납입액과 목표 기간을 설정하면\n예상 달성액과 진행률을\n한눈에 확인할 수 있습니다" },
  ];
  const s = slides[slide];
  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", background:"linear-gradient(160deg,#1A3318,#2E7D32)", ...kr }}>
      <div style={{ display:"flex", justifyContent:"flex-end", padding:"20px 24px 0" }}>
        {slide<2&&<button onClick={onComplete} style={{ color:"rgba(255,255,255,0.45)", fontSize:13 }}>건너뛰기</button>}
      </div>
      <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", padding:"0 32px" }}>
        <div style={{ width:60, height:60, borderRadius:18, backgroundColor:"rgba(255,255,255,0.1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, marginBottom:24 }}>{s.icon}</div>
        <h2 style={{ color:"white", fontSize:28, fontWeight:900, lineHeight:1.2, marginBottom:14, letterSpacing:"-0.02em" }}>{s.title}</h2>
        <p style={{ color:"rgba(255,255,255,0.55)", fontSize:14, lineHeight:1.8, whiteSpace:"pre-line" }}>{s.desc}</p>
      </div>
      <div style={{ padding:"0 28px 40px" }}>
        <div style={{ display:"flex", gap:5, justifyContent:"center", marginBottom:20 }}>
          {slides.map((_,i)=><button key={i} onClick={()=>setSlide(i)} style={{ height:4, borderRadius:99, width:i===slide?28:4, backgroundColor:i===slide?"white":"rgba(255,255,255,0.28)", transition:"all 0.3s", border:"none" }}/>)}
        </div>
        {slide<2
          ? <button onClick={()=>setSlide(s=>s+1)} style={{ width:"100%", minHeight:52, borderRadius:99, backgroundColor:"white", color:GRN, fontWeight:800, fontSize:15, display:"flex", alignItems:"center", justifyContent:"center", gap:6, border:"none", ...kr }}>다음 <ChevronRight size={17}/></button>
          : <button onClick={onComplete} style={{ width:"100%", minHeight:52, borderRadius:99, backgroundColor:"white", color:GRN, fontWeight:800, fontSize:15, border:"none", ...kr }}>시작하기 🎉</button>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Plan Screen (설계) — 8 steps
// ─────────────────────────────────────────────
function PlanScreen({ onComplete, initialData }: { onComplete:(p:PlanInfo)=>void; initialData?:PlanInfo }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<PlanInfo>(initialData ?? {
    age:26, city:"서울특별시", district:"", income:4, incomeAmt:"",
    hasSavings:false, hasDebt:false, employment:"", household:"",
    monthlySavings:500000, targetAmount:50000000,
    interestCategories:["savings","support"],
  });
  const total = 8;
  const stepLabels = ["나이","거주지역","소득","자산","고용","가구","저축목표","관심혜택"];
  const canNext = () => {
    if (step===4) return form.employment!=="";
    if (step===5) return form.household!=="";
    if (step===7) return form.interestCategories.length > 0;
    return true;
  };
  const next = () => step < total-1 ? setStep(s=>s+1) : onComplete(form);
  const cities = ["서울특별시","부산광역시","대구광역시","인천광역시","광주광역시","대전광역시","울산광역시","경기도","강원도","충청북도","충청남도","전라북도","전라남도","경상북도","경상남도","제주특별자치도"];
  const toggleCat = (c:Category) => setForm(f=>({ ...f, interestCategories: f.interestCategories.includes(c)?f.interestCategories.filter(x=>x!==c):[...f.interestCategories,c] }));

  const Opt = ({ id, icon, label, desc, field }: { id:string; icon:string; label:string; desc:string; field:"employment"|"household" }) => {
    const sel = form[field]===id;
    return (
      <button onClick={()=>setForm(f=>({...f,[field]:id}))} style={{ width:"100%", minHeight:58, padding:"11px 14px", borderRadius:14, border:`2px solid ${sel?GRN:DIV}`, backgroundColor:sel?"#E6F0E6":CARD, display:"flex", alignItems:"center", gap:11, textAlign:"left", ...kr }}>
        <span style={{ fontSize:19 }}>{icon}</span>
        <div style={{ flex:1 }}><p style={{ fontSize:13, fontWeight:600, color:TEXT }}>{label}</p><p style={{ fontSize:11, color:MUTED, marginTop:1 }}>{desc}</p></div>
        <div style={{ width:18, height:18, borderRadius:99, border:`2px solid ${sel?GRN:DIV}`, backgroundColor:sel?GRN:"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{sel&&<Check size={10} color="white"/>}</div>
      </button>
    );
  };

  const months = Math.ceil(form.targetAmount/form.monthlySavings);
  const yrs = Math.floor(months/12), mrem = months%12;

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", backgroundColor:BG, ...kr }}>
      {/* Header */}
      <div style={{ backgroundColor:CARD, padding:"10px 14px 14px", borderBottom:`1px solid ${DIV}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
          {step>0 ? <button onClick={()=>setStep(s=>s-1)} style={{ width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",marginLeft:-8 }}><ArrowLeft size={20} color={TEXT}/></button> : <div style={{ width:40 }}/>}
          <span style={{ fontSize:11, fontWeight:600, color:MUTED, letterSpacing:"0.04em" }}>{step+1} / {total} · {stepLabels[step]}</span>
        </div>
        <div style={{ height:3, borderRadius:99, backgroundColor:"#E8E5DC", overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${((step+1)/total)*100}%`, backgroundColor:GRN, borderRadius:99, transition:"width 0.3s" }}/>
        </div>
        <div style={{ display:"flex", marginTop:7 }}>
          {stepLabels.map((l,i)=><div key={i} style={{ flex:1, textAlign:"center", fontSize:8, fontWeight:600, color:i<=step?GRN:"#C8C4B8" }}>{l}</div>)}
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"20px 16px" }}>
        {step===0&&<div>
          <h2 style={{ fontSize:20, fontWeight:900, color:TEXT, marginBottom:4 }}>나이를 알려주세요</h2>
          <p style={{ fontSize:12, color:MUTED, marginBottom:24 }}>만 19~34세 청년이 이용 가능해요</p>
          <div style={{ backgroundColor:CARD, borderRadius:16, border:`1px solid ${DIV}`, padding:"28px 0", display:"flex", alignItems:"center", justifyContent:"center", gap:28, marginBottom:14 }}>
            <button onClick={()=>setForm(f=>({...f,age:Math.max(19,f.age-1)}))} style={{ width:46,height:46,borderRadius:99,border:`2px solid ${GRN}`,display:"flex",alignItems:"center",justifyContent:"center" }}><Minus size={19} color={GRN}/></button>
            <div style={{ textAlign:"center" }}><div style={{ fontSize:50, fontWeight:900, color:TEXT, lineHeight:1, ...mono }}>{form.age}</div><div style={{ fontSize:13, color:MUTED, marginTop:6 }}>세</div></div>
            <button onClick={()=>setForm(f=>({...f,age:Math.min(34,f.age+1)}))} style={{ width:46,height:46,borderRadius:99,backgroundColor:GRN,display:"flex",alignItems:"center",justifyContent:"center",border:"none" }}><Plus size={19} color="white"/></button>
          </div>
          <div style={{ backgroundColor:"#E6F0E6",borderRadius:12,padding:"11px 13px",display:"flex",gap:8 }}><span>💡</span><p style={{ fontSize:11, color:"#1B5E20", lineHeight:1.6 }}>병역의무 이행 기간(최대 2년)은 나이에서 제외돼요.</p></div>
        </div>}

        {step===1&&<div>
          <h2 style={{ fontSize:20, fontWeight:900, color:TEXT, marginBottom:4 }}>거주 지역을 선택해주세요</h2>
          <p style={{ fontSize:12, color:MUTED, marginBottom:24 }}>지역별 추가 혜택 상품도 찾아드릴게요</p>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {[{label:"시 / 도",field:"city" as const},{label:"시 / 군 / 구",field:"district" as const}].map(({label,field})=>(
              <div key={field} style={{ backgroundColor:CARD,borderRadius:14,border:`1px solid ${DIV}`,overflow:"hidden" }}>
                <div style={{ padding:"7px 14px",borderBottom:`1px solid #F0EDE5` }}><span style={{ fontSize:9,fontWeight:700,color:MUTED,letterSpacing:"0.06em" }}>{label}</span></div>
                {field==="city"
                  ? <select value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))} style={{ width:"100%",padding:"12px 14px",fontSize:14,color:TEXT,background:"transparent",minHeight:46,...kr }}>{cities.map(c=><option key={c}>{c}</option>)}</select>
                  : <input placeholder="예) 강남구 (선택사항)" value={form.district} onChange={e=>setForm(f=>({...f,district:e.target.value}))} style={{ width:"100%",padding:"12px 14px",fontSize:14,color:TEXT,background:"transparent",minHeight:46,...kr }}/>}
              </div>
            ))}
          </div>
        </div>}

        {step===2&&<div>
          <h2 style={{ fontSize:20, fontWeight:900, color:TEXT, marginBottom:4 }}>소득 분위를 선택해주세요</h2>
          <p style={{ fontSize:12, color:MUTED, marginBottom:20 }}>정확한 추천을 위해 소득 수준을 알려주세요</p>
          <div style={{ backgroundColor:CARD,borderRadius:14,border:`1px solid ${DIV}`,padding:14,marginBottom:10 }}>
            <p style={{ fontSize:10,fontWeight:700,color:MUTED,marginBottom:10 }}>소득 분위</p>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6 }}>
              {[1,2,3,4,5,6,7,8,9,10].map(q=>(
                <button key={q} onClick={()=>setForm(f=>({...f,income:q}))} style={{ minHeight:42,borderRadius:10,border:`2px solid ${form.income===q?GRN:DIV}`,backgroundColor:form.income===q?GRN:CARD,color:form.income===q?"white":"#5A5850",fontSize:11,fontWeight:700,...kr }}>
                  {q}분위
                </button>
              ))}
            </div>
            <div style={{ display:"flex",justifyContent:"space-between",marginTop:8,fontSize:10,color:MUTED }}><span>← 저소득</span><span>고소득 →</span></div>
          </div>
          <div style={{ backgroundColor:CARD,borderRadius:14,border:`1px solid ${DIV}`,padding:14 }}>
            <p style={{ fontSize:10,fontWeight:700,color:MUTED,marginBottom:8 }}>또는 연소득 직접 입력</p>
            <div style={{ display:"flex",alignItems:"center",gap:8,backgroundColor:"#E8E5DC",borderRadius:10,padding:"9px 13px",minHeight:44 }}>
              <DollarSign size={13} color={MUTED}/>
              <input type="number" placeholder="연소득 입력" value={form.incomeAmt} onChange={e=>setForm(f=>({...f,incomeAmt:e.target.value}))} style={{ flex:1,fontSize:13,background:"transparent",...mono }}/>
              <span style={{ fontSize:12,color:MUTED }}>만원</span>
            </div>
          </div>
        </div>}

        {step===3&&<div>
          <h2 style={{ fontSize:20, fontWeight:900, color:TEXT, marginBottom:4 }}>자산 현황을 알려주세요</h2>
          <p style={{ fontSize:12, color:MUTED, marginBottom:20 }}>해당하는 항목을 모두 선택해주세요</p>
          {[{k:"hasSavings",icon:"💰",label:"예금 / 적금이 있어요",desc:"현재 은행 예적금 보유 중"},{k:"hasDebt",icon:"📋",label:"대출 / 부채가 있어요",desc:"학자금, 신용대출 등 포함"}].map(({k,icon,label,desc})=>{
            const val = form[k as keyof PlanInfo] as boolean;
            return (
              <button key={k} onClick={()=>setForm(f=>({...f,[k]:!val}))} style={{ width:"100%",minHeight:58,padding:"11px 14px",borderRadius:14,border:`2px solid ${val?GRN:DIV}`,backgroundColor:val?"#E6F0E6":CARD,display:"flex",alignItems:"center",gap:11,textAlign:"left",marginBottom:10,...kr }}>
                <span style={{ fontSize:21 }}>{icon}</span>
                <div style={{ flex:1 }}><p style={{ fontSize:13,fontWeight:600,color:TEXT }}>{label}</p><p style={{ fontSize:11,color:MUTED,marginTop:1 }}>{desc}</p></div>
                <div style={{ width:18,height:18,borderRadius:99,border:`2px solid ${val?GRN:DIV}`,backgroundColor:val?GRN:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>{val&&<Check size={10} color="white"/>}</div>
              </button>
            );
          })}
          <div style={{ backgroundColor:"#FFEFD6",borderRadius:11,padding:"10px 13px",display:"flex",gap:8 }}><span>💡</span><p style={{ fontSize:11,color:"#7A5100",lineHeight:1.6 }}>부채가 있어도 대부분의 정부지원 상품 신청이 가능해요.</p></div>
        </div>}

        {step===4&&<div>
          <h2 style={{ fontSize:20, fontWeight:900, color:TEXT, marginBottom:4 }}>고용 상태를 알려주세요</h2>
          <p style={{ fontSize:12, color:MUTED, marginBottom:20 }}>현재 상황에 가장 가까운 것을 선택해주세요</p>
          <div style={{ display:"flex",flexDirection:"column",gap:9 }}>
            <Opt id="employed"  icon="💼" label="재직중"      desc="정규직, 계약직, 파트타임 포함" field="employment"/>
            <Opt id="seeking"   icon="🔍" label="구직중"      desc="취업 준비 중이에요"             field="employment"/>
            <Opt id="student"   icon="🎓" label="대학(원)생" desc="재학 중이에요"                  field="employment"/>
            <Opt id="freelance" icon="💻" label="프리랜서"   desc="자유 계약으로 일해요"           field="employment"/>
            <Opt id="self"      icon="🏪" label="자영업"     desc="사업자 등록을 했어요"           field="employment"/>
          </div>
        </div>}

        {step===5&&<div>
          <h2 style={{ fontSize:20, fontWeight:900, color:TEXT, marginBottom:4 }}>가구 형태를 알려주세요</h2>
          <p style={{ fontSize:12, color:MUTED, marginBottom:20 }}>가구원 구성에 따라 추가 혜택이 달라져요</p>
          <div style={{ display:"flex",flexDirection:"column",gap:9 }}>
            <Opt id="single"  icon="🏠" label="1인가구"           desc="혼자 살아요"           field="household"/>
            <Opt id="parents" icon="👨‍👩‍👦" label="부모님과 함께"    desc="부모님 세대에 속해요" field="household"/>
            <Opt id="family"  icon="👶" label="배우자 / 자녀 있음" desc="부양가족이 있어요"    field="household"/>
            <Opt id="other"   icon="🏘" label="기타"              desc="룸메이트, 쉐어하우스"  field="household"/>
          </div>
        </div>}

        {step===6&&<div>
          <h2 style={{ fontSize:20, fontWeight:900, color:TEXT, marginBottom:4 }}>저축 목표를 설정해주세요</h2>
          <p style={{ fontSize:12, color:MUTED, marginBottom:20 }}>월 납입액과 목표 금액을 설정하면 달성 기간을 계산해드려요</p>
          <div style={{ backgroundColor:CARD,borderRadius:14,border:`1px solid ${DIV}`,padding:14,marginBottom:10 }}>
            <p style={{ fontSize:10,fontWeight:700,color:MUTED,marginBottom:10 }}>월 납입액</p>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
              <span style={{ fontSize:22,fontWeight:900,color:TEXT,...mono }}>{(form.monthlySavings/10000).toFixed(0)}만원</span>
              <span style={{ fontSize:11,color:MUTED }}>/ 월</span>
            </div>
            <input type="range" min={100000} max={700000} step={50000} value={form.monthlySavings} onChange={e=>setForm(f=>({...f,monthlySavings:Number(e.target.value)}))} style={{ width:"100%",accentColor:GRN }}/>
            <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,color:MUTED,marginTop:4 }}><span>10만원</span><span>70만원</span></div>
          </div>
          <div style={{ backgroundColor:CARD,borderRadius:14,border:`1px solid ${DIV}`,padding:14,marginBottom:10 }}>
            <p style={{ fontSize:10,fontWeight:700,color:MUTED,marginBottom:10 }}>목표 원금</p>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6 }}>
              {[1000,2000,3000,5000].map(v=>(
                <button key={v} onClick={()=>setForm(f=>({...f,targetAmount:v*10000}))} style={{ minHeight:42,borderRadius:10,border:`2px solid ${form.targetAmount===v*10000?GRN:DIV}`,backgroundColor:form.targetAmount===v*10000?GRN:CARD,color:form.targetAmount===v*10000?"white":"#5A5850",fontSize:11,fontWeight:700,...kr }}>
                  {v}만원
                </button>
              ))}
            </div>
          </div>
          <div style={{ backgroundColor:"#E6F0E6",borderRadius:12,padding:"13px 14px" }}>
            <p style={{ fontSize:10,fontWeight:700,color:"#1B5E20",marginBottom:4 }}>예상 달성 기간</p>
            <p style={{ fontSize:22,fontWeight:900,color:GRN,...mono }}>{yrs>0?`${yrs}년 `:""}{ mrem>0?`${mrem}개월`:""}</p>
            <p style={{ fontSize:10,color:"#5D9060",marginTop:3 }}>월 {(form.monthlySavings/10000).toFixed(0)}만원 × {months}개월 (이자 미포함)</p>
          </div>
        </div>}

        {step===7&&<div>
          <h2 style={{ fontSize:20, fontWeight:900, color:TEXT, marginBottom:4 }}>관심 혜택 분야를 선택해주세요</h2>
          <p style={{ fontSize:12, color:MUTED, marginBottom:20 }}>선택한 분야의 혜택을 우선 추천해드려요 (복수 선택)</p>
          <div style={{ display:"flex",flexDirection:"column",gap:9 }}>
            {(Object.entries(CAT_META) as [Category,typeof CAT_META[Category]][]).map(([id,m])=>{
              const sel = form.interestCategories.includes(id);
              return (
                <button key={id} onClick={()=>toggleCat(id)} style={{ minHeight:68,padding:"13px 14px",borderRadius:14,border:`2px solid ${sel?m.color:DIV}`,backgroundColor:sel?m.tint:CARD,display:"flex",alignItems:"center",gap:13,textAlign:"left",...kr }}>
                  <div style={{ width:42,height:42,borderRadius:11,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,backgroundColor:sel?`${m.color}18`:"#F0EDE5",flexShrink:0 }}>{m.icon}</div>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:14,fontWeight:700,color:TEXT }}>{m.label}</p>
                    <p style={{ fontSize:11,color:MUTED,marginTop:1 }}>{m.desc}</p>
                  </div>
                  <div style={{ width:20,height:20,borderRadius:99,border:`2px solid ${sel?m.color:DIV}`,backgroundColor:sel?m.color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>{sel&&<Check size={11} color="white"/>}</div>
                </button>
              );
            })}
          </div>
          {form.interestCategories.length===0&&<p style={{ textAlign:"center",fontSize:12,color:"#C8C4B8",marginTop:12 }}>1개 이상 선택해주세요</p>}
        </div>}
      </div>

      <div style={{ padding:"10px 16px 14px",backgroundColor:CARD,borderTop:`1px solid ${DIV}` }}>
        <button onClick={next} disabled={!canNext()} style={{ width:"100%",minHeight:50,borderRadius:99,backgroundColor:canNext()?GRN:"#E8E5DC",color:canNext()?"white":"#ACA89A",fontWeight:700,fontSize:15,border:"none",...kr }}>
          {step===total-1?"설계 완료 🎉":"다음"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Home Screen
// ─────────────────────────────────────────────
function HomeScreen({ plan, onSelectProduct, backendRecs, backendRecsLoading }: { plan:PlanInfo; onSelectProduct:(id:string)=>void; backendRecs:RecommendResult[]|null; backendRecsLoading:boolean }) {
  const current = plan.monthlySavings * 4;
  const pct = (current / plan.targetAmount) * 100;

  const popularProducts = [...PRODUCTS]
    .filter(p => plan.interestCategories.includes(p.category))
    .sort((a,b)=>b.matchRate-a.matchRate)
    .slice(0,5);

  return (
    <div style={{ height:"100%", overflowY:"auto", backgroundColor:BG, ...kr }}>
      {/* Savings progress card — white bg, green accents */}
      <div style={{ margin:"14px 14px 0", borderRadius:20, padding:20, backgroundColor:CARD, border:`1.5px solid #C8E6C9`, boxShadow:"0 4px 18px rgba(46,125,50,0.12)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
          <p style={{ color:GRN, fontSize:12, fontWeight:800, letterSpacing:"-0.01em" }}>나의 청년 재테크</p>
          <span style={{ fontSize:9, fontWeight:700, backgroundColor:"#E6F0E6", color:GRN, padding:"3px 8px", borderRadius:99 }}>진행 중</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <ProgressRing pct={pct} size={140} trackColor="#C8E6C9" ringColor={GRN} textColor={TEXT}/>
          <div style={{ flex:1 }}>
            <div style={{ marginBottom:10 }}>
              <p style={{ color:MUTED, fontSize:10, marginBottom:2 }}>현재 달성액</p>
              <p style={{ color:GRN, fontSize:20, fontWeight:900, lineHeight:1, ...mono }}>{(current/10000).toFixed(0)}<span style={{ fontSize:13 }}>만원</span></p>
            </div>
            <div style={{ marginBottom:10 }}>
              <p style={{ color:MUTED, fontSize:10, marginBottom:2 }}>목표 원금</p>
              <p style={{ color:TEXT, fontSize:15, fontWeight:700, ...mono }}>{(plan.targetAmount/10000).toFixed(0)}<span style={{ fontSize:12, fontWeight:400 }}>만원</span></p>
            </div>
            <div>
              <p style={{ color:MUTED, fontSize:10, marginBottom:2 }}>월 납입액</p>
              <p style={{ color:TEXT, fontSize:13, fontWeight:700, ...mono }}>{(plan.monthlySavings/10000).toFixed(0)}<span style={{ fontSize:11, fontWeight:400 }}>만원</span></p>
            </div>
          </div>
        </div>
        <div style={{ display:"flex", marginTop:14, paddingTop:13, borderTop:`1px solid #E8F5E9` }}>
          {[{label:"운용 기간",value:"4개월"},{label:"납입 횟수",value:"4회"},{label:"예상 이자",value:`${((plan.monthlySavings*4*0.06*4/12)/10000).toFixed(0)}만원`}].map(({label,value},i)=>(
            <div key={label} style={{ flex:1, textAlign:"center", borderRight:i<2?`1px solid #E8F5E9`:"none" }}>
              <p style={{ color:GRN, fontSize:14, fontWeight:900, ...mono }}>{value}</p>
              <p style={{ color:MUTED, fontSize:9, marginTop:1 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Latest updates */}
      <div style={{ marginTop:22, paddingLeft:14 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingRight:14, marginBottom:11 }}>
          <h2 style={{ fontSize:14, fontWeight:800, color:TEXT }}>📢 최신 혜택 업데이트</h2>
          <button style={{ fontSize:11, color:GRN, fontWeight:600 }}>전체보기</button>
        </div>
        <div style={{ display:"flex", gap:9, overflowX:"auto", paddingRight:14, paddingBottom:2 }}>
          {NEWS.map(n=>{
            const m = CAT_META[n.cat];
            return (
              <div key={n.id} style={{ minWidth:164, backgroundColor:CARD, borderRadius:13, border:`1px solid ${DIV}`, padding:13, flexShrink:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:7 }}>
                  <span style={{ fontSize:16 }}>{n.emoji}</span>
                  <span style={{ fontSize:9, fontWeight:700, backgroundColor:m.tint, color:m.color, padding:"2px 6px", borderRadius:99 }}>{n.tag}</span>
                </div>
                <p style={{ fontSize:12, fontWeight:700, color:TEXT, lineHeight:1.4, marginBottom:3 }}>{n.title}</p>
                <p style={{ fontSize:10, color:MUTED, lineHeight:1.5 }}>{n.desc}</p>
                <p style={{ fontSize:9, color:"#C8C4B8", marginTop:7 }}>{n.date}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live backend recommendations — hidden entirely if backend is unreachable/unconfigured */}
      {(backendRecsLoading || (backendRecs && backendRecs.length>0)) && (
        <div style={{ margin:"22px 14px 0" }}>
          <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:11 }}>
            <TrendingUp size={13} color={GRN}/><h2 style={{ fontSize:14, fontWeight:800, color:TEXT }}>실시간 맞춤 추천</h2>
          </div>
          {backendRecsLoading ? (
            <p style={{ fontSize:12, color:MUTED }}>추천 상품을 불러오는 중…</p>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {backendRecs!.slice(0,5).map(r=>(
                <div key={r.rank} style={{ backgroundColor:CARD, borderRadius:13, border:`1px solid ${DIV}`, padding:"11px 13px" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:2 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:TEXT }}>{r.name}</span>
                    <span style={{ fontSize:11, fontWeight:700, color:GRN, ...mono }}>연 {r.base_rate}%</span>
                  </div>
                  <p style={{ fontSize:10, color:MUTED }}>{r.bank} · 만기 예상 {Math.round(r.expected_amount/10000).toLocaleString()}만원</p>
                  {r.notice && <p style={{ fontSize:10, color:"#B08900", marginTop:3 }}>{r.notice}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Popular benefits */}
      <div style={{ margin:"20px 14px 0" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:11 }}>
          <div style={{ display:"flex", alignItems:"center", gap:5 }}><Sparkles size={13} color={GRN}/><h2 style={{ fontSize:14, fontWeight:800, color:TEXT }}>인기 있는 혜택</h2></div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {popularProducts.map((p,i)=>{
            const m = CAT_META[p.category];
            return (
              <button key={p.id} onClick={()=>onSelectProduct(p.id)} style={{ backgroundColor:CARD, borderRadius:13, border:`1px solid ${DIV}`, padding:"11px 13px", display:"flex", alignItems:"center", gap:11, textAlign:"left" }}>
                <div style={{ width:30, height:30, borderRadius:9, backgroundColor:m.tint, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>{m.icon}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:2 }}>
                    <span style={{ fontSize:9, fontWeight:800, backgroundColor:`${m.color}15`, color:m.color, padding:"1px 5px", borderRadius:5 }}>#{i+1}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:TEXT, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</span>
                  </div>
                  <p style={{ fontSize:10, color:MUTED, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.benefit}</p>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:m.color, ...mono }}>연 {p.annualBenefit}만</span>
                  <ChevronRight size={13} color={MUTED}/>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ height:20 }}/>
    </div>
  );
}

// ─────────────────────────────────────────────
// Savings Screen — clean product cards
// ─────────────────────────────────────────────
// 개월 수를 "N년"/"N개월" 형태로 변환
function periodText(months: number): string {
  if (months % 12 === 0 && months >= 12) return `${months / 12}년`;
  return `${months}개월`;
}

function SavingsScreen({ onSelectProduct }: { onSelectProduct:(id:string)=>void }) {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [dbProducts, setDbProducts] = useState<DbSavingsProduct[]|null>(null);
  const [loading, setLoading] = useState(true);
  const toggleFilter = (id:string) => setActiveFilters(p=>p.includes(id)?p.filter(f=>f!==id):[...p,id]);

  useEffect(() => {
    setLoading(true);
    fetchSavingsProducts().then(setDbProducts).finally(() => setLoading(false));
  }, []);

  const matchesFilter = (p: DbSavingsProduct, id: string) => {
    if (id==="gov")   return p.product_type==="정책";
    if (id==="bank")  return p.product_type==="시중";
    if (id==="short") return p.max_period<=12;
    if (id==="mid")   return p.max_period>12 && p.max_period<=36;
    if (id==="long")  return p.max_period>36;
    return true;
  };
  const products = (dbProducts??[])
    .filter(p => activeFilters.length===0 || activeFilters.some(f=>matchesFilter(p,f)))
    .sort((a,b)=>b.rate-a.rate);

  const m = CAT_META.savings;

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", backgroundColor:BG, ...kr }}>
      <div style={{ backgroundColor:CARD, padding:"12px 14px 10px", borderBottom:`1px solid ${DIV}` }}>
        <h1 style={{ fontSize:18, fontWeight:900, color:TEXT, marginBottom:11 }}>저축 상품</h1>
        {/* Filter chips */}
        {FILTERS["savings"].map(({group,chips})=>(
          <div key={group} style={{ display:"flex", alignItems:"center", gap:7, marginBottom:6 }}>
            <span style={{ fontSize:9, fontWeight:700, color:MUTED, flexShrink:0, width:24 }}>{group}</span>
            <div style={{ display:"flex", gap:5, overflowX:"auto" }}>
              {chips.map(chip=>{
                const act = activeFilters.includes(chip.id);
                return <button key={chip.id} onClick={()=>toggleFilter(chip.id)} style={{ flexShrink:0, padding:"4px 11px", borderRadius:99, border:`1.5px solid ${act?GRN:DIV}`, backgroundColor:act?GRN:CARD, color:act?"white":"#5A5850", fontSize:11, fontWeight:600, minHeight:28 }}>{chip.label}</button>;
              })}
            </div>
          </div>
        ))}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:6 }}>
          <span style={{ fontSize:11, color:MUTED }}>{loading?"불러오는 중…":`${products.length}개 상품 · 금리 높은 순`}</span>
          {activeFilters.length>0&&<button onClick={()=>setActiveFilters([])} style={{ fontSize:11, color:MUTED, textDecoration:"underline" }}>초기화</button>}
        </div>
      </div>

      <div style={{ flex:1, minHeight:0, overflowY:"auto", padding:"10px 13px 22px", display:"flex", flexDirection:"column", gap:8 }}>
        {loading && <p style={{ textAlign:"center", fontSize:12, color:MUTED, marginTop:20 }}>상품을 불러오는 중…</p>}
        {!loading && dbProducts===null && <p style={{ textAlign:"center", fontSize:12, color:MUTED, marginTop:20 }}>상품 목록을 불러오지 못했어요. 백엔드 서버를 확인해주세요.</p>}
        {!loading && dbProducts!==null && products.length===0 && <p style={{ textAlign:"center", fontSize:12, color:MUTED, marginTop:20 }}>조건에 맞는 상품이 없어요.</p>}
        {products.map(p=>(
          <div key={p.id} style={{ backgroundColor:CARD, borderRadius:14, border:`1px solid ${DIV}`, overflow:"hidden", width:"100%", flexShrink:0, boxShadow:"0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ padding:"12px 14px" }}>
              {/* Row 1: Badge + rate */}
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                <TypeBadge type={p.product_type==="정책"?"gov":"bank"}/>
                <div style={{ flex:1 }}/>
                <span style={{ fontSize:11, color:m.color, fontWeight:700, ...mono }}>연 {p.rate}%</span>
              </div>
              {/* Row 2: Product name */}
              <p style={{ fontSize:15, fontWeight:800, color:TEXT, marginBottom:2, lineHeight:1.3 }}>{p.name}</p>
              <p style={{ fontSize:11, color:MUTED, marginBottom:9 }}>{p.bank}</p>
              {/* Row 3: Key metrics */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1px 1fr 1px 1fr", gap:0, backgroundColor:"#F5F2EC", borderRadius:9, overflow:"hidden" }}>
                {[
                  {label:"금리",value:`연 ${p.rate}%`},
                  {label:"기간",value: p.min_period===p.max_period ? periodText(p.min_period) : `${periodText(p.min_period)}~${periodText(p.max_period)}`},
                  {label:"월 한도",value: p.monthly_limit ? `${p.monthly_limit}만원` : "제한없음"},
                ].map(({label,value},i)=>(
                  <React.Fragment key={label}>
                    {i>0&&<div style={{ backgroundColor:DIV }}/>}
                    <div style={{ padding:"8px 0", textAlign:"center" }}>
                      <p style={{ fontSize:9, color:MUTED, marginBottom:3 }}>{label}</p>
                      <p style={{ fontSize:11, fontWeight:700, color:TEXT, ...mono }}>{value}</p>
                    </div>
                  </React.Fragment>
                ))}
              </div>
              {/* Row 4: Eligibility highlight */}
              <div style={{ marginTop:9, padding:"7px 10px", backgroundColor:m.tint, borderRadius:8 }}>
                <p style={{ fontSize:11, fontWeight:600, color:m.color }}>
                  💡 {p.income_limit ? `연소득 ${p.income_limit.toLocaleString()}만원 이하 조건 있음` : `만 ${p.min_age}~${p.max_age}세 가입 가능`}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Explore Screen — 전체/인기순/관심도순
// ─────────────────────────────────────────────
function ExploreScreen({ onSelectProduct, plan }: { onSelectProduct:(id:string)=>void; plan:PlanInfo }) {
  const [sort, setSort] = useState<SortMode>("all");
  const [catFilter, setCatFilter] = useState<Category|"all">("all");
  const [query, setQuery] = useState("");

  const isSearching = query.trim().length > 0;

  const sorted = [...PRODUCTS].filter(p => {
    if (catFilter!=="all" && p.category!==catFilter) return false;
    if (isSearching) {
      const q = query.toLowerCase();
      return p.name.includes(query)||p.provider.includes(query)||p.benefit.includes(query)||CAT_META[p.category].label.includes(query);
    }
    return true;
  }).sort((a,b) => {
    if (sort==="popular")  return b.matchRate-a.matchRate;
    if (sort==="benefit")  return b.annualBenefit-a.annualBenefit;
    return 0; // "all" = default order
  });

  const sortOptions: { id:SortMode; label:string; Icon:React.FC<any> }[] = [
    { id:"all",     label:"전체",    Icon: LayoutList  },
    { id:"popular", label:"인기순",  Icon: TrendingUp  },
    { id:"benefit", label:"관심도순",Icon: Sparkles    },
  ];

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", backgroundColor:BG, ...kr }}>
      <div style={{ backgroundColor:CARD, padding:"12px 14px 10px", borderBottom:`1px solid ${DIV}` }}>
        <h1 style={{ fontSize:18, fontWeight:900, color:TEXT, marginBottom:11 }}>혜택 탐색</h1>
        {/* Search */}
        <div style={{ display:"flex", alignItems:"center", gap:8, backgroundColor:"#E8E5DC", borderRadius:12, padding:"9px 12px", marginBottom:10, minHeight:42 }}>
          <Search size={14} color={MUTED}/>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="상품명, 기관명, 분야 검색…" style={{ flex:1, fontSize:13, background:"transparent", color:TEXT, ...kr }}/>
          {query&&<button onClick={()=>setQuery("")} style={{ width:16,height:16,borderRadius:99,backgroundColor:MUTED,display:"flex",alignItems:"center",justifyContent:"center",border:"none" }}><X size={10} color="white"/></button>}
        </div>
        {/* Sort tabs */}
        <div style={{ display:"flex", gap:6, marginBottom:8 }}>
          {sortOptions.map(({id,label,Icon})=>(
            <button key={id} onClick={()=>setSort(id)} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:4, padding:"6px 0", borderRadius:10, border:`1.5px solid ${sort===id?GRN:DIV}`, backgroundColor:sort===id?GRN:CARD, color:sort===id?"white":"#5A5850", fontSize:11, fontWeight:700, minHeight:34 }}>
              <Icon size={11}/>{label}
            </button>
          ))}
        </div>
        {/* Category filter */}
        <div style={{ display:"flex", gap:5, overflowX:"auto", paddingBottom:2 }}>
          {([["all","전체"], ...Object.entries(CAT_META).map(([k,m])=>[k, m.icon+" "+m.label])] as [string,string][]).map(([id,label])=>(
            <button key={id} onClick={()=>setCatFilter(id as any)} style={{ flexShrink:0, padding:"4px 11px", borderRadius:99, border:`1.5px solid ${catFilter===id?GRN:DIV}`, backgroundColor:catFilter===id?GRN:CARD, color:catFilter===id?"white":"#5A5850", fontSize:11, fontWeight:600, minHeight:28 }}>
              {label}
            </button>
          ))}
        </div>
        <p style={{ fontSize:10, color:MUTED, marginTop:7 }}>{sorted.length}개 상품</p>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"10px 13px 22px", display:"flex", flexDirection:"column", gap:8 }}>
        {sorted.length===0 ? (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"48px 0", textAlign:"center" }}>
            <p style={{ fontSize:36, marginBottom:10 }}>🔍</p>
            <p style={{ fontSize:14, fontWeight:700, color:TEXT, marginBottom:4 }}>결과가 없어요</p>
            <p style={{ fontSize:12, color:MUTED }}>검색어나 필터를 바꿔보세요</p>
          </div>
        ) : sorted.map(p=>{
          const m = CAT_META[p.category];
          return (
            <button key={p.id} onClick={()=>onSelectProduct(p.id)} style={{ backgroundColor:CARD, borderRadius:13, border:`1px solid ${DIV}`, padding:"11px 13px", display:"flex", alignItems:"center", gap:11, textAlign:"left", width:"100%", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
              {/* Category icon */}
              <div style={{ width:40, height:40, borderRadius:11, backgroundColor:m.tint, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{m.icon}</div>
              {/* Info */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:3 }}>
                  <TypeBadge type={p.type}/>
                  {p.isUrgent&&<span style={{ fontSize:9, fontWeight:700, color:"#7A5100", backgroundColor:"#FFEFD6", padding:"1px 6px", borderRadius:99 }}>마감임박</span>}
                </div>
                <p style={{ fontSize:13, fontWeight:800, color:TEXT, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</p>
                <p style={{ fontSize:10, color:MUTED, marginTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.provider} · {p.period}</p>
                <p style={{ fontSize:11, color:m.color, fontWeight:600, marginTop:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.benefit}</p>
              </div>
              {/* Right: annual benefit */}
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <p style={{ fontSize:13, fontWeight:900, color:m.color, ...mono }}>{p.annualBenefit.toLocaleString()}</p>
                <p style={{ fontSize:9, color:MUTED }}>만원/년</p>
                <ChevronRight size={13} color={DIV} style={{ marginTop:4 }}/>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Detail Screen
// ─────────────────────────────────────────────
function DetailScreen({ product, onBack }: { product:Product; onBack:()=>void }) {
  const [monthly, setMonthly] = useState(500000);
  const m = CAT_META[product.category];
  const isSavings = product.category==="savings";
  const years = parseInt(product.period)||1;
  const rate = parseFloat(product.interestRate.replace(/[^0-9.]/g,""))/100||0.045;
  const estimated = Math.round(monthly*years*12*(1+(rate*years)/2));

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", backgroundColor:BG, ...kr }}>
      <div style={{ backgroundColor:CARD, borderBottom:`1px solid ${DIV}` }}>
        <div style={{ display:"flex", alignItems:"center", padding:"0 6px", minHeight:52 }}>
          <button onClick={onBack} style={{ width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center" }}><ArrowLeft size={20} color={TEXT}/></button>
          <span style={{ flex:1, fontSize:15, fontWeight:800, color:TEXT, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{product.name}</span>
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto" }}>
        {/* Hero */}
        <div style={{ padding:18, background:m.grad, color:"white" }}>
          <div style={{ display:"flex", gap:6, marginBottom:10 }}>
            <TypeBadge type={product.type}/>
            <span style={{ fontSize:9, fontWeight:600, backgroundColor:"rgba(255,255,255,0.2)", color:"white", padding:"2px 8px", borderRadius:99 }}>{m.icon} {m.label}</span>
          </div>
          <h2 style={{ fontSize:20, fontWeight:900, marginBottom:2, letterSpacing:"-0.02em" }}>{product.name}</h2>
          <p style={{ color:"rgba(255,255,255,0.55)", fontSize:12, marginBottom:14 }}>{product.provider}</p>
          <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
            <div><p style={{ color:"rgba(255,255,255,0.5)", fontSize:9, marginBottom:2 }}>핵심 혜택</p><p style={{ fontWeight:700, fontSize:14 }}>{product.benefit}</p></div>
            {product.supportAmount&&<div><p style={{ color:"rgba(255,255,255,0.5)", fontSize:9, marginBottom:2 }}>지원 금액</p><p style={{ fontWeight:700, fontSize:14 }}>{product.supportAmount}</p></div>}
            {isSavings&&<div><p style={{ color:"rgba(255,255,255,0.5)", fontSize:9, marginBottom:2 }}>만기 수령</p><p style={{ fontWeight:700, fontSize:14 }}>{product.expectedReturn}</p></div>}
          </div>
        </div>

        {/* Annual benefit */}
        <div style={{ margin:"12px 13px 0", borderRadius:13, padding:"13px 14px", backgroundColor:m.tint, display:"flex", alignItems:"center", gap:11 }}>
          <div style={{ width:42,height:42,borderRadius:11,backgroundColor:`${m.color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:21,flexShrink:0 }}>{m.icon}</div>
          <div>
            <p style={{ fontSize:10, fontWeight:600, color:m.color, marginBottom:2 }}>예상 연간 혜택</p>
            <p style={{ fontSize:22, fontWeight:900, color:m.color, lineHeight:1, ...mono }}>{product.annualBenefit.toLocaleString()}<span style={{ fontSize:13, marginLeft:2 }}>만원</span></p>
            <p style={{ fontSize:10, color:MUTED, marginTop:3 }}>연간 추정 기준 · 실제와 다를 수 있음</p>
          </div>
        </div>

        {/* Key numbers */}
        <div style={{ margin:"10px 13px 0", backgroundColor:CARD, borderRadius:13, border:`1px solid ${DIV}`, overflow:"hidden" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1px 1fr 1px 1fr" }}>
            {[{label:isSavings?"금리":"지원기간",value:isSavings?product.interestRate:product.period},{label:"기간",value:product.period},{label:isSavings?"월 한도":"마감일",value:isSavings?product.monthlyLimit:product.deadline}].map(({label,value},i)=>(
              <React.Fragment key={label}>
                {i>0&&<div style={{ backgroundColor:DIV }}/>}
                <div style={{ padding:"11px 4px", textAlign:"center" }}>
                  <p style={{ fontSize:9, fontWeight:600, color:MUTED, letterSpacing:"0.03em", marginBottom:5 }}>{label}</p>
                  <p style={{ fontSize:12, fontWeight:900, color:TEXT, ...mono }}>{value}</p>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Description */}
        <div style={{ margin:"10px 13px 0", backgroundColor:CARD, borderRadius:13, border:`1px solid ${DIV}`, padding:13 }}>
          <p style={{ fontSize:13, color:"#5A5850", lineHeight:1.7 }}>{product.description}</p>
        </div>

        {/* Conditions */}
        <div style={{ margin:"10px 13px 0", backgroundColor:CARD, borderRadius:13, border:`1px solid ${DIV}`, padding:13 }}>
          <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:11 }}><FileText size={13} color={m.color}/><p style={{ fontSize:13, fontWeight:800, color:TEXT }}>신청 조건 체크</p></div>
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {product.conditions.map((c,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:9, padding:"9px 11px", borderRadius:10, backgroundColor:c.met?"#E6F0E6":"#F9DEDC" }}>
                <div style={{ width:18,height:18,borderRadius:99,backgroundColor:c.met?GRN:"#B3261E",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>{c.met?<Check size={9} color="white"/>:<X size={9} color="white"/>}</div>
                <span style={{ flex:1, fontSize:12, fontWeight:500, color:c.met?"#1B5E20":"#B3261E" }}>{c.text}</span>
                <span style={{ fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:99, backgroundColor:c.met?"#C8E6C9":"#FFCDD2", color:c.met?GRN:"#C62828" }}>{c.met?"충족":"미충족"}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Calculator */}
        {isSavings&&(
          <div style={{ margin:"10px 13px 0", backgroundColor:CARD, borderRadius:13, border:`1px solid ${DIV}`, padding:13 }}>
            <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:13 }}><TrendingUp size={13} color={m.color}/><p style={{ fontSize:13, fontWeight:800, color:TEXT }}>수령액 시뮬레이션</p></div>
            <p style={{ fontSize:10, fontWeight:700, color:MUTED, marginBottom:7 }}>월 납입액</p>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:7 }}>
              <span style={{ fontSize:20, fontWeight:900, color:TEXT, ...mono }}>{(monthly/10000).toFixed(0)}만원</span>
              <span style={{ fontSize:11, color:MUTED }}>/ 월</span>
            </div>
            <input type="range" min={100000} max={700000} step={50000} value={monthly} onChange={e=>setMonthly(Number(e.target.value))} style={{ width:"100%", accentColor:m.color, marginBottom:4 }}/>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:MUTED, marginBottom:13 }}><span>10만원</span><span>70만원</span></div>
            <div style={{ borderRadius:12, padding:13, textAlign:"center", backgroundColor:m.tint }}>
              <p style={{ fontSize:11, color:"#5A5850", marginBottom:4 }}>{product.period} 만기 예상 수령액</p>
              <p style={{ fontSize:24, fontWeight:900, color:m.color, lineHeight:1, ...mono }}>{estimated.toLocaleString()}<span style={{ fontSize:14, marginLeft:2 }}>원</span></p>
              <p style={{ fontSize:9, color:MUTED, marginTop:5 }}>* 정부지원금 포함 추정치</p>
            </div>
          </div>
        )}

        {/* Documents */}
        <div style={{ margin:"10px 13px 14px", backgroundColor:CARD, borderRadius:13, border:`1px solid ${DIV}`, padding:13 }}>
          <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:11 }}><FileText size={13} color={m.color}/><p style={{ fontSize:13, fontWeight:800, color:TEXT }}>필요 서류</p></div>
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {product.documents.map((doc,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:9 }}>
                <div style={{ width:20,height:20,borderRadius:99,backgroundColor:m.tint,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:10,fontWeight:700,color:m.color }}>{i+1}</div>
                <span style={{ fontSize:13, color:TEXT }}>{doc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding:"10px 14px 14px", backgroundColor:CARD, borderTop:`1px solid ${DIV}` }}>
        <button style={{ width:"100%", minHeight:50, borderRadius:99, backgroundColor:m.color, color:"white", fontWeight:700, fontSize:15, display:"flex", alignItems:"center", justifyContent:"center", gap:7, border:"none", ...kr }}>
          신청하러 가기 <ExternalLink size={15}/>
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MyPage Screen — 재설계 button at bottom
// ─────────────────────────────────────────────
function MyPageScreen({ plan, onRePlan }: { plan:PlanInfo; onRePlan:()=>void }) {
  const apps = [
    { name:"청년도약계좌",     status:"심사중",  date:"2025.01.15", bg:"#FFEFD6", fg:"#7A5100" },
    { name:"KB 청년우대 적금", status:"신청완료", date:"2025.01.10", bg:"#E6F0E6", fg:"#1B5E20" },
    { name:"청년주택드림청약", status:"완료",    date:"2024.12.01", bg:"#E4EFEA", fg:"#1B5E3A" },
  ];
  return (
    <div style={{ height:"100%", overflowY:"auto", backgroundColor:BG, ...kr }}>
      <div style={{ backgroundColor:CARD, padding:"12px 16px 16px", borderBottom:`1px solid ${DIV}` }}>
        <h1 style={{ fontSize:18, fontWeight:900, color:TEXT, marginBottom:14 }}>마이페이지</h1>
        <div style={{ borderRadius:18, padding:15, display:"flex", alignItems:"center", gap:12, background:"linear-gradient(145deg,#1B5E20,#2E7D32)", boxShadow:"0 4px 14px rgba(46,125,50,0.25)" }}>
          <div style={{ width:52,height:52,borderRadius:99,backgroundColor:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24 }}>👤</div>
          <div style={{ flex:1 }}>
            <p style={{ color:"white", fontWeight:800, fontSize:15 }}>김청년</p>
            <p style={{ color:"rgba(255,255,255,0.6)", fontSize:11, marginTop:1 }}>만 {plan.age}세 · {plan.city.replace("특별시","").replace("광역시","").replace("특별자치도","").replace("도","")}</p>
            <p style={{ color:"rgba(255,255,255,0.6)", fontSize:11 }}>{plan.income}분위 소득 · {plan.household==="single"?"1인가구":"가족 있음"}</p>
          </div>
        </div>
      </div>

      {/* Plan summary */}
      <div style={{ margin:"13px 13px 0", backgroundColor:CARD, borderRadius:15, border:`1px solid ${DIV}`, padding:13 }}>
        <p style={{ fontSize:13, fontWeight:800, color:TEXT, marginBottom:11 }}>내 저축 설계</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
          {[
            {icon:"📅",label:"나이",value:`만 ${plan.age}세`},
            {icon:"🎯",label:"목표 원금",value:`${(plan.targetAmount/10000).toFixed(0)}만원`},
            {icon:"💵",label:"월 납입액",value:`${(plan.monthlySavings/10000).toFixed(0)}만원`},
            {icon:"💰",label:"소득분위",value:`${plan.income}분위`},
            {icon:"📍",label:"거주지",value:plan.city.replace("특별시","").replace("광역시","")},
            {icon:"📌",label:"관심 분야",value:plan.interestCategories.map(c=>CAT_META[c].icon).join(" ")},
          ].map(({icon,label,value})=>(
            <div key={label} style={{ backgroundColor:"#F5F2EC", borderRadius:11, padding:"9px 11px" }}>
              <p style={{ fontSize:10, color:MUTED }}>{icon} {label}</p>
              <p style={{ fontSize:13, fontWeight:700, color:TEXT, marginTop:2 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Application tracker */}
      <div style={{ margin:"10px 13px 0", backgroundColor:CARD, borderRadius:15, border:`1px solid ${DIV}`, padding:13 }}>
        <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:11 }}><Target size={13} color={GRN}/><p style={{ fontSize:13, fontWeight:800, color:TEXT }}>신청 진행 현황</p></div>
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          {apps.map(({name,status,date,bg,fg})=>(
            <div key={name} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 11px", borderRadius:11, backgroundColor:"#F5F2EC" }}>
              <div style={{ width:30,height:30,borderRadius:9,backgroundColor:bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:14 }}>📋</div>
              <div style={{ flex:1 }}><p style={{ fontSize:12, fontWeight:700, color:TEXT }}>{name}</p><p style={{ fontSize:10, color:MUTED }}>신청일 {date}</p></div>
              <span style={{ fontSize:10, fontWeight:700, backgroundColor:bg, color:fg, padding:"3px 9px", borderRadius:99 }}>{status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div style={{ margin:"10px 13px 0", backgroundColor:CARD, borderRadius:15, border:`1px solid ${DIV}`, overflow:"hidden" }}>
        {[{icon:"🔔",label:"알림 설정"},{icon:"📋",label:"개인정보 처리방침"},{icon:"❓",label:"고객센터"}].map(({icon,label},i,arr)=>(
          <button key={label} style={{ width:"100%", display:"flex", alignItems:"center", gap:11, padding:"13px 14px", borderBottom:i<arr.length-1?`1px solid ${DIV}`:"none", minHeight:50, textAlign:"left", ...kr }}>
            <span style={{ fontSize:17 }}>{icon}</span>
            <span style={{ flex:1, fontSize:13, fontWeight:500, color:TEXT }}>{label}</span>
            <ChevronRight size={14} color={MUTED}/>
          </button>
        ))}
      </div>

      {/* 재설계 button — prominent at bottom */}
      <div style={{ margin:"20px 13px 28px" }}>
        <button onClick={onRePlan} style={{ width:"100%", minHeight:50, borderRadius:99, backgroundColor:"#1B1B18", color:"white", fontWeight:700, fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", gap:7, border:"none", ...kr }}>
          <RefreshCw size={15}/> 설계 재입력
        </button>
        <p style={{ textAlign:"center", fontSize:11, color:MUTED, marginTop:8 }}>나이·소득·목표 등 설계 조건을 다시 입력할 수 있어요</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Root App
// ─────────────────────────────────────────────
const DEFAULT_PLAN: PlanInfo = {
  age:26, city:"서울특별시", district:"", income:4, incomeAmt:"",
  hasSavings:false, hasDebt:false, employment:"employed", household:"single",
  monthlySavings:700000, targetAmount:50000000,
  interestCategories:["savings","support"],
};

export default function App() {
  const previewMode = new URLSearchParams(window.location.search).get("preview");
  if (previewMode === "plan") {
    return <PlanPrototype />;
  }
  if (previewMode === "plan-v2") {
    return <SavingsPlanV2Prototype />;
  }
  if (previewMode === "onboarding") {
    return <PlanPrototype clientId="demo-device" onSaved={() => window.location.assign(window.location.pathname)} />;
  }
  if (previewMode !== "legacy" && previewMode !== "design") {
    return <SavingsPrototype />;
  }
  if (new URLSearchParams(window.location.search).get("preview") === "design") {
    return <DesignPreview />;
  }
  if (new URLSearchParams(window.location.search).get("preview") === "savings") {
    return <SavingsPrototype />;
  }
  const [screen, setScreen]       = useState<Screen>("onboarding");
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [selectedId, setSelectedId] = useState<string|null>(null);
  const [prevScreen, setPrevScreen] = useState<Screen>("home");
  const [plan, setPlan]           = useState<PlanInfo>(DEFAULT_PLAN);
  const [planDone, setPlanDone]   = useState(false);
  const [backendRecs, setBackendRecs] = useState<RecommendResult[]|null>(null);
  const [backendRecsLoading, setBackendRecsLoading] = useState(false);

  const showNav = !["onboarding","plan","detail"].includes(screen);

  const handleTab = (tab: Tab) => {
    setActiveTab(tab);
    setScreen(tab as unknown as Screen);
  };

  const openDetail = (id:string, from:Screen="home") => {
    setSelectedId(id); setPrevScreen(from); setScreen("detail");
  };

  const handlePlanComplete = (p: PlanInfo) => {
    setPlan(p); setPlanDone(true);
    setScreen("home"); setActiveTab("home");

    // 연소득을 정확히 입력한 경우에만 백엔드 추천을 시도한다 (분위만으로는 금액을 추정하지 않음).
    setBackendRecs(null);
    const personalIncome = Number(p.incomeAmt);
    if (personalIncome > 0) {
      const periodMonths = Math.max(1, Math.ceil(p.targetAmount / p.monthlySavings));
      setBackendRecsLoading(true);
      fetchRecommendations({
        monthly_amount: Math.round(p.monthlySavings / 10000),
        period_months: periodMonths,
        age: p.age,
        personal_income: Math.round(personalIncome),
        income_bracket: p.income,
      })
        .then(setBackendRecs)
        .finally(() => setBackendRecsLoading(false));
    }
  };

  const product = selectedId ? PRODUCTS.find(p=>p.id===selectedId)??null : null;

  const render = () => {
    switch (screen) {
      case "onboarding": return <OnboardingScreen onComplete={()=>setScreen("plan")}/>;
      case "plan":       return <PlanScreen onComplete={handlePlanComplete} initialData={planDone?plan:undefined}/>;
      case "home":       return <HomeScreen plan={plan} onSelectProduct={id=>openDetail(id,"home")} backendRecs={backendRecs} backendRecsLoading={backendRecsLoading}/>;
      case "savings":    return <SavingsScreen onSelectProduct={id=>openDetail(id,"savings")}/>;
      case "explore":    return <ExploreScreen onSelectProduct={id=>openDetail(id,"explore")} plan={plan}/>;
      case "detail":     return product ? <DetailScreen product={product} onBack={()=>setScreen(prevScreen)}/> : null;
      case "mypage":     return <MyPageScreen plan={plan} onRePlan={()=>setScreen("plan")}/>;
    }
  };

  return (
    <div style={{ minHeight:"100vh", backgroundColor:"#1A1A1A", display:"flex", justifyContent:"center" }}>
      <div style={{ width:"100%", maxWidth:430, height:"100vh", display:"flex", flexDirection:"column", overflow:"hidden", backgroundColor:BG, position:"relative" }}>
        <div style={{ flex:1, overflow:"hidden", position:"relative" }}>
          <div style={{ position:"absolute", inset:0, overflow:"hidden" }}>{render()}</div>
        </div>
        {showNav && <BottomNav activeTab={activeTab} onTab={handleTab}/>}
      </div>
    </div>
  );
}
