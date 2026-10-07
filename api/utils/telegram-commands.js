export const publicCommands=[{command:'start',description:'Apri menu principale'}];

export async function registerPublicCommands(token,request=fetch) {
    for(const type of ['default','all_private_chats']) {
        for(const language_code of ['', 'it']) {
            const response=await request(`https://api.telegram.org/bot${token}/setMyCommands`,{
                method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(20000),
                body:JSON.stringify({commands:publicCommands,scope:{type},language_code})
            });
            const data=await response.json();
            if(!response.ok || !data.ok) throw new Error('Telegram command registration failed');
        }
    }
}
