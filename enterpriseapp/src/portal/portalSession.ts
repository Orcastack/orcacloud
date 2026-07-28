import type { User } from '../types/auth';

const AUTH_TOKEN_KEY = 'authToken';
const AUTH_USER_KEY = 'orcacloud-auth-user';
const ONBOARDING_STATE_KEY = 'orcacloud-onboarding-state';
const LEGACY_ONBOARDING_STATE_KEY = 'atonix-onboarding-state';
const TRANSFER_ONBOARDING_PARAM = 'portalOnboarding';

type OnboardingTransferState = {
  isCompleted: boolean;
  userPlan: 'cloud' | 'developer' | 'enterprise' | null;
};

function parseJson<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn('Failed to parse portal session payload:', error);
    return null;
  }
}

function saveOnboardingState(state: OnboardingTransferState) {
  const existing = parseJson<Record<string, unknown>>(localStorage.getItem(ONBOARDING_STATE_KEY)) || {};
  const nextState = {
    ...existing,
    isCompleted: state.isCompleted,
    userPlan: state.userPlan,
  };
  const serialized = JSON.stringify(nextState);
  localStorage.setItem(ONBOARDING_STATE_KEY, serialized);
  localStorage.setItem(LEGACY_ONBOARDING_STATE_KEY, serialized);
}

export function setStoredAuthSession(token: string, user: User) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearStoredAuthSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export function getStoredAuthUser(): User | null {
  return parseJson<User>(localStorage.getItem(AUTH_USER_KEY));
}

export function bootstrapPortalTransferFromUrl() {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  const onboarding = parseJson<OnboardingTransferState>(url.searchParams.get(TRANSFER_ONBOARDING_PARAM));

  if (!onboarding) {
    return;
  }

  if (onboarding) {
    saveOnboardingState(onboarding);
  }

  url.searchParams.delete(TRANSFER_ONBOARDING_PARAM);
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
}
