import gplay from "google-play-scraper";

export default async function handler(req, res) {
    // Abilita CORS per permettere al frontend di chiamare l'API
    if (res.setHeader) {
        res.setHeader('Access-Control-Allow-Credentials', true);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
        res.setHeader(
            'Access-Control-Allow-Headers',
            'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
        );
    }

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { name } = req.query;

    if (!name) {
        return res.status(400).json({ error: "Parametro 'name' mancante." });
    }

    try {
        // Puliamo il nome per migliorare la ricerca
        let cleanName = name.replace(/craccato|mod|vlc|lite|nuovo|tv|arm/gi, '').trim();
        
        const searchResults = await gplay.search({ term: cleanName, num: 1 });
        
        if (searchResults && searchResults.length > 0) {
            return res.status(200).json({ success: true, icon: searchResults[0].icon });
        } else {
            return res.status(404).json({ success: false, error: "Nessuna icona trovata." });
        }
    } catch (error) {
        console.error("Errore ricerca icona:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
