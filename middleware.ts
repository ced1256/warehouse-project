import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Create a response object that can be modified
  let response = NextResponse.next({
    request: {
      headers: new Headers(request.headers), // Pass request headers to the response
    },
  });

  try {
    // Check if Supabase environment variables are set
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Middleware Error: Supabase URL or Anon Key is missing.");
      // Return the unmodified response or a specific error response
      // Avoid proceeding with Supabase client creation if env vars are missing
      return response;
      // Or return new NextResponse("Configuration error", { status: 500 });
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        // Get cookie from the incoming request
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        // Set cookie on the outgoing response
        set(name: string, value: string, options: CookieOptions) {
          // Note: The original request cookies are immutable.
          // We modify the response cookies instead.
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        // Remove cookie from the outgoing response
        remove(name: string, options: CookieOptions) {
          // Note: The original request cookies are immutable.
          // We modify the response cookies by setting an empty value and expiry.
          response.cookies.set({
            name,
            value: "", // Set value to empty string
            ...options,
            maxAge: 0, // Expire the cookie immediately
          });
        },
      },
    });

    // Try to refresh the session
    const { error } = await supabase.auth.getSession();

    if (error) {
      console.error("Middleware: Supabase getSession error:", error.message);
      // Decide how to handle session errors, maybe still allow the request
      // or redirect to login depending on your application logic.
      // For now, we'll just return the response.
    }

    // Return the potentially modified response (with updated cookies)
    return response;
  } catch (e) {
    // Log the unexpected error
    console.error(
      "Middleware unexpected error:",
      e instanceof Error ? e.message : String(e)
    );

    // Return a generic server error response
    // Avoid returning NextResponse.next() directly from catch block
    // as the request might be in an inconsistent state.
    return new NextResponse(
      "An internal server error occurred in the middleware.",
      { status: 500 }
    );
  }
}

// Optional: Define which paths the middleware should run on
// export const config = {
//   matcher: [
//     /*
//      * Match all request paths except for the ones starting with:
//      * - api (API routes)
//      * - _next/static (static files)
//      * - _next/image (image optimization files)
//      * - favicon.ico (favicon file)
//      */
//     '/((?!api|_next/static|_next/image|favicon.ico).*)',
//   ],
// }
