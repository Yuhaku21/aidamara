const fs = require("fs");
const path = require("path");

let companyInfo = null;

function loadCompanyInfo() {
  if (companyInfo) return companyInfo;

  const filePath = path.join(process.cwd(), "data", "company-info.json");
  const raw = fs.readFileSync(filePath, "utf8");
  companyInfo = JSON.parse(raw);

  return companyInfo;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method tidak diizinkan.",
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "Environment Variable GEMINI_API_KEY belum diset di Vercel.",
    });
  }

  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      error: "Pesan tidak valid.",
    });
  }

  try {
    const info = loadCompanyInfo();

    const systemPrompt = `
Kamu adalah AI Customer Service.

Jawablah HANYA berdasarkan data perusahaan berikut.

Jika informasi tidak ada di data, katakan dengan jujur bahwa kamu tidak menemukannya dan jangan mengarang.

DATA PERUSAHAAN:

${JSON.stringify(info, null, 2)}
`;

    const contents = messages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [
        {
          text: msg.content,
        },
      ],
    }));

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: systemPrompt,
              },
            ],
          },
          contents,
        }),
      }
    );

    const data = await response.json();

    console.log(JSON.stringify(data, null, 2));

    if (!response.ok) {
      return res.status(response.status).json({
        error:
          data.error?.message ||
          "Terjadi kesalahan saat memanggil Gemini API.",
      });
    }

    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ??
      "Maaf, saya tidak dapat memberikan jawaban.";

    return res.status(200).json({
      reply,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: err.message,
    });
  }
};