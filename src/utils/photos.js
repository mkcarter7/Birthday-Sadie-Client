'use client';

const pickFirstString = (candidates) => {
  for (let i = 0; i < candidates.length; i += 1) {
    const value = candidates[i];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
};

export const getPhotoOwnerUid = (photo) => {
  if (!photo || typeof photo !== 'object') return null;
  return pickFirstString([photo.firebase_uid, photo.firebase_user_id, photo.user_uid, photo.uploader_uid, photo.owner_uid, photo.user_id, photo.uploaded_by?.firebase_uid, photo.uploaded_by?.uid, photo.uploaded_by?.id, photo.user?.firebase_uid, photo.user?.uid]);
};

export const getPhotoOwnerEmail = (photo) => {
  if (!photo || typeof photo !== 'object') return null;
  const email = pickFirstString([photo.uploaded_by?.email, photo.uploaded_by_email, photo.user?.email, photo.user_email, photo.email]);
  return email ? email.toLowerCase() : null;
};

export const getPhotoDisplayName = (photo) => {
  if (!photo || typeof photo !== 'object') return 'Guest';
  return pickFirstString([photo.uploaded_by?.full_name, photo.uploaded_by?.username, photo.uploaded_by?.name, photo.uploader_name, photo.user?.full_name, photo.user?.username, photo.user?.name]) || 'Guest';
};

export const photoBelongsToUser = (photo, user) => {
  if (!photo || !user) return false;
  const ownerUid = getPhotoOwnerUid(photo);
  const ownerEmail = getPhotoOwnerEmail(photo);
  const userUid = user.uid;
  const userEmail = user.email ? user.email.toLowerCase() : null;
  if (ownerUid && userUid && ownerUid === userUid) return true;
  if (ownerEmail && userEmail && ownerEmail === userEmail) return true;
  return false;
};

export const getPhotoSource = (photo) => {
  if (!photo || typeof photo !== 'object') return '';
  return pickFirstString([photo.thumbnail, photo.image, photo.url, photo.src]) || '';
};
