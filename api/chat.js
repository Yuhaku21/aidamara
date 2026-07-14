const fs = require("fs");
const path = require("path");

let companyInfo = null;

function loadCompanyInfo() {
  if (companyInfo) return companyInfo;

  const raw = fs.readFileSync(
    path.join(process.cwd(), "data", "company-info.json"),
    "utf8"
  );

  companyInfo = JSON.parse(raw);

  return companyInfo;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method tidak diizinkan.",
    });
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "GROQ_API_KEY belum diset di Vercel.",
    });
  }

  const { messages } = req.body;

  if (!Array.isArray(messages)) {
    return res.status(400).json({
      error: "Messages tidak valid.",
    });
  }

  try {
    const info = loadCompanyInfo();

    const systemPrompt = `
Kamu adalah AI Customer Service Aidamara.

Jawablah HANYA berdasarkan data perusahaan berikut.

Jika jawabannya tidak ada di data, katakan dengan jujur bahwa kamu tidak memiliki informasinya.

${JSON.stringify(info, null, 2)}
`;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            ...messages,
          ],
          temperature: 0.2,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json({
      reply: data.choices[0].message.content,
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
};