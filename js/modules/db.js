// js/modules/db.js

const DB_NAME = "ChibiHeartDB";
const DB_VERSION = 1;
const STORE_NAME = "progresso";

/**
 * Inicializa e abre a conexão com o IndexedDB
 */
function abrirBanco() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // Cria a tabela/store se o banco for criado pela primeira vez
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject("Erro ao abrir IndexedDB: " + event.target.error);
  });
}

/**
 * Salva ou atualiza o progresso de um episódio
 * @param {string} epId - Ex: 'k-on_s01e01'
 * @param {number} tempo - Segundo atual do player
 * @param {number} total - Duração total do vídeo
 */
export async function salvarProgressoDB(epId, tempo, total) {
  try {
    const db = await abrirBanco();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      // Regra dos 85%: Considera concluído se assistiu 85% ou mais do total
      const concluido = total > 0 ? (tempo / total) >= 0.85 : false;

      const registro = {
        id: epId,
        tempo,
        total,
        concluido,
        atualizadoEm: Date.now()
      };

      const request = store.put(registro);

      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (erro) {
    console.error("❌ [DB] Falha ao salvar progresso:", erro);
  }
}

/**
 * Marca ou desmarca manualmente um episódio como concluído no banco
 * @param {string} epId 
 * @param {boolean} concluido 
 */
export async function alternarConcluidoDB(epId, concluido = true) {
  try {
    const db = await abrirBanco();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      const requestGet = store.get(epId);

      requestGet.onsuccess = (e) => {
        const existente = e.target.result || {};
        const total = existente.total || 100;

        const registro = {
          ...existente,
          id: epId,
          tempo: concluido ? total : 0,
          total: total,
          concluido: concluido,
          atualizadoEm: Date.now()
        };

        const requestPut = store.put(registro);
        requestPut.onsuccess = () => resolve(true);
        requestPut.onerror = (err) => reject(err.target.error);
      };

      requestGet.onerror = (err) => reject(err.target.error);
    });
  } catch (erro) {
    console.error("❌ [DB] Falha ao alterar status de concluído:", erro);
  }
}

/**
 * Busca o progresso de um episódio específico
 * @param {string} epId 
 */
export async function buscarProgressoDB(epId) {
  try {
    const db = await abrirBanco();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(epId);

      request.onsuccess = (e) => resolve(e.target.result || null);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (erro) {
    console.error("❌ [DB] Falha ao buscar progresso:", erro);
    return null;
  }
}

/**
 * Busca o progresso de TODOS os episódios de uma vez (otimizado para listagens)
 */
export async function buscarTodoProgressoDB() {
  try {
    const db = await abrirBanco();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = (e) => {
        // Transforma o array resultante em um mapa { id: { tempo, total, concluido, atualizadoEm } }
        const mapa = {};
        const resultados = e.target.result || [];
        resultados.forEach(item => {
          mapa[item.id] = item;
        });
        resolve(mapa);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (erro) {
    console.error("❌ [DB] Falha ao listar progressos:", erro);
    return {};
  }
}
