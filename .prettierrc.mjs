/** @type {import("prettier").Config} */
export default {
  // --- Alignment with your biome.json ---
  printWidth: 100, // Matches Biome "lineWidth": 100
  tabWidth: 2, // Matches Biome "indentWidth": 2
  useTabs: false, // IMPORTANT: Set to false because Biome uses "indentStyle": "space"!
  semi: true, // Matches Biome "semicolons": "always"
  singleQuote: true, // Matches Biome "quoteStyle": "single"
  trailingComma: 'all', // Matches Biome "trailingCommas": "all"

  // --- Plugins ---
  plugins: ['prettier-plugin-astro'],

  // --- Overrides ---
  overrides: [
    {
      files: '*.astro',
      options: {
        parser: 'astro',
      },
    },
    {
      files: ['*.yml', '*.yaml'],
      options: {
        singleQuote: false, // YAML often prefers double quotes
        proseWrap: 'always',
      },
    },
    {
      files: ['*.md', '*.mdx'],
      options: {
        printWidth: 80, // Markdown reads better when narrower
        proseWrap: 'always',
      },
    },
  ],
};
