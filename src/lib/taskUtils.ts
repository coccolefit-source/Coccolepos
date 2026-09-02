/**
 * Calcula el tiempo transcurrido o duración total de una tarea.
 * Si está terminada, calcula de inicio a fin.
 * Si está en proceso, calcula de inicio a la hora actual.
 */
export const calcularTiempoTarea = (startedAt?: string, completedAt?: string): string => {
  if (!startedAt) return 'Sin iniciar';
  
  const inicio = new Date(startedAt).getTime();
  const fin = completedAt ? new Date(completedAt).getTime() : new Date().getTime();
  
  const diferenciaMs = fin - inicio;
  if (diferenciaMs < 0) return 'En proceso';
  
  const minutosTotal = Math.floor(diferenciaMs / (1000 * 60));
  const horas = Math.floor(minutosTotal / 60);
  const minutos = minutosTotal % 60;
  
  if (horas === 0) {
    return `${minutos} min`;
  }
  return `${horas}h ${minutos}m`;
};
