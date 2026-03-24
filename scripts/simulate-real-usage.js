require('dotenv').config();

const db = require('../db');
const conversationService = require('../services/conversationService');
const leadService = require('../services/leadService');
const { normalizePhone } = require('../utils/phone');

const PHONE_PREFIX = '5215559000';

function envBusinessId() {
  return process.env.Business_ID || process.env.BUSINESS_ID || null;
}

function nowMinusMinutes(minutesAgo) {
  return new Date(Date.now() - (minutesAgo * 60 * 1000));
}

function isoNoMs(date) {
  return new Date(date).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

async function getBusinessContext(businessId) {
  const q = `
    SELECT
      wa.id AS whatsapp_account_id,
      wa.phone_number AS business_phone
    FROM whatsapp_accounts wa
    WHERE wa.business_id = $1
    ORDER BY wa.created_at ASC
    LIMIT 1`;

  const result = await db.query(q, [businessId]);
  if (!result.rows.length) {
    throw new Error('No whatsapp_account found for business.');
  }

  return {
    whatsappAccountId: result.rows[0].whatsapp_account_id,
    businessPhone: normalizePhone(result.rows[0].business_phone) || null
  };
}

async function cleanupPreviousSimulation(businessId) {
  const likePattern = `${PHONE_PREFIX}%`;

  await db.query(
    `DELETE FROM messages
     WHERE conversation_id IN (
       SELECT c.id
       FROM conversations c
       INNER JOIN whatsapp_accounts wa ON wa.id = c.whatsapp_account_id
       WHERE wa.business_id = $1
         AND regexp_replace(c.user_phone, '\\D', '', 'g') LIKE $2
     )`,
    [businessId, likePattern]
  );

  await db.query(
    `DELETE FROM conversations
     WHERE id IN (
       SELECT c.id
       FROM conversations c
       INNER JOIN whatsapp_accounts wa ON wa.id = c.whatsapp_account_id
       WHERE wa.business_id = $1
         AND regexp_replace(c.user_phone, '\\D', '', 'g') LIKE $2
     )`,
    [businessId, likePattern]
  );

  await db.query(
    `DELETE FROM leads
     WHERE business_id = $1
       AND regexp_replace(phone, '\\D', '', 'g') LIKE $2`,
    [businessId, likePattern]
  );
}

async function insertMessage({
  whatsappAccountId,
  conversationId,
  businessPhone,
  userPhone,
  direction,
  status,
  body,
  createdAt
}) {
  const normalizedUserPhone = normalizePhone(userPhone);
  const normalizedBusinessPhone = normalizePhone(businessPhone);

  const fromNumber = direction === 'inbound' ? normalizedUserPhone : normalizedBusinessPhone;
  const toNumber = direction === 'inbound' ? normalizedBusinessPhone : normalizedUserPhone;

  const q = `
    INSERT INTO messages (
      whatsapp_account_id,
      conversation_id,
      from_number,
      to_number,
      body,
      direction,
      status,
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, direction, status, created_at`;

  const result = await db.query(q, [
    whatsappAccountId,
    conversationId,
    fromNumber,
    toNumber,
    body,
    direction,
    status,
    createdAt
  ]);

  return result.rows[0];
}

function buildSimulationSet() {
  // Each conversation has 2-6 messages with increasing chronology.
  return [
    {
      key: 'A1',
      phone: `${PHONE_PREFIX}01`,
      leadName: 'Carolina Ramirez',
      initialLeadStatus: 'NEW',
      messages: [
        { minutesAgo: 28, direction: 'outbound', status: 'sent', body: 'Hola Carolina, te comparto los planes de instalacion para tu negocio.' },
        { minutesAgo: 3, direction: 'inbound', status: 'received', body: 'Gracias, me interesa el plan completo. Que incluye la garantia?' }
      ]
    },
    {
      key: 'A2',
      phone: `${PHONE_PREFIX}02`,
      leadName: 'Mario Torres',
      initialLeadStatus: 'CONTACTED',
      messages: [
        { minutesAgo: 55, direction: 'outbound', status: 'sent', body: 'Te enviamos la cotizacion preliminar para 20 equipos.' },
        { minutesAgo: 12, direction: 'inbound', status: 'received', body: 'La revision la harian esta semana o hasta la proxima?' }
      ]
    },
    {
      key: 'A3',
      phone: `${PHONE_PREFIX}03`,
      leadName: 'Valeria Soto',
      initialLeadStatus: 'NEW',
      messages: [
        { minutesAgo: 80, direction: 'outbound', status: 'sent', body: 'Hola Valeria, podemos ofrecer envio sin costo en tu zona.' },
        { minutesAgo: 47, direction: 'inbound', status: 'received', body: 'Perfecto, si compro hoy cuando me llega?' }
      ]
    },
    {
      key: 'A4',
      phone: `${PHONE_PREFIX}04`,
      leadName: 'Jorge Mendez',
      initialLeadStatus: 'QUALIFIED',
      messages: [
        { minutesAgo: 190, direction: 'outbound', status: 'sent', body: 'Seguimos pendientes de tu aprobacion del paquete premium.' },
        { minutesAgo: 130, direction: 'inbound', status: 'received', body: 'Ya casi lo autorizan, me puedes mantener ese precio?' }
      ]
    },
    {
      key: 'B1',
      phone: `${PHONE_PREFIX}05`,
      leadName: 'Daniela Cruz',
      initialLeadStatus: 'NEW',
      messages: [
        { minutesAgo: 10, direction: 'inbound', status: 'received', body: 'Busco una solucion para controlar inventario en tienda pequena.' },
        { minutesAgo: 2, direction: 'outbound', status: 'sent', body: 'Claro, te recomiendo el plan inicial con panel de ventas en tiempo real.' }
      ]
    },
    {
      key: 'B2',
      phone: `${PHONE_PREFIX}06`,
      leadName: 'Lucia Nava',
      initialLeadStatus: 'CONTACTED',
      messages: [
        { minutesAgo: 65, direction: 'inbound', status: 'received', body: 'Quiero comparar mensual vs anual antes de decidir.' },
        { minutesAgo: 35, direction: 'outbound', status: 'sent', body: 'Anual te da dos meses sin costo y soporte prioritario.' }
      ]
    },
    {
      key: 'B3',
      phone: `${PHONE_PREFIX}07`,
      leadName: 'Pedro Ibarra',
      initialLeadStatus: 'NEW',
      messages: [
        { minutesAgo: 140, direction: 'inbound', status: 'received', body: 'Tienen integracion con facturacion electronica?' },
        { minutesAgo: 95, direction: 'outbound', status: 'sent', body: 'Si, podemos integrar CFDI y conciliacion automatica.' }
      ]
    },
    {
      key: 'C1',
      phone: `${PHONE_PREFIX}08`,
      leadName: 'Rocio Pineda',
      initialLeadStatus: 'NEW',
      messages: [
        { minutesAgo: 20, direction: 'inbound', status: 'received', body: 'Me urge activar esto para fin de semana.' },
        { minutesAgo: 9, direction: 'outgoing', status: 'agent_sent', body: 'Te ayudo hoy mismo. Te comparto onboarding en 15 minutos.' }
      ]
    },
    {
      key: 'C2',
      phone: `${PHONE_PREFIX}09`,
      leadName: 'Fernando Gil',
      initialLeadStatus: 'CONTACTED',
      messages: [
        { minutesAgo: 70, direction: 'inbound', status: 'received', body: 'Si contrato dos sucursales mejoran el precio?' },
        { minutesAgo: 50, direction: 'outgoing', status: 'agent_sent', body: 'Si, te aplicamos descuento por volumen en ambas sucursales.' }
      ]
    },
    {
      key: 'C3',
      phone: `${PHONE_PREFIX}10`,
      leadName: 'Ana Beltran',
      initialLeadStatus: 'QUALIFIED',
      messages: [
        { minutesAgo: 200, direction: 'inbound', status: 'received', body: 'Necesito el paquete con reportes por asesor.' },
        { minutesAgo: 170, direction: 'outgoing', status: 'agent_sent', body: 'Listo, ese paquete incluye reportes y tableros por asesor.' }
      ]
    },
    {
      key: 'R1',
      phone: `${PHONE_PREFIX}11`,
      leadName: 'Gabriela Leon',
      initialLeadStatus: 'CLOSED',
      messages: [
        { minutesAgo: 180, direction: 'outbound', status: 'sent', body: 'Cerramos tu solicitud por falta de respuesta, seguimos atentos.' },
        { minutesAgo: 4, direction: 'inbound', status: 'received', body: 'Hola, retomo esto. Todavia me interesa implementar este mes.' }
      ]
    },
    {
      key: 'R2',
      phone: `${PHONE_PREFIX}12`,
      leadName: 'Miguel Salas',
      initialLeadStatus: 'CLOSED',
      messages: [
        { minutesAgo: 160, direction: 'outbound', status: 'sent', body: 'Tu expediente quedo cerrado temporalmente por inactividad.' },
        { minutesAgo: 40, direction: 'inbound', status: 'received', body: 'Ya tengo presupuesto autorizado, podemos reactivar la propuesta?' }
      ]
    }
  ];
}

async function ensureLeadStateForScenario(businessId, scenario) {
  await leadService.createLead(
    businessId,
    scenario.phone,
    scenario.initialLeadStatus,
    scenario.leadName
  );
}

async function applyLeadTransitionsFromMessage({
  businessId,
  phone,
  direction,
  status,
  conversationId
}) {
  if (direction === 'inbound') {
    await leadService.upsertLeadFromIncomingMessage(businessId, phone);
    await leadService.reopenLeadOnIncomingMessage(businessId, phone);
    return;
  }

  const isAgentMessage = direction === 'outgoing' || (direction === 'outbound' && String(status || '').startsWith('agent_'));
  if (isAgentMessage) {
    if (conversationId) {
      await conversationService.markConversationActive(conversationId);
    }
    await leadService.promoteLeadOnAgentMessage(businessId, phone);
  }
}

async function simulateConversation({ businessId, whatsappAccountId, businessPhone, scenario }) {
  await ensureLeadStateForScenario(businessId, scenario);

  const conversation = await conversationService.resolveConversation(whatsappAccountId, scenario.phone);

  const messagesChronological = [...scenario.messages]
    .sort((a, b) => b.minutesAgo - a.minutesAgo)
    .map((msg, idx) => {
      const baseTime = nowMinusMinutes(msg.minutesAgo);
      const shifted = new Date(baseTime.getTime() + (idx * 1000));
      return {
        ...msg,
        createdAt: isoNoMs(shifted)
      };
    });

  for (const message of messagesChronological) {
    await insertMessage({
      whatsappAccountId,
      conversationId: conversation.id,
      businessPhone,
      userPhone: scenario.phone,
      direction: message.direction,
      status: message.status,
      body: message.body,
      createdAt: message.createdAt
    });

    await applyLeadTransitionsFromMessage({
      businessId,
      phone: scenario.phone,
      direction: message.direction,
      status: message.status,
      conversationId: conversation.id
    });
  }

  return {
    conversationId: conversation.id,
    phone: scenario.phone,
    messages: messagesChronological.length,
    lastCreatedAt: messagesChronological[messagesChronological.length - 1]?.createdAt || null,
    scenarioKey: scenario.key
  };
}

async function summarizeResults(businessId) {
  const q = `
    SELECT
      l.phone,
      l.status,
      COUNT(m.id) AS message_count,
      MIN(m.created_at) AS first_message_at,
      MAX(m.created_at) AS last_message_at
    FROM leads l
    LEFT JOIN conversations c
      ON regexp_replace(c.user_phone, '\\D', '', 'g') = regexp_replace(l.phone, '\\D', '', 'g')
    LEFT JOIN whatsapp_accounts wa
      ON wa.id = c.whatsapp_account_id
      AND wa.business_id = l.business_id
    LEFT JOIN messages m
      ON m.conversation_id = c.id
    WHERE l.business_id = $1
      AND regexp_replace(l.phone, '\\D', '', 'g') LIKE $2
    GROUP BY l.phone, l.status
    ORDER BY l.phone ASC`;

  const result = await db.query(q, [businessId, `${PHONE_PREFIX}%`]);
  return result.rows;
}

async function run() {
  const businessId = envBusinessId();
  if (!businessId) {
    throw new Error('Business_ID/BUSINESS_ID is required in env.');
  }

  await db.init();

  const { whatsappAccountId, businessPhone } = await getBusinessContext(businessId);
  if (!businessPhone) {
    throw new Error('whatsapp_accounts.phone_number is empty for selected business.');
  }

  await cleanupPreviousSimulation(businessId);

  const scenarios = buildSimulationSet();
  const created = [];

  for (const scenario of scenarios) {
    const row = await simulateConversation({
      businessId,
      whatsappAccountId,
      businessPhone,
      scenario
    });
    created.push(row);
  }

  const summary = await summarizeResults(businessId);

  console.log('Simulation complete');
  console.log(`Conversations: ${created.length}`);
  console.log('Details:');
  created.forEach((item) => {
    console.log(`- ${item.scenarioKey} | ${item.phone} | msgs=${item.messages} | last=${item.lastCreatedAt}`);
  });

  const reactivatedPhones = new Set(['521555900011', '521555900012']);
  const reactivated = summary.filter(
    (row) => row.status === 'CONTACTED' && reactivatedPhones.has(String(row.phone))
  );
  console.log(`Reactivated (expected >= 2): ${reactivated.length}`);
  console.log('Lead snapshot:');
  summary.forEach((row) => {
    console.log(`- ${row.phone} | status=${row.status} | msgs=${row.message_count} | first=${row.first_message_at} | last=${row.last_message_at}`);
  });
}

run()
  .catch((err) => {
    console.error('Simulation failed:', err && err.message ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.pool.end();
  });
