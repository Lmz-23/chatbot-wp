const axios = require('axios');
const logger = require('../utils/logger');

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function testSendMessage() {
  try {
    console.log('\n=== Testing Send Message Integration ===\n');

    // Step 1: Login
    console.log('[1] Logging in...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@test.com',
      password: 'Admin1234!'
    });
    const token = loginRes.data.token;
    
    // Get user info
    const meRes = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const user = meRes.data;
    console.log(`✓ Logged in as ${user.email}`);
    console.log(`  User ID: ${user.userId}, Business ID: ${user.businessId}`);

    // Step 2: List conversations
    console.log('\n[2] Listing conversations...');
    const convRes = await axios.get(`${API_URL}/business/conversations`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const conversations = convRes.data.conversations || [];
    console.log(`✓ Found ${conversations.length} conversations`);

    if (conversations.length === 0) {
      console.log('⚠ No conversations found. Skipping message send test.');
      return;
    }

    const conversationId = conversations[0].id;
    const userPhone = conversations[0].user_phone;
    console.log(`  Testing with conversation: ${conversationId} (Phone: ${userPhone})`);

    // Step 3: Get messages before send
    console.log('\n[3] Getting messages before send...');
    const msgsBefore = await axios.get(
      `${API_URL}/business/conversations/${conversationId}/messages`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const countBefore = msgsBefore.data.messages.length;
    console.log(`✓ Found ${countBefore} messages before send`);

    // Step 4: Send message
    console.log('\n[4] Sending message...');
    const testMessage = `Test message from integration script at ${new Date().toISOString()}`;
    const sendRes = await axios.post(
      `${API_URL}/business/conversations/${conversationId}/messages`,
      { text: testMessage },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (sendRes.data.ok) {
      console.log('✓ Message sent successfully');
      console.log(`  Message ID: ${sendRes.data.message.id}`);
      console.log(`  Status: ${sendRes.data.message.status}`);
      console.log(`  Text: ${sendRes.data.message.message_text}`);
    } else {
      console.error('✗ Send failed:', sendRes.data.error);
      return;
    }

    // Step 5: Get messages after send
    console.log('\n[5] Getting messages after send...');
    const msgsAfter = await axios.get(
      `${API_URL}/business/conversations/${conversationId}/messages`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const countAfter = msgsAfter.data.messages.length;
    console.log(`✓ Found ${countAfter} messages after send`);

    if (countAfter > countBefore) {
      console.log(`✓ Message count increased (${countBefore} → ${countAfter})`);
      const lastMsg = msgsAfter.data.messages[msgsAfter.data.messages.length - 1];
      console.log(`  Last message: "${lastMsg.message_text}" (direction: ${lastMsg.direction})`);
    } else {
      console.error('✗ Message was not persisted to database');
      return;
    }

    console.log('\n=== All tests passed! ===\n');

  } catch (err) {
    console.error('\n✗ Test failed:');
    if (err.response) {
      console.error(`  Status: ${err.response.status}`);
      console.error(`  Error: ${JSON.stringify(err.response.data, null, 2)}`);
    } else {
      console.error(`  ${err.message}`);
    }
    process.exit(1);
  }
}

testSendMessage();
