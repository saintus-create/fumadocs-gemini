import Script from "next/script";

import { RootProvider } from 'fumadocs-ui/provider/next';
import './global.css';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
});

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
        {/* Vapi Widget */}
        <Script
          src="https://cdn.jsdelivr.net/gh/VapiAI/html-script-tag@latest/dist/assets/index.js"
          strategy="afterInteractive"
          onLoad={() => {
            // @ts-ignore
            (function initVapi(){function tryInit(){if(window.vapiSDK&&typeof window.vapiSDK.run==="function"){window.vapiSDK.run({apiKey:process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY,assistant:process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID,config:{position:"bottom-right"}});}else{setTimeout(tryInit,50);}}tryInit();})();
          }}
        />
      </body>
    </html>
  );
}
