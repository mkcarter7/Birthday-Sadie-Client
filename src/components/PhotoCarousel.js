'use client';

import PropTypes from 'prop-types';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useAuth } from '@/utils/context/authContext';
import { signIn } from '@/utils/auth';
import { isAdmin } from '@/utils/admin';
import { photoBelongsToUser } from '@/utils/photos';

function PhotoCard({ photo, index, onImageError, canDelete, onDelete, deleting }) {
  const [aspectRatio, setAspectRatio] = useState(null);

  const src = photo.image || photo.url;
  const uploader = photo.uploaded_by?.full_name || photo.uploaded_by?.username || photo.uploader_name;
  const photoId = photo.id;

  const handleImageLoad = (event) => {
    const { naturalWidth, naturalHeight } = event.target;
    if (naturalWidth && naturalHeight) {
      setAspectRatio(naturalWidth / naturalHeight);
    }
  };

  return (
    <div
      key={photoId}
      style={{
        minWidth: 'min(480px, calc(100% - 32px))',
        width: 'min(480px, calc(100% - 32px))',
        maxWidth: 'min(480px, calc(100% - 32px))',
        flexShrink: 0,
        scrollSnapAlign: 'center',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: 'var(--ring)',
        background: 'transparent',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
      className="photo-card"
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: aspectRatio || 4 / 3,
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(139, 92, 246, 0.18))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`Party ${index + 1}`}
          onError={() => onImageError(photoId)}
          onLoad={handleImageLoad}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
          }}
        />
        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete(photo)}
            disabled={deleting}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              padding: '6px 10px',
              borderRadius: 9999,
              border: 'none',
              background: deleting ? '#d1d5db' : '#8b5cf6',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: deleting ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
              transition: 'background 0.2s ease, transform 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!deleting) e.currentTarget.style.background = '#7c3aed';
            }}
            onMouseLeave={(e) => {
              if (!deleting) e.currentTarget.style.background = '#8b5cf6';
            }}
          >
            {deleting ? 'Removing…' : 'Delete'}
          </button>
        )}
        {uploader && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              padding: '12px 16px',
              background: 'linear-gradient(180deg, rgba(12, 43, 88, 0.05) 0%, rgba(12, 43, 88, 0.75) 100%)',
              color: 'white',
              fontSize: '13px',
              fontWeight: '600',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              backdropFilter: 'blur(4px)',
            }}
          >
            by {uploader}
          </div>
        )}
      </div>
    </div>
  );
}

PhotoCard.propTypes = {
  photo: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    image: PropTypes.string,
    url: PropTypes.string,
    uploader_name: PropTypes.string,
    uploaded_by: PropTypes.shape({
      full_name: PropTypes.string,
      username: PropTypes.string,
      email: PropTypes.string,
      firebase_uid: PropTypes.string,
      uid: PropTypes.string,
    }),
  }).isRequired,
  index: PropTypes.number.isRequired,
  onImageError: PropTypes.func.isRequired,
  canDelete: PropTypes.bool,
  onDelete: PropTypes.func,
  deleting: PropTypes.bool,
};

PhotoCard.defaultProps = {
  canDelete: false,
  onDelete: () => {},
  deleting: false,
};

export default function PhotoCarousel({ enableDeletion = false }) {
  const { user, userLoading } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hiddenIds, setHiddenIds] = useState(new Set());
  const [deleteError, setDeleteError] = useState('');
  const [deletingPhotoId, setDeletingPhotoId] = useState(null);
  const scrollContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const userIsAdmin = useMemo(() => isAdmin(user), [user]);

  const handleImageError = (photoId) => {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      next.add(photoId);
      return next;
    });
  };

  const handleDeletePhoto = async (photo) => {
    if (!enableDeletion) return;
    const photoId = photo?.id;
    if (!photoId) {
      setDeleteError('Photo id is missing.');
      return;
    }
    if (!user) {
      signIn();
      return;
    }
    if (!userIsAdmin && !photoBelongsToUser(photo, user)) {
      setDeleteError('You can only delete photos you uploaded.');
      return;
    }
    if (typeof window !== 'undefined' && !window.confirm('Are you sure you want to delete this photo?')) {
      return;
    }

    setDeleteError('');
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
        let text;
        try {
          text = await res.text();
        } catch (e) {
          text = null;
        }
        throw new Error(text || 'Failed to delete photo');
      }

      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (err) {
      setDeleteError(err.message || 'Unable to delete photo');
    } finally {
      setDeletingPhotoId(null);
    }
  };

  // Likes disabled – no handler

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!user) {
        if (isMounted) {
          setLoading(false);
          setPhotos([]);
        }
        return;
      }

      try {
        const res = await fetch('/api/photos');
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data?.photos || data?.results || [];
          if (isMounted) setPhotos(list);
        }
      } catch (e) {
        // ignore; show empty state
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Check scroll position to enable/disable arrows
  const updateScrollButtons = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollWidth, clientWidth, scrollLeft } = container;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  // Scroll handlers
  const handleScrollLeft = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { clientWidth, scrollLeft: currentScroll } = container;
    // Cards are calc((100% - 12px) / 2), so 2 cards + gap = clientWidth
    const scrollDistance = clientWidth;

    const newScrollLeft = Math.max(0, currentScroll - scrollDistance);
    container.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
  };

  const handleScrollRight = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollWidth, clientWidth, scrollLeft: currentScroll } = container;
    // Cards are calc((100% - 12px) / 2), so 2 cards + gap = clientWidth
    const scrollDistance = clientWidth;

    const newScrollLeft = Math.min(scrollWidth - clientWidth, currentScroll + scrollDistance);
    container.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
  };

  // Touch/swipe handlers
  const touchStartXRef = useRef(0);
  const touchEndXRef = useRef(0);

  const handleSwipe = () => {
    const swipeDistance = touchStartXRef.current - touchEndXRef.current;
    const minSwipeDistance = 50;

    if (Math.abs(swipeDistance) > minSwipeDistance) {
      if (swipeDistance > 0) {
        handleScrollRight(); // Swipe left = scroll right
      } else {
        handleScrollLeft(); // Swipe right = scroll left
      }
    }
  };

  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    touchEndXRef.current = e.changedTouches[0].clientX;
    handleSwipe();
  };

  // Update scroll buttons on scroll and resize
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !photos.length) return;

    updateScrollButtons();
    container.addEventListener('scroll', updateScrollButtons);
    window.addEventListener('resize', updateScrollButtons);

    // eslint-disable-next-line consistent-return
    return () => {
      container.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [photos.length]);

  if (userLoading || loading) {
    return (
      <div className="card">
        <div className="muted">Loading photos…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="card" style={{ display: 'grid', gap: 12 }}>
        <p className="muted">Sign in to view and share party photos!</p>
        <button type="button" onClick={signIn} className="tile tile-purple" style={{ height: 48, border: 'none' }}>
          Sign in with Google
        </button>
      </div>
    );
  }

  if (!photos.length) {
    return (
      <div className="card">
        <div className="muted">No photos yet. Be the first to share memories!</div>
      </div>
    );
  }

  return (
    <div style={{ background: 'transparent', padding: 0 }}>
      {enableDeletion && deleteError && (
        <div className="card" style={{ margin: '0 16px 16px', background: 'rgba(139, 92, 246, 0.12)', border: '1px solid #8b5cf6' }}>
          <p style={{ margin: 0, color: '#4c1d95' }}>{deleteError}</p>
        </div>
      )}
      <div style={{ position: 'relative', padding: '0 16px', overflow: 'hidden' }}>
        {/* Left Arrow */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={handleScrollLeft}
            style={{
              position: 'absolute',
              left: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              background: 'rgba(255, 255, 255, 0.9)',
              border: 'none',
              borderRadius: '50%',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              fontSize: '20px',
            }}
            aria-label="Scroll left"
          >
            ←
          </button>
        )}

        {/* Right Arrow */}
        {canScrollRight && (
          <button
            type="button"
            onClick={handleScrollRight}
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              background: 'rgba(255, 255, 255, 0.9)',
              border: 'none',
              borderRadius: '50%',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              fontSize: '20px',
            }}
            aria-label="Scroll right"
          >
            →
          </button>
        )}

        <div
          ref={scrollContainerRef}
          className="photo-carousel-scroll"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{
            display: 'flex',
            overflowX: 'auto',
            gap: 12,
            scrollSnapType: 'x mandatory',
            padding: 0,
            scrollBehavior: 'smooth',
            scrollbarWidth: 'none', // Firefox
            msOverflowStyle: 'none', // IE/Edge
          }}
        >
          {photos.map((photo, i) => {
            const photoId = photo.id;
            if (hiddenIds.has(photoId)) return null;
            return <PhotoCard key={photoId} photo={photo} index={i} onImageError={handleImageError} canDelete={enableDeletion && (userIsAdmin || photoBelongsToUser(photo, user))} onDelete={handleDeletePhoto} deleting={deletingPhotoId === photoId} />;
          })}
        </div>
      </div>
    </div>
  );
}

PhotoCarousel.propTypes = {
  enableDeletion: PropTypes.bool,
};

PhotoCarousel.defaultProps = {
  enableDeletion: false,
};
