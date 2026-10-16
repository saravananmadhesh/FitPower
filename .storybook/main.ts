import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@chromatic-com/storybook',
    '@storybook/addon-vitest',
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    '@storybook/addon-mcp',
  ],
  framework: '@storybook/react-vite',
  async viteFinal(viteConfig) {
    // vite-plugin-pwa (from the root vite.config.ts) returns an array of
    // plugins and tries to precache Storybook's own multi-MB preview
    // bundle, failing the build — it's an app-only concern. Vite's
    // PluginOption tree can nest arrays, so strip recursively.
    function isPwaPlugin(p: unknown): boolean {
      if (!p || typeof p !== 'object' || Array.isArray(p)) return false;
      const name = (p as { name?: unknown }).name;
      return typeof name === 'string' && name.startsWith('vite-plugin-pwa');
    }
    function stripPwa(plugins: unknown): unknown {
      if (!Array.isArray(plugins)) return plugins;
      return plugins.filter((p) => !isPwaPlugin(p)).map((p) => stripPwa(p));
    }
    viteConfig.plugins = stripPwa(viteConfig.plugins) as typeof viteConfig.plugins;
    return viteConfig;
  },
};
export default config;
