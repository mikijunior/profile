# Deployment

This project needs a host that supports Next.js server routes because
`/api/chat` calls OpenRouter with a private API key. GitHub Pages is not
suitable for the full site because it only serves static files and cannot keep
runtime environment secrets.

Use Vercel, Netlify, Cloudflare Pages with Functions, or another host with a
server/runtime layer for `/api/chat`.

Required production environment variables:

```sh
SITE_URL=https://your-domain.example
OPENROUTER_API_KEY=...
CHAT_REQUEST_TOKEN=...
NEXT_PUBLIC_CHAT_REQUEST_TOKEN=...
```

`CHAT_REQUEST_TOKEN` and `NEXT_PUBLIC_CHAT_REQUEST_TOKEN` must be the same
random value. The public token is only a friction layer for the public chat
endpoint, not private authentication.

Rotate any OpenRouter key that was ever stored in a local `.env` file or pasted
into review output.
