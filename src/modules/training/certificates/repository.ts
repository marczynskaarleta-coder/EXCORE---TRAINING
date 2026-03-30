import { createClient } from '@/lib/shared/supabase/server'
import type { Certificate } from './types'

export async function findCertificateByEnrollment(enrollmentId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('certificates')
    .select('id')
    .eq('enrollment_id', enrollmentId)
    .single()

  return data
}

export async function insertCertificate(input: {
  enrollment_id: string
  product_id: string
  member_id: string
  workspace_id: string
  certificate_number: string
}) {
  const supabase = await createClient()

  return supabase
    .from('certificates')
    .insert(input)
    .select()
    .single()
}

export async function findCertificatesByMember(memberId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('certificates')
    .select(`
      *,
      products (title, type, cover_image_url),
      member:workspace_members!member_id (display_name)
    `)
    .eq('member_id', memberId)
    .order('issued_at', { ascending: false })

  return data || []
}

export async function findCertificateByNumber(certificateNumber: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('certificates')
    .select(`
      *,
      products (title, type),
      member:workspace_members!member_id (display_name),
      workspace:workspaces!workspace_id (name)
    `)
    .eq('certificate_number', certificateNumber)
    .single()

  return data
}

export async function findCertificatesByProduct(productId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('certificates')
    .select(`
      *,
      member:workspace_members!member_id (display_name, avatar_url)
    `)
    .eq('product_id', productId)
    .order('issued_at', { ascending: false })

  return data || []
}
