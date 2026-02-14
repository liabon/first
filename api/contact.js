const nodemailer = require('nodemailer');

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
      plan_total_price
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
          <p><strong>드론 시리얼 번호:</strong> ${drone_serial || '미입력'}</p>
          <p><strong>드론 종류:</strong> ${droneTypes[drone_type] || '미입력'}</p>
          <p><strong>드론 대수:</strong> ${drone_count || 1}대</p>
        </div>
        
        <div style="background: #fff9e6; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #FFB800; margin-top: 0;">선택 플랜</h3>
          <p><strong>플랜명:</strong> ${plan_name || '미입력'}</p>
          <p><strong>보험료(1대당):</strong> ${plan_price_per_drone ? parseInt(plan_price_per_drone).toLocaleString() : '0'}원/년</p>
          <p><strong>총 보험료:</strong> <span style="color: #e74c3c; font-size: 20px; font-weight: bold;">${plan_total_price ? parseInt(plan_total_price).toLocaleString() : '0'}원</span></p>
          <p><strong>플랜 코드:</strong> ${plan || '미입력'}</p>
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

    // 관리자에게 보낼 이메일 설정
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: emailSubject,
      html: emailBody
    };

    // 이메일 전송
    await transporter.sendMail(mailOptions);

    return res.status(200).json({ 
      message: '상담 신청이 완료되었습니다.' 
    });

  } catch (error) {
    console.error('이메일 전송 오류:', error);
    return res.status(500).json({ 
      message: '전송 중 오류가 발생했습니다. 다시 시도해주세요.' 
    });
  }
};
