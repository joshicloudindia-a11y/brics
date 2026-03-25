import mongoose from "mongoose";

const sessionParticipantSchema = new mongoose.Schema(
  {
    session_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
      index: true
    },

    user_id: {
      type: String,
      required: true,
      index: true
    },

    event_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true
    },

    participant_type: {
      type: String,
      enum: ["attendee", "speaker"],
      required: true,
      default: "attendee",
      index: true
    },

    registration_status: {
      type: String,
      enum: ["registered", "confirmed", "cancelled"],
      default: "registered"
    },

    attendance_status: {
      type: String,
      enum: ["not-attended", "attended"],
      default: "not-attended"
    },

    check_in_time: {
      type: Date,
      default: null
    },

    registered_at: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  }
);

// Compound index to prevent duplicate participants in a session with same type
sessionParticipantSchema.index({ session_id: 1, user_id: 1, participant_type: 1 }, { unique: true });

// Indexes for querying
sessionParticipantSchema.index({ user_id: 1, event_id: 1 });
sessionParticipantSchema.index({ session_id: 1, registration_status: 1 });
sessionParticipantSchema.index({ session_id: 1, participant_type: 1 });

export default mongoose.model("SessionParticipant", sessionParticipantSchema);
