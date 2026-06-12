import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useSettings } from '@/contexts/settings-context';
import {
  authenticateWithBiometrics,
  getBiometricSupport,
  hasPinConfigured,
  removePin,
  savePin,
  setSessionUnlocked,
  verifyPin,
} from '@/lib/security-service';

interface AuthContextValue {
  isLocked: boolean;
  biometricLabel: string;
  biometricAvailable: boolean;
  unlockWithPin: (pin: string) => Promise<boolean>;
  unlockWithBiometric: () => Promise<boolean>;
  lockApp: () => Promise<void>;
  setupPin: (pin: string) => Promise<void>;
  clearPin: () => Promise<void>;
  securityRequired: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const [isLocked, setIsLocked] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometria');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const lastActiveRef = useRef(Date.now());

  const securityRequired = settings.security.pinEnabled || settings.security.biometricEnabled;

  useEffect(() => {
    (async () => {
      const bio = await getBiometricSupport();
      setBiometricAvailable(bio.available);
      setBiometricLabel(bio.label);
      if (securityRequired) {
        setIsLocked(true);
      }
    })();
  }, [securityRequired]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        lastActiveRef.current = Date.now();
      }
      if (state === 'active' && securityRequired) {
        const elapsed = Date.now() - lastActiveRef.current;
        const limit = settings.security.autoLockMinutes * 60 * 1000;
        if (elapsed >= limit) setIsLocked(true);
      }
    });
    return () => sub.remove();
  }, [securityRequired, settings.security.autoLockMinutes]);

  const unlock = useCallback(async () => {
    await setSessionUnlocked(true);
    setIsLocked(false);
    lastActiveRef.current = Date.now();
  }, []);

  const lockApp = useCallback(async () => {
    await setSessionUnlocked(false);
    setIsLocked(true);
  }, []);

  const unlockWithPin = useCallback(
    async (pin: string) => {
      const ok = await verifyPin(pin);
      if (ok) await unlock();
      return ok;
    },
    [unlock],
  );

  const unlockWithBiometric = useCallback(async () => {
    if (!settings.security.biometricEnabled || !biometricAvailable) return false;
    const ok = await authenticateWithBiometrics('Desbloquear Time for Medicine');
    if (ok) await unlock();
    return ok;
  }, [biometricAvailable, settings.security.biometricEnabled, unlock]);

  const setupPin = useCallback(async (pin: string) => {
    await savePin(pin);
  }, []);

  const clearPin = useCallback(async () => {
    await removePin();
  }, []);

  const value = useMemo(
    () => ({
      isLocked,
      biometricLabel,
      biometricAvailable,
      unlockWithPin,
      unlockWithBiometric,
      lockApp,
      setupPin,
      clearPin,
      securityRequired,
    }),
    [
      isLocked,
      biometricLabel,
      biometricAvailable,
      unlockWithPin,
      unlockWithBiometric,
      lockApp,
      setupPin,
      clearPin,
      securityRequired,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
