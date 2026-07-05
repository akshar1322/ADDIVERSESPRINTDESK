import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPrisma } from "@/lib/prisma";

export default async function AdminClientsPage() {
  const clients = await getPrisma().customer.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    take: 50,
    select: { id: true, name: true, company: true, phone: true, whatsapp: true, address: true },
  });

  return (
    <main className="flex-1 space-y-6 p-4 md:p-6">
      <section>
        <p className="text-sm font-medium text-blue-600">Clients</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Client directory</h1>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Client list</CardTitle>
          <CardDescription>Current customer records in the database.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.company ?? "-"}</TableCell>
                  <TableCell>{client.phone ?? "-"}</TableCell>
                  <TableCell>{client.whatsapp ?? "-"}</TableCell>
                  <TableCell>{client.address ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
