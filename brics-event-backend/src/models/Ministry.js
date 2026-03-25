import mongoose from "mongoose";

const ministrySchema = new mongoose.Schema(
  {
    ministry_code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },

    ministry_name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 200
    },

    description: {
      type: String,
      maxlength: 1000,
      default: ""
    },

    is_active: {
      type: Boolean,
      default: true
    },

    created_by: {
      type: String,
      trim: true,
      default: "SYSTEM"
    }
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  }
);

// indexes
// `ministry_code` is declared with `unique: true` on the field, so avoid duplicating its index here.
ministrySchema.index({ ministry_name: 1 });

export default mongoose.model("Ministry", ministrySchema);
