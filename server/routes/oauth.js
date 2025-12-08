const express = require("express");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const axios = require("axios");
const User = require("../models/User");
const { ApiError } = require("../middleware/errorHandler");
const { sanitizeUser } = require("../utils/helpers");
const { JWT_EXPIRES_IN } = require("../config/constants");

const router = express.Router();

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

// Generate unique username from email or name
const generateUsername = async (baseName) => {
  let username = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .substring(0, 20);
  
  let finalUsername = username;
  let counter = 1;
  
  while (await User.findOne({ username: finalUsername })) {
    finalUsername = `${username}${counter}`;
    counter++;
  }
  
  return finalUsername;
};

// @route   POST /api/oauth/google
// @desc    Google OAuth login/register
// @access  Public
router.post("/google", async (req, res, next) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      throw new ApiError(400, "Google credential is required");
    }

    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Check if user exists with this Google ID
    let user = await User.findOne({ googleId });

    if (!user) {
      // Check if user exists with this email
      user = await User.findOne({ email });

      if (user) {
        // Link Google account to existing user
        user.googleId = googleId;
        user.authProvider = user.authProvider === "local" ? "local" : "google";
        if (!user.avatar && picture) {
          user.avatar = picture;
        }
        await user.save();
      } else {
        // Create new user
        const username = await generateUsername(name || email.split("@")[0]);
        
        user = await User.create({
          username,
          email,
          name: name || username,
          avatar: picture || "",
          googleId,
          authProvider: "google",
        });
      }
    }

    // Check if account is active
    if (!user.isActive) {
      throw new ApiError(403, "Your account has been deactivated");
    }

    // Update last login
    await user.updateLastLogin();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: "Google login successful",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Google OAuth error:", error);
    if (error instanceof ApiError) {
      return next(error);
    }
    next(new ApiError(401, "Google authentication failed"));
  }
});

// @route   POST /api/oauth/github
// @desc    GitHub OAuth login/register  
// @access  Public
router.post("/github", async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      throw new ApiError(400, "GitHub authorization code is required");
    }

    // Exchange code for access token
    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    const { access_token, error } = tokenResponse.data;

    if (error || !access_token) {
      throw new ApiError(401, "Failed to get GitHub access token");
    }

    // Get user info from GitHub
    const userResponse = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const { id: githubId, login, name, avatar_url, email: githubEmail } = userResponse.data;

    // Get email if not public
    let email = githubEmail;
    if (!email) {
      const emailsResponse = await axios.get("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });
      const primaryEmail = emailsResponse.data.find((e) => e.primary);
      email = primaryEmail?.email;
    }

    if (!email) {
      throw new ApiError(400, "Unable to get email from GitHub. Please make sure your email is public or verified.");
    }

    // Check if user exists with this GitHub ID
    let user = await User.findOne({ githubId: githubId.toString() });

    if (!user) {
      // Check if user exists with this email
      user = await User.findOne({ email });

      if (user) {
        // Link GitHub account to existing user
        user.githubId = githubId.toString();
        user.authProvider = user.authProvider === "local" ? "local" : "github";
        if (!user.avatar && avatar_url) {
          user.avatar = avatar_url;
        }
        await user.save();
      } else {
        // Create new user
        const username = await generateUsername(login || name || email.split("@")[0]);
        
        user = await User.create({
          username,
          email,
          name: name || login || username,
          avatar: avatar_url || "",
          githubId: githubId.toString(),
          authProvider: "github",
        });
      }
    }

    // Check if account is active
    if (!user.isActive) {
      throw new ApiError(403, "Your account has been deactivated");
    }

    // Update last login
    await user.updateLastLogin();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: "GitHub login successful",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("GitHub OAuth error:", error);
    if (error instanceof ApiError) {
      return next(error);
    }
    next(new ApiError(401, "GitHub authentication failed"));
  }
});

// @route   GET /api/oauth/github/callback
// @desc    GitHub OAuth callback (redirects to frontend)
// @access  Public
router.get("/github/callback", (req, res) => {
  const { code, error } = req.query;
  
  if (error) {
    return res.redirect(`${process.env.CLIENT_URL}/login?error=${error}`);
  }
  
  // Redirect to frontend with the code
  res.redirect(`${process.env.CLIENT_URL}/login?github_code=${code}`);
});

module.exports = router;
