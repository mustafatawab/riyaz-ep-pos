import { BrowserWindow, app } from "electron";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const jsBarcodeSource = (() => {
  try {
    return fs.readFileSync(path.join(__dirname, "vendor", "JsBarcode.all.min.js"), "utf-8");
  } catch {
    return "";
  }
})();


function generateSaleReceiptHTML(sale) {
  const items = sale.items || [];

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const timeStr = now.toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const subtotal = sale.subtotal || 0;
  const totalAmount = sale.total || 0;
  const discount = sale.discount || 0;
  const gst = sale.gst || 0;
  const paid = sale.amount_paid || 0;
  const balance = Math.max(0, totalAmount - paid);
  const arrears = sale.arrears || 0;
  const totalPayable = totalAmount + arrears;

  const itemsHTML = items
    .map((item) => {
      const unitPrice = item.unit_price || item.subtotal / item.quantity;

      return `
      <tr>
          <td>${item.product_name}</td>
          <td>${item.quantity}</td>
          <td>${unitPrice}</td>
          <td class="right">${item.subtotal}</td>
      </tr>
      `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">

<style>

@page{
    size:75mm auto;
    margin:0;
    display:flex,
    justify-content: center,
}

*{
    box-sizing:border-box;
}

body{
    width:70mm;
    margin:5;
    padding:5;
    font-family:Arial,sans-serif;
    font-size:12px;
    color:#000;
}

.center{
    text-align:center;
}

.bold{
    font-weight:550;
}

.right{
    text-align:start;
}

.header h1{
    margin:0;
    font-size:18px;
}

.header p{
    margin:2px 0;
    font-size:11px;
}

.info{
    margin-top:8px;
    line-height:1.1;
}

.divider{
    border-top:1.5px dashed #000;
    margin:6px 0;
}

table{
    width:100%;
    border-collapse:collapse;
}

th{
    text-align:left;
    border-bottom:1.5px dashed #000;
    padding-bottom:3px;
    font-size:12px;
}

td{
    padding:2px 0;
    font-size:12px;
    vertical-align:top;
    text-center: start,
}

.totals-container{
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
    margin-top:6px;
    gap:5px;
}

.urdu-notes{
    width:54%;
    direction:rtl;
    font-size:10px;
    line-height:1.2;
    padding:3px
}

.calculation{
    width:46%;
    font-size:11px;
}

.calc-row{
    display:flex;
    justify-content:space-between;
    margin-bottom:2px;
}

.total-payable{
    border-top:1px solid #000;
    border-bottom:1px solid #000;
    padding:3px 0;
    font-weight:bold;
    margin:4px 0;
}

.footer{
    margin-top:8px;
    font-size:9px;
}

</style>

</head>

<body>

<div class="header center">
    <h1>RIYAZ ENTERPRISE</h1>
    <p>Beside Luqman Clinical Laboratory Barikot, Swat</p>
    <p>Phone: 0346-9383792 | 0344-9006940</p>
</div>

<div class="info">
    <div><span class="bold">Invoice #: ${sale.id ?? ""}</span></div>
    <div><span class="bold">Date: ${dateStr} ${timeStr}</span></div>
    <div><span class="bold">Customer Name: ${
      sale.customer_name || "Walk-in Customer"
    }</span></div>
    <div><span class="bold">No. of Items : ${items.length}</span> </div>
</div>

<div class="divider"></div>

<table>

<thead>

<tr>
<th width="55%">Product Name</th>
<th width="10%">Qty</th>
<th width="20%">Price</th>
<th width="15%" class="right">Amount</th>
</tr>

</thead>

<tbody>

${itemsHTML}

</tbody>

</table>

<div class="divider"></div>

<div class="totals-container">

<div class="urdu-notes">

<div class="bold">ضروری نوٹ</div>

<div>- رسید کے بغیر کوئی واپسی نہیں</div>

<div>- فریج کی دواؤں کی کوئی واپسی نہیں</div>

<div>- دواؤں کی 3 دن بعد کوئی واپسی نہیں</div>

</div>

<div class="calculation">

<div class="calc-row">
<span>Total Amount:</span>
<span>${subtotal}</span>
</div>

<div class="calc-row">
<span>Discount:</span>
<span>${discount}</span>
</div>

<div class="calc-row">
<span>GST (0%):</span>
<span>${gst}</span>
</div>

<div class="calc-row">
<span>Arrears:</span>
<span>${arrears}</span>
</div>

<div class="total-payable calc-row">
<span>Total Payable:</span>
<span>${totalPayable}</span>
</div>

<div class="calc-row">
<span>Amount Paid:</span>
<span>${paid}</span>
</div>

<div class="calc-row">
<span>Balance:</span>
<span>${balance}</span>
</div>

</div>

</div>

<div class="divider"></div>

<div class="footer center">

Developed by www.farsightsystem.com 

</div>

<div class="divider"></div>

</body>

</html>
`;
}



function generateA4InvoiceHTML(sale) {
  const items = sale.items || [];
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const totalQty = items.reduce((s, i) => s + (i.quantity || 0), 0);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
@page { margin: 12mm; size: A4; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  font-size: 11px; color: #1a1a1a; line-height: 1.5;
}
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; border-bottom: 3px solid #7F1D3A; padding-bottom: 14px; }
.header-left { display: flex; align-items: center; gap: 10px; }
.header-logo { display: inline-flex; align-items: center; justify-content: center; height: 44px; padding: 0 10px; border-radius: 8px; background: #7F1D3A; color: #fff; font-size: 12px; font-weight: 800; letter-spacing: 0.02em; }
.header h1 { font-size: 24px; letter-spacing: 1px; color: #7F1D3A; font-weight: 800; margin: 0; }
.header p { font-size: 11px; color: #666; margin-top: 2px; }
.header .addr { font-size: 10px; color: #888; margin-top: 1px; }
.header-right { text-align: right; }
.header-right .inv-label { font-size: 16px; font-weight: 800; color: #7F1D3A; letter-spacing: 1px; }
.header-right .inv-id { font-size: 9px; color: #fff; background: #7F1D3A; padding: 3px 8px; border-radius: 3px; margin-top: 3px; display: inline-block; }
.info { display: flex; justify-content: space-between; margin-bottom: 14px; background: #f9fafb; padding: 10px 14px; border-radius: 5px; }
.info div { font-size: 10.5px; }
.info .lbl { color: #9ca3af; font-weight: 600; }
table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
thead th {
  background: #7F1D3A; color: #fff; text-align: left; padding: 7px 8px;
  font-size: 9.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
}
thead th:first-child { border-radius: 4px 0 0 0; }
thead th:last-child { border-radius: 0 4px 0 0; }
td { padding: 6px 8px; font-size: 10.5px; border-bottom: 1px solid #eee; }
td:last-child, th:last-child { text-align: right; }
td:nth-child(2) { text-align: center; }
tbody tr:nth-child(even) { background: #fafafa; }
.totals { width: 300px; margin-left: auto; border-collapse: collapse; }
.totals td { padding: 4px 8px; border: none; font-size: 10.5px; }
.totals td:last-child { text-align: right; font-weight: 600; }
.totals .big td { font-weight: 800; font-size: 15px; border-top: 2px solid #C59D5F; padding-top: 6px; color: #7F1D3A; }
.footer { text-align: center; font-size: 9.5px; color: #9ca3af; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 8px; }
.status-a4 { text-align: center; margin-top: 8px; font-size: 10px; font-weight: 700; color: #7F1D3A; letter-spacing: 1px; }
.status-a4.partial { color: #f59e0b; }
</style></head><body>
<div class="header">
  <div class="header-left">
    <div class="header-logo">Riyaz EP</div>
    <div>
      <h1>RIYAZ ENTERPRISE</h1>
      <p>Your Trusted Business Partner</p>
      <div class="addr">Barikot, Swat KPK &bull; Phone: 03469383792</div>
    </div>
  </div>
  <div class="header-right">
    <div class="inv-label">INVOICE</div>
    <div class="inv-id">#${sale.id ? sale.id.slice(0, 8) : "000000"}</div>
  </div>
</div>
<div class="info">
<div><span class="lbl">Invoice:</span> ${sale.id || "N/A"}<br><span class="lbl">Date:</span> ${dateStr}</div>
<div style="text-align:right">
${sale.customer_name ? `<span class="lbl">Customer:</span> ${sale.customer_name}<br>` : ""}
<span class="lbl">Items:</span> ${items.length} (${totalQty} units)
</div>
</div>
<table>
<thead><tr><th style="width:50%">Item</th><th style="width:12%;text-align:center">Qty</th><th style="width:16%;text-align:right">Price</th><th style="width:22%;text-align:right">Total</th></tr></thead>
<tbody>${items.map((i) => `<tr><td>${i.product_name}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">${(i.subtotal / i.quantity).toFixed(0)}</td><td style="text-align:right">${i.subtotal.toFixed(0)}</td></tr>`).join("")}</tbody>
</table>
<table class="totals">
<tr><td>Subtotal</td><td>${(sale.subtotal || 0).toFixed(0)}</td></tr>
${sale.discount > 0 ? `<tr><td>Discount</td><td>-${sale.discount.toFixed(0)}</td></tr>` : ""}
<tr class="big"><td>Total</td><td>${(sale.total || 0).toFixed(0)}</td></tr>
<tr><td>Paid</td><td>${(sale.amount_paid || 0).toFixed(0)}</td></tr>
<tr><td>Change</td><td>${Math.max(0, (sale.amount_paid || 0) - (sale.total || 0)).toFixed(0)}</td></tr>
<tr><td>Arrears</td><td>${(sale.customer_total_arrears || 0).toFixed(0)}</td></tr>
</table>
${sale.status === "partial" ? '<div class="status-a4 partial">PARTIAL PAYMENT</div>' : ""}
<div class="footer"><p>Thank you for your visit! &bull; Powered by Riyaz Enterprise</p></div>
</body></html>`;
}


function generateA5InvoiceHTML(sale) {
  const items = sale.items || [];
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const totalQty = items.reduce((s, i) => s + (i.quantity || 0), 0);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
@page { size: A5 portrait; margin: 6mm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  color: #1a1a1a; background: #fff; font-size: 10.5px; line-height: 1.4;
}
.header {
  display: flex; justify-content: space-between; align-items: center;
  padding-bottom: 10px; border-bottom: 2.5px solid #7F1D3A; margin-bottom: 12px;
}
.brand { display: flex; align-items: center; gap: 8px; }
.brand-logo { display: inline-flex; align-items: center; justify-content: center; height: 36px; padding: 0 8px; border-radius: 6px; background: #7F1D3A; color: #fff; font-size: 11px; font-weight: 800; letter-spacing: 0.02em; }
.brand-name { font-size: 17px; font-weight: 800; color: #7F1D3A; letter-spacing: -0.3px; }
.brand-sub { font-size: 8.5px; color: #666; margin-top: 1px; }
.brand-addr { font-size: 8px; color: #888; }
.badge { text-align: right; }
.badge h2 { font-size: 18px; font-weight: 800; color: #7F1D3A; letter-spacing: 1px; }
.badge-id {
  margin-top: 4px; background: #7F1D3A; color: #fff;
  padding: 4px 10px; border-radius: 3px; font-size: 9px; font-weight: 600; letter-spacing: 0.5px;
}
.info-row {
  display: flex; justify-content: space-between; gap: 10px; margin-bottom: 12px;
}
.info-block {
  flex: 1; padding: 8px 10px; border: 1px solid #e5e7eb; border-radius: 5px;
}
.info-block-title {
  font-size: 7.5px; font-weight: 700; color: #9ca3af; text-transform: uppercase;
  letter-spacing: 0.8px; margin-bottom: 4px;
}
.info-block p { font-size: 10px; margin: 1px 0; color: #333; }
.info-block .label { color: #9ca3af; font-size: 8.5px; }
table.items { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
table.items thead th {
  background: #7F1D3A; color: #fff; padding: 5px 7px;
  font-size: 8.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
}
table.items thead th:first-child { border-radius: 4px 0 0 0; }
table.items thead th:last-child { border-radius: 0 4px 0 0; }
table.items td { padding: 5px 7px; border-bottom: 1px solid #f0f0f0; font-size: 10px; }
table.items tbody tr:last-child td { border-bottom: none; }
.bottom { display: flex; gap: 12px; margin-top: 4px; }
.notes-block {
  flex: 1; border: 1px solid #e5e7eb; border-radius: 5px; padding: 8px 10px;
  min-height: 70px;
}
.notes-block strong { font-size: 8.5px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; }
.notes-block p { font-size: 9px; color: #666; margin-top: 4px; line-height: 1.5; }
.totals { width: 200px; }
.totals table { width: 100%; border-collapse: collapse; }
.totals td { padding: 3.5px 6px; font-size: 10px; }
.totals td:last-child { text-align: right; font-weight: 600; }
.totals .total-row td {
  padding: 6px; font-size: 13px; font-weight: 800;
  background: #7F1D3A; color: #fff; border-radius: 3px;
}
.status-badge {
  margin-top: 8px; text-align: center; padding: 4px;
  border-radius: 3px; font-size: 9px; font-weight: 700; letter-spacing: 1px;
  border: 1.5px solid #7F1D3A; color: #7F1D3A;
}
.status-badge.partial { border-color: #f59e0b; color: #f59e0b; background: #fffbeb; }
.divider { border: none; border-top: 1px dashed #d1d5db; margin: 6px 0; }
.footer { margin-top: 10px; padding-top: 6px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 8px; color: #9ca3af; }
</style>
</head>
<body>

<div class="header">
  <div class="brand">
    <div class="brand-logo">Riyaz EP</div>
    <div>
      <div class="brand-name">RIYAZ ENTERPRISE</div>
      <div class="brand-sub">Quality Care For Everyone</div>
      <div class="brand-addr">Barikot, Swat KPK</div>
    </div>
  </div>
  <div class="badge">
    <h2>INVOICE</h2>
    <div class="badge-id">#${sale.id ? sale.id.slice(0, 8) : "000000"}</div>
  </div>
</div>

<div class="info-row">
  <div class="info-block">
    <div class="info-block-title">Customer</div>
    <p><strong>${sale.customer_name || "Walk-in Customer"}</strong></p>
    <p>${sale.customer_phone || ""}</p>
  </div>
  <div class="info-block">
    <div class="info-block-title">Invoice Details</div>
    <p><span class="label">Date:</span> ${dateStr}</p>
    <p><span class="label">Status:</span> ${sale.status || "Paid"}</p>
    <p><span class="label">Items:</span> ${items.length} (${totalQty} units)</p>
  </div>
</div>

<table class="items">
  <thead>
    <tr>
      <th style="width:55%">Product</th>
      <th style="width:15%;text-align:center">Qty</th>
      <th style="width:15%;text-align:right">Rate</th>
      <th style="width:15%;text-align:right">Amount</th>
    </tr>
  </thead>
  <tbody>
    ${items.map(item => {
      const unitPrice = item.unit_price || (item.subtotal / item.quantity);
      return `<tr>
        <td>${item.product_name}</td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:right">${Math.round(unitPrice)}</td>
        <td style="text-align:right">${item.subtotal.toFixed(0)}</td>
      </tr>`;
    }).join("")}
  </tbody>
</table>

<hr class="divider">

<div class="bottom">
  <div class="notes-block">
    <strong>Notes</strong>
    <p>Please keep this invoice for returns, replacement or future reference.</p>
    <p>No return without receipt &bull; No return after 3 days &bull; No return of freezer/refrigerator medicines</p>
  </div>
  <div class="totals">
    <table>
      <tr><td>Subtotal</td><td>${sale.subtotal ? sale.subtotal.toFixed(0) : "0"}</td></tr>
      ${sale.discount > 0 ? `<tr><td>Discount</td><td>-${sale.discount.toFixed(0)}</td></tr>` : ""}
      <tr class="total-row"><td>Total</td><td>${(sale.total || 0).toFixed(0)}</td></tr>
      <tr><td>Paid</td><td>${(sale.amount_paid || 0).toFixed(0)}</td></tr>
      <tr><td>Change</td><td>${Math.max(0, (sale.amount_paid || 0) - (sale.total || 0)).toFixed(0)}</td></tr>
      <tr><td>Arrears</td><td>${(sale.customer_total_arrears || 0).toFixed(0)}</td></tr>
    </table>
    ${sale.status === "partial"
      ? '<div class="status-badge partial">PARTIAL PAYMENT</div>'
      : '<div class="status-badge">PAID</div>'}
  </div>
</div>

<div class="footer">Thank you for choosing Riyaz Enterprise</div>
</body>
</html>`;
}

function generateReturnReceiptHTML(returnData, sale, paperSize) {
  const items = returnData.items || [];
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const isThermal = paperSize === "thermal";
  const pageCSS = isThermal
    ? "@page { margin: 0; size: 80mm 297mm; }"
    : "@page { margin: 5mm; size: A5; }";

  const baseStyle = isThermal
    ? `body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; padding: 4mm 3mm; line-height: 1.3; } .receipt { width: 100%; }`
    : `body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #000; }`;

  const itemsHTML = items
    .map((i) => {
      const reasonStr = i.reason ? ` (${i.reason})` : "";
      const amt = i.refund_amount ?? i.subtotal ?? 0;
      return `<tr><td>${i.product_name} × ${i.quantity}${reasonStr}</td><td style="text-align:right">${amt.toFixed(0)}</td></tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
${pageCSS}
* { margin: 0; padding: 0; box-sizing: border-box; }
${isThermal ? "html, body { height: 100%; }" : ""}
${baseStyle}
h1 { text-align: center; margin-bottom: 4px; font-size: ${isThermal ? "20px" : "20px"}; letter-spacing: 1px; font-weight: 800; }
.sub { text-align: center; font-size: ${isThermal ? "10px" : "11px"}; margin-bottom: 6px; color: #333; font-weight: 600; }
.badge { text-align: center; font-size: ${isThermal ? "13px" : "14px"}; font-weight: 800; color: #c00; margin: 6px 0; letter-spacing: 1px; }
hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
hr.dashed { border-top: 1px dashed #888; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th { text-align: left; font-size: 11px; border-bottom: 1px solid #000; padding: 3px 0; font-weight: 700; }
td { font-size: ${isThermal ? "11px" : "13px"}; padding: 2px 0; font-weight: 600; }
td:last-child { text-align: right; }
.big td { font-weight: 800; font-size: ${isThermal ? "13px" : "15px"}; padding-top: 4px; border-top: 1px solid #000; }
.ftr { text-align: center; font-size: ${isThermal ? "10px" : "11px"}; margin-top: 6px; color: #555; font-weight: 600; }
</style></head><body>
<div class="receipt">
<h1>RIYAZ ENTERPRISE</h1>
<p class="sub">${dateStr}</p>
<p class="badge">** RETURN RECEIPT **</p>
<p class="sub">Sale: ${sale?.id?.slice(0, 8) || "N/A"}</p>
<hr>
<table>
<thead><tr><th>Item</th><th style="text-align:right">Refund</th></tr></thead>
<tbody>${itemsHTML}</tbody>
</table>
<hr class="dashed">
<table>
<tr class="big"><td>Total Refund</td><td style="text-align:right">${returnData.refund_amount.toFixed(0)}</td></tr>
</table>
<p class="sub" style="margin-top:6px">Reason: ${returnData.reason}</p>
<hr>
<p class="ftr">Return processed successfully</p>
<p class="ftr">--- Powered by Riyaz Enterprise ---</p>
</div>
</body></html>`;
}

function getPrintOptions(printerConfig) {
  const paperSize = printerConfig?.paperSize || "thermal";
  const opts = {
    silent: true,
    printBackground: true,
    deviceName: printerConfig?.deviceName || undefined,
  };

  const margins = printerConfig?.margins;

  if (paperSize === "thermal") {
    opts.pageSize = { width: 80000, height: 297000 };
    opts.margins = { marginType: "none" };
  } else if (paperSize === "a4") {
    opts.pageSize = "A4";
    if (margins) {
      opts.margins = {
        marginType: "custom",
        top: margins.top,
        bottom: margins.bottom,
        left: margins.left,
        right: margins.right,
      };
    } else {
      opts.margins = { marginType: "printableArea" };
    }
  } else if (paperSize === "a5") {
    opts.pageSize = "A5";
    if (margins) {
      opts.margins = {
        marginType: "custom",
        top: margins.top,
        bottom: margins.bottom,
        left: margins.left,
        right: margins.right,
      };
    } else {
      opts.margins = { marginType: "printableArea" };
    }
  }

  return opts;
}

function escposInit() {
  return Buffer.from([0x1b, 0x40]);
}

function escposAlign(n) {
  return Buffer.from([0x1b, 0x61, n]);
}

function escposBold(n) {
  return Buffer.from([0x1b, 0x45, n]);
}

function escposCut(full) {
  return Buffer.from([0x1d, 0x56, full ? 0x00 : 0x01]);
}

function escposText(str) {
  const safe = String(str).replace(/[^\x00-\xFF]/g, "");
  return Buffer.from(safe + "\r\n", "latin1");
}

function escposTextUTF8(str) {
  const safe = String(str).replace(/[^\x00-\xFF]/g, "");
  return Buffer.from(safe + "\r\n", "utf8");
}

function escposCodePage(n) {
  return Buffer.from([0x1b, 0x74, n]);
}

function escposFont(n) {
  return Buffer.from([0x1b, 0x4d, n]);
}

function escposCharSize(h, w) {
  return Buffer.from([0x1d, 0x21, (h << 4) | w]);
}

function escposLine(char, len) {
  return Buffer.from(char.repeat(len) + "\r\n", "latin1");
}

function escposFeed(n) {
  return Buffer.from("\r\n".repeat(n), "latin1");
}

function generateESCPOSReceipt(sale) {
  const items = sale.items || [];
  const now = new Date();
  const totalAmount = sale.total || 0;
  const paidAmount = sale.amount_paid || 0;
  const changeDue = sale.change || 0;
  const discount = sale.discount || 0;
  const balance = Math.max(0, totalAmount - paidAmount);
  const L = 48;
  const parts = [];

  parts.push(escposInit());
  parts.push(escposCodePage(2));
  parts.push(escposAlign(1));
  parts.push(escposBold(1));
  parts.push(escposCharSize(1, 0));
  parts.push(escposText("Riyaz Enterprise"));
  parts.push(escposCharSize(0, 0));
  parts.push(escposBold(0));
  parts.push(escposText("Beside Noman Clinical Laboratory"));
  parts.push(escposText("Barikot, Swat"));
  parts.push(escposLine("=", L));
  parts.push(escposAlign(0));

  const dateStr = now.toLocaleDateString("en-PK", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  parts.push(escposText("Date:      " + dateStr));
  parts.push(escposText("Invoice:   " + (sale.id || "")));
  parts.push(escposText("Customer:  " + (sale.customer_name || "Walk-in Customer")));
  parts.push(escposLine("-", L));

  const colName = 22;
  const colQty = 4;
  const colUnit = 7;
  const colAmt = 10;
  const colPad = colName + colQty + colUnit;
  parts.push(escposText(
    "Item".padEnd(colName) + "Qty".padStart(colQty) +
    "Rate".padStart(colUnit) + "Amt".padStart(colAmt)
  ));
  parts.push(escposLine("-", L));

  items.forEach((item) => {
    const name = (item.product_name || "").padEnd(colName).slice(0, colName);
    const qty = String(item.quantity).padStart(colQty);
    const unitPrice = String(Math.round(item.subtotal / item.quantity)).padStart(colUnit);
    const amount = String(item.subtotal.toFixed(0)).padStart(colAmt);
    parts.push(escposText(name + qty + unitPrice + amount));
  });

  parts.push(escposLine("-", L));

  function addLine(label, valueStr, isBold) {
    const line = label.padEnd(colPad) + valueStr.padStart(colAmt);
    if (isBold) parts.push(escposBold(1));
    parts.push(escposText(line));
    if (isBold) parts.push(escposBold(0));
  }

  addLine("Subtotal", totalAmount.toFixed(0));
  if (discount > 0) addLine("Discount", "-" + discount.toFixed(0));
  addLine("Total", totalAmount.toFixed(0), true);
  addLine("Paid", paidAmount.toFixed(0));
  if (balance > 0) addLine("Balance", balance.toFixed(0));
  else if (changeDue > 0) addLine("Change", changeDue.toFixed(0));
  parts.push(escposLine("=", L));

  if (sale.status === "partial") {
    parts.push(escposAlign(1));
    parts.push(escposBold(1));
    parts.push(escposText("** PARTIAL PAYMENT **"));
    parts.push(escposBold(0));
    parts.push(escposAlign(0));
  }

  parts.push(escposAlign(1));
  parts.push(escposFeed(1));
  parts.push(escposText("Thank You For Your Visit!"));
  parts.push(escposFeed(3));
  parts.push(escposCut(true));

  return Buffer.concat(parts);
}

function generateESCPOSReturnReceipt(returnData, sale) {
  const items = returnData.items || [];
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const L = 56;
  const parts = [];

  parts.push(escposInit());
  parts.push(escposFont(1));
  parts.push(escposAlign(1));
  parts.push(escposBold(1));
  parts.push(escposCharSize(1, 0));
  parts.push(escposText("RIYAZ ENTERPRISE"));
  parts.push(escposCharSize(0, 0));
  parts.push(escposBold(0));
  parts.push(escposText(dateStr));
  parts.push(escposLine("=", L));
  parts.push(escposBold(1));
  parts.push(escposText("** RETURN RECEIPT **"));
  parts.push(escposBold(0));
  parts.push(escposText("Sale: " + (sale?.id?.slice(0, 8) || "N/A")));
  parts.push(escposLine("-", L));
  parts.push(escposAlign(0));
  const colName = 44;
  const colAmt = 12;
  parts.push(
    escposText("Item description".padEnd(colName) + "Refund".padStart(colAmt)),
  );
  parts.push(escposLine("-", L));

  items.forEach((i) => {
    const reasonStr = i.reason ? " (" + i.reason + ")" : "";
    const name = (i.product_name + " x" + i.quantity + reasonStr)
      .padEnd(colName)
      .slice(0, colName);
    const amt = String(
      (i.refund_amount ?? i.subtotal ?? 0).toFixed(0),
    ).padStart(colAmt);
    parts.push(escposText(name + amt));
  });

  parts.push(escposLine("-", L));
  parts.push(escposBold(1));
  const totalLabel = "Total Refund".padEnd(colName);
  const totalVal = returnData.refund_amount.toFixed(0).padStart(colAmt);
  parts.push(escposText(totalLabel + totalVal));
  parts.push(escposBold(0));
  parts.push(escposText("Reason: " + returnData.reason));
  parts.push(escposLine("=", L));
  parts.push(escposAlign(1));
  parts.push(escposText("Return processed successfully"));
  parts.push(escposFeed(3));
  parts.push(escposCut(true));

  return Buffer.concat(parts);
}

function generateBarcodeLabelHTML(barcode, svgHtml, copies) {
  const count = Math.max(1, copies || 1);

  let body;
  if (jsBarcodeSource) {
    const valuesJson = JSON.stringify(Array(count).fill(String(barcode))).replace(/</g, "\\u003c");
    const labels = [];
    for (let i = 0; i < count; i++) {
      labels.push('<div class="label"><svg class="bc"></svg></div>');
    }
    body = `${labels.join("")}
<script>
try {
  var values = ${valuesJson};
  function renderBarcode(svg, value) {
    try {
      JsBarcode(svg, value, { format: "EAN13", width: 2, height: 60, displayValue: true, fontSize: 14, margin: 8 });
    } catch (e) {
      JsBarcode(svg, value, { format: "CODE128", width: 2, height: 60, displayValue: true, fontSize: 14, margin: 8 });
    }
  }
  var svgs = document.querySelectorAll("svg.bc");
  for (var i = 0; i < svgs.length; i++) renderBarcode(svgs[i], values[i]);
} catch (e) {}
</script>`;
  } else if (svgHtml) {
    const labels = [];
    for (let i = 0; i < count; i++) {
      labels.push(`<div class="label"><div class="barcode">${svgHtml}</div></div>`);
    }
    body = labels.join("");
  } else {
    const labels = [];
    for (let i = 0; i < count; i++) {
      labels.push(`<div class="label"><div class="code">${barcode}</div></div>`);
    }
    body = labels.join("");
  }

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><script>${jsBarcodeSource}</script><style>
@page { margin: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; }
.label {
  position: relative;
  width: 100vw;
  height: 100vh;
  page-break-after: always;
}
.label:last-child { page-break-after: auto; }
.label svg,
.label .barcode {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 72%;
  height: 78%;
}
.label .barcode { display: flex; align-items: center; justify-content: center; }
.label .barcode svg { width: 100%; height: 100%; }
.label .code {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-family: Arial, Helvetica, sans-serif;
  font-size: 4mm;
  letter-spacing: 1px;
  text-align: center;
  white-space: nowrap;
}
</style></head><body>${body}</body></html>`;
}

function doBarcodePrintJob(html, deviceName, labelWidth, labelHeight) {
  const widthMicrons = Math.round((labelWidth || 50) * 1000);
  const heightMicrons = Math.round((labelHeight || 30) * 1000);

  return new Promise((resolve, reject) => {
    const filePath = writeTempFile(html, "html");

    const printWin = new BrowserWindow({
      width: 500,
      height: 500,
      show: false,
      paintWhenReady: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false,
      },
    });

    let resolved = false;

    function cleanup() {
      resolved = true;
      try {
        printWin.close();
      } catch (_) {}
      try {
        fs.unlinkSync(filePath);
      } catch (_) {}
    }

    function printWithOptions(options) {
      return new Promise((resolvePrint, rejectPrint) => {
        try {
          printWin.webContents.print(options, (success, failureReason) => {
            if (success) return resolvePrint();
            rejectPrint(new Error(failureReason || "Print failed or cancelled"));
          });
        } catch (e) {
          rejectPrint(e);
        }
      });
    }

    function doPrint() {
      if (resolved) return;
      const baseOptions = {
        silent: true,
        printBackground: true,
        deviceName: deviceName || undefined,
        margins: { marginType: "none" },
      };
      const customSizeOptions = {
        ...baseOptions,
        pageSize: { width: widthMicrons, height: heightMicrons },
      };

      (async () => {
        try {
          await printWithOptions(customSizeOptions);
        } catch {
          if (resolved) return;
          await printWithOptions(baseOptions);
        }
      })()
        .then(() => {
          if (resolved) return;
          cleanup();
          resolve();
        })
        .catch((e) => {
          if (resolved) return;
          cleanup();
          reject(e);
        });
    }

    printWin.webContents.on("did-finish-load", () => {
      setTimeout(doPrint, 150);
    });
    printWin.webContents.on("did-fail-load", (_, code, desc) => {
      if (resolved) return;
      cleanup();
      reject(new Error(`Failed to load barcode label: ${desc} (${code})`));
    });

    printWin.loadURL(`file://${filePath.replace(/\\/g, "/")}`);

    setTimeout(() => {
      if (!resolved) {
        cleanup();
        reject(new Error("Barcode print timeout"));
      }
    }, 20000);
  });
}

async function printBarcodeLabel(barcode, copies, svgHtml, labelWidth, labelHeight, deviceName) {
  const html = generateBarcodeLabelHTML(barcode, svgHtml, copies || 1);
  await doBarcodePrintJob(html, deviceName, labelWidth, labelHeight);
}

function generateHTML(sale, paperSize) {
  if (paperSize === "a4") return generateA4InvoiceHTML(sale);
  if (paperSize === "a5") return generateA5InvoiceHTML(sale);
  return generateSaleReceiptHTML(sale);
}

function writeTempFile(content, ext) {
  const tmpDir = app.getPath("temp");
  const filePath = path.join(tmpDir, `riyaz-receipt-${Date.now()}.${ext}`);
  fs.writeFileSync(filePath, content, "utf-8");
  return filePath;
}

function doPrintJob(data, printerConfig) {
  const paperSize = printerConfig?.paperSize || "thermal";

  return new Promise((resolve, reject) => {
    const filePath = writeTempFile(data, "html");

    const printWin = new BrowserWindow({
      width: paperSize === "a4" ? 800 : paperSize === "thermal" ? 350 : 600,
      height: 600,
      show: false,
      paintWhenReady: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false,
      },
    });

    let resolved = false;

    function cleanup() {
      resolved = true;
      try {
        printWin.close();
      } catch (_) {}
      try {
        fs.unlinkSync(filePath);
      } catch (_) {}
    }

    function doPrint() {
      if (resolved) return;
      try {
        printWin.webContents.print(
          getPrintOptions(printerConfig),
          (success) => {
            if (resolved) return;
            if (!success) {
              cleanup();
              return reject(new Error("Print failed or cancelled"));
            }
            cleanup();
            resolve();
          },
        );
      } catch (e) {
        cleanup();
        reject(e);
      }
    }

    printWin.webContents.on("did-finish-load", doPrint);
    printWin.webContents.on("did-fail-load", (_, code, desc) => {
      if (resolved) return;
      cleanup();
      reject(new Error(`Failed to load receipt: ${desc} (${code})`));
    });

    printWin.loadURL(`file://${filePath.replace(/\\/g, "/")}`);

    setTimeout(() => {
      if (!resolved) {
        cleanup();
        reject(new Error("Print timeout"));
      }
    }, 15000);
  });
}

function printReceipt(sale, printerConfig) {
  const paperSize = printerConfig?.paperSize || "thermal";
  console.log(
    `printReceipt: paperSize=${paperSize} items=${(sale.items || []).length} total=${sale.total}`,
  );
  const html = generateHTML(sale, paperSize);
  console.log(`printReceipt: generated HTML length=${html.length}`);
  return doPrintJob(html, printerConfig);
}

function printReturnReceipt(returnData, sale, printerConfig) {
  const paperSize = printerConfig?.paperSize || "thermal";
  const html = generateReturnReceiptHTML(returnData, sale, paperSize);
  return doPrintJob(html, printerConfig);
}

export { printReceipt, printReturnReceipt, printBarcodeLabel, generateHTML, generateReturnReceiptHTML };
