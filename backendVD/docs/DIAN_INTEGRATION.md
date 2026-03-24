# Integración Facturación Electrónica DIAN — Variedades Danni

> **Estado actual:** STUB activo. Las facturas se generan y almacenan localmente
> pero **NO se envían** a la DIAN. El sistema operativo completo está disponible
> una vez completados los pasos de la sección 2.

---

## 1. Contexto Legal

### Marco normativo
| Norma | Descripción |
|-------|-------------|
| Ley 2010 de 2019 | Obliga a todos los comerciantes a emitir factura electrónica. |
| Resolución DIAN 000042 / 2020 | Adopta el Anexo Técnico de Factura Electrónica de Venta v1.8. |
| Resolución DIAN 000012 / 2021 | Actualiza al Anexo Técnico v1.9 (vigente). |
| Decreto 1165 / 2019 | Reglamenta el sistema de factures electrónicas. |

### Umbral de identificación del comprador
Según el **Concepto DIAN 0912-2019**, cuando el valor de la factura **supera
$927.000 COP** el comprador debe identificarse con documento. Para ventas por
debajo de ese umbral se acepta el código `222222222` ("Consumidor Final Anónimo").

Variedades Danni es un negocio de venta de esencias y perfumes al por menor.
La mayoría de ventas están por debajo del umbral → el sistema usa `222222222`
por defecto y expone el campo `documentNumber` en el perfil del usuario para
los casos que lo requieran.

---

## 2. Proceso de Habilitación DIAN (5 pasos)

### Paso 1 — Certificado Digital
Obtener un certificado `.PFX` de firma digital emitido por una **Entidad de
Certificación habilitada** por la Superintendencia de Industria y Comercio:

- **Certicámara** (`certicamara.com`) — ~$500.000 COP/año
- **Camerfirma Colombia** (`camerfirma.com.co`) — ~$450.000 COP/año

El certificado firma los XML que se envían a la DIAN (firma XAdES-BES).
Guardar el `.PFX` y su contraseña en `./certs/certificado.pfx` y en el
vault de secretos del servidor de producción. **NUNCA commitear al repositorio.**

### Paso 2 — Registro como Software Propio
Ingresar al **Muisca** (`muisca.dian.gov.co`) con las credenciales del NIT:

1. Servicios → Facturación Electrónica → Registrar Software Propio.
2. Completar el formulario: nombre software, versión, NIT del desarrollador.
3. Descargar el **TestSetId** asignado al software.
4. Guardar el `DIAN_SOFTWARE_ID` y `DIAN_SOFTWARE_PIN` en `.env`.

### Paso 3 — SET de Pruebas (30 documentos)
La DIAN exige enviar un conjunto de 30 documentos de prueba que cubren
facturas, notas crédito y notas débito con diferentes escenarios:

```
Ambiente habilitador: https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc
TestSetId: (obtenido en el paso 2)
```

Script de referencia (una vez implmentado el cliente SOAP real):
```bash
cd backendVD && npx ts-node scripts/dian-test-set.ts
```

### Paso 4 — Activar Modo Producción
Una vez aprobadas las pruebas, la DIAN envía confirmación por correo.
Cambiar en `.env`:
```
DIAN_ENV=production
DIAN_API_URL=https://vpfe.dian.gov.co/WcfDianCustomerServices.svc
```

### Paso 5 — Reemplazar el STUB
En `src/app.ts`, cambiar:
```typescript
// ANTES (STUB):
import { DianSoapClient } from "./infrastructure/invoice/DianSoapClient";
const dianClient = new DianSoapClient();

// DESPUÉS (producción):
import { DianSoapClientReal } from "./infrastructure/invoice/DianSoapClientReal";
const dianClient = new DianSoapClientReal();
```
`InvoiceService` no necesita ningún cambio gracias a la abstracción `IInvoiceGateway`.

---

## 3. Arquitectura Técnica

### 3.1 Formato del XML — UBL 2.1
La DIAN exige el estándar **Universal Business Language 2.1** con extensiones
propias. El namespace raíz es:
```
urn:oasis:names:specification:ubl:schema:xsd:Invoice-2
```

Librería recomendada: [`xmlbuilder2`](https://oozcitak.github.io/xmlbuilder2/)
```bash
npm install xmlbuilder2 xml-crypto node-forge
```

Estructura mínima del XML:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <ext:UBLExtensions>
    <!-- Firma XAdES-BES aqui -->
  </ext:UBLExtensions>
  <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>10</cbc:CustomizationID>
  <cbc:ProfileExecutionID>2</cbc:ProfileExecutionID>  <!-- 1=prod, 2=test -->
  <cbc:ID>SEQF-0001</cbc:ID>
  <cbc:IssueDate>2024-03-20</cbc:IssueDate>
  <cbc:IssueTime>14:30:00-05:00</cbc:IssueTime>
  <cbc:InvoiceTypeCode>01</cbc:InvoiceTypeCode>
  <!-- ... resto de campos -->
</Invoice>
```

### 3.2 CUFE — Código Único de Factura Electrónica
Fórmula según Anexo Técnico DIAN v1.9, sección 8.2:

```
CUFE = SHA384(
  NumFac + FecFac + HorFac + ValFac + CodImp1 + ValImp1 +
  CodImp2 + ValImp2 + CodImp3 + ValImp3 + ValTot +
  NitOFE + NumAdq + ClTec + TipoAmbiente
)
```

Variables:
| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `NumFac` | Número de factura | `SEQF-0001` |
| `FecFac` | Fecha YYYYMMDD | `20240320` |
| `HorFac` | Hora HH:MM:SS-05:00 | `14:30:00-05:00` |
| `ValFac` | Valor base (2 decimales) | `150000.00` |
| `CodImp1` | Código IVA = `01` | `01` |
| `ValImp1` | Valor IVA (2 decimales) | `0.00` |
| `CodImp2` | Código IC = `04` | `04` |
| `ValImp2` | Valor IC | `0.00` |
| `CodImp3` | Código ICA = `03` | `03` |
| `ValImp3` | Valor ICA | `0.00` |
| `ValTot` | Total factura (2 decimales) | `150000.00` |
| `NitOFE` | NIT emisor sin DV | `900123456` |
| `NumAdq` | Documento adquirente | `222222222` |
| `ClTec` | Clave técnica del software DIAN | `(de Muisca)` |
| `TipoAmbiente` | 1=prod, 2=test | `2` |

### 3.3 Firma Digital XAdES-BES
```
1. Canonicalizar el XML (C14N exclusivo, sin comentarios).
2. Calcular SHA256 del XML canonicalizado.
3. Firmar el hash con RSA-SHA256 usando la clave privada del .PFX.
4. Insertar el bloque <ds:Signature> dentro de <ext:UBLExtensions>.
```

Librería: `xml-crypto` + `node-forge` para leer el certificado .PFX.

### 3.4 Envío SOAP — SendBillSync
```
Endpoint producción: https://vpfe.dian.gov.co/WcfDianCustomerServices.svc
Endpoint pruebas:    https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc
Método SOAP:         SendBillSync
```

El XML firmado se comprime con GZIP, se codifica en Base64 y se envía como:
```xml
<SendBillSyncRequest>
  <fileName>SEQF-0001.xml</fileName>
  <contentFile>H4sIAAAAAAAA...</contentFile>  <!-- base64(gzip(xml)) -->
</SendBillSyncRequest>
```

### 3.5 Códigos de Respuesta DIAN
| Código | Descripción | Acción |
|--------|-------------|--------|
| `00` | Documento procesado correctamente | → `SENT` |
| `66` | NIT no autorizado para facturar | Verificar habilitación |
| `89` | XML no cumple el XSD | Corregir estructura |
| `90` | Firma inválida | Verificar certificado |
| `99` | Error del sistema DIAN | Reintentar en 5 min |

### 3.6 Contingencia
Si la DIAN no responde en >5s o devuelve error 99:
1. La factura queda en estado `DRAFT` en la base de datos.
2. Se registra el error en `dianResponse` para diagnóstico.
3. El administrador puede reintentar desde: `POST /api/admin/invoices/:orderId/retry`.
4. El cliente recibe el correo de confirmación del pedido (sin la factura).

---

## 4. Variables de Entorno Necesarias

```bash
# ─── DIAN - Facturación Electrónica ───────────────────────────────────────────
# Ambiente: "test" = habilitador, "production" = producción
DIAN_ENV=test

# URL del servicio SOAP de la DIAN (cambiar según DIAN_ENV)
DIAN_API_URL=https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc

# NIT del emisor (sin dígito de verificación)
DIAN_NIT=900123456

# Dígito de verificación del NIT
DIAN_NIT_CHECK_DIGIT=7

# Razón social del emisor
DIAN_COMPANY_NAME=Variedades Danni

# Correo de facturación del emisor
DIAN_EMAIL=facturas@variedadesdanni.co

# Teléfono del emisor
DIAN_PHONE=+573001234567

# Dirección física del emisor
DIAN_ADDRESS=Carrera 14 # 12-34, Local 5

# Código DANE del municipio (Armenia, Quindío = 63001)
DIAN_CITY_CODE=63001

# Nombre del municipio
DIAN_CITY_NAME=Armenia

# Código DANE del departamento (Quindío = 63)
DIAN_DEPARTMENT_CODE=63

# Nombre del departamento
DIAN_DEPARTMENT_NAME=Quindio

# Régimen tributario (48 = No responsable de IVA)
DIAN_TAX_REGIME=48

# ID del software registrado en Muisca
DIAN_SOFTWARE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# PIN del software registrado en Muisca
DIAN_SOFTWARE_PIN=12345

# Ruta al certificado digital .PFX (NUNCA commitear)
DIAN_CERT_PATH=./certs/certificado.pfx

# Contraseña del certificado .PFX
DIAN_CERT_PASSWORD=mi_password_segura
```

---

## 5. Checklist de Implementación

Para reemplazar el STUB con la integración real:

- [ ] Obtener certificado digital .PFX (Certicámara o Camerfirma)
- [ ] Registrar software en Muisca → guardar `SOFTWARE_ID` y `SOFTWARE_PIN`
- [ ] Instalar dependencias: `npm install xmlbuilder2 xml-crypto node-forge`
- [ ] Crear `DianSoapClientReal.ts` implementando `IInvoiceGateway`
  - [ ] `buildUblXml()` — generar XML UBL 2.1 válido
  - [ ] `computeCufe()` — SHA-384 con formula exacta de la sección 3.2
  - [ ] `signXml()` — XAdES-BES con xml-crypto + node-forge
  - [ ] `sendBillSync()` — GZIP + Base64 + llamada SOAP
  - [ ] Parsear respuesta XML de la DIAN
- [ ] Ejecutar SET de 30 pruebas en ambiente habilitador
- [ ] Recibir confirmación de la DIAN
- [ ] Cambiar `DIAN_ENV=production` y `DIAN_API_URL` al endpoint de producción
- [ ] En `app.ts`, instanciar `DianSoapClientReal` en lugar de `DianSoapClient`
- [ ] Implementar generación de PDF (pdfmake o puppeteer) y actualizar `pdfUrl`
- [ ] Probar el endpoint de reintento: `POST /api/admin/invoices/:orderId/retry`

---

*Documento generado para Variedades Danni — Parte 8 del sistema de backend.*
*Última actualización: ver historial de git.*
