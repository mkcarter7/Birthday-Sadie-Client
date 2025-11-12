'use server';

import { PARTY_CONFIG } from '@/config/party';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || '').replace(/\/$/, '');

const pickFirstString = (candidates) => {
  for (let i = 0; i < candidates.length; i += 1) {
    const value = candidates[i];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }
  return null;
};

const getPhotoOwnerUid = (photo) => {
  if (!photo || typeof photo !== 'object') return null;
  return pickFirstString([photo.firebase_uid, photo.firebase_user_id, photo.user_uid, photo.uploader_uid, photo.owner_uid, photo.user_id, photo.uploaded_by?.firebase_uid, photo.uploaded_by?.uid, photo.uploaded_by?.id, photo.user?.firebase_uid, photo.user?.uid]);
};

const getPhotoOwnerEmail = (photo) => {
  if (!photo || typeof photo !== 'object') return null;
  const email = pickFirstString([photo.uploaded_by?.email, photo.uploaded_by_email, photo.user?.email, photo.user_email, photo.email]);
  return email ? email.toLowerCase() : null;
};

const getAdminEmails = () => {
  const envAdmins = process.env.NEXT_PUBLIC_ADMIN_EMAILS || process.env.ADMIN_EMAILS;
  if (!envAdmins) return [];
  return envAdmins
    .split(',')
    .map((email) => (typeof email === 'string' ? email.trim().toLowerCase() : null))
    .filter(Boolean);
};

const ADMIN_EMAILS = getAdminEmails();

const decodeAuthHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {};
  }
  const token = authHeader.slice('Bearer '.length);
  const parts = token.split('.');
  if (parts.length < 2) {
    return {};
  }
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch (error) {
    return {};
  }
};

export default async function handler(request, context) {
  const { method } = request;
  if (method !== 'DELETE') {
    return new Response(null, { status: 405 });
  }

  const { params } = context || {};
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

  const decoded = decodeAuthHeader(authHeader);
  const actingUserUid = decoded.user_id || decoded.uid || decoded.sub || null;
  const actingUserEmail = decoded.email ? decoded.email.toLowerCase() : null;
  const userIsAdmin = actingUserEmail ? ADMIN_EMAILS.includes(actingUserEmail) : false;

  let photoRecord = null;
  let userOwnsPhoto = false;
  let ownerUid = null;
  let ownerEmail = null;

  try {
    const detailRes = await fetch(`${API_BASE}/api/photos/${id}/?party=${encodeURIComponent(PARTY_CONFIG.id)}`, {
      headers: {
        Authorization: authHeader,
      },
      cache: 'no-store',
    });

    if (detailRes.ok) {
      try {
        photoRecord = await detailRes.json();
      } catch (error) {
        photoRecord = null;
      }
      ownerUid = getPhotoOwnerUid(photoRecord);
      ownerEmail = getPhotoOwnerEmail(photoRecord);
      if (ownerUid && actingUserUid && ownerUid === actingUserUid) {
        userOwnsPhoto = true;
      } else if (ownerEmail && actingUserEmail && ownerEmail === actingUserEmail) {
        userOwnsPhoto = true;
      }
    } else if (detailRes.status === 404) {
      return Response.json({ error: 'Photo not found' }, { status: 404 });
    }
  } catch (error) {
    // Ignore detail fetch errors; ownership will rely on fallback logic below
  }

  if (!userIsAdmin && !userOwnsPhoto) {
    return Response.json({ error: 'You do not have permission to delete this photo.' }, { status: 403 });
  }

  let finalRole = 'owner';
  if (!userOwnsPhoto && userIsAdmin) {
    finalRole = 'admin';
  }

  try {
    const deleteHeaders = {
      Authorization: authHeader,
      'X-Delete-Role': finalRole,
      'X-Party-Id': PARTY_CONFIG.id,
    };

    if (actingUserUid) {
      deleteHeaders['X-Delete-Actor-Uid'] = userOwnsPhoto && ownerUid ? ownerUid : actingUserUid;
    } else if (userOwnsPhoto && ownerUid) {
      deleteHeaders['X-Delete-Actor-Uid'] = ownerUid;
    }
    if (actingUserEmail) {
      deleteHeaders['X-Delete-Actor-Email'] = actingUserEmail;
    }
    if (userOwnsPhoto && ownerEmail) {
      deleteHeaders['X-Delete-Owner-Email'] = ownerEmail;
    }
    if (userOwnsPhoto && ownerUid) {
      deleteHeaders['X-Delete-Owner-Uid'] = ownerUid;
    }

    const res = await fetch(`${API_BASE}/api/photos/${id}/?party=${encodeURIComponent(PARTY_CONFIG.id)}`, {
      method: 'DELETE',
      headers: {
        ...deleteHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ party: PARTY_CONFIG.id }),
    });

    if (!res.ok) {
      let text = null;
      try {
        text = await res.text();
      } catch (error) {
        text = null;
      }
      return Response.json({ error: text || 'Failed to delete photo' }, { status: res.status });
    }

    return new Response(null, { status: 204 });
  } catch (err) {
    return Response.json({ error: err.message || 'Photo service unavailable' }, { status: 502 });
  }
}
