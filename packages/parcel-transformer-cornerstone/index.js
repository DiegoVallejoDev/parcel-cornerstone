const { Transformer } = require('@parcel/plugin');
const path = require('path');
const fs = require('fs');
const posthtml = require('posthtml');
const expressions = require('posthtml-expressions');
const { marked } = require('marked');
const frontMatter = require('front-matter');

const INCLUDE_RE = /<include\s+src="([^"]+)"\s*(?:\/>|><\/include>)/g;

module.exports = new Transformer({
    async transform({ asset, options }) {
        const code = await asset.getCode();

        // Only process HTML files that live inside .build/
        const filePath = asset.filePath.replace(/\\/g, '/');
        if (!filePath.includes('.build/')) {
            return [asset];
        }

        const projectRoot = options.projectRoot.replace(/\\/g, '/');
        const configPath = path.join(projectRoot, 'cornerstone.config.json');
        asset.invalidateOnFileChange(configPath);
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        const DEFAULT_LANG = config.defaultLang;

        const srcDir = path.join(projectRoot, 'src').replace(/\\/g, '/');
        const localesDir = path.join(srcDir, 'locales').replace(/\\/g, '/');
        const contentDir = path.join(srcDir, 'content').replace(/\\/g, '/');

        // --- Detect locale from path ---
        // .build/{lang}/... → lang; .build/index.html → defaultLang
        const buildDir = path.join(projectRoot, '.build').replace(/\\/g, '/');
        const relFromBuild = filePath.replace(buildDir + '/', '');
        const firstSegment = relFromBuild.split('/')[0];

        // Load all locale files to know which codes exist
        const localeFiles = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));
        const allLangCodes = localeFiles.map(f => path.parse(f).name);

        const lang = allLangCodes.includes(firstSegment) ? firstSegment : DEFAULT_LANG;

        // Invalidate on ALL locale files so any locale change triggers rebuild
        for (const lf of localeFiles) {
            const absPath = path.join(localesDir, lf);
            asset.invalidateOnFileChange(absPath);
        }

        const ui = JSON.parse(fs.readFileSync(path.join(localesDir, `${lang}.json`), 'utf-8'));

        // --- Locale key validation (deep) ---
        if (lang !== DEFAULT_LANG) {
            const baseUI = JSON.parse(fs.readFileSync(path.join(localesDir, `${DEFAULT_LANG}.json`), 'utf-8'));
            const missing = [];
            (function findMissing(base, target, prefix) {
                for (const key of Object.keys(base)) {
                    const path = prefix ? `${prefix}.${key}` : key;
                    if (!(key in target)) {
                        missing.push(path);
                    } else if (typeof base[key] === 'object' && base[key] !== null && !Array.isArray(base[key])) {
                        if (typeof target[key] === 'object' && target[key] !== null && !Array.isArray(target[key])) {
                            findMissing(base[key], target[key], path);
                        }
                    }
                }
            })(baseUI, ui, '');
            if (missing.length > 0) {
                console.warn(`[parcel-transformer-cornerstone] ${lang} is missing keys: ${missing.join(', ')}`);
            }
        }

        // --- Build languages array for navbar ---
        const languages = allLangCodes.map(l => ({
            code: l,
            href: l === DEFAULT_LANG ? '/' : `/${l}/`,
            active: l === lang,
        }));

        // --- Detect blog post content ---
        // The stub's <html> tag may have data-content="blog/hello-world.md"
        let post = null;
        const dataContentMatch = code.match(/data-content="([^"]+)"/);
        if (dataContentMatch) {
            const mdRelPath = dataContentMatch[1];
            const mdAbsPath = path.join(contentDir, mdRelPath);
            if (fs.existsSync(mdAbsPath)) {
                asset.invalidateOnFileChange(mdAbsPath);
                const raw = fs.readFileSync(mdAbsPath, 'utf-8');
                const { attributes, body } = frontMatter(raw);
                const htmlContent = marked.parse(body);
                post = { ...attributes, content: htmlContent };
            }
        }

        // --- Blog index: collect all posts for listing pages ---
        let posts = null;
        const isBlogIndex = filePath.includes('/blog/index.html');
        if (isBlogIndex) {
            posts = [];
            const scanDir = path.join(contentDir);
            if (fs.existsSync(scanDir)) {
                const walk = (dir, relativePath) => {
                    for (const file of fs.readdirSync(dir)) {
                        const abs = path.join(dir, file);
                        if (fs.statSync(abs).isDirectory()) {
                            walk(abs, relativePath ? `${relativePath}/${file}` : file);
                        } else if (file.endsWith('.md')) {
                            asset.invalidateOnFileChange(abs);
                            const raw = fs.readFileSync(abs, 'utf-8');
                            const { attributes } = frontMatter(raw);
                            const slug = path.parse(file).name;
                            const rel = relativePath ? `${relativePath}/${slug}` : slug;
                            const langPrefix = lang === DEFAULT_LANG ? '' : `/${lang}`;
                            posts.push({
                                ...attributes,
                                slug,
                                url: `${langPrefix}/${rel}/`,
                            });
                        }
                    }
                };
                walk(scanDir, '');
                posts.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
            }
        }

        // Invalidate when new .md files are created
        asset.invalidateOnFileCreate({ glob: path.join(contentDir, '**/*.md').replace(/\\/g, '/') });

        // --- Resolve <include> tags recursively (with cycle detection) ---
        function resolveIncludes(html, ancestors = new Set()) {
            return html.replace(INCLUDE_RE, (_, src) => {
                const absInclude = path.join(srcDir, src);
                if (ancestors.has(absInclude)) {
                    console.error(`[parcel-transformer-cornerstone] Circular include detected: ${absInclude}`);
                    return '';
                }
                if (!fs.existsSync(absInclude)) {
                    console.warn(`[parcel-transformer-cornerstone] Include not found: ${absInclude}`);
                    return '';
                }
                asset.invalidateOnFileChange(absInclude);
                const next = new Set(ancestors);
                next.add(absInclude);
                return resolveIncludes(fs.readFileSync(absInclude, 'utf-8'), next);
            });
        }

        let processed = resolveIncludes(code);

        // Normalize multiline {{ }} and {{{ }}} expressions to single-line
        // so the posthtml parser doesn't split them across text nodes
        processed = processed.replace(/\{\{(\{?)([\s\S]*?)(\}?)\}\}/g, (_, open, expr, close) => {
            return `{{${open} ${expr.trim()} ${close}}}`;
        });

        // Strip data-content attribute from output
        processed = processed.replace(/\s*data-content="[^"]*"/g, '');

        // --- Run posthtml-expressions ---
        const locals = { ui, lang, languages, year: new Date().getFullYear() };
        if (post) {
            locals.post = post;
        }
        if (posts) {
            locals.posts = posts;
        }

        const result = await posthtml([
            expressions({ locals }),
        ]).process(processed);

        processed = result.html;

        asset.setCode(processed);
        asset.type = 'html';

        return [asset];
    },
});
