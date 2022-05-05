const Order = require('../models/order');
const Product = require('../models/product');

const util = require('util');
const connection = require('../config/connection');
const ErrorHandler = require('../utils/errorHandler');
const catchAsyncErrors = require('../middlewares/catchAsyncErrors');

// Create a new order   =>  /api/v1/order/new
exports.newOrder = catchAsyncErrors(async (req, res, next) => {
    const {
        itemsPrice,
        taxPrice,
        shippingPrice,
        totalPrice,
        product_id,
        name,
        sale_price,
        path,
        quantity,
        address,
        city,
        phoneNo,
        postalCode,
        country,
        paymentStatus
    } = req.body;

    const paidAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const delivered_date = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const user_id = req.user.id;


    let order;
    const sql = `insert into orders(id, user_id, order_date, delivered_date, orderStatus, paidAt, paymentStatus,
     shippingPrice, taxPrice, totalPrice, quantity, itemsPrice, product_id, name, sale_price, path, address, city,
    country, phoneNo, postalCode ) values(NULL, ${user_id}, NULL, '${delivered_date}', 'Processing', '${paidAt}', 
    '${paymentStatus}', ${shippingPrice}, ${taxPrice}, ${totalPrice}, ${quantity}, ${itemsPrice}, ${product_id},
     '${name}', ${sale_price}, 
    '${path}', '${address}','${city}', '${country}', '${phoneNo}', ${postalCode} );`;

    const query = util.promisify(connection.query).bind(connection);
    let result = async function () {
        try {
            const rows = await query(sql);
            order = rows;

        } catch (err) {
            console.log(err.message);
            return next(new ErrorHandler(err.message));
        } finally {
            return order;
        }
    }
    result()
        .then(value => {
            res.status(200).json({
                success: true,
                order
            })
        }).catch(error => {
            console.log("New order is not created :-", error.message)
        });
})


// Get single order   =>   /api/v1/order/:id
exports.getSingleOrder = catchAsyncErrors(async (req, res, next) => {
    let order;
    const sql = `select * from orders where id=${req.params.id};`;

    const query = util.promisify(connection.query).bind(connection);
    let result = async function () {
        try {
            const rows = await query(sql);
            if (!rows.length) {
                return next(new ErrorHandler('No Order found with this ID', 404))
            }
            order = rows[0];

        } catch (err) {
            console.log(err.message);
            return next(new ErrorHandler('No Order found with this ID', 404))
        } finally {
            return order;
        }
    }
    result()
        .then(value => {
            res.status(200).json({
                success: true,
                order
            })
        }).catch(error => {
            console.log("No Order found with this ID:-", error.message)
        });
})

// Get logged in user orders   =>   /api/v1/orders/me
exports.myOrders = catchAsyncErrors(async (req, res, next) => {
    let orders;
    const sql = `select * from orders where user_id=${req.user.id};`;

    const query = util.promisify(connection.query).bind(connection);
    let result = async function () {
        try {
            const rows = await query(sql);
            if (!rows.length) {
                return next(new ErrorHandler('No Order found with this ID', 404))
            }
            orders = rows;

        } catch (err) {
            console.log(err.message);
            return next(new ErrorHandler('No Order found with this ID', 404))
        } finally {
            return orders;
        }
    }
    result()
        .then(value => {
            res.status(200).json({
                success: true,
                orders
            })
        }).catch(error => {
            console.log("No Order found with this ID:-", error.message)
        });
})


// Get all orders - ADMIN  =>   /api/v1/admin/orders/
exports.allOrders = catchAsyncErrors(async (req, res, next) => {
    let totalAmount = 0;
    let orders;
    const sql = `select * from orders;`;

    const query = util.promisify(connection.query).bind(connection);
    let result = async function () {
        try {
            const rows = await query(sql);
            if (!rows.length) {
                return next(new ErrorHandler('No Order found with this ID', 404))
            }
            orders = rows;

            orders.forEach(order => {
                totalAmount += parseInt(order.totalPrice)
            })
        } catch (err) {
            console.log(err.message);
            return next(new ErrorHandler('No Order found with this ID', 404))
        } finally {
            return orders, totalAmount;
        }
    }
    result()
        .then(value => {
            res.status(200).json({
                success: true,
                totalAmount,
                orders
            })
        }).catch(error => {
            console.log("No Order found with this ID:-", error.message)
        });
})

// Update / Process order - ADMIN  =>   /api/v1/admin/order/:id
exports.updateOrder = catchAsyncErrors(async (req, res, next) => {
    const sql1 = `select * from orders where id=${req.params.id}`;
    const sql = `update orders set orderStatus='${req.body.status}', delivered_date=NOW() where id=${req.params.id}
    and orderStatus !='Delivered';`;
    const query = util.promisify(connection.query).bind(connection);
    let result = async function () {
        try {
            const rows = await query(sql);
            const rows1 = await query(sql1);
            let quantity = rows1[0].quantity;
            let product_id = rows1[0].product_id;
            if (!rows.affectedRows) {
                res.status(404).send({ status: 1, message: "You have already delivered this order" });
            } else {
                const sql3 = `update products set stock=(stock-${quantity}) where id=${product_id};`;
                const rows3 = await query(sql3);
                if (!rows3.affectedRows) {
                    return next(new ErrorHandler('Product stock quantity is not updated'))
                }
            }
        } catch (err) {
            console.log(err.message);
            res.status(404).send({ status: 1, message: "No Order found with this ID" });
        }
    }
    result()
        .then(value => {
            res.status(200).json({
                success: true,
            })
        }).catch(error => {
            console.log("No Order found with this ID:-", error.message)
        });
})

// Delete order   =>   /api/v1/admin/order/:id
exports.deleteOrder = catchAsyncErrors(async (req, res, next) => {
    const sql = `delete from orders where id=${req.params.id};`;
    const sql1 = "ALTER TABLE orders AUTO_INCREMENT=1;";
    const query = util.promisify(connection.query).bind(connection);
    let result = async function () {
        try {
            const rows = await query(sql);
            const rows1 = await query(sql1);
            if (!rows.affectedRows) {
                res.status(404).send({ status: 1, message: "No Order found with this ID" });
            }
        } catch (err) {
            console.log(err.message);
            res.status(404).send({ status: 1, message: "No Order found with this ID" });
        }
    }
    result()
        .then(value => {
            res.status(200).json({
                success: true
            })
        }).catch(error => {
            console.log("Order is not deleted :-", error.message)
        });
})