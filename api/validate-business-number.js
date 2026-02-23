// api/validate-business-number.js
// 국세청 사업자등록정보 상태조회 서비스 프록시
// 공공데이터포털: https://www.data.go.kr/data/15081808/openapi.do
// 환경변수: BUSINESS_API_KEY (공공데이터포털 인증키)

module.exports = async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    const { b_no } = req.body;

    if (!b_no || typeof b_no !== 'string' || b_no.length !== 10 || !/^\d{10}$/.test(b_no)) {
        return res.status(400).json({
            valid: false,
            message: '사업자등록번호는 숫자 10자리여야 합니다.'
        });
    }

    const serviceKey = process.env.BUSINESS_API_KEY;
    if (!serviceKey) {
        console.error('[validate-business-number] BUSINESS_API_KEY 환경변수가 설정되지 않았습니다.');
        return res.status(500).json({
            valid: false,
            message: '서버 설정 오류: API 키가 없습니다.'
        });
    }

    try {
        const apiUrl = `https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey=${encodeURIComponent(serviceKey)}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ b_no: [b_no] })
        });

        if (!response.ok) {
            console.error('[validate-business-number] API 응답 오류:', response.status);
            return res.status(502).json({
                valid: false,
                message: 'API 호출 실패 (' + response.status + ')'
            });
        }

        const data = await response.json();
        // data.data[0].b_stt_cd : "01"=계속사업자, "02"=휴업자, "03"=폐업자
        // data.data[0].b_stt    : "계속사업자" / "휴업자" / "폐업자"
        // data.data[0].tax_type : 세금 유형 (없으면 "국세청에 등록되지 않은 사업자등록번호입니다.")

        if (!data.data || data.data.length === 0) {
            return res.json({
                valid: false,
                message: '조회 결과가 없습니다. 사업자등록번호를 다시 확인해주세요.'
            });
        }

        const info = data.data[0];
        const statusCode = info.b_stt_cd;     // "01", "02", "03"
        const statusText = info.b_stt || '';   // "계속사업자" 등
        const taxType = info.tax_type || '';

        // 등록되지 않은 사업자
        if (taxType.includes('등록되지 않은')) {
            return res.json({
                valid: false,
                status_code: statusCode,
                status_text: statusText,
                tax_type: taxType,
                message: '국세청에 등록되지 않은 사업자등록번호입니다. 다시 확인해주세요.'
            });
        }

        // 폐업자
        if (statusCode === '03') {
            return res.json({
                valid: false,
                status_code: statusCode,
                status_text: statusText,
                tax_type: taxType,
                message: '폐업된 사업자입니다. 사업자등록번호를 다시 확인해주세요.'
            });
        }

        // 휴업자
        if (statusCode === '02') {
            return res.json({
                valid: false,
                status_code: statusCode,
                status_text: statusText,
                tax_type: taxType,
                message: '휴업 중인 사업자입니다. 사업자등록번호를 다시 확인해주세요.'
            });
        }

        // 계속사업자 (유효)
        return res.json({
            valid: true,
            status_code: statusCode,
            status_text: statusText,
            tax_type: taxType,
            message: '유효한 사업자등록번호입니다.'
        });

    } catch (err) {
        console.error('[validate-business-number] 오류:', err);
        return res.status(500).json({
            valid: false,
            message: '사업자 조회 중 오류가 발생했습니다.'
        });
    }
};
