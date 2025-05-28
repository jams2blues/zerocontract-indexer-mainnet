//File: pages/api/pruneGhostnet.js
export default function handler(_, res) {
  res.status(410).json({ disabled:true, message:'Ghostnet pruning disabled – retained for history.' });
}
