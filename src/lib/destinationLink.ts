export function destinationLink(id: string, cityId?: number): string {
  const url = new URL(window.location.href);
  url.hash = "explore";
  url.searchParams.set("destination", id);
  if (cityId) url.searchParams.set("city", String(cityId));
  return url.toString();
}

export async function shareDestination(id: string, name: string): Promise<string> {
  const url = destinationLink(id);
  if (navigator.share) {
    try { await navigator.share({ title: name, url }); return "Tautan dibagikan."; }
    catch (error) { if (error instanceof DOMException && error.name === "AbortError") return ""; throw error; }
  }
  await navigator.clipboard.writeText(url);
  return "Tautan destinasi disalin.";
}
