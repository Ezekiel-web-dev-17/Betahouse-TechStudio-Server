import { createClient } from 'redis';
import { REDIS_HOST, REDIS_PASSWORD, REDIS_PORT, REDIS_USERNAME } from './config/env.config.js';

const client = createClient({
  username: REDIS_USERNAME,
  password: REDIS_PASSWORD,
  socket: {
    host: REDIS_HOST,
    port: REDIS_PORT ? parseInt(REDIS_PORT) : 6379,
  }
});

client.on('error', err => console.log('Redis Client Error', err));

await client.connect();

export default client;