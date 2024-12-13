const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const User = require("../models/User");

const router = express.Router();

// Register User
router.post("/register", async (req, res) => {
    const { fullName, email, phoneNumber, password, referralCode } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationCode = crypto.randomInt(100000, 999999).toString(); 
        const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

        // Hash the verification code before storing it
        const hashedVerificationCode = crypto.createHash('sha256').update(verificationCode).digest('hex');
        
        const newUser = new User({
            fullName,
            email,
            phoneNumber,
            password: hashedPassword,
            referralCode,
            verificationCode: hashedVerificationCode,
            otpExpiresAt,
        });        

        await newUser.save();

        // Send email with verification code
        const transporter = nodemailer.createTransport({
            service: "Gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Verify Your Account",
            text: `Your verification code is ${verificationCode}`,
        });

        res.status(201).json({ message: "User registered. Check email for verification code." });
    } catch (error) {
        res.status(500).json({ error: "Failed to register user." });
    }
});

// Verify Email
router.post("/verify", async (req, res) => {
    const { email, verificationCode } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        // Hash the entered verification code and compare with stored hash
        const hashedInputCode = crypto.createHash('sha256').update(verificationCode).digest('hex');
        
        if (user.verificationCode !== hashedInputCode) {
            return res.status(400).json({ error: "Invalid verification code." });
        }

        if (user.otpExpiresAt && user.otpExpiresAt < Date.now()) {
            return res.status(400).json({ error: "Verification code has expired." });
        }

        user.isVerified = true;
        user.verificationCode = null; // Clear the code
        user.otpExpiresAt = null; // Clear the expiry time
        await user.save();

        res.status(200).json({ message: "Email verified. Proceed to create a PIN." });
    } catch (error) {
        res.status(500).json({ error: "Verification failed." });
    }
});


// Resend Code
router.post("/resend-code", async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        const newCode = crypto.randomInt(100000, 999999).toString();
        
        // Hash the new verification code before saving
        const hashedNewCode = crypto.createHash('sha256').update(newCode).digest('hex');

        user.verificationCode = hashedNewCode;
        await user.save();

        const transporter = nodemailer.createTransport({
            service: "Gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "New Verification Code",
            text: `Your new verification code is ${newCode}`,
        });

        res.status(200).json({ message: "Verification code resent." });
    } catch (error) {
        res.status(500).json({ error: "Failed to resend code." });
    }
});


// Create PIN
router.post("/create-pin", async (req, res) => {
    const { email, pin } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user || !user.isVerified) {
            return res.status(400).json({ error: "User not verified or not found." });
        }

        // Hash the PIN before saving
        const hashedPin = await bcrypt.hash(pin, 10);

        user.pin = hashedPin;
        await user.save();

        res.status(200).json({ message: "PIN created successfully." });
    } catch (error) {
        res.status(500).json({ error: "Failed to create PIN." });
    }
});


module.exports = router;
