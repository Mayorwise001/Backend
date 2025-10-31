import express from "express";
import multer from "multer";
import path from "path";
import Product from "../models/productModel.js"; // ✅ Import Product model

const router = express.Router();

// Set storage destination and filename
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/images"); // folder for image uploads
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

// File filter — only allow images
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const mimeType = allowedTypes.test(file.mimetype);
  const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimeType && extName) {
    return cb(null, true);
  }
  cb(new Error("Only image files are allowed (jpeg, jpg, png, webp, gif)!"));
};

const upload = multer({ storage, fileFilter: imageFilter });

// ✅ Render Upload Page
router.get("/", (req, res) => {
  res.render("Upload");
});

router.get("/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.render("products", {
      title: "All Products",
      products,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ✅ Get All Products (API Endpoint for React Frontend)
router.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find();

    // ✅ Convert relative image paths into full URLs
    const updatedProducts = products.map((p) => ({
      ...p._doc,
      image: p.image
        ? `${req.protocol}://${req.get("host")}${p.image}` // e.g. http://localhost:5000/uploads/images/abc.png
        : null,
    }));

    res.status(200).json({
      message: "🛒 All uploaded products",
      count: products.length,
      products: updatedProducts,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



// ✅ Upload Product and Save to Database
// router.post("/upload", upload.single("image"), async (req, res) => {
//   try {
//     // Check if image exists
//     if (!req.file) return res.status(400).json({ message: "No image uploaded" });

//     // Extract fields from form
//     const { title, details, rating, price, categories } = req.body;

//     // Validate required fields
//     if (!title || !details || !rating || !price ) {
//       return res
//         .status(400)
//         .json({ message: "All fields are required (title, details, rating, price, image)" });
//     }

//     // ✅ Create new product instance
//     const newProduct = new Product({
//       title,
//       details,
//       image: `/uploads/images/${req.file.filename}`,
//       price: parseFloat(price),
//       categories: categories
//         ? categories.split(",").map((cat) => cat.trim()) // handle comma-separated list
//         : [], // default empty array
//       rating: {
//         rate: parseFloat(rating),
//         count: 1, // default to 1 for first rating input
//       },
//     });

//     // ✅ Save product to MongoDB
//     await newProduct.save();

//     // Send response with all data
//     res.status(200).json({
//       message: "✅ Product uploaded and saved successfully!",
//       product: newProduct,
//     });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });


router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    // Check if image exists
    if (!req.file) return res.status(400).json({ message: "No image uploaded" });

    // Extract fields from form
    const { title, details, rating, price, categories } = req.body;
const categoryArray = Array.isArray(categories)
  ? categories
  : categories.split(",").map((cat) => cat.trim());




    // Validate required fields
    if (!title || !details || !rating || !price) {
      return res
        .status(400)
        .json({ message: "All fields are required (title, details, rating, price, image)" });
    }

    // ✅ Create new product instance
    const newProduct = new Product({
      title,
      details,
      image: `/uploads/images/${req.file.filename}`,
      price: parseFloat(price),
      rating: {
        rate: parseFloat(rating),
        count: 1, // default to 1 for first rating input
      },
categories: categoryArray, // ✅ not category

    });

    // ✅ Save product to MongoDB
    await newProduct.save();

    // Send response with all data
    res.status(200).json({
      message: "✅ Product uploaded and saved successfully!",
      product: newProduct,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Get Single Product Details (for React frontend)
router.get("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // ✅ Convert relative image path into full URL
    const updatedProduct = {
      ...product._doc,
      image: product.image
        ? `${req.protocol}://${req.get("host")}${product.image}` // ✅ Add slash
        : null,
    };

    res.status(200).json(updatedProduct);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



// GET Edit Product Page
router.get("/edit/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).send("Product not found");
    res.render("editProduct", { product });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// POST Edit Product
router.post("/edit/:id", upload.single("image"), async (req, res) => {
  try {
    const { title, details, price, rating } = req.body;

    const updateData = {
      title,
      details,
      price: parseFloat(price),
      "rating.rate": parseFloat(rating),
    };

    if (req.file) {
      updateData.image = `/uploads/images/${req.file.filename}`;
    }

    await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });

    res.redirect(`/products/${req.params.id}`); // Redirect to product details
  } catch (err) {
    res.status(500).send(err.message);
  }
});


// 🗑️ DELETE PRODUCT
router.post("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Product.findByIdAndDelete(id);
    console.log(`✅ Product with ID ${id} deleted successfully`);
    res.redirect("/products"); // redirect back to product list
  } catch (error) {
    console.error("❌ Error deleting product:", error);
    res.status(500).send("Failed to delete product");
  }
});



export default router;
