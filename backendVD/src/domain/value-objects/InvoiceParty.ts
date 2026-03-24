/**
 * InvoiceParty — Objeto de valor que representa una parte en la factura
 * (emisor o receptor) con todos los campos exigidos por la DIAN.
 *
 * Codigos de referencia:
 *   - Tax regime "48"     = No responsable de IVA (regimen simplificado).
 *   - Tax responsibility  "R-99-PN" = No aplica – Otros.
 *   - City code "63001"   = Armenia, Quindio (municipio del negocio).
 *   - Department code "63" = Quindio.
 *
 * Documento anonimo: cuando el comprador no necesita identificarse
 * (compras < $927.000 COP), usar documentNumber = "222222222".
 */

/** Tipos de documento de identidad validos en Colombia. */
export type DocumentType = "CC" | "NIT" | "CE" | "TI" | "PP" | "RC" | "DE";

export interface InvoicePartyProps {
  documentType: DocumentType;
  documentNumber: string;
  /** Digito de verificacion del NIT. Solo aplica cuando documentType = "NIT". */
  checkDigit?: string;
  firstName?: string;
  lastName?: string;
  /** Razon social. Solo aplica cuando documentType = "NIT". */
  companyName?: string;
  /** Nombre completo para mostrar (persona natural o razon social). */
  displayName: string;
  email: string;
  phone?: string;
  address: string;
  /** Codigo DANE del municipio. Ejemplo: "63001" = Armenia. */
  cityCode: string;
  cityName: string;
  /** Codigo DANE del departamento. Ejemplo: "63" = Quindio. */
  departmentCode: string;
  departmentName: string;
  /** Siempre "CO" para Colombia. */
  countryCode: string;
  /** Codigo de regimen tributario. "48" = No responsable de IVA. */
  taxRegime: string;
  /** Responsabilidades fiscales. ["R-99-PN"] = No aplica. */
  taxResponsibilities: string[];
}

export class InvoiceParty {
  readonly documentType: DocumentType;
  readonly documentNumber: string;
  readonly checkDigit?: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly companyName?: string;
  readonly displayName: string;
  readonly email: string;
  readonly phone?: string;
  readonly address: string;
  readonly cityCode: string;
  readonly cityName: string;
  readonly departmentCode: string;
  readonly departmentName: string;
  readonly countryCode: string;
  readonly taxRegime: string;
  readonly taxResponsibilities: string[];

  constructor(props: InvoicePartyProps) {
    this.documentType        = props.documentType;
    this.documentNumber      = props.documentNumber;
    this.checkDigit          = props.checkDigit;
    this.firstName           = props.firstName;
    this.lastName            = props.lastName;
    this.companyName         = props.companyName;
    this.displayName         = props.displayName;
    this.email               = props.email;
    this.phone               = props.phone;
    this.address             = props.address;
    this.cityCode            = props.cityCode;
    this.cityName            = props.cityName;
    this.departmentCode      = props.departmentCode;
    this.departmentName      = props.departmentName;
    this.countryCode         = props.countryCode;
    this.taxRegime           = props.taxRegime;
    this.taxResponsibilities = props.taxResponsibilities;
  }
}
