# TAPETA on Hostinger

## Current state

- `npm run build` produces the deployable static site in `dist/`.
- The build includes `index.html`, hashed JS/CSS, Nunito fonts, map art, sticker PNGs, Atlas assets, and GeoJSON.
- `tapeta.site` currently resolves to Hostinger's parked-domain page. The repository has no Hostinger deploy command or stored hosting credentials.

## When hosting access is ready

1. In hPanel, attach `tapeta.site` to an active Web Hosting plan and enable SSL.
2. Set the site's document root. Upload the **contents** of `dist/` into that root (often `public_html/`), not the `dist` folder itself. TAPETA uses hash routes, so the root `index.html` serves `/#explore`, `/#komunitas`, and other views without path rewrite rules.
3. Build with the site's public Vite variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The anon key is intended for browser use; never include `SUPABASE_DB_URL`, `SUPABASE_SERVICE_ROLE_KEY`, or `SUPABASE_IMPORT_PASSWORD` in the deployed bundle.
4. In Supabase Auth URL Configuration, set Site URL to `https://tapeta.site` and allow the production redirect URL(s) required by the auth flow.
5. Verify `https://tapeta.site/`, `/#explore`, `/#komunitas`, and the sign-in redirect. Check that the TLS certificate is active and that static assets return successfully.

## Access needed for direct deployment

Use a Hostinger-supported upload route enabled on the hosting plan, such as Git Deployment or SSH/SFTP, and provide the document root. Do not paste account passwords or private keys into chat; use a secure session or local environment variables once the owner has prepared access.
