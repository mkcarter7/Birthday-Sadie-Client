/* eslint-disable import/prefer-default-export */
export async function GET(request) {
  const base = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || '';
  const { searchParams } = new URL(request.url);
  const party = searchParams.get('party');
  const isActive = searchParams.get('is_active');
  const limit = searchParams.get('limit');

  let url = `${base.replace(/\/$/, '')}/api/trivia-questions/`;
  const params = new URLSearchParams();
  if (party) {
    params.append('party', party);
  }
  if (isActive !== null) {
    params.append('is_active', isActive);
  }
  if (limit) {
    params.append('limit', limit);
  }
  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  try {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');

    const headers = {};
    if (authHeader) {
      headers.Authorization = authHeader;
    }

    const res = await fetch(url, {
      headers,
      cache: 'no-store',
    });

    if (!res.ok) {
      return Response.json({ error: 'Failed to fetch trivia questions' }, { status: res.status });
    }

    const data = await res.json();
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: 'Trivia questions service unavailable' }, { status: 502 });
  }
}

export async function POST(request) {
  const base = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || '';

  try {
    const body = await request.json();
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');

    if (!authHeader) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const res = await fetch(`${base.replace(/\/$/, '')}/api/trivia-questions/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return Response.json({ error: errorText || 'Failed to create trivia question' }, { status: res.status });
    }

    const data = await res.json();
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: 'Trivia questions service unavailable' }, { status: 502 });
  }
}
