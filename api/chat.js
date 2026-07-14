const fs = require("fs");
const path = require("path");

let companyInfo = null;
function loadCompanyInfo() {
  if (companyInfo) return companyInfo;
  const filePath = path.join(process.cwd(), "data", "company-info.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  companyInfo = JSON.parse(raw);
  return companyInfo;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method tidak diizinkan." });
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    res.status(500).json({ error: "GEMINI_API_KEY belum diset di environment variables." });
    return;
  }

  const { messages } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "Pesan tidak valid." });
    return;
  }

  try {
    const info = loadCompanyInfo();
    const systemPrompt =
      "Kamu adalah asisten AI untuk menjawab pertanyaan seputar informasi perusahaan berikut. " +
      "Jawab HANYA berdasarkan data ini. Jika informasi yang ditanyakan tidak ada di data, " +
      "katakan dengan jujur bahwa kamu tidak punya informasinya, jangan mengarang.\n\n" +
      "DATA PERUSAHAAN (format JSON):\n" +
      JSON.stringify(info, null, 2);

    // Gemini pakai role "model" untuk balasan AI, bukan "assistant"
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const model = "gemini-2.5-flash";
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemPrompt }] },
        }),
      }
    );

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      res.status(geminiRes.status).json({ error: data?.error?.message || "Terjadi kesalahan pada API." });
      return;
    }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    res.status(200).json({ reply });
  } catch (err) {
    res.status(500).json({ error: "Terjadi kesalahan server: " + err.message });
  }
};
