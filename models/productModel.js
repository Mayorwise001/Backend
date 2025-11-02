const mongoose = require("mongoose");

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
    categories: {
      type: [String],
      required: [true, "Please select at least one product category"],
      enum: ["Laptops", "Accessories", "Gaming", "Electronics"],
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
  { timestamps: true }
);


module.exports = mongoose.model("Product", productSchema);
