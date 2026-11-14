import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { getCondition, getCrop } from "@/features/crop-care/data";
import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

  it.each([
    ["/", "/"],
    ["/check", "/check"],
    ["/ask", "/ask"],
    ["/notes", "/notes/"],
    ["/notes/abc", "/notes/$noteId"],
    ["/guide", "/guide/"],
    ["/guide/rice", "/guide/$cropKey/"],
    ["/guide/chilli/leaf-curl", "/guide/$cropKey/$conditionSlug"],
    ["/settings", "/settings"],
    ["/about", "/about"],
  ])("matches a page for %s", (path, routeId) => {
    const matches = router.matchRoutes(path);
    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
    expect(matches.at(-1)?.routeId).toBe(routeId);
  });

  it("finds guide pages only for crops and symptoms that exist", () => {
    expect(getCrop("rice")?.name).toBe("Rice");
    expect(getCrop("tomato")).toBeUndefined();
    expect(getCondition("chilli", "anthracnose")?.condition.name).toBe("Anthracnose");
    expect(getCondition("rice", "anthracnose")).toBeUndefined();
  });
});
