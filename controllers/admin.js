const Product = require("../models/product");
const { validationResult } = require("express-validator");
const deleteFile = require("../utils/deleteFile");
const absolutePath = require("../utils/path");
const path = require("path");

// GET ADMIN PRODUCTS

exports.getAdminProducts = async (req, res) => {
  const { _id } = req.user;
  try {
    const adminProducts = await Product.find({ userId: _id });
    res.render("admin/products", {
      pageTitle: "Admin Products",
      path: "admin/admin-products",
      products: adminProducts,
      error: req.flash("err")[0],
    });
  } catch (err) {
    console.log(err);
  }
};

// ADD PRODUCTS

exports.getAddProducts = (req, res) => {
  res.render("admin/addEdit-product", {
    path: "admin/add-products",
    pageTitle: "Add Products",
    editing: false,
    error: "",
    previousName: "",
    previousImgURL: "",
    previousPrice: "",
    errorCause: [],
  });
};

exports.postProducts = async (req, res) => {
  const { name, price } = req.body;
  const errors = validationResult(req).array();
  const image = req.file;
  if (!image) {
    res.status(422).render("admin/addEdit-product", {
      path: "admin/add-products",
      pageTitle: "Add products",
      editing: false,
      error: "No image was provided",
      previousName: name,
      previousPrice: price,
      errorCause: [],
    });
  } else {
    if (errors.length) {
      const errorCause = errors.map((err) => err.path);
      res.status(422).render("admin/addEdit-product", {
        path: "admin/add-products",
        pageTitle: "Add Products",
        editing: false,
        error: errors[0].msg,
        previousName: name,
        previousPrice: price,
        errorCause: errorCause,
      });
    } else {
      const imagePath = "/" + image.path;
      try {
        const newProduct = new Product({
          name,
          price,
          image: imagePath,
          userId: req.user._id,
        });
        await newProduct.save();
        res.redirect("/admin/admin-products");
      } catch (err) {
        res.redirect("/500");
      }
    }
  }
};

// EDIT PRODUCTS

exports.postEditProduct = async (req, res, next) => {
  const isEditing = req.query.editing === "true" ? true : false;
  const _id = req.params._id;
  const currentUser = req.user;
  try {
    const productToEdit = await Product.findById(_id);
    const isAuthor = currentUser._id.equals(productToEdit.userId)
      ? true
      : false;
    if (!isAuthor) {
      req.flash("err", "Only the user who created the product can edit it");
      res.redirect("/admin/admin-products");
    } else {
      res.render("admin/addEdit-product", {
        path: "admin/edit-products",
        pageTitle: "Edit Products",
        product: productToEdit,
        editing: isEditing,
        error: req.flash("err")[0],
        previousImgURL: "",
        previousName: "",
        previousPrice: "",
        errorCause: [],
      });
    }
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    next(error);
  }
};

exports.postEdit = async (req, res) => {
  const _id = req.params._id;
  const { name, price } = req.body;
  const image = req.file;
  const productToEdit = await Product.findById(_id);
  const errors = validationResult(req).array();
  if (errors.length) {
    const errorCause = errors.map((err) => err.path);
    res.status(422).render("admin/addEdit-product", {
      path: "admin/edit-products",
      pageTitle: "Edit Products",
      editing: true,
      error: errors[0].msg,
      previousName: name,
      previousPrice: price,
      errorCause: errorCause,
      product: productToEdit,
    });
  } else {
    productToEdit.name = name;
    productToEdit.price = price;
    if (image) {
      const filePath = path.join(absolutePath, productToEdit.image);
      deleteFile(filePath);
      productToEdit.image = "/" + image.path;
    }
    await productToEdit.save();
    res.redirect("/admin/admin-products");
  }
};

// DELETE PRODUCTS

exports.deleteProduct = async (req, res) => {
  const _id = req.params.productId;
  const currentUser = req.user;
  const productToDelete = await Product.findById(_id);
  const isAuthor = currentUser._id.equals(productToDelete.userId)
    ? true
    : false;
  if (!isAuthor) {
    req.flash("err", "Only the user who created the product can delete it");
    res.status(500).json({ message: "Deleting product failed !" });
  } else {
    const filePath = path.join(absolutePath, productToDelete.image);
    deleteFile(filePath);
    await Product.findByIdAndRemove(_id);
    await req.user.deleteCartProduct(_id);
    res.status(200).json({ message: "Deleting product suceeded !" });
  }
};