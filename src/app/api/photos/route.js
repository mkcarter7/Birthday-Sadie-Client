// Firebase auth is now handled on the client-side

export async function GET() {
  const base = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || '';
  const url = `${base.replace(/\/$/, '')}/api/photos/`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      return Response.json({ error: 'Upstream error' }, { status: res.status });
    }
    const data = await res.json();
    // Normalize to an array of photo objects
    const photos = Array.isArray(data) ? data : data?.photos || data?.results || [];
    return Response.json(photos);
  } catch (e) {
    return Response.json({ error: 'Photos service unavailable' }, { status: 502 });
  }
}

export async function POST(request) {
  const base = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || '';

  if (!base) {
    return Response.json({ error: 'API base URL is not configured. Please set NEXT_PUBLIC_API_URL in Vercel environment variables.' }, { status: 500 });
  }

  const url = `${base.replace(/\/$/, '')}/api/photos/`;

  try {
    const formData = await request.formData();
    // Handle both lowercase and capitalized Authorization header
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

    const headers = {
      Authorization: authHeader,
    };

    console.log('Photo upload - Forwarding request to backend:', {
      url,
      hasAuthHeader: !!authHeader,
      authHeaderPrefix: authHeader.substring(0, 20),
    });

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      // Don't set Content-Type for FormData - let browser set it with boundary
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
