export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Metodo non consentito' });
    }

    const { email, apps } = req.body;

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ error: 'Email non valida' });
    }

    const appsToSave = Array.isArray(apps) && apps.length > 0 ? apps : ['all'];

    const dbUrl = process.env.FIREBASE_DATABASE_URL;
    const apiKey = process.env.FIREBASE_API_KEY;
    const adminEmail = process.env.FIREBASE_ADMIN_EMAIL;
    const adminPassword = process.env.FIREBASE_ADMIN_PASSWORD;

    if (!dbUrl || !apiKey || !adminEmail || !adminPassword) {
        console.error("Variabili d'ambiente Firebase mancanti");
        return res.status(500).json({ error: 'Configurazione server mancante' });
    }

    try {
        // 1. Ottieni token di autenticazione tramite Firebase Auth REST API
        const authResponse = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: adminEmail,
                    password: adminPassword,
                    returnSecureToken: true
                })
            }
        );

        const authData = await authResponse.json();

        if (!authResponse.ok || !authData.idToken) {
            console.error("Errore autenticazione Firebase:", authData.error);
            return res.status(500).json({ error: 'Errore interno del server' });
        }

        const token = authData.idToken;

        // Sanitizza l'email per usarla come chiave Firebase (no punti, @, ecc.)
        const emailKey = email.replace(/\./g, ',').replace(/@/g, '__at__');

        // 2. Controlla se l'email è già iscritta (lettura diretta per chiave)
        const checkResponse = await fetch(`${dbUrl}/subscribers/${emailKey}.json?auth=${token}`);
        const checkData = await checkResponse.json();

        if (checkData && checkData.email) {
            // Email già iscritta: aggiorna le app selezionate
            const updateResponse = await fetch(`${dbUrl}/subscribers/${emailKey}.json?auth=${token}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apps: appsToSave,
                    timestamp: Date.now()
                })
            });

            if (!updateResponse.ok) {
                const updateError = await updateResponse.json();
                console.error("Errore aggiornamento Firebase:", updateError);
                return res.status(500).json({ error: 'Errore interno del server' });
            }

            return res.status(200).json({ success: true, updated: true, message: 'Iscrizione aggiornata con successo!' });
        }

        // 3. Aggiungi il nuovo iscritto con email come chiave
        const writeResponse = await fetch(`${dbUrl}/subscribers/${emailKey}.json?auth=${token}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                apps: appsToSave,
                timestamp: Date.now()
            })
        });

        if (!writeResponse.ok) {
            const writeError = await writeResponse.json();
            console.error("Errore scrittura Firebase:", writeError);
            return res.status(500).json({ error: 'Errore interno del server' });
        }

        return res.status(200).json({ success: true, message: 'Iscrizione completata con successo!' });

    } catch (error) {
        console.error("Errore durante l'iscrizione:", error.message);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
}
