export const CONSENT_STORAGE_KEY = "rp-cookie-consent";
export const CONSENT_CHANGE_EVENT = "rp:cookie-consent-change";

export type ConsentValue = "accepted" | "rejected";

export function readConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return v === "accepted" || v === "rejected" ? v : null;
  } catch {
    return null;
  }
}

export function writeConsent(value: ConsentValue): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
    window.dispatchEvent(
      new CustomEvent<ConsentValue>(CONSENT_CHANGE_EVENT, { detail: value })
    );
  } catch {
    /* storage unavailable — treat as ephemeral */
  }
}

export function clearConsent(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CONSENT_STORAGE_KEY);
    window.dispatchEvent(
      new CustomEvent<ConsentValue | null>(CONSENT_CHANGE_EVENT, { detail: null })
    );
  } catch {
    /* ignore */
  }
}
