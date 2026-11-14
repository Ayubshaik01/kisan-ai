import { createFileRoute, notFound } from "@tanstack/react-router";
import { getCondition } from "@/features/crop-care/data";
import { pageMeta } from "@/features/crop-care/meta";
import { ConditionPage } from "@/features/crop-care/pages/ConditionPage";

export const Route = createFileRoute("/guide/$cropKey/$conditionSlug")({
  loader: ({ params }) => {
    const match = getCondition(params.cropKey, params.conditionSlug);
    if (!match) throw notFound();
    return { cropKey: match.crop.key, slug: match.condition.slug, title: `${match.condition.name} in ${match.crop.name.toLowerCase()}`, signs: match.condition.signs };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? pageMeta(loaderData.title, loaderData.signs)
      : [{ title: "Crop guide · Fieldnote" }, { name: "robots", content: "noindex" }],
  }),
  component: ConditionRoute,
});

function ConditionRoute() {
  const { cropKey, slug } = Route.useLoaderData();
  const match = getCondition(cropKey, slug);
  return match ? <ConditionPage crop={match.crop} condition={match.condition} /> : null;
}
