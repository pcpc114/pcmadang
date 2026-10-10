// Infrastructure placeholder only; the site is uploaded separately as a version.
export default {
  fetch() {
    return new Response('Review deployment is not publicly available.', {
      status: 503,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  },
};
