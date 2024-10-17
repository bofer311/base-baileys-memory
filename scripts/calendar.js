const { google } = require("googleapis");

// Inicializa la librería cliente de google y configura la autenticación con credenciales de la cuenta
const auth = new google.auth.GoogleAuth({
  keyFile: "./suirra-28a33f760cb8.json", // ruta de acceso a cuenta de servicio
  scopes: ["https://www.googleapis.com/auth/calendar"], // alcance para la API de google calendar
});

const calendar = google.calendar({ version: "v3" });

// Constantes configurables
const calendarID =
  "f75a1cdabb4511716f4383272dddc6ea0470982cfdf13fc2f1ea165feea0d4ba@group.calendar.google.com";
const timeZone = "America/Argentina/Buenos_Aires";

const rangeLimit = {
  days: [1, 4, 5], // lunes, Jueves y Viernes
  startHour: 16,
  endHour: 20,
};

const standardDuration = 30; // Duración por defecto de las citas (30min)
const dateLimit = 30; // Máximo de días a traer la lista de Next Events

/**
 * Crea un evento en el calendario.
 * @param {string} eventName - Nombre del evento
 * @param {string} description - Descripción del evento
 * @param {string} date - Fecha y hora de inicio del evento en formato ISO
 * @param {number} [duration=standardDuration] - Duración del evento en minutos
 * @returns {string} - URL de la invitación al evento
 */
async function createEvent(
  eventName,
  description,
  date,
  duration = standardDuration
) {
  try {
    // Autenticación
    const authClient = await auth.getClient();
    google.options({ auth: authClient });

    // Fecha y hora de inicio del evento
    const startDateTime = new Date(date);

    // Fecha y hora de fin del evento
    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(startDateTime.getMinutes() + duration);

    const event = {
      summary: eventName,
      description: description,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: timeZone,
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: timeZone,
      },
      colorId: "2", // El ID del color verde en google calendar es el 11
    };

    const response = await calendar.events.insert({
      calendarId: calendarID,
      resource: event,
    });

    // Generar la URL de la invitación
    const eventId = response.data.id;
    console.log("Evento creado con éxito");
    return eventId;
  } catch (err) {
    console.error("Hubo un error al crear el evento", err);
    throw err;
  }
}

/**
 * Lista los slots disponibles entre las fechas dadas
 * @param {Date} [startDate=new Date()] - Fecha de inicio para buscar slots disponibles
 * @param {Date} [endDate] - Fecha de fin para buscar slots disponibles.
 * @returns {Array} - Lista de slots disponibles
 */
async function listAvailableSlots(startDate = new Date(), endDate) {
  try {
    const authClient = await auth.getClient();
    google.options({ auth: authClient });

    // Definir fecha de fin si no se proporciona
    if (!endDate) {
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + dateLimit);
    }

    const response = await calendar.events.list({
      calendarId: calendarID,
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      timeZone: timeZone,
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = response.data.items;
    const slots = [];
    let currentDate = new Date(startDate);
    const standardDuration = 30; // Duración estándar en minutos

    // Generar slots disponibles basados en rangeLimit
    while (currentDate < endDate) {
      const dayOfWeek = currentDate.getDay();
      if (rangeLimit.days.includes(dayOfWeek)) {
        for (
          let hour = rangeLimit.startHour;
          hour < rangeLimit.endHour;
          hour++
        ) {
          for (let minutes = 0; minutes < 60; minutes += standardDuration) {
            const slotStart = new Date(currentDate);
            slotStart.setHours(hour, minutes, 0, 0);
            const slotEnd = new Date(slotStart);
            slotEnd.setMinutes(slotStart.getMinutes() + standardDuration);

            const isBusy = events.some((event) => {
              const eventStart = new Date(
                event.start.dateTime || event.start.date
              );
              const eventEnd = new Date(event.end.dateTime || event.end.date);
              return slotStart < eventEnd && slotEnd > eventStart;
            });

            if (!isBusy) {
              slots.push({ start: slotStart, end: slotEnd });
            }
          }
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return slots;
  } catch (err) {
    console.error("Hubo un error al contactar el servicio de calendar: " + err);
    throw err;
  }
}

/**
 * Obtiene el próximo slot disponible a partir de la fecha dada
 * @param {string|Date} date - Fecha a partir de la cual buscar el próximo slot disponible, puede ser
 * @returns {Object|null} - El próximo slot disponible o null si no hay ninguno.
 */
async function getNextAvailableSlot(date) {
  try {
    // Verificar si 'date' es un string en formato ISO
    if (typeof date === "string") {
      // Convertir el string ISO en un objeto Date
      date = new Date(date);
    } else if (!(date instanceof Date) || isNaN(date)) {
      throw new Error("La fecha proporcionada no es válida.");
    }
    // Obtener el próximo slot disponible
    const availableSlots = await listAvailableSlots(date);

    // Filtrar slots disponibles que comienzan después de la fecha proporcionada
    const filteredSlots = availableSlots.filter(
      (slot) => new Date(slot.start) > date
    );

    // Ordenar los slots por su hora de inicio en orden ascendente
    const sortedSlots = filteredSlots.sort(
      (a, b) => new Date(a.start) - new Date(b.start)
    );

    // Tomar el primer slot de la lista resultante, que será el próximo slot disponible
    return sortedSlots.length > 0 ? sortedSlots[0] : null;
  } catch (err) {
    console.error(
      "Hubo un error al obtener el próximo slot disponible: " + err
    );
    throw err;
  }
}

/**
 * Verifica si hay slots disponibles para una fecha dada
 * @param {Date} date - Fecha a verificar
 * @returns {boolean} - Devuelve true si hay slots disponibles dentro del rango permitido, false si no
 */
async function isDateAvailable(date) {
  try {
    // Validar que la fecha esté dentro del rango permitido
    const currentDate = new Date();
    const maxDate = new Date(currentDate);
    maxDate.setDate(currentDate.getDate() + dateLimit);

    if (date < currentDate || date > maxDate) {
      return false; // La fecha está fuera del rango permitido
    }

    // Verificar que la fecha caiga en un día permitido
    const dayOfWeek = date.getDay();
    if (!rangeLimit.days.includes(dayOfWeek)) {
      return false; // La fecha no está dentro de los días permitidos
    }

    // Verificar que la hora esté dentro del rango permitido
    const hour = date.getHours();
    if (hour < rangeLimit.startHour || hour >= rangeLimit.endHour) {
      return false; // La hora no está dentro del rango permitido
    }

    // Obtener todos los slots disponibles desde la fecha actual hasta el límite definido
    const availableSlots = await listAvailableSlots(currentDate);

    // Verificar si 'availableSlots' es un array
    if (!Array.isArray(availableSlots)) {
      console.error("availableSlots no es un array. Valor:", availableSlots);
      return false; // O manejar el error según lo que prefieras
    }

    // Filtrar slots disponibles que coincidan con la fecha dada
    const slotsOnGivenDate = availableSlots.filter(
      (slot) => new Date(slot.start).toDateString() === date.toDateString()
    );

    //Verificar si hay slots disponibles en la fecha dada
    const isSlotAvailable = slotsOnGivenDate.some(
      (slot) =>
        new Date(slot.start).getTime() === date.getTime() &&
        new Date(slot.end).getTime() ===
          date.getTime() + standardDuration * 60 * 60 * 1000
    );

    return isSlotAvailable;
  } catch (err) {
    console.error(
      "Hubo un error al verificar disponibilidad de la fecha: " + err
    );
    throw err;
  }
}

module.exports = {
  createEvent,
  isDateAvailable,
  getNextAvailableSlot,
};
