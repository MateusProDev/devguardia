// Re-export funções do diretório moderateSupportMessage
const mod = require('./moderateSupportMessage/index.js');

// Se o módulo exportar diretamente as funções, reexporte todas
for (const k of Object.keys(mod)) {
  exports[k] = mod[k];
}
