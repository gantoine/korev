# TODOS

- **Sign and notarize the macOS build.** Packaged builds are unsigned, so Gatekeeper blocks them on other machines. Needs an Apple Developer ID certificate, `osxSign` + `osxNotarize` in `korev-desktop/forge.config.mts`, and the credentials as CI secrets.
