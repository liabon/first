const nodemailer = require("nodemailer");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const data = req.body || {};

    // 환경 변수 확인 (기존과 동일)
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.ADMIN_EMAIL) {
      console.error("환경 변수가 설정되지 않았습니다.");
      return res.status(500).json({ message: "서버 설정 오류입니다. 관리자에게 문의해주세요." });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    const insuranceType = data.insuranceType ? `(${data.insuranceType})` : "";
    const applicant = data.name || "미상";

    const rows = Object.entries(data)
      .map(([k, v]) => `
        <tr>
          <td style="padding:8px 10px;border:1px solid #eee;background:#fafafa;"><strong>${k}</strong></td>
          <td style="padding:8px 10px;border:1px solid #eee;">${String(v ?? "")}</td>
        </tr>
      `)
      .join("");

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: `[드론보험] ${insuranceType} ${applicant}`.trim(),
      html: `
        <h2>드론보험 상담 신청</h2>
        <table style="border-collapse:collapse;width:100%;max-width:900px;">
          ${rows || "<tr><td>데이터가 없습니다.</td></tr>"}
        </table>
        <hr><small>www.liab.co.kr/drone-insurance 에서 전송됨</small>
      `,
    });

    return res.status(200).json({ message: "상담 신청이 완료되었습니다." });
  } catch (error) {
    console.error("드론보험 이메일 전송 오류:", error);
    return res.status(500).json({ message: "전송 중 오류가 발생했습니다. 다시 시도해주세요." });
  }
};
