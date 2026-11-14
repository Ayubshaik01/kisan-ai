export async function registerCropCareAppShell(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const disabled = new URLSearchParams(window.location.search).has("sw");

  if (import.meta.env.DEV || window.top !== window || disabled) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations
        .filter((registration) => new URL(registration.scope).pathname === "/")
        .map((registration) => registration.unregister())
    );
    return;
  }

  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    // Offline shell is a progressive enhancement; app functions standalone without it.
  }
}
