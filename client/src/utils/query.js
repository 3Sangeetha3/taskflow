// Drops undefined / null / '' so they are never sent as query params.
export const compactParams = (params) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''))
