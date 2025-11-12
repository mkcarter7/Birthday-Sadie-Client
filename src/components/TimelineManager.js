'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '@/utils/context/authContext';
import { signIn } from '@/utils/auth';
import { isAdmin } from '@/utils/admin';
import { PARTY_CONFIG } from '@/config/party';
import PropTypes from 'prop-types';

const formatToLocalInputTime = (time) => {
  if (!time) return '';
  if (time.length === 5 && time.includes(':')) return time;
  const [hours, minutes] = time.split(':');
  if (hours && minutes) return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  return '';
};

const formatToApiTime = (time) => {
  if (!time) return null;
  if (/^\d{2}:\d{2}:\d{2}$/.test(time)) return time;
  if (/^\d{2}:\d{2}$/.test(time)) return `${time}:00`;
  return time;
};

const defaultForm = {
  id: null,
  time: '',
  activity: '',
  description: '',
  icon: '',
  duration_minutes: '',
  is_active: true,
};

const DELETE_BUTTON_COLOR = '#8b5cf6';
const DELETE_BUTTON_COLOR_HOVER = '#7c3aed';

export default function TimelineManager({ cardStyle = {} }) {
  const { user, userLoading } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const userIsAdmin = useMemo(() => isAdmin(user), [user]);

  const loadEvents = useCallback(async () => {
    if (!user || !userIsAdmin) return;
    setLoading(true);
    setError('');
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/timeline-events?party=${PARTY_CONFIG.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to load timeline events (${res.status})`);
      }

      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.results || [];
      const normalized = list
        .map((event) => ({
          id: event.id,
          time: formatToLocalInputTime(event.time),
          activity: event.activity || event.title || '',
          description: event.description || '',
          icon: event.icon || '',
          duration_minutes: event.duration_minutes ?? '',
          is_active: event.is_active !== false,
        }))
        .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      setEvents(normalized);
    } catch (err) {
      setError(err.message || 'Unable to load timeline events');
    } finally {
      setLoading(false);
    }
  }, [user, userIsAdmin]);

  useEffect(() => {
    if (!userLoading && user && userIsAdmin) {
      loadEvents();
    } else if (!userLoading && !userIsAdmin) {
      setLoading(false);
    }
  }, [user, userLoading, userIsAdmin, loadEvents]);

  const resetForm = () => {
    setForm(defaultForm);
  };

  const handleEdit = (entry) => {
    setForm({
      id: entry.id,
      time: entry.time || '',
      activity: entry.activity || '',
      description: entry.description || '',
      icon: entry.icon || '',
      duration_minutes: entry.duration_minutes ?? '',
      is_active: entry.is_active !== false,
    });
    setSuccessMessage('');
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: field === 'is_active' ? Boolean(value) : value,
    }));
  };

  const submitForm = async (event) => {
    event.preventDefault();
    if (!user) return;

    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      const token = await user.getIdToken();
      const payload = {
        party: PARTY_CONFIG.id,
        time: formatToApiTime(form.time),
        activity: form.activity,
        description: form.description,
        icon: form.icon,
        duration_minutes: form.duration_minutes === '' ? null : Number(form.duration_minutes),
        is_active: form.is_active,
      };

      const requestOptions = {
        method: form.id ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      };

      const endpoint = form.id ? `/api/timeline-events/${form.id}` : `/api/timeline-events`;
      const res = await fetch(endpoint, requestOptions);
      const text = await res.text();
      let responseBody = null;
      if (text) {
        try {
          responseBody = JSON.parse(text);
        } catch (e) {
          responseBody = text;
        }
      }

      if (!res.ok) {
        const message = typeof responseBody === 'string' ? responseBody : responseBody?.error || responseBody?.detail || 'Failed to save event';
        throw new Error(message);
      }

      setSuccessMessage(form.id ? 'Timeline event updated.' : 'Timeline event added.');
      resetForm();
      await loadEvents();
    } catch (err) {
      setError(err.message || 'Unable to save timeline event');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!user || !id) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm('Delete this timeline entry? This action cannot be undone.')) return;

    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/timeline-events/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to delete timeline event');
      }

      setSuccessMessage('Timeline event deleted.');
      if (form.id === id) {
        resetForm();
      }
      await loadEvents();
    } catch (err) {
      setError(err.message || 'Unable to delete timeline event');
    } finally {
      setSubmitting(false);
    }
  };

  if (userLoading || loading) {
    return (
      <div className="card" style={{ marginBottom: 16, ...cardStyle }}>
        <p className="muted" style={{ margin: 0 }}>
          Loading timeline events…
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="card" style={{ marginBottom: 16, display: 'grid', gap: 12, ...cardStyle }}>
        <p>This section requires admin access.</p>
        <button type="button" onClick={signIn} className="tile tile-purple" style={{ height: 48, border: 'none' }}>
          Sign in with Google
        </button>
      </div>
    );
  }

  if (!userIsAdmin) {
    return (
      <div className="card" style={{ marginBottom: 16, display: 'grid', gap: 12, textAlign: 'center', ...cardStyle }}>
        <div style={{ fontSize: 48 }}>🔒</div>
        <h3 style={{ margin: 0 }}>Timeline Admin</h3>
        <p className="muted">You don&apos;t have permission to manage the timeline.</p>
      </div>
    );
  }

  let eventsContent;
  if (events.length === 0) {
    eventsContent = (
      <p className="muted" style={{ margin: 0 }}>
        No timeline events yet. Add the first event using the form above.
      </p>
    );
  } else {
    eventsContent = (
      <div style={{ display: 'grid', gap: 10 }}>
        {events.map((event) => (
          <div
            key={event.id}
            style={{
              display: 'grid',
              gap: 6,
              padding: 12,
              borderRadius: 12,
              border: '1px solid rgba(0, 0, 0, 0.08)',
              background: event.is_active ? 'rgba(139, 92, 246, 0.08)' : 'rgba(229, 231, 235, 0.4)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontWeight: 700, minWidth: 72 }}>{event.time}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span aria-hidden>{event.icon || '🎉'}</span>
                  <span style={{ fontWeight: 600 }}>{event.activity}</span>
                </div>
                {!event.is_active && <span style={{ fontSize: 12, color: '#ef4444' }}>Hidden</span>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => handleEdit(event)} className="tile tile-purple" style={{ height: 36, border: 'none', padding: '0 12px' }} disabled={submitting}>
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(event.id)}
                  className="tile"
                  style={{
                    height: 36,
                    padding: '0 12px',
                    background: submitting ? '#d1d5db' : DELETE_BUTTON_COLOR,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s ease',
                  }}
                  disabled={submitting}
                  onMouseEnter={(e) => {
                    if (!submitting) e.currentTarget.style.background = DELETE_BUTTON_COLOR_HOVER;
                  }}
                  onMouseLeave={(e) => {
                    if (!submitting) e.currentTarget.style.background = DELETE_BUTTON_COLOR;
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
            {event.description && (
              <p className="muted" style={{ margin: 0 }}>
                {event.description}
              </p>
            )}
            {event.duration_minutes ? (
              <p className="muted" style={{ margin: 0 }}>
                Duration: {event.duration_minutes} min
              </p>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  let submitLabel;
  if (submitting) {
    submitLabel = 'Saving…';
  } else if (form.id) {
    submitLabel = 'Update Event';
  } else {
    submitLabel = 'Add Event';
  }

  return (
    <>
      {error && (
        <div className="card" style={{ background: 'rgba(139, 92, 246, 0.12)', border: `1px solid ${DELETE_BUTTON_COLOR}`, marginBottom: 16, ...cardStyle }}>
          <p style={{ margin: 0, color: '#b91c1c' }}>{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="card" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', marginBottom: 16, ...cardStyle }}>
          <p style={{ margin: 0, color: '#047857' }}>{successMessage}</p>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16, display: 'grid', gap: 16, ...cardStyle }}>
        <h3 style={{ margin: 0 }}>{form.id ? 'Edit Timeline Event' : 'Add Timeline Event'}</h3>
        <form onSubmit={submitForm} style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gap: 4 }}>
            <label htmlFor="timeline-time" style={{ fontWeight: 600 }}>
              Time *
            </label>
            <input id="timeline-time" type="time" value={form.time} onChange={(e) => handleChange('time', e.target.value)} required style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} />
          </div>

          <div style={{ display: 'grid', gap: 4 }}>
            <label htmlFor="timeline-activity" style={{ fontWeight: 600 }}>
              Activity *
            </label>
            <input id="timeline-activity" type="text" value={form.activity} onChange={(e) => handleChange('activity', e.target.value)} required placeholder="e.g. Cake Cutting" style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} />
          </div>

          <div style={{ display: 'grid', gap: 4 }}>
            <label htmlFor="timeline-description" style={{ fontWeight: 600 }}>
              Description
            </label>
            <textarea id="timeline-description" value={form.description} onChange={(e) => handleChange('description', e.target.value)} rows={3} placeholder="Optional details shown under the activity" style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db', resize: 'vertical', fontFamily: 'inherit' }} />
          </div>

          <div style={{ display: 'grid', gap: 4 }}>
            <label htmlFor="timeline-icon" style={{ fontWeight: 600 }}>
              Icon
            </label>
            <input id="timeline-icon" type="text" value={form.icon} onChange={(e) => handleChange('icon', e.target.value)} placeholder="Emoji or short text (e.g. 🎂)" style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} />
          </div>

          <div style={{ display: 'grid', gap: 4 }}>
            <label htmlFor="timeline-duration" style={{ fontWeight: 600 }}>
              Duration (minutes)
            </label>
            <input id="timeline-duration" type="number" min="0" value={form.duration_minutes} onChange={(e) => handleChange('duration_minutes', e.target.value)} placeholder="Optional" style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={form.is_active} onChange={(e) => handleChange('is_active', e.target.checked)} />
            Show this event on the public timeline
          </label>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={submitting} className="tile tile-purple" style={{ height: 44, border: 'none', minWidth: 140 }}>
              {submitLabel}
            </button>
            {form.id && (
              <button type="button" onClick={resetForm} disabled={submitting} className="tile" style={{ height: 44, minWidth: 120 }}>
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card" style={{ display: 'grid', gap: 12, ...cardStyle }}>
        <h3 style={{ margin: 0 }}>Current Timeline</h3>
        {eventsContent}
      </div>
    </>
  );
}

TimelineManager.propTypes = {
  cardStyle: PropTypes.objectOf(PropTypes.oneOfType([PropTypes.number, PropTypes.string])),
};
