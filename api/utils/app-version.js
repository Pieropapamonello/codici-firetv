export function extractVersion(name) {
    return String(name || '').match(/\bv?(\d+(?:\.\d+){0,3}(?:[-.]?(?:rc|beta|alpha)[.-]?\d*)?)\b/i)?.[1]?.toLowerCase() || null;
}
export function compareVersions(a, b) {
    const parse = value => {
        const match = value.match(/^(\d+(?:\.\d+)*)(?:[-.]?(alpha|beta|rc)[.-]?(\d*))?$/i);
        return match && { parts: match[1].split('.').map(Number), stage: { alpha: 0, beta: 1, rc: 2 }[match[2]] ?? 3, n: Number(match[3] || 0) };
    };
    const av = parse(a), bv = parse(b);
    if (!av || !bv) return 0;
    for (let i = 0; i < Math.max(av.parts.length, bv.parts.length); i++) {
        const delta = (av.parts[i] || 0) - (bv.parts[i] || 0);
        if (delta) return Math.sign(delta);
    }
    return Math.sign(av.stage - bv.stage || av.n - bv.n);
}
