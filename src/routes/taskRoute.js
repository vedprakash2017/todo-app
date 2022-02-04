const express = require("express");
const router = express.Router();
const Task = require("../models/task");
const client = require("../db/redis");

const idToTask = async (ids, update = 0) => {
  let tasks = await Promise.all(
    ids.map(async (id) => {
      try {
        let task;
        // delete task by id
        if (update === 2) task = await client.json.del(id);
        else task = await client.json.get(id);

        task = JSON.parse(task);
        //update task status to true
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
  return tasks;
};

router.post("/task/create", async (req, res) => {
  try {
    const task = new Task(req.body);
    await task.save();

    const id = task._id.toString();
    await client.json.set(id, "$", JSON.stringify(task));
    if (req.body.group !== "gp") {
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
    let ids = await client.scan(0, { TYPE: "ReJSON-RL" });
    ids = ids.keys;
    if (ids.length === 0) return res.status(404).send();

    const tasks = await idToTask(ids);
    res.send(tasks);
  } catch (e) {
    console.log(e);
    res.status(400).send();
  }
});

router.get("/task/:id", async (req, res) => {
  const id = req.params.id;
  try {
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
    // const task = await Task.find({ group });
    const ids = await client.lRange(group, 0, -1);
    if (ids.length === 0) return res.status(404).send();

    const tasks = await idToTask(ids);
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
  const allow = ["task", "status", "group"];

  const isValid = up.every((update) => {
    return allow.includes(update);
  });
  if (!isValid) return res.status(400).send({ error: "Invalid updates!" });

  try {
    const tasksMongo = await Task.findById(id);
    const task = JSON.parse(await client.json.get(id));
    if (!tasksMongo) return res.status(404).send();

    up.forEach((x) => {
      task[x] = updates[x];
      tasksMongo[x] = updates[x];
    });

    await client.json.set(id, "$", JSON.stringify(task));

    if (req.body.group !== "gp") {
      await client.lPush(req.body.group, id);
    }

    await tasksMongo.save();
    res.send(tasksMongo);
  } catch (e) {
    console.log(e);
    res.status(400).send();
  }
});

router.patch("/task/update/group/:group", async (req, res) => {
  const group = req.params.group;
  try {
    const tasksMongo = await Task.updateMany(
      { group },
      { $set: { status: true } }
    );

    let ids = await client.lRange(group, 0, -1);
    if (ids.length === 0) return res.status(404).send();

    const tasks = await idToTask(ids, 1);
    if (!tasksMongo) res.status(404).send();
    res.send(tasks);
  } catch (e) {
    console.log(e);
    res.status(400).send();
  }
});

router.delete("/task/delete/all", async (req, res) => {
  try {
    const tasksMongo = await Task.deleteMany();
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
    const tasksMongo = await Task.deleteMany({ group });

    const ids = await client.lRange(group, 0, -1);
    await client.del(group);
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
