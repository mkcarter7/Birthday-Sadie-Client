'use client';

import PageHeader from '@/components/PageHeader';
import { PARTY_CONFIG } from '@/config/party';

const HOUR_MS = 60 * 60 * 1000;

const parseDateWithTime = (dateStr, timeStr) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;

  if (!timeStr) {
    date.setHours(0, 0, 0, 0);
    return date;
  }

  const trimmedTime = timeStr.trim();
  if (!trimmedTime) {
    return date;
  }

  const meridiemMatch = trimmedTime.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (meridiemMatch) {
    let hours = parseInt(meridiemMatch[1], 10);
    const minutes = meridiemMatch[2] ? parseInt(meridiemMatch[2], 10) : 0;
    const meridiem = meridiemMatch[3].toUpperCase();

    if (hours === 12) {
      hours = meridiem === 'AM' ? 0 : 12;
    } else if (meridiem === 'PM') {
      hours += 12;
    }

    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  const numericMatch = trimmedTime.match(/(\d{1,2})(?::(\d{2}))?/);
  if (numericMatch) {
    const hours = parseInt(numericMatch[1], 10);
    const minutes = numericMatch[2] ? parseInt(numericMatch[2], 10) : 0;
    date.setHours(hours, minutes, 0, 0);
  }

  return date;
};

const getEventWindow = () => {
  const { date, time } = PARTY_CONFIG;
  if (!date) {
    return { start: null, end: null };
  }

  const segments = time?.split('-') || [];
  const startTime = segments[0] ? segments[0].trim() : time;
  const endTime = segments[1] ? segments[1].trim() : null;

  const start = parseDateWithTime(date, startTime);
  let end = endTime ? parseDateWithTime(date, endTime) : null;

  if (start && (!end || end <= start)) {
    end = new Date(start.getTime() + 2 * HOUR_MS);
  }

  return { start, end };
};

const { start: eventStart, end: eventEnd } = getEventWindow();

const eventDetails = {
  title: PARTY_CONFIG.name,
  description: PARTY_CONFIG.welcomeMessage,
  location: PARTY_CONFIG.location,
  start: eventStart || new Date(),
  end: eventEnd || new Date((eventStart || new Date()).getTime() + 2 * HOUR_MS),
};

function formatToGoogle(dt) {
  const z = dt.toISOString().replace(/[-:]|\.\d{3}/g, ''); // YYYYMMDDTHHMMSSZ
  return z;
}

function formatToICS(dt) {
  // ICS uses UTC by default; format as YYYYMMDDTHHMMSSZ
  return dt.toISOString().replace(/[-:]|\.\d{3}/g, '');
}

function buildGoogleUrl(evt) {
  const base = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
  const dates = `${formatToGoogle(evt.start)}/${formatToGoogle(evt.end)}`;
  const params = new URLSearchParams({
    text: evt.title,
    dates,
    details: evt.description,
    location: evt.location,
  });
  return `${base}&${params.toString()}`;
}

function buildOutlookUrl(evt) {
  const base = 'https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent';
  const params = new URLSearchParams({
    subject: evt.title,
    body: evt.description,
    location: evt.location,
    startdt: evt.start.toISOString(),
    enddt: evt.end.toISOString(),
  });
  return `${base}&${params.toString()}`;
}

function buildICS(evt) {
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Birthday Client//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT', `DTSTART:${formatToICS(evt.start)}`, `DTEND:${formatToICS(evt.end)}`, `SUMMARY:${evt.title}`, `DESCRIPTION:${evt.description}`, `LOCATION:${evt.location}`, `DTSTAMP:${formatToICS(new Date())}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  return new Blob([ics], { type: 'text/calendar;charset=utf-8' });
}

export default function CalendarPage() {
  const googleUrl = buildGoogleUrl(eventDetails);
  const outlookUrl = buildOutlookUrl(eventDetails);
  const eventSlug = PARTY_CONFIG.name
    ? PARTY_CONFIG.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    : 'party';

  const handleAppleDownload = () => {
    const blob = buildICS(eventDetails);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${eventSlug || 'party'}-calendar.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="page">
      <PageHeader title="Add to Calendar" subtitle={`Save ${PARTY_CONFIG.name} to your calendar`} />
      <div className="card" style={{ display: 'grid', gap: 12 }}>
        <a className="tile tile-blue" style={{ height: 64 }} href={googleUrl} target="_blank" rel="noreferrer">
          Add to Google Calendar
        </a>
        <a className="tile tile-indigo" style={{ height: 64 }} href={outlookUrl} target="_blank" rel="noreferrer">
          Add to Outlook
        </a>
        <button type="button" className="tile tile-purple" style={{ height: 64, border: 'none' }} onClick={handleAppleDownload}>
          Download .ics for Apple Calendar
        </button>
        <p className="muted" style={{ margin: 0 }}>
          Times are in your local timezone. You can adjust date/time in your calendar app after adding.
        </p>
      </div>
    </main>
  );
}
