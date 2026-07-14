const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");


let companyInfo = null;


// ===============================
// LOAD JSON COMPANY INFO
// ===============================
function loadCompanyInfo() {

  if (companyInfo) return companyInfo;


  const raw = fs.readFileSync(
    path.join(process.cwd(), "data", "company-info.json"),
    "utf8"
  );


  companyInfo = JSON.parse(raw);


  return companyInfo;

}



// ===============================
// AMBIL DATA WEBSITE DAMARA
// ===============================
async function getWebsiteInfo() {

  try {

    const websiteUrl = "https://damara.co.id";
    // Ganti sesuai website Damara


    const response = await fetch(websiteUrl);


    if (!response.ok) {
      return "";
    }


    const html = await response.text();


    const $ = cheerio.load(html);


    let websiteText = "";



    $("h1,h2,h3,p,li")
      .each((index, element) => {

        websiteText +=
          $(element).text().trim()
          + "\n";

      });



    return websiteText.substring(0, 8000);



  } catch (error) {

    console.log(
      "Website scraping error:",
      error.message
    );


    return "";

  }

}





// ===============================
// VERCEL API HANDLER
// ===============================
module.exports = async function handler(req, res) {


  if (req.method !== "POST") {

    return res.status(405).json({

      error: "Method tidak diizinkan."

    });

  }



  const apiKey = process.env.GROQ_API_KEY;



  if (!apiKey) {

    return res.status(500).json({

      error:
        "GROQ_API_KEY belum diset di Vercel."

    });

  }





  const { messages } = req.body;



  if (!Array.isArray(messages)) {


    return res.status(400).json({

      error:
        "Messages tidak valid."

    });


  }

  try {

    const info = loadCompanyInfo();

    // ambil website
    const websiteInfo = await getWebsiteInfo();

    const systemPrompt = `

Kamu adalah AI Customer Service Aidamara.


Gunakan sumber informasi berikut untuk menjawab pelanggan.



=====================
DATA DATABASE
=====================

${JSON.stringify(info, null, 2)}



=====================
DATA WEBSITE DAMARA
=====================

${websiteInfo}



=====================

Aturan menjawab:

1. Prioritaskan informasi dari database.
2. Jika informasi tidak ditemukan di database gunakan website.
3. Jangan membuat informasi sendiri.
4. Jika informasi tidak tersedia pada kedua sumber,
jawab:

"Maaf, informasi tersebut belum tersedia."


Jawab dengan bahasa Indonesia yang ramah.

`;


    const response = await fetch(

      "https://api.groq.com/openai/v1/chat/completions",

      {

        method: "POST",

        headers: {


          Authorization:
            `Bearer ${apiKey}`,


          "Content-Type":
            "application/json"


        },


        body: JSON.stringify({

          model:
            "llama-3.3-70b-versatile",


          messages: [

            {

              role: "system",

              content: systemPrompt

            },

            ...messages

          ],


          temperature: 0.2


        })

      }

    );

    const data = await response.json();

    if (!response.ok) {

      return res.status(response.status)
        .json(data);

    }

    return res.status(200).json({

      reply:
        data.choices[0].message.content

    });

  } catch (err) {


    return res.status(500).json({

      error:
        err.message

    });


  }

};