/**
 * Admin Email List
 * শুধু এই Email গুলো Admin Dashboard দেখতে পারবে
 */
export const ADMIN_EMAILS = (
  process.env.ADMIN_EMAILS || "skfirdous1111@gmail.com"
)
  .split(",")
  .map((email) => email.trim().toLowerCase());

/**
 * চেক করুন ইউজার Admin কিনা
 */
export function isAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
