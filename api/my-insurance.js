/**
 * api/my-insurance.js
 * 계약 조회 / 변경 API
 *
 * ── SMS OTP: 솔라피(Solapi) 공식 Node.js SDK ──
 *   npm install solapi
 *
 * 환경변수 (Vercel Dashboard → Settings → Environment Variables):
 *   SOLAPI_API_KEY    = NCSAJG4NTNBPPQAL
 *   SOLAPI_API_SECRET = 3RGHNPFUXTIQM7OAQY2SZRCU5PSMTL99
 *   SOLAPI_SENDER     = 01084618712
 *   EMAIL_USER        = Gmail 주소 (OTP SMS 실패 시 fallback)
 *   EMAIL_PASS        = Gmail 앱 비밀번호
 *   ADMIN_EMAIL       = liab.on.ins@gmail.com
 *
 * ⚠️ Solapi 콘솔에서 API Key IP 설정을 "모든 IP 허용"으로 해야 함
 *    (Vercel 서버리스는 IP가 유동적)
 *
 * ── 향후 연동 예정 ──
 *   DB   : liab_db_POSTGRES_URL (personal_drone_applications + drone_details)
 *   보험사: INSURER_API_URL + INSURER_API_KEY
 */

'use strict';

const nodemailer = require('nodemailer');
const { SolapiMessageService } = require('solapi');

// ═══════════════════════════════════════════════════
//  솔라피 공식 Node.js SDK
//  https://developers.solapi.com/category/nodejs
//  npm install solapi
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

/**
 * 솔라피 SMS 단건 발송 (공식 SDK)
 */
async function sendSolapiSms(to, text) {
    const messageService = getSolapiService();
    const sender = process.env.SOLAPI_SENDER;

    if (!messageService || !sender) {
        console.warn('[Solapi] 환경변수 없음 (SOLAPI_API_SECRET / SOLAPI_SENDER). SMS 건너뜀.');
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
        console.log('[Solapi] SMS 발송 성공 →', cleanTo, '| result:', JSON.stringify(result));
        return result;
    } catch (err) {
        console.error('[Solapi] SMS 발송 실패:', err.message || err);
        throw new Error(`SMS 발송 실패: ${err.message || JSON.stringify(err)}`);
    }
}

// ═══════════════════════════════════════════════════
//  이메일 (nodemailer) — SMS fallback & 관리자 알림
// ═══════════════════════════════════════════════════

function getTransporter() {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
    return nodemailer.createTransport({
        host:   'smtp.gmail.com',
        port:   587,
        secure: false,
        auth:   { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'liab.on.ins@gmail.com';

async function sendAdminEmail(subject, text) {
    const t = getTransporter();
    if (!t) { console.warn('[Email] EMAIL_USER/PASS 없음. 이메일 건너뜀.'); return; }
    try {
        await t.sendMail({
            from:    `"배상온 대리점 시스템" <${process.env.EMAIL_USER}>`,
            to:      ADMIN_EMAIL,
            subject, text,
        });
    } catch (e) {
        console.error('[Email] 전송 실패:', e.message);
    }
}

// ═══════════════════════════════════════════════════
//  In-memory OTP Store
//  { cleanPhone: { code, expires, name } }
//  ⚠️ 운영 환경에서는 Redis 또는 DB로 교체하세요
// ═══════════════════════════════════════════════════
const otpStore = {};

function generateOTP() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

// ═══════════════════════════════════════════════════
//  DB / 보험사 API 연동 준비
// ═══════════════════════════════════════════════════

/** DB 연동 시 이 함수를 수정하세요 */
async function fetchContractsFromDb(name, phone) {
    // ── DB 연동 (주석 해제 후 사용) ──────────────────────────────
    // const { Pool } = require('pg');
    // const pool = new Pool({
    //     connectionString: process.env.liab_db_POSTGRES_URL,
    //     ssl: { rejectUnauthorized: false },
    // });
    // const { rows } = await pool.query(
    //     `SELECT a.*,
    //             COALESCE(json_agg(d ORDER BY d.drone_index)
    //                 FILTER (WHERE d.id IS NOT NULL), '[]') AS drones
    //      FROM personal_drone_applications a
    //      LEFT JOIN drone_details d ON d.application_id = a.id
    //      WHERE a.name = $1 AND a.phone = $2
    //      GROUP BY a.id ORDER BY a.created_at DESC`,
    //     [name, phone]
    // );
    // await pool.end();
    // return rows.map(mapDbRowToContract);

    // ── 보험사 API 연동 (주석 해제 후 사용) ──────────────────────
    // const res = await fetch(`${process.env.INSURER_API_URL}/contracts/search`, {
    //     method:  'POST',
    //     headers: {
    //         'Authorization': `Bearer ${process.env.INSURER_API_KEY}`,
    //         'Content-Type':  'application/json',
    //     },
    //     body: JSON.stringify({ name, phone }),
    // });
    // const json = await res.json();
    // return json.contracts;

    // 현재: null → 클라이언트 Mock 사용
    return null;
}

function mapDbRowToContract(row) {
    const now   = new Date();
    const start = row.coverage_start_date ? new Date(row.coverage_start_date) : null;
    const end   = row.coverage_end_date   ? new Date(row.coverage_end_date)   : null;

    let status = row.status || 'pending';
    if (status !== 'cancelled') {
        if (!start)              status = 'pending';
        else if (now < start)    status = 'pending';
        else if (end && now > end) status = 'expired';
        else                     status = 'active';
    }

    return {
        id:            `KBD-${String(row.id).padStart(8, '0')}`,
        product:       'KB손해보험 개인용 드론보험',
        status,
        plan:          (row.drone_plans && JSON.parse(row.drone_plans)[0]?.plan_name) || '',
        start_date:    row.coverage_start_date || '',
        end_date:      row.coverage_end_date   || '',
        total_premium: Number(row.total_premium) || 0,
        drones: (row.drones || []).map(d => ({
            index:      d.drone_index,
            model:      d.model,
            serial:     d.serial_number,
            type:       d.drone_type,
            type_name:  d.drone_type_name,
            weight:     d.weight,
            max_weight: d.max_weight,
        })),
        can_cancel:    status === 'pending',
        can_terminate: status === 'active',
        created_at:    row.created_at
            ? new Date(row.created_at).toISOString().split('T')[0]
            : '',
    };
}

// ═══════════════════════════════════════════════════
//  MAIN HANDLER
// ═══════════════════════════════════════════════════

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin',  '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'POST 요청만 허용됩니다.' });
    }

    const {
        action, name, phone, otp,
        contract_id, changes, reason, refund_account,
    } = req.body || {};

    if (!action) {
        return res.status(400).json({ success: false, message: 'action 파라미터가 필요합니다.' });
    }

    // ─────────────────────────────────────────────
    //  send_otp : SMS 인증번호 발송
    // ─────────────────────────────────────────────
    if (action === 'send_otp') {
        const trimName = (name || '').trim();
        const cleanPhone = (phone || '').replace(/\D/g, '');

        if (!trimName || trimName.length < 2) {
            return res.status(400).json({ success: false, message: '이름을 올바르게 입력해주세요.' });
        }
        if (cleanPhone.length !== 11 || !cleanPhone.startsWith('0')) {
            return res.status(400).json({ success: false, message: '올바른 휴대폰 번호(11자리)를 입력해주세요.' });
        }

        // 1분 재발송 제한
        const prev = otpStore[cleanPhone];
        if (prev && Date.now() < prev.expires - 120_000) {
            return res.status(429).json({
                success: false,
                message: '잠시 후 재시도해주세요. (1분 후 재발송 가능)',
            });
        }

        const code    = generateOTP();
        const expires = Date.now() + 3 * 60 * 1000; // 3분
        otpStore[cleanPhone] = { code, expires, name: trimName };

        const smsText = `[배상온] 본인확인을 위해 인증번호 [${code}]를 입력해주세요.`;

        let smsSent = false;
        let smsError = null;

        try {
            await sendSolapiSms(cleanPhone, smsText);
            smsSent = true;
        } catch (err) {
            smsError = err.message;
            console.error('[OTP] SMS 실패, 관리자 이메일 fallback:', err.message);
            // SMS 실패 시 관리자에게 이메일 대체 전송 (임시)
            await sendAdminEmail(
                `[OTP fallback] ${cleanPhone} → ${code}`,
                `고객: ${trimName}\n번호: ${cleanPhone}\nOTP: ${code}\n\n⚠️ SMS 발송 실패 (이메일 대체 전송)\n오류: ${err.message}\n\n※ SOLAPI_API_SECRET 및 SOLAPI_SENDER 환경변수를 확인하세요.`
            );
        }

        console.log(`[OTP] ${cleanPhone} | code=${code} | sent=${smsSent}`);

        return res.status(200).json({
            success: true,
            message: smsSent
                ? '인증번호를 발송했습니다. 3분 이내에 입력해주세요.'
                : '인증번호 발송에 문제가 발생했습니다. 담당자에게 문의해주세요.',
            sms_sent: smsSent,
            // 개발 모드에서만 코드 노출 — 운영 배포 전 반드시 제거
            ...(process.env.NODE_ENV === 'development' && { _dev_code: code }),
        });
    }

    // ─────────────────────────────────────────────
    //  verify_and_fetch : OTP 검증 + 계약 조회
    // ─────────────────────────────────────────────
    if (action === 'verify_and_fetch') {
        const trimName   = (name || '').trim();
        const cleanPhone = (phone || '').replace(/\D/g, '');
        const trimOtp    = (otp   || '').trim();

        if (!trimName || !cleanPhone) {
            return res.status(400).json({ success: false, message: '이름과 휴대폰 번호를 입력해주세요.' });
        }

        // OTP가 제출된 경우 검증
        if (trimOtp) {
            const stored = otpStore[cleanPhone];
            if (!stored) {
                return res.status(400).json({ success: false, message: '인증번호를 먼저 요청해주세요.' });
            }
            if (Date.now() > stored.expires) {
                delete otpStore[cleanPhone];
                return res.status(400).json({ success: false, message: '인증번호가 만료되었습니다. 재발송해주세요.' });
            }
            if (stored.code !== trimOtp) {
                return res.status(400).json({ success: false, message: '인증번호가 올바르지 않습니다.' });
            }
            if (stored.name !== trimName) {
                return res.status(400).json({ success: false, message: '이름이 가입 정보와 일치하지 않습니다.' });
            }
            delete otpStore[cleanPhone]; // 사용 완료 즉시 삭제
        }

        // DB / 보험사 API 조회
        const contracts = await fetchContractsFromDb(trimName, cleanPhone);

        // null = 아직 DB 미연동 → 클라이언트 Mock 사용
        if (contracts === null) {
            return res.status(200).json({
                success:   true,
                message:   '조회 완료 (현재 Mock 모드)',
                contracts: null,
                _note:     'DB/보험사 API 연동 전입니다. api/my-insurance.js의 fetchContractsFromDb를 수정하세요.',
            });
        }

        return res.status(200).json({
            success:   true,
            message:   `${contracts.length}건의 계약을 조회했습니다.`,
            contracts,
        });
    }

    // ─────────────────────────────────────────────
    //  change_drone_info : 드론 정보 변경
    // ─────────────────────────────────────────────
    if (action === 'change_drone_info') {
        if (!name || !phone || !contract_id || !changes) {
            return res.status(400).json({ success: false, message: '필수 정보가 누락되었습니다.' });
        }

        // TODO: DB 업데이트
        // for (const c of changes) {
        //   await pool.query(`UPDATE drone_details SET model=$1, serial_number=$2, drone_type=$3,
        //     weight=$4, max_weight=$5 WHERE application_id=... AND drone_index=$6`,
        //     [c.model, c.serial, c.type, c.weight, c.max_weight, c.index]);
        // }

        // TODO: 보험사 API PUT /contracts/{id}/drones

        const detail = Array.isArray(changes)
            ? changes.map((c, i) =>
                `드론${i + 1}: ${c.model} / ${c.serial} / ${c.type} / ${c.weight}kg / ${c.max_weight}kg`
              ).join('\n')
            : JSON.stringify(changes);

        await sendAdminEmail(
            `[드론정보변경] ${name} / ${contract_id}`,
            `고객명: ${name}\n번호: ${phone}\n계약번호: ${contract_id}\n\n변경내용:\n${detail}\n\n요청시각: ${new Date().toLocaleString('ko-KR')}`
        );

        return res.status(200).json({
            success: true,
            message: '드론 정보 변경 요청이 접수되었습니다. 담당자가 1~2 영업일 내 처리해드립니다.',
        });
    }

    // ─────────────────────────────────────────────
    //  cancel_contract : 계약 취소 (개시 전)
    // ─────────────────────────────────────────────
    if (action === 'cancel_contract') {
        if (!name || !phone || !contract_id) {
            return res.status(400).json({ success: false, message: '필수 정보가 누락되었습니다.' });
        }

        // TODO: DB status='cancelled' 업데이트
        // TODO: 보험사 API POST /contracts/{id}/cancel

        await sendAdminEmail(
            `[계약취소] ${name} / ${contract_id}`,
            `고객명: ${name}\n번호: ${phone}\n계약번호: ${contract_id}\n취소사유: ${reason || '미입력'}\n\n요청시각: ${new Date().toLocaleString('ko-KR')}\n\n⚠️ 환불 처리 필요 (3~5 영업일)`
        );

        return res.status(200).json({
            success: true,
            message: '계약이 취소되었습니다. 환불은 결제 수단으로 3~5 영업일 내 처리됩니다.',
        });
    }

    // ─────────────────────────────────────────────
    //  terminate_contract : 계약 해지 (개시 후)
    // ─────────────────────────────────────────────
    if (action === 'terminate_contract') {
        if (!name || !phone || !contract_id) {
            return res.status(400).json({ success: false, message: '필수 정보가 누락되었습니다.' });
        }

        // TODO: DB status='terminated' 업데이트
        // TODO: 보험사 API POST /contracts/{id}/terminate + 미경과보험료 계산

        await sendAdminEmail(
            `[계약해지] ${name} / ${contract_id}`,
            `고객명: ${name}\n번호: ${phone}\n계약번호: ${contract_id}\n해지사유: ${reason || '미입력'}\n환불계좌: ${refund_account || '원결제수단'}\n\n요청시각: ${new Date().toLocaleString('ko-KR')}\n\n⚠️ 미경과보험료 환불 처리 필요`
        );

        return res.status(200).json({
            success: true,
            message: '계약 해지 신청이 완료되었습니다. 미경과 보험료는 보험사 처리 후 5~7 영업일 내 환불됩니다.',
        });
    }

    return res.status(400).json({ success: false, message: `알 수 없는 action: ${action}` });
};
