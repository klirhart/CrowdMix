/** Shared id builders so a tab and its panel can reference each other. */
export function tabId(idBase: string, value: string): string {
  return `${idBase}-tab-${value}`
}

export function tabPanelId(idBase: string, value: string): string {
  return `${idBase}-panel-${value}`
}
