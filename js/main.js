// js/main.js

// 🔄 IMPORTS UNIFICADOS
import { 
  carregarHeroBanner, 
  carregarAnimesRecomendados, 
  carregarAnimesRecentes, 
  carregarNovosEpisodios, 
  carregarAnimesPorGenero 
} from './modules/inicio.js';

import { gerenciarTelaInfo, fecharOverlayEp } from './modules/info.js';
import { gerenciarTelaPlayer } from './modules/playerView.js';
import { inicializarPesquisa } from './modules/pesquisa.js';
import { ocultarSplashScreen, exibirErroSplash } from './modules/splash.js';

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

// --- MÓDULO TV INTEGRADO DIRECTAMENTE ---
function inicializarNavegacaoTV() {
  window.addEventListener("keydown", (e) => {
    const chavesSuportadas = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "BackSpace", "Escape"];
    if (chavesSuportadas.includes(e.key)) {
      document.body.classList.add("tv-mode");
    }
  });

  document.addEventListener("focus", (event) => {
      const elementoFocado = event.target;
      if (elementoFocado && elementoFocado !== document.body) {
        elementoFocado.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      }
    }, true
  );

  window.addEventListener("keydown", (event) => {
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
    // 1. Executa todas as buscas de dados iniciais em paralelo
    await Promise.all([
      carregarHeroBanner(),
      carregarAnimesRecomendados(),
      carregarAnimesRecentes(),
      carregarNovosEpisodios(),
      carregarAnimesPorGenero()
    ]);
    
    inicializarPesquisa();
    inicializarNavegacaoTV();
    inicializarScrollHeader(); // 👈 Ativa o controle do cabeçalho na rolagem

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
