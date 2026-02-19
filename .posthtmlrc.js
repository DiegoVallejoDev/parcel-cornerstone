const fs = require('fs');
const path = require('path');

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
        // Detect language from entry path: .build/{lang}/index.html
        const normalized = ctx.file.replace(/\\/g, '/');
        const match = normalized.match(/\.build\/(\w+)\//);
        const lang = match && locales[match[1]] ? match[1] : Object.keys(locales)[0];

        return {
          ui: locales[lang],
          lang: lang
        };
      }
    }
  }
};
