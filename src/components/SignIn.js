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
          fontWeight: 600,
          marginBottom: '30px',
          color: 'var(--party-primary)',
          fontFamily: 'var(--font-fredoka), "Fredoka", sans-serif',
          letterSpacing: '1px',
          textShadow: '2px 2px 6px rgba(0, 0, 0, 0.18)',
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
          backgroundColor: 'var(--party-primary)',
          borderColor: 'var(--party-primary)',
          color: '#fff',
          transition: 'var(--party-transition)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--party-secondary)';
          e.currentTarget.style.borderColor = 'var(--party-secondary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--party-primary)';
          e.currentTarget.style.borderColor = 'var(--party-primary)';
        }}
      >
        Sign In
      </Button>
    </div>
  );
}

export default Signin;
