const jwt = require('jsonwebtoken')
exports.getJWTToken=(userID)=>{
  return jwt.sign({ id: userID }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_TIME
});

}  