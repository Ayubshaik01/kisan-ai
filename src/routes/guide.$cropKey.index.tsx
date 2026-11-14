import { createFileRoute, notFound } from "@tanstack/react-router";
import { getCrop } from "@/features/crop-care/data";
import { pageMeta } from "@/features/crop-care/meta";
import { CropPage } from "@/features/crop-care/pages/CropPage";

export const Route = createFileRoute("/guide/$cropKey/")({
  loader: ({ params }) => {
    const crop = getCrop(params.cropKey);
    if (!crop) throw notFound();
    return { cropKey: crop.key, name: crop.name, about: crop.about };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? pageMeta(`${loaderData.name} crop guide`, loaderData.about)
      : [{ title: "Crop guide · Fieldnote" }, { name: "robots", content: "noindex" }],
  }),
  component: CropRoute,
});

function CropRoute() {
  const { cropKey } = Route.useLoaderData();
  const crop = getCrop(cropKey);
  return crop ? <CropPage crop={crop} /> : null;
}
