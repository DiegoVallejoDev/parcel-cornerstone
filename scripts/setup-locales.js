const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/locales');
const srcDir = path.join(__dirname, '../src');
const buildDir = path.join(__dirname, '../.build');
const defaultLang = 'es';

if (!fs.existsSync(localesDir)) {
    console.error('Locales directory not found.');
    process.exit(1);
}

const locales = {};
fs.readdirSync(localesDir)
    .filter(file => file.endsWith('.json'))
    .forEach(file => {
        const lang = path.parse(file).name;
        locales[lang] = JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf-8'));
    });

function resolveIncludes(html) {
    return html.replace(
        /<posthtml-include\s+src="([^"]+)"\s*(?:\/>|><\/posthtml-include>)/g,
        (_, src) => {
            const filePath = path.join(srcDir, src);
            if (!fs.existsSync(filePath)) {
                console.warn(`[setup-locales] Include not found: ${filePath}`);
                return '';
            }
            return resolveIncludes(fs.readFileSync(filePath, 'utf-8'));
        }
    );
}

const body = resolveIncludes(
    fs.readFileSync(path.join(srcDir, 'templates/main.html'), 'utf-8')
);

const allLangs = Object.keys(locales);

const ALPINE_PATTERN = /\bx-data\b|\bx-show\b|\bx-bind\b|\bx-on:|\bx-text\b|\bx-html\b|\bx-model\b|\bx-for\b|\bx-if\b|\bx-init\b|\bx-effect\b|\bx-ref\b|\bx-cloak\b|\b@click\b|\b@submit\b|\b@input\b|\b@change\b|\b:class\b|\b:aria-/;

function needsAlpine(html) {
    return ALPINE_PATTERN.test(html);
}

const darkModeScript = `<script>
    if(localStorage.getItem('theme')==='dark'||(!localStorage.getItem('theme')&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}
    </script>`;

function scriptTag(assetPrefix, html) {
    if (needsAlpine(html)) {
        return `    <script type="module" src="${assetPrefix}src/index.js"></script>`;
    }
    return '';
}

const htmlTemplate = (lang, assetPrefix) => {
    const alpineTag = scriptTag(assetPrefix, body);
    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ ui.title }}</title>
    <link rel="stylesheet" href="${assetPrefix}src/styles.css">
    ${darkModeScript}
${alpineTag}
</head>
<body class="bg-gray-100 dark:bg-gray-900 font-mono text-gray-900 dark:text-gray-100 min-h-screen flex flex-col">
${body}
</body>
</html>`;
};

const notFoundBody = fs.existsSync(path.join(srcDir, 'templates/404.html'))
    ? resolveIncludes(fs.readFileSync(path.join(srcDir, 'templates/404.html'), 'utf-8'))
    : '';

const notFoundTemplate = (lang, assetPrefix) => {
    const alpineTag = scriptTag(assetPrefix, notFoundBody);
    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ ui.notFound.title }} — {{ ui.title }}</title>
    <link rel="stylesheet" href="${assetPrefix}src/styles.css">
    ${darkModeScript}
${alpineTag}
</head>
<body class="bg-gray-100 dark:bg-gray-900 font-mono text-gray-900 dark:text-gray-100 min-h-screen flex flex-col">
${notFoundBody}
</body>
</html>`;
};

Object.keys(locales).forEach(lang => {
    const isDefault = lang === defaultLang;
    const targetDir = isDefault ? buildDir : path.join(buildDir, lang);
    const assetPrefix = isDefault ? '../' : '../../';

    fs.mkdirSync(targetDir, { recursive: true });

    const config = {
        plugins: {
            "posthtml-expressions": {
                locals: {
                    ui: locales[lang],
                    lang,
                    languages: allLangs.map(l => ({
                        code: l,
                        href: l === defaultLang ? '/' : `/${l}/`,
                        active: l === lang
                    }))
                }
            }
        }
    };

    fs.writeFileSync(path.join(targetDir, 'index.html'), htmlTemplate(lang, assetPrefix));
    fs.writeFileSync(path.join(targetDir, '404.html'), notFoundTemplate(lang, assetPrefix));
    fs.writeFileSync(path.join(targetDir, '.posthtmlrc'), JSON.stringify(config, null, 2));
});

const mainAlpine = needsAlpine(body);
const notFoundAlpine = needsAlpine(notFoundBody);
console.log(`[setup-locales] Generated entries for: ${Object.keys(locales).join(', ')} (default: ${defaultLang})`);
console.log(`[setup-locales] Alpine.js: index=${mainAlpine}, 404=${notFoundAlpine}`);
