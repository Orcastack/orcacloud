export async function fetchMarketplaceApps() {
  const res = await fetch('/api/integrations/marketplace/')
  return await res.json()
}

export async function installApp(slug) {
  const res = await fetch(`/api/integrations/marketplace/${slug}/install/`, { method: 'POST' })
  return await res.json()
}

export async function uninstallApp(slug) {
  const res = await fetch(`/api/integrations/marketplace/${slug}/uninstall/`, { method: 'POST' })
  return await res.json()
}
