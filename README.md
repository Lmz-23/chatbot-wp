# WhatsApp Webhook API

Node.js webhook server for WhatsApp Cloud API integration.

## Overview

This project implements a webhook endpoint to:

- Verify WhatsApp webhook with Meta
- Receive incoming messages
- Handle webhook events securely
- Deploy in production environments

Built with:
- Node.js
- Express
- dotenv

---

## Project Structure

.
├── index.js
├── package.json
├── .gitignore
└── README.md

---

## Environment Variables

Create a .env file locally:

VERIFY_TOKEN=your_verify_token
WHATSAPP_TOKEN=your_whatsapp_cloud_api_token
PHONE_NUMBER_ID=your_phone_number_id
PORT=3000

⚠️ Do not commit .env or node_modules.

---

## Installation

npm install

---

## Run Locally

npm start

Server runs on:

http://localhost:3000

---

## Webhook Endpoint

GET  /webhook   -> Verification  
POST /webhook  -> Receive messages

---

## Deployment

Deployed on Render as a Web Service.

Start command:

node index.js

Environment variables must be configured inside Render dashboard.

---

## Security

- Tokens stored as environment variables
- HTTPS required in production
- Never expose credentials publicly

---

## Status

Active development.