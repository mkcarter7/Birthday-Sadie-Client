'use client';

import PropTypes from 'prop-types';
import { useEffect } from 'react';
import { useAuth } from '@/utils/context/authContext';
import Loading from '@/components/Loading';
import SignIn from '@/components/SignIn';
import NavBar from '@/components/NavBar';
import { PARTY_CONFIG } from '@/config/party';

function ViewDirectorBasedOnUserAuthStatus({ children }) {
  const { user, userLoading } = useAuth();
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const defaultBackground = `url('${PARTY_CONFIG.backgroundImage}')`;
    const loggedInBackground = `url('${PARTY_CONFIG.loggedInBackgroundImage}')`;
    const defaultPrimary = PARTY_CONFIG.primaryColor;
    const defaultSecondary = PARTY_CONFIG.secondaryColor;
    const defaultAccent = PARTY_CONFIG.accentColor;
    const loggedInPrimary = PARTY_CONFIG.loggedInPrimaryColor || defaultPrimary;
    const loggedInSecondary = PARTY_CONFIG.loggedInSecondaryColor || defaultSecondary;
    const loggedInAccent = PARTY_CONFIG.loggedInAccentColor || defaultAccent;
    const { body } = document;

    if (user) {
      body.style.setProperty('--bg-image-url', loggedInBackground);
      body.classList.add('logged-in-background');
      body.style.setProperty('--party-primary', loggedInPrimary);
      body.style.setProperty('--party-secondary', loggedInSecondary);
      body.style.setProperty('--party-accent', loggedInAccent);
    } else {
      body.style.setProperty('--bg-image-url', defaultBackground);
      body.classList.remove('logged-in-background');
      body.style.setProperty('--party-primary', defaultPrimary);
      body.style.setProperty('--party-secondary', defaultSecondary);
      body.style.setProperty('--party-accent', defaultAccent);
    }

    return () => {
      body.style.setProperty('--bg-image-url', defaultBackground);
      body.classList.remove('logged-in-background');
      body.style.setProperty('--party-primary', defaultPrimary);
      body.style.setProperty('--party-secondary', defaultSecondary);
      body.style.setProperty('--party-accent', defaultAccent);
    };
  }, [user]);

  // if user state is null, then show loader
  if (userLoading) {
    return <Loading />;
  }

  // what the user should see if they are logged in
  if (user) {
    return (
      <>
        <NavBar /> {/* NavBar only visible if user is logged in and is in every view */}
        {children}
      </>
    );
  }

  return <SignIn />;
}

export default ViewDirectorBasedOnUserAuthStatus;

ViewDirectorBasedOnUserAuthStatus.propTypes = {
  children: PropTypes.node.isRequired,
};
