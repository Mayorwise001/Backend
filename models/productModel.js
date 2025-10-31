// models/productModel.js
import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please provide a product title"],
      trim: true,
    },
    details: {
      type: String,
      required: [true, "Please provide product details"],
    },
    image: {
      type: String,
      required: [true, "Please upload a product image URL"],
    },
    price: {
      type: Number,
      required: [true, "Please provide a product price"],
      min: [0, "Price cannot be negative"],
    },
    rating: {
      rate: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
  },
  {
    timestamps: true, // adds createdAt & updatedAt fields
  }
);

const Product = mongoose.model("Product", productSchema);

export default Product;
