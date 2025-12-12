import express from "express";
import multer from "multer";
import path from "path";
import Product from "../models/productModel.js"; // ✅ Import Product model
import User from "../models/usermodel.js";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from '../cloudinaryConfig.js';
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { protect } from "../middleware/authMiddleware.js";



const router = express.Router();

// ✅ Set storage destination and filename (Cloudinary)
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "uploads/images", // folder name in Cloudinary
    format: async (req, file) => {
      const ext = path.extname(file.originalname).substring(1);
      return ext || "jpg"; // default to jpg
    },
    public_id: (req, file) => Date.now() + "-" + path.parse(file.originalname).name,
  },
});

// ✅ File filter — only allow images
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const mimeType = allowedTypes.test(file.mimetype);
  const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimeType && extName) {
    return cb(null, true);
  }
  cb(new Error("Only image files are allowed (jpeg, jpg, png, webp, gif)!"));
};

// ✅ Multer upload middleware
const upload = multer({ storage, fileFilter: imageFilter });

// Get signup Form
router.get("/signup", async (req, res) => {
res.render("signup");
})


// POST /api/signup
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create new user
    const user = await User.create({ name, email, password });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});



// LOGIN ROUTE
router.get("/login", async (req, res) => {
res.render("login", { message: "" });
})



// LOGIN ROUTE
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ Check empty fields
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 2️⃣ Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User does not exist" });
    }

    // 3️⃣ Validate password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect password" });
    }

    // 4️⃣ Generate JWT Token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // ✅ Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: false, // true if using HTTPS
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    // Redirect to home page (Upload)
    return res.render("login", {
      message: "Login successful! Redirecting...",
      email: "",
      success: true, // flag for success
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error. Try again." });
  }
});

router.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});



// ✅ Render Upload Page
router.get("/", protect, (req, res) => {
  res.render("Upload");
});

router.get("/products", protect, async (req, res) => {
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




router.get("/api/products", async (req, res) => {
  try {
    // Fetch all products directly from MongoDB
    const products = await Product.find();

    res.status(200).json({
      message: "🛒 All uploaded products",
      count: products.length,
      products, // Send exactly what’s stored, including full Cloudinary URLs
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.post("/upload", upload.single("image"),protect, async (req, res) => {
  try {
    // ✅ Check if image exists
    if (!req.file) return res.status(400).json({ message: "No image uploaded" });

    // ✅ Extract fields from form
    const { title, details, rating, price, categories } = req.body;
    const categoryArray = Array.isArray(categories)
      ? categories
      : categories.split(",").map((cat) => cat.trim());

    // ✅ Validate required fields
    if (!title || !details || !rating || !price) {
      return res.status(400).json({
        message: "All fields are required (title, details, rating, price, image)",
      });
    }

    // ✅ Create new product instance (Cloudinary version)
    const newProduct = new Product({
      title,
      details,
      // ✅ Cloudinary automatically returns a secure URL in req.file.path
      image: req.file.path, // updated line
      price: parseFloat(price),
      rating: {
        rate: parseFloat(rating),
        count: 1, // default to 1 for first rating input
      },
      categories: categoryArray,
    });

    // ✅ Save product to MongoDB
    await newProduct.save();

    // ✅ Send response with saved product
    res.status(200).json({
      message: "✅ Product uploaded and saved successfully to Cloudinary!",
      product: newProduct,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: err.message });
  }
});
router.get("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // ✅ Fetch image directly from MongoDB (Cloudinary URL)
    const updatedProduct = {
      ...product._doc,
      image: product.image ? product.image : null,
    };

    res.status(200).json(updatedProduct);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



router.get("/products/:id", protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // ✅ Use the Cloudinary URL directly from MongoDB
    const updatedProduct = {
      ...product._doc,
      image: product.image ? product.image : null,
    };

    // res.status(200).json(updatedProduct);
    res.render("productDetails", { product: updatedProduct });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



// GET Edit Product Page
router.get("/edit/:id",protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).send("Product not found");
    res.render("editProduct", { product });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// POST Edit Product
router.post("/edit/:id", upload.single("image"),protect, async (req, res) => {
  try {
    const { title, details, price, rating } = req.body;

    const updateData = {
      title,
      details,
      price: parseFloat(price),
      "rating.rate": parseFloat(rating),
    };

    // ✅ Use Cloudinary URL instead of local uploads path
    if (req.file && req.file.path) {
      updateData.image = req.file.path; // Cloudinary automatically provides the full https URL
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
