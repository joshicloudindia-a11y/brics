import mongoose from "mongoose";

const userEventSchema = new mongoose.Schema(
  {
    /* UNIQUE REGISTRATION ID */
    registration_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    user_id: {
      type: String,
      required: true,
      index: true,
    },

    event_id: {
      type: String,
      required: true,
      index: true,
    },

    role: {
      type: String,
      required: true,
      enum: [
        "EVENT MANAGER",
        "DAO",
        "DELEGATE",
        "HEAD OF DELEGATE",
        "SECURITY OFFICER",
        "INTERPRETER",
        "MEDIA",
        "DEPUTY",
        "DELEGATION CONTACT OFFICER",
        "SPEAKER",
      ],
      index: true,
    },

    status: {
      type: String,
      enum: ["invited", "registered", "confirmed", "cancelled"],
      default: "registered",
    },

    user_type: {
      type: String,
      default: "DELEGATE",
      index: true,
    },

    /* ATTENDANCE (OPTIONAL FOR ALL) */
    attended: {
      type: Boolean,
      default: false,
    },

    check_in_time: {
      type: Date,
      default: null,
    },

    check_out_time: {
      type: Date,
      default: null,
    },

    /* WHO CREATED THIS USER IN EVENT */
    created_by: {
      type: String, // user_id
    },

    registered_at: {
      type: Date,
      default: Date.now,
    },

    cancelled_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

/* INDEXES */
userEventSchema.index({ user_id: 1, event_id: 1 }, { unique: true });
userEventSchema.index({ event_id: 1, role: 1 });
userEventSchema.index({ event_id: 1, attended: 1 });

export default mongoose.model("UserEvent", userEventSchema);
