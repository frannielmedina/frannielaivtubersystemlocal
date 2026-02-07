# 🚀 Quick Reference - Comandos Útiles

## 📦 NPM Scripts

### Desarrollo
```bash
# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build

# Iniciar servidor de producción
npm start
```

### Calidad de Código
```bash
# Formatear todo el código con Prettier
npm run format

# Solo verificar formato (no modificar)
npm run format:check

# Verificar errores de linting
npm run lint

# Arreglar errores de linting automáticamente
npm run lint:fix

# Verificar tipos de TypeScript
npm run type-check
```

### Todo en Uno (antes de commit)
```bash
# Formatear, lint y verificar tipos
npm run format && npm run lint:fix && npm run type-check
```

---

## 🔧 Git Commands

### Configuración Inicial (una sola vez)
```bash
# Configurar nombre
git config --global user.name "Tu Nombre"

# Configurar email
git config --global user.email "tu@email.com"

# Verificar
git config --list
```

### Workflow Diario
```bash
# Ver estado actual
git status

# Ver archivos modificados en detalle
git diff

# Añadir archivos específicos
git add src/components/NewComponent.tsx

# Añadir todos los archivos
git add .

# Commit con mensaje
git commit -m "Add new feature"

# Subir a GitHub
git push

# Bajar cambios de GitHub
git pull
```

### Comandos Útiles
```bash
# Ver historial
git log --oneline --graph --all

# Deshacer último commit (mantener cambios)
git reset --soft HEAD~1

# Deshacer cambios en archivo
git checkout -- archivo.tsx

# Ver ramas
git branch

# Crear nueva rama
git checkout -b feature/nueva-funcionalidad

# Cambiar de rama
git checkout main

# Unir rama
git merge feature/nueva-funcionalidad

# Eliminar rama
git branch -d feature/nueva-funcionalidad
```

---

## 🌐 Vercel CLI

### Instalación
```bash
# Instalar globalmente
npm install -g vercel

# Login
vercel login
```

### Deploy
```bash
# Deploy a preview
vercel

# Deploy a producción
vercel --prod

# Ver logs
vercel logs

# Ver dominios
vercel domains

# Añadir variable de entorno
vercel env add NEXT_PUBLIC_API_KEY
```

---

## 🎨 Prettier

### Formato Manual
```bash
# Formatear archivo específico
npx prettier --write src/app/page.tsx

# Formatear carpeta
npx prettier --write "src/components/**/*.tsx"

# Formatear todo
npx prettier --write "**/*.{js,jsx,ts,tsx,json,css,md}"

# Solo verificar (no modificar)
npx prettier --check "src/**/*.tsx"
```

---

## 🔍 ESLint

```bash
# Verificar errores
npx eslint .

# Arreglar errores automáticamente
npx eslint . --fix

# Verificar archivo específico
npx eslint src/app/page.tsx

# Ignorar warnings
npx eslint . --quiet
```

---

## 🐛 Debugging

### Next.js
```bash
# Desarrollo con debug
NODE_OPTIONS='--inspect' npm run dev

# Luego abrir: chrome://inspect
```

### Ver variables de entorno
```bash
# En desarrollo
node -e "console.log(process.env)"

# Ver específica
echo $NEXT_PUBLIC_GROQ_API_KEY
```

### Limpiar caché
```bash
# Limpiar .next
rm -rf .next

# Limpiar node_modules
rm -rf node_modules
npm install

# Limpiar todo y reinstalar
rm -rf node_modules .next package-lock.json
npm install
```

---

## 📦 Package Management

```bash
# Instalar todas las dependencias
npm install

# Instalar nueva dependencia
npm install nombre-del-paquete

# Instalar como dev dependency
npm install -D nombre-del-paquete

# Actualizar dependencias
npm update

# Ver dependencias desactualizadas
npm outdated

# Auditoría de seguridad
npm audit

# Arreglar vulnerabilidades
npm audit fix
```

---

## 🚨 Solución de Problemas Comunes

### Error: "Module not found"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Error: "Port 3000 already in use"
```bash
# Mac/Linux
lsof -ti:3000 | xargs kill

# Windows
netstat -ano | findstr :3000
taskkill /PID [número] /F
```

### Error de formato/linting
```bash
npm run format
npm run lint:fix
```

### Build falla
```bash
# Verificar localmente
npm run build

# Si hay errores, revisar:
npm run type-check
npm run lint
```

---

## 📝 Workflow Recomendado

### Antes de empezar a trabajar:
```bash
git pull
npm install
```

### Durante el desarrollo:
```bash
npm run dev
# Trabajar normalmente...
```

### Antes de hacer commit:
```bash
# 1. Formatear código
npm run format

# 2. Arreglar linting
npm run lint:fix

# 3. Verificar tipos
npm run type-check

# 4. Probar build
npm run build

# 5. Si todo OK, commit
git add .
git commit -m "Descripción clara del cambio"
git push
```

### Después de push:
- Vercel despliega automáticamente
- Revisar en: https://vercel.com/dashboard
- Verificar URL de producción

---

## 🎯 Checklist Pre-Commit

```bash
# Copia y pega esto antes de cada commit:
npm run format && \
npm run lint:fix && \
npm run type-check && \
npm run build && \
echo "✅ Todo listo para commit!"
```

Si todos los comandos pasan sin error: ✅ Safe to commit!

---

## 🔄 Actualizar Proyecto desde GitHub

Si trabajas desde múltiples computadoras:

```bash
# 1. Bajar cambios
git pull

# 2. Instalar nuevas dependencias (si hay)
npm install

# 3. Continuar desarrollo
npm run dev
```

---

## 📚 Recursos Rápidos

- **Next.js Docs**: https://nextjs.org/docs
- **React Docs**: https://react.dev/
- **TypeScript**: https://www.typescriptlang.org/docs/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Git Cheatsheet**: https://education.github.com/git-cheat-sheet-education.pdf
- **Vercel Docs**: https://vercel.com/docs

---

## 💡 Tips

### VS Code
- Instala la extensión "Prettier"
- Instala la extensión "ESLint"
- Activa "Format on Save" en settings
- Usa Cmd/Ctrl + Shift + P para Command Palette

### Git
- Usa mensajes de commit descriptivos
- Haz commits frecuentes y pequeños
- Siempre `git pull` antes de `git push`
- Usa ramas para features grandes

### Debugging
- Usa `console.log()` generosamente
- Revisa la consola del navegador (F12)
- Usa React DevTools
- Revisa los logs de Vercel

---

**¡Guarda este archivo! Es tu referencia rápida para el día a día.** 📌
