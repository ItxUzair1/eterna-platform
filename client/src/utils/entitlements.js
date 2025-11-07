export function mapErrorToUpgrade(error) {
  const code = error?.response?.data?.code;
  if (!code) return null;
  const messages = {
    UPGRADE_REQUIRED: 'This feature requires a paid plan.',
    TRIAL_EXPIRED: 'Your trial has ended. Upgrade to continue.',
    OVER_QUOTA: 'You are out of storage. Add storage to continue.',
    OVER_SEATS: 'You have exceeded seat limits. Increase seats to invite more.',
  };
  return { code, message: messages[code] || 'Upgrade required.' };
}

export function withEntitlement(Component, featureKey) {
  return function Wrapped(props) {
    return <Component {...props} disabled={props.disabled || false} />;
  };
}


