const fs = require('fs');
const path = require('path');

// Helper to load all locales dynamically
const localesDir = path.join(__dirname, 'src/locales');
const locales = {};

fs.readdirSync(localesDir).forEach(file => {
  if (file.endsWith('.json')) {
    const lang = path.parse(file).name;
    locales[lang] = require(path.join(localesDir, file));
  }
});

module.exports = {
  plugins: {
    "posthtml-include": { root: "./src" },
    "posthtml-expressions": {
      locals: (ctx) => {
        // Detect language based on file path (e.g., src/en/index.html)
        // Default to 'es' if not found in path
        const isEnglish = ctx.file.includes('/en/'); 
        const lang = isEnglish ? 'en' : 'es';
        
        return {
          ui: locales[lang],
          lang: lang
        };
      }
    }
  }
};