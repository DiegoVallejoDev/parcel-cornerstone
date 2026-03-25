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

// Collect all blog posts once (shared across locales for the blog index and RSS)
const allPosts = [];
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
                const outputRel = path.join(relativePath, slug).replace(/\\/g, '/');
                const contentRelPath = path.join(relativePath, file).replace(/\\/g, '/');
                allPosts.push({ slug, outputRel, contentRelPath, attributes });
            }
        });
    };
    walk(contentDir);
    // Sort by date descending
    allPosts.sort((a, b) => (b.attributes.date || '').localeCompare(a.attributes.date || ''));
}

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
    for (const post of allPosts) {
        const outputDir = path.join(baseDir, post.outputRel);
        fs.mkdirSync(outputDir, { recursive: true });

        const depth = post.outputRel.split('/').length;
        const pageAssetPrefix = rootAssetPrefix + '../'.repeat(depth);

        fs.writeFileSync(path.join(outputDir, 'index.html'), htmlStub({
            lang,
            title: post.attributes.title || ui.title,
            templateInclude: 'templates/post.html',
            assetPrefix: pageAssetPrefix,
            dataContent: post.contentRelPath,
        }));

        generatedUrls.push({
            url: (isDefault ? '/' : `/${lang}/`) + post.outputRel + '/',
            changefreq: 'weekly',
            priority: 0.8,
        });
    }

    // 4. Blog index page
    if (allPosts.length > 0) {
        const blogDir = path.join(baseDir, 'blog');
        fs.mkdirSync(blogDir, { recursive: true });

        const blogAssetPrefix = rootAssetPrefix + '../';

        fs.writeFileSync(path.join(blogDir, 'index.html'), htmlStub({
            lang,
            title: `${ui.blog ? ui.blog.title : 'Blog'} - ${ui.title}`,
            templateInclude: 'templates/blog.html',
            assetPrefix: blogAssetPrefix,
        }));

        generatedUrls.push({
            url: (isDefault ? '/' : `/${lang}/`) + 'blog/',
            changefreq: 'daily',
            priority: 0.9,
        });
    }
});

// 5. Sitemap
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${generatedUrls.map(u => `  <url>
    <loc>${config.siteUrl}${u.url}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
fs.writeFileSync(path.join(buildDir, 'sitemap.xml'), sitemap);

// 6. RSS Feed
const rssItems = allPosts.map(post => {
    const url = `${config.siteUrl}/${post.outputRel}/`;
    const pubDate = post.attributes.date ? new Date(post.attributes.date).toUTCString() : '';
    return `    <item>
      <title>${escapeXml(post.attributes.title || post.slug)}</title>
      <link>${url}</link>
      <guid>${url}</guid>
      ${post.attributes.description ? `<description>${escapeXml(post.attributes.description)}</description>` : ''}
      ${pubDate ? `<pubDate>${pubDate}</pubDate>` : ''}
    </item>`;
}).join('\n');

const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(locales[defaultLang].title)}</title>
    <link>${config.siteUrl}</link>
    <description>${escapeXml(locales[defaultLang].subtitle || '')}</description>
    <language>${defaultLang}</language>
    <atom:link href="${config.siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>
${rssItems}
  </channel>
</rss>`;
fs.writeFileSync(path.join(buildDir, 'feed.xml'), rssFeed);

function escapeXml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

console.log(`[setup-locales] Generated ${generatedUrls.length} entry stubs + RSS feed.`);
