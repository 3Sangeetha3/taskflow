const mongoose = require('mongoose');
const { PRIORITIES, STATUSES, TASK_LIMITS, TASK_DEFAULTS, TASK_SORT } = require('../constants/task');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: TASK_LIMITS.TITLE_MIN,
      maxlength: TASK_LIMITS.TITLE_MAX,
    },
    description: { type: String, trim: true, maxlength: TASK_LIMITS.DESCRIPTION_MAX, default: TASK_DEFAULTS.DESCRIPTION },
    priority: { type: String, enum: PRIORITIES, default: TASK_DEFAULTS.PRIORITY },
    status: { type: String, enum: STATUSES, default: TASK_DEFAULTS.STATUS },
    dueDate: { type: Date, default: TASK_DEFAULTS.DUE_DATE },
  },
  {
    timestamps: true,
    strict: true, // unknown fields are dropped by Mongoose
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
      },
    },
  }
);

// Matches the list sort (newest first, _id tie-break).
taskSchema.index(TASK_SORT);

module.exports = mongoose.model('Task', taskSchema);
