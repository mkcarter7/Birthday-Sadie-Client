'use server';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || '').replace(/\/$/, '');

const requireConfig = () => {
  if (!API_BASE) {
    return Response.json({ error: 'API base URL not configured' }, { status: 500 });
  }
  return null;
};

const readBody = async (request) => {
  try {
    return await request.json();
  } catch (err) {
    return null;
  }
};

export async function PATCH(request, { params }) {
  const configError = requireConfig();
  if (configError) return configError;

  const { id } = params || {};
  if (!id) {
    return Response.json({ error: 'Timeline event id is required' }, { status: 400 });
  }

  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authHeader) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await readBody(request);

  try {
    const res = await fetch(`${API_BASE}/api/timeline-events/${id}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(body || {}),
    });

    const text = await res.text();
    const responseBody = text ? JSON.parse(text).catch(() => text) : null;

    if (!res.ok) {
      return Response.json(responseBody || { error: 'Failed to update timeline event' }, {
        status: res.status,
      });
    }

    return Response.json(responseBody, { status: res.status });
  } catch (err) {
    return Response.json({ error: err.message || 'Timeline service unavailable' }, { status: 502 });
  }
}

export async function DELETE(request, { params }) {
  const configError = requireConfig();
  if (configError) return configError;

  const { id } = params || {};
  if (!id) {
    return Response.json({ error: 'Timeline event id is required' }, { status: 400 });
  }

  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authHeader) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const res = await fetch(`${API_BASE}/api/timeline-events/${id}/`, {
      method: 'DELETE',
      headers: {
        Authorization: authHeader,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return Response.json({ error: text || 'Failed to delete timeline event' }, { status: res.status });
    }

    return new Response(null, { status: 204 });
  } catch (err) {
    return Response.json({ error: err.message || 'Timeline service unavailable' }, { status: 502 });
  }
}
