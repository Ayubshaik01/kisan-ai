import type { QualityReport } from "./types";

/** Pure image-quality maths on RGBA pixels, so it runs the same in the browser and in tests. */
export function assessPixels(data: Uint8ClampedArray, width: number, height: number): QualityReport {
  const gray = new Float32Array(width * height);
  let sum = 0;
  let green = 0;
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    gray[i] = y;
    sum += y;
    if (g > r * 1.05 && g > b * 1.05 && g > 40) green++;
  }
  const n = width * height;
  const brightness = sum / n;
  let variance = 0;
  for (let i = 0; i < n; i++) variance += (gray[i] - brightness) ** 2;
  const contrast = Math.sqrt(variance / n);

  // Variance of the Laplacian: low values mean a blurry image.
  let lapSum = 0, lapSq = 0, count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap = gray[i - width] + gray[i + width] + gray[i - 1] + gray[i + 1] - 4 * gray[i];
      lapSum += lap;
      lapSq += lap * lap;
      count++;
    }
  }
  const mean = count ? lapSum / count : 0;
  const sharpness = count ? lapSq / count - mean * mean : 0;
  const greenShare = green / n;

  const sharpOk = sharpness >= 40;
  const lightOk = brightness >= 45 && brightness <= 235;
  const subjectOk = contrast >= 18;
  const suitable = sharpOk && lightOk && subjectOk;

  return {
    ok: suitable,
    brightness: Math.round(brightness),
    sharpness: Math.round(sharpness),
    contrast: Math.round(contrast),
    greenShare: Math.round(greenShare * 100) / 100,
    checks: [
      { id: "blur", pass: sharpOk, tip: sharpOk ? "Sharp enough to see detail." : "The photo looks blurry. Hold the phone steady and tap the screen to focus." },
      { id: "dark", pass: lightOk, tip: lightOk ? "Lighting is good." : brightness < 45 ? "The photo is too dark. Move into daylight or turn on the flash." : "The photo is too bright. Avoid direct glare on the leaf." },
      { id: "subject", pass: subjectOk, tip: subjectOk ? "The subject stands out." : "The plant doesn't stand out. Move closer so the affected area fills the frame." },
      { id: "suitability", pass: suitable, tip: suitable ? "Suitable for analysis." : "Fix the points above, then retake the photo." },
    ],
  };
}

export function assessImage(dataUrl: string): Promise<QualityReport> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onerror = () => reject(new Error("invalid-image"));
    image.onload = () => {
      const scale = 256 / Math.max(image.width, image.height);
      const w = Math.max(8, Math.round(image.width * scale));
      const h = Math.max(8, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("invalid-image"));
      ctx.drawImage(image, 0, 0, w, h);
      resolve(assessPixels(ctx.getImageData(0, 0, w, h).data, w, h));
    };
    image.src = dataUrl;
  });
}

export function compressPhoto(source: File | HTMLCanvasElement): Promise<string> {
  if (source instanceof HTMLCanvasElement) return Promise.resolve(resizeCanvas(source));
  return new Promise((resolve, reject) => {
    if (!source.type.startsWith("image/")) return reject(new Error("invalid-image"));
    const url = URL.createObjectURL(source);
    const image = new Image();
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("invalid-image")); };
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      canvas.getContext("2d")?.drawImage(image, 0, 0);
      URL.revokeObjectURL(url);
      resolve(resizeCanvas(canvas));
    };
    image.src = url;
  });
}

function resizeCanvas(source: HTMLCanvasElement): string {
  const scale = Math.min(1, 960 / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  canvas.getContext("2d")?.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.74);
}
