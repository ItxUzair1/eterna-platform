const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const trialQueue = new Queue('trial', { connection });

// QueueScheduler is not needed in BullMQ v5+ - delayed jobs are handled automatically

module.exports = { trialQueue, Worker, connection };


