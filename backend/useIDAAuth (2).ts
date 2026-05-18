
import { useState, useEffect } from "react";

export interface UserInfo {
  name?: string;
  email?: string;
  username?: string;
}

export interface ValidationError {
  message: string;
  isValidationError: boolean;
}

export function useIDAAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [validationError, setValidationError] = useState<ValidationError | null>(null);

  const AUTH_BASE_URL = "https://auth-service-backend-273497745552.us-central1.run.app";
  const CLIENT_ID = "edms1";
  // const API_BASE_URL = "https://continuum-backend-823807258560.us-central1.run.app";
  const API_BASE_URL = "https://continuum-backend-823807258560.us-central1.run.app";

  const getTokens = () => {
    const stored = localStorage.getItem("authTokens");
    return stored ? JSON.parse(stored) : null;
  };

  const clearTokens = () => {
    localStorage.removeItem("authTokens");
  };

  const login = () => {
    window.location.href = `${AUTH_BASE_URL}/login/${CLIENT_ID}?prompt=select_account`;
  };

  const logout = (remote: boolean = true) => {
    const tokens = getTokens();
    const idToken = tokens?.idToken;
    clearTokens();

    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');

    if (remote && idToken) {
      window.location.href = `${AUTH_BASE_URL}/logout/${CLIENT_ID}?id_token=${encodeURIComponent(
        idToken
      )}`;
    } else {
      try {
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        }
      } catch (e) {
        // ignore
      }
      window.location.href = "/edms/login";
    }
  };

  const parseJwt = (token: string) => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      const parsed = JSON.parse(jsonPayload);

      return {
        name: parsed.name || parsed.given_name || parsed.preferred_username || parsed.sub,
        email: parsed.email || parsed.mail,
        username: parsed.preferred_username || parsed.sub,
        sub: parsed.sub,
        roles: parsed.roles || parsed.realm_access?.roles || []
      };
    } catch (e) {
      return null;
    }
  };

  const validateEntraUser = async (email: string): Promise<{ success: boolean; user?: any; backendToken?: string; error?: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/validate-entra-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        const data = await response.json();
        // Backend returns: { access_token, token_type, expires_in, user }
        return {
          success: true,
          user: data.user,
          backendToken: data.access_token  // This is YOUR backend JWT token
        };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.detail || 'Validation failed' };
      }
    } catch (error) {
      console.error('Error validating Entra user:', error);
      return { success: false, error: 'Failed to connect to server' };
    }
  };

  const handleAuthCallback = async () => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    if (params.get("success") === "true") {
      const tokens = {
        accessToken: params.get("access_token"),
        idToken: params.get("id_token"),
        refreshToken: params.get("refresh_token"),
      };

      const idToken = tokens.idToken;
      if (idToken) {
        const decodedToken = parseJwt(idToken);
        if (decodedToken && decodedToken.email) {
          // Validate user against our database BEFORE allowing access
          const validationResult = await validateEntraUser(decodedToken.email);

          if (!validationResult.success) {
            // User not in our database - clear tokens and show error
            clearTokens();
            localStorage.removeItem('authToken');
            localStorage.removeItem('userInfo');
            setValidationError({
              message: validationResult.error || 'You are not authorized to access EDMS.',
              isValidationError: true
            });
            setIsAuthenticated(false);
            setLoading(false);
            // Redirect to login with error message
            window.location.replace(`/edms/login?error=${encodeURIComponent(validationResult.error || 'Not authorized')}`);
            return;
          }

          // User validated successfully - store tokens and user info
          localStorage.setItem("authTokens", JSON.stringify(tokens));
          setIsAuthenticated(true);
          setValidationError(null);

          const validatedUser = validationResult.user;
          const backendJWT = validationResult.backendToken;

          setUserInfo({
            name: validatedUser?.full_name || decodedToken.name,
            email: validatedUser?.email || decodedToken.email,
            username: validatedUser?.username || decodedToken.username
          });

          // Store the BACKEND JWT token (not Entra ID token) for API calls
          localStorage.setItem('authToken', backendJWT || '');
          localStorage.setItem('userInfo', JSON.stringify({
            id: validatedUser?.id || decodedToken.sub,
            username: validatedUser?.username || decodedToken.username,
            email: validatedUser?.email || decodedToken.email,
            full_name: validatedUser?.full_name || decodedToken.name,
            roles: validatedUser?.roles || decodedToken.roles || []
          }));

          window.location.replace("/edms/");
        } else {
          // No email in token - cannot validate
          setValidationError({
            message: 'Unable to retrieve email from authentication token.',
            isValidationError: true
          });
          setIsAuthenticated(false);
          setLoading(false);
          window.location.replace('/edms/login?error=No email in token');
        }
      }
    }
  };

  useEffect(() => {
    if (window.location.hash.includes("access_token")) {
      handleAuthCallback();
    } else {
      const tokens = getTokens();
      const isAuth = !!tokens?.accessToken;
      setIsAuthenticated(isAuth);

      if (isAuth && tokens.idToken) {
        const decodedToken = parseJwt(tokens.idToken);
        if (decodedToken) {
          const newUserInfo = {
            name: decodedToken.name,
            email: decodedToken.email,
            username: decodedToken.username
          };
          setUserInfo(newUserInfo);
        }
      }
    }
    setLoading(false);
  }, []);

  return { isAuthenticated, loading, login, logout, userInfo, validationError };
}
