// core/logger.js
export function logInfo(msg) {
  console.log(`INFO ${msg}`);
}
export function logSuccess(msg) {
  console.log(`SUCCESS ${msg}`);
}
export function logWarn(msg) {
  console.warn(`WARN ${msg}`);
}
export function logError(msg) {
  console.error(`ERROR ${msg}`);
}
