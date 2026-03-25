import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const organizationSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => uuidv4()
    },

    organization_code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },

    organization_name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 200,
      unique: true
    },

    description: {
      type: String,
      maxlength: 1000,
      default: ""
    },

    ministry_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ministry",
      default: null
    },

    ministry_name: {
      type: String,
      trim: true,
      default: null
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
// `organization_code` and `organization_name` are declared with `unique: true` on their fields,
// so avoid declaring duplicate indexes for them here.
organizationSchema.index({ ministry_id: 1 });
organizationSchema.index({ is_active: 1 });

export default mongoose.model("Organization", organizationSchema);
