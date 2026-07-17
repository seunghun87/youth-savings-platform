import { useState } from "react";
import { Bell, Bookmark, BriefcaseBusiness, ChevronRight, CircleDollarSign, Compass, FileCheck2, GraduationCap, Home, Landmark, MapPin, PiggyBank, Search, Settings, Target, UserRound, WalletCards } from "lucide-react";
import "./design-preview.css";

const products = [
  { provider: "서민금융진흥원", name: "청년도약계좌", value: "월 최대 70만 원", benefit: "정부기여금 + 비과세", match: "내 조건 4개 중 4개 충족", tag: "가장 잘 맞아요" },
  { provider: "보건복지부", name: "청년내일저축계좌", value: "최대 1,440만 원", benefit: "3년 만기 예상 수령액", match: "내 조건 4개 중 3개 충족", tag: "확인 필요" },
];

type PreviewTab = "home" | "benefits" | "plan" | "my";

function BenefitsPage() {
  const items = [
    { icon:PiggyBank, title:"청년도약계좌", org:"서민금융진흥원", value:"정부기여금 + 비과세", meta:"상시 신청" },
    { icon:Landmark, title:"청년월세 특별지원", org:"국토교통부", value:"월 최대 20만 원", meta:"마감 D-18" },
    { icon:GraduationCap, title:"국가근로장학금", org:"한국장학재단", value:"학기 최대 520만 원", meta:"신청 가능" },
  ];
  return <section className="dp-subpage"><div className="dp-subhead"><p>나에게 맞는 혜택</p><h2>혜택 찾기</h2></div><label className="dp-search"><Search size={18}/><input placeholder="정책이나 금융상품을 검색해보세요" /></label><div className="dp-filter-row"><button className="selected">전체</button><button>저축</button><button>정부지원</button><button>장학금</button></div><div className="dp-found"><div><strong>조건에 맞는 혜택 7개</strong><span>혜택이 큰 순서대로 정리했어요</span></div><button>필터</button></div><div className="dp-benefit-list">{items.map((x,i)=><article className="dp-benefit-row" key={x.title}><i><x.icon size={20}/></i><div><span>{x.org}</span><h3>{x.title}</h3><strong>{x.value}</strong><small className={i===1?"urgent":""}>{x.meta}</small></div><button aria-label="저장"><Bookmark size={18}/></button></article>)}</div></section>;
}

function PlanPage() {
  return <section className="dp-subpage"><div className="dp-subhead"><p>꾸준히 쌓아가는 중이에요</p><h2>내 계획</h2></div><div className="dp-plan-hero"><span>목표 달성률</span><strong>14%</strong><div><i/></div><p><b>700만 원</b> / 5,000만 원</p></div><div className="dp-month-card"><div><span>이번 달 저축</span><strong>42만 원</strong></div><div className="dp-ring"><b>60%</b></div></div><div className="dp-plan-grid"><article><WalletCards size={20}/><span>월 저축 목표</span><strong>70만 원</strong></article><article><Target size={20}/><span>예상 달성일</span><strong>2030. 2</strong></article></div><div className="dp-title-row dp-plan-title"><h2>가입한 상품</h2><button>관리</button></div><article className="dp-saved-product"><i><PiggyBank size={21}/></i><div><span>청년도약계좌</span><strong>5회차 · 350만 원</strong></div><ChevronRight size={19}/></article><button className="dp-primary">계획 수정하기</button></section>;
}

function MyPage() {
  const menus = [{icon:Bookmark,label:"저장한 혜택",desc:"관심 상품 3개"},{icon:FileCheck2,label:"내 가입 조건",desc:"최근 업데이트 오늘"},{icon:MapPin,label:"지역 및 소득 정보",desc:"서울 · 소득 4분위"},{icon:Settings,label:"알림 및 앱 설정",desc:"마감 알림 켜짐"}];
  return <section className="dp-subpage"><div className="dp-subhead"><p>내 정보와 설정</p><h2>마이</h2></div><div className="dp-profile-card"><div className="dp-avatar">민</div><div><strong>김민준</strong><span>만 26세 · 서울특별시</span></div><button>정보 수정</button></div><div className="dp-my-summary"><div><strong>7</strong><span>맞춤 혜택</span></div><div><strong>3</strong><span>저장한 혜택</span></div><div><strong>1</strong><span>가입 상품</span></div></div><div className="dp-menu-group">{menus.map(x=><button key={x.label}><i><x.icon size={19}/></i><div><strong>{x.label}</strong><span>{x.desc}</span></div><ChevronRight size={18}/></button>)}</div><div className="dp-notice"><BriefcaseBusiness size={18}/><span>개인정보는 맞춤 혜택 추천에만 사용돼요.</span></div></section>;
}

export default function DesignPreview() {
  const [tab, setTab] = useState<PreviewTab>("home");
  return (
    <div className="dp-shell">
      <main className="dp-page">
        {tab === "home" && <><header className="dp-header">
          <div><p className="dp-kicker">좋은 아침이에요</p><h1>민준님의 금융 플랜</h1></div>
          <button className="dp-icon-button" aria-label="알림"><Bell size={20}/><span /></button>
        </header>

        <section className="dp-hero">
          <p>올해 받을 수 있는 예상 혜택</p>
          <strong>최대 480만 원</strong>
          <span>입력한 조건으로 7개의 혜택을 찾았어요</span>
          <button>내 혜택 분석 보기 <ChevronRight size={15}/></button>
        </section>

        <section className="dp-section">
          <div className="dp-section-head"><div><span>나의 목표</span><h2>5,000만 원 모으기</h2></div><button>수정</button></div>
          <div className="dp-goal-card">
            <div className="dp-goal-icon"><Target size={20}/></div>
            <div className="dp-goal-main"><div><strong>14%</strong><span>700만 원 달성</span></div><div className="dp-progress"><i /></div><p>월 70만 원씩 모으면 <b>4년 7개월</b> 뒤 달성해요</p></div>
          </div>
        </section>

        <section className="dp-section">
          <div className="dp-title-row"><h2>민준님을 위한 추천</h2><button>전체보기</button></div>
          <div className="dp-product-list">
            {products.map((p, i) => <article className="dp-product" key={p.name}>
              <div className="dp-product-top"><span className={i ? "dp-badge dp-badge-warn" : "dp-badge"}>{p.tag}</span><span className="dp-provider">{p.provider}</span></div>
              <h3>{p.name}</h3>
              <div className="dp-value"><strong>{p.value}</strong><span>{p.benefit}</span></div>
              <div className="dp-reason"><i><span>✓</span></i>{p.match}</div>
              <button className="dp-card-link" aria-label={`${p.name} 상세보기`}><ChevronRight size={20}/></button>
            </article>)}
          </div>
        </section>

        <section className="dp-section dp-last">
          <div className="dp-title-row"><h2>분야별로 찾아보기</h2></div>
          <div className="dp-categories">
            <button><i><PiggyBank size={20}/></i><span>저축</span></button>
            <button><i><Landmark size={20}/></i><span>정부지원</span></button>
            <button><i><CircleDollarSign size={20}/></i><span>장학금</span></button>
          </div>
        </section></>}
        {tab === "benefits" && <BenefitsPage />}
        {tab === "plan" && <PlanPage />}
        {tab === "my" && <MyPage />}
      </main>
      <nav className="dp-nav" aria-label="주요 메뉴">
        <button className={tab==="home"?"active":""} onClick={()=>setTab("home")}><Home size={21}/><span>홈</span></button>
        <button className={tab==="benefits"?"active":""} onClick={()=>setTab("benefits")}><Compass size={21}/><span>혜택 찾기</span></button>
        <button className={tab==="plan"?"active":""} onClick={()=>setTab("plan")}><Target size={21}/><span>내 계획</span></button>
        <button className={tab==="my"?"active":""} onClick={()=>setTab("my")}><UserRound size={21}/><span>마이</span></button>
      </nav>
    </div>
  );
}
