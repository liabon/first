const nodemailer = require('nodemailer');
const { Pool } = require('pg');

// ──────────────────────────────────────────────
// DB 연결 풀 (POSTGRES_URL 환경변수 필요)
// ──────────────────────────────────────────────
let pool;
function getPool() {
  if (!pool && process.env.liab_db_POSTGRES_URL) {
    pool = new Pool({
      connectionString: process.env.liab_db_POSTGRES_URL,
      ssl: { rejectUnauthorized: false }
    });
  }
  return pool;
}

async function saveToDb(tableName, data) {
  const db = getPool();
  if (!db) return null;
  try {
    const keys   = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const columns      = keys.join(', ');
    const result = await db.query(
      `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders}) RETURNING id`,
      values
    );
    return result.rows[0].id;
  } catch (err) {
    console.error(`DB 저장 실패 (${tableName}):`, err.message);
    return null;
  }
}

// 개인용 드론보험 플랜별 보장내용 반환
function getCoverageDetails(plan) {
  if (!plan) return '<p>플랜 정보 없음</p>';
  let coverage = { personal: '', property: '', additional: '' };

  if (plan.includes('slim'))     { coverage.personal = '50,000,000원';  coverage.property = '50,000,000원'; }
  else if (plan.includes('standard')) { coverage.personal = '100,000,000원'; coverage.property = '100,000,000원'; }
  else if (plan.includes('premium'))  { coverage.personal = '500,000,000원'; coverage.property = '500,000,000원'; }

  if (plan.includes('camera')) {
    if (plan.includes('slim'))     coverage.additional = '기본충실';
    else if (plan.includes('standard')) coverage.additional = '누구나운전 포함';
    else if (plan.includes('premium'))  coverage.additional = '누구나운전 + 구조비용';
  } else if (plan.includes('fpv')) {
    if (plan.includes('slim'))     coverage.additional = '드론경기중 보장';
    else if (plan.includes('standard')) coverage.additional = '드론경기중 + 누구나운전';
    else if (plan.includes('premium'))  coverage.additional = '드론경기중 + 누구나운전 + 구조비용';
  } else {
    if (plan.includes('slim'))     coverage.additional = '기본 보장';
    else if (plan.includes('standard')) coverage.additional = '누구나운전 포함';
    else if (plan.includes('premium'))  coverage.additional = '누구나운전 + 구조비용';
  }

  return `
    <div style="border-left:3px solid #FFB800;padding-left:15px;margin:15px 0;">
      <p style="margin:5px 0;"><strong>대인배상:</strong> ${coverage.personal}</p>
      <p style="margin:5px 0;"><strong>대물배상:</strong> ${coverage.property}</p>
      <p style="margin:5px 0;"><strong>기본보장:</strong> ${coverage.additional}</p>
    </div>
  `;
}

// 가입물건(중량) 라벨
const WEIGHT_LABELS = {
  'under_25kg': '25kg 미만 (의무/업무/영리)',
  '25_100kg':   '25kg 이상 100kg 미만 (의무/업무/영리)',
  'over_100kg': '100kg 이상'
};

// ──────────────────────────────────────────────
// 업무용 드론보험 고객 견적서 이메일 HTML 생성
// ──────────────────────────────────────────────
function buildBusinessDroneEmailHTML(data) {
  const {
    name, corp_name, corp_number, phone, email,
    insurance_start, insurance_end,
    drone_count, drone_weight, selected_deductible,
    drones, drone_plans, plan_total_price
  } = data;

  const custName    = corp_name || name || '';
  const weightLabel = WEIGHT_LABELS[drone_weight] || drone_weight || '미입력';
  const count       = parseInt(drone_count) || 1;
  const dronesArr   = Array.isArray(drones)      ? drones      : [];
  const plansArr    = Array.isArray(drone_plans)  ? drone_plans : [];
  const total       = parseInt(plan_total_price) || 0;

  function fmtDT(s) { return (s || '').replace('T', ' '); }
  function safe(v)  { return (v != null && v !== '') ? String(v) : '미입력'; }

  // 드론별 카드 HTML
  let droneCards = '';
  for (let i = 0; i < count; i++) {
    const dr = dronesArr[i] || {};
    const pl = plansArr[i]  || {};
    droneCards += `
      <div style="border:1px solid #e0e0e0;border-radius:10px;padding:16px;margin:12px 0;background:#fff;">
        <p style="margin:0 0 10px 0;font-weight:800;color:#FFB800;font-size:1rem;border-bottom:2px solid #FFB800;padding-bottom:6px;">
          🚁 드론 ${i + 1}${pl.plan_name ? `  <span style="background:#FFB800;color:#1a1a1a;font-size:0.8rem;padding:2px 8px;border-radius:12px;margin-left:8px;">${pl.plan_name}</span>` : ''}
        </p>
        <table width="100%" cellpadding="4" cellspacing="0" style="font-size:0.9rem;">
          <tr><td style="color:#666;width:35%;">모델명</td><td style="font-weight:600;">${safe(dr.model)}</td></tr>
          <tr style="background:#f9f9f9;"><td style="color:#666;">시리얼번호</td><td style="font-weight:600;">${safe(dr.serial)}</td></tr>
          ${dr.weight ? `<tr><td style="color:#666;">자체중량</td><td style="font-weight:600;">${dr.weight}kg</td></tr>` : ''}
          ${dr.max_weight ? `<tr style="background:#f9f9f9;"><td style="color:#666;">최대이륙중량</td><td style="font-weight:600;">${dr.max_weight}kg</td></tr>` : ''}
          ${pl.coverage_personal ? `<tr><td style="color:#666;">대인배상</td><td style="font-weight:600;">${pl.coverage_personal}</td></tr>` : ''}
          ${pl.coverage_property ? `<tr style="background:#f9f9f9;"><td style="color:#666;">대물배상</td><td style="font-weight:600;">${pl.coverage_property}</td></tr>` : ''}
          <tr><td style="color:#666;">보험료</td><td style="font-weight:700;color:#FFB800;">${parseInt(pl.price || 0).toLocaleString()}원/년</td></tr>
        </table>
      </div>`;
  }

  return `
    <div style="font-family:'Noto Sans KR',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f5f5f5;">

      <!-- 헤더 -->
      <div style="background:#FFB800;padding:28px 30px;text-align:center;">
        <h1 style="color:#1a1a1a;margin:0;font-size:1.4rem;font-weight:900;">배상온 업무용 드론보험</h1>
        <h2 style="color:#1a1a1a;margin:6px 0 0;font-size:1rem;font-weight:600;">견적서</h2>
      </div>

      <div style="padding:24px 20px;background:#fff;">

        <!-- 견적 정보 -->
        <div style="background:#f8f9fa;padding:18px;border-radius:10px;margin-bottom:16px;">
          <h3 style="color:#FFB800;margin:0 0 12px;font-size:1rem;">📋 견적 정보</h3>
          <p style="margin:5px 0;font-size:0.9rem;"><strong>견적일자:</strong> ${new Date().toLocaleDateString('ko-KR')}</p>
          <p style="margin:5px 0;font-size:0.9rem;"><strong>보험시작:</strong> ${fmtDT(insurance_start)}</p>
          <p style="margin:5px 0;font-size:0.9rem;"><strong>보험종료:</strong> ${fmtDT(insurance_end)}</p>
          <p style="margin:5px 0;font-size:0.9rem;"><strong>상품명:</strong> KB손해보험 업무용 드론보험</p>
        </div>

        <!-- 고객 정보 -->
        <div style="background:#f8f9fa;padding:18px;border-radius:10px;margin-bottom:16px;">
          <h3 style="color:#FFB800;margin:0 0 12px;font-size:1rem;">👤 고객 정보</h3>
          ${corp_name ? `<p style="margin:5px 0;font-size:0.9rem;"><strong>법인명:</strong> ${corp_name}</p>` : `<p style="margin:5px 0;font-size:0.9rem;"><strong>이름:</strong> ${safe(name)}</p>`}
          ${corp_number ? `<p style="margin:5px 0;font-size:0.9rem;"><strong>사업자등록번호:</strong> ${corp_number}</p>` : ''}
          <p style="margin:5px 0;font-size:0.9rem;"><strong>연락처:</strong> ${safe(phone)}</p>
          <p style="margin:5px 0;font-size:0.9rem;"><strong>이메일:</strong> ${safe(email)}</p>
        </div>

        <!-- 보험 조건 -->
        <div style="background:#f8f9fa;padding:18px;border-radius:10px;margin-bottom:16px;">
          <h3 style="color:#FFB800;margin:0 0 12px;font-size:1rem;">📑 보험 조건</h3>
          <p style="margin:5px 0;font-size:0.9rem;"><strong>가입물건:</strong> ${weightLabel}</p>
          <p style="margin:5px 0;font-size:0.9rem;"><strong>드론 대수:</strong> ${count}대</p>
          <p style="margin:5px 0;font-size:0.9rem;"><strong>자기부담금:</strong> ${safe(selected_deductible)}만원</p>
        </div>

        <!-- 드론별 상세 -->
        <div style="margin-bottom:16px;">
          <h3 style="color:#FFB800;margin:0 0 8px;font-size:1rem;">🚁 드론 정보 (${count}대)</h3>
          ${droneCards}
        </div>

        <!-- 총 보험료 -->
        <div style="background:#FFB800;padding:20px;border-radius:10px;text-align:center;margin-bottom:16px;">
          <p style="margin:0 0 6px;color:#1a1a1a;font-size:0.95rem;font-weight:600;">연간 총 보험료</p>
          <p style="margin:0;color:#1a1a1a;font-size:2rem;font-weight:900;">${total.toLocaleString()}원</p>
        </div>

        <!-- 유의사항 -->
        <div style="background:#fff9e6;padding:14px;border-radius:8px;font-size:0.85rem;color:#666;">
          <p style="margin:0 0 4px;font-weight:700;color:#1a1a1a;">유의사항</p>
          <p style="margin:3px 0;">※ 구체적인 보장/면책 및 보험금 지급은 약관에 따릅니다.</p>
          <p style="margin:3px 0;">※ 본 견적서는 참고용이며, 최종 보험료는 심사 후 확정됩니다.</p>
        </div>
      </div>

      <!-- 푸터 -->
      <div style="background:#1a1a1a;padding:18px;text-align:center;color:#fff;">
        <p style="margin:0;font-size:0.9rem;font-weight:700;">배상온 대리점</p>
        <p style="margin:5px 0;font-size:0.8rem;color:#aaa;">liab.on.ins@gmail.com | www.liab.co.kr</p>
        <p style="margin:0;font-size:0.75rem;color:#888;">KB손해보험 공식 대리점</p>
      </div>
    </div>`;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const {
      name, phone, email, message, insurance_type,
      departure_date, arrival_date, destination, travel_purpose, travelers,
      birth_date, gender,
      drone_serial, drone_type, drone_count,
      plan, plan_name, plan_price_per_drone, plan_total_price,
      insurance_start, insurance_end,
      drones, drone_plans, plan_selection_type,
      send_to_customer, request_type
    } = req.body;

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.ADMIN_EMAIL) {
      console.error('환경 변수가 설정되지 않았습니다.');
      return res.status(500).json({ message: '서버 설정 오류입니다. 관리자에게 문의해주세요.' });
    }

    // ── DB 저장 ──────────────────────────────────────────────
    // quote_email(견적서 재전송)은 DB 저장 skip (약관 동의 시 이미 저장됨)
    const isQuoteEmailOnly = (request_type === 'quote_email');
    const db = getPool();

    try {
      if (!isQuoteEmailOnly && insurance_type === '개인용 드론보험' && db) {
        const parseDateTime = (str) => {
          if (!str) return { date: null, time: null };
          const parts = str.split('T');
          return { date: parts[0] || null, time: parts[1] || null };
        };
        const start = parseDateTime(insurance_start);
        const end   = parseDateTime(insurance_end);

        const appResult = await db.query(
          `INSERT INTO personal_drone_applications
            (name, birth_date, gender, phone, email,
             coverage_start_date, coverage_start_time,
             coverage_end_date,   coverage_end_time,
             coverage_location, drone_count, plan_mode,
             total_premium, terms_agreed, agreed_at,
             source_page, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
           RETURNING id`,
          [
            name || '', birth_date || '', gender || '', phone || '', email || '',
            start.date, start.time, end.date, end.time, null,
            parseInt(drone_count) || 1,
            plan_selection_type || 'unified',
            parseInt(plan_total_price) || 0,
            true, new Date().toISOString(),
            'personal-drone-insurance-form', 'pending'
          ]
        );
        const applicationId = appResult.rows[0].id;

        const dronesArr = Array.isArray(drones)      ? drones      : [];
        const plansArr  = Array.isArray(drone_plans)  ? drone_plans : [];
        for (let i = 0; i < dronesArr.length; i++) {
          const d = dronesArr[i] || {};
          const p = plansArr[i]  || {};
          await db.query(
            `INSERT INTO drone_details
              (application_id, drone_index,
               model, serial_number, registration_number, weight, max_weight,
               drone_type, drone_type_name, plan, plan_name, price)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
            [
              applicationId, i,
              d.model || '', d.serial || '', d.registration || '',
              d.weight || '', d.max_weight || '',
              p.drone_type || d.type || '',
              p.drone_type_name || '',
              p.plan || plan || '',
              p.plan_name || plan_name || '',
              parseInt(p.price || d.price || 0)
            ]
          );
        }

      } else if (!isQuoteEmailOnly && (insurance_type === '업무용 드론보험' || request_type === 'business_quote') && db) {
        await saveToDb('drone_inquiries', {
          name:           req.body.manager_name || name || '',
          phone:          req.body.manager_phone || phone || '',
          email:          req.body.manager_email || email || '',
          insurance_type: 'business',
          message:        req.body.inquiry || message || '',
          source_page:    'drone-insurance',
          status:         'new'
        });
      }
    } catch (dbErr) {
      console.error('DB 저장 오류 (이메일은 계속 전송):', dbErr.message);
    }

    // ── 이메일 전송 설정 ──────────────────────────────────────
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    // ── 이메일 내용 구성 ──────────────────────────────────────
    let emailSubject = '';
    let emailBody    = '';

    if (insurance_type === '해외여행보험') {
      emailSubject = `[KB손해보험 해외여행보험 문의] ${name}님의 상담 신청`;
      emailBody = `
        <h2>🌍 해외여행보험 상담 신청</h2>
        <div style="background:#f5f5f5;padding:20px;border-radius:10px;margin:20px 0;">
          <h3 style="color:#667eea;margin-top:0;">신청자 정보</h3>
          <p><strong>이름:</strong> ${name}</p>
          <p><strong>연락처:</strong> ${phone}</p>
          <p><strong>이메일:</strong> ${email || '미입력'}</p>
        </div>
        <div style="background:#f0f8ff;padding:20px;border-radius:10px;margin:20px 0;">
          <h3 style="color:#667eea;margin-top:0;">여행 정보</h3>
          <p><strong>출발일:</strong> ${departure_date || '미입력'}</p>
          <p><strong>도착일:</strong> ${arrival_date || '미입력'}</p>
          <p><strong>여행 국가:</strong> ${destination || '미입력'}</p>
          <p><strong>여행 목적:</strong> ${travel_purpose || '미입력'}</p>
          <p><strong>인원 수:</strong> ${travelers || '미입력'}명</p>
        </div>
        ${message ? `<div style="background:#fff9e6;padding:20px;border-radius:10px;margin:20px 0;"><h3 style="color:#FFB800;margin-top:0;">추가 문의사항</h3><p>${message}</p></div>` : ''}
        <hr style="margin:30px 0;border:none;border-top:2px solid #e0e0e0;">
        <p style="color:#999;font-size:14px;">배상온 대리점 웹사이트에서 전송됨</p>`;

    } else if (insurance_type === '국내여행보험') {
      emailSubject = `[KB손해보험 국내여행보험 문의] ${name}님의 상담 신청`;
      emailBody = `
        <h2>🗺️ 국내여행보험 상담 신청</h2>
        <div style="background:#f5f5f5;padding:20px;border-radius:10px;margin:20px 0;">
          <h3 style="color:#11998e;margin-top:0;">신청자 정보</h3>
          <p><strong>이름:</strong> ${name}</p>
          <p><strong>연락처:</strong> ${phone}</p>
          <p><strong>이메일:</strong> ${email || '미입력'}</p>
        </div>
        <div style="background:#e8f5e9;padding:20px;border-radius:10px;margin:20px 0;">
          <h3 style="color:#11998e;margin-top:0;">여행 정보</h3>
          <p><strong>출발일:</strong> ${departure_date || '미입력'}</p>
          <p><strong>도착일:</strong> ${arrival_date || '미입력'}</p>
          <p><strong>여행 지역:</strong> ${destination || '미입력'}</p>
          <p><strong>여행 목적:</strong> ${travel_purpose || '미입력'}</p>
          <p><strong>인원 수:</strong> ${travelers || '미입력'}명</p>
        </div>
        ${message ? `<div style="background:#fff9e6;padding:20px;border-radius:10px;margin:20px 0;"><h3 style="color:#FFB800;margin-top:0;">추가 문의사항</h3><p>${message}</p></div>` : ''}
        <hr style="margin:30px 0;border:none;border-top:2px solid #e0e0e0;">
        <p style="color:#999;font-size:14px;">배상온 대리점 웹사이트에서 전송됨</p>`;

    } else if (insurance_type === '개인용 드론보험') {
      emailSubject = `[KB손해보험 개인용 드론보험 문의] ${name}님의 상담 신청`;
      const droneTypes = { camera:'촬영용 센서드론', fpv:'FPV/레이싱 드론', toy:'완구형 드론', other:'기타 드론' };
      emailBody = `
        <h2>🚁 개인용 드론보험 상담 신청</h2>
        <div style="background:#f5f5f5;padding:20px;border-radius:10px;margin:20px 0;">
          <h3 style="color:#FFB800;margin-top:0;">신청자 정보</h3>
          <p><strong>이름:</strong> ${name}</p>
          <p><strong>생년월일:</strong> ${birth_date || '미입력'}</p>
          <p><strong>성별:</strong> ${gender === 'male' ? '남성' : gender === 'female' ? '여성' : '미입력'}</p>
          <p><strong>연락처:</strong> ${phone}</p>
          <p><strong>이메일:</strong> ${email || '미입력'}</p>
        </div>
        <div style="background:#fff9e6;padding:20px;border-radius:10px;margin:20px 0;">
          <h3 style="color:#FFB800;margin-top:0;">보험 기간</h3>
          <p><strong>보험 시작:</strong> ${insurance_start || '미입력'}</p>
          <p><strong>보험 종료:</strong> ${insurance_end || '미입력'}</p>
        </div>
        <div style="background:#e3f2fd;padding:20px;border-radius:10px;margin:20px 0;">
          <h3 style="color:#1e3c72;margin-top:0;">드론 정보 (${drone_count || 1}대)</h3>
          ${drones && drones.length > 0 ? drones.map((drone, i) => {
            const dronePlan = drone_plans && drone_plans[i] ? drone_plans[i] : null;
            return `
            <div style="border:1px solid #e0e0e0;padding:15px;margin:10px 0;border-radius:8px;background:#fff;">
              <p style="font-weight:bold;color:#FFB800;">드론 ${i + 1} (${droneTypes[drone.type] || '미입력'})</p>
              <p>모델명: ${drone.model || '미입력'}</p>
              <p>시리얼번호: ${drone.serial || '미입력'}</p>
              <p>자체중량: ${drone.weight || '미입력'}kg</p>
              <p>최대이륙중량: ${drone.max_weight || '미입력'}kg</p>
              ${dronePlan ? `<p>선택 플랜: ${dronePlan.plan_name || '미입력'} (${parseInt(dronePlan.price || 0).toLocaleString()}원/년)</p>` : ''}
            </div>`;
          }).join('') : `<p>드론 대수: ${drone_count || 1}대</p>`}
        </div>
        <div style="background:#FFB800;padding:20px;border-radius:10px;text-align:center;margin:20px 0;">
          <p style="margin:0;font-size:1.5rem;font-weight:bold;color:#1a1a1a;">
            총 보험료: ${plan_total_price ? parseInt(plan_total_price).toLocaleString() : '0'}원/년
          </p>
        </div>
        <hr style="margin:30px 0;border:none;border-top:2px solid #e0e0e0;">
        <p style="color:#999;font-size:14px;">배상온 대리점 웹사이트에서 전송됨</p>`;

    } else if (request_type === 'business_quote') {
      const manager_name  = req.body.manager_name  || name;
      const manager_phone = req.body.manager_phone || phone;
      const manager_email = req.body.manager_email || email;
      const customer_type = req.body.customer_type;
      const company_name  = req.body.company_name;
      const drone_under_25kg = req.body.drone_under_25kg || 0;
      const drone_25_100kg   = req.body.drone_25_100kg   || 0;
      const drone_over_100kg = req.body.drone_over_100kg || 0;
      const inquiry          = req.body.inquiry;

      emailSubject = `[드론배상 문의] ${manager_name}님의 상담 신청`;
      emailBody = `
        <h2>🚁 업무용 드론보험 견적 의뢰</h2>
        <div style="background:#fff9e6;padding:20px;border-radius:10px;margin:20px 0;border-left:4px solid #FFB800;">
          <p style="margin:0;font-weight:600;">군집드론 또는 특수 자격으로 인한 별도 심사 건입니다.</p>
        </div>
        <div style="background:#f5f5f5;padding:20px;border-radius:10px;margin:20px 0;">
          <h3 style="color:#1e3c72;margin-top:0;">사업자 정보</h3>
          <p><strong>가입대상자:</strong> ${customer_type === 'corporation' ? '법인사업자' : customer_type === 'individual' ? '개인사업자' : '미입력'}</p>
          <p><strong>회사명:</strong> ${company_name || '미입력'}</p>
        </div>
        <div style="background:#e3f2fd;padding:20px;border-radius:10px;margin:20px 0;">
          <h3 style="color:#1e3c72;margin-top:0;">드론 정보</h3>
          <p><strong>드론중량 25kg 미만:</strong> ${drone_under_25kg}대</p>
          <p><strong>드론중량 25kg~100kg 미만:</strong> ${drone_25_100kg}대</p>
          <p><strong>드론중량 100kg 이상:</strong> ${drone_over_100kg}대</p>
          <p><strong>총 드론 대수:</strong> ${parseInt(drone_under_25kg) + parseInt(drone_25_100kg) + parseInt(drone_over_100kg)}대</p>
        </div>
        <div style="background:#f5f5f5;padding:20px;border-radius:10px;margin:20px 0;">
          <h3 style="color:#1e3c72;margin-top:0;">담당자 정보</h3>
          <p><strong>담당자명:</strong> ${manager_name}</p>
          <p><strong>담당자 연락처:</strong> ${manager_phone}</p>
          <p><strong>담당자 이메일:</strong> ${manager_email}</p>
        </div>
        ${inquiry ? `<div style="background:#f0f0f0;padding:20px;border-radius:10px;margin:20px 0;"><h3 style="color:#1e3c72;margin-top:0;">문의사항</h3><p>${inquiry}</p></div>` : ''}
        <hr style="margin:30px 0;border:none;border-top:2px solid #e0e0e0;">
        <p style="color:#999;font-size:14px;">배상온 대리점 웹사이트에서 전송됨</p>`;

    } else {
      emailSubject = `[KB손해보험 문의] ${name}님의 상담 신청`;
      emailBody = `
        <h2>새로운 상담 신청이 접수되었습니다</h2>
        <p><strong>이름:</strong> ${name}</p>
        <p><strong>연락처:</strong> ${phone}</p>
        <p><strong>이메일:</strong> ${email || '미입력'}</p>
        <p><strong>문의 내용:</strong></p>
        <p>${message || '상담 요청'}</p>
        <hr>
        <p><small>배상온 대리점 웹사이트에서 전송됨</small></p>`;
    }

    // ── 관리자 이메일 발송 ────────────────────────────────────
    // 개인용 드론보험 & quote_email은 관리자 발송 제외
    if (!isQuoteEmailOnly && insurance_type !== '개인용 드론보험') {
      await transporter.sendMail({
        from:    process.env.EMAIL_USER,
        to:      process.env.ADMIN_EMAIL,
        subject: emailSubject,
        html:    emailBody
      });
    }

    // ── 고객 이메일 발송 ──────────────────────────────────────

    // [1] 개인용 드론보험 → 항상 고객에게 견적서 발송
    if (email && insurance_type === '개인용 드론보험') {
      const droneTypes = { camera:'촬영용 센서드론', fpv:'FPV/레이싱 드론', toy:'완구형 드론', other:'기타 드론' };
      const customerEmailBody = `
        <div style="font-family:'Noto Sans KR',sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#FFB800;padding:30px;text-align:center;">
            <h1 style="color:#1a1a1a;margin:0;">배상온 개인용 드론보험</h1>
            <h2 style="color:#1a1a1a;margin:10px 0 0;font-size:1.2rem;">견적서</h2>
          </div>
          <div style="padding:30px;background:#fff;">
            <div style="background:#f8f9fa;padding:20px;border-radius:10px;margin-bottom:20px;">
              <h3 style="color:#FFB800;margin-top:0;">📋 견적 정보</h3>
              <p><strong>견적일자:</strong> ${new Date().toLocaleDateString('ko-KR')}</p>
              <p><strong>보험기간:</strong> ${insurance_start || '미입력'} ~ ${insurance_end || '미입력'}</p>
              <p><strong>상품명:</strong> KB손해보험 개인용 드론보험</p>
            </div>
            <div style="background:#f8f9fa;padding:20px;border-radius:10px;margin-bottom:20px;">
              <h3 style="color:#FFB800;margin-top:0;">👤 고객 정보</h3>
              <p><strong>이름:</strong> ${name}</p>
              <p><strong>연락처:</strong> ${phone}</p>
              <p><strong>이메일:</strong> ${email}</p>
            </div>
            <div style="background:#f8f9fa;padding:20px;border-radius:10px;margin-bottom:20px;">
              <h3 style="color:#FFB800;margin-top:0;">🚁 드론 정보</h3>
              <p><strong>드론 대수:</strong> ${drone_count || 1}대</p>
              ${drones && drones.length > 0 ? drones.map((drone, i) => {
                const dronePlan = drone_plans && drone_plans[i] ? drone_plans[i] : null;
                return `
                <div style="border-left:3px solid #FFB800;padding:12px;margin:15px 0;background:#fff;border-radius:6px;">
                  <p style="margin:5px 0;font-weight:bold;color:#FFB800;">드론 ${i + 1}</p>
                  <p style="margin:5px 0;">모델명: ${drone.model || '미입력'}</p>
                  <p style="margin:5px 0;">시리얼번호: ${drone.serial || '미입력'}</p>
                  <p style="margin:5px 0;">자체중량: ${drone.weight || '미입력'}kg</p>
                  <p style="margin:5px 0;">최대이륙중량: ${drone.max_weight || '미입력'}kg</p>
                  ${dronePlan ? `
                  <div style="margin-top:10px;padding-top:10px;border-top:1px solid #e0e0e0;">
                    <p style="margin:5px 0;color:#FFB800;font-weight:bold;">플랜: ${dronePlan.plan_name}</p>
                    <p style="margin:5px 0;">보험료: ${parseInt(dronePlan.price).toLocaleString()}원/년</p>
                    ${getCoverageDetails(dronePlan.plan || plan)}
                  </div>` : ''}
                </div>`;
              }).join('') : ''}
            </div>
            <div style="background:#FFB800;padding:20px;border-radius:10px;text-align:center;margin-bottom:20px;">
              <p style="margin:0 0 10px;color:#1a1a1a;font-size:1rem;">연간 보험료</p>
              <p style="margin:0;color:#1a1a1a;font-size:2rem;font-weight:bold;">${plan_total_price ? parseInt(plan_total_price).toLocaleString() : '0'}원</p>
            </div>
            <div style="background:#fff9e6;padding:15px;border-radius:8px;font-size:0.9rem;color:#666;">
              <p style="margin:0;"><strong>유의사항</strong></p>
              <p style="margin:5px 0 0;">※ 구체적인 보장/면책 및 보험금 지급은 약관에 따릅니다.</p>
              <p style="margin:5px 0 0;">※ 본 견적서는 참고용이며, 최종 보험료는 심사 후 확정됩니다.</p>
            </div>
          </div>
          <div style="background:#1a1a1a;padding:20px;text-align:center;color:#fff;">
            <p style="margin:0;font-size:0.9rem;">배상온 대리점</p>
            <p style="margin:5px 0;font-size:0.85rem;">liab.on.ins@gmail.com | www.liab.co.kr</p>
            <p style="margin:5px 0 0;font-size:0.8rem;opacity:0.7;">KB손해보험 공식 대리점</p>
          </div>
        </div>`;

      await transporter.sendMail({
        from:    process.env.EMAIL_USER,
        to:      email,
        subject: `[배상온 대리점] KB손해보험 개인용 드론보험 견적서 - ${name}님`,
        html:    customerEmailBody
      });
    }

    // ──────────────────────────────────────────────────────────
    // [2] 업무용 드론보험 → 견적서 이메일 전송 (quote_email)
    //     기존에 이 로직이 없었음 → 이메일 미발송 버그
    // ──────────────────────────────────────────────────────────
    if (email && insurance_type === '업무용 드론보험' && isQuoteEmailOnly) {
      const custName = req.body.corp_name || name || '';
      const businessEmailBody = buildBusinessDroneEmailHTML(req.body);

      await transporter.sendMail({
        from:    process.env.EMAIL_USER,
        to:      email,
        subject: `[배상온 대리점] KB손해보험 업무용 드론보험 견적서 - ${custName}님`,
        html:    businessEmailBody
      });
    }

    return res.status(200).json({
      message: insurance_type === '개인용 드론보험'
        ? '신청이 완료되었으며, 견적서가 이메일로 전송되었습니다.'
        : insurance_type === '업무용 드론보험' && isQuoteEmailOnly
          ? '견적서가 이메일로 전송되었습니다.'
          : '상담 신청이 완료되었습니다.'
    });

  } catch (error) {
    console.error('이메일 전송 오류:', error);
    return res.status(500).json({ message: '전송 중 오류가 발생했습니다. 다시 시도해주세요.' });
  }
};
