import { useState, useEffect } from 'react';

const FONT_MAP = {
  // Sans
  'Rubik': 'Rubik',
  'Roboto': 'Roboto',
  'Lato': 'Lato',
  'Open Sans': 'Open+Sans',
  'Work Sans': 'Work+Sans',
  'Karla': 'Karla',
  'Mulish': 'Mulish',
  'Barlow': 'Barlow',
  'Jost': 'Jost',
  'Fira Sans': 'Fira+Sans',
  'Nunito': 'Nunito',
  'IBM Plex Sans': 'IBM+Plex+Sans',
  'Source Sans Pro': 'Source+Sans+3',
  'Titillium Web': 'Titillium+Web',
  'Asap': 'Asap',
  // Serif
  'Merriweather': 'Merriweather',
  'Playfair Display': 'Playfair+Display',
  'Lora': 'Lora',
  'PT Serif': 'PT+Serif',
  'Noto Serif': 'Noto+Serif',
  'Crimson Text': 'Crimson+Text',
  'EB Garamond': 'EB+Garamond',
  'Libre Baskerville': 'Libre+Baskerville',
  'Cormorant Garamond': 'Cormorant+Garamond',
  'Bitter': 'Bitter',
  'Domine': 'Domine',
  'Alegreya': 'Alegreya',
  'Zilla Slab': 'Zilla+Slab',
  'Tinos': 'Tinos',
  'Rokkitt': 'Rokkitt',
  // Mono
  'Inconsolata': 'Inconsolata',
  'Source Code Pro': 'Source+Code+Pro',
  'IBM Plex Mono': 'IBM+Plex+Mono',
  'Overpass Mono': 'Overpass+Mono',
  'Space Mono': 'Space+Mono',
  'Courier Prime': 'Courier+Prime',
  'Fira Code': 'Fira+Code',
  'Ubuntu Mono': 'Ubuntu+Mono',
  'JetBrains Mono': 'JetBrains+Mono',
  'Cousine': 'Cousine',
  'Anonymous Pro': 'Anonymous+Pro',
  'PT Mono': 'PT+Mono',
  'Share Tech Mono': 'Share+Tech+Mono',
  'VT323': 'VT323',
  'Cutive Mono': 'Cutive+Mono',
  // Creative
  'Abril Fatface': 'Abril+Fatface',
  'Amatic SC': 'Amatic+SC',
  'Bungee Shade': 'Bungee+Shade',
  'Caveat': 'Caveat',
  'Caveat Brush': 'Caveat+Brush',
  'Comfortaa': 'Comfortaa',
  'Elsie': 'Elsie',
  'Lobster': 'Lobster',
  'Pacifico': 'Pacifico',
  'Parisienne': 'Parisienne',
  'Vibur': 'Vibur',
};

export function useFontLoader(fontFamily) {
  const [fontReady, setFontReady] = useState(false);

  useEffect(() => {
    if (!fontFamily) {
      setFontReady(true);
      return;
    }

    let isMounted = true;
    setFontReady(false);

    const loadFont = async () => {
      const googleFontName = FONT_MAP[fontFamily];
      if (googleFontName) {
        // Inject link tag if not already injected
        const linkId = `google-font-${googleFontName}`;
        if (!document.getElementById(linkId)) {
          const link = document.createElement('link');
          link.id = linkId;
          link.rel = 'stylesheet';
          
          const isCreative = ['Abril Fatface', 'Amatic SC', 'Bungee Shade', 'Caveat', 'Caveat Brush', 'Comfortaa', 'Elsie', 'Lobster', 'Pacifico', 'Parisienne', 'Vibur'].includes(fontFamily);
          if (isCreative) {
            link.href = `https://fonts.googleapis.com/css2?family=${googleFontName}&display=swap`;
          } else {
            link.href = `https://fonts.googleapis.com/css2?family=${googleFontName}:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&display=swap`;
          }

          document.head.appendChild(link);
        }
      }

      try {
        if (document.fonts) {
          await document.fonts.ready;
          await document.fonts.load(`16px "${fontFamily}"`);
        }
      } catch (err) {
        console.warn('Font loading failed or not supported:', err);
      } finally {
        if (isMounted) {
          setFontReady(true);
        }
      }
    };

    loadFont();

    return () => {
      isMounted = false;
    };
  }, [fontFamily]);

  return fontReady;
}
