export const resolveStoreSlugFromLocation = (pathname = "", searchParams) => {
  const directMatch = String(pathname || "").match(/^\/store\/([^/]+)/i);
  if (directMatch?.[1]) return decodeURIComponent(directMatch[1]);
  return searchParams?.get("store") || "";
};

export const withStoreQuery = (path, storeSlug = "") => {
  if (!storeSlug) return path;
  const [base, query = ""] = String(path).split("?");
  const params = new URLSearchParams(query);
  params.set("store", storeSlug);
  const nextQuery = params.toString();
  return `${base}${nextQuery ? `?${nextQuery}` : ""}`;
};

