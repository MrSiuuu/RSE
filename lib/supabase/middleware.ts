import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
          })
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname
  
  // IMPORTANT: Utiliser getUser() au lieu de getSession().user pour la sécurité
  // getUser() valide le token en contactant le serveur Supabase Auth
  // Cela évite le warning de sécurité de Supabase qui recommande de ne pas utiliser session.user
  const { data: { user } } = await supabase.auth.getUser()

  // Routes publiques admin (pas besoin d'authentification)
  const publicRoutes = ['/admin/login', '/admin/create-user']
  const isPublicRoute = publicRoutes.includes(pathname)

  // Si utilisateur connecté essaie d'accéder à login ou create-user, rediriger vers dashboard
  if ((pathname === '/admin/login' || pathname === '/admin/create-user') && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/dashboard'
    return NextResponse.redirect(url)
  }

  // Si route admin protégée (pas publique) et utilisateur non connecté, rediriger vers login
  if (pathname.startsWith('/admin') && !isPublicRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    return NextResponse.redirect(url)
  }

  return response
}
