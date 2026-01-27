import React from 'react';
import Link from 'next/link';
import { DocsThemeConfig } from 'nextra-theme-docs';

const config: DocsThemeConfig = {
  logo: (
    <Link href="https://sharpapi.io" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <img src="/logo.svg" alt="SharpAPI" width={24} height={24} />
      <span style={{ fontWeight: 700 }}>SharpAPI</span>
    </Link>
  ),
  navbar: {
    extraContent: (
      <>
        <a
          href="https://sharpapi.io"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '0.5rem 1rem',
            marginLeft: '0.5rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          Back to SharpAPI →
        </a>
      </>
    ),
  },
  useNextSeoProps() {
    return {
      titleTemplate: '%s - SharpAPI Docs',
    };
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta property="og:title" content="SharpAPI Documentation" />
      <meta property="og:description" content="Real-time sports betting odds API" />
      <link rel="icon" href="/favicon.ico" sizes="any" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
    </>
  ),
  primaryHue: 210,
  footer: {
    text: (
      <span>
        {new Date().getFullYear()} SharpAPI. Built with ♠️ for sharp bettors.
      </span>
    ),
  },
  sidebar: {
    defaultMenuCollapseLevel: 1,
    toggleButton: true,
  },
  toc: {
    component: null,
  },
  feedback: {
    content: null,
  },
  editLink: {
    component: null,
  },
};

export default config;
