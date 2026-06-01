'use strict';

// ─────────────────────────────────────────────────────────────
// 거래번호 생성기 — 형식: SP-YYYYMMDD-<6자리seq><3자리rand>
//
// payment.service.js 의 generateTxNo 와 동일 알고리즘을 공용 유틸로 제공한다.
// 충전(wallet.service) 등 결제 외 거래도 같은 포맷의 transactionNo 를 생성하기 위함.
// (payment.service 는 결제코어 안정성을 위해 인라인 버전을 그대로 유지 — 중복은 의도된 트레이드오프)
// transactionNo 는 unique 인덱스이므로, 동일 ms 충돌 시 호출부가 E11000 재시도로 처리한다.
// ─────────────────────────────────────────────────────────────

function generateTxNo() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  // 6자리 시퀀스: 시·분·초·밀리초 조합으로 동시 생성 충돌 확률을 낮춘다.
  const seq = String(
    (now.getHours() * 3600000 +
      now.getMinutes() * 60000 +
      now.getSeconds() * 1000 +
      now.getMilliseconds()) %
      1000000
  ).padStart(6, '0');
  const rand = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `SP-${y}${m}${d}-${seq}${rand}`;
}

module.exports = { generateTxNo };
