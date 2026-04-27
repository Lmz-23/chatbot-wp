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

const defaultReplaiSalesBotFlowNodes = [
  {
    id: 'start',
    message: 'Hola, soy el asistente de Replai 👋 ¿A qué se dedica tu negocio?',
    transitions: [
      { keywords: ['restaurante', 'comida', 'café', 'cafe'], next: 'perfil_generico' },
      { keywords: ['clínica', 'clinica', 'salud', 'médico', 'medico', 'dentista'], next: 'perfil_generico' },
      { keywords: ['tienda', 'ropa', 'productos', 'venta'], next: 'perfil_generico' },
      { keywords: ['servicios', 'consultora', 'agencia'], next: 'perfil_generico' }
    ],
    default: 'perfil_generico'
  },
  {
    id: 'perfil_generico',
    message: 'Perfecto. Una pregunta directa: ¿cuántos mensajes de WhatsApp recibe tu negocio al día aproximadamente?',
    transitions: [
      { keywords: ['menos de 10', 'pocos', 'poco', 'no muchos'], next: 'volumen_bajo' },
      { keywords: ['10', '20', '30', 'bastantes', 'varios'], next: 'dolor_activacion' },
      { keywords: ['50', '100', 'muchos', 'demasiados', 'montones'], next: 'dolor_alto' }
    ],
    default: 'dolor_activacion'
  },
  {
    id: 'volumen_bajo',
    message: 'Entiendo. Aunque el volumen sea bajo hoy, cada mensaje no respondido es un cliente que se va con tu competencia. ¿Te ha pasado que alguien escribió y no le respondiste a tiempo?',
    transitions: [
      { keywords: ['sí', 'si', 'siempre', 'a veces', 'claro'], next: 'dolor_activacion' },
      { keywords: ['no', 'nunca', 'jamás', 'jamas'], next: 'educacion_valor' }
    ],
    default: 'dolor_activacion'
  },
  {
    id: 'educacion_valor',
    message: 'Qué bueno. Pero imagina poder responder instantáneamente a las 2am, los domingos, o cuando estás en una reunión, sin hacer nada. Eso es exactamente lo que hace Replai. ¿Te gustaría ver cómo funciona?',
    transitions: [
      { keywords: ['sí', 'si', 'claro', 'cómo', 'como', 'me interesa', 'interesa'], next: 'mostrar_beneficios' },
      { keywords: ['no', 'no me interesa'], next: 'cierre_suave' }
    ],
    default: 'mostrar_beneficios'
  },
  {
    id: 'dolor_activacion',
    message: 'Eso significa que probablemente estás perdiendo ventas sin darte cuenta. Replai responde automáticamente a tus clientes 24/7, califica quién está listo para comprar, y te avisa solo cuando necesitas intervenir. ¿Quieres que te explique cómo funciona?',
    transitions: [
      { keywords: ['sí', 'si', 'claro', 'cómo', 'como', 'cuéntame', 'cuentame'], next: 'mostrar_beneficios' },
      { keywords: ['cuánto', 'cuanto', 'precio', 'costo', 'vale'], next: 'presentar_precio' },
      { keywords: ['ya tengo', 'uso otra', 'tengo algo', 'tengo un'], next: 'manejo_objecion_competencia' }
    ],
    default: 'mostrar_beneficios'
  },
  {
    id: 'dolor_alto',
    message: 'Con ese volumen, si no tienes automatización estás dejando dinero sobre la mesa todos los días. Replai puede manejar todo ese flujo, clasificar leads por urgencia, y hacer que tu equipo solo atienda a quien está listo para comprar. ¿Te interesa ver cómo?',
    transitions: [
      { keywords: ['sí', 'si', 'cómo', 'como', 'me interesa', 'interesa'], next: 'mostrar_beneficios' },
      { keywords: ['cuánto', 'cuanto', 'precio', 'costo'], next: 'presentar_precio' },
      { keywords: ['ya tengo', 'uso otra', 'tengo algo'], next: 'manejo_objecion_competencia' }
    ],
    default: 'mostrar_beneficios'
  },
  {
    id: 'mostrar_beneficios',
    message: 'Replai hace tres cosas por tu negocio: responde mensajes automáticamente 24/7, organiza tus prospectos por prioridad para que no pierdas ninguno, y te da un panel donde tú o tu equipo pueden ver todo en tiempo real. Setup en menos de 48 horas. ¿Qué te parece más valioso?',
    transitions: [
      { keywords: ['respuestas', 'automático', 'automatico', 'bot', 'responder'], next: 'captura_datos' },
      { keywords: ['organizar', 'leads', 'prospectos', 'clientes'], next: 'captura_datos' },
      { keywords: ['panel', 'equipo', 'agentes', 'equipo'], next: 'captura_datos' },
      { keywords: ['todo', 'los tres', 'suena bien', 'genial', 'excelente'], next: 'captura_datos' },
      { keywords: ['precio', 'cuánto', 'cuanto', 'costo'], next: 'presentar_precio' }
    ],
    default: 'captura_datos'
  },
  {
    id: 'presentar_precio',
    message: 'El setup único es de $150 USD, que incluye la configuración personalizada para tu negocio. La mensualidad es de $60 USD, menos de lo que pierdes en un solo cliente que no respondiste a tiempo. ¿Quieres que un asesor te contacte para resolver tus dudas?',
    transitions: [
      { keywords: ['sí', 'si', 'claro', 'quiero', 'llamen', 'contacten'], next: 'captura_datos' },
      { keywords: ['caro', 'mucho', 'costoso', 'no puedo'], next: 'manejo_objecion_precio' },
      { keywords: ['lo pienso', 'después', 'despues', 'luego', 'no sé', 'no se'], next: 'urgencia' }
    ],
    default: 'captura_datos'
  },
  {
    id: 'manejo_objecion_precio',
    message: 'Entiendo. Para darte contexto: perder un solo cliente por no responder a tiempo puede costar más que la mensualidad completa. Y tenemos garantía de satisfacción en los primeros 30 días. ¿Quieres que un asesor te muestre exactamente el ROI para tu negocio?',
    transitions: [
      { keywords: ['sí', 'si', 'bueno', 'de acuerdo', 'ok', 'vale'], next: 'captura_datos' },
      { keywords: ['no', 'no me convence', 'no gracias'], next: 'cierre_suave' }
    ],
    default: 'captura_datos'
  },
  {
    id: 'manejo_objecion_competencia',
    message: 'Qué bueno que ya tienes algo. La mayoría de nuestros clientes venían de otras herramientas y cambiaron porque Replai incluye configuración personalizada del flujo para tu negocio específico, no solo una herramienta genérica. ¿Te gustaría comparar?',
    transitions: [
      { keywords: ['sí', 'si', 'comparar', 'ver', 'diferencias', 'mostrar'], next: 'mostrar_beneficios' },
      { keywords: ['no', 'estoy bien', 'no gracias'], next: 'cierre_suave' }
    ],
    default: 'mostrar_beneficios'
  },
  {
    id: 'urgencia',
    message: 'Entendido. Solo te comento que los primeros 5 clientes de este mes tienen el setup con 30% de descuento. Si decides después puede que ya no esté disponible. ¿Te agendo una llamada rápida de 15 minutos sin compromiso?',
    transitions: [
      { keywords: ['sí', 'si', 'agendar', 'llamada', 'claro', 'quiero'], next: 'captura_datos' },
      { keywords: ['no', 'después', 'despues', 'luego'], next: 'cierre_suave' }
    ],
    default: 'captura_datos'
  },
  {
    id: 'captura_datos',
    message: 'Perfecto. Para conectarte con un asesor necesito: tu nombre y el nombre de tu negocio. ¿Me los compartes?',
    transitions: [],
    default: 'escalate_agent'
  },
  {
    id: 'cierre_suave',
    message: 'Sin problema. Si en algún momento quieres saber más, aquí estaremos. ¿Hay algo más en lo que pueda ayudarte hoy?',
    transitions: [
      { keywords: ['sí', 'si', 'tengo pregunta', 'pregunta', 'otra cosa'], next: 'start' }
    ],
    default: 'escalate_agent'
  },
  {
    id: 'escalate_agent',
    message: 'Gracias por tu interés. Un asesor de Replai te contactará en breve para darte atención personalizada.',
    transitions: [],
    default: 'escalate_agent'
  }
];

module.exports = {
  defaultClinicBotFlowNodes,
  defaultAdminBotFlowNodes,
  defaultReplaiSalesBotFlowNodes
};
