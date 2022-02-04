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
  // client.flushAll().then(() => {
  //   client.keys("*", (err, res) => {
  //     console.log(res);
  //   });
  // });
});
// function conn(call) {
//   client.connect().then((res) => {
//     console.log("Redis Connected!");
//     call();
//   });
// }

// conn(() => {
//   console.log("hello");
// });
// conn().then((res) => {
//   console.log(100);

// });
// conn.then((res) => {
//   module.exports = client;
// });

// (async () => {
//   try {
//     await client.connect();
//     console.log("Redis Connected!");
//     // const value = await client.get("v");
//     return true;
//   } catch (e) {
//     console.log("error on connect!");
//     return e;
//   }
// })();

// (async () => {
//   try {
//     await client.connect();
//     console.log("connected!");
//     return 10;
//   } catch (e) {
//     console.log("error on connection");
//   }
// })();

// const main = async () => {
//   try {
//     await redisClient.connect();
//     const value = await redisClient.json.get("ved", { path: ".id" });
//     const allkey = await redisClient.json.objKeys("ved");

//     console.log(allkey);

//     await redisClient.disconnect();
//     return value;
//   } catch (e) {
//     console.log("errorr ha bhai", e);
//   }
// };

// main()
//   .then((res) => {
//     console.log("res", res);
//   })
//   .catch((err) => {
//     console.log("mf", err);
//   });

module.exports = client;
