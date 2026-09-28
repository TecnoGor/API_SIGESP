// ? LISTA: 17-09-2026
export interface IRetencionIvaDetPayload {
    fechaDeFactura: string;
    numeroFactura: string;
    numeroControl: string;
    numeroNotaDeCredito?: string | null;
    numeroNotaDeDebito?: string | null;
    numeroFacturaAfectada?: string | null;
    totalDeCompraIncluyendoIva: string;
    compraSinDerechoACreditoFiscal: string;
    baseImponible: string;
    porcentaje_iva: string;
    porcentaje: string;
}
