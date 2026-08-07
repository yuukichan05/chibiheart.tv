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

  try {
    // 1. Carregamento dos dados iniciais da aplicação
    await Promise.all([
      carregarHeroBanner(),
      carregarAnimesRecomendados(),
      carregarAnimesRecentes(),
      carregarAnimesPorGenero()
    ]);
    
    inicializarPesquisa();

    // 2. Evento para tratamento de troca de Hash / Rotas
    window.addEventListener("hashchange", async () => {
      try {
        navegarPeloHash();
        await gerenciarTelaInfo();
        await gerenciarTelaPlayer();
      } catch (e) {
        console.error("Erro ao alterar rota:", e);
      }
    });

    // 3. Renderização inicial das rotas
    navegarPeloHash();
    await gerenciarTelaInfo();
    await gerenciarTelaPlayer();

    // 4. Finalização da inicialização
    ocultarSplashScreen();

  } catch (erroGeral) {
    console.error("Erro crítico na inicialização:", erroGeral);
    
    exibirErroSplash(
      "Ocorreu uma falha ao carregar os dados do aplicativo.",
      erroGeral
    );
  }
});
