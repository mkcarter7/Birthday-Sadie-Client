'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import PhotoCarousel from '@/components/PhotoCarousel';
import { PARTY_CONFIG, getPartyDisplayName, getPartyLocation, getPartyTheme } from '@/config/party';

const parsePartyDateTime = (date, time) => {
  if (!date) return null;
  const dateOnly = new Date(date);
  if (Number.isNaN(dateOnly.getTime())) return null;

  if (!time) {
    dateOnly.setHours(0, 0, 0, 0);
    return dateOnly;
  }

  const trimmed = time.trim();
  if (!trimmed) return dateOnly;

  const meridiemMatch = trimmed.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (meridiemMatch) {
    let hours = parseInt(meridiemMatch[1], 10);
    const minutes = meridiemMatch[2] ? parseInt(meridiemMatch[2], 10) : 0;
    const meridiem = meridiemMatch[3].toUpperCase();

    if (hours === 12) {
      hours = meridiem === 'AM' ? 0 : 12;
    } else if (meridiem === 'PM') {
      hours += 12;
    }

    dateOnly.setHours(hours, minutes, 0, 0);
    return dateOnly;
  }

  const numericMatch = trimmed.match(/(\d{1,2})(?::(\d{2}))?/);
  if (numericMatch) {
    const hours = parseInt(numericMatch[1], 10);
    const minutes = numericMatch[2] ? parseInt(numericMatch[2], 10) : 0;
    dateOnly.setHours(hours, minutes, 0, 0);
    return dateOnly;
  }

  return dateOnly;
};

function getWeatherIcon(desc) {
  const lowerDesc = desc.toLowerCase();
  if (lowerDesc.includes('storm') || lowerDesc.includes('thunder')) return '⛈️';
  if (lowerDesc.includes('rain') || lowerDesc.includes('shower')) return '🌧️';
  if (lowerDesc.includes('drizzle')) return '🌦️';
  if (lowerDesc.includes('snow') || lowerDesc.includes('sleet')) return '❄️';
  if (lowerDesc.includes('fog') || lowerDesc.includes('mist')) return '🌫️';
  if (lowerDesc.includes('partly cloudy') || lowerDesc.includes('partly cloud')) return '⛅';
  if (lowerDesc.includes('cloud') || lowerDesc.includes('overcast')) return '☁️';
  if (lowerDesc.includes('clear') || lowerDesc.includes('sunny')) return '☀️';
  if (lowerDesc.includes('wind')) return '💨';
  return '🌤️';
}

const WEATHER_CODES = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Freezing fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Light rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Light snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Heavy thunderstorm with hail',
};

const tiles = [
  { href: '/calendar', label: 'Add to Calendar', color: 'green', icon: '📅' },
  { href: '/sms', label: 'Share via SMS', color: 'blue', icon: '📞' },
  { href: '/qrcode', label: 'QR Code', color: 'purple', icon: '📱' },
  { href: '/live', label: 'Watch Live', color: 'blue', icon: '🔗' },
  { href: '/photos', label: 'Photos', color: 'pink', icon: '📷' },
  { href: '/gift', label: 'Send Gift', color: 'violet', icon: '🎁' },
  { href: '/registry', label: 'Registry', color: 'indigo', icon: '⭐' },
  { href: '/guestbook', label: 'Guest Book', color: 'teal', icon: '💬' },
  { href: '/timeline', label: 'Timeline', color: 'orange', icon: '🕑' },
  { href: '/location', label: 'Location', color: 'emerald', icon: '📍' },
  { href: '/games', label: 'Play Games & Earn Points', color: 'gold', icon: '🏆' },
  { href: '/rsvp', label: 'RSVP for Party', color: 'rose', icon: '👥' },
];

export default function Home() {
  const [countdown, setCountdown] = useState({
    headline: 'Loading party details…',
    subline: 'Hang tight while we calculate the countdown.',
  });
  const [weather, setWeather] = useState({
    desc: 'Loading forecast…',
    temp: '—',
    icon: '🌤️',
  });

  const partyDateString = PARTY_CONFIG.date;
  const partyTimeString = PARTY_CONFIG.time;
  const partyLatitude = parseFloat(PARTY_CONFIG.latitude);
  const partyLongitude = parseFloat(PARTY_CONFIG.longitude);

  const partyDateTime = useMemo(() => parsePartyDateTime(partyDateString, partyTimeString), [partyDateString, partyTimeString]);

  useEffect(() => {
    let intervalId;

    if (!partyDateTime) {
      setCountdown({
        headline: 'Let’s party soon!',
        subline: 'Update the party date to see the countdown.',
      });
    } else {
      const updateCountdown = () => {
        const now = new Date();
        const diffMs = partyDateTime.getTime() - now.getTime();
        const hourMs = 60 * 60 * 1000;
        const dayMs = 24 * hourMs;

        let nextCountdown;

        if (Number.isNaN(diffMs)) {
          nextCountdown = {
            headline: 'Party date coming soon',
            subline: 'We could not read the date/time. Double-check the .env values.',
          };
        } else if (diffMs <= -6 * hourMs) {
          nextCountdown = {
            headline: '🎉 Thanks for celebrating!',
            subline: 'Relive the highlights in the gallery below.',
          };
        } else if (diffMs <= 0) {
          const elapsedHours = Math.abs(Math.floor(diffMs / hourMs));
          nextCountdown = {
            headline: '🎉 The party is happening right now!',
            subline: elapsedHours ? `Started about ${elapsedHours} hour${elapsedHours === 1 ? '' : 's'} ago.` : 'Enjoy every moment!',
          };
        } else {
          const daysLeft = Math.max(1, Math.ceil(diffMs / dayMs));
          const remainingMs = diffMs - (daysLeft - 1) * dayMs;
          const hours = Math.floor(remainingMs / hourMs);
          const minutes = Math.floor((remainingMs % hourMs) / (60 * 1000));

          if (daysLeft > 1) {
            nextCountdown = {
              headline: `${daysLeft} day${daysLeft === 1 ? '' : 's'} to go`,
              subline: hours > 0 || minutes > 0 ? `Plus ${hours} hour${hours === 1 ? '' : 's'} and ${minutes} minute${minutes === 1 ? '' : 's'}!` : 'We can’t wait to celebrate with you!',
            };
          } else if (hours > 0) {
            nextCountdown = {
              headline: `${hours} hour${hours === 1 ? '' : 's'} to go`,
              subline: `${minutes} more minute${minutes === 1 ? '' : 's'} — get excited!`,
            };
          } else {
            nextCountdown = {
              headline: `${minutes} minute${minutes === 1 ? '' : 's'} to go`,
              subline: 'Grab your party shoes!',
            };
          }
        }

        setCountdown(nextCountdown);
      };

      updateCountdown();
      intervalId = setInterval(updateCountdown, 60 * 1000);
    }

    return function cleanupCountdown() {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [partyDateTime]);

  useEffect(() => {
    // Create confetti animation on page load
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = {
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      zIndex: 9999,
    };

    const randomInRange = (min, max) => Math.random() * (max - min) + min;

    // Use theme colors from party config, with fallback festive colors
    const confettiColors = [
      PARTY_CONFIG.secondaryColor || '#8B5CF6', // Purple
      PARTY_CONFIG.primaryColor || '#3B82F6', // Blue
      PARTY_CONFIG.accentColor || '#F59E0B', // Orange/Amber
      '#10B981', // Green
      '#EC4899', // Pink
      '#FBBF24', // Yellow
    ];

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      // Launch confetti from both sides
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: confettiColors,
      });

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: confettiColors,
      });
    }, 250);

    // Cleanup interval on unmount
    return function cleanupConfetti() {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const partyInvalid = !partyDateTime || Number.isNaN(partyDateTime.getTime());
    const coordsInvalid = !Number.isFinite(partyLatitude) || !Number.isFinite(partyLongitude) || Math.abs(partyLatitude) > 90 || Math.abs(partyLongitude) > 180;
    const diffDays = partyInvalid ? null : (partyDateTime.getTime() - Date.now()) / (24 * 60 * 60 * 1000);

    if (partyInvalid) {
      setWeather({
        desc: 'Set the party date to see the forecast.',
        temp: '—',
        icon: '🌤️',
      });
      return undefined;
    }

    if (coordsInvalid) {
      setWeather({
        desc: 'Add valid latitude & longitude in the config to show the forecast.',
        temp: '—',
        icon: '🌤️',
      });
      return undefined;
    }

    if (diffDays !== null && diffDays > 16) {
      setWeather({
        desc: 'Forecast becomes available about 16 days before the party.',
        temp: '—',
        icon: '🌤️',
      });
      return undefined;
    }

    const controller = new AbortController();

    const fetchForecast = async () => {
      try {
        const targetDate = partyDateTime.toISOString().split('T')[0];
        const params = new URLSearchParams({
          latitude: partyLatitude,
          longitude: partyLongitude,
          daily: 'weathercode,temperature_2m_max,temperature_2m_min',
          timezone: 'auto',
          temperature_unit: 'fahrenheit',
          start_date: targetDate,
          end_date: targetDate,
        });

        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) throw new Error('Unable to load forecast');

        const data = await response.json();
        const daily = data?.daily;

        if (!daily || !daily.weathercode?.length) {
          setWeather({
            desc: 'Forecast available closer to party day.',
            temp: '—',
            icon: '🌤️',
          });
        } else {
          const code = daily.weathercode[0];
          const desc = WEATHER_CODES[code] || 'Great celebration weather';
          const high = Number.isFinite(daily.temperature_2m_max?.[0]) ? Math.round(daily.temperature_2m_max[0]) : null;
          const low = Number.isFinite(daily.temperature_2m_min?.[0]) ? Math.round(daily.temperature_2m_min[0]) : null;

          let tempDisplay = '—';
          if (high !== null && low !== null) {
            tempDisplay = `High ${high}° · Low ${low}°F`;
          } else if (high !== null) {
            tempDisplay = `${high}°F`;
          } else if (low !== null) {
            tempDisplay = `${low}°F`;
          }

          const icon = getWeatherIcon(desc);

          setWeather({
            desc,
            temp: tempDisplay,
            icon,
          });
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          setWeather({
            desc: 'Weather data unavailable right now.',
            temp: '—',
            icon: '🌤️',
          });
        }
      }
    };

    fetchForecast();

    return function cleanupForecast() {
      controller.abort();
    };
  }, [partyDateTime, partyLatitude, partyLongitude]);

  return (
    <main className="page">
      <section className="hero">
        <h1 className="hero-title">{getPartyDisplayName()}</h1>
        <p className="hero-subtitle">{PARTY_CONFIG.welcomeMessage}</p>
      </section>

      <section className="info-cards">
        <div className="info-card">
          <span className="icn">📅</span>
          <div>
            <div className="info-label">Date</div>
            <div className="info-value">{PARTY_CONFIG.date}</div>
          </div>
        </div>
        <div className="info-card">
          <span className="icn">⏰</span>
          <div>
            <div className="info-label">Time</div>
            <div className="info-value">{PARTY_CONFIG.time}</div>
          </div>
        </div>
        <div className="info-card">
          <span className="icn">📍</span>
          <div>
            <div className="info-label">Location</div>
            <div className="info-value">{getPartyLocation()}</div>
          </div>
        </div>
        <div className="info-card">
          <span className="icn">⭐</span>
          <div>
            <div className="info-label">Theme</div>
            <div className="info-value">{getPartyTheme()}</div>
          </div>
        </div>
      </section>

      <section className="countdown-weather-container">
        <div className="countdown card" style={{ textAlign: 'center' }}>
          <h2>Party Countdown</h2>
          <div className="countdown-body" style={{ color: PARTY_CONFIG.secondaryColor || '#8B5CF6' }}>
            {countdown.headline}
          </div>
          <p className="muted">{countdown.subline}</p>
        </div>

        <div className="weather">
          <div className="weather-card">
            <div className="weather-icon">{weather.icon}</div>
            <div className="weather-title">Party Day Weather</div>
            <div className="weather-temp">{weather.temp}</div>
            <div className="weather-desc">{weather.desc}</div>
          </div>
        </div>
      </section>

      <section className="tile-grid">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className={`tile tile-${t.color} ${t.wide ? 'wide' : ''}`}>
            <span className="tile-icon" aria-hidden>
              {t.icon}
            </span>
            <span className="tile-label">{t.label}</span>
          </Link>
        ))}
      </section>

      <PhotoCarousel />

      <section className="thanks card" style={{ textAlign: 'center' }}>
        <h2>Thank You!</h2>
        <p>Ivy&apos;s 2nd birthday party was absolutely magical thanks to all of you! Your presence, gifts, and memories made this celebration unforgettable.</p>
        <p className="muted">Photos and memories from the party are now available in the gallery.</p>
      </section>
    </main>
  );
}
