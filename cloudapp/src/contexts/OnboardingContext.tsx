import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { bootstrapPortalTransferFromUrl } from '../portal/portalSession';

export interface OnboardingState {
  // Phase tracking
  currentPhase: number;
  completedPhases: number[];

  // Account data
  accountData: {
    email: string;
    firstName: string;
    lastName: string;
    company: string;
    country: string;
    accountType: 'personal' | 'business';
  } | null;

  // Project data
  projectData: {
    id: string;
    name: string;
    region: string;
    purpose: string;
    description: string;
  } | null;

  // Deployment data
  deploymentData: {
    instanceName: string;
    region: string;
    flavor: string;
    image: string;
    network: string;
    securityGroups: string[];
    keyPair: string;
  } | null;

  // Progress tracking
  checklistProgress: {
    verify_email: boolean;
    create_project: boolean;
    deploy_instance: boolean;
    configure_security: boolean;
    setup_monitoring: boolean;
    enable_backups: boolean;
  };

  // UI state
  isLoading: boolean;
  error: string | null;

  // Completion flag
  isCompleted: boolean;

  // User plan chosen during onboarding
  userPlan: 'cloud' | 'developer' | 'enterprise' | null;
}

export interface OnboardingActions {
  setCurrentPhase: (phase: number) => void;
  completePhase: (phase: number) => void;
  updateAccountData: (data: Partial<OnboardingState['accountData']>) => void;
  updateProjectData: (data: Partial<OnboardingState['projectData']>) => void;
  updateDeploymentData: (data: Partial<OnboardingState['deploymentData']>) => void;
  updateChecklistProgress: (progress: Partial<OnboardingState['checklistProgress']>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  completeOnboarding: () => void;
  setUserPlan: (plan: 'cloud' | 'developer' | 'enterprise') => void;
  reset: () => void;
}

type OnboardingAction =
  | { type: 'SET_CURRENT_PHASE'; payload: number }
  | { type: 'COMPLETE_PHASE'; payload: number }
  | { type: 'UPDATE_ACCOUNT_DATA'; payload: Partial<OnboardingState['accountData']> }
  | { type: 'UPDATE_PROJECT_DATA'; payload: Partial<OnboardingState['projectData']> }
  | { type: 'UPDATE_DEPLOYMENT_DATA'; payload: Partial<OnboardingState['deploymentData']> }
  | { type: 'UPDATE_CHECKLIST_PROGRESS'; payload: Partial<OnboardingState['checklistProgress']> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'SET_USER_PLAN'; payload: 'cloud' | 'developer' | 'enterprise' }
  | { type: 'RESET' };

const initialState: OnboardingState = {
  currentPhase: 1,
  completedPhases: [],
  accountData: null,
  projectData: null,
  deploymentData: null,
  checklistProgress: {
    verify_email: false,
    create_project: false,
    deploy_instance: false,
    configure_security: false,
    setup_monitoring: false,
    enable_backups: false,
  },
  isLoading: false,
  error: null,
  isCompleted: false,
  userPlan: null,
};

function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case 'SET_CURRENT_PHASE':
      return { ...state, currentPhase: action.payload };

    case 'COMPLETE_PHASE':
      return {
        ...state,
        completedPhases: Array.from(new Set([...state.completedPhases, action.payload])),
        currentPhase: Math.max(state.currentPhase, action.payload + 1),
      };

    case 'UPDATE_ACCOUNT_DATA':
      return {
        ...state,
        accountData: state.accountData
          ? { ...state.accountData, ...action.payload }
          : action.payload as OnboardingState['accountData'],
      };

    case 'UPDATE_PROJECT_DATA':
      return {
        ...state,
        projectData: state.projectData
          ? { ...state.projectData, ...action.payload }
          : action.payload as OnboardingState['projectData'],
      };

    case 'UPDATE_DEPLOYMENT_DATA':
      return {
        ...state,
        deploymentData: state.deploymentData
          ? { ...state.deploymentData, ...action.payload }
          : action.payload as OnboardingState['deploymentData'],
      };

    case 'UPDATE_CHECKLIST_PROGRESS':
      return {
        ...state,
        checklistProgress: { ...state.checklistProgress, ...action.payload },
      };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'COMPLETE_ONBOARDING':
      return { ...state, isCompleted: true };

    case 'SET_USER_PLAN':
      return { ...state, userPlan: action.payload };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

const OnboardingContext = createContext<{
  state: OnboardingState;
  actions: OnboardingActions;
} | null>(null);

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

interface OnboardingProviderProps {
  children: ReactNode;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const ONBOARDING_STATE_KEY = 'orcacloud-onboarding-state';
  const LEGACY_ONBOARDING_STATE_KEY = 'orcacloud-onboarding-state';

  // Initialise state synchronously from localStorage to avoid redirect flicker
  const [state, dispatch] = useReducer(onboardingReducer, initialState, (init) => {
    bootstrapPortalTransferFromUrl();
    try {
      const saved = localStorage.getItem(ONBOARDING_STATE_KEY) || localStorage.getItem(LEGACY_ONBOARDING_STATE_KEY);
      if (saved) {
        const p = JSON.parse(saved);
        return {
          ...init,
          currentPhase: p.currentPhase ?? init.currentPhase,
          completedPhases: p.completedPhases ?? init.completedPhases,
          accountData: p.accountData ?? init.accountData,
          projectData: p.projectData ?? init.projectData,
          deploymentData: p.deploymentData ?? init.deploymentData,
          checklistProgress: p.checklistProgress ?? init.checklistProgress,
          isCompleted: p.isCompleted ?? init.isCompleted,
          userPlan: p.userPlan ?? init.userPlan,
        };
      }
    } catch (e) {
      console.warn('Failed to restore onboarding state:', e);
    }
    return init;
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    const serialized = JSON.stringify({
      currentPhase: state.currentPhase,
      completedPhases: state.completedPhases,
      accountData: state.accountData,
      projectData: state.projectData,
      deploymentData: state.deploymentData,
      checklistProgress: state.checklistProgress,
      isCompleted: state.isCompleted,
      userPlan: state.userPlan,
    });
    localStorage.setItem(ONBOARDING_STATE_KEY, serialized);
    localStorage.setItem(LEGACY_ONBOARDING_STATE_KEY, serialized);
  }, [state]);

  const actions: OnboardingActions = {
    setCurrentPhase: (phase: number) => dispatch({ type: 'SET_CURRENT_PHASE', payload: phase }),
    completePhase: (phase: number) => dispatch({ type: 'COMPLETE_PHASE', payload: phase }),
    updateAccountData: (data) => dispatch({ type: 'UPDATE_ACCOUNT_DATA', payload: data }),
    updateProjectData: (data) => dispatch({ type: 'UPDATE_PROJECT_DATA', payload: data }),
    updateDeploymentData: (data) => dispatch({ type: 'UPDATE_DEPLOYMENT_DATA', payload: data }),
    updateChecklistProgress: (progress) => dispatch({ type: 'UPDATE_CHECKLIST_PROGRESS', payload: progress }),
    setLoading: (loading: boolean) => dispatch({ type: 'SET_LOADING', payload: loading }),
    setError: (error: string | null) => dispatch({ type: 'SET_ERROR', payload: error }),
    completeOnboarding: () => dispatch({ type: 'COMPLETE_ONBOARDING' }),
    setUserPlan: (plan) => dispatch({ type: 'SET_USER_PLAN', payload: plan }),
    reset: () => dispatch({ type: 'RESET' }),
  };

  return (
    <OnboardingContext.Provider value={{ state, actions }}>
      {children}
    </OnboardingContext.Provider>
  );
};
