import React from 'react';
import { Button } from 'react-bootstrap';
import { signIn } from '../utils/auth';

function Signin() {
  return (
    <div
      className="text-center d-flex flex-column justify-content-center align-content-center"
      style={{
        height: '90vh',
        padding: '30px',
        maxWidth: '400px',
        margin: '0 auto',
      }}
    >
      <h1
        style={{
          fontSize: '48px',
          fontWeight: 700,
          marginBottom: '30px',
          color: '#3B82F6',
          fontFamily: 'var(--font-fredoka), "Fredoka", sans-serif',
          letterSpacing: '-0.02em',
          lineHeight: '1.2',
          textShadow: '0 2px 12px rgba(59, 130, 246, 0.5), 0 4px 24px rgba(59, 130, 246, 0.3), 0 1px 2px rgba(59, 130, 246, 0.35)',
        }}
      >
        HAPPY BIRTHDAY SADIE
      </h1>
      <p style={{ marginBottom: '24px' }}>Click the button below to login!</p>
      <Button
        type="button"
        size="lg"
        className="copy-btn"
        onClick={signIn}
        style={{
          backgroundColor: '#14B8A6',
          borderColor: '#14B8A6',
          color: '#fff',
          transition: 'var(--party-transition)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#0D9488';
          e.currentTarget.style.borderColor = '#0D9488';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#14B8A6';
          e.currentTarget.style.borderColor = '#14B8A6';
        }}
      >
        Sign In
      </Button>
    </div>
  );
}

export default Signin;
