// api/submit-drone-inquiry.js
// /drone-insurance 페이지의 "상담 신청하기" 폼 데이터를 DB에 저장합니다.

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
      name,
      phone,
      email,
      insurance_type,  // 'business' | 'personal'
      message
    } = req.body;

    // 필수값 검증
    if (!name || !phone) {
      return res.status(400).json({ error: '이름과 연락처는 필수입니다.' });
    }

    const result = await sql`
      INSERT INTO drone_inquiries (
        name, phone, email, insurance_type, message, source_page, status
      ) VALUES (
        ${name.trim()},
        ${phone.trim()},
        ${email?.trim() || null},
        ${insurance_type || null},
        ${message?.trim() || null},
        'drone-insurance',
        'new'
      )
      RETURNING id, created_at;
    `;

    return res.status(200).json({
      success: true,
      id: result.rows[0].id,
      message: '상담 신청이 접수되었습니다.'
    });

  } catch (err) {
    console.error('submit-drone-inquiry error:', err);
    return res.status(500).json({ error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
  }
}
