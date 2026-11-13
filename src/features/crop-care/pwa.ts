const previewHostPattern = /^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+\.(?:lovable\.app|gpt-eng\.com|gptengineer\.run)$/;

export async function registerCropCareAppShell(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const hostname = window.location.hostname.toLowerCase();
  const blockedHost =
    previewHostPattern.test(hostname) ||
    /^project--.+-dev\.(?:lovable\.app|gpt-eng\.com|gptengineer\.run)$/.test(hostname) ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev");
  const disabled = new URLSearchParams(window.location.search).has("sw");

  if (import.meta.env.DEV || window.top !== window || blockedHost || disabled) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations
        .filter((registration) => new URL(registration.scope).pathname === "/")
        .map((registration) => registration.unregister()),
    );
    return;
  }

  const { registerSW } = await import("virtual:pwa-register");
  registerSW({ immediate: true });
}