import { build } from 'esbuild';
import { writeFileSync } from 'fs';

// Plugin : remplace les imports de contexte/firebase par des stubs, quel que
// soit le chemin relatif — ce que --alias ne sait pas faire.
const mockPlugin = {
  name: 'mock',
  setup(b) {
    b.onResolve({ filter: /context\/RoleContext$/ }, () => ({ path: 'mock-role', namespace: 'mock' }));
    b.onResolve({ filter: /config\/firebase$/ }, () => ({ path: 'mock-fb', namespace: 'mock' }));
    b.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => {
      if (args.path === 'mock-role') return { contents: `
        import React from 'react';
        export const ROLES = { KING:'King', OFFICER:'Officer', WARRIOR:'Warrior', GUEST:'Guest' };
        export const useRole = () => ({ role:'King', isAuthorized:()=>true, isKing:true, loading:false });
        export const RoleProvider = ({children}) => React.createElement(React.Fragment, null, children);
      `, loader: 'jsx', resolveDir: '.' };
      return { contents: `export const db={}; export const auth={}; export const functions={}; export default {};`, loader: 'js' };
    });
  }
};

await build({
  entryPoints: ['tmp/render-check.jsx'],
  bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic',
  plugins: [mockPlugin],
  define: { 'import.meta.env': '{}' },
  outfile: 'tmp/rc.cjs', logLevel: 'error'
});
console.log('BUILD_OK');
