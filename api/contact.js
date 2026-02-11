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
    const { name, phone, email, message } = req.body;

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

    // 관리자에게 보낼 이메일 내용
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: `[KB손해보험 문의] ${name}님의 상담 신청`,
      html: `
        <h2>새로운 상담 신청이 접수되었습니다</h2>
        <p><strong>이름:</strong> ${name}</p>
        <p><strong>연락처:</strong> ${phone}</p>
        <p><strong>이메일:</strong> ${email || '미입력'}</p>
        <p><strong>문의 내용:</strong></p>
        <p>${message || '상담 요청'}</p>
        <hr>
        <p><small>배상온 대리점 웹사이트에서 전송됨</small></p>
      `
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
