import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const PIN_KEY = 'tfm_user_pin';
const SESSION_KEY = 'tfm_session_unlocked';

export async function getBiometricSupport(): Promise<{
  available: boolean;
  types: LocalAuthentication.AuthenticationType[];
  label: string;
}> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

  let label = 'Biometria';
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    label = Platform.OS === 'ios' ? 'Face ID' : 'Reconhecimento facial';
  } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    label = 'Digital';
  }

  return { available: compatible && enrolled, types, label };
}

export async function authenticateWithBiometrics(prompt: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: prompt,
    cancelLabel: 'Cancelar',
    disableDeviceFallback: false,
  });
  return result.success;
}

export async function savePin(pin: string): Promise<void> {
  await SecureStore.setItemAsync(PIN_KEY, pin);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PIN_KEY);
  return stored === pin;
}

export async function hasPinConfigured(): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PIN_KEY);
  return !!stored;
}

export async function removePin(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_KEY);
}

export async function setSessionUnlocked(unlocked: boolean): Promise<void> {
  if (unlocked) {
    await SecureStore.setItemAsync(SESSION_KEY, Date.now().toString());
  } else {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  }
}

export async function isSessionUnlocked(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(SESSION_KEY);
  return !!value;
}

export function getCurrentDeviceInfo(): { id: string; name: string; platform: string } {
  return {
    id: `${Platform.OS}-${Platform.Version}`,
    name: Platform.OS === 'ios' ? 'iPhone / iPad' : 'Dispositivo Android',
    platform: Platform.OS,
  };
}
