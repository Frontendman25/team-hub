export function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return slug.length > 0 ? slug : 'workspace'
}

export function uniqueSlug(base: string): string {
  const suffix = Math.random().toString(36).slice(2, 6)
  return `${base.slice(0, 55)}-${suffix}`
}
