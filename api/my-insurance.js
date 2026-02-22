/**
 * api/my-insurance.js
 * 계약 조회 / 변경 / 취소 / 해지 API (DB 연동)
 *
 * 환경변수:
 *   liab_db_POSTGRES_URL  = PostgreSQL 연결 URL
 *   SOLAPI_API_KEY / SOLAPI_API_SECRET / SOLAPI_SENDER
 *   EMAIL_USER / EMAIL_PASS / ADMIN_EMAIL
 */

'use strict';

const crypto     = require('crypto');
const nodemailer = require('nodemailer');
const { Pool }   = require('pg');
const { SolapiMessageService } = require('solapi');

// ═══════════════════════════════════════════════════
//  DB Pool
// ═══════════════════════════════════════════════════
let _pool = null;
function getPool() {
    if (_pool) return _pool;
    _pool = new Pool({
        connectionString: process.env.liab_db_POSTGRES_URL,
        ssl: { rejectUnauthorized: false },
        max: 5,
    });
    return _pool;
}

// ═══════════════════════════════════════════════════
//  솔라피 SDK
// ═══════════════════════════════════════════════════
let _messageService = null;
function getSolapiService() {
    if (_messageService) return _messageService;
    const apiKey    = process.env.SOLAPI_API_KEY    || 'NCSAJG4NTNBPPQAL';
    const apiSecret = process.env.SOLAPI_API_SECRET;
    if (!apiSecret) return null;
    _messageService = new SolapiMessageService(apiKey, apiSecret);
    return _messageService;
}

async function sendSolapiSms(to, text) {
    const messageService = getSolapiService();
    const sender = process.env.SOLAPI_SENDER;
    if (!messageService || !sender) {
        console.warn('[Solapi] 환경변수 없음. SMS 건너뜀.');
        return { skipped: true };
    }
    const cleanTo     = to.replace(/\D/g, '');
    const cleanSender = sender.replace(/\D/g, '');
    try {
        const result = await messageService.send({
            to: cleanTo, from: cleanSender, text,
        });
        console.log('[Solapi] SMS 발송 성공 →', cleanTo);
        return result;
    } catch (err) {
        console.error('[Solapi] SMS 발송 실패:', err.message || err);
        throw new Error(`SMS 발송 실패: ${err.message || JSON.stringify(err)}`);
    }
}

// ═══════════════════════════════════════════════════
//  이메일
// ═══════════════════════════════════════════════════
function getTransporter() {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
    return nodemailer.createTransport({
        host: 'smtp.gmail.com', port: 587, secure: false,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
}
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'liab.on.ins@gmail.com';

async function sendAdminEmail(subject, text) {
    const t = getTransporter();
    if (!t) { console.warn('[Email] EMAIL_USER/PASS 없음.'); return; }
    try {
        await t.sendMail({
            from: `"배상온 대리점 시스템" <${process.env.EMAIL_USER}>`,
            to: ADMIN_EMAIL, subject, text,
        });
    } catch (e) { console.error('[Email] 전송 실패:', e.message); }
}

// ═══════════════════════════════════════════════════
//  OTP: Stateless Token
// ═══════════════════════════════════════════════════
const OTP_SECRET = process.env.SOLAPI_API_SECRET || 'fallback-secret-key';

function generateOTP() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

function createOtpToken(code, name, phone) {
    const payload = JSON.stringify({
        code, name, phone,
        expires: Date.now() + 3 * 60 * 1000,
    });
    const key = crypto.createHash('sha256').update(OTP_SECRET).digest();
    const iv  = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let enc = cipher.update(payload, 'utf8', 'hex');
    enc += cipher.final('hex');
    return iv.toString('hex') + ':' + enc;
}

function decryptOtpToken(token) {
    try {
        const [ivHex, enc] = token.split(':');
        const key = crypto.createHash('sha256').update(OTP_SECRET).digest();
        const iv  = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let dec = decipher.update(enc, 'hex', 'utf8');
        dec += decipher.final('utf8');
        return JSON.parse(dec);
    } catch { return null; }
}

// ═══════════════════════════════════════════════════
//  DB: 계약 조회
// ═══════════════════════════════════════════════════
async function fetchContractsFromDb(name, phone) {
    const pool = getPool();
    try {
        const { rows } = await pool.query(
            `SELECT a.*,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'drone_index', d.drone_index,
                                'model', d.model,
                                'serial_number', d.serial_number,
                                'drone_type', d.drone_type,
                                'drone_type_name', d.drone_type_name,
                                'weight', d.weight,
                                'max_weight', d.max_weight,
                                'plan', d.plan,
                                'plan_name', d.plan_name,
                                'price', d.price
                            ) ORDER BY d.drone_index
                        ) FILTER (WHERE d.id IS NOT NULL), '[]'
                    ) AS drones
             FROM personal_drone_applications a
             LEFT JOIN drone_details d ON d.application_id = a.id
             WHERE a.name = $1 AND a.phone = $2
             GROUP BY a.id
             ORDER BY a.created_at DESC`,
            [name, phone]
        );
        if (rows.length === 0) return [];
        return rows.map(mapDbRowToContract);
    } catch (err) {
        console.error('[DB] 계약 조회 실패:', err.message);
        return null;
    }
}

function mapDbRowToContract(row) {
    const now = new Date();
    let start = null;
    let end   = null;
    if (row.coverage_start_date) {
        const t = row.coverage_start_time || '00:00';
        start = new Date(row.coverage_start_date + 'T' + t);
    }
    if (row.coverage_end_date) {
        const t = row.coverage_end_time || '23:59';
        end = new Date(row.coverage_end_date + 'T' + t);
    }

    let status = row.status || 'pending';
    if (status !== 'cancelled' && status !== 'terminated') {
        if (!start || isNaN(start))       status = 'pending';
        else if (now < start)             status = 'pending';
        else if (end && !isNaN(end) && now > end) status = 'expired';
        else if (start && now >= start)   status = 'active';
    }

    const dronesRaw = typeof row.drones === 'string' ? JSON.parse(row.drones) : (row.drones || []);
    const firstDrone = dronesRaw[0] || {};

    return {
        id:             'KBD-' + String(row.id).padStart(8, '0'),
        application_id: row.id,
        product:        'KB손해보험 개인용 드론보험',
        status,
        plan:           firstDrone.plan_name || '',
        start_date:     row.coverage_start_date || '',
        end_date:       row.coverage_end_date   || '',
        total_premium:  Number(row.total_premium) || 0,
        drones: dronesRaw.map(function(d) { return {
            index:      d.drone_index,
            model:      d.model,
            serial:     d.serial_number,
            type:       d.drone_type,
            type_name:  d.drone_type_name,
            weight:     d.weight,
            max_weight: d.max_weight,
        }; }),
        can_cancel:     status === 'pending',
        can_terminate:  status === 'active',
        created_at:     row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : '',
    };
}

// ═══════════════════════════════════════════════════
//  contract_id → application PK
// ═══════════════════════════════════════════════════
function parseApplicationId(contractId) {
    var match = contractId.match(/KBD-0*(\d+)/);
    return match ? parseInt(match[1], 10) : null;
}

// ═══════════════════════════════════════════════════
//  DB: 드론 변경 이력 저장
// ═══════════════════════════════════════════════════
async function saveDroneChangeRequest(name, phone, contractId, changes) {
    const pool = getPool();
    const appId = parseApplicationId(contractId);

    const { rows } = await pool.query(
        `INSERT INTO contract_requests
            (application_id, contract_id, request_type, customer_name, customer_phone, request_data)
         VALUES ($1, $2, 'drone_change', $3, $4, $5)
         RETURNING id`,
        [appId, contractId, name, phone, JSON.stringify(changes)]
    );
    const requestId = rows[0].id;

    let oldDrones = [];
    if (appId) {
        const dRes = await pool.query(
            `SELECT drone_index, model, serial_number, drone_type, weight, max_weight
             FROM drone_details WHERE application_id = $1 ORDER BY drone_index`,
            [appId]
        );
        oldDrones = dRes.rows;
    }

    for (const change of changes) {
        const idx = change.index != null ? change.index : 0;
        const old = oldDrones.find(function(d) { return d.drone_index === idx; }) || {};

        const fields = [
            { field: 'model',      oldVal: old.model || '',           newVal: change.model || '' },
            { field: 'serial',     oldVal: old.serial_number || '',   newVal: change.serial || '' },
            { field: 'type',       oldVal: old.drone_type || '',      newVal: change.type || '' },
            { field: 'weight',     oldVal: String(old.weight || ''),  newVal: String(change.weight || '') },
            { field: 'max_weight', oldVal: String(old.max_weight || ''), newVal: String(change.max_weight || '') },
        ];

        for (const f of fields) {
            if (f.oldVal !== f.newVal) {
                await pool.query(
                    `INSERT INTO drone_change_logs (request_id, drone_index, field_name, old_value, new_value)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [requestId, idx, f.field, f.oldVal || null, f.newVal || null]
                );
            }
        }
    }

    return requestId;
}

// ═══════════════════════════════════════════════════
//  DB: 계약 취소
// ═══════════════════════════════════════════════════
async function saveCancelRequest(name, phone, contractId, reason) {
    const pool = getPool();
    const appId = parseApplicationId(contractId);

    const { rows } = await pool.query(
        `INSERT INTO contract_requests
            (application_id, contract_id, request_type, customer_name, customer_phone, reason)
         VALUES ($1, $2, 'cancel', $3, $4, $5)
         RETURNING id`,
        [appId, contractId, name, phone, reason || null]
    );

    if (appId) {
        await pool.query(
            `UPDATE personal_drone_applications SET status = 'cancelled' WHERE id = $1`,
            [appId]
        );
    }
    return rows[0].id;
}

// ═══════════════════════════════════════════════════
//  DB: 계약 해지
// ═══════════════════════════════════════════════════
async function saveTerminateRequest(name, phone, contractId, reason, refundAccount) {
    const pool = getPool();
    const appId = parseApplicationId(contractId);

    const { rows } = await pool.query(
        `INSERT INTO contract_requests
            (application_id, contract_id, request_type, customer_name, customer_phone, reason, refund_account)
         VALUES ($1, $2, 'terminate', $3, $4, $5, $6)
         RETURNING id`,
        [appId, contractId, name, phone, reason || null, refundAccount || null]
    );

    if (appId) {
        await pool.query(
            `UPDATE personal_drone_applications SET status = 'terminated' WHERE id = $1`,
            [appId]
        );
    }
    return rows[0].id;
}

// ═══════════════════════════════════════════════════
//  MAIN HANDLER
// ═══════════════════════════════════════════════════
module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin',  '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'POST 요청만 허용됩니다.' });
    }

    const {
        action, name, phone, otp, otp_token,
        contract_id, changes, reason, refund_account,
    } = req.body || {};

    if (!action) {
        return res.status(400).json({ success: false, message: 'action 파라미터가 필요합니다.' });
    }

    // ── send_otp ──
    if (action === 'send_otp') {
        const trimName   = (name || '').trim();
        const cleanPhone = (phone || '').replace(/\D/g, '');

        if (!trimName || trimName.length < 2)
            return res.status(400).json({ success: false, message: '이름을 올바르게 입력해주세요.' });
        if (cleanPhone.length !== 11 || !cleanPhone.startsWith('0'))
            return res.status(400).json({ success: false, message: '올바른 휴대폰 번호(11자리)를 입력해주세요.' });

        const code  = generateOTP();
        const token = createOtpToken(code, trimName, cleanPhone);
        const smsText = '[배상온] 본인확인을 위해 인증번호 [' + code + ']를 입력해주세요.';

        let smsSent = false;
        try {
            await sendSolapiSms(cleanPhone, smsText);
            smsSent = true;
        } catch (err) {
            console.error('[OTP] SMS 실패, fallback:', err.message);
            await sendAdminEmail(
                '[OTP fallback] ' + cleanPhone + ' → ' + code,
                '고객: ' + trimName + '\n번호: ' + cleanPhone + '\nOTP: ' + code + '\n\n⚠️ SMS 발송 실패\n오류: ' + err.message
            );
        }

        console.log('[OTP] ' + cleanPhone + ' | code=' + code + ' | sent=' + smsSent);

        return res.status(200).json({
            success: true,
            message: smsSent
                ? '인증번호를 발송했습니다. 3분 이내에 입력해주세요.'
                : '인증번호 발송에 문제가 발생했습니다. 담당자에게 문의해주세요.',
            sms_sent:  smsSent,
            otp_token: token,
        });
    }

    // ── verify_and_fetch ──
    if (action === 'verify_and_fetch') {
        const trimName   = (name || '').trim();
        const cleanPhone = (phone || '').replace(/\D/g, '');
        const trimOtp    = (otp   || '').trim();

        if (!trimName || !cleanPhone)
            return res.status(400).json({ success: false, message: '이름과 휴대폰 번호를 입력해주세요.' });

        if (trimOtp) {
            if (!otp_token)
                return res.status(400).json({ success: false, message: '인증번호를 먼저 요청해주세요.' });
            const payload = decryptOtpToken(otp_token);
            if (!payload)
                return res.status(400).json({ success: false, message: '인증 정보가 유효하지 않습니다. 다시 요청해주세요.' });
            if (Date.now() > payload.expires)
                return res.status(400).json({ success: false, message: '인증번호가 만료되었습니다. 재발송해주세요.' });
            if (payload.code !== trimOtp)
                return res.status(400).json({ success: false, message: '인증번호가 올바르지 않습니다.' });
            if (payload.name !== trimName)
                return res.status(400).json({ success: false, message: '이름이 가입 정보와 일치하지 않습니다.' });
            if (payload.phone !== cleanPhone)
                return res.status(400).json({ success: false, message: '휴대폰 번호가 일치하지 않습니다.' });
        }

        const contracts = await fetchContractsFromDb(trimName, cleanPhone);

        if (contracts === null) {
            return res.status(200).json({
                success: true, message: '조회 완료',
                contracts: null,
            });
        }

        return res.status(200).json({
            success: true,
            message: contracts.length + '건의 계약을 조회했습니다.',
            contracts,
        });
    }

    // ── change_drone_info ──
    if (action === 'change_drone_info') {
        if (!name || !phone || !contract_id || !changes)
            return res.status(400).json({ success: false, message: '필수 정보가 누락되었습니다.' });

        let requestId = null;
        try {
            requestId = await saveDroneChangeRequest(name, phone, contract_id, changes);
            console.log('[DB] 드론변경 요청 저장 완료: request_id=' + requestId);
        } catch (err) {
            console.error('[DB] 드론변경 요청 저장 실패:', err.message);
        }

        const detail = Array.isArray(changes)
            ? changes.map(function(c, i) { return '드론' + (i+1) + ': ' + c.model + ' / ' + c.serial + ' / ' + c.type + ' / ' + c.weight + 'kg / ' + c.max_weight + 'kg'; }).join('\n')
            : JSON.stringify(changes);

        await sendAdminEmail(
            '[드론정보변경] ' + name + ' / ' + contract_id + (requestId ? ' (요청#' + requestId + ')' : ''),
            '고객명: ' + name + '\n번호: ' + phone + '\n계약번호: ' + contract_id + '\n요청번호: ' + (requestId || 'DB저장실패') + '\n\n변경내용:\n' + detail + '\n\n요청시각: ' + new Date().toLocaleString('ko-KR')
        );

        return res.status(200).json({
            success: true,
            message: '드론 정보 변경 요청이 접수되었습니다. 담당자가 1~2 영업일 내 처리해드립니다.',
            request_id: requestId,
        });
    }

    // ── cancel_contract ──
    if (action === 'cancel_contract') {
        if (!name || !phone || !contract_id)
            return res.status(400).json({ success: false, message: '필수 정보가 누락되었습니다.' });

        let requestId = null;
        try {
            requestId = await saveCancelRequest(name, phone, contract_id, reason);
            console.log('[DB] 계약취소 요청 저장 완료: request_id=' + requestId);
        } catch (err) {
            console.error('[DB] 계약취소 요청 저장 실패:', err.message);
        }

        await sendAdminEmail(
            '[계약취소] ' + name + ' / ' + contract_id + (requestId ? ' (요청#' + requestId + ')' : ''),
            '고객명: ' + name + '\n번호: ' + phone + '\n계약번호: ' + contract_id + '\n요청번호: ' + (requestId || 'DB저장실패') + '\n취소사유: ' + (reason || '미입력') + '\n\n요청시각: ' + new Date().toLocaleString('ko-KR') + '\n\n⚠️ 환불 처리 필요 (3~5 영업일)'
        );

        return res.status(200).json({
            success: true,
            message: '계약이 취소되었습니다. 환불은 결제 수단으로 3~5 영업일 내 처리됩니다.',
            request_id: requestId,
        });
    }

    // ── terminate_contract ──
    if (action === 'terminate_contract') {
        if (!name || !phone || !contract_id)
            return res.status(400).json({ success: false, message: '필수 정보가 누락되었습니다.' });

        let requestId = null;
        try {
            requestId = await saveTerminateRequest(name, phone, contract_id, reason, refund_account);
            console.log('[DB] 계약해지 요청 저장 완료: request_id=' + requestId);
        } catch (err) {
            console.error('[DB] 계약해지 요청 저장 실패:', err.message);
        }

        await sendAdminEmail(
            '[계약해지] ' + name + ' / ' + contract_id + (requestId ? ' (요청#' + requestId + ')' : ''),
            '고객명: ' + name + '\n번호: ' + phone + '\n계약번호: ' + contract_id + '\n요청번호: ' + (requestId || 'DB저장실패') + '\n해지사유: ' + (reason || '미입력') + '\n환불계좌: ' + (refund_account || '원결제수단') + '\n\n요청시각: ' + new Date().toLocaleString('ko-KR') + '\n\n⚠️ 미경과보험료 환불 처리 필요'
        );

        return res.status(200).json({
            success: true,
            message: '계약 해지 신청이 완료되었습니다. 미경과 보험료는 보험사 처리 후 5~7 영업일 내 환불됩니다.',
            request_id: requestId,
        });
    }

    return res.status(400).json({ success: false, message: '알 수 없는 action: ' + action });
};
