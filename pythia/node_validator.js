const { NodeVM } = require('vm2');

/**
 * Valida código JavaScript generado para un nodo antes de ejecutarlo.
 * Corre en sandbox vm2 con timeout de 5000ms.
 */
async function validate(code, node, sampleInput = {}) {
  // Datos de prueba sintéticos
  const testInput = Object.keys(sampleInput).length > 0 ? sampleInput : { test: true, value: 'sample' };
  const testNodeOutputs = {};
  const testParams = node?.parameters || {};

  try {
    const vm = new NodeVM({
      timeout: 5000,
      sandbox: {},
      require: {
        external: ['node-fetch'],
        builtin: ['https', 'crypto', 'url', 'querystring'],
      },
    });

    // Inyectamos la función y la llamamos
    const wrappedCode = `
      ${code}
      module.exports = execute;
    `;

    const executeFn = vm.run(wrappedCode, 'generated_node.js');

    if (typeof executeFn !== 'function') {
      return { valid: false, error: 'El código no exporta una función "execute"' };
    }

    // Ejecutar con datos de prueba
    const output = await executeFn(testParams, testInput, testNodeOutputs);

    if (output === null || output === undefined) {
      return { valid: false, error: 'La función retornó null o undefined — debe retornar un objeto' };
    }

    if (typeof output !== 'object' || Array.isArray(output)) {
      return { valid: false, error: `La función retornó ${typeof output} — debe retornar un objeto plano` };
    }

    return { valid: true, output };

  } catch (e) {
    return { valid: false, error: e.message };
  }
}

module.exports = { validate };
