/**
 * Navigation Utilities
 * Helper functions for route navigation and management
 */

import { useRouter } from 'next/router';
import { ROUTES, getRouteByPath, hasAccess, shouldRedirectIfAuth } from '../config/routes.config';
import { AccountType, LOCAL_STORAGE_KEYS } from '../common/constants';

/**
 * Navigation helper class
 */
export class Navigation {
  /**
   * Navigate to a route
   * @param {Object} router - Next.js router instance
   * @param {string} path - Route path
   * @param {Object} options - Navigation options (query, as, etc.)
   */
  static navigate(router, path, options = {}) {
    const { query, as, replace = false, shallow = false } = options;
    
    if (replace) {
      router.replace({ pathname: path, query }, as);
    } else {
      router.push({ pathname: path, query }, as);
    }
  }

  /**
   * Navigate to dashboard
   * @param {Object} router - Next.js router instance
   */
  static toDashboard(router) {
    this.navigate(router, ROUTES.DASHBOARD.path);
  }

  /**
   * Navigate to sign in
   * @param {Object} router - Next.js router instance
   */
  static toSignIn(router) {
    this.navigate(router, ROUTES.AUTH.SIGN_IN.path);
  }

  /**
   * Navigate to sign up
   * @param {Object} router - Next.js router instance
   */
  static toSignUp(router) {
    this.navigate(router, ROUTES.AUTH.SIGN_UP.path);
  }

  /**
   * Navigate to landing page
   * @param {Object} router - Next.js router instance
   */
  static toLanding(router) {
    this.navigate(router, ROUTES.LANDING.path);
  }

  /**
   * Navigate to meeting
   * @param {Object} router - Next.js router instance
   * @param {Object} query - Query parameters (e.g., { id: 'meeting-id' })
   */
  static toMeeting(router, query = {}) {
    this.navigate(router, ROUTES.MEETING.path, { query });
  }

  /**
   * Navigate to messenger
   * @param {Object} router - Next.js router instance
   */
  static toMessenger(router) {
    this.navigate(router, ROUTES.MESSENGER.path);
  }

  /**
   * Navigate back
   * @param {Object} router - Next.js router instance
   * @param {string} fallback - Fallback path if no history
   */
  static back(router, fallback = ROUTES.DASHBOARD.path) {
    if (window.history.length > 1) {
      router.back();
    } else {
      this.navigate(router, fallback);
    }
  }

  /**
   * Check if current route matches path
   * @param {Object} router - Next.js router instance
   * @param {string} path - Route path to check
   * @returns {boolean} True if current route matches
   */
  static isCurrentRoute(router, path) {
    return router.pathname === path || router.asPath === path;
  }

  /**
   * Get current route configuration
   * @param {Object} router - Next.js router instance
   * @returns {Object|null} Current route configuration
   */
  static getCurrentRoute(router) {
    return getRouteByPath(router.pathname);
  }

  /**
   * Check if user can access current route
   * @param {Object} router - Next.js router instance
   * @param {string} userRole - User's account type
   * @returns {boolean} True if user can access
   */
  static canAccessCurrentRoute(router, userRole) {
    return hasAccess(router.pathname, userRole);
  }
}

/**
 * React hook for navigation
 * @returns {Object} Navigation utilities
 */
export function useNavigation() {
  const router = useRouter();

  return {
    navigate: (path, options) => Navigation.navigate(router, path, options),
    toDashboard: () => Navigation.toDashboard(router),
    toSignIn: () => Navigation.toSignIn(router),
    toSignUp: () => Navigation.toSignUp(router),
    toLanding: () => Navigation.toLanding(router),
    toMeeting: (query) => Navigation.toMeeting(router, query),
    toMessenger: () => Navigation.toMessenger(router),
    back: (fallback) => Navigation.back(router, fallback),
    isCurrentRoute: (path) => Navigation.isCurrentRoute(router, path),
    getCurrentRoute: () => Navigation.getCurrentRoute(router),
    canAccessCurrentRoute: (userRole) => Navigation.canAccessCurrentRoute(router, userRole),
    router, // Expose router for advanced usage
  };
}

/**
 * Get user role from localStorage
 * @returns {string|null} User's account type or null
 */
export function getUserRole() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LOCAL_STORAGE_KEYS.ACC_TYPE);
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if user is authenticated
 */
export function isAuthenticated() {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN);
}

/**
 * Get redirect path based on user role
 * @param {string} userRole - User's account type
 * @returns {string} Redirect path
 */
export function getRedirectPath(userRole) {
  if (!userRole) {
    return ROUTES.LANDING.path;
  }
  
  // Role-specific redirects can be added here
  return ROUTES.DASHBOARD.path;
}

