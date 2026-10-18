export const PRESET_VERSION = 1;
export function defaults(manifest) {
  return Object.fromEntries(manifest.settings.map(field => [field.key, field.default]));
}
export function validateSettings(manifest, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Settings must be an object.');
  const fields = new Map(manifest.settings.map(field => [field.key, field]));
  for (const key of Object.keys(input)) if (!fields.has(key)) throw new Error(`Unknown setting: ${key}`);
  const result = defaults(manifest);
  for (const field of manifest.settings) {
    const value = Object.prototype.hasOwnProperty.call(input, field.key) ? input[field.key] : field.default;
    if (field.type === 'range' || field.type === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < field.min || value > field.max) throw new Error(`${field.label} must be between ${field.min} and ${field.max}.`);
      const steps = (value - field.min) / field.step;
      if (Math.abs(steps - Math.round(steps)) > 1e-6) throw new Error(`${field.label} must use increments of ${field.step}.`);
    } else if (field.type === 'toggle') {
      if (typeof value !== 'boolean') throw new Error(`${field.label} must be on or off.`);
    } else if (field.type === 'color') {
      if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`${field.label} must be a six-digit hex color.`);
    } else if (field.type === 'select') {
      if (!field.options.some(option => option.value === value)) throw new Error(`Choose a valid ${field.label.toLowerCase()}.`);
    } else if (field.type === 'text') {
      if (typeof value !== 'string' || value.length > (field.maxLength || 1200)) throw new Error(`${field.label} must be text up to ${field.maxLength || 1200} characters.`);
    } else if (field.type === 'path') {
      if (!Array.isArray(value) || value.length > 96 || value.length === 1 || value.some(point => !Array.isArray(point) || point.length !== 2 || point.some(n => typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 1))) throw new Error(`${field.label} must contain 2–96 normalized coordinate pairs, or be empty.`);
    } else throw new Error(`Unsupported field type: ${field.type}`);
    result[field.key] = field.type === 'path' ? value.map(point => [...point]) : value;
  }
  return result;
}
export function createPreset(manifest, settings, name = 'Untitled study') {
  return {schemaVersion: PRESET_VERSION, experiment: manifest.slug, name: String(name).slice(0, 60), createdAt: new Date().toISOString(), settings: validateSettings(manifest, settings)};
}
export function readPreset(manifest, value) {
  const preset = typeof value === 'string' ? JSON.parse(value) : value;
  if (!preset || preset.schemaVersion !== PRESET_VERSION) throw new Error('This preset uses an unsupported schema version.');
  if (preset.experiment !== manifest.slug) throw new Error(`This preset belongs to ${preset.experiment || 'another experiment'}, not ${manifest.name}.`);
  return createPreset(manifest, preset.settings, preset.name);
}
