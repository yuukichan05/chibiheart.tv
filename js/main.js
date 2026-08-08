// js/main.js

// 🔄 IMPORTS DOS MÓDULOS
import { 
  carregarHeroBanner, 
  carregarAnimesRecomendados, 
  carregarAnimesRecentes, 
  carregarAnimesPorGenero 
} from './modules/inicio.js';

import { gerenciarTelaInfo } from './modules/info.js';
import { gerenciarTelaPlayer } from './modules/playerView.js';
import { inicializarPesquisa } from './modules/pesquisa.js';
import { ocultarSplashScreen, exibirErroSplash } from './modules/splash.js';

// --- GERENCIAMENTO DA SIDEBAR & HISTÓRICO DA HISTORY API ---
const tabBar = document.querySelector(".tab-bar");

export function isSidebarAberta() {
  return tabBar && tabBar.classList.contains("expanded");
}

export function recolherSidebar() {
  if (tabBar) {
    tabBar.classList.remove("expanded");
    // Tira o foco do elemento ativo dentro da sidebar se houver algum
    if (document.activeElement && tabBar.contains(document.activeElement)) {
      document.activeElement.blur();
    }
  }
}

export function abrirSidebar() {
  if (tabBar && !isSidebarAberta()) {
    tabBar.classList.add("expanded");
    // Adiciona um estado fictício no histórico sem alterar a URL da hash
    history.pushState({ sidebarAberta: true }, "");
  }
}

export function toggleSidebar() {
  if (isSidebarAberta()) {
    history.back(); // Voltar no histórico fecha a sidebar de forma limpa via popstate
  } else {
    abrirSidebar();
  }
}

// --- ROTEADOR DE NAVEGAÇÃO POR HASH ---
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

  // 1. Abertura ao passar o mouse ou focar (Hover/Focus-Within)
  if (tabBar) {
    tabBar.addEventListener("mouseenter", () => abrirSidebar());
    tabBar.addEventListener("focusin", () => abrirSidebar());
  }

  // 2. Intercepta o botão VOLTAR do dispositivo/navegador/celular
  window.addEventListener("popstate", () => {
    if (isSidebarAberta()) {
      recolherSidebar();
    }
  });

  // 3. Intercepta a tecla ESC (Teclado / TV / Desktop)
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isSidebarAberta()) {
      history.back(); // Volta no histórico triggering o popstate e fechando a sidebar
    }
  });

  try {
    // Carregamento dos dados iniciais da aplicação
    await Promise.all([
      carregarHeroBanner(),
      carregarAnimesRecomendados(),
      carregarAnimesRecentes(),
      carregarAnimesPorGenero()
    ]);
    
    inicializarPesquisa();

    // Evento para tratamento de troca de Hash / Rotas
    window.addEventListener("hashchange", async () => {
      try {
        // Ao mudar de tela/aba via navegação, recolhe a sidebar se ela estiver aberta
        if (isSidebarAberta()) {
          recolherSidebar();
        }
        navegarPeloHash();
        await gerenciarTelaInfo();
        await gerenciarTelaPlayer();
      } catch (e) {
        console.error("Erro ao alterar rota:", e);
      }
    });

    // Renderização inicial das rotas
    navegarPeloHash();
    await gerenciarTelaInfo();
    await gerenciarTelaPlayer();

    // Finalização da inicialização
    ocultarSplashScreen();

  } catch (erroGeral) {
    console.error("Erro crítico na inicialização:", erroGeral);
    
    exibirErroSplash(
      "Ocorreu uma falha ao carregar os dados do aplicativo.",
      erroGeral
    );
  }
});
