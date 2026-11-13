/** Elige el formulario con el que se evalúa un proyecto. */
export function resolveFormId(
  categoryId: string | null,
  forms: { id: string; is_published: boolean; is_default: boolean }[],
  formCategories: { form_id: string; category_id: string }[],
): string | null {
  const published = forms.filter((f) => f.is_published);
  if (categoryId) {
    const link = formCategories.find((fc) => fc.category_id === categoryId);
    if (link && published.some((f) => f.id === link.form_id)) return link.form_id;
  }
  const general = published.find((f) => f.is_default);
  if (general) return general.id;
  // Si solo hay un formulario publicado y no está asignado a ninguna categoría, úsalo.
  const unassigned = published.filter((f) => !formCategories.some((fc) => fc.form_id === f.id));
  if (unassigned.length === 1) return unassigned[0].id;
  if (published.length === 1 && !categoryId) return published[0].id;
  return null;
}
