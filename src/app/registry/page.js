import PageHeader from '@/components/PageHeader';
import Link from 'next/link';
import { PARTY_CONFIG } from '@/config/party';

export default function RegistryPage() {
  return (
    <main className="page">
      <PageHeader title="Registry" subtitle="View Ivy's wishlist and registry links" />
      <div className="card" style={{ display: 'grid', gap: 16 }}>
        <div>
          <h3>Amazon Wishlist</h3>
          <p>Check out Ivy&apos;s birthday wishlist on Amazon!</p>
        </div>
        <Link
          href={PARTY_CONFIG.registryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="tile tile-purple"
          style={{
            height: 56,
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
          }}
        >
          View Amazon Wishlist
        </Link>
      </div>
    </main>
  );
}
