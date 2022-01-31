const mongoose = require("mongoose");

const Schema = new mongoose.Schema(
  {
    task: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    status: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Task = mongoose.model("todo", Schema);

module.exports = Task;
