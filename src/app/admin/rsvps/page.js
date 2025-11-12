'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/utils/context/authContext';
import { signIn } from '@/utils/auth';
import { isAdmin } from '@/utils/admin';
import { PARTY_CONFIG } from '@/config/party';

const deriveDisplayName = (record) => {
  if (!record || typeof record !== 'object') return 'Guest';
  const recordUser = record.user || {};

  const concatName = (first, last) => {
    const parts = [first, last].filter((part) => typeof part === 'string' && part.trim().length > 0);
    return parts.length ? parts.join(' ').trim() : null;
  };

  const candidates = [record.user_name, record.guest_name, record.display_name, record.name, record.guest_display_name, record.guest_full_name, record.user_full_name, record.user_display_name, record.full_name, recordUser.display_name, recordUser.displayName, concatName(recordUser.first_name, recordUser.last_name), recordUser.full_name, recordUser.name, recordUser.profile?.display_name, recordUser.profile?.name, recordUser.profile?.full_name];

  const directMatch = candidates.find((candidate) => typeof candidate === 'string' && candidate.trim().length > 0);
  if (directMatch) return directMatch.trim();

  if (typeof recordUser.email === 'string' && recordUser.email.includes('@')) {
    return recordUser.email.split('@')[0];
  }

  if (typeof recordUser.username === 'string' && recordUser.username.trim().length > 0) {
    return recordUser.username.trim();
  }

  if (typeof record.id === 'string' || typeof record.id === 'number') {
    return `Guest ${record.id}`;
  }

  return 'Guest';
};

const DELETE_BUTTON_COLOR = '#8b5cf6';
const DELETE_BUTTON_COLOR_HOVER = '#7c3aed';

export default function AdminRsvpsPage() {
  const { user, userLoading } = useAuth();
  const [rsvps, setRsvps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const userIsAdmin = isAdmin(user);

  useEffect(() => {
    const fetchRsvps = async () => {
      if (!user || !userIsAdmin) return;

      try {
        const headers = {};
        try {
          const token = await user.getIdToken();
          headers.Authorization = `Bearer ${token}`;
        } catch (tokenError) {
          console.error('Error getting token:', tokenError);
        }

        // Fetch all RSVPs
        const rsvpRes = await fetch('/api/rsvp', { headers, cache: 'no-store' });
        if (rsvpRes.ok) {
          const rsvpData = await rsvpRes.json();
          // Filter for this party
          const filtered = Array.isArray(rsvpData) ? rsvpData.filter((r) => String(r.party) === String(PARTY_CONFIG.id)) : [];
          const normalized = filtered.map((record) => ({
            ...record,
            display_name: deriveDisplayName(record),
          }));
          setRsvps(normalized);
        }

        // Note: Summary can be fetched from backend if needed
        // Currently calculating summary from RSVPs data directly
      } catch (err) {
        console.error('Error fetching RSVPs:', err);
        setError('Failed to load RSVPs');
      } finally {
        setLoading(false);
      }
    };

    if (!userLoading && user && userIsAdmin) {
      fetchRsvps();
    } else if (!userLoading) {
      setLoading(false);
    }
  }, [user, userLoading, userIsAdmin]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'yes':
        return '#10b981'; // green
      case 'maybe':
        return '#f59e0b'; // orange
      case 'no':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'yes':
        return "Yes, I'll be there! 🎉";
      case 'maybe':
        return 'Maybe 🤔';
      case 'no':
        return "Sorry, can't make it";
      default:
        return status;
    }
  };

  const handleDelete = async (id) => {
    if (!id) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm('Delete this RSVP? This action cannot be undone.')) return;

    setDeletingId(id);
    setError('');
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/rsvp/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        let body;
        try {
          body = await res.json();
        } catch (readErr) {
          body = null;
        }
        setError(body?.error || body?.detail || 'Failed to delete RSVP.');
      } else {
        setRsvps((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (deleteError) {
      console.error('Error deleting RSVP:', deleteError);
      setError('Failed to delete RSVP.');
    } finally {
      setDeletingId(null);
    }
  };

  if (userLoading || loading) {
    return (
      <main className="page">
        <PageHeader title="RSVP Admin" subtitle="View all RSVPs" />
        <div className="card">
          <p className="muted">Loading RSVPs...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="page">
        <PageHeader title="RSVP Admin" subtitle="View all RSVPs" />
        <div className="card" style={{ display: 'grid', gap: 12 }}>
          <p>Please sign in to view RSVPs.</p>
          <button type="button" onClick={signIn} className="tile tile-purple" style={{ height: 48, border: 'none' }}>
            Sign in with Google
          </button>
        </div>
      </main>
    );
  }

  if (!userIsAdmin) {
    return (
      <main className="page">
        <PageHeader title="RSVP Admin" subtitle="View all RSVPs" />
        <div className="card" style={{ display: 'grid', gap: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🔒</div>
          <h2 style={{ margin: 0 }}>Access Denied</h2>
          <p className="muted">You don&apos;t have permission to access admin features.</p>
        </div>
      </main>
    );
  }

  // Calculate summary stats if summary endpoint doesn't exist
  const normalisedRsvps = rsvps.map((item) => ({
    ...item,
    display_name: deriveDisplayName(item),
  }));

  const yesCount = normalisedRsvps.filter((r) => r.status === 'yes').length;
  const maybeCount = normalisedRsvps.filter((r) => r.status === 'maybe').length;
  const noCount = normalisedRsvps.filter((r) => r.status === 'no').length;
  const totalGuests = normalisedRsvps.filter((r) => r.status === 'yes').reduce((sum, r) => sum + (r.guest_count || 1), 0);

  return (
    <main className="page">
      <PageHeader title="RSVP Admin" subtitle="View all RSVPs for the party" />

      {error && (
        <div className="card" style={{ background: 'rgba(139, 92, 246, 0.12)', border: `1px solid ${DELETE_BUTTON_COLOR}`, marginBottom: 16 }}>
          <p style={{ color: '#4c1d95', margin: 0, fontSize: 14 }}>{error}</p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
          <div style={{ textAlign: 'center', padding: 16, background: 'rgba(16, 185, 129, 0.1)', borderRadius: 8 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#10b981' }}>{yesCount}</div>
            <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Attending</div>
          </div>
          <div style={{ textAlign: 'center', padding: 16, background: 'rgba(245, 158, 11, 0.1)', borderRadius: 8 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#f59e0b' }}>{maybeCount}</div>
            <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Maybe</div>
          </div>
          <div style={{ textAlign: 'center', padding: 16, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 8 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#ef4444' }}>{noCount}</div>
            <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Not Attending</div>
          </div>
          <div style={{ textAlign: 'center', padding: 16, background: 'rgba(139, 92, 246, 0.1)', borderRadius: 8 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#8b5cf6' }}>{totalGuests}</div>
            <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Total Guests</div>
          </div>
        </div>
      </div>

      {/* RSVP List */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>All RSVPs ({normalisedRsvps.length})</h3>
        </div>

        {normalisedRsvps.length === 0 ? (
          <p className="muted">No RSVPs yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {normalisedRsvps.map((rsvp) => (
              <div
                key={rsvp.id}
                style={{
                  padding: 16,
                  background: 'rgba(255, 255, 255, 0.5)',
                  borderRadius: 12,
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16, color: '#4338ca', marginBottom: 4 }}>{rsvp.display_name || 'Unknown Guest'}</div>
                    <div
                      style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 500,
                        background: `${getStatusColor(rsvp.status)}20`,
                        color: getStatusColor(rsvp.status),
                        border: `1px solid ${getStatusColor(rsvp.status)}`,
                      }}
                    >
                      {getStatusLabel(rsvp.status)}
                    </div>
                  </div>
                  {rsvp.status === 'yes' && rsvp.guest_count > 0 && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, color: '#6b7280' }}>Guests</div>
                      <div style={{ fontSize: 20, fontWeight: 600, color: '#8b5cf6' }}>{rsvp.guest_count}</div>
                    </div>
                  )}
                </div>

                {(rsvp.phone_number || rsvp.dietary_restrictions || rsvp.notes) && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(0, 0, 0, 0.1)' }}>
                    {rsvp.phone_number && (
                      <div style={{ fontSize: 14, marginBottom: 8 }}>
                        <strong>Phone:</strong> {rsvp.phone_number}
                      </div>
                    )}
                    {rsvp.dietary_restrictions && (
                      <div style={{ fontSize: 14, marginBottom: 8 }}>
                        <strong>Dietary Restrictions:</strong> {rsvp.dietary_restrictions}
                      </div>
                    )}
                    {rsvp.notes && (
                      <div style={{ fontSize: 14 }}>
                        <strong>Notes:</strong> {rsvp.notes}
                      </div>
                    )}
                  </div>
                )}

                {rsvp.created_at && (
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
                    RSVP submitted:{' '}
                    {new Date(rsvp.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                )}
                <div style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => handleDelete(rsvp.id)}
                    disabled={deletingId === rsvp.id}
                    style={{
                      height: 36,
                      padding: '0 12px',
                      borderRadius: 8,
                      border: 'none',
                      background: deletingId === rsvp.id ? '#d1d5db' : DELETE_BUTTON_COLOR,
                      color: '#fff',
                      fontWeight: 600,
                      cursor: deletingId === rsvp.id ? 'not-allowed' : 'pointer',
                      transition: 'background 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (deletingId !== rsvp.id) e.currentTarget.style.background = DELETE_BUTTON_COLOR_HOVER;
                    }}
                    onMouseLeave={(e) => {
                      if (deletingId !== rsvp.id) e.currentTarget.style.background = DELETE_BUTTON_COLOR;
                    }}
                  >
                    {deletingId === rsvp.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
