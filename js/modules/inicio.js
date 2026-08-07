// js/modules/inicio.js

import { 
  obterInfoCompleta, 
  obterHeroBanner, 
  obterRecomendados, 
  obterRecentes, 
  obterNovosEpisodios 
} from './repository.js';

/**
 * 1. Carrega o Hero Banner principal no topo da Home
 */
export async function carregarHeroBanner() {
  const container = document.getElementById('hero-banner');
  const template = document.getElementById('modelo-hero-banner');
  
  if (!container || !template) return;

  try {
    const [items, infoCompleta] = await Promise.all([
      obterHeroBanner(),
      obterInfoCompleta()
    ]);

    if (!items || !infoCompleta || !Array.isArray(items) || items.length === 0) return;

    const highlight = items.find(i => i.highlight);
    const heroConfig = highlight || items[0];

    const anime = infoCompleta[heroConfig.id];
    if (!anime) return;

    container.innerHTML = "";

    let primeiroEpId = "";
    if (Array.isArray(anime.temporadas) && anime.temporadas.length > 0) {
      const primeiraTemp = anime.temporadas[0];
      if (Array.isArray(primeiraTemp.episodios) && primeiraTemp.episodios.length > 0) {
        primeiroEpId = primeiraTemp.episodios[0].id || "";
      }
    } else if (Array.isArray(anime.episodios) && anime.episodios.length > 0) {
      primeiroEpId = anime.episodios[0].id || "";
    }

    const clone = template.content.cloneNode(true);
    const slide = clone.querySelector('.hero-banner-slide');
    const img = clone.querySelector('.hero-banner-img');
    const title = clone.querySelector('.hero-banner-title');
    const desc = clone.querySelector('.hero-banner-desc');
    const btnPlay = clone.querySelector('.btn-hero-play');
    const btnInfo = clone.querySelector('.btn-hero-info');

    /* Usa primeiramente a chave 'poster', com fallback para 'banner' */
    if (img) img.src = anime.poster || anime.banner || '';
    if (title) title.textContent = anime.titulo || '';
    if (desc) {
      desc.textContent = anime.sinopse || '';
      desc.dataset.collapsed = 'true';
    }
    if (btnPlay) {
      btnPlay.textContent = '▶ Assistir';
      btnPlay.href = `#player?anime=${encodeURIComponent(heroConfig.id)}&ep=${encodeURIComponent(primeiroEpId)}`;
    }
    if (btnInfo) {
      btnInfo.textContent = 'ⓘ Detalhes';
      btnInfo.href = `#info?anime=${encodeURIComponent(heroConfig.id)}`;
    }

    if (slide) {
      slide.addEventListener('click', (ev) => {
        if (ev.target.closest('.btn-hero')) return;
        window.location.hash = `#info?anime=${encodeURIComponent(heroConfig.id)}`;
      });
    }

    container.appendChild(clone);

    const descEl = container.querySelector('.hero-banner-desc');
    if (descEl) {
      descEl.addEventListener('click', () => {
        const collapsed = descEl.dataset.collapsed === 'true';
        descEl.dataset.collapsed = collapsed ? 'false' : 'true';
        descEl.classList.toggle('expanded', collapsed);
      });
    }

  } catch (err) {
    console.error('[Hero] Erro ao carregar:', err);
  }
}

/**
 * 2. Carrega os animes Recomendados / Destaques
 */
export async function carregarAnimesRecomendados() {
    const grade = document.getElementById("grade-recomendados");
    const modelo = document.getElementById("modelo-card-anime");

    if (!grade || !modelo) return;

    try {
        const [listaIds, infoCompleta] = await Promise.all([
            obterRecomendados(),
            obterInfoCompleta()
        ]);

        if (!listaIds || !infoCompleta || listaIds.length === 0) return;

        grade.innerHTML = "";

        listaIds.forEach((item) => {
            const animeId = item.id;
            const anime = infoCompleta[animeId];

            if (!anime) return;

            const clone = modelo.content.cloneNode(true);
            const linkCard = clone.querySelector("a");
            const imgCard = clone.querySelector("img");
            const tituloCard = clone.querySelector(".card-title");

            if (linkCard && imgCard && tituloCard) {
                linkCard.href = `#info?anime=${animeId}`;
                imgCard.src = anime.poster || anime.banner || "";
                imgCard.alt = `Capa de ${anime.titulo || animeId}`;
                tituloCard.textContent = anime.titulo || animeId;

                grade.appendChild(clone);
            }
        });

    } catch (erro) {
        console.error("❌ [Recomendados] Falha crítica:", erro);
    }
}

/**
 * 3. Carrega os animes Adicionados Recentes
 */
export async function carregarAnimesRecentes() {
    const grade = document.getElementById("grade-recentes");
    const modelo = document.getElementById("modelo-card-anime");

    if (!grade || !modelo) return;

    try {
        const [listaIds, infoCompleta] = await Promise.all([
            obterRecentes(),
            obterInfoCompleta()
        ]);

        if (!listaIds || !infoCompleta || !Array.isArray(listaIds) || listaIds.length === 0) return;

        grade.innerHTML = "";

        listaIds.forEach((item) => {
            const animeId = item.id;
            const anime = infoCompleta[animeId];

            if (!anime) return;

            const clone = modelo.content.cloneNode(true);
            const linkCard = clone.querySelector("a");
            const imgCard = clone.querySelector("img");
            const tituloCard = clone.querySelector(".card-title");

            if (linkCard && imgCard && tituloCard) {
                linkCard.href = `#info?anime=${animeId}`;
                imgCard.src = anime.poster || anime.banner || "";
                imgCard.alt = `Capa de ${anime.titulo || animeId}`;
                tituloCard.textContent = anime.titulo || animeId;

                grade.appendChild(clone);
            }
        });

    } catch (erro) {
        console.error("❌ [Recentes] Falha ao carregar:", erro);
    }
}

/**
 * 4. Carrega os Lançamentos de novos episódios
 */
export async function carregarNovosEpisodios() {
    const grade = document.getElementById("grade-novos-episodios");
    const modelo = document.getElementById("modelo-card-anime");

    if (!grade || !modelo) return;

    try {
        const [listaNovos, infoCompleta] = await Promise.all([
            obterNovosEpisodios(),
            obterInfoCompleta()
        ]);

        if (!listaNovos || !infoCompleta) return;

        grade.innerHTML = "";

        listaNovos.forEach(item => {
            const anime = infoCompleta[item.animeId];
            if (!anime) return;

            let epEncontrado = null;
            if (Array.isArray(anime.temporadas)) {
                for (const temp of anime.temporadas) {
                    const ep = temp.episodios?.find(e => e.id === item.epId);
                    if (ep) {
                        epEncontrado = ep;
                        break;
                    }
                }
            }

            if (!epEncontrado) return;

            const clone = modelo.content.cloneNode(true);
            const linkCard = clone.querySelector("a");
            const imgCard = clone.querySelector("img");
            const tituloCard = clone.querySelector(".card-title");

            if (linkCard && imgCard && tituloCard) {
                linkCard.classList.remove("poster");
                linkCard.classList.add("horizontal");

                linkCard.href = `#player?anime=${encodeURIComponent(item.animeId)}&ep=${encodeURIComponent(item.epId)}`;
                imgCard.src = epEncontrado.thumb || anime.poster || anime.banner || "";
                imgCard.alt = epEncontrado.titulo;

                tituloCard.textContent = epEncontrado.titulo;

                grade.appendChild(clone);
            }
        });

    } catch (erro) {
        console.error("❌ [Novos Episódios] Falha ao carregar:", erro);
    }
}

/**
 * 5. Carrega as Seções organizadas por Gênero
 */
export async function carregarAnimesPorGenero() {
    const containerPrincipal = document.getElementById("inicio");
    const modeloSecao = document.getElementById("modelo-secao-genero");
    const modeloCard = document.getElementById("modelo-card-anime");

    if (!containerPrincipal || !modeloSecao || !modeloCard) return;

    const secoesExistentes = containerPrincipal.querySelectorAll(".secao-genero-container");
    secoesExistentes.forEach(secao => secao.remove());

    try {
        const infoCompleta = await obterInfoCompleta();
        if (!infoCompleta) return;

        const setGeneros = new Set();
        Object.values(infoCompleta).forEach(anime => {
            if (Array.isArray(anime.generos)) {
                anime.generos.forEach(g => setGeneros.add(g));
            }
        });

        // Embaralha a ordem das seções de gêneros
        let listaGeneros = embaralharLista(Array.from(setGeneros));

        listaGeneros.forEach(generoAlvo => {
            const cloneSecao = modeloSecao.content.cloneNode(true);
            const tituloSecao = cloneSecao.querySelector(".titulo-categoria");
            const gradeCards = cloneSecao.querySelector(".cards-grid");

            if (!tituloSecao || !gradeCards) return;

            tituloSecao.textContent = generoAlvo;

            // Embaralha os animes individualmente para cada gênero renderizado
            const animesEmbaralhados = embaralharLista(Object.keys(infoCompleta));

            animesEmbaralhados.forEach(animeId => {
                const anime = infoCompleta[animeId];

                if (anime.generos && anime.generos.includes(generoAlvo)) {
                    const cloneCard = modeloCard.content.cloneNode(true);
                    const linkCard = cloneCard.querySelector("a");
                    const imgCard = cloneCard.querySelector("img");
                    const tituloCard = cloneCard.querySelector(".card-title");

                    if (linkCard && imgCard && tituloCard) {
                        linkCard.href = `#info?anime=${animeId}`;
                        imgCard.src = anime.poster || anime.banner || "";
                        imgCard.alt = `Capa de ${anime.titulo || animeId}`;
                        tituloCard.textContent = anime.titulo || animeId;

                        gradeCards.appendChild(cloneCard);
                    }
                }
            });

            if (gradeCards.children.length > 0) {
                containerPrincipal.appendChild(cloneSecao);
            }
        });

    } catch (erro) {
        console.error("❌ [Gêneros] Falha crítica:", erro);
    }
}

function embaralharLista(array) {
    let copia = [...array];
    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
}
