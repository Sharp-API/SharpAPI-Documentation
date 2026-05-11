// TS 6.0 (TS2882) requires ambient declarations for side-effect imports of non-JS/TS modules.
// Next.js's bundler handles CSS at build time; this just keeps `tsc --noEmit` happy.
declare module "*.css";
declare module "*.scss";
