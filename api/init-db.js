// api/init-db.js
// 최초 1회 호출로 DB 테이블을 생성합니다.
// 호출: GET /api/init-db?secret=<INIT_SECRET>
// 환경변수: POSTGRES_URL, INIT_SECRET

const { Pool } = require('pg');

module.exports = async (req, res) => {
  // 보안: secret 파라미터 확인
  const secret = req.query.secret || req.headers['x-init-secret'];
  if (process.env.INIT_SECRET && secret !== process.env.INIT_SECRET) {
    return res.status(401).json({ error: '인증 실패. ?secret=값 을 올바르게 입력해주세요.' });
  }

  if (!process.env.liab_db_POSTGRES_URL) {
    return res.status(500).json({ 
      error: 'POSTGRES_URL 환경변수가 설정되지 않았습니다. Vercel Storage > Postgres DB를 생성하고 프로젝트에 연결해주세요.' 
    });
  }

  const pool = new Pool({
    connectionString: process.env.liab_db_POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();

  try {
    // 1. 드론보험 상담 신청 테이블 (drone-insurance 페이지 상담 폼)
    await client.query(`
      CREATE TABLE IF NOT EXISTS drone_inquiries (
        id              SERIAL PRIMARY KEY,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        name            VARCHAR(100) NOT NULL,
        phone           VARCHAR(30)  NOT NULL,
        email           VARCHAR(200),
        insurance_type  VARCHAR(50),
        message         TEXT,
        source_page     VARCHAR(100) DEFAULT 'drone-insurance',
        status          VARCHAR(30)  DEFAULT 'new'
      );
    `);

    // 2. 개인용 드론보험 가입 신청 테이블 (personal-drone-insurance-form)
    await client.query(`
      CREATE TABLE IF NOT EXISTS personal_drone_applications (
        id              SERIAL PRIMARY KEY,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        name            VARCHAR(100) NOT NULL DEFAULT '',
        birth_date      VARCHAR(10)  NOT NULL DEFAULT '',
        gender          VARCHAR(10),
        phone           VARCHAR(30)  NOT NULL DEFAULT '',
        email           VARCHAR(200) NOT NULL DEFAULT '',
        coverage_start  VARCHAR(50),
        coverage_end    VARCHAR(50),
        coverage_location VARCHAR(200),
        drone_count     INT DEFAULT 1,
        drones          TEXT DEFAULT '[]',
        drone_plans     TEXT DEFAULT '[]',
        total_premium   INT DEFAULT 0,
        plan_mode       VARCHAR(20) DEFAULT 'unified',
        terms_agreed    BOOLEAN DEFAULT FALSE,
        agreed_at       VARCHAR(50),
        source_page     VARCHAR(100) DEFAULT 'personal-drone-insurance-form',
        status          VARCHAR(30)  DEFAULT 'pending'
      );
    `);

    // 3. 인덱스 생성
    await client.query(`CREATE INDEX IF NOT EXISTS idx_drone_inquiries_created_at ON drone_inquiries(created_at DESC);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_drone_inquiries_status ON drone_inquiries(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_personal_drone_apps_created_at ON personal_drone_applications(created_at DESC);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_personal_drone_apps_status ON personal_drone_applications(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_personal_drone_apps_phone ON personal_drone_applications(phone);`);

    return res.status(200).json({ 
      success: true, 
      message: '✅ DB 테이블 초기화 완료!',
      tables: ['drone_inquiries', 'personal_drone_applications']
    });

  } catch (err) {
    console.error('DB init error:', err);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
    await pool.end();
  }
};
