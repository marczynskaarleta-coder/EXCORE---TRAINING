'use server'

import { createResourceSchema } from './schemas'
import {
  findResources,
  findResourceById,
  insertResource,
  incrementDownloadCount,
} from './repository'

export async function getResources(workspaceId: string) {
  return findResources(workspaceId)
}

export async function getResource(resourceId: string) {
  return findResourceById(resourceId)
}

export async function createResource(workspaceId: string, input: Record<string, unknown>) {
  const parsed = createResourceSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { data, error } = await insertResource(workspaceId, parsed.data)
  if (error) return { error: error.message }
  return { data }
}

export async function incrementDownload(resourceId: string) {
  await incrementDownloadCount(resourceId)
}

