const accessTokenKey = "taskflow.access_token";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getStoredAccessToken() {
  if (!canUseStorage()) {
    return null;
  }

  return window.localStorage.getItem(accessTokenKey);
}

export function setStoredAccessToken(token: string) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(accessTokenKey, token);
}

export function clearStoredAccessToken() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(accessTokenKey);
}
