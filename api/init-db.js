// api/init-db.js
// GET /api/init-db?secret=<INIT_SECRET>
// 전체 테이블 생성 (v3 — 테이블별 고유 PK 컬럼명)

const { Pool } = require('pg');

module.exports = async (req, res) => {
  const secret = req.query.secret || req.headers['x-init-secret'];
  if (process.env.INIT_SECRET && secret !== process.env.INIT_SECRET) {
    return res.status(401).json({ error: '인증 실패' });
  }
  if (!process.env.liab_db_POSTGRES_URL) {
    return res.status(500).json({ error: 'POSTGRES_URL 환경변수 없음' });
  }

  const pool   = new Pool({ connectionString: process.env.liab_db_POSTGRES_URL, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();

  try {
    // ── 트리거 함수 ──────────────────────────────────────
    await client.query(`
      CREATE OR REPLACE FUNCTION fn_set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
      $$ LANGUAGE plpgsql;
    `);

    // ── 1. drone_inquiries ────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS drone_inquiries (
        inq_id          SERIAL PRIMARY KEY,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW(),
        name            VARCHAR(100) NOT NULL,
        phone           VARCHAR(30)  NOT NULL,
        email           VARCHAR(200),
        insurance_type  VARCHAR(50),
        message         TEXT,
        source_page     VARCHAR(100) DEFAULT 'drone-insurance',
        status          VARCHAR(30)  DEFAULT 'new'
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_inq_created_at ON drone_inquiries(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_inq_status     ON drone_inquiries(status);
      CREATE INDEX IF NOT EXISTS idx_inq_phone      ON drone_inquiries(phone);
    `);
    await client.query(`
      DROP TRIGGER IF EXISTS trg_inq_updated ON drone_inquiries;
      CREATE TRIGGER trg_inq_updated
        BEFORE UPDATE ON drone_inquiries
        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
    `);

    // ── 2. personal_drone_applications ───────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS personal_drone_applications (
        per_id              SERIAL PRIMARY KEY,
        created_at          TIMESTAMPTZ DEFAULT NOW(),
        updated_at          TIMESTAMPTZ DEFAULT NOW(),
        name                VARCHAR(100) NOT NULL DEFAULT '',
        birth_date          VARCHAR(10)  NOT NULL DEFAULT '',
        gender              VARCHAR(10),
        phone               VARCHAR(30)  NOT NULL DEFAULT '',
        email               VARCHAR(200) NOT NULL DEFAULT '',
        coverage_start_date VARCHAR(20),
        coverage_start_time VARCHAR(10),
        coverage_end_date   VARCHAR(20),
        coverage_end_time   VARCHAR(10),
        coverage_location   VARCHAR(200),
        drone_count         INT DEFAULT 1,
        plan_mode           VARCHAR(20) DEFAULT 'unified',
        total_premium       INT DEFAULT 0,
        terms_agreed        BOOLEAN DEFAULT FALSE,
        marketing_agreed    BOOLEAN DEFAULT FALSE,
        agreed_at           VARCHAR(50),
        source_page         VARCHAR(100) DEFAULT 'personal-drone-insurance-form',
        status              VARCHAR(30)  DEFAULT 'pending'
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_per_created_at ON personal_drone_applications(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_per_status     ON personal_drone_applications(status);
      CREATE INDEX IF NOT EXISTS idx_per_phone      ON personal_drone_applications(phone);
      CREATE INDEX IF NOT EXISTS idx_per_name_phone ON personal_drone_applications(name, phone);
    `);
    await client.query(`
      DROP TRIGGER IF EXISTS trg_per_updated ON personal_drone_applications;
      CREATE TRIGGER trg_per_updated
        BEFORE UPDATE ON personal_drone_applications
        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
    `);

    // ── 3. drone_details (복합 PK — id SERIAL 없음) ──────
    await client.query(`
      CREATE TABLE IF NOT EXISTS drone_details (
        per_id              INT NOT NULL REFERENCES personal_drone_applications(per_id) ON DELETE CASCADE,
        drone_index         INT NOT NULL DEFAULT 1,
        model               VARCHAR(200),
        serial_number       VARCHAR(200),
        registration_number VARCHAR(200),
        weight              VARCHAR(50),
        max_weight          VARCHAR(50),
        drone_type          VARCHAR(20),
        drone_type_name     VARCHAR(100),
        plan                VARCHAR(50),
        plan_name           VARCHAR(100),
        price               INT DEFAULT 0,
        PRIMARY KEY (per_id, drone_index)
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_dd_per_id ON drone_details(per_id);
    `);

    // ── 4. business_drone_applications ───────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS business_drone_applications (
        biz_id              SERIAL PRIMARY KEY,
        created_at          TIMESTAMPTZ DEFAULT NOW(),
        updated_at          TIMESTAMPTZ DEFAULT NOW(),
        customer_type       VARCHAR(20)  DEFAULT 'individual',
        name                VARCHAR(100),
        birth_date          VARCHAR(10),
        gender              VARCHAR(10),
        phone               VARCHAR(30),
        email               VARCHAR(200),
        corp_name           VARCHAR(200),
        corp_number         VARCHAR(30),
        corp_phone          VARCHAR(30),
        insurance_start     VARCHAR(30),
        insurance_end       VARCHAR(30),
        drone_count         INT DEFAULT 1,
        drone_weight        VARCHAR(30),
        drone_weight_label  VARCHAR(100),
        drone_flag          VARCHAR(20),
        selected_deductible VARCHAR(20) DEFAULT '10',
        total_premium       INT DEFAULT 0,
        terms_agreed        BOOLEAN DEFAULT FALSE,
        marketing_agreed    BOOLEAN DEFAULT FALSE,
        agreed_at           VARCHAR(50),
        source_page         VARCHAR(100) DEFAULT 'business-drone-insurance',
        status              VARCHAR(30)  DEFAULT 'pending'
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_biz_created_at    ON business_drone_applications(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_biz_status        ON business_drone_applications(status);
      CREATE INDEX IF NOT EXISTS idx_biz_phone         ON business_drone_applications(phone);
      CREATE INDEX IF NOT EXISTS idx_biz_corp_phone    ON business_drone_applications(corp_phone);
      CREATE INDEX IF NOT EXISTS idx_biz_customer_type ON business_drone_applications(customer_type);
    `);
    await client.query(`
      DROP TRIGGER IF EXISTS trg_biz_updated ON business_drone_applications;
      CREATE TRIGGER trg_biz_updated
        BEFORE UPDATE ON business_drone_applications
        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
    `);

    // ── 5. business_drone_details (복합 PK) ─────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS business_drone_details (
        biz_id            INT NOT NULL REFERENCES business_drone_applications(biz_id) ON DELETE CASCADE,
        drone_index       INT NOT NULL DEFAULT 1,
        model             VARCHAR(200),
        serial_number     VARCHAR(200),
        reg_number        VARCHAR(200),
        weight_kg         NUMERIC(8,3),
        mtow_kg           NUMERIC(8,3),
        plan_name         VARCHAR(100),
        coverage_personal VARCHAR(100),
        coverage_property VARCHAR(100),
        premium           INT DEFAULT 0,
        PRIMARY KEY (biz_id, drone_index)
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bdd_biz_id ON business_drone_details(biz_id);
    `);

    // ── 6. contract_requests ─────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS contract_requests (
        req_id          SERIAL PRIMARY KEY,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW(),
        per_id          INT REFERENCES personal_drone_applications(per_id),
        biz_id          INT REFERENCES business_drone_applications(biz_id),
        contract_id     VARCHAR(50)  NOT NULL,
        request_type    VARCHAR(30)  NOT NULL,
        status          VARCHAR(20)  NOT NULL DEFAULT 'pending',
        customer_name   VARCHAR(100) NOT NULL,
        customer_phone  VARCHAR(20)  NOT NULL,
        reason          TEXT,
        refund_account  TEXT,
        admin_memo      TEXT,
        request_data    JSONB,
        processed_at    TIMESTAMPTZ,
        processed_by    VARCHAR(100)
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_req_contract_id    ON contract_requests(contract_id);
      CREATE INDEX IF NOT EXISTS idx_req_customer_phone ON contract_requests(customer_phone);
      CREATE INDEX IF NOT EXISTS idx_req_request_type   ON contract_requests(request_type);
      CREATE INDEX IF NOT EXISTS idx_req_status         ON contract_requests(status);
      CREATE INDEX IF NOT EXISTS idx_req_created_at     ON contract_requests(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_req_per_id         ON contract_requests(per_id);
      CREATE INDEX IF NOT EXISTS idx_req_biz_id         ON contract_requests(biz_id);
    `);
    await client.query(`
      DROP TRIGGER IF EXISTS trg_req_updated ON contract_requests;
      CREATE TRIGGER trg_req_updated
        BEFORE UPDATE ON contract_requests
        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
    `);

    // ── 7. drone_change_logs ─────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS drone_change_logs (
        log_id      SERIAL PRIMARY KEY,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        req_id      INT NOT NULL REFERENCES contract_requests(req_id) ON DELETE CASCADE,
        drone_index INT NOT NULL,
        field_name  VARCHAR(50) NOT NULL,
        old_value   TEXT,
        new_value   TEXT
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_log_req_id ON drone_change_logs(req_id);
    `);

    return res.status(200).json({
      success: true,
      message: '✅ DB v3 초기화 완료',
      tables: [
        'drone_inquiries          (PK: inq_id)',
        'personal_drone_applications (PK: per_id)',
        'drone_details            (PK: per_id + drone_index)',
        'business_drone_applications (PK: biz_id)',
        'business_drone_details   (PK: biz_id + drone_index)',
        'contract_requests        (PK: req_id)',
        'drone_change_logs        (PK: log_id)',
      ],
      id_convention: {
        'INQ-{n}':    'drone_inquiries',
        'PER-{n}':    'personal_drone_applications',
        'PER-{n}-{k}':'drone_details (드론 k번째)',
        'BIZ-{n}':    'business_drone_applications',
        'BIZ-{n}-{k}':'business_drone_details (드론 k번째)',
        'REQ-{n}':    'contract_requests',
        'LOG-{n}':    'drone_change_logs',
      }
    });

  } catch (err) {
    console.error('[init-db] 오류:', err);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
    await pool.end();
  }
};
