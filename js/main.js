// js/main.js

// --- CONTROLE DE SCROLL DO CABEÇALHO SUPERIOR ---
function inicializarScrollHeader() {
  let lastScrollY = window.scrollY;
  const header = document.querySelector('.main-header');

  window.addEventListener('scroll', () => {
    if (!header) return;

    const currentScrollY = window.scrollY;

    // Se rolar para baixo e passar de 50px, oculta o cabeçalho
    if (currentScrollY > lastScrollY && currentScrollY > 50) {
      header.classList.add('header-hidden');
    } else {
      // Se rolar para cima, exibe o cabeçalho
      header.classList.remove('header-hidden');
    }

    lastScrollY = currentScrollY;
  });
}

// --- UTILITÁRIOS DE NAVEGAÇÃO ESPACIAL ---
const FOCUSABLE_SELECTOR = [
  'a[href]:not([tabindex="-1"])',
  'button:not([tabindex="-1"])',
  '[role="button"]:not([tabindex="-1"])',
  'input:not([tabindex="-1"])',
  'select:not([tabindex="-1"])',
  'textarea:not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
  '.card',
  '.card-ep',
  '.btn-hero',
  '.tab-item'
].join(', ');

function isElementFocusable(el) {
  if (!el) return false;
  if (!(el instanceof Element)) return false;
  if (el.disabled) return false;
  const style = window.getComputedStyle(el);
  if (style.visibility === 'hidden' || style.display === 'none' || parseFloat(style.opacity) === 0) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  return true;
}

function getFocusableElements(container = document) {
  const nodes = Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));
  return nodes.filter(isElementFocusable);
}

function rectCenter(rect) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

/**
 * Encontra o melhor candidato na direção especificada (dirX, dirY)
 * baseado em projeção e distância, priorizando elementos que estejam
 * realmente à frente na direção pressionada.
 */
function findBestCandidate(currentEl, candidates, dirX, dirY) {
  if (!currentEl) return null;
  const currentRect = currentEl.getBoundingClientRect();
  const currentCenter = rectCenter(currentRect);

  // Normaliza direcao
  const mag = Math.hypot(dirX, dirY) || 1;
  const ux = dirX / mag;
  const uy = dirY / mag;

  let best = null;
  let bestScore = Infinity;

  for (const cand of candidates) {
    if (cand === currentEl) continue;
    const rect = cand.getBoundingClientRect();
    const center = rectCenter(rect);

    const vx = center.x - currentCenter.x;
    const vy = center.y - currentCenter.y;

    // Projecao do vetor no eixo da direcao: quanto maior, mais à frente na direção
    const proj = vx * ux + vy * uy;

    // Ignorar candidatos "atrás" ou muito alinhados na direção oposta
    if (proj <= 6) continue; // 6px de folga para evitar selecionar elementos quase no mesmo lugar

    const distance = Math.hypot(vx, vy);

    // Distância ortogonal (perpendicular) penalizada: preferir candidatos mais alinhados
    const ortho = Math.abs(-uy * vx + ux * vy);

    // Score combina distância com penalidade ortogonal
    const score = distance + ortho * 0.8;

    if (score < bestScore) {
      bestScore = score;
      best = cand;
    }
  }

  return best;
}

// --- MÓDULO TV INTEGRADO DIRECTAMENTE ---
function inicializarNavegacaoTV() {
  // Marca modo TV na primeira interação com setas
  window.addEventListener("keydown", (e) => {
    const chavesSuportadas = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "BackSpace", "Escape"];
    if (chavesSuportadas.includes(e.key)) {
      document.body.classList.add("tv-mode");
    }
  });

  // Faz o foco rolar ao centro do elemento (ajuda a navegação por controle remoto)
  document.addEventListener("focus", (event) => {
    const elementoFocado = event.target;
    if (elementoFocado && elementoFocado !== document.body) {
      // Smooth scroll só quando elemento estiver fora da viewport ou para centralizar
      elementoFocado.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }
  }, true);

  // Keyboard spatial navigation for arrows
  window.addEventListener("keydown", (event) => {
    const active = document.activeElement;

    // Do not intercept when typing in inputs or editable areas
    if (active && (
      active.tagName === "INPUT" ||
      active.tagName === "TEXTAREA" ||
      active.tagName === "SELECT" ||
      active.isContentEditable
    )) {
      return;
    }

    // Only handle arrow keys here
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
      const candidates = getFocusableElements();

      // If no candidates, fallback to nothing
      if (!candidates.length) return;

      // Current focus: if document.body or not focusable, try to pick a reasonable start
      let currentEl = document.activeElement;

      if (!isElementFocusable(currentEl)) {
        // Prefer a visible tab-item or the first focusable element in the main view
        currentEl = document.querySelector('.tab-item.active') ||
                    document.querySelector('.tab-item') ||
                    candidates[0];
        if (currentEl && !isElementFocusable(currentEl)) currentEl = candidates[0];
      }

      const dirMap = {
        ArrowRight: [1, 0],
        ArrowLeft: [-1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1]
      };

      const [dx, dy] = dirMap[event.key];

      const next = findBestCandidate(currentEl, candidates, dx, dy);

      if (next) {
        event.preventDefault(); // impede rolagem da página
        event.stopPropagation();
        // Move focus
        next.focus();
        // Centraliza com suavidade
        next.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      } else {
        // Nenhum candidato encontrado na direção: evitamos que a página role
        event.preventDefault();
      }
    }

    // Escape handling (fecha overlays / volta)
    if (event.key === "Escape" || event.keyCode === 27 || event.keyCode === 10009) {
      const overlay = document.querySelector('.overlay-ep[aria-hidden="false"]');
      if (overlay) {
        event.preventDefault();
        const btnFechar = overlay.querySelector('.overlay-close');
        if (btnFechar) btnFechar.click();
        return;
      }

      if (window.location.hash && window.location.hash !== "#inicio") {
        event.preventDefault();
        window.history.back();
      }
    }

    // Enter: ativar (mantém comportamento nativo para elementos focáveis)
    if (event.key === "Enter") {
      // Se o elemento ativo não for foco nativo (ex.: .card que não é botão),
      // podemos simular click para ativá-lo.
      const el = document.activeElement;
      if (el && !["A", "BUTTON", "INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) {
        const role = el.getAttribute('role');
        if (role === 'button' || el.classList.contains('card') || el.classList.contains('card-ep')) {
          event.preventDefault();
          el.click();
        }
      }
    }
  });
}

function atualizarElementosFocaveis(container = document) {
  const seletores = ".card, .card-ep, .btn-hero, .tab-item, button, a[href]";
  const elementos = container.querySelectorAll(seletores);

  elementos.forEach((el) => {
    if (!el.hasAttribute("tabindex")) {
      el.setAttribute("tabindex", "0");
    }
  });
}

// --- ROTEADOR ---
function navegarPeloHash() {
  const rawHash = window.location.hash || "#inicio";
  const [hashLimpa] = rawHash.split("?");

  const views = document.querySelectorAll(".app-view");
  const tabItems = document.querySelectorAll(".tab-item");

  let encontrouView = false;

  views.forEach((view) => {
    if (`#${view.id}` === hashLimpa) {
      view.classList.add("active");
      encontrouView = true;
    } else {
      view.classList.remove("active");
    }
  });

  if (!encontrouView) {
    views.forEach((view) => {
      if (view.id === "erro") {
        view.classList.add("active");
      } else {
        view.classList.remove("active");
      }
    });
  }

  tabItems.forEach((tab) => {
    const tabHref = tab.getAttribute("href");
    if (tabHref === hashLimpa) {
      tab.classList.add("active");
    } else {
      tab.classList.remove("active");
    }
  });

  window.scrollTo(0, 0);
}

// --- INICIALIZAÇÃO DA APLICAÇÃO ---
document.addEventListener("DOMContentLoaded", async () => {
  const btnErroVoltar = document.getElementById("btn-erro-voltar");
  if (btnErroVoltar) {
    btnErroVoltar.addEventListener("click", () => {
      window.location.hash = "#inicio";
    });
  }

  try {
    // 1. Executa todas as buscas de dados iniciais em paralelo usando as funções no escopo global
    await Promise.all([
      carregarHeroBanner(),
      carregarAnimesRecomendados(),
      carregarAnimesRecentes(),
      carregarNovosEpisodios(),
      carregarAnimesPorGenero()
    ]);
    
    inicializarPesquisa();
    inicializarNavegacaoTV();
    inicializarScrollHeader(); // Ativa o controle do cabeçalho na rolagem

    window.addEventListener("hashchange", async () => {
      try {
        navegarPeloHash();
        fecharOverlayEp();
        await gerenciarTelaInfo();
        await gerenciarTelaPlayer();
        atualizarElementosFocaveis();
      } catch (e) {
        console.error("Erro ao alterar rota:", e);
      }
    });

    navegarPeloHash();
    await gerenciarTelaInfo();
    await gerenciarTelaPlayer();
    atualizarElementosFocaveis();

    // 2. TUDO OK: Esconde a tela de Splash!
    ocultarSplashScreen();

  } catch (erroGeral) {
    console.error("Erro crítico na inicialização:", erroGeral);
    
    // 3. ERRO: Exibe a interface de falha com os detalhes
    exibirErroSplash(
      "Ocorreu uma falha ao carregar os dados do aplicativo.",
      erroGeral
    );
  }
});
