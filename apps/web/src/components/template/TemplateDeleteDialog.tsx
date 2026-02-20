"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@web/components/ui/dialog";
import { Button } from "@web/components/ui/button";

interface TemplateDeleteDialogProps {
  readonly templateName: string;
  readonly open: boolean;
  readonly loading: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function TemplateDeleteDialog({
  templateName,
  open,
  loading,
  onConfirm,
  onCancel,
}: TemplateDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete template?</DialogTitle>
          <DialogDescription>
            This will permanently delete &ldquo;{templateName}&rdquo; and all
            its versions. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
