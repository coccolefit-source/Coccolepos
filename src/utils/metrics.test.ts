/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Pruebas Unitarias para Lógica Financiera, Métricas Operativas y Gamificación
 */

import { parseTimeToMinutes, getTaskDurationMinutes, calculateLeaderboard, getGlobalMetrics } from './metrics';
import { isEfectivo, isTarjeta, isTransferencia, isRappi, DEFAULT_RANKING_WEIGHTS, Usuario, Tarea, RegistroVenta, Fichaje, ProductoPromocion, Venta } from '../types';

describe('Payment Method Normalization Helpers', () => {
  test('isEfectivo detects cash variations', () => {
    expect(isEfectivo('Efectivo')).toBe(true);
    expect(isEfectivo('efectivo')).toBe(true);
    expect(isEfectivo('CASH')).toBe(true);
    expect(isEfectivo(undefined)).toBe(true); // Default fallback
    expect(isEfectivo('Tarjeta')).toBe(false);
  });

  test('isTarjeta detects card and POS variations', () => {
    expect(isTarjeta('Tarjeta')).toBe(true);
    expect(isTarjeta('Datáfono')).toBe(true);
    expect(isTarjeta('datafono')).toBe(true);
    expect(isTarjeta('debito')).toBe(true);
    expect(isTarjeta('crédito')).toBe(true);
    expect(isTarjeta('POS')).toBe(true);
    expect(isTarjeta('Efectivo')).toBe(false);
  });

  test('isTransferencia detects digital transfers (Nequi, Daviplata, Bancolombia)', () => {
    expect(isTransferencia('Transferencia')).toBe(true);
    expect(isTransferencia('Nequi')).toBe(true);
    expect(isTransferencia('Daviplata')).toBe(true);
    expect(isTransferencia('Bancolombia')).toBe(true);
    expect(isTransferencia('banco')).toBe(true);
    expect(isTransferencia('Efectivo')).toBe(false);
  });

  test('isRappi detects delivery platform orders', () => {
    expect(isRappi('Rappi')).toBe(true);
    expect(isRappi('rappi')).toBe(true);
    expect(isRappi('pedidos')).toBe(true);
    expect(isRappi('domicilio')).toBe(true);
    expect(isRappi('Efectivo')).toBe(false);
  });
});

describe('Time Calculations', () => {
  test('parseTimeToMinutes parses HH:MM to minutes correctly', () => {
    expect(parseTimeToMinutes('00:00')).toBe(0);
    expect(parseTimeToMinutes('01:30')).toBe(90);
    expect(parseTimeToMinutes('08:00')).toBe(480);
    expect(parseTimeToMinutes('23:59')).toBe(1439);
    expect(parseTimeToMinutes(undefined)).toBe(0);
  });

  test('getTaskDurationMinutes calculates task duration', () => {
    const tarea: Tarea = {
      id: '1',
      titulo: 'Limpieza',
      descripcion: 'Barra',
      area: 'Operativa',
      fecha: '2026-09-26',
      estado: 'Completada',
      asignado_a: 'usr-1',
      tiempo_estimado_min: 30,
      hora_inicio: '08:00',
      hora_fin: '08:25',
      requiere_foto: false
    };

    expect(getTaskDurationMinutes(tarea)).toBe(25);
  });
});

describe('Global Metrics & Leaderboard Calculations', () => {
  const dummyUser: Usuario = {
    id: 'emp-1',
    nombre: 'Diego Torres',
    rol: 'empleado',
    pin: '1234'
  };

  const dummyTareas: Tarea[] = [
    {
      id: 't-1',
      titulo: 'Apertura',
      descripcion: '',
      area: 'General',
      fecha: '2026-09-26',
      estado: 'Completada',
      asignado_a: 'emp-1',
      tiempo_estimado_min: 20,
      hora_inicio: '07:00',
      hora_fin: '07:15',
      requiere_foto: false
    },
    {
      id: 't-2',
      titulo: 'Cierre',
      descripcion: '',
      area: 'General',
      fecha: '2026-09-26',
      estado: 'Pendiente',
      asignado_a: 'emp-1',
      tiempo_estimado_min: 30,
      requiere_foto: false
    }
  ];

  test('getGlobalMetrics calculates correct percentage and tasks count', () => {
    const metrics = getGlobalMetrics(dummyTareas, [], [], 'diario', '2026-09-26');
    expect(metrics.tareasTotales).toBe(2);
    expect(metrics.tareasCompletadas).toBe(1);
    expect(metrics.tareasPendientes).toBe(1);
    expect(metrics.cumplimientoGeneralPct).toBe(50);
  });

  test('calculateLeaderboard scores employee accurately', () => {
    const scores = calculateLeaderboard(
      [dummyUser],
      dummyTareas,
      [],
      [],
      [],
      'diario',
      '2026-09-26',
      [],
      DEFAULT_RANKING_WEIGHTS
    );

    expect(scores.length).toBe(1);
    expect(scores[0].usuario.id).toBe('emp-1');
    expect(scores[0].tareasCompletadas).toBe(1);
    expect(scores[0].tareasTotales).toBe(2);
    expect(scores[0].puntosTotales).toBeGreaterThan(0);
  });
});
