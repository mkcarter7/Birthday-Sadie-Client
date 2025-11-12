'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/utils/context/authContext';
import { signIn } from '@/utils/auth';
import { isAdmin } from '@/utils/admin';
import { PARTY_CONFIG } from '@/config/party';
import { getLeaderboard } from '@/utils/gameScores';
import TimelineManager from '@/components/TimelineManager';
import { getPhotoDisplayName, getPhotoOwnerEmail, getPhotoOwnerUid, getPhotoSource } from '@/utils/photos';

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

export default function AdminDashboard() {
  const { user, userLoading } = useAuth();
  const [stats, setStats] = useState({
    rsvps: { total: 0, yes: 0, maybe: 0, no: 0, totalGuests: 0 },
    guestbook: { total: 0 },
    photos: { total: 0 },
    games: { totalPlayers: 0, totalPoints: 0, averagePoints: 0 },
    loading: true,
  });
  const [rsvps, setRsvps] = useState([]);
  const [messages, setMessages] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [deletingMsgId, setDeletingMsgId] = useState(null);
  const [deletingRsvpId, setDeletingRsvpId] = useState(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState(null);
  const [rsvpActionError, setRsvpActionError] = useState('');
  const [photoActionError, setPhotoActionError] = useState('');
  const [photoSuccessMessage, setPhotoSuccessMessage] = useState('');

  const userIsAdmin = isAdmin(user);

  const updateRsvpStatsFromList = (list) => {
    const yes = list.filter((r) => r.status === 'yes').length;
    const maybe = list.filter((r) => r.status === 'maybe').length;
    const no = list.filter((r) => r.status === 'no').length;
    const totalGuests = list.filter((r) => r.status === 'yes').reduce((sum, r) => sum + (r.guest_count || 1), 0);

    setStats((prev) => ({
      ...prev,
      rsvps: {
        total: list.length,
        yes,
        maybe,
        no,
        totalGuests,
      },
    }));
  };

  useEffect(() => {
    const fetchAllData = async () => {
      if (!user || !userIsAdmin) return;

      try {
        const headers = {};
        setPhotoActionError('');
        setPhotoSuccessMessage('');
        try {
          const token = await user.getIdToken();
          headers.Authorization = `Bearer ${token}`;
        } catch (tokenError) {
          console.error('Error getting token:', tokenError);
        }

        // Fetch RSVPs with full data
        try {
          const rsvpRes = await fetch('/api/rsvp', { headers, cache: 'no-store' });
          if (rsvpRes.ok) {
            const rsvpData = await rsvpRes.json();
            const filtered = Array.isArray(rsvpData) ? rsvpData.filter((r) => String(r.party) === String(PARTY_CONFIG.id)) : [];

            // Sort by created_at, newest first
            filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
            const normalized = filtered.map((record) => ({
              ...record,
              display_name: deriveDisplayName(record),
            }));
            setRsvps(normalized);
            updateRsvpStatsFromList(normalized);
            setRsvpActionError('');
          }
        } catch (e) {
          console.error('Error fetching RSVPs:', e);
        }

        // Fetch Guestbook messages with full data
        try {
          const guestbookRes = await fetch('/api/guestbook', { headers });
          if (guestbookRes.ok) {
            const guestbookData = await guestbookRes.json();
            const filtered = Array.isArray(guestbookData) ? guestbookData.filter((m) => String(m.party) === String(PARTY_CONFIG.id) && !m.deleted && !m.is_deleted) : [];

            // Sort by created_at, newest first
            filtered.sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0));
            setMessages(filtered);

            setStats((prev) => ({
              ...prev,
              guestbook: { total: filtered.length },
            }));
          }
        } catch (e) {
          console.error('Error fetching guestbook:', e);
        }

        // Fetch Photos
        try {
          const photosRes = await fetch('/api/photos', { headers, cache: 'no-store' });
          if (photosRes.ok) {
            const photosData = await photosRes.json();
            const list = Array.isArray(photosData) ? photosData : photosData?.photos || photosData?.results || [];
            const normalizedPhotos = list
              .map((photo) => ({
                id: photo.id,
                src: getPhotoSource(photo),
                uploader: getPhotoDisplayName(photo),
                ownerUid: getPhotoOwnerUid(photo),
                ownerEmail: getPhotoOwnerEmail(photo),
              }))
              .filter((photo) => photo.src)
              .sort((a, b) => String(b.id).localeCompare(String(a.id)));
            setPhotos(normalizedPhotos);
            setStats((prev) => ({
              ...prev,
              photos: { total: normalizedPhotos.length },
            }));
          }
        } catch (e) {
          console.error('Error fetching photos:', e);
        }

        // Fetch Game Leaderboard and Stats
        try {
          const lb = await getLeaderboard(user, PARTY_CONFIG.id);
          setLeaderboard(lb);

          // Calculate game stats
          const totalPlayers = lb.length;
          const totalPoints = lb.reduce((sum, entry) => sum + (entry.points || 0), 0);
          const averagePoints = totalPlayers > 0 ? Math.round(totalPoints / totalPlayers) : 0;

          setStats((prev) => ({
            ...prev,
            games: { totalPlayers, totalPoints, averagePoints },
          }));
        } catch (e) {
          console.error('Error fetching leaderboard:', e);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setStats((prev) => ({ ...prev, loading: false }));
        setLoadingData(false);
      }
    };

    if (!userLoading && user && userIsAdmin) {
      fetchAllData();
    } else if (!userLoading) {
      setStats((prev) => ({ ...prev, loading: false }));
      setLoadingData(false);
    }
  }, [user, userLoading, userIsAdmin]);

  // Helper functions for RSVP display
  const getStatusColor = (status) => {
    switch (status) {
      case 'yes':
        return '#10b981';
      case 'maybe':
        return '#f59e0b';
      case 'no':
        return '#ef4444';
      default:
        return '#6b7280';
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

  const handleDeleteRsvp = async (rsvpId) => {
    if (!rsvpId) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm('Delete this RSVP? This action cannot be undone.')) {
      return;
    }

    setDeletingRsvpId(rsvpId);
    setRsvpActionError('');

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/rsvp/${rsvpId}`, {
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
        setRsvpActionError(body?.error || body?.detail || 'Failed to delete RSVP.');
      } else {
        setRsvps((prev) => {
          const updated = prev.filter((r) => r.id !== rsvpId);
          updateRsvpStatsFromList(updated.map((record) => ({ ...record, display_name: deriveDisplayName(record) })));
          return updated;
        });
      }
    } catch (err) {
      console.error('Error deleting RSVP:', err);
      setRsvpActionError('Failed to delete RSVP.');
    } finally {
      setDeletingRsvpId(null);
    }
  };

  const handleDeleteMessage = async (msgId) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
      return;
    }

    setDeletingMsgId(msgId);

    try {
      if (!user) {
        alert('You must be signed in to delete messages.');
        setDeletingMsgId(null);
        return;
      }

      const token = await user.getIdToken(true);

      const res = await fetch(`/api/guestbook/${msgId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json().catch(() => ({})); // Get JSON or empty object

      if (res.ok) {
        // Remove the message from the list
        setMessages(messages.filter((msg) => msg.id !== msgId));
      } else {
        console.error('Admin Dashboard - Delete failed:', {
          status: res.status,
          statusText: res.statusText,
          data,
          is_admin: data.is_admin,
          is_author: data.is_author,
          user_id: data.user_id,
          username: data.username,
          messageId: msgId,
          userEmail: user.email,
          userUid: user.uid,
        });

        let errorMessage = data.error || data.detail || data.message || 'Failed to delete message.';
        const errorDetails = data.details || '';

        if (res.status === 403) {
          errorMessage += '\n\n⚠️ 403 Forbidden Error';
          errorMessage += '\n\nThe backend is rejecting the delete request.';
          if (data.is_admin !== undefined) {
            errorMessage += `\n\nBackend says you are admin: ${data.is_admin}`;
          }
          if (data.is_author !== undefined) {
            errorMessage += `\nBackend says you are author: ${data.is_author}`;
          }
          if (errorDetails) {
            errorMessage += `\n\nBackend error: ${errorDetails}`;
          }
        }

        alert(`${errorMessage}\n\nStatus: ${res.status}${errorDetails ? `\nDetails: ${errorDetails}` : ''}`);
      }
    } catch (err) {
      console.error('Error deleting message:', err);
      alert('Failed to delete message. Please try again.');
    } finally {
      setDeletingMsgId(null);
    }
  };

  const handleDeletePhoto = async (photo) => {
    if (!user) {
      signIn();
      return;
    }

    const photoId = photo?.id;
    if (!photoId) {
      setPhotoActionError('Photo id is missing.');
      return;
    }

    setPhotoActionError('');
    setPhotoSuccessMessage('');
    setDeletingPhotoId(photoId);

    try {
      const token = await user.getIdToken();
      if (!token) throw new Error('Could not authenticate your request.');

      const res = await fetch(`/api/photos/${photoId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        let errorMessage = 'Failed to delete photo';
        try {
          const text = await res.text();
          if (text) {
            try {
              const json = JSON.parse(text);
              errorMessage = json.error || json.detail || json.message || text;
              // Handle nested JSON strings
              if (typeof errorMessage === 'string' && errorMessage.startsWith('{')) {
                try {
                  const nested = JSON.parse(errorMessage);
                  errorMessage = nested.detail || nested.error || errorMessage;
                } catch (e) {
                  // Keep original if nested parse fails
                }
              }
            } catch (e) {
              errorMessage = text;
            }
          }
        } catch (error) {
          errorMessage = `Failed to delete photo (status ${res.status})`;
        }
        throw new Error(errorMessage);
      }

      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      setPhotoSuccessMessage('Photo deleted successfully');
    } catch (error) {
      setPhotoActionError(error.message || 'Unable to delete photo');
    } finally {
      setDeletingPhotoId(null);
    }
  };

  // Helper function to get author name from message
  const getAuthorName = (msg) => {
    if (msg.name && msg.name.trim()) return msg.name.trim();
    if (msg.author_name && msg.author_name.trim()) return msg.author_name.trim();
    if (msg.full_name && msg.full_name.trim()) return msg.full_name.trim();
    if (msg.author && typeof msg.author === 'object') {
      if (msg.author.first_name && msg.author.last_name) {
        return `${msg.author.first_name} ${msg.author.last_name}`.trim();
      }
      if (msg.author.first_name) return msg.author.first_name.trim();
      if (msg.author.username) return msg.author.username.trim();
      if (msg.author.email) return msg.author.email.split('@')[0];
    }
    if (msg.author_username) return msg.author_username.trim();
    if (typeof msg.author === 'string') return msg.author.trim();
    return 'Anonymous';
  };

  if (userLoading || loadingData || stats.loading) {
    return (
      <main className="page">
        <PageHeader title="Admin Dashboard" subtitle="Party management and statistics" />
        <div className="card">
          <p className="muted">Loading dashboard data...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="page">
        <PageHeader title="Admin Dashboard" subtitle="Party management and statistics" />
        <div className="card" style={{ display: 'grid', gap: 12 }}>
          <p>Please sign in to access the admin dashboard.</p>
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
        <PageHeader title="Admin Dashboard" subtitle="Party management and statistics" />
        <div className="card" style={{ display: 'grid', gap: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🔒</div>
          <h2 style={{ margin: 0 }}>Access Denied</h2>
          <p className="muted">You don&apos;t have permission to access the admin dashboard.</p>
          <p style={{ fontSize: 12, color: '#6b7280' }}>If you believe this is an error, please contact the party administrator.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <PageHeader title="Admin Dashboard" subtitle="Complete party overview and management" />

      {/* Quick Stats */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, marginBottom: 16 }}>Quick Stats</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
          <div style={{ textAlign: 'center', padding: 16, background: 'rgba(139, 92, 246, 0.1)', borderRadius: 8 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#8b5cf6' }}>{stats.rsvps.total}</div>
            <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Total RSVPs</div>
          </div>
          <div style={{ textAlign: 'center', padding: 16, background: 'rgba(16, 185, 129, 0.1)', borderRadius: 8 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#10b981' }}>{stats.rsvps.totalGuests}</div>
            <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Total Guests</div>
          </div>
          <div style={{ textAlign: 'center', padding: 16, background: 'rgba(34, 197, 94, 0.1)', borderRadius: 8 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#22c55e' }}>{stats.photos.total}</div>
            <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Uploaded Photos</div>
          </div>
          <div style={{ textAlign: 'center', padding: 16, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 8 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#3b82f6' }}>{stats.guestbook.total}</div>
            <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Guestbook Messages</div>
          </div>
          <div style={{ textAlign: 'center', padding: 16, background: 'rgba(245, 158, 11, 0.1)', borderRadius: 8 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#f59e0b' }}>{stats.games.totalPlayers}</div>
            <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Game Players</div>
          </div>
          <div style={{ textAlign: 'center', padding: 16, background: 'rgba(236, 72, 153, 0.1)', borderRadius: 8 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#ec4899' }}>{stats.games.totalPoints}</div>
            <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Total Points</div>
          </div>
          {stats.games.totalPlayers > 0 && (
            <div style={{ textAlign: 'center', padding: 16, background: 'rgba(139, 92, 246, 0.1)', borderRadius: 8 }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#8b5cf6' }}>{stats.games.averagePoints}</div>
              <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Avg Points/Player</div>
            </div>
          )}
        </div>
      </div>

      {/* RSVP Breakdown */}
      {stats.rsvps.total > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>RSVP Breakdown</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
            <div style={{ textAlign: 'center', padding: 12, background: 'rgba(16, 185, 129, 0.1)', borderRadius: 8 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981' }}>{stats.rsvps.yes}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Attending</div>
            </div>
            <div style={{ textAlign: 'center', padding: 12, background: 'rgba(245, 158, 11, 0.1)', borderRadius: 8 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b' }}>{stats.rsvps.maybe}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Maybe</div>
            </div>
            <div style={{ textAlign: 'center', padding: 12, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 8 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444' }}>{stats.rsvps.no}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Not Attending</div>
            </div>
          </div>
        </div>
      )}

      {/* All RSVPs */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>All RSVPs ({rsvps.length})</h3>
          <Link href="/admin/rsvps" style={{ fontSize: 14, color: '#8b5cf6', textDecoration: 'none' }}>
            View detailed view →
          </Link>
        </div>

        {rsvpActionError && <div style={{ background: 'rgba(139,92,246,0.12)', border: `1px solid ${DELETE_BUTTON_COLOR}`, color: '#6b21a8', padding: 8, borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{rsvpActionError}</div>}
        {rsvps.length === 0 ? (
          <p className="muted">No RSVPs yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: 12, maxHeight: '600px', overflowY: 'auto' }}>
            {rsvps.map((rsvp) => (
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
                    onClick={() => handleDeleteRsvp(rsvp.id)}
                    disabled={deletingRsvpId === rsvp.id}
                    style={{
                      height: 36,
                      padding: '0 12px',
                      border: 'none',
                      borderRadius: 8,
                      background: deletingRsvpId === rsvp.id ? '#d1d5db' : DELETE_BUTTON_COLOR,
                      color: '#fff',
                      fontWeight: 600,
                      cursor: deletingRsvpId === rsvp.id ? 'not-allowed' : 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      if (deletingRsvpId !== rsvp.id) e.currentTarget.style.background = DELETE_BUTTON_COLOR_HOVER;
                    }}
                    onMouseLeave={(e) => {
                      if (deletingRsvpId !== rsvp.id) e.currentTarget.style.background = DELETE_BUTTON_COLOR;
                    }}
                  >
                    {deletingRsvpId === rsvp.id ? 'Deleting…' : 'Delete RSVP'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Game Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>Game Leaderboard (Top {Math.min(leaderboard.length, 10)})</h3>
            <Link href="/games" style={{ fontSize: 14, color: '#8b5cf6', textDecoration: 'none' }}>
              View full leaderboard →
            </Link>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {leaderboard.slice(0, 10).map((entry, index) => (
              <div
                key={entry.id || index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 12,
                  background: index < 3 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255, 255, 255, 0.5)',
                  borderRadius: 8,
                  border: index < 3 ? '2px solid #f59e0b' : '1px solid rgba(0, 0, 0, 0.1)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: (() => {
                        if (index === 0) return '#fbbf24';
                        if (index === 1) return '#94a3b8';
                        if (index === 2) return '#f97316';
                        return 'rgba(139, 92, 246, 0.2)';
                      })(),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 14,
                      color: index < 3 ? '#fff' : '#8b5cf6',
                    }}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{entry.user_name || entry.user?.username || entry.user_email || `Player ${index + 1}`}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Level {entry.level || 1}</div>
                  </div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#8b5cf6' }}>{entry.points || 0}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Guestbook Messages */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Guestbook Messages ({messages.length})</h3>
          <Link href="/guestbook" style={{ fontSize: 14, color: '#8b5cf6', textDecoration: 'none' }}>
            View guestbook as guest →
          </Link>
        </div>

        {messages.length === 0 ? (
          <p className="muted">No guestbook messages yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  padding: 16,
                  background: 'rgba(255, 255, 255, 0.5)',
                  borderRadius: 12,
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 16, color: '#4338ca' }}>{getAuthorName(msg)}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {msg.created_at && (
                      <div style={{ fontSize: 12, color: '#6b7280' }}>
                        {new Date(msg.created_at || msg.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteMessage(msg.id)}
                      disabled={deletingMsgId === msg.id}
                      style={{
                        background: DELETE_BUTTON_COLOR,
                        border: `1px solid ${DELETE_BUTTON_COLOR}`,
                        color: 'white',
                        cursor: deletingMsgId === msg.id ? 'not-allowed' : 'pointer',
                        fontSize: 12,
                        padding: '4px 8px',
                        borderRadius: 6,
                        fontWeight: 500,
                        opacity: deletingMsgId === msg.id ? 0.6 : 1,
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (deletingMsgId !== msg.id) {
                          e.target.style.background = DELETE_BUTTON_COLOR_HOVER;
                          e.target.style.border = `1px solid ${DELETE_BUTTON_COLOR_HOVER}`;
                          e.target.style.transform = 'scale(1.05)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = DELETE_BUTTON_COLOR;
                        e.target.style.border = `1px solid ${DELETE_BUTTON_COLOR}`;
                        e.target.style.transform = 'scale(1)';
                      }}
                      title="Delete this message"
                    >
                      {deletingMsgId === msg.id ? '⏳' : '🗑️'}
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{msg.message || msg.text || 'No message content'}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TimelineManager cardStyle={{}} />

      <div className="card" style={{ marginBottom: 16, display: 'grid', gap: 12 }}>
        <h3 style={{ margin: 0 }}>Uploaded Photos ({photos.length})</h3>
        {photoActionError && <div style={{ background: 'rgba(139, 92, 246, 0.12)', border: `1px solid ${DELETE_BUTTON_COLOR}`, color: '#6b21a8', padding: 8, borderRadius: 8, fontSize: 13 }}>{photoActionError}</div>}
        {photoSuccessMessage && <div style={{ background: 'rgba(139, 92, 246, 0.08)', border: `1px solid ${DELETE_BUTTON_COLOR}`, color: '#4c1d95', padding: 8, borderRadius: 8, fontSize: 13 }}>{photoSuccessMessage}</div>}
        {photos.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No photos uploaded yet.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            {photos.map((photo) => (
              <div
                key={photo.id}
                style={{
                  padding: 12,
                  display: 'grid',
                  gap: 8,
                  borderRadius: 12,
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  background: 'rgba(255, 255, 255, 0.6)',
                }}
              >
                <div style={{ position: 'relative', width: '100%', paddingBottom: '75%', overflow: 'hidden', borderRadius: 8, background: '#f3f4f6' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.src} alt={photo.uploader || `Photo ${photo.id}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Uploaded by {photo.uploader || 'Guest'}</div>
                <button
                  type="button"
                  onClick={() => handleDeletePhoto(photo)}
                  disabled={deletingPhotoId === photo.id}
                  className="tile"
                  style={{
                    height: 36,
                    border: 'none',
                    background: deletingPhotoId === photo.id ? '#d1d5db' : DELETE_BUTTON_COLOR,
                    color: '#fff',
                    fontWeight: 600,
                    cursor: deletingPhotoId === photo.id ? 'not-allowed' : 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    if (deletingPhotoId !== photo.id) e.currentTarget.style.background = DELETE_BUTTON_COLOR_HOVER;
                  }}
                  onMouseLeave={(e) => {
                    if (deletingPhotoId !== photo.id) e.currentTarget.style.background = DELETE_BUTTON_COLOR;
                  }}
                >
                  {deletingPhotoId === photo.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
