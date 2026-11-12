import Script from "next/script";

import { ADSENSE_CLIENT_ID } from "./adsense-config";

export function AdSenseScript() {
  return (
    <Script
      async
      crossOrigin="anonymous"
      id="google-adsense"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
      strategy="afterInteractive"
    />
  );
}
