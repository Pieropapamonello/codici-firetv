export default async function handler(req, res) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return res.status(200).json({ configured: false });

    try {
        const r = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
        const data = await r.json();
        if (data.ok) {
            return res.status(200).json({
                configured: true,
                username: data.result.username,
                name: data.result.first_name
            });
        }
        return res.status(200).json({ configured: false });
    } catch (e) {
        return res.status(200).json({ configured: false });
    }
}
