"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = "Continue",
  tone = "primary",
  isPending,
  error,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  tone?: "primary" | "danger";
  isPending?: boolean;
  error?: string | null;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            loading={isPending}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {description ? <p className="text-sm text-zinc-600">{description}</p> : null}
      {error ? <Alert className="mt-3">{error}</Alert> : null}
    </Modal>
  );
}