// api/generate-pdf.js
// Vercel Serverless: @sparticuz/chromium + puppeteer-core 로 한글 PDF 생성
// npm install @sparticuz/chromium puppeteer-core

let chromium, puppeteer;
try {
  chromium = require('@sparticuz/chromium');
  puppeteer = require('puppeteer-core');
} catch(e) {
  // fallback: 로컬 개발용
  try { puppeteer = require('puppeteer'); } catch(e2) {}
}

const WEIGHT_LABELS = {
  'under_25kg': '25kg 미만 (의무/업무/영리)',
  '25_100kg':   '25kg 이상 100kg 미만 (의무/업무/영리)',
  'over_100kg': '100kg 이상'
};

function safe(v) { return (v != null && v !== '') ? String(v) : '-'; }
function fmtDT(v) { return (v || '').replace('T', ' '); }
function comma(n) { return parseInt(n || 0).toLocaleString('ko-KR'); }

function buildHTML(d) {
  const today   = new Date();
  const dateStr = `${today.getFullYear()}. ${today.getMonth()+1}. ${today.getDate()}.`;
  const count   = parseInt(d.drone_count) || 1;
  const drones  = d.drones      || [];
  const plans   = d.drone_plans || [];
  const total   = parseInt(d.plan_total_price || 0);
  const wLabel  = d.drone_weight ? (WEIGHT_LABELS[d.drone_weight] || d.drone_weight) : '-';
  const deduct  = safe(d.selected_deductible) + '만원';

  // 견적정보 + 고객정보 (2열)
  const custLeft = d.corp_name
    ? `<tr><td class="lb">법인명</td><td class="vl">${safe(d.corp_name)}</td></tr>
       ${d.corp_number ? `<tr><td class="lb">사업자번호</td><td class="vl">${safe(d.corp_number)}</td></tr>` : ''}
       <tr><td class="lb">연락처</td><td class="vl">${safe(d.phone)}</td></tr>
       <tr><td class="lb">이메일</td><td class="vl">${safe(d.email)}</td></tr>`
    : `<tr><td class="lb">이름</td><td class="vl">${safe(d.name)}</td></tr>
       <tr><td class="lb">연락처</td><td class="vl">${safe(d.phone)}</td></tr>
       <tr><td class="lb">이메일</td><td class="vl">${safe(d.email)}</td></tr>`;

  // 보험조건 + 드론정보 (2열용 데이터)
  // 드론별 카드 (2열 그리드)
  let droneCards = '';
  for (let i = 0; i < count; i++) {
    const dr = drones[i] || {};
    const pl = plans[i]  || {};
    droneCards += `
      <div class="drone-card">
        <div class="drone-header">
          <span class="drone-title">드론 ${i+1}</span>
          ${pl.plan_name ? `<span class="plan-badge">${pl.plan_name}</span>` : ''}
        </div>
        <table class="inner-table">
          <tr><td class="lb">모델명</td><td class="vl">${safe(dr.model)}</td></tr>
          <tr class="alt"><td class="lb">시리얼번호</td><td class="vl">${safe(dr.serial)}</td></tr>
          ${dr.weight     ? `<tr><td class="lb">자체중량</td><td class="vl">${dr.weight}kg</td></tr>` : ''}
          ${dr.max_weight ? `<tr class="alt"><td class="lb">최대이륙중량</td><td class="vl">${dr.max_weight}kg</td></tr>` : ''}
          ${pl.coverage_personal ? `<tr><td class="lb">대인배상</td><td class="vl">${pl.coverage_personal}</td></tr>` : ''}
          ${pl.coverage_property ? `<tr class="alt"><td class="lb">대물배상</td><td class="vl">${pl.coverage_property}</td></tr>` : ''}
          <tr class="price-row"><td class="lb">보험료</td><td class="vl price-val">${comma(pl.price)}원/년</td></tr>
        </table>
      </div>`;
  }

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Noto Sans KR', sans-serif;
    font-size: 9pt;
    color: #1a1a1a;
    background: #fff;
    width: 210mm;
  }

  /* ── 헤더 ── */
  .header {
    background: #FFB800;
    padding: 10px 20px 8px;
    text-align: center;
  }
  .header h1 { font-size: 13pt; font-weight: 900; color: #1a1a1a; margin-bottom: 2px; }
  .header p  { font-size: 9pt;  font-weight: 400; color: #1a1a1a; }

  /* ── 본문 ── */
  .body { padding: 10px 18px; }

  /* ── 2열 그리드 섹션 ── */
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }

  /* ── 섹션 카드 ── */
  .card {
    background: #f8f9fa;
    border: 1px solid #e8e8e8;
    border-radius: 6px;
    overflow: hidden;
  }
  .card-title {
    font-size: 8.5pt; font-weight: 700; color: #1a1a1a;
    padding: 6px 10px 5px;
    border-bottom: 1px solid #e8e8e8;
    background: #f8f9fa;
  }
  .card table { width: 100%; border-collapse: collapse; }
  .card table td { padding: 4px 10px; font-size: 8pt; vertical-align: top; }
  .card table .lb { color: #666; width: 42%; font-weight: 400; }
  .card table .vl { color: #1a1a1a; font-weight: 700; }
  .card table tr.alt td { background: #f0f0f0; }

  /* ── 드론 섹션 타이틀 ── */
  .drone-section-title {
    font-size: 9pt; font-weight: 700; color: #1a1a1a;
    margin: 10px 0 6px;
  }

  /* ── 드론 2열 그리드 ── */
  .drone-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }

  /* ── 드론 카드 ── */
  .drone-card {
    background: #fff;
    border: 1.5px solid #e8e8e8;
    border-radius: 6px;
    overflow: hidden;
  }
  .drone-header {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 10px 5px;
    border-bottom: 2px solid #FFB800;
    background: #fff;
  }
  .drone-title { font-size: 9pt; font-weight: 700; color: #FFB800; }
  .plan-badge {
    background: #FFB800; color: #1a1a1a;
    font-size: 7pt; font-weight: 700;
    padding: 1px 7px; border-radius: 10px;
  }
  .inner-table { width: 100%; border-collapse: collapse; }
  .inner-table td { padding: 3.5px 10px; font-size: 8pt; vertical-align: top; }
  .inner-table .lb { color: #666; width: 42%; }
  .inner-table .vl { color: #1a1a1a; font-weight: 700; }
  .inner-table tr.alt td { background: #f8f9fa; }
  .inner-table tr.price-row td { background: #fff9e6; }
  .price-val { color: #b87000 !important; font-weight: 700; }

  /* ── 연간 총 보험료 ── */
  .total-box {
    background: #FFB800;
    border-radius: 8px;
    text-align: center;
    padding: 9px 0 8px;
    margin-bottom: 8px;
  }
  .total-label { font-size: 8.5pt; font-weight: 500; color: #1a1a1a; margin-bottom: 3px; }
  .total-price { font-size: 17pt; font-weight: 900; color: #1a1a1a; }

  /* ── 유의사항 ── */
  .notice {
    background: #fff9e6;
    border-radius: 6px;
    padding: 7px 12px;
    font-size: 7.5pt;
    color: #555;
    line-height: 1.7;
    margin-bottom: 8px;
  }
  .notice strong { color: #1a1a1a; display: block; font-size: 8pt; margin-bottom: 3px; }

  /* ── 푸터 ── */
  .footer {
    background: #1a1a1a;
    color: #fff;
    text-align: center;
    padding: 9px 0 8px;
    border-radius: 6px;
  }
  .footer .fname { font-size: 9pt; font-weight: 700; margin-bottom: 3px; }
  .footer .finfo { font-size: 7.5pt; color: #aaa; margin-bottom: 2px; }
  .footer .fsub  { font-size: 7pt;  color: #888; }
</style>
</head>
<body>

<!-- 헤더 -->
<div class="header">
  <h1>배상온 업무용 드론보험</h1>
  <p>견적서</p>
</div>

<div class="body">

  <!-- 견적정보 + 고객정보 2열 -->
  <div class="two-col" style="margin-top:10px;">
    <div class="card">
      <div class="card-title">📋 견적 정보</div>
      <table>
        <tr><td class="lb">견적일자</td><td class="vl">${dateStr}</td></tr>
        <tr class="alt"><td class="lb">보험시작</td><td class="vl">${fmtDT(d.insurance_start)}</td></tr>
        <tr><td class="lb">보험종료</td><td class="vl">${fmtDT(d.insurance_end)}</td></tr>
        <tr class="alt"><td class="lb">상품명</td><td class="vl">KB손해보험 업무용 드론보험</td></tr>
      </table>
    </div>
    <div class="card">
      <div class="card-title">👤 고객 정보</div>
      <table>${custLeft}</table>
    </div>
  </div>

  <!-- 보험조건 + (드론수 1이면 드론카드) 2열 -->
  <div class="two-col">
    <div class="card">
      <div class="card-title">📄 보험 조건</div>
      <table>
        <tr><td class="lb">가입물건</td><td class="vl" style="font-size:7.5pt;">${wLabel}</td></tr>
        <tr class="alt"><td class="lb">드론 대수</td><td class="vl">${count}대</td></tr>
        <tr><td class="lb">자기부담금</td><td class="vl">${deduct}</td></tr>
      </table>
    </div>
    ${count === 1 ? `
    <div class="drone-card" style="border:1.5px solid #e8e8e8;">
      <div class="drone-header">
        <span class="drone-title">드론 1</span>
        ${plans[0] && plans[0].plan_name ? `<span class="plan-badge">${plans[0].plan_name}</span>` : ''}
      </div>
      <table class="inner-table">
        <tr><td class="lb">모델명</td><td class="vl">${safe((drones[0]||{}).model)}</td></tr>
        <tr class="alt"><td class="lb">시리얼번호</td><td class="vl">${safe((drones[0]||{}).serial)}</td></tr>
        ${(drones[0]||{}).weight     ? `<tr><td class="lb">자체중량</td><td class="vl">${drones[0].weight}kg</td></tr>` : ''}
        ${(drones[0]||{}).max_weight ? `<tr class="alt"><td class="lb">최대이륙중량</td><td class="vl">${drones[0].max_weight}kg</td></tr>` : ''}
        ${(plans[0]||{}).coverage_personal ? `<tr><td class="lb">대인배상</td><td class="vl">${plans[0].coverage_personal}</td></tr>` : ''}
        ${(plans[0]||{}).coverage_property ? `<tr class="alt"><td class="lb">대물배상</td><td class="vl">${plans[0].coverage_property}</td></tr>` : ''}
        <tr class="price-row"><td class="lb">보험료</td><td class="vl price-val">${comma((plans[0]||{}).price)}원/년</td></tr>
      </table>
    </div>` : ''}
  </div>

  <!-- 드론 2대 이상: 별도 2열 그리드 -->
  ${count >= 2 ? `
  <div class="drone-section-title">🚁 드론 정보 (${count}대)</div>
  <div class="drone-grid">${droneCards}</div>
  ` : ''}

  <!-- 연간 총 보험료 -->
  <div class="total-box">
    <div class="total-label">연간 총 보험료</div>
    <div class="total-price">${comma(total)}원</div>
  </div>

  <!-- 유의사항 -->
  <div class="notice">
    <strong>유의사항</strong>
    ※ 구체적인 보장/면책 및 보험금 지급은 약관에 따릅니다.<br>
    ※ 본 견적서는 참고용이며, 최종 보험료는 심사 후 확정됩니다.
  </div>

  <!-- 푸터 -->
  <div class="footer">
    <div class="fname">배상온 대리점</div>
    <div class="finfo">liab.on.ins@gmail.com | www.liab.co.kr</div>
    <div class="fsub">KB손해보험 공식 대리점</div>
  </div>

</div>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  try {
    const d = req.body;
    const today    = new Date();
    const custName = d.corp_name || d.name || '';
    const dateFile = today.getFullYear() +
                     String(today.getMonth()+1).padStart(2,'0') +
                     String(today.getDate()).padStart(2,'0');

    const html = buildHTML(d);

    // ── Puppeteer 실행 ──
    let browser;
    if (chromium) {
      // Vercel serverless 환경
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
    } else {
      // 로컬 개발 환경
      browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    }

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });

    await browser.close();

    const filename = encodeURIComponent(`KB_업무용드론보험_견적서_${custName}_${dateFile}.pdf`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);

  } catch (err) {
    console.error('[generate-pdf]', err);
    if (!res.headersSent) res.status(500).json({ message: 'PDF 생성 실패: ' + err.message });
  }
};
