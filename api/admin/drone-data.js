// api/admin/drone-data.js
// 어드민 대시보드용 데이터 조회 API
// GET /api/admin/drone-data?type=inquiries|applications&status=new&page=1&limit=20&q=검색어
// 헤더: x-admin-key: <ADMIN_API_KEY 환경변수>

import { sql } from '../db.js';

export default async function handler(req, res) {
  // 어드민 인증
  const adminKey = req.headers['x-admin-key'];
  if (!process.env.ADMIN_API_KEY || adminKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: '인증 실패' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const {
    type = 'applications',  // 'inquiries' | 'applications'
    status,
    q,                      // 이름/전화번호 검색
    page = 1,
    limit = 20,
    export: doExport        // 'csv' 이면 전체 CSV 반환
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    if (type === 'inquiries') {
      // ── 상담 신청 조회 ──────────────────────────────────────────
      let rows, countRow;

      if (q) {
        rows = await sql`
          SELECT * FROM drone_inquiries
          WHERE (name ILIKE ${'%' + q + '%'} OR phone ILIKE ${'%' + q + '%'})
          ${status ? sql`AND status = ${status}` : sql``}
          ORDER BY created_at DESC
          LIMIT ${parseInt(limit)} OFFSET ${offset};
        `;
        countRow = await sql`
          SELECT COUNT(*) FROM drone_inquiries
          WHERE (name ILIKE ${'%' + q + '%'} OR phone ILIKE ${'%' + q + '%'})
          ${status ? sql`AND status = ${status}` : sql``};
        `;
      } else if (status) {
        rows = await sql`
          SELECT * FROM drone_inquiries
          WHERE status = ${status}
          ORDER BY created_at DESC
          LIMIT ${parseInt(limit)} OFFSET ${offset};
        `;
        countRow = await sql`SELECT COUNT(*) FROM drone_inquiries WHERE status = ${status};`;
      } else {
        rows = await sql`
          SELECT * FROM drone_inquiries
          ORDER BY created_at DESC
          LIMIT ${parseInt(limit)} OFFSET ${offset};
        `;
        countRow = await sql`SELECT COUNT(*) FROM drone_inquiries;`;
      }

      return res.status(200).json({
        type: 'inquiries',
        total: parseInt(countRow.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        data: rows.rows
      });

    } else {
      // ── 가입 신청 조회 ──────────────────────────────────────────
      let rows, countRow;

      if (q) {
        rows = await sql`
          SELECT
            id, created_at, name, birth_date, gender, phone, email,
            coverage_start, coverage_end, coverage_location,
            drone_count, drones, total_premium,
            terms_agreed, agreed_at, status
          FROM personal_drone_applications
          WHERE (name ILIKE ${'%' + q + '%'} OR phone ILIKE ${'%' + q + '%'} OR email ILIKE ${'%' + q + '%'})
          ${status ? sql`AND status = ${status}` : sql``}
          ORDER BY created_at DESC
          LIMIT ${parseInt(limit)} OFFSET ${offset};
        `;
        countRow = await sql`
          SELECT COUNT(*) FROM personal_drone_applications
          WHERE (name ILIKE ${'%' + q + '%'} OR phone ILIKE ${'%' + q + '%'} OR email ILIKE ${'%' + q + '%'})
          ${status ? sql`AND status = ${status}` : sql``};
        `;
      } else if (status) {
        rows = await sql`
          SELECT
            id, created_at, name, birth_date, gender, phone, email,
            coverage_start, coverage_end, coverage_location,
            drone_count, drones, total_premium,
            terms_agreed, agreed_at, status
          FROM personal_drone_applications
          WHERE status = ${status}
          ORDER BY created_at DESC
          LIMIT ${parseInt(limit)} OFFSET ${offset};
        `;
        countRow = await sql`SELECT COUNT(*) FROM personal_drone_applications WHERE status = ${status};`;
      } else {
        rows = await sql`
          SELECT
            id, created_at, name, birth_date, gender, phone, email,
            coverage_start, coverage_end, coverage_location,
            drone_count, drones, total_premium,
            terms_agreed, agreed_at, status
          FROM personal_drone_applications
          ORDER BY created_at DESC
          LIMIT ${parseInt(limit)} OFFSET ${offset};
        `;
        countRow = await sql`SELECT COUNT(*) FROM personal_drone_applications;`;
      }

      return res.status(200).json({
        type: 'applications',
        total: parseInt(countRow.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        data: rows.rows
      });
    }

  } catch (err) {
    console.error('admin/drone-data error:', err);
    return res.status(500).json({ error: err.message });
  }
}
