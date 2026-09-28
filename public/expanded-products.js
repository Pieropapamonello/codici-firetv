// Product-level descriptions, not claims about the authenticity of mirrored APKs.
// The distributor's section is used only for explicitly listed identities.
const rows = [];
const add = (names, category, desc, source = 'https://linktr.ee/kpfire') => {
  for (const name of names.split('|')) rows.push({name,category,desc,source,metadataVerified:true});
};
add('Aplayer|BS Player|CSPlayer|HB Player|Kshaw|MediaON Player|NV Player|Sofa Player|UVX Player|Viewella|XP Player', 'Lettori video', 'Lettore per aprire file o indirizzi video. Non include un abbonamento TV; verifica i formati e il dispositivo supportati dalla variante.');
add('1 Tap Cleaner|All In One Toolbox|Avast Cleanup|AVG Cleaner|CCleaner', 'Pulizia e manutenzione Android', 'Strumento per analizzare memoria e file da ripulire su Android. Controlla cosa verrà eliminato prima di confermare; non è un lettore TV.');
add('Ad Blocker Pro', 'Privacy e blocco pubblicità', 'Filtro pubblicitario segnalato dal distributore. Verifica permessi e modalità di filtraggio della specifica build prima di attivarlo.');
add('Anexplorer', 'Gestione file', 'Gestore di cartelle e file Android con strumenti di trasferimento. Controlla destinazione e permessi prima di spostare o cancellare file.', 'https://anexplorer.io/about');
add('MiXplorer|X-Plore File Manager', 'Gestione file', 'Esplora e gestisce file locali e posizioni di rete supportate. Le operazioni di cancellazione o spostamento modificano i tuoi dati.');
add('Antutu Benchmark', 'Rete e diagnostica', 'Esegue test delle prestazioni del dispositivo Android. Il punteggio è una misura di benchmark, non una verifica della sicurezza degli APK.', 'https://antutu.com/download.htm');
add('Malwarebytes', 'Sicurezza e controllo file', 'App di sicurezza per analizzare minacce sul dispositivo Android. Le funzioni e la licenza dipendono dal prodotto originale e dalla versione.');
add('NetGuard', 'Firewall Android', 'Controlla quali app possono accedere a Internet. Usa una VPN locale per il filtraggio: non è un servizio VPN remoto che cambia il paese della connessione.', 'https://netguard.me/');
add('Anilab|Anilili|Animo Fanz|BeeAnime', 'Anime e animazione', 'App indicata dal distributore per cataloghi anime. Lingue, sorgenti e disponibilità dipendono dalla versione; verifica i diritti sui contenuti.');
add('CineAura|Cinema HQ|Cineplus|Clip Box|Flick|Flixeon|Movie Box|MovieBox|Movie HD|Netfly|Nflix|NetMirror|Nova|Nxsha|Phantom Movies|Vega Movies|VoltraTV', 'Film e serie · App streaming', 'App segnalata per la ricerca e visione di video. Verifica sorgenti, lingue e diritti di accesso; un APK non equivale a un abbonamento ai contenuti.');
add('Debridstream|PlayTorrio|Sky Stream|Skystream', 'Film e serie · Media center', 'Interfaccia multimediale per organizzare e riprodurre video da sorgenti configurate. Verifica i servizi richiesti dalla build: non include automaticamente abbonamenti.');
add('Moviebase', 'Cataloghi e liste di visione', 'Organizza film e serie da vedere, preferiti ed episodi seguiti. È un catalogo e tracker, non un servizio che riproduce i film.', 'https://moviebase.app/');
add('SeriesGuide', 'Cataloghi e liste di visione', 'Tiene traccia di serie, episodi e film visti o da vedere. Può sincronizzare i dati; non fornisce lo streaming dei contenuti.', 'https://www.seriesgui.de/');
add('AK47 Sports|Football Live HD|Live Football TV|Live Sports HDTV|Orbitv|PlayFy|RBLive77|RBTV|TV Mob', 'TV in diretta · App streaming', 'App segnalata dal distributore per flussi TV o sportivi in diretta. Controlla autorizzazione e disponibilità delle sorgenti; non sostituisce un abbonamento ai canali.');
add('Insta Iptv', 'TV in diretta · Player IPTV', 'Lettore IPTV segnalato dal distributore. Verifica i formati delle tue playlist e la compatibilità; non include un abbonamento ai canali.');
add('RedBull TV', 'Sport e documentari', 'Servizio video Red Bull con eventi, sport e documentari. La disponibilità delle trasmissioni dipende dal servizio e dal territorio.', 'https://www.redbull.com/int-en/channels/best-of-red-bull');
add('Audiomack', 'Musica', 'Piattaforma per ascoltare musica e scoprire artisti. Download offline e altre funzioni dipendono dai contenuti e dal piano del servizio.', 'https://audiomack.com/');
add('iHeart Radio', 'Musica e radio', 'Ascolto di stazioni radio, musica e podcast del servizio iHeart. Catalogo e accesso dipendono dal territorio e dall’account.', 'https://www.iheart.com/');
add('Media Monkey', 'Musica', 'Lettore e gestore della propria libreria musicale, con sincronizzazione tra Android e computer.', 'https://mediamonkey.com/wiki/MediaMonkey_for_Android');
add('Podcast Addict', 'Podcast', 'Organizza iscrizioni ai podcast, riproduce episodi e gestisce i download per l’ascolto offline.', 'https://podcastaddict.com/');
add('SpotiLOL', 'Musica', 'Client alternativo che integra il web player Spotify. Richiede il tuo account e non è l’app ufficiale Spotify.', 'https://github.com/lyssadev/Spotilol');
add('SpotiFLAC', 'Gestione download audio', 'Strumento per scaricare e organizzare audio in formato FLAC. Utilizzalo soltanto per contenuti che sei autorizzato a scaricare.', 'https://spotiflac.com/');
add('Spotiduck', 'Musica', 'Client musicale alternativo segnalato da KPFire. Identità della build e compatibilità con il proprio account da controllare; non equivale a una licenza Premium.');

const longestFirst = [...rows].sort((a,b)=>b.name.length-a.name.length);
export function expandedProduct(name = '') {
  const normalized = String(name).trim();
  return longestFirst.find(row =>
    normalized.toLowerCase().startsWith(row.name.toLowerCase()) && !/[a-z]/i.test(normalized[row.name.length] || ''));
}
