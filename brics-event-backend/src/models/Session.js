import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    event_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 200
    },

    type: {
      type: String,
      required: true,
      enum: ["in-person", "virtual", "hybrid"],
      trim: true
    },

    category: {
      type: String,
      trim: true,
      maxlength: 100
    },

    description: {
      type: String,
      maxlength: 2000
    },

    start_datetime: {
      type: Date,
      required: true
    },

    end_datetime: {
      type: Date,
      required: true
    },

    use_event_location: {
      type: Boolean,
      default: false
    },

    location: {
      type: String,
      trim: true,
      maxlength: 300
    },

    meeting_url: {
      type: String,
      trim: true
    },

    photo: {
      type: String // S3 key for session photo
    },

    capacity: {
      type: Number,
      min: 1
    },

    conference_hall_id: {
      type: String,
      default: null
    },

    created_by: {
      type: String // user_id
    }
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  }
);

// Indexes for performance
sessionSchema.index({ event_id: 1, start_datetime: 1 });
sessionSchema.index({ start_datetime: 1, end_datetime: 1 });
sessionSchema.index({ type: 1 });

export default mongoose.model("Session", sessionSchema);
