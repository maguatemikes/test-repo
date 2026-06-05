import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public routes — accessible without a Clerk session.
const isPublic = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/u/:token*",   // hosted unsubscribe
  "/p/:token*",   // hosted preference center
  "/f/:slug*",    // hosted form
  "/api/webhooks/(.*)", // ESP/Stripe webhooks
]);

export default clerkMiddleware((auth, req) => {
  if (!isPublic(req)) auth().protect();
});

export const config = {
  matcher: [
    "/((?!_next|.*\\.(?:ico|png|svg|jpg|jpeg|gif|webp|avif|css|js|map)).*)",
    "/(api|trpc)(.*)",
  ],
};
