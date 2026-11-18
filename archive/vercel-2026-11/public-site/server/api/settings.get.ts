export default defineEventHandler(async () => {
  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  return {
    siteTitle: settings?.siteTitle ?? "MachNotes",
    siteDescription: settings?.siteDescription ?? "Notes on aerospace engineering.",
  };
});
