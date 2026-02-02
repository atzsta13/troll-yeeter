declare const __APP_VERSION__: string;
declare module '*.css';

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}
