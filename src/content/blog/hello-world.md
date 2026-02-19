---
title: 'Hello World: Building Static Sites with Parcel & Alpine'
date: '2026-02-19'
description:
  'A demonstration of how this template processes Markdown content into static
  HTML pages.'
author: 'Diego Vallejo'
image: '/images/blog-cover.jpg'
tags: ['alpinejs', 'parcel', 'ssg']
---

# Welcome to the Content Engine

This page is generated from a Markdown file located at
\`src/content/blog/hello-world.md\`.

The build script:

1.  Reads the front-matter metadata (title, date, etc.)
2.  Parses the Markdown content using \`marked\`
3.  Injects it into a layout template
4.  Generates a static HTML file

## Features

- **Front-matter Support**: Define metadata easily.
- **Code Highlighting**: (Can be added via PrismJS or similar).
- **Fast Build**: Standard Node.js script.

### Sample Code

\`\`\`javascript console.log('Hello from the static generator!'); \`\`\`

## Next Steps

Try adding your own \`.md\` files in the content folder and run the build again!
