export const ADSENSE_CLIENT_ID = "ca-pub-9068523374327625";

/**
 * Display ad unit ids ("data-ad-slot") created in the AdSense dashboard
 * (Anúncios → Por bloco de anúncios → Anúncio de display). When a slot id is
 * missing the corresponding <AdSlot> renders nothing.
 */
export const ADSENSE_SLOTS = {
  homeMiddle: process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_MIDDLE,
  homeBottom: process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_BOTTOM,
  // Guides (/regras, /dicas, /palavras, /sobre). Falls back to the home unit.
  content:
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_CONTENT ??
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_MIDDLE,
};
