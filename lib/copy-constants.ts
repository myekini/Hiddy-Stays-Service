/**
 * Centralized Copy Constants
 * 
 * Guidelines:
 * - Titles: Sentence case, no periods
 * - Descriptions: Sentence case, with periods
 * - No exclamation marks in errors
 * - Success: Use ✓ only
 * - Errors: No emojis
 * - Be concise and action-oriented
 */

export const TOAST_MESSAGES = {
  // Authentication
  auth: {
    signInRequired: {
      title: "Sign in required",
      description: "Please sign in to continue.",
    },
    signInSuccess: {
      title: "Signed in ✓",
      description: "Welcome back.",
    },
    signOutSuccess: {
      title: "Signed out ✓",
      description: "See you next time.",
    },
    sessionExpired: {
      title: "Session expired",
      description: "Please sign in again.",
    },
  },

  // Bookings
  bookings: {
    loadError: {
      title: "Unable to load bookings",
      description: "Check your connection and try again.",
    },
    cancelSuccess: {
      title: "Booking cancelled ✓",
      description: "Your refund will be processed within 5-10 business days.",
    },
    cancelError: {
      title: "Unable to cancel booking",
      description: "Please try again or contact support.",
    },
    paymentRequired: {
      title: "Payment required",
      description: "Complete payment to confirm your booking.",
    },
  },

  // Reviews
  reviews: {
    submitSuccess: {
      title: "Review submitted ✓",
      description: "Thank you for your feedback.",
    },
    submitError: {
      title: "Unable to submit review",
      description: "Please try again.",
    },
    ratingRequired: {
      title: "Rating required",
      description: "Select a star rating to continue.",
    },
    commentRequired: {
      title: "Review required",
      description: "Write your review to continue.",
    },
  },

  // Images
  images: {
    uploadSuccess: {
      title: "Image uploaded ✓",
      description: "Your photo is ready.",
    },
    uploadError: {
      title: "Upload failed",
      description: "Check file size and format, then try again.",
    },
    limitReached: {
      title: "Upload limit reached",
      description: "Maximum 10 images allowed.",
    },
    cropSuccess: {
      title: "Image cropped ✓",
      description: "Your photo has been updated.",
    },
  },

  // Properties
  properties: {
    createSuccess: {
      title: "Property added ✓",
      description: "Your listing is now live.",
    },
    updateSuccess: {
      title: "Property updated ✓",
      description: "Your changes have been saved.",
    },
    deleteSuccess: {
      title: "Property deleted ✓",
      description: "Your listing has been removed.",
    },
    deleteError: {
      title: "Unable to delete property",
      description: "Please try again or contact support.",
    },
  },

  // Profile
  profile: {
    updateSuccess: {
      title: "Profile updated ✓",
      description: "Your changes have been saved.",
    },
    updateError: {
      title: "Unable to update profile",
      description: "Please try again.",
    },
    loadError: {
      title: "Unable to load profile",
      description: "Please refresh the page.",
    },
  },

  // Generic
  generic: {
    success: {
      title: "Success ✓",
      description: "Your action completed successfully.",
    },
    error: {
      title: "Something went wrong",
      description: "Please try again.",
    },
    networkError: {
      title: "Connection error",
      description: "Check your internet connection.",
    },
    permissionDenied: {
      title: "Permission denied",
      description: "You don't have access to this resource.",
    },
  },
} as const;

export const LOADING_MESSAGES = {
  bookings: {
    title: "Loading bookings",
    description: "Loading your reservations...",
  },
  hostDashboard: {
    title: "Loading Host Dashboard",
    description: "Loading your properties and bookings...",
  },
  adminDashboard: {
    title: "Loading Admin Dashboard",
    description: "Verifying permissions...",
  },
  auth: {
    title: "Loading",
    description: "Checking your access...",
  },
} as const;

export const BUTTON_LABELS = {
  // Primary actions
  save: "Save Changes",
  cancel: "Cancel",
  delete: "Delete",
  confirm: "Confirm",
  continue: "Continue",
  submit: "Submit",
  
  // Bookings
  viewBooking: "View Booking",
  cancelBooking: "Cancel Booking",
  keepBooking: "Keep Booking",
  payNow: "Pay Now",
  
  // Properties
  addProperty: "Add Property",
  editProperty: "Edit Property",
  viewProperty: "View Property",
  browseProperties: "Browse Properties",
  
  // Auth
  signIn: "Sign In",
  signOut: "Sign Out",
  signUp: "Sign Up",
  
  // Reviews
  submitReview: "Submit Review",
  writeReview: "Write Review",
} as const;

export const EMAIL_SUBJECTS = {
  bookingConfirmation: (propertyName: string) => 
    `Your stay at ${propertyName} is confirmed`,
  bookingCancellation: (propertyName: string) => 
    `Booking cancelled - ${propertyName}`,
  hostBookingNotification: (propertyName: string, amount: number) => 
    `New booking: ${propertyName} — $${amount} confirmed`,
  welcomeHost: "Welcome to HiddyStays — Keep 100% of your earnings",
  welcomeGuest: "Welcome to HiddyStays — Book with zero hidden fees",
  checkInReminder: (propertyName: string) => 
    `Check-in tomorrow at ${propertyName}`,
  paymentReceipt: (bookingId: string) => 
    `Payment receipt - Booking ${bookingId}`,
} as const;
