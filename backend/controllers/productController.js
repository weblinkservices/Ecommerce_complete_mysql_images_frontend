const util = require("util");
const connection = require("../config/connection");
const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const APIFeatures = require("../utils/apiFeatures");
const fs = require("fs");

//Create new product  => /api/v1/admin/product/new
exports.newProduct = catchAsyncErrors(async (req, res, next) => {
  // console.log("req.file", req.files);
  // console.log("req.file images", req.body.images);
  // const data =  fs.readFileSync( req.files[0].path, {encoding:'base64', flag:'r'} );
  // console.log(data);

  let product;
  let product_id;
  let productImages;
  req.body.user = req.user.id;
  // req.body.images = "imagesLinks";

  const name = req.body.name.replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/`/g, "\\`");
  const description = req.body.description.replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/`/g, "\\`");
  const seller = req.body.seller.replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/`/g, "\\`");

  const sql = `insert into products(id,name,original_price,discount,sale_price,description,ratings,category,
    seller,stock,numOfReviews,date) values(NULL, '${name}',${req.body.original_price},${req.body.discount},
    ${req.body.sale_price},'${description}', NULL,'${req.body.category}', '${seller}', 
    ${req.body.stock}, NULL,NULL);`;

  const query = util.promisify(connection.query).bind(connection);
  let result = async function () {
    try {
      const rows = await query(sql);
      product = rows;
      product_id = rows.insertId;
      // console.log("Product ID : " + rows.insertId, ": ", "Number of records inserted: " + rows.affectedRows+
      // "req.files :- ", req.files);

      // console.dir(req.headers['content-type']);
      if (req.files) {
        Object.values(req.files).map(async (file) => {
          // console.log("File name : " + file.filename + " ===" + "path : " + file.path);
          const filePath = file.path.replace(/\\/g, "\\\\");
          const sql1 = `insert into images(id, product_id, imageName, path, category) values(NULL, ${product_id},'${file.filename}',
          '${filePath}', '${req.body.category}');`;
          const rows1 = await query(sql1);
          productImages = rows1;
        })
      }

    } catch (err) {
      console.log(err.message);
      return next(new ErrorHandler(err.message));
    } finally {
      return [product, product_id, productImages];
    }
  };
  result()
    .then((value) => {
      res.status(200).json({
        success: true,
        product,
        productImages,
      });
    })
    .catch((error) => {
      console.log("Product is not created :-", error.message);
    });
});

//Get all products => /api/v1/products?keyword=apple
exports.getProducts = catchAsyncErrors(async (req, res, next) => {
  const resPerPage = 8;
  let productsCount;
  let products;
  let productImages = [];
  let filteredProductsCount;
  var imagesData = [];

  const query = util.promisify(connection.query).bind(connection);
  let result = async function () {
    try {
      const find = req.query.keyword || "";
      const category = req.query.category;
      const queryStr = req.query.page;
      const price = req.query.price;
      const currentPage = Number(queryStr) || 1;
      const skip = resPerPage * (currentPage - 1);

      var sql = `SELECT * FROM products WHERE name LIKE '%${find}%'
      or description Like '%${find}%' limit ${resPerPage} offset ${skip};`;
      var rows = await query(sql);

      var sql2 = `SELECT * FROM products`;
      var rows2 = await query(sql2);

      if (typeof req.query !== "undefined") {
        if (typeof queryStr !== "undefined") {
          var sql = `select * from products limit ${resPerPage} offset ${skip};`;
          var rows = await query(sql);
        }
        const queryCopy = { ...req.query };
        const removeFields = ["keyword", "limit", "page"];
        removeFields.forEach((el) => delete queryCopy[el]);

        if (typeof category !== "undefined") {
          var sql = `select * from products where category="${queryCopy.category}" 
        limit ${resPerPage} offset ${skip};`;
          var rows = await query(sql);
        }
        if (typeof price !== "undefined") {
          var sql = `select * from products where sale_price BETWEEN ${queryCopy.price.gte} AND ${queryCopy.price.lte}`;
          var rows = await query(sql);
        }
        if (typeof queryCopy.rating !== "undefined") {
          var sql = `select * from products where ratings >=${queryCopy.rating};`;
          var rows = await query(sql);
        }
      }

      var sql2 = `select * from images;`;
      var rows2 = await query(sql2);
      productImages = rows2;
      // console.log(productImages);

      productImages.map((path) => {
        // imagesData.push(fs.readFileSync(path.path));

        // imagesData.push({
        //   id: path.id,
        //   product_id: path.product_id,
        //   imageName: path.imageName,
        //   path: path.path,
        //   content: fs.readFileSync(path.path),
        // });
      });

      // console.log(imagesData);

      productsCount = rows2.length;
      products = rows;
      filteredProductsCount = products.length;
    } catch (err) {
      console.log(err);
      return next(new ErrorHandler(err.message, 404));
    } finally {
      return [products, productsCount, filteredProductsCount, productImages];
    }
  };
  result()
    .then(
      (value = async () => {
        res.status(200).json({
          success: true,
          count: products.length,
          productsCount,
          resPerPage,
          filteredProductsCount,
          products,
          productImages,
          imagesData,
        });
      })
    )
    .catch((error) => {
      console.log("All products are not showing :-", error.message);
    });
});

//Get all products (Admin) => /api/v1/admin/products
exports.getAdminProducts = catchAsyncErrors(async (req, res, next) => {
  // const products = await Product.find();
  let products;
  let productImages;
  const query = util.promisify(connection.query).bind(connection);
  let result = async function () {
    try {
      const rows = await query("SELECT * FROM products");
      productsCount = rows.length;
      products = rows;
      var sql1 = `select * from images`;
      var rows1 = await query(sql1);
      productImages = rows1;
    } catch (err) {
      console.log(err);
      return next(new ErrorHandler(err.message, 404));
    } finally {
      return products;
    }
  };
  result()
    .then((value) => {
      res.status(200).json({
        success: true,
        products,
        productImages,
      });
    })
    .catch((error) => {
      console.log("All admin products are not showing :-", error.message);
    });
});

//Get single product details => /api/v1/product/:id
exports.getSingleProduct = catchAsyncErrors(async (req, res, next) => {
  let product;
  let productImages;
  let RelatedProductImages;
  const query = util.promisify(connection.query).bind(connection);
  let result = async function () {
    try {
      const rows = await query(
        `select * from products where id=${req.params.id}`
      );
      product = rows[0];
      var sql1 = `select * from images where product_id=${req.params.id};`;
      var rows1 = await query(sql1);
      productImages = rows1;

      //get RelatedProductImages
      var sql2 = `select * from images where category='${product.category}';`;
      var rows2 = await query(sql2);
      RelatedProductImages = rows2;
      if (!rows.length) {
        return next(new ErrorHandler("Product not found", 404));
      }
    } catch (err) {
      console.log(err);
      return next(new ErrorHandler(err.message, 404));
    } finally {
      return product;
    }
  };
  result()
    .then((value) => {
      res.status(200).json({
        success: true,
        product,
        productImages,
        RelatedProductImages
      });
    })
    .catch((error) => {
      console.log("Product not found by id :-", error.message);
    });
});

// Update Product   =>   /api/v1/admin/product/:id
exports.updateProduct = catchAsyncErrors(async (req, res, next) => {
  let product;
  //replace ',",` by \' 
  req.body.name = req.body.name.replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/`/g, "\\`");
  req.body.description = req.body.description.replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/`/g, "\\`");
  req.body.seller = req.body.seller.replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/`/g, "\\`");

  const sql = `update products set ?  where id =${req.params.id}`;
  // console.log("[req.body]",[req.body]);

  const query = util.promisify(connection.query).bind(connection);
  let result = async function () {
    try {
      const rows = await query(sql, [req.body]);
      product = rows;

      const deleteImages = `select path,id from images where product_id=${req.params.id};`;
      const row1 = await query(deleteImages);
      // console.log("row1", row1);
      row1.map((path) => {
        try {
          fs.unlinkSync(path.path);
        } catch (err) {
          console.error(err);
        }
      });

      var filePath = [];
      var imageName = [];
      var imagesLinks = {
        productImage: Object.values(req.files).map((file) => {
          filePath.push(file.path.replace(/\\/g, "\\\\"));
          imageName.push(file.filename);
        }),
      };

      if (filePath.length === imageName.length) {
        for (let i = 0; i < imageName.length; i++) {
          const sql12 = `update images set imageName='${imageName[i]}', path='${filePath[i]}' 
          where product_id=${req.params.id} and id=${row1[i].id};`;
          const rows1 = await query(sql12);
          productImages = rows1;
        }
      }
      if (!rows.affectedRows) {
        return next(new ErrorHandler("Product is not updated", 404));
      }
    } catch (err) {
      console.log(err);
      return next(new ErrorHandler(err.message, 404));
    }
  };
  result()
    .then((value) => {
      res.status(200).json({
        success: true
      });
    })
    .catch((error) => {
      console.log("The product is not updated", error.message);
    });
});

//Delete product  => /api/v1/admin/product/:id
exports.deleteProduct = catchAsyncErrors(async (req, res, next) => {
  const sql2 = `select imageName from images where product_id=${req.params.id}`;
  const sql = `delete from products where id=${req.params.id};
  delete from images where product_id=${req.params.id};
  ALTER TABLE products AUTO_INCREMENT=1;
  ALTER TABLE images AUTO_INCREMENT=1;`;
  const query = util.promisify(connection.query).bind(connection);
  let result = async function () {
    try {
      const rows1 = await query(sql2);
      rows1.map((imageName) => {
        try {
          fs.unlinkSync("backend/uploads/product/" + imageName.imageName);
        } catch (err) {
          console.error(err);
        }
      });
      const rows = await query(sql);
      if (rows.affectedRows === 0) {
        return next(new ErrorHandler("Product not found", 404));
      }
    } catch (err) {
      console.log(err);
      return next(new ErrorHandler(err.message, 404));
    }
  };
  result()
    .then((value) => {
      res.status(200).json({
        success: true,
        message: "Product is deleted",
      });
    })
    .catch((error) => {
      console.log("Product is not deleted :-", error.message);
    });
});

// Create new review   =>   /api/v1/review
exports.createProductReview = catchAsyncErrors(async (req, res, next) => {
  const { rating, comment, productId } = req.body;
  var update, insert;

  const review = {
    user: req.user.id,
    product_id: productId,
    name: req.user.name,
    rating: Number(rating),
    comment,
  };

  const salid = `select id from review where user_id='${review.user}' and product_id=${review.product_id};`;
  const query = util.promisify(connection.query).bind(connection);
  //No of review in products
  //ratings values of products
  const sql3 = `update products set ratings=(select avg(rating) from review where product_id=${review.product_id}), 
  numOfReviews=(SELECT COUNT(product_id) FROM review) where id =${review.product_id};`;
  let result = async function () {
    try {
      const rows = await query(salid);
      //check new user or not
      if (rows.length === 0) {
        const sql = `insert into review(id, user_id, product_id, name, rating, comments)
        values(NULL, '${review.user}', '${review.product_id}', '${review.name}', ${review.rating}, '${review.comment}');`;
        const rows2 = await query(sql);
      } else {
        const sql = `update review set  user_id ='${review.user}', product_id= ${review.product_id}, name='${review.name}',
        rating=${review.rating}, comments='${review.comment}' where id =${rows[0].id} `;
        const rows2 = await query(sql);
      }

    } catch (err) {
      console.log(err);
      return next(new ErrorHandler(err.message, 404));
    }
  };
  let result2 = async function () {
    result();
    try {
      const rows1 = await query(sql3);
    } catch (err) {
      console.log(err);
      return next(new ErrorHandler(err.message, 404));
    }
  };
  result2()
    .then((value) => {
      res.status(200).json({
        success: true,
      });
    })
    .catch((error) => {
      console.log("Review is not created :-", error.message);
    });
});

//Get Product Review   => /api/v1/reviews
exports.getProductReviews = catchAsyncErrors(async (req, res, next) => {
  let review;
  const query = util.promisify(connection.query).bind(connection);
  let result = async function () {
    try {
      const rows = await query(`select * from review where product_id=${req.query.id}`);
      review = rows;
      if (!rows.length) {
        return next(new ErrorHandler("Review not found", 404));
      }
    } catch (err) {
      console.log(err);
      return next(new ErrorHandler(err.message, 404));
    } finally {
      return review;
    }
  };
  result()
    .then((value) => {
      res.status(200).json({
        success: true,
        reviews: review,
      });
    })
    .catch((error) => {
      console.log("Review not found by id :-", error.message);
    });
});

// Delete Product Review   =>   /api/v1/reviews
exports.deleteReview = catchAsyncErrors(async (req, res, next) => {
  const sql = `delete from review where id=${req.query.id};`;
  const sql2 = `update products set ratings=(select avg(rating) from review where product_id=(select product_id from review where id=${req.query.id})), 
  numOfReviews=(SELECT (COUNT(product_id)-1) FROM review) where id =(select product_id from review where id=${req.query.id});`;
  const sql1 = ` ALTER TABLE review AUTO_INCREMENT=1;`;
  const query = util.promisify(connection.query).bind(connection);

  let result = async function () {
    try {
      result2();
      const rows = await query(sql);
      const rows2 = await query(sql1);
    } catch (err) {
      console.log(err);
      return next(new ErrorHandler(err.message, 404));
    }
  };
  let result2 = async function () {
    try {
      const rows1 = await query(sql2);
    } catch (err) {
      console.log(err);
      return next(new ErrorHandler(err.message, 404));
    }
  };
  result()
    .then((value) => {
      res.status(200).json({
        success: true,
      });
    })
    .catch((error) => {
      console.log("Review is not created :-", error.message);
    });
});
