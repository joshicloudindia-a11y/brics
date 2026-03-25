import mongoose from "mongoose";

const agendaSchema = new mongoose.Schema(
  {
    session_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
      index: true
    },

    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 150
    },

    start_time: {
      type: String, // Format: HH:mm
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      trim: true
    },

    end_time: {
      type: String, // Format: HH:mm
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      trim: true
    },

    speaker_ids: [{
      type: String, // References User.id (string type) - speakers are users
      ref: "User"
    }],

    description: {
      type: String,
      maxlength: 1000,
      trim: true,
      default: ""
    },

    created_by: {
      type: String // user_id
    },

    updated_by: {
      type: String // user_id
    },

    is_deleted: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  }
);

// Compound indexes for efficient querying
agendaSchema.index({ session_id: 1, start_time: 1 });
agendaSchema.index({ session_id: 1, is_deleted: 1 });
agendaSchema.index({ speaker_ids: 1 });
agendaSchema.index({ session_id: 1, start_time: 1, end_time: 1 });

// Virtual for full speaker details (speakers are users)
agendaSchema.virtual("speakers", {
  ref: "User",
  localField: "speaker_ids",
  foreignField: "id"
});

// Enable virtual fields when converting to JSON
agendaSchema.set("toJSON", { virtuals: true });
agendaSchema.set("toObject", { virtuals: true });

export default mongoose.model("Agenda", agendaSchema);
