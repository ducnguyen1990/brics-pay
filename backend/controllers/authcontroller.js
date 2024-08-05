const bcrypt = require("bcrypt");
const DiamSdk = require("diamante-sdk-js");
const prisma = require("../libs/prisma");
const jwt = require("jsonwebtoken");

require("dotenv").config();
const JWT_SECRET = process.env.JWT_SECRET;

async function signup(req, res) {
  const { email, country, password } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  if (!country) {
    return res.status(400).json({ error: "Country is required" });
  }
  if (!password) {
    return res.status(400).json({ error: "Password is required" });
  }

  try {
    const existinguser = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (existinguser) {
      return res.status(409).json({ error: "Email already exist" });
    }
    const hashedpass = await bcrypt.hash(password, 10);
    const pair = DiamSdk.Keypair.random();

    const response = await fetch(
      `https://friendbot.diamcircle.io?addr=${encodeURIComponent(
        pair.publicKey(),
      )}`,
    );
    const responseJSON = await response.json();
    console.log("Success You have new account\n", responseJSON);
    const newuser = await prisma.user.create({
      data: {
        email,
        password: hashedpass,
        public: pair.publicKey(),
        secret: pair.secret(),
      },
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        email: newuser.email,
      },
    });
  } catch (err) {
    console.error("Error registering user : ", err);
    res.status(500).json({ error: "Failed to register user" });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email | !password) {
      return res
        .status(404)
        .json({ error: "Email and password are required " });
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    const ismatch = await bcrypt.compare(password, user.password);
    if (!ismatch) {
      return res.status(401).json({ error: "Invalid login credentials" });
    }

    const token = jwt.sign({ userId: user.email }, JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(200).json({ message: "Login successful", token });
  } catch (err) {
    console.error("User login error : ", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = { signup, login };
