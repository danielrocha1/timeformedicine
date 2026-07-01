import { Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';

/**
 * Interface para os parâmetros do alarme no Android
 */
export interface AndroidAlarmConfig {
  hour: number;
  minutes: number;
  message: string;
  skipUi?: boolean;
}

/**
 * Agenda um alarme no aplicativo de Relógio padrão do Android via Intent.
 * Documentação de referência: https://developer.android.com/guide/components/intents-common#CreateAlarm
 */
export async function setNativeAndroidAlarm(config: AndroidAlarmConfig): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  const { hour, minutes, message, skipUi = true } = config;

  console.log(`[AndroidAlarm] Agendando alarme nativo: ${hour}:${minutes} - ${message}`);

  try {
    // Intent.ACTION_SET_ALARM: android.intent.action.SET_ALARM
    await IntentLauncher.startActivityAsync('android.intent.action.SET_ALARM', {
      extra: {
        'android.intent.extra.alarm.HOUR': hour,
        'android.intent.extra.alarm.MINUTES': minutes,
        'android.intent.extra.alarm.MESSAGE': message,
        'android.intent.extra.alarm.SKIP_UI': skipUi,
      },
    });
    
    return true;
  } catch (error) {
    console.error('[AndroidAlarm] Erro ao disparar intent de alarme:', error);
    return false;
  }
}
