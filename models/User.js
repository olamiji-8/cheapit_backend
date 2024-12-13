const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true },
    password: { type: String, required: true },
    referralCode: { type: String },
    verificationCode: { type: String },
    otpExpiresAt: { type: Date }, // Expiry time for OTP
    isVerified: { type: Boolean, default: false },
    pin: { type: String }, // Hashed PIN
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
