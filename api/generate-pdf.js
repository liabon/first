// api/generate-pdf.js
// POST /api/generate-pdf  →  PDF 바이너리 다운로드
// 레이아웃: 업로드된 PDF 이미지(document_pdf.pdf) 양식 기준

const PDFDocument = require('pdfkit');

const WEIGHT_LABELS = {
  'under_25kg': '25kg 미만 (의무/업무/영리)',
  '25_100kg':   '25kg 이상 100kg 미만 (의무/업무/영리)',
  'over_100kg': '100kg 이상'
};

function safe(v) { return (v != null && v !== '') ? String(v) : '-'; }
function fmtDT(v) { return (v || '').replace('T', ' '); }
function comma(n) { return parseInt(n || 0).toLocaleString('ko-KR'); }

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  try {
    const d = req.body;

    // ── 기본값 ──
    const today    = new Date();
    const custName = d.corp_name || d.name || '';
    const dateFile = today.getFullYear() +
                     String(today.getMonth()+1).padStart(2,'0') +
                     String(today.getDate()).padStart(2,'0');
    const dateStr  = `${today.getFullYear()}. ${today.getMonth()+1}. ${today.getDate()}.`;
    const count    = parseInt(d.drone_count) || 1;
    const drones   = d.drones      || [];
    const plans    = d.drone_plans || [];
    const total    = parseInt(d.plan_total_price || 0);
    const wLabel   = d.drone_weight ? (WEIGHT_LABELS[d.drone_weight] || d.drone_weight) : '-';
    const deduct   = safe(d.selected_deductible) + '만원';

    // ── 응답 헤더 ──
    const filename = encodeURIComponent(`KB_업무용드론보험_견적서_${custName}_${dateFile}.pdf`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);

    // ── pdfkit 문서 ──
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    doc.pipe(res);

    // ── 레이아웃 상수 ──
    const PW  = 595.28;
    const ML  = 28;
    const MR  = 28;
    const CW  = PW - ML - MR;

    // 색상
    const GOLD   = '#FFB800';
    const DARK   = '#1a1a1a';
    const WHITE  = '#ffffff';
    const GRAY   = '#555555';
    const LGRAY  = '#f8f9fa';
    const LINE   = '#e8e8e8';
    const AMBER  = '#fff9e6';
    const GOLD2  = '#b87000';  // 보험료 텍스트 색

    let y = 0;

    // ── 헬퍼 ──
    function fill(x, ry, w, h, color) {
      doc.rect(x, ry, w, h).fill(color);
    }

    function checkPage(need) {
      if (y + need > 820) { doc.addPage({ size: 'A4', margin: 0 }); y = 24; }
    }

    // 텍스트 (lineBreak:false 기본)
    function t(str, x, ty, opts) {
      opts = opts || {};
      doc
        .font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(opts.size || 10)
        .fillColor(opts.color || DARK)
        .text(String(str || ''), x, ty, { lineBreak: false, ...(opts.wrap ? { width: opts.wrap } : {}) });
    }

    // 가운데 정렬 텍스트
    function tc(str, ty, opts) {
      opts = opts || {};
      doc
        .font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(opts.size || 10)
        .fillColor(opts.color || DARK)
        .text(String(str || ''), ML, ty, { width: CW, align: 'center', lineBreak: false });
    }

    // ─────────────────────────────────────────
    // ① 헤더 (금색 배경)
    // ─────────────────────────────────────────
    fill(0, 0, PW, 70, GOLD);
    tc('배상온 업무용 드론보험', 16, { bold: true, size: 18, color: DARK });
    tc('견적서', 40, { bold: false, size: 11, color: DARK });
    y = 85;

    // ─────────────────────────────────────────
    // 섹션 카드 공통 함수
    // ─────────────────────────────────────────
    function sectionCard(title, rows, altStart) {
      // rows: [ [label, value], ... ]
      const ROW_H = 22;
      const cardH = 14 + rows.length * ROW_H + 12;
      checkPage(cardH + 16);

      // 카드 배경
      fill(ML, y, CW, cardH, LGRAY);
      doc.rect(ML, y, CW, cardH).stroke(LINE);

      // 섹션 타이틀
      t(title, ML + 12, y + 8, { bold: true, size: 10, color: DARK });
      doc.rect(ML, y + 24, CW, 0.5).fill(LINE);

      let ry = y + 26;
      rows.forEach(([label, value], i) => {
        if ((altStart !== false) && i % 2 === 1) {
          fill(ML + 1, ry - 1, CW - 2, ROW_H, '#f0f0f0');
        }
        t(label, ML + 12, ry + 4, { size: 9, color: GRAY });
        const val = safe(value);
        t(val, ML + CW * 0.45, ry + 4, { size: 9, bold: true, color: DARK, wrap: CW * 0.52 });
        ry += ROW_H;
      });

      y += cardH + 14;
    }

    // ─────────────────────────────────────────
    // ② 견적 정보
    // ─────────────────────────────────────────
    sectionCard('📋 견적 정보', [
      ['견적일자',  dateStr],
      ['보험시작',  fmtDT(d.insurance_start)],
      ['보험종료',  fmtDT(d.insurance_end)],
      ['상품명',    'KB손해보험 업무용 드론보험']
    ]);

    // ─────────────────────────────────────────
    // ③ 고객 정보
    // ─────────────────────────────────────────
    const custRows = [];
    if (d.corp_name) {
      custRows.push(['법인명', d.corp_name]);
      if (d.corp_number) custRows.push(['사업자번호', d.corp_number]);
    } else {
      custRows.push(['이름', d.name]);
    }
    custRows.push(['연락처', d.phone], ['이메일', d.email]);
    sectionCard('👤 고객 정보', custRows);

    // ─────────────────────────────────────────
    // ④ 보험 조건
    // ─────────────────────────────────────────
    sectionCard('📄 보험 조건', [
      ['가입물건',   wLabel],
      ['드론 대수',  count + '대'],
      ['자기부담금', deduct]
    ]);

    // ─────────────────────────────────────────
    // ⑤ 드론 정보 섹션 타이틀
    // ─────────────────────────────────────────
    checkPage(24);
    t(`🚁 드론 정보 (${count}대)`, ML, y, { bold: true, size: 11, color: DARK });
    y += 18;

    // ─────────────────────────────────────────
    // ⑥ 드론별 카드
    // ─────────────────────────────────────────
    for (let i = 0; i < count; i++) {
      const dr = drones[i] || {};
      const pl = plans[i]  || {};

      const dataRows = [
        ['모델명',       dr.model],
        ['시리얼번호',   dr.serial],
      ];
      if (dr.weight)            dataRows.push(['자체중량',     dr.weight + 'kg']);
      if (dr.max_weight)        dataRows.push(['최대이륙중량', dr.max_weight + 'kg']);
      if (pl.coverage_personal) dataRows.push(['대인배상',     pl.coverage_personal]);
      if (pl.coverage_property) dataRows.push(['대물배상',     pl.coverage_property]);
      dataRows.push(['보험료', comma(pl.price) + '원/년']);  // 마지막 행

      const ROW_H = 22;
      const HEADER_H = 28;
      const cardH = HEADER_H + dataRows.length * ROW_H + 8;
      checkPage(cardH + 14);

      // 카드 전체 배경
      fill(ML, y, CW, cardH, WHITE);
      doc.rect(ML, y, CW, cardH).stroke(LINE);

      // 드론 헤더 (금색 하단 라인)
      doc.rect(ML, y + HEADER_H - 1, CW, 2).fill(GOLD);
      t(`🚁 드론 ${i + 1}`, ML + 12, y + 9, { bold: true, size: 11, color: GOLD });

      // 플랜 뱃지
      if (pl.plan_name) {
        const bx = ML + 12 + 70;
        fill(bx, y + 7, 44, 16, GOLD);
        t(pl.plan_name, bx + 6, y + 11, { bold: true, size: 8, color: DARK });
      }

      let ry = y + HEADER_H + 4;
      dataRows.forEach(([label, value], ri) => {
        if (ri % 2 === 1) fill(ML + 1, ry - 1, CW - 2, ROW_H, LGRAY);

        const isPrice = label === '보험료';
        t(label, ML + 12, ry + 4, { size: 9, color: GRAY });
        t(safe(value), ML + CW * 0.45, ry + 4, {
          size: 9, bold: true,
          color: isPrice ? GOLD2 : DARK,
          wrap: CW * 0.52
        });
        ry += ROW_H;
      });

      y += cardH + 12;
    }

    // ─────────────────────────────────────────
    // ⑦ 연간 총 보험료
    // ─────────────────────────────────────────
    checkPage(70);
    fill(ML, y, CW, 60, GOLD);
    tc('연간 총 보험료', y + 13, { bold: false, size: 10, color: DARK });
    tc(comma(total) + '원', y + 28, { bold: true, size: 24, color: DARK });
    y += 72;

    // ─────────────────────────────────────────
    // ⑧ 유의사항
    // ─────────────────────────────────────────
    checkPage(55);
    fill(ML, y, CW, 52, AMBER);
    t('유의사항', ML + 12, y + 10, { bold: true, size: 10, color: DARK });
    doc.font('Helvetica').fontSize(8.5).fillColor(GRAY)
       .text('※ 구체적인 보장/면책 및 보험금 지급은 약관에 따릅니다.', ML + 12, y + 25, { width: CW - 24, lineBreak: false });
    doc.font('Helvetica').fontSize(8.5).fillColor(GRAY)
       .text('※ 본 견적서는 참고용이며, 최종 보험료는 심사 후 확정됩니다.', ML + 12, y + 39, { width: CW - 24, lineBreak: false });
    y += 62;

    // ─────────────────────────────────────────
    // ⑨ 푸터
    // ─────────────────────────────────────────
    checkPage(50);
    fill(ML, y, CW, 44, DARK);
    tc('배상온 대리점', y + 10, { bold: true, size: 11, color: WHITE });
    doc.font('Helvetica').fontSize(8.5).fillColor('#aaaaaa')
       .text('liab.on.ins@gmail.com  |  www.liab.co.kr', ML, y + 26, { width: CW, align: 'center', lineBreak: false });
    doc.font('Helvetica').fontSize(8).fillColor('#888888')
       .text('KB손해보험 공식 대리점', ML, y + 38, { width: CW, align: 'center', lineBreak: false });

    doc.end();

  } catch (err) {
    console.error('[generate-pdf]', err);
    if (!res.headersSent) res.status(500).json({ message: 'PDF 생성 실패: ' + err.message });
  }
};
