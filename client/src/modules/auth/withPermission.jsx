import React from 'react';
import { usePermission } from './usePermission';

export function withPermission(appKey, scope) {
  return (Component) => (props) => {
    const { allowed } = usePermission(appKey, scope);
    if (!allowed) return null;
    return <Component {...props} />;
  };
}
