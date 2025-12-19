import { jwtDecode } from "jwt-decode";
import { User, Session } from "@supabase/supabase-js";

export interface JWTPayload {
  aud: string;
  exp: number;
  sub: string;
  email: string;
  phone: string;
  app_metadata: {
    provider: string;
    providers: string[];
  };
  user_metadata: {
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    email_verified?: boolean;
    phone_verified?: boolean;
  };
  role: string;
  aal: string;
  amr: Array<{ method: string; timestamp: number }>;
  session_id: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  role: "user" | "host" | "admin" | "super_admin";
  provider: string;
  createdAt: Date;
  lastSignInAt: Date;
}

export class AuthUtils {
  /**
   * Decode and validate JWT token
   */
  static decodeToken(token: string): JWTPayload | null {
    try {
      const decoded = jwtDecode<JWTPayload>(token);

      // Check if token is expired
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        return null;
      }

      return decoded;
    } catch (error) {
      console.error("Error decoding JWT token:", error);
      return null;
    }
  }

  /**
   * Convert Supabase User to AuthUser
   */
  static userToAuthUser(user: User): AuthUser {
    const metadata = user.user_metadata || {};
    const appMetadata = user.app_metadata || {};

    return {
      id: user.id,
      email: user.email || "",
      firstName: metadata.first_name,
      lastName: metadata.last_name,
      avatarUrl: metadata.avatar_url,
      emailVerified: user.email_confirmed_at !== null,
      phoneVerified: user.phone_confirmed_at !== null,
      role: this.determineUserRole(user),
      provider: appMetadata.provider || "email",
      createdAt: new Date(user.created_at),
      lastSignInAt: new Date(user.last_sign_in_at || user.created_at),
    };
  }

  /**
   * Determine user role based on metadata and email
   * NOTE: This reads from metadata - for server-side checks, query profiles table directly
   */
  static determineUserRole(user: User): "user" | "host" | "admin" | "super_admin" {
    const metadata = user.user_metadata || {};

    // Only trust explicit role flags from metadata
    if ((metadata as any).role === "super_admin") {
      return "super_admin";
    }
    if (metadata.role === "admin") {
      return "admin";
    }

    if (metadata.role === "host" || (metadata as any).is_host) {
      return "host";
    }

    return "user";
  }

  /**
   * Get user role from profiles table (server-side, source of truth)
   * This is the preferred method for role checks in API routes and middleware
   */
  static async getUserRoleFromProfile(
    supabase: any,
    userId: string
  ): Promise<{
    role: "user" | "host" | "admin" | "super_admin";
    isHost: boolean;
    error: Error | null;
  }> {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, is_host")
        .eq("user_id", userId)
        .single();

      if (error) {
        return {
          role: "user",
          isHost: false,
          error: new Error(`Failed to fetch role: ${error.message}`),
        };
      }

      if (!profile) {
        return {
          role: "user",
          isHost: false,
          error: new Error("Profile not found"),
        };
      }

      return {
        role: profile.role as "user" | "host" | "admin" | "super_admin",
        isHost: profile.is_host,
        error: null,
      };
    } catch (err) {
      return {
        role: "user",
        isHost: false,
        error: err as Error,
      };
    }
  }

  /**
   * Check if user has required permissions
   */
  static hasPermission(
    user: AuthUser,
    requiredRole: "user" | "host" | "admin"
  ): boolean {
    const roleHierarchy = {
      user: 1,
      host: 2,
      admin: 3,
      super_admin: 4,
    };

    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  }

  /**
   * Check if role meets requirement (static version)
   */
  static checkRolePermission(
    userRole: "user" | "host" | "admin" | "super_admin",
    requiredRole: "user" | "host" | "admin"
  ): boolean {
    const roleHierarchy = {
      user: 1,
      host: 2,
      admin: 3,
      super_admin: 4,
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }

  /**
   * Validate session and return user info
   */
  static validateSession(session: Session | null): AuthUser | null {
    console.log("Validating session:", {
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      hasUser: !!session?.user,
      userEmail: session?.user?.email,
    });

    if (!session?.access_token) {
      console.log("No session or access token");
      return null;
    }

    const tokenPayload = this.decodeToken(session.access_token);
    if (!tokenPayload) {
      console.log("Failed to decode token");
      return null;
    }

    console.log("Token payload decoded successfully");

    // Convert Supabase user to AuthUser
    const authUser = this.userToAuthUser(session.user);
    console.log("Converted to AuthUser:", authUser);

    return authUser;
  }

  /**
   * Check if token needs refresh (within 5 minutes of expiry)
   */
  static needsTokenRefresh(token: string): boolean {
    const payload = this.decodeToken(token);
    if (!payload?.exp) return true;

    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
    return payload.exp * 1000 - Date.now() < fiveMinutes;
  }

  /**
   * Generate secure random string for CSRF tokens
   */
  static generateCSRFToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      ""
    );
  }

  /**
   * Sanitize user data for public display
   */
  static sanitizeUserData(user: AuthUser): Partial<AuthUser> {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }

    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    if (!/\d/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push("Password must contain at least one special character");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Rate limiting helper
   */
  static createRateLimiter(maxAttempts: number, windowMs: number) {
    const attempts = new Map<string, { count: number; resetTime: number }>();

    return (identifier: string): boolean => {
      const now = Date.now();
      const userAttempts = attempts.get(identifier);

      if (!userAttempts || now > userAttempts.resetTime) {
        attempts.set(identifier, { count: 1, resetTime: now + windowMs });
        return true;
      }

      if (userAttempts.count >= maxAttempts) {
        return false;
      }

      userAttempts.count++;
      return true;
    };
  }
}

// Export default instance
export default AuthUtils;
