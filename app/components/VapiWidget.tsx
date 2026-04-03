'use client';

import { useEffect } from 'react';

export function VapiWidget() {
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    const assistant = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

    if (!apiKey || !assistant) {
      return;
    }

    let mounted = true;
    let retryId: number | undefined;
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/gh/VapiAI/html-script-tag@latest/dist/assets/index.js';
    script.async = true;
    script.onload = () => {
      function tryInit() {
        if (!mounted) return;

        if (
          // @ts-ignore
          window.vapiSDK &&
          // @ts-ignore
          typeof window.vapiSDK.run === 'function'
        ) {
          // @ts-ignore
          window.vapiSDK.run({
            apiKey,
            assistant,
            config: {
              theme: {
                colors: {
                  primary: '#000000',
                },
              },
            },
          });
        } else {
          retryId = window.setTimeout(tryInit, 50);
        }
      }
      tryInit();
    };
    document.body.appendChild(script);

    return () => {
      mounted = false;
      if (retryId) window.clearTimeout(retryId);
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return null;
}
