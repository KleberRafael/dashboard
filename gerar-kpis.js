/**
 * gerar-kpis.js
 * ------------------------------------------------------------
 * Gera um snapshot diário dos KPIs da Lokar em formato JSON.
 *
 * Não calcula nada: apenas consome os mesmos endpoints que o
 * front (GestaoNegocio.js) já usa, garantindo que os números
 * batam exatamente com a tela do sistema.
 *
 * Captura: mês atual (finance-summary + kpis-avancados)
 *          + projeção de 3 e 6 meses.
 *
 * Uso:  node gerar-kpis.js
 * Saída: ./kpis.json
 * ------------------------------------------------------------
 */

const fs = require("fs");
const path = require("path");

// ─── Configuração ───────────────────────────────────────────
const API_BASE = process.env.API_BASE || "http://localhost:3001/api";
const OUTPUT = path.join(__dirname, "docs", "kpis.json");

const now = new Date();
const YEAR = now.getFullYear();
const MONTH = now.getMonth() + 1;

// ─── Helper de fetch com timeout e tratamento de erro ───────
async function getJSON(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} em ${url}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ─── Coleta ─────────────────────────────────────────────────
async function gerar() {
  console.log(`\n📊 Gerando snapshot de KPIs — ${now.toLocaleString("pt-BR")}`);
  console.log(`   API: ${API_BASE}`);
  console.log(`   Período base: ${String(MONTH).padStart(2, "0")}/${YEAR}\n`);

  const endpoints = {
    finance:     `${API_BASE}/dashboard/finance-summary?year=${YEAR}&month=${MONTH}`,
    kpis:        `${API_BASE}/dashboard/kpis-avancados?year=${YEAR}&month=${MONTH}`,
    projecao3:   `${API_BASE}/dashboard/projecao-financeira?meses=3`,
    projecao6:   `${API_BASE}/dashboard/projecao-financeira?meses=6`,
  };

  const resultado = {};
  const erros = [];

  // Busca tudo em paralelo, mas registra falhas individualmente
  await Promise.all(
    Object.entries(endpoints).map(async ([chave, url]) => {
      try {
        resultado[chave] = await getJSON(url);
        console.log(`   ✓ ${chave}`);
      } catch (err) {
        erros.push({ chave, erro: err.message });
        resultado[chave] = null;
        console.error(`   ✗ ${chave} — ${err.message}`);
      }
    })
  );

  // Se TODOS falharam, aborta sem sobrescrever o JSON anterior
  if (erros.length === Object.keys(endpoints).length) {
    console.error(
      "\n❌ Todos os endpoints falharam. A API está no ar em " +
        API_BASE +
        "?\n   O kpis.json anterior foi preservado.\n"
    );
    process.exit(1);
  }

  // Monta o snapshot final com metadados
  const snapshot = {
    gerado_em: now.toISOString(),
    gerado_em_label: now.toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }),
    periodo: { ano: YEAR, mes: MONTH },
    erros: erros.length ? erros : null,
    dados: resultado,
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(snapshot, null, 2), "utf-8");
  console.log(`\n✅ Snapshot salvo em ${OUTPUT}`);
  if (erros.length) {
    console.log(
      `⚠️  ${erros.length} endpoint(s) falharam — o JSON foi gerado com os dados disponíveis.`
    );
  }
}

gerar().catch((err) => {
  console.error("\n❌ Erro inesperado ao gerar snapshot:", err.message);
  process.exit(1);
});
