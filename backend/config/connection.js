
const mysql = require("mysql2");

const connection =  mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    database: "shop",
    multipleStatements: true,
    waitForConnections: true,
    connectionLimit: 100,
});

module.exports= connection;