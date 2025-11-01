import { useContext, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';

export function usePermission(appKey, scope) {
  const { enabledApps = [], permissions = {} } = useContext(AuthContext) || {};
  const appEnabled = enabledApps.includes(appKey);
  const allowed = useMemo(() => {
    if (!appEnabled) return false;
    if (!scope) return true;
    return !!permissions?.[appKey]?.[scope];
  }, [appEnabled, permissions, appKey, scope]);
  return { appEnabled, allowed };
}
