const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const frontMatter = require('front-matter');

const localesDir = path.join(__dirname, '../src/locales');
const srcDir = path.join(__dirname, '../src');
const contentDir = path.join(__dirname, '../src/content');
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

// 1. Validation: Ensure keys match across locales
const baseKeys = Object.keys(locales[defaultLang]).sort();
Object.keys(locales).forEach(lang => {
    if (lang === defaultLang) return;
    const keys = Object.keys(locales[lang]).sort();
    const missing = baseKeys.filter(k => !keys.includes(k));
    if (missing.length > 0) {
        console.warn(`[Locale Warning] ${lang} is missing keys: ${missing.join(', ')}`);
    }
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

const mainBody = resolveIncludes(fs.readFileSync(path.join(srcDir, 'templates/main.html'), 'utf-8'));
const postTemplate = fs.existsSync(path.join(srcDir, 'templates/post.html'))
    ? resolveIncludes(fs.readFileSync(path.join(srcDir, 'templates/post.html'), 'utf-8'))
    : '<div class="p-4">{{{ post.content }}}</div>';

const notFoundBody = fs.existsSync(path.join(srcDir, 'templates/404.html'))
    ? resolveIncludes(fs.readFileSync(path.join(srcDir, 'templates/404.html'), 'utf-8'))
    : '';

const darkModeScript = `<script>
    if(localStorage.getItem('theme')==='dark'||(!localStorage.getItem('theme')&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}
    </script>`;

const ALPINE_PATTERN = /\bx-data\b|\bx-show\b/;
function needsAlpine(html) {
    return ALPINE_PATTERN.test(html); // Broad check
}

function scriptTag(assetPrefix) {
    return `    <script type="module" src="${assetPrefix}src/index.js"></script>`;
}

const htmlWrapper = (lang, title, content, assetPrefix) => {
    const alpineTag = scriptTag(assetPrefix);
    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="stylesheet" href="${assetPrefix}src/styles.css">
    ${darkModeScript}
${alpineTag}
</head>
<body class="bg-gray-100 dark:bg-gray-900 font-mono text-gray-900 dark:text-gray-100 min-h-screen flex flex-col">
${content}
</body>
</html>`;
};

if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir);

const generatedUrls = [];

Object.keys(locales).forEach(lang => {
    const isDefault = lang === defaultLang;
    const baseDir = isDefault ? buildDir : path.join(buildDir, lang);
    const rootAssetPrefix = isDefault ? '../' : '../../';

    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });

    const ui = locales[lang];
    const allLangs = Object.keys(locales);

    // Helper to generate full common locals
    const getCommonLocals = () => ({
        ui,
        lang,
        languages: allLangs.map(l => ({
            code: l,
            href: l === defaultLang ? '/' : `/${l}/`,
            active: l === lang
        }))
    });

    // 1. Index
    fs.writeFileSync(path.join(baseDir, 'index.html'), htmlWrapper(lang, ui.title, mainBody, rootAssetPrefix));
    fs.writeFileSync(path.join(baseDir, '.posthtmlrc'), JSON.stringify({
        plugins: { "posthtml-expressions": { locals: getCommonLocals() } }
    }, null, 2));

    generatedUrls.push({ url: isDefault ? '/' : `/${lang}/`, changefreq: 'daily', priority: 1.0 });

    // 2. 404
    fs.writeFileSync(path.join(baseDir, '404.html'), htmlWrapper(lang, `${ui.notFound.title} - ${ui.title}`, notFoundBody, rootAssetPrefix));

    // 3. Dynamic Content
    if (fs.existsSync(contentDir)) {
        const walk = (dir, relativePath = '') => {
            fs.readdirSync(dir).forEach(file => {
                const filePath = path.join(dir, file);
                if (fs.statSync(filePath).isDirectory()) {
                    walk(filePath, path.join(relativePath, file));
                } else if (file.endsWith('.md')) {
                    const raw = fs.readFileSync(filePath, 'utf-8');
                    const { attributes, body } = frontMatter(raw);
                    const html = marked.parse(body);
                    const slug = path.parse(file).name;

                    const outputRel = path.join(relativePath, slug); // e.g. blog/hello
                    const outputDir = path.join(baseDir, outputRel);
                    fs.mkdirSync(outputDir, { recursive: true });

                    // Calculate asset prefix:
                    // default: build/blog/hello -> depth 2. Need ../../../src...
                    // Wait, rootAssetPrefix is ../
                    // If depth is 0 (build root), we need ../
                    // If depth is 1 (build/blog), we need ../../
                    // If depth is 2 (build/blog/hello), we need ../../../
                    const depth = outputRel.split(path.sep).length;
                    const pageAssetPrefix = rootAssetPrefix + '../'.repeat(depth);

                    const locals = getCommonLocals();
                    locals.post = { ...attributes, content: html };

                    fs.writeFileSync(path.join(outputDir, 'index.html'),
                        htmlWrapper(lang, attributes.title || ui.title, postTemplate, pageAssetPrefix));

                    fs.writeFileSync(path.join(outputDir, '.posthtmlrc'), JSON.stringify({
                        plugins: { "posthtml-expressions": { locals } }
                    }, null, 2));

                    generatedUrls.push({
                        url: (isDefault ? '/' : `/${lang}/`) + outputRel.replace(/\\/g, '/') + '/',
                        changefreq: 'weekly',
                        priority: 0.8
                    });
                }
            });
        };
        walk(contentDir);
    }
});

// 4. Sitemap
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${generatedUrls.map(u => `  <url>
    <loc>https://parcel-cornerstone.vercel.app${u.url}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
fs.writeFileSync(path.join(buildDir, 'sitemap.xml'), sitemap);

console.log(`[setup-locales] Build complete. Generated ${generatedUrls.length} pages.`);
