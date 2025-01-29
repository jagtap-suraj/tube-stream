import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema = new mongoose.Schema(
  {
    commentator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
    },
    contet: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

commentSchema.plugin(mongooseAggregatePaginate);

export const Comment = mongoose.model("Comment", commentSchema);
