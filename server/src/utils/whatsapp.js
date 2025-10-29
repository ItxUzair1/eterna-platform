const axios = require('axios');
// Meta WhatsApp Cloud simple sender
const sendWhatsAppCode = async ({ to, body }) => {
  if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_ID) return;
  const url = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_ID}/messages`;
  await axios.post(url, {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body },
  }, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` }
  });
};

module.exports = { sendWhatsAppCode };
