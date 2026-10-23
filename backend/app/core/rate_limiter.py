"""In-memory sliding window rate limiter for public verification endpoints."""
import time
from collections import defaultdict
from threading import Lock
from typing import Dict, List
from fastapi import HTTPException, Request, status


class SlidingWindowRateLimiter:
    """Sliding-window in-memory rate limiter per client IP address."""

    def __init__(self, max_requests: int = 30, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: Dict[str, List[float]] = defaultdict(list)
        self._lock = Lock()

    def is_allowed(self, client_identifier: str) -> bool:
        now = time.time()
        cutoff = now - self.window_seconds
        with self._lock:
            # Filter timestamps within current sliding window
            timestamps = [ts for ts in self._requests[client_identifier] if ts > cutoff]
            if len(timestamps) >= self.max_requests:
                self._requests[client_identifier] = timestamps
                return False
            timestamps.append(now)
            self._requests[client_identifier] = timestamps
            return True

    def reset(self):
        """Reset all tracked client requests (useful for test isolation)."""
        with self._lock:
            self._requests.clear()


# Default instance: 30 requests per minute per IP for public verification lookups
public_verifier_limiter = SlidingWindowRateLimiter(max_requests=30, window_seconds=60)


def rate_limit_public_verifier(request: Request):
    """FastAPI dependency to rate-limit unauthenticated public verification lookups."""
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else "127.0.0.1"

    if not public_verifier_limiter.is_allowed(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Too many verification requests. Please wait a moment before trying again.",
        )
