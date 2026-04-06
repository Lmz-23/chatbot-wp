const adminService = require('../services/adminService');
const logger = require('../utils/logger');

function mapErrorToResponse(err, res) {
  if (err && err.code === 'BUSINESS_NOT_FOUND') {
    return res.status(404).json({ ok: false, error: 'business not found' });
  }

  if (err && err.code === 'OWNER_EMAIL_TAKEN') {
    return res.status(409).json({ ok: false, error: 'owner_email ya registrado' });
  }

  if (err && err.code === 'INVALID_ADMIN_PASSWORD') {
    return res.status(401).json({ ok: false, error: 'Contraseña de administrador incorrecta' });
  }

  if (err && typeof err.status === 'number' && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ ok: false, error: err.message || 'bad_request' });
  }

  logger.error('admin_controller_error', {
    code: err && err.code ? err.code : null,
    err: err && err.message ? err.message : err
  });
  return res.status(500).json({ ok: false, error: 'internal_error' });
}

async function listBusinesses(req, res) {
  try {
    const businesses = await adminService.listBusinesses();
    return res.status(200).json({ ok: true, businesses });
  } catch (err) {
    return mapErrorToResponse(err, res);
  }
}

async function createBusiness(req, res) {
  try {
    const { name, phone_number, owner_email, owner_password } = req.body || {};

    const created = await adminService.createBusinessWithOwner({
      name,
      phone_number,
      owner_email,
      owner_password
    });

    return res.status(201).json({
      ok: true,
      business: created.business,
      owner: created.owner
    });
  } catch (err) {
    return mapErrorToResponse(err, res);
  }
}

async function updateBusinessStatus(req, res) {
  try {
    const { businessId } = req.params;
    const { is_active } = req.body || {};

    const business = await adminService.updateBusinessStatus(businessId, is_active);
    return res.status(200).json({ ok: true, business });
  } catch (err) {
    return mapErrorToResponse(err, res);
  }
}

async function getBusinessById(req, res) {
  try {
    const { businessId } = req.params;
    const business = await adminService.getBusinessById(businessId);
    return res.status(200).json({ ok: true, data: business });
  } catch (err) {
    return mapErrorToResponse(err, res);
  }
}

async function updateBusiness(req, res) {
  try {
    const { businessId } = req.params;
    const { name, phone_number } = req.body || {};

    const business = await adminService.updateBusinessById(businessId, {
      name,
      phone_number
    });

    return res.status(200).json({ ok: true, business });
  } catch (err) {
    return mapErrorToResponse(err, res);
  }
}

async function getStats(req, res) {
  try {
    const stats = await adminService.getPlatformStats();
    return res.status(200).json({ ok: true, stats });
  } catch (err) {
    return mapErrorToResponse(err, res);
  }
}

async function createBusinessUser(req, res) {
  try {
    const { businessId } = req.params;
    const { email, password, role } = req.body || {};

    const user = await adminService.createUserForBusiness(businessId, {
      email,
      password,
      role
    });

    return res.status(201).json({ ok: true, user });
  } catch (err) {
    return mapErrorToResponse(err, res);
  }
}

async function updateBusinessUserStatus(req, res) {
  try {
    const { businessId, userId } = req.params;
    const { is_active } = req.body || {};

    const user = await adminService.updateUserStatusForBusiness(businessId, userId, is_active);
    return res.status(200).json({ ok: true, user });
  } catch (err) {
    return mapErrorToResponse(err, res);
  }
}

async function deleteBusiness(req, res) {
  try {
    const { businessId } = req.params;
    const { adminPassword } = req.body || {};

    const deleted = await adminService.deleteBusinessById({
      businessId,
      adminUserId: req.user.userId,
      adminPassword
    });

    return res.status(200).json({ ok: true, deleted });
  } catch (err) {
    return mapErrorToResponse(err, res);
  }
}

module.exports = {
  listBusinesses,
  createBusiness,
  updateBusinessStatus,
  getBusinessById,
  updateBusiness,
  getStats,
  createBusinessUser,
  updateBusinessUserStatus,
  deleteBusiness
};
