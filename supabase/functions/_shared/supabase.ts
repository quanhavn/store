/**
 * Shared Supabase utilities for Edge Functions
 *
 * Security Guidelines:
 * 1. Always use createSupabaseClient() for user requests (respects RLS)
 * 2. Only use createSupabaseAdminClient() for trusted server-side operations
 * 3. Always call getUser() to verify authentication
 * 4. Always call getUserStore() to get store context
 * 5. Never expose stack traces in error responses
 * 6. Use sanitized error messages for production
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================================
// CORS Configuration
// ============================================================================

const ALLOWED_ORIGINS = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || ['*']

export const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

// ============================================================================
// Security Headers for Responses
// ============================================================================

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
}

// ============================================================================
// Supabase Clients
// ============================================================================

/**
 * Creates a Supabase client that respects RLS policies.
 * Use this for all user-initiated requests.
 *
 * @param req - The incoming request with Authorization header
 * @returns Supabase client with user context
 */
export function createSupabaseClient(req: Request) {
  const authHeader = req.headers.get('Authorization')

  if (!authHeader) {
    throw new Error('Missing authorization header')
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
  })
}

/**
 * Creates a Supabase admin client that bypasses RLS.
 * SECURITY WARNING: Only use for trusted server-side operations.
 *
 * @returns Supabase admin client
 */
export function createSupabaseAdminClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase admin configuration')
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

// ============================================================================
// Authentication Helpers
// ============================================================================

/**
 * Verifies the user is authenticated and returns user info.
 * Throws an error if not authenticated.
 *
 * @param supabase - Supabase client instance
 * @returns Authenticated user object
 * @throws Error if not authenticated
 */
export async function getUser(
  supabase: ReturnType<typeof createClient>
) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    console.error('Auth error:', error.message)
    throw new Error('Unauthorized')
  }

  if (!user) {
    throw new Error('Unauthorized')
  }

  return user
}

/**
 * Gets the store_id for the authenticated user.
 * Ensures store-based isolation.
 *
 * @param supabase - Supabase client instance
 * @param userId - Authenticated user's ID
 * @returns Object containing store_id
 * @throws Error if user has no associated store
 */
export async function getUserStore(
  supabase: ReturnType<typeof createClient>,
  userId: string
) {
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('store_id, role')
    .eq('id', userId)
    .single()

  if (userError) {
    console.error('User store error:', userError.message)
    throw new Error('Failed to get user store')
  }

  if (!userData?.store_id) {
    throw new Error('User has no associated store')
  }

  return {
    store_id: userData.store_id,
    role: userData.role as 'owner' | 'manager' | 'staff',
  }
}

/**
 * Checks if the user has owner or manager role.
 *
 * @param role - User's role
 * @returns True if owner or manager
 */
export function isOwnerOrManager(role: string): boolean {
  return role === 'owner' || role === 'manager'
}

/**
 * Checks if the user is an owner.
 *
 * @param role - User's role
 * @returns True if owner
 */
export function isOwner(role: string): boolean {
  return role === 'owner'
}

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Creates a successful JSON response with security headers.
 *
 * @param data - Response data
 * @param status - HTTP status code (default: 200)
 * @returns Response object
 */
export function successResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: {
      ...corsHeaders,
      ...securityHeaders,
      'Content-Type': 'application/json',
    },
    status,
  })
}

/**
 * Creates an error JSON response with security headers.
 * Never exposes stack traces or internal error details.
 *
 * @param message - User-friendly error message
 * @param status - HTTP status code (default: 400)
 * @returns Response object
 */
export function errorResponse(message: string, status = 400) {
  // Sanitize error message - don't expose internal details
  const safeMessage = sanitizeErrorMessage(message)

  return new Response(JSON.stringify({ error: safeMessage }), {
    headers: {
      ...corsHeaders,
      ...securityHeaders,
      'Content-Type': 'application/json',
    },
    status,
  })
}

/**
 * Sanitizes error messages for production.
 * Prevents leaking sensitive information.
 *
 * @param message - Original error message
 * @returns Sanitized message
 */
function sanitizeErrorMessage(message: string): string {
  // List of sensitive patterns to hide
  const sensitivePatterns = [
    /password/i,
    /secret/i,
    /key/i,
    /token/i,
    /credentials/i,
    /connection.*refused/i,
    /ECONNREFUSED/i,
    /stack trace/i,
    /at \w+\s*\(/i, // Stack trace lines
  ]

  for (const pattern of sensitivePatterns) {
    if (pattern.test(message)) {
      return 'An error occurred. Please try again.'
    }
  }

  // Limit message length to prevent information leakage
  if (message.length > 200) {
    return message.substring(0, 200) + '...'
  }

  return message
}

/**
 * Handles CORS preflight requests.
 *
 * @param req - Incoming request
 * @returns Response for OPTIONS requests, null otherwise
 */
export function handleCors(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        ...corsHeaders,
        ...securityHeaders,
      },
    })
  }
  return null
}

// ============================================================================
// Request Validation Helpers
// ============================================================================

/**
 * Safely parses JSON from request body.
 *
 * @param req - Incoming request
 * @returns Parsed JSON object
 * @throws Error if JSON is invalid
 */
export async function parseJsonBody<T>(req: Request): Promise<T> {
  try {
    const text = await req.text()

    // Check for empty body
    if (!text || text.trim() === '') {
      throw new Error('Request body is empty')
    }

    // Limit body size (1MB)
    if (text.length > 1024 * 1024) {
      throw new Error('Request body too large')
    }

    return JSON.parse(text) as T
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON in request body')
    }
    throw error
  }
}

/**
 * Validates that a value is a valid UUID.
 *
 * @param value - Value to validate
 * @returns True if valid UUID
 */
export function isValidUUID(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(value)
}

/**
 * Validates required fields in an object.
 *
 * @param obj - Object to validate
 * @param fields - Array of required field names
 * @throws Error if any required field is missing
 */
export function validateRequired(
  obj: Record<string, unknown>,
  fields: string[]
) {
  for (const field of fields) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
      throw new Error(`Missing required field: ${field}`)
    }
  }
}

// ============================================================================
// Rate Limiting Helpers (for future implementation)
// ============================================================================

/**
 * Returns rate limit headers.
 * TODO: Implement actual rate limiting with Redis or similar.
 *
 * @param limit - Max requests per window
 * @param remaining - Remaining requests
 * @param reset - Time until reset (seconds)
 * @returns Headers object
 */
export function rateLimitHeaders(
  limit: number,
  remaining: number,
  reset: number
): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(Math.max(0, remaining)),
    'X-RateLimit-Reset': String(reset),
  }
}
