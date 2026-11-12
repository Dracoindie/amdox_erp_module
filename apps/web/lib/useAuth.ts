'use client';

import { useSyncExternalStore } from 'react';
import { getUser, subscribe } from './auth';

/** The signed-in user, re-rendering when the session changes. */
export function useAuthUser() {
  return useSyncExternalStore(subscribe, getUser, () => null);
}
