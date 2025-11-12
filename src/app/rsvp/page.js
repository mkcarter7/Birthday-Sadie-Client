'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/utils/context/authContext';
import { signIn } from '@/utils/auth';
import { PARTY_CONFIG } from '@/config/party';

export default function RsvpPage() {
  const { user, userLoading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  const [guestCount, setGuestCount] = useState(1);
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [existingRsvp, setExistingRsvp] = useState(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) {
      setGuestName('');
      setExistingRsvp(null);
      setStatus('');
      setGuestCount(1);
      setDietaryRestrictions('');
      setPhoneNumber('');
      setNotes('');
      return;
    }

    setGuestName((prev) => {
      if (prev && prev.trim().length > 0) return prev;
      const fallbackName = user.displayName || user.fullName || user.email?.split('@')?.[0] || '';
      return fallbackName;
    });
  }, [user]);

  useEffect(() => {
    const loadExisting = async () => {
      if (!user) return;
      setLoadingExisting(true);
      setError('');

      try {
        const token = await user.getIdToken(true);
        const res = await fetch('/api/rsvp?mine=true', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
        });

        if (!res.ok) {
          // Ignore 404/403; treat as no RSVP
          setExistingRsvp(null);
          return;
        }

        const payload = await res.json();
        let record = null;
        if (Array.isArray(payload)) {
          record = payload.find((item) => String(item.party) === String(PARTY_CONFIG.id)) || payload[0] || null;
        } else if (payload && typeof payload === 'object') {
          const maybeList = payload?.results || payload?.rsvps;
          if (Array.isArray(maybeList)) {
            record = maybeList.find((item) => String(item.party) === String(PARTY_CONFIG.id)) || maybeList[0] || null;
          } else if (!payload.party || String(payload.party) === String(PARTY_CONFIG.id)) {
            record = payload;
          }
        }

        if (record) {
          setExistingRsvp(record);
          setStatus(record.status || '');
          setGuestCount(record.guest_count && Number.isInteger(record.guest_count) ? record.guest_count : 1);
          setDietaryRestrictions(record.dietary_restrictions || '');
          setPhoneNumber(record.phone_number || '');
          setNotes(record.notes || '');
          const nameFromRecord = record.user_name || record.guest_name || record.name || '';
          if (nameFromRecord) {
            setGuestName(nameFromRecord);
          }
        } else {
          setExistingRsvp(null);
        }
      } catch (fetchError) {
        console.error('Error loading existing RSVP:', fetchError);
      } finally {
        setLoadingExisting(false);
      }
    };

    if (user && !userLoading) {
      loadExisting();
    }
  }, [user, userLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setError('Please sign in to RSVP');
      return;
    }

    if (!status) {
      setError('Please let us know if you will attend');
      return;
    }

    const trimmedName = guestName.trim();
    if (!trimmedName) {
      setError('Please provide the name for your RSVP');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess(false);

    try {
      if (!user) {
        setError('You must be signed in to RSVP. Please sign in again.');
        return;
      }

      // Get a fresh token
      let token;
      try {
        token = await user.getIdToken(true);
        if (!token) {
          throw new Error('Failed to get authentication token');
        }
      } catch (tokenError) {
        console.error('Token error:', tokenError);
        setError('Authentication error. Please try signing out and signing back in.');
        return;
      }

      const namePayload = trimmedName;
      const payload = {
        status,
        guest_count: status === 'yes' ? guestCount : 1,
        dietary_restrictions: dietaryRestrictions.trim() || '',
        phone_number: phoneNumber.trim() || '',
        notes: notes.trim() || '',
        party: PARTY_CONFIG.id,
        name: namePayload,
        display_name: namePayload,
        user_name: namePayload,
        user_full_name: namePayload,
        user_display_name: namePayload,
        guest_name: namePayload,
        guest_full_name: namePayload,
        guest_display_name: namePayload,
        rsvp_name: namePayload,
        contact_name: namePayload,
      };

      const uniquePayload = Object.fromEntries(Object.entries(payload).filter(([, value]) => typeof value === 'string' && value.trim().length > 0));

      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(uniquePayload),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setError('');
        const responseRecord = data?.id ? data : data?.rsvp || data;
        const finalRecord = responseRecord && typeof responseRecord === 'object' ? responseRecord : null;

        if (finalRecord) {
          setExistingRsvp(finalRecord);
          setStatus(finalRecord.status || '');
          setGuestCount(finalRecord.guest_count && Number.isInteger(finalRecord.guest_count) ? finalRecord.guest_count : 1);
          setDietaryRestrictions(finalRecord.dietary_restrictions || '');
          setPhoneNumber(finalRecord.phone_number || '');
          setNotes(finalRecord.notes || '');
          const savedName = finalRecord.user_name || finalRecord.guest_name || finalRecord.name || trimmedName;
          setGuestName(savedName);
        } else {
          setExistingRsvp(null);
          setStatus('');
          setGuestCount(1);
          setDietaryRestrictions('');
          setPhoneNumber('');
          setNotes('');
          setGuestName('');
        }
        // Reset success message after 5 seconds
        setTimeout(() => setSuccess(false), 5000);
      } else if (res.status === 403 || res.status === 401) {
        setError(data.error || 'You do not have permission to RSVP.');
      } else {
        setError(data.error || data.details || 'Failed to submit RSVP. Please try again.');
      }
    } catch (err) {
      console.error('Error submitting RSVP:', err);
      setError('Failed to submit RSVP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!existingRsvp?.id || !user) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm('Remove your RSVP? This cannot be undone.')) return;

    setDeleting(true);
    setError('');
    setSuccess(false);

    try {
      const token = await user.getIdToken(true);
      const res = await fetch(`/api/rsvp/${existingRsvp.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setExistingRsvp(null);
        setStatus('');
        setGuestCount(1);
        setDietaryRestrictions('');
        setPhoneNumber('');
        setNotes('');
        setGuestName('');
      } else {
        let body;
        try {
          body = await res.json();
        } catch (readErr) {
          body = null;
        }
        setError(body?.error || body?.detail || 'Failed to delete RSVP. Please try again.');
      }
    } catch (deleteError) {
      console.error('Error deleting RSVP:', deleteError);
      setError('Failed to delete RSVP. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  if (userLoading) {
    return (
      <main className="page">
        <PageHeader title="RSVP for Party" subtitle="Let us know if you can make it" />
        <div className="card">
          <p className="muted">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <PageHeader title="RSVP for Party" subtitle="Let us know if you can make it" />

      {error && (
        <div className="card" style={{ background: 'rgba(139, 92, 246, 0.12)', border: '1px solid #8b5cf6', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <p style={{ color: '#4c1d95', margin: 0, fontSize: 14, flex: 1 }}>{error}</p>
            <button
              type="button"
              onClick={() => setError('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#4c1d95',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="card" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', marginBottom: 16 }}>
          <p style={{ color: '#10b981', margin: 0, fontSize: 14 }}>✅ Thank you! Your RSVP has been received. We&apos;re looking forward to seeing you!</p>
        </div>
      )}

      {!user ? (
        <div className="card" style={{ display: 'grid', gap: 12 }}>
          <p>Sign in to RSVP for {PARTY_CONFIG.name}!</p>
          <button type="button" onClick={signIn} className="tile tile-purple" style={{ height: 48, border: 'none' }}>
            Sign in with Google
          </button>
        </div>
      ) : (
        <div className="card" style={{ display: 'grid', gap: 16 }}>
          <h3>RSVP Form</h3>
          {loadingExisting && <div className="muted">Checking for existing RSVP…</div>}
          {!loadingExisting && existingRsvp && (
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: 12, borderRadius: 8, border: '1px solid rgba(59,130,246,0.3)' }}>
              <div style={{ fontSize: 14, marginBottom: 8 }}>
                You previously RSVP&apos;d as <strong>{existingRsvp.user_name || existingRsvp.guest_name || guestName || 'a guest'}</strong>. You can update the details below or delete the RSVP.
              </div>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  background: deleting ? '#d1d5db' : '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 8,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                }}
              >
                {deleting ? 'Removing RSVP…' : 'Delete RSVP'}
              </button>
            </div>
          )}
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gap: 4 }}>
              <label htmlFor="rsvp-name" style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>
                Name to display on RSVP *
              </label>
              <input id="rsvp-name" type="text" placeholder="e.g. The Carter Family" value={guestName} onChange={(e) => setGuestName(e.target.value)} required style={{ padding: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>Will you be attending? *</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: 8, borderRadius: 8, border: status === 'yes' ? '2px solid #8b5cf6' : '1px solid #e5e7eb' }}>
                  <input type="radio" name="status" value="yes" checked={status === 'yes'} onChange={(e) => setStatus(e.target.value)} required style={{ width: 18, height: 18, cursor: 'pointer' }} />
                  <span>Yes, I&apos;ll be there! 🎉</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: 8, borderRadius: 8, border: status === 'maybe' ? '2px solid #8b5cf6' : '1px solid #e5e7eb' }}>
                  <input type="radio" name="status" value="maybe" checked={status === 'maybe'} onChange={(e) => setStatus(e.target.value)} required style={{ width: 18, height: 18, cursor: 'pointer' }} />
                  <span>Maybe 🤔</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: 8, borderRadius: 8, border: status === 'no' ? '2px solid #8b5cf6' : '1px solid #e5e7eb' }}>
                  <input type="radio" name="status" value="no" checked={status === 'no'} onChange={(e) => setStatus(e.target.value)} required style={{ width: 18, height: 18, cursor: 'pointer' }} />
                  <span>Sorry, can&apos;t make it</span>
                </label>
              </div>
            </div>

            {status === 'yes' && (
              <div style={{ display: 'grid', gap: 4 }}>
                <label htmlFor="rsvp-guests" style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>
                  Number of Guests (including yourself) *
                </label>
                <input id="rsvp-guests" type="number" min="1" max="10" value={guestCount} onChange={(e) => setGuestCount(Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1)))} required={status === 'yes'} style={{ padding: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Maximum 10 guests allowed</p>
              </div>
            )}

            <div style={{ display: 'grid', gap: 4 }}>
              <label htmlFor="rsvp-phone" style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>
                Phone Number (optional)
              </label>
              <input id="rsvp-phone" type="tel" placeholder="(555) 123-4567" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} style={{ padding: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
            </div>

            <div style={{ display: 'grid', gap: 4 }}>
              <label htmlFor="rsvp-dietary" style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>
                Dietary Restrictions (optional)
              </label>
              <textarea id="rsvp-dietary" placeholder="Let us know about any allergies, dietary restrictions, or food preferences..." value={dietaryRestrictions} onChange={(e) => setDietaryRestrictions(e.target.value)} rows={3} style={{ padding: 12, borderRadius: 8, border: '1px solid #e5e7eb', resize: 'vertical', fontFamily: 'inherit' }} />
            </div>

            <div style={{ display: 'grid', gap: 4 }}>
              <label htmlFor="rsvp-notes" style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>
                Additional Notes (optional)
              </label>
              <textarea id="rsvp-notes" placeholder="Any other information you'd like to share..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ padding: 12, borderRadius: 8, border: '1px solid #e5e7eb', resize: 'vertical', fontFamily: 'inherit' }} />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="tile tile-purple"
              style={{
                height: 48,
                border: 'none',
                fontSize: 16,
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? '⏳ Submitting...' : '✅ Submit RSVP'}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
