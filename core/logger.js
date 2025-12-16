// core/logger.js
export function logInfo(msg) {
  console.log(`ℹ️ ${msg}`);
}
export function logSuccess(msg) {
  console.log(`✅ ${msg}`);
}
export function logWarn(msg) {
  console.warn(`⚠️ ${msg}`);
}
export function logError(msg) {
  console.error(`❌ ${msg}`);
}
