/* eslint-disable import/prefer-default-export */
export async function GET(request) {
  const base = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || '';
  const { searchParams } = new URL(request.url);
  const party = searchParams.get('party');
  const count = searchParams.get('count') || '5';

  let url = `${base.replace(/\/$/, '')}/api/trivia-questions/`;
  const params = new URLSearchParams();
  if (party) {
    params.append('party', party);
  }
  params.append('is_active', 'true');
  if (count) {
    params.append('limit', count);
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
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      if (res.status === 403) {
        return Response.json({ error: 'Access denied' }, { status: 403 });
      }
      return Response.json({ error: 'Upstream error' }, { status: res.status });
    }

    const data = await res.json();
    // Normalize response - handle paginated results or direct array
    if (Array.isArray(data)) {
      return Response.json(data);
    }
    // If paginated, return the results array
    if (data.results && Array.isArray(data.results)) {
      return Response.json(data.results);
    }
    // Otherwise return as-is
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: 'Trivia service unavailable' }, { status: 502 });
  }
}
