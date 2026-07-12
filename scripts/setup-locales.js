const fs = require('fs');
const path = require('path');
const frontMatter = require('front-matter');

const config = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, '../cornerstone.config.json'),
        'utf-8',
    ),
);
const brand = config.brand || {};
const localesDir = path.join(__dirname, '../src/locales');
const contentDir = path.join(__dirname, '../src/content');
const buildDir = path.join(__dirname, '../.build');
const defaultLang = config.defaultLang;

if (!fs.existsSync(localesDir)) {
    console.error('Locales directory not found.');
    process.exit(1);
}

// Read locale codes
const locales = {};
fs.readdirSync(localesDir)
    .filter((file) => file.endsWith('.json'))
    .forEach((file) => {
        const lang = path.parse(file).name;
        locales[lang] = JSON.parse(
            fs.readFileSync(path.join(localesDir, file), 'utf-8'),
        );
    });

const darkModeScript = `<script>
    ;(function(){var t=localStorage.getItem('theme');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches);if(d)document.documentElement.classList.add('dark')})()
    </script>`;

function getIconType(iconPath) {
    if (!iconPath) return null;
    if (iconPath.endsWith('.svg')) return 'image/svg+xml';
    if (iconPath.endsWith('.ico')) return 'image/x-icon';
    if (iconPath.endsWith('.png')) return 'image/png';
    return null;
}

function getOgImageUrl(image) {
    if (!image) return null;
    if (image.startsWith('http://') || image.startsWith('https://'))
        return image;
    if (image.startsWith('/')) return config.siteUrl + image;
    return `${config.siteUrl}/${image}`;
}

function buildAlternateLinks(pageUrl, lang) {
    const basePageUrl = pageUrl.replace(
        new RegExp('^/' + lang + '(?=/|$)'),
        '',
    );
    const links = [];

    // x-default points to the default-language version of this page.
    if (lang !== defaultLang) {
        const defaultHref = config.siteUrl + basePageUrl;
        links.push(
            `<link rel="alternate" hreflang="x-default" href="${escapeAttr(defaultHref)}">`,
        );
    }

    for (const l of Object.keys(locales)) {
        if (l === lang) continue;
        const lPageUrl =
            l === defaultLang ? basePageUrl : `/${l}${basePageUrl}`;
        const href = config.siteUrl + lPageUrl;
        links.push(
            `<link rel="alternate" hreflang="${l}" href="${escapeAttr(href)}">`,
        );
    }

    return links.join('\n    ');
}

function htmlStub({
    lang,
    title,
    description,
    pageUrl,
    templateInclude,
    assetPrefix,
    dataContent,
    brand,
}) {
    const dataAttr = dataContent ? ` data-content="${dataContent}"` : '';
    const desc = description || locales[lang].subtitle || '';
    const canonicalUrl = config.siteUrl + pageUrl;
    const faviconType = getIconType(brand.favicon);
    const ogImage = getOgImageUrl(brand.image);

    const faviconLinks = brand.favicon
        ? `<link rel="icon" href="${escapeAttr(assetPrefix + brand.favicon)}"${faviconType ? ` type="${faviconType}"` : ''}>
    <link rel="apple-touch-icon" href="${escapeAttr(assetPrefix + brand.favicon)}">`
        : '';

    const ogImageMeta = ogImage
        ? `<meta property="og:image" content="${escapeAttr(ogImage)}">`
        : '';

    const alternateLinks = buildAlternateLinks(pageUrl, lang);

    return `<!DOCTYPE html>
<html lang="${lang}"${dataAttr}>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeXml(title)}</title>
    <meta name="description" content="${escapeAttr(desc)}">
    <link rel="canonical" href="${escapeAttr(canonicalUrl)}">
    ${alternateLinks}
    ${faviconLinks}
    <meta property="og:title" content="${escapeAttr(title)}">
    <meta property="og:description" content="${escapeAttr(desc)}">
    <meta property="og:url" content="${escapeAttr(canonicalUrl)}">
    <meta property="og:type" content="website">
    <meta property="og:locale" content="${lang}">
    ${ogImageMeta}
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${escapeAttr(title)}">
    <meta name="twitter:description" content="${escapeAttr(desc)}">
    <noscript><style>[x-cloak],[style*="opacity: 0"]{display:revert!important;opacity:1!important}</style></noscript>
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
        fs.readdirSync(dir).forEach((file) => {
            const filePath = path.join(dir, file);
            if (fs.statSync(filePath).isDirectory()) {
                walk(filePath, path.join(relativePath, file));
            } else if (file.endsWith('.md')) {
                const raw = fs.readFileSync(filePath, 'utf-8');
                const { attributes } = frontMatter(raw);
                const slug = path.parse(file).name;
                const outputRel = path
                    .join(relativePath, slug)
                    .replace(/\\/g, '/');
                const contentRelPath = path
                    .join(relativePath, file)
                    .replace(/\\/g, '/');
                allPosts.push({ slug, outputRel, contentRelPath, attributes });
            }
        });
    };
    walk(contentDir);
    // Sort by date descending
    allPosts.sort((a, b) =>
        (b.attributes.date || '').localeCompare(a.attributes.date || ''),
    );
}

Object.keys(locales).forEach((lang) => {
    const isDefault = lang === defaultLang;
    const baseDir = isDefault ? buildDir : path.join(buildDir, lang);
    const rootAssetPrefix = isDefault ? '../' : '../../';

    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });

    const ui = locales[lang];

    // 1. Index — thin stub with <include> for main template
    const indexPageUrl = isDefault ? '' : `/${lang}`;
    fs.writeFileSync(
        path.join(baseDir, 'index.html'),
        htmlStub({
            lang,
            title: `${ui.title}${ui.subtitle ? ` | ${ui.subtitle}` : ''}`,
            description: ui.subtitle,
            pageUrl: indexPageUrl,
            templateInclude: 'templates/main.html',
            assetPrefix: rootAssetPrefix,
            brand,
        }),
    );
    generatedUrls.push({
        url: indexPageUrl,
        changefreq: 'daily',
        priority: 1.0,
    });

    // 2. 404 — thin stub
    const notFoundPageUrl = isDefault ? '/404' : `/${lang}/404`;
    fs.writeFileSync(
        path.join(baseDir, '404.html'),
        htmlStub({
            lang,
            title: `${ui.notFound.title} - ${ui.title}`,
            description: ui.notFound.message,
            pageUrl: notFoundPageUrl,
            templateInclude: 'templates/404.html',
            assetPrefix: rootAssetPrefix,
            brand,
        }),
    );

    // 3. Dynamic Content — scan .md files, generate thin stubs with data-content attribute
    for (const post of allPosts) {
        const outputDir = path.join(baseDir, post.outputRel);
        fs.mkdirSync(outputDir, { recursive: true });

        const depth = post.outputRel.split('/').length;
        const pageAssetPrefix = rootAssetPrefix + '../'.repeat(depth);
        const postPageUrl = (isDefault ? '/' : `/${lang}/`) + post.outputRel;

        fs.writeFileSync(
            path.join(outputDir, 'index.html'),
            htmlStub({
                lang,
                title: post.attributes.title || ui.title,
                description: post.attributes.description || ui.subtitle,
                pageUrl: postPageUrl,
                templateInclude: 'templates/post.html',
                assetPrefix: pageAssetPrefix,
                dataContent: post.contentRelPath,
                brand,
            }),
        );

        generatedUrls.push({
            url: postPageUrl,
            changefreq: 'weekly',
            priority: 0.8,
        });
    }

    // 4. Blog index page
    if (allPosts.length > 0) {
        const blogDir = path.join(baseDir, 'blog');
        fs.mkdirSync(blogDir, { recursive: true });

        const blogAssetPrefix = rootAssetPrefix + '../';
        const blogPageUrl = (isDefault ? '/' : `/${lang}/`) + 'blog';

        fs.writeFileSync(
            path.join(blogDir, 'index.html'),
            htmlStub({
                lang,
                title: `${ui.blog ? ui.blog.title : 'Blog'} - ${ui.title}`,
                description: ui.blog ? ui.blog.subtitle : ui.subtitle,
                pageUrl: blogPageUrl,
                templateInclude: 'templates/blog.html',
                assetPrefix: blogAssetPrefix,
                brand,
            }),
        );

        generatedUrls.push({
            url: blogPageUrl,
            changefreq: 'daily',
            priority: 0.9,
        });
    }
});

// 5. Sitemap
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${generatedUrls
    .map(
        (u) => `  <url>
    <loc>${config.siteUrl}${u.url}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
    )
    .join('\n')}
</urlset>`;
fs.writeFileSync(path.join(buildDir, 'sitemap.xml'), sitemap);

// 6. RSS Feed
const rssItems = allPosts
    .map((post) => {
        const url = `${config.siteUrl}/${post.outputRel}`;
        const pubDate = post.attributes.date
            ? new Date(post.attributes.date).toUTCString()
            : '';
        return `    <item>
      <title>${escapeXml(post.attributes.title || post.slug)}</title>
      <link>${url}</link>
      <guid>${url}</guid>
      ${post.attributes.description ? `<description>${escapeXml(post.attributes.description)}</description>` : ''}
      ${pubDate ? `<pubDate>${pubDate}</pubDate>` : ''}
    </item>`;
    })
    .join('\n');

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
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;');
}

console.log(
    `[setup-locales] Generated ${generatedUrls.length} entry stubs + RSS feed.`,
);
