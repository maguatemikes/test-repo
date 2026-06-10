import { fetchForms, fetchFormLists } from "@/lib/api/forms";
import { FormsView } from "@/components/pages-components/FormsView";

export const dynamic = "force-dynamic";

export default async function FormsPage() {
  const [forms, lists] = await Promise.all([fetchForms(), fetchFormLists()]);
  return <FormsView forms={forms} lists={lists} />;
}
