'use server'

import { issueCertificateSchema } from './schemas'
import {
  findCertificateByEnrollment,
  insertCertificate,
  findCertificatesByMember,
  findCertificateByNumber,
  findCertificatesByProduct,
} from './repository'

function generateCertificateNumber(): string {
  const prefix = 'EXT'
  const year = new Date().getFullYear()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}-${year}-${random}`
}

export async function issueCertificate(input: {
  enrollment_id: string
  product_id: string
  member_id: string
  workspace_id: string
}) {
  const parsed = issueCertificateSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Check if already issued
  const existing = await findCertificateByEnrollment(parsed.data.enrollment_id)

  if (existing) {
    return { error: 'Certyfikat juz zostal wydany' }
  }

  const { data, error } = await insertCertificate({
    ...parsed.data,
    certificate_number: generateCertificateNumber(),
  })

  if (error) return { error: error.message }
  return { data }
}

export async function getMyCertificates(memberId: string) {
  return findCertificatesByMember(memberId)
}

export async function verifyCertificate(certificateNumber: string) {
  return findCertificateByNumber(certificateNumber)
}

export async function getCertificatesByProduct(productId: string) {
  return findCertificatesByProduct(productId)
}

