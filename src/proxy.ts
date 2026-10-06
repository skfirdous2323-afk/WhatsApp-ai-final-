import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/inbox(.*)",
  "/contacts(.*)",
  "/pipelines(.*)",
  "/broadcasts(.*)",
  "/automations(.*)",
  "/settings(.*)",
  "/api/whatsapp/(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|.*\\.(?:html?|css|js(?!on)|png|jpg|jpeg|gif|svg|webp|ico|ttf|woff2?|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
