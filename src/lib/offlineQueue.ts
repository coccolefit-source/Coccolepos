/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Cola de Sincronización Fuera de Línea (Offline Sync Queue)
 * Permite que ventas, tareas y asistencias se guarden localmente si la conexión
 * a internet o a Supabase falla, reintentando automáticamente cuando vuelve la red.
 */

import {
  insertSaleInSupabase,
  updateDailyTaskStatusInSupabase,
  insertTimeEntryInSupabase,
  upsertInventoryInSupabase,
  isSupabaseConfigured
} from './supabaseClient';

export type QueuedActionType = 'insert_sale' | 'update_task_status' | 'insert_time_entry' | 'update_inventory';

export interface QueuedAction {
  id: string;
  type: QueuedActionType;
  payload: any;
  timestamp: number;
  retryCount: number;
}

const STORAGE_KEY = 'coccole_offline_sync_queue_v1';
let isProcessing = false;
const listeners: Array<(pendingCount: number) => void> = [];

export function getOfflineQueue(): QueuedAction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Error al leer cola offline de localStorage:', e);
    return [];
  }
}

function saveOfflineQueue(queue: QueuedAction[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    notifyListeners(queue.length);
  } catch (e) {
    console.warn('Error al guardar cola offline en localStorage:', e);
  }
}

export function subscribeToQueueCount(callback: (pendingCount: number) => void): () => void {
  listeners.push(callback);
  callback(getOfflineQueue().length);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

function notifyListeners(count: number) {
  listeners.forEach(fn => {
    try {
      fn(count);
    } catch (e) {
      console.error('Error notificando listener de cola offline:', e);
    }
  });
}

/**
 * Añade una acción a la cola de sincronización offline
 */
export function enqueueOfflineAction(type: QueuedActionType, payload: any): void {
  const queue = getOfflineQueue();
  const newAction: QueuedAction = {
    id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type,
    payload,
    timestamp: Date.now(),
    retryCount: 0
  };

  queue.push(newAction);
  saveOfflineQueue(queue);

  // Si hay conexión, intentar procesar de inmediato
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    processOfflineQueue();
  }
}

/**
 * Procesa todos los elementos pendientes en la cola
 */
export async function processOfflineQueue(): Promise<{ processed: number; remaining: number }> {
  if (isProcessing) return { processed: 0, remaining: getOfflineQueue().length };
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { processed: 0, remaining: getOfflineQueue().length };
  }
  if (!isSupabaseConfigured()) {
    return { processed: 0, remaining: getOfflineQueue().length };
  }

  isProcessing = true;
  let processedCount = 0;
  const currentQueue = getOfflineQueue();

  if (currentQueue.length === 0) {
    isProcessing = false;
    return { processed: 0, remaining: 0 };
  }

  const remainingQueue: QueuedAction[] = [];

  for (const item of currentQueue) {
    let success = false;
    try {
      switch (item.type) {
        case 'insert_sale':
          success = await insertSaleInSupabase(item.payload);
          break;
        case 'update_task_status':
          success = await updateDailyTaskStatusInSupabase(
            item.payload.id,
            item.payload.estado,
            item.payload.foto_url,
            item.payload.nota_evidencia
          );
          break;
        case 'insert_time_entry':
          success = await insertTimeEntryInSupabase(item.payload);
          break;
        case 'update_inventory':
          success = await upsertInventoryInSupabase(item.payload);
          break;
        default:
          success = true; // Descartar tipos desconocidos
      }
    } catch (err) {
      console.warn(`Error al sincronizar acción offline (${item.type}):`, err);
      success = false;
    }

    if (success) {
      processedCount++;
    } else {
      item.retryCount += 1;
      // Reintentar hasta 5 veces antes de descartar
      if (item.retryCount <= 5) {
        remainingQueue.push(item);
      } else {
        console.error(`Acción offline descartada tras 5 reintentos fallidos:`, item);
      }
    }
  }

  saveOfflineQueue(remainingQueue);
  isProcessing = false;
  return { processed: processedCount, remaining: remainingQueue.length };
}

// Configurar auto-sincronización al recuperar conectividad
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[OfflineQueue] Conexión recuperada. Sincronizando acciones pendientes...');
    processOfflineQueue();
  });

  // Reintento periódico cada 30 segundos si hay conexión activa
  setInterval(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      const queue = getOfflineQueue();
      if (queue.length > 0) {
        processOfflineQueue();
      }
    }
  }, 30000);
}
