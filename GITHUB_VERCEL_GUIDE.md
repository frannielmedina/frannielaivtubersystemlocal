# 📦 Guía Completa: GitHub + Vercel Deployment

## 🎯 Resumen Rápido

Esta guía te enseñará a:
1. Subir tu proyecto a GitHub
2. Desplegar en Vercel
3. Configurar variables de entorno
4. Actualizar el proyecto en el futuro

---

## 📋 Requisitos Previos

### 1. Crear Cuentas (si no las tienes)

**GitHub** (gratis):
- Ve a https://github.com/signup
- Crea una cuenta
- Verifica tu email

**Vercel** (gratis):
- Ve a https://vercel.com/signup
- Usa "Continue with GitHub" (recomendado)
- Autoriza Vercel

### 2. Instalar Git

**Windows**:
```bash
# Descargar de: https://git-scm.com/download/win
# Instalar con opciones por defecto
```

**Mac**:
```bash
# Git viene pre-instalado, o:
brew install git
```

**Linux**:
```bash
sudo apt-get update
sudo apt-get install git
```

**Verificar instalación**:
```bash
git --version
# Debería mostrar: git version 2.x.x
```

---

## 🚀 Parte 1: Subir a GitHub

### Paso 1: Configurar Git (primera vez)

```bash
# Configurar tu nombre
git config --global user.name "Tu Nombre"

# Configurar tu email (usa el mismo de GitHub)
git config --global user.email "tu-email@ejemplo.com"

# Verificar configuración
git config --list
```

### Paso 2: Crear Repositorio en GitHub

1. Ve a https://github.com/new
2. **Repository name**: `miko-ai-vtuber` (o el nombre que prefieras)
3. **Description**: "Advanced AI VTuber with games, TTS, and Twitch integration"
4. **Public** o **Private** (tu elección)
5. ❌ **NO** marques "Add README" (ya tienes uno)
6. Click **"Create repository"**

### Paso 3: Inicializar Git en tu Proyecto

```bash
# Navega a tu carpeta del proyecto
cd ai-vtuber-advanced

# Inicializar Git
git init

# Añadir todos los archivos
git add .

# Hacer el primer commit
git commit -m "Initial commit - Miko AI VTuber v2.0"

# Conectar con GitHub (usa la URL que GitHub te muestra)
git remote add origin https://github.com/TU-USUARIO/miko-ai-vtuber.git

# Cambiar a rama main
git branch -M main

# Subir el código
git push -u origin main
```

### Paso 4: Verificar

Ve a tu repositorio en GitHub: `https://github.com/TU-USUARIO/miko-ai-vtuber`

Deberías ver todos tus archivos ahí. ✅

---

## 🌐 Parte 2: Desplegar en Vercel

### Método 1: Desde GitHub (Recomendado)

1. **Ve a Vercel**: https://vercel.com/
2. Click **"Add New..."** → **"Project"**
3. **Import Git Repository**:
   - Busca `miko-ai-vtuber`
   - Click **"Import"**

4. **Configure Project**:
   - **Framework Preset**: Next.js (auto-detectado)
   - **Root Directory**: `./` (dejar por defecto)
   - **Build Command**: `npm run build` (dejar por defecto)
   - **Output Directory**: `.next` (dejar por defecto)

5. **Environment Variables** (MUY IMPORTANTE):
   
   Click "Environment Variables" y añade:

   ```
   Name: NEXT_PUBLIC_GROQ_API_KEY
   Value: gsk_tu_api_key_aqui
   ```

   Añade todas las que necesites:
   - `NEXT_PUBLIC_GROQ_API_KEY`
   - `NEXT_PUBLIC_OPENROUTER_API_KEY` (opcional)
   - `NEXT_PUBLIC_MISTRAL_API_KEY` (opcional)
   - `NEXT_PUBLIC_TWITCH_TOKEN` (si usas Twitch)
   - `NEXT_PUBLIC_TWITCH_CHANNEL`
   - `NEXT_PUBLIC_TTS_BACKEND_URL` (si tienes backend TTS)

6. Click **"Deploy"**

7. **Espera** (toma 2-3 minutos)

8. **¡Listo!** Vercel te dará una URL como:
   ```
   https://miko-ai-vtuber.vercel.app
   ```

### Método 2: Desde CLI de Vercel

```bash
# Instalar Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Seguir el wizard:
# - Set up and deploy? Yes
# - Which scope? (tu cuenta)
# - Link to existing project? No
# - Project name? miko-ai-vtuber
# - Directory? ./
# - Override settings? No

# Deploy a producción
vercel --prod
```

---

## ⚙️ Parte 3: Configurar Variables de Entorno

### En Vercel Dashboard:

1. Ve a tu proyecto en Vercel
2. Click **"Settings"**
3. Click **"Environment Variables"**
4. Para cada variable:
   - **Name**: `NEXT_PUBLIC_GROQ_API_KEY`
   - **Value**: tu API key
   - **Environment**: Production, Preview, Development (marcar todos)
   - Click **"Save"**

### Variables importantes:

```bash
# AI Provider (al menos una)
NEXT_PUBLIC_GROQ_API_KEY=gsk_xxxxx
NEXT_PUBLIC_OPENROUTER_API_KEY=sk-or-v1-xxxxx
NEXT_PUBLIC_MISTRAL_API_KEY=xxxxx

# Twitch (opcional)
NEXT_PUBLIC_TWITCH_TOKEN=oauth:xxxxx
NEXT_PUBLIC_TWITCH_CHANNEL=tu_canal
NEXT_PUBLIC_TWITCH_USERNAME=tu_bot

# TTS Backend (opcional)
NEXT_PUBLIC_TTS_BACKEND_URL=https://tu-backend.com
```

**Importante**: Después de añadir variables, haz **Redeploy**:
- Ve a "Deployments"
- Click en el último deployment
- Click "..." → "Redeploy"

---

## 🔄 Parte 4: Actualizar el Proyecto

### Cuando hagas cambios:

```bash
# 1. Ver archivos modificados
git status

# 2. Añadir archivos modificados
git add .

# 3. Commit con mensaje descriptivo
git commit -m "Add new feature: X"

# 4. Subir a GitHub
git push
```

**Vercel desplegará automáticamente** cuando hagas push a GitHub. 🎉

### Si hay errores de formato:

```bash
# Formatear código con Prettier
npm run format

# Verificar errores de linting
npm run lint

# Arreglar errores automáticamente
npm run lint:fix

# Verificar tipos de TypeScript
npm run type-check
```

---

## 🐛 Solución de Problemas

### Error: "Git not found"
```bash
# Instalar Git primero
# Windows: https://git-scm.com/download/win
# Mac: brew install git
# Linux: sudo apt-get install git
```

### Error: "Permission denied (publickey)"
```bash
# Opción 1: Usar HTTPS en lugar de SSH
git remote set-url origin https://github.com/TU-USUARIO/miko-ai-vtuber.git

# Opción 2: Configurar SSH key
# Sigue: https://docs.github.com/en/authentication/connecting-to-github-with-ssh
```

### Error: "Build failed" en Vercel
```bash
# 1. Verificar que el proyecto compila localmente
npm run build

# 2. Si hay errores, arreglarlos primero
npm run lint:fix
npm run format

# 3. Verificar variables de entorno en Vercel
# Dashboard → Settings → Environment Variables

# 4. Hacer redeploy
```

### Error: "Module not found"
```bash
# Instalar dependencias
npm install

# Verificar package.json
# Hacer commit
git add package.json package-lock.json
git commit -m "Update dependencies"
git push
```

### Error de formato/linting:
```bash
# Formatear todo el código
npm run format

# Arreglar problemas de linting
npm run lint:fix

# Commit y push
git add .
git commit -m "Format code with Prettier"
git push
```

---

## 📝 Comandos Útiles de Git

```bash
# Ver estado
git status

# Ver historial
git log --oneline

# Crear rama nueva
git checkout -b feature/nueva-funcionalidad

# Cambiar de rama
git checkout main

# Ver ramas
git branch

# Unir rama
git merge feature/nueva-funcionalidad

# Descartar cambios
git checkout -- archivo.ts

# Ver diferencias
git diff

# Actualizar desde GitHub
git pull
```

---

## 🎨 Prettier: Scripts Disponibles

```bash
# Formatear todo el código
npm run format

# Solo verificar formato (no modificar)
npm run format:check

# Formatear archivo específico
npx prettier --write src/app/page.tsx

# Formatear carpeta específica
npx prettier --write "src/components/**/*.tsx"
```

---

## 🚨 Antes de Hacer Push

**Checklist**:
```bash
# 1. Formatear código
npm run format

# 2. Verificar linting
npm run lint

# 3. Verificar tipos
npm run type-check

# 4. Probar build
npm run build

# 5. Si todo está OK, hacer push
git add .
git commit -m "Descripción del cambio"
git push
```

---

## 🌟 Tips Profesionales

### 1. Usar .gitignore correctamente
Ya tienes un `.gitignore` configurado. Asegúrate de nunca subir:
- ❌ `node_modules/`
- ❌ `.env.local`
- ❌ API keys
- ❌ Archivos de configuración local

### 2. Mensajes de Commit
**Buenos mensajes**:
```bash
git commit -m "Add Gaming Mode with screen capture"
git commit -m "Fix: Chess board not showing legal moves"
git commit -m "Update: Improve TTS multilingual detection"
```

**Malos mensajes**:
```bash
git commit -m "fix"
git commit -m "cambios"
git commit -m "asdf"
```

### 3. Branches para Features
```bash
# Crear rama para nueva característica
git checkout -b feature/chat-bubbles

# Trabajar en la rama
# ... hacer cambios ...

# Commit
git add .
git commit -m "Add chat bubble animations"

# Volver a main y unir
git checkout main
git merge feature/chat-bubbles

# Push
git push
```

### 4. Dominio Personalizado en Vercel
1. Ve a Project Settings → Domains
2. Añade tu dominio (ej: `mikovtuber.com`)
3. Sigue instrucciones de DNS
4. Vercel configurará HTTPS automáticamente

---

## 📊 Workflow Completo

```
┌─────────────────────────────────────┐
│  1. Trabajar en Local               │
│     - Hacer cambios                 │
│     - npm run format                │
│     - npm run lint:fix              │
│     - npm run build (verificar)     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  2. Subir a GitHub                  │
│     - git add .                     │
│     - git commit -m "mensaje"       │
│     - git push                      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  3. Vercel Auto-Deploy              │
│     - Detecta push                  │
│     - Ejecuta build                 │
│     - Despliega automáticamente     │
│     - URL actualizada en 2-3 min    │
└─────────────────────────────────────┘
```

---

## 🎯 Resumen Ultra-Rápido

```bash
# Setup inicial (una sola vez)
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TU-USUARIO/repo.git
git push -u origin main

# Actualizar proyecto (cada cambio)
npm run format
npm run lint:fix
git add .
git commit -m "Descripción del cambio"
git push

# Vercel despliega automáticamente ✅
```

---

## 📞 Recursos Adicionales

- **Git Docs**: https://git-scm.com/doc
- **GitHub Guides**: https://guides.github.com/
- **Vercel Docs**: https://vercel.com/docs
- **Prettier**: https://prettier.io/docs/
- **Next.js Deployment**: https://nextjs.org/docs/deployment

---

## ✅ Checklist Final

Antes de tu primer deploy:

- [ ] Git instalado y configurado
- [ ] Cuenta de GitHub creada
- [ ] Repositorio creado en GitHub
- [ ] Código subido a GitHub
- [ ] Cuenta de Vercel creada (con GitHub)
- [ ] Proyecto importado en Vercel
- [ ] Variables de entorno configuradas
- [ ] Deploy exitoso
- [ ] URL funcionando
- [ ] Prettier configurado

---

**¡Listo! Tu proyecto está en GitHub y desplegado en Vercel.** 🎉

Cada vez que hagas `git push`, Vercel actualizará automáticamente tu sitio. ✨
