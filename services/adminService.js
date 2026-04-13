const businessQueriesService = require('./admin/businessQueriesService');
const businessProvisioningService = require('./admin/businessProvisioningService');
const businessMutationsService = require('./admin/businessMutationsService');
const businessUsersService = require('./admin/businessUsersService');
const businessDeletionService = require('./admin/businessDeletionService');

/**
 * Lista negocios con metricas agregadas de usuarios y conversaciones.
 * @returns {Promise<object[]>} Coleccion de negocios para panel admin.
 */
async function listBusinesses() {
  return businessQueriesService.listBusinesses();
}

/**
 * Crea negocio, owner inicial, membresia y configuraciones base en transaccion.
 * @param {{ name: string, phone_number?: string|null, owner_email: string, owner_password: string }} param0 - Datos de alta.
 * @returns {Promise<{ business: object, owner: object }>} Negocio y propietario creados.
 * @throws {Error} Cuando validaciones fallan o ocurre rollback.
 */
async function createBusinessWithOwner({
  name,
  phone_number: phoneNumber,
  owner_email: ownerEmail,
  owner_password: ownerPassword
}) {
  return businessProvisioningService.createBusinessWithOwner({
    name,
    phone_number: phoneNumber,
    owner_email: ownerEmail,
    owner_password: ownerPassword
  });
}

async function updateBusinessStatus(businessId, isActive) {
  return businessMutationsService.updateBusinessStatus(businessId, isActive);
}

/**
 * Obtiene detalle consolidado de negocio, usuarios, bot y WhatsApp.
 * @param {string} businessId - Id del negocio.
 * @returns {Promise<object>} Agregado para vista de detalle admin.
 * @throws {Error} Si el negocio no existe.
 */
async function getBusinessById(businessId) {
  return businessQueriesService.getBusinessById(businessId);
}

async function updateBusinessById(businessId, { name, phone_number: phoneNumber }) {
  return businessMutationsService.updateBusinessById(businessId, {
    name,
    phone_number: phoneNumber
  });
}

/**
 * Calcula metricas globales de plataforma para el dashboard admin.
 * @returns {Promise<object>} Totales de actividad y uso.
 */
async function getPlatformStats() {
  return businessQueriesService.getPlatformStats();
}

async function createUserForBusiness(businessId, { email, password, role }) {
  return businessUsersService.createUserForBusiness(businessId, {
    email,
    password,
    role
  });
}

async function updateUserStatusForBusiness(businessId, userId, isActive) {
  return businessUsersService.updateUserStatusForBusiness(businessId, userId, isActive);
}

/**
 * Elimina un negocio verificando password del admin de plataforma.
 * @param {{ businessId: string, adminUserId: string, adminPassword: string }} param0 - Datos de autorizacion y objetivo.
 * @returns {Promise<object>} Negocio eliminado.
 * @throws {Error} Si faltan datos, no hay permisos o password invalida.
 */
async function deleteBusinessById({ businessId, adminUserId, adminPassword }) {
  return businessDeletionService.deleteBusinessById({ businessId, adminUserId, adminPassword });
}

module.exports = {
  listBusinesses,
  createBusinessWithOwner,
  updateBusinessStatus,
  getBusinessById,
  updateBusinessById,
  getPlatformStats,
  createUserForBusiness,
  updateUserStatusForBusiness,
  deleteBusinessById
};
