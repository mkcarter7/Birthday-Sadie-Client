import PageHeader from '@/components/PageHeader';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
const PARTY_ID = process.env.NEXT_PUBLIC_PARTY_ID || '1';

const FALLBACK_TIMELINE = [
  { id: 'fallback-1830', time: '18:30', activity: 'Doors Open & Check‑in', icon: '🚪', description: '' },
  { id: 'fallback-1900', time: '19:00', activity: 'Happy Birthday Toast', icon: '🥂', description: '' },
  { id: 'fallback-1930', time: '19:30', activity: 'Dinner is Served', icon: '🍽️', description: '' },
  { id: 'fallback-2015', time: '20:15', activity: 'Games & Photo Booth', icon: '🎯', description: '' },
  { id: 'fallback-2100', time: '21:00', activity: 'Cake Cutting', icon: '🎂', description: '' },
  { id: 'fallback-2130', time: '21:30', activity: 'Dancing', icon: '🕺', description: '' },
  { id: 'fallback-2245', time: '22:45', activity: 'Farewell & Party Favors', icon: '🎁', description: '' },
];

async function fetchPartyTimeline() {
  if (!API_BASE) return { events: [], error: 'API base URL is not configured.' };

  try {
    const res = await fetch(`${API_BASE}/api/parties/${PARTY_ID}/`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`Timeline request failed with status ${res.status}`);
    }

    const data = await res.json();
    const rawEvents = Array.isArray(data?.timeline_events) ? data.timeline_events : [];
    const events = rawEvents
      .filter((event) => event && (event.is_active === undefined || event.is_active === true))
      .map((event) => ({
        id: event.id ?? `${event.time}-${event.activity}`,
        time: typeof event.time === 'string' ? event.time : '',
        activity: event.activity || event.title || 'Scheduled event',
        description: event.description || '',
        icon: event.icon || '',
      }));
    return { events, error: null };
  } catch (err) {
    console.error('Failed to load party timeline', err);
    return { events: [], error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

const formatTime = (time) => {
  if (!time) return '';
  try {
    const [hours, minutes] = time.split(':').map((val) => parseInt(val, 10));
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return time;
    const date = new Date(Date.UTC(1970, 0, 1, hours, minutes));
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
    });
  } catch (err) {
    return time;
  }
};

export default async function TimelinePage() {
  const { events: fetchedEvents, error } = await fetchPartyTimeline();
  const hasRemoteEvents = fetchedEvents.length > 0;
  const events = (hasRemoteEvents ? fetchedEvents : FALLBACK_TIMELINE).slice().sort((a, b) => a.time.localeCompare(b.time));

  return (
    <main className="page">
      <PageHeader title="Timeline" subtitle="Schedule and party highlights" />
      <div className="card" style={{ display: 'grid', gap: 12 }}>
        <div style={{ fontWeight: 700 }}>Party Schedule</div>
        {error && (
          <p className="muted" style={{ margin: 0 }}>
            Showing the default schedule because the live timeline could not be loaded. ({error})
          </p>
        )}
        {!hasRemoteEvents && !error && (
          <p className="muted" style={{ margin: 0 }}>
            Timeline coming soon. Check back for the latest schedule updates.
          </p>
        )}
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
          {events.map((item) => (
            <li key={item.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 72, fontWeight: 700 }}>{formatTime(item.time)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span aria-hidden>{item.icon || '🎉'}</span>
                  <span>{item.activity}</span>
                </div>
                {item.description ? (
                  <p className="muted" style={{ margin: '4px 0 0 0' }}>
                    {item.description}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
        <p className="muted" style={{ margin: 0 }}>
          Times are approximate and subject to change.
        </p>
      </div>
    </main>
  );
}
