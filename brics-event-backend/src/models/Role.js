import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    name: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true
    },

    description: {
      type: String
    },

    type: {
      type: String,
      enum: ["SYSTEM", "EVENT"],
      required: true
    },

    is_active: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: false }
);

export default mongoose.model("Role", roleSchema);
