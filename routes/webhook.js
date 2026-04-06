const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const webhookConfig = require('../config/webhookConfig');
const webhookController = require('../controllers/webhookController');
const helpers = require('../utils/helpers');
const logger = require('../utils/logger');

const webhookPostLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes, intenta más tarde' }
});

// GET /webhook - verification callback used when you configure the webhook
// URL in Meta's developer console. Meta sends a challenge which we only echo
// back if the verify_token matches. This endpoint is public and should not
// expose sensitive data.
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (webhookConfig.verifyToken(token, mode)) return res.status(200).send(challenge);
  return res.sendStatus(403);
});

// POST /webhook - receive events from Meta. We reply 200 immediately to
// prevent Meta from retrying; processing is offloaded to the controller so
// the HTTP thread is not blocked (sooner or later this should be enqueued to
// a work queue). Errors during processing are logged but do not affect the
// response.
router.post('/', webhookPostLimiter, (req, res) => {
  const appSecret = process.env.APP_SECRET;
  const signatureHeader = req.get('x-hub-signature-256') || req.get('x-hub-signature');
  const isValid = helpers.validateSignature(req.rawBody, signatureHeader, appSecret);
  if (!isValid) {
    logger.warn('webhook_signature_invalid');
    return res.sendStatus(403);
  }

  res.sendStatus(200); // Quick ACK to avoid retries
  webhookController.handleIncoming(req.body).catch(() => {
    // controller logs errors
  });
});

module.exports = router;
