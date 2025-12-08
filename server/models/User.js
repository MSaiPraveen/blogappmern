const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { ROLES } = require("../config/constants");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
      match: [/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Don't include password by default in queries
    },
    name: {
      type: String,
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [500, "Bio cannot exceed 500 characters"],
    },
    avatar: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.USER,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    // OAuth providers
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple null values
    },
    githubId: {
      type: String,
      unique: true,
      sparse: true,
    },
    authProvider: {
      type: String,
      enum: ["local", "google", "github"],
      default: "local",
    },
    // Bookmarked posts
    bookmarks: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    }],
    // Refresh tokens for token rotation
    refreshTokens: [{
      token: { type: String, required: true },
      expiresAt: { type: Date, required: true },
      createdAt: { type: Date, default: Date.now },
      userAgent: String,
      ip: String,
    }],
    // Social features - Following/Followers
    following: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    followers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    // Newsletter subscription
    newsletter: {
      subscribed: { type: Boolean, default: false },
      subscribedAt: Date,
      frequency: { 
        type: String, 
        enum: ["daily", "weekly", "monthly"],
        default: "weekly"
      },
    },
    // Notification preferences
    notificationPrefs: {
      email: {
        newFollower: { type: Boolean, default: true },
        newComment: { type: Boolean, default: true },
        newLike: { type: Boolean, default: false },
        newsletter: { type: Boolean, default: true },
      },
      inApp: {
        newFollower: { type: Boolean, default: true },
        newComment: { type: Boolean, default: true },
        newLike: { type: Boolean, default: true },
        newPost: { type: Boolean, default: true }, // From followed authors
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for post count
userSchema.virtual("postCount", {
  ref: "Post",
  localField: "_id",
  foreignField: "author",
  count: true,
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  // OAuth users don't have passwords
  if (!this.password) {
    return false;
  }
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update last login
userSchema.methods.updateLastLogin = function () {
  this.lastLogin = new Date();
  return this.save({ validateBeforeSave: false });
};

// Check if user has role
userSchema.methods.hasRole = function (role) {
  return this.role === role;
};

// Check if user is admin
userSchema.methods.isAdmin = function () {
  return this.role === ROLES.ADMIN;
};

module.exports = mongoose.model("User", userSchema);
