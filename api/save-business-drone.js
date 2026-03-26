// api/save-business-drone.js
// POST /api/save-business-drone
// business-drone-insurance-terms.html 에서 호출
// drone_applications (customer_type='individual'|'corporate') + business_drone_details 저장

'use strict';
const { getPool } = require('./_db');
let ssnCrypto;
try { ssnCrypto = require('./ssn-crypto'); } catch(e) { ssnCrypto = null; }

const WEIGHT_LABELS = {
  'under_25kg': '25kg 미만 (의무/업무/영리)',
  '25_100kg':   '25kg 이상 100kg 미만 (의무/업무/영리)',
  'over_100kg': '100kg 이상'
};

// "2026-03-20T09:00" → { date: "2026-03-20", time: "09:00" }
function splitDateTime(dtStr) {
  if (!dtStr) return { date: null, time: null };
  const parts = dtStr.replace('T', ' ').split(' ');
  return {
    date: parts[0] || null,
    time: parts[1] ? parts[1].slice(0, 5) : null
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  let client;
  try {
    const pool = getPool();
    client = await pool.connect();
  } catch (err) {
    console.error('[save-business-drone] DB 연결 실패:', err.message);
    return res.status(500).json({ saved: false, message: 'DB 연결에 실패했습니다: ' + err.message });
  }

  try {
    const d = req.body;

    const isCorp       = !!(d.corp_name);
    const customerType = isCorp ? 'corporate' : 'individual';
    const droneCount   = parseInt(d.drone_count) || 1;
    const planMode     = d.plan_mode || 'individual';
    const totalPremium = parseInt(d.plan_total_price || 0);
    const weightLabel  = d.drone_weight
      ? (WEIGHT_LABELS[d.drone_weight] || d.drone_weight)
      : null;

    // ssn_back 암호화
    let ssnEncrypted = null;
    if (d.ssn_back && ssnCrypto) {
      try {
        const plain = ssnCrypto.decryptFromFront(d.ssn_back);
        ssnEncrypted = ssnCrypto.encryptForDB(plain);
      } catch(e) { console.warn('[save-business-drone] ssn 암호화 실패:', e.message); }
    }

    const start = splitDateTime(d.insurance_start);
    const end   = splitDateTime(d.insurance_end);

    await client.query('BEGIN');

    // ── 1. 마스터 저장 ──
    const masterResult = await client.query(`
      INSERT INTO drone_applications (
        status, source_page, customer_type,
        name, birth_date, ssn_back, phone, email,
        corp_name, corp_number, corp_reg_number, corp_contact_name, corp_phone, corp_email,
        coverage_start_date, coverage_start_time,
        coverage_end_date,   coverage_end_time,
        plan_mode,
        drone_count, drone_weight, drone_weight_label, drone_flag,
        selected_deductible, total_premium,
        terms_agreed, marketing_agreed, agreed_at
      ) VALUES (
        'pending', 'business-drone-insurance', $1,
        $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16,
        $17,
        $18, $19, $20, $21,
        $22, $23,
        $24, $25, $26
      ) RETURNING app_id`,
      [
        customerType,
        d.name       || null,
        d.birth_date || null,
        ssnEncrypted,
        d.phone      || d.corp_phone || null,
        d.email      || d.corp_email || null,
        d.corp_name         || null,
        d.corp_number       || null,
        d.corp_reg_number   || null,
        d.corp_contact_name || null,
        d.corp_phone        || null,
        d.corp_email        || null,
        start.date, start.time,
        end.date,   end.time,
        planMode,
        droneCount,
        d.drone_weight || null,
        weightLabel,
        d.drone_flag   || null,
        d.selected_deductible || '10',
        totalPremium,
        d.terms_agreed    === true || d.terms_agreed    === 'true',
        d.marketing_agreed === true || d.marketing_agreed === 'true',
        d.agreed_at || new Date().toISOString()
      ]
    );

    const applicationId = masterResult.rows[0].app_id;

    // ── 2. 드론별 상세 저장 ──
    const drones = d.drones      || [];
    const plans  = d.drone_plans || [];

    for (let i = 0; i < droneCount; i++) {
      const dr = drones[i] || {};
      const pl = plans[i]  || {};

      await client.query(`
        INSERT INTO business_drone_details (
          app_id, drone_index,
          model, serial_number, reg_number,
          weight_kg, mtow_kg,
          plan_name, coverage_personal, coverage_property, premium
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          applicationId,
          i + 1,
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
    console.log('[save-business-drone] 저장 완료: app_id=' + applicationId);

    return res.status(200).json({
      saved: true,
      biz_key: `BIZ-${applicationId}`,
      application_id: applicationId,
      drone_count: droneCount
    });

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[save-business-drone] DB 저장 실패:', err.message);
    return res.status(500).json({ saved: false, message: 'DB 저장에 실패했습니다: ' + err.message });
  } finally {
    client.release();
  }
};
