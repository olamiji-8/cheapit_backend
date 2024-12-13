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
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate OTP and its expiration time
        const verificationCode = crypto.randomInt(100000, 999999).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

        // Hash the verification code before storing it
        const hashedVerificationCode = crypto.createHash('sha256').update(verificationCode).digest('hex');

        // Create the new user object
        const newUser = new User({
            fullName,
            email,
            phoneNumber,
            password: hashedPassword,
            referralCode,
            verificationCode: hashedVerificationCode,
            otpExpiresAt,
        });

        // Save the user to the database
        await newUser.save();

        // Extract the first name from the full name for a personalized email
        const firstName = fullName.split(" ")[0];

        // Configure the email transporter
        const transporter = nodemailer.createTransport({
            service: "Gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // Send the email with the OTP
        await transporter.sendMail({
            from: `"Centry" <${process.env.EMAIL_USER}>`, // Use "Centry" as the sender name
            to: email,
            subject: "Verify Your Email",
            text: `
Hi ${firstName},

Welcome to Centry – your all-in-one solution: bill payments - airtime, data, and utility in one app.

To complete your signup, we just need to verify your email.

Here’s your OTP: ${verificationCode}

This code is valid for 10 minutes only. Enter this code in the app to confirm your email. If you didn’t sign up for Centry, please ignore this email.

Let’s get started on this exciting journey together!

Cheers,  
The Centry Team
            `,
            html: `
                <p>Hi <strong>${firstName}</strong>,</p>
                <p>Welcome to <strong>Centry</strong> – your all-in-one solution: bill payments - airtime, data, and utility in one app.</p>
                <p>To complete your signup, we just need to verify your email.</p>
                <p><strong>Here’s your OTP: ${verificationCode}</strong></p>
                <p>This code is valid for <strong>10 minutes only</strong>. Enter this code in the app to confirm your email. If you didn’t sign up for Centry, please ignore this email.</p>
                <p>Let’s get started on this exciting journey together!</p>
                <p>Cheers,</p>
                <p>The Centry Team</p>
            `,
        });

        // Respond with success message
        res.status(201).json({ message: "User registered. Check email for verification code." });
    } catch (error) {
        console.error(error);
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

        // Extract first name from full name for personalization
        const firstName = user.fullName.split(" ")[0];

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
            text: `Hi ${firstName},\n\nYour new verification code is ${newCode}.\n\nThank you for choosing us!`,
            html: `
                <p>Hi <strong>${firstName}</strong>,</p>
                <p>Your new verification code is <strong>${newCode}</strong>.</p>
                <p>Thank you for choosing us!</p>
            `,
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
