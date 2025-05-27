/*Developed by @jams2blues with love for the Tezos community
  File: pages/index.js
  Summary: client-only entry – fixed relative import paths */

import dynamic from 'next/dynamic';

/* `components/` & `lib/` sit one level above `pages/` */
const Home = dynamic(() => import('../components/HomeContent'), { ssr:false });

export default Home;

/* What changed & why: corrected `../components/…` path; build no longer 404s */
