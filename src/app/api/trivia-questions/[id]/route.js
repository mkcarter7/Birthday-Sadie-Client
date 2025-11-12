/* eslint-disable import/prefer-default-export */
export async function PATCH(request, { params }) {
  const { id } = params || {};
  if (!id) {
    return Response.json({ error: 'Question id is required' }, { status: 400 });
  }

  const base = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || '';

  try {
    const body = await request.json();
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');

    if (!authHeader) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const res = await fetch(`${base.replace(/\/$/, '')}/api/trivia-questions/${id}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return Response.json({ error: errorText || 'Failed to update trivia question' }, { status: res.status });
    }

    const data = await res.json();
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: 'Trivia questions service unavailable' }, { status: 502 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = params || {};
  if (!id) {
    return Response.json({ error: 'Question id is required' }, { status: 400 });
  }

  const base = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || '';

  try {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');

    if (!authHeader) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const res = await fetch(`${base.replace(/\/$/, '')}/api/trivia-questions/${id}/`, {
      method: 'DELETE',
      headers: {
        Authorization: authHeader,
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      return Response.json({ error: errorText || 'Failed to delete trivia question' }, { status: res.status });
    }

    return new Response(null, { status: 204 });
  } catch (e) {
    return Response.json({ error: 'Trivia questions service unavailable' }, { status: 502 });
  }
}
