const defaultClinicBotFlowNodes = [
  {
    id: 'start',
    message: 'Hola, soy el asistente de Replai para la clínica. ¿Buscas una cita, precios, horarios o hablar con un agente?',
    transitions: [
      { keywords: ['general', 'medicina', 'consulta general'], next: 'appointment_general' },
      { keywords: ['dental', 'dentista', 'odontologia', 'odonto', 'muela'], next: 'appointment_dental' },
      { keywords: ['precio', 'precios', 'costo', 'costos', 'tarifa', 'cotizacion'], next: 'ask_service_price' },
      { keywords: ['horario', 'horarios', 'hora', 'abierto', 'atencion'], next: 'hours_info' },
      { keywords: ['urgente', 'dolor', 'sangrado', 'emergencia'], next: 'escalate_urgent' },
      { keywords: ['agente', 'humano', 'asesor', 'persona'], next: 'escalate_agent' }
    ],
    default: 'ask_specialty'
  },
  {
    id: 'ask_specialty',
    message: '¿Qué tipo de atención necesitas? Puedo ayudarte con medicina general o con odontología.',
    transitions: [
      { keywords: ['general', 'medicina', 'consulta'], next: 'appointment_general' },
      { keywords: ['dental', 'dentista', 'odontologia', 'muela'], next: 'appointment_dental' },
      { keywords: ['precio', 'costo', 'tarifa'], next: 'ask_service_price' },
      { keywords: ['horario', 'hora', 'abierto'], next: 'hours_info' },
      { keywords: ['urgente', 'dolor', 'emergencia'], next: 'escalate_urgent' },
      { keywords: ['agente', 'humano', 'asesor'], next: 'escalate_agent' }
    ],
    default: 'fallback'
  },
  {
    id: 'appointment_general',
    message: 'Perfecto, te ayudo con una cita de medicina general. Compárteme tu nombre y número de teléfono para continuar.',
    transitions: [
      { keywords: ['precio', 'costo', 'tarifa'], next: 'ask_service_price' },
      { keywords: ['horario', 'hora', 'abierto'], next: 'hours_info' },
      { keywords: ['urgente', 'dolor', 'emergencia'], next: 'escalate_urgent' },
      { keywords: ['agente', 'humano', 'asesor'], next: 'escalate_agent' }
    ],
    default: 'capture_data'
  },
  {
    id: 'appointment_dental',
    message: 'Perfecto, te ayudo con una cita de odontología. Compárteme tu nombre y número de teléfono para continuar.',
    transitions: [
      { keywords: ['precio', 'costo', 'tarifa'], next: 'ask_service_price' },
      { keywords: ['horario', 'hora', 'abierto'], next: 'hours_info' },
      { keywords: ['urgente', 'dolor', 'emergencia'], next: 'escalate_urgent' },
      { keywords: ['agente', 'humano', 'asesor'], next: 'escalate_agent' }
    ],
    default: 'capture_data'
  },
  {
    id: 'ask_service_price',
    message: 'Claro. ¿Deseas el precio de medicina general o de odontología?',
    transitions: [
      { keywords: ['general', 'medicina'], next: 'price_general' },
      { keywords: ['dental', 'dentista', 'odontologia'], next: 'price_general' },
      { keywords: ['agendar', 'cita', 'reservar'], next: 'capture_data' },
      { keywords: ['horario', 'hora', 'abierto'], next: 'hours_info' }
    ],
    default: 'price_general'
  },
  {
    id: 'price_general',
    message: 'El precio puede variar según el servicio y la valoración. Si quieres, puedo ayudarte a agendar o enviarte con un agente.',
    transitions: [
      { keywords: ['agendar', 'cita', 'reservar'], next: 'capture_data' },
      { keywords: ['horario', 'hora', 'abierto'], next: 'hours_info' },
      { keywords: ['agente', 'humano', 'asesor'], next: 'escalate_agent' }
    ],
    default: 'capture_data'
  },
  {
    id: 'hours_info',
    message: 'Atendemos de lunes a viernes de 8:00 a 18:00 y sábados de 8:00 a 14:00.',
    transitions: [
      { keywords: ['agendar', 'cita', 'reservar'], next: 'capture_data' },
      { keywords: ['precio', 'costo', 'tarifa'], next: 'ask_service_price' },
      { keywords: ['agente', 'humano', 'asesor'], next: 'escalate_agent' }
    ],
    default: 'fallback'
  },
  {
    id: 'capture_data',
    message: 'Perfecto. Envíame tu nombre completo y tu número de teléfono para confirmar la cita.',
    transitions: [
      { keywords: ['urgente', 'dolor', 'emergencia'], next: 'escalate_urgent' },
      { keywords: ['agente', 'humano', 'asesor'], next: 'escalate_agent' },
      { keywords: ['precio', 'costo', 'tarifa'], next: 'ask_service_price' }
    ],
    default: 'escalate_agent'
  },
  {
    id: 'escalate_urgent',
    message: 'Si se trata de una urgencia, acude al servicio de emergencias más cercano o espera la atención de un agente.',
    transitions: [
      { keywords: ['agente', 'humano', 'asesor'], next: 'escalate_agent' },
      { keywords: ['cita', 'agendar'], next: 'capture_data' }
    ],
    default: 'escalate_agent'
  },
  {
    id: 'escalate_agent',
    message: 'Te conecto con un agente. En breve te atenderemos.',
    transitions: [
      { keywords: ['cita', 'agendar', 'reservar'], next: 'capture_data' },
      { keywords: ['precio', 'costo', 'tarifa'], next: 'ask_service_price' }
    ],
    default: 'fallback'
  },
  {
    id: 'fallback',
    message: 'No te entendí del todo. Puedo ayudarte con citas, precios, horarios o con un agente.',
    transitions: [
      { keywords: ['general', 'medicina'], next: 'appointment_general' },
      { keywords: ['dental', 'dentista', 'odontologia'], next: 'appointment_dental' },
      { keywords: ['precio', 'costo', 'tarifa'], next: 'ask_service_price' },
      { keywords: ['horario', 'hora', 'abierto'], next: 'hours_info' },
      { keywords: ['agente', 'humano', 'asesor'], next: 'escalate_agent' }
    ],
    default: 'start'
  }
];

const defaultAdminBotFlowNodes = [
  {
    id: 'start',
    message: 'Hola, bienvenido a [business_name]. ¿En qué podemos ayudarte hoy?',
    transitions: [],
    default: 'fallback'
  },
  {
    id: 'fallback',
    message: 'Gracias por tu mensaje. Un asesor te contactará en breve.',
    transitions: [],
    default: 'escalate_agent'
  }
];

module.exports = {
  defaultClinicBotFlowNodes,
  defaultAdminBotFlowNodes
};
