// server/src/modules/image/image.sse-broker.js
const { EventEmitter } = require('events');

const brokers = new Map();

function getBroker(jobId) {
  const key = String(jobId);
  if (!brokers.has(key)) brokers.set(key, new EventEmitter());
  return brokers.get(key);
}

module.exports = { getBroker };
