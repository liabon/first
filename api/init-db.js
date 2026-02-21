// api/init-db.js
// 최초 1회 호출로 DB 테이블을 생성합니다.
// 호출: GET /api/init-db?secret=<INIT_SECRET>
// 환경변수 INIT_SECRET 을 설정하여 무단 호출을 방지하세요.

import { initTables } from './db.js';

export default async function handler(req, res) {
  // 보안: secret 파라미터 확인
  const secret = req.query.secret || req.headers['x-init-secret'];
  if (process.env.INIT_SECRET && secret !== process.env.INIT_SECRET) {
    return res.status(401).json({ error: '인증 실패' });
  }

  try {
    const result = await initTables();
    return res.status(200).json(result);
  } catch (err) {
    console.error('DB init error:', err);
    return res.status(500).json({ error: err.message });
  }
}
