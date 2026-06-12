import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';

import { useMedications } from '@/contexts/medications-context';
import { parseAnyAlarmPayload, parseGroupAlarmPayload } from '@/lib/notifications';
import type { AlarmActionId } from '@/types';

function extractActionId(response: Notifications.NotificationResponse): AlarmActionId | null {
  const actionId = response.actionIdentifier;
  if (actionId && actionId !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
    return actionId as AlarmActionId;
  }
  const payload = parseAnyAlarmPayload(response.notification.request.content.data);
  if (payload && 'type' in payload && payload.type === 'dose-missed-info') return 'ESQUECI';
  return null;
}

export function useAlarmResponseHandler(): void {
  const { handleAlarmAction, handleGroupAlarmAction, openGroupedDoseFlow } = useMedications();
  const handlerRef = useRef(handleAlarmAction);
  const groupHandlerRef = useRef(handleGroupAlarmAction);
  const openGroupRef = useRef(openGroupedDoseFlow);
  handlerRef.current = handleAlarmAction;
  groupHandlerRef.current = handleGroupAlarmAction;
  openGroupRef.current = openGroupedDoseFlow;

  useEffect(() => {
    const processResponse = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;
      const groupPayload = parseGroupAlarmPayload(data);
      if (groupPayload) {
        const actionId = extractActionId(response);
        if (actionId === 'REGISTRAR_INDIVIDUAL' || !actionId) {
          openGroupRef.current(groupPayload.groupSlotKey);
          return;
        }
        if (actionId) {
          void groupHandlerRef.current(actionId, groupPayload);
        }
        return;
      }

      const payload = parseAnyAlarmPayload(data);
      if (!payload || !('medicationId' in payload)) return;

      const actionId = extractActionId(response);
      if (!actionId) return;

      void handlerRef.current(actionId, payload);
    };

    const sub = Notifications.addNotificationResponseReceivedListener(processResponse);

    void Notifications.getLastNotificationResponseAsync().then((last) => {
      if (last) processResponse(last);
    });

    return () => sub.remove();
  }, []);
}

export function useAlarmReconciler(): void {
  const { reconcileAlarms } = useMedications();
  const reconcileRef = useRef(reconcileAlarms);
  reconcileRef.current = reconcileAlarms;

  useEffect(() => {
    void reconcileRef.current();

    const interval = setInterval(() => {
      void reconcileRef.current();
    }, 30_000);

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void reconcileRef.current();
    });

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, []);
}
