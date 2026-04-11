import { lazy } from 'react';

// Eagerly load ONLY the metadata for the gallery UI
const metaFiles = import.meta.glob('/src/components/templates/*.jsx', { import: 'templateMeta', eager: true });

// Prepare the lazy loading functions for the components
const componentFiles = import.meta.glob('/src/components/templates/*.jsx');

export const TEMPLATE_REGISTRY = {};

for (const path in metaFiles) {
  const meta = metaFiles[path];
  
  // Only register files that explicitly export templateMeta
  if (meta && meta.id) {
    // Extract the filename without the extension (e.g., "ExecutiveBlueTemplate")
    const fileName = path.split('/').pop().replace('.jsx', '');
    
    TEMPLATE_REGISTRY[meta.id] = {
      ...meta,
      // Auto-map the image based on the exact component file name from the dedicated folder
      image: `/resume-images/${fileName}.png`,
      // Dynamically create the lazy component
      component: lazy(componentFiles[path]),
    };
  }
}

export const TEMPLATE_OPTIONS = Object.values(TEMPLATE_REGISTRY);
