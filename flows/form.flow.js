const { addKeyword, EVENTS } = require("@bot-whatsapp/bot");
const { createEvent } = require("../scripts/calendar");

const formFlow = addKeyword(EVENTS.ACTION)
  .addAnswer(
    "🙌✨ ¡Excelente! Gracias por confirmar la fecha. Te voy a hacer unas consultas para agendar el turno. Primero, ¿cuál es tu nombre?",
    { capture: true },
    async (ctx, ctxFn) => {
      await ctxFn.state.update({ name: ctx.body }); // Guarda el nombre del usuario en el estado
    }
  )
  .addAnswer(
    "Perfecto, ¿cuál es el motivo del turno?",
    { capture: true },
    async (ctx, ctxFn) => {
      await ctxFn.state.update({ motive: ctx.body }); // Guarda el motivo en el estado
    }
  )
  .addAnswer(
    "¡Excelente! Ya agendé la reunión. ¡Te esperamos!",
    null,
    async (ctx, ctxFn) => {
      const userInfo = await ctxFn.state.getMyState(); // Obtiene el estado del usuario
      const eventName = userInfo.name; // Nombre del usuario
      const description = userInfo.motive; // Motivo de la cita
      const date = userInfo.date; // Fecha del evento
      const eventId = await createEvent(eventName, description, date);
      await ctxFn.state.clear();
    }
  );

//   // Agregar logs para verificar los parámetros
//   console.log("Creando evento con los siguientes parámetros:");
//   console.log("Nombre:", eventName);
//   console.log("Descripción:", description);
//   console.log("Fecha:", date);

//   try {
//     const eventId = await createEvent(eventName, description, date); // Crea el evento en el calendario
//     console.log("Evento creado con ID:", eventId);
//   } catch (error) {
//     console.error("Error al crear el evento:", error);
//     await ctxFn.reply(
//       "Hubo un error al crear el evento. Por favor, intenta nuevamente."
//     );
//     return; // Salir de la función en caso de error
//   }

//   await ctxFn.state.clear(); // Limpia el estado del usuario para futuras interacciones
// }

module.exports = { formFlow };
