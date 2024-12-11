const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true },
    password: { type: String, required: true },
    referralCode: { type: String },
    verificationCode: { type: String },
    isVerified: { type: Boolean, default: false },
    pin: { type: String }, // Will be set later
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
