# Plan de Pruebas API de Subastas

> Actualización 2025-08-22

- Implementado soporte de duración configurable (24h/48h) al crear subastas.
- Cierre automático al vencer (scheduler) y lazy close en consultas.
- Detalle expone `durationHours` y `timeRemainingHours` (countdown redondeado a horas) y `reviews`.
- Cliente estático (`/client/index.html`) muestra duración, countdown local y valoraciones.

Resumen de campos nuevos en Detalle (GET /api/auctions/:id)

- `durationHours`: 24 | 48 (derivado entre `createdAt` y `endsAt`).
- `timeRemainingHours`: entero redondeado hacia abajo (floor) de horas restantes.
- `reviews`: lista simple [{ id, itemId, sellerId, userId, rating, comment, createdAt }].

Pruebas visuales (recomendado)

1. Arranca el servidor en dev y abre http://localhost:3000.
2. En “Crear subasta”, completa:

- UserId: `user-1` (seed)
- ItemId: libre
- Precio inicial
- Duración: 24h o 48h
- BuyNow (opcional)

3. Pulsa “Crear”: verás el ID en Log y se autocompleta en los demás formularios.
4. En “Detalle de subasta” pulsa “Ver detalle”: verifica

- Estado: `OPEN`
- Duración: `24 h` o `48 h`
- Cuenta regresiva: `X h` (se actualiza localmente cada minuto, sin pedir al servidor)
- Precio actual y BuyNow
- Valoraciones (seed: aparecen si itemId o sellerId coincide con las dummy)

5. Opcional: Pujar con `user-2` y volver a “Ver detalle” para ver que cambia `currentBid`.

Validación rápida de criterios de aceptación

- Al crear, la duración elegida (24/48h) queda guardada y se respeta (ver Detalle).
- Cuando llega el vencimiento, la subasta se cierra sola (scheduler) y además se cierra al consultar si ya venció (lazy close).
- La cuenta regresiva en el Detalle se muestra redondeada por horas (floor) y se actualiza en el cliente.

Este documento describe cómo validar manualmente (o semi‑automatizado) los endpoints actuales de la API de subastas usando PowerShell (`Invoke-RestMethod`). Incluye casos felices y casos de error.

## 0. Requisitos previos

- Servidor levantado: `npm run dev` (escucha en `http://localhost:3000`).
- Seed in‑memory de usuarios (en `auction.router.ts`): `user-1`, `user-2`, `user-3` con créditos.
- Cada request autenticado debe llevar el header `x-user-id` con un usuario válido.
- Reiniciar el server limpia el estado (subastas en memoria).

## 1. Helpers (opcional, recomendado)

Crea funciones para reutilizar:

```powershell
function New-Auction {
  param(
    [Parameter(Mandatory=$true)][string]$UserId,
    [Parameter(Mandatory=$true)][string]$ItemId,
    [Parameter(Mandatory=$true)][int]$StartingPrice,
    [Parameter(Mandatory=$true)][ValidateSet(24,48)][int]$DurationHours,
    [int]$BuyNowPrice,
    [bool]$DisableBuyNowOnFirstBid = $true
  )
  $headers = @{ "x-user-id" = $UserId }
  $body = @{
    itemId = $ItemId
    startingPrice = $StartingPrice
    durationHours = $DurationHours
    disableBuyNowOnFirstBid = $DisableBuyNowOnFirstBid
  }
  if ($PSBoundParameters.ContainsKey('BuyNowPrice')) { $body.buyNowPrice = $BuyNowPrice }
  $json = $body | ConvertTo-Json
  Invoke-RestMethod "http://localhost:3000/api/auctions" -Method POST -Headers $headers -Body $json -ContentType "application/json"
}

function Place-Bid {
  param(
    [Parameter(Mandatory=$true)][string]$UserId,
    [Parameter(Mandatory=$true)][string]$AuctionId,
    [Parameter(Mandatory=$true)][int]$Amount
  )
  $headers = @{ "x-user-id" = $UserId }
  $json = @{ amount = $Amount } | ConvertTo-Json
  Invoke-RestMethod "http://localhost:3000/api/auctions/$AuctionId/bids" -Method POST -Headers $headers -Body $json -ContentType "application/json"
}

function Buy-Now {
  param(
    [Parameter(Mandatory=$true)][string]$UserId,
    [Parameter(Mandatory=$true)][string]$AuctionId
  )
  $headers = @{ "x-user-id" = $UserId }
  Invoke-RestMethod "http://localhost:3000/api/auctions/$AuctionId/buy-now" -Method POST -Headers $headers -ContentType "application/json"
}

function Get-AuctionDetail {
  param([Parameter(Mandatory=$true)][string]$UserId,[Parameter(Mandatory=$true)][string]$AuctionId)
  $headers = @{ "x-user-id" = $UserId }
  Invoke-RestMethod "http://localhost:3000/api/auctions/$AuctionId" -Headers $headers
}
```

## 2. Autenticación

| Caso                | Acción                       | Esperado                                                              |
| ------------------- | ---------------------------- | --------------------------------------------------------------------- |
| Sin header          | POST /api/auctions           | 401 JSON `{ error: "No autenticado: falta encabezado 'x-user-id'." }` |
| Usuario inexistente | Header `x-user-id:no-existe` | 403 `{ error: "Usuario no registrado." }`                             |

Ejemplo sin header:

```powershell
Invoke-RestMethod "http://localhost:3000/api/auctions" -Method POST -Body (@{ itemId="x"; startingPrice=1; durationHours=24 } | ConvertTo-Json) -ContentType "application/json"
```

## 3. Crear Subasta

Reglas de créditos:

- 24h => requiere ≥1 crédito.
- 48h => requiere ≥3 créditos.

### 3.1 Éxito 24h

```powershell
$r = New-Auction -UserId "user-1" -ItemId "item-24-ok" -StartingPrice 100 -DurationHours 24 -BuyNowPrice 300
$aid = $r.auction.id
$r.auction | Format-List
```

Campos clave esperados en `$r.auction`: `id,currentPrice,startingPrice,endsAt,status='OPEN',buyNowPrice`.

### 3.2 Fallo créditos insuficientes 48h (si ajustas seed para tener <3)

```powershell
try { New-Auction -UserId "user-3" -ItemId "item-48-fail" -StartingPrice 50 -DurationHours 48 } catch { $_.ErrorDetails.Message }
```

Esperado: mensaje con `Créditos insuficientes`.

### 3.3 Éxito 48h

```powershell
$r48 = New-Auction -UserId "user-1" -ItemId "item-48-ok" -StartingPrice 50 -DurationHours 48
$aid48 = $r48.auction.id
```

## 4. Detalle de Subasta

```powershell
Get-AuctionDetail -UserId user-1 -AuctionId $aid
```

Respuesta contiene:

- `auction` (AuctionDTO extendido con item)
- `bidsHistory` (array)
- `reviews` (placeholder [])
- `timeRemainingMs` ≥ 0

### 4.1 Pruebas específicas de “Detalle” (criterios de aceptación)

Objetivo: Validar SOLO los criterios de la historia de “Detalle de producto”.

1. Nombre, imagen, estado, tiempo restante:

```powershell
$det = Get-AuctionDetail -UserId user-1 -AuctionId $aid
$det.auction.item.name
$det.auction.item.imageUrl   # (null si no seteaste imageUrl al crear)
$det.auction.status
$det.timeRemainingMs -gt 0
```

Esperado: nombre presente, status = 'OPEN', `timeRemainingMs` > 0.

2. Valor actual y última puja del jugador:

```powershell
$det.currentBid            # alias de auction.currentPrice
$det.lastUserBid           # null si aún no pujó ese usuario
```

Luego haz una puja con otro usuario y vuelve a consultar con ese usuario para ver que `currentBid` cambió:

```powershell
Place-Bid -UserId user-2 -AuctionId $aid -Amount ($det.currentBid + 50) | Out-Null
Get-AuctionDetail -UserId user-1 -AuctionId $aid | Select-Object currentBid,bidsHistory,lastUserBid
```

Si el propio user-1 puja:

```powershell
Place-Bid -UserId user-1 -AuctionId $aid -Amount ($det.currentBid + 30) | Out-Null
(Get-AuctionDetail -UserId user-1 -AuctionId $aid).lastUserBid
```

Esperado: `lastUserBid.amount` coincide con el último monto enviado por user-1.

3. Historial de pujas visible:

```powershell
(Get-AuctionDetail -UserId user-1 -AuctionId $aid).bidsHistory | Format-Table amount,userId,timestamp -AutoSize
```

Esperado: lista ordenada por tiempo (inserción) mostrando cada puja.

4. Comentarios y valoraciones (reviews):

```powershell
(Get-AuctionDetail -UserId user-1 -AuctionId $aid).reviews | Format-Table rating,comment,userId -AutoSize
```

Seed actual: dos reviews de ejemplo. Si el itemId o sellerId coincide, aparecen. Si no, puede venir vacío.

5. Acceso a función de pujar (`canBid`):

```powershell
(Get-AuctionDetail -UserId user-1 -AuctionId $aid).canBid
```

Esperado: `True` mientras la subasta esté `OPEN` y quede tiempo.

6. Buy Now desaparece tras primera puja (si `disableBuyNowOnFirstBid=true`):

```powershell
$rBNdet = New-Auction -UserId user-1 -ItemId item-detail -StartingPrice 100 -DurationHours 24 -BuyNowPrice 400
$aidDet = $rBNdet.auction.id
Place-Bid -UserId user-2 -AuctionId $aidDet -Amount 150 | Out-Null
(Get-AuctionDetail -UserId user-1 -AuctionId $aidDet).auction.buyNowPrice
```

Esperado: `null` o no definido.

Checklist rápido estado Detalle:

- Nombre / imagen / status / tiempo restante ✔️
- currentBid y lastUserBid ✔️
- Historial completo de pujas ✔️
- Reviews visibles ✔️
- canBid boolean ✔️
- BuyNow desaparece tras primera puja (si flag activo) ✔️

## 5. Pujas

Condiciones: monto > `currentPrice` y créditos del usuario ≥ monto.

### 5.1 Éxito

```powershell
Place-Bid -UserId user-2 -AuctionId $aid -Amount 150 | % { $_.auction.currentPrice }
```

Debe mostrar `150`.

### 5.2 Monto inválido (<= currentPrice)

```powershell
try { Place-Bid -UserId user-2 -AuctionId $aid -Amount 150 } catch { $_.ErrorDetails.Message }
```

Esperado: `Puja inválida`.

### 5.3 Créditos insuficientes

```powershell
try { Place-Bid -UserId user-3 -AuctionId $aid -Amount 999999 } catch { $_.ErrorDetails.Message }
```

Esperado: `Créditos insuficientes`.

## 6. Compra Inmediata (Buy Now)

Si `disableBuyNowOnFirstBid=true` y hay primera puja, `buyNowPrice` desaparece.

### 6.1 Éxito antes de puja

```powershell
$rBN = New-Auction -UserId user-1 -ItemId item-bn -StartingPrice 100 -DurationHours 24 -BuyNowPrice 300
$aidBN = $rBN.auction.id
Buy-Now -UserId user-1 -AuctionId $aidBN
```

Esperado: JSON `{ auctionId, soldPrice:300, buyerId:"user-1", status:"SOLD" }`.

### 6.2 Fallo créditos insuficientes

```powershell
$rBN2 = New-Auction -UserId user-1 -ItemId item-bn2 -StartingPrice 100 -DurationHours 24 -BuyNowPrice 100000
$aidBN2 = $rBN2.auction.id
try { Buy-Now -UserId user-3 -AuctionId $aidBN2 } catch { $_.ErrorDetails.Message }
```

### 6.3 Buy Now desactivado tras primera puja

```powershell
$rBN3 = New-Auction -UserId user-1 -ItemId item-bn3 -StartingPrice 100 -DurationHours 24 -BuyNowPrice 300
$aidBN3 = $rBN3.auction.id
Place-Bid -UserId user-2 -AuctionId $aidBN3 -Amount 150 | Out-Null
try { Buy-Now -UserId user-1 -AuctionId $aidBN3 } catch { $_.ErrorDetails.Message }
```

Esperado: `Compra inmediata no disponible`.

## 7. Errores de Autenticación en Acciones

| Acción            | Sin header | Usuario inexistente |
| ----------------- | ---------- | ------------------- |
| POST /:id/bids    | 401        | 403                 |
| POST /:id/buy-now | 401        | 403                 |

Ejemplo sin header en puja:

```powershell
$json = @{ amount = 123 } | ConvertTo-Json
Invoke-RestMethod "http://localhost:3000/api/auctions/$aid/bids" -Method POST -Body $json -ContentType "application/json"
```

## 8. Checklist de Cobertura

- Crear subasta 24h/48h (éxito y fallos de créditos). ✔️
- Detalle con `bidsHistory` y `timeRemainingMs`. ✔️
- Pujas: éxito, monto inválido, créditos insuficientes. ✔️
- Buy Now: éxito, créditos insuficientes, desactivado tras puja. ✔️
- Autenticación: faltante y usuario inexistente en cada endpoint. ✔️

## 9. Próximas Extensiones (futuras)

- Persistir subastas en DB.
- Endpoint para listar subastas (paginación / filtros).
- Sistema real de reviews (modelo + almacenamiento).
- Métricas y logging estructurado.
- Tests automatizados (Jest) para reglas de negocio `Auction.placeBid` y `buyNow`.

---

**Fin del documento**
