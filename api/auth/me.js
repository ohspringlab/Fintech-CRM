// api/auth/me.js - Standalone Vercel serverless function for Clerk auth
const { verifyToken, createClerkClient } = require("@clerk/backend");
const db = require("../backend/src/db/config");

module.exports = async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Check if Clerk is configured
    if (!process.env.CLERK_SECRET_KEY) {
      console.error("❌ CLERK_SECRET_KEY not configured");
      return res.status(500).json({
        error: "Authentication service not configured",
        message: "Clerk secret key is missing",
      });
    }

    // Get authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Authentication required",
        message: "Bearer token required in Authorization header",
      });
    }

    // Extract token
    const token = authHeader.replace("Bearer ", "");

    // Verify Clerk token
    let payload;
    try {
      payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
    } catch (verifyError) {
      console.error("❌ Clerk token verification failed:", verifyError.message);
      return res.status(401).json({
        error: "Authentication required",
        message: "Invalid or expired token",
      });
    }

    const userId = payload.sub || payload.userId;

    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
        message: "Invalid token payload",
      });
    }

    // Get user from database
    let userResult;
    try {
      userResult = await db.query(
        `SELECT id, email, full_name, phone, role, is_active, email_verified 
         FROM users 
         WHERE id = $1`,
        [userId]
      );
    } catch (dbError) {
      console.error("❌ Database error:", dbError);
      return res.status(500).json({
        error: "Database error",
        message: "Unable to fetch user data",
      });
    }

    if (userResult.rows.length === 0) {
      // User doesn't exist in database yet - create them from Clerk
      try {
        // Get user from Clerk to create database entry
        const clerkClient = createClerkClient({
          secretKey: process.env.CLERK_SECRET_KEY,
        });

        const clerkUser = await clerkClient.users.getUser(userId);

        if (!clerkUser) {
          return res.status(404).json({
            error: "User not found",
            message: "User not found in authentication service",
          });
        }

        // Create user in database
        const emailVerified = clerkUser.emailAddresses?.some(
          (email) =>
            email.emailAddress === clerkUser.primaryEmailAddress?.emailAddress &&
            email.verification?.status === "verified"
        ) || false;

        const insertResult = await db.query(
          `INSERT INTO users (id, email, password_hash, full_name, phone, role, email_verified, is_active, created_at, updated_at)
           VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING id, email, full_name, phone, role, is_active, email_verified`,
          [
            userId,
            clerkUser.primaryEmailAddress?.emailAddress || "",
            clerkUser.firstName && clerkUser.lastName
              ? `${clerkUser.firstName} ${clerkUser.lastName}`
              : clerkUser.username || "User",
            clerkUser.phoneNumbers?.[0]?.phoneNumber || "",
            "borrower", // Default role
            emailVerified ? new Date() : null,
            true,
          ]
        );

        userResult = insertResult;
      } catch (createError) {
        console.error("❌ Error creating user:", createError);
        return res.status(500).json({
          error: "Failed to create user",
          message: "Unable to sync user from authentication service",
        });
      }
    }

    const user = userResult.rows[0];

    // Get additional profile data
    let profile, loanCount;
    try {
      profile = await db.query(
        `SELECT cp.* FROM crm_profiles cp WHERE cp.user_id = $1`,
        [user.id]
      );

      loanCount = await db.query(
        `SELECT COUNT(*) as count FROM loan_requests WHERE user_id = $1`,
        [user.id]
      );
    } catch (dbError) {
      console.error("[Auth /me] Database error fetching profile:", dbError);
      // Return user data even if profile/loan count fails
      profile = { rows: [] };
      loanCount = { rows: [{ count: "0" }] };
    }

    // Return user data in same format as Express route
    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        role: user.role,
        // email_verified is a timestamp, convert to boolean for frontend
        email_verified: !!user.email_verified,
      },
      profile: profile.rows[0] || null,
      loanCount: parseInt(loanCount.rows[0]?.count || "0"),
    });
  } catch (error) {
    console.error("❌ Unexpected error in /api/auth/me:", error);
    console.error("Error stack:", error.stack);
    return res.status(500).json({
      error: "Internal server error",
      message:
        process.env.NODE_ENV === "production"
          ? "An error occurred"
          : error.message,
    });
  }
};

