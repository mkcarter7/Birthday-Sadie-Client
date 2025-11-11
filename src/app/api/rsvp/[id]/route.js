'use server';

const decodeJwtPayload = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return {};
    const payloadPart = parts[1];
    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    const decoded = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch (e) {
    return {};
  }
};

// eslint-disable-next-line import/prefer-default-export
export async function DELETE(request, { params }) {
  const { id } = params || {};
  if (!id) {
    return Response.json({ error: 'RSVP id is required' }, { status: 400 });
  }

  const base = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || '';
  const url = `${base.replace(/\/$/, '')}/api/rsvps/${id}/`;

  try {
    // Determine if the user is deleting their own RSVP
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (!authHeader) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    let actingUserUid = null;
    let actingUserEmail = null;
    if (authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice('Bearer '.length);
        const decoded = decodeJwtPayload(token);
        actingUserUid = decoded.user_id || decoded.uid || decoded.sub || null;
        actingUserEmail = decoded.email || null;
      } catch (e) {
        // Ignore decode errors; upstream will still enforce auth
      }
    }

    // Fetch the RSVP to ensure it exists and to determine ownership
    const detailUrl = `${base.replace(/\/$/, '')}/api/rsvps/${id}/`;
    const detailRes = await fetch(detailUrl, {
      headers: {
        Authorization: authHeader,
      },
    });

    if (!detailRes.ok) {
      if (detailRes.status === 404) {
        return Response.json({ error: 'RSVP not found' }, { status: 404 });
      }
      let errorDetail;
      try {
        errorDetail = await detailRes.text();
      } catch (e) {
        errorDetail = null;
      }
      return Response.json({ error: errorDetail || 'Unable to load RSVP' }, { status: detailRes.status });
    }

    let rsvpRecord = null;
    try {
      rsvpRecord = await detailRes.json();
    } catch (e) {
      rsvpRecord = null;
    }

    const isOwnRsvp = (actingUserUid && (rsvpRecord?.user?.uid === actingUserUid || rsvpRecord?.user_uid === actingUserUid || rsvpRecord?.user?.id === actingUserUid)) || (actingUserEmail && (rsvpRecord?.user?.email === actingUserEmail || rsvpRecord?.user_email === actingUserEmail));

    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: authHeader,
        'X-Delete-Role': isOwnRsvp ? 'owner' : 'admin',
      },
    });

    if (!res.ok) {
      let errorBody;
      try {
        errorBody = await res.json();
      } catch (e) {
        errorBody = { detail: await res.text() };
      }
      return Response.json(
        {
          error: errorBody?.error || errorBody?.detail || `Failed to delete RSVP (status ${res.status})`,
        },
        { status: res.status },
      );
    }

    return new Response(null, { status: 204 });
  } catch (e) {
    console.error('RSVP DELETE - Exception:', e);
    return Response.json({ error: `RSVP service unavailable: ${e.message}` }, { status: 502 });
  }
}
