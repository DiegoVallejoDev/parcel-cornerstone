const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/locales');
const srcDir = path.join(__dirname, '../src');
const templatePath = 'templates/main.html';
const defaultLang = 'es';

if (!fs.existsSync(localesDir)) {
    console.error('Locales directory not found.');
    process.exit(1);
}

const languages = fs.readdirSync(localesDir)
    .filter(file => file.endsWith('.json'))
    .map(file => path.parse(file).name);

languages.forEach(lang => {
    // Determine target directory: src/ for default, src/{lang}/ for others
    const isDefault = lang === defaultLang;
    const targetDir = isDefault ? srcDir : path.join(srcDir, lang);
    const filePath = path.join(targetDir, 'index.html');

    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    // Adjust relative path to template
    const depth = isDefault ? '' : '../';
    const content = `<posthtml-include src="${depth}${templatePath}"></posthtml-include>`;

    fs.writeFileSync(filePath, content);
});

console.log(`[setup-locales] Generated proxies for: ${languages.join(', ')}`);