import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";

const DISMISS_KEY = "moa-ios-install-hint-dismissed";

/**
 * 아이폰은 앱 설치가 불가능해 Safari에서 "홈 화면에 추가"로 사용한다.
 * 사용자가 그 방법을 알기 어려우므로 iOS Safari에서만 한 번 안내한다.
 *
 * 표시 조건: iOS 기기 + 아직 홈 화면에서 실행 중이 아님 + 닫은 적 없음
 */
export default function IosInstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua);
    // iPadOS 13+는 데스크톱 Safari로 위장하므로 터치 지원 여부로 함께 판별한다
    const isIpadOs = ua.includes("Macintosh") && navigator.maxTouchPoints > 1;

    // 이미 홈 화면에서 실행 중이면 안내할 필요가 없다
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      /* 저장소를 못 쓰는 환경에서는 그냥 노출한다 */
    }

    if ((isIos || isIpadOs) && !standalone && !dismissed) setShow(true);
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* 저장 실패는 무시 — 다음에 다시 보일 뿐이다 */
    }
  };

  if (!show) return null;

  return (
    <aside className="ios-hint" role="note">
      <div className="ios-hint-icon" aria-hidden="true">🌱</div>
      <p>
        홈 화면에 추가하면 앱처럼 쓸 수 있어요.
        <br />
        아래 <Share size={13} aria-label="공유" /> 공유 → <b>홈 화면에 추가</b>
      </p>
      <button onClick={dismiss} aria-label="안내 닫기">
        <X size={16} />
      </button>
    </aside>
  );
}
