// js/modules/splash.js

/**
 * Oculta a Splash Screen com uma animação suave de fade-out
 */
export function ocultarSplashScreen() {
  const splash = document.getElementById("splash-screen");
  if (splash && !splash.classList.contains("fade-out")) {
    splash.classList.add("fade-out");
  }
}

/**
 * Substitui o ícone de carregamento pela mensagem e detalhes do erro
 */
export function exibirErroSplash(mensagemUsuario, erroTecnico) {
  const loadingArea = document.getElementById("splash-loading");
  const errorArea = document.getElementById("splash-error");
  const errorMsg = document.getElementById("splash-error-msg");
  const errorCode = document.getElementById("splash-error-code");

  if (loadingArea) loadingArea.classList.add("hidden");

  if (errorArea) {
    errorArea.classList.remove("hidden");
    
    if (errorMsg) {
      errorMsg.textContent = mensagemUsuario || "Ocorreu um erro ao inicializar o aplicativo.";
    }
    
    if (errorCode) {
      const detalhe = erroTecnico?.stack || erroTecnico?.message || String(erroTecnico);
      errorCode.textContent = detalhe;
    }
  }
}
