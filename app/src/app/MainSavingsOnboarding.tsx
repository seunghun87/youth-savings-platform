import { useState } from "react";
import { ArrowRight, Check, PiggyBank, Plus, Target, Trash2, UserRound } from "lucide-react";
import { addEnrolledProduct, fetchRecommendations, updateSavingsPlan, updateUserProfile } from "./lib/api";
import "./savings-onboarding.css";

type Product = { id:number; name:string; rate:string; start:string; maturity:string; monthly:string };
const blank=(id:number):Product=>({id,name:"",rate:"",start:"",maturity:"",monthly:""});

export default function MainSavingsOnboarding({clientId,onComplete}:{clientId:string;onComplete:()=>Promise<void>|void}) {
  const [step,setStep]=useState(0),[saving,setSaving]=useState(false),[error,setError]=useState("");
  const [products,setProducts]=useState<Product[]>([blank(1)]);
  const [v,setV]=useState({name:"",age:26,city:"서울특별시",income:3600,current:0,monthly:700000,target:50000000});
  const set=(key:string,value:string|number)=>setV(x=>({...x,[key]:value}));
  const update=(id:number,key:keyof Omit<Product,"id">,value:string)=>setProducts(xs=>xs.map(x=>x.id===id?{...x,[key]:value}:x));
  const existingMonthly=products.reduce((sum,p)=>sum+(Number(p.monthly)||0),0), totalMonthly=v.monthly+existingMonthly;
  const add=()=>setProducts(xs=>[...xs,blank(Math.max(...xs.map(x=>x.id),0)+1)]);
  const remove=(id:number)=>setProducts(xs=>xs.length===1?[blank(xs[0].id)]:xs.filter(x=>x.id!==id));
  const finish=async()=>{
    const entered=products.filter(p=>p.name.trim());
    if(!v.name.trim()||v.current<0||v.current>v.target||v.monthly<10000||entered.some(p=>!p.start||!p.maturity||Number(p.monthly)<=0||Number(p.rate)<0)){setError("입력한 정보와 저축 상품 내용을 다시 확인해주세요.");return}
    setSaving(true);setError("");
    try{
      await updateSavingsPlan(clientId,{target_amount:v.target,monthly_target:v.monthly,current_amount:v.current});
      await Promise.all(entered.map((p,i)=>addEnrolledProduct(clientId,{product_id:`onboarding-${Date.now()}-${i}`,product_name:p.name.trim(),bank:"직접 입력",status:"가입완료",applied_at:p.start,started_at:p.start,matures_at:p.maturity,interest_rate:Number(p.rate),monthly_amount:Number(p.monthly)})));
      await fetchRecommendations({monthly_amount:Math.round(totalMonthly/10000),period_months:Math.max(1,Math.ceil((v.target-v.current)/Math.max(1,totalMonthly))),age:v.age,personal_income:v.income,is_homeowner:false,income_reported:true});
      await updateUserProfile(clientId,{name:v.name.trim(),age:v.age,city:v.city,annual_income:v.income,is_homeowner:false,income_reported:true,onboarding_completed:true});
      await onComplete();
    }catch(e){setError(e instanceof Error?e.message:"저장 중 문제가 발생했습니다.")}finally{setSaving(false)}
  };
  return <div className="so-shell">
    <header><b>모아</b><span>{step+1} / 4</span></header><div className="so-progress"><i style={{width:`${(step+1)*25}%`}}/></div>
    <main>
      {step===0?<div className="so-question"><i><UserRound/></i><p>먼저 알려주세요</p><h1>어떻게 불러드릴까요?</h1><label>이름<input value={v.name} onChange={e=>set("name",e.target.value)} placeholder="이름을 입력해주세요"/></label><div className="so-two"><label>나이<input type="number" value={v.age} onChange={e=>set("age",Number(e.target.value))}/></label><label>거주 지역<select value={v.city} onChange={e=>set("city",e.target.value)}><option>서울특별시</option><option>경기도</option><option>인천광역시</option><option>부산광역시</option><option>기타</option></select></label></div></div>
      :step===1?<div className="so-question so-assets"><i><PiggyBank/></i><p>현재 진행 상황에 반영해요</p><h1>지금까지 모은 돈과<br/>저축 상품을 알려주세요</h1><label>현재 총 저축액<small>원</small><input type="number" value={v.current} onChange={e=>set("current",Number(e.target.value))}/></label><div className="so-product-heading"><div><b>현재 들고 있는 저축 상품</b><span>없다면 비워두고 넘어가도 돼요.</span></div><em>{products.filter(p=>p.name.trim()).length}개</em></div><div className="so-product-list">{products.map((p,i)=><section className="so-product-form" key={p.id}><div><b>저축 상품 {i+1}</b><button onClick={()=>remove(p.id)} aria-label="상품 삭제"><Trash2 size={15}/></button></div><label>저축 상품명<input placeholder="예: 청년도약계좌" value={p.name} onChange={e=>update(p.id,"name",e.target.value)}/></label><div className="so-product-grid"><label>금리<small>%</small><input type="number" inputMode="decimal" placeholder="4.5" value={p.rate} onChange={e=>update(p.id,"rate",e.target.value)}/></label><label>월 납입액<small>원</small><input type="number" placeholder="300000" value={p.monthly} onChange={e=>update(p.id,"monthly",e.target.value)}/></label><label>시작일<input type="date" value={p.start} onChange={e=>update(p.id,"start",e.target.value)}/></label><label>만기일<input type="date" value={p.maturity} onChange={e=>update(p.id,"maturity",e.target.value)}/></label></div></section>)}</div><button className="so-add-product" onClick={add}><Plus size={17}/> 저축 상품 추가</button></div>
      :step===2?<div className="so-question"><i><PiggyBank/></i><p>상품 추천에 사용해요</p><h1>앞으로의 저축 여력을<br/>알려주세요</h1><label>연소득<small>만원</small><input type="number" value={v.income} onChange={e=>set("income",Number(e.target.value))}/></label><label>추가로 저축 가능한 금액<small>원</small><input type="number" value={v.monthly} onChange={e=>set("monthly",Number(e.target.value))}/></label><div className="so-presets">{[300000,500000,700000,1000000].map(n=><button key={n} className={v.monthly===n?"selected":""} onClick={()=>set("monthly",n)}>{n/10000}만 원</button>)}</div>{existingMonthly>0&&<div className="so-monthly-total"><span>기존 상품 포함 월 저축액</span><b>{totalMonthly.toLocaleString()}원</b></div>}</div>
      :<div className="so-question"><i><Target/></i><p>마지막 단계예요</p><h1>얼마를 모으고 싶나요?</h1><label>목표 금액<small>원</small><input type="number" value={v.target} onChange={e=>set("target",Number(e.target.value))}/></label><div className="so-presets so-targets">{[10000000,30000000,50000000,100000000].map(n=><button key={n} className={v.target===n?"selected":""} onClick={()=>set("target",n)}>{n/10000000}천만</button>)}</div><div className="so-preview"><span>예상 목표 기간</span><strong>{Math.ceil(Math.max(0,v.target-v.current)/Math.max(1,totalMonthly)/12)}년</strong><p>현재 저축액과 기존 상품 월 납입액을 모두 반영했어요.</p></div></div>}
    </main>
    {error&&<div className="so-error" role="alert">{error}</div>}<footer>{step>0&&<button className="back" onClick={()=>setStep(x=>x-1)}>이전</button>}<button className="next" disabled={saving||(step===0&&!v.name.trim())} onClick={()=>step<3?setStep(x=>x+1):finish()}>{saving?"플랜 만드는 중":step===3?<>내 플랜 만들기 <Check size={18}/></>:<>다음 <ArrowRight size={18}/></>}</button></footer>
  </div>;
}
