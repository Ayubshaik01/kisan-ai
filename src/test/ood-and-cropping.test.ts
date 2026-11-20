import { describe, expect, it } from "vitest";
import { assessPixels } from "../features/crop-care/services/quality";

describe("Out-Of-Distribution (OOD) Non-Plant & Face Rejection", () => {
  it("rejects synthetic human face / skin tone images", () => {
    const W = 64;
    const H = 64;
    const pixels = new Uint8ClampedArray(W * H * 4);

    // Simulate human skin tone: R ~ 180, G ~ 125, B ~ 85
    for (let i = 0; i < W * H; i++) {
      pixels[i * 4] = 180 + (i % 5);
      pixels[i * 4 + 1] = 125 + (i % 4);
      pixels[i * 4 + 2] = 85 + (i % 3);
      pixels[i * 4 + 3] = 255;
    }

    const report = assessPixels(pixels, W, H);
    expect(report.ok).toBe(false);
    const leafCheck = report.checks.find((c) => c.id === "leaf");
    expect(leafCheck?.pass).toBe(false);
    expect(leafCheck?.tip).toContain("Human face or skin detected");
  });

  it("rejects non-plant indoor room / furniture without leaf chlorophyll", () => {
    const W = 64;
    const H = 64;
    const pixels = new Uint8ClampedArray(W * H * 4);

    // Simulate grey/white wall and brown floor with natural texture but without chlorophyll
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const noise = (x * 7 + y * 13) % 40;
        pixels[i] = 130 + noise;
        pixels[i + 1] = 125 + noise;
        pixels[i + 2] = 120 + noise;
        pixels[i + 3] = 255;
      }
    }

    const report = assessPixels(pixels, W, H);
    expect(report.ok).toBe(false);
    const leafCheck = report.checks.find((c) => c.id === "leaf");
    expect(leafCheck?.pass).toBe(false);
  });

  it("accepts genuine green botanical crop leaves", () => {
    const W = 64;
    const H = 64;
    const pixels = new Uint8ClampedArray(W * H * 4);

    // Simulate vibrant plant leaf with natural sensor noise and hundreds of distinct green hues
    for (let i = 0; i < W * H; i++) {
      const idx = i * 4;
      const r = 30 + ((i * 37) % 50);
      const g = 130 + ((i * 73) % 100);
      const b = 25 + ((i * 19) % 40);
      pixels[idx] = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
      pixels[idx + 3] = 255;
    }

    const report = assessPixels(pixels, W, H);
    const leafCheck = report.checks.find((c) => c.id === "leaf");
    expect(leafCheck?.pass).toBe(true);
    expect(report.greenShare).toBeGreaterThan(0.70);
  });
});

describe("Square Viewfinder Reticle Cropping Geometry", () => {
  it("calculates exact center square coordinates for 16:9 video in 4:3 container", () => {
    const vw = 1280;
    const vh = 720;
    const containerW = 400;
    const containerH = 300;

    // object-cover scale factor:
    const scale = Math.min(vw / containerW, vh / containerH); // min(3.2, 2.4) = 2.4
    expect(scale).toBe(2.4);

    // Container center (200, 150)
    const rcx = 200;
    const rcy = 150;

    const vidCx = (vw / 2) + (rcx - containerW / 2) * scale;
    const vidCy = (vh / 2) + (rcy - containerH / 2) * scale;

    expect(vidCx).toBe(640);
    expect(vidCy).toBe(360);

    // A 240x240 on-screen reticle
    const reticleSize = 240;
    const cropSize = reticleSize * scale; // 240 * 2.4 = 576 px
    expect(cropSize).toBe(576);

    const sx = Math.max(0, Math.min(vw - cropSize, Math.floor(vidCx - cropSize / 2)));
    const sy = Math.max(0, Math.min(vh - cropSize, Math.floor(vidCy - cropSize / 2)));

    expect(sx).toBe(640 - 288); // 352
    expect(sy).toBe(360 - 288); // 72
    expect(sx + cropSize).toBeLessThanOrEqual(vw);
    expect(sy + cropSize).toBeLessThanOrEqual(vh);
  });
});
