# Guía para Alberto — Paso a Paso

> No necesitas saber programar. Solo seguir estos pasos en orden.

---

## PARTE 1 — Configurar Antigravity con el proyecto

### Paso 1: Abrir Antigravity

Abre la aplicación **Antigravity** en tu computadora.

### Paso 2: Abrir la carpeta del proyecto

Dentro de Antigravity, abre la carpeta del proyecto.
Es la carpeta que te mandó Max — se llama **`production-guide-main`**.

> Si no sabes cómo abrir una carpeta en Antigravity, busca el menú **"Open Folder"** o **"Abrir carpeta"** y selecciona esa carpeta.

### Paso 3: Asegurarte de estar en la rama correcta

Dentro de Antigravity, abre una **terminal** (o "consola").
Escribe exactamente esto y presiona Enter:

```
git checkout alberto
```

Debería aparecer algo como:
```
Switched to branch 'alberto'
```

✅ Si aparece eso, estás listo para empezar.

---

## PARTE 2 — Hacer los 3 fixes con Antigravity

Los cambios están explicados en el archivo `docs/sprints/alberto/tarefas.md`.

### Cómo usar Antigravity para cada fix

Para cada bug, el proceso es siempre el mismo:

**1. Abre el chat de Antigravity** (el panel donde hablas con la IA)

**2. Copia y pega este mensaje** (cambia solo el número del bug):

---

```
Lee el archivo docs/sprints/alberto/tarefas.md y aplica exactamente el Fix del Bug 1.
No cambies nada más. Solo los archivos indicados en ese bug.
Cuando termines, dime qué archivos modificaste.
```

---

**3. Antigravity va a hacer los cambios** — espera que termine.

**4. Verifica** que funcionó ejecutando en la terminal:

```
npx tsc --noEmit
```

Si no aparece ningún mensaje de error: ✅ funcionó.
Si aparece algún error: copia el error y mándalo de nuevo al chat de Antigravity.

**5. Repite para Bug 2** cambiando el mensaje a:

```
Lee el archivo docs/sprints/alberto/tarefas.md y aplica exactamente el Fix del Bug 2.
No cambies nada más. Solo los archivos indicados en ese bug.
Cuando termines, dime qué archivos modificaste.
```

**6. Verificación final** — en la terminal:

```
npx tsc --noEmit
```

Esperado: **sin ningún output** (pantalla en blanco = cero errores). ✅

---

## PARTE 3 — Subir los cambios a GitHub (Pull Request)

Cuando todos los bugs estén corregidos, haces el PR para que Max lo revise.

### Paso 1: Ver qué archivos cambiaste

En la terminal, escribe:

```
git status
```

Vas a ver una lista de archivos modificados.

### Paso 2: Guardar los cambios (commit)

Cada bug se guarda por separado. El chat de Antigravity ya te debería haber guiado para hacer el commit de cada bug. Si no lo hizo, escríbele:

```
Haz el commit del Bug 1 con el mensaje exacto indicado en tarefas.md
```

Repite para el Bug 2.

### Paso 3: Subir la rama a GitHub

En la terminal, escribe:

```
git push origin alberto
```

Presiona Enter. Va a subir tus cambios.

### Paso 4: Crear el Pull Request

Ve a esta dirección en tu navegador:

```
https://github.com/m4xjunior/production-guide/compare/alberto
```

1. Haz clic en el botón verde **"Create pull request"**
2. En el título escribe: `fix: corrección de bugs TypeScript — Alberto`
3. En la descripción escribe qué bugs corregiste (Bug 1 y Bug 2)
4. Haz clic en **"Create pull request"**

✅ Listo. Max recibe una notificación y puede revisar tu trabajo.

---

## PARTE 4 — Si algo sale mal

### Si Antigravity hace algo que no querías

En la terminal:

```
git diff
```

Esto muestra exactamente qué cambió. Si algo no está bien, escríbele a Max antes de hacer commit.

### Si hay un error que no entiendes

Copia el mensaje de error completo y mándalo a Max por WhatsApp/mensaje. Él te ayuda.

### Si te pide contraseña en GitHub

Usa las mismas credenciales que usas para entrar a github.com.

---

## Resumen Visual

```
1. Abrir Antigravity → abrir carpeta production-guide-main
2. Terminal → git checkout alberto
3. Chat Antigravity → "aplica Bug 1 de tarefas.md"
4. Terminal → npx tsc --noEmit  (verificar)
5. Chat Antigravity → "aplica Bug 2 de tarefas.md"
6. Terminal → npx tsc --noEmit  (verificar)
7. Terminal → git push origin alberto
8. GitHub → crear Pull Request
9. Avisar a Max ✅
```
