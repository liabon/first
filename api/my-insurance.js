/**
 * api/my-insurance.js
 * 계약 조회 / 변경 API
 *
 * ── SMS OTP: 솔라피(Solapi) 공식 Node.js SDK ──
 * ── OTP 방식: Stateless Token (Vercel 서버리스 호환) ──
 *
 * 환경변수:
 *   SOLAPI_API_KEY    = NCSAJG4NTNBPPQAL
 *   SOLAPI_API_SECRET = 3RGHNPFUXTIQM7OAQY2SZRCU5PSMTL99
 *   SOLAPI_SENDER     = 01084618712
 *   EMAIL_USER / EMAIL_PASS / ADMIN_EMAIL
 *
 * ⚠️ Solapi 콘솔 API Key → "모든 IP 허용" 필수
 */

'use strict';

const crypto     = require('crypto');
const nodemailer = require('nodemailer');
const { SolapiMessageService } = require('solapi');

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
            to:   cleanTo,
            from: cleanSender,
            text: text,
        });
        console.log('[Solapi] SMS 발송 성공 →', cleanTo);
        return result;
    } catch (err) {
        console.error('[Solapi] SMS 발송 실패:', err.message || err);
        throw new Error(`SMS 발송 실패: ${err.message || JSON.stringify(err)}`);
    }
}

// ═══════════════════════════════════════════════════
//  이메일 (nodemailer)
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
//  OTP: Stateless Token (서버리스 호환)
//  서버에 OTP를 저장하지 않고, 암호화 토큰을 클라이언트에 전달.
//  검증 시 토큰을 복호화하여 OTP 코드/이름/번호/만료 비교.
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
//  DB 연동 준비
// ═══════════════════════════════════════════════════
async function fetchContractsFromDb(name, phone) {
    // DB 연동 시 주석 해제
    // const { Pool } = require('pg');
    // const pool = new Pool({ connectionString: process.env.liab_db_POSTGRES_URL, ssl: { rejectUnauthorized: false } });
    // const { rows } = await pool.query(`SELECT ... WHERE a.name=$1 AND a.phone=$2`, [name, phone]);
    // await pool.end();
    // return rows.map(mapDbRowToContract);
    return null;
}

function mapDbRowToContract(row) {
    const now   = new Date();
    const start = row.coverage_start_date ? new Date(row.coverage_start_date) : null;
    const end   = row.coverage_end_date   ? new Date(row.coverage_end_date)   : null;
    let status = row.status || 'pending';
    if (status !== 'cancelled') {
        if (!start) status = 'pending';
        else if (now < start) status = 'pending';
        else if (end && now > end) status = 'expired';
        else status = 'active';
    }
    return {
        id: `KBD-${String(row.id).padStart(8, '0')}`,
        product: 'KB손해보험 개인용 드론보험', status,
        plan: (row.drone_plans && JSON.parse(row.drone_plans)[0]?.plan_name) || '',
        start_date: row.coverage_start_date || '', end_date: row.coverage_end_date || '',
        total_premium: Number(row.total_premium) || 0,
        drones: (row.drones || []).map(d => ({
            index: d.drone_index, model: d.model, serial: d.serial_number,
            type: d.drone_type, type_name: d.drone_type_name,
            weight: d.weight, max_weight: d.max_weight,
        })),
        can_cancel: status === 'pending', can_terminate: status === 'active',
        created_at: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : '',
    };
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
        const smsText = `[배상온] 본인확인을 위해 인증번호 [${code}]를 입력해주세요.`;

        let smsSent = false;
        try {
            await sendSolapiSms(cleanPhone, smsText);
            smsSent = true;
        } catch (err) {
            console.error('[OTP] SMS 실패, fallback:', err.message);
            await sendAdminEmail(
                `[OTP fallback] ${cleanPhone} → ${code}`,
                `고객: ${trimName}\n번호: ${cleanPhone}\nOTP: ${code}\n\n⚠️ SMS 발송 실패\n오류: ${err.message}`
            );
        }

        console.log(`[OTP] ${cleanPhone} | code=${code} | sent=${smsSent}`);

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
            message: `${contracts.length}건의 계약을 조회했습니다.`,
            contracts,
        });
    }

    // ── change_drone_info ──
    if (action === 'change_drone_info') {
        if (!name || !phone || !contract_id || !changes)
            return res.status(400).json({ success: false, message: '필수 정보가 누락되었습니다.' });

        const detail = Array.isArray(changes)
            ? changes.map((c, i) => `드론${i+1}: ${c.model} / ${c.serial} / ${c.type} / ${c.weight}kg / ${c.max_weight}kg`).join('\n')
            : JSON.stringify(changes);

        await sendAdminEmail(
            `[드론정보변경] ${name} / ${contract_id}`,
            `고객명: ${name}\n번호: ${phone}\n계약번호: ${contract_id}\n\n변경내용:\n${detail}\n\n요청시각: ${new Date().toLocaleString('ko-KR')}`
        );
        return res.status(200).json({ success: true, message: '드론 정보 변경 요청이 접수되었습니다. 담당자가 1~2 영업일 내 처리해드립니다.' });
    }

    // ── cancel_contract ──
    if (action === 'cancel_contract') {
        if (!name || !phone || !contract_id)
            return res.status(400).json({ success: false, message: '필수 정보가 누락되었습니다.' });

        await sendAdminEmail(
            `[계약취소] ${name} / ${contract_id}`,
            `고객명: ${name}\n번호: ${phone}\n계약번호: ${contract_id}\n취소사유: ${reason || '미입력'}\n\n요청시각: ${new Date().toLocaleString('ko-KR')}\n\n⚠️ 환불 처리 필요 (3~5 영업일)`
        );
        return res.status(200).json({ success: true, message: '계약이 취소되었습니다. 환불은 결제 수단으로 3~5 영업일 내 처리됩니다.' });
    }

    // ── terminate_contract ──
    if (action === 'terminate_contract') {
        if (!name || !phone || !contract_id)
            return res.status(400).json({ success: false, message: '필수 정보가 누락되었습니다.' });

        await sendAdminEmail(
            `[계약해지] ${name} / ${contract_id}`,
            `고객명: ${name}\n번호: ${phone}\n계약번호: ${contract_id}\n해지사유: ${reason || '미입력'}\n환불계좌: ${refund_account || '원결제수단'}\n\n요청시각: ${new Date().toLocaleString('ko-KR')}\n\n⚠️ 미경과보험료 환불 처리 필요`
        );
        return res.status(200).json({ success: true, message: '계약 해지 신청이 완료되었습니다. 미경과 보험료는 보험사 처리 후 5~7 영업일 내 환불됩니다.' });
    }

    return res.status(400).json({ success: false, message: `알 수 없는 action: ${action}` });
};
