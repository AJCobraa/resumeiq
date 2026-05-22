import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useFontLoader } from '../../hooks/useFontLoader';

const PAGE_HEIGHTS = { 'A4': 1122, 'US Letter': 1056 };
const PAGE_WIDTH_PX = 794;

const MemoTemplate = React.memo(({ SelectedTemplate, resume, customization, highlightIds }) => {
  return <SelectedTemplate resume={resume} customization={customization} highlightIds={highlightIds} />;
}, (prev, next) => {
  return JSON.stringify(prev.resume) === JSON.stringify(next.resume) &&
         JSON.stringify(prev.customization) === JSON.stringify(next.customization) &&
         JSON.stringify(prev.highlightIds) === JSON.stringify(next.highlightIds) &&
         prev.SelectedTemplate === next.SelectedTemplate;
});

export function MultiPagePreview({ resume, customization, SelectedTemplate, highlightIds }) {
  const [totalHeight, setTotalHeight] = useState(0);
  const measureRef = useRef(null);
  const fontReady = useFontLoader(customization?.font?.family);

  const pageFormat = customization?.region?.pageFormat || 'US Letter';
  const A4H = PAGE_HEIGHTS[pageFormat] || PAGE_HEIGHTS['US Letter'];

  useEffect(() => {
    if (!measureRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      if (!fontReady) return;
      for (const entry of entries) {
        setTotalHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(measureRef.current);
    return () => resizeObserver.disconnect();
  }, [fontReady]);

  const pageCount = Math.max(1, Math.ceil(totalHeight / A4H));

  // We inject a tiny style tag to handle print hiding
  // V1 KNOWN LIMITATION: web preview uses CSS clipping to simulate pages.
  // Content may be visually sliced at page boundaries in the browser.
  // The exported PDF is the authoritative paginated output and will always
  // be clean due to break-inside:avoid on all entry containers.
  return (
    <>
      <style>{`
        @media screen {
          .print-container { display: none !important; }
        }
        @media print {
          .web-preview-container { display: none !important; }
          .print-container { display: block !important; }
          body { background: white; margin: 0; padding: 0; }
        }
      `}</style>

      <div 
        ref={measureRef}
        data-no-print="true"
        style={{
          position: 'absolute',
          visibility: 'hidden',
          width: PAGE_WIDTH_PX,
          zIndex: -1,
          pointerEvents: 'none',
        }}
      >
        <MemoTemplate SelectedTemplate={SelectedTemplate} resume={resume} customization={customization} highlightIds={highlightIds} />
      </div>

      {/* Web Preview Container */}
      <div className="web-preview-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, paddingBottom: 80 }}>
        {Array.from({ length: pageCount }).map((_, pageIdx) => (
          <React.Fragment key={pageIdx}>
            <div style={{
              width: PAGE_WIDTH_PX,
              height: A4H,
              overflow: 'hidden',
              background: '#fff',
              boxShadow: '0 2px 20px rgba(0,0,0,0.18)',
              borderRadius: 3,
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: -(pageIdx * A4H),
                left: 0,
                width: '100%',
              }}>
                <MemoTemplate SelectedTemplate={SelectedTemplate} resume={resume} customization={customization} highlightIds={highlightIds} />
              </div>
            </div>

            {pageIdx < pageCount - 1 && (
              <div style={{
                height: 32,
                background: '#d1d5db',
                width: '100%', // full width of the scroll container
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1, // ensure it sits between pages
              }}>
                <span style={{
                  fontSize: 11,
                  color: '#6b7280',
                  background: '#c4c7cc',
                  padding: '3px 14px',
                  borderRadius: 999,
                  fontWeight: 500
                }}>
                  Page {pageIdx + 2}
                </span>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Print Container (Authoritative for PDF Export) */}
      <div className="print-container" style={{ width: PAGE_WIDTH_PX }}>
        <MemoTemplate SelectedTemplate={SelectedTemplate} resume={resume} customization={customization} highlightIds={highlightIds} />
      </div>
    </>
  );
}
