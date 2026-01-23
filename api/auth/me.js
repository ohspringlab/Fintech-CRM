// api/auth/me.js - Standalone Vercel serverless function for Clerk auth
const { verifyToken, createClerkClient } = require("@clerk/backend");

// Lazy load database to avoid connection issues in serverless
let db;
function getDb() {
  if (!db) {
    try {
      console.log("📦 Loading database connection...");
      const path = require("path");
      const fs = require("fs");
      
      // Try multiple possible paths
      const possiblePaths = [
        path.resolve(__dirname, "../backend/src/db/config"),
        path.resolve(__dirname, "../../backend/src/db/config"),
        path.join(process.cwd(), "backend/src/db/config"),
        "./backend/src/db/config",
        "../backend/src/db/config",
      ];
      
      let dbPath = null;
      for (const tryPath of possiblePaths) {
        const fullPath = path.resolve(tryPath);
        const jsPath = fullPath + ".js";
        console.log(`🔍 Trying database path: ${fullPath}`);
        if (fs.existsSync(jsPath)) {
          dbPath = fullPath;
          console.log(`✅ Found database config at: ${dbPath}`);
          break;
        }
      }
      
      if (!dbPath) {
        // Last resort: try require with relative path
        console.log("⚠️ Could not find database config file, trying direct require...");
        dbPath = "../backend/src/db/config";
      }
      
      console.log(`📦 Loading database from: ${dbPath}`);
      db = require(dbPath);
      console.log("✅ Database connection loaded successfully");
      console.log("📦 Database object keys:", Object.keys(db));
      console.log("📦 Database has query function:", typeof db.query === 'function');
    } catch (dbLoadError) {
      console.error("❌ Failed to load database module:", dbLoadError);
      console.error("❌ Error details:", {
        message: dbLoadError.message,
        code: dbLoadError.code,
        stack: dbLoadError.stack,
      });
      console.error("❌ Current working directory:", process.cwd());
      console.error("❌ __dirname:", __dirname);
      throw dbLoadError;
    }
  }
  return db;
}

module.exports = async function handler(req, res) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  console.log("=".repeat(80));
  console.log(`🚀 [${requestId}] /api/auth/me.js handler called`);
  console.log(`📋 [${requestId}] Request details:`, {
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    hasAuthHeader: !!req.headers.authorization,
    authHeaderPrefix: req.headers.authorization ? req.headers.authorization.substring(0, 20) + "..." : null,
    userAgent: req.headers["user-agent"],
    origin: req.headers.origin,
  });

  // Only allow GET requests
  if (req.method !== "GET") {
    console.log(`❌ [${requestId}] Method not allowed: ${req.method}`);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Check if Clerk is configured
    console.log(`🔍 [${requestId}] Checking Clerk configuration...`);
    if (!process.env.CLERK_SECRET_KEY) {
      console.error(`❌ [${requestId}] CLERK_SECRET_KEY not configured`);
      return res.status(500).json({
        error: "Authentication service not configured",
        message: "Clerk secret key is missing",
      });
    }
    console.log(`✅ [${requestId}] Clerk secret key is configured (length: ${process.env.CLERK_SECRET_KEY.length})`);

    // Get authorization header
    const authHeader = req.headers.authorization;
    console.log(`🔍 [${requestId}] Authorization header check:`, {
      exists: !!authHeader,
      startsWithBearer: authHeader?.startsWith("Bearer "),
      length: authHeader?.length,
    });

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log(`❌ [${requestId}] Missing or invalid authorization header`);
      return res.status(401).json({
        error: "Authentication required",
        message: "Bearer token required in Authorization header",
      });
    }

    // Extract token
    const token = authHeader.replace("Bearer ", "");
    console.log(`🔍 [${requestId}] Token extracted (length: ${token.length}, prefix: ${token.substring(0, 20)}...)`);

    // Verify Clerk token
    let payload;
    try {
      console.log(`🔍 [${requestId}] Verifying Clerk token...`);
      payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
      console.log(`✅ [${requestId}] Clerk token verified successfully`);
      console.log(`📋 [${requestId}] Token payload:`, {
        sub: payload.sub,
        userId: payload.userId,
        email: payload.email,
        hasEmail: !!payload.email,
      });
    } catch (verifyError) {
      console.error(`❌ [${requestId}] Clerk token verification failed:`, {
        message: verifyError.message,
        name: verifyError.name,
        stack: verifyError.stack,
      });
      return res.status(401).json({
        error: "Authentication required",
        message: "Invalid or expired token",
        details: process.env.NODE_ENV !== "production" ? verifyError.message : undefined,
      });
    }

    const userId = payload.sub || payload.userId;
    console.log(`🔍 [${requestId}] Extracted userId:`, userId);

    if (!userId) {
      console.error(`❌ [${requestId}] No userId found in token payload`);
      return res.status(401).json({
        error: "Authentication required",
        message: "Invalid token payload",
      });
    }

    // Get user from database
    console.log(`🔍 [${requestId}] Loading database connection...`);
    let db;
    try {
      db = getDb();
      console.log(`✅ [${requestId}] Database connection ready`);
    } catch (dbLoadError) {
      console.error(`❌ [${requestId}] Database connection failed:`, {
        message: dbLoadError.message,
        code: dbLoadError.code,
        stack: dbLoadError.stack,
      });
      return res.status(500).json({
        error: "Database connection error",
        message: "Unable to connect to database",
        details: process.env.NODE_ENV !== "production" ? dbLoadError.message : undefined,
      });
    }

    let userResult;
    try {
      console.log(`🔍 [${requestId}] Querying user from database with userId: ${userId}`);
      userResult = await db.query(
        `SELECT id, email, full_name, phone, role, is_active, email_verified 
         FROM users 
         WHERE id = $1`,
        [userId]
      );
      console.log(`✅ [${requestId}] Database query completed:`, {
        rowCount: userResult.rows.length,
        hasUser: userResult.rows.length > 0,
        userRole: userResult.rows[0]?.role,
      });
    } catch (dbError) {
      console.error(`❌ [${requestId}] Database query error:`, {
        message: dbError.message,
        code: dbError.code,
        detail: dbError.detail,
        hint: dbError.hint,
        position: dbError.position,
        stack: dbError.stack,
      });
      return res.status(500).json({
        error: "Database error",
        message: "Unable to fetch user data",
        details: process.env.NODE_ENV !== "production" ? {
          message: dbError.message,
          code: dbError.code,
        } : undefined,
      });
    }

    if (userResult.rows.length === 0) {
      console.log(`⚠️ [${requestId}] User not found in database, creating from Clerk...`);
      // User doesn't exist in database yet - create them from Clerk
      try {
        // Get user from Clerk to create database entry
        console.log(`🔍 [${requestId}] Fetching user from Clerk API...`);
        const clerkClient = createClerkClient({
          secretKey: process.env.CLERK_SECRET_KEY,
        });

        const clerkUser = await clerkClient.users.getUser(userId);
        console.log(`✅ [${requestId}] Clerk user fetched:`, {
          id: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
        });

        if (!clerkUser) {
          console.error(`❌ [${requestId}] Clerk user not found`);
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

        console.log(`🔍 [${requestId}] Inserting new user into database...`);
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
        console.log(`✅ [${requestId}] New user created in database:`, {
          id: userResult.rows[0]?.id,
          email: userResult.rows[0]?.email,
          role: userResult.rows[0]?.role,
        });
      } catch (createError) {
        console.error(`❌ [${requestId}] Error creating user:`, {
          message: createError.message,
          code: createError.code,
          detail: createError.detail,
          stack: createError.stack,
        });
        return res.status(500).json({
          error: "Failed to create user",
          message: "Unable to sync user from authentication service",
          details: process.env.NODE_ENV !== "production" ? {
            message: createError.message,
            code: createError.code,
          } : undefined,
        });
      }
    }

    const user = userResult.rows[0];
    console.log(`✅ [${requestId}] User data retrieved:`, {
      id: user.id,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      email_verified: !!user.email_verified,
    });

    // Ensure role exists (data integrity check)
    if (!user.role) {
      console.warn(`⚠️ [${requestId}] User ${user.email} has no role, setting to borrower`);
      try {
        await db.query(
          `UPDATE users SET role = 'borrower', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [userId]
        );
        user.role = 'borrower';
        console.log(`✅ [${requestId}] User role updated to borrower`);
      } catch (updateError) {
        console.error(`❌ [${requestId}] Failed to update user role:`, updateError);
      }
    }

    // Get additional profile data
    let profile, loanCount;
    try {
      console.log(`🔍 [${requestId}] Fetching profile and loan count...`);
      profile = await db.query(
        `SELECT cp.* FROM crm_profiles cp WHERE cp.user_id = $1`,
        [user.id]
      );

      loanCount = await db.query(
        `SELECT COUNT(*) as count FROM loan_requests WHERE user_id = $1`,
        [user.id]
      );
      console.log(`✅ [${requestId}] Profile and loan count fetched:`, {
        hasProfile: profile.rows.length > 0,
        loanCount: loanCount.rows[0]?.count,
      });
    } catch (dbError) {
      console.error(`⚠️ [${requestId}] Database error fetching profile (non-fatal):`, {
        message: dbError.message,
        code: dbError.code,
      });
      // Return user data even if profile/loan count fails
      profile = { rows: [] };
      loanCount = { rows: [{ count: "0" }] };
    }

    const responseData = {
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
    };

    const duration = Date.now() - startTime;
    console.log(`✅ [${requestId}] Request completed successfully in ${duration}ms`);
    console.log(`📋 [${requestId}] Response data:`, {
      userId: responseData.user.id,
      userRole: responseData.user.role,
      hasProfile: !!responseData.profile,
      loanCount: responseData.loanCount,
    });
    console.log("=".repeat(80));

    // Return user data in same format as Express route
    return res.status(200).json(responseData);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("=".repeat(80));
    console.error(`❌ [${requestId}] Unexpected error in /api/auth/me (after ${duration}ms):`);
    console.error(`❌ [${requestId}] Error name:`, error.name);
    console.error(`❌ [${requestId}] Error message:`, error.message);
    console.error(`❌ [${requestId}] Error code:`, error.code);
    console.error(`❌ [${requestId}] Error stack:`, error.stack);
    if (error.detail) console.error(`❌ [${requestId}] Error detail:`, error.detail);
    if (error.hint) console.error(`❌ [${requestId}] Error hint:`, error.hint);
    console.error("=".repeat(80));
    
    return res.status(500).json({
      error: "Internal server error",
      message:
        process.env.NODE_ENV === "production"
          ? "An error occurred"
          : error.message,
      details: process.env.NODE_ENV !== "production" ? {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack,
      } : undefined,
    });
  }
};

