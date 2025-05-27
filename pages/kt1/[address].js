import React from 'react';
import styled from '../../lib/getStyled.js';
import prisma from '../../lib/prisma.js';

/* Reuse the Card style for token display, or define a new styled container */
const TokenCard = styled.div`
  display: inline-block;
  width: 200px;
  margin: 8px;
  padding: 8px;
  border: 1px solid var(--zu-fg);
  border-radius: 8px;
  text-align: center;
`;

/** Server-side data fetch for a given collection (by address). */
export async function getServerSideProps({ params }) {
  const kt1 = params.address;
  // Try mainnet first, then ghostnet
  let collection = await prisma.collection.findUnique({
    where: { network_kt1: { network: 'mainnet', kt1 } },
    include: { 
      tokens: true,
      collaborators: true 
    }
  });
  if (!collection) {
    collection = await prisma.collection.findUnique({
      where: { network_kt1: { network: 'ghostnet', kt1 } },
      include: { tokens: true, collaborators: true }
    });
  }
  if (!collection) {
    return { notFound: true };
  }
  return { props: { collection } };
}

export default function CollectionPage({ collection }) {
  const { kt1, network, name, symbol, description, tokens, collaborators } = collection;

  // Group collaborator addresses by role for display
  const collabAddrs   = collaborators.filter(c => c.role === 'collaborator').map(c => c.address);
  const parentAddrs   = collaborators.filter(c => c.role === 'parent').map(c => c.address);
  const childAddrs    = collaborators.filter(c => c.role === 'child').map(c => c.address);

  return (
    <div style={{ padding: '16px' }}>
      <h1>{name || 'Unnamed Collection'} <small>({symbol || collection.version.toUpperCase()})</small></h1>
      <p><code>{kt1}</code> – Network: <strong>{network}</strong></p>
      {description && <p>{description}</p>}

      {/* Collaborators/Parents/Children sections */}
      {collabAddrs.length > 0 && (
        <p><strong>Collaborators:</strong> {collabAddrs.join(', ')}</p>
      )}
      {parentAddrs.length > 0 && (
        <p><strong>Parents:</strong> {parentAddrs.join(', ')}</p>
      )}
      {childAddrs.length > 0 && (
        <p><strong>Children:</strong> {childAddrs.join(', ')}</p>
      )}

      {/* Token Gallery */}
      <h2>Tokens ({tokens.length})</h2>
      <div>
        {tokens.map(token => (
          <TokenCard key={token.token_id}>
            {token.artifact_uri && token.artifact_uri.startsWith('data:') ? (
              // Display image if it's a data URI image
              <img src={token.artifact_uri} alt={token.name} style={{ maxWidth: '100%', borderRadius: '4px' }} />
            ) : token.artifact_uri ? (
              // If not an image or data URI, provide a download link
              <a href={token.artifact_uri} target="_blank" rel="noopener noreferrer">View Artifact</a>
            ) : (
              <em>No artifact</em>
            )}
            <div style={{ marginTop: '8px' }}>
              <strong>{token.name || `Token ${token.token_id}`}</strong>
              {token.burned && <span style={{ color: 'tomato' }}> (burned)</span>}
              {token.description && <p style={{ fontSize: '0.9em' }}>{token.description}</p>}
            </div>
          </TokenCard>
        ))}
      </div>
    </div>
  );
}
