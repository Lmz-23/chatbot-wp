const express = require('express');
const router = express.Router();
const webhookConfig = require('../config/webhookConfig');
const webhookController = require('../controllers/webhookController');

// GET /webhook - verification for Meta
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (webhookConfig.verifyToken(token, mode)) return res.status(200).send(challenge);
  return res.sendStatus(403);
});

// POST /webhook - quick ACK then process
router.post('/', (req, res) => {
  res.sendStatus(200); // Quick ACK to avoid retries
  webhookController.handleIncoming(req.body).catch(() => {
    // controller logs errors
  });
});

module.exports = router;
