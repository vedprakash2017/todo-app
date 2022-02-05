const redis = require("redis");

const url = process.env.REDIS_URL;
const client = redis.createClient({
  url,
});

client.on("error", (err) => {
  console.log("error", err);
});

client.connect().then(() => {
  console.log("redis connected!");
});

module.exports = client;
