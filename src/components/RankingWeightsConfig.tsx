import React, { useState, useEffect } from 'react';
import { RankingWeights, DEFAULT_RANKING_WEIGHTS, UpsellRule, DEFAULT_UPSELL_RULES } from '../types';
import { saveRankingWeightsToSupabase, saveUpsellRulesToSupabase } from '../lib/supabaseClient';

interface RankingWeightsConfigProps {
  currentWeights: RankingWeights;
  onUpdateWeights: (weights: RankingWeights) => void;
  upsellRules?: UpsellRule[];
  onUpdateUpsellRules?: (rules: UpsellRule[]) => void;
}

export const RankingWeightsConfig: React.FC<RankingWeightsConfigProps> = ({
  currentWeights,
  onUpdateWeights,
  upsellRules = DEFAULT_UPSELL_RULES,
  onUpdateUpsellRules,
}) => {
  const [weights, setWeights] = useState<RankingWeights>(currentWeights);
  const [rules, setRules] = useState<UpsellRule[]>(upsellRules);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Estado para crear/editar regla de venta sugerida
  const [newProductoBase, setNewProductoBase] = useState('');
  const [newProductoSugerido, setNewProductoSugerido] = useState('');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  useEffect(() => {
    setWeights(currentWeights);
  }, [currentWeights]);

  useEffect(() => {
    if (upsellRules && upsellRules.length > 0) {
      setRules(upsellRules);
    }
  }, [upsellRules]);

  const totalSum =
    (Number(weights.ventas_monto_pct) || 0) +
    (Number(weights.ventas_cantidad_pct) || 0) +
    (Number(weights.tareas_cumplimiento_pct) || 0) +
    (Number(weights.captura_clientes_pct) || 0) +
    (Number(weights.puntualidad_fichaje_pct) || 0) +
    (Number(weights.ventas_sugeridas_pct) || 0);

  const isValid100 = totalSum === 100;

  const handleChange = (key: keyof RankingWeights, value: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(value || 0)));
    setWeights((prev) => ({ ...prev, [key]: clamped }));
    setSaveSuccessMessage(null);
  };

  const handleReset = () => {
    setWeights(DEFAULT_RANKING_WEIGHTS);
    setSaveSuccessMessage(null);
  };

  const handleSaveWeights = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid100) return;

    setIsSaving(true);
    try {
      const success = await saveRankingWeightsToSupabase(weights);
      onUpdateWeights(weights);
      if (success) {
        setSaveSuccessMessage('Configuración de ponderación guardada exitosamente y ranking recalculado.');
      } else {
        setSaveSuccessMessage('Guardado en almacenamiento local y ranking recalculado.');
      }
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Error guardando ponderación:', err);
      onUpdateWeights(weights);
    } finally {
      setIsSaving(false);
    }
  };

  // Guardar/Agregar Regla de Venta Sugerida
  const handleAddOrUpdateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductoBase.trim() || !newProductoSugerido.trim()) return;

    let updatedRules: UpsellRule[];
    if (editingRuleId) {
      updatedRules = rules.map((r) =>
        r.id === editingRuleId
          ? {
              ...r,
              producto_base_nombre: newProductoBase.trim(),
              producto_sugerido_nombre: newProductoSugerido.trim(),
            }
          : r
      );
      setEditingRuleId(null);
    } else {
      const newRule: UpsellRule = {
        id: `upsell-${Date.now()}`,
        producto_base_nombre: newProductoBase.trim(),
        producto_sugerido_nombre: newProductoSugerido.trim(),
        activa: true,
      };
      updatedRules = [...rules, newRule];
    }

    setRules(updatedRules);
    setNewProductoBase('');
    setNewProductoSugerido('');

    await saveUpsellRulesToSupabase(updatedRules);
    if (onUpdateUpsellRules) {
      onUpdateUpsellRules(updatedRules);
    }
  };

  const handleToggleRuleActive = async (id: string) => {
    const updatedRules = rules.map((r) =>
      r.id === id ? { ...r, activa: !r.activa } : r
    );
    setRules(updatedRules);
    await saveUpsellRulesToSupabase(updatedRules);
    if (onUpdateUpsellRules) {
      onUpdateUpsellRules(updatedRules);
    }
  };

  const handleDeleteRule = async (id: string) => {
    const updatedRules = rules.filter((r) => r.id !== id);
    setRules(updatedRules);
    await saveUpsellRulesToSupabase(updatedRules);
    if (onUpdateUpsellRules) {
      onUpdateUpsellRules(updatedRules);
    }
  };

  const handleEditRuleClick = (rule: UpsellRule) => {
    setEditingRuleId(rule.id);
    setNewProductoBase(rule.producto_base_nombre);
    setNewProductoSugerido(rule.producto_sugerido_nombre);
  };

  const criteriaList: Array<{
    key: keyof RankingWeights;
    label: string;
    description: string;
  }> = [
    {
      key: 'ventas_monto_pct',
      label: 'Ventas Totales ($ Facturado)',
      description: 'Porcentaje de peso atribuido al volumen de dinero facturado por el colaborador.'
    },
    {
      key: 'ventas_cantidad_pct',
      label: 'Cantidad de Transacciones / Ventas',
      description: 'Porcentaje de peso atribuido al número de tickets y ventas completadas.'
    },
    {
      key: 'tareas_cumplimiento_pct',
      label: 'Cumplimiento de Checklist / Tareas Diarias',
      description: 'Porcentaje de peso atribuido al cumplimiento de las tareas operativas asignadas.'
    },
    {
      key: 'captura_clientes_pct',
      label: 'Captura / Registro de Clientes (Fidelización)',
      description: 'Porcentaje de peso atribuido a la vinculación de teléfonos o datos de clientes en las ventas POS.'
    },
    {
      key: 'ventas_sugeridas_pct',
      label: 'Efectividad en Ventas Sugeridas / Cross-selling',
      description: 'Porcentaje de peso atribuido a la colocación de adiciones o complementos sugeridos en la compra.'
    },
    {
      key: 'puntualidad_fichaje_pct',
      label: 'Puntualidad / Fichaje de Turno',
      description: 'Porcentaje de peso atribuido a los fichajes de entrada a tiempo en cada sesión de trabajo.'
    }
  ];

  return (
    <div className="w-full space-y-6">
      {/* SECCIÓN 1: PONDERACIÓN DE MÉTRICAS */}
      <div className="w-full bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-3">
          <span className="text-[10px] font-black uppercase text-[#4B9CD3] tracking-widest block mb-1">
            Configuración Global de Rendimiento
          </span>
          <h3 className="text-base font-extrabold text-[#2C3E50]">
            Ponderación de Métricas de Rendimiento & Ventas Sugeridas
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Ajuste la matriz de ponderación porcentual para el cálculo automático de puntuación y ranking de colaboradores.
          </p>
        </div>

        {/* Indicador y Banner de Validación de Suma (100%) */}
        <div>
          {isValid100 ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex justify-between items-center text-xs">
              <span className="font-bold text-emerald-900">
                Suma de pesos válida: 100%
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-700 uppercase">
                Configuración Balanceada
              </span>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg flex justify-between items-center text-xs">
              <span className="font-bold text-amber-900">
                La suma de los pesos debe ser exactamente igual a 100%. Suma actual: {totalSum}%
              </span>
              <span className="text-[10px] font-mono font-bold text-amber-800 uppercase">
                Ajuste Requerido ({100 - totalSum > 0 ? `Faltan +${100 - totalSum}%` : `Exceso ${100 - totalSum}%`})
              </span>
            </div>
          )}
        </div>

        {saveSuccessMessage && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs font-bold text-[#2C3E50]">
            {saveSuccessMessage}
          </div>
        )}

        {/* Formulario de Criterios con Inputs Numéricos */}
        <form onSubmit={handleSaveWeights} className="space-y-4">
          <div className="space-y-3">
            {criteriaList.map((item) => {
              const val = weights[item.key] || 0;
              return (
                <div
                  key={item.key}
                  className="p-4 bg-[#FFFDF6]/60 border border-[#E2E8F0] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between md:justify-start gap-3">
                      <span className="font-extrabold text-xs text-[#2C3E50]">
                        {item.label}
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-[#EBF5FB] text-[#4B9CD3] px-2 py-0.5 rounded-md">
                        {val}%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {item.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-64 shrink-0">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={val}
                      onChange={(e) => handleChange(item.key, Number(e.target.value))}
                      className="flex-1 accent-[#4B9CD3] cursor-pointer"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={val}
                        onChange={(e) => handleChange(item.key, Number(e.target.value))}
                        className="w-16 text-center font-mono font-bold text-xs px-2 py-1.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4B9CD3] bg-white h-8"
                      />
                      <span className="text-xs font-bold text-slate-500">%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botones de Acción */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer text-center"
            >
              Restablecer Valores Iniciales
            </button>

            <button
              type="submit"
              disabled={!isValid100 || isSaving}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#4B9CD3] hover:bg-[#3A82B4] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer shadow-2xs text-center"
            >
              {isSaving ? 'Guardando Configuración...' : 'Guardar Configuración de Ranking'}
            </button>
          </div>
        </form>
      </div>

      {/* SECCIÓN 2: GESTOR DE REGLAS DE VENTA SUGERIDA (CROSS-SELLING) */}
      <div className="w-full bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <span className="text-[10px] font-black uppercase text-[#4B9CD3] tracking-widest block mb-1">
            Gestión de Cross-Selling en POS
          </span>
          <h3 className="text-base font-extrabold text-[#2C3E50]">
            Gestor de Reglas de Venta Sugerida
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure las asociaciones automáticas de productos para que la terminal POS recomiende complementos al seleccionar un ítem base.
          </p>
        </div>

        {/* Formulario para Crear / Editar Regla */}
        <form onSubmit={handleAddOrUpdateRule} className="bg-[#FFFDF6] border border-[#E2E8F0] rounded-xl p-4 space-y-3">
          <h4 className="text-xs font-bold text-[#2C3E50]">
            {editingRuleId ? 'Editar Regla de Sugerencia' : 'Agregar Nueva Regla de Sugerencia'}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Producto Base (ej. Açaí Bowl)
              </label>
              <input
                type="text"
                value={newProductoBase}
                onChange={(e) => setNewProductoBase(e.target.value)}
                placeholder="Nombre o categoría del producto principal"
                className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4B9CD3] bg-white font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Producto Sugerido / Complemento (ej. Adición Whey Protein Isolate)
              </label>
              <input
                type="text"
                value={newProductoSugerido}
                onChange={(e) => setNewProductoSugerido(e.target.value)}
                placeholder="Nombre del producto o adición sugerida"
                className="w-full text-xs px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4B9CD3] bg-white font-medium"
                required
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            {editingRuleId && (
              <button
                type="button"
                onClick={() => {
                  setEditingRuleId(null);
                  setNewProductoBase('');
                  setNewProductoSugerido('');
                }}
                className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-300 transition-colors cursor-pointer"
              >
                Cancelar Edición
              </button>
            )}
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#4B9CD3] hover:bg-[#3A82B4] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              {editingRuleId ? 'Guardar Cambios de Regla' : 'Agregar Regla de Sugerencia'}
            </button>
          </div>
        </form>

        {/* Lista de Reglas Configuradas */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Reglas Activas de Sugerencia ({rules.length})
          </h4>

          {rules.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-xs bg-slate-50 rounded-lg border border-dashed border-slate-200">
              No hay reglas de venta sugerida configuradas. Agregue una regla arriba.
            </div>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    rule.activa ? 'bg-white border-[#E2E8F0]' : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-[#2C3E50]">
                        Si el carrito incluye: <span className="text-[#4B9CD3]">{rule.producto_base_nombre}</span>
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-600">
                      Sugerir: <span className="text-slate-800 bg-[#FFFDF6] border border-[#E2E8F0] px-2 py-0.5 rounded">{rule.producto_sugerido_nombre}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleRuleActive(rule.id)}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${
                        rule.activa
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      {rule.activa ? 'Activa' : 'Inactiva'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleEditRuleClick(rule)}
                      className="px-2.5 py-1 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteRule(rule.id)}
                      className="px-2.5 py-1 text-[10px] font-bold bg-red-50 hover:bg-red-100 text-red-700 rounded-md transition-colors cursor-pointer"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
