import { ImportWizard } from "@web/components/import/ImportWizard";

export default function ImportPage() {
  return (
    <div className="container py-8">
      <h1 className="mb-6 font-serif text-2xl font-bold">Import Questions</h1>
      <ImportWizard />
    </div>
  );
}
