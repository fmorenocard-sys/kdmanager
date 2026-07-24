/**
 * Smoke test de rendu réel — garde-fou contre les ReferenceError d'identifiant
 * (ex. un composant JSX utilisé sans import), que `vite build` ne détecte pas.
 *
 *   npm run test:render
 *
 * Contexte : le 2026-07-22, `KvKConfigForm` a atteint la production avec un
 * `<Trans>` non importé. Le build passait ; le crash n'apparaissait qu'au rendu,
 * et la page étant King-only, personne ne l'a vu avant le déploiement.
 *
 * Ce harnais transpile le composant avec esbuild, mocke ses contextes (rôle Roi,
 * firebase) via un plugin de résolution — un simple --alias ne couvre pas les
 * imports relatifs — puis le rend côté serveur. Un identifiant manquant lève une
 * ReferenceError ; le test échoue alors avec le code de sortie 2.
 *
 * Validé : sur la version corrigée il imprime RENDER_OK, sur la version cassée
 * (import retiré) il imprime « REFERENCE_ERROR: Trans is not defined ».
 *
 * Ajouter ici tout composant King-only ou difficile à atteindre en préproduction.
 */

import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');

const mockPlugin = {
    name: 'mock-contexts',
    setup(b) {
        b.onResolve({ filter: /context\/RoleContext$/ }, () => ({ path: 'mock-role', namespace: 'mock' }));
        b.onResolve({ filter: /config\/firebase$/ }, () => ({ path: 'mock-fb', namespace: 'mock' }));
        b.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => {
            if (args.path === 'mock-role') {
                return {
                    loader: 'jsx', resolveDir: root, contents: `
                        import React from 'react';
                        export const ROLES = { KING:'King', OFFICER:'Officer', WARRIOR:'Warrior', GUEST:'Guest' };
                        export const useRole = () => ({ role:'King', isAuthorized:()=>true, isKing:true, loading:false });
                        export const RoleProvider = ({children}) => React.createElement(React.Fragment, null, children);
                    `
                };
            }
            return { loader: 'js', contents: 'export const db={}; export const auth={}; export const functions={}; export default {};' };
        });
    }
};

const outfile = join(here, '.out.cjs');

await build({
    entryPoints: [join(here, 'entry.jsx')],
    bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic',
    plugins: [mockPlugin],
    define: { 'import.meta.env': '{}' },
    outfile, logLevel: 'error'
});

const res = spawnSync(process.execPath, [outfile], { encoding: 'utf8' });
const line = (res.stdout || '').split('\n').find((l) => l.startsWith('RESULT:')) || '(aucun RESULT)';
process.stdout.write(line + '\n');

if (res.status === 2 || line.includes('REFERENCE_ERROR')) {
    process.stderr.write('❌ Rendu impossible — identifiant manquant (voir ci-dessus).\n');
    process.exit(1);
}
if (!line.includes('RENDER_OK')) {
    process.stderr.write('⚠️ Rendu non concluant : ' + line + '\n');
    process.exit(1);
}
process.stdout.write('✅ Rendu sans ReferenceError.\n');
