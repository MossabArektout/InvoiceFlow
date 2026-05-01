# InvoiceFlow

A single-page invoice generator built with Vite + React + TypeScript + Tailwind CSS.

## Features

- Side-by-side editor and live invoice preview
- Auto-generated invoice number (`INV-001`, `INV-002`, ...)
- Dynamic line items with add/remove actions
- Automatic subtotal, tax, and total calculations
- PDF export of the preview using `html2canvas` + `jsPDF`
- Clear/reset form action

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```
