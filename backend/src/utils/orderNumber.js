// Genera números de pedido y ticket legibles: ORD-2026-0001 / TCK-2026-0001
function generateCode(prefix, sequence) {
  const year = new Date().getFullYear();
  const padded = String(sequence).padStart(4, '0');
  return `${prefix}-${year}-${padded}`;
}

module.exports = { generateCode };
