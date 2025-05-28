//File: pages/index.js
import { TARGET, ACTIVE_CONFIG } from '../config/NetworkDivergence.js';

/* Root route simply forwards to the peer deployment so one domain
   always shows the opposite network for quick toggling. */
export async function getServerSideProps () {
  return {
    redirect: {
      destination: ACTIVE_CONFIG.PEER_SITE_URL,
      permanent  : false
    }
  };
}
export default function Placeholder(){ return null; }
