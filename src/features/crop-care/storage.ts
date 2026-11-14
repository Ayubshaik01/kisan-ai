export type LocalScan = {
  id: string;
  crop: "chilli" | "rice";
  createdAt: string;
  image: string;
  note: string;
  severity: "Not assessed";
  status: "not-analyzed";
};

const SCANS_KEY = "fieldnote.local-scans.v1";
const LANGUAGE_KEY = "fieldnote.language.v1";
const THEME_KEY = "fieldnote.theme.v1";

export function readScans(): LocalScan[] {
  if (typeof window === "undefined") return [];
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(SCANS_KEY) ?? "[]");
    return Array.isArray(saved) ? (saved as LocalScan[]) : [];
  } catch {
    return [];
  }
}

export function saveScan(scan: LocalScan): LocalScan[] {
  const scans = [scan, ...readScans()].slice(0, 30);
  window.localStorage.setItem(SCANS_KEY, JSON.stringify(scans));
  return scans;
}

export function clearScans(): void {
  window.localStorage.removeItem(SCANS_KEY);
}

export function readPreference(key: "language" | "theme"): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key === "language" ? LANGUAGE_KEY : THEME_KEY);
  } catch {
    return null;
  }
}

export function savePreference(key: "language" | "theme", value: string): void {
  try {
    window.localStorage.setItem(key === "language" ? LANGUAGE_KEY : THEME_KEY, value);
  } catch {
    // Keep the app usable for this visit even when device storage is unavailable.
  }
}

export function compressPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("This photo could not be opened."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("This photo could not be opened."));
      image.onload = () => {
        const scale = Math.min(1, 960 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("This device could not prepare the photo."));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
export function deleteScan(id: string): LocalScan[] {
  const scans = readScans().filter((scan) => scan.id !== id);
  window.localStorage.setItem(SCANS_KEY, JSON.stringify(scans));
  return scans;
}
