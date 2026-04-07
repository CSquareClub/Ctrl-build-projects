const IORedis = require('ioredis');

let connection;
let listenersBound = false;

function getRedisUrl() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('Missing REDIS_URL in backend environment.');
  }

  return redisUrl.trim();
}

function createRedisOptions(redisUrl) {
  const usesTls = redisUrl.startsWith('rediss://');

  return {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
    connectTimeout: 10000,
    keepAlive: 30000,
    tls: usesTls ? {} : undefined,
    retryStrategy(attempt) {
      if (attempt > 5) {
        console.error('[redis] retry limit reached, stopping reconnect attempts');
        return null;
      }

      return Math.min(1000 * 2 ** (attempt - 1), 8000);
    },
  };
}

function bindConnectionListeners(client) {
  if (listenersBound) {
    return;
  }

  listenersBound = true;

  client.on('connect', () => {
    console.log('Connected to Redis');
  });

  client.on('ready', () => {
    console.log('Redis connection is ready');
  });

  client.on('reconnecting', (delay) => {
    console.warn(`[redis] reconnecting in ${delay}ms`);
  });

  client.on('end', () => {
    console.warn('[redis] connection closed');
  });

  client.on('error', (error) => {
    console.error('[redis] connection error', error.message);
  });
}

function getRedisConnection() {
  if (connection) {
    return connection;
  }

  const redisUrl = getRedisUrl();

  if (!/^rediss?:\/\//i.test(redisUrl)) {
    throw new Error('REDIS_URL must be a full redis:// or rediss:// URL.');
  }

  connection = new IORedis(redisUrl, createRedisOptions(redisUrl));
  bindConnectionListeners(connection);

  return connection;
}

module.exports = {
  getRedisUrl,
  getRedisConnection,
};
