export async function GET(request) {
  const base = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || '';
  const url = new URL(`${base.replace(/\/$/, '')}/api/rsvps/`);
  const incomingUrl = new URL(request.url);
  incomingUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  try {
    // Handle both lowercase and capitalized Authorization header
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');

    const headers = {};
    if (authHeader) {
      headers.Authorization = authHeader;
    }

    const fetchOptions = { headers };
    if (authHeader) {
      fetchOptions.cache = 'no-store';
    } else {
      fetchOptions.next = { revalidate: 60 };
    }

    const res = await fetch(url.toString(), fetchOptions);

    if (!res.ok) {
      // Return empty array for 403 instead of error
      if (res.status === 403) {
        return Response.json([]);
      }
      return Response.json({ error: 'Upstream error' }, { status: res.status });
    }

    const data = await res.json();
    // Normalize to an array of RSVP objects
    const rsvps = Array.isArray(data) ? data : data?.rsvps || data?.results || [];
    return Response.json(rsvps);
  } catch (e) {
    return Response.json({ error: 'RSVP service unavailable' }, { status: 502 });
  }
}

export async function POST(request) {
  const base = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || '';
  const url = `${base.replace(/\/$/, '')}/api/rsvps/`;

  try {
    const body = await request.json();
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');

    if (!authHeader) {
      return Response.json(
        {
          error: 'Authentication required',
          details: 'No authorization header provided',
        },
        { status: 401 },
      );
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let errorText;
      try {
        errorText = await res.text();
      } catch (e) {
        errorText = `Status ${res.status}`;
      }
      console.error('RSVP POST - Error response:', errorText);
      return Response.json(
        {
          error: `Failed to submit RSVP: ${res.status} ${errorText}`,
          status: res.status,
          details: errorText,
        },
        { status: res.status },
      );
    }

    const data = await res.json();
    return Response.json(data);
  } catch (e) {
    console.error('RSVP POST - Exception:', e);
    return Response.json({ error: `RSVP service unavailable: ${e.message}` }, { status: 502 });
  }
}
