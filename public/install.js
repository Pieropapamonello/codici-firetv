let installPrompt;
const installButton = document.getElementById('install-app');
const installHelp = document.getElementById('install-help');
const standalone = window.matchMedia('(display-mode: standalone)');
function hideInstall() { installButton.hidden = true; installHelp.hidden = true; }
if (!standalone.matches && !navigator.standalone) {
    installHelp.hidden = false;
    installHelp.textContent = /iPhone|iPad|iPod/.test(navigator.userAgent)
        ? 'Per installare: apri Condividi e scegli Aggiungi alla schermata Home.'
        : 'Per installare, cerca Installa app nel menu del browser. Se non disponibile, puoi usare il sito normalmente.';
}
window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    if (!standalone.matches) { installButton.hidden = false; installHelp.hidden = true; }
});
installButton.addEventListener('click', async () => {
    if (!installPrompt) return;
    const prompt = installPrompt;
    installPrompt = null;
    installButton.hidden = true;
    try { await prompt.prompt(); await prompt.userChoice; }
    catch { installHelp.hidden = false; }
});
window.addEventListener('appinstalled', hideInstall);
standalone.addEventListener('change', event => { if (event.matches) hideInstall(); });
