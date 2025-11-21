/**
 * Get the frontend URL (party website URL)
 * Uses environment variable if available, otherwise falls back to current origin
 */
export default function getFrontendUrl() {
  // Check if NEXT_PUBLIC_FRONTEND_URL is set (for Render deployment)
  if (typeof window !== 'undefined') {
    // Client-side: use current origin or environment variable
    return process.env.NEXT_PUBLIC_FRONTEND_URL || window.location.origin;
  }
  // Server-side: use environment variable or default
  return process.env.NEXT_PUBLIC_FRONTEND_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://birthday-sadie-client.onrender.com';
}
