// js/modules/pesquisa.js

import { obterInfoCompleta } from './repository.js';

/**
 * Remove acentos e converte para minúsculas para facilitar a comparação
 */
function normalizarTexto(texto) {
    return (texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

export async function inicializarPesquisa() {
    const inputBusca = document.getElementById("input-busca");
    const gradeResultados = document.getElementById("grade-resultados-busca");
    const modeloCard = document.getElementById("modelo-card-anime");
    const msgVazia = document.getElementById("busca-vazia");

    if (!inputBusca || !gradeResultados || !modeloCard) return;

    // 🎹 Escuta a digitação em tempo real a cada caractere
    inputBusca.addEventListener("input", async (e) => {
        const termoBusca = normalizarTexto(e.target.value.trim());

        // Se o input estiver vazio, limpa a tela e oculta mensagens
        if (termoBusca === "") {
            gradeResultados.innerHTML = "";
            if (msgVazia) msgVazia.style.display = "none";
            return;
        }

        // 📡 Obtém os dados centralizados via Repositório (que já gerencia o cache em memória)
        const bancoDados = await obterInfoCompleta();

        if (!bancoDados) return;

        executarFiltro(termoBusca, bancoDados, gradeResultados, modeloCard, msgVazia);
    });
}

/**
 * Filtra e renderiza os resultados cruzando os termos com títulos e gêneros
 */
function executarFiltro(termo, bancoDados, container, template, feedbackVazio) {
    container.innerHTML = ""; // Limpa os resultados anteriores
    let totalEncontrados = 0;

    const frag = document.createDocumentFragment();

    // Varre os animes do banco de dados do repositório
    Object.keys(bancoDados).forEach(animeId => {
        const anime = bancoDados[animeId];
        
        const tituloNormalizado = normalizarTexto(anime.titulo);
        
        // Verifica se algum gênero coincide com o termo digitado (sem acento)
        const matchesGenero = Array.isArray(anime.generos) && 
            anime.generos.some(g => normalizarTexto(g).includes(termo));

        // Condição: Se bater com o título OU com o gênero, exibe o card
        if (tituloNormalizado.includes(termo) || matchesGenero) {
            totalEncontrados++;

            // Clona o molde padrão de card
            const clone = template.content.cloneNode(true);

            const linkCard = clone.querySelector("a");
            const imgCard = clone.querySelector("img");
            const tituloCard = clone.querySelector(".card-title");

            if (linkCard && imgCard && tituloCard) {
                linkCard.href = `#info?anime=${encodeURIComponent(animeId)}`;
                imgCard.src = anime.poster || anime.banner || "";
                imgCard.alt = `Capa de ${anime.titulo || animeId}`;
                tituloCard.textContent = anime.titulo || animeId;

                frag.appendChild(clone);
            }
        }
    });

    // Injeta todos os cards filtrados na tela
    container.appendChild(frag);

    // Exibe ou oculta a mensagem de "Nenhum resultado"
    if (feedbackVazio) {
        feedbackVazio.style.display = totalEncontrados === 0 ? "block" : "none";
    }
}
