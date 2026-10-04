# Security and recovery

The only network endpoint used at runtime is a verified loopback CDP page at 127.0.0.1:9437. It is unauthenticated and can expose the prepared Codex window to other local programs. There is no normal-web-site access or telemetry.

Apply requires an explicit CLI acknowledgment. Both apply and remove verify the registered Store executable, unique main process, expected local-profile command-line path, listener ownership and process creation time. They refuse changed owners and ambiguous windows. Executable discovery and owner checks use short-lived, read-only PowerShell calls.

The patch does not launch or kill Codex, install software, change native settings, or run background watchers. Its only persistent process is the user-prepared Codex itself, until that user quits it. The patch command exits when done. Temporary CSS can disappear on a full renderer reload and is never automatically reapplied.

Recovery:
1. Run the remove command to detach this patch's owned stylesheet.
2. Fully quit the prepared Codex and verify that 9437 is no longer listening.
3. Reopen Codex from the original official shortcut.
4. Preserve local-profile if the window or login behaves unexpectedly. Do not upload it.

Do not post tokens, full configuration, profile files, screenshots of private conversations, or raw debugging logs in issues. Report the app version, OS version, operation and redacted error instead. If a bug has security impact, report privately to the repository maintainer when a private channel is available; otherwise do not publish exploit details or private data.

Known evidence boundary: the original style prototype had a live trial, while this reduced transport/CLI has offline tests only. Windows tray-exit behavior after that trial was not conclusively diagnosed.
