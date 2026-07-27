import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { LoaderCircle } from "lucide-react";
import { isGoogleProviderEnabled, isSupabaseConfigured, supabase } from "./lib/supabase";

const NATIVE_AUTH_REDIRECT = "com.sidepj.savingapp://auth/callback";

const GOOGLE_LOGO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Cpath fill='%23FFC107' d='M43.6 20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7A19.9 19.9 0 0 0 24 4C12.9 4 4 12.9 4 24s8.9 20 20 20c11.6 0 19.3-8.2 19.3-19.7 0-1.3-.1-2.7-.3-4.3z'/%3E%3Cpath fill='%23FF3D00' d='m6.3 14.7 6.6 4.8A12 12 0 0 1 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7A19.9 19.9 0 0 0 6.3 14.7z'/%3E%3Cpath fill='%234CAF50' d='M24 44c5.1 0 9.8-2 13.3-5.2l-6.2-5.2A11.7 11.7 0 0 1 24 36a12 12 0 0 1-11.1-7.5l-6.6 5.1A20 20 0 0 0 24 44z'/%3E%3Cpath fill='%231976D2' d='M43.6 20H24v8h11.3a12 12 0 0 1-4.2 5.6l6.2 5.2c3.9-3.6 6-8.9 6-14.5 0-1.3-.1-2.7-.3-4.3z'/%3E%3C/svg%3E";

export default function AuthGate({
  children,
}: {
  children: (session: Session) => React.ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    supabase.auth.getSession()
      .then(({ data, error: sessionError }) => {
        if (!active) return;
        if (sessionError) setError("로그인 상태를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.");
        setSession(data.session);
      })
      .catch(() => {
        if (active) setError("로그인 상태를 확인하지 못했습니다. 네트워크 연결을 확인해주세요.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = CapacitorApp.addListener("appUrlOpen", async ({ url }) => {
      if (!url.startsWith(NATIVE_AUTH_REDIRECT)) return;
      try {
        const callbackUrl = new URL(url);
        const oauthError = callbackUrl.searchParams.get("error_description") || callbackUrl.searchParams.get("error");
        if (oauthError) throw new Error(decodeURIComponent(oauthError));
        const code = callbackUrl.searchParams.get("code");
        if (!code) throw new Error("로그인 인증 코드를 받지 못했습니다.");
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
      } catch (callbackError) {
        setError(callbackError instanceof Error ? callbackError.message : "Google 로그인 처리에 실패했습니다.");
      } finally {
        setSigningIn(false);
        await Browser.close().catch(() => undefined);
      }
    });
    return () => {
      listener.then(handle => handle.remove());
    };
  }, []);

  const signIn = async () => {
    if (!isSupabaseConfigured) {
      setError("VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 설정해주세요.");
      return;
    }
    setSigningIn(true);
    setError("");
    try {
      if (!await isGoogleProviderEnabled()) {
        throw new Error("Google 로그인이 아직 설정되지 않았습니다. 관리자에게 Google OAuth 활성화를 요청해주세요.");
      }
      const isNative = Capacitor.isNativePlatform();
      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: isNative ? NATIVE_AUTH_REDIRECT : window.location.origin + window.location.pathname,
          skipBrowserRedirect: isNative,
        },
      });
      if (authError) throw authError;
      if (isNative) {
        if (!data.url) throw new Error("Google 로그인 주소를 만들지 못했습니다.");
        await Browser.open({ url: data.url });
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Google 로그인을 시작하지 못했습니다.");
      setSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#F6F2E9" }}>
        <LoaderCircle size={30} color="#2E7D32" className="auth-spinner" />
      </div>
    );
  }
  if (session) return <>{children(session)}</>;

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "linear-gradient(160deg,#142612,#2E7D32)", fontFamily: "Pretendard, sans-serif" }}>
      <section style={{ width: "100%", maxWidth: 390, padding: "38px 28px 30px", borderRadius: 28, background: "#fff", boxShadow: "0 24px 70px rgba(0,0,0,.25)" }}>
        <div style={{ width: 58, height: 58, display: "grid", placeItems: "center", borderRadius: 18, background: "#E6F0E6", fontSize: 28 }}>🌱</div>
        <h1 style={{ margin: "24px 0 10px", color: "#1B1B18", fontSize: 29, lineHeight: 1.25 }}>청년의 내일을<br />함께 모아요</h1>
        <p style={{ margin: "0 0 34px", color: "#77756B", fontSize: 14, lineHeight: 1.65 }}>Google 계정으로 로그인하고 내 저축 플랜과 맞춤 혜택을 안전하게 관리하세요.</p>
        <button onClick={signIn} disabled={signingIn} style={{ width: "100%", minHeight: 54, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, border: "1px solid #D9D7D0", borderRadius: 14, background: "#fff", color: "#252522", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
          {signingIn ? <LoaderCircle size={21} className="auth-spinner" /> : <img src={GOOGLE_LOGO} width="22" height="22" alt="" />}
          Google로 계속하기
        </button>
        {error && <p role="alert" style={{ margin: "14px 0 0", color: "#B42318", fontSize: 12 }}>{error}</p>}
        <p style={{ margin: "22px 4px 0", color: "#AAA79D", fontSize: 11, lineHeight: 1.5, textAlign: "center" }}>로그인하면 서비스 이용약관과 개인정보 처리방침에 동의하게 됩니다.</p>
      </section>
    </main>
  );
}
