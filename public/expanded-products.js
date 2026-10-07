// Product-level descriptions, not claims about the authenticity of mirrored APKs.
// The distributor's section is used only for explicitly listed identities.
const rows = [];
const add = (names, category, desc, source = 'https://linktr.ee/kpfire') => {
  for (const name of names.split('|')) rows.push({name,category,desc,source,metadataVerified:true});
};
add('DubLift', 'Componenti aggiuntivi per Stremio e Nuvio', 'Server addon per Stremio e Nuvio: combina le proprie sorgenti video con audio italiano sincronizzato. Include FFmpeg e dashboard di configurazione; deve restare in esecuzione durante la riproduzione. Richiede Android 7.1 o superiore. Scegli ARM 32 bit o ARM 64 bit secondo il sistema Android del dispositivo.', 'https://github.com/joojoooo/DubLiftApp');
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

add('EZV Player|Url Video Player|NV Video Player|ASD Player|Next Player|NOVA Video Player', 'Lettori video', 'Riproduce file video o flussi da indirizzi forniti dall’utente. Non include canali o abbonamenti; controlla i formati supportati dalla versione scelta.', 'https://downloadercodes.com/media-players/');
add('Shamel TV Pro|Shamel.tv|MYTVOnline+|BOB Player|Smart STB|General TV|Hot Player|Zen IPTV Player|IPTV Extreme|GSE Smart IPTV|9Xtream|Televizo', 'TV in diretta · Player IPTV', 'Lettore per i tuoi servizi e playlist IPTV. Richiede una playlist o credenziali di un servizio autorizzato; eventuale licenza del lettore è separata dai contenuti.', 'https://downloadercodes.com/iptv-players/');
add('IPTV', 'TV in diretta · Player IPTV', 'Lettore di playlist IPTV fornite dall’utente. Non include canali o abbonamenti.', 'https://downloadercodes.com/iptv-players/');
add('Dezor|Opera Browser|Firefox|DuckDuckGo', 'Browser Internet', 'Browser per navigare sul web. La compatibilità con telecomando e siti dipende dalla versione; non è un abbonamento a contenuti video.', 'https://downloadercodes.com/browsers/');
add('Private Internet Access|AdGuard VPN|Windscribe VPN', 'VPN', 'Servizio VPN che instrada la connessione attraverso i propri server. Richiede un account e può prevedere limiti o un abbonamento; non fornisce canali TV.', 'https://downloadercodes.com/vpn/');
add('RetroArch', 'Giochi ed emulazione', 'Interfaccia per emulatori e motori di gioco tramite core Libretro. Usa giochi e BIOS che sei autorizzato a utilizzare; può essere necessario un gamepad.', 'https://www.retroarch.com/');
add('Happy Chick', 'Giochi ed emulazione', 'Applicazione di emulazione per giochi retro. Verifica compatibilità e controller; usa soltanto giochi che sei autorizzato a utilizzare.', 'https://downloadercodes.com/games/');
add('Antstream', 'Giochi ed emulazione', 'Servizio di giochi retro in streaming. Richiede una connessione Internet e un account; disponibilità dei giochi e costi dipendono dal servizio.', 'https://downloadercodes.com/games/');
add('TDUK APP Killer', 'Pulizia e manutenzione Android', 'Strumento per chiudere applicazioni in background su dispositivi compatibili. Controlla i permessi richiesti e non interrompere servizi di sistema.', 'https://downloadercodes.com/tools/');
add('Wireless File Manager', 'Gestione e trasferimento file', 'Gestisce e trasferisce file tramite rete locale. Usa soltanto reti fidate e disattiva la condivisione quando hai finito.', 'https://downloadercodes.com/tools/');
add('Nebula Manager', 'Launcher e schermata iniziale', 'Organizza scorciatoie per aprire le app installate dalla schermata TV. Non aggiunge contenuti o abbonamenti.', 'https://downloadercodes.com/launchers/');
add('DefSquid', 'Pulizia e manutenzione Android', 'Utility di manutenzione e controllo per Android TV e Fire TV. Verifica le operazioni prima di confermarle; non garantisce la sicurezza dei file scaricati.', 'https://downloadercodes.com/tools/');
add('ADB TV', 'Gestione app e strumenti ADB', 'Gestisce applicazioni Android TV tramite ADB, anche per disabilitare o rimuovere pacchetti. Richiede configurazione del debug: evita di rimuovere componenti di sistema.', 'https://downloadercodes.com/tools/');
add('AdAway', 'Privacy e blocco pubblicità', 'Filtro pubblicitario per Android. La modalità scelta può usare una VPN locale o richiedere root; controlla compatibilità e permessi.', 'https://downloadercodes.com/tools/');

const longestFirst = [...rows].sort((a,b)=>b.name.length-a.name.length);
export function expandedProduct(name = '') {
  const normalized = String(name).trim();
  return longestFirst.find(row =>
    (row.name !== 'IPTV' || /^IPTV(?:$|\s+—)/i.test(normalized)) &&
    normalized.toLowerCase().startsWith(row.name.toLowerCase()) && !/[a-z]/i.test(normalized[row.name.length] || ''));
}
