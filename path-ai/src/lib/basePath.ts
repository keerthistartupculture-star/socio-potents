// URL prefix the app is served under, e.g. '/path-ai' when hosted inside the Socio Potents
// site. Empty for a root deploy. Read at build time, so it must match next.config's basePath.
// Next adds it to <Link>, router.push and redirect() itself; raw fetch()/href URLs need it added.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
