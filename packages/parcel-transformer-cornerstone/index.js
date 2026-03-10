const { Transformer } = require('@parcel/plugin');
const path = require('path');
const fs = require('fs');
const posthtml = require('posthtml');
const expressions = require('posthtml-expressions');
const { marked } = require('marked');
const frontMatter = require('front-matter');

const INCLUDE_RE = /<include\s+src="([^"]+)"\s*(?:\/>|><\/include>)/g;
const DEFAULT_LANG = 'es';

module.exports = new Transformer({
    async transform({ asset, options }) {
        const code = await asset.getCode();

        // Only process HTML files that live inside .build/
        const filePath = asset.filePath.replace(/\\/g, '/');
        if (!filePath.includes('.build/')) {
            return [asset];
        }

        const projectRoot = options.projectRoot.replace(/\\/g, '/');
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

        // --- Locale key validation ---
        if (lang !== DEFAULT_LANG) {
            const baseUI = JSON.parse(fs.readFileSync(path.join(localesDir, `${DEFAULT_LANG}.json`), 'utf-8'));
            const baseKeys = Object.keys(baseUI).sort();
            const langKeys = Object.keys(ui).sort();
            const missing = baseKeys.filter(k => !langKeys.includes(k));
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

        // Invalidate when new .md files are created
        asset.invalidateOnFileCreate({ glob: path.join(contentDir, '**/*.md').replace(/\\/g, '/') });

        // --- Resolve <include> tags recursively ---
        function resolveIncludes(html) {
            return html.replace(INCLUDE_RE, (_, src) => {
                const absInclude = path.join(srcDir, src);
                if (!fs.existsSync(absInclude)) {
                    console.warn(`[parcel-transformer-cornerstone] Include not found: ${absInclude}`);
                    return '';
                }
                asset.invalidateOnFileChange(absInclude);
                return resolveIncludes(fs.readFileSync(absInclude, 'utf-8'));
            });
        }

        let processed = resolveIncludes(code);

        // Normalize multiline {{ }} and {{{ }}} expressions to single-line
        // so the posthtml parser doesn't split them across text nodes
        processed = processed.replace(/\{\{(\{?)([\s\S]*?)(\}?)\}\}/g, (_, open, expr, close) => {
            return `{{${open} ${expr.trim()} ${close}}}`;
        });

        // --- Run posthtml-expressions ---
        const locals = { ui, lang, languages };
        if (post) {
            locals.post = post;
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
