const express = require("express");
const router = express.Router();
const Task = require("../models/task");
const client = require("../db/redis");

//ids is array of already saved task ids , update is just some condtion to manipulate task, by default its 0

const idToTask = async (ids, update = 0) => {
  // as we need to wait to get result, thats why use await Promise.all to finish all promises
  let tasks = await Promise.all(
    ids.map(async (id) => {
      try {
        let task;

        //if update = 2 then we want to delete task by id
        if (update === 2) task = await client.json.del(id);
        else task = await client.json.get(id); // get task by id
        task = JSON.parse(task); // convert to object

        //if update = 1 , we want task status to true ( completed )
        if (update === 1) {
          task.status = true;
          await client.json.set(id, "$", JSON.stringify(task));
        }

        return task;
      } catch (err) {
        throw err;
      }
    })
  );

  // it will return all tasks after extracting them by there id.
  return tasks;
};

router.post("/task/create", async (req, res) => {
  try {
    //getting task details from the json body of request
    const task = new Task(req.body);
    await task.save(); // save in mongodb database

    const id = task._id.toString();
    //saving in redis. id as key and task object as json string (value)
    await client.json.set(id, "$", JSON.stringify(task));
    if (req.body.group !== "gp") {
      //if group provide in the req.body, create new array in redis and add task id
      await client.lPush(req.body.group, id);
    }
    res.status(201).send(task);
  } catch (e) {
    console.log(e);
    res.status(400).send();
  }
});

router.get("/task/all", async (req, res) => {
  try {
    /* now we have 2 types of data in redis. one json ( tasks ) and another array( groups ). 
    to get all task we need to extract only json data */

    let ids = await client.scan(0, { TYPE: "ReJSON-RL" }); // return all json type data keys ( all task ids )
    ids = ids.keys;
    if (ids.length === 0) return res.status(404).send();

    // After getting ids we need to extract task from that id use json.get.
    const tasks = await idToTask(ids); // this function extract all tasks from ids and return

    res.send(tasks);
  } catch (e) {
    console.log(e);
    res.status(400).send();
  }
});

router.get("/task/:id", async (req, res) => {
  const id = req.params.id;
  try {
    //get task by id and parse it in object
    const task = JSON.parse(await client.json.get(id));
    if (!task) return res.status(404).send();

    res.send(task);
  } catch (e) {
    console.log(e);
    res.status(400).send();
  }
});

router.get("/task/group/:group", async (req, res) => {
  const group = req.params.group;
  try {
    // getting all ids from the group_array
    const ids = await client.lRange(group, 0, -1);
    if (ids.length === 0) return res.status(404).send();

    const tasks = await idToTask(ids); // extract all tasks from id's
    res.send(tasks);
  } catch (e) {
    console.log(e);
    res.status(400).send();
  }
});

router.patch("/task/update/:id", async (req, res) => {
  const id = req.params.id;
  const updates = req.body;

  const up = Object.keys(updates);
  // allow fields
  const allow = ["task", "status", "group"];

  // check if any request body json is invalid or not
  const isValid = up.every((update) => {
    return allow.includes(update);
  });

  if (!isValid) return res.status(400).send({ error: "Invalid updates!" });

  try {
    //taskMondo represent task getting from the mongodb
    const tasksMongo = await Task.findById(id);

    //task getting from redis  db
    const task = JSON.parse(await client.json.get(id));
    if (!tasksMongo) return res.status(404).send();

    //update both task and taskMongo
    up.forEach((x) => {
      task[x] = updates[x];
      tasksMongo[x] = updates[x];
    });

    //saving the task in mongodb
    await tasksMongo.save();

    //saving the task in redis
    await client.json.set(id, "$", JSON.stringify(task));
    if (req.body.group !== "gp") {
      await client.lPush(req.body.group, id);
    }

    res.send(tasksMongo);
  } catch (e) {
    console.log(e);
    res.status(400).send();
  }
});

router.patch("/task/update/group/:group", async (req, res) => {
  const group = req.params.group;
  try {
    //update mongodb tasks where group is params.group by changing status to true ( completed )
    const tasksMongo = await Task.updateMany(
      { group },
      { $set: { status: true } }
    );

    // getting all tasks id where grouop is params.group from redis group array
    let ids = await client.lRange(group, 0, -1);
    if (ids.length === 0) return res.status(404).send();

    const tasks = await idToTask(ids, 1); // Loop through the task ids and change the task  status to true , after that save it
    // if pass 1 means will update the each task status to true
    if (!tasksMongo) res.status(404).send();
    res.send(tasks);
  } catch (e) {
    console.log(e);
    res.status(400).send();
  }
});

router.delete("/task/delete/all", async (req, res) => {
  try {
    // deleting all task from mongodb
    const tasksMongo = await Task.deleteMany();

    // deleting all task from redis
    const tasks = await client.flushAll();
    if (!tasksMongo) res.status(404).send();
    if (!tasks) res.status(404).send();
    res.send(tasks);
  } catch (e) {
    console.log(e);
    res.status(400).send();
  }
});

router.delete("/task/delete/group/:group", async (req, res) => {
  const group = req.params.group;
  try {
    // delete task which group name is params.group
    const tasksMongo = await Task.deleteMany({ group });

    // getting all ids from redis group array
    const ids = await client.lRange(group, 0, -1);
    await client.del(group);

    //pass 2 to delete all task extract from the ids array
    const tasks = idToTask(ids, 2);
    if (tasksMongo.deletedCount === 0) res.status(404).send();
    res.send(tasks);
  } catch (e) {
    console.log(e);
    res.status(400).send();
  }
});

router.delete("/task/delete/:id", async (req, res) => {
  const id = req.params.id;
  try {
    // delete by id
    const taskMongo = await Task.findByIdAndDelete(id);
    const task = JSON.parse(await client.json.del(id));
    if (!taskMongo) return res.status(404).send();
    if (!task) return res.status(404).send();
    res.send(taskMongo);
  } catch (e) {
    console.log(e);
    res.status(400).send();
  }
});

module.exports = router;
