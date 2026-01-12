/**
 * src/utils/configExport.ts
 * Funciones para exportar e importar configuración de parámetros del EWCM EO
 */

import paramsDb from '../data/parameters.json';
import { EwcmParameter } from '../types/ewcm';

// Estructura del archivo de configuración exportado
export interface ConfigExport {
  version: string;
  exportDate: string;
  model: string;
  parameters: Record<string, number>;
}

// Versión del formato de exportación
const CONFIG_VERSION = '1.0';

/**
 * Exporta los parámetros actuales a un archivo JSON descargable
 */
export const exportConfiguration = (parameters: Record<string, number>): void => {
  const config: ConfigExport = {
    version: CONFIG_VERSION,
    exportDate: new Date().toISOString(),
    model: 'EWCM EO 8900/9100/9900',
    parameters: { ...parameters }
  };

  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `ewcm_config_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Valida que un objeto sea una configuración válida
 */
export const validateConfiguration = (config: unknown): { valid: boolean; error?: string; data?: ConfigExport } => {
  if (!config || typeof config !== 'object') {
    return { valid: false, error: 'El archivo no contiene un objeto JSON válido' };
  }

  const cfg = config as Record<string, unknown>;

  if (!cfg.version || typeof cfg.version !== 'string') {
    return { valid: false, error: 'Falta versión del archivo de configuración' };
  }

  if (!cfg.parameters || typeof cfg.parameters !== 'object') {
    return { valid: false, error: 'Falta sección de parámetros' };
  }

  // Validar que los parámetros existen en la base de datos
  const params = cfg.parameters as Record<string, unknown>;
  const validParams: Record<string, number> = {};
  const warnings: string[] = [];

  const paramDb = paramsDb as EwcmParameter[];
  const validIds = new Set(paramDb.map(p => p.id));

  for (const [key, value] of Object.entries(params)) {
    if (typeof value !== 'number') {
      warnings.push(`Parámetro ${key} ignorado (valor no numérico)`);
      continue;
    }

    if (!validIds.has(key)) {
      warnings.push(`Parámetro ${key} ignorado (no existe en DB)`);
      continue;
    }

    // Validar rango
    const paramDef = paramDb.find(p => p.id === key);
    if (paramDef) {
      const min = paramDef.min ?? -Infinity;
      const max = paramDef.max ?? Infinity;
      if (value < min || value > max) {
        warnings.push(`Parámetro ${key} ajustado al rango [${min}, ${max}]`);
        validParams[key] = Math.min(max, Math.max(min, value));
      } else {
        validParams[key] = value;
      }
    }
  }

  if (warnings.length > 0) {
    console.warn('Advertencias al importar configuración:', warnings);
  }

  return {
    valid: true,
    data: {
      version: cfg.version as string,
      exportDate: (cfg.exportDate as string) || '',
      model: (cfg.model as string) || '',
      parameters: validParams
    }
  };
};

/**
 * Importa configuración desde un archivo JSON
 * Retorna una promesa con los parámetros validados
 */
export const importConfiguration = (): Promise<Record<string, number>> => {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No se seleccionó ningún archivo'));
        return;
      }

      try {
        const text = await file.text();
        const config = JSON.parse(text);
        const validation = validateConfiguration(config);

        if (!validation.valid) {
          reject(new Error(validation.error));
          return;
        }

        resolve(validation.data!.parameters);
      } catch (err) {
        reject(new Error('Error al leer el archivo: ' + (err as Error).message));
      }
    };

    input.click();
  });
};
