const crypto = require('crypto')


exports.getResetPasswordToken = () =>{
    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash and set to resetPasswordToken
    const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set token expire time
    const resetPasswordExpire = Date.now() + 30 * 60 * 1000
    
    return {resetToken,resetPasswordToken,resetPasswordExpire}

}

