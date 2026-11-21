import type { QualityReport } from "./types";

/** Pure image-quality maths on RGBA pixels, so it runs the same in the browser and in tests. */
export function assessPixels(data: Uint8ClampedArray, width: number, height: number): QualityReport {
  const gray = new Float32Array(width * height);
  let sum = 0;
  let green = 0;
  let chlorotic = 0;
  let lesion = 0;
  let straw = 0;
  let neonCount = 0;
  let skinCount = 0;
  const colorMap = new Map<number, number>();

  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4]!, g = data[i * 4 + 1]!, b = data[i * 4 + 2]!;
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    gray[i] = y;
    sum += y;

    // 5-bit color quantization
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    colorMap.set(key, (colorMap.get(key) || 0) + 1);

    // Artificial neon colors common in cartoons/clipart
    if ((r > 230 && g > 230 && b < 25) || (g > 235 && r < 30 && b > 235) || (r < 25 && g > 245 && b < 25)) {
      neonCount++;
    }

    // Biometric human skin tone detection (YCbCr + Kovac chromatic space)
    const yCb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const yCr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    const isYcbcrSkin = yCr >= 133 && yCr <= 173 && yCb >= 77 && yCb <= 127;
    const isKovacSkin = r > 80 && g > 35 && b > 20 && r > g && r > b && (r - g) > 15 && (r - b) > 25;
    const isSkinPixel = isYcbcrSkin || isKovacSkin;

    if (isSkinPixel) {
      skinCount++;
    } else {
      // Multi-spectral botanical foliage classification
      // 1. Green foliage: dark green, bright green, or shaded foliage
      const isGreen =
        (g >= r * 0.92 && g > b * 1.05 && g > 25) ||
        (g > 35 && g > r * 0.88 && g > b * 1.08);

      // 2. Chlorotic, lime, & yellow foliage (requires distinct yellow saturation; b significantly lower than green and red)
      const isChlorotic =
        (r > 60 && g > 55 && g >= r * 0.78 && b < Math.min(r, g) * 0.75 && (r + g) > 2.2 * b);

      // 3. Brown, necrotic, & fungal lesion tissue (requires distinct brown pigment, not grey walls or furniture)
      const isLesion =
        (r > 40 && g > 20 && r >= g * 1.02 && b < Math.min(r, g) * 0.75 && (r - g) < 55 && (r + g) > 2.0 * b);

      // 4. Straw, tan, & desiccated leaf blade/sheath tissue
      const isStraw =
        (r > 65 && g > 55 && g >= r * 0.75 && b < Math.min(r, g) * 0.75 && Math.abs(r - g) < 40 && (r + g) > 2.2 * b);

      if (isGreen) {
        green++;
      } else if (isChlorotic) {
        chlorotic++;
      } else if (isLesion) {
        lesion++;
      } else if (isStraw) {
        straw++;
      }
    }
  }
  const n = width * height;
  const brightness = sum / n;
  let variance = 0;
  for (let i = 0; i < n; i++) variance += (gray[i]! - brightness) ** 2;
  const contrast = Math.sqrt(variance / n);

  // Variance of the Laplacian: low values mean a blurry image.
  let lapSum = 0, lapSq = 0, count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap = gray[i - width]! + gray[i + width]! + gray[i - 1]! + gray[i + 1]! - 4 * gray[i]!;
      lapSum += lap;
      lapSq += lap * lap;
      count++;
    }
  }
  const mean = count ? lapSum / count : 0;
  const sharpness = count ? lapSq / count - mean * mean : 0;
  const greenShare = green / n;
  const plantTissueShare = (green + chlorotic + lesion + straw) / n;

  let maxColorOccurrences = 0;
  for (const occ of colorMap.values()) {
    if (occ > maxColorOccurrences) maxColorOccurrences = occ;
  }
  const topColorShare = maxColorOccurrences / n;
  const uniqueColorCount = colorMap.size;

  // Reject flat vector art, drawings, cartoons:
  const isCartoonOrDrawing =
    (uniqueColorCount < 20 && topColorShare > 0.85 && plantTissueShare < 0.05) ||
    ((neonCount / n) > 0.20 && plantTissueShare < 0.05);

  // Reject human faces (only when human skin dominates and virtually no botanical plant tissue is present)
  const isHumanFace = (skinCount / n) > 0.25 && greenShare < 0.08;
  const isMissingBotanicalFoliage = plantTissueShare < 0.04 && !isHumanFace && !isCartoonOrDrawing;

  const leafOk = !isCartoonOrDrawing && !isHumanFace && !isMissingBotanicalFoliage;

  const sharpOk = sharpness >= 40;
  const lightOk = brightness >= 45 && brightness <= 235;
  const subjectOk = contrast >= 18;
  const suitable = sharpOk && lightOk && subjectOk && leafOk;

  const leafTip = isHumanFace
    ? "Human face or skin detected. Please photograph a crop leaf, not people or faces."
    : isMissingBotanicalFoliage
    ? "No agricultural crop leaf detected. Please photograph a rice or chilli plant leaf."
    : isCartoonOrDrawing
    ? "Drawing or cartoon detected. Please photograph a real crop leaf."
    : "Real botanical foliage detected.";

  return {
    ok: suitable,
    brightness: Math.round(brightness),
    sharpness: Math.round(sharpness),
    contrast: Math.round(contrast),
    greenShare: Math.round(greenShare * 100) / 100,
    checks: [
      { id: "leaf", pass: leafOk, tip: leafTip },
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
      // Center crop to square matching the viewfinder reticle
      const square = Math.min(image.width, image.height);
      const sx = Math.floor((image.width - square) / 2);
      const sy = Math.floor((image.height - square) / 2);
      const canvas = document.createElement("canvas");
      canvas.width = square;
      canvas.height = square;
      canvas.getContext("2d")?.drawImage(image, sx, sy, square, square, 0, 0, square, square);
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
