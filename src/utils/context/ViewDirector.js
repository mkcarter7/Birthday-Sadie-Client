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
    const { body } = document;

    if (user) {
      body.style.setProperty('--bg-image-url', loggedInBackground);
      body.classList.add('logged-in-background');
    } else {
      body.style.setProperty('--bg-image-url', defaultBackground);
      body.classList.remove('logged-in-background');
    }

    return () => {
      body.style.setProperty('--bg-image-url', defaultBackground);
      body.classList.remove('logged-in-background');
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
