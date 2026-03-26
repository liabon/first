'use strict';
/**
 * api/_db.js
 * ──────────────────────────────────────────────────
 * 공용 Postgres 커넥션 풀 (Supabase)
 *
 * Vercel 환경변수 설정 필요:
 *   DATABASE_URL=postgresql://postgres.ehacreqgjoxsmhwtlmjh:[비밀번호]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
 *
 * ※ Supabase → Settings → Database → Connection string → Transaction pooler (포트 6543) 복사
 * ※ 반드시 username 형식이 "postgres.{project_ref}" 이어야 함 (Neon 형식과 다름)
 */

const { Pool } = require('pg');

let _pool = null;

function getPool() {
  if (_pool) return _pool;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('[DB] DATABASE_URL 환경변수가 설정되지 않았습니다. Vercel 대시보드에서 확인하세요.');
  _pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    max: 5,
  });
  return _pool;
}

module.exports = { getPool };
