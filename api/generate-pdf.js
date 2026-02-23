// api/generate-pdf.js
// pdfkit 서버사이드 PDF 생성
// POST /api/generate-pdf  body: insuranceData (JSON)

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

    const doc = new PDFDocument({ size: 'A4', margin: 0,
      info: { Title: 'KB 업무용드론보험 견적서', Author: '배상온 대리점' }
    });

    const today    = new Date();
    const custName = d.corp_name || d.name || '';
    const dateFile = today.getFullYear() +
                     String(today.getMonth()+1).padStart(2,'0') +
                     String(today.getDate()).padStart(2,'0');
    const filename = encodeURIComponent(`KB_업무용드론보험_견적서_${custName}_${dateFile}.pdf`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    doc.pipe(res);

    // 레이아웃
    const PW = 595.28, PH = 841.89;
    const ML = 40, MR = 40, CW = PW - ML - MR;
    let y = 0;

    const GOLD='#FFB800', DARK='#1a1a1a', GRAY='#666666';
    const LGRAY='#f5f5f5', WHITE='#ffffff', AMBER='#fffbea';

    function fillRect(x,ry,w,h,color){ doc.rect(x,ry,w,h).fill(color); }

    function txt(str, x, ty, size, color, bold) {
      doc.font(bold?'Helvetica-Bold':'Helvetica').fontSize(size).fillColor(color)
         .text(String(str), x, ty, { lineBreak: false });
    }

    function txtC(str, ty, size, color, bold) {
      doc.font(bold?'Helvetica-Bold':'Helvetica').fontSize(size).fillColor(color)
         .text(String(str), ML, ty, { width: CW, align: 'center', lineBreak: false });
    }

    function secBar(label, ry) {
      fillRect(ML, ry, CW, 18, DARK);
      txt(label, ML+6, ry+5, 9, GOLD, true);
      return ry+20;
    }

    function droneBar(label, ry) {
      fillRect(ML, ry, CW, 18, GOLD);
      txt(label, ML+6, ry+5, 9, DARK, true);
      return ry+20;
    }

    function dataRow(label, val, ry, alt) {
      if (alt) fillRect(ML, ry, CW, 17, LGRAY);
      txt(safe(label), ML+6, ry+4, 8.5, GRAY, false);
      const v = safe(val); 
      txt(v.length>30 ? v.slice(0,28)+'..' : v, ML+CW*0.42, ry+4, 8.5, DARK, true);
      doc.rect(ML, ry+17, CW, 0.3).fill('#e0e0e0');
      return ry+18;
    }

    function checkPage(need) {
      if (y + need > PH - 50) { doc.addPage({size:'A4',margin:0}); y = 30; }
    }

    const dateStr   = `${today.getFullYear()}. ${today.getMonth()+1}. ${today.getDate()}.`;
    const count     = parseInt(d.drone_count) || 1;
    const drones    = d.drones      || [];
    const plans     = d.drone_plans || [];
    const total     = parseInt(d.plan_total_price || 0);
    const wLabel    = d.drone_weight ? (WEIGHT_LABELS[d.drone_weight] || d.drone_weight) : '-';

    // ① 헤더
    fillRect(0, 0, PW, 50, GOLD);
    txtC('Baesangon - Business Drone Insurance Quote', 13, 14, DARK, true);
    txtC('KB Insurance Official Agency  |  배상온 대리점', 31, 9, '#5a3d00', false);
    y = 60;

    // ② 견적정보 | 고객정보
    const C1W = CW*0.48, C2X = ML+CW*0.52, C2W = CW*0.48;
    fillRect(ML,  y, C1W, 18, DARK); txt('Quote Info',    ML+6,  y+5, 9, GOLD, true);
    fillRect(C2X, y, C2W, 18, DARK); txt('Customer Info', C2X+6, y+5, 9, GOLD, true);
    y += 20;

    let yL = y, yR = y;
    [['Date', dateStr], ['Start', fmtDT(d.insurance_start)],
     ['End', fmtDT(d.insurance_end)], ['Product','KB Business Drone Ins.']
    ].forEach(([l,v],i) => {
      if(i%2) fillRect(ML, yL, C1W, 17, LGRAY);
      txt(l, ML+6, yL+4, 8, GRAY, false);
      txt(safe(v).slice(0,24), ML+C1W*0.44, yL+4, 8, DARK, true);
      doc.rect(ML, yL+17, C1W, 0.3).fill('#e0e0e0');
      yL += 18;
    });

    const cRows = d.corp_name
      ? [['Corp.', d.corp_name], ...(d.corp_number?[['Biz No.', d.corp_number]]:[]),
         ['Phone', d.phone], ['Email', d.email]]
      : [['Name', d.name], ['Phone', d.phone], ['Email', d.email]];
    cRows.forEach(([l,v],i) => {
      if(i%2) fillRect(C2X, yR, C2W, 17, LGRAY);
      txt(l, C2X+6, yR+4, 8, GRAY, false);
      txt(safe(v).slice(0,24), C2X+C2W*0.44, yR+4, 8, DARK, true);
      doc.rect(C2X, yR+17, C2W, 0.3).fill('#e0e0e0');
      yR += 18;
    });
    y = Math.max(yL, yR) + 10;

    // ③ 보험 조건
    checkPage(90);
    y = secBar('Insurance Conditions / 보험 조건', y);
    y = dataRow('Object / 가입물건',         wLabel, y, false);
    y = dataRow('Drones / 드론 대수',         count+' units', y, true);
    y = dataRow('Deductible / 자기부담금', (d.selected_deductible||'10')+' man-won', y, false);
    y += 8;

    // ④ 드론별 정보
    for (let i = 0; i < count; i++) {
      const dr = drones[i]||{}, pl = plans[i]||{};
      checkPage(130);
      y = droneBar(`Drone ${i+1}${pl.plan_name?' ['+pl.plan_name+']':''}`, y);

      let ri = 0;
      y = dataRow('Model / 모델명',  dr.model,     y, (ri++%2)===1);
      y = dataRow('Serial / 시리얼', dr.serial,    y, (ri++%2)===1);
      if (dr.weight)            y = dataRow('Weight / 자체중량',     dr.weight+' kg',     y, (ri++%2)===1);
      if (dr.max_weight)        y = dataRow('MTOW / 최대이륙중량', dr.max_weight+' kg', y, (ri++%2)===1);
      if (pl.coverage_personal) y = dataRow('Liability Personal / 대인배상', pl.coverage_personal, y, (ri++%2)===1);
      if (pl.coverage_property) y = dataRow('Liability Property / 대물배상', pl.coverage_property, y, (ri++%2)===1);

      // 보험료 강조 행
      fillRect(ML, y, CW, 17, AMBER);
      txt('Premium / 보험료', ML+6, y+4, 8.5, GRAY, false);
      txt(comma(pl.price)+' KRW / yr', ML+CW*0.42, y+4, 9, '#b87000', true);
      y += 18; y += 6;
    }

    // ⑤ 연간 총 보험료
    checkPage(55);
    fillRect(ML, y, CW, 46, GOLD);
    txtC('Annual Total Premium / 연간 총 보험료', y+10, 9, DARK, false);
    txtC(comma(total)+' KRW / yr', y+23, 22, DARK, true);
    y += 54;

    // ⑥ 유의사항
    checkPage(50);
    fillRect(ML, y, CW, 42, AMBER);
    txt('Notice / 유의사항', ML+8, y+8, 9, DARK, true);
    doc.font('Helvetica').fontSize(7.5).fillColor(GRAY)
       .text('* Coverage/exclusions and claim payment follow the policy terms.', ML+8, y+22, {width:CW-16,lineBreak:false});
    doc.font('Helvetica').fontSize(7.5).fillColor(GRAY)
       .text('* This quote is for reference only. Final premium is subject to underwriting.', ML+8, y+33, {width:CW-16,lineBreak:false});
    y += 50;

    // ⑦ 푸터
    checkPage(40);
    fillRect(ML, y, CW, 36, DARK);
    txtC('Baesangon Agency / 배상온 대리점', y+8,  11, WHITE, true);
    txtC('liab.on.ins@gmail.com  |  www.liab.co.kr  |  KB Insurance Official Agency', y+23, 8, '#aaaaaa', false);

    doc.end();

  } catch(err) {
    console.error('[generate-pdf]', err);
    if (!res.headersSent) res.status(500).json({ message: 'PDF 생성 실패: '+err.message });
  }
};
