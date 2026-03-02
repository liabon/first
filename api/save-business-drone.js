// api/save-business-drone.js
// POST /api/save-business-drone
// business-drone-insurance-complete.html 에서 호출
// business_drone_applications + business_drone_details 에 저장

const { Pool } = require('pg');
let ssnCrypto;
try { ssnCrypto = require('./ssn-crypto'); } catch(e) { ssnCrypto = null; }

const WEIGHT_LABELS = {
  'under_25kg': '25kg 미만 (의무/업무/영리)',
  '25_100kg':   '25kg 이상 100kg 미만 (의무/업무/영리)',
  'over_100kg': '100kg 이상'
};

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

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const db = getPool();
  if (!db) {
    // DB 없어도 200 반환 (PDF 다운로드는 계속 가능하게)
    console.warn('[save-business-drone] DB 연결 없음 — 저장 스킵');
    return res.status(200).json({ message: 'DB 미연결 — 저장 스킵', saved: false });
  }

  const client = await db.connect();
  try {
    const d = req.body;

    // ── 고객 구분 ──
    const isCorp       = !!(d.corp_name);
    const customerType = isCorp ? 'corporate' : 'individual';
    const droneCount   = parseInt(d.drone_count) || 1;
    const totalPremium = parseInt(d.plan_total_price || 0);
    const weightLabel  = d.drone_weight
      ? (WEIGHT_LABELS[d.drone_weight] || d.drone_weight)
      : null;

    // ── ssn_back 암호화 ──
    let ssnEncrypted = null;
    if (d.ssn_back && ssnCrypto) {
      try {
        const ssnPlain = ssnCrypto.decryptFromFront(d.ssn_back);
        ssnEncrypted = ssnCrypto.encryptForDB(ssnPlain);
      } catch (e) { console.warn('[save-business-drone] ssn 암호화 실패:', e.message); }
    }

    await client.query('BEGIN');

    // ── 1. 마스터 레코드 저장 ──────────────────────────────
    const masterResult = await client.query(`
      INSERT INTO business_drone_applications (
        status, source_page, customer_type,
        name, birth_date, ssn_back, gender, phone, email,
        corp_name, corp_number, corp_reg_number, corp_contact_name, corp_phone, corp_email,
        insurance_start, insurance_end,
        drone_count, drone_weight, drone_weight_label, drone_flag,
        selected_deductible, total_premium,
        terms_agreed, marketing_agreed, agreed_at
      ) VALUES (
        'pending', 'business-drone-insurance', $1,
        $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13,
        $14, $15,
        $16, $17, $18, $19,
        $20, $21,
        $22, $23, $24
      ) RETURNING biz_id`,
      [
        customerType,
        // 개인 필드
        d.name       || null,
        d.birth_date || null,
        ssnEncrypted,
        d.gender     || null,
        d.phone      || d.corp_phone || null,
        d.email      || d.corp_email || null,
        // 법인 필드
        d.corp_name         || null,
        d.corp_number       || null,
        d.corp_reg_number   || null,
        d.corp_contact_name || null,
        d.corp_phone        || null,
        d.corp_email        || null,
        // 보험 기간
        d.insurance_start ? d.insurance_start.replace('T', ' ') : null,
        d.insurance_end   ? d.insurance_end.replace('T', ' ')   : null,
        // 보험 조건
        droneCount,
        d.drone_weight || null,
        weightLabel,
        d.drone_flag   || null,
        d.selected_deductible || '10',
        totalPremium,
        // 약관
        d.terms_agreed    === true || d.terms_agreed    === 'true',
        d.marketing_agreed === true || d.marketing_agreed === 'true',
        d.agreed_at || new Date().toISOString()
      ]
    );

    const applicationId = masterResult.rows[0].biz_id;

    // ── 2. 드론별 상세 저장 ───────────────────────────────
    const drones = d.drones      || [];
    const plans  = d.drone_plans || [];

    for (let i = 0; i < droneCount; i++) {
      const dr = drones[i] || {};
      const pl = plans[i]  || {};
      const droneIndex = i + 1;  // 1부터 시작

      await client.query(`
        INSERT INTO business_drone_details (
          application_id, drone_index,
          model, serial_number, reg_number,
          weight_kg, mtow_kg,
          plan_name, coverage_personal, coverage_property, premium
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          applicationId,
          droneIndex,
          dr.model      || null,
          dr.serial     || null,
          dr.reg_number || dr.reg || null,
          dr.weight     ? parseFloat(dr.weight)     : null,
          dr.max_weight ? parseFloat(dr.max_weight) : null,
          pl.plan_name           || null,
          pl.coverage_personal   || null,
          pl.coverage_property   || null,
          parseInt(pl.price || 0)
        ]
      );
    }

    await client.query('COMMIT');

    // 응답: biz_id 반환 (어드민에서 BIZ-{id}로 조회 가능)
    return res.status(200).json({
      saved: true,
      biz_key: `BIZ-${applicationId}`,
      application_id: applicationId,
      drone_count: droneCount
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[save-business-drone] DB 저장 실패:', err.message);
    // DB 실패해도 사용자 플로우는 막지 않음
    return res.status(200).json({ saved: false, message: err.message });
  } finally {
    client.release();
  }
};
