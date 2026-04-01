# Replai — Backend Context

## Proyecto
SaaS de automatización de WhatsApp para negocios pequeños y medianos en Latinoamérica.
Nombre del producto: Replai.
Stack: Node.js, Express, PostgreSQL. Desplegado en AWS (EC2 + RDS).

## Arquitectura
- Separación estricta por capas: routes → controllers → services → db → utils
- Multi-tenant: cada negocio identificado por phone_number_id
- Relación conversaciones/leads por teléfono normalizado (no FK directa)
- Webhook de WhatsApp Cloud API como punto de entrada principal

## Flujo core
1. Meta → POST /webhook
2. Validación de firma (APP_SECRET obligatorio en producción)
3. Identificación de tenant por phone_number_id
4. conversationEngine resuelve estado y respuesta
5. messageService envía respuesta vía Graph API
6. Persistencia de mensajes, leads y estados en PostgreSQL

## Estados de conversación
- bot → active → closed
- Reactivación automática: CLOSED → CONTACTED cuando cliente vuelve a escribir

## Estados de leads
- NEW → CONTACTED → QUALIFIED → CLOSED

## Sistema de prioridad (lógica core del producto)
- requiresAttention: último mensaje es de cliente o bot
- Urgencia: critical >60min, high 15-60min, normal <15min
- Orden: requiresAttention → urgencia → timestamp

## Reglas de código
- Sin hardcodeo de tokens ni secrets
- Sin lógica de negocio en controllers, va en services
- Sin deduplicación en memoria (usar DB para idempotencia por message_id)
- Fail-fast en startup: validar DATABASE_URL, JWT_SECRET, APP_SECRET antes de arrancar
- Logs estructurados con tenantId, sin datos sensibles
- Sin código procedural largo en controllers

## Deuda técnica conocida
- Deduplicación de webhooks actualmente en memoria, pendiente migrar a Redis
- DDL ejecutándose en startup, pendiente migrar a sistema de migraciones formal
- Procesamiento de webhook en proceso HTTP sin cola, pendiente Redis + workers

## Lo que NO hacer
- No sugerir cambios que rompan el webhook de Meta sin advertirlo explícitamente
- No mover lógica de prioridad al backend sin evaluar impacto en frontend
- No hardcodear phone_number_id ni business_id en ningún lugar