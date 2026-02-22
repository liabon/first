// api/generate-pdf.js
// pdfkit으로 서버사이드 PDF 생성
// 클라이언트에서 POST → PDF 바이너리 반환 → 브라우저 다운로드
// 의존성: npm install pdfkit (package.json에 추가 필요)

const PDFDocument = require('pdfkit');

// 가입물건 라벨
const WEIGHT_LABELS = {
  'under_25kg': '25kg 미만 (의무/업무/영리)',
  '25_100kg':   '25kg 이상 100kg 미만 (의무/업무/영리)',
  'over_100kg': '100kg 이상'
};

function safe(v) {
  return (v != null && v !== '') ? String(v) : '-';
}

function fmtDT(v) {
  return (v || '').replace('T', ' ');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const d = req.body;
    const today = new Date();
    const dateStr = `${today.getFullYear()}.${today.getMonth()+1}.${today.getDate()}`;
    const custName = d.corp_name || d.name || '';
    const count    = parseInt(d.drone_count) || 1;
    const drones   = Array.isArray(d.drones)      ? d.drones      : [];
    const plans    = Array.isArray(d.drone_plans)  ? d.drone_plans : [];
    const total    = parseInt(d.plan_total_price)  || 0;
    const weightLabel = d.drone_weight ? (WEIGHT_LABELS[d.drone_weight] || d.drone_weight) : '-';

    // ── PDF 생성 ──────────────────────────────────────────────
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      info: {
        Title: '배상온 업무용 드론보험 견적서',
        Author: '배상온 대리점'
      }
    });

    const W = 595.28;  // A4 pt width
    const H = 841.89;  // A4 pt height
    const ML = 30, MR = 30;
    const CW = W - ML - MR;  // 내용 폭

    // 색상
    const GOLD   = '#FFB800';
    const DARK   = '#1a1a1a';
    const WHITE  = '#FFFFFF';
    const LGRAY  = '#F5F5F5';
    const DGRAY  = '#666666';
    const LINE   = '#E0E0E0';
    const AMBER  = '#fffbea';

    // 현재 Y 위치 추적
    let y = 0;

    // ── 헬퍼 ──────────────────────────────────────────────────

    // 채운 사각형
    function fillRect(x, ry, w, h, color) {
      doc.rect(x, ry, w, h).fill(color);
    }

    // 선
    function hLine(x, ry, w, color) {
      doc.moveTo(x, ry).lineTo(x + w, ry).stroke(color || LINE);
    }

    // 텍스트 (왼쪽 정렬)
    function textL(str, x, ry, size, color, bold) {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica')
         .fontSize(size)
         .fillColor(color)
         .text(String(str || ''), x, ry, { lineBreak: false });
    }

    // 텍스트 (중앙 정렬, 폭 기준)
    function textC(str, x, ry, w, size, color, bold) {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica')
         .fontSize(size)
         .fillColor(color)
         .text(String(str || ''), x, ry, { width: w, align: 'center', lineBreak: false });
    }

    // 섹션 헤더 바 (어두운 배경, 금색 글씨)
    // 반환: 소비한 높이
    function sectionBar(label, ry, x, w) {
      const h = 18;
      fillRect(x, ry, w, h, DARK);
      textL(label, x + 6, ry + 5, 9, GOLD, true);
      return h;
    }

    // 데이터 행 (라벨 | 값)
    function dataRow(x, ry, w, label, value, alt, goldVal) {
      const h = 18;
      const lw = w * 0.42;
      if (alt) fillRect(x, ry, w, h, LGRAY);
      hLine(x, ry + h, w, LINE);
      textL(label, x + 6, ry + 5, 8, DGRAY, false);
      textL(value, x + lw + 4, ry + 5, 8, goldVal ? '#B87000' : DARK, goldVal);
      return h;
    }

    // 드론 서브헤더 (금색 배경)
    function droneBar(label, ry, x, w) {
      const h = 16;
      fillRect(x, ry, w, h, GOLD);
      textL(label, x + 6, ry + 4, 8.5, DARK, true);
      return h;
    }

    // 새 페이지 필요시 추가
    function checkPage(needed) {
      if (y + needed > H - 30) {
        doc.addPage({ size: 'A4', margin: 0 });
        y = 20;
      }
    }

    // ════════════════════════════════════════════════════════
    // ① 헤더 (≤2cm = ≤56pt)
    // ════════════════════════════════════════════════════════
    y = 0;
    const hdrH = 50;
    fillRect(0, y, W, hdrH, GOLD);
    textC('Baesangon - Business Drone Insurance', ML, y + 12, CW, 11, DARK, false);
    textC('QUOTE / \uACAC\uC801\uC11C', ML, y + 28, CW, 14, DARK, true);
    y += hdrH + 14;

    // ════════════════════════════════════════════════════════
    // ② 견적정보 | 고객정보  2컬럼
    // ════════════════════════════════════════════════════════
    const colW = (CW - 10) / 2;
    const xL = ML;
    const xR = ML + colW + 10;

    let yL = y, yR = y;
    let dh;

    // 왼쪽: 견적 정보
    dh = sectionBar('Quote Info', yL, xL, colW); yL += dh;
    dh = dataRow(xL, yL, colW, 'Date',    dateStr,                   false); yL += dh;
    dh = dataRow(xL, yL, colW, 'Start',   fmtDT(d.insurance_start),  true);  yL += dh;
    dh = dataRow(xL, yL, colW, 'End',     fmtDT(d.insurance_end),   false); yL += dh;
    dh = dataRow(xL, yL, colW, 'Product', 'KB Business Drone Ins.',  true);  yL += dh;

    // 오른쪽: 고객 정보
    dh = sectionBar('Customer Info', yR, xR, colW); yR += dh;
    if (d.corp_name) {
      dh = dataRow(xR, yR, colW, 'Corp.',   safe(d.corp_name),   false); yR += dh;
      if (d.corp_number) {
        dh = dataRow(xR, yR, colW, 'Biz No.', safe(d.corp_number), true); yR += dh;
      }
    } else {
      dh = dataRow(xR, yR, colW, 'Name', safe(d.name), false); yR += dh;
    }
    dh = dataRow(xR, yR, colW, 'Phone', safe(d.phone), true);  yR += dh;
    dh = dataRow(xR, yR, colW, 'Email', safe(d.email), false); yR += dh;

    y = Math.max(yL, yR) + 14;

    // ════════════════════════════════════════════════════════
    // ③ 보험조건 | 드론정보  2컬럼
    // ════════════════════════════════════════════════════════
    checkPage(80);

    const condW  = CW * 0.36;
    const droneW = CW - condW - 10;
    const xCond  = ML;
    const xDrone = ML + condW + 10;

    let yC = y, yD = y;

    // 왼쪽: 보험 조건
    dh = sectionBar('Insurance Conditions', yC, xCond, condW); yC += dh;
    dh = dataRow(xCond, yC, condW, 'Object',     weightLabel,                              false); yC += dh;
    dh = dataRow(xCond, yC, condW, 'Drones',     count + ' unit(s)',                       true);  yC += dh;
    dh = dataRow(xCond, yC, condW, 'Deductible', (d.selected_deductible || '10') + '0,000 KRW', false); yC += dh;

    // 오른쪽: 드론 정보
    dh = sectionBar('Drone Info  (' + count + ' unit' + (count > 1 ? 's' : '') + ')', yD, xDrone, droneW); yD += dh;

    for (let i = 0; i < count; i++) {
      const dr = drones[i] || {};
      const pl = plans[i]  || {};
      const planTxt = pl.plan_name ? ' [' + safe(pl.plan_name) + ']' : '';

      checkPage(60);

      dh = droneBar('Drone ' + (i + 1) + planTxt, yD, xDrone, droneW); yD += dh;
      dh = dataRow(xDrone, yD, droneW, 'Model',  safe(dr.model),  false); yD += dh;
      dh = dataRow(xDrone, yD, droneW, 'Serial', safe(dr.serial), true);  yD += dh;
      if (dr.weight)            { dh = dataRow(xDrone, yD, droneW, 'Weight (Self)', dr.weight + 'kg',     false); yD += dh; }
      if (dr.max_weight)        { dh = dataRow(xDrone, yD, droneW, 'MTOW',          dr.max_weight + 'kg', true);  yD += dh; }
      if (pl.coverage_personal) { dh = dataRow(xDrone, yD, droneW, 'Liability (Personal)', safe(pl.coverage_personal), false); yD += dh; }
      if (pl.coverage_property) { dh = dataRow(xDrone, yD, droneW, 'Liability (Property)', safe(pl.coverage_property), true);  yD += dh; }
      dh = dataRow(xDrone, yD, droneW, 'Premium', parseInt(pl.price || 0).toLocaleString() + ' KRW/yr', false, true); yD += dh;

      if (i < count - 1) yD += 8;
    }

    y = Math.max(yC, yD) + 16;

    // ════════════════════════════════════════════════════════
    // ④ 연간 총 보험료 (≤2cm = ≤56pt)
    // ════════════════════════════════════════════════════════
    checkPage(56);
    const priceH = 50;
    fillRect(ML, y, CW, priceH, GOLD);
    textC('Annual Total Premium', ML, y + 10, CW, 9, DARK, false);
    textC(total.toLocaleString() + ' KRW / yr', ML, y + 24, CW, 16, DARK, true);
    y += priceH + 12;

    // ════════════════════════════════════════════════════════
    // ⑤ 유의사항
    // ════════════════════════════════════════════════════════
    checkPage(52);
    fillRect(ML, y, CW, 52, AMBER);
    textL('Notice', ML + 8, y + 8, 9, DARK, true);
    textL('* Coverage/exclusions and claim payment follow the policy terms.',
          ML + 8, y + 22, 8, DGRAY, false);
    textL('* This quote is for reference only. Final premium is subject to underwriting.',
          ML + 8, y + 36, 8, DGRAY, false);
    y += 64;

    // ════════════════════════════════════════════════════════
    // ⑥ 푸터
    // ════════════════════════════════════════════════════════
    checkPage(42);
    fillRect(ML, y, CW, 42, DARK);
    textC('Baesangon Agency', ML, y + 8, CW, 10, WHITE, true);
    textC('liab.on.ins@gmail.com  |  www.liab.co.kr', ML, y + 22, CW, 8, '#AAAAAA', false);
    textC('KB Son-Hae Insurance Official Agency', ML, y + 32, CW, 7.5, '#888888', false);

    // ── 응답 헤더 & 스트림 ──────────────────────────────────
    const filename = encodeURIComponent(
      'KB_업무용드론보험_견적서_' + custName + '_' +
      today.getFullYear() +
      String(today.getMonth() + 1).padStart(2, '0') +
      String(today.getDate()).padStart(2, '0') + '.pdf'
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);

    doc.pipe(res);
    doc.end();

  } catch (err) {
    console.error('PDF 생성 오류:', err);
    if (!res.headersSent) {
      res.status(500).json({ message: 'PDF 생성 중 오류가 발생했습니다: ' + err.message });
    }
  }
};
