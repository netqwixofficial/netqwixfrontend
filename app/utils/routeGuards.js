/**
 * Route Guards
 * Functions to protect routes and handle access control
 */

import { 
  getRouteByPath, 
  requiresAuth, 
  isPublicRoute, 
  hasAccess, 
  shouldRedirectIfAuth 
} from '../config/routes.config';
import { LOCAL_STORAGE_KEYS } from '../common/constants';

/**
 * Check if user is authenticated
 * @returns {boolean} True if authenticated
 */
export function checkAuth() {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN);
}

/**
 * Get user role from storage
 * @returns {string|null} User's account type
 */
export function getUserRole() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LOCAL_STORAGE_KEYS.ACC_TYPE);
}

/**
 * Route guard result
 */
export class RouteGuardResult {
  constructor(allowed, redirectPath = null, reason = null) {
    this.allowed = allowed;
    this.redirectPath = redirectPath;
    this.reason = reason;
  }

  static allow() {
    return new RouteGuardResult(true);
  }

  static deny(redirectPath, reason) {
    return new RouteGuardResult(false, redirectPath, reason);
  }
}

/**
 * Check if route access is allowed
 * @param {string} path - Route path
 * @param {string} userRole - User's account type
 * @returns {RouteGuardResult} Guard result
 */
export function checkRouteAccess(path, userRole = null) {
  const route = getRouteByPath(path);
  
  // If route not found, allow access (let Next.js handle 404)
  if (!route) {
    return RouteGuardResult.allow();
  }

  const isAuth = checkAuth();

  // Handle public routes
  if (route.isPublic) {
    // If route redirects authenticated users away, check auth status
    // But only enforce this for auth pages and landing page to avoid breaking existing flows
    if (route.redirectIfAuth && isAuth) {
      // Only redirect from sign-in/sign-up pages, not all public routes
      const shouldRedirect = path.includes('/auth/sign') || path === '/';
      if (shouldRedirect) {
        return RouteGuardResult.deny(
          '/dashboard',
          'Authenticated users are redirected from public route'
        );
      }
    }
    return RouteGuardResult.allow();
  }

  // Handle protected routes
  if (route.requiresAuth) {
    // Check authentication
    if (!isAuth) {
      return RouteGuardResult.deny(
        '/auth/signIn',
        'Authentication required'
      );
    }

    // Check role-based access
    if (route.allowedRoles && route.allowedRoles.length > 0) {
      if (!userRole || !route.allowedRoles.includes(userRole)) {
        return RouteGuardResult.deny(
          '/dashboard',
          `Access denied. Required roles: ${route.allowedRoles.join(', ')}`
        );
      }
    }

    return RouteGuardResult.allow();
  }

  // Default: allow access
  return RouteGuardResult.allow();
}

/**
 * Get appropriate redirect path for unauthenticated user
 * @param {string} currentPath - Current route path
 * @returns {string} Redirect path
 */
export function getUnauthenticatedRedirect(currentPath) {
  // If trying to access auth pages, allow
  const authPaths = [
    '/auth/signIn',
    '/auth/signUp',
    '/auth/forgetPassword',
    '/auth/verified-forget-password',
  ];
  
  if (authPaths.includes(currentPath)) {
    return currentPath;
  }

  // Default: redirect to sign in
  return '/auth/signIn';
}

/**
 * Get appropriate redirect path for authenticated user
 * @param {string} currentPath - Current route path
 * @param {string} userRole - User's account type
 * @returns {string} Redirect path
 */
export function getAuthenticatedRedirect(currentPath, userRole = null) {
  // If on auth pages, redirect to dashboard
  const authPaths = [
    '/auth/signIn',
    '/auth/signUp',
    '/auth/signInClassic',
    '/auth/signUpClassic',
  ];
  
  if (authPaths.includes(currentPath)) {
    return '/dashboard';
  }

  // If on landing page, redirect to dashboard
  if (currentPath === '/') {
    return '/dashboard';
  }

  // Default: stay on current path
  return currentPath;
}

/**
 * Validate route access and return guard result
 * @param {string} path - Route path
 * @param {Object} options - Guard options
 * @returns {RouteGuardResult} Guard result
 */
export function guardRoute(path, options = {}) {
  const { userRole = getUserRole() } = options;
  return checkRouteAccess(path, userRole);
}

