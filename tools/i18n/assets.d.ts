// export-copy.ts loads content/outside.ts, which imports photo files. The web app gets these
// module types from Astro; the tools project declares the same shape.
declare module '*.jpg' {
  const metadata: { src: string; width: number; height: number; format: 'jpg' };
  export default metadata;
}
