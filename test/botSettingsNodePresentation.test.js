const test = require('node:test');
const assert = require('node:assert/strict');

const { replaceBusinessNameInNodes } = require('../controllers/botSettings/nodePresentation');

test('replaceBusinessNameInNodes reemplaza placeholder en mensajes', () => {
  const nodes = [
    { id: 'start', message: 'Hola [business_name]!' },
    { id: 'other', message: 'Sin cambio' }
  ];

  const result = replaceBusinessNameInNodes(nodes, 'Clinica Demo');

  assert.equal(result[0].message, 'Hola Clinica Demo!');
  assert.equal(result[1].message, 'Sin cambio');
});

test('replaceBusinessNameInNodes retorna [] si nodes no es arreglo', () => {
  const result = replaceBusinessNameInNodes(null, 'Clinica Demo');
  assert.deepEqual(result, []);
});

test('replaceBusinessNameInNodes conserva nodos si businessName vacio', () => {
  const nodes = [{ id: 'start', message: 'Hola [business_name]!' }];
  const result = replaceBusinessNameInNodes(nodes, '   ');
  assert.equal(result[0].message, 'Hola [business_name]!');
});
