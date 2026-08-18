import rateLimit from "express-rate-limit";

// Login is the classic brute-force target: cap attempts per IP well above
// what a real user fat-fingering their password would ever hit, but far
// below what makes password-guessing viable.
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please wait a few minutes and try again." },
});

// Signup creates a new Organization on every success — an unlimited rate
// here means unlimited spam orgs (and unlimited emails, if that mattered).
export const signupRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many signup attempts from this network. Please try again later." },
});

// Forgot-password sends a real email per request — without a limit this is
// both a spam vector (mail-bombing a victim's inbox) and, more subtly, a
// timing/enumeration surface even though the response body itself never
// reveals whether the account exists.
export const forgotPasswordRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many password reset requests. Please try again later." },
});
