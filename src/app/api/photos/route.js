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
    // Get auth header BEFORE consuming the body
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');

    if (!authHeader) {
      console.error('Photo upload - No authorization header provided');
      console.error(
        'Available headers:',
        Array.from(request.headers.entries()).map(([k, v]) => `${k}: ${k === 'authorization' || k === 'Authorization' ? '[REDACTED]' : v.substring(0, 50)}`),
      );
      return Response.json(
        {
          error: 'Authentication required',
          details: 'No authorization header provided',
        },
        { status: 401 },
      );
    }

    // Ensure the header is properly formatted with Bearer prefix
    const formattedAuthHeader = authHeader.startsWith('Bearer ') ? authHeader : `Bearer ${authHeader.replace(/^Bearer\s+/i, '')}`;

    // Now consume the form data
    const formData = await request.formData();

    // Build headers object - explicitly set Authorization
    // Note: When using FormData, we must NOT set Content-Type - fetch will set it with boundary
    // But we MUST include Authorization header
    const headers = {
      Authorization: formattedAuthHeader,
    };

    console.log('Photo upload - Forwarding request to backend:', {
      url,
      hasAuthHeader: !!authHeader,
      authHeaderPrefix: formattedAuthHeader.substring(0, 30),
      headerKeys: Object.keys(headers),
      headerValues: Object.keys(headers).map((k) => `${k}: ${k.toLowerCase() === 'authorization' ? '[REDACTED]' : headers[k]}`),
      formDataKeys: Array.from(formData.keys()),
      method: 'POST',
    });

    // Make the request to backend
    // Important: When forwarding FormData, we must let fetch set Content-Type with boundary
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      // Don't set Content-Type for FormData - fetch will automatically set it with boundary
      // This is important - if we set Content-Type manually, it won't include the boundary
    });

    // Log response details for debugging
    console.log('Photo upload - Backend response:', {
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries()),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Photo upload failed:', {
        status: res.status,
        url,
        errorText: errorText.substring(0, 200), // First 200 chars
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
