const express = require("express");
const router = express.Router();
const Task = require("../models/task");

router.post("/task/create", async (req, res) => {
  try {
    const task = new Task(req.body);
    await task.save();
    res.status(201).send(task);
  } catch (e) {
    console.log(e);
    res.status(400).send();
  }
});

router.get("/task/all", async (req, res) => {
  try {
    const tasks = await Task.find();
    res.send(tasks);
  } catch (e) {
    console.log(e);
    res.status(400).send();
  }
});
router.get("/task/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const task = await Task.findById(id);
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
    const task = await Task.find({ group });
    if (!task) return res.status(404).send();

    res.send(task);
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
    const task = await Task.findById(id);
    if (!task) return res.status(404).send();

    up.forEach((x) => (task[x] = updates[x]));
    await task.save();
    res.send(task);
  } catch (e) {
    console.log(e);
    res.status(400).send();
  }
});

/*
router.patch("/task/update/group", async (req, res) => {

  const id = req.params.id;
  const updates = req.body;
  const up = Object.keys(updates);
  const allow = ["task", "status"];
  const isValid = up.every((update) => {
    return allow.includes(update);
  });
  if (!isValid) return res.status(400).send({ error: "Invalid updates!" });

  try {
    const task = await Task.findById(id);
    if (!task) return res.status(404).send();

    up.forEach((x) => (task[x] = updates[x]));
    await task.save();
    res.send(task);
  } catch (e) {
    console.log(e);
    res.status(400).send();
  }
});
*/

router.delete("/task/delete/all", async (req, res) => {
  try {
    const tasks = await Task.deleteMany();
    res.send(tasks);
  } catch (e) {
    console.log(e);
    res.status(400).send();
  }
});
router.delete("/task/delete/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const task = await Task.findByIdAndDelete(id);
    if (!task) return res.status(404).send();
    res.send(task);
  } catch (e) {
    console.log(e);
    res.status(400).send();
  }
});

module.exports = router;
