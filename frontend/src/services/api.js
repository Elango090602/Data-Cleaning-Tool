const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (!envUrl) return '/api';
  // If the URL is set to backend root without /api prefix, auto-append it for safety
  if (envUrl.startsWith('http') && !envUrl.endsWith('/api') && !envUrl.endsWith('/api/')) {
    return `${envUrl.replace(/\/$/, '')}/api`;
  }
  return envUrl;
};
const BASE_URL = getBaseUrl();


/**
 * Uploads a raw lead CSV or Excel file.
 */
export async function uploadFile(files) {
  const formData = new FormData();
  if (Array.isArray(files)) {
    files.forEach((file) => {
      formData.append("files", file);
    });
  } else {
    formData.append("files", files);
  }

  const response = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to upload files. Please check format and try again.");
  }

  return response.json();
}

/**
 * Submits mappings and cleaning configurations to process lead cleaning.
 */
export async function cleanData(payload) {
  const response = await fetch(`${BASE_URL}/clean`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to clean data. Please check configurations.");
  }

  return response.json();
}

/**
 * Triggers a native browser file download for a processed output.
 */
export function downloadFile(fileId, format = "csv") {
  if (!fileId) return;
  const url = `${BASE_URL}/download/${fileId}?format=${format}`;
  const link = document.createElement("a");
  link.href = url;
  // Trigger standard browser download handler
  link.setAttribute("download", "");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Cleans up temporary session files from the server.
 */
export async function cleanupSession(sessionId) {
  try {
    const response = await fetch(`${BASE_URL}/cleanup/${sessionId}`, {
      method: "DELETE",
    });
    return response.json();
  } catch (err) {
    console.error("Failed to trigger session cleanup on server", err);
  }
}

/**
 * Promotes a manually fixed quarantined lead back to the clean list.
 */
export async function promoteLead(payload) {
  const response = await fetch(`${BASE_URL}/clean/promote-lead`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to promote record. Please review values.");
  }

  return response.json();
}

/**
 * Bulk resolves all quarantined leads back to the clean list as Grade C.
 */
export async function bulkResolve(payload) {
  const response = await fetch(`${BASE_URL}/clean/bulk-resolve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to bulk resolve records.");
  }

  return response.json();
}

/**
 * Sends a 6-digit OTP to the user's email.
 */
export async function sendOTP(email) {
  const response = await fetch(`${BASE_URL}/auth/send-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to send verification code. Please check email address.");
  }

  return response.json();
}

/**
 * Verifies the 6-digit OTP.
 */
export async function verifyOTP(email, otp) {
  const response = await fetch(`${BASE_URL}/auth/verify-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, otp }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || "Invalid verification code. Please try again.");
  }

  return response.json();
}

/**
 * Fetches the user profile details from the server.
 */
export async function getUserProfile() {
  const token = localStorage.getItem("lead_cleaner_token");
  const response = await fetch(`${BASE_URL}/auth/profile`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to fetch profile settings.");
  }

  return response.json();
}

/**
 * Saves/updates the user profile details on the server.
 */
export async function updateUserProfile(profileData) {
  const token = localStorage.getItem("lead_cleaner_token");
  const response = await fetch(`${BASE_URL}/auth/profile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(profileData)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to update profile settings.");
  }

  return response.json();
}

/**
 * Log in / Sign up via simulated Google account.
 */
export async function googleLogin(email, name) {
  const response = await fetch(`${BASE_URL}/auth/google-login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, name }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || "Google authentication failed. Please try again.");
  }

  return response.json();
}

/**
 * Fetch Google OAuth Redirect URL
 */
export async function getGoogleAuthUrl() {
  const response = await fetch(`${BASE_URL}/auth/google-url`);
  if (!response.ok) throw new Error("Failed to retrieve Google Auth Redirect URL.");
  return response.json();
}

/**
 * Exchange Google OAuth Authorization Code for User Session
 */
export async function exchangeGoogleCode(code, redirectUri, flow = "signup") {
  const response = await fetch(`${BASE_URL}/auth/google-callback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ code, redirect_uri: redirectUri, flow })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || "Google OAuth exchange failed.");
  }

  return response.json();
}

/**
 * Verify Secure OTP database code
 */
export async function verifyOtpSecure(email, otp) {
  const response = await fetch(`${BASE_URL}/auth/verify-otp-secure`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, otp })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const error = new Error(errData.detail || "Invalid or expired verification code.");
    error.status = errData.status;
    throw error;
  }

  return response.json();
}

/**
 * Resend OTP with Rate Limiting protection
 */
export async function resendOtpSecure(email) {
  const response = await fetch(`${BASE_URL}/auth/resend-otp-secure`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || "Resend rate limit exceeded. Please wait 60 seconds.");
  }

  return response.json();
}

/**
 * Simulated B2B Google sign-in wrapper using database schemas
 */
export async function googleLoginSimulated(email, name, flow = "signup") {
  const response = await fetch(`${BASE_URL}/auth/google-login-simulated`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, name, flow })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || "Simulated database Google login failed.");
  }

  return response.json();
}

/**
 * Register a new user with email, password, name, and role.
 */
export async function registerUser({ email, password, name, role }) {
  const response = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password, name, role }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to register user. Please try again.");
  }

  return response.json();
}

/**
 * Verify a newly registered user's OTP.
 */
export async function verifyRegistration({ email, otp }) {
  const response = await fetch(`${BASE_URL}/auth/verify-registration`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, otp }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || "Invalid registration verification code. Please try again.");
  }

  return response.json();
}

/**
 * Login a registered user with email and password.
 */
export async function loginUser({ email, password }) {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const error = new Error(errData.detail || "Failed to login. Please try again.");
    error.status = response.status;
    error.data = errData;
    throw error;
  }

  return response.json();
}

/**
 * Request a password reset code.
 */
export async function forgotPassword(email) {
  const response = await fetch(`${BASE_URL}/auth/forgot-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to process request. Please try again.");
  }

  return response.json();
}

/**
 * Reset password using the reset OTP.
 */
export async function resetPassword({ email, otp, newPassword }) {
  const response = await fetch(`${BASE_URL}/auth/reset-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, otp, new_password: newPassword }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to reset password. Please check your OTP and try again.");
  }

  return response.json();
}


