// Temporary maintenance response, served before authentication and page rendering.
export const MAINTENANCE_HTML = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#7004d6">
  <title>Em manutenção | Mimo</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; min-height: 100svh; display: grid; place-items: center; padding: 32px 24px; background: #faf8ff; color: #291342; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; text-align: center; }
    main { width: 100%; max-width: 560px; }
    .logo { display: inline-grid; place-items: center; width: 88px; height: 88px; margin-bottom: 24px; border-radius: 26px; background: #7004d6; box-shadow: 0 12px 36px #7004d61a; }
    .logo img { width: 64px; height: 64px; }
    .brand { margin: 0 0 48px; color: #7004d6; font-size: 24px; font-weight: 750; letter-spacing: -.8px; }
    h1 { margin: 0 0 16px; font-size: clamp(32px, 7vw, 48px); line-height: 1.15; letter-spacing: -1.5px; }
    .message { margin: 0; color: #675774; font-size: clamp(20px, 4vw, 24px); line-height: 1.5; }
    .line { width: 48px; height: 4px; margin: 36px auto 0; border-radius: 4px; background: #7004d6; }
  </style>
</head>
<body>
  <main>
    <div class="logo"><img src="/Logo.svg" width="64" height="64" alt=""></div>
    <p class="brand">mimo</p>
    <h1>Em manutenção</h1>
    <p class="message">Voltamos em breve.</p>
    <div class="line" aria-hidden="true"></div>
  </main>
</body>
</html>`;
