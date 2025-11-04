// Rate limiting middleware using Upstash Redis
// Prevents abuse of auth endpoints

const redis = require('@upstash/redis');

// Initialize Redis client
const redisClient = new redis.Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

/**
 * Rate limit checker
 * @param {string} identifier - IP address or email (what to rate limit by)
 * @param {number} maxRequests - Max requests allowed in the window
 * @param {number} windowSeconds - Time window in seconds
 * @returns {Promise<{allowed: boolean, remaining: number, resetIn: number}>}
 */
async function checkRateLimit(identifier, maxRequests = 3, windowSeconds = 3600) {
  try {
    if (!redisClient) {
      console.warn('⚠️ Rate limiting disabled: Upstash Redis not configured');
      return { allowed: true, remaining: maxRequests, resetIn: 0 };
    }

    const key = `ratelimit:${identifier}`;
    const current = await redisClient.incr(key);
    
    // Set expiry on first request
    if (current === 1) {
      await redisClient.expire(key, windowSeconds);
    }

    const allowed = current <= maxRequests;
    const remaining = Math.max(0, maxRequests - current);
    const ttl = await redisClient.ttl(key);

    console.log(`[rate-limit] ${identifier}: ${current}/${maxRequests} (TTL: ${ttl}s)`);

    return {
      allowed,
      remaining,
      resetIn: ttl || windowSeconds,
    };
  } catch (error) {
    console.error('❌ Rate limit check error:', error.message);
    // Fail open - allow request if Redis fails
    return { allowed: true, remaining: 3, resetIn: 0 };
  }
}

/**
 * Middleware for Express-like Vercel functions
 * @param {number} maxRequests - Max requests in window
 * @param {number} windowSeconds - Time window in seconds
 * @returns {Function} Middleware function
 */
function createRateLimitMiddleware(maxRequests = 3, windowSeconds = 3600) {
  return async (req, res) => {
    const identifier = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
    
    const result = await checkRateLimit(identifier, maxRequests, windowSeconds);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', Math.floor(Date.now() / 1000) + result.resetIn);

    if (!result.allowed) {
      console.warn(`❌ Rate limit exceeded for ${identifier}`);
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfter: result.resetIn,
      });
    }

    return null; // Proceed with request
  };
}

/**
 * Email-specific rate limiter
 * @param {string} email - Email to rate limit
 * @returns {Promise<{allowed: boolean, remaining: number, resetIn: number}>}
 */
async function checkEmailRateLimit(email) {
  // 3 emails per hour per address
  return checkRateLimit(`email:${email}`, 3, 3600);
}

/**
 * IP-specific rate limiter
 * @param {string} ip - IP address to rate limit
 * @returns {Promise<{allowed: boolean, remaining: number, resetIn: number}>}
 */
async function checkIpRateLimit(ip) {
  // 10 requests per minute per IP
  return checkRateLimit(`ip:${ip}`, 10, 60);
}

module.exports = {
  checkRateLimit,
  createRateLimitMiddleware,
  checkEmailRateLimit,
  checkIpRateLimit,
};
