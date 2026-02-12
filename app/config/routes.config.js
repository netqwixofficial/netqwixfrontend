

import { AccountType } from '../common/constants';

export const ROUTES = {
  // Public Routes
  LANDING: {
    path: '/',
    name: 'Landing',
    requiresAuth: false,
    isPublic: true,
    redirectIfAuth: true,
    meta: {
      title: 'NetQwix - Qwick Lessons Over the Net',
      description: 'Connect with expert trainers for personalized lessons',
    },
  },

  // Auth Routes
  AUTH: {
    SIGN_IN: {
      path: '/auth/signIn',
      name: 'Sign In',
      requiresAuth: false,
      isPublic: true,
      redirectIfAuth: true,
      meta: {
        title: 'Sign In - NetQwix',
        description: 'Sign in to your NetQwix account',
      },
    },
    SIGN_IN_CLASSIC: {
      path: '/auth/signInClassic',
      name: 'Sign In Classic',
      requiresAuth: false,
      isPublic: true,
      redirectIfAuth: true,
      meta: {
        title: 'Sign In Classic - NetQwix',
      },
    },
    SIGN_UP: {
      path: '/auth/signUp',
      name: 'Sign Up',
      requiresAuth: false,
      isPublic: true,
      redirectIfAuth: true,
      meta: {
        title: 'Sign Up - NetQwix',
        description: 'Create a new NetQwix account',
      },
    },
    SIGN_UP_CLASSIC: {
      path: '/auth/signUpClassic',
      name: 'Sign Up Classic',
      requiresAuth: false,
      isPublic: true,
      redirectIfAuth: true,
      meta: {
        title: 'Sign Up Classic - NetQwix',
      },
    },
    FORGET_PASSWORD: {
      path: '/auth/forgetPassword',
      name: 'Forget Password',
      requiresAuth: false,
      isPublic: true,
      redirectIfAuth: false,
      meta: {
        title: 'Reset Password - NetQwix',
        description: 'Reset your password',
      },
    },
    VERIFIED_FORGET_PASSWORD: {
      path: '/auth/verified-forget-password',
      name: 'Verified Forget Password',
      requiresAuth: false,
      isPublic: true,
      redirectIfAuth: false,
      meta: {
        title: 'Reset Password - NetQwix',
      },
    },
  },

  // Protected Routes - Dashboard
  DASHBOARD: {
    path: '/dashboard',
    name: 'Dashboard',
    requiresAuth: true,
    isPublic: false,
    allowedRoles: [AccountType.TRAINER, AccountType.TRAINEE],
    meta: {
      title: 'Dashboard - NetQwix',
      description: 'Your NetQwix dashboard',
    },
  },

  // Protected Routes - Meeting
  MEETING: {
    path: '/meeting',
    name: 'Meeting',
    requiresAuth: true,
    isPublic: false,
    allowedRoles: [AccountType.TRAINER, AccountType.TRAINEE],
    meta: {
      title: 'Video Meeting - NetQwix',
      description: 'Join your video session',
    },
  },

  // Protected Routes - Messenger
  MESSENGER: {
    path: '/messenger',
    name: 'Messenger',
    requiresAuth: true,
    isPublic: false,
    allowedRoles: [AccountType.TRAINER, AccountType.TRAINEE],
    meta: {
      title: 'Messages - NetQwix',
      description: 'Chat with your contacts',
    },
  },

  // Protected Routes - Blog
  BLOG: {
    DETAIL_SIDEBAR: {
      path: '/blog/detailSidebar',
      name: 'Blog Detail Sidebar',
      requiresAuth: false,
      isPublic: true,
      meta: {
        title: 'Blog - NetQwix',
      },
    },
    LEFT_SIDEBAR: {
      path: '/blog/leftSidebar',
      name: 'Blog Left Sidebar',
      requiresAuth: false,
      isPublic: true,
      meta: {
        title: 'Blog - NetQwix',
      },
    },
    NO_SIDEBAR: {
      path: '/blog/noSidebar',
      name: 'Blog No Sidebar',
      requiresAuth: false,
      isPublic: true,
      meta: {
        title: 'Blog - NetQwix',
      },
    },
    RIGHT_SIDEBAR: {
      path: '/blog/rightSidebar',
      name: 'Blog Right Sidebar',
      requiresAuth: false,
      isPublic: true,
      meta: {
        title: 'Blog - NetQwix',
      },
    },
    SIDEBAR: {
      path: '/blog/sidebar',
      name: 'Blog Sidebar',
      requiresAuth: false,
      isPublic: true,
      meta: {
        title: 'Blog - NetQwix',
      },
    },
  },

  // Protected Routes - Bonus Pages
  BONUS: {
    ABOUT: {
      path: '/bonus/about',
      name: 'About',
      requiresAuth: false,
      isPublic: true,
      meta: {
        title: 'About - NetQwix',
      },
    },
    ELEMENTS: {
      path: '/bonus/elements',
      name: 'Elements',
      requiresAuth: false,
      isPublic: true,
      meta: {
        title: 'Elements - NetQwix',
      },
    },
    FAQ: {
      path: '/bonus/faq',
      name: 'FAQ',
      requiresAuth: false,
      isPublic: true,
      meta: {
        title: 'FAQ - NetQwix',
      },
    },
    PRICE: {
      path: '/bonus/price',
      name: 'Pricing',
      requiresAuth: false,
      isPublic: true,
      meta: {
        title: 'Pricing - NetQwix',
      },
    },
  },

  // Landing Pages
  LANDING_PAGES: {
    ABOUT_APP: {
      path: '/landing/aboutApp',
      name: 'About App',
      requiresAuth: false,
      isPublic: true,
      meta: {
        title: 'About App - NetQwix',
      },
    },
    ABOUT_CHIT_CHAT: {
      path: '/landing/aboutChitChat',
      name: 'About ChitChat',
      requiresAuth: false,
      isPublic: true,
      meta: {
        title: 'About ChitChat - NetQwix',
      },
    },
    CATEGORY: {
      path: '/landing/category',
      name: 'Category',
      requiresAuth: false,
      isPublic: true,
      meta: {
        title: 'Categories - NetQwix',
      },
    },
    COLLABORATION: {
      path: '/landing/collaboration',
      name: 'Collaboration',
      requiresAuth: false,
      isPublic: true,
      meta: {
        title: 'Collaboration - NetQwix',
      },
    },
    COURSE: {
      path: '/landing/course',
      name: 'Course',
      requiresAuth: false,
      isPublic: true,
      meta: {
        title: 'Courses - NetQwix',
      },
    },
    FAQ: {
      path: '/landing/Faq',
      name: 'FAQ',
      requiresAuth: false,
      isPublic: true,
      meta: {
        title: 'FAQ - NetQwix',
      },
    },
    INDEX: {
      path: '/landing/index',
      name: 'Landing Index',
      requiresAuth: false,
      isPublic: true,
      meta: {
        title: 'NetQwix - Qwick Lessons Over the Net',
      },
    },
    PRICE_PLAN: {
      path: '/landing/pricePlan',
      name: 'Price Plan',
      requiresAuth: false,
      isPublic: true,
      meta: {
        title: 'Pricing Plans - NetQwix',
      },
    },
    SECURE_APP: {
      path: '/landing/secureApp',
      name: 'Secure App',
      requiresAuth: false,
      isPublic: true,
      meta: {
        title: 'Secure App - NetQwix',
      },
    },
    SLIDER_SECTION: {
      path: '/landing/sliderSection',
      name: 'Slider Section',
      requiresAuth: false,
      isPublic: true,
      meta: {
        title: 'NetQwix',
      },
    },
    SUBSCRIBE: {
      path: '/landing/subscribe',
      name: 'Subscribe',
      requiresAuth: false,
      isPublic: true,
      meta: {
        title: 'Subscribe - NetQwix',
      },
    },
    TEAM_EXPERT: {
      path: '/landing/teamExpert',
      name: 'Team Expert',
      requiresAuth: false,
      isPublic: true,
      meta: {
        title: 'Team Expert - NetQwix',
      },
    },
    TEAM_WORK: {
      path: '/landing/teamWork',
      name: 'Team Work',
      requiresAuth: false,
      isPublic: true,
      meta: {
        title: 'Team Work - NetQwix',
      },
    },
    TOP_TRAINERS: {
      path: '/landing/TopTrainers',
      name: 'Top Trainers',
      requiresAuth: false,
      isPublic: true,
      meta: {
        title: 'Top Trainers - NetQwix',
      },
    },
    YOUR_COURSES: {
      path: '/landing/yourCourses',
      name: 'Your Courses',
      requiresAuth: false,
      isPublic: true,
      meta: {
        title: 'Your Courses - NetQwix',
      },
    },
  },

  // Error Pages
  ERROR: {
    NOT_FOUND: {
      path: '/404',
      name: 'Not Found',
      requiresAuth: false,
      isPublic: true,
      meta: {
        title: '404 - Page Not Found',
      },
    },
  },
};

/**
 * Get route configuration by path
 * @param {string} path - Route path
 * @returns {Object|null} Route configuration or null if not found
 */
export function getRouteByPath(path) {
  // Normalize path (remove query params and hash)
  const normalizedPath = path.split('?')[0].split('#')[0];

  // Recursive search through ROUTES object
  function searchRoutes(obj) {
    for (const key in obj) {
      const value = obj[key];
      if (value && typeof value === 'object') {
        if (value.path === normalizedPath) {
          return value;
        }
        const found = searchRoutes(value);
        if (found) return found;
      }
    }
    return null;
  }

  return searchRoutes(ROUTES);
}

/**
 * Check if route requires authentication
 * @param {string} path - Route path
 * @returns {boolean} True if route requires auth
 */
export function requiresAuth(path) {
  const route = getRouteByPath(path);
  return route ? route.requiresAuth : false;
}

/**
 * Check if route is public
 * @param {string} path - Route path
 * @returns {boolean} True if route is public
 */
export function isPublicRoute(path) {
  const route = getRouteByPath(path);
  return route ? route.isPublic : false;
}

/**
 * Check if user has access to route based on role
 * @param {string} path - Route path
 * @param {string} userRole - User's account type (Trainer/Trainee)
 * @returns {boolean} True if user has access
 */
export function hasAccess(path, userRole) {
  const route = getRouteByPath(path);
  if (!route) return false;
  
  // Public routes are accessible to everyone
  if (route.isPublic) return true;
  
  // If route requires auth but no user role, deny access
  if (route.requiresAuth && !userRole) return false;
  
  // If no allowedRoles specified, all authenticated users can access
  if (!route.allowedRoles || route.allowedRoles.length === 0) return true;
  
  // Check if user role is in allowed roles
  return route.allowedRoles.includes(userRole);
}

/**
 * Check if authenticated users should be redirected away from route
 * @param {string} path - Route path
 * @returns {boolean} True if should redirect
 */
export function shouldRedirectIfAuth(path) {
  const route = getRouteByPath(path);
  return route ? route.redirectIfAuth : false;
}

/**
 * Get route metadata (title, description, etc.)
 * @param {string} path - Route path
 * @returns {Object} Route metadata
 */
export function getRouteMeta(path) {
  const route = getRouteByPath(path);
  return route ? route.meta || {} : {};
}

/**
 * Get all public routes
 * @returns {Array} Array of public route paths
 */
export function getPublicRoutes() {
  const publicRoutes = [];
  
  function collectPublicRoutes(obj) {
    for (const key in obj) {
      const value = obj[key];
      if (value && typeof value === 'object') {
        if (value.isPublic && value.path) {
          publicRoutes.push(value.path);
        }
        collectPublicRoutes(value);
      }
    }
  }
  
  collectPublicRoutes(ROUTES);
  return publicRoutes;
}

/**
 * Get all protected routes
 * @returns {Array} Array of protected route paths
 */
export function getProtectedRoutes() {
  const protectedRoutes = [];
  
  function collectProtectedRoutes(obj) {
    for (const key in obj) {
      const value = obj[key];
      if (value && typeof value === 'object') {
        if (value.requiresAuth && value.path) {
          protectedRoutes.push(value.path);
        }
        collectProtectedRoutes(value);
      }
    }
  }
  
  collectProtectedRoutes(ROUTES);
  return protectedRoutes;
}

