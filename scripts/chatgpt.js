require("dotenv").config();
const OpenAI = require("openai");

const openaiApiKey = process.env.OPENAI_API_KEY;

const chat = async (prompt, messages) => {
  try {
    // Realizar la solicitud a la API de OpenAI
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "system", content: prompt }, ...messages],
    });

    // Obtener la respuesta del modelo
    const answ = completion.choices?.[0]?.message?.content;

    // Agregar un log para verificar la respuesta
    console.log("Respuesta de OpenAI:", answ);

    if (!answ) {
      throw new Error("La respuesta de OpenAI está vacía o es nula");
    }

    return answ;
  } catch (err) {
    console.error(
      "Error al conectar con OpenAI:",
      err.response ? err.response.data : err.message
    );
    return "ERROR";
  }
};

module.exports = { chat };
