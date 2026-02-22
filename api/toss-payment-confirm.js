/**
 * api/toss-payment-confirm.js
 * ────────────────────────────────────────────────────────────────────
 * 토스페이먼츠 결제 승인 엔드포인트
 *
 * POST /api/toss-payment-confirm
 * Body: { paymentKey, orderId, amount }
 *
 * 환경변수 (Vercel > Settings > Environment Variables):
 *   TOSS_SECRET_KEY   - 결제위젯 연동 키 > 시크릿 키
 *                       테스트: test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6KBe
 *
 * ⚠️  시크릿 키는 절대 클라이언트에 노출하지 마세요.
 *     승인 API 호출은 반드시 서버에서만 수행합니다.
 * ────────────────────────────────────────────────────────────────────
 */

const https = require('https');

module.exports = async (req, res) => {
    // ── CORS ──
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const { paymentKey, orderId, amount } = req.body || {};

    // ── 필수값 검증 ──
    if (!paymentKey || !orderId || !amount) {
        return res.status(400).json({
            success: false,
            message: 'paymentKey, orderId, amount 는 필수값입니다.'
        });
    }

    // ── 시크릿 키 ──
    const secretKey = process.env.TOSS_SECRET_KEY
        || 'test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6KBe'; // 테스트 기본값

    // 토스페이먼츠 Basic 인증: Base64(secretKey + ":")
    const encodedKey = Buffer.from(secretKey + ':').toString('base64');

    // ── 결제 승인 API 요청 ──
    const requestBody = JSON.stringify({
        paymentKey,
        orderId,
        amount: Number(amount)
    });

    try {
        const payment = await callTossConfirmAPI(encodedKey, requestBody);

        // ── 금액 위변조 검증 ──
        if (payment.totalAmount !== Number(amount)) {
            console.error('❌ 금액 불일치 - 요청:', amount, '/ 실제:', payment.totalAmount);
            return res.status(400).json({
                success: false,
                message: '결제 금액이 일치하지 않습니다. 보안 오류입니다.'
            });
        }

        // ── 성공 ──
        console.log('✅ 결제 승인 성공:', {
            orderId:     payment.orderId,
            paymentKey:  payment.paymentKey,
            amount:      payment.totalAmount,
            method:      payment.method,
            status:      payment.status
        });

        // TODO: DB에 결제 정보 저장 (init-db.js 에 payments 테이블 추가 권장)
        // await savePaymentToDB(payment);

        return res.status(200).json({
            success: true,
            payment: {
                orderId:     payment.orderId,
                paymentKey:  payment.paymentKey,
                totalAmount: payment.totalAmount,
                method:      payment.method,
                status:      payment.status,
                orderName:   payment.orderName,
                requestedAt: payment.requestedAt,
                approvedAt:  payment.approvedAt
            }
        });

    } catch (err) {
        console.error('❌ 토스 결제 승인 오류:', err);
        return res.status(err.status || 500).json({
            success: false,
            message: err.message || '결제 승인 중 오류가 발생했습니다.',
            code:    err.code    || 'INTERNAL_ERROR'
        });
    }
};

/**
 * 토스페이먼츠 결제 승인 API 호출 (Node.js https 모듈 사용)
 * Vercel serverless 환경에서 axios 없이 동작
 */
function callTossConfirmAPI(encodedKey, body) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.tosspayments.com',
            port:     443,
            path:     '/v1/payments/confirm',
            method:   'POST',
            headers: {
                'Authorization':  `Basic ${encodedKey}`,
                'Content-Type':   'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const request = https.request(options, (response) => {
            let data = '';
            response.on('data',  (chunk) => { data += chunk; });
            response.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (response.statusCode === 200) {
                        resolve(parsed);
                    } else {
                        const err = new Error(parsed.message || '결제 승인 실패');
                        err.code   = parsed.code;
                        err.status = response.statusCode;
                        reject(err);
                    }
                } catch (e) {
                    reject(new Error('응답 파싱 오류'));
                }
            });
        });

        request.on('error', (err) => reject(err));
        request.write(body);
        request.end();
    });
}
