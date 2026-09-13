export function publicUser(user) {
  if (!user) return null
  const { passwordHash, ...rest } = user
  return rest
}

export function publicOrg(org) {
  if (!org) return null
  return { id: org.id, name: org.name, slug: org.slug, brandColor: org.brandColor }
}
