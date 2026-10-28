/**
 * Génère `public/apple-touch-icon.png` : 180x180, OPAQUE.
 *
 * iOS peint en noir toute zone transparente d'un `apple-touch-icon`, et
 * `logo-512.png` est en RVB + alpha (vérifié le 2026-10-28). D'où une icône
 * d'écran d'accueil qui ne ressemble à rien. On aplatit donc le logo sur le
 * fond de marque et on sort la taille exacte qu'attend iOS.
 *
 * Pas de dépendance nouvelle : zlib suffit pour un PNG 8 bits non entrelacé.
 */
const fs = require('fs');
const zlib = require('zlib');

// Appel : node scripts/make-apple-icon.cjs <source.png> [destination.png]
// Par défaut, l'instance 2997 ; chaque instance passe SON logo, puisque
// `public/` est partagé par les 4 instances et le nom de l'icône DÉRIVE du
// logo (convention de `sizedIcon` dans vite.config.js), donc chacune a la
// sienne : `logo.png` -> `logo-180.png`, `logo-mimoso.png` -> `logo-mimoso-180.png`.
const SRC = process.argv[2] || 'public/logo-512.png';
const DST = process.argv[3] || SRC.replace(/(-\d+)?\.png$/i, '') + '-180.png';
const TAILLE = 180;
const FOND = [15, 23, 42];   // --background, thème sombre
const OCCUPATION = 0.78;      // iOS arrondit les coins : on laisse une marge

// ─── CRC32 (table) ───────────────────────────────────────────────────────
const TABLE = (() => {
    const t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c;
    }
    return t;
})();
const crc32 = (buf) => {
    let c = -1;
    for (let i = 0; i < buf.length; i++) c = TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
};

// ─── Décodage ────────────────────────────────────────────────────────────
function decoder(fichier) {
    const b = fs.readFileSync(fichier);
    if (b.readUInt32BE(0) !== 0x89504e47) throw new Error('pas un PNG');
    let p = 8, ihdr = null;
    const idat = [];
    while (p < b.length) {
        const len = b.readUInt32BE(p);
        const type = b.toString('ascii', p + 4, p + 8);
        const data = b.subarray(p + 8, p + 8 + len);
        if (type === 'IHDR') ihdr = { w: data.readUInt32BE(0), h: data.readUInt32BE(4), profondeur: data[8], couleur: data[9], entrelace: data[12] };
        else if (type === 'IDAT') idat.push(data);
        else if (type === 'IEND') break;
        p += 12 + len;
    }
    if (!ihdr) throw new Error('IHDR absent');
    if (ihdr.profondeur !== 8) throw new Error('profondeur ' + ihdr.profondeur + ' non gérée');
    if (ihdr.entrelace !== 0) throw new Error('entrelacement non géré');
    const canaux = { 0: 1, 2: 3, 4: 2, 6: 4 }[ihdr.couleur];
    if (!canaux) throw new Error('type couleur ' + ihdr.couleur + ' non géré');

    const brut = zlib.inflateSync(Buffer.concat(idat));
    const { w, h } = ihdr;
    const ligne = w * canaux;
    const px = Buffer.alloc(w * h * canaux);
    let prec = Buffer.alloc(ligne);
    for (let y = 0; y < h; y++) {
        const filtre = brut[y * (ligne + 1)];
        const src = brut.subarray(y * (ligne + 1) + 1, (y + 1) * (ligne + 1));
        const out = Buffer.alloc(ligne);
        for (let i = 0; i < ligne; i++) {
            const a = i >= canaux ? out[i - canaux] : 0;
            const bb = prec[i];
            const c = i >= canaux ? prec[i - canaux] : 0;
            let v = src[i];
            if (filtre === 1) v += a;
            else if (filtre === 2) v += bb;
            else if (filtre === 3) v += (a + bb) >> 1;
            else if (filtre === 4) {
                const pp = a + bb - c, pa = Math.abs(pp - a), pb = Math.abs(pp - bb), pc = Math.abs(pp - c);
                v += pa <= pb && pa <= pc ? a : pb <= pc ? bb : c;
            }
            out[i] = v & 0xff;
        }
        out.copy(px, y * ligne);
        prec = out;
    }
    return { w, h, canaux, px };
}

// ─── Composition : logo aplati sur le fond, réduit par moyenne de boîte ──
function composer(src) {
    const S = TAILLE;
    const out = Buffer.alloc(S * S * 3);
    for (let i = 0; i < S * S; i++) { out[i * 3] = FOND[0]; out[i * 3 + 1] = FOND[1]; out[i * 3 + 2] = FOND[2]; }

    const cible = Math.round(S * OCCUPATION);
    const marge = Math.round((S - cible) / 2);
    const ech = src.w / cible;           // > 1 : on réduit

    for (let y = 0; y < cible; y++) {
        for (let x = 0; x < cible; x++) {
            // moyenne de la boîte source correspondante, alpha compris
            const x0 = Math.floor(x * ech), x1 = Math.max(x0 + 1, Math.floor((x + 1) * ech));
            const y0 = Math.floor(y * ech), y1 = Math.max(y0 + 1, Math.floor((y + 1) * ech));
            // Couleurs prémultipliées par l'alpha : sans cela, les pixels de
            // bord d'un logo transparent tirent la moyenne vers leur couleur
            // fantôme et dessinent un halo.
            let r = 0, g = 0, bl = 0, sommeA = 0, n = 0;
            for (let sy = y0; sy < Math.min(y1, src.h); sy++) {
                for (let sx = x0; sx < Math.min(x1, src.w); sx++) {
                    const o = (sy * src.w + sx) * src.canaux;
                    const a = (src.canaux === 4 ? src.px[o + 3] : 255) / 255;
                    r += src.px[o] * a; g += src.px[o + 1] * a; bl += src.px[o + 2] * a;
                    sommeA += a;
                    n++;
                }
            }
            if (!n) continue;
            const A = sommeA / n;                       // couverture moyenne
            const R = sommeA ? r / sommeA : 0;          // couleur démultipliée
            const G = sommeA ? g / sommeA : 0;
            const B = sommeA ? bl / sommeA : 0;
            const d = ((y + marge) * S + (x + marge)) * 3;
            out[d] = Math.round(R * A + FOND[0] * (1 - A));
            out[d + 1] = Math.round(G * A + FOND[1] * (1 - A));
            out[d + 2] = Math.round(B * A + FOND[2] * (1 - A));
        }
    }
    return out;
}

// ─── Encodage ────────────────────────────────────────────────────────────
function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const t = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
    return Buffer.concat([len, t, data, crc]);
}

function encoder(rgb, S) {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4);
    ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;  // 8 bits, RVB opaque
    const ligne = S * 3;
    const brut = Buffer.alloc((ligne + 1) * S);
    for (let y = 0; y < S; y++) {
        brut[y * (ligne + 1)] = 0;                                        // filtre « none »
        rgb.copy(brut, y * (ligne + 1) + 1, y * ligne, (y + 1) * ligne);
    }
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', ihdr),
        chunk('IDAT', zlib.deflateSync(brut, { level: 9 })),
        chunk('IEND', Buffer.alloc(0)),
    ]);
}

const src = decoder(SRC);
console.log('source :', src.w + 'x' + src.h, '| canaux', src.canaux);
const png = encoder(composer(src), TAILLE);
fs.writeFileSync(DST, png);
console.log('écrit  :', DST, TAILLE + 'x' + TAILLE, '| type couleur 2 (RVB opaque) |', png.length, 'octets');
