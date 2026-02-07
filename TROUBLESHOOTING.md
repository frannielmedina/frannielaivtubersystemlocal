# 🔧 Guía de Solución de Errores

## 🚨 Errores Comunes y Soluciones

---

## 1. Errores de Script (npm run ...)

### Error: "Module not found"
```
Error: Cannot find module 'next'
```

**Causa**: Dependencias no instaladas o corruptas

**Solución**:
```bash
# Opción 1: Reinstalar
rm -rf node_modules package-lock.json
npm install

# Opción 2: Cache limpio
npm cache clean --force
npm install

# Opción 3: Verificar Node version
node --version  # Debe ser 18.x o superior
```

---

### Error: "Port 3000 already in use"
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Causa**: Otro proceso está usando el puerto 3000

**Solución**:

**Mac/Linux**:
```bash
# Encontrar proceso
lsof -ti:3000

# Matar proceso
lsof -ti:3000 | xargs kill -9

# O cambiar puerto
PORT=3001 npm run dev
```

**Windows**:
```bash
# Encontrar proceso
netstat -ano | findstr :3000

# Matar proceso (reemplazar PID)
taskkill /PID [número] /F

# O cambiar puerto
set PORT=3001 && npm run dev
```

---

### Error: "Prettier formatting failed"
```
Error: Parsing error: Unexpected token
```

**Causa**: Sintaxis incorrecta en el código

**Solución**:
```bash
# 1. Ver qué archivos tienen error
npm run format:check

# 2. Formatear archivo específico
npx prettier --write src/ruta/al/archivo.tsx

# 3. Si persiste, revisar sintaxis manualmente
# El error te dirá en qué línea está el problema
```

---

### Error: "ESLint errors"
```
Error: 'variable' is assigned a value but never used
```

**Causa**: Variables no usadas, imports innecesarios, etc.

**Solución**:
```bash
# Arreglar automáticamente
npm run lint:fix

# Si el error persiste:
# 1. Remover variable no usada
# 2. O prefixar con _ para indicar que es intencional
const _unusedVar = 'value';

# 3. O deshabilitar para esa línea
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const variable = 'value';
```

---

### Error: "TypeScript type errors"
```
Type 'string' is not assignable to type 'number'
```

**Causa**: Tipos incompatibles

**Solución**:
```bash
# 1. Verificar errores
npm run type-check

# 2. Opciones de fix:

# A. Corregir el tipo
const age: number = 25; // ✅ Correcto
const age: number = "25"; // ❌ Incorrecto

# B. Convertir tipo
const age = parseInt("25");

# C. Usar 'any' (no recomendado)
const value: any = "25";

# D. Type assertion
const age = "25" as any as number;
```

---

### Error: "Build failed"
```
Error: Build failed with X errors
```

**Causa**: Errores de compilación

**Solución**:
```bash
# 1. Limpiar y rebuilding
rm -rf .next
npm run build

# 2. Si falla, verificar cada paso:
npm run format
npm run lint:fix
npm run type-check

# 3. Ver error específico
# El build te dirá exactamente qué archivo tiene error

# 4. Verificar imports
# Asegúrate que todos los imports existan
import { Component } from '@/components/Component'; // ✅
import { Missing } from '@/components/Missing'; // ❌
```

---

## 2. Errores de Git

### Error: "Permission denied (publickey)"
```
git@github.com: Permission denied (publickey)
```

**Causa**: SSH key no configurada

**Solución**:
```bash
# Usar HTTPS en lugar de SSH
git remote set-url origin https://github.com/TU-USUARIO/repo.git

# Verificar
git remote -v

# Intentar push
git push
```

---

### Error: "Failed to push - rejected"
```
! [rejected] main -> main (fetch first)
```

**Causa**: Cambios en GitHub que no tienes localmente

**Solución**:
```bash
# 1. Bajar cambios primero
git pull --rebase origin main

# 2. Si hay conflictos, resolverlos manualmente
# Edita los archivos que tengan <<<<<<< HEAD

# 3. Después de resolver
git add .
git rebase --continue

# 4. Push
git push
```

---

### Error: "Merge conflict"
```
CONFLICT (content): Merge conflict in src/app/page.tsx
```

**Causa**: Cambios conflictivos en el mismo archivo

**Solución**:
```bash
# 1. Abrir archivo con conflicto
# Verás marcas como:
<<<<<<< HEAD
Tu código
=======
Código del servidor
>>>>>>> branch-name

# 2. Editar manualmente para quedarte con lo que quieres

# 3. Remover marcas de conflicto

# 4. Marcar como resuelto
git add src/app/page.tsx

# 5. Continuar merge/rebase
git merge --continue
# o
git rebase --continue
```

---

### Error: "Nothing to commit"
```
nothing to commit, working tree clean
```

**Causa**: No has guardado cambios o no hay cambios

**Solución**:
```bash
# 1. Verificar que guardaste archivos en editor

# 2. Ver qué archivos cambiaron
git status

# 3. Si no ves archivos, revisar .gitignore
# Asegúrate que no estés ignorando archivos importantes

# 4. Ver todos los archivos (incluso ignorados)
git status --ignored
```

---

## 3. Errores de Vercel

### Error: "Build failed on Vercel"
```
Error: Command "npm run build" exited with 1
```

**Causa**: Build falla en producción pero funciona localmente

**Solución**:
```bash
# 1. Verificar build localmente
npm run build

# 2. Si funciona localmente, verificar variables de entorno
# Vercel → Settings → Environment Variables
# Asegúrate que estén todas las necesarias

# 3. Ver logs en Vercel
# Vercel Dashboard → Deployments → [tu deploy] → Build Logs

# 4. Verificar versión de Node
# Vercel usa Node 18 por defecto
# Asegúrate que tu package.json especifique:
"engines": {
  "node": ">=18.0.0"
}

# 5. Redeploy
# Vercel Dashboard → Deployments → ... → Redeploy
```

---

### Error: "Environment variables not working"
```
Error: API key is undefined
```

**Causa**: Variables no configuradas o mal nombradas

**Solución**:
```bash
# 1. Verificar nombres
# Deben empezar con NEXT_PUBLIC_ para ser accesibles en cliente
NEXT_PUBLIC_API_KEY=xxx ✅
API_KEY=xxx ❌ (solo servidor)

# 2. En Vercel Dashboard
# Settings → Environment Variables
# Añadir variable
# Marcar: Production, Preview, Development

# 3. IMPORTANTE: Redeploy después de añadir variables
# Vercel → Deployments → ... → Redeploy

# 4. Verificar en código
console.log(process.env.NEXT_PUBLIC_API_KEY);
```

---

### Error: "Function execution timeout"
```
Error: Function execution took too long
```

**Causa**: Función tarda más de 10 segundos (límite gratis)

**Solución**:
```bash
# 1. Optimizar función
# - Usar cache
# - Reducir procesamiento
# - Mover a edge functions

# 2. Upgrade a Vercel Pro ($20/mes)
# Límite de 60 segundos

# 3. O mover función pesada a backend separado
# Ej: Backend TTS en otro servidor
```

---

## 4. Errores de Runtime

### Error: "Hydration failed"
```
Hydration failed because the initial UI does not match
```

**Causa**: HTML del servidor difiere del cliente

**Solución**:
```tsx
// ❌ Incorrecto
function Component() {
  return <div>{new Date().toString()}</div>;
}

// ✅ Correcto
function Component() {
  const [date, setDate] = useState('');
  
  useEffect(() => {
    setDate(new Date().toString());
  }, []);
  
  return <div>{date}</div>;
}

// O usar suppressHydrationWarning
<div suppressHydrationWarning>
  {new Date().toString()}
</div>
```

---

### Error: "Cannot read property of undefined"
```
TypeError: Cannot read property 'x' of undefined
```

**Causa**: Intentar acceder a propiedad de objeto que no existe

**Solución**:
```typescript
// ❌ Incorrecto
const name = user.profile.name;

// ✅ Correcto - Optional chaining
const name = user?.profile?.name;

// ✅ Con default
const name = user?.profile?.name ?? 'Unknown';

// ✅ Con type guard
if (user && user.profile) {
  const name = user.profile.name;
}
```

---

### Error: "Maximum update depth exceeded"
```
Error: Maximum update depth exceeded
```

**Causa**: Estado se actualiza infinitamente

**Solución**:
```tsx
// ❌ Incorrecto
function Component() {
  const [count, setCount] = useState(0);
  
  setCount(count + 1); // ❌ Causa loop infinito
  
  return <div>{count}</div>;
}

// ✅ Correcto
function Component() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    // Solo cuando mount
    setCount(count + 1);
  }, []); // ✅ Dependency array vacío
  
  return <div>{count}</div>;
}
```

---

## 5. Errores de Prettier/Formato

### Error: "Unexpected token"
```
SyntaxError: Unexpected token
```

**Causa**: Sintaxis inválida en el archivo

**Solución**:
```bash
# 1. Verificar qué archivo
npm run format:check

# 2. Ver error específico
npx prettier --check archivo.tsx

# 3. Causas comunes:
# - Falta cerrar {}, [], ()
# - Falta ; o ,
# - String sin cerrar
# - Comentario mal formado

# 4. Usar editor con linting
# VS Code mostrará errores de sintaxis en tiempo real
```

---

## 6. Errores de Dependencias

### Error: "Peer dependency warning"
```
WARN package@version requires a peer of dependency@^X.0.0
```

**Causa**: Versión incompatible de dependencia

**Solución**:
```bash
# 1. Instalar peer dependency
npm install dependency@^X.0.0

# 2. O ignorar (no recomendado)
npm install --legacy-peer-deps

# 3. Actualizar package principal
npm update package
```

---

### Error: "Conflicting dependencies"
```
Error: Cannot resolve dependency tree
```

**Causa**: Dependencias incompatibles entre sí

**Solución**:
```bash
# 1. Forzar instalación
npm install --force

# 2. O limpiar y reinstalar
rm -rf node_modules package-lock.json
npm install

# 3. Usar versiones específicas
npm install package@exact-version
```

---

## 🛠️ Herramientas de Debug

### 1. Console Logs
```typescript
console.log('Debug:', variable);
console.error('Error:', error);
console.warn('Warning:', warning);
console.table(arrayOfObjects);
```

### 2. React DevTools
```bash
# Instalar extensión en Chrome/Firefox
# Luego usar para:
# - Ver componentes
# - Ver props
# - Ver state
# - Ver hooks
```

### 3. Network Tab
```
F12 → Network tab
# Ver:
# - API calls
# - Status codes
# - Response data
# - Request headers
```

### 4. Vercel Logs
```bash
# CLI
vercel logs

# Dashboard
Vercel → Project → Logs
```

---

## 📋 Checklist de Debug

Cuando algo no funciona:

1. [ ] ¿Guardé todos los archivos?
2. [ ] ¿Está el servidor corriendo? (`npm run dev`)
3. [ ] ¿Hay errores en terminal?
4. [ ] ¿Hay errores en consola del navegador? (F12)
5. [ ] ¿Instalé dependencias? (`npm install`)
6. [ ] ¿Las variables de entorno están correctas?
7. [ ] ¿Hice `git pull` recientemente?
8. [ ] ¿Probé reiniciar el servidor?
9. [ ] ¿Probé limpiar cache? (`rm -rf .next`)
10. [ ] ¿Leí el mensaje de error completo?

---

## 🆘 Último Recurso

Si nada funciona:

```bash
# 1. Limpiar TODO
rm -rf node_modules .next package-lock.json

# 2. Reinstalar
npm install

# 3. Rebuild
npm run build

# 4. Dev
npm run dev

# 5. Si aún falla, buscar el error exacto en:
# - Google
# - Stack Overflow
# - GitHub Issues del paquete
# - Next.js Discord
```

---

## 📞 Obtener Ayuda

Cuando pidas ayuda, incluye:

1. **Mensaje de error completo**
2. **Qué estabas haciendo cuando ocurrió**
3. **Código relevante**
4. **Versiones**:
   ```bash
   node --version
   npm --version
   npx next --version
   ```
5. **Sistema operativo**
6. **Pasos para reproducir**

---

**Recuerda**: La mayoría de errores tienen solución simple. Lee el error con calma y busca en Google el mensaje exacto. 🔍
