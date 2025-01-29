import mongoose from "mongoose";

/**
 * The `Subscription` collection stores each subscription relation between a user (subscriber) and a channel.
 * Each document in this collection represents a subscription, containing a `subscriberId` (the user who subscribes)
 * and a `channelId` (the channel being subscribed to).
 * 
 * To obtain the total number of subscribers for a particular channel, you can use aggregation to:
 * - Find all documents where `channelId` matches the given channel ID.
 * - Count the number of documents that match.
 * 
 * To obtain all subscriptions of a particular user, you can use aggregation to:
 * - Find all documents where `subscriberId` matches the given user ID.
 * - Count the number of documents that match.
 */

const subscriptionSchema = new mongoose.Schema(
  {
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subscriberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
