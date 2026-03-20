// api/insurance.js
// POST /api/insurance
// personal-drone-insurance-form.html 에서 호출
// drone_applications (customer_type='individual') + drone_details 저장

const { Pool } = require('pg');
let ssnCrypto;
try { ssnCrypto = require('./ssn-crypto'); } catch(e) { ssnCrypto = null; }

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

  const db = getPool();
  if (!db) {
    console.warn('[save-personal] DB 연결 없음 — 저장 스킵');
    return res.status(200).json({ message: 'DB 미연결 — 저장 스킵', saved: false });
  }

  const client = await db.connect();
  try {
    const d = req.body;

    const droneCount = parseInt(d.drone_count) || 1;
    const planMode   = d.plan_mode || 'unified';

    // 총 보험료
    let totalPremium = 0;
    if (planMode === 'unified') {
      totalPremium = (parseInt(d.plan_price_per_drone) || 0) * droneCount;
    } else {
      totalPremium = (d.drone_plans || []).reduce((s, p) => s + (parseInt(p.price) || 0), 0);
    }

    // ssn_back 암호화
    let ssnEncrypted = null;
    if (d.ssn_back && ssnCrypto) {
      try {
        const plain = ssnCrypto.decryptFromFront(d.ssn_back);
        ssnEncrypted = ssnCrypto.encryptForDB(plain);
      } catch(e) { console.warn('[save-personal] ssn 암호화 실패:', e.message); }
    }

    const start = splitDateTime(d.insurance_start);
    const end   = splitDateTime(d.insurance_end);

    await client.query('BEGIN');

    // ── 1. 마스터 저장 ──
    const masterResult = await client.query(`
      INSERT INTO drone_applications (
        status, source_page, customer_type,
        name, birth_date, ssn_back, phone, email,
        coverage_start_date, coverage_start_time,
        coverage_end_date,   coverage_end_time,
        plan_mode, drone_count, total_premium
      ) VALUES (
        'pending', 'personal-drone-insurance-form', 'individual',
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12
      ) RETURNING app_id`,
      [
        d.name       || null,
        d.birth_date || null,
        ssnEncrypted,
        d.phone      || null,
        d.email      || null,
        start.date, start.time,
        end.date,   end.time,
        planMode,
        droneCount,
        totalPremium
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
        INSERT INTO drone_details (
          app_id, drone_index,
          model, serial_number, registration_number,
          weight, max_weight,
          drone_type, drone_type_name,
          plan, plan_name, price
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          applicationId,
          i + 1,
          dr.model        || null,
          dr.serial       || null,
          dr.registration || null,
          dr.weight       != null ? String(dr.weight)     : null,
          dr.max_weight   != null ? String(dr.max_weight) : null,
          pl.drone_type      || d.drone_type  || null,
          pl.drone_type_name || null,
          pl.plan            || d.plan        || null,
          pl.plan_name       || d.plan_name   || null,
          parseInt(pl.price  || d.plan_price_per_drone || 0)
        ]
      );
    }

    await client.query('COMMIT');
    console.log('[save-personal] 저장 완료: app_id=' + applicationId);

    return res.status(200).json({
      saved: true,
      app_key: `PER-${applicationId}`,
      application_id: applicationId,
      drone_count: droneCount
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[save-personal] DB 저장 실패:', err.message);
    return res.status(200).json({ saved: false, message: err.message });
  } finally {
    client.release();
  }
};
