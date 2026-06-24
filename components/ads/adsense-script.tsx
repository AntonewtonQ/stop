import Script from "next/script";

const ADSENSE_CLIENT_ID = "ca-pub-9068523374327625";

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
