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


    const urls = [

      "https://bankdamara.co.id/",

      "https://bankdamara.co.id/profil/",

      "https://bankdamara.co.id/visi-dan-misi/",

      "https://bankdamara.co.id/laporan-pengaduan/"

    ];



    let websiteText = "";




    for (const url of urls) {


      try {


        const response = await fetch(url, {

          headers: {

            "User-Agent":
            "Mozilla/5.0"

          }

        });



        if (!response.ok) {

          console.log(
            "Halaman tidak ditemukan:",
            url
          );

          continue;

        }



        const html = await response.text();



        const $ = cheerio.load(html);



        $("script,style,noscript")
        .remove();





        $("h1,h2,h3,h4,h5,p,li")
        .each((index, element)=>{


          let text =
          $(element)
          .text()
          .replace(/\s+/g," ")
          .trim();



          if(text.length > 20){

            websiteText += text + "\n";

          }


        });



      } catch(error){


        console.log(
          "Gagal mengambil halaman:",
          url
        );


      }


    }




    console.log(
      "WEBSITE DAMARA:",
      websiteText.substring(0,2000)
    );



    return websiteText.substring(0,10000);



  } catch(error){


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
module.exports = async function handler(req,res){



  if(req.method !== "POST"){


    return res.status(405).json({

      error:
      "Method tidak diizinkan."

    });


  }





  const apiKey = process.env.GROQ_API_KEY;




  if(!apiKey){


    return res.status(500).json({

      error:
      "GROQ_API_KEY belum diset di Vercel."

    });


  }






  const {messages}=req.body;




  if(!Array.isArray(messages)){


    return res.status(400).json({

      error:
      "Messages tidak valid."

    });


  }




  try {



    const info = loadCompanyInfo();



    const websiteInfo =
    await getWebsiteInfo();






    const systemPrompt = `

Kamu adalah AI Customer Service Aidamara.

Tugas kamu membantu menjawab pertanyaan pelanggan mengenai Bank Damara.


Gunakan sumber informasi berikut:



=====================
DATA DATABASE
=====================

${JSON.stringify(info,null,2)}




=====================
DATA WEBSITE DAMARA
=====================

${websiteInfo || "Tidak berhasil mengambil website"}






=====================

ATURAN:

1. Cari jawaban terlebih dahulu pada DATA DATABASE.

2. Jika informasi tidak ada pada database, WAJIB cek DATA WEBSITE DAMARA.

3. Jangan pernah mengatakan informasi tidak tersedia sebelum mengecek kedua sumber.

4. Jangan membuat informasi palsu.

5. Jangan menyebutkan kepada pelanggan bahwa kamu menggunakan database atau website.

6. Jika kedua sumber tidak memiliki informasi, jawab:

"Maaf, informasi tersebut belum tersedia."

Gunakan bahasa Indonesia yang sopan dan ramah.



`;






    const response = await fetch(

      "https://api.groq.com/openai/v1/chat/completions",

      {

        method:"POST",


        headers:{


          Authorization:
          `Bearer ${apiKey}`,


          "Content-Type":
          "application/json"


        },



        body:JSON.stringify({


          model:
          "llama-3.3-70b-versatile",



          messages:[

            {

              role:"system",

              content:systemPrompt

            },

            ...messages

          ],



          temperature:0.2



        })


      }


    );






    const data =
    await response.json();






    if(!response.ok){


      return res.status(response.status)
      .json(data);


    }






    return res.status(200).json({


      reply:
      data.choices[0].message.content


    });







  } catch(error){


    return res.status(500).json({


      error:
      error.message


    });


  }

};