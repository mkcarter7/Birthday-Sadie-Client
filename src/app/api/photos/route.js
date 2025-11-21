// Firebase auth is now handled on the client-side

// Ensure this route is dynamic (not cached)
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const base = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || '';

  if (!base) {
    console.error('GET /api/photos - API base URL is not configured');
    return Response.json({ error: 'API base URL is not configured' }, { status: 500 });
  }

  // Get party ID from query parameters (frontend can pass ?party=1)
  // In Next.js App Router, request.url might be relative, so we need to handle it
  let partyId = process.env.NEXT_PUBLIC_PARTY_ID || '1';

  try {
    const urlObj = new URL(request.url);
    const queryPartyId = urlObj.searchParams.get('party');
    if (queryPartyId) {
      partyId = queryPartyId;
    }
  } catch (e) {
    // If request.url is not a full URL, try to get it from headers
    console.warn('GET /api/photos - Could not parse request.url, using default party ID');
  }

  // Build URL with party filter
  const url = `${base.replace(/\/$/, '')}/api/photos/?party=${encodeURIComponent(partyId)}`;

  try {
    console.log('GET /api/photos - Request URL:', request.url);
    console.log('GET /api/photos - Party ID:', partyId);
    console.log('GET /api/photos - Fetching from backend:', url);
    const res = await fetch(url, {
      next: { revalidate: 0 }, // Don't cache - always fetch fresh
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('GET /api/photos - Backend error:', {
        status: res.status,
        url,
        errorText: errorText.substring(0, 200),
      });
      return Response.json({ error: `Upstream error: ${res.status} ${errorText.substring(0, 100)}` }, { status: res.status });
    }

    const data = await res.json();
    // Normalize to an array of photo objects
    const photos = Array.isArray(data) ? data : data?.photos || data?.results || [];
    console.log('GET /api/photos - Success, returning', photos.length, 'photos');
    return Response.json(photos);
  } catch (e) {
    console.error('GET /api/photos - Fetch error:', e);
    console.error('Attempted URL:', url);
    return Response.json({ error: `Photos service unavailable: ${e.message}` }, { status: 502 });
  }
}

export async function POST(request) {
  // PROXY: This Next.js API route proxies requests to the Heroku backend
  // Frontend calls: /api/photos (this route)
  // This route forwards to: ${NEXT_PUBLIC_API_URL}/api/photos/ (Heroku)

  // Step 1: Read API base URL from environment variable
  const base = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || '';

  if (!base) {
    console.error('Photo upload - NEXT_PUBLIC_API_URL is not set');
    return Response.json({ error: 'API base URL is not configured. Please set NEXT_PUBLIC_API_URL in Vercel environment variables.' }, { status: 500 });
  }

  // Step 2: Construct the full backend URL
  const url = `${base.replace(/\/$/, '')}/api/photos/`;

  // Log the backend URL being used (for debugging)
  console.log('Photo upload - Proxying to backend URL:', url);

  try {
    // Get the Authorization header from the incoming request
    // Check multiple possible header name variations
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || request.headers.get('AUTHORIZATION');

    // Log all headers for debugging (in production, this helps diagnose issues)
    const allHeaders = Object.fromEntries(request.headers.entries());
    console.log('Photo upload - Received headers:', {
      hasAuth: !!authHeader,
      headerKeys: Object.keys(allHeaders),
      contentType: request.headers.get('content-type'),
    });

    if (!authHeader) {
      console.error('Photo upload - No authorization header provided');
      console.error('Photo upload - All received headers:', allHeaders);
      return Response.json(
        {
          error: 'Authentication required',
          details: 'No authorization header provided',
        },
        { status: 401 },
      );
    }

    // Step 3: Get the form data from the incoming request
    const formData = await request.formData();

    // Step 4: Forward the request to Heroku backend with Authorization header
    // Important: Do NOT set Content-Type for FormData - fetch will set it automatically with boundary
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader, // Forward the Authorization header to Heroku
        // Do NOT set Content-Type - fetch will set it with boundary for FormData
      },
      body: formData, // Forward the form data with the image
    });

    // Handle response
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Photo upload failed:', {
        status: res.status,
        url,
        errorText: errorText.substring(0, 200),
      });

      // If response is HTML, it's likely a 404 or error page
      if (errorText.trim().startsWith('<!DOCTYPE') || errorText.trim().startsWith('<html')) {
        return Response.json(
          {
            error: `Upload failed: Backend returned HTML error page. Check that the endpoint ${url} exists on your backend.`,
          },
          { status: res.status },
        );
      }

      return Response.json({ error: `Upload failed: ${res.status} ${errorText.substring(0, 100)}` }, { status: res.status });
    }

    const data = await res.json();
    return Response.json(data);
  } catch (e) {
    console.error('Upload error:', e);
    console.error('Attempted URL:', url);
    return Response.json({ error: `Upload service unavailable: ${e.message}. Check that NEXT_PUBLIC_API_URL is set correctly in Vercel.` }, { status: 502 });
  }
}
