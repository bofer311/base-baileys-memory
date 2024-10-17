const { addKeyword, EVENTS } = require("@bot-whatsapp/bot");
const { text2iso, iso2text } = require("../scripts/utils");
const {
  isDateAvailable,
  getNextAvailableSlot,
} = require("../scripts/calendar");
const { chat } = require("../scripts/chatgpt");
const { formFlow } = require("./form.flow"); // Asegúrate de que esta línea sea la única que declare promptBase

const promptBase = `Sos un asistente virtual diseñado para ayudar a los usuarios a agendar citas mediante una conversación. 
Tu objetivo es únicamente ayudar al usuario a elegir un horario y una fecha para sacar turno. 
Te voy a dar la fecha solicitada por el usuario y la disponibilidad de la misma. 
Esta fecha la tiene que confirmar el usuario. Si la disponibilidad es true, entonces respondes algo como: 
La fecha solicitada está disponible. El turno sería el Jueves 30 de mayo 2024 a las 10:00hs. 
Si la disponibilidad es false, entonces recomienda la siguiente fecha disponible que te dejo al final del prompt, 
suponiendo que la siguiente fecha disponible es el jueves 30, responde con este formato: 
La fecha y horario solicitados no están disponibles, te puedo ofrecer el jueves 30 de mayo 2024 a las 11:00hs. 
Bajo ninguna circunstancia hagas consultas. En vez de decir que la disponibilidad es false, envía una disculpa de que esa fecha se encuentra ocupada, y ofrecer la siguiente. 
Te dejo los estados disponibles de dichas fechas
`;

const confirmationFlow = addKeyword(EVENTS.ACTION).addAnswer(
  "¿Confirma la fecha propuesta? Responde únicamente con 'si' o 'no'",
  { capture: true },
  async (ctx, ctxFn) => {
    if (ctx.body.toLowerCase() === "si") {
      return ctxFn.gotoFlow(formFlow);
    } else {
      await ctxFn.endFlow(
        "Reserva cancelada. Vuelve a solicitar una reserva para elegir otro turno."
      );
    }
  }
);

const dateFlow = addKeyword(EVENTS.ACTION)
  .addAnswer("¡Perfecto! ¿Qué fecha quieres agendar?", { capture: true })
  .addAnswer("Revisando disponibilidad...", null, async (ctx, ctxFn) => {
    const currentDate = new Date();
    const soliciteDate = await text2iso(ctx.body);
    if (soliciteDate.includes("false")) {
      return ctxFn.endFlow("No se pudo deducir una fecha. Vuelve a preguntar.");
    }
    const startDate = new Date(soliciteDate);
    let dateAvailable = await isDateAvailable(startDate);

    if (dateAvailable === false) {
      const nextDateAvailable = await getNextAvailableSlot(startDate);

      const isoString = nextDateAvailable.start.toISOString();
      const dateText = await iso2text(isoString);

      const messages = [{ role: "user", content: `${ctx.body}` }];
      const response = await chat(
        promptBase +
          "\nHoy es el día: " +
          currentDate +
          "\nLa fecha solicitada es: " +
          soliciteDate +
          "\nLa disponibilidad de esa fecha es:  false. El proximo espacio disponible que tenes para ofrecer es:  " +
          dateText +
          "Da la fecha siempre en español ",
        messages
      );
      await ctxFn.flowDynamic(response);
      await ctxFn.state.update({ date: nextDateAvailable.start });
      return ctxFn.gotoFlow(confirmationFlow);
    } else {
      const messages = [{ role: "user", content: `${ctx.body}` }];
      const response = await chat(
        promptBase +
          "\nHoy es el día: " +
          currentDate +
          "\nLa fecha solicitada es: " +
          soliciteDate +
          "\nLa disponibilidad de esa fecha es:  true" +
          "\nConfirmación del cliente: No confirmo. ",
        messages
      );
      await ctxFn.flowDynamic(response);
      await ctxFn.state.update({ date: startDate });
      return ctxFn.gotoFlow(confirmationFlow);
    }
  });

module.exports = { dateFlow, confirmationFlow };
