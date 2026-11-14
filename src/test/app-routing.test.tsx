import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { getTopic } from "@/features/crop-care/knowledge";
import { assistantReply } from "@/features/crop-care/services/advisory";
import { bandForScore } from "@/features/crop-care/services/diagnosis";
import { routeTree } from "@/routeTree.gen";

describe("App routing", () => {
  const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
  it.each(["/", "/welcome", "/diagnose", "/library", "/history", "/profile", "/scans/abc", "/library/rice/rice-blast"])("matches %s", (path) => {
    expect(router.matchRoutes(path).at(-1)?.routeId).not.toBe(rootRouteId);
  });
});

describe("Rules", () => {
  it("only finds topics that exist for a crop", () => {
    expect(getTopic("chilli", "anthracnose")?.name.en).toBe("Anthracnose");
    expect(getTopic("rice", "anthracnose")).toBeUndefined();
  });
  it("maps IRRI scores to bands", () => {
    expect(bandForScore("irri-ses", 3)).toBe("mild");
    expect(bandForScore("irri-ses", 5)).toBe("moderate");
    expect(bandForScore("irri-ses", 7)).toBe("severe");
  });
  it("assistant refuses pesticide dose questions", () => {
    expect(assistantReply("what pesticide dose for blast?", {}, "en").safety).toBe(true);
  });
});
