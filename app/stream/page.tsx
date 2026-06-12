'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function Redirector() {
  const params = useSearchParams();

  useEffect(() => {
    const to = params.get('to');
    if (to) {
      window.location.replace(to);
    }
  }, []);

  return (
    <div style={{
      background: '#000',
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#aaa',
      fontFamily: 'sans-serif',
      fontSize: '14px',
    }}>
      Cargando...
    </div>
  );
}

export default function StreamPage() {
  return (
    <Suspense>
      <Redirector />
    </Suspense>
  );
}
