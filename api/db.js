// api/db.js
// DB 연결 유틸리티 - Vercel Postgres (Neon) 사용
// 환경변수: POSTGRES_URL (Vercel Storage에서 자동 주입)

import { sql } from '@vercel/postgres';

export { sql };

/**
 * 테이블이 없으면 생성합니다.
 * Vercel 배포 후 /api/init-db 를 한 번 호출하여 초기화하세요.
 */
export async function initTables() {
  // 1. 드론보험 상담 신청 테이블 (drone-insurance 페이지)
  await sql`
    CREATE TABLE IF NOT EXISTS drone_inquiries (
      id            SERIAL PRIMARY KEY,
      created_at    TIMESTAMPTZ DEFAULT NOW(),

      -- 상담 신청자 정보
      name          VARCHAR(100) NOT NULL,
      phone         VARCHAR(30)  NOT NULL,
      email         VARCHAR(200),
      insurance_type VARCHAR(50), -- 'business' | 'personal'
      message       TEXT,

      -- 메타
      source_page   VARCHAR(100) DEFAULT 'drone-insurance',
      status        VARCHAR(30)  DEFAULT 'new'  -- new | contacted | completed
    );
  `;

  // 2. 개인용 드론보험 가입 신청 테이블 (personal-drone-insurance-form 페이지)
  await sql`
    CREATE TABLE IF NOT EXISTS personal_drone_applications (
      id                SERIAL PRIMARY KEY,
      created_at        TIMESTAMPTZ DEFAULT NOW(),

      -- Step 1: 자격 확인 (personal-drone-insurance 페이지)
      is_non_mandatory  BOOLEAN DEFAULT TRUE,  -- 비의무 확인
      is_droneplay_member BOOLEAN DEFAULT TRUE, -- 드론플레이 회원 확인

      -- Step 2: 고객 정보
      name              VARCHAR(100) NOT NULL,
      birth_date        VARCHAR(10)  NOT NULL,  -- YYMMDD
      gender            VARCHAR(10),            -- 'male' | 'female'
      phone             VARCHAR(30)  NOT NULL,
      email             VARCHAR(200) NOT NULL,

      -- Step 2: 보험 기간
      coverage_start    TIMESTAMPTZ,
      coverage_end      TIMESTAMPTZ,
      coverage_location VARCHAR(200),

      -- Step 2: 드론 대수
      drone_count       INT DEFAULT 1,

      -- Step 2: 드론 정보 (JSON 배열로 저장 - 최대 10대)
      -- 각 항목: { type, serial_number, weight, plan, plan_price }
      drones            JSONB DEFAULT '[]',

      -- Step 2: 선택한 플랜 요약
      total_premium     INT DEFAULT 0,  -- 원 단위

      -- 약관 동의
      terms_agreed      BOOLEAN DEFAULT FALSE,
      agreed_at         TIMESTAMPTZ,

      -- 메타
      source_page       VARCHAR(100) DEFAULT 'personal-drone-insurance-form',
      status            VARCHAR(30)  DEFAULT 'pending'  -- pending | processing | issued | cancelled
    );
  `;

  // 3. 인덱스
  await sql`CREATE INDEX IF NOT EXISTS idx_drone_inquiries_created_at ON drone_inquiries(created_at DESC);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_drone_inquiries_status ON drone_inquiries(status);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_personal_drone_apps_created_at ON personal_drone_applications(created_at DESC);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_personal_drone_apps_status ON personal_drone_applications(status);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_personal_drone_apps_phone ON personal_drone_applications(phone);`;

  return { success: true, message: '테이블 초기화 완료' };
}
