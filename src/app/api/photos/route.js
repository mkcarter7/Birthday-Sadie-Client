// Firebase auth is now handled on the client-side

export async function GET() {
  const base = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || '';

  if (!base) {
    console.error('GET /api/photos - API base URL is not configured');
    return Response.json({ error: 'API base URL is not configured' }, { status: 500 });
  }

  const url = `${base.replace(/\/$/, '')}/api/photos/`;

  try {
    console.log('GET /api/photos - Fetching from backend:', url);
    const res = await fetch(url, {
      next: { revalidate: 60 },
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
  const base = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || '';

  if (!base) {
    return Response.json({ error: 'API base URL is not configured. Please set NEXT_PUBLIC_API_URL in Vercel environment variables.' }, { status: 500 });
  }

  const url = `${base.replace(/\/$/, '')}/api/photos/`;

  try {
    // Get the Authorization header from the incoming request
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');

    if (!authHeader) {
      console.error('Photo upload - No authorization header provided');
      return Response.json(
        {
          error: 'Authentication required',
          details: 'No authorization header provided',
        },
        { status: 401 },
      );
    }

    // Get the form data
    const formData = await request.formData();

    // Forward the request to Heroku backend
    // Important: Do NOT set Content-Type for FormData - fetch will set it automatically with boundary
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader, // Forward the auth header as-is
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
