/*Developed by @jams2blues with love for the Tezos community
   File: lib/getStyled.js
   Summary: Safe default export for styled-components (ESM/CJS interop) */

import styledPkg from 'styled-components';
const styled = typeof styledPkg === 'function' ? styledPkg : styledPkg.default;
export default styled;

/* What changed & why: implemented styled-components import alias fix (Invariant I25) 
   to ensure SSR .withConfig is defined and no import conflicts */
