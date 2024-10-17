const { addKeyword, EVENTS } = require("@bot-whatsapp/bot");

const welcomeFlow = addKeyword(EVENTS.ACTION).addAction(async (ctx, ctxFn) => {
  await ctxFn.endFlow(
    "😊✨Bienvenido al ChatBot de la Dra Irrazabal! \nPodes escribir 'Agendar cita' para reservar un turno "
  );
});

module.exports = { welcomeFlow };
