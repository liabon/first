const nodemailer = require("nodemailer");

module.exports = async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ message: "Method not allowed" });

  try {
    const data = req.body || {};

    // 환경 변수 확인 (contact.js와 동일하게 사용)
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.ADMIN_EMAIL) {
      console.error("환경 변수가 설정되지 않았습니다.");
      return res.status(500).json({
        message: "서버 설정 오류입니다. 관리자에게 문의해주세요.",
      });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 보기 좋게 메일 본문 구성 (모든 필드를 표로)
    const escapeHtml = (v) =>
      String(v ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    const rows = Object.entries(data)
      .map(([k, v]) => {
        // 체크박스/배열 등도 보기 좋게
        const value =
          Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : v;
        return `<tr>
          <td style="padding:8px 10px;border:1px solid #eee;background:#fafafa;"><strong>${escapeHtml(k)}</strong></td>
          <td style="padding:8px 10px;border:1px solid #eee;">${escapeHtml(value)}</td>
        </tr>`;
      })
      .join("");

    const subjectName =
      data.contactName || data.name || data.companyName || "미상";
    const subject = `[행사보험 견적신청] ${subjectName}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject,
      html: `
        <h2>행사보험 견적 신청이 접수되었습니다</h2>
        <p>아래는 고객이 입력한 전체 데이터입니다.</p>
        <table style="border-collapse:collapse;width:100%;max-width:900px;">
          ${rows || "<tr><td>데이터가 없습니다.</td></tr>"}
        </table>
        <hr/>
        <p><small>www.liab.co.kr/event-insurance 에서 전송됨</small></p>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ message: "견적 신청이 완료되었습니다." });
  } catch (error) {
    console.error("행사보험 이메일 전송 오류:", error);
    return res.status(500).json({
      message: "전송 중 오류가 발생했습니다. 다시 시도해주세요.",
    });
  }
};
