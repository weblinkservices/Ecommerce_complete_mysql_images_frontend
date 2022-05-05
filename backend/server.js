const app = require('./app');
const connectDatabase = require('./config/database')
const connection = require('./config/connection');
const cloudinary = require('cloudinary');

const dotenv = require('dotenv');



//Handle Uncaught exception
process.on('uncaughtException', err=>{
    console.log(`ERROR: ${err.message}`);
    console.log(`ERROR: ${err.stack}`);
    console.log('Shutting down due to uncaught exception');
    process.exit(1)
})
//console.log(a);

//Setting up config file
dotenv.config({path:'backend/config/config.env'}) 
if(process.env.NODE_ENV !== 'PRODUCTION') require('dotenv').config({path:'backend/config/config.env'}) 

//Connecting to database
// connectDatabase();
connection.connect((error) => {
    if (error) throw error;
    if (!error) {
        console.log("Database is connected successfully...!");
    } else {
        console.log("Database connection failed :", error.message);
    }
})



const server = app.listen(process.env.PORT, ()=>{
    console.log(`Server started on PORT: ${process.env.PORT} in ${process.env.NODE_ENV} mode.`);
})

//Handle Unhandled Promise rejection
process.on('unhandledRejection', err=>{
    console.log(`ERROR: ${err.stack}`);
    console.log('Shutting down th server due to Unhandled Promise rejection');
    server.close(()=>{
        process.exit(1)
    })
});