# Dashboard PNC Maquinarias

Dashboard interactivo para el módulo de Maquinarias del Programa Nuestras Ciudades - MVCS.

## Instalación

```bash
npm install
```

## Desarrollo local

```bash
npm run dev
```
Abre http://localhost:5173

## Build para producción

```bash
npm run build
```
Los archivos quedan en la carpeta `dist/`

## Deploy en GitHub Pages

1. Crea un repo en GitHub
2. Sube el código: `git init && git add . && git commit -m "init" && git remote add origin [URL] && git push -u origin main`
3. En Settings > Pages > Source: selecciona rama `main`, carpeta `/ (root)`
4. **Importante:** Para GitHub Pages necesitas hacer build y subir la carpeta `dist/`

### Deploy automático con GitHub Actions

Crea `.github/workflows/deploy.yml` (incluido en este repo).

## Uso

1. Abre el dashboard
2. Carga el Excel exportado del sistema Main Maquinarias (`inter_XXXXXXXX.xlsx`)
3. Opcionalmente carga también el inventario de maquinarias (`Listado_Maquinarias_XXXXXX.xlsx`)
4. El sistema detecta automáticamente qué archivo es cuál

## Módulos

- 🏛 **Gerencial**: KPIs, semáforo, gauge de ejecución
- 📊 **Resumen**: Por departamento, estado, actividad
- 📋 **Detalle**: Tabla con selección múltiple, exportación Excel/PDF
- 🚜 **Maquinaria**: MP/VP, disponibilidad por UBO
- 📦 **Distribución Maq.**: Reporte diario automatizado, exportación Excel por UBO

## Stack

- React 18 + Vite
- Recharts (gráficos)
- SheetJS/xlsx (lectura/escritura Excel)
- Tailwind CSS
