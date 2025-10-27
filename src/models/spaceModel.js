const mongoose = require("mongoose");

const spaceSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    taskType:{
      type:String,
      required:true,
    },
    filepaths: [
      {
        type:String,
      },
    ],
    status: {
      type: String,
      required: true,
    }
  },
  { timestamps: true }
);

const Space = mongoose.model("Space", spaceSchema);

module.exports = Space;
