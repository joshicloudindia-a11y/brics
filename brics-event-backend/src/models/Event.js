import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    event_code: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    name: {
      type: String,
      required: true,
      minlength: 2,
      maxlength: 100
    },

    description: {
      type: String,
      maxlength: 2000
    },

    event_type: {
      type: String,
            trim: true
    },

    organization_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null
    },

    organization_name: {
      type: String,
      trim: true,
      default: null
    },

    category: {
      type: String,
      trim: true,
      default: "General"
    },

    source_language: {
      type: String,
      default: "English",
      trim: true
    },

    start_date: {
      type: Date,
      required: false
    },

    end_date: {
      type: Date,
      required: false
    },

    capacity: {
      type: Number,
      min: 1
    },

    is_active: {
      type: Boolean,
      default: true
    },

    delegate_count: {
      type: Number,
      min: 1
    },

    registration_open: {
      type: Boolean,
      default: true
    },

    logo: {
      type: String
    },

    venue: {
      type: String,
      trim: true
    },

    location: {
      type: String,
      trim: true
    },

    meeting_url: {
      type: String,
      trim: true
    },

    created_by: {
      type: String
    },

    ministry_name: {
      type: String,
      trim: true
    },

    status: {
      type: String,
      enum: ["draft", "published"],
      default: "published",
      index: true
    },

    published_at: {
      type: Date,
      default: null
    },

    // invites array - generated invite links for the event
    invites: [
      {
        token: { type: String, index: true },
        created_by: { type: String },
        email: { type: String, lowercase: true, trim: true, index: true, sparse: true },
        name: { type: String, trim: true },
        role: { type: String, trim: true },
        expires_at: { type: Date },
        used: { type: Boolean, default: false },
        created_at: { type: Date, default: Date.now }
      }
    ]
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  }
);

eventSchema.index({ start_date: 1, end_date: 1 });
eventSchema.index({ organization_id: 1 });

// index to speed token lookups
// note: `event_code` has `unique: true` on the field and `invites.token` is indexed at field-level,
// so we avoid declaring duplicate indexes here.

export default mongoose.model("Event", eventSchema);