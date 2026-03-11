const fs = require('fs');
const path = require('path');
const frontMatter = require('front-matter');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../cornerstone.config.json'), 'utf-8'));
const localesDir = path.join(__dirname, '../src/locales');
const contentDir = path.join(__dirname, '../src/content');
const buildDir = path.join(__dirname, '../.build');
const defaultLang = config.defaultLang;

if (!fs.existsSync(localesDir)) {
    console.error('Locales directory not found.');
    process.exit(1);
}

// Read locale codes (we only need titles for the page <title> tag)
const locales = {};
fs.readdirSync(localesDir)
    .filter(file => file.endsWith('.json'))
    .forEach(file => {
        const lang = path.parse(file).name;
        locales[lang] = JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf-8'));
    });

const darkModeScript = `<script>
    ;(function(){var t=localStorage.getItem('theme');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches);if(d)document.documentElement.classList.add('dark')})()
    </script>`;

// Generate a thin HTML entry stub — includes and expressions are resolved by the Parcel transformer
function htmlStub({ lang, title, templateInclude, assetPrefix, dataContent }) {
    const dataAttr = dataContent ? ` data-content="${dataContent}"` : '';
    return `<!DOCTYPE html>
<html lang="${lang}"${dataAttr}>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="stylesheet" href="${assetPrefix}src/styles.css">
    ${darkModeScript}
    <script type="module" src="${assetPrefix}src/index.js"></script>
</head>
<body class="bg-gray-100 dark:bg-gray-900 font-mono text-gray-900 dark:text-gray-100 min-h-screen flex flex-col">
<include src="${templateInclude}"></include>
</body>
</html>`;
}

if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir);

const generatedUrls = [];

Object.keys(locales).forEach(lang => {
    const isDefault = lang === defaultLang;
    const baseDir = isDefault ? buildDir : path.join(buildDir, lang);
    const rootAssetPrefix = isDefault ? '../' : '../../';

    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });

    const ui = locales[lang];

    // 1. Index — thin stub with <include> for main template
    fs.writeFileSync(path.join(baseDir, 'index.html'), htmlStub({
        lang,
        title: ui.title,
        templateInclude: 'templates/main.html',
        assetPrefix: rootAssetPrefix,
    }));
    generatedUrls.push({ url: isDefault ? '/' : `/${lang}/`, changefreq: 'daily', priority: 1.0 });

    // 2. 404 — thin stub
    fs.writeFileSync(path.join(baseDir, '404.html'), htmlStub({
        lang,
        title: `${ui.notFound.title} - ${ui.title}`,
        templateInclude: 'templates/404.html',
        assetPrefix: rootAssetPrefix,
    }));

    // 3. Dynamic Content — scan .md files, generate thin stubs with data-content attribute
    if (fs.existsSync(contentDir)) {
        const walk = (dir, relativePath = '') => {
            fs.readdirSync(dir).forEach(file => {
                const filePath = path.join(dir, file);
                if (fs.statSync(filePath).isDirectory()) {
                    walk(filePath, path.join(relativePath, file));
                } else if (file.endsWith('.md')) {
                    const raw = fs.readFileSync(filePath, 'utf-8');
                    const { attributes } = frontMatter(raw);
                    const slug = path.parse(file).name;

                    const outputRel = path.join(relativePath, slug);
                    const outputDir = path.join(baseDir, outputRel);
                    fs.mkdirSync(outputDir, { recursive: true });

                    const depth = outputRel.split(path.sep).length;
                    const pageAssetPrefix = rootAssetPrefix + '../'.repeat(depth);

                    // Content-relative path for the transformer to resolve
                    const contentRelPath = path.join(relativePath, file).replace(/\\/g, '/');

                    fs.writeFileSync(path.join(outputDir, 'index.html'), htmlStub({
                        lang,
                        title: attributes.title || ui.title,
                        templateInclude: 'templates/post.html',
                        assetPrefix: pageAssetPrefix,
                        dataContent: contentRelPath,
                    }));

                    generatedUrls.push({
                        url: (isDefault ? '/' : `/${lang}/`) + outputRel.replace(/\\/g, '/') + '/',
                        changefreq: 'weekly',
                        priority: 0.8,
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
    <loc>${config.siteUrl}${u.url}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
fs.writeFileSync(path.join(buildDir, 'sitemap.xml'), sitemap);

console.log(`[setup-locales] Generated ${generatedUrls.length} entry stubs.`);
