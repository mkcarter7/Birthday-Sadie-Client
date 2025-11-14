'use client';

import { useState } from 'react';
import Image from 'next/image';
import PageHeader from '@/components/PageHeader';

const PARTY_URL = 'https://birthday-sadie-client.vercel.app/';

export default function QrPage() {
  const [copied, setCopied] = useState(false);

  const copyUrl = async () => {
    await navigator.clipboard.writeText(PARTY_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    const link = document.createElement('a');
    link.href = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(PARTY_URL)}`;
    link.download = 'birthday-party-qr-code.png';
    link.click();
  };

  return (
    <main className="page">
      <PageHeader title="QR Code" subtitle="Share the party website with a QR code" />
      <div className="card" style={{ display: 'grid', gap: 16, textAlign: 'center' }}>
        <div>
          <Image
            src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(PARTY_URL)}`}
            alt="Party QR Code"
            width={300}
            height={300}
            unoptimized
            style={{
              width: '100%',
              maxWidth: '300px',
              height: 'auto',
              margin: '0 auto',
              display: 'block',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '12px',
              backgroundColor: '#fff',
            }}
          />
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>Party Website URL</div>
          <div
            style={{
              background: '#f8fafc',
              padding: '12px',
              borderRadius: '10px',
              wordBreak: 'break-all',
              fontSize: '14px',
              fontFamily: 'monospace',
            }}
          >
            {PARTY_URL}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={copyUrl} className="tile tile-purple" style={{ height: 44, border: 'none', flex: 1 }}>
              {copied ? 'Copied!' : 'Copy URL'}
            </button>
            <button type="button" onClick={downloadQR} className="tile tile-indigo" style={{ height: 44, border: 'none', flex: 1 }}>
              Download QR Code
            </button>
          </div>
        </div>

        <p className="muted" style={{ margin: 0, fontSize: '14px' }}>
          Guests can scan this QR code with their phone camera to quickly access the party website.
        </p>
      </div>
    </main>
  );
}
