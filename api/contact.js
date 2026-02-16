const nodemailer = require('nodemailer');

// 플랜별 보장내용 반환 함수
function getCoverageDetails(plan) {
  if (!plan) return '<p>플랜 정보 없음</p>';
  
  let coverage = {
    personal: '',
    property: '',
    additional: ''
  };

  // 대인/대물 설정
  if (plan.includes('slim')) {
    coverage.personal = '50,000,000원';
    coverage.property = '50,000,000원';
  } else if (plan.includes('standard')) {
    coverage.personal = '100,000,000원';
    coverage.property = '100,000,000원';
  } else if (plan.includes('premium')) {
    coverage.personal = '500,000,000원';
    coverage.property = '500,000,000원';
  }

  // 추가 보장 설정
  if (plan.includes('camera')) {
    if (plan.includes('slim')) {
      coverage.additional = '기본충실';
    } else if (plan.includes('standard')) {
      coverage.additional = '누구나운전 포함';
    } else if (plan.includes('premium')) {
      coverage.additional = '누구나운전 + 구조비용';
    }
  } else if (plan.includes('fpv')) {
    if (plan.includes('slim')) {
      coverage.additional = '드론경기중 보장';
    } else if (plan.includes('standard')) {
      coverage.additional = '드론경기중 + 누구나운전';
    } else if (plan.includes('premium')) {
      coverage.additional = '드론경기중 + 누구나운전 + 구조비용';
    }
  } else {
    if (plan.includes('slim')) {
      coverage.additional = '기본 보장';
    } else if (plan.includes('standard')) {
      coverage.additional = '누구나운전 포함';
    } else if (plan.includes('premium')) {
      coverage.additional = '누구나운전 + 구조비용';
    }
  }

  return `
    <div style="border-left: 3px solid #FFB800; padding-left: 15px; margin: 15px 0;">
      <p style="margin: 5px 0;"><strong>대인배상:</strong> ${coverage.personal}</p>
      <p style="margin: 5px 0;"><strong>대물배상:</strong> ${coverage.property}</p>
      <p style="margin: 5px 0;"><strong>기본보장:</strong> ${coverage.additional}</p>
    </div>
  `;
}

module.exports = async (req, res) => {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { 
      name, 
      phone, 
      email, 
      message,
      insurance_type,
      departure_date,
      arrival_date,
      destination,
      travel_purpose,
      travelers,
      // 드론보험 필드
      birth_date,
      gender,
      drone_serial,
      drone_type,
      drone_count,
      plan,
      plan_name,
      plan_price_per_drone,
      plan_total_price,
      insurance_start,
      insurance_end,
      drones,
      drone_plans,
      plan_selection_type,
      send_to_customer,
      request_type
    } = req.body;

    // 환경 변수 확인
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.ADMIN_EMAIL) {
      console.error('환경 변수가 설정되지 않았습니다.');
      return res.status(500).json({ 
        message: '서버 설정 오류입니다. 관리자에게 문의해주세요.' 
      });
    }

    // 이메일 전송 설정
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // 보험 종류에 따른 이메일 내용 생성
    let emailSubject = '';
    let emailBody = '';

    if (insurance_type === '해외여행보험') {
      emailSubject = `[KB손해보험 해외여행보험 문의] ${name}님의 상담 신청`;
      emailBody = `
        <h2>🌍 해외여행보험 상담 신청</h2>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #667eea; margin-top: 0;">신청자 정보</h3>
          <p><strong>이름:</strong> ${name}</p>
          <p><strong>연락처:</strong> ${phone}</p>
          <p><strong>이메일:</strong> ${email || '미입력'}</p>
        </div>
        
        <div style="background: #f0f8ff; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #667eea; margin-top: 0;">여행 정보</h3>
          <p><strong>출발일:</strong> ${departure_date || '미입력'}</p>
          <p><strong>도착일:</strong> ${arrival_date || '미입력'}</p>
          <p><strong>여행 국가:</strong> ${destination || '미입력'}</p>
          <p><strong>여행 목적:</strong> ${travel_purpose || '미입력'}</p>
          <p><strong>인원 수:</strong> ${travelers || '미입력'}명</p>
        </div>
        
        ${message ? `
        <div style="background: #fff9e6; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #FFB800; margin-top: 0;">추가 문의사항</h3>
          <p>${message}</p>
        </div>
        ` : ''}
        
        <hr style="margin: 30px 0; border: none; border-top: 2px solid #e0e0e0;">
        <p style="color: #999; font-size: 14px;">배상온 대리점 웹사이트에서 전송됨</p>
      `;
    } else if (insurance_type === '국내여행보험') {
      emailSubject = `[KB손해보험 국내여행보험 문의] ${name}님의 상담 신청`;
      emailBody = `
        <h2>🗺️ 국내여행보험 상담 신청</h2>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #11998e; margin-top: 0;">신청자 정보</h3>
          <p><strong>이름:</strong> ${name}</p>
          <p><strong>연락처:</strong> ${phone}</p>
          <p><strong>이메일:</strong> ${email || '미입력'}</p>
        </div>
        
        <div style="background: #e8f5e9; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #11998e; margin-top: 0;">여행 정보</h3>
          <p><strong>출발일:</strong> ${departure_date || '미입력'}</p>
          <p><strong>도착일:</strong> ${arrival_date || '미입력'}</p>
          <p><strong>여행 지역:</strong> ${destination || '미입력'}</p>
          <p><strong>여행 목적:</strong> ${travel_purpose || '미입력'}</p>
          <p><strong>인원 수:</strong> ${travelers || '미입력'}명</p>
        </div>
        
        ${message ? `
        <div style="background: #fff9e6; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #FFB800; margin-top: 0;">추가 문의사항</h3>
          <p>${message}</p>
        </div>
        ` : ''}
        
        <hr style="margin: 30px 0; border: none; border-top: 2px solid #e0e0e0;">
        <p style="color: #999; font-size: 14px;">배상온 대리점 웹사이트에서 전송됨</p>
      `;
    } else if (insurance_type === '개인용 드론보험') {
      emailSubject = `[KB손해보험 개인용 드론보험 문의] ${name}님의 상담 신청`;
      
      const droneTypes = {
        'camera': '촬영용 센서드론',
        'fpv': 'FPV/레이싱 드론',
        'toy': '완구형 드론',
        'other': '기타 드론'
      };

      emailBody = `
        <h2>🚁 개인용 드론보험 상담 신청</h2>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #1e3c72; margin-top: 0;">신청자 정보</h3>
          <p><strong>이름:</strong> ${name}</p>
          <p><strong>연락처:</strong> ${phone}</p>
          <p><strong>이메일:</strong> ${email || '미입력'}</p>
          <p><strong>생년월일:</strong> ${birth_date || '미입력'}</p>
          <p><strong>성별:</strong> ${gender === 'male' ? '남성' : gender === 'female' ? '여성' : '미입력'}</p>
        </div>
        
        <div style="background: #e3f2fd; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #1e3c72; margin-top: 0;">드론 정보</h3>
          <p><strong>드론 종류:</strong> ${droneTypes[drone_type] || '미입력'}</p>
          <p><strong>드론 대수:</strong> ${drone_count || 1}대</p>
          ${drones && drones.length > 0 ? drones.map((drone, i) => {
            const dronePlan = drone_plans && drone_plans[i] ? drone_plans[i] : null;
            return `
            <div style="background: #fff; padding: 15px; margin: 10px 0; border-left: 4px solid #FFB800; border-radius: 6px;">
              <p style="margin: 5px 0; font-weight: bold; color: #FFB800;">드론 ${i + 1}</p>
              <p style="margin: 5px 0;"><strong>모델명:</strong> ${drone.model || '미입력'}</p>
              <p style="margin: 5px 0;"><strong>시리얼번호:</strong> ${drone.serial || '미입력'}</p>
              <p style="margin: 5px 0;"><strong>자체중량:</strong> ${drone.weight || '미입력'}kg</p>
              <p style="margin: 5px 0;"><strong>최대이륙중량:</strong> ${drone.max_weight || '미입력'}kg</p>
              ${dronePlan ? `
              <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e0e0e0;">
                <p style="margin: 5px 0; color: #FFB800; font-weight: bold;">선택 플랜: ${dronePlan.plan_name}</p>
                <p style="margin: 5px 0;">보험료: ${parseInt(dronePlan.price).toLocaleString()}원/년</p>
              </div>
              ` : ''}
            </div>
            `;
          }).join('') : ''}
        </div>
        
        <div style="background: #fff9e6; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #FFB800; margin-top: 0;">보험료 정보</h3>
          <p><strong>총 보험료:</strong> <span style="color: #e74c3c; font-size: 24px; font-weight: bold;">${plan_total_price ? parseInt(plan_total_price).toLocaleString() : '0'}원/년</span></p>
          ${plan_selection_type === 'unified' ? `
          <p><strong>플랜명:</strong> ${plan_name || '미입력'} (전체 동일)</p>
          <p><strong>보험료(1대당):</strong> ${plan_price_per_drone ? parseInt(plan_price_per_drone).toLocaleString() : '0'}원/년</p>
          ` : `
          <p><strong>플랜 선택:</strong> 드론별 개별 플랜</p>
          `}
        </div>
        
        ${message ? `
        <div style="background: #f0f0f0; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #1e3c72; margin-top: 0;">추가 문의사항</h3>
          <p>${message}</p>
        </div>
        ` : ''}
        
        <hr style="margin: 30px 0; border: none; border-top: 2px solid #e0e0e0;">
        <p style="color: #999; font-size: 14px;">배상온 대리점 웹사이트에서 전송됨</p>
      `;
    } else if (request_type === 'business_quote') {
      // 업무용 드론보험 견적 의뢰
      const manager_name = req.body.manager_name || name;
      const manager_phone = req.body.manager_phone || phone;
      const manager_email = req.body.manager_email || email;
      const customer_type = req.body.customer_type;
      const company_name = req.body.company_name;
      const drone_under_25kg = req.body.drone_under_25kg || 0;
      const drone_25_100kg = req.body.drone_25_100kg || 0;
      const drone_over_100kg = req.body.drone_over_100kg || 0;
      const inquiry = req.body.inquiry;

      emailSubject = `[드론배상 문의] ${manager_name}님의 상담 신청`;
      emailBody = `
        <h2>🚁 업무용 드론보험 견적 의뢰</h2>
        
        <div style="background: #fff9e6; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #FFB800;">
          <p style="margin: 0; font-weight: 600;">군집드론 또는 특수 자격으로 인한 별도 심사 건입니다.</p>
        </div>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #1e3c72; margin-top: 0;">사업자 정보</h3>
          <p><strong>가입대상자:</strong> ${customer_type === 'corporation' ? '법인사업자' : customer_type === 'individual' ? '개인사업자' : '미입력'}</p>
          <p><strong>회사명:</strong> ${company_name || '미입력'}</p>
        </div>

        <div style="background: #e3f2fd; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #1e3c72; margin-top: 0;">드론 정보</h3>
          <p><strong>드론중량 25kg 미만:</strong> ${drone_under_25kg}대</p>
          <p><strong>드론중량 25kg~100kg 미만:</strong> ${drone_25_100kg}대</p>
          <p><strong>드론중량 100kg 이상:</strong> ${drone_over_100kg}대</p>
          <p><strong>총 드론 대수:</strong> ${parseInt(drone_under_25kg) + parseInt(drone_25_100kg) + parseInt(drone_over_100kg)}대</p>
        </div>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #1e3c72; margin-top: 0;">담당자 정보</h3>
          <p><strong>담당자명:</strong> ${manager_name}</p>
          <p><strong>담당자 연락처:</strong> ${manager_phone}</p>
          <p><strong>담당자 이메일:</strong> ${manager_email}</p>
        </div>

        <div style="background: #fff9e6; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #FFB800; margin-top: 0;">보험상품</h3>
          <p><strong>상품명:</strong> 드론배상책임보험</p>
        </div>

        ${inquiry ? `
        <div style="background: #f0f0f0; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #1e3c72; margin-top: 0;">문의사항</h3>
          <p>${inquiry}</p>
        </div>
        ` : ''}

        <hr style="margin: 30px 0; border: none; border-top: 2px solid #e0e0e0;">
        <p style="color: #999; font-size: 14px;">배상온 대리점 웹사이트에서 전송됨</p>
      `;
    } else {
      // 일반 문의 (행사보험, 드론보험 등)
      emailSubject = `[KB손해보험 문의] ${name}님의 상담 신청`;
      emailBody = `
        <h2>새로운 상담 신청이 접수되었습니다</h2>
        <p><strong>이름:</strong> ${name}</p>
        <p><strong>연락처:</strong> ${phone}</p>
        <p><strong>이메일:</strong> ${email || '미입력'}</p>
        <p><strong>문의 내용:</strong></p>
        <p>${message || '상담 요청'}</p>
        <hr>
        <p><small>배상온 대리점 웹사이트에서 전송됨</small></p>
      `;
    }

    // 관리자에게 이메일 전송 (개인용 드론보험의 고객 견적서 전송 제외)
    if (!(send_to_customer && insurance_type === '개인용 드론보험')) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL,
        subject: emailSubject,
        html: emailBody
      };
      
      await transporter.sendMail(mailOptions);
    }

    // 고객에게 견적서 전송 (개인용 드론보험 & send_to_customer 플래그가 있을 때)
    if (send_to_customer && email && insurance_type === '개인용 드론보험') {
      const droneTypes = {
        'camera': '촬영용 센서드론',
        'fpv': 'FPV/레이싱 드론',
        'toy': '완구형 드론',
        'other': '기타 드론'
      };

      // 고객용 견적서 이메일
      const customerEmailBody = `
        <div style="font-family: 'Noto Sans KR', sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #FFB800 0%, #FFCD00 100%); padding: 30px; text-align: center;">
            <h1 style="color: #1a1a1a; margin: 0;">배상온 개인용 드론보험</h1>
            <h2 style="color: #1a1a1a; margin: 10px 0 0 0; font-size: 1.2rem;">견적서</h2>
          </div>

          <div style="padding: 30px; background: #fff;">
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
              <h3 style="color: #FFB800; margin-top: 0;">📋 견적 정보</h3>
              <p><strong>견적일자:</strong> ${new Date().toLocaleDateString('ko-KR')}</p>
              <p><strong>보험기간:</strong> ${insurance_start || '미입력'} ~ ${insurance_end || '미입력'}</p>
              <p><strong>상품명:</strong> KB손해보험 개인용 드론보험</p>
            </div>

            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
              <h3 style="color: #FFB800; margin-top: 0;">👤 고객 정보</h3>
              <p><strong>이름:</strong> ${name}</p>
              <p><strong>연락처:</strong> ${phone}</p>
              <p><strong>이메일:</strong> ${email}</p>
            </div>

            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
              <h3 style="color: #FFB800; margin-top: 0;">🚁 드론 정보</h3>
              <p><strong>드론 종류:</strong> ${droneTypes[drone_type] || '미입력'}</p>
              <p><strong>드론 대수:</strong> ${drone_count || 1}대</p>
              ${drones && drones.length > 0 ? drones.map((drone, i) => {
                const dronePlan = drone_plans && drone_plans[i] ? drone_plans[i] : null;
                return `
                <div style="border-left: 3px solid #FFB800; padding-left: 15px; padding: 12px; margin: 15px 0; background: #fff; border-radius: 6px;">
                  <p style="margin: 5px 0; font-weight: bold; color: #FFB800;">드론 ${i + 1}</p>
                  <p style="margin: 5px 0;">모델명: ${drone.model || '미입력'}</p>
                  <p style="margin: 5px 0;">시리얼번호: ${drone.serial || '미입력'}</p>
                  <p style="margin: 5px 0;">자체중량: ${drone.weight || '미입력'}kg</p>
                  <p style="margin: 5px 0;">최대이륙중량: ${drone.max_weight || '미입력'}kg</p>
                  ${dronePlan ? `
                  <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e0e0e0;">
                    <p style="margin: 5px 0; color: #FFB800; font-weight: bold;">플랜: ${dronePlan.plan_name}</p>
                    <p style="margin: 5px 0;">보험료: ${parseInt(dronePlan.price).toLocaleString()}원/년</p>
                    ${getCoverageDetails(dronePlan.plan || plan)}
                  </div>
                  ` : ''}
                </div>
                `;
              }).join('') : ''}
            </div>

            ${plan_selection_type !== 'individual' ? `
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
              <h3 style="color: #FFB800; margin-top: 0;">💰 보장 내용 (전체 동일)</h3>
              <p><strong>선택 플랜:</strong> ${plan_name || '미입력'}</p>
              ${getCoverageDetails(plan)}
              <p><strong>자기부담금:</strong> 100,000원</p>
            </div>
            ` : ''}

            <div style="background: #FFB800; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
              <p style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 1rem;">연간 보험료</p>
              <p style="margin: 0; color: #1a1a1a; font-size: 2rem; font-weight: bold;">${plan_total_price ? parseInt(plan_total_price).toLocaleString() : '0'}원</p>
              ${plan_selection_type !== 'individual' && plan_price_per_drone ? `
              <p style="margin: 10px 0 0 0; color: #1a1a1a; font-size: 0.9rem;">1대당 ${parseInt(plan_price_per_drone).toLocaleString()}원</p>
              ` : ''}
            </div>

            <div style="background: #fff9e6; padding: 15px; border-radius: 8px; font-size: 0.9rem; color: #666;">
              <p style="margin: 0;"><strong>유의사항</strong></p>
              <p style="margin: 5px 0 0 0;">※ 구체적인 보장/면책 및 보험금 지급은 약관에 따릅니다.</p>
              <p style="margin: 5px 0 0 0;">※ 본 견적서는 참고용이며, 최종 보험료는 심사 후 확정됩니다.</p>
            </div>
          </div>

          <div style="background: #1a1a1a; padding: 20px; text-align: center; color: #fff;">
            <p style="margin: 0; font-size: 0.9rem;">배상온 대리점</p>
            <p style="margin: 5px 0; font-size: 0.85rem;">📧 liab.on.ins@gmail.com | 🌐 www.liab.co.kr</p>
            <p style="margin: 5px 0 0 0; font-size: 0.8rem; opacity: 0.7;">KB손해보험 공식 대리점</p>
          </div>
        </div>
      `;

      const customerMailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: `[배상온 대리점] KB손해보험 개인용 드론보험 견적서 - ${name}님`,
        html: customerEmailBody
      };

      await transporter.sendMail(customerMailOptions);
    }

    return res.status(200).json({ 
      message: send_to_customer ? '상담 신청이 완료되었으며, 견적서가 이메일로 전송되었습니다.' : '상담 신청이 완료되었습니다.'
    });

  } catch (error) {
    console.error('이메일 전송 오류:', error);
    return res.status(500).json({ 
      message: '전송 중 오류가 발생했습니다. 다시 시도해주세요.' 
    });
  }
};
