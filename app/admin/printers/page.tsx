import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPrisma } from "@/lib/prisma";

export default async function AdminPrintersPage() {
  const printers = await getPrisma().printer.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    take: 50,
    select: { id: true, name: true, model: true, status: true, machineNumber: true, location: true, isActive: true },
  });

  return (
    <main className="flex-1 space-y-6 p-4 md:p-6">
      <section>
        <p className="text-sm font-medium text-blue-600">Printers</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Machine inventory</h1>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Printer list</CardTitle>
          <CardDescription>Active and inactive machines.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Machine #</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {printers.map((printer) => (
                <TableRow key={printer.id}>
                  <TableCell className="font-medium">{printer.name}</TableCell>
                  <TableCell>{printer.model}</TableCell>
                  <TableCell>{printer.machineNumber ?? "-"}</TableCell>
                  <TableCell>{printer.status}</TableCell>
                  <TableCell>{printer.location ?? "-"}</TableCell>
                  <TableCell>{printer.isActive ? "Yes" : "No"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
