// js/modules/playerView.js

import { salvarProgressoDB, buscarProgressoDB, buscarTodoProgressoDB } from "./db.js";
import { obterAnimePorId } from "./repository.js";

let todosEpisodiosAtuais = [];
let epIdAtual = null;
let animeIdAtual = null;
let hideControlsTimeout = null;
let listenersAtivos = false;

// Controle de I/O de Banco de Dados (Evita engasgos de gravação no timeupdate)
let ultimoTempoSalvoDB = 0;

function makeEpisodeId(animeId, seasonIdx, episodeIdx) {
  const s = String(seasonIdx).padStart(2, '0');
  const e = String(episodeIdx).padStart(2, '0');
  return `${animeId}_s${s}e${e}`;
}

// Formata segundos em MM:SS ou HH:MM:SS
function formatarTempo(segundos) {
  if (isNaN(segundos) || segundos < 0) return "00:00";
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const seg = Math.floor(segundos % 60);

  if (horas > 0) {
    return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;
  }
  return `${String(minutos).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;
}

// OTIMIZAÇÃO SPA: Limpeza profunda para liberar GPU/RAM ao trocar de tela
export function limparPlayer() {
  const videoElement = document.getElementById("player-video");
  if (videoElement) {
    videoElement.pause();
    videoElement.removeAttribute("src");
    videoElement.load(); // Força o navegador a desalocar os buffers de vídeo da memória
  }
  if (hideControlsTimeout) {
    clearTimeout(hideControlsTimeout);
    hideControlsTimeout = null;
  }
  
  // Reseta variáveis globais do módulo
  epIdAtual = null;
  animeIdAtual = null;
  ultimoTempoSalvoDB = 0;
}

export async function gerenciarTelaPlayer() {
  const hash = window.location.hash;

  if (!hash.startsWith("#player")) {
    limparPlayer();
    return;
  }

  const params = new URLSearchParams(hash.split("?")[1]);
  const animeId = params.get("anime");
  const epId = params.get("ep");

  if (!animeId || !epId) return;

  try {
    const anime = await obterAnimePorId(animeId);
    if (!anime) return;

    let episodioAtual = null;
    let todosEpisodios = [];
    let temporadaAtualNome = "";

    const temporadas = Array.isArray(anime.temporadas)
      ? anime.temporadas
      : Array.isArray(anime.episodios)
        ? [{ nome: "Temporada Única", episodios: anime.episodios }]
        : [];

    let temporadaEncontrada = null;

    for (let tIdx = 0; tIdx < temporadas.length; tIdx++) {
      const temp = temporadas[tIdx];
      const eps = Array.isArray(temp.episodios) ? temp.episodios : [];

      const epAchado = eps.find((ep, eIdx) => {
        const indexEp = typeof ep.index === 'number' ? ep.index : eIdx + 1;
        const idEp = ep.id || makeEpisodeId(animeId, tIdx + 1, indexEp);
        return idEp === epId;
      });

      if (epAchado) {
        temporadaEncontrada = { temp, tIdx };
        break;
      }
    }

    if (temporadaEncontrada) {
      const { temp, tIdx } = temporadaEncontrada;
      temporadaAtualNome = temp.nome || "Temporada Única";
      const eps = Array.isArray(temp.episodios) ? temp.episodios : [];

      eps.forEach((ep, eIdx) => {
        const indexEp = typeof ep.index === 'number' ? ep.index : eIdx + 1;
        const idEp = ep.id || makeEpisodeId(animeId, tIdx + 1, indexEp);

        const epFormatado = { ...ep, index: indexEp, id: idEp, temporadaNome: temporadaAtualNome };
        todosEpisodios.push(epFormatado);

        if (idEp === epId) {
          episodioAtual = epFormatado;
        }
      });
    }

    if (!episodioAtual) return;

    todosEpisodiosAtuais = todosEpisodios;
    epIdAtual = epId;
    animeIdAtual = animeId;
    ultimoTempoSalvoDB = 0; // Reseta controle de salvamento

    const videoElement = document.getElementById("player-video");
    const containerPlayer = document.getElementById("custom-player-container");
    const controlsOverlay = document.getElementById("custom-player-controls");
    
    const btnPlay = document.getElementById("btn-player-play");
    const btnRewind = document.getElementById("btn-player-rewind");
    const btnForward = document.getElementById("btn-player-forward");
    const progressBar = document.getElementById("player-progress");
    const timeDisplay = document.getElementById("player-time-display");
    const btnFullscreen = document.getElementById("btn-player-fullscreen");

    const metaTag = document.getElementById("player-meta-tag");
    const tituloEp = document.getElementById("player-titulo-ep");
    const btnVerTodos = document.getElementById("lnk-ver-todos");

    if (videoElement) {
      // Define a nova mídia reaproveitando a tag <video>
      videoElement.src = episodioAtual.video || "";
      videoElement.poster = episodioAtual.thumb || "";

      // Restaura o tempo salvo do banco
      async function restaurarTempoSalvo() {
        const progressoSalvo = await buscarProgressoDB(epIdAtual);
        if (progressoSalvo && progressoSalvo.tempo > 0) {
          videoElement.currentTime = progressoSalvo.tempo;
          ultimoTempoSalvoDB = Math.floor(progressoSalvo.tempo);
        }
      }

      videoElement.addEventListener('loadedmetadata', restaurarTempoSalvo, { once: true });

      // Configuração dos Listeners de Eventos (Executada apenas UMA VEZ para a SPA toda)
      if (!listenersAtivos) {
        listenersAtivos = true;

        // Auto-ocultar Controles por Inatividade
        function mostrarControles() {
          controlsOverlay.classList.remove("controls-hidden");
        }

        function ocultarControles() {
          if (!videoElement.paused) {
            controlsOverlay.classList.add("controls-hidden");
          }
        }

        function resetAutoOcultarControles() {
          mostrarControles();
          if (hideControlsTimeout) clearTimeout(hideControlsTimeout);
          if (!videoElement.paused) {
            hideControlsTimeout = setTimeout(ocultarControles, 3000);
          }
        }

        // Alternar Play/Pause
        const togglePlay = () => {
          if (videoElement.paused) {
            videoElement.play().catch(e => console.log("Autoplay bloqueado:", e));
          } else {
            videoElement.pause();
          }
        };

        btnPlay.addEventListener("click", togglePlay);
        videoElement.addEventListener("click", togglePlay);

        videoElement.addEventListener("play", () => {
          btnPlay.innerHTML = `<span class="material-symbols-outlined">pause</span>`;
          resetAutoOcultarControles();
        });

        videoElement.addEventListener("pause", () => {
          btnPlay.innerHTML = `<span class="material-symbols-outlined">play_arrow</span>`;
          mostrarControles();

          // Salva o progresso imediatamente ao pausar
          const tempoAtual = Math.floor(videoElement.currentTime);
          const duracaoTotal = Math.floor(videoElement.duration || 0);
          if (tempoAtual > 0 && epIdAtual) {
            salvarProgressoDB(epIdAtual, tempoAtual, duracaoTotal);
            ultimoTempoSalvoDB = tempoAtual;
          }
        });

        // Avançar/Voltar 10s
        btnRewind.addEventListener("click", (e) => {
          e.stopPropagation();
          videoElement.currentTime = Math.max(0, videoElement.currentTime - 10);
          resetAutoOcultarControles();
        });

        btnForward.addEventListener("click", (e) => {
          e.stopPropagation();
          videoElement.currentTime = Math.min(videoElement.duration || 0, videoElement.currentTime + 10);
          resetAutoOcultarControles();
        });

        // Atualização de Progresso e Tempo
        videoElement.addEventListener("timeupdate", () => {
          const tempoAtual = videoElement.currentTime;
          const duracaoTotal = videoElement.duration || 0;

          // =========================================================
          // MANTIDO EXATAMENTE COMO NO SEU ORIGINAL (Não altera lógica nem CSS)
          // =========================================================
          if (duracaoTotal > 0) {
            const porcentagem = (tempoAtual / duracaoTotal) * 100;
            progressBar.value = porcentagem;
            progressBar.style.background = `linear-gradient(to right, #ff4081 ${porcentagem}%, rgba(255,255,255,0.3) ${porcentagem}%)`;
          }

          timeDisplay.textContent = `${formatarTempo(tempoAtual)} • ${formatarTempo(duracaoTotal)}`;
          // =========================================================

          // OTIMIZAÇÃO I/O: Salva no IndexedDB apenas a cada 10 segundos para não travar a CPU
          const segAtual = Math.floor(tempoAtual);
          if (segAtual >= 15 && (segAtual - ultimoTempoSalvoDB >= 10)) {
            ultimoTempoSalvoDB = segAtual;
            salvarProgressoDB(epIdAtual, segAtual, Math.floor(duracaoTotal));
          }
        });

        // Interação na Barra de Progresso (Seek)
        progressBar.addEventListener("input", () => {
          const duracaoTotal = videoElement.duration || 0;
          if (duracaoTotal > 0) {
            videoElement.currentTime = (progressBar.value / 100) * duracaoTotal;
          }
        });

        // Avança para o próximo episódio
        const avancarProximoEpisodio = () => {
          const indexAtualIndex = todosEpisodiosAtuais.findIndex(e => e.id === epIdAtual);
          if (indexAtualIndex !== -1 && indexAtualIndex + 1 < todosEpisodiosAtuais.length) {
            const proximoEp = todosEpisodiosAtuais[indexAtualIndex + 1];
            const novaUrl = `${window.location.pathname}#player?anime=${animeIdAtual}&ep=${proximoEp.id}`;
            window.location.replace(novaUrl);
          }
        };

        videoElement.addEventListener("ended", async () => {
          const duracaoTotal = Math.floor(videoElement.duration || 0);
          if (duracaoTotal > 0 && epIdAtual) {
            await salvarProgressoDB(epIdAtual, duracaoTotal, duracaoTotal);
          }
          avancarProximoEpisodio();
        });

        // Alternar Tela Cheia
        const toggleFullscreen = () => {
          const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;

          if (!isFullscreen) {
            if (containerPlayer.requestFullscreen) {
              containerPlayer.requestFullscreen().catch(err => console.error(err));
            } else if (containerPlayer.webkitRequestFullscreen) {
              containerPlayer.webkitRequestFullscreen();
            }
          } else {
            if (document.exitFullscreen) {
              document.exitFullscreen().catch(err => console.error(err));
            } else if (document.webkitExitFullscreen) {
              document.webkitExitFullscreen();
            }
          }
        };

        btnFullscreen.addEventListener("click", toggleFullscreen);

        // Atualização do Ícone do Fullscreen
        const atualizarIconeFullscreen = () => {
          const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;

          if (isFullscreen) {
            btnFullscreen.innerHTML = `<span class="material-symbols-outlined">fullscreen_exit</span>`;
            btnFullscreen.setAttribute("aria-label", "Sair da Tela Cheia");
            if (screen.orientation && screen.orientation.lock) {
              screen.orientation.lock('landscape').catch(() => {});
            }
          } else {
            btnFullscreen.innerHTML = `<span class="material-symbols-outlined">fullscreen</span>`;
            btnFullscreen.setAttribute("aria-label", "Tela Cheia");
            if (screen.orientation && screen.orientation.unlock) {
              screen.orientation.unlock();
            }
          }
        };

        document.addEventListener("fullscreenchange", atualizarIconeFullscreen);
        document.addEventListener("webkitfullscreenchange", atualizarIconeFullscreen);

        // ATALHOS DE TECLADO
        window.addEventListener("keydown", (e) => {
          if (!window.location.hash.startsWith("#player")) return;

          const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";
          if (activeTag === "input" || activeTag === "textarea" || document.activeElement.isContentEditable) {
            return;
          }

          const duracaoTotal = videoElement.duration || 0;
          let teclaTratada = true;

          switch (e.key.toLowerCase()) {
            case " ":
            case "k":
              togglePlay();
              break;
            case "j":
              videoElement.currentTime = Math.max(0, videoElement.currentTime - 10);
              break;
            case "l":
              videoElement.currentTime = Math.min(duracaoTotal, videoElement.currentTime + 10);
              break;
            case "arrowleft":
              videoElement.currentTime = Math.max(0, videoElement.currentTime - 5);
              break;
            case "arrowright":
              videoElement.currentTime = Math.min(duracaoTotal, videoElement.currentTime + 5);
              break;
            case "arrowup":
              videoElement.volume = Math.min(1, videoElement.volume + 0.1);
              videoElement.muted = false;
              break;
            case "arrowdown":
              videoElement.volume = Math.max(0, videoElement.volume - 0.1);
              break;
            case "f":
              toggleFullscreen();
              break;
            case "m":
              videoElement.muted = !videoElement.muted;
              break;
            case "n":
              avancarProximoEpisodio();
              break;
            default:
              if (e.key >= "0" && e.key <= "9" && duracaoTotal > 0) {
                const pct = parseInt(e.key, 10) / 10;
                videoElement.currentTime = duracaoTotal * pct;
              } else {
                teclaTratada = false;
              }
              break;
          }

          if (teclaTratada) {
            e.preventDefault();
            resetAutoOcultarControles();
          }
        });

        containerPlayer.addEventListener("mousemove", resetAutoOcultarControles);
        containerPlayer.addEventListener("touchstart", resetAutoOcultarControles, { passive: true });
      }

      // Autoplay seguro com tratamento de promessa
      setTimeout(() => {
        videoElement.play().catch(e => console.log("Autoplay bloqueado pelo navegador:", e));
      }, 200);
    }

    // Atualiza Metadados na Tela
    const numTemp = temporadaAtualNome.replace(/\D/g, "").padStart(2, "0") || "01";
    const numEp = String(episodioAtual.index || 1).padStart(2, "0");

    if (metaTag) metaTag.textContent = `${anime.titulo || "Anime"} T${numTemp}E${numEp}`;
    if (tituloEp) tituloEp.textContent = episodioAtual.titulo || "Episódio sem título";
    if (btnVerTodos) btnVerTodos.href = `#info?anime=${animeId}`;

    const indexAtual = todosEpisodios.findIndex(e => e.id === epId);
    const proximosEpisodios = todosEpisodios.slice(indexAtual + 1);

    await renderizarProximos(proximosEpisodios, animeId);

  } catch (erro) {
    console.error("Erro ao carregar dados do player:", erro);
  }
}

// OTIMIZAÇÃO: Renderização de Próximos Episódios com Event Delegation + DocumentFragment (Zero Memory Leak)
async function renderizarProximos(lista, animeId) {
  const container = document.getElementById("player-lista-proximos");
  const template = document.getElementById("modelo-card-player");

  if (!container || !template) return;

  // 1. Limpeza de DOM sem usar .innerHTML = "" (Evita parse HTML na CPU)
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  if (!Array.isArray(lista) || lista.length === 0) {
    const p = document.createElement("p");
    p.className = "badge-tag";
    p.style.marginTop = "12px";
    p.textContent = "Nenhum episódio seguinte disponível nesta temporada.";
    container.appendChild(p);
    return;
  }

  const mapaProgresso = await buscarTodoProgressoDB();
  const fragment = document.createDocumentFragment(); // Montagem em lote na memória RAM

  lista.forEach(ep => {
    const clone = template.content.cloneNode(true);

    const img = clone.querySelector(".player-ep-thumb");
    const duracao = clone.querySelector(".player-ep-duration");
    const titulo = clone.querySelector(".player-card-title");
    const card = clone.querySelector(".card-player-ep");

    const containerBarra = clone.querySelector(".barra-progresso-container");
    const preenchimentoBarra = clone.querySelector(".barra-progresso-preenchimento");

    if (img) {
      img.src = ep.thumb || "";
      img.alt = ep.titulo || "Episódio";
    }
    if (duracao) duracao.textContent = ep.duracao || "--min";
    if (titulo) titulo.textContent = ep.titulo || "Episódio";

    if (card) {
      card.style.cursor = "pointer";
      // Guarda o ID do episódio no dataset em vez de criar múltiplos listeners
      card.dataset.epId = ep.id;
    }

    if (mapaProgresso[ep.id]) {
      const dadosEp = mapaProgresso[ep.id];
      if (dadosEp.total > 0 && dadosEp.tempo > 0) {
        const porcentagem = (dadosEp.tempo / dadosEp.total) * 100;
        
        if (containerBarra && preenchimentoBarra) {
          containerBarra.style.display = "block";
          preenchimentoBarra.style.width = `${Math.min(porcentagem, 100)}%`;
        }
      }
    }

    fragment.appendChild(clone);
  });

  // Insere todos os episódios de uma vez só no DOM real
  container.appendChild(fragment);

  // 2. EVENT DELEGATION: Apenas 1 listener de clique atrelado ao container pai
  if (!container.dataset.hasListener) {
    container.dataset.hasListener = "true";
    container.addEventListener("click", (e) => {
      const card = e.target.closest(".card-player-ep");
      if (!card) return;

      e.preventDefault();
      const epId = card.dataset.epId;
      if (epId && animeIdAtual) {
        const novaUrl = `${window.location.pathname}#player?anime=${animeIdAtual}&ep=${epId}`;
        window.location.replace(novaUrl);
      }
    });
  }
}
