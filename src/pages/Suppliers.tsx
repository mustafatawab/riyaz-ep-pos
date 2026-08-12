import { useState } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Truck, Phone, Package, Search, Pencil, Trash2, Download, LayoutGrid, List } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { downloadCSV, downloadPDF } from "@/lib/export";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import type { Supplier } from "@/types";

export default function Suppliers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", second_number: "" });
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: suppliers = [], isLoading } = useQuery({ queryKey: ["suppliers"], queryFn: api.suppliers.list });

  const filtered = suppliers.filter((s: Supplier) =>
    !search
    || s.name.toLowerCase().includes(search.toLowerCase())
    || s.phone.includes(search)
    || (s.second_number || "").includes(search)
  );

  const createMutation = useMutation({
    mutationFn: () => api.suppliers.create(form),
    onSuccess: () => {
      toast.success("Supplier created");
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setOpen(false);
      setForm({ name: "", phone: "", address: "", second_number: "" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: () => api.suppliers.update(editingId!, form),
    onSuccess: () => {
      toast.success("Supplier updated");
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setOpen(false);
      setEditingId(null);
      setForm({ name: "", phone: "", address: "", second_number: "" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.suppliers.delete(id),
    onSuccess: () => {
      toast.success("Supplier deleted");
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setDeleteId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setDeleteId(null);
    },
  });

  function openAdd() {
    setEditingId(null);
    setForm({ name: "", phone: "", address: "", second_number: "" });
    setOpen(true);
  }

  function openEdit(s: Supplier) {
    setEditingId(s.id);
    setForm({ name: s.name, phone: s.phone, address: s.address || "", second_number: s.second_number || "" });
    setOpen(true);
  }

  return (
    <div>
      <PageHeader title="Suppliers" description="Manage product suppliers" action={{ label: "Add Supplier", onClick: openAdd }} />
      <div className="flex items-center gap-2 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <Input placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant="outline" size="sm" onClick={() => downloadCSV(`suppliers_${new Date().toISOString().split("T")[0]}.csv`, ["Name","Contact","Contact #2","Address","Stock Entries"], filtered.map((s: Supplier) => [s.name, s.phone, s.second_number || "", s.address, s.stock_count || 0]))}>
          <Download className="h-4 w-4 mr-1" /> CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => downloadPDF(`suppliers_${new Date().toISOString().split("T")[0]}.pdf`, "Suppliers List", ["Name","Contact","Contact #2","Address","Stock Entries"], filtered.map((s: Supplier) => [s.name, s.phone, s.second_number || "", s.address, s.stock_count || 0]))}>
          <Download className="h-4 w-4 mr-1" /> PDF
        </Button>
        <div className="flex items-center border border-border rounded-lg overflow-hidden">
          <button onClick={() => setViewMode("grid")} className={cn("p-2 transition-colors", viewMode === "grid" ? "bg-accent text-white" : "text-text-secondary hover:bg-surface-2")}>
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button onClick={() => setViewMode("list")} className={cn("p-2 transition-colors", viewMode === "list" ? "bg-accent text-white" : "text-text-secondary hover:bg-surface-2")}>
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {viewMode === "list" ? (
        <div className="rounded-xl border border-border">
          <DataTable
            columns={[
              { key: "name", header: "Name", cell: (s: Supplier) => <span className="font-medium text-text-primary">{s.name}</span> },
              { key: "phone", header: "Contact", cell: (s: Supplier) => <span className="font-mono text-[11px]">{s.phone}</span> },
              { key: "second_number", header: "Contact #2", cell: (s: Supplier) => <span className="font-mono text-[11px] text-text-secondary">{s.second_number || "\u2014"}</span> },
              { key: "stock_count", header: "Stock", cell: (s: Supplier) => <span className="font-mono">{s.stock_count ?? 0}</span> },
              {
                key: "actions", header: "", cell: (s: Supplier) => (
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openEdit(s)} className="h-7 w-7 rounded-md flex items-center justify-center text-text-secondary hover:text-accent hover:bg-accent/5 transition-colors" title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setDeleteId(s.id)} className="h-7 w-7 rounded-md flex items-center justify-center text-text-secondary hover:text-danger hover:bg-danger/5 transition-colors" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ),
              },
            ]}
            data={filtered}
            loading={isLoading}
            keyExtractor={(s: Supplier) => s.id}
            emptyMessage="No suppliers found"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          ) : filtered.length === 0 ? (
            <div className="col-span-full text-center py-12 text-sm text-text-secondary">No suppliers found</div>
          ) : (
            filtered.map((supplier: Supplier) => (
              <Card key={supplier.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                        <Truck className="h-5 w-5 text-accent" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-text-primary truncate">{supplier.name}</h3>
                        <div className="space-y-1 mt-2">
                          <div className="flex items-center gap-1 text-xs text-text-secondary"><Phone className="h-3 w-3 shrink-0" />{supplier.phone || "—"}</div>
                          {supplier.second_number && <div className="flex items-center gap-1 text-xs text-text-secondary"><Phone className="h-3 w-3 shrink-0" />{supplier.second_number}</div>}
                          <div className="flex items-center gap-1 text-xs text-text-secondary"><Package className="h-3 w-3 shrink-0" />{supplier.stock_count ?? 0} stock entries</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEdit(supplier)} className="h-7 w-7 rounded-md flex items-center justify-center text-text-secondary hover:text-accent hover:bg-accent/5 transition-colors" title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteId(supplier.id)} className="h-7 w-7 rounded-md flex items-center justify-center text-text-secondary hover:text-danger hover:bg-danger/5 transition-colors" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { if (!v) { setEditingId(null); } setOpen(v); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
          </DialogHeader>
          <div className="px-5 pb-5 space-y-3">
            <div>
              <Label>Supplier Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Contact Number</Label>
                <Input inputMode="numeric" pattern="[0-9]*" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 11) })} />
              </div>
              <div>
                <Label>Contact #2</Label>
                <Input inputMode="numeric" pattern="[0-9]*" value={form.second_number} onChange={(e) => setForm({ ...form, second_number: e.target.value.replace(/\D/g, "").slice(0, 11) })} />
              </div>
            </div>
            <div>
              <Label>Address (optional)</Label>
              <textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                rows={3}
                className="flex w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>
            <Button
              className="w-full"
              disabled={!form.name || createMutation.isPending || updateMutation.isPending}
              onClick={() => editingId ? updateMutation.mutate() : createMutation.mutate()}
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingId ? "Update Supplier" : "Add Supplier"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(v) => { if (!v) setDeleteId(null); }}
        title="Delete Supplier"
        description="Are you sure you want to delete this supplier? This cannot be undone if they have no active stock entries."
        confirmLabel="Delete"
        onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId); }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
