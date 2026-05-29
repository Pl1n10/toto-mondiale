// Slice #8e: protect the prediction-set routes. With JWT sessions the
// session is readable on the Edge runtime, so a plain Auth.js middleware
// works — the `authorized` callback in lib/auth.ts decides, and an
// unauthenticated request to a matched route is redirected to /sign-in.
export { auth as middleware } from '@/lib/auth';

export const config = {
  matcher: ['/prediction-set/:path*'],
};
