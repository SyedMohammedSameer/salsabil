// Where Noor lives in the app chrome.
//
//   dock      A raised button in the centre of the tab bar.
//   glass     A small translucent orb floating above the tab bar.
//   header    No floating button; an "Ask Noor" bar on Home and a button in
//             every hub header.
//   floating  The tab bar becomes a floating capsule with Noor beside it.

export type NoorPlacement = 'dock' | 'glass' | 'header' | 'floating'

export const NOOR_PLACEMENT: NoorPlacement = 'dock'

/** Space the floating capsule needs below scrolling content. */
export const FLOATING_BAR_HEIGHT = 60
