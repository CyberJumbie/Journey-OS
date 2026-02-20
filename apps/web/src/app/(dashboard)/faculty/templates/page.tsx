"use client";

import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@web/components/ui/button";
import { TemplateFilters } from "@web/components/template/TemplateFilters";
import { TemplateGrid } from "@web/components/template/TemplateGrid";
import { TemplateForm } from "@web/components/template/TemplateForm";
import { TemplatePreview } from "@web/components/template/TemplatePreview";
import { TemplateDeleteDialog } from "@web/components/template/TemplateDeleteDialog";
import { useTemplates } from "@web/hooks/use-templates";
import type {
  TemplateDTO,
  CreateTemplateRequest,
  UpdateTemplateRequest,
} from "@journey-os/types";

export default function TemplatesPage() {
  const {
    templates,
    loading,
    error,
    filters,
    setFilters,
    refetch,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleDuplicate,
    mutating,
  } = useTemplates();

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<
    TemplateDTO | undefined
  >();
  const [previewTemplate, setPreviewTemplate] = useState<TemplateDTO | null>(
    null,
  );
  const [deletingTemplate, setDeletingTemplate] = useState<TemplateDTO | null>(
    null,
  );

  const openCreate = useCallback(() => {
    setEditingTemplate(undefined);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((template: TemplateDTO) => {
    setEditingTemplate(template);
    setFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditingTemplate(undefined);
  }, []);

  const onFormSubmit = useCallback(
    async (data: CreateTemplateRequest | UpdateTemplateRequest) => {
      if (editingTemplate) {
        const result = await handleUpdate(
          editingTemplate.id,
          data as UpdateTemplateRequest,
        );
        if (result) closeForm();
      } else {
        const result = await handleCreate(data as CreateTemplateRequest);
        if (result) closeForm();
      }
    },
    [editingTemplate, handleUpdate, handleCreate, closeForm],
  );

  const onDuplicate = useCallback(
    async (template: TemplateDTO) => {
      await handleDuplicate(template.id);
    },
    [handleDuplicate],
  );

  const onDeleteConfirm = useCallback(async () => {
    if (!deletingTemplate) return;
    const success = await handleDelete(deletingTemplate.id);
    if (success) setDeletingTemplate(null);
  }, [deletingTemplate, handleDelete]);

  const hasFilters = !!(
    filters.sharing_level ||
    filters.question_type ||
    filters.search
  );

  return (
    <div className="space-y-6 p-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-foreground">
          Templates
        </h1>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-error/20 bg-error/5 p-3 text-sm text-error">
          {error}
          <Button variant="ghost" size="sm" onClick={refetch} className="ml-2">
            Retry
          </Button>
        </div>
      )}

      {/* Filters */}
      <TemplateFilters filters={filters} onChange={setFilters} />

      {/* Grid */}
      <TemplateGrid
        templates={templates}
        loading={loading}
        hasFilters={hasFilters}
        onEdit={openEdit}
        onDuplicate={onDuplicate}
        onPreview={setPreviewTemplate}
        onDelete={setDeletingTemplate}
        onClearFilters={() => setFilters({})}
        onCreateFirst={openCreate}
      />

      {/* Create/Edit dialog */}
      <TemplateForm
        open={formOpen}
        template={editingTemplate}
        loading={mutating}
        onSubmit={onFormSubmit}
        onCancel={closeForm}
      />

      {/* Preview sheet */}
      <TemplatePreview
        template={previewTemplate}
        open={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
      />

      {/* Delete confirmation */}
      {deletingTemplate && (
        <TemplateDeleteDialog
          templateName={deletingTemplate.name}
          open={!!deletingTemplate}
          loading={mutating}
          onConfirm={onDeleteConfirm}
          onCancel={() => setDeletingTemplate(null)}
        />
      )}
    </div>
  );
}
