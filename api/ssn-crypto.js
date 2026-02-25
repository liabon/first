/**
 * 주민번호 뒷자리 암호화/복호화 유틸리티
 * 
 * [프론트 → 서버]
 *   프론트에서 XOR+Base64 경량 인코딩으로 전송 (HTTPS 통신 중 이미 TLS 암호화)
 *   서버에서 수신 후 XOR 복호화 → AES-256-CBC로 재암호화 → DB 저장
 * 
 * [DB → 보험사 API]
 *   DB에서 AES-256 암호문 조회 → 복호화 → 보험사 API 전송
 * 
 * 환경변수 필요:
 *   SSN_ENCRYPT_KEY=32바이트키 (예: kbInsLiab2026SecureKey12345678!!)
 * 
 * 사용법:
 *   const { decryptFromFront, encryptForDB, decryptFromDB } = require('./ssn-crypto');
 *   
 *   // 프론트에서 받은 값 → DB 저장
 *   const plain = decryptFromFront(req.body.ssn_back);
 *   const encrypted = encryptForDB(plain);
 *   // → DB에 encrypted 저장
 *   
 *   // DB에서 꺼내서 보험사 API 전송
 *   const decrypted = decryptFromDB(encrypted);
 *   // → 보험사 API에 decrypted 전송
 */

const crypto = require('crypto');

// ── 환경변수에서 키 로드 ──
const AES_KEY = process.env.SSN_ENCRYPT_KEY || 'kbInsLiab2026SecureKey12345678!!'; // 반드시 32바이트
const AES_IV_LENGTH = 16;
const FRONT_XOR_KEY = 'kbInsLiab2026!@#'; // 프론트와 동일한 키

/**
 * 1단계: 프론트 XOR+Base64 → 평문 복호화
 * 프론트에서 encryptSSN()으로 인코딩된 값을 복호화
 */
function decryptFromFront(encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('binary');
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
        result += String.fromCharCode(
            decoded.charCodeAt(i) ^ FRONT_XOR_KEY.charCodeAt(i % FRONT_XOR_KEY.length)
        );
    }
    return result;
}

/**
 * 2단계: 평문 → AES-256-CBC 암호화 (DB 저장용)
 * 매번 랜덤 IV 생성 → IV:암호문 형태로 반환
 */
function encryptForDB(plainText) {
    const iv = crypto.randomBytes(AES_IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(AES_KEY, 'utf8'), iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    // IV:암호문 형태로 저장 (복호화 시 IV 필요)
    return iv.toString('hex') + ':' + encrypted;
}

/**
 * 3단계: AES-256-CBC 암호문 → 평문 복호화 (보험사 API 전송용)
 */
function decryptFromDB(encryptedText) {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(AES_KEY, 'utf8'), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

module.exports = { decryptFromFront, encryptForDB, decryptFromDB };

/*
 * ──────────────────────────────────────────────
 * 사용 예시 (API 엔드포인트에서)
 * ──────────────────────────────────────────────
 * 
 * const { decryptFromFront, encryptForDB, decryptFromDB } = require('./ssn-crypto');
 * 
 * // [가입 신청 API] 프론트 → DB 저장
 * app.post('/api/save-business-drone', async (req, res) => {
 *     const ssnPlain = decryptFromFront(req.body.ssn_back);  // 프론트 XOR 복호화
 *     const ssnEncrypted = encryptForDB(ssnPlain);           // AES 암호화
 *     
 *     await db.query(
 *         'INSERT INTO business_drone_applications (birth_date, ssn_back, ...) VALUES ($1, $2, ...)',
 *         [req.body.birth_date, ssnEncrypted, ...]
 *     );
 * });
 * 
 * // [보험사 API 전송] DB → 복호화 → 전송
 * app.post('/api/send-to-insurer', async (req, res) => {
 *     const row = await db.query('SELECT ssn_back FROM ... WHERE id = $1', [id]);
 *     const ssnPlain = decryptFromDB(row.rows[0].ssn_back);  // AES 복호화
 *     
 *     // 보험사 API에 평문 전송
 *     await fetch('https://insurer-api.example.com/submit', {
 *         body: JSON.stringify({ ssn_back: ssnPlain })
 *     });
 * });
 * 
 * ──────────────────────────────────────────────
 * DB 테이블 컬럼 추가 SQL
 * ──────────────────────────────────────────────
 * 
 * ALTER TABLE personal_drone_applications ADD COLUMN ssn_back TEXT;
 * ALTER TABLE business_drone_applications ADD COLUMN ssn_back TEXT;
 * 
 * ──────────────────────────────────────────────
 * Vercel 환경변수 추가
 * ──────────────────────────────────────────────
 * 
 * SSN_ENCRYPT_KEY=kbInsLiab2026SecureKey12345678!!
 * (반드시 32바이트 = 32자 ASCII)
 */
