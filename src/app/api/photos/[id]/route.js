'use server';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || '').replace(/\/$/, '');

export default async function handler(request, { params }) {
  const { method } = request;
  if (method !== 'DELETE') {
    return new Response(null, { status: 405 });
  }

  const { id } = params || {};
  if (!id) {
    return Response.json({ error: 'Photo id is required' }, { status: 400 });
  }

  if (!API_BASE) {
    return Response.json({ error: 'API base URL not configured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authHeader) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const res = await fetch(`${API_BASE}/api/photos/${id}/`, {
      method: 'DELETE',
      headers: {
        Authorization: authHeader,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return Response.json({ error: text || 'Failed to delete photo' }, { status: res.status });
    }

    return new Response(null, { status: 204 });
  } catch (err) {
    return Response.json({ error: err.message || 'Photo service unavailable' }, { status: 502 });
  }
}
