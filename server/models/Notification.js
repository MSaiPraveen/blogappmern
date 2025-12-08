const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    type: {
      type: String,
      enum: [
        "follow",        // Someone followed you
        "like",          // Someone liked your post
        "comment",       // Someone commented on your post
        "reply",         // Someone replied to your comment
        "mention",       // Someone mentioned you
        "new_post",      // Someone you follow posted
        "system",        // System notification
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    // Related content
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },
    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },
    // Status
    read: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
    // For grouping similar notifications
    groupKey: String,
    // Link to navigate to
    link: String,
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1 });
notificationSchema.index({ createdAt: -1 });

// Auto-delete old read notifications (older than 30 days)
notificationSchema.index({ readAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Static method to create notification
notificationSchema.statics.createNotification = async function({
  recipient,
  sender,
  type,
  title,
  message,
  post,
  comment,
  link,
}) {
  // Don't notify yourself
  if (sender && recipient.toString() === sender.toString()) {
    return null;
  }

  const notification = await this.create({
    recipient,
    sender,
    type,
    title,
    message,
    post,
    comment,
    link,
    groupKey: `${type}-${post || comment || sender}`,
  });

  return notification;
};

// Mark as read
notificationSchema.methods.markAsRead = function() {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

module.exports = mongoose.model("Notification", notificationSchema);
