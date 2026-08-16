"use strict";

window.Module = { register: function (_name, definition) { window.moduleDefinition = definition; } };
window.Log = { warn: console.warn, error: console.error, info: console.info };
