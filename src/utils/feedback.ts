/**
 * Sistema centralizado de notificaciones Toast y modal de confirmación
 * que reemplaza los alert() y confirm() nativos del navegador.
 */

export type FeedbackToastType = 'success' | 'error' | 'warning' | 'info';

export interface FeedbackToastItem {
  id: string;
  message: string;
  type: FeedbackToastType;
  durationMs: number;
}

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  confirmLabel?: string;
  cancelText?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  tone?: 'danger' | 'warning' | 'primary';
}

interface NormalizedConfirmDialogOptions {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  variant: 'danger' | 'primary';
}

interface PendingConfirmRequest {
  id: string;
  options: NormalizedConfirmDialogOptions;
  resolve: (accepted: boolean) => void;
}

type ToastListener = (toast: FeedbackToastItem) => void;
type ConfirmListener = (req: PendingConfirmRequest) => void;

const toastListeners = new Set<ToastListener>();
const confirmListeners = new Set<ConfirmListener>();

export function subscribeFeedbackToasts(listener: ToastListener): () => void {
  toastListeners.add(listener);
  return () => {
    toastListeners.delete(listener);
  };
}

export function subscribeConfirmDialogs(listener: ConfirmListener): () => void {
  confirmListeners.add(listener);
  return () => {
    confirmListeners.delete(listener);
  };
}

export function showToast(
  message: string,
  type: FeedbackToastType = 'info',
  durationMs: number = 4200
): void {
  const item: FeedbackToastItem = {
    id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    message,
    type,
    durationMs,
  };
  toastListeners.forEach((fn) => fn(item));
}

export function showSuccessToast(message: string): void {
  showToast(message, 'success', 3800);
}

export function showErrorToast(message: string): void {
  showToast(message, 'error', 5200);
}

export function showWarningToast(message: string): void {
  showToast(message, 'warning', 4500);
}

export function confirmDialog(
  input: string | ConfirmDialogOptions
): Promise<boolean> {
  const opts: ConfirmDialogOptions =
    typeof input === 'string' ? { message: input } : input;

  const resolvedVariant: 'danger' | 'primary' =
    opts.variant || (opts.tone === 'primary' ? 'primary' : 'danger');

  const normalized: NormalizedConfirmDialogOptions = {
    title: opts.title || 'Confirmar acción',
    message: opts.message,
    confirmText: opts.confirmText || opts.confirmLabel || 'Confirmar',
    cancelText: opts.cancelText || opts.cancelLabel || 'Cancelar',
    variant: resolvedVariant,
  };

  if (confirmListeners.size === 0) {
    return Promise.resolve(false);
  }

  return new Promise<boolean>((resolve) => {
    const req: PendingConfirmRequest = {
      id: `cfm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      options: normalized,
      resolve,
    };
    confirmListeners.forEach((fn) => fn(req));
  });
}
