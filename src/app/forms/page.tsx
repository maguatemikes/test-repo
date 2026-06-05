import { listForms } from "@/server/repositories/forms";
import { listLists } from "@/server/repositories/lists";
import { FormsView, type FormRow } from "@/components/pages-components/FormsView";

// TODO: derive org from auth once wired.
const ORG_ID = 1;

export const dynamic = "force-dynamic";

export default async function FormsPage() {
  let forms: Awaited<ReturnType<typeof listForms>> = [];
  let lists: Awaited<ReturnType<typeof listLists>> = [];
  try {
    [forms, lists] = await Promise.all([listForms(ORG_ID), listLists(ORG_ID)]);
  } catch (err) {
    console.error("[forms] DB fetch failed:", err);
  }

  const formsData: FormRow[] = forms.map((f) => ({
    id: f.id,
    name: f.name,
    slug: f.slug,
    type: f.type,
    status: f.status,
    impressions: f.impressions,
    submissions: f.submissions,
    targetListId: f.targetListId,
    fields: (f.fieldsJson as FormRow["fields"]) ?? [],
    design: (f.designJson as FormRow["design"]) ?? null,
    targeting: (f.targetingJson as FormRow["targeting"]) ?? null,
    success: (f.successBehaviorJson as FormRow["success"]) ?? null,
    updatedAt: f.updatedAt ? new Date(f.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—",
  }));

  const listsData = lists.map((l) => ({ id: l.id, name: l.name }));

  return <FormsView forms={formsData} lists={listsData} />;
}
