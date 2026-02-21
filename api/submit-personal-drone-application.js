// api/submit-personal-drone-application.js
// /personal-drone-insurance-form 페이지의 가입 신청 데이터를 DB에 저장합니다.

import { sql } from './db.js';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const {
      // Step 1: 자격 확인 (personal-drone-insurance 페이지에서 넘어온 값)
      is_non_mandatory = true,
      is_droneplay_member = true,

      // Step 2: 고객 정보
      name,
      birth_date,   // YYMMDD 형식
      gender,       // 'male' | 'female'
      phone,
      email,

      // Step 2: 보험 기간
      coverage_start,   // ISO string
      coverage_end,     // ISO string
      coverage_location,

      // Step 2: 드론 대수
      drone_count,

      // Step 2: 드론 정보 배열
      // [{ type: 'camera'|'fpv'|'toy'|'other', serial_number, weight, plan: 'slim'|'standard'|'premium', plan_price }]
      drones = [],

      // 총 보험료
      total_premium,

      // 약관 동의
      terms_agreed
    } = req.body;

    // 필수값 검증
    if (!name || !phone || !email) {
      return res.status(400).json({ error: '이름, 연락처, 이메일은 필수입니다.' });
    }
    if (!birth_date) {
      return res.status(400).json({ error: '생년월일은 필수입니다.' });
    }
    if (!coverage_start) {
      return res.status(400).json({ error: '보험 시작일은 필수입니다.' });
    }
    if (!terms_agreed) {
      return res.status(400).json({ error: '약관 동의가 필요합니다.' });
    }

    const dronesJson = JSON.stringify(drones);
    const agreedAt = terms_agreed ? new Date().toISOString() : null;

    const result = await sql`
      INSERT INTO personal_drone_applications (
        is_non_mandatory,
        is_droneplay_member,
        name,
        birth_date,
        gender,
        phone,
        email,
        coverage_start,
        coverage_end,
        coverage_location,
        drone_count,
        drones,
        total_premium,
        terms_agreed,
        agreed_at,
        source_page,
        status
      ) VALUES (
        ${is_non_mandatory},
        ${is_droneplay_member},
        ${name.trim()},
        ${birth_date.trim()},
        ${gender || null},
        ${phone.trim()},
        ${email.trim()},
        ${coverage_start},
        ${coverage_end || null},
        ${coverage_location?.trim() || null},
        ${parseInt(drone_count) || 1},
        ${dronesJson},
        ${parseInt(total_premium) || 0},
        ${!!terms_agreed},
        ${agreedAt},
        'personal-drone-insurance-form',
        'pending'
      )
      RETURNING id, created_at;
    `;

    return res.status(200).json({
      success: true,
      id: result.rows[0].id,
      message: '가입 신청이 완료되었습니다. 영업일 기준 1~2일 내 연락드리겠습니다.'
    });

  } catch (err) {
    console.error('submit-personal-drone-application error:', err);
    return res.status(500).json({ error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
  }
}
