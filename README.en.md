# Codex Light Skin

[中文](README.md)

Temporarily style Windows Codex with a custom background, a light palette, readable chat text, a light-gray composer, a translucent sidebar, and light web dialogs and menu panels. There are only two commands: apply and remove. The patch exits when the command finishes.

**Experimental source release; not an OpenAI product. No preview, manager, background service or startup task.** The prototype was tested on Codex 26.930.3930.0. This reduced entry point has offline checks but has not been retested against a live window. Applying to other Codex versions is rejected.

## What gets styled?

| Area | Current styling |
|---|---|
| **Main background** | A local PNG covers the main chat area. Adjust the white overlay to fade the image. |
| **Chat text and contrast** | Dark-gray primary text, gray secondary text and a dark input caret with light surfaces, addressing white text on a bright background. |
| **Chat composer** | A translucent light-gray surface, dark text and light-gray border; the action bar uses a similar gray. |
| **Sidebar translucency** | A background image and translucent light overlay on the sidebar, keeping navigation and project text readable. |
| **Web dialogs** | A translucent light surface, dark text and light-gray border for HTML dialog elements and dialog/alertdialog roles. |
| **Menus and other panels** | Shared Codex color variables provide light surfaces, dark text and soft-purple accents. |

Only the main background fade is adjustable (`--overlay`). Text, composer, sidebar and popup surfaces use a fixed light palette; there are no separate contrast or opacity sliders. Translucency is a web styling effect, not Windows window opacity. Native Windows file pickers and other separate windows are outside the patch scope. The reduced version's live appearance still requires manual acceptance testing.

## Original project and credits

Original project: [**Codex Dream Skin — Fei-Away/Codex-Dream-Skin**](https://github.com/Fei-Away/Codex-Dream-Skin). Thanks to Fei-Away and the community for the Codex skinning ideas.

This project started after encountering Windows version compatibility problems while using Dream Skin. It independently implements a small, temporary background and palette tool. **It is not a fork of Dream Skin or an official fix from its author.** It does not modify or bundle the Dream Skin engine or community theme assets.

If an updated Dream Skin works with your Codex version, finish this patch flow and return using the original project's instructions. See [third-party notices](THIRD-PARTY-NOTICES.md) for dependency and asset details.

## What needs to be open?

| Item | What to do |
|---|---|
| **Official Codex** | Fully quit it before preparation. Open it once using step 3 below, then **keep that prepared window open** while applying, using and removing styles. A window opened from your everyday shortcut cannot be used for this patch. |
| **Codex Dream Skin** | **Exit its tray app and skin engine.** No need to launch it, apply a theme or import a theme package. You may keep its installation. |
| **An older Codex Light Skin manager** | Close it. This version has no manager window. |
| **Windows desktop wallpaper** | No need to change it first. The Codex background is separate. |
| **Wallpaper Engine or taskbar appearance software** | These do not participate in the patch; leave them in your normal usage state. The project does not modify them or require their installation or removal. |
| **Background image** | Save an actual PNG locally and supply its full path. No need to apply it in any other software first. |
| **PowerShell** | Open it separately from Windows, **not inside Codex**. Keep it open while a command runs. Once the command finishes and the prompt returns, you can close it. |

If Dream Skin has already changed your native Codex appearance, use its official restore procedure before exiting it. This patch's remove command only removes its own styles; it does not restore changes made by Dream Skin.

## Before starting

You need:

- Windows Microsoft Store Codex, currently restricted to **26.930.3930.0**.
- Node.js **22.19.0 or newer** and working npm. The project does not bundle Node, install it automatically or change PATH.
- A PNG you have permission to use: **8 MiB** maximum, **8192** pixels maximum per dimension, **32 million** pixels maximum total. No animated wallpaper, ZIP, JPG, theme.css or theme.json. Renaming a file to .png does not convert it.

The source ZIP is not a double-click installer. Extract it to a folder of your choice, such as D:\tools\codex-light-skin. The "project folder" below means the folder containing **package.json, README.md and src**.

### Local debugging risk

Step 3 manually opens an **unauthenticated debugging endpoint at 127.0.0.1:9437**. Other programs on your computer could read or control that Codex window. Loopback binding is not authentication.

The patch never starts, restarts or closes Codex and does not copy existing login data. The separate local-profile folder may require you to sign in yourself. When finished, fully quit that Codex, confirm the endpoint is closed, then reopen from your usual official shortcut.

Do not perform step 3 or apply the patch unless you accept this risk. See [SECURITY.md](SECURITY.md) for further limits.

## Steps

### 1. Open a separate PowerShell from Windows

Open PowerShell from the Windows Start menu and switch to your extracted project folder. Replace this example path if needed:

~~~powershell
Set-Location -LiteralPath 'D:\tools\codex-light-skin'
~~~

Run all subsequent commands from this folder. **This terminal should remain available when you quit Codex.**

### 2. Prepare dependencies once

~~~powershell
npm ci --ignore-scripts --cache .cache/npm
~~~

Continue only after it succeeds. This step requires internet access and installs the project dependency in node_modules, with the specified cache inside the project. It installs no global software. You do not need to repeat it unless the dependency setup changes.

If node or npm is not found, stop and prepare a compatible runtime or use the full paths of an existing portable runtime. Do not skip dependency setup.

### 3. Save your input, fully quit Codex, then prepare one window

Exit Dream Skin and any old manager. Save unsent text and fully quit Codex from its menu. Closing a window, hiding it in the tray or closing PowerShell may leave Codex running.

In the separate PowerShell, **paste this entire block once**:

~~~powershell
& {
    $ErrorActionPreference = 'Stop'
    $patchRoot = (Get-Location).Path
    if (-not (Test-Path -LiteralPath (Join-Path $patchRoot 'src\patch.mjs')) -or
        -not (Test-Path -LiteralPath (Join-Path $patchRoot 'release.manifest.json'))) {
        throw 'Wrong folder: enter the extracted project folder first'
    }
    $codexPackage = Get-AppxPackage -Name OpenAI.Codex |
        Sort-Object Version -Descending | Select-Object -First 1
    if (-not $codexPackage) { throw 'Official Microsoft Store Codex was not found' }
    if (Get-Process -Name ChatGPT -ErrorAction SilentlyContinue) {
        throw 'Codex has not fully quit; stop and do not launch another window'
    }
    if (Get-NetTCPConnection -State Listen -LocalPort 9437 -ErrorAction SilentlyContinue) {
        throw 'Port 9437 is occupied; stop and do not launch another window'
    }
    $codexExe = Join-Path $codexPackage.InstallLocation 'app\ChatGPT.exe'
    Start-Process -FilePath $codexExe -WindowStyle Normal -ArgumentList @(
        '--remote-debugging-address=127.0.0.1',
        '--remote-debugging-port=9437',
        ('--user-data-dir="' + (Join-Path $patchRoot 'local-profile') + '"')
    )
}
~~~

This manually opens **official Codex**, using the project's local-profile folder. Sign in yourself if prompted.

**Keep this window open. Do not also open your everyday Codex shortcut or repeat this step.** If it reports existing processes or an occupied port, stop and resolve that condition first.

### 4. Open an ordinary chat and apply your PNG

In the prepared Codex, open an ordinary chat with a visible chat area and input box. Return to PowerShell:

~~~powershell
node src/patch.mjs apply 'D:\Pictures\your-background.png' --acknowledge-local-debugging
~~~

**Replace D:\Pictures\your-background.png with your image's full path and keep the single quotes.** The acknowledgment flag confirms that you have read and accepted the debugging risk.

Wait for the result:

- "ok": true with the applied message means program checks passed. You still need to inspect the display and try the input box.
- "ok": false or an error is not success. Use the troubleshooting table below.
- A command has a 45-second deadline. A timeout needs manual inspection of the window.

When it finishes and the prompt returns, **you may close PowerShell; keep Codex open**. There is no patch app that must remain running.

If the image is distracting or text is hard to read, reapply with a higher fade value:

~~~powershell
node src/patch.mjs apply 'D:\Pictures\your-background.png' --acknowledge-local-debugging --overlay 0.2
~~~

Default: 0.12; range: 0–0.9. A larger value adds more white overlay and fades the image. This does not change monitor brightness or contrast.

### 5. Remove styles while keeping Codex open

If you closed PowerShell, open a separate one from Windows and return to the same project folder:

~~~powershell
node src/patch.mjs remove
~~~

This removes only the patch's styles. **It does not close Codex or its debugging endpoint.** If Codex already fully quit, the temporary styles are gone; do not prepare another window just to remove them.

### 6. Finish: fully quit, then reopen normally

Save unsent text and fully quit Codex from its menu. Check the endpoint from PowerShell:

~~~powershell
Get-NetTCPConnection -State Listen -LocalPort 9437 -ErrorAction SilentlyContinue
~~~

**No output** means this check found no listener. An error does not establish that it is closed. If a listener remains, do not launch repeatedly; confirm the prepared Codex fully quit.

After confirming closure, reopen Codex using your usual official shortcut for native appearance. The patch does not run automatically after rebooting or reopening Codex.

## Common situations

| Situation | What to do |
|---|---|
| Gallery "one-click apply" or Dream Skin import succeeded, but nothing changed here | This patch uses a separate flow. Exit Dream Skin, prepare a local PNG, and follow steps 3 and 4. No prior theme application is needed. |
| You only have a theme ZIP, CSS or JSON | This version does not import theme packages. Provide a PNG you have permission to use; no artwork is bundled. |
| No verified debugging window / no local endpoint | An everyday shortcut window is insufficient. Check that step 3 succeeded and its window is still open. Do not keep a normal window open while preparing another. |
| Multiple windows / no visible chat and input | Keep one main chat window in the prepared Codex and open an ordinary chat. Companion widgets cannot serve as the patch target. |
| Unsupported version | Stop using this release and wait for adaptation. Do not bypass the version guard. |
| Missing src/patch.mjs or dependency | Check that PowerShell is in the folder containing package.json and step 2 succeeded. Do not run from inside the ZIP. |
| Unreadable, oversized, invalid or undecodable PNG | Check the full path, quotes, actual PNG format and limits. Convert or resize using an image tool if needed; renaming the extension is insufficient. The window's image loading check has a 3-second deadline and runs before style changes. |
| Switching chats, reloading or restarting | Chat switches may retain styles. A full page reload, full quit or restart loses them. Reapply only if needed; do not repeat step 3 while the existing prepared window is still running. |
| Moving or deleting the original image after applying | Loaded styles do not continuously read the file. The next apply still requires a valid local PNG path. |
| Layout failure, timeout or closing a running command | A layout failure rolls back the new patch. A failed repeat application need not preserve the previous patch. Timeout or interruption leaves the result uncertain: inspect, run remove if connected, or fully quit the prepared Codex. |
| Codex remains after closing PowerShell; several processes are listed | Closing PowerShell does not close Codex. Codex uses multiple processes; count alone does not mean multiple main windows. Save work and quit normally. Do not repeatedly prepare windows or force-kill processes in bulk. |
| Returning to Dream Skin | Finish this patch flow and confirm endpoint closure, then follow Dream Skin's current official instructions. This patch does not repair or guarantee compatibility with its engine. |

**Once preparation opened a window, the debugging endpoint may remain open even if applying fails or no background appears.** If you stop using the patch, follow step 6 to fully quit and check closure.

If an operation or exit fails, preserve local-profile and existing data. Do not delete login data as a recovery method.

## Boundaries

The patch briefly runs read-only identity checks, connects only to the manually prepared local window, and exits after completion. It checks app/process identity, the local endpoint and visible container dimensions.

It does not read message text, cookies, tokens, account storage or Codex configuration. It does not edit installed core files, native settings, proxy settings, environment variables, registry, shortcuts or the official installation location.

Only an owned temporary stylesheet and marker are added. Chat display, dimensions and positioning rules are not changed. Dimension checks do not replace visual or input testing. An image that cannot load, or a page change during the bounded image check, is rejected before style mutation. Ambiguous windows are rejected. Nothing is automatically reapplied or relaunched.

## Development and packaging

Ordinary users do not need these commands:

~~~powershell
npm test
npm run check
npm run pack
~~~

Packaging includes only the 16 files in release.manifest.json. No profiles, dependencies, caches, screenshots, backgrounds, old sessions or backups enter the source ZIP. Recipients prepare dependencies with step 2.

Tests use in-memory fixtures and refused unacknowledged operations, not a live Codex connection. Real application, full exit recovery and upgrade adaptation require separate acceptance testing.

## License

Code: [MIT](LICENSE). Supply artwork you have permission to use. No gallery assets, original theme packages or personal screenshots are redistributed.

Inspired by [Codex Dream Skin](https://github.com/Fei-Away/Codex-Dream-Skin); independently implemented without its engine or community themes. Undici is MIT; see [third-party notices](THIRD-PARTY-NOTICES.md).
