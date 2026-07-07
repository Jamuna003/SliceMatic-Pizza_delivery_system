import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: "Method not allowed. Use POST." }), 
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { staff_name, new_password } = await req.json()

    if (!staff_name || !new_password) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: staff_name and new_password are required." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const trimmedStaffName = staff_name.trim()

    if (new_password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters long." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase Admin Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Edge function credentials not configured on the host server." }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })

    // 1. Look up synthetic_email from staff_accounts
    let staff = null
    let queryError = null

    // Attempt exact match first
    const { data: exactStaff, error: exactErr } = await supabaseAdmin
      .from('staff_accounts')
      .select('synthetic_email, staff_name')
      .ilike('staff_name', trimmedStaffName)
      .maybeSingle()

    if (exactStaff) {
      staff = exactStaff
    } else if (!exactErr) {
      // Fallback: Fetch all staff accounts and perform robust trimmed, case-insensitive comparison in-memory
      const { data: allStaff, error: allErr } = await supabaseAdmin
        .from('staff_accounts')
        .select('synthetic_email, staff_name')
      
      if (allErr) {
        queryError = allErr
      } else if (allStaff) {
        staff = allStaff.find(
          (s: any) => (s.staff_name || '').trim().toLowerCase() === trimmedStaffName.toLowerCase()
        ) || null
      }
    } else {
      queryError = exactErr
    }

    if (queryError) {
      return new Response(
        JSON.stringify({ error: `Database error querying staff_accounts: ${queryError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!staff || !staff.synthetic_email) {
      return new Response(
        JSON.stringify({ error: "No staff account found with that name." }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const email = staff.synthetic_email

    // 2. Find the userId in Auth by listing users or looking them up
    const { data: usersResponse, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) {
      return new Response(
        JSON.stringify({ error: `Failed to retrieve Auth user directory: ${listError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const emailLocalPart = email.split('@')[0].toLowerCase()
    const user = usersResponse.users.find((u: any) => {
      const uEmail = (u.email || '').toLowerCase()
      const uLocalPart = uEmail.split('@')[0]
      return uLocalPart === emailLocalPart && (uEmail.endsWith('@slicematic.staff') || uEmail.endsWith('@slicematic-staff.com'))
    })

    if (!user) {
      return new Response(
        JSON.stringify({ error: `Registered email '${email}' not found in Supabase Auth user database.` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Update the password using Supabase Admin Auth API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: new_password }
    )

    if (updateError) {
      return new Response(
        JSON.stringify({ error: `Supabase password update failed: ${updateError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully reset password for staff member '${staff.staff_name}' (associated with ${email}).` 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "An unexpected internal server error occurred." }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
