/** ابزارهای پاسخ‌دهی مشترک + چک‌های امنیتی پایه */

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'x-content-type-options': 'nosniff',
    },
  });
}

const HTML_HEADERS: Record<string, string> = {
  'content-type': 'text/html; charset=utf-8',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  // بدون frame-ancestors تا پیش‌نمایش iframe بشکند
  // connect-src شامل wss: است تا اسکنر IP بتواند از مرورگر به IP های کلودفلر وصل شود
  'content-security-policy':
    "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' wss:",
};

export function htmlPage(content: string, status = 200): Response {
  return new Response(content, { status, headers: HTML_HEADERS });
}

export function redirect(location: string): Response {
  return new Response(null, { status: 302, headers: { location } });
}

/** دفاع عمیق در برابر CSRF: اگر Origin هست، باید با هاست درخواست یکی باشد */
export function originOk(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // درخواست غیرمرورگری (curl و...) — SameSite=Lax کافی است
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}
