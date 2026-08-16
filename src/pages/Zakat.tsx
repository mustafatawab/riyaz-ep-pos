import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { HandCoins, Calculator, Download, Trash2, RefreshCw } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import { downloadCSV, downloadPDF } from "@/lib/export";
import type { ZakatCalculation, ZakatSettingsInput } from "@/types";

export default function Zakat() {
  const queryClient = useQueryClient();
  const todayStr = new Date().toISOString().split("T")[0];

  const { data: settings, isFetching: settingsLoading } = useQuery({
    queryKey: ["zakat-settings"],
    queryFn: api.zakat.settings,
  });

  const [settingsForm, setSettingsForm] = useState<ZakatSettingsInput>({});
  useEffect(() => {
    if (settings) {
      setSettingsForm({
        goldRate: settings.goldRate,
        silverRate: settings.silverRate,
        nisabBasis: settings.nisabBasis,
        inventoryValue: settings.inventoryValue,
        deductLiabilities: settings.deductLiabilities,
        zakatRate: settings.zakatRate,
      });
    }
  }, [settings]);

  const [snapshot, setSnapshot] = useState({
    snapshotDate: todayStr,
    hawlStartDate: "",
    cashInHand: "",
    otherReceivables: "",
    otherAssets: "",
    liabilities: "",
    deductLiabilities: true,
  });

  const inventoryBasis = settingsForm.inventoryValue || settings?.inventoryValue;
  const { data: preview, refetch: refetchPreview, isFetching: previewLoading } = useQuery({
    queryKey: ["zakat-preview", inventoryBasis],
    queryFn: () => api.zakat.preview({ inventoryValue: inventoryBasis }),
    enabled: !!inventoryBasis,
  });

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ["zakat-history"],
    queryFn: api.zakat.list,
  });

  const saveSettingsMutation = useMutation({
    mutationFn: () => api.zakat.saveSettings(settingsForm),
    onSuccess: () => {
      toast.success("Zakat settings saved");
      queryClient.invalidateQueries({ queryKey: ["zakat-settings"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      api.zakat.calculate({
        snapshotDate: snapshot.snapshotDate,
        hawlStartDate: snapshot.hawlStartDate,
        inventoryValue: preview?.inventoryValue ?? 0,
        receivables: preview?.receivablesTotal ?? 0,
        cashInHand: Number(snapshot.cashInHand) || 0,
        otherReceivables: Number(snapshot.otherReceivables) || 0,
        otherAssets: Number(snapshot.otherAssets) || 0,
        liabilities: Number(snapshot.liabilities) || 0,
        deductLiabilities: snapshot.deductLiabilities,
        items: [
          ...(preview?.inventoryItems ?? []).map((i) => ({
            name: i.name,
            barcode: i.barcode,
            quantity: i.quantity,
            unitValue: i.unitValue,
            value: i.value,
          })),
          ...(preview?.receivables ?? []).map((r) => ({
            name: r.customerName ?? "—",
            value: r.value,
          })),
        ],
      }),
    onSuccess: () => {
      toast.success("Zakat calculation saved to history");
      queryClient.invalidateQueries({ queryKey: ["zakat-history"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.zakat.delete(id),
    onSuccess: () => {
      toast.success("Calculation deleted");
      queryClient.invalidateQueries({ queryKey: ["zakat-history"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const inventoryValue = preview?.inventoryValue ?? 0;
  const receivablesTotal = preview?.receivablesTotal ?? 0;
  const cashInHand = Number(snapshot.cashInHand) || 0;
  const otherReceivables = Number(snapshot.otherReceivables) || 0;
  const otherAssets = Number(snapshot.otherAssets) || 0;
  const liabilities = Number(snapshot.liabilities) || 0;

  const grossAssets = inventoryValue + receivablesTotal + cashInHand + otherReceivables + otherAssets;
  const totalLiabilities = snapshot.deductLiabilities ? liabilities : 0;
  const netZakatable = Math.max(0, grossAssets - totalLiabilities);
  const nisabAmount = settings?.nisabAmount ?? 0;
  const nisabMet = nisabAmount > 0 && netZakatable >= nisabAmount;
  const zakatDue = nisabMet ? netZakatable * (settings?.zakatRate ?? 0.025) : 0;

  const resultRows = [
    { label: "Inventory (stock)", value: inventoryValue, source: preview ? `Auto · ${preview.inventoryItems.length} products` : "—" },
    { label: "Receivables (arrears)", value: receivablesTotal, source: preview ? `Auto · ${preview.receivables.length} customers` : "—" },
    { label: "Cash in hand / bank", value: cashInHand, source: "Manual" },
    { label: "Other receivables", value: otherReceivables, source: "Manual" },
    { label: "Other assets", value: otherAssets, source: "Manual" },
  ];

  const columns = [
    {
      key: "snapshot_date",
      header: "Snapshot Date",
      cell: (c: ZakatCalculation) => <span className="font-mono text-xs text-text-secondary">{c.snapshot_date}</span>,
    },
    { key: "gross_assets", header: "Gross Assets", cell: (c: ZakatCalculation) => <span className="font-mono">{formatCurrency(c.gross_assets)}</span> },
    { key: "total_liabilities", header: "Liabilities", cell: (c: ZakatCalculation) => <span className="font-mono text-text-secondary">{formatCurrency(c.total_liabilities)}</span> },
    { key: "net_zakatable", header: "Net", cell: (c: ZakatCalculation) => <span className="font-mono font-medium">{formatCurrency(c.net_zakatable)}</span> },
    {
      key: "nisab_met",
      header: "Nisab",
      cell: (c: ZakatCalculation) => (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.nisab_met ? "bg-gold-subtle text-gold" : "bg-surface-2 text-text-secondary"}`}>
          {c.nisab_met ? "Met" : "Below"}
        </span>
      ),
    },
    { key: "zakat_due", header: "Zakat Due", cell: (c: ZakatCalculation) => <span className="font-mono font-bold text-accent">{formatCurrency(c.zakat_due)}</span> },
    {
      key: "actions",
      header: "",
      cell: (c: ZakatCalculation) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={() => downloadCSV(`zakat_${c.snapshot_date}.csv`, ["Component", "Value"], [
              ["Snapshot Date", c.snapshot_date],
              ["Gross Assets", c.gross_assets],
              ["Liabilities", c.total_liabilities],
              ["Net Zakatable", c.net_zakatable],
              ["Nisab Amount", c.nisab_amount],
              ["Nisab Met", c.nisab_met ? "Yes" : "No"],
              ["Zakat Due (2.5%)", c.zakat_due],
            ])}
            className="h-7 w-7 rounded-md flex items-center justify-center text-text-secondary hover:text-accent hover:bg-accent/5 transition-colors"
            title="Export CSV"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => deleteMutation.mutate(c.id)}
            className="h-7 w-7 rounded-md flex items-center justify-center text-text-secondary hover:text-danger hover:bg-danger/5 transition-colors"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Zakat Calculator" description="Zakat al-mal on business assets (2.5% of net zakatable wealth above nisab)" />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Left: settings + inputs */}
        <div className="xl:col-span-1 space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2"><HandCoins className="h-4 w-4 text-gold" /> Rates & Nisab</CardTitle>
              <CardDescription>Set the market rates to compute the nisab threshold</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Gold rate / gram</Label>
                  <Input type="number" min="0" step="0.01" value={settingsForm.goldRate ?? ""} onChange={(e) => setSettingsForm({ ...settingsForm, goldRate: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Silver rate / gram</Label>
                  <Input type="number" min="0" step="0.01" value={settingsForm.silverRate ?? ""} onChange={(e) => setSettingsForm({ ...settingsForm, silverRate: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <Label>Nisab basis</Label>
                <Select value={settingsForm.nisabBasis} onValueChange={(v) => setSettingsForm({ ...settingsForm, nisabBasis: v as "silver" | "gold" | "lowest" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="silver">Silver (612.36 g · most conservative)</SelectItem>
                    <SelectItem value="gold">Gold (87.48 g)</SelectItem>
                    <SelectItem value="lowest">Lowest of gold / silver</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Inventory valuation</Label>
                <Select value={settingsForm.inventoryValue} onValueChange={(v) => setSettingsForm({ ...settingsForm, inventoryValue: v as "retail" | "cost" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail">Current retail value (sale price)</SelectItem>
                    <SelectItem value="cost">Cost value (purchase price)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Zakat rate (%)</Label>
                  <Input type="number" min="0" step="0.1" value={settingsForm.zakatRate ? settingsForm.zakatRate * 100 : ""} onChange={(e) => setSettingsForm({ ...settingsForm, zakatRate: Number(e.target.value) / 100 })} />
                </div>
                <div className="flex items-end">
                  <Button variant="outline" size="sm" className="w-full gap-1.5" disabled={settingsLoading || saveSettingsMutation.isPending} onClick={() => saveSettingsMutation.mutate()}>
                    <RefreshCw className="h-3.5 w-3.5" /> {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </div>
              {nisabAmount > 0 ? (
                <p className="text-[11px] text-text-secondary bg-surface-2 rounded-md px-3 py-2">
                  Nisab: <span className="font-mono font-medium text-text-primary">{formatCurrency(nisabAmount)}</span>
                  {settingsForm.nisabBasis === "gold"
                    ? " (87.48 g gold)" : settingsForm.nisabBasis === "lowest"
                      ? " (whichever is lower)" : " (612.36 g silver)"}
                </p>
              ) : (
                <p className="text-[11px] text-danger bg-danger/5 rounded-md px-3 py-2">
                  Enter gold &amp; silver rates to compute the nisab threshold.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2"><Calculator className="h-4 w-4 text-gold" /> Asset Snapshot</CardTitle>
              <CardDescription>Auto-pulled from your stock &amp; arrears, add manual amounts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Snapshot date</Label>
                  <Input type="date" value={snapshot.snapshotDate} onChange={(e) => setSnapshot({ ...snapshot, snapshotDate: e.target.value })} />
                </div>
                <div>
                  <Label>Hawl start (optional)</Label>
                  <Input type="date" value={snapshot.hawlStartDate} onChange={(e) => setSnapshot({ ...snapshot, hawlStartDate: e.target.value })} />
                </div>
              </div>
              <div className="rounded-lg border border-border divide-y divide-border">
                {resultRows.map((r) => (
                  <div key={r.label} className="flex items-center justify-between px-3 py-2">
                    <div>
                      <p className="text-xs font-medium text-text-primary">{r.label}</p>
                      <p className="text-[10px] text-text-secondary">{r.source}</p>
                    </div>
                    <p className="font-mono text-sm font-medium text-text-primary">{formatCurrency(r.value)}</p>
                  </div>
                ))}
              </div>
              <div>
                <Label>Cash in hand / bank</Label>
                <Input type="number" min="0" step="0.01" value={snapshot.cashInHand} onChange={(e) => setSnapshot({ ...snapshot, cashInHand: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Other receivables</Label>
                  <Input type="number" min="0" step="0.01" value={snapshot.otherReceivables} onChange={(e) => setSnapshot({ ...snapshot, otherReceivables: e.target.value })} />
                </div>
                <div>
                  <Label>Other assets</Label>
                  <Input type="number" min="0" step="0.01" value={snapshot.otherAssets} onChange={(e) => setSnapshot({ ...snapshot, otherAssets: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Liabilities (due)</Label>
                <Input type="number" min="0" step="0.01" value={snapshot.liabilities} onChange={(e) => setSnapshot({ ...snapshot, liabilities: e.target.value })} />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSnapshot({ ...snapshot, deductLiabilities: !snapshot.deductLiabilities })}
                  className={`relative h-5 w-9 rounded-full transition-colors ${snapshot.deductLiabilities ? "bg-accent" : "bg-surface-2"}`}
                  aria-pressed={snapshot.deductLiabilities}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${snapshot.deductLiabilities ? "left-[18px]" : "left-0.5"}`} />
                </button>
                <span className="text-xs text-text-secondary">Deduct liabilities before zakat</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => refetchPreview()} disabled={previewLoading}>
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh auto-data
                </Button>
                <Button size="sm" className="gap-1.5 flex-1" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || settingsLoading}>
                  {saveMutation.isPending ? "Saving..." : "Save Calculation"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: result + history */}
        <div className="xl:col-span-2 space-y-5">
          <Card withEdge={nisabMet}>
            <CardHeader className="pb-3">
              <CardTitle>Zakat Due on {snapshot.snapshotDate || "Snapshot"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="rounded-lg bg-surface-2 p-3">
                  <p className="text-[10px] text-text-secondary uppercase tracking-wide">Gross Assets</p>
                  <p className="text-lg font-semibold font-mono">{formatCurrency(grossAssets)}</p>
                </div>
                <div className="rounded-lg bg-surface-2 p-3">
                  <p className="text-[10px] text-text-secondary uppercase tracking-wide">Liabilities</p>
                  <p className="text-lg font-semibold font-mono">{formatCurrency(totalLiabilities)}</p>
                </div>
                <div className="rounded-lg bg-surface-2 p-3">
                  <p className="text-[10px] text-text-secondary uppercase tracking-wide">Net Zakatable</p>
                  <p className="text-lg font-semibold font-mono">{formatCurrency(netZakatable)}</p>
                </div>
                <div className="rounded-lg bg-surface-2 p-3">
                  <p className="text-[10px] text-text-secondary uppercase tracking-wide">Nisab ({settings?.nisabBasis ?? "silver"})</p>
                  <p className="text-lg font-semibold font-mono">{formatCurrency(nisabAmount)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl px-4 py-3 border border-border">
                <div>
                  <p className="text-xs text-text-secondary">ZAKAT DUE · {settings?.zakatRate ? (settings.zakatRate * 100).toFixed(1) : "2.5"}% of net</p>
                  <p className="text-[10px] text-text-secondary">{nisabMet ? `Nisab met — rate applies to the full net (${formatCurrency(netZakatable)})` : `Below nisab (${formatCurrency(nisabAmount)}) — no zakat due this year`}</p>
                </div>
                <p className={`text-3xl font-bold font-mono tabular-nums ${nisabMet ? "text-accent" : "text-text-secondary"}`}>{formatCurrency(zakatDue)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Calculation History</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => downloadCSV(`zakat_history.csv`, ["Snapshot Date", "Gross Assets", "Liabilities", "Net", "Nisab Amount", "Nisab Met", "Zakat Due"], history.map((c) => [c.snapshot_date, c.gross_assets, c.total_liabilities, c.net_zakatable, c.nisab_amount, c.nisab_met ? "Yes" : "No", c.zakat_due]))}>
                    <Download className="h-3.5 w-3.5" /> CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => downloadPDF(`zakat_history.pdf`, "Zakat Calculation History", ["Snapshot Date", "Gross Assets", "Liabilities", "Net", "Nisab Amount", "Nisab Met", "Zakat Due"], history.map((c) => [c.snapshot_date, c.gross_assets, c.total_liabilities, c.net_zakatable, c.nisab_amount, c.nisab_met ? "Yes" : "No", c.zakat_due]))}>
                    <Download className="h-3.5 w-3.5" /> PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0 overflow-x-auto">
              <DataTable columns={columns} data={history} loading={historyLoading} keyExtractor={(c) => c.id} emptyMessage="No calculations saved yet" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}