import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const conferenceHallSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      required: true,
    },
    hall_name: {
      type: String,
      required: true,
      trim: true,
    },
    venue_name: {
      type: String,
      required: true,
      trim: true,
    },
    floor_name: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    video_conference_enabled: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["available", "booked", "maintenance"],
      default: "available",
    },
    // Assignment fields
    event_id: {
      type: String,
      default: null,
    },
    session_id: {
      type: String,
      default: null,
    },
    session_name: {
      type: String,
      default: null,
    },
    assigned_date: {
      type: Date,
      default: null,
    },
    assigned_by: {
      type: String, // user_id
      default: null,
    },
    start_date: {
      type: Date,
      default: null,
    },
    end_date: {
      type: Date,
      default: null,
    },
    created_by: {
      type: String,
      required: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
conferenceHallSchema.index({ hall_name: 1 });
conferenceHallSchema.index({ state: 1, city: 1 });
conferenceHallSchema.index({ status: 1 });
conferenceHallSchema.index({ event_id: 1 });
conferenceHallSchema.index({ session_id: 1 });

const ConferenceHall = mongoose.model("ConferenceHall", conferenceHallSchema);

export default ConferenceHall;
