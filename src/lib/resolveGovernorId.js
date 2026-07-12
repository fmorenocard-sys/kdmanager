/**
 * Best-effort resolution of a hand-typed player name (e.g. trophies sheet:
 * "Helios", "Pisontje", "Jools") to a governor ID from the players list, so
 * the avatar cascade (F-016) has a key to work with.
 *
 * Normalization handles the in-game cosmetic prefixes: NFKD folds unicode
 * small-caps/superscripts (ᵁᴺ → UN), then everything non-alphanumeric is
 * stripped. Matching tries exact, then containment, then a small edit
 * distance to absorb typos. Returns null when nothing is close enough.
 */
const normalize = (s) =>
    String(s || '')
        .normalize('NFKD')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

const editDistance = (a, b) => {
    if (Math.abs(a.length - b.length) > 2) return 99;
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
            );
        }
    }
    return dp[a.length][b.length];
};

export function resolveGovernorId(name, players) {
    const target = normalize(name);
    if (!target || target.length < 3 || !Array.isArray(players)) return null;

    let containMatch = null;
    let fuzzyMatch = null;
    let bestFuzzy = 3; // max accepted distance is 2

    for (const p of players) {
        const cand = normalize(p.name);
        if (!cand) continue;
        if (cand === target) return p.id; // exact — done
        if (!containMatch && (cand.includes(target) || target.includes(cand))) {
            containMatch = p.id;
            continue;
        }
        if (target.length >= 5) {
            const d = editDistance(target, cand.length > target.length + 2 ? cand.slice(-target.length - 1) : cand);
            if (d < bestFuzzy) {
                bestFuzzy = d;
                fuzzyMatch = p.id;
            }
        }
    }
    return containMatch ?? fuzzyMatch;
}
