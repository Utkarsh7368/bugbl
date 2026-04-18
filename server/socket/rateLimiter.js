/**
 * Per-socket event rate limiter for Bugbl.io
 * Prevents abuse and ensures server stability at scale
 */

class RateLimiter {
  constructor() {
    // Map of socketId → Map of eventName → { count, resetTime }
    this.limits = new Map();
  }

  /**
   * Rate limit configurations per event type
   */
  static LIMITS = {
    'draw': { maxPerSecond: 60, windowMs: 1000 },
    'guess': { maxPerSecond: 2, windowMs: 1000 },
    'chat': { maxPerSecond: 1, windowMs: 1000 },
    'clear-canvas': { maxPerSecond: 2, windowMs: 1000 },
    'default': { maxPerSecond: 10, windowMs: 1000 }
  };

  /**
   * Check if an event should be allowed
   * @param {string} socketId
   * @param {string} eventName
   * @returns {boolean} true if allowed, false if rate limited
   */
  allow(socketId, eventName) {
    const now = Date.now();
    const config = RateLimiter.LIMITS[eventName] || RateLimiter.LIMITS.default;

    if (!this.limits.has(socketId)) {
      this.limits.set(socketId, new Map());
    }

    const socketLimits = this.limits.get(socketId);

    if (!socketLimits.has(eventName)) {
      socketLimits.set(eventName, { count: 1, resetTime: now + config.windowMs });
      return true;
    }

    const limit = socketLimits.get(eventName);

    // Reset window if time has passed
    if (now > limit.resetTime) {
      limit.count = 1;
      limit.resetTime = now + config.windowMs;
      return true;
    }

    // Check if under limit
    if (limit.count < config.maxPerSecond) {
      limit.count++;
      return true;
    }

    return false;
  }

  /**
   * Remove tracking for a disconnected socket
   */
  removeSocket(socketId) {
    this.limits.delete(socketId);
  }

  /**
   * Periodic cleanup of stale entries
   */
  cleanup() {
    const now = Date.now();
    for (const [socketId, events] of this.limits) {
      let allExpired = true;
      for (const [, limit] of events) {
        if (now <= limit.resetTime) {
          allExpired = false;
          break;
        }
      }
      if (allExpired) {
        this.limits.delete(socketId);
      }
    }
  }
}

module.exports = RateLimiter;
