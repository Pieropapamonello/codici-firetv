export async function catalogDb(request=fetch) {
    const auth=await request(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`,{
        method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(20000),
        body:JSON.stringify({email:process.env.FIREBASE_ADMIN_EMAIL,password:process.env.FIREBASE_ADMIN_PASSWORD,returnSecureToken:true})
    });
    const data=await auth.json();
    if(!auth.ok||!data.idToken) throw new Error('Catalog authentication failed');
    return async(path,body)=>{
        const response=await request(`${process.env.FIREBASE_DATABASE_URL}/${path}.json?auth=${data.idToken}`,{
            ...(body===undefined?{}:{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),
            signal:AbortSignal.timeout(20000)
        });
        if(!response.ok) throw new Error(`Catalog database HTTP ${response.status}`);
        return response.json();
    };
}
