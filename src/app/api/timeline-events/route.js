'use server';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || '').replace(/\/$/, '');

const buildUrl = (requestUrl) => {
  const backendUrl = new URL(`${API_BASE}/api/timeline-events/`);
  const incomingUrl = new URL(requestUrl);
  incomingUrl.searchParams.forEach((value, key) => {
    backendUrl.searchParams.set(key, value);
  });
  return backendUrl.toString();
};

export async function GET(request) {
  if (!API_BASE) {
    return Response.json({ error: 'API base URL not configured' }, { status: 500 });
  }

  try {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const fetchOptions = {
      cache: 'no-store',
      headers: {},
    };
    if (authHeader) {
      fetchOptions.headers.Authorization = authHeader;
    }

    const url = buildUrl(request.url);
    const res = await fetch(url, fetchOptions);
    if (!res.ok) {
      const text = await res.text();
      return Response.json({ error: text || 'Failed to load timeline events' }, { status: res.status });
    }
    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message || 'Timeline service unavailable' }, { status: 502 });
  }
}

export async function POST(request) {
  if (!API_BASE) {
    return Response.json({ error: 'API base URL not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (!authHeader) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const res = await fetch(`${API_BASE}/api/timeline-events/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    const responseBody = text ? JSON.parse(text).catch(() => text) : null;

    if (!res.ok) {
      return Response.json(responseBody || { error: 'Failed to create timeline event' }, {
        status: res.status,
      });
    }

    return Response.json(responseBody, { status: res.status });
  } catch (err) {
    return Response.json({ error: err.message || 'Timeline service unavailable' }, { status: 502 });
  }
}
