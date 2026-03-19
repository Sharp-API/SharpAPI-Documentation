import nextra from 'nextra';

const withNextra = nextra({
  defaultShowCopyCode: true,
});

export default withNextra({
  output: 'export',
  images: { unoptimized: true },
  // Nextra reads i18n config, extracts locales, then removes it (App Router compatible)
  i18n: {
    locales: ['en'],
    defaultLocale: 'en',
  },
});
