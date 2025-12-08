const mongoose = require("mongoose");

const subscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    name: {
      type: String,
      trim: true,
    },
    // Link to user if they have an account
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      sparse: true,
    },
    // Subscription status
    status: {
      type: String,
      enum: ["pending", "active", "unsubscribed"],
      default: "pending",
    },
    // Confirmation token for double opt-in
    confirmToken: String,
    confirmedAt: Date,
    // Preferences
    frequency: {
      type: String,
      enum: ["daily", "weekly", "monthly"],
      default: "weekly",
    },
    // Topics of interest
    interests: [{
      type: String,
    }],
    // Tracking
    lastEmailSent: Date,
    emailsSent: {
      type: Number,
      default: 0,
    },
    // Unsubscribe tracking
    unsubscribedAt: Date,
    unsubscribeReason: String,
    // Source of subscription
    source: {
      type: String,
      enum: ["website", "api", "import"],
      default: "website",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
subscriberSchema.index({ email: 1 });
subscriberSchema.index({ status: 1 });
subscriberSchema.index({ user: 1 });

module.exports = mongoose.model("Subscriber", subscriberSchema);
